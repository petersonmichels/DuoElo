import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Notifications from "expo-notifications";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { Platform } from "react-native";
import { auth, db } from "../config/firebase";
import { t } from "../i18n/translations";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Configuração global em primeiro plano
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

export interface AppNotification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  senderUid?: string | null;
}

/**
 * Grava a notificação no Firestore sem duplicatas recentes.
 */
export async function saveNotificationToFirestore(
  title: string,
  message: string,
  type: string = "DAILY_REMINDER",
  targetUid?: string
): Promise<void> {
  try {
    const recipientUid = targetUid || auth.currentUser?.uid;
    if (!recipientUid) return;

    const nowISO = new Date().toISOString();
    const notifRef = collection(db, "users", recipientUid, "notifications");

    if (type === "DAILY_REMINDER") {
      const dupQuery = query(
        notifRef,
        where("type", "==", "DAILY_REMINDER"),
        where("read", "==", false)
      );
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        return;
      }
    }

    await addDoc(notifRef, {
      title,
      message,
      body: message,
      type,
      read: false,
      createdAt: nowISO,
      senderUid: auth.currentUser?.uid || null,
    });
  } catch (error) {
    console.error("[NOTIF_SERVICE] Erro ao gravar histórico:", error);
  }
}

/**
 * 💌 Notificação ao ENVIAR um convite de Match
 */
export async function sendMatchNotificationToPartner(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  userLang: string = "pt-BR"
): Promise<void> {
  const rawTitle = t("match_invite_push_title", userLang);
  const pushTitle =
    rawTitle && !rawTitle.includes("match_invite_push_title")
      ? rawTitle
      : "Novo Convite de Elo! ❤️";

  const rawBody = t("match_invite_push_body", userLang, { name: senderName });
  const pushMessage =
    rawBody && !rawBody.includes("match_invite_push_body")
      ? rawBody
      : `${senderName} enviou um convite para iniciarem o elo juntos!`;

  await saveNotificationToFirestore(pushTitle, pushMessage, "MATCH_INVITE", partnerUid);

  if (partnerPushToken && !isExpoGo) {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: partnerPushToken,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          badge: 1,
          data: { type: "MATCH_INVITE" },
        }),
      });
    } catch (error) {
      console.error("[NOTIF_SERVICE] Erro ao enviar Push de Convite:", error);
    }
  }
}

/**
 * ❤️ Notificação ao ACEITAR um convite de Match
 */
export async function sendMatchAcceptNotification(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  userLang: string = "pt-BR"
): Promise<void> {
  const rawTitle = t("match_accept_push_title", userLang);
  const pushTitle =
    rawTitle && !rawTitle.includes("match_accept_push_title")
      ? rawTitle
      : "Elo Conectado! ❤️";

  const rawBody = t("match_accept_push_body", userLang, { name: senderName });
  const pushMessage =
    rawBody && !rawBody.includes("match_accept_push_body")
      ? rawBody
      : `${senderName} aceitou seu convite! Vocês já estão vinculados.`;

  await saveNotificationToFirestore(pushTitle, pushMessage, "MATCH_ACCEPT", partnerUid);

  if (partnerPushToken && !isExpoGo) {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: partnerPushToken,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          badge: 1,
          data: { type: "MATCH_ACCEPT" },
        }),
      });
    } catch (error) {
      console.error("[NOTIF_SERVICE] Erro ao enviar Push de Aceite:", error);
    }
  }
}

/**
 * ▶️ Notificação quando o parceiro clica em PLAY / Dá o sinal verde
 */
export async function sendPlayNotificationToPartner(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  userLang: string = "pt-BR"
): Promise<void> {
  const rawTitle = t("play_push_title", userLang);
  const pushTitle =
    rawTitle && !rawTitle.includes("play_push_title")
      ? rawTitle
      : "▶️ Hora de Começar!";

  const rawBody = t("play_push_body", userLang, { name: senderName });
  const pushMessage =
    rawBody && !rawBody.includes("play_push_body")
      ? rawBody
      : `${senderName} já deu o PLAY e está te aguardando para a jornada de hoje!`;

  await saveNotificationToFirestore(pushTitle, pushMessage, "PLAY_STARTED", partnerUid);

  if (partnerPushToken && !isExpoGo) {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: partnerPushToken,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          badge: 1,
          data: { type: "PLAY_STARTED" },
        }),
      });
    } catch (error) {
      console.error("[NOTIF_SERVICE] Erro ao enviar Push de Play:", error);
    }
  }
}

/**
 * ✨ Notificação quando o parceiro CONCLUI a lição do dia
 */
