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
 * Grava a notificação diretamente no Firestore para formar o histórico do usuário
 */
export async function saveNotificationToFirestore(
  title: string,
  body: string,
  type: string = "DAILY_REMINDER"
): Promise<void> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    await addDoc(collection(db, "users", uid, "notifications"), {
      title,
      body,
      type,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("[NOTIF_SERVICE] Erro ao gravar histórico:", error);
  }
}

/**
 * Agenda o lembrete diário local
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
        name: "Lembretes Diários",
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