import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * 🟢 Limpa completamente o progresso da jornada, presentes e notificações
 */
export async function clearUserProgressAndShop(uid: string): Promise<void> {
  if (!uid) return;

  // 1. Limpa as subcoleções da loja
  try {
    const shopDocs = ["desires", "redemptions", "confirmations"];
    const shopPromises = shopDocs.map((docName) =>
      deleteDoc(doc(db, "users", uid, "shop", docName))
    );
    await Promise.all(shopPromises);
  } catch (e) {}

  // 2. Limpa as notificações
  try {
    const notifSnap = await getDocs(collection(db, "users", uid, "notifications"));
    const deleteNotifPromises = notifSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deleteNotifPromises);
  } catch (e) {}

  // 3. Reseta os campos de progresso da trilha no Firestore
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