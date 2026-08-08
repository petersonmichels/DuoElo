import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

admin.initializeApp();
const db = admin.firestore();

export const processMatch = onDocumentUpdated("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const newData = event.data?.after.data();
  const oldData = event.data?.before.data();

  if (!newData) return;

  const newCode = newData.linkedInviteCode;
  const oldCode = oldData?.linkedInviteCode;

  if (newCode && newCode !== oldCode) {
    try {
      console.log(`Iniciando Match... Usuário ${userId} usou o código ${newCode}`);

      const usersRef = db.collection("users");
      const partnerQuery = await usersRef.where("myInviteCode", "==", newCode).limit(1).get();

      if (partnerQuery.empty || partnerQuery.docs[0].id === userId) {
        console.log("Match falhou: Código inválido ou pertencente ao próprio usuário.");
        await usersRef.doc(userId).update({ linkedInviteCode: admin.firestore.FieldValue.delete() });
        return;
      }

      const partnerDoc = partnerQuery.docs[0];
      const partnerId = partnerDoc.id;
      const partnerData = partnerDoc.data();

      const finalPremiumStatus = newData.isPremium || partnerData.isPremium || false;

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
});
