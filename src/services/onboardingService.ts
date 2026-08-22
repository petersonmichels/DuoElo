import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import {
  AnamnesisAnswer,
  calculateThermometer,
  RiskDiagnosis,
} from "./riskCalculator";

/**
 * Processa a finalização do Onboarding (com ou sem Anamnese).
 * Matricula o usuário na Trilha e define os alvos do Algoritmo Sniper.
 *
 * @param userId ID do usuário logado (Firebase Auth)
 * @param answers Array de respostas. Se for null, o usuário pulou a Anamnese.
 */
export async function processUserOnboarding(
  userId: string,
  answers: AnamnesisAnswer[] | null
) {
  const userRef = doc(db, "users", userId);

  let priorityModules: number[];
  let diagnosisResult: RiskDiagnosis | null = null;

  if (answers && answers.length > 0) {
    // CENÁRIO A: Usuário preencheu a Anamnese
    diagnosisResult = calculateThermometer(answers);

    // Módulos críticos (nota >= 8). Se for 100% seguro, inicia pela Manutenção (Módulo 9)
    priorityModules =
      diagnosisResult.criticalModules.length > 0
        ? diagnosisResult.criticalModules
        : [9];
  } else {
    // CENÁRIO B: Usuário pulou a Anamnese (Trilha Padrão)
    // Módulo 1 (Início Áspero) e Módulo 2 (4 Cavaleiros)
    priorityModules = [1, 2];
  }

  try {
    // Atualiza o documento do usuário no Firestore
    await updateDoc(userRef, {
      onboardingCompleted: true,
      enrolledCourses: ["curso_duoelo"],
      activeCourseId: "curso_duoelo",
      priorityModules: priorityModules,
      diagnosis: diagnosisResult,
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      courseId: "curso_duoelo",
      priorityModules,
    };
  } catch (error) {
    console.error("[ONBOARDING_ERROR] Erro ao finalizar onboarding:", error);
    throw new Error("Não foi possível salvar a matrícula do usuário.");
  }
}