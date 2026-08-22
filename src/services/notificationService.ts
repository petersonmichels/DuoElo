import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { t } from "../i18n/translations";

// Configura como a notificação se comporta quando o app está aberto em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Solicita permissão e agenda o lembrete diário para o casal (padrão: 20:00)
 */
export async function scheduleDailyReminder(
  userLang: string = "pt-BR",
  hour: number = 20,
  minute: number = 0,
) {
  try {
    // 1. Verificar/Solicitar permissões de notificação
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Permissão de notificação negada pelo usuário.");
      return false;
    }

    // Configuração especial para Android (canais de notificação)
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

    // 3. Agendar notificação diária recorrente
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "✨ DuoElo - Hora do Casal!",
        body:
          t("daily_reminder_push_body", userLang) ||
          "Sua missão diária e reflexão do casal já estão disponíveis. Venha fortalecer seu elo hoje!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    console.log(
      `Lembrete diário agendado com sucesso para às ${hour}:${minute < 10 ? "0" : ""}${minute}`,
    );
    return true;
  } catch (error) {
    console.error("Erro ao agendar notificação diária:", error);
    return false;
  }
}
