import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

// Inicializa o painel de administrador do Firebase
admin.initializeApp();
const db = admin.firestore();

/**
 * 🛡️ THE MATCHMAKER (O PADRE)
 * Fica ouvindo alterações no documento de qualquer usuário.
 * Se o campo "linkedInviteCode" for preenchido, ele executa o Match com segurança máxima.
 */
export const processMatch = onDocumentUpdated(
  "users/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const newData = event.data?.after.data();
    const oldData = event.data?.before.data();

    if (!newData) return;

    const newCode = newData.linkedInviteCode;
    const oldCode = oldData?.linkedInviteCode;

    // 1. Só continua se o usuário acabou de adicionar um código novo
    if (newCode && newCode !== oldCode) {
      try {
        console.log(
          `Iniciando Match... Usuário ${userId} usou o código ${newCode}`,
        );

        // 2. Busca no banco de dados se esse código existe
        const usersRef = db.collection("users");
        const partnerQuery = await usersRef
          .where("myInviteCode", "==", newCode)
          .limit(1)
          .get();

        // Se o código não existir ou for do próprio usuário (fraude), limpa o campo e aborta.
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

        // 3. Fusão Premium (Se um for Premium, os dois viram Premium)
        const finalPremiumStatus =
          newData.isPremium || partnerData.isPremium || false;

        // 4. Executa a união dos dois perfis de forma Atômica (Batch)
        // Se der erro em um, cancela tudo. Assim nunca teremos casais "pela metade".
        const batch = db.batch();

        // Atualiza o Usuário Atual
        batch.update(usersRef.doc(userId), {
          partnerId: partnerId,
          isPremium: finalPremiumStatus,
          linkedInviteCode: admin.firestore.FieldValue.delete(), // Apaga o código para não rodar de novo
        });

        // Atualiza o Parceiro
        batch.update(usersRef.doc(partnerId), {
          partnerId: userId,
          isPremium: finalPremiumStatus,
        });

        await batch.commit();
        console.log(
          `✅ MATCH DE SUCESSO! ${userId} agora está conectado com ${partnerId}`,
        );
      } catch (error) {
        console.error("❌ Erro grave ao processar o match:", error);
      }
    }
  },
);
