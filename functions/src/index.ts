import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";

// Inicialização segura do Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============================================================================
// 1. MATCHMAKER SEGURANÇA (O PADRE - ATÔMICO)
// ============================================================================
export const processMatch = onDocumentUpdated(
  { region: "europe-west1", document: "users/{userId}" },
  async (event) => {
    const userId = event.params.userId;
    const newData = event.data?.after.data();
    const oldData = event.data?.before.data();

    if (!newData) return;

    const newCode = newData.linkedInviteCode;
    const oldCode = oldData?.linkedInviteCode;

    if (!newCode || newCode === oldCode) return;

    const sanitizedCode = String(newCode).trim().toUpperCase();

    try {
      const usersRef = db.collection("users");
      const partnerQuery = await usersRef
        .where("myInviteCode", "==", sanitizedCode)
        .limit(1)
        .get();

      // Se o código não existir ou for do próprio usuário (tentativa de auto-match)
      if (partnerQuery.empty || partnerQuery.docs[0].id === userId) {
        console.warn(
          `[SECURITY_AUDIT] Match recusado: Código inválido ou auto-vínculo. User: ${userId.substring(0, 5)}***`,
        );
        await usersRef.doc(userId).update({
          linkedInviteCode: admin.firestore.FieldValue.delete(),
        });
        return;
      }

      const partnerDocRef = partnerQuery.docs[0].ref;
      const partnerId = partnerQuery.docs[0].id;

      // Execução atômica por Transação do Firestore para evitar Concorrência (Race Condition)
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(usersRef.doc(userId));
        const partnerDoc = await transaction.get(partnerDocRef);

        if (!userDoc.exists || !partnerDoc.exists) {
          throw new Error("DOCUMENT_NOT_FOUND");
        }

        const userVal = userDoc.data()!;
        const partnerVal = partnerDoc.data()!;

        // Bloqueio de sequestro de conta: Se um dos dois já tiver parceiro, cancela o match
        if (userVal.partnerId || partnerVal.partnerId) {
          console.warn(`[SECURITY_AUDIT] Match abortado: Usuário já vinculado.`);
          transaction.update(usersRef.doc(userId), {
            linkedInviteCode: admin.firestore.FieldValue.delete(),
          });
          return;
        }

        const finalPremiumStatus = userVal.isPremium === true || partnerVal.isPremium === true;
        let premiumGrantorId: string | null = null;

        if (userVal.isPremium) premiumGrantorId = userId;
        else if (partnerVal.isPremium) premiumGrantorId = partnerId;

        // Atualização simultânea
        transaction.update(usersRef.doc(userId), {
          partnerId: partnerId,
          isPremium: finalPremiumStatus,
          premiumGrantorId: premiumGrantorId,
          linkedInviteCode: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        transaction.update(partnerDocRef, {
          partnerId: userId,
          isPremium: finalPremiumStatus,
          premiumGrantorId: premiumGrantorId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      console.log(
        `[MATCH_SUCCESS] Vínculo atômico concluído na região europe-west1 para ${userId.substring(0, 5)}***`,
      );
    } catch (error) {
      console.error(`[SECURITY_ERROR] Erro crítico no processMatch:`, error);
      await db.collection("users").doc(userId).update({
        linkedInviteCode: admin.firestore.FieldValue.delete(),
      });
    }
  },
);

// ============================================================================
// 2. REVENUECAT WEBHOOK (O CAIXA FINANCEIRO BLINDADO)
// ============================================================================
export const revenueCatWebhook = onRequest(
  { region: "europe-west1" },
  async (req, res) => {
    try {
      // 🛡️ MÁXIMA SEGURANÇA: Validação de Token Secreto do Webhook
      const authHeader = req.headers.authorization;
      const expectedToken = process.env.REVENUECAT_WEBHOOK_SECRET;

      if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
        console.warn("[SECURITY_AUDIT] Tentativa ilícita de invocação do Webhook sem Bearer Token válido.");
        res.status(401).send("Unauthorized: Invalid Webhook Secret");
        return;
      }

      const event = req.body.event;

      if (!event || !event.app_user_id) {
        res.status(400).send("Bad Request: Missing event payload");
        return;
      }

      const userId = event.app_user_id;
      const eventType = event.type;

      console.log(`[FINANCE_LOG] Webhook RevenueCat: ${eventType} para o usuário ${userId.substring(0, 5)}***`);

      const usersRef = db.collection("users");
      const userDoc = await usersRef.doc(userId).get();

      if (!userDoc.exists) {
        console.warn(`[FINANCE_LOG] Usuário ${userId.substring(0, 5)}*** não localizado no Firestore.`);
        res.status(200).send("User not found, acknowledged.");
        return;
      }

      const userData = userDoc.data();
      const partnerId = userData?.partnerId;

      // Eventos de Concessão ou Renovação da Assinatura
      if (
        eventType === "INITIAL_PURCHASE" ||
        eventType === "RENEWAL" ||
        eventType === "NON_RENEWING_PURCHASE" ||
        eventType === "UNCANCELLATION"
      ) {
        const batch = db.batch();

        batch.update(usersRef.doc(userId), {
          isPremium: true,
          premiumGrantorId: userId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        if (partnerId) {
          batch.update(usersRef.doc(partnerId), {
            isPremium: true,
            premiumGrantorId: userId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        await batch.commit();
        console.log(`[FINANCE_SUCCESS] Premium Ativado para ${userId.substring(0, 5)}*** e Parceiro.`);
      } 
      // Eventos de Expiração ou Revogação da Assinatura
      else if (eventType === "EXPIRATION" || eventType === "REVOCATION") {
        const batch = db.batch();

        batch.update(usersRef.doc(userId), {
          isPremium: false,
          premiumGrantorId: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Apenas revoga do parceiro se o Premium tiver sido concedido por este usuário
        if (partnerId) {
          const partnerDoc = await usersRef.doc(partnerId).get();
          if (partnerDoc.exists && partnerDoc.data()?.premiumGrantorId === userId) {
            batch.update(usersRef.doc(partnerId), {
              isPremium: false,
              premiumGrantorId: null,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }

        await batch.commit();
        console.log(`[FINANCE_REVOKE] Premium Revogado de forma justa para ${userId.substring(0, 5)}***.`);
      } else {
        console.log(`[FINANCE_LOG] Evento ${eventType} ignorado.`);
      }

      res.status(200).send("Webhook processado com sucesso!");
    } catch (error) {
      console.error("[FINANCE_ERROR] Erro ao processar Webhook:", error);
      res.status(500).send("Internal Server Error");
    }
  },
);