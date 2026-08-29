import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Notifications from "expo-notifications";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Platform } from "react-native";
import { auth, db } from "../config/firebase";
import { t } from "../i18n/translations";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Configuração global de comportamento em primeiro plano
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Grava a notificação diretamente no Firestore para formar o histórico do usuário.
 * Permite especificar um `targetUid` para salvar na subcoleção do parceiro.
 */
export async function saveNotificationToFirestore(
  title: string,
  body: string,
  type: string = "DAILY_REMINDER",
  targetUid?: string
): Promise<void> {
  try {
    const recipientUid = targetUid || auth.currentUser?.uid;
    if (!recipientUid) return;

    await addDoc(collection(db, "users", recipientUid, "notifications"), {
      title,
      body,
      type,
      read: false,
      createdAt: serverTimestamp(),
      senderUid: auth.currentUser?.uid || null,
    });
  } catch (error) {
    console.error("[NOTIF_SERVICE] Erro ao gravar histórico:", error);
  }
}

/**
 * Dispara notificação push e salva no histórico do Firestore do parceiro quando um Match é enviado.
 */
export async function sendMatchNotificationToPartner(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  userLang: string = "pt-BR"
): Promise<void> {
  // 🎯 TRADUÇÃO DINÂMICA COMPLETA: Garante o texto traduzido e previne chaves cruas
  const translatedTitle = t("match_invite_push_title", userLang);
  const pushTitle =
    translatedTitle && !translatedTitle.includes("match_invite_push_title")
      ? translatedTitle
      : userLang.startsWith("pt")
      ? "Convite de Elo Recebido! 💌"
      : "Match Invite Received! 💌";

  const translatedBody = t("match_invite_push_body", userLang, { name: senderName });
  const pushBody =
    translatedBody && !translatedBody.includes("match_invite_push_body")
      ? translatedBody
      : userLang.startsWith("pt")
      ? `${senderName} enviou um convite para iniciarem o elo juntos!`
      : `${senderName} sent you an invitation to connect your bond!`;

  // 1. Grava no histórico de notificações do parceiro no Firestore (para alimentar a modal do Sininho)
  await saveNotificationToFirestore(pushTitle, pushBody, "MATCH_INVITE", partnerUid);

  // 2. Envia a notificação Push de sistema (iOS/Android) via API do Expo Push
  if (partnerPushToken && !isExpoGo) {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: partnerPushToken,
          sound: "default",
          title: pushTitle,
          body: pushBody,
          badge: 1,
          data: { type: "MATCH_INVITE" },
        }),
      });
    } catch (error) {
      console.error("[NOTIF_SERVICE] Erro ao enviar Push de Match:", error);
    }
  }
}

/**
 * Agenda o lembrete diário local.
 */
export async function scheduleDailyReminder(
  userLang: string = "pt-BR",
  hour: number = 20,
  minute: number = 0
): Promise<boolean> {
  if (isExpoGo) return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return false;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("daily-reminders", {
        name: t("daily_reminder_channel_name", userLang) || "Lembretes Diários",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#EAB64A",
      });
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    const pushTitle =
      t("daily_reminder_push_title", userLang) || "✨ DuoElo - Hora do Casal!";
    const pushBody =
      t("daily_reminder_push_body", userLang) ||
      "Sua missão diária e reflexão do casal já estão disponíveis.";

    await Notifications.scheduleNotificationAsync({
      content: {
        title: pushTitle,
        body: pushBody,
        sound: true,
        badge: 1,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: "daily-reminders",
      },
    });

    await saveNotificationToFirestore(pushTitle, pushBody, "DAILY_REMINDER");
    return true;
  } catch (error) {
    console.error("[NOTIF_SERVICE] Erro ao agendar lembrete:", error);
    return false;
  }
}