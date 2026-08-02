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
 * Motor de Gamificação: Registra a vitória, calcula a ofensiva e dá as recompensas.
 */
export async function completeDailyTask(
  userId: string,
  taskId: string,
  pointsPE: number,
): Promise<GamificationResult> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("Usuário não encontrado.");
    }

    const userData = userSnap.data();
    const lastTaskDate = userData.lastTaskDate;
    let currentStreak = userData.streak || 0;

    // --- MATEMÁTICA DO TEMPO (FUSO HORÁRIO SEGURO) ---
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // Ex: "2026-07-30"

    const yesterdayObj = new Date(now);
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterday = yesterdayObj.toISOString().split("T")[0];

    // --- LÓGICA DO FOGUINHO (STREAK) ---
    if (lastTaskDate === today) {
      // Defesa dupla: Se por algum milagre ele burlar o Sniper e enviar de novo hoje
      console.log("Missão já computada hoje. Nenhuma alteração feita.");
      return {
        success: true,
        earnedPE: 0,
        newStreak: currentStreak,
        earnedCoins: 0,
      };
    } else if (lastTaskDate === yesterday) {
      // Jogou ontem e jogou hoje: Aumenta o foguinho! 🔥
      currentStreak += 1;
    } else {
      // Ficou mais de 1 dia sem jogar: Foguinho volta pro 1 🧊
      currentStreak = 1;
    }

    const earnedCoins = 10; // Valor fixo de moedas por missão (pode ser dinâmico depois)

    // --- ATUALIZAÇÃO BLINDADA NO FIREBASE ---
    await updateDoc(userRef, {
      completedTasks: arrayUnion(taskId), // Adiciona o ID na lista sem apagar os antigos
      lastTaskDate: today, // Trava o Sniper para o resto do dia
      streak: currentStreak, // Atualiza o Foguinho
      totalPE: increment(pointsPE), // Soma os Pontos de Evolução matematicamente
      duoCoins: increment(earnedCoins), // Soma as moedas na carteira
    });

    console.log(
      `✅ Vitória registrada! +${pointsPE} PE | Streak: ${currentStreak}`,
    );

    return {
      success: true,
      earnedPE: pointsPE,
      newStreak: currentStreak,
      earnedCoins: earnedCoins,
    };
  } catch (error) {
    console.error("❌ Erro no Gamification Service:", error);
    throw error;
  }
}
