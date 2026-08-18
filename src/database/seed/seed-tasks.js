/**
 * DuoElo Unified Tasks & Challenges Seeding Script (Saneado & Multilíngue)
 *
 * 1. Zera as coleções 'tasks', 'weekly_challenges' e 'weeks' no Firestore.
 * 2. Garante o salvamento dos 7 idiomas do app com gradação de custo emocional.
 */

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const serviceAccountPath = path.resolve(__dirname, "./serviceAccountKey.json");
const seederJsonPath = path.resolve(__dirname, "./seeder.json");

const serviceAccount = require(serviceAccountPath);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

// Mapeamento autoral dos 5 Eixos DuoElo para as categorias em cada idioma
const CATEGORIAS_AUTORAIS = {
  "pt-BR": [
    "Sintonia e Comunicação",
    "Chama e Intimidade",
    "Resolução e Escuta",
    "Cuidado e Presença",
    "Projetos e Parceria",
  ],
  "pt-PT": [
    "Sintonia e Comunicação",
    "Chama e Intimidade",
    "Resolução e Escuta",
    "Cuidado e Presença",
    "Projetos e Parceria",
  ],
  "pt-CV": [
    "Sintonia e Comunicação",
    "Chama e Intimidade",
    "Resolução e Escuta",
    "Cuidado e Presença",
    "Projetos e Parceria",
  ],
  en: [
    "Harmony & Communication",
    "Spark & Intimacy",
    "Resolution & Listening",
    "Care & Presence",
    "Projects & Partnership",
  ],
  es: [
    "Sintonía y Comunicación",
    "Chispa e Intimidad",
    "Resolución y Escucha",
    "Cuidado y Presencia",
    "Proyectos y Asociación",
  ],
  fr: [
    "Harmonie & Communication",
    "Flamme & Intimité",
    "Résolution & Écoute",
    "Soin & Présence",
    "Projets & Partenariat",
  ],
  de: [
    "Harmonie & Kommunikation",
    "Funke & Intimität",
    "Lösung & Zuhören",
    "Fürsorge & Präsenz",
    "Projekte & Partnerschaft",
  ],
  ja: [
    "調和とコミュニケーション",
    "情熱と親密さ",
    "解決と傾聴",
    "思いやりと存在感",
    "プロジェクトとパートナーシップ",
  ],
};

// Lista oficial dos idiomas suportados pelo app
const SUPPORTED_APP_LANGUAGES = [
  "pt-BR",
  "pt-PT",
  "pt-CV",
  "en",
  "es",
  "fr",
  "de",
  "ja",
];

