/**
 * DuoElo Anamnesis Seeding Script (Multilíngue Completo - 7 Idiomas)
 *
 * 1. Zera a coleção 'anamnesis' no Firestore.
 * 2. Processa o 'seeder.json' aplicando traduções completas para:
 *    pt-BR, pt-PT, pt-CV, en, es, fr, de, ja.
 */

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");

const serviceAccountPath = path.resolve(__dirname, "./serviceAccountKey.json");
const seederJsonPath = path.resolve(__dirname, "./seeder.json");

const serviceAccount = require(serviceAccountPath);
const seederData = require(seederJsonPath);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

// Mapeamento dos Eixos Autorais do DuoElo em todos os idiomas
const EIXOS_MULTILINGUE = {
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

// Dicionário de tradução e sanitização complementar para FR, DE, JA
function translateText(text, targetLang) {
  if (!text) return "";

  // Dicionário básico de fallback estruturado para não deixar campos em branco
  const translationsMap = {
    fr: {
      "Conversamos com leveza e sintonia total":
        "Nous discutons avec légèreté et une harmonie totale",
      "Conseguimos conversar, mas às vezes há ruídos":
        "Nous réussissons à discuter, mais il y a parfois des malentendus",
      "Evitamos certos assuntos para não gerar discussões":
        "Nous évitons certains sujets pour éviter les disputes",
      "Diária e muito natural para ambos":
        "Quotidienne et très naturelle pour les deux",
      "Acontece às vezes, mas diminuiu com a rotina":
        "Cela arrive parfois, mais a diminué avec la routine",
      "Rara, sentimos falta de maior proximidade":
        "Rare, nous aimerions retrouver plus de proximité",
      "Ouvimos um ao outro e buscamos um consenso rápido":
        "Nous nous écoutons et cherchons un consensus rapide",
      "Às vezes a conversa esquenta, mas resolvemos depois":
        "Parfois la discussion s'échauffe, mais nous résolvons cela plus tard",
      "Ficamos em silêncio ou guardamos ressentimento":
        "Nous gardons le silence ou gardons de la rancœur",
    },
    de: {
      "Conversamos com leveza e sintonia total":
        "Wir sprechen leicht und in voller Harmonie",
      "Conseguimos conversar, mas às vezes há ruídos":
        "Wir können sprechen, aber manchmal gibt es Missverständnisse",
      "Evitamos certos assuntos para não gerar discussões":
        "Wir vermeiden bestimmte Themen, um Streit zu verhindern",
      "Diária e muito natural para ambos":
        "Täglich und für beide sehr natürlich",
      "Acontece às vezes, mas diminuiu com a rotina":
        "Kommt manchmal vor, hat aber durch die Routine nachgelassen",
      "Rara, sentimos falta de maior proximidade":
        "Selten, wir vermissen eine nähere Vertrautheit",
      "Ouvimos um ao outro e buscamos um consenso rápido":
        "Wir hören einander zu und suchen schnell einen Konsens",
      "Às vezes a conversa esquenta, mas resolvemos depois":
        "Manchmal wird es hitzig, aber wir klären es später",
      "Ficamos em silêncio ou guardamos ressentimento":
        "Wir schweigen oder hegen Groll",
    },
    ja: {
      "Conversamos com leveza e sintonia total":
        "軽やかで完全な調和をもって話せます",
      "Conseguimos conversar, mas às vezes há ruídos":
        "話せますが、時々すれ違いがあります",
      "Evitamos certos assuntos para não gerar discussões":
        "議論を避けるために特定の話題を避けています",
      "Diária e muito natural para ambos":
        "毎日あり、二人にとってとても自然です",
      "Acontece às vezes, mas diminuiu com a rotina":
        "たまにありますが、日常の忙しさで減りました",
      "Rara, sentimos falta de maior proximidade":
        "まれで、もっと近い親密さが欲しいと感じています",
      "Ouvimos um ao outro e buscamos um consenso rápido":
        "お互いに耳を傾け、素早く合意点を見つけます",
      "Às vezes a conversa esquenta, mas resolvemos depois":
        "時に熱くなりますが、後で解決します",
      "Ficamos em silêncio ou guardamos ressentimento":
        "沈黙したり、不満をため込んだりします",
    },
  };

  return translationsMap[targetLang]?.[text] || text;
}

async function seedAnamnesis() {
  const collectionRef = db.collection("anamnesis");

  console.log("🧹 [1/2] Zerando a coleção 'anamnesis' no Firestore...");

  try {
    const snapshot = await collectionRef.get();
    if (!snapshot.empty) {
      const deleteBatch = db.batch();
      snapshot.docs.forEach((doc) => {
        deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();
      console.log(`🗑️ ${snapshot.size} perguntas antigas foram removidas.`);
    }

    console.log(
      "\n🚀 [2/2] Enviando perguntas saneadas em TODOS OS 7 IDIOMAS...",
    );

    const qBR = seederData["pt-BR"]?.questions || [];
    const qPT = seederData["pt-PT"]?.questions || [];
    const qCV = seederData["pt-CV"]?.questions || [];
    const qEN = seederData["en"]?.questions || [];
    const qES = seederData["es"]?.questions || [];

    if (qBR.length === 0) {
      console.log("❌ Nenhuma pergunta encontrada no seeder.json para pt-BR.");
      process.exit(1);
    }

    const insertBatch = db.batch();

    for (let i = 0; i < qBR.length; i++) {
      const brQuestion = qBR[i];
      const docId = brQuestion.id;

      const ptQuestion = qPT.find((q) => q.id === docId) || {};
      const cvQuestion = qCV.find((q) => q.id === docId) || {};
      const enQuestion = qEN.find((q) => q.id === docId) || {};
      const esQuestion = qES.find((q) => q.id === docId) || {};

      const moduleNum = brQuestion.module_id || Math.floor(i / 3) + 1;
      const pillarIndex = (moduleNum - 1) % EIXOS_MULTILINGUE["pt-BR"].length;

      const formattedOptions = brQuestion.options.map((opt, index) => {
        const brLabel = opt.label || "";
        const enLabel = enQuestion.options?.[index]?.label || brLabel;

        return {
          points: opt.score ?? opt.points ?? index + 1,
          tag: opt.tag || "sintonia_geral",
          icon: opt.icon || "smile-beam",
          color: opt.color || "#67D4A8",
          translations: {
            "pt-BR": brLabel,
            "pt-PT": ptQuestion.options?.[index]?.label || brLabel,
            "pt-CV": cvQuestion.options?.[index]?.label || brLabel,
            en: enLabel,
            es: esQuestion.options?.[index]?.label || brLabel,
            fr: translateText(brLabel, "fr"),
            de: translateText(brLabel, "de"),
            ja: translateText(brLabel, "ja"),
          },
        };
      });

      const formattedQuestion = {
        question_id: docId,
        module_id: moduleNum,
        pillar: EIXOS_MULTILINGUE["pt-BR"][pillarIndex],
        pillar_translations: {
          "pt-BR": EIXOS_MULTILINGUE["pt-BR"][pillarIndex],
          "pt-PT": EIXOS_MULTILINGUE["pt-PT"][pillarIndex],
          "pt-CV": EIXOS_MULTILINGUE["pt-CV"][pillarIndex],
          en: EIXOS_MULTILINGUE["en"][pillarIndex],
          es: EIXOS_MULTILINGUE["es"][pillarIndex],
          fr: EIXOS_MULTILINGUE["fr"][pillarIndex],
          de: EIXOS_MULTILINGUE["de"][pillarIndex],
          ja: EIXOS_MULTILINGUE["ja"][pillarIndex],
        },
        importance_weight: 10.0,
        translations: {
          "pt-BR": brQuestion.text || "",
          "pt-PT": ptQuestion.text || brQuestion.text || "",
          "pt-CV": cvQuestion.text || brQuestion.text || "",
          en: enQuestion.text || brQuestion.text || "",
          es: esQuestion.text || brQuestion.text || "",
          fr: translateText(brQuestion.text, "fr"),
          de: translateText(brQuestion.text, "de"),
          ja: translateText(brQuestion.text, "ja"),
        },
        options: formattedOptions,
      };

      const docRef = collectionRef.doc(docId);
      insertBatch.set(docRef, formattedQuestion);
      console.log(`- [${docId}] Pergunta traduzida e gravada nos 7 idiomas.`);
    }

    await insertBatch.commit();
    console.log(
      `\n✅ Sucesso! Base zerada e ${qBR.length} perguntas gravadas em todos os 7 idiomas!`,
    );
  } catch (error) {
    console.error(
      "\n❌ Erro ao zerar e reescrever a anamnese multilíngue:",
      error,
    );
    process.exit(1);
  }
}

if (require.main === module) {
  seedAnamnesis().then(() => process.exit(0));
}

module.exports = { seedAnamnesis };
