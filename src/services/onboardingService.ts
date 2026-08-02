import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase"; // Ajuste se o seu arquivo firebase de front-end estiver em outro lugar
import { AnamnesisAnswer, calculateThermometer } from "../utils/riskCalculator";

/**
 * Processa a finalização do Onboarding (com ou sem Anamnese).
 * Matricula o usuário na Trilha e define os alvos do Algoritmo Sniper.
 *
 * @param userId ID do usuário logado (Firebase Auth)
 * @param answers Array de respostas. Se for null, o usuário pulou a Anamnese.
 */
export async function processUserOnboarding(
  userId: string,
  answers: AnamnesisAnswer[] | null,
) {
  const userRef = doc(db, "users", userId);

  let priorityModules: number[];
  let diagnosisResult = null;

  if (answers && answers.length > 0) {
    // CENÁRIO A: Usuário preencheu a Anamnese
    diagnosisResult = calculateThermometer(answers);

    // Pega os módulos críticos (nota >= 8). Se ele for 100% "Verde", começa pela Manutenção (Módulo 9 - Intimidade)
    priorityModules =
      diagnosisResult.criticalModules.length > 0
        ? diagnosisResult.criticalModules
        : [9];
  } else {
    // CENÁRIO B: Usuário pulou a Anamnese (Trilha Padrão)
    // Assume que ele precisa da base da comunicação para evitar divórcio rápido
    // Módulo 1 (Início Áspero) e Módulo 2 (4 Cavaleiros)
    priorityModules = [1, 2];
  }

  try {
    // Atualiza o documento do usuário no Firestore
    await updateDoc(userRef, {
      onboardingCompleted: true,
      enrolledCourses: ["curso_duoelo"], // Matricula na trilha principal que acabamos de criar
      activeCourseId: "curso_duoelo", // Define como curso visível na tela
      priorityModules: priorityModules, // O Algoritmo Sniper vai ler esta fila para entregar as tarefas!
      diagnosis: diagnosisResult, // Salva o histórico (ou null se pulou)
      updatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      courseId: "curso_duoelo",
      priorityModules,
    };
  } catch (error) {
    console.error("❌ Erro ao finalizar onboarding:", error);
    throw new Error("Não foi possível salvar a matrícula do usuário.");
  }
}
