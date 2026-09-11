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

// 🎯 GERAR A MATRIZ DA TRILHA DE 90 DIAS DUAL
const generateTrailMatrix = async (
  uid: string,
  partnerId: string,
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

    // O parceiro com UID alfabeticamente maior recebe a ordem alternada
    const isSecondaryPartner = uid > partnerId;

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
  const partnerUid = userData?.partnerId;

  // 🛡️ 2. TRAVA RÍGIDA: SEM PARCEIRO/MATCH NÃO HÁ PLAY
  if (!hasPartner || !partnerUid) {
    showCustomAlert(
      t("match_required_title", userLang) || "Conexão Necessária",
      t("match_required_msg", userLang) ||
        "Você precisa conectar seu amor (Match) para ativar o Play e iniciar a jornada.",
      "user-plus",
      "#EAB64A",
      t("btn_make_match_now", userLang) || "Ir para Área de Match",
      () => navigation.navigate("MainTabs", { screen: "Match" })
    );
    return;
  }

  try {
    // 🔍 Busca única dos dados do parceiro no Firestore
    const partnerSnap = await getDoc(doc(db, "users", partnerUid));
    const partnerData = partnerSnap.exists() ? partnerSnap.data() : {};

    // 🛡️ 3. TRAVA DE PLANO SOLO PARA PARCEIRO SEM ASSINATURA ATIVA
    const isSoloPlan =
      userData?.planType === "solo" ||
      userData?.activeProductId?.includes("_solo_");
    const partnerHasActivePremium = Boolean(partnerData?.isPremium);

    if (isSoloPlan && !partnerHasActivePremium) {
      showCustomAlert(
        t("sub_required_title", userLang) || "Assinatura Necessária",
        t("partner_solo_plan_restriction_msg", userLang) ||
          "Seu plano atual é Solo. Para jogar em dupla, seu parceiro(a) também precisa ter um plano ativo ou você pode migrar para o Plano Duo.",
        "lock",
        "#D96C6C",
        t("btn_see_plans", userLang) || "Ver Planos",
        () => navigation.navigate("PaywallScreen"),
        t("btn_not_now", userLang) || "Agora Não",
        () => {}
      );
      return;
    }

    // 🛡️ 4. INICIALIZAÇÃO DA JORNADA EM DUPLA
    const myDisplayName =
      userData?.billingFirstName ||
      userData?.displayName ||
      t("user_default_name", userLang) ||
      "Seu Amor";

    // Gerar as trilhas do casal
    const myTrail = await generateTrailMatrix(userId, partnerUid, userLang);
    const partnerTrail = await generateTrailMatrix(partnerUid, userId, userLang);

    // Atualiza o perfil do usuário atual
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

    // Sincroniza e libera a conta do parceiro
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

    // 🔔 DISPARO DE NOTIFICAÇÃO PUSH
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
      "Jornada iniciada diretamente em dupla.",
      userLang
    );

    navigation.navigate("MainTabs", { screen: "Home" });
  } catch (error) {
    console.error("[usePlayGuard] Erro ao processar o Play:", error);
  }
};