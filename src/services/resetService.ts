import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * 🟢 Limpa completamente o progresso da jornada, diários, presentes e notificações
 */
export async function clearUserProgressAndShop(uid: string): Promise<void> {
  if (!uid) return;

  // 1. Apaga subcoleção de diários do usuário (journals)
  try {
    const journalSnap = await getDocs(collection(db, "users", uid, "journals"));
    const deleteJournalPromises = journalSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deleteJournalPromises);
  } catch (e) {}

  // 2. Apaga subcoleções da loja (/shop: desires, redemptions, confirmations)
  try {
    const shopDocs = ["desires", "redemptions", "confirmations"];
    const shopPromises = shopDocs.map((docName) =>
      deleteDoc(doc(db, "users", uid, "shop", docName))
    );
    await Promise.all(shopPromises);
  } catch (e) {}

  // 3. Apaga subcoleção de notificações locais (/notifications)
  try {
    const notifSnap = await getDocs(collection(db, "users", uid, "notifications"));
    const deleteNotifPromises = notifSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deleteNotifPromises);
  } catch (e) {}

  // 4. Reseta e SOBREESCREVE os contadores de progresso e a fase atual da trilha no Firestore
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        currentPhase: 1,
        currentTaskStep: 0,
        completedTaskIds: [],
        myTrail: [],
        lastTaskId: null,
        lastTaskDate: null,
        streak: 0,
        totalPE: 0,
        pointsPE: 0,
        isReadyToStart: false,
        hasPressedPlay: false,
      },
      { merge: true }
    );
  } catch (e) {}
}