async function clearCollection(collectionName) {
  const colRef = db.collection(collectionName);
  const snapshot = await colRef.get();
  if (!snapshot.empty) {
    const deleteBatch = db.batch();
    snapshot.docs.forEach((doc) => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();
    console.log(
      `🗑️ Limpeza concluída: ${snapshot.size} documentos removidos de '${collectionName}'.`,
    );
  }
}

async function uploadUnifiedTasksAndChallenges() {
  try {
    console.log(
      "🧹 [1/2] Zerando as coleções 'tasks', 'weekly_challenges' e 'weeks' no Firestore...",
    );
    await clearCollection("tasks");
    await clearCollection("weekly_challenges");
    await clearCollection("weeks");

    console.log(
      "\n🚀 [2/2] Lendo 'seeder.json' e enviando tarefas saneadas em todos os idiomas...",
    );
    const rawData = fs.readFileSync(seederJsonPath, "utf8");
    const seedData = JSON.parse(rawData);

    const baseContent =
      seedData["pt-BR"] || seedData["en"] || Object.values(seedData)[0];

    for (const langCode of SUPPORTED_APP_LANGUAGES) {
      const content = seedData[langCode] || baseContent;
      const categoriesForLang =
        CATEGORIAS_AUTORAIS[langCode] || CATEGORIAS_AUTORAIS["pt-BR"];

      console.log(`\n🌍 Processando idioma: [${langCode.toUpperCase()}]...`);

      // 1. MISSÕES DIÁRIAS (Tasks - 90 Dias)
      if (content.tasks && content.tasks.length > 0) {
        const batch = db.batch();
        for (let j = 0; j < content.tasks.length; j++) {
          const task = content.tasks[j];
          const dayNumber = task.day || j + 1;
          const taskDocId = `${langCode}_day_${dayNumber}`;
          const taskRef = db.collection("tasks").doc(taskDocId);

          // Lógica de Custo Emocional Gradual (Fase 1: 1-14 | Fase 2: 15-45 | Fase 3: 46-90)
          let emotionalCost = "baixo";
          let phase = 1;
          if (dayNumber > 14 && dayNumber <= 45) {
            emotionalCost = "medio";
            phase = 2;
          } else if (dayNumber > 45) {
            emotionalCost = "alto";
            phase = 3;
          }

          const categoryAutoral =
            categoriesForLang[(dayNumber - 1) % categoriesForLang.length];

          const formattedTask = {
            taskId: task.id || `task_${dayNumber}`,
            day: dayNumber,
            phase: phase,
            emotionalCost: emotionalCost,
            category: categoryAutoral,
            title: task.title || `Missão Dia ${dayNumber}`,
            description: task.description || "",
            concept:
              task.concept || "Fortalecimento contínuo da cumplicidade a dois.",
            action: task.action || "",
            scope: task.scope || "bilateral",
            pointsPE: task.pointsPE || 50,
            language: langCode,
            updatedAt: new Date().toISOString(),
          };

          batch.set(taskRef, formattedTask, { merge: true });
        }
        await batch.commit();
        console.log(
          `   ✅ ${content.tasks.length} Missões Diárias gravadas em [${langCode}].`,
        );
      }

      // 2. DESAFIOS DE OURO (Weekly Challenges - 13 Semanas)
      const weeklyChallenges =
        content.weekly_challenges || content.weeklyChallenges;
      if (weeklyChallenges && weeklyChallenges.length > 0) {
        const batch = db.batch();
        for (let k = 0; k < weeklyChallenges.length; k++) {
          const challenge = weeklyChallenges[k];
          const weekNum = challenge.week || challenge.weekNumber || k + 1;
          const challengeDocId = `${langCode}_week_${weekNum}`;
          const challengeRef = db
            .collection("weekly_challenges")
            .doc(challengeDocId);

          const formattedChallenge = {
            challengeId: challenge.id || `challenge_week_${weekNum}`,
            week: weekNum,
            title: challenge.title || `Desafio de Ouro - Semana ${weekNum}`,
            description: challenge.description || "",
            action: challenge.action || "",
            pointsPE: challenge.pointsPE || 150,
            language: langCode,
            isGoldChallenge: true,
            updatedAt: new Date().toISOString(),
          };

          batch.set(challengeRef, formattedChallenge, { merge: true });
        }
        await batch.commit();
        console.log(
          `   ✅ ${weeklyChallenges.length} Desafios Semanais gravados em [${langCode}].`,
        );
      }

      // 3. TEMAS DAS SEMANAS (Weeks)
      if (content.weeks && content.weeks.length > 0) {
        const batch = db.batch();
        for (let w = 0; w < content.weeks.length; w++) {
          const week = content.weeks[w];
          const weekNum = week.week || week.weekNumber || w + 1;
          const weekDocId = `${langCode}_week_${weekNum}`;
          const weekRef = db.collection("weeks").doc(weekDocId);

          batch.set(
            weekRef,
            {
              weekNumber: weekNum,
              theme: week.theme || `Tema da Semana ${weekNum}`,
              description: week.description || "",
              language: langCode,
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );
        }
        await batch.commit();
        console.log(
          `   ✅ ${content.weeks.length} Temas Semanais gravados em [${langCode}].`,
        );
      }
    }

    console.log(
      "\n🎉 SANEAMENTO CONCLUÍDO! As coleções 'tasks', 'weekly_challenges' e 'weeks' foram reescritas com sucesso!",
    );
  } catch (error) {
    console.error("\n❌ Erro crítico ao popular as tarefas: ", error);
    process.exit(1);
  }
}

if (require.main === module) {
  uploadUnifiedTasksAndChallenges().then(() => process.exit(0));
}

module.exports = { uploadUnifiedTasksAndChallenges };
