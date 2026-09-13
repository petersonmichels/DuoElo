import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Notifications from "expo-notifications";
import {
  addDoc,
  collection,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Platform } from "react-native";
import { auth, db } from "../config/firebase";
import { t } from "../i18n/translations";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo && Platform.OS !== "web") {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {}
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

    await addDoc(notifRef, {
      title,
      message,
      body: message,
      type,
      read: false,
      createdAt: nowISO,
      senderUid: auth.currentUser?.uid || null,
    });
  } catch (error: unknown) {
    console.warn("[NOTIF_SERVICE] Aviso ao salvar notificação localmente:", error);
  }
}

function isValidExpoPushToken(token?: string): boolean {
  if (!token || typeof token !== "string") return false;
  return (
    token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[")
  );
}

export async function sendMatchNotificationToPartner(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  userLang: string = "pt-BR"
): Promise<void> {
  const pushTitle = t("match_invite_push_title", userLang) || t("new_invite_title", userLang);
  const pushMessage = t("match_invite_push_body", userLang, { name: senderName }) || t("new_invite_body", userLang, { name: senderName });

  await saveNotificationToFirestore(pushTitle, pushMessage, "MATCH_INVITE", partnerUid);

  if (isValidExpoPushToken(partnerPushToken) && !isExpoGo && Platform.OS !== "web") {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          to: partnerPushToken,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          badge: 1,
          data: { type: "MATCH_INVITE" },
        }),
      });
    } catch (error) {}
  }
}

export async function sendMatchAcceptNotification(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  userLang: string = "pt-BR"
): Promise<void> {
  const pushTitle = t("match_accept_push_title", userLang) || t("elo_connected_title", userLang);
  const pushMessage = t("match_accept_push_body", userLang, { name: senderName });

  await saveNotificationToFirestore(pushTitle, pushMessage, "MATCH_ACCEPT", partnerUid);

  if (isValidExpoPushToken(partnerPushToken) && !isExpoGo && Platform.OS !== "web") {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          to: partnerPushToken,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          badge: 1,
          data: { type: "MATCH_ACCEPT" },
        }),
      });
    } catch (error) {}
  }
}

export async function sendPlayTriggeredNotification(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  userLang: string = "pt-BR"
): Promise<void> {
  const pushTitle = t("play_push_title", userLang);
  const pushMessage = t("play_push_body", userLang, { name: senderName });

  await saveNotificationToFirestore(pushTitle, pushMessage, "PLAY_STARTED", partnerUid);

  if (isValidExpoPushToken(partnerPushToken) && !isExpoGo && Platform.OS !== "web") {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          to: partnerPushToken,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          badge: 1,
          data: { type: "PLAY_STARTED" },
        }),
      });
    } catch (error) {}
  }
}

export async function sendPlayNotificationToPartner(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  userLang: string = "pt-BR"
): Promise<void> {
  return sendPlayTriggeredNotification(partnerPushToken, partnerUid, senderName, userLang);
}

export async function sendLessonStartedNotification(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  userLang: string = "pt-BR"
): Promise<void> {
  const pushTitle =
    t("mission_in_progress_push_title", userLang) || "Missão em Andamento! 🎯";
  const pushMessage =
    t("mission_in_progress_push_body", userLang, { name: senderName }) ||
    `${senderName} iniciou a missão do dia na vida real!`;

  await saveNotificationToFirestore(pushTitle, pushMessage, "LESSON_STARTED", partnerUid);

  if (isValidExpoPushToken(partnerPushToken) && !isExpoGo && Platform.OS !== "web") {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          to: partnerPushToken,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          badge: 1,
          data: { type: "LESSON_STARTED" },
        }),
      });
    } catch (error) {}
  }
}

export async function sendLessonCompletedNotification(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  userLang: string = "pt-BR"
): Promise<void> {
  const pushTitle = t("lesson_completed_push_title", userLang) || t("lesson_completed_title", userLang) || "Tarefa Concluída! 🎉";
  const pushMessage = t("lesson_completed_push_body", userLang, { name: senderName }) || `${senderName} concluiu a tarefa do dia!`;

  await saveNotificationToFirestore(pushTitle, pushMessage, "LESSON_COMPLETED", partnerUid);

  if (isValidExpoPushToken(partnerPushToken) && !isExpoGo && Platform.OS !== "web") {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          to: partnerPushToken,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          badge: 1,
          data: { type: "LESSON_COMPLETED" },
        }),
      });
    } catch (error) {}
  }
}

export async function sendGiftChosenNotification(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  giftTitle: string,
  userLang: string = "pt-BR"
): Promise<void> {
  const rawTitle = t("gift_chosen_push_title", userLang);
  const pushTitle = rawTitle === "gift_chosen_push_title" ? "Novo Presente Escolhido! 🎁" : (rawTitle || "Novo Presente Escolhido! 🎁");

  const rawBody = t("gift_chosen_push_body", userLang, { name: senderName, gift: giftTitle });
  const pushMessage = rawBody === "gift_chosen_push_body"
    ? `${senderName} escolheu o presente "${giftTitle}" na lista!`
    : (rawBody || `${senderName} escolheu o presente "${giftTitle}" na lista!`);

  await saveNotificationToFirestore(pushTitle, pushMessage, "GIFT_CHOSEN", partnerUid);

  if (isValidExpoPushToken(partnerPushToken) && !isExpoGo && Platform.OS !== "web") {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          to: partnerPushToken,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          badge: 1,
          data: { type: "GIFT_CHOSEN" },
        }),
      });
    } catch (error) {}
  }
}

