import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";

// 1. TRAZEMOS A REGRA MULTI-IDIOMA PARA DENTRO DO MOTOR
export type MultiLanguageText = {
  pt: string;
  en: string;
  es: string;
  fr: string;
  de: string;
  ja: string;
};

// 2. DEFINIMOS EXATAMENTE COMO A TAREFA É
export interface MissionTask {
  id: string;
  moduleId: number;
  phase: number;
  pointsPE: number;
  title: MultiLanguageText;
  description: MultiLanguageText;
}

/**
 * Algoritmo Sniper: Busca a próxima Missão Diária ideal para o usuário.
 *
 * @param userId ID do usuário logado
 * @returns O objeto da tarefa (MissionTask) totalmente multi-idioma ou null.
 */
export async function getDailySniperTask(
  userId: string,
): Promise<MissionTask | null> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("Usuário não encontrado no banco de dados.");
    }

    const userData = userSnap.data();

    // --- TRAVA DE GAMIFICAÇÃO DIÁRIA ---
    // Pega a data de hoje no formato YYYY-MM-DD (ex: "2026-07-30")
    const today = new Date().toISOString().split("T")[0];
    const lastTaskDate = userData.lastTaskDate;

    // Se ele já completou uma tarefa com a data de hoje, abortamos a busca.
    // Isso fará a HomeScreen receber 'null' e transformar o Semáforo em VERDE.
    if (lastTaskDate === today) {
      console.log("✅ Usuário já completou a missão de hoje.");
      return null;
    }
    // ------------------------------------

    const priorityModules: number[] = userData.priorityModules || [1];
    const completedTasks: string[] = userData.completedTasks || [];
    const currentPhase: number = userData.currentPhase || 1;

    for (const moduleId of priorityModules) {
      const tasksRef = collection(db, "tasks");
      const q = query(
        tasksRef,
        where("moduleId", "==", moduleId),
        where("phase", "==", currentPhase),
      );

      const querySnapshot = await getDocs(q);

      const availableTasks = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MissionTask[];

      // Filtra as tarefas que o usuário AINDA NÃO FEZ
      const pendingTasks = availableTasks.filter(
        (task) => !completedTasks.includes(task.id),
      );

      if (pendingTasks.length > 0) {
        // Encontrou a tarefa perfeita! Retorna a primeira da lista.
        return pendingTasks[0];
      }
    }

    console.log("🎯 Fase concluída para os módulos prioritários!");
    return null;
  } catch (error) {
    console.error("❌ Erro no Algoritmo Sniper:", error);
    return null;
  }
}
