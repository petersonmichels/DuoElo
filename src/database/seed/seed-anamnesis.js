/**
 * DuoElo Anamnesis Seeding Script
 *
 * Lê dinamicamente o arquivo 'seeder.json' (gerado pelo NotebookLM)
 * e o converte perfeitamente para a estrutura original que o app já
 * usa na coleção 'anamnesis' (com translations na raiz e nas opções).
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");

// Carrega as credenciais com caminho absoluto
const serviceAccount = require(
  path.resolve(__dirname, "./serviceAccountKey.json"),
);

// 🔥 CARREGA O ARQUIVO JSON COM OS 5 IDIOMAS
const seederData = require(path.resolve(__dirname, "./seeder.json"));

// Inicializa o Firebase Admin com o formato moderno
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function seedAnamnesis() {
  const collectionRef = db.collection("anamnesis");
  const batch = db.batch();

  console.log(
    "🚀 Iniciando a leitura do seeder.json e envio para a Anamnese...",
  );

  try {
    // Separa os arrays de perguntas de cada idioma
    const qBR = seederData["pt-BR"]?.questions || [];
    const qPT = seederData["pt-PT"]?.questions || [];
    const qCV = seederData["pt-CV"]?.questions || [];
    const qEN = seederData["en"]?.questions || [];
    const qES = seederData["es"]?.questions || [];

    if (qBR.length === 0) {
      console.log("❌ Nenhuma pergunta encontrada no seeder.json para pt-BR.");
      process.exit(1);
    }

    console.log(
      `Encontradas ${qBR.length} perguntas. Montando o lote de envio...\n`,
    );

    // Varre todas as perguntas
    for (let i = 0; i < qBR.length; i++) {
      const brQuestion = qBR[i];
      const docId = brQuestion.id; // Ex: "mod1_1"

      // Encontra a mesma pergunta nos outros idiomas baseando-se no ID
      const ptQuestion = qPT.find((q) => q.id === docId) || {};
      const cvQuestion = qCV.find((q) => q.id === docId) || {};
      const enQuestion = qEN.find((q) => q.id === docId) || {};
      const esQuestion = qES.find((q) => q.id === docId) || {};

      // Monta o array de opções no formato exato que o seu App já lê!
      const formattedOptions = brQuestion.options.map((opt, index) => {
        return {
          points: opt.score, // Usa o 'score' do JSON como 'points'
          tag: opt.tag || "", // Salva a tag para a lógica do app
          icon: opt.icon || "", // Salva o ícone (smile, meh, angry)
          color: opt.color || "", // Salva a cor
          translations: {
            "pt-BR": opt.label || "",
            "pt-PT": ptQuestion.options?.[index]?.label || "",
            "pt-CV": cvQuestion.options?.[index]?.label || "",
            en: enQuestion.options?.[index]?.label || "",
            es: esQuestion.options?.[index]?.label || "",
          },
        };
      });

      // Monta o objeto final da Pergunta mantendo sua estrutura original
      const formattedQuestion = {
        question_id: docId,
        module_id: 1,
        importance_weight: 10.0,
        translations: {
          "pt-BR": brQuestion.text || "",
          "pt-PT": ptQuestion.text || "",
          "pt-CV": cvQuestion.text || "",
          en: enQuestion.text || "",
          es: esQuestion.text || "",
        },
        options: formattedOptions,
      };

      // Adiciona ao Batch do Firestore
      const docRef = collectionRef.doc(docId);
      batch.set(docRef, formattedQuestion);
      console.log(`- Preparando pergunta: [${docId}] com 5 idiomas.`);
    }

    // Executa o envio em massa
    await batch.commit();
    console.log(
      `\n✅ Sucesso: ${qBR.length} perguntas da anamnese foram cadastradas no Firestore!`,
    );
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Erro ao popular a anamnese:", error);
    process.exit(1);
  }
}

seedAnamnesis();
