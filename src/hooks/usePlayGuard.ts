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

// 🎯 FUNÇÃO PARA GERAR A MATRIZ DA TRILHA DE 90 DIAS DUAL
const generateTrailMatrix = async (
  uid: string,
  partnerId: string | null,
  isSolo: boolean,
  userLang: string
) => {
  try {
    let q = query(collection(db, "tasks"), where("language", "==", userLang));
    let snap = await getDocs(q);

    if (snap.empty) {
      q = query(collection(db, "tasks"), where("language", "==", "pt-BR"));
      snap = await getDocs(q);
    }

    let allTasks = snap.docs
      .map((d) => d.data())
      .sort((a: any, b: any) => a.day - b.day);
    let myPersonalTrail: number[] = [];

    let isSecondaryPartner = false;
    if (!isSolo && partnerId) {
      isSecondaryPartner = uid > partnerId;
    }

    for (let i = 0; i < allTasks.length; i += 5) {
      let chunk = allTasks.slice(i, i + 5).map((t) => t.day);

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
    // Falha silenciosa para garantir navegabilidade
  }

  const userId = auth.currentUser?.uid;
  if (!userId) return;

  const isDuoPlan =
    userData?.planType === "duo" ||
    userData?.subscriptionCategory === "duo" ||
    userData?.activeProductId?.includes("_duo_");
    
  const isSoloPlan =
    userData?.planType === "solo" ||
    userData?.activeProductId?.includes("_solo_");

  const hasPartner = Boolean(userData?.partnerId || userData?.hasPartner);
  const partnerUid = userData?.partnerId;
  const isSoloMode = Boolean(userData?.isSoloMode);

  // 🛡️ ERRO 10: TRAVA DE PLANO SOLO PARA O PARCEIRO CONVIDADO
  if (hasPartner && partnerUid && isSoloPlan) {
    const partnerSnap = await getDoc(doc(db, "users", partnerUid));
    const partnerData = partnerSnap.exists() ? partnerSnap.data() : {};
    const partnerHasActivePremium = Boolean(partnerData?.isPremium);

    if (!partnerHasActivePremium) {
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
  }

  // 🛡️ CASO 1: PLANO DUO SEM PARCEIRO E SEM MODO SOLO
  if (isDuoPlan && !hasPartner && !isSoloMode) {
    showCustomAlert(
      t("play_mode_title", userLang) || "Conectar ou Jogar Solo?",
      t("partner_required_msg", userLang) ||
        "O DuoElo foi feito para ser transformador em casal. Convide seu parceiro agora para sincronizarem as missões, ou continue no modo Solo.",
      "user-friends",
      "#EAB64A",
      t("btn_connect_partner", userLang) || "Conectar Parceiro",
      () => {
        navigation.navigate("MainTabs", { screen: "Match" });
      },
      t("btn_play_solo", userLang) || "Jogar Solo",
      async () => {
        try {
          const soloTrail = await generateTrailMatrix(userId, null, true, userLang);
          await setDoc(
            doc(db, "users", userId),
            {
              isSoloMode: true,
              isReadyToStart: true,
              hasPressedPlay: true,
              anamnesisLocked: true,
              myTrail: soloTrail,
              playPressedAt: new Date().toISOString(),
            },
            { merge: true }
          );
          await logAuditEvent(
            userId,
            "PLAY_PRESSED",
            "Modo solo ativado via PlayGuard",
            userLang
          );
        } catch (e) {}
        navigation.navigate("MainTabs", { screen: "Home" });
      }
    );
    return;
  }

  // 🛡️ CASO 2: TEM PARCEIRO CONECTADO -> APERTO DE MÃO DE CASAL
  if (hasPartner && partnerUid) {
    try {
      const partnerSnap = await getDoc(doc(db, "users", partnerUid));
      const partnerData = partnerSnap.exists() ? partnerSnap.data() : {};

      const partnerCompletedAnamnesis = Boolean(partnerData?.hasCompletedAnamnesis);
      const partnerIsReady = Boolean(
        partnerData?.isReadyToStart || partnerData?.hasPressedPlay || (partnerData?.currentPhase || 1) > 1
      );

      const myDisplayName =
        userData?.billingFirstName ||
        userData?.displayName ||
        t("user_default_name", userLang) ||
        "Seu Amor";

      const pName =
        partnerData?.billingFirstName ||
        partnerData?.displayName ||
        t("partner_default_name", userLang) ||
        "Seu Amor";

      // A) Parceiro AINDA NÃO fez a Anamnese
      if (!partnerCompletedAnamnesis) {
        showCustomAlert(
          t("waiting_partner_title", userLang) || "Aguardando o Amor ⏳",
          t("waiting_partner_msg", userLang, { name: pName }) ||
            `${pName} ainda precisa responder à Anamnese inicial para podermos calibrar a jornada do casal.`,
          "hourglass-half",
          "#EAB64A",
          t("btn_understand", userLang) || "Entendi"
        );
        return;
      }

      // B) SE O PARCEIRO JÁ ESTÁ PRONTO -> SOU O SEGUNDO A DAR O PLAY! GERAR AMBAS AS TRILHAS!
      if (partnerIsReady) {
        const myTrail = await generateTrailMatrix(userId, partnerUid, false, userLang);
        const partnerTrail = await generateTrailMatrix(partnerUid, userId, false, userLang);

        // Atualiza a minha conta
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

        // Atualiza a conta do parceiro para liberar a trilha dele
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
          console.log("[usePlayGuard] Atualização da trilha do parceiro pendente via reconciliação.");
        }

        // 🔔 DISPARO DE NOTIFICAÇÃO PUSH E SININHO NO BANCO DO PARCEIRO (ERRO 4)
        try {
          await sendPlayTriggeredNotification(
            partnerData?.pushToken || "",
            partnerUid,
            myDisplayName,
            userLang
          );
        } catch (notifErr) {
          console.warn("[usePlayGuard] Erro ao enviar notificação de Play:", notifErr);
        }

        await logAuditEvent(
          userId,
          "PLAY_PRESSED",
          "Aperto de mão concluído: Trilha de casal gerada!",
          userLang
        );

        showCustomAlert(
          t("start_authorized_title", userLang) || "Jornada do Casal Iniciada! 🎉",
          t("start_authorized_msg", userLang) ||
            "O elo foi firmado com sucesso! A trilha de 90 dias do casal foi gerada e liberada para vocês.",
          "flag-checkered",
          "#67D4A8",
          t("btn_understand", userLang) || "Entendi",
          () => {
            navigation.navigate("MainTabs", { screen: "Home" });
          }
        );
        return;
      }

      // C) PARCEIRO AINDA NÃO DEU O PLAY -> GRAVA MINHA PRONTIDÃO E AVISA QUE ESTOU AGUARDANDO
      await setDoc(
        doc(db, "users", userId),
        {
          isReadyToStart: true,
          hasPressedPlay: true,
          anamnesisLocked: true,
          playPressedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 🔔 DISPARO DE NOTIFICAÇÃO DE ALERTA PARA O PARCEIRO DAR O PLAY (ERRO 4)
      try {
        await sendPlayTriggeredNotification(
          partnerData?.pushToken || "",
          partnerUid,
          myDisplayName,
          userLang
        );
      } catch (notifErr) {
        console.warn("[usePlayGuard] Erro ao enviar notificação de Play pendente:", notifErr);
      }

      await logAuditEvent(
        userId,
        "PLAY_PRESSED",
        "Primeiro sinal verde do casal ativado",
        userLang
      );

      showCustomAlert(
        t("green_light_given_title", userLang) || "Sinal Verde Dado! ⏳",
        t("green_light_given_msg", userLang, { name: pName }) ||
          `Sua confirmação foi registrada. Aguardando ${pName} também dar o Play para gerar a trilha do casal.`,
        "hourglass-half",
        "#EAB64A",
        t("btn_understand", userLang) || "Entendido",
        () => {
          navigation.navigate("MainTabs", { screen: "Home" });
        }
      );
      return;
    } catch (error) {
      console.error("[usePlayGuard] Erro ao validar aperto de mão do casal:", error);
    }
  }

  // 🛡️ CASO 3: MODO SOLO INDIVIDUAL
  if (isSoloMode) {
    try {
      const soloTrail = await generateTrailMatrix(userId, null, true, userLang);
      await setDoc(
        doc(db, "users", userId),
        {
          isReadyToStart: true,
          hasPressedPlay: true,
          anamnesisLocked: true,
          myTrail: soloTrail,
          playPressedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {}
  }

  navigation.navigate("MainTabs", { screen: "Home" });
};