/**
 * riskCalculator.ts
 * Motor matemático do Termômetro de Risco do DuoElo.
 * Calcula o risco conjugal com base nos 9 Módulos Clínicos.
 * Retorna chaves de internacionalização (i18n) para suportar múltiplos idiomas.
 */

// Interface para as respostas recebidas da Anamnese
export interface AnamnesisAnswer {
  moduleId: number;
  points: number; // Escala de 1 a 10
}

// Interface para o resultado do diagnóstico preparado para i18n
export interface RiskDiagnosis {
  totalScore: number;
  zone: "GREEN" | "YELLOW" | "RED";
  criticalModules: number[];
  titleKey: string; // Chave de tradução do Título
  messageKey: string; // Chave de tradução da Mensagem
}

// Pesos Clínicos (Wm) definidos na fundação do projeto
const MODULE_WEIGHTS: Record<number, number> = {
  1: 10.0, // Início Áspero
  2: 10.0, // Os 4 Cavaleiros
  3: 6.0,  // Inundação Emocional
  4: 7.0,  // Reatividade Fisiológica
  5: 6.0,  // Falha na Reparação
  6: 6.0,  // Más Memórias / RAM
  7: 6.0,  // Carga Mental Invisível
  8: 5.0,  // Instabilidade Financeira
  9: 10.0, // Neuroquímica e Intimidade
};

/**
 * Calcula a pontuação total e define a Zona do Termômetro.
 * @param answers Array de respostas do usuário
 * @returns RiskDiagnosis com pontuação, zona de risco e chaves i18n
 */
export function calculateThermometer(
  answers: AnamnesisAnswer[]
): RiskDiagnosis {
  let totalScore = 0;
  const criticalModules: number[] = [];

  if (answers && Array.isArray(answers)) {
    answers.forEach((answer) => {
      const points = Number(answer.points) || 0;
      const weight = MODULE_WEIGHTS[answer.moduleId] || 1.0;
      const moduleRisk = points * weight;

      totalScore += moduleRisk;

      // Marca módulos críticos para intervenção no Algoritmo Sniper
      if (points >= 8 && !criticalModules.includes(answer.moduleId)) {
        criticalModules.push(answer.moduleId);
      }
    });
  }

  let zone: "GREEN" | "YELLOW" | "RED";
  let titleKey: string;
  let messageKey: string;

  // Definição das zonas e atribuição das chaves de tradução mapeadas no i18n
  if (totalScore <= 150) {
    zone = "GREEN";
    titleKey = "result_hot_title";
    messageKey = "result_hot_desc";
  } else if (totalScore <= 320) {
    zone = "YELLOW";
    titleKey = "result_warm_title";
    messageKey = "result_warm_desc";
  } else {
    zone = "RED";
    titleKey = "result_cold_title";
    messageKey = "result_cold_desc";
  }

  return {
    totalScore: Math.round(totalScore),
    zone,
    criticalModules,
    titleKey,
    messageKey,
  };
}