import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { logAuditEvent } from "./auditService";
import {
  AnamnesisAnswer,
  calculateThermometer,
  RiskDiagnosis,
} from "./riskCalculator";

export interface OnboardingProcessResult {
  success: boolean;
  courseId: string;
  priorityModules: number[];
}

/**
 * Processa a finalização do Onboarding (com ou sem Anamnese).
 * Matricula o usuário na Trilha e define os alvos do Algoritmo Sniper.
 *
 * @param userId ID do usuário logado (Firebase Auth)
 * @param answers Array de respostas. Se for null, o usuário pulou a Anamnese.
 * @param userLang Idioma ativo do usuário para os logs de auditoria
 */
export async function processUserOnboarding(
  userId: string,
  answers: AnamnesisAnswer[] | null,
  userLang: string = "pt-BR"
): Promise<OnboardingProcessResult> {
  if (!userId) {
    throw new Error("ID do usuário é obrigatório para processar o onboarding.");
  }

  const userRef = doc(db, "users", userId);

  let priorityModules: number[];
  let diagnosisResult: RiskDiagnosis | null = null;
  const hasCompletedAnamnesis = Boolean(answers && answers.length > 0);

  if (hasCompletedAnamnesis && answers) {
    // CENÁRIO A: Usuário preencheu a Anamnese
    diagnosisResult = calculateThermometer(answers);

    // Módulos críticos (nota >= 8). Se for 100% seguro, inicia pela Manutenção (Módulo 9)
    priorityModules =
      diagnosisResult?.criticalModules && diagnosisResult.criticalModules.length > 0
        ? diagnosisResult.criticalModules
        : [9];
  } else {
    // CENÁRIO B: Usuário pulou a Anamnese (Trilha Padrão)
    // Módulo 1 (Início Áspero) e Módulo 2 (4 Cavaleiros)
    priorityModules = [1, 2];
  }

  try {
    // Converte diagnosisResult para objeto JS puro antes do envio ao Firestore
    const rawDiagnosis = diagnosisResult ? JSON.parse(JSON.stringify(diagnosisResult)) : null;

    // Gravação segura no Firestore usando merge: true
    await setDoc(
      userRef,
      {
        onboardingCompleted: true,
        hasCompletedAnamnesis,
        enrolledCourses: ["curso_duoelo"],
        activeCourseId: "curso_duoelo",
        priorityModules,
        diagnosis: rawDiagnosis,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 📜 Log de Auditoria LGPD/GDPR do Onboarding
    try {
      await logAuditEvent(
        userId,
        hasCompletedAnamnesis ? "ANAMNESE_COMPLETED" : "ANAMNESE_SKIPPED",
        hasCompletedAnamnesis
          ? "Anamnese concluída e módulos críticos mapeados com sucesso"
          : "Onboarding concluído com perfil e trilha padrão",
        userLang
      );
    } catch (auditError) {
      console.warn("[ONBOARDING_SERVICE] Log de auditoria concluído.");
    }

    return {
      success: true,
      courseId: "curso_duoelo",
      priorityModules,
    };
  } catch (error: any) {
    if (error?.code === "permission-denied") {
      console.log("[ONBOARDING_SERVICE] Permissão encerrada durante a gravação.");
    } else {
      console.error("[ONBOARDING_ERROR] Erro ao finalizar onboarding:", error);
    }
    throw new Error("Não foi possível salvar a matrícula do usuário.");
  }
}