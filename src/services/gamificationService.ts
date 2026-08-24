import {
  arrayUnion,
  doc,
  getDoc,
  increment,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface GamificationResult {
  success: boolean;
  earnedPE: number;
  newStreak: number;
  earnedCoins: number;
}

/**
 * Retorna a data no formato YYYY-MM-DD respeitando o fuso horário local do usuário
 */
function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Motor de Gamificação: Registra a vitória, calcula a ofensiva e distribui recompensas.
 */
export async function completeDailyTask(
  userId: string,
  taskId: string,
  pointsPE: number
): Promise<GamificationResult> {
  if (!userId) {
    return {
      success: false,
      earnedPE: 0,
      newStreak: 0,
      earnedCoins: 0,
    };
  }

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("Usuário não encontrado.");
    }

    const userData = userSnap.data();
    const lastTaskDate = userData.lastTaskDate;
    const bypassDailyLock = Boolean(userData.bypassDailyLock);
    let currentStreak = userData.streak || 0;

    // --- MATEMÁTICA DO TEMPO (FUSO HORÁRIO LOCAL SEGURO) ---
    const now = new Date();
    const today = getLocalDateString(now);

    const yesterdayObj = new Date(now);
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterday = getLocalDateString(yesterdayObj);

    // --- LÓGICA DO FOGUINHO (STREAK) ---
    if (lastTaskDate === today && !bypassDailyLock) {
      // Missão já executada hoje e sem autorização de bypass
      return {
        success: true,
        earnedPE: 0,
        newStreak: currentStreak,
        earnedCoins: 0,
      };
    } else if (lastTaskDate === yesterday || (lastTaskDate === today && bypassDailyLock)) {
      // Mantém/Incrementa streak
      currentStreak += lastTaskDate === today ? 0 : 1;
    } else {
      // Perdeu mais de 1 dia: reinicia a ofensiva para 1 🧊
      currentStreak = 1;
    }

    const earnedCoins = pointsPE || 10; // Valor de Bonds concedidos por tarefa

    // --- ATUALIZAÇÃO BLINDADA NO FIREBASE ---
    await updateDoc(userRef, {
      completedTasks: arrayUnion(taskId),
      lastTaskDate: today,
      lastTaskId: taskId,
      streak: currentStreak,
      totalPE: increment(earnedCoins),
      pointsPE: increment(earnedCoins),
      duoCoins: increment(earnedCoins),
    });

    console.log(
      `✅ Gamificação Registrada! +${earnedCoins} Bonds | Streak: ${currentStreak}`
    );

    return {
      success: true,
      earnedPE: earnedCoins,
      newStreak: currentStreak,
      earnedCoins: earnedCoins,
    };
  } catch (error: any) {
    if (error?.code === "permission-denied") {
      console.log("[GAMIFICATION_SERVICE] Permissão expirada ou sessão encerrada.");
      return {
        success: false,
        earnedPE: 0,
        newStreak: 0,
        earnedCoins: 0,
      };
    }
    console.error("❌ Erro no Gamification Service:", error);
    throw error;
  }
}