export async function sendLessonCompletedNotification(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  userLang: string = "pt-BR"
): Promise<void> {
  const rawTitle = t("lesson_completed_push_title", userLang);
  const pushTitle =
    rawTitle && !rawTitle.includes("lesson_completed_push_title")
      ? rawTitle
      : "✨ Lição Concluída!";

  const rawBody = t("lesson_completed_push_body", userLang, { name: senderName });
  const pushMessage =
    rawBody && !rawBody.includes("lesson_completed_push_body")
      ? rawBody
      : `${senderName} acabou de responder a lição do dia. Acesse para ver a resposta!`;

  await saveNotificationToFirestore(pushTitle, pushMessage, "LESSON_COMPLETED", partnerUid);

  if (partnerPushToken && !isExpoGo) {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: partnerPushToken,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          badge: 1,
          data: { type: "LESSON_COMPLETED" },
        }),
      });
    } catch (error) {
      console.error("[NOTIF_SERVICE] Erro ao enviar Push de Lição:", error);
    }
  }
}

/**
 * 🎁 Notificação quando o parceiro ESCOLHE / COMPRA um presente na loja
 */
export async function sendGiftNotification(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  giftTitle: string,
  userLang: string = "pt-BR"
): Promise<void> {
  const rawTitle = t("gift_push_title", userLang);
  const pushTitle =
    rawTitle && !rawTitle.includes("gift_push_title")
      ? rawTitle
      : "Novo Presente Escolhido! 🎁";

  const rawBody = t("gift_push_body", userLang, { name: senderName, gift: giftTitle });
  const pushMessage =
    rawBody && !rawBody.includes("gift_push_body")
      ? rawBody
      : `${senderName} escolheu o presente "${giftTitle}" para você!`;

  await saveNotificationToFirestore(pushTitle, pushMessage, "GIFT_RECEIVED", partnerUid);

  if (partnerPushToken && !isExpoGo) {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: partnerPushToken,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          badge: 1,
          data: { type: "GIFT_RECEIVED" },
        }),
      });
    } catch (error) {
      console.error("[NOTIF_SERVICE] Erro ao enviar Push de Presente:", error);
    }
  }
}

/**
 * ❤️ Notificação quando o parceiro CONFIRMA o recebimento do presente na vida real
 */
export async function sendGiftConfirmedNotification(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  giftTitle: string,
  userLang: string = "pt-BR"
): Promise<void> {
  const rawTitle = t("gift_confirmed_push_title", userLang);
  const pushTitle =
    rawTitle && !rawTitle.includes("gift_confirmed_push_title")
      ? rawTitle
      : "Presente Confirmado! ❤️";

  const rawBody = t("gift_confirmed_push_body", userLang, { name: senderName, gift: giftTitle });
  const pushMessage =
    rawBody && !rawBody.includes("gift_confirmed_push_body")
      ? rawBody
      : `${senderName} confirmou o recebimento do presente "${giftTitle}"!`;

  await saveNotificationToFirestore(pushTitle, pushMessage, "GIFT_CONFIRMED", partnerUid);

  if (partnerPushToken && !isExpoGo) {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: partnerPushToken,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          badge: 1,
          data: { type: "GIFT_CONFIRMED" },
        }),
      });
    } catch (error) {
      console.error("[NOTIF_SERVICE] Erro ao enviar Push de Confirmação de Presente:", error);
    }
  }
}

/**
 * 👁️ Marcar Notificação como Lida
 */
export async function markNotificationAsRead(
  userId: string,
  notificationId: string
): Promise<void> {
  try {
    const notifRef = doc(db, "users", userId, "notifications", notificationId);
    await updateDoc(notifRef, { read: true });
  } catch (error) {
    console.error("[NOTIF_SERVICE] Erro ao marcar como lida:", error);
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

    const rawTitle = t("daily_reminder_push_title", userLang);
    const pushTitle =
      rawTitle && !rawTitle.includes("daily_reminder_push_title")
        ? rawTitle
        : "✨ DuoElo - Hora do Casal!";

    const rawBody = t("daily_reminder_push_body", userLang);
    const pushBody =
      rawBody && !rawBody.includes("daily_reminder_push_body")
        ? rawBody
        : "Sua missão diária e reflexão do casal já estão disponíveis.";

    const triggerInput: Notifications.DailyTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    };

    if (Platform.OS === "android") {
      (triggerInput as any).channelId = "daily-reminders";
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: pushTitle,
        body: pushBody,
        sound: true,
        badge: 1,
      },
      trigger: triggerInput,
    });

    return true;
  } catch (error) {
    console.error("[NOTIF_SERVICE] Erro ao agendar lembrete:", error);
    return false;
  }
}