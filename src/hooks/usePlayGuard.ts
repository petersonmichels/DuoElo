import * as Haptics from "expo-haptics";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { t } from "../i18n/translations";
import { audioService } from "../services/AudioService";
import { logAuditEvent } from "../services/auditService";

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
    onConfirm?: any,
    secondaryText?: string,
    onSecondary?: any
  ) => void;
}

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
    // Falha silenciosa para garantir a navegabilidade
  }

  const userId = auth.currentUser?.uid;

  if (userId) {
    try {
      // Registra no Firestore que o Play foi pressionado
      await setDoc(
        doc(db, "users", userId),
        {
          hasPressedPlay: true,
          anamnesisLocked: true,
          playPressedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await logAuditEvent(
        userId,
        "PLAY_PRESSED",
        "Ação de Play executada na jornada",
        userLang
      );
    } catch (error) {
      console.error("[usePlayGuard] Erro ao registrar ação de Play:", error);
    }
  }

  // 🛡️ REGRA DE NEGÓCIO CENTRALIZADA (DUO VS SOLO)
  const isDuoPlan =
    userData?.planType === "duo" ||
    userData?.subscriptionCategory === "duo";
  const hasPartner = Boolean(userData?.partnerId || userData?.hasPartner);
  const isSoloMode = Boolean(userData?.isSoloMode);

  if (isDuoPlan && !hasPartner && !isSoloMode) {
    // 🎯 Exibe as duas opções: Conectar Parceiro (Primário) ou Jogar Solo (Secundário)
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
        if (userId) {
          try {
            await setDoc(
              doc(db, "users", userId),
              { isSoloMode: true },
              { merge: true }
            );
          } catch (e) {}
        }
        navigation.navigate("MainTabs", { screen: "Home" });
      }
    );
  } else {
    // Se já tiver parceiro conectado ou se já estiver em modo Solo, avança para a Home
    navigation.navigate("MainTabs", { screen: "Home" });
  }
};