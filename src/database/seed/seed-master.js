const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

// Carrega a chave mestra de segurança (ignora bloqueios do terminal)
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function uploadUnifiedData() {
  try {
    console.log("🚀 Lendo o arquivo unificado seeder.json...");
    const jsonPath = path.resolve(__dirname, "seeder.json");
    const rawData = fs.readFileSync(jsonPath, "utf8");
    const seedData = JSON.parse(rawData);

    console.log(
      "⚙️ Iniciando a inserção de dados no Firebase via Admin SDK...\n",
    );

    for (const [langCode, content] of Object.entries(seedData)) {
      console.log(`🌍 Processando o idioma: [${langCode.toUpperCase()}]...`);

      // ---------------------------------------------------------
      // 1. ANAMNESE (Questions)
      // ---------------------------------------------------------
      if (content.questions) {
        for (let i = 0; i < content.questions.length; i++) {
          const question = content.questions[i];
          const qRef = db
            .collection("anamnesis")
            .doc(`${langCode}_${question.id || i}`);

          const formattedQuestion = {
            question_id: question.id || null,
            module_id: i + 1,
            language: langCode,
            pillar: question.title || null,
            translations: { [langCode]: question.text || "" },
            options: question.options
              ? question.options.map((opt) => ({
                  label: opt.label || "",
                  translations: { [langCode]: opt.label || "" },
                  points: opt.score ?? null,
                  tag: opt.tag || "geral",
                  icon: opt.icon || "smile",
                  color: opt.color || "#4BDE95",
                }))
              : [],
          };
          await qRef.set(formattedQuestion, { merge: true });
        }
        console.log(
          `   ✅ ${content.questions.length} Questões da Anamnese inseridas.`,
        );
      }

      // ---------------------------------------------------------
      // 2. MISSÕES DIÁRIAS (Tasks - 90 Dias)
      // ---------------------------------------------------------
      if (content.tasks) {
        for (let j = 0; j < content.tasks.length; j++) {
          const task = content.tasks[j];
          const dayNumber = task.day || j + 1;
          const taskRef = db
            .collection("tasks")
            .doc(`${langCode}_day_${dayNumber}`);

          const formattedTask = {
            ...task, // Puxa todos os textos (title, action, concept, etc)
            day: dayNumber,
            phase: task.phase || dayNumber,
            pointsPE: task.pointsPE || 50,
            language: langCode,
          };
          await taskRef.set(formattedTask, { merge: true });
        }
        console.log(`   ✅ ${content.tasks.length} Missões Diárias inseridas.`);
      }

      // ---------------------------------------------------------
      // 3. DESAFIOS DE OURO (Weekly Challenges - 13 Semanas)
      // ---------------------------------------------------------
      const weeklyChallenges =
        content.weekly_challenges || content.weeklyChallenges;
      if (weeklyChallenges) {
        for (let k = 0; k < weeklyChallenges.length; k++) {
          const challenge = weeklyChallenges[k];
          const weekNum = challenge.week || challenge.weekNumber || k + 1;
          const challengeRef = db
            .collection("weekly_challenges")
            .doc(`${langCode}_week_${weekNum}`);

          const formattedChallenge = {
            ...challenge, // Puxa todos os textos do Desafio
            week: weekNum,
            pointsPE: challenge.pointsPE || 150, // Recompensa gorda por ser desafio de ouro
            language: langCode,
            isGoldChallenge: true,
          };
          await challengeRef.set(formattedChallenge, { merge: true });
        }
        console.log(
          `   ✅ ${weeklyChallenges.length} Desafios de Ouro Semanais inseridos.`,
        );
      }

      // ---------------------------------------------------------
      // 4. TEMAS DAS SEMANAS (Weeks - Opcional se estiver no JSON)
      // ---------------------------------------------------------
      if (content.weeks) {
        for (let w = 0; w < content.weeks.length; w++) {
          const week = content.weeks[w];
          const weekNum = week.week || week.weekNumber || w + 1;
          const weekRef = db
            .collection("weeks")
            .doc(`${langCode}_week_${weekNum}`);

          await weekRef.set(
            {
              ...week,
              weekNumber: weekNum,
              language: langCode,
            },
            { merge: true },
          );
        }
        console.log(
          `   ✅ ${content.weeks.length} Temas de Semanas inseridos.`,
        );
      }
    }

    console.log(
      "\n🎉 MÁGICA CONCLUÍDA! O banco de dados absoluto foi carregado para produção!",
    );
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Erro crítico ao popular os dados: ", error);
    process.exit(1);
  }
}

uploadUnifiedData();
