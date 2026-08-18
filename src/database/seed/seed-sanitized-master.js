/**
 * DuoElo Sanitized Master Seeding Script
 *
 * 1. Zera as coleções do Firestore: 'anamnesis', 'tasks', 'weekly_challenges' e 'weeks'.
 * 2. Lê o 'seeder.json' em todos os 7 idiomas.
 * 3. Aplica a higienização de Propriedade Intelectual (PI) em tempo de execução.
 * 4. Grava os registros autorais DuoElo no banco de dados.
 */

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const serviceAccountPath = path.resolve(__dirname, "./serviceAccountKey.json");
const seederJsonPath = path.resolve(__dirname, "./seeder.json");

const serviceAccount = require(serviceAccountPath);

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

// Dicionário de Substituição de Termos de Risco (PI)
const PI_SANITIZATION_RULES = [
  { regex: /Os Quatro Cavaleiros/gi, replacement: "Resolução e Escuta" },
  { regex: /The Four Horsemen/gi, replacement: "Resolution & Listening" },
  { regex: /Les Quatre Cavaliers/gi, replacement: "Résolution & Écoute" },
  { regex: /Die vier Reiter/gi, replacement: "Lösung & Zuhören" },
  { regex: /Los Cuatro Jinetes/gi, replacement: "Resolución y Escucha" },
  { regex: /四騎士/gi, replacement: "解決と傾聴" },
  {
    regex: /Higiene Mental do DCD de Augusto Cury/gi,
    replacement: "Higiene Mental e Filtragem de Estresse DuoElo",
  },
  {
    regex: /Augusto Cury/gi,
    replacement: "Metodologia de Gestão Emocional DuoElo",
  },
  { regex: /Gottman/gi, replacement: "Análise de Dinâmicas de Casal" },
  { regex: /Desafio de Amar/gi, replacement: "Jornada DuoElo" },
  { regex: /Fenômeno RAM/gi, replacement: "Filtro de Memória Afetiva" },
  { regex: /Sala da Depreciação/gi, replacement: "Filtro de Desgaste" },
  { regex: /Sala da Admiração/gi, replacement: "Filtro de Sintonia" },
];

function sanitizeText(text) {
  if (!text || typeof text !== "string") return text;
  let sanitized = text;
  PI_SANITIZATION_RULES.forEach((rule) => {
    sanitized = sanitized.replace(rule.regex, rule.replacement);
  });
  return sanitized;
}

function sanitizeObject(obj) {
  if (!obj) return obj;
  if (typeof obj === "string") return sanitizeText(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === "object") {
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      newObj[key] = sanitizeObject(value);
    }
    return newObj;
  }
  return obj;
}

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

