import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";

export type MultiLanguageText = {
  pt: string;
  en: string;
  es: string;
  fr: string;
  de: string;
  ja: string;
};

export interface MissionTask {
  id: string;
  moduleId: number;
  phase: number;
  pointsPE: number;
  title: MultiLanguageText;
  description: MultiLanguageText;
}

/**
 * Retorna a data no formato YYYY-MM-DD respeitando o fuso horário local
 */
function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Algoritmo Sniper: Busca a próxima Missão Diária ideal para o usuário.
 *
 * @param userId ID do usuário logado
 * @returns O objeto da tarefa (MissionTask) totalmente multi-idioma ou null.
 */
export async function getDailySniperTask(
  userId: string
): Promise<MissionTask | null> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("Usuário não encontrado no banco de dados.");
    }

    const userData = userSnap.data();

    // --- TRAVA DE GAMIFICAÇÃO DIÁRIA (FUSO LOCAL) ---
    const today = getLocalDateString(new Date());
    const lastTaskDate = userData.lastTaskDate;

    if (lastTaskDate === today) {
      console.log("✅ [SNIPER] Usuário já completou a missão de hoje.");
      return null;
    }
    // ------------------------------------------------

    const priorityModules: number[] = userData.priorityModules || [1];
    const completedTasks: string[] = userData.completedTasks || [];
    const currentPhase: number = userData.currentPhase || 1;

    for (const moduleId of priorityModules) {
      const tasksRef = collection(db, "tasks");
      const q = query(
        tasksRef,
        where("moduleId", "==", moduleId),
        where("phase", "==", currentPhase)
      );

      const querySnapshot = await getDocs(q);

      const availableTasks = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as MissionTask[];

      // Filtra tarefas pendentes
      const pendingTasks = availableTasks.filter(
        (task) => !completedTasks.includes(task.id)
      );

      if (pendingTasks.length > 0) {
        return pendingTasks[0];
      }
    }

    console.log("🎯 [SNIPER] Fase concluída para os módulos prioritários!");
    return null;
  } catch (error) {
    console.error("❌ Erro no Algoritmo Sniper:", error);
    return null;
  }
}