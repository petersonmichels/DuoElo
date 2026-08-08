import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";

admin.initializeApp();
const db = admin.firestore();

// ============================================================================
// 1. MATCHMAKER SEGURANÇA (O PADRE)
// ============================================================================
export const processMatch = onDocumentUpdated(
  "users/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const newData = event.data?.after.data();
    const oldData = event.data?.before.data();

    if (!newData) return;

    const newCode = newData.linkedInviteCode;
    const oldCode = oldData?.linkedInviteCode;

    if (newCode && newCode !== oldCode) {
      try {
        console.log(
          `Iniciando Match... Usuário ${userId} usou o código ${newCode}`,
        );

        const usersRef = db.collection("users");
        const partnerQuery = await usersRef
          .where("myInviteCode", "==", newCode)
          .limit(1)
          .get();

        if (partnerQuery.empty || partnerQuery.docs[0].id === userId) {
          console.log(
            "Match falhou: Código inválido ou pertencente ao próprio usuário.",
          );
          await usersRef
            .doc(userId)
            .update({ linkedInviteCode: admin.firestore.FieldValue.delete() });
          return;
        }

        const partnerDoc = partnerQuery.docs[0];
        const partnerId = partnerDoc.id;
        const partnerData = partnerDoc.data();

        const finalPremiumStatus =
          newData.isPremium || partnerData.isPremium || false;

        const batch = db.batch();

        batch.update(usersRef.doc(userId), {
          partnerId: partnerId,
          isPremium: finalPremiumStatus,
          linkedInviteCode: admin.firestore.FieldValue.delete(),
        });

        batch.update(usersRef.doc(partnerId), {
          partnerId: userId,
          isPremium: finalPremiumStatus,
        });

        await batch.commit();
        console.log(`✅ MATCH DE SUCESSO! ${userId} e ${partnerId}`);
      } catch (error) {
        console.error("❌ Erro grave ao processar o match:", error);
      }
    }
  },
);

// ============================================================================
// 2. REVENUECAT WEBHOOK (O CAIXA FINANCEIRO)
// ============================================================================
export const revenueCatWebhook = onRequest(async (req, res) => {
  try {
    const event = req.body.event;

    // Verifica se existe um evento e se tem o ID do usuário
    if (!event || !event.app_user_id) {
      res.status(400).send("Bad Request: Missing event data");
      return;
    }

    const userId = event.app_user_id;
    const eventType = event.type; // INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION

    console.log(`💰 Webhook Recebido: ${eventType} para o usuário ${userId}`);

    const usersRef = db.collection("users");
    const userDoc = await usersRef.doc(userId).get();

    if (!userDoc.exists) {
      console.error(`Usuário ${userId} não encontrado no banco de dados.`);
      res.status(404).send("User not found");
      return;
    }

    const userData = userDoc.data();
    const partnerId = userData?.partnerId;

    // Se o usuário comprou ou renovou a assinatura
    if (
      eventType === "INITIAL_PURCHASE" ||
      eventType === "RENEWAL" ||
      eventType === "NON_RENEWING_PURCHASE"
    ) {
      const batch = db.batch();

      // Ativa o Premium para quem comprou
      batch.update(usersRef.doc(userId), { isPremium: true });

      // Se ele já tiver parceiro, ativa o Premium do parceiro de graça (Inclusão grátis)
      if (partnerId) {
        batch.update(usersRef.doc(partnerId), { isPremium: true });
        console.log(`🎁 Premium liberado também para o parceiro: ${partnerId}`);
      }

      await batch.commit();
      console.log(`✅ Premium ATIVADO com sucesso para ${userId}`);
    }
    // Se a assinatura expirou ou foi cancelada e o tempo acabou
    else if (eventType === "EXPIRATION" || eventType === "CANCELLATION") {
      const batch = db.batch();

      batch.update(usersRef.doc(userId), { isPremium: false });

      if (partnerId) {
        batch.update(usersRef.doc(partnerId), { isPremium: false });
        console.log(`💔 Premium revogado do parceiro: ${partnerId}`);
      }

      await batch.commit();
      console.log(`❌ Premium REVOGADO para ${userId}`);
    }

    res.status(200).send("Webhook processado com sucesso!");
  } catch (error) {
    console.error("Erro ao processar Webhook do RevenueCat:", error);
    res.status(500).send("Internal Server Error");
  }
});
