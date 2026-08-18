/**
 * DuoElo Seed Master Orchestrator (Saneamento Total DuoElo)
 *
 * Executa em sequência:
 * 1. seed-anamnesis.js (Eixos de Conexão DuoElo + Anamnese Multilíngue)
 * 2. seed-tasks.js (Tarefas Diárias, Desafios de Ouro e Semanas em 7+ Idiomas)
 */

const path = require("path");
const { seedAnamnesis } = require("./seed-anamnesis");

async function runMasterSeed() {
  console.log("==================================================");
  console.log("🚀 INICIANDO SANEAMENTO MASTER DO BANCO DUOELO");
  console.log("==================================================\n");

  try {
    // 1. Executa Saneamento da Anamnese
    console.log("📌 ETAPA 1: Processando Anamnese Autoral...");
    await seedAnamnesis();
    console.log("✅ ETAPA 1 Concluída com sucesso!\n");

    // 2. Executa Saneamento de Tarefas e Desafios
    console.log("📌 ETAPA 2: Processando Tarefas, Desafios e Semanas...");
    // Se o seed-tasks exporta função ou roda via require:
    const seedTasksModule = require("./seed-tasks");
    if (typeof seedTasksModule.uploadUnifiedTasksAndChallenges === "function") {
      await seedTasksModule.uploadUnifiedTasksAndChallenges();
    }
    console.log("✅ ETAPA 2 Concluída com sucesso!\n");

    console.log("==================================================");
    console.log("🎉 MÁGICA CONCLUÍDA! Todo o banco de dados foi saneado,");
    console.log("   zerado e recarregado para produção em 7 idiomas!");
    console.log("==================================================");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERRO CRÍTICO NO SEED MASTER:", error);
    process.exit(1);
  }
}

runMasterSeed();
