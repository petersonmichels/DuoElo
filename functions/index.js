const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

// 🔥 Função utilitária para disparar a notificação para o Expo
async function sendExpoPushNotification(expoPushToken, title, body) {
  // Verifica se o token é válido antes de enviar
  if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken")) {
    console.log("Token de push inválido ou ausente:", expoPushToken);
    return;
  }

  const message = {
    to: expoPushToken,
    sound: "default",
    title: title,
    body: body,
    data: { someData: "goes here" },
  };

  try {
    await axios.post("https://exp.host/--/api/v2/push/send", message, {
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
    });
    console.log("Notificação enviada com sucesso para:", expoPushToken);
  } catch (error) {
    console.error("Erro ao enviar notificação via Expo:", error);
  }
}

// 🔥 Escutador principal: Roda SEMPRE que o documento de algum usuário for atualizado
exports.onUserUpdate = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    // Dados antes da atualização e depois da atualização
    const before = change.before.data();
    const after = change.after.data();
    const userId = context.params.userId;

    // ==========================================
    // GATILHO 1: A CUTUCADA 👈
    // ==========================================
    // Se o número de cutucadas for maior agora do que era antes...
    if (after.cutucadas > (before.cutucadas || 0)) {
      console.log(`Cutucada detectada para o usuário ${userId}`);
      await sendExpoPushNotification(
        after.pushToken,
        "Ei, atenção aqui! 👀",
        "Seu parceiro(a) acabou de te mandar uma cutucada. Venha ver!",
      );
    }

    // ==========================================
    // GATILHO 2: O MATCH PERFEITO ❤️
    // ==========================================
    // Se não tinha parceiro antes, e agora tem...
    if (!before.partnerId && after.partnerId) {
      console.log(`Match detectado para o usuário ${userId}`);
      await sendExpoPushNotification(
        after.pushToken,
        "Match Perfeito! ❤️",
        "Sua conta foi conectada com sucesso! Corra para o app e faça o Check-in.",
      );
    }

    // ==========================================
    // GATILHO 3: O SINAL VERDE 🚦
    // ==========================================
    // Se o usuário ACABOU de dar o sinal verde (isReadyToStart virou true)
    if (!before.isReadyToStart && after.isReadyToStart && after.partnerId) {
      // Como QUEM deu o sinal foi o `userId`, precisamos avisar o PARCEIRO dele!
      console.log(
        `Sinal verde detectado. Buscando parceiro: ${after.partnerId}`,
      );

      const partnerDoc = await admin
        .firestore()
        .collection("users")
        .doc(after.partnerId)
        .get();

      if (partnerDoc.exists) {
        const partnerData = partnerDoc.data();

        // Dispara a notificação para o celular do parceiro
        await sendExpoPushNotification(
          partnerData.pushToken,
          "Sinal Verde Dado! 🚦",
          "Seu amor já apertou os cintos para a Jornada. Só falta o seu OK para darmos a largada!",
        );
      }
    }

    return null;
  });
