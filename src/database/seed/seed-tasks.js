/**
 * DuoElo Complete 90-Day Plan / 54 Tasks Seeding Script
 *
 * Este script utiliza o Firebase Admin SDK para popular a coleção 'tasks'
 * com as 54 tarefas completas do DuoElo (40 do Desafio de Amar + 14 Antídotos Clínicos)
 * traduzidas de forma nativa e estrita em 6 idiomas:
 * Português (pt), Inglês (en), Espanhol (es), Francês (fr), Alemão (de) e Japonês (ja).
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");

// Carrega as credenciais com caminho absoluto para evitar erros
const serviceAccount = require(
  path.resolve(__dirname, "./serviceAccountKey.json"),
);

// Inicialização moderna do Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const tasks = [
  {
    task_id: "mod1_task1_filtro_eu",
    module_id: 1,
    cost_level: "low_cost",
    importance_weight: 10.0,
    source: "Gottman / Comunica\u00e7\u00e3o N\u00e3o-Violenta",
    translations: {
      pt: {
        title: "O Filtro do Eu",
        description:
          "Ao fazer qualquer reclamação ou expressar uma insatisfação ao seu cônjuge hoje, mude a abordagem: elimine a palavra acusatória 'você' e use estritamente a fórmula: 'Eu me sinto [emoção] e preciso de [necessidade]'.",
      },
      en: {
        title: "The 'I' Filter",
        description:
          "When making any complaint or expressing dissatisfaction to your spouse today, change your approach: eliminate the accusatory word 'you' and strictly use the formula: 'I feel [emotion] and I need [necessity]'.",
      },
      es: {
        title: "El Filtro del Yo",
        description:
          "Al hacer cualquier queja o expresar insatisfacción a tu cónyuge hoy, cambia tu enfoque: elimina la palabra acusatoria 'tú' y usa estrictamente la fórmula: 'Yo me siento [emoción] y necesito [necesidad]'.",
      },
      fr: {
        title: "Le Filtre du Je",
        description:
          "Lorsque vous formulez une plainte ou exprimez un mécontentement à votre conjoint aujourd'hui, changez d'approche : éliminez le mot accusateur 'tu/vous' et utilisez strictement la formule : 'Je me sens [émotion] et j'ai besoin de [besoin]'.",
      },
      de: {
        title: "Der Ich-Filter",
        description:
          "Wenn Sie sich heute bei Ihrem Ehepartner beschweren oder Unzufriedenheit ausdrücken, ändern Sie Ihren Ansatz: Eliminieren Sie das beschuldigende Wort 'Du' und verwenden Sie strikt die Formel: 'Ich fühle mich [Emotion] und ich brauche [Bedürfnis]'.",
      },
      ja: {
        title: "「私」のフィルター",
        description:
          "今日、配偶者に不満を伝えたり不平を言ったりするときは、アプローチを変えてください。相手を非難する「あなた」という言葉を排除し、「私は[感情]と感じており、[必要性]が必要です」という公式を厳密に使ってください。",
      },
    },
  },
  {
    task_id: "mod1_task2_stop_introspectivo",
    module_id: 1,
    cost_level: "low_cost",
    importance_weight: 10.0,
    source: "Augusto Cury (Gest\u00e3o da Emo\u00e7\u00e3o)",
    translations: {
      pt: {
        title: "O Stop Introspectivo",
        description:
          "Se o seu cônjuge o contrariar ou criticar hoje, faça um silêncio proativo imediato. Não dê nenhuma resposta sob o efeito da raiva ou do estresse. Silencie por fora para abrir espaço para a razão por dentro.",
      },
      en: {
        title: "The Introspective Stop",
        description:
          "If your spouse contradicts or criticizes you today, practice immediate proactive silence. Do not give any response under the influence of anger or stress. Quiet the outside to make room for reason inside.",
      },
      es: {
        title: "El Stop Introspectivo",
        description:
          "Si tu cónyuge te contradice o te critica hoy, practica un silencio proactivo inmediato. No des ninguna respuesta bajo el efecto de la ira o el estrés. Silénciate por fuera para dar espacio a la razón por dentro.",
      },
      fr: {
        title: "Le Stop Introspectif",
        description:
          "Si votre conjoint vous contredit ou vous critique aujourd'hui, pratiquez un silence proactif immédiat. Ne donnez aucune réponse sous l'effet de la colère ou du stress. Faites silence à l'extérieur pour faire de la place à la raison à l'intérieur.",
      },
      de: {
        title: "Der introspektive Stopp",
        description:
          "Wenn Ihr Ehepartner Ihnen heute widerspricht oder Sie kritisiert, üben Sie sofortiges proaktives Schweigen. Antworten Sie nicht unter dem Einfluss von Ärger oder Stress. Schweigen Sie nach außen, um Platz für die Vernunft im Inneren zu schaffen.",
      },
      ja: {
        title: "内省的ストップ",
        description:
          "今日、配偶者から反対されたり批判されたりした場合は、すぐに主体的な沈黙を実践してください。怒りやストレスの影響下で返答をしないでください。外側を静かにして、内側に理性のためのスペースを作りましょう。",
      },
    },
  },
  {
    task_id: "mod1_task3_paciencia",
    module_id: 1,
    cost_level: "medium_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 1",
    translations: {
      pt: {
        title: "Desafio da Paciência",
        description:
          "Hoje, comprometa-se a segurar a sua língua ao primeiro sinal de irritação. Se o seu cônjuge disser algo áspero, escolha não responder de forma defensiva ou agressiva. Feche a boca quando estiver com raiva.",
      },
      en: {
        title: "Patience Challenge",
        description:
          "Today, commit to holding your tongue at the first sign of irritation. If your spouse says something harsh, choose not to respond defensively or aggressively. Keep quiet when angry.",
      },
      es: {
        title: "Desafío de la Paciencia",
        description:
          "Hoy, comprométete a contener tu lengua ante el primer signo de irritación. Si tu cónyuge dice algo áspero, elige no responder de forma defensiva o agresiva. Cierra la boca cuando sientas ira.",
      },
      fr: {
        title: "Défi de la Patience",
        description:
          "Aujourd'hui, engagez-vous à retenir votre langue au premier signe d'irritation. Si votre conjoint dit quelque chose de dur, choisissez de ne pas répondre de manière défensive ou agressive. Taisez-vous en cas de colère.",
      },
      de: {
        title: "Herausforderung der Geduld",
        description:
          "Verpflichten Sie sich heute, beim ersten Anzeichen von Reizung Ihre Zunge zu hüten. Wenn Ihr Ehepartner etwas Barsches sagt, entscheiden Sie sich dagegen, defensiv oder aggressiv zu reagieren. Schweigen Sie, wenn Sie wütend sind.",
      },
      ja: {
        title: "忍耐のチャレンジ",
        description:
          "今日、いらいらしそうになったらまず口を慎むことを約束してください。配偶者が厳しいことを言っても、自己防衛的または攻撃的に反応しないことを選択してください。怒りを感じたら口を閉じましょう。",
      },
    },
  },
  {
    task_id: "mod1_task4_atencao",
    module_id: 1,
    cost_level: "low_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 4",
    translations: {
      pt: {
        title: "Desafio da Atenção",
        description:
          "Faça contato com o seu cônjuge em algum momento durante a agitação do dia. Ligue ou envie uma mensagem rápida apenas para perguntar: 'Está tudo bem por aí? Tem algo que posso fazer por você?'.",
      },
      en: {
        title: "Thoughtfulness Challenge",
        description:
          "Make contact with your spouse at some point during the busy day. Call or send a quick message just to ask: 'Is everything okay? Is there anything I can do for you?'.",
      },
      es: {
        title: "Desafío de la Atención",
        description:
          "Ponte en contacto con tu cónyuge en algún momento durante el ajetreo del día. Llama o envía un mensaje rápido solo para preguntar: '¿Está todo bien por ahí? ¿Hay algo que pueda hacer por ti?'.",
      },
      fr: {
        title: "Défi de l'Attention",
        description:
          "Prenez contact avec votre conjoint à un moment donné de cette journée bien remplie. Appelez ou envoyez un message rapide simplement pour demander : 'Tout va bien ? Y a-t-il quelque chose que je peux faire pour toi ?'.",
      },
      de: {
        title: "Herausforderung der Aufmerksamkeit",
        description:
          "Nehmen Sie an einem geschäftigen Moment des Tages Kontakt mit Ihrem Ehepartner auf. Rufen Sie an oder senden Sie eine kurze Nachricht, nur um zu fragen: 'Ist alles in Ordnung bei dir? Kann ich etwas für dich tun?'.",
      },
      ja: {
        title: "気配りのチャレンジ",
        description:
          "忙しい一日のどこかで配偶者に連絡を取ってください。電話か短いメッセージで、「そっちは大丈夫？何かできることはある？」とだけ尋ねてみましょう。",
      },
    },
  },
  {
    task_id: "mod1_task5_nao_maltratar",
    module_id: 1,
    cost_level: "medium_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 5",
    translations: {
      pt: {
        title: "Não Maltratar",
        description:
          "Hoje, elimine qualquer palavra rude, sarcasmo ou comportamento grosseiro no trato doméstico. Trate o seu cônjuge com a mesma cortesia e gentileza com que você trata os seus amigos do trabalho ou da igreja.",
      },
      en: {
        title: "No Rudeness",
        description:
          "Today, eliminate any rude words, sarcasm, or harsh behavior at home. Treat your spouse with the same courtesy and kindness you extend to friends at work or church.",
      },
      es: {
        title: "No Maltratar",
        description:
          "Hoy, elimina cualquier palabra ruda, sarcasmo o comportamiento grosero en el hogar. Trata a tu cónyuge con la misma cortesía y amabilidad con la que tratas a tus amigos del trabajo o de la iglesia.",
      },
      fr: {
        title: "Pas de Rudesse",
        description:
          "Aujourd'hui, éliminez les mots blessants, le sarcasme ou les comportements rudes à la maison. Traitez votre conjoint avec la même courtoisie et la même gentillesse que vous accordez à vos amis au travail ou à l'église.",
      },
      de: {
        title: "Keine Unhöflichkeit",
        description:
          "Verzichten Sie heute zu Hause auf jegliche unhöflichen Worte, Sarkasmus oder barsches Verhalten. Behandeln Sie Ihren Ehepartner mit derselben Höflichkeit und Güte, die Sie Freunden bei der Arbeit oder in der Kirche entgegenbringen.",
      },
      ja: {
        title: "親切な態度のチャレンジ",
        description:
          "今日、家庭内でのいかなる乱暴な言葉、皮肉、冷淡な態度も排除してください。仕事や教会の友人に接するときと同じように、礼儀正しさと親切さを持って配偶者に接してください。",
      },
    },
  },
  {
    task_id: "mod1_task6_buscar_entender",
    module_id: 1,
    cost_level: "medium_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 18",
    translations: {
      pt: {
        title: "Buscar Entender",
        description:
          "Hoje, busque o entendimento mútuo. Pergunte ao seu cônjuge sobre suas maiores inquietações e simplesmente escute com empatia, sem interromper ou rebater. Deixe-o se expressar livremente.",
      },
      en: {
        title: "Seeking to Understand",
        description:
          "Today, seek mutual understanding. Ask your spouse about their biggest worries and simply listen with empathy, without interrupting or arguing back. Let them express themselves freely.",
      },
      es: {
        title: "Buscar Entender",
        description:
          "Hoy, busca el entendimiento mutuo. Pregúntale a tu cónyuge sobre sus mayores preocupaciones y simplemente escucha con empatía, sin interrumpir ni discutir. Déjale expresarse libremente.",
      },
      fr: {
        title: "Chercher à Comprendre",
        description:
          "Aujourd'hui, cherchez la compréhension mutuelle. Interrogez votre conjoint sur ses plus grandes inquiétudes et écoutez simplement avec empathie, sans interrompre ni répliquer. Laissez-le s'exprimer librement.",
      },
      de: {
        title: "Verständnis suchen",
        description:
          "Suchen Sie heute nach gegenseitigem Verständnis. Fragen Sie Ihren Ehepartner nach seinen größten Sorgen und hören Sie einfach empathisch zu, ohne zu unterbrechen oder dagegenzureden. Lassen Sie ihn sich frei äußern.",
      },
      ja: {
        title: "理解に努めるチャレンジ",
        description:
          "今日、相互理解に努めてください。配偶者の最大の悩みについて尋ね、遮ったり反論したりせずに、ただ共感を持って耳を傾けてください。相手に自由に表現してもらいましょう。",
      },
    },
  },
  {
    task_id: "mod1_task7_protecao_limites",
    module_id: 1,
    cost_level: "medium_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 23",
    translations: {
      pt: {
        title: "Proteção de Limites",
        description:
          "Identifique e blinde o seu casamento contra influências externas negativas. Estabeleça um limite saudável para conselhos de terceiros, distrações de tela ou qualquer elemento que concorra com a paz do seu lar.",
      },
      en: {
        title: "Boundary Protection",
        description:
          "Identify and guard your marriage against negative external influences. Establish a healthy boundary for third-party advice, screen distractions, or any element competing with your home's peace.",
      },
      es: {
        title: "Protección de Límites",
        description:
          "Identifica y protege tu matrimonio de influencias externas negativas. Establece un límite saludable para los consejos de terceros, las distracciones de pantalla o cualquier elemento que compita con la paz de tu hogar.",
      },
      fr: {
        title: "Protection des Limites",
        description:
          "Identifiez et protégez votre mariage contre les influences extérieures négatives. Établissez une limite saine face aux conseils de tiers, aux distractions d'écrans ou à tout élément qui nuit à la paix de votre foyer.",
      },
      de: {
        title: "Grenzschutz",
        description:
          "Identifizieren und schützen Sie Ihre Ehe vor negativen äußeren Einflüssen. Setzen Sie eine gesunde Grenze für Ratschläge von Dritten, Bildschirm-Ablenkungen oder alles, was dem Frieden Ihres Heims schadet.",
      },
      ja: {
        title: "境界線の保護",
        description:
          "外部からの否定的な影響から夫婦関係を特定し、守ってください。第三者からのアドバイスやスマートフォンの画面、家庭の平和を妨げるいかなる要素に対しても健全な境界線を設定しましょう。",
      },
    },
  },
  {
    task_id: "mod1_task8_encorajamento",
    module_id: 1,
    cost_level: "medium_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 27",
    translations: {
      pt: {
        title: "Desafio do Encorajamento",
        description:
          "Elimine do seu relacionamento a toxicidade das expectativas rígidas. Reconheça que as mudanças levam tempo e diga palavras sinceras de encorajamento ao seu cônjuge para as lutas que ele enfrenta.",
      },
      en: {
        title: "Encouragement Challenge",
        description:
          "Eliminate the toxicity of rigid expectations from your relationship. Acknowledge that change takes time and offer sincere words of encouragement to your spouse for the battles they face.",
      },
      es: {
        title: "Desafío del Aliento",
        description:
          "Elimina de tu relación la toxicidad de las expectativas rígidas. Reconoce que los cambios toman tiempo y di palabras sinceras de aliento a tu cónyuge para las luchas que enfrenta.",
      },
      fr: {
        title: "Défi de l'Encouragement",
        description:
          "Éliminez la toxicité des attentes rigides de votre relation. Reconnaissez que le changement prend du temps et adressez des mots d'encouragement sincères à votre conjoint pour les combats qu'il traverse.",
      },
      de: {
        title: "Herausforderung der Ermutigung",
        description:
          "Befreien Sie Ihre Beziehung von der Toxizität starrer Erwartungen. Erkennen Sie an, dass Veränderung Zeit braucht, und sprechen Sie Ihrem Ehepartner aufrichtige Worte der Ermutigung für seine Kämpfe aus.",
      },
      ja: {
        title: "励ましのチャレンジ",
        description:
          "頑固な期待という有害な要素を関係から排除してください。変化には時間がかかることを認め、配偶者が直面している困難に対して心からの励ましの言葉をかけてください。",
      },
    },
  },
  {
    task_id: "mod1_task9_motivacao",
    module_id: 1,
    cost_level: "medium_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 29",
    translations: {
      pt: {
        title: "Motivação Superior",
        description:
          "Hoje, sirva e faça algo de bom para o seu cônjuge motivado puramente pela sua aliança e amor, e não esperando nenhuma reação ou agradecimento imediato em troca. Ame incondicionalmente.",
      },
      en: {
        title: "Higher Motivation",
        description:
          "Today, serve and do something good for your spouse motivated purely by your covenant and love, without expecting any immediate reaction or thanks in return. Love unconditionally.",
      },
      es: {
        title: "Motivación Superior",
        description:
          "Hoy, sirve y haz algo bueno por tu cónyuge motivado puramente por tu alianza y amor, sin esperar ninguna reacción o agradecimiento inmediato a cambio. Ama incondicionalmente.",
      },
      fr: {
        title: "Motivation Supérieure",
        description:
          "Aujourd'hui, servez et faites du bien à votre conjoint uniquement par amour et fidélité à votre alliance, sans attendre de réaction ni de remerciement immédiat. Aimez de manière inconditionnelle.",
      },
      de: {
        title: "Höhere Motivation",
        description:
          "Dienen Sie heute Ihrem Ehepartner und tun Sie ihm etwas Gutes, motiviert rein durch Ihr Versprechen und Ihre Liebe, ohne eine sofortige Reaktion oder Dankbarkeit zu erwarten. Lieben Sie bedingungslos.",
      },
      ja: {
        title: "より高い動機づけ",
        description:
          "今日、見返りや即座の感謝を期待することなく、純粋に誓いと愛の動機から配偶者のために尽くし、良いことを行いましょう。無条件に愛してください。",
      },
    },
  },
  {
    task_id: "mod2_task1_cultura_apreciacao",
    module_id: 2,
    cost_level: "low_cost",
    importance_weight: 10.0,
    source: "Gottman (Ant\u00eddoto para o Desprezo)",
    translations: {
      pt: {
        title: "Cultura de Apreciação",
        description:
          "Escreva ou diga verbalmente um elogio real e detalhado ao seu cônjuge sobre uma atitude que ele teve recentemente, demonstrando reconhecimento e revertendo qualquer padrão silencioso de desprezo.",
      },
      en: {
        title: "Culture of Appreciation",
        description:
          "Write or verbally express a real and detailed compliment to your spouse about an attitude they recently had, showing recognition and reversing any silent pattern of contempt.",
      },
      es: {
        title: "Cultura de Apreciación",
        description:
          "Escriba o exprese verbalmente un cumplido real y detallado a su cónyuge sobre una actitud que tuvo recientemente, demostrando reconocimiento y revirtiendo cualquier patrón silencioso de desprecio.",
      },
      fr: {
        title: "Culture d'Appréciation",
        description:
          "Écrivez ou exprimez verbalement un compliment réel et détaillé à votre conjoint sur une attitude qu'il a eue récemment, démontrant votre reconnaissance et inversant tout schéma silencieux de mépris.",
      },
      de: {
        title: "Kultur der Wertschätzung",
        description:
          "Schreiben oder sagen Sie Ihrem Partner ein echtes und detailliertes Lob für ein Verhalten, das er kürzlich gezeigt hat, um Anerkennung zu demonstrieren und jegliche stillen Muster der Verachtung umzukehren.",
      },
      ja: {
        title: "感謝の文化",
        description:
          "配偶者が最近とった行動について、具体的で本質的な褒め言葉を書き留めるか口頭で伝えてください。これにより、存在を認め、無意識のうちに生じている冷淡なパターンを修復します。",
      },
    },
  },
  {
    task_id: "mod2_task2_bondade",
    module_id: 2,
    cost_level: "low_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 2",
    translations: {
      pt: {
        title: "Desafio da Bondade",
        description:
          "Hoje, tome a iniciativa de ser inesperadamente bondoso. Faça um favor pequeno sem que ele precise pedir ou surpreenda-o com um bilhete afetuoso. Seja flexível e cooperador.",
      },
      en: {
        title: "Kindness Challenge",
        description:
          "Today, take the initiative to be unexpectedly kind. Do a small favor without being asked, or surprise your spouse with an affectionate note. Be flexible and cooperative.",
      },
      es: {
        title: "Desafío de la Bondad",
        description:
          "Hoy, toma la iniciativa de ser inesperadamente amable. Haz un pequeño favor sin que te lo pida, o sorpréndelo con una nota afectuosa. Sé flexible y colaborador.",
      },
      fr: {
        title: "Défi de la Bonté",
        description:
          "Aujourd'hui, prenez l'initiative d'être d'une gentillesse inattendue. Faites une petite faveur sans qu'on vous le demande, ou surprenez votre conjoint avec un mot affectueux. Soyez flexible et coopératif.",
      },
      de: {
        title: "Herausforderung der Güte",
        description:
          "Ergreifen Sie heute die Initiative, um unerwartet gütig zu sein. Tun Sie einen kleinen Gefallen, ohne darum gebeten zu werden, oder überraschen Sie Ihren Ehepartner mit einer liebevollen Notiz. Seien Sie flexibel und kooperativ.",
      },
      ja: {
        title: "親切のチャレンジ",
        description:
          "今日、思いがけない親切を示すイニシアチブを取ってください。頼まれる前に小さな手助けをするか、愛情のこもったメモで配偶者を驚かせてください。柔軟で協力的になりましょう。",
      },
    },
  },
  {
    task_id: "mod2_task3_boas_impressoes",
    module_id: 2,
    cost_level: "low_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 9",
    translations: {
      pt: {
        title: "Boas Impressões",
        description:
          "Mude a maneira de cumprimentar seu cônjuge hoje. Faça isso obrigatoriamente com um sorriso, entusiasmo e um toque físico caloroso ao reencontrá-lo, deixando uma impressão positiva duradoura.",
      },
      en: {
        title: "Good Impressions",
        description:
          "Change the way you greet your spouse today. Make sure you do so with a smile, enthusiasm, and a warm physical touch upon reuniting, leaving a lasting positive impression.",
      },
      es: {
        title: "Buenas Impresiones",
        description:
          "Cambia la forma de saludar a tu cónyuge hoy. Hazlo obligatoriamente con una sonrisa, entusiasmo y un cálido contacto físico al reencontraros, dejando una impresión positiva duradera.",
      },
      fr: {
        title: "Bonnes Impressions",
        description:
          "Changez votre façon de saluer votre conjoint aujourd'hui. Faites-le impérativement avec un sourire, de l'enthousiasme et un contact physique chaleureux lors de vos retrouvailles, laissant une impression positive durable.",
      },
      de: {
        title: "Gute Eindrücke",
        description:
          "Ändern Sie heute die Art und Weise, wie Sie Ihren Ehepartner begrüßen. Tun Sie dies unbedingt mit einem Lächeln, Begeisterung und einer herzlichen körperlichen Berührung beim Wiedersehen, um einen bleibenden positiven Eindruck zu hinterlassen.",
      },
      ja: {
        title: "良い印象を与えるチャレンジ",
        description:
          "今日の配偶者への挨拶の仕方を変えてください。再会したときに、必ず笑顔、熱意、そして温かい身体的な接触を持って行い、持続する良い印象を残しましょう。",
      },
    },
  },
  {
    task_id: "mod2_task4_nobreza",
    module_id: 2,
    cost_level: "medium_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 15",
    translations: {
      pt: {
        title: "Nobreza de Caráter",
        description:
          "Escolha honrar e respeitar o seu cônjuge de forma explícita. Evite fazer piadas depreciativas sobre ele, tanto em público quanto em privado, e fale de forma nobre sobre as suas virtudes.",
      },
      en: {
        title: "Nobility of Character",
        description:
          "Choose to explicitly honor and respect your spouse. Avoid making depreciative jokes about them, both in public and in private, and speak nobly of their virtues.",
      },
      es: {
        title: "Nobleza de Carácter",
        description:
          "Elige honrar y respetar a tu cónyuge de forma explícita. Evita hacer bromas despectivas sobre él/ella, tanto en público como en privado, y habla con nobleza de sus virtudes.",
      },
      fr: {
        title: "Noblesse de Caractère",
        description:
          "Choisissez d'honorer et de respecter explicitement votre conjoint. Évitez de faire des blagues dépréciatives à son sujet, en public comme en privé, et parlez noblement de ses vertus.",
      },
      de: {
        title: "Adel des Charakters",
        description:
          "Entscheiden Sie sich dafür, Ihren Ehepartner ausdrücklich zu ehren und zu respektieren. Vermeiden Sie herabsetzende Witze über ihn, sowohl in der Öffentlichkeit als auch privat, und sprechen Sie edel über seine Tugenden.",
      },
      ja: {
        title: "気高き品性のチャレンジ",
        description:
          "配偶者を明確に尊重し、敬意を払うことを選択してください。公私を問わず相手をおとしめるような冗談を言うのを避け、その美徳について気高く語りましょう。",
      },
    },
  },
  {
    task_id: "mod2_task5_unidade",
    module_id: 2,
    cost_level: "medium_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 30",
    translations: {
      pt: {
        title: "Desafio da Unidade",
        description:
          "Busque agir em harmonia com seu cônjuge. Se houver alguma decisão pendente ou atrito familiar, alinhe com ele e apoie suas orientações perante os filhos ou terceiros, mostrando uma única voz.",
      },
      en: {
        title: "Unity Challenge",
        description:
          "Seek to act in harmony with your spouse. If there is a pending decision or family friction, align with them and support their guidance before children or others, showing a single voice.",
      },
      es: {
        title: "Desafío de la Unidad",
        description:
          "Busca actuar en armonía con tu cónyuge. Si hay alguna decisión pendiente o fricción familiar, alinéate con él/ella y apoya sus pautas ante los hijos o terceros, mostrando una sola voz.",
      },
      fr: {
        title: "Défi de l'Unité",
        description:
          "Cherchez à agir en harmonie avec votre conjoint. S'il y a une décision en attente ou une tension familiale, accordez-vous avec lui et soutenez ses directives devant les enfants ou les tiers, en affichant une voix unique.",
      },
      de: {
        title: "Herausforderung der Einheit",
        description:
          "Suchen Sie das Handeln im Einklang mit Ihrem Ehepartner. Wenn eine Entscheidung ansteht oder familiäre Spannungen vorliegen, stimmen Sie sich mit ihm ab und unterstützen Sie seine Führung vor Kindern oder Dritten, um Einigkeit zu zeigen.",
      },
      ja: {
        title: "一致のチャレンジ",
        description:
          "配偶者と調和して行動するよう努めてください。保留中の決定や家族間の摩擦がある場合は、相手と意見を合わせ、子供や他人の前でその方針を支持し、一つの声を示しましょう。",
      },
    },
  },
  {
    task_id: "mod2_task6_alianca",
    module_id: 2,
    cost_level: "high_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 40",
    translations: {
      pt: {
        title: "Renovação da Aliança",
        description:
          "Hoje, reafirme o seu compromisso de fidelidade e amor com o seu cônjuge. Escreva um cartão sincero declarando: 'Minha aliança com você é incondicional. Eu escolho te amar apesar de qualquer inverno'.",
      },
      en: {
        title: "Renewing the Covenant",
        description:
          "Today, reaffirm your commitment of fidelity and love to your spouse. Write a sincere card declaring: 'My covenant with you is unconditional. I choose to love you despite any winter'.",
      },
      es: {
        title: "Renovación de la Alianza",
        description:
          "Hoy, reafirma tu compromiso de fidelidad y amor con tu cónyuge. Escribe una carta sincera declarando: 'Mi alianza contigo es incondicional. Elijo amarte a pesar de cualquier invierno'.",
      },
      fr: {
        title: "Renouvellement de l'Alliance",
        description:
          "Aujourd'hui, réaffirmez votre engagement de fidélité et d'amour envers votre conjoint. Écrivez une carte sincère déclarant : 'Mon alliance avec toi est inconditionnelle. Je choisis de t'aimer quel que soit l'hiver'.",
      },
      de: {
        title: "Erneuerung des Bundes",
        description:
          "Bekräftigen Sie heute Ihr Versprechen der Treue und Liebe gegenüber Ihrem Ehepartner. Schreiben Sie eine aufrichtige Karte mit den Worten: 'Mein Bund mit dir ist bedingungslos. Ich entscheide mich, dich trotz aller Stürme zu lieben'.",
      },
      ja: {
        title: "誓いの更新のチャレンジ",
        description:
          "今日、配偶者への忠実と愛の誓いを再確認してください。「あなたとの絆は無条件です。どんな困難があっても、あなたを愛することを選択します」と宣言する心からのカードを書いてください。",
      },
    },
  },
  {
    task_id: "mod3_task1_higiene_mental_dcd",
    module_id: 3,
    cost_level: "medium_cost",
    importance_weight: 6.0,
    source: "Augusto Cury",
    translations: {
      pt: {
        title: "Higiene Mental (DCD)",
        description:
          "Diante de qualquer pensamento ansioso, cobrança ou sofrimento por antecipação hoje, pare por 15 segundos e aplique: Duvide das falsas premissas, Critique os picos de estresse e Determine agir com leveza.",
      },
      en: {
        title: "Mental Hygiene (DCD)",
        description:
          "Faced with any anxious thought, demand, or anticipatory suffering today, stop for 15 seconds and apply: Doubt the false premises, Critique the stress peaks, and Determine to act with lightness.",
      },
      es: {
        title: "Higiene Mental (DCD)",
        description:
          "Ante cualquier pensamiento ansioso, exigencia o sufrimiento anticipado hoy, deténgase durante 15 segundos y aplique: Dude de las falsas premisas, Critique los picos de estrés y Determine actuar con ligereza.",
      },
      fr: {
        title: "Hygiène Mentale (DCD)",
        description:
          "Face à toute pensée anxieuse, exigence ou souffrance par anticipation aujourd'hui, arrêtez-vous pendant 15 secondes et appliquez : Doutez des fausses prémisses, Critiquez les pics de stress, et Déterminez-vous à agir avec légèreté.",
      },
      de: {
        title: "Mentale Hygiene (DCD)",
        description:
          "Stoppen Sie heute bei jedem ängstlichen Gedanken, jeder Forderung oder jedem vorzeitigen Leiden für 15 Sekunden und wenden Sie an: Zweifeln Sie an den falschen Prämissen, Kritisieren Sie die Stressspitzen und Bestimmen Sie, mit Leichtigkeit zu handeln.",
      },
      ja: {
        title: "心の衛生（DCD法）",
        description:
          "今日、不安な思考、不満、または予期不安に直面したときは、15秒間立ち止まり、次の手法（DCD）を適用してください：前提を「疑い（Duvidar）」、ストレスのピークを「批判し（Criticar）」、軽やかに振る舞うことを「決定する（Determinar）」",
      },
    },
  },
  {
    task_id: "mod3_task2_interceder",
    module_id: 3,
    cost_level: "medium_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 16",
    translations: {
      pt: {
        title: "Intercessão em Oração",
        description:
          "Em vez de ruminar reclamações mentais sobre seu parceiro, hoje transforme-as em orações ou pensamentos protetores. Ore de forma oculta pelo coração, saúde e paz dele.",
      },
      en: {
        title: "Intercession in Prayer",
        description:
          "Instead of ruminating over mental complaints about your partner, turn them into prayers or protective thoughts today. Pray secretly for their heart, health, and peace.",
      },
      es: {
        title: "Intercesión en Oración",
        description:
          "En lugar de rumiar quejas mentales sobre tu pareja, hoje transfórmalas en oraciones o pensamientos protectores. Ora de forma oculta por su corazón, salud y paz.",
      },
      fr: {
        title: "Intercession par la Prière",
        description:
          "Au lieu de ressasser mentalement des plaintes à l'égard de votre conjoint, transformez-les aujourd'hui en prières ou en pensées bienveillantes. Priez secrètement pour son cœur, sa santé et sa paix.",
      },
      de: {
        title: "Fürbitte im Gebet",
        description:
          "Anstatt gedanklich über Beschwerden über Ihren Partner nachzugrübeln, wandeln Sie diese heute in Gebete oder schützende Gedanken um. Beten Sie heimlich für sein Herz, seine Gesundheit und seinen Frieden.",
      },
      ja: {
        title: "祈りの取りなしのチャレンジ",
        description:
          "パートナーに対する不満を頭の中で反芻する代わりに、今日はそれを祈りや保護的な思考に変えてください。相手の心、健康、そして平和のために密かに祈りましょう。",
      },
    },
  },
  {
    task_id: "mod3_task3_superar_impossibilidades",
    module_id: 3,
    cost_level: "medium_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 19",
    translations: {
      pt: {
        title: "Superar Desânimos",
        description:
          "Ao sentir-se esgotado ou sob a impressão de que o relacionamento não tem conserto, afaste os pensamentos limitantes. Decida confiar que pequenos hábitos consistentes vencem a inércia destrutiva.",
      },
      en: {
        title: "Overcoming Discouragement",
        description:
          "When feeling exhausted or under the impression that the relationship cannot be fixed, dismiss limiting thoughts. Choose to trust that small, consistent habits defeat destructive inertia.",
      },
      es: {
        title: "Superar el Desánimo",
        description:
          "Al sentirte agotado o bajo la impresión de que la relación no tiene arreglo, descarta los pensamientos limitantes. Decide confiar en que pequeños hábitos consistentes vencen la inercia destructiva.",
      },
      fr: {
        title: "Surmonter le Découragement",
        description:
          "Si vous vous sentez épuisé ou si vous avez l'impression que la relation est irréparable, écartez ces pensées limitantes. Choisissez de croire que de petites habitudes saines et constantes surmontent l'inertie destructrice.",
      },
      de: {
        title: "Entmutigung überwinden",
        description:
          "Wenn Sie sich erschöpft fühlen oder den Eindruck haben, die Beziehung sei nicht mehr zu retten, weisen Sie limitierende Gedanken zurück. Vertrauen Sie darauf, dass kleine, beständige Gewohnheiten die destruktive Trägheit besiegen.",
      },
      ja: {
        title: "落胆を克服するチャレンジ",
        description:
          "疲れ果てていたり、関係を修復できないと感じていたりするときは、限界を作る思考を捨ててください。小さく一貫した習慣が、破壊的な惰性を打ち破ることを信じましょう。",
      },
    },
  },
  {
    task_id: "mod3_task4_saciado_deus",
    module_id: 3,
    cost_level: "medium_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 21",
    translations: {
      pt: {
        title: "Oásis Interior",
        description:
          "Não deposite no seu cônjuge a obrigação de preencher todos os seus vazios emocionais. Tire hoje 15 minutos para meditar, respirar e buscar o seu equilíbrio interior espiritual na presença de Deus.",
      },
      en: {
        title: "Inner Oasis",
        description:
          "Do not place upon your spouse the burden of filling all your emotional voids. Take 15 minutes today to meditate, breathe, and seek your inner spiritual balance in God's presence.",
      },
      es: {
        title: "Oasis Interior",
        description:
          "No deposites en tu cónyuge la obligación de llenar todos tus vacíos emocionales. Tómate hoy 15 minutos para meditar, respirar y buscar tu equilibrio espiritual interior en la presencia de Dios.",
      },
      fr: {
        title: "Oasis Intérieure",
        description:
          "Ne faites pas reposer sur votre conjoint l'obligation de combler tous vos vides émotionnels. Prenez aujourd'hui 15 minutes pour méditer, respirer et chercher votre équilibre spirituel intérieur en présence de Dieu.",
      },
      de: {
        title: "Innere Oase",
        description:
          "Belasten Sie Ihren Ehepartner nicht mit der Pflicht, alle Ihre emotionalen Lücken zu füllen. Nehmen Sie sich heute 15 Minuten Zeit, um zu meditieren, tief durchzuatmen und Ihr inneres seelisches Gleichgewicht in Gottes Gegenwart zu suchen.",
      },
      ja: {
        title: "内面のオアシス",
        description:
          "すべての感情的な空白を満たすという負担を配偶者に課さないでください。今日15分間時間を取って、瞑想し、深呼吸をし、神の存在の中で内なる霊的バランスを求めてください。",
      },
    },
  },
  {
    task_id: "mod3_task5_celebrar_deus",
    module_id: 3,
    cost_level: "low_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 34",
    translations: {
      pt: {
        title: "Foco na Verdade",
        description:
          "Afaste os boatos e as desconfianças. Hoje, celebre e elogie o caráter íntegro do seu cônjuge, validando as atitudes corretas que ele toma no dia a dia com integridade.",
      },
      en: {
        title: "Focus on Truth",
        description:
          "Dismiss rumors and suspicions. Today, celebrate and praise your spouse's upright character, validating the correct and honest actions they take in daily life.",
      },
      es: {
        title: "Foco en la Verdad",
        description:
          "Aleja los rumores y las desconfianzas. Hoy, celebra y elogia el carácter íntegro de tu cónyuge, validando las actitudes correctas que toma en el día a día con integridad.",
      },
      fr: {
        title: "Focus sur la Vérité",
        description:
          "Écartez les rumeurs et les soupçons. Aujourd'hui, célébrez et félicitez le caractère intègre de votre conjoint, en validant les actions justes et honnêtes qu'il pose au quotidien.",
      },
      de: {
        title: "Fokus auf die Wahrheit",
        description:
          "Weisen Sie Gerüchte und Misstrauen zurück. Feiern und loben Sie heute den aufrechten Charakter Ihres Ehepartners und bestätigen Sie die korrekten und ehrlichen Verhaltensweisen im Alltag.",
      },
      ja: {
        title: "真実へのフォーカスのチャレンジ",
        description:
          "うわさや疑念を捨ててください。今日、配偶者の誠実な人格を称え、日常生活で相手がとっている正しく誠実な行動を認めて評価してください。",
      },
    },
  },
  {
    task_id: "mod3_task6_palavra_deus",
    module_id: 3,
    cost_level: "medium_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 36",
    translations: {
      pt: {
        title: "Fundação na Rocha",
        description:
          "Hoje, busque um conselho ou leitura espiritual que traga solidez para as suas decisões familiares. Evite agir sob o efeito de instabilidades emocionais passageiras.",
      },
      en: {
        title: "Foundation on the Rock",
        description:
          "Today, seek spiritual advice or reading that brings solidity to your family decisions. Avoid acting under the influence of fleeting emotional instabilities.",
      },
      es: {
        title: "Fundación en la Roca",
        description:
          "Hoy, busca un consejo o lectura espiritual que dé solidez a tus decisiones familiares. Evita actuar bajo el efecto de inestabilidades emocionales pasajeras.",
      },
      fr: {
        title: "Fondation sur le Roc",
        description:
          "Aujourd'hui, cherchez un conseil ou une lecture spirituelle qui donne de la solidité à vos décisions familiales. Évitez d'agir sous le coup d'instabilités émotionnelles passagères.",
      },
      de: {
        title: "Fundament auf dem Felsen",
        description:
          "Suchen Sie heute nach spirituellem Rat oder einer Lektüre, die Ihren familiären Entscheidungen Festigkeit verleiht. Vermeiden Sie es, unter dem Einfluss flüchtiger emotionaler Instabilität zu handeln.",
      },
      ja: {
        title: "岩の上の土台のチャレンジ",
        description:
          "今日、家族の決定に堅実さをもたらす霊的なアドバイスや読書を求めてください。一時的な感情の不安定さに影響されて行動するのを避けましょう。",
      },
    },
  },
  {
    task_id: "mod3_task7_concordar_oracao",
    module_id: 3,
    cost_level: "high_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 37",
    translations: {
      pt: {
        title: "Concordância na Dor",
        description:
          "Se houver abertura espiritual, convide seu cônjuge para um momento simples de oração ou conexão silenciosa hoje. Coloquem os focos de estresse sob uma perspectiva de paz conjunta.",
      },
      en: {
        title: "Agreement in Pain",
        description:
          "If there is spiritual openness, invite your spouse for a simple moment of prayer or quiet connection today. Place stress factors under a perspective of shared peace.",
      },
      es: {
        title: "Concordancia en el Dolor",
        description:
          "Si hay apertura espiritual, invita a tu cónyuge a un momento sencillo de oración o conexión silenciosa hoy. Poned los factores de estrés bajo una perspectiva de paz conjunta.",
      },
      fr: {
        title: "Accord dans la Douleur",
        description:
          "S'il y a une ouverture d'esprit, invitez votre conjoint à partager un moment simple de prière ou de connexion silencieuse aujourd'hui. Placez les facteurs de stress sous l'angle d'une paix partagée.",
      },
      de: {
        title: "Übereinkunft im Schmerz",
        description:
          "Wenn spirituelle Offenheit besteht, laden Sie Ihren Ehepartner heute zu einem einfachen Moment des Gebets oder der stillen Verbundenheit ein. Betrachten Sie Stressfaktoren aus der Perspektive eines gemeinsamen Friedens.",
      },
      ja: {
        title: "苦難における調和のチャレンジ",
        description:
          "心の準備ができているなら、今日、配偶者を静かな祈りや対話の短い時間に招待してください。ストレス要因を、お互いの平和の視点の中に置いてみましょう。",
      },
    },
  },
  {
    task_id: "mod4_task1_pausa_fisiologica",
    module_id: 4,
    cost_level: "medium_cost",
    importance_weight: 7.0,
    source: "Gottman / Fisiologia do Estresse",
    translations: {
      pt: {
        title: "A Pausa Fisiológica",
        description:
          "Se notar que os batimentos cardíacos seus ou do parceiro aceleraram no conflito, proponha uma pausa de no mínimo 20 minutos. Mude o foco da atenção (leia, ouça música) até que o corpo retorne ao estado de calma e o raciocínio possa operar.",
      },
      en: {
        title: "The Physiological Break",
        description:
          "If you notice that your or your partner's heart rate accelerated during conflict, propose a break of at least 20 minutes. Shift your focus (read, listen to music) until the body returns to a calm state and logic can operate.",
      },
      es: {
        title: "La Pausa Fisiológica",
        description:
          "Si nota que sus latidos o los de su pareja se aceleraron en el conflicto, proponga una pausa de al menos 20 minutos. Cambie el foco de atención (lea, escuche música) hasta que el cuerpo vuelva a la calma y el razonamiento pueda operar.",
      },
      fr: {
        title: "La Pause Physiologique",
        description:
          "Si vous remarquez que vos battements cardiaques ou ceux de votre partenaire s'accélèrent lors d'un conflit, proposez une pause d'au moins 20 minutes. Changez de focalisation (lisez, écoutez de la musique) jusqu'à ce que le corps retrouve son calme et que le raisonnement logique puisse opérer.",
      },
      de: {
        title: "Die physiologische Pause",
        description:
          "Wenn Sie bemerken, dass sich Ihr Herzschlag oder der Ihres Partners im Konflikt beschleunigt hat, schlagen Sie eine Pause von mindestens 20 Minuten vor. Ändern Sie den Fokus (lesen Sie, hören Sie Musik), bis der Körper zur Ruhe kommt und das logische Denken wieder einsetzen kann.",
      },
      ja: {
        title: "生理的休止",
        description:
          "対立中に自分またはパートナーの心拍数が上がっていることに気づいたら、最低20分間の休憩を提案してください。体が穏やかな状態に戻ı、論理的な思考が可能になるまで、別のこと（読書や音楽を聴くなど）に意識を向けてください。",
      },
    },
  },
  {
    task_id: "mod4_task2_pair_grounding",
    module_id: 4,
    cost_level: "medium_cost",
    importance_weight: 7.0,
    source: "CBT / Terapia Cognitivo-Comportamental",
    translations: {
      pt: {
        title: "Exercício de Ancoragem",
        description:
          "Seja proativo para acalmar o seu sistema nervoso hoje. Tire 5 minutos para fechar os olhos e ancorar-se no ambiente: sinta seus pés firmes no chão, relaxe os ombros e respire pausadamente de forma profunda.",
      },
      en: {
        title: "Anchoring Exercise",
        description:
          "Be proactive in calming your nervous system today. Take 5 minutes to close your eyes and anchor yourself in the environment: feel your feet firm on the floor, relax your shoulders, and breathe slowly and deeply.",
      },
      es: {
        title: "Ejercicio de Anclaje",
        description:
          "Sea proactivo para calmar su sistema nervioso hoy. Tómese 5 minutos para cerrar los ojos y anclarse en el entorno: sienta sus pies firmes en el suelo, relaje los hombros y respire pausadamente de forma profunda.",
      },
      fr: {
        title: "Exercice d'Ancrage",
        description:
          "Aujourd'hui, calmez activement votre système nerveux. Prenez 5 minutes pour fermer les yeux et vous ancrer dans votre environnement : sentez vos pieds bien à plat sur le sol, détendez vos épaules et respirez lentement et profondément.",
      },
      de: {
        title: "Erdungsübung",
        description:
          "Seien Sie heute proaktiv, um Ihr Nervensystem zu beruhigen. Nehmen Sie sich 5 Minuten Zeit, schließen Sie die Augen und verankern Sie sich im Hier und Jetzt: Spüren Sie Ihre Füße fest auf dem Boden, entspannen Sie die Schultern und atmen Sie langsam und tief durch.",
      },
      ja: {
        title: "グラウンディングのエクササイズ",
        description:
          "今日、自発的に神経系を落ち着かせるようにしてください。5分間目を閉じ、環境の中に自分をつなぎとめます。足が床にしっかりとついているのを感じ、肩の力を抜き、ゆっくりと深呼吸しましょう。",
      },
    },
  },
  {
    task_id: "mod4_task3_nao_irritar",
    module_id: 4,
    cost_level: "medium_cost",
    importance_weight: 7.0,
    source: "Desafio de Amar - Dia 6",
    translations: {
      pt: {
        title: "Controle da Reação",
        description:
          "Identifique o que costuma ativar a sua irritação física (cansaço, fome, excesso de telas). Hoje, neutralize esses gatilhos de estresse antes de interagir com o seu cônjuge, mantendo o autocontrole.",
      },
      en: {
        title: "Reaction Control",
        description:
          "Identify what usually triggers your physical irritation (fatigue, hunger, screen overload). Today, neutralize these stress triggers before interacting with your spouse, maintaining self-control.",
      },
      es: {
        title: "Control de la Reacción",
        description:
          "Identifica qué suele activar tu irritación física (cansancio, hambre, exceso de pantallas). Hoy, neutraliza esos factores de estrés antes de interactuar con tu cónyuge, manteniendo el autocontrol.",
      },
      fr: {
        title: "Contrôle de la Réaction",
        description:
          "Identifiez ce qui déclenche habituellement votre irritation physique (fatigue, faim, trop de temps d'écrans). Aujourd'hui, neutralisez ces facteurs de stress avant d'interagir avec votre conjoint, en gardant votre sang-froid.",
      },
      de: {
        title: "Reaktionskontrolle",
        description:
          "Identifizieren Sie, was normalerweise Ihre körperliche Reizbarkeit auslöst (Müdigkeit, Hunger, Überlastung durch Bildschirme). Neutralisieren Sie heute diese Stressauslöser, bevor Sie mit Ihrem Partner interagieren, und bewahren Sie die Selbstbeherrschung.",
      },
      ja: {
        title: "反応コントロールのチャレンジ",
        description:
          "自分の身体的ないらいらを何が引き起こしているか（疲労、空腹、長時間の画面操作など）を特定してください。今日、配偶者と関わる前に、これらのストレス要因を和らげ、自己管理を維持しましょう。",
      },
    },
  },
  {
    task_id: "mod5_task1_ceder_para_vencer",
    module_id: 5,
    cost_level: "high_cost",
    importance_weight: 6.0,
    source: "Literatura Crist\u00e3 / Intelig\u00eancia Multifocal",
    translations: {
      pt: {
        title: "Ceder para Vencer",
        description:
          "Na primeira discussão ou momento ríspido de hoje, responda de forma mansa com um pedido sincero de desculpas pela sua parcela de culpa, optando por desarmar o conflito em vez de vencer a discussão.",
      },
      en: {
        title: "Yield to Overcome",
        description:
          "At the first argument or harsh moment today, respond gently with a sincere apology for your share of the blame, choosing to de-escalate the conflict rather than winning the argument.",
      },
      es: {
        title: "Ceder para Vencer",
        description:
          "En la primera discusión o momento áspero de hoy, responda con mansedumbre con una sincera disculpa por su parte de culpa, eligiendo desarmar el conflicto en lugar de ganar la discusión.",
      },
      fr: {
        title: "Céder pour Vaincre",
        description:
          "Lors de la première dispute ou du premier moment difficile aujourd'hui, répondez doucement par des excuses sincères pour votre part de responsabilité, en choisissant d'apaiser le conflit plutôt que de vouloir gagner la dispute.",
      },
      de: {
        title: "Nachgeben, um zu gewinnen",
        description:
          "Reagieren Sie heute beim ersten Streit oder barschten Moment sanft mit einer aufrichtigen Entschuldigung für Ihren Anteil an der Schuld. Entscheiden Sie sich dafür, den Konflikt zu entschärfen, anstatt den Streit zu gewinnen.",
      },
      ja: {
        title: "勝ちを譲る",
        description:
          "今日最初の意見の相違や険悪な瞬間に直面した際、自分の非を認めて素直に謝罪し、穏やかに対応してください。議論に勝つことよりも、対立を和らげることを選択します。",
      },
    },
  },
  {
    task_id: "mod5_task2_incondicional",
    module_id: 5,
    cost_level: "medium_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 10",
    translations: {
      pt: {
        title: "Amor sem Condições",
        description:
          "Faça algo fora do normal para o seu cônjuge hoje que mostre que seu compromisso não depende do comportamento dele. Demonstre que você o ama pelo simples fato de serem parceiros de vida.",
      },
      en: {
        title: "Unconditional Love",
        description:
          "Do something extraordinary for your spouse today that shows your commitment does not depend on their behavior. Demonstrate that you love them simply because you are life partners.",
      },
      es: {
        title: "Amor sin Condiciones",
        description:
          "Haz algo fuera de lo común por tu cónyuge hoy que demuestre que tu compromiso no depende de su comportamiento. Demuestra que lo/la amas por el simple hecho de ser compañeros de vida.",
      },
      fr: {
        title: "Amour sans Conditions",
        description:
          "Faites aujourd'hui quelque chose de spécial pour votre conjoint, montrant que votre engagement ne dépend pas de son comportement. Démontrez que vous l'aimez simplement parce que vous êtes partenaires de vie.",
      },
      de: {
        title: "Bedingungslose Liebe",
        description:
          "Tun Sie heute etwas Außergewöhnliches für Ihren Ehepartner, um zu zeigen, dass Ihr Engagement nicht von seinem Verhalten abhängt. Zeigen Sie ihm, dass Sie ihn lieben, einfach weil Sie Lebenspartner sind.",
      },
      ja: {
        title: "無条件の愛のチャレンジ",
        description:
          "今日、配偶者のために、自分のコミットメントが相手の行動に依存しないことを示すような特別なことを行いましょう。単に人生のパートナーであるという理由から愛していることを示してください。",
      },
    },
  },
  {
    task_id: "mod5_task3_deixar_vencer",
    module_id: 5,
    cost_level: "medium_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 12",
    translations: {
      pt: {
        title: "Deixar o Outro Vencer",
        description:
          "Em uma área de desacordo bobo hoje, ceda intencionalmente. Diga: 'Eu prefiro fazer do seu jeito hoje'. Prefira a harmonia conjugal à necessidade de ter razão.",
      },
      en: {
        title: "Let the Other Win",
        description:
          "In an area of minor disagreement today, intentionally yield. Say: 'I prefer to do it your way today'. Value marital harmony over the need to be right.",
      },
      es: {
        title: "Dejar Ganar al Otro",
        description:
          "En una área de desacuerdo menor hoy, cede intencionalmente. Di: 'Prefiero hacerlo a tu manera hoy'. Valora la armonía conyugal por encima de la necesidad de tener razón.",
      },
      fr: {
        title: "Laisser l'Autre Gagner",
        description:
          "Dans un domaine de désaccord mineur aujourd'hui, cédez intentionnellement. Dites : 'Je préfère faire comme tu veux aujourd'hui'. Privilégiez l'harmonie conjugale au besoin d'avoir raison.",
      },
      de: {
        title: "Den Anderen gewinnen lassen",
        description:
          "Geben Sie heute bei einer kleinen Meinungsverschiedenheit bewusst nach. Sagen Sie: 'Ich möchte es heute gerne so machen, wie du möchtest'. Stellen Sie die eheliche Harmonie über das Bedürfnis, recht zu haben.",
      },
      ja: {
        title: "勝ちを譲るチャレンジ",
        description:
          "今日、些細な意見の相違がある場面で、意図的に譲歩してください。「今日はあなたのやり方でいいよ」と言ってみましょう。正しいことよりも、夫婦の調和を重視してください。",
      },
    },
  },
  {
    task_id: "mod5_task4_responsavel",
    module_id: 5,
    cost_level: "high_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 26",
    translations: {
      pt: {
        title: "Assumir a Culpa",
        description:
          "Dê o primeiro passo para consertar um desentendimento recente. Admita sinceramente o seu erro ou a sua reação ríspida, sem apontar os erros do outro. Peça perdão.",
      },
      en: {
        title: "Taking Responsibility",
        description:
          "Take the first step to fix a recent misunderstanding. Sincerely admit your mistake or your harsh reaction, without pointing out the other's errors. Ask for forgiveness.",
      },
      es: {
        title: "Asumir la Culpa",
        description:
          "Da el primer paso para solucionar un malentendido reciente. Admite sinceramente tu error o tu reacción ruda, sin señalar los errores del otro. Pide perdón.",
      },
      fr: {
        title: "Prendre ses Responsabilités",
        description:
          "Faites le premier pas pour dissiper un malentendu récent. Admettez sincèrement votre erreur ou votre réaction excessive, sans pointer du doigt les torts de l'autre. Demandez pardon.",
      },
      de: {
        title: "Verantwortung übernehmen",
        description:
          "Machen Sie den ersten Schritt, um ein jüngstes Missverständnis auszuräumen. Gestehen Sie aufrichtig Ihren Fehler oder Ihre barsche Reaktion ein, ohne auf die Fehler des anderen hinzuweisen. Bitten Sie um Verzeihung.",
      },
      ja: {
        title: "責任を引き受けるチャレンジ",
        description:
          "最近の誤解を解決するための第一歩を踏み出してください。相手の過ちを指摘することなく、自分の過ちや厳しい反応を素直に認め、謝罪してください。",
      },
    },
  },
  {
    task_id: "mod5_task5_permanece",
    module_id: 5,
    cost_level: "high_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 39",
    translations: {
      pt: {
        title: "Amor que Permanece",
        description:
          "Mesmo diante de barreiras ou silêncio do parceiro, decida que sua atitude de cuidado será constante. Escreva uma promessa pessoal para si mesmo de nunca desistir de salvar o seu lar.",
      },
      en: {
        title: "Love that Endures",
        description:
          "Even in the face of barriers or silence from your partner, decide that your caring attitude will remain constant. Write a personal promise to yourself to never give up on saving your home.",
      },
      es: {
        title: "Amor que Permanece",
        description:
          "Incluso ante las barreras o el silencio de tu pareja, decide que tu actitud de cuidado será constante. Escribe una promesa personal para ti mismo de nunca renunciar a salvar tu hogar.",
      },
      fr: {
        title: "L'Amour qui Demeure",
        description:
          "Même face aux obstacles ou au silence de votre conjoint, décidez que votre bienveillance restera constante. Écrivez-vous une promesse personnelle de ne jamais abandonner la sauvegarde de votre foyer.",
      },
      de: {
        title: "Liebe, die bleibt",
        description:
          "Entscheiden Sie sich dafür, dass Ihre fürsorgliche Haltung auch bei Barrieren oder Schweigen Ihres Partners beständig bleibt. Schreiben Sie ein persönliches Versprechen an sich selbst, die Rettung Ihres Heims niemals aufzugeben.",
      },
      ja: {
        title: "持続する愛のチャレンジ",
        description:
          "パートナーからの拒絶や沈黙に直面しても、自分の思いやりのある態度を一貫させることを決意してください。自分の家庭を守ることを決してあきらめないという誓いを、自分自身に向けて書き留めましょう。",
      },
    },
  },
  {
    task_id: "mod6_task1_limpeza_ressentimentos",
    module_id: 6,
    cost_level: "medium_cost",
    importance_weight: 6.0,
    source: "Gottman (Reescrevendo a Hist\u00f3ria)",
    translations: {
      pt: {
        title: "Limpeza do Passado",
        description:
          "Escreva em um papel uma mágoa antiga do relacionamento que ainda nubla sua visão. Faça um ato simbólico de queimar ou rasgar esse papel, decidindo conscientemente liberar o perdão.",
      },
      en: {
        title: "Cleansing the Past",
        description:
          "Write down on paper an old resentment in the relationship that still clouds your view. Perform a symbolic act of burning or tearing this paper, consciously deciding to release forgiveness.",
      },
      es: {
        title: "Limpieza del Pasado",
        description:
          "Escribe en un papel un resentimiento antiguo de la relación que aún nuble tu vista. Realiza un acto simbólico de quemar o romper ese papel, decidiendo conscientemente liberar el perdón.",
      },
      fr: {
        title: "Nettoyer le Passé",
        description:
          "Écrivez sur un papier un vieux ressentiment de votre relation qui assombrit encore votre vision. Faites le geste symbolique de brûler ou de déchirer ce papier, en décidant consciemment d'accorder votre pardon.",
      },
      de: {
        title: "Reinigung der Vergangenheit",
        description:
          "Schreiben Sie einen alten Groll aus der Beziehung auf, der Ihren Blick immer noch trübt. Vollziehen Sie einen symbolischen Akt des Verbrennenns oder Zerreißens dieses Papiers und entscheiden Sie sich bewusst für die Vergebung.",
      },
      ja: {
        title: "過去の浄化のチャレンジ",
        description:
          "いまだにあなたの視野を曇らせている、関係性における過去の不満を紙に書き出してください。その紙を燃やすか引き裂くという象徴的な行為を行い、意図的に許しを与えることを決意してください。",
      },
    },
  },
  {
    task_id: "mod6_task2_acredita_melhor",
    module_id: 6,
    cost_level: "low_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 7",
    translations: {
      pt: {
        title: "Foco no Positivo",
        description:
          "Hoje, evite a 'Sala da Depreciação' mental. Concentre-se nas melhores qualidades que o seu cônjuge tem e agradeça-o sinceramente por um comportamento positivo recente que ele teve.",
      },
      en: {
        title: "Focus on the Positive",
        description:
          "Today, avoid the mental 'Room of Depreciation'. Focus on the best qualities your spouse possesses and sincerely thank them for a recent positive behavior.",
      },
      es: {
        title: "Foco en lo Positivo",
        description:
          "Hoy, evita la 'Sala de Depreciación' mental. Concéntrate en las mejores cualidades que tiene tu cónyuge y agradécele sinceramente por un comportamiento positivo reciente.",
      },
      fr: {
        title: "Focus sur le Positif",
        description:
          "Aujourd'hui, évitez la 'Salle de Dépréciation' mentale. Concentrez-vous sur les meilleures qualités de votre conjoint et remerciez-le sincèrement pour un comportement positif récent.",
      },
      de: {
        title: "Fokus auf das Positive",
        description:
          "Vermeiden Sie heute den mentalen 'Abwertungsraum'. Konzentrieren Sie sich auf die besten Eigenschaften Ihres Ehepartners und danken Sie ihm aufrichtig für ein positives Verhalten in jüngster Zeit.",
      },
      ja: {
        title: "肯定的な側面に目を向けるチャレンジ",
        description:
          "今日、脳裏にある「非難の部屋」を避けてください。配偶者が持つ最も優れた資質に焦点を当て、最近相手がとった肯定的な行動に対して心から感謝を伝えてください。",
      },
    },
  },
  {
    task_id: "mod6_task3_nao_ciumes",
    module_id: 6,
    cost_level: "low_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 8",
    translations: {
      pt: {
        title: "Vencer a Inveja",
        description:
          "Decida celebrar o sucesso do seu cônjuge em vez de sentir ciúmes ou competir com ele. Expresse alegria sincera por uma conquista dele hoje, apoiando-o integralmente.",
      },
      en: {
        title: "Defeating Jealousy",
        description:
          "Decide to celebrate your spouse's success instead of feeling jealous or competing with them. Express sincere joy for an achievement of theirs today, supporting them fully.",
      },
      es: {
        title: "Vencer la Envidia",
        description:
          "Decide celebrar el éxito de tu cónyuge en lugar de sentir celos o competir con él/ella. Expresa alegría sincera por un logro suyo hoy, apoyándolo/la por completo.",
      },
      fr: {
        title: "Vaincre la Jalousie",
        description:
          "Décidez de célébrer le succès de votre conjoint au lieu de ressentir de la jalousie ou d'entrer en compétition. Exprimez une joie sincère pour l'une de ses réussites aujourd'hui, en le soutenant pleinement.",
      },
      de: {
        title: "Eifersucht besiegen",
        description:
          "Entscheiden Sie sich dafür, den Erfolg Ihres Ehepartners zu feiern, anstatt eifersüchtig zu sein oder zu konkurrieren. Drücken Sie heute aufrichtige Freude über einen Erfolg von ihm aus und unterstützen Sie ihn voll und ganz.",
      },
      ja: {
        title: "嫉妬を克服するチャレンジ",
        description:
          "嫉妬したり競争したりする代わりに、配偶者の成功を祝うことを決意してください。今日、相手の達成したことに対して心からの喜びを表現し、全面的に支持してください。",
      },
    },
  },
  {
    task_id: "mod6_task4_perdoa",
    module_id: 6,
    cost_level: "high_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 25",
    translations: {
      pt: {
        title: "A Decisão de Perdoar",
        description:
          "Seja o primeiro a estender o perdão para uma mágoa recente ou antiga no casamento. Diga ao seu coração: 'Eu escolho liberar essa dívida', permitindo o recomeço do amor.",
      },
      en: {
        title: "The Decision to Forgive",
        description:
          "Be the first to extend forgiveness for a recent or old hurt in the marriage. Say to your heart: 'I choose to release this debt', allowing love to restart.",
      },
      es: {
        title: "La Decisión de Perdonar",
        description:
          "Sé el primero en otorgar el perdón por una herida reciente o antigua en el matrimonio. Di a tu corazón: 'Elijo liberar esta deuda', permitiendo el reinicio del amor.",
      },
      fr: {
        title: "La Décision de Pardonner",
        description:
          "Soyez le premier à pardonner une blessure récente ou ancienne dans votre couple. Dites à votre cœur : 'Je choisis d'effacer cette dette', pour permettre à l'amour de renaître.",
      },
      de: {
        title: "Die Entscheidung zu vergeben",
        description:
          "Seien Sie der Erste, der Vergebung für eine jüngste oder alte Verletzung in der Ehe anbietet. Sagen Sie zu Ihrem Herzen: 'Ich entscheide mich, diese Schuld zu erlassen', damit die Liebe neu beginnen kann.",
      },
      ja: {
        title: "許しの決断のチャレンジ",
        description:
          "夫婦関係における最近または過去の傷つきに対して、あなたから進んで許しを与えてください。「このわだかまりを手放すことを選択します」と自分の心に言い聞かせ、愛を再出発させましょう。",
      },
    },
  },
  {
    task_id: "mod6_task5_realizar_sonhos",
    module_id: 6,
    cost_level: "medium_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 38",
    translations: {
      pt: {
        title: "Apoio aos Sonhos",
        description:
          "Identifique um sonho ou objetivo pessoal que seu cônjuge tem e que ficou esquecido. Converse com ele hoje mostrando que você deseja apoiá-lo ativamente a realizá-lo.",
      },
      en: {
        title: "Supporting Dreams",
        description:
          "Identify a personal dream or goal of your spouse that has been forgotten. Talk to them today, showing that you want to actively support them in making it come true.",
      },
      es: {
        title: "Apoyo a los Sueños",
        description:
          "Identifica un sueño o meta personal que tu cónyuge tenga y que haya quedado en el olvido. Habla con él/ella hoy demostrándole que deseas apoyarlo/la activamente a realizarlo.",
      },
      fr: {
        title: "Soutenir les Rêves",
        description:
          "Identifiez un rêve ou un objectif personnel oublié de votre conjoint. Parlez-lui en aujourd'hui pour lui montrer que vous souhaitez l'aider activement à le réaliser.",
      },
      de: {
        title: "Träume unterstützen",
        description:
          "Identifizieren Sie einen persönlichen Traum oder ein Ziel Ihres Partners, das in Vergessenheit geraten ist. Sprechen Sie heute mit ihm darüber und zeigen Sie ihm, dass Sie ihn aktiv bei der Verwirklichung unterstützen möchten.",
      },
      ja: {
        title: "夢を支援するチャレンジ",
        description:
          "忘れ去られていた配偶者の個人的な夢や目標を特定してください。今日そのことについて話し合い、それを実現するためにあなたが積極的に支援したいと思っていることを示しましょう。",
      },
    },
  },
  {
    task_id: "mod7_task1_aliviar_carga",
    module_id: 7,
    cost_level: "medium_cost",
    importance_weight: 6.0,
    source: "NIH / Carga Invis\u00edvel",
    translations: {
      pt: {
        title: "Aliviando a Carga Mental",
        description:
          "Identifique uma tarefa logística, doméstica ou de planejamento que normalmente seu parceiro gerencia e assuma-a integralmente hoje, sem que ele precise pedir ou cobrar.",
      },
      en: {
        title: "Relieving the Mental Load",
        description:
          "Identify a logistical, household, or planning task that your partner usually manages and assume full responsibility for it today, without them having to ask or remind you.",
      },
      es: {
        title: "Aliviando la Carga Mental",
        description:
          "Identifique una tarea logística, doméstica o de planificación que normalmente su pareja maneja y asúmala por completo hoy, sin que él/ella tenga que pedírselo o recordárselo.",
      },
      fr: {
        title: "Alléger la Charge Mentale",
        description:
          "Identifiez une tâche logistique, domestique ou de planification que votre partenaire gère habituellement et assumez-en la responsabilité totale aujourd'hui, sans qu'il ait besoin de vous le demander ou de vous le rappeler.",
      },
      de: {
        title: "Entlastung der mentalen Last",
        description:
          "Identifizieren Sie eine organisatorische, hauswirtschaftliche oder planerische Aufgabe, die Ihr Partner normalerweise erledigt, und übernehmen Sie heute die volle Verantwortung dafür, ohne dass er Sie darum bitten oder anmühen muss.",
      },
      ja: {
        title: "精神的負担（マルチタスク）の軽減",
        description:
          "普段パートナーが管理しているロジスティクス、家事、または計画タスクを1つ特定し、相手に促されることなく、今日その全責任をあなたが自発的に引き受けて実行してください。",
      },
    },
  },
  {
    task_id: "mod7_task2_esferas_invisiveis",
    module_id: 7,
    cost_level: "medium_cost",
    importance_weight: 6.0,
    source: "Pesquisas Acad\u00eamicas (IJIP)",
    translations: {
      pt: {
        title: "Suporte Invisível",
        description:
          "Hoje, encarregue-se de organizar ou resolver algo prático em silêncio (ex: agendar uma manutenção, pagar uma conta, planejar o menu semanal). Faça-o sem anunciar para de fato reduzir a carga mental invisível do parceiro.",
      },
      en: {
        title: "Invisible Support",
        description:
          "Today, take charge of organizing or resolving something practical in silence (e.g., scheduling a maintenance, paying a bill, planning the weekly menu). Do it without announcing it to truly reduce your partner's invisible mental load.",
      },
      es: {
        title: "Soporte Invisible",
        description:
          "Hoy, encárguese de organizar o resolver algo práctico en silencio (ej: programar un mantenimiento, pagar una factura, planificar el menú semanal). Hágalo sin anunciarlo para reducir realmente la carga mental invisible de su pareja.",
      },
      fr: {
        title: "Soutien Invisible",
        description:
          "Aujourd'hui, chargez-vous d'organiser ou de résoudre quelque chose de pratique en silence (ex: planifier un entretien, payer une facture, organiser le menu hebdomadaire). Faites-le sans en parler afin d'alléger réellement la charge mentale invisible de votre conjoint.",
      },
      de: {
        title: "Unsichtbare Unterstützung",
        description:
          "Übernehmen Sie heute schweigend die Organisation oder Lösung von etwas Praktischem (z. B. Vereinbarung eines Wartungstermins, Bezahlen einer Rechnung, Planung des Wochenmenüs). Tun Sie dies ohne Ankündigung, um die unsichtbare mentale Last Ihres Partners spürbar zu verringern.",
      },
      ja: {
        title: "目に見えないサポート",
        description:
          "今日、黙って実用的な何かを整理または解決する役割を担ってください（例：メンテナンスの予約、支払いの処理、一週間の献立の作成など）。パートナーの目に見えない精神的負担を本当に軽減するために、あえて宣言せずに行ってください。",
      },
    },
  },
  {
    task_id: "mod7_task3_nao_egoista",
    module_id: 7,
    cost_level: "low_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 3",
    translations: {
      pt: {
        title: "Interesses Mútuos",
        description:
          "Hoje, abdique de uma preferência pessoal para priorizar o bem-estar do seu cônjuge. Pergunte: 'O que você gostaria de fazer ou comer hoje?' e apoie a decisão dele com boa vontade.",
      },
      en: {
        title: "Mutual Interests",
        description:
          "Today, give up a personal preference to prioritize your spouse's well-being. Ask: 'What would you like to do or eat today?' and support their decision with goodwill.",
      },
      es: {
        title: "Intereses Mutuos",
        description:
          "Hoy, renuncia a una preferencia personal para priorizar el bienestar de tu cónyuge. Pregunta: '¿Qué te gustaría hacer o comer hoy?' y apoya su decisión con buena voluntad.",
      },
      fr: {
        title: "Intérêts Mutuels",
        description:
          "Aujourd'hui, renoncez à une préférence personnelle pour privilégier le bien-être de votre conjoint. Demandez : 'Qu'aimerais-tu faire ou manger aujourd'hui ?' et soutenez sa décision de bon cœur.",
      },
      de: {
        title: "Gemeinsame Interessen",
        description:
          "Geben Sie heute eine persönliche Vorliebe auf, um das Wohlbefinden Ihres Ehepartners in den Vordergrund zu stellen. Fragen Sie: 'Was möchtest du heute gerne tun oder essen?' und unterstützen Sie seine Entscheidung wohlwollend.",
      },
      ja: {
        title: "相互利益のチャレンジ",
        description:
          "今日、配偶者の幸福を最優先するために、個人的な好みを譲歩してください。「今日は何がしたい？何が食べたい？」と尋ね、相手の決定を快くサポートしましょう。",
      },
    },
  },
  {
    task_id: "mod7_task4_se_sacrificar",
    module_id: 7,
    cost_level: "high_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 28",
    translations: {
      pt: {
        title: "Sacrifício Amoroso",
        description:
          "Identifique qual é a maior necessidade ou fardo do seu cônjuge neste momento. Faça um ato corajoso de sacrifício da sua parte (ex: assumir o cuidado das crianças à noite) para que ele possa descansar.",
      },
      en: {
        title: "Loving Sacrifice",
        description:
          "Identify your spouse's greatest need or burden right now. Make a courageous sacrifice on your part (e.g., taking full charge of the kids at night) so they can rest.",
      },
      es: {
        title: "Sacrificio Amoroso",
        description:
          "Identifica cuál es la mayor necesidad o carga de tu cónyuge en este momento. Haz un acto valiente de sacrificio de tu parte (ej: asumir el cuidado de los niños por la noche) para que pueda descansar.",
      },
      fr: {
        title: "Sacrifice d'Amour",
        description:
          "Identifiez le plus grand besoin ou le fardeau actuel de votre conjoint. Faites un acte de dévouement courageux de votre part (ex: prendre pleinement en charge les enfants ce soir) pour qu'il puisse se reposer.",
      },
      de: {
        title: "Liebevolles Opfer",
        description:
          "Identifizieren Sie das größte Bedürfnis oder die Last Ihres Ehepartners in diesem Moment. Bringen Sie ein mutiges Opfer Ihrerseits (z. B. Übernahme der Kinderbetreuung am Abend), damit er sich ausruhen kann.",
      },
      ja: {
        title: "愛の自己犠牲のチャレンジ",
        description:
          "現在、配偶者が抱えている最大のニーズや負担を特定してください。相手が休むことができるよう、あなた自身が進んで代わりとなる行動をとってください（例：夜の間、子供の世話を全面的に引き受けるなど）。",
      },
    },
  },
  {
    task_id: "mod7_task5_independencia",
    module_id: 7,
    cost_level: "medium_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 31",
    translations: {
      pt: {
        title: "Liderança Saudável",
        description:
          "Deixe claro que o seu cônjuge e a sua nova família são a prioridade absoluta na sua vida. Resolva quaisquer dependências psicológicas ou interferências familiares externas que prejudicam seu lar.",
      },
      en: {
        title: "Healthy Leadership",
        description:
          "Make it clear that your spouse and your new family are the absolute priority in your life. Resolve any psychological dependencies or external family interferences harming your home.",
      },
      es: {
        title: "Liderazgo Saludable",
        description:
          "Deja claro que tu cónyuge y tu nueva familia son la prioridad absoluta en tu vida. Resuelve cualquier dependencia psicológica o interferencia familiar externa que dañe tu hogar.",
      },
      fr: {
        title: "Leadership Sain",
        description:
          "Montrez clairement que votre conjoint et votre nouvelle famille sont la priorité absolue dans votre vie. Résolvez toute dépendance psychologique ou interférence familiale externe qui nuit à votre foyer.",
      },
      de: {
        title: "Gesunde Führung",
        description:
          "Machen Sie deutlich, dass Ihr Ehepartner und Ihre neue Familie die absolute Priorität in Ihrem Leben sind. Lösen Sie alle psychologischen Abhängigkeiten oder äußeren familiären Einmischungen, die Ihr Heim belasten.",
      },
      ja: {
        title: "健全な主導権のチャレンジ",
        description:
          "配偶者と新しい家族が、あなたの人生における絶対的な最優先事項であることを明確に示してください。家庭に悪影響を及ぼしている心理的な依存や外部の家族からの干渉を解決しましょう。",
      },
    },
  },
  {
    task_id: "mod7_task6_completa",
    module_id: 7,
    cost_level: "low_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 33",
    translations: {
      pt: {
        title: "Trabalho em Equipe",
        description:
          "Veja o seu cônjuge como seu parceiro complementar e não como um rival. Hoje, faça uma tarefa em cooperação com ele, validando os pontos em que a habilidade dele completa a sua.",
      },
      en: {
        title: "Teamwork",
        description:
          "See your spouse as your complementary partner, not a rival. Today, complete a task in cooperation with them, validating the points where their skills complete yours.",
      },
      es: {
        title: "Trabajo en Equipo",
        description:
          "Ve a tu cónyuge como tu compañero complementario y no como un rival. Hoy, haz una tarea en cooperación con él/ella, valorando los puntos en los que su habilidad completa la tuya.",
      },
      fr: {
        title: "Travail d'Équipe",
        description:
          "Considérez votre conjoint comme votre partenaire complémentaire et non comme un rival. Aujourd'hui, effectuez une tâche en coopération avec lui, en valorisant les aspects où ses compétences complètent les vôtres.",
      },
      de: {
        title: "Teamarbeit",
        description:
          "Betrachten Sie Ihren Partner als Ergänzung und nicht als Rivalen. Erledigen Sie heute eine Aufgabe in Kooperation und bestätigen Sie die Punkte, an denen seine Fähigkeiten die Ihren ergänzen.",
      },
      ja: {
        title: "チームワークのチャレンジ",
        description:
          "配偶者をライバルではなく、自分を補完してくれるパートナーとして捉えてください。今日、協力して一つのタスクを完了し、相手のスキルが自分の不足を補っている点を評価しましょう。",
      },
    },
  },
  {
    task_id: "mod8_task1_alinhamento_financeiro",
    module_id: 8,
    cost_level: "medium_cost",
    importance_weight: 5.0,
    source: "Gottman (Gest\u00e3o de Conflitos Solv\u00e1veis)",
    translations: {
      pt: {
        title: "Alinhamento Financeiro",
        description:
          "Agende uma conversa calma e preventiva para revisar os orçamentos e as metas financeiras do casal. Concentre-se em gerar segurança mútua e não em cobrar ou apontar erros de gastos.",
      },
      en: {
        title: "Financial Alignment",
        description:
          "Schedule a calm, preventive conversation to review budgets and couples' financial goals. Focus on generating mutual security, rather than accusing or pointing out spending errors.",
      },
      es: {
        title: "Alineación Financiera",
        description:
          "Planifique una conversación tranquila y preventiva para revisar los presupuestos y las metas financieras de la pareja. Concéntrese en generar seguridad mutua y no en reclamar o señalar errores de gastos.",
      },
      fr: {
        title: "Alignement Financier",
        description:
          "Planifiez une discussion calme et constructive pour revoir le budget et les objectifs financiers de votre couple. Concentrez-vous sur la sécurité mutuelle plutôt que sur les reproches ou les erreurs de dépenses.",
      },
      de: {
        title: "Finanzielle Abstimmung",
        description:
          "Planen Sie ein ruhiges, präventives Gespräch, um Budgets und finanzielle Ziele der Partnerschaft zu überprüfen. Konzentrieren Sie sich darauf, gegenseitige Sicherheit zu schaffen, anstatt Vorwürfe oder Ausgabenfehler anzusprechen.",
      },
      ja: {
        title: "金銭的な歩み寄りのチャレンジ",
        description:
          "予算と夫婦の財務目標をレビューするための、穏やかで建設的な対話をスケジュールしてください。支出の過ちを非難したり指摘したりするのではなく、お互いの安全性を生み出すことに焦点を当てましょう。",
      },
    },
  },
  {
    task_id: "mod8_task2_amor_justo",
    module_id: 8,
    cost_level: "medium_cost",
    importance_weight: 5.0,
    source: "Desafio de Amar - Dia 13",
    translations: {
      pt: {
        title: "Justiça e Transparência",
        description:
          "Defina regras limpas e transparentes para a gestão do dinheiro familiar. Garanta que ambos tenham voz e controle igual sobre os orçamentos, evitando divisões ou segredos.",
      },
      en: {
        title: "Fairness and Transparency",
        description:
          "Define clean and transparent rules for managing family money. Ensure both have equal voice and control over budgets, avoiding division or secrets.",
      },
      es: {
        title: "Justicia y Transparencia",
        description:
          "Define reglas claras y transparentes para la gestión del dinero familiar. Asegura que ambos tengan igual voz y control sobre los presupuestos, evitando divisiones o secretos.",
      },
      fr: {
        title: "Équité et Transparence",
        description:
          "Définissez des règles claires et transparentes pour la gestion de l'argent familial. Veillez à ce que chacun ait voix au chapitre et un contrôle égal sur le budget, en évitant les secrets ou les divisions.",
      },
      de: {
        title: "Gerechtigkeit und Transparenz",
        description:
          "Definieren Sie klare und transparente Regeln für die Verwaltung des Familienbudgets. Stellen Sie sicher, dass beide die gleiche Stimme und Kontrolle über die Finanzen haben, um Aufteilungen oder Geheimnisse zu vermeiden.",
      },
      ja: {
        title: "公平性と透明性のチャレンジ",
        description:
          "家庭内の資金管理について、明確で透明なルールを定義してください。隠し事や対立を避け、双方が予算に対して同等の意見と管理権限を持つようにしましょう。",
      },
    },
  },
  {
    task_id: "mod8_task3_amor_vs_cobica",
    module_id: 8,
    cost_level: "medium_cost",
    importance_weight: 5.0,
    source: "Desafio de Amar - Dia 24",
    translations: {
      pt: {
        title: "Contentamento e Paz",
        description:
          "Combata a cobiça e o consumismo social. Hoje, expresse gratidão por tudo o que vocês já têm juntos e redefina suas metas familiares baseadas na estabilidade e não no status financeiro.",
      },
      en: {
        title: "Contentment and Peace",
        description:
          "Fight greed and social consumerism. Today, express gratitude for all you already have together and redefine family goals based on stability, not financial status.",
      },
      es: {
        title: "Contentamiento y Paz",
        description:
          "Combate la codicia y el consumismo social. Hoy, expresa gratitud por todo lo que ya tenéis juntos y redefine las metas familiares basadas en la estabilidad y no en el estatus financiero.",
      },
      fr: {
        title: "Contentement et Paix",
        description:
          "Combattez la cupidité et le consumisme social. Aujourd'hui, exprimez votre gratitude pour tout ce que vous possédez déjà ensemble et redéfinissez vos buts familiaux en fonction de la stabilité, non du statut financier.",
      },
      de: {
        title: "Zufriedenheit und Frieden",
        description:
          "Bekämpfen Sie Gier und gesellschaftlichen Konsumismus. Drücken Sie heute Dankbarkeit für alles aus, was Sie bereits gemeinsam haben, und richten Sie Ihre familiären Ziele an Stabilität statt finanziellem Status aus.",
      },
      ja: {
        title: "満足感と平和のチャレンジ",
        description:
          "果てしない欲望や社会的な消費主義と闘ってください。今日、すでに二人で持っているすべてのものに感謝を表現し、財務的地位ではなく安定性に基づいて家族の目標を再定義しましょう。",
      },
    },
  },
  {
    task_id: "mod8_task4_presta_contas",
    module_id: 8,
    cost_level: "low_cost",
    importance_weight: 5.0,
    source: "Desafio de Amar - Dia 35",
    translations: {
      pt: {
        title: "Prestar Contas",
        description:
          "Evite decisões financeiras unilaterais ou impulsivas hoje. Se planeja fazer qualquer compra, consulte primeiro o seu cônjuge e tomem a decisão em concordância conjunta.",
      },
      en: {
        title: "Being Accountable",
        description:
          "Avoid unilateral or impulsive financial decisions today. If you plan to make any purchase, consult your spouse first and make the decision in joint agreement.",
      },
      es: {
        title: "Rendir Cuentas",
        description:
          "Evita decisiones financieras unilaterales o impulsivas hoy. Si planeas hacer alguna compra, consulta primero con tu cónyuge y tomad la decisión en concordancia mutua.",
      },
      fr: {
        title: "Rendre des Comptes",
        description:
          "Évitez aujourd'hui les décisions financières unilatérales ou impulsives. Si vous prévoyez de faire un achat, consultez d'abord votre conjoint et prenez la décision d'un commun accord.",
      },
      de: {
        title: "Rechenschaft ablegen",
        description:
          "Vermeiden Sie heute einseitige oder impulsive finanzielle Entscheidungen. Wenn Sie einen Kauf planen, sprechen Sie sich zuerst mit Ihrem Ehepartner ab und treffen Sie die Entscheidung gemeinsam.",
      },
      ja: {
        title: "報告し合うチャレンジ",
        description:
          "今日、一方的または衝動的な金銭的決定を避けてください。買い物を計画している場合は、まず配偶者に相談し、共同の合意のもとで決定を下しましょう。",
      },
    },
  },
  {
    task_id: "mod9_task1_ritual_ocitocina",
    module_id: 9,
    cost_level: "low_cost",
    importance_weight: 10.0,
    source: "Neurobiologia do Afeto / Gottman",
    translations: {
      pt: {
        title: "O Ritual da Ocitocina",
        description:
          "Ao reencontrar seu cônjuge hoje, dê um abraço silencioso de no mínimo 20 segundos ou um beijo prolongado de 6 segundos, ativando as vias neuroquímicas de apego e afeto físico de forma segura.",
      },
      en: {
        title: "The Oxytocin Ritual",
        description:
          "When you meet your spouse today, give them a silent hug of at least 20 seconds or a prolonged kiss of 6 seconds, safely activating the neurochemical pathways of attachment and physical affection.",
      },
      es: {
        title: "El Ritual de la Oxitocina",
        description:
          "Al reencontrarse con su cónyuge hoy, déle un abrazo silencioso de al menos 20 segundos o un beso prolongado de 6 segundos, activando las vías neuroquímicas de apego e afecto físico de forma segura.",
      },
      fr: {
        title: "Le Rituel de l'Oxytocine",
        description:
          "En retrouvant votre conjoint aujourd'hui, donnez-lui un câlin silencieux d'au moins 20 secondes ou un baiser prolongé de 6 secondes, activant en toute sécurité les voies neurochimiques de l'attachement et de l'affection physique.",
      },
      de: {
        title: "Das Oxytocin-Ritual",
        description:
          "Wenn Sie Ihren Partner heute wiedersehen, geben Sie ihm eine stille Umarmung von mindestens 20 Sekunden oder einen verlängerten Kuss von 6 Sekunden, um die neurochemischen Wege der Bindung und der körperlichen Zuneigung sicher zu aktivieren.",
      },
      ja: {
        title: "オキシトシンの儀式",
        description:
          "今日、配偶者と再会した際に、少なくとも20秒間の静かな抱擁をするか、6秒間の長いキスを交わしてください。これにより、愛着と物理的親密さに関わる脳内の神経化学経路を安全に活性化させます。",
      },
    },
  },
  {
    task_id: "mod9_task2_amor_cuida",
    module_id: 9,
    cost_level: "low_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 11",
    translations: {
      pt: {
        title: "Gesto de Carinho",
        description:
          "Faça um gesto prático que diga 'eu cuido de você' hoje. Ofereça uma massagem nas costas por 10 minutos para aliviar o estresse físico do seu parceiro.",
      },
      en: {
        title: "Gesture of Affection",
        description:
          "Make a practical gesture that says 'I care for you' today. Offer a 10-minute back massage to relieve your partner's physical stress.",
      },
      es: {
        title: "Gesto de Cariño",
        description:
          "Haz un gesto práctico que diga 'yo cuido de ti' hoy. Ofrece un masaje en la espalda durante 10 minutos para aliviar el estrés físico de tu pareja.",
      },
      fr: {
        title: "Geste de Bienveillance",
        description:
          "Faites aujourd'hui un geste concret qui exprime 'je prends soin de toi'. Proposez un massage de 10 minutes (le dos) pour apaiser le stress physique de votre conjoint.",
      },
      de: {
        title: "Geste der Fürsorge",
        description:
          "Machen Sie heute eine praktische Geste, die sagt: 'Ich sorge für dich'. Bieten Sie eine 10-minütige Rückenmassage an, um den körperlichen Stress Ihres Partners abzubauen.",
      },
      ja: {
        title: "思いやりのしぐさのチャレンジ",
        description:
          "今日、「あなたを大切に思っているよ」と伝える実用的なしぐさを行ってください。パートナーの身体的ストレスを和らげるために、10分間の背中のマッサージを提案してみましょう。",
      },
    },
  },
  {
    task_id: "mod9_task3_sente_prazer",
    module_id: 9,
    cost_level: "medium_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 14",
    translations: {
      pt: {
        title: "Tempo de Qualidade",
        description:
          "Negligencie propositadamente uma atividade secundária hoje para passar tempo de qualidade ininterrupto com seu cônjuge. Apenas estejam juntos conversando e rindo por no mínimo 30 minutos.",
      },
      en: {
        title: "Quality Time",
        description:
          "Purposely neglect a secondary activity today to spend uninterrupted quality time with your spouse. Just be together, talking and laughing for at least 30 minutes.",
      },
      es: {
        title: "Tiempo de Calidad",
        description:
          "Descuida intencionalmente una actividad secundaria hoy para pasar tiempo de calidad ininterrumpido con tu cónyuge. Simplemente estad juntos, hablando y riendo durante al menos 30 minutos.",
      },
      fr: {
        title: "Temps de Qualité",
        description:
          "Délaissez volontairement une activité secondaire aujourd'hui pour passer un moment de qualité ininterrompu avec votre conjoint. Restez simplement ensemble, à discuter et rire pendant au moins 30 minutes.",
      },
      de: {
        title: "Wertvolle Zeit",
        description:
          "Vernachlässigen Sie heute bewusst eine Nebentätigkeit, um ungestörte, wertvolle Zeit mit Ihrem Ehepartner zu verbringen. Seien Sie einfach mindestens 30 Minuten lang zusammen, reden und lachen Sie.",
      },
      ja: {
        title: "クオリティタイムのチャレンジ",
        description:
          "今日、意図的に重要度の低い活動を後回しにして、配偶者と邪魔されない充実した時間を過ごしてください。少なくとも30分間、ただ一緒にいて話し、笑い合いましょう。",
      },
    },
  },
  {
    task_id: "mod9_task4_trazer_intimidade",
    module_id: 9,
    cost_level: "medium_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 17",
    translations: {
      pt: {
        title: "Segurança na Intimidade",
        description:
          "Crie um ambiente em que seu cônjuge se sinta seguro e livre para expor suas vulnerabilidades. Guarde rigorosamente seus segredos e ouça suas lutas com aceitação absoluta.",
      },
      en: {
        title: "Intimacy Security",
        description:
          "Create an environment where your spouse feels safe and free to reveal their vulnerabilities. Strictly guard their secrets and listen to their struggles with absolute acceptance.",
      },
      es: {
        title: "Seguridad en la Intimidad",
        description:
          "Crea un entorno en el que tu cónyuge se sienta seguro y libre para exponer sus vulnerabilidades. Guarda estrictamente sus secretos y escucha sus luchas con absoluta aceptación.",
      },
      fr: {
        title: "Sécurité de l'Intimité",
        description:
          "Créez un environnement où votre conjoint se sent en sécurité et libre d'exposer ses vulnérabilités. Gardez rigoureusement ses secrets et écoutez ses difficultés avec une acceptation absolue.",
      },
      de: {
        title: "Sicherheit der Intimität",
        description:
          "Schaffen Sie eine Umgebung, in der sich Ihr Ehepartner sicher und frei fühlt, seine Schwachstellen zu offenbaren. Hüten Sie seine Geheimnisse streng und hören Sie seinen Kämpfen mit absoluter Akzeptanz zu.",
      },
      ja: {
        title: "親密さの安全保障のチャレンジ",
        description:
          "配偶者が安心して自由に自分の弱さを表現できる環境を作ってください。相手の秘密を厳格に守り、その葛藤を完全に受け入れる姿勢で耳を傾けましょう。",
      },
    },
  },
  {
    task_id: "mod9_task5_amor_fiel",
    module_id: 9,
    cost_level: "high_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 22",
    translations: {
      pt: {
        title: "Fidelidade Absoluta",
        description:
          "Combata ativamente quaisquer 'parasitas' ou desvios visuais externos que ameacem a exclusividade do leito conjugal. Reafirme no seu coração que seus olhos e afeto pertencem unicamente ao seu parceiro.",
      },
      en: {
        title: "Absolute Fidelity",
        description:
          "Actively fight any 'parasites' or external visual distractions threatening the exclusivity of the marriage bed. Reaffirm in your heart that your eyes and affection belong solely to your partner.",
      },
      es: {
        title: "Fidelidad Absoluta",
        description:
          "Combate activamente cualquier 'parásito' o distracción visual externa que amenace la exclusividad del lecho conyugal. Reafirma en tu corazón que tus ojos y tu afecto pertenecen únicamente a tu pareja.",
      },
      fr: {
        title: "Fidélité Absolue",
        description:
          "Luttez activement contre tout 'parasite' ou distraction visuelle extérieure qui menace l'exclusivité de la relation de couple. Réaffirmez dans votre cœur que votre regard et votre affection appartiennent uniquement à votre conjoint.",
      },
      de: {
        title: "Absolute Treue",
        description:
          "Bekämpfen Sie aktiv alle 'Parasiten' oder äußeren visuellen Ablenkungen, die die Exklusivität des Ehebettes bedrohen. Bekräftigen Sie in Ihrem Herzen, dass Ihre Augen und Ihre Zuneigung einzig Ihrem Partner gehören.",
      },
      ja: {
        title: "絶対的な忠実のチャレンジ",
        description:
          "夫婦の寝室の排他性を脅かすような、いかなる外部の視覚的な誘惑や妨げに対しても能動的に対処してください。自分の目と愛情が、パートナーだけに向けられていることを心の中で再確認してください。",
      },
    },
  },
  {
    task_id: "mod9_task6_satisfaz_necessidades",
    module_id: 9,
    cost_level: "high_cost",
    importance_weight: 10.0,
    source: "Desafio de Amar - Dia 32",
    translations: {
      pt: {
        title: "Conexão Íntima",
        description:
          "Hoje, busque o seu parceiro para um momento de romance e conexão sexual. Faça isso focando estritamente em agradá-lo e atender às necessidades de afeto dele, conservando puro o leito conjugal.",
      },
      en: {
        title: "Intimate Connection",
        description:
          "Today, initiate a moment of romance and sexual connection with your partner. Do so with a strict focus on pleasing them and meeting their needs for affection, keeping the marriage bed pure.",
      },
      es: {
        title: "Conexión Íntima",
        description:
          "Hoy, busca a tu pareja para un momento de romance y conexión sexual. Hazlo enfocándote estrictamente en complacerlo/la y atender sus necesidades de afecto, conservando puro el leito conyugal.",
      },
      fr: {
        title: "Connexion Intime",
        description:
          "Aujourd'hui, initiez un moment de romance et de connexion sexuelle avec votre conjoint. Faites-le en vous concentrant uniquement sur son plaisir et sur la satisfaction de ses besoins d'affection, en préservant la pureté de votre union.",
      },
      de: {
        title: "Intime Verbindung",
        description:
          "Suchen Sie heute die Nähe Ihres Partners für einen Moment der Romantik und sexuellen Verbundenheit. Konzentrieren Sie sich dabei ganz darauf, ihm eine Freude zu machen und sein Bedürfnis nach Zuneigung zu erfüllen, um das Ehebett rein zu halten.",
      },
      ja: {
        title: "親密な結びつきのチャレンジ",
        description:
          "今日、パートナーとのロマンスと性的な結びつきの時間を進んで作ってください。純粋に関わりを保ち、相手を喜ばせ、その愛情へのニーズを満たすことに焦点を当てて行いましょう。",
      },
    },
  },
  {
    task_id: "mod3_task8_jesus_amor",
    module_id: 3,
    cost_level: "high_cost",
    importance_weight: 6.0,
    source: "Desafio de Amar - Dia 20",
    translations: {
      pt: {
        title: "A Fonte do Amor",
        description:
          "Hoje, medite no amor incondicional divino como a sua fonte de energia. Reconheça as suas fraquezas humanas e peça sabedoria e graça para continuar amando seu cônjuge, apesar das falhas.",
      },
      en: {
        title: "The Source of Love",
        description:
          "Today, meditate on divine unconditional love as your energy source. Acknowledge your human weaknesses and ask for wisdom and grace to continue loving your spouse despite flaws.",
      },
      es: {
        title: "La Fuente del Amor",
        description:
          "Hoy, medita en el amor incondicional divino como tu fuente de energía. Reconoce tus debilidades humanas y pide sabiduría y gracia para seguir amando a tu cónyuge, a pesar de las fallas.",
      },
      fr: {
        title: "La Source de l'Amour",
        description:
          "Aujourd'hui, méditez sur l'amour inconditionnel divin comme source d'énergie. Reconnaissez vos faiblesses humaines et demandez de la sagesse et de la grâce pour continuer à aimer votre conjoint en dépit de ses défauts.",
      },
      de: {
        title: "Die Quelle der Liebe",
        description:
          "Meditieren Sie heute über die bedingungslose göttliche Liebe als Ihre Energiequelle. Erkennen Sie Ihre menschlichen Schwächen an und bitten Sie um Weisheit und Gnade, Ihren Partner trotz seiner Fehler weiterhin zu lieben.",
      },
      ja: {
        title: "愛の源泉のチャレンジ",
        description:
          "今日、無条件の愛をエネルギー源として黙想してください。自らの人間的な弱さを認め、欠点があっても配偶者を愛し続けるための知恵と恵みを求めてください。",
      },
    },
  },
  {
    task_id: "mod9_task7_beijo_6s",
    module_id: 9,
    cost_level: "low_cost",
    importance_weight: 10.0,
    source: "Gottman (Micro-conex\u00f5es f\u00edsicas)",
    translations: {
      pt: {
        title: "O Beijo de 6 Segundos",
        description:
          "Ao se despedir ou reencontrar seu cônjuge hoje, dê-lhe um beijo na boca com duração mínima de 6 segundos. Esse beijo funciona como um antídoto físico para o estresse diário e reativa a intimidade.",
      },
      en: {
        title: "The 6-Second Kiss",
        description:
          "When parting or reuniting with your spouse today, give them a kiss on the mouth lasting at least 6 seconds. This kiss acts as a physical antidote to daily stress and reactivates intimacy.",
      },
      es: {
        title: "El Beso de 6 Segundos",
        description:
          "Al despedirse o reencontrarse con su cónyuge hoy, dele un beso en la boca con una duración mínima de 6 segundos. Este beso funciona como un antídoto físico para el estrés diario y reactiva la intimidad.",
      },
      fr: {
        title: "Le Baiser de 6 Secondes",
        description:
          "Aujourd'hui, au moment de partir ou de vous retrouver, donnez à votre conjoint un baiser d'au moins 6 secondes. Ce baiser agit comme un antidote physique au stress quotidien et ravive l'intimité.",
      },
      de: {
        title: "Der 6-Sekunden-Kuss",
        description:
          "Geben Sie Ihrem Ehepartner heute beim Abschied oder Wiedersehen einen Kuss auf den Mund, der mindestens 6 Sekunden dauert. Dieser Kuss wirkt als körperliches Gegenmittel zum täglichen Stress und reaktiviert die Intimität.",
      },
      ja: {
        title: "6秒間のキス",
        description:
          "今日、外出の際や帰宅の際に、配偶者と少なくとも6秒間持続するキスを交わしてください。このキスは、日常のストレスに対する身体的な特効薬となり、親密さを再活性化させます。",
      },
    },
  },
  {
    task_id: "mod5_task6_dialogo_semanal",
    module_id: 5,
    cost_level: "medium_cost",
    importance_weight: 6.0,
    source: "Gottman (Estado de Repara\u00e7\u00e3o)",
    translations: {
      pt: {
        title: "Diálogo de Reparação",
        description:
          "Se houver algum assunto pendente ou mal-entendido recente, chame seu parceiro para uma conversa pacífica hoje. Esforce-se para concordar em pelo menos um ponto levantado por ele.",
      },
      en: {
        title: "Repair Dialogue",
        description:
          "If there is any outstanding issue or recent misunderstanding, invite your partner for a peaceful conversation today. Strive to agree with at least one point raised by them.",
      },
      es: {
        title: "Diálogo de Reparación",
        description:
          "Si hay algún asunto pendiente o malentendido reciente, invite a su pareja a una conversación pacífica hoy. Esfuércese por estar de acuerdo con al menos un punto planteado por él/ella.",
      },
      fr: {
        title: "Dialogue de Réparation",
        description:
          "S'il y a un problème en suspens ou un malentendu récent, invitez votre conjoint à une discussion paisible aujourd'hui. Efforcez-vous d'être d'accord avec au moins un point soulevé par lui.",
      },
      de: {
        title: "Gespräch zur Klärung",
        description:
          "Wenn ein offenes Problem oder ein jüngstes Missverständnis vorliegt, laden Sie Ihren Partner heute zu einem friedlichen Gespräch ein. Bemühen Sie sich, mindestens einem von ihm vorgebrachten Punkt zuzustimmen.",
      },
      ja: {
        title: "修復のダイアログ",
        description:
          "未解決の問題や最近の誤解がある場合は、今日、配偶者を穏やかな話し合いに招待してください。相手が提示したポイントの少なくとも一つに同意するよう努めてください。",
      },
    },
  },
];

async function seedDatabase() {
  console.log("Iniciando a carga de todas as tarefas no Firestore...");
  let count = 0;

  for (const task of tasks) {
    try {
      await db.collection("tasks").doc(task.task_id).set(task);
      count++;
      console.log(
        `[${count}/${tasks.length}] Tarefa '${task.task_id}' inserida com sucesso.`,
      );
    } catch (error) {
      console.error(`Erro ao inserir tarefa '${task.task_id}':`, error);
    }
  }

  console.log(
    `Carga finalizada! ${count} tarefas inseridas com sucesso no Firebase.`,
  );
  process.exit(0);
}

seedDatabase();