async function runSanitizedMasterSeed() {
  console.log("==================================================");
  console.log("🚀 INICIANDO RESET & SEED AUTORAL COMPLETO DUOELO");
  console.log("==================================================\n");

  try {
    // 1. Zera todas as coleções antigas
    console.log("🧹 [1/2] Limpando coleções antigas no Firestore...");
    await clearCollection("anamnesis");
    await clearCollection("tasks");
    await clearCollection("weekly_challenges");
    await clearCollection("weeks");

    // 2. Lê e sanitiza o seeder.json
    console.log(
      "\n🔍 [2/2] Lendo 'seeder.json' e aplicando saneamento de PI...",
    );
    const rawData = fs.readFileSync(seederJsonPath, "utf8");
    const rawSeedData = JSON.parse(rawData);
    const seedData = sanitizeObject(rawSeedData);

    for (const [langCode, content] of Object.entries(seedData)) {
      console.log(
        `\n🌍 Gravação no banco para o idioma: [${langCode.toUpperCase()}]`,
      );

      // A) Anamnese
      if (content.questions && content.questions.length > 0) {
        const batch = db.batch();
        for (let i = 0; i < content.questions.length; i++) {
          const q = content.questions[i];
          const qDocId = `${langCode}_${q.id || i}`;
          const qRef = db.collection("anamnesis").doc(qDocId);

          const formattedQuestion = {
            question_id: q.id || `q_${i}`,
            module_id: i + 1,
            language: langCode,
            pillar: q.title || "Sintonia e Comunicação",
            translations: { [langCode]: q.text || "" },
            options: (q.options || []).map((opt) => ({
              label: opt.label || "",
              translations: { [langCode]: opt.label || "" },
              points: opt.score ?? 5,
              tag: opt.tag || "sintonia_geral",
              icon: opt.icon || "smile",
              color: opt.color || "#4BDE95",
            })),
            updatedAt: new Date().toISOString(),
          };

          batch.set(qRef, formattedQuestion, { merge: true });
        }
        await batch.commit();
        console.log(
          `   ✅ ${content.questions.length} Perguntas da Anamnese salvas.`,
        );
      }

      // B) Tarefas Diárias (90 Dias)
      if (content.tasks && content.tasks.length > 0) {
        const batch = db.batch();
        for (let j = 0; j < content.tasks.length; j++) {
          const t = content.tasks[j];
          const dayNum = t.day || j + 1;
          const taskDocId = `${langCode}_day_${dayNum}`;
          const taskRef = db.collection("tasks").doc(taskDocId);

          let emotionalCost = "baixo";
          let phase = 1;
          if (dayNum > 14 && dayNum <= 45) {
            emotionalCost = "medio";
            phase = 2;
          } else if (dayNum > 45) {
            emotionalCost = "alto";
            phase = 3;
          }

          const formattedTask = {
            taskId: t.task_id || t.id || `task_${dayNum}`,
            day: dayNum,
            phase: phase,
            emotionalCost: emotionalCost,
            category: t.pillar || "Sintonia e Comunicação",
            title: t.title || `Missão Dia ${dayNum}`,
            description: t.description || t.action || "",
            concept:
              t.concept || "Fortalecimento contínuo da cumplicidade a dois.",
            action: t.action || t.description || "",
            scope: t.scope || "bilateral",
            pointsPE: t.pointsPE || 50,
            language: langCode,
            updatedAt: new Date().toISOString(),
          };

          batch.set(taskRef, formattedTask, { merge: true });
        }
        await batch.commit();
        console.log(`   ✅ ${content.tasks.length} Missões Diárias salvas.`);
      }

      // C) Desafios de Ouro (Weekly Challenges)
      const weeklyChallenges =
        content.weekly_challenges || content.weeklyChallenges;
      if (weeklyChallenges && weeklyChallenges.length > 0) {
        const batch = db.batch();
        for (let k = 0; k < weeklyChallenges.length; k++) {
          const c = weeklyChallenges[k];
          const weekNum = c.week || k + 1;
          const challengeDocId = `${langCode}_week_${weekNum}`;
          const challengeRef = db
            .collection("weekly_challenges")
            .doc(challengeDocId);

          const formattedChallenge = {
            challengeId: c.tag || `challenge_week_${weekNum}`,
            week: weekNum,
            title: c.title || `Desafio de Ouro - Semana ${weekNum}`,
            description: c.concept || c.description || "",
            action: c.action || "",
            theme_1co13: c.theme_1co13 || "",
            pointsPE: c.pointsPE || 150,
            language: langCode,
            isGoldChallenge: true,
            updatedAt: new Date().toISOString(),
          };

          batch.set(challengeRef, formattedChallenge, { merge: true });
        }
        await batch.commit();
        console.log(
          `   ✅ ${weeklyChallenges.length} Desafios de Ouro salvos.`,
        );
      }
    }

    console.log("\n==================================================");
    console.log("🎉 PROCESSO CONCLUÍDO COM SUCESSO!");
    console.log("   Sua base do Firestore foi completamente saneada");
    console.log("   e gravada com o padrão autoral e seguro DuoElo.");
    console.log("==================================================");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Erro crítico durante a execução do seed:", error);
    process.exit(1);
  }
}

runSanitizedMasterSeed();
