export interface GiftDefinition {
  id: string;
  icon: string;
  translations: {
    [key: string]: string; // pt-BR, pt-PT, en, es, fr, de, ja
  };
}

export const GIFTS_DATABASE: GiftDefinition[] = [
  {
    id: "gift_coffee_bed",
    icon: "coffee",
    translations: {
      "pt-BR": "Café da manhã simples servido na cama",
      "pt-PT": "Pequeno-almoço simples servido na cama",
      en: "Simple breakfast served in bed",
      es: "Desayuno sencillo servido en la cama",
      fr: "Petit-déjeuner simple servi au lit",
      de: "Einfaches Frühstück im Bett serviert",
      ja: "ベッドで楽しむ簡単な朝食",
    },
  },
  {
    id: "gift_massage_back",
    icon: "hands",
    translations: {
      "pt-BR": "15 minutos de massagem relaxante nos ombros/costas",
      "pt-PT": "15 minutos de massagem relaxante nos ombros/costas",
      en: "15-minute relaxing shoulder/back massage",
      es: "15 minutos de masaje relajante en hombros/espalda",
      fr: "15 minutes de massage relaxant des épaules/dos",
      de: "15 Minuten entspannende Schulter-/Rückenmassage",
      ja: "15分間の肩・背中リラックスマッサージ",
    },
  },
  {
    id: "gift_massage_feet",
    icon: "shoe-prints",
    translations: {
      "pt-BR": "Massagem relaxante nos pés após um dia cansativo",
      "pt-PT": "Massagem relaxante nos pés após um dia cansativo",
      en: "Relaxing foot massage after a long day",
      es: "Masaje relajante de pies tras un día cansado",
      fr: "Massage relaxant des pieds après une longue journée",
      de: "Entspannende Fußmassage nach einem langen Tag",
      ja: "一日の終わりのリラックス足マッサージ",
    },
  },
  {
    id: "gift_hair_carica",
    icon: "smile-beam",
    translations: {
      "pt-BR": "15 minutos de cafuné e carinho no cabelo",
      "pt-PT": "15 minutos de carinho no cabelo",
      en: "15 minutes of gentle hair stroking and head scratches",
      es: "15 minutos de caricias en el cabello",
      fr: "15 minutes de caresses gentilles dans les cheveux",
      de: "15 Minuten sanftes Haarekraulen",
      ja: "15分間のやさしい頭ぽんぽん・ヘアケア",
    },
  },
  {
    id: "gift_movie_night",
    icon: "film",
    translations: {
      "pt-BR": "Sessão de filme/série com celular 100% desligado",
      "pt-PT": "Sessão de filme/série com telemóvel 100% desligado",
      en: "Movie/show session with phones 100% turned off",
      es: "Noche de película/serie con móvil 100% apagado",
      fr: "Soirée film/série avec téléphone 100% éteint",
      de: "Film-/Serienabend mit 100% ausgeschaltetem Handy",
      ja: "スマホを完全にオフにした映画・ドラマ観賞",
    },
  },
  {
    id: "gift_choose_menu",
    icon: "utensils",
    translations: {
      "pt-BR": "Escolher o menu ou o sabor da refeição do dia",
      "pt-PT": "Escolher o menu ou o sabor da refeição do dia",
      en: "Pick today's meal menu or pizza flavor",
      es: "Elegir el menú o el sabor de la comida del día",
      fr: "Choisir le menu ou la saveur du repas du jour",
      de: "Das Menü oder den Geschmack des Tagesgerichts wählen",
      ja: "今日の食事のメニューやピザの味を選ぶ権利",
    },
  },
  {
    id: "gift_chores_truce",
    icon: "broom",
    translations: {
      "pt-BR": "Trégua de 1 dia em uma tarefa doméstica chata",
      "pt-PT": "Trégua de 1 dia numa tarefa doméstica chata",
      en: "1-day pass from an annoying household chore",
      es: "Pase de 1 día para saltarse una tarea doméstica molesta",
      fr: "Pass d'un jour pour éviter une corvée ménagère",
      de: "1 Tag Befreiung von einer lästigen Hausarbeit",
      ja: "面倒な家事を1日免除されるチケット",
    },
  },
  {
    id: "gift_ice_cream",
    icon: "ice-cream",
    translations: {
      "pt-BR": "Sair para tomar um sorvete à noite no meio da semana",
      "pt-PT": "Sair para tomar um gelado à noite a meio da semana",
      en: "Late-night ice cream run in the middle of the week",
      es: "Salir a tomar un helado por la noche entre semana",
      fr: "Sortir prendre une glace le soir en milieu de semaine",
      de: "Spät abends unter der Woche ein Eis essen gehen",
      ja: "平日の夜にアイスクリームを食べに行く",
    },
  },
  {
    id: "gift_pick_flower",
    icon: "spa",
    translations: {
      "pt-BR": "Ganhar uma flor colhida com carinho durante o dia",
      "pt-PT": "Receber uma flor colhida com carinho durante o dia",
      en: "Receive a handpicked flower during the day",
      es: "Recibir una flor recogida con cariño durante el día",
      fr: "Recevoir une fleur cueillie avec amour dans la journée",
      de: "Eine liebevoll gepflückte Blume am Tag schenken bekommen",
      ja: "日中に心を込めて摘んだ一輪のお花をもらう",
    },
  },
  {
    id: "gift_movie_kiss",
    icon: "kiss-wink-heart",
    translations: {
      "pt-BR": "Um beijo de cinema de 30 segundos sem pressa",
      "pt-PT": "Um beijo de cinema de 30 segundos sem pressa",
      en: "A slow, 30-second passionate kiss",
      es: "Un beso de película de 30 segundos sin prisa",
      fr: "Un baiser passionné de 30 secondes sans se presser",
      de: "Ein leidenschaftlicher, 30-sekündiger Kuss ohne Eile",
      ja: "急がずに味わう30秒間の映画のようなキス",
    },
  },
  {
    id: "gift_alone_night",
    icon: "moon",
    translations: {
      "pt-BR": "Uma noite a sós só para conversar e relaxar sem distrações",
      "pt-PT": "Uma noite a sós só para conversar e relaxar sem distrações",
      en: "An evening alone together just to talk and unwind with no distractions",
      es: "Una noche a solas solo para hablar y relajarse sin distracciones",
      fr: "Une soirée à deux juste para parler et se détendre sans distractions",
      de: "Ein Abend zu zweit, nur zum Reden und Entspannen ohne Ablenkung",
      ja: "邪魔が入らない2人だけのリラックス談笑タイム",
    },
  },
  {
    id: "gift_walk_together",
    icon: "walking",
    translations: {
      "pt-BR": "Caminhada ou passeio de 20 minutos a sós",
      "pt-PT": "Caminhada ou passeio de 20 minutos a sós",
      en: "A 20-minute quiet walk together",
      es: "Un paseo tranquilo de 20 minutos a solas",
      fr: "Une promenade tranquille de 20 minutes à deux",
      de: "Ein ruhiger 20-minütiger Spaziergang zu zweit",
      ja: "2人きりで楽しむ20分間の静かなお散歩",
    },
  },
  {
    id: "gift_love_note",
    icon: "sticky-note",
    translations: {
      "pt-BR": "Bilhete romântico escondido na bolsa/carteira",
      "pt-PT": "Bilhete romântico escondido na mala/carteira",
      en: "A hidden love note inside your bag or wallet",
      es: "Una nota de amor oculta en tu bolso o cartera",
      fr: "Un mot d'amour caché dans ton sac ou portefeuille",
      de: "Eine versteckte Liebesbotschaft in Handtasche oder Geldbörse",
      ja: "バッグや財布にこっそり隠されたラブレター",
    },
  },
  {
    id: "gift_playlist",
    icon: "music",
    translations: {
      "pt-BR": "Playlist com 10 músicas da nossa história",
      "pt-PT": "Playlist com 10 músicas da nossa história",
      en: "A 10-song custom playlist of our relationship journey",
      es: "Una lista con 10 canciones que cuentan nuestra historia",
      fr: "Une playlist de 10 chansons qui racontent notre histoire",
      de: "Eine Playlist mit 10 Songs unserer Beziehungsgeschichte",
      ja: "二人の思い出の曲10曲を集めたプレイリスト",
    },
  },
  {
    id: "gift_foot_bath",
    icon: "bath",
    translations: {
      "pt-BR": "Momento relaxante com escalda-pés em água morna",
      "pt-PT": "Momento relaxante com escalda-pés em água morna",
      en: "A relaxing warm water foot soak",
      es: "Un baño de pies relajante en agua templada",
      fr: "Un bain de pieds relaxant à l'eau chaude",
      de: "Ein entspannendes warmes Fußbad",
      ja: "足湯でほっこりリラックスタイム",
    },
  },
  {
    id: "gift_cozy_bedroom",
    icon: "bed",
    translations: {
      "pt-BR": "Preparar o quarto e ambiente para uma boa noite de sono",
      "pt-PT": "Preparar o quarto e ambiente para uma boa noite de sono",
      en: "Set up a cozy room environment for a perfect night's sleep",
      es: "Preparar la habitación y el ambiente para un sueño reparador",
      fr: "Préparer la chambre pour une nuit de sommeil parfaite",
      de: "Das Schlafzimmer für eine perfekte Nachtruhe vorbereiten",
      ja: "ぐっすり眠れるようにベッドルームを整える",
    },
  },
  {
    id: "gift_snack_surprise",
    icon: "cookie-bite",
    translations: {
      "pt-BR": "Preparar um lanche surpresa durante a tarde",
      "pt-PT": "Preparar um lanche surpresa durante a tarde",
      en: "Prepare a surprise afternoon snack",
      es: "Preparar una merienda sorpresa por la tarde",
      fr: "Préparer un goûter surprise dans l'après-midi",
      de: "Einen überraschenden Nachmittagssnack zubereiten",
      ja: "午後のサプライズおやつを用意する",
    },
  },
  {
    id: "gift_handwritten_letter",
    icon: "envelope-open-text",
    translations: {
      "pt-BR": "Carta escrita à mão destacando suas qualidades",
      "pt-PT": "Carta escrita à mão destacando as tuas qualidades",
      en: "A handwritten letter highlighting your best qualities",
      es: "Una carta escrita a mano destacando tus mejores cualidades",
      fr: "Une lettre manuscrite soulignant tes plus belles qualités",
      de: "Ein handgeschriebener Brief, der deine besten Eigenschaften hervorhebt",
      ja: "あなたの良いところを詰めた手書きの手紙",
    },
  },
  {
    id: "gift_picnic_livingroom",
    icon: "glass-cheers",
    translations: {
      "pt-BR": "Piquenique simples na sala de casa ou quintal",
      "pt-PT": "Piquenique simples na sala de casa ou quintal",
      en: "A simple living room or backyard picnic",
      es: "Un picnic sencillo en el salón o el jardín",
      fr: "Un pique-nique simple dans le salon ou le jardin",
      de: "Ein einfaches Picknick im Wohnzimmer oder Garten",
      ja: "リビングやお庭で楽しむお手軽ピクニック",
    },
  },
  {
    id: "gift_tidy_workspace",
    icon: "laptop",
    translations: {
      "pt-BR": "Arrumar ou limpar o cantinho de trabalho do outro",
      "pt-PT": "Arrumar ou limpar o espaço de trabalho do outro",
      en: "Clean and organize your partner's workspace",
      es: "Limpiar y ordenar el espacio de trabajo de tu pareja",
      fr: "Nettoyer et ranger l'espace de travail de ton partenaire",
      de: "Den Arbeitsplatz des Partners aufräumen und säubern",
      ja: "パートナーの作業スペースをきれいに掃除・整理整頓する",
    },
  },
  {
    id: "gift_popcorn_drink",
    icon: "glass-whiskey",
    translations: {
      "pt-BR": "Pipoca e bebida preparada para o nosso momento relax",
      "pt-PT": "Pipoca e bebida preparada para o nosso momento relax",
      en: "Popcorn and your favorite drink prepared for relax time",
      es: "Palomitas y tu bebida favorita preparada para relajarse",
      fr: "Popcorn et boisson préparés pour notre moment détente",
      de: "Popcorn und dein Lieblingsgetränk für die Entspannungszeit",
      ja: "リラックスタイムのためのポップコーンとお気に入りのドリンク",
    },
  },
  {
    id: "gift_favorite_dessert",
    icon: "birthday-cake",
    translations: {
      "pt-BR": "Preparar ou trazer a sobremesa/doce favorita",
      "pt-PT": "Preparar ou trazer a sobremesa/doce favorita",
      en: "Bring or bake your absolute favorite dessert",
      es: "Traer o preparar tu postre favorito",
      fr: "Apporter ou cuisiner ton dessert préféré",
      de: "Dein absolutes Lieblingsdessert mitbringen oder backen",
      ja: "大好物のデザートを買ってくる・作ってあげる",
    },
  },
  {
    id: "gift_candle_dinner",
    icon: "heart",
    translations: {
      "pt-BR": "Jantar simples à luz de velas em casa",
      "pt-PT": "Jantar simples à luz de velas em casa",
      en: "A simple romantic candlelit dinner at home",
      es: "Una cena sencilla a la luz de las velas en casa",
      fr: "Un dîner simple aux chandelles à la maison",
      de: "Ein einfaches romantisches Abendessen bei Kerzenschein zu Hause",
      ja: "おうちで楽しむキャンドルライトのシンプルディナー",
    },
  },
  {
    id: "gift_royalty_hour",
    icon: "crown",
    translations: {
      "pt-BR": "1 hora de rei/rainha com vontades simples atendidas",
      "pt-PT": "1 hora de rei/rainha com vontades simples atendidas",
      en: "1 hour of royal treatment (simple wishes granted)",
      es: "1 hora de tratamiento de rey/reina (deseos sencillos cumplidos)",
      fr: "1 heure de traitement royal (petits souhaits exaucés)",
      de: "1 Stunde königliche Behandlung (einfache Wünsche werden erfüllt)",
      ja: "わがままが叶う1時間のお姫様・王子様タイム",
    },
  },
  {
    id: "gift_cute_photo",
    icon: "camera",
    translations: {
      "pt-BR": "Tirar uma foto bonita juntos para guardar de recordação",
      "pt-PT": "Tirar uma foto bonita juntos para guardar de recordação",
      en: "Take a cute photo together for our memory collection",
      es: "Tomar una foto bonita juntos para recordar",
      fr: "Prendre une jolie photo ensemble pour nos souvenirs",
      de: "Ein schönes Foto zusammen für unsere Erinnerungen machen",
      ja: "思い出に残る可愛い2ショット写真を撮る",
    },
  },
  {
    id: "gift_long_hug",
    icon: "user-friends",
    translations: {
      "pt-BR": "Um abraço apertado de 1 minuto em silêncio no meio do dia",
      "pt-PT": "Um abraço apertado de 1 minuto em silêncio no meio do dia",
      en: "A quiet, warm 1-minute bear hug in the middle of the day",
      es: "Un abrazo fuerte de 1 minuto en silencio a mitad del día",
      fr: "Un câlin chaleureux d'une minute en silence au milieu de la journée",
      de: "Eine stille, warme 1-minütige Umarmung mitten am Tag",
      ja: "日中にぎゅっと抱きしめ合う1分間の静かなハグ",
    },
  },
];

// Helper para buscar o texto traduzido conforme a chave do presente e o idioma do usuário
export function getGiftTitle(giftId: string, lang = "pt-BR"): string {
  const item = GIFTS_DATABASE.find((g) => g.id === giftId);
  if (!item) return giftId; // Fallback se for texto direto antigo
  return item.translations[lang] || item.translations["pt-BR"] || giftId;
}

export function getGiftIcon(giftId: string): string {
  const item = GIFTS_DATABASE.find((g) => g.id === giftId);
  return item?.icon || "gift";
}
