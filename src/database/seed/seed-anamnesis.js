const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");

// Carrega as credenciais com caminho absoluto para evitar erros de diretório
const serviceAccount = require(
  path.resolve(__dirname, "./serviceAccountKey.json"),
);

// Inicializa o Firebase Admin com o formato moderno (sem admin.apps)
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const anamnesisData = [
  {
    question_id: "q1_inicio_aspero",
    module_id: 1,
    importance_weight: 10.0,
    translations: {
      pt: "Como costumam começar as discussões em seu casamento?",
      en: "How do discussions usually begin in your marriage?",
      es: "¿Cómo suelen comenzar las discusiones en su matrimonio?",
      fr: "Comment commencent généralement les discussions dans votre mariage?",
      de: "Wie beginnen Diskussionen in Ihrer Ehe normalerweise?",
      ja: "夫婦間の議論は通常どのように始まりますか？",
    },
    options: [
      {
        points: 1,
        translations: {
          pt: "De forma calma e respeitosa",
          en: "Calmly and respectfully",
          es: "De forma tranquila y respetuosa",
          fr: "Calmement et respectueusement",
          de: "Ruhig und respektvoll",
          ja: "穏やかかつ敬意を持って",
        },
      },
      {
        points: 3,
        translations: {
          pt: "Com tom neutro, mas às vezes ríspido",
          en: "Neutral tone, but sometimes harsh",
          es: "Con tono neutro, pero a veces áspero",
          fr: "Ton neutre, mais parfois dur",
          de: "Neutraler Ton, aber manchmal barsch",
          ja: "中立的なトーンだが、時に刺々しい",
        },
      },
      {
        points: 10,
        translations: {
          pt: "Já começam com acusações, ironia ou tom de briga",
          en: "They start with accusations, irony, or fighting tone",
          es: "Ya comienzan con acusaciones, ironía o tono de pelea",
          fr: "Elles commencent par des accusations, de l'ironie ou un ton de dispute",
          de: "Sie beginnen sofort mit Anschuldigungen, Ironie oder Streit",
          ja: "すでに非難、皮肉、または喧嘩腰のトーンで始まる",
        },
      },
    ],
  },
  {
    question_id: "q2_quatro_cavaleiros",
    module_id: 2,
    importance_weight: 10.0,
    translations: {
      pt: "Você sente desprezo, críticas agressivas ou atitude defensiva nas conversas?",
      en: "Do you feel contempt, aggressive criticism, or defensiveness in your conversations?",
      es: "¿Siente desprecio, críticas agresivas o actitud defensiva en las conversaciones?",
      fr: "Ressentez-vous du mépris, des critiques agressives ou de la défensive dans vos conversations?",
      de: "Spüren Sie Verachtung, aggressive Kritik oder Abwehrhaltung in Gesprächen?",
      ja: "会話の中で軽蔑、攻撃的な批判、または自己防衛的な態度を感じますか？",
    },
    options: [
      {
        points: 1,
        translations: {
          pt: "Raramente ou nunca",
          en: "Rarely or never",
          es: "Raramente o nunca",
          fr: "Rarement ou jamais",
          de: "Selten oder nie",
          ja: "滅多にない、または全くない",
        },
      },
      {
        points: 5,
        translations: {
          pt: "Às vezes, quando estamos estressados",
          en: "Sometimes, when we are stressed",
          es: "A veces, cuando estamos estresados",
          fr: "Parfois, quand nous sommes stressés",
          de: "Manchmal, wenn wir gestresst sind",
          ja: "時々、ストレスを感じている時",
        },
      },
      {
        points: 10,
        translations: {
          pt: "Frequentemente, um de nós ataca o caráter do outro ou se recusa a ouvir",
          en: "Frequently, one of us attacks the other's character or refuses to listen",
          es: "Con frecuencia, uno de nosotros ataca el carácter do otro o se niega a escuchar",
          fr: "Souvent, l'un de nous attaque le caractère de l'autre ou refuse d'écouter",
          de: "Häufig greift einer von uns den Charakter des anderen an oder weigert sich zuzuhören",
          ja: "頻繁に、どちらかが相手の人格を攻撃するか、話を聞くのを拒否する",
        },
      },
    ],
  },
  {
    question_id: "q3_inundacao_emocional",
    module_id: 3,
    importance_weight: 6.0,
    translations: {
      pt: "Durante uma briga, você se sente sobrecarregado ou dominado por pensamentos negativos e ansiosos?",
      en: "During an argument, do you feel overwhelmed or dominated by negative and anxious thoughts?",
      es: "Durante una pelea, ¿se siente abrumado o dominado por pensamientos negativos y ansiosos?",
      fr: "Lors d'une dispute, vous sentez-vous submergé ou dominé par des pensées négatives et anxieuses?",
      de: "Fühlen Sie sich während eines Streits überwältigt oder von negativen und ängstlichen Gedanken beherrscht?",
      ja: "喧嘩の最中、圧倒されたり、否定的な考えや不安な考えに支配されたりしますか？",
    },
    options: [
      {
        points: 1,
        translations: {
          pt: "Não, consigo manter o equilíbrio mental",
          en: "No, I can keep my mental balance",
          es: "No, puedo mantener mi equilibrio mental",
          fr: "Non, je peux garder mon équilibre mental",
          de: "Nein, ich kann mein mentales Gleichgewicht bewahren",
          ja: "いいえ、心のバランスを保つことができます",
        },
      },
      {
        points: 5,
        translations: {
          pt: "Às vezes sinto que vou perder o controle dos pensamentos",
          en: "Sometimes I feel I will lose control of my thoughts",
          es: "A veces siento que voy a perder el control de mis pensamientos",
          fr: "Parfois, j'ai l'impression de perdre le contrôle de mes pensées",
          de: "Manchmal habe ich das Gefühl, die Kontrolle über meine Gedanken zu verlieren",
          ja: "思考のコントロールを失いそうになることが時々あります",
        },
      },
      {
        points: 10,
        translations: {
          pt: "Sim, sinto-me inundado emocionalmente e sofro por antecipação",
          en: "Yes, I feel emotionally flooded and suffer in anticipation",
          es: "Sí, me siento abrumado emocionalmente y sufro por anticipación",
          fr: "Oui, je me sens submergé émotionnellement et je souffre par anticipation",
          de: "Ja, ich fühle mich emotional überflutet und leide im Voraus",
          ja: "はい、感情的に圧倒され、先々のことで苦しみます",
        },
      },
    ],
  },
  {
    question_id: "q4_reatividade_fisiologica",
    module_id: 4,
    importance_weight: 7.0,
    translations: {
      pt: "Seu coração dispara ou seu corpo fica extremamente tenso durante discussões?",
      en: "Does your heart race or does your body get extremely tense during discussions?",
      es: "¿Se le acelera el corazón o se le tensa el cuerpo extremadamente durante las discusiones?",
      fr: "Votre cœur s'emballe-t-il ou votre corps devient-il extrêmement tendu lors des discussions?",
      de: "Rast Ihr Herz oder wird Ihr Körper bei Diskussionen extrem angespannt?",
      ja: "議論中に心拍数が上がったり、体が極度に緊張したりしますか？",
    },
    options: [
      {
        points: 1,
        translations: {
          pt: "Não, permaneço calmo(a) fisicamente",
          en: "No, I remain physically calm",
          es: "No, permanezco físicamente tranquilo/a",
          fr: "Non, je reste physiquement calme",
          de: "Nein, ich bleibe körperlich ruhig",
          ja: "いいえ、身体的には穏やかなままです",
        },
      },
      {
        points: 5,
        translations: {
          pt: "Sinto uma leve tensão muscular",
          en: "I feel slight muscle tension",
          es: "Siento una leve tensión muscular",
          fr: "Je ressens une légère tension musculaire",
          de: "Ich spüre eine leichte Muskelanspannung",
          ja: "軽い筋肉の緊張を感じます",
        },
      },
      {
        points: 10,
        translations: {
          pt: "Sim, sinto o corpo em estado de luta ou fuga (coração acelerado)",
          en: "Yes, I feel my body in a fight-or-flight state (racing heart)",
          es: "Sí, siento mi cuerpo en estado de lucha o huida (corazón acelerado)",
          fr: "Oui, je sens mon corps en état de combat ou de fuite (cœur qui bat vite)",
          de: "Ja, ich spüre meinen Körper im Kampf-oder-Flucht-Modus (Herzrasen)",
          ja: "はい、体が闘争・逃走状態（心拍数の上昇）にあるのを感じます",
        },
      },
    ],
  },
  {
    question_id: "q5_tentativas_reparacao",
    module_id: 5,
    importance_weight: 6.0,
    translations: {
      pt: "Quando vocês brigam, conseguem diminuir a tensão ou fazer as pazes?",
      en: "When you fight, are you able to de-escalate tension or make peace?",
      es: "Cuando pelean, ¿logran disminuir la tensión o hacer las paces?",
      fr: "Quand vous vous disputez, arrivez-vous à apaiser la tension ou à faire la paix?",
      de: "Wenn Sie streiten, gelingt es Ihnen, die Spannung abzubauen oder Frieden zu schließen?",
      ja: "喧嘩したとき、緊張を和らげたり和解したりすることができますか？",
    },
    options: [
      {
        points: 1,
        translations: {
          pt: "Sim, costumamos rir ou pedir desculpas rapidamente",
          en: "Yes, we usually laugh or apologize quickly",
          es: "Sí, solemos reír o pedir disculpas rápidamente",
          fr: "Oui, nous rions ou nous excusons généralement rapidement",
          de: "Ja, wir lachen normalerweise oder entschuldigen uns schnell",
          ja: "はい、通常はすぐに笑い合ったり謝罪したりします",
        },
      },
      {
        points: 5,
        translations: {
          pt: "Demoramos algumas horas para voltar ao normal",
          en: "It takes us a few hours to get back to normal",
          es: "Nos toma algunas horas volver a la normalidad",
          fr: "Il nous faut quelques heures pour revenir à la normale",
          de: "Es dauert einige Stunden, bis wir uns wieder normalisieren",
          ja: "元の状態に戻るまでに数時間かかります",
        },
      },
      {
        points: 10,
        translations: {
          pt: "Não, entramos em silêncio punitivo ou a briga se arrasta por dias",
          en: "No, we enter punitive silence or the fight drags on for days",
          es: "No, entramos en silencio punitivo o la pelea se arrastra por días",
          fr: "Non, nous entrons dans un silence punitif ou la dispute traîne pendant des jours",
          de: "Nein, wir verfallen in strafendes Schweigen oder der Streit zieht sich über Tage hinweg",
          ja: "いいえ、罰を与えるような沈黙に入り込むか、喧嘩が何日も長引きます",
        },
      },
    ],
  },
  {
    question_id: "q6_mas_memorias",
    module_id: 6,
    importance_weight: 6.0,
    translations: {
      pt: "Você foca mais nas qualidades antigas do seu cônjuge ou revive ressentimentos passados?",
      en: "Do you focus more on your spouse's old qualities or do you relive past resentments?",
      es: "¿Se enfoca más en las cualidades antiguas de su cónyuge o revive ressentimientos pasados?",
      fr: "Vous concentrez-vous davantage sur les anciennes qualités de votre conjoint ou revivez-vous des ressentiments passés?",
      de: "Konzentrieren Sie sich eher auf die früheren Qualitäten Ihres Partners oder durchleben Sie vergangenen Groll neu?",
      ja: "配偶者の過去の良い面に目を向けますか、それとも過去の怨恨を蒸し返しますか？",
    },
    options: [
      {
        points: 1,
        translations: {
          pt: "Lembro com facilidade do que admiro nele(a)",
          en: "I easily remember what I admire about them",
          es: "Recuerdo con facilidad lo que admiro de él/ella",
          fr: "Je me souviens facilement de ce que j'admire chez lui/elle",
          de: "Ich erinnere mich leicht an das, was ich an ihm/ihr bewundere",
          ja: "相手のどこを賞賛しているかを簡単に思い出せます",
        },
      },
      {
        points: 5,
        translations: {
          pt: "Às vezes as mágoas do passado nublam meu olhar",
          en: "Sometimes past hurts cloud my view",
          es: "A veces los dolores del pasado nublan mi mirada",
          fr: "Parfois, les blessures du passé obscurcissent mon regard",
          de: "Manchmal trüben vergangene Verletzungen meinen Blick",
          ja: "過去の傷つきが視界を曇らせることが時々あります",
        },
      },
      {
        points: 10,
        translations: {
          pt: "Estou preso(a) à decepção e sinto que a história do casal é estritamente negativa",
          en: "I am stuck in disappointment and feel our history is strictly negative",
          es: "Estoy atrapado/a en la decepción y siento que la historia de la pareja es estrictamente negativa",
          fr: "Je suis coincé dans la déception et j'ai l'impression que l'histoire du couple est strictement négative",
          de: "Ich stecke in Enttäuschung fest und habe das Gefühl, unsere Partnerschaftsgeschichte ist rein negativ",
          ja: "失望から抜け出せず、夫婦の歴史は完全に否定的なものであると感じています",
        },
      },
    ],
  },
  {
    question_id: "q7_carga_mental",
    module_id: 7,
    importance_weight: 6.0,
    translations: {
      pt: "Como você se sente em relação ao planejamento e logística do lar?",
      en: "How do you feel regarding household planning and logistics?",
      es: "¿Cómo se siente con respecto a la planificación y logística del hogar?",
      fr: "Que ressentez-vous par rapport à la planification et à la logistique du foyer?",
      de: "Wie fühlen Sie sich in Bezug auf die Planung und Logistik des Haushalts?",
      ja: "家庭内の計画やロジスティクスについてどう感じていますか？",
    },
    options: [
      {
        points: 1,
        translations: {
          pt: "Sinto que dividimos de forma justa e sem cobranças",
          en: "I feel we share fairly and without nagging",
          es: "Siento que dividimos de forma justa y sin reclamos",
          fr: "Je sens que nous partageons équitablement et sans reproches",
          de: "Ich habe das Gefühl, wir teilen fair und ohne Nörgeln",
          ja: "不満を言うことなく、公平に分担できていると感じます",
        },
      },
      {
        points: 5,
        translations: {
          pt: "Eu assumo mais tarefas, mas considero administrável",
          en: "I take on more tasks, but find it manageable",
          es: "Yo asumo más tareas, pero lo considero manejable",
          fr: "Je prends en charge plus de tâches, mais je trouve cela gérable",
          de: "Ich übernehme mehr Aufgaben, finde es aber bewältigbar",
          ja: "自分が多めに引き受けていますが、管理可能だと思っています",
        },
      },
      {
        points: 10,
        translations: {
          pt: "Sinto um fardo invisível exaustivo de gerenciar tudo sozinho(a)",
          en: "I feel an exhausting invisible burden of managing everything alone",
          es: "Siento una carga invisible agotadora de gestionar todo solo/a",
          fr: "Je ressens un fardeau invisible épuisant de tout gérer seul(e)",
          de: "Ich spüre eine erschöpfende, unsichtbare Last, alles alleine zu managen",
          ja: "すべてを一人で管理するという、目に見えない消耗するような重荷を感じています",
        },
      },
    ],
  },
  {
    question_id: "q8_estabilidade_financeira",
    module_id: 8,
    importance_weight: 5.0,
    translations: {
      pt: "Como o casal lida com o orçamento e as decisões de dinheiro?",
      en: "How does the couple handle the budget and money decisions?",
      es: "¿Cómo maneja la pareja el presupuesto y las decisiones de dinero?",
      fr: "Comment le couple gère-t-il le budget et les décisions d'argent?",
      de: "Wie geht das Paar mit dem Budget und Geldentscheidungen um?",
      ja: "夫婦間で予算やお金に関する決定をどのように扱っていますか？",
    },
    options: [
      {
        points: 1,
        translations: {
          pt: "Temos comunicação aberta e planejamento compartilhado",
          en: "We have open communication and shared planning",
          es: "Tenemos comunicación abierta y planificación compartida",
          fr: "Nous avons une communication ouverte et une planification partagée",
          de: "Wir haben offene Kommunikation und eine gemeinsame Planung",
          ja: "オープンなコミュニケーションと共有された計画があります",
        },
      },
      {
        points: 5,
        translations: {
          pt: "Há pequenas divergências, mas conseguimos nos organizar",
          en: "There are minor disagreements, but we manage to organize",
          es: "Hay pequeñas divergencias, pero logramos organizarnos",
          fr: "Il y a de légères divergences, mais nous arrivons à nous organiser",
          de: "Es gibt kleinere Meinungsverschiedenheiten, aber wir schaffen es, uns zu organisieren",
          ja: "多少の意見の相違はありますが、なんとかやりくりできています",
        },
      },
      {
        points: 10,
        translations: {
          pt: "Há falta de confiança, segredos financeiros ou discussões destrutivas sobre gastos",
          en: "There is a lack of trust, financial secrets, or destructive arguments about spending",
          es: "Hay falta de confianza, secretos financieros o discusiones destructivas sobre gastos",
          fr: "Il y a un manque de confiance, des secrets financiers ou des disputes destructrices sur les dépenses",
          de: "Es mangelt an Vertrauen, es gibt finanzielle Geheimnisse oder destruktive Streitigkeiten über Ausgaben",
          ja: "信頼の欠如、お金に関する隠し事、または支出に関する破壊的な議論があります",
        },
      },
    ],
  },
  {
    question_id: "q9_intimidade_ocitocina",
    module_id: 9,
    importance_weight: 10.0,
    translations: {
      pt: "Vocês mantêm rituais regulares de afeto físico e intimidade sexual?",
      en: "Do you maintain regular rituals of physical affection and sexual intimacy?",
      es: "¿Mantienen rituales regulares de afecto físico e intimidad sexual?",
      fr: "Maintenez-vous des rituels réguliers d'affection physique et d'intimité sexuelle?",
      de: "Pflegen Sie regelmäßige Rituale körperlicher Zuneigung und sexueller Intimität?",
      ja: "日常的なスキンシップや性的な親密さの儀式を維持していますか？",
    },
    options: [
      {
        points: 1,
        translations: {
          pt: "Sim, nos conectamos fisicamente com frequência (abraços, beijos e toque)",
          en: "Yes, we connect physically often (hugs, kisses, and touch)",
          es: "Sí, nos conectamos físicamente con frecuencia (abrazos, besos y tacto)",
          fr: "Oui, nous nous connectons physiquement souvent (câlins, baisers et toucher)",
          de: "Ja, wir verbinden uns oft körperlich (Umarmungen, Küsse und Berührungen)",
          ja: "はい、頻繁に身体的に関わり合っています（抱擁、キス、スキンシップ）",
        },
      },
      {
        points: 5,
        translations: {
          pt: "Raramente nos tocamos fora das relações sexuais",
          en: "We rarely touch outside of sexual intercourse",
          es: "Raramente nos tocamos fuera de las relaciones sexuales",
          fr: "Nous nous touchons rarement en dehors des rapports sexuels",
          de: "Wir berühren uns selten außerhalb des Geschlechtsverkehrs",
          ja: "性行為以外で触れ合うことは滅多にありません",
        },
      },
      {
        points: 10,
        translations: {
          pt: "Sinto que nossa relação esfriou fisicamente e sofremos com a 'ferrugem' no leito conjugal",
          en: "I feel our relationship has cooled physically and we suffer from 'rust' in the marriage bed",
          es: "Siento que nuestra relación se ha enfriado físicamente y sufrimos de 'óxido' en el lecho conyugal",
          fr: "Je sens que notre relation s'est refroidie physiquement et nous souffrons de la 'rouille' dans le lit conjugal",
          de: "Ich habe das Gefühl, unsere Beziehung ist körperlich abgekühlt und wir leiden unter 'Rost' im Ehebett",
          ja: "肉体的に冷め切ってしまい、夫婦間の親密さに「錆」が生じていると感じます",
        },
      },
    ],
  },
];

async function seedAnamnesis() {
  const collectionRef = db.collection("anamnesis");
  const batch = db.batch();

  console.log("Iniciando o envio de dados da Anamnese...");

  anamnesisData.forEach((question) => {
    const docRef = collectionRef.doc(question.question_id);
    batch.set(docRef, question);
  });

  try {
    await batch.commit();
    console.log(
      `✅ Sucesso: ${anamnesisData.length} perguntas da anamnese foram cadastradas no Firestore!`,
    );
  } catch (error) {
    console.error("❌ Erro ao popular a anamnese:", error);
  } finally {
    process.exit();
  }
}

// Fechando o parênteses e executando a função corretamente
seedAnamnesis();
