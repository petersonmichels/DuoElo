const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

// Carrega a chave de segurança que está na mesma pasta
const serviceAccount = require("./serviceAccountKey.json");

// Inicializa o Firebase usando a sintaxe nova do Admin SDK (v12+)
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function uploadData() {
  try {
    console.log("Lendo o arquivo seeder.json...");

    // Lê o arquivo JSON diretamente da mesma pasta
    const jsonPath = path.resolve(__dirname, "seeder.json");
    const rawData = fs.readFileSync(jsonPath, "utf8");
    const seedData = JSON.parse(rawData);

    console.log("Iniciando a inserção de dados no Firebase via Admin SDK...");

    for (const [langCode, content] of Object.entries(seedData)) {
      console.log(`\nProcessando o idioma: ${langCode}...`);

      // Inserindo questions (Anamnese)
      if (content.questions) {
        for (let i = 0; i < content.questions.length; i++) {
          const question = content.questions[i];
          const qRef = db
            .collection("anamnesis")
            .doc(`${langCode}_${question.id}`);

          const formattedQuestion = {
            question_id: question.id || null,
            module_id: i + 1,
            language: langCode || null,
            pillar: question.title || null,
            translations: {
              [langCode]: question.text || "",
            },
            options: question.options.map((opt) => ({
              label: opt.label || "",
              translations: { [langCode]: opt.label || "" },
              points: opt.score ?? null,
              tag: opt.tag || "geral",
              icon: opt.icon || "smile",
              color: opt.color || "#4BDE95",
            })),
          };

          await qRef.set(formattedQuestion, { merge: true });
        }
        console.log(
          `- ${content.questions.length} Questões da anamnese inseridas para ${langCode}.`,
        );
      }

      // Inserindo tasks (Missões Diárias de 1 a 90)
      if (content.tasks) {
        for (let j = 0; j < content.tasks.length; j++) {
          const task = content.tasks[j];
          const taskRef = db
            .collection("tasks")
            .doc(`${langCode}_day_${j + 1}`);

          const formattedTask = {
            day: j + 1,
            phase: j + 1,
            pillar: task.pillar || null,
            targetTag: task.targetTag || null,
            level: task.level || null,
            concept: task.concept || null,
            action: task.action || null,
            pointsPE: task.pointsPE || 50,
            language: langCode || null,
          };

          await taskRef.set(formattedTask, { merge: true });
        }
        console.log(
          `- ${content.tasks.length} Missões diárias inseridas para ${langCode}.`,
        );
      }
    }

    console.log("\n🎉 Inserção de todos os dados concluída com sucesso!");
    process.exit(0); // Força o encerramento do script ao terminar
  } catch (error) {
    console.error("❌ Erro ao inserir os dados: ", error);
    process.exit(1);
  }
}

uploadData();
