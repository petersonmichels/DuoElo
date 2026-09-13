import * as Haptics from "expo-haptics";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { t } from "../i18n/translations";
import { audioService } from "../services/AudioService";
import { logAuditEvent } from "../services/auditService";
import { sendPlayTriggeredNotification } from "../services/notificationService";

interface PlayGuardParams {
  userData: any;
  userLang: string;
  navigation: any;
  showCustomAlert: (
    title: string,
    message: string,
    icon?: string,
    color?: string,
    confirmText?: string,
    onConfirm?: (() => void) | null,
    secondaryText?: string,
    onSecondary?: (() => void) | null
  ) => void;
}

// 🎯 GERAR A MATRIZ DA TRILHA DE 90 DIAS
const generateTrailMatrix = async (
  uid: string,
  partnerId: string | null,
  userLang: string
) => {
  try {
    let q = query(collection(db, "tasks"), where("language", "==", userLang));
    let snap = await getDocs(q);

    if (snap.empty) {
      q = query(collection(db, "tasks"), where("language", "==", "pt-BR"));
      snap = await getDocs(q);
    }

    const allTasks = snap.docs
      .map((d) => d.data())
      .sort((a: any, b: any) => a.day - b.day);
    const myPersonalTrail: number[] = [];

    // Se houver parceiro, o parceiro com UID alfabeticamente maior altera a ordem
    const isSecondaryPartner = partnerId ? uid > partnerId : false;

    for (let i = 0; i < allTasks.length; i += 5) {
      const chunk = allTasks.slice(i, i + 5).map((t) => t.day);

      if (isSecondaryPartner && chunk.length > 1) {
        const firstTask = chunk.shift();
        if (firstTask !== undefined) {
          chunk.push(firstTask);
        }
      }
      myPersonalTrail.push(...chunk);
    }

    return myPersonalTrail;
  } catch (error) {
    return Array.from({ length: 90 }, (_, i) => i + 1);
  }
};

export const executePlayWithGuard = async ({
  userData,
  userLang,
  navigation,
  showCustomAlert,
}: PlayGuardParams) => {
  // ⚡ 1. EFEITO SONORO & FEEDBACK TÁTIL INSTANTÂNEO
  try {
    if (audioService.getSfxEnabled()) {
      audioService.play("match");
    }
    if (userData?.enableHaptics !== false) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch (e) {
    // Falha silenciosa para não travar a navegação
  }

  const userId = auth.currentUser?.uid;
  if (!userId) return;

  const hasPartner = Boolean(userData?.partnerId || userData?.hasPartner);
  const isSoloMode = Boolean(userData?.isSoloMode);
  const partnerUid = userData?.partnerId;
  const isPremium = Boolean(userData?.isPremium);

  // 🛡️ 2. VALIDAÇÃO DE CONEXÃO OU MODO SOLO
  if (!hasPartner && !isSoloMode) {
    showCustomAlert(
      t("match_required_title", userLang) || "Conexão Necessária",
      t("match_required_msg", userLang) ||
        "Conecte seu amor (Match) ou selecione o modo Solo na Área do Match para liberar a jornada.",
      "user-plus",
      "#EAB64A",
      t("btn_make_match_now", userLang) || "Ir para Área de Match",
      () => navigation.navigate("MainTabs", { screen: "Match" })
    );
    return;
  }

  // 🛡️ 3. RESPEITAR ASSINATURAS (VERIFICAÇÃO DE PLANO/PAYWALL)
  if (!isPremium) {
    showCustomAlert(
      t("plan_required_title", userLang) || "Plano Necessário",
      t("plan_required_msg", userLang) ||
        "Assine para desbloquear sua jornada completa de 90 dias.",
      "lock",
      "#EAB64A",
      t("btn_see_plans", userLang) || "Ver Planos",
      () => navigation.navigate("PaywallScreen"),
      t("btn_not_now", userLang) || "Agora Não",
      () => {}
    );
    return;
  }

  try {
    // 🟢 MODO SOLO: LIBERA A TRILHA INDIVIDUAL
    if (isSoloMode && !hasPartner) {
      const myTrail = await generateTrailMatrix(userId, null, userLang);

      await setDoc(
        doc(db, "users", userId),
        {
          isReadyToStart: true,
          hasPressedPlay: true,
          anamnesisLocked: true,
          myTrail: myTrail,
          playPressedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await logAuditEvent(
        userId,
        "PLAY_PRESSED",
        "Jornada iniciada no Modo Solo.",
        userLang
      );

      navigation.navigate("MainTabs", { screen: "Home" });
      return;
    }

    // 💑 MODO CASAL / MATCH: INICIALIZAÇÃO DA JORNADA EM DUPLA
    if (partnerUid) {
      const partnerSnap = await getDoc(doc(db, "users", partnerUid));
      const partnerData = partnerSnap.exists() ? partnerSnap.data() : {};

      const myDisplayName =
        userData?.billingFirstName ||
        userData?.displayName ||
        t("user_default_name", userLang) ||
        "Seu Amor";

      const myTrail = await generateTrailMatrix(userId, partnerUid, userLang);
      const partnerTrail = await generateTrailMatrix(partnerUid, userId, userLang);

      await setDoc(
        doc(db, "users", userId),
        {
          isReadyToStart: true,
          hasPressedPlay: true,
          anamnesisLocked: true,
          myTrail: myTrail,
          playPressedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      try {
        await setDoc(
          doc(db, "users", partnerUid),
          {
            isReadyToStart: true,
            hasPressedPlay: true,
            anamnesisLocked: true,
            myTrail: partnerTrail,
            playPressedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (partnerErr) {
        console.log("[usePlayGuard] Sincronização do parceiro pendente via reconciliação.");
      }

      try {
        if (partnerData?.pushToken) {
          await sendPlayTriggeredNotification(
            partnerData.pushToken,
            partnerUid,
            myDisplayName,
            userLang
          );
        }
      } catch (notifErr) {
        console.warn("[usePlayGuard] Erro ao enviar notificação de Play:", notifErr);
      }

      await logAuditEvent(
        userId,
        "PLAY_PRESSED",
        "Jornada iniciada em dupla.",
        userLang
      );

      navigation.navigate("MainTabs", { screen: "Home" });
    }
  } catch (error) {
    console.error("[usePlayGuard] Erro ao processar o Play:", error);
  }
};