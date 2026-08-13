import * as admin from "firebase-admin";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";

admin.initializeApp();
const db = admin.firestore();

// ============================================================================
// 1. MATCHMAKER ATÔMICO (CALLABLE FUNCTION)
// ============================================================================
export const processMatch = onCall(
  { region: "europe-west1" },
  async (request) => {
    // 🔒 1. Valida se a requisição veio de um usuário autenticado
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Você precisa estar logado para conectar com um parceiro.",
      );
    }

    const { user1Id, user2Id } = request.data;

    if (!user1Id || !user2Id) {
      throw new HttpsError(
        "invalid-argument",
        "IDs de usuários inválidos para realizar o match.",
      );
    }

    if (user1Id === user2Id) {
      throw new HttpsError(
        "invalid-argument",
        "Você não pode conectar com a sua própria conta.",
      );
    }

    try {
      console.log(`Iniciando Match atômico entre ${user1Id} e ${user2Id}`);

      const usersRef = db.collection("users");

      const user1Doc = await usersRef.doc(user1Id).get();
      const user2Doc = await usersRef.doc(user2Id).get();

      if (!user1Doc.exists || !user2Doc.exists) {
        throw new HttpsError(
          "not-found",
          "Uma ou ambas as contas não foram encontradas.",
        );
      }

      const user1Data = user1Doc.data();
      const user2Data = user2Doc.data();

      // Valida se algum dos dois já está conectado a outra pessoa
      if (user1Data?.partnerId && user1Data.partnerId !== user2Id) {
        throw new HttpsError(
          "already-exists",
          "Sua conta já está conectada a outro parceiro.",
        );
      }

      if (user2Data?.partnerId && user2Data.partnerId !== user1Id) {
        throw new HttpsError(
          "already-exists",
          "Este usuário já está conectado a outro parceiro no DuoElo.",
        );
      }

      // Sincroniza a licença Premium (se qualquer um for Premium, o casal fica Premium)
      const finalPremiumStatus =
        Boolean(user1Data?.isPremium) || Boolean(user2Data?.isPremium);

      const batch = db.batch();

      batch.update(usersRef.doc(user1Id), {
        partnerId: user2Id,
        isPremium: finalPremiumStatus,
        isSoloMode: false,
      });

      batch.update(usersRef.doc(user2Id), {
        partnerId: user1Id,
        isPremium: finalPremiumStatus,
        isSoloMode: false,
      });

      await batch.commit();

      console.log(`✅ MATCH CONCLUÍDO COM SUCESSO! ${user1Id} <-> ${user2Id}`);

      return {
        success: true,
        message: "Casal conectado com sucesso!",
        isPremium: finalPremiumStatus,
      };
    } catch (error: any) {
      console.error("❌ Erro ao processar o match:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Erro interno ao processar o match.");
    }
  },
);

// ============================================================================
// 2. REVENUECAT WEBHOOK (FINANCEIRO & SYNC DE CASAL)
// ============================================================================
export const revenueCatWebhook = onRequest(
  { region: "europe-west1" },
  async (req, res) => {
    try {
      const event = req.body.event;

      if (!event || !event.app_user_id) {
        res.status(400).send("Bad Request: Missing event data");
        return;
      }

      const userId = event.app_user_id;
      const eventType = event.type;

      console.log(`💰 Webhook Recebido: ${eventType} para o usuário ${userId}`);

      const usersRef = db.collection("users");
      const userDoc = await usersRef.doc(userId).get();

      if (!userDoc.exists) {
        console.warn(`Usuário ${userId} não encontrado no banco de dados.`);
        res.status(200).send("User not found, but webhook acknowledged.");
        return;
      }

      const userData = userDoc.data();
      const partnerId = userData?.partnerId;

      if (
        eventType === "INITIAL_PURCHASE" ||
        eventType === "RENEWAL" ||
        eventType === "NON_RENEWING_PURCHASE" ||
        eventType === "UNCANCELLATION"
      ) {
        const batch = db.batch();

        batch.update(usersRef.doc(userId), { isPremium: true });

        if (partnerId) {
          batch.update(usersRef.doc(partnerId), { isPremium: true });
          console.log(
            `🎁 Premium liberado também para o parceiro: ${partnerId}`,
          );
        }

        await batch.commit();
        console.log(`✅ Premium ATIVADO com sucesso para ${userId}`);
      } else if (eventType === "EXPIRATION" || eventType === "REVOCATION") {
        const batch = db.batch();

        batch.update(usersRef.doc(userId), { isPremium: false });

        if (partnerId) {
          batch.update(usersRef.doc(partnerId), { isPremium: false });
          console.log(`💔 Premium revogado do parceiro: ${partnerId}`);
        }

        await batch.commit();
        console.log(`❌ Premium REVOGADO para ${userId}`);
      } else {
        console.log(
          `ℹ️ Evento ${eventType} processado sem alterações de status.`,
        );
      }

      res.status(200).send("Webhook processado com sucesso!");
    } catch (error) {
      console.error("Erro ao processar Webhook do RevenueCat:", error);
      res.status(500).send("Internal Server Error");
    }
  },
);