export async function sendGiftBoughtNotification(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  giftTitle: string,
  userLang: string = "pt-BR"
): Promise<void> {
  const rawTitle = t("gift_bought_push_title", userLang);
  const pushTitle = rawTitle === "gift_bought_push_title" ? "Presente Comprado! 🛍️" : (rawTitle || "Presente Comprado! 🛍️");

  const rawBody = t("gift_bought_push_body", userLang, { name: senderName, gift: giftTitle });
  const pushMessage = rawBody === "gift_bought_push_body"
    ? `${senderName} resgatou o presente "${giftTitle}" para você com Bonds!`
    : (rawBody || `${senderName} resgatou o presente "${giftTitle}" para você com Bonds!`);

  await saveNotificationToFirestore(pushTitle, pushMessage, "GIFT_BOUGHT", partnerUid);

  if (isValidExpoPushToken(partnerPushToken) && !isExpoGo && Platform.OS !== "web") {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          to: partnerPushToken,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          badge: 1,
          data: { type: "GIFT_BOUGHT" },
        }),
      });
    } catch (error) {}
  }
}

export async function sendGiftDeliveredNotification(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  giftTitle: string,
  userLang: string = "pt-BR"
): Promise<void> {
  const rawTitle = t("gift_delivered_push_title", userLang);
  const pushTitle = rawTitle === "gift_delivered_push_title" ? "Presente Entregue! 📦" : (rawTitle || "Presente Entregue! 📦");

  const rawBody = t("gift_delivered_push_body", userLang, { name: senderName, gift: giftTitle });
  const pushMessage = rawBody === "gift_delivered_push_body"
    ? `${senderName} marcou "${giftTitle}" como entregue na vida real! Toque para confirmar.`
    : (rawBody || `${senderName} marcou "${giftTitle}" como entregue na vida real! Toque para confirmar.`);

  await saveNotificationToFirestore(pushTitle, pushMessage, "GIFT_DELIVERED", partnerUid);

  if (isValidExpoPushToken(partnerPushToken) && !isExpoGo && Platform.OS !== "web") {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          to: partnerPushToken,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          badge: 1,
          data: { type: "GIFT_DELIVERED" },
        }),
      });
    } catch (error) {}
  }
}

export async function sendGiftConfirmedNotification(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  giftTitle: string,
  userLang: string = "pt-BR"
): Promise<void> {
  const rawTitle = t("gift_confirmed_push_title", userLang);
  const pushTitle = rawTitle === "gift_confirmed_push_title" ? "Recebimento Confirmado! ❤️" : (rawTitle || "Recebimento Confirmado! ❤️");

  const rawBody = t("gift_confirmed_push_body", userLang, { name: senderName, gift: giftTitle });
  const pushMessage = rawBody === "gift_confirmed_push_body"
    ? `${senderName} confirmou o recebimento do presente "${giftTitle}"!`
    : (rawBody || `${senderName} confirmou o recebimento do presente "${giftTitle}"!`);

  await saveNotificationToFirestore(pushTitle, pushMessage, "GIFT_CONFIRMED", partnerUid);

  if (isValidExpoPushToken(partnerPushToken) && !isExpoGo && Platform.OS !== "web") {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          to: partnerPushToken,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          badge: 1,
          data: { type: "GIFT_CONFIRMED" },
        }),
      });
    } catch (error) {}
  }
}

export async function sendGiftNotification(
  partnerPushToken: string,
  partnerUid: string,
  senderName: string,
  giftTitle: string,
  userLang: string = "pt-BR"
): Promise<void> {
  return sendGiftChosenNotification(partnerPushToken, partnerUid, senderName, giftTitle, userLang);
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string
): Promise<void> {
  try {
    const notifRef = doc(db, "users", userId, "notifications", notificationId);
    await updateDoc(notifRef, { read: true });
  } catch (error) {}
}

export async function scheduleDailyReminder(
  userLang: string = "pt-BR",
  hour: number = 20,
  minute: number = 0
): Promise<boolean> {
  if (isExpoGo || Platform.OS === "web") return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return false;

    const channelName = t("daily_reminder_channel_name", userLang) || "Lembretes Diários";

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("daily-reminders", {
        name: channelName,
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#EAB64A",
      });
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    const pushTitle = t("daily_reminder_push_title", userLang);
    const pushBody = t("daily_reminder_push_body", userLang);

    const triggerInput: Notifications.DailyTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    };

    if (Platform.OS === "android") {
      (triggerInput as any).channelId = "daily-reminders";
    }

    await Notifications.scheduleNotificationAsync({
      content: { title: pushTitle, body: pushBody, sound: true, badge: 1 },
      trigger: triggerInput,
    });

    return true;
  } catch (error) {
    return false;
  }
}