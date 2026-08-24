import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { t } from "../i18n/translations";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Configura como a notificação se comporta com o app aberto em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Solicita permissão e agenda o lembrete diário para o casal (padrão: 20:00)
 */
export async function scheduleDailyReminder(
  userLang: string = "pt-BR",
  hour: number = 20,
  minute: number = 0
): Promise<boolean> {
  try {
    // 1. Verificar e solicitar permissões de notificação
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[NOTIF] Permissão de notificação negada pelo usuário.");
      return false;
    }

    // Configuração de canal para Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("daily-reminders", {
        name: "Lembretes Diários",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#EAB64A",
      });
    }

    // 2. Cancelar agendamentos anteriores para evitar duplicidade
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Título e Corpo Traduzidos
    const pushTitle =
      t("daily_reminder_push_title", userLang) || "✨ DuoElo - Hora do Casal!";
    const pushBody =
      t("daily_reminder_push_body", userLang) ||
      "Sua missão diária e reflexão do casal já estão disponíveis. Venha fortalecer seu elo hoje!";

    // 3. Agendar notificação diária recorrente
    await Notifications.scheduleNotificationAsync({
      content: {
        title: pushTitle,
        body: pushBody,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: "daily-reminders",
      },
    });

    console.log(
      `[NOTIF] Lembrete diário agendado com sucesso para às ${hour}:${
        minute < 10 ? "0" : ""
      }${minute}`
    );
    return true;
  } catch (error) {
    console.error("[NOTIF_ERROR] Erro ao agendar notificação diária:", error);
    return false;
  }
}