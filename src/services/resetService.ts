import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";

export async function clearUserProgressAndShop(uid: string): Promise<void> {
  if (!uid) return;

  // 1. Apaga histórico de desejos, compras e confirmações da loja
  try {
    const shopDocs = ["desires", "redemptions", "confirmations"];
    const shopPromises = shopDocs.map((docName) =>
      deleteDoc(doc(db, "users", uid, "shop", docName))
    );
    await Promise.all(shopPromises);
  } catch (e) {}

  // 2. Apaga histórico de notificações locais
  try {
    const notifSnap = await getDocs(collection(db, "users", uid, "notifications"));
    const deleteNotifPromises = notifSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deleteNotifPromises);
  } catch (e) {}

  // 3. Reseta contadores e lista de tarefas concluídas na trilha
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