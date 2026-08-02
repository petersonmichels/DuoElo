import { FontAwesome5 } from "@expo/vector-icons";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../config/firebase";

const { width, height } = Dimensions.get("window");

const questionsBank = [
  {
    id: "com_1",
    title: "Comunicação",
    text: "Quando vocês discordam sobre algo importante, como a conversa costuma terminar?",
    options: [
      {
        label: "Chegamos a um acordo calmos",
        score: 10,
        tag: "comunicacao_saudavel",
        icon: "smile-beam",
        color: "#4BDE95",
      },
      {
        label: "Um cede para evitar brigas",
        score: 6,
        tag: "comunicacao_passiva",
        icon: "meh",
        color: "#FFC800",
      },
      {
        label: "Com gritos ou ofensas",
        score: 2,
        tag: "agressividade_verbal",
        icon: "angry",
        color: "#FF4B4B",
      },
      {
        label: "Com silêncio punitivo",
        score: 1,
        tag: "silencio_punitivo",
        icon: "sad-tear",
        color: "#FF4B4B",
      },
    ],
  },
  {
    id: "com_2",
    title: "Comunicação",
    text: "Você sente que seu parceiro(a) realmente escuta e valida seus sentimentos?",
    options: [
      {
        label: "Sempre, sou muito acolhido(a)",
        score: 10,
        tag: "escuta_ativa_ok",
        icon: "grin-hearts",
        color: "#4BDE95",
      },
      {
        label: "Às vezes, logo vira sobre ele(a)",
        score: 5,
        tag: "escuta_narcisista",
        icon: "frown",
        color: "#FF9600",
      },
      {
        label: "Quase nunca, falo com as paredes",
        score: 1,
        tag: "invalidacao_emocional",
        icon: "sad-cry",
        color: "#FF4B4B",
      },
    ],
  },
  {
    id: "int_1",
    title: "Intimidade",
    text: "Fora a relação sexual, como está o afeto no dia a dia (beijos, abraços)?",
    options: [
      {
        label: "Muito presente e natural",
        score: 10,
        tag: "toque_fisico_ok",
        icon: "smile",
        color: "#4BDE95",
      },
      {
        label: "Acontece, mas sinto falta de mais",
        score: 5,
        tag: "carencia_afetiva",
        icon: "meh",
        color: "#FFC800",
      },
      {
        label: "Praticamente inexistente",
        score: 1,
        tag: "distanciamento_fisico",
        icon: "sad-tear",
        color: "#FF4B4B",
      },
    ],
  },
  {
    id: "int_2",
    title: "Intimidade",
    text: "Como você avalia a vida sexual de vocês hoje?",
    options: [
      {
        label: "Ótima, ambos satisfeitos",
        score: 10,
        tag: "sexo_saudavel",
        icon: "fire",
        color: "#4BDE95",
      },
      {
        label: "Caiu na rotina, muito automático",
        score: 5,
        tag: "sexo_rotineiro",
        icon: "meh",
        color: "#FFC800",
      },
      {
        label: "Rara ou gera frustração",
        score: 1,
        tag: "desconexao_sexual",
        icon: "frown",
        color: "#FF4B4B",
      },
    ],
  },
  {
    id: "par_1",
    title: "Parceria",
    text: "Você sente que vocês jogam no mesmo time quando enfrentam os problemas do dia a dia?",
    options: [
      {
        label: "Sempre, somos uma equipe",
        score: 10,
        tag: "equipe_forte",
        icon: "grin-hearts",
        color: "#4BDE95",
      },
      {
        label: "Às vezes, dependendo do problema",
        score: 5,
        tag: "equipe_instavel",
        icon: "meh",
        color: "#FFC800",
      },
      {
        label: "Quase nunca, me sinto sozinho(a)",
        score: 1,
        tag: "solidao_a_dois",
        icon: "sad-tear",
        color: "#FF4B4B",
      },
    ],
  },
  {
    id: "conf_1",
    title: "Confiança",
    text: "Existe alguma ferida do passado (traição, mentiras) que ainda assombra a relação?",
    options: [
      {
        label: "Não, confiamos 100% um no outro",
        score: 10,
        tag: "confianca_plena",
        icon: "smile-beam",
        color: "#4BDE95",
      },
      {
        label: "Sim, mas estamos superando juntos",
        score: 6,
        tag: "ferida_em_cura",
        icon: "meh",
        color: "#FFC800",
      },
      {
        label: "Sim, gera brigas e desconfiança",
        score: 1,
        tag: "ferida_aberta",
        icon: "sad-tear",
        color: "#FF4B4B",
      },
    ],
  },
  {
    id: "conf_2",
    title: "Ciúmes",
    text: "Como o ciúme se manifesta no relacionamento de vocês?",
    options: [
      {
        label: "Controlado ou inexistente",
        score: 10,
        tag: "ciume_zero",
        icon: "smile",
        color: "#4BDE95",
      },
      {
        label: "Às vezes estressa, mas conversamos",
        score: 5,
        tag: "ciume_controlado",
        icon: "frown",
        color: "#FF9600",
      },
      {
        label: "Constante e gerador de brigas",
        score: 1,
        tag: "ciume_toxico",
        icon: "angry",
        color: "#FF4B4B",
      },
    ],
  },
  {
    id: "fin_1",
    title: "Finanças",
    text: "Como vocês lidam com o dinheiro da casa?",
    options: [
      {
        label: "Transparência total",
        score: 10,
        tag: "financas_alinhadas",
        icon: "smile-beam",
        color: "#4BDE95",
      },
      {
        label: "Separado, falamos pouco sobre",
        score: 6,
        tag: "financas_isoladas",
        icon: "meh",
        color: "#FFC800",
      },
      {
        label: "É o maior motivo das nossas brigas",
        score: 1,
        tag: "estresse_financeiro",
        icon: "sad-cry",
        color: "#FF4B4B",
      },
    ],
  },
  {
    id: "res_1",
    title: "Resolução de Conflitos",
    text: "Depois de uma discussão, como vocês fazem as pazes?",
    options: [
      {
        label: "Conversamos e pedimos desculpas",
        score: 10,
        tag: "reparacao_saudavel",
        icon: "smile-beam",
        color: "#4BDE95",
      },
      {
        label: "Fingimos que nada aconteceu",
        score: 4,
        tag: "varrer_pro_tapete",
        icon: "meh",
        color: "#FFC800",
      },
      {
        label: "Acumulamos muito ressentimento",
        score: 1,
        tag: "acumulo_ressentimento",
        icon: "sad-tear",
        color: "#FF4B4B",
      },
    ],
  },
  {
    id: "adm_1",
    title: "Admiração",
    text: "Com que frequência você elogia seu parceiro(a) ou se sente genuinamente admirado(a)?",
    options: [
      {
        label: "Frequentemente",
        score: 10,
        tag: "admiracao_alta",
        icon: "grin-hearts",
        color: "#4BDE95",
      },
      {
        label: "Às vezes",
        score: 5,
        tag: "admiracao_media",
        icon: "meh",
        color: "#FFC800",
      },
      {
        label: "Raramente",
        score: 1,
        tag: "admiracao_baixa",
        icon: "sad-cry",
        color: "#FF4B4B",
      },
    ],
  },
  {
    id: "tar_1",
    title: "Tarefas Domésticas",
    text: "A divisão do trabalho em casa parece justa para os dois?",
    options: [
      {
        label: "Sim, somos uma equipe",
        score: 10,
        tag: "equipe_domestica",
        icon: "smile-beam",
        color: "#4BDE95",
      },
      {
        label: "Mais ou menos, há sobrecarga leve",
        score: 5,
        tag: "sobrecarga_leve",
        icon: "frown",
        color: "#FF9600",
      },
      {
        label: "Não, extrema sobrecarga",
        score: 1,
        tag: "sobrecarga_extrema",
        icon: "angry",
        color: "#FF4B4B",
      },
    ],
  },
  {
    id: "laz_1",
    title: "Lazer e Rotina",
    text: "Com que frequência vocês saem para um encontro só os dois?",
    options: [
      {
        label: "Sempre separamos tempo",
        score: 10,
        tag: "tempo_qualidade_ok",
        icon: "smile",
        color: "#4BDE95",
      },
      {
        label: "Raramente, a rotina nos engoliu",
        score: 4,
        tag: "rotina_massiva",
        icon: "frown",
        color: "#FF9600",
      },
      {
        label: "Nunca",
        score: 1,
        tag: "sindrome_colegas",
        icon: "sad-tear",
        color: "#FF4B4B",
      },
    ],
  },
  {
    id: "fam_1",
    title: "Família e Sogros",
    text: "A família de origem (pais/sogros) interfere na relação?",
    options: [
      {
        label: "Não, temos limites saudáveis",
        score: 10,
        tag: "limites_familiares_ok",
        icon: "smile-beam",
        color: "#4BDE95",
      },
      {
        label: "Às vezes rola um estresse",
        score: 6,
        tag: "friccao_familiar",
        icon: "meh",
        color: "#FFC800",
      },
      {
        label: "Sim, causam muitas brigas",
        score: 1,
        tag: "interferencia_toxica",
        icon: "angry",
        color: "#FF4B4B",
      },
    ],
  },
  {
    id: "esp_1",
    title: "Alinhamento de Vida",
    text: "Vocês compartilham os mesmos valores e visão de futuro?",
    options: [
      {
        label: "Sim, estamos na mesma direção",
        score: 10,
        tag: "valores_alinhados",
        icon: "smile-beam",
        color: "#4BDE95",
      },
      {
        label: "Temos algumas divergências",
        score: 5,
        tag: "divergencia_futuro",
        icon: "meh",
        color: "#FFC800",
      },
      {
        label: "Queremos coisas muito diferentes",
        score: 1,
        tag: "crise_de_proposito",
        icon: "sad-tear",
        color: "#FF4B4B",
      },
    ],
  },
];

export default function AnamnesisScreen({ navigation }: any) {
  const [screenState, setScreenState] = useState<
    "intro" | "questions" | "calculating" | "result"
  >("intro");
  const [currentIndex, setCurrentIndex] = useState(0);

  const [score, setScore] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<any[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const [isPremium, setIsPremium] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Iniciando varredura...");

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const thermometerFill = useRef(new Animated.Value(0)).current;
  const loadingProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchPremiumStatus = async () => {
      const userId = auth.currentUser?.uid;
      if (userId) {
        try {
          const snap = await getDoc(doc(db, "users", userId));
          if (snap.exists() && snap.data().isPremium) {
            setIsPremium(true);
          }
        } catch (e) {
          console.log("Erro ao checar status Premium:", e);
        }
      }
    };
    fetchPremiumStatus();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const handleStart = () => setScreenState("questions");

  // 🔥 LÓGICA DE NAVEGAÇÃO ENTRE PERGUNTAS (VAI E VEM)
  const handleBack = () => {
    if (currentIndex > 0) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setCurrentIndex(currentIndex - 1);
        slideAnim.setValue(-30);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: false,
          }),
        ]).start();
      });
    }
  };

  const handleForward = () => {
    // Só deixa avançar se a pergunta atual JÁ estiver respondida no array
    if (
      currentIndex < selectedAnswers.length &&
      currentIndex < questionsBank.length - 1
    ) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setCurrentIndex(currentIndex + 1);
        slideAnim.setValue(30);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: false,
          }),
        ]).start();
      });
    }
  };

  const handleAnswer = (option: any) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      const newAnswers = [...selectedAnswers];
      // Grava a resposta exata na posição atual
      newAnswers[currentIndex] = {
        questionId: questionsBank[currentIndex].id,
        pillar: questionsBank[currentIndex].title,
        score: option.score,
        tag: option.tag,
        label: option.label, // Salva a label para podermos pintar o botão de roxo depois!
      };

      setSelectedAnswers(newAnswers);

      if (currentIndex < questionsBank.length - 1) {
        setCurrentIndex(currentIndex + 1);
        slideAnim.setValue(50);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: false,
          }),
        ]).start();
      } else {
        startCalculation(newAnswers);
      }
    });
  };

  const startCalculation = (finalAnswers: any[]) => {
    setScreenState("calculating");
    loadingProgress.setValue(0);

    // 🔥 PONTUAÇÃO DINÂMICA: Soma o score de todas as respostas guardadas sem duplicar!
    const totalScore = finalAnswers.reduce(
      (acc, curr) => acc + (curr?.score || 0),
      0,
    );
    setScore(totalScore);

    setLoadingMsg("Decodificando os pilares da sua relação...");

    Animated.timing(loadingProgress, {
      toValue: 100,
      duration: 4000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    setTimeout(
      () => setLoadingMsg("Analisando padrões de comportamento..."),
      1200,
    );
    setTimeout(
      () => setLoadingMsg("Gerando o resultado do seu diagnóstico..."),
      2200,
    );
    setTimeout(
      () => setLoadingMsg("Desenhando a sua jornada de resgate..."),
      3200,
    );

    setTimeout(() => {
      setScreenState("result");
      animateThermometer(totalScore);
    }, 4200);
  };

  const animateThermometer = (finalScore: number) => {
    const maxScore = questionsBank.length * 10;
    const calcScore = finalScore + (finalScore === 0 ? 1 : 0);
    const percentage = (calcScore / maxScore) * 100;

    Animated.timing(thermometerFill, {
      toValue: percentage,
      duration: 2000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const saveAssessmentToFirebase = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return false;

    try {
      const pillarStats: Record<
        string,
        { totalScore: number; maxScore: number }
      > = {};
      const diagnosticTags: string[] = [];

      selectedAnswers.forEach((ans) => {
        if (!pillarStats[ans.pillar]) {
          pillarStats[ans.pillar] = { totalScore: 0, maxScore: 0 };
        }
        pillarStats[ans.pillar].totalScore += ans.score;
        pillarStats[ans.pillar].maxScore += 10;

        if (ans.score <= 6) {
          diagnosticTags.push(ans.tag);
        }
      });

      const calculatedPillars = Object.keys(pillarStats).map((pillarName) => {
        const stats = pillarStats[pillarName];
        const healthPercent = Math.round(
          (stats.totalScore / stats.maxScore) * 100,
        );
        return { name: pillarName, health: healthPercent };
      });

      calculatedPillars.sort((a, b) => a.health - b.health);
      const priorityModules = calculatedPillars.slice(0, 3).map((p) => p.name);

      await setDoc(
        doc(db, "users", userId),
        {
          hasCompletedAnamnesis: true,
          anamnesisScore: score,
          priorityModules: priorityModules,
          diagnosticTags: diagnosticTags,
          anamnesisScores: calculatedPillars,
          anamnesisCompletedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      return true;
    } catch (error) {
      console.error("Erro ao salvar avaliação:", error);
      return false;
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    await saveAssessmentToFirebase();
    setIsSaving(false);

    if (isPremium) {
      navigation.navigate("Home");
    } else {
      navigation.navigate("Paywall");
    }
  };

  const handleSaveAndSkip = async () => {
    setIsSkipping(true);
    await saveAssessmentToFirebase();
    setIsSkipping(false);
    navigation.navigate("Home");
  };

  const renderIntro = () => (
    <View style={styles.centerContainer}>
      <Animated.View
        style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}
      >
        <FontAwesome5 name="heartbeat" size={70} color="#FF7EB3" />
      </Animated.View>
      <Text style={styles.introTitle}>
        Descubra a Temperatura da sua Relação
      </Text>
      <Text style={styles.introText}>
        Responda com sinceridade. Não existe certo ou errado, apenas o ponto de
        partida para a melhor fase da vida a dois.
      </Text>
      <TouchableOpacity
        style={styles.primaryBtn}
        activeOpacity={0.8}
        onPress={handleStart}
      >
        <Text style={styles.primaryBtnText}>Iniciar Avaliação</Text>
        <FontAwesome5 name="arrow-right" size={18} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  const renderQuestions = () => {
    const question = questionsBank[currentIndex];
    const progress = ((currentIndex + 1) / questionsBank.length) * 100;

    // 🔥 Puxamos o que ele já respondeu para essa pergunta (se existir)
    const currentAnswer = selectedAnswers[currentIndex];
    const canGoForward = currentIndex < selectedAnswers.length;

    return (
      <View style={styles.questionContainer}>
        {/* 🔥 MENU DE NAVEGAÇÃO DE VAI E VEM */}
        <View style={styles.navHeader}>
          <TouchableOpacity
            onPress={handleBack}
            disabled={currentIndex === 0}
            style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          >
            <FontAwesome5
              name="chevron-left"
              size={18}
              color={currentIndex === 0 ? "#E5E5E5" : "#CE82FF"}
            />
          </TouchableOpacity>

          <View style={{ flex: 1, paddingHorizontal: 15 }}>
            <View style={styles.progressBarBg}>
              <Animated.View
                style={[styles.progressBarFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              Passo {currentIndex + 1} de {questionsBank.length}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleForward}
            disabled={!canGoForward}
            style={[styles.navBtn, !canGoForward && styles.navBtnDisabled]}
          >
            <FontAwesome5
              name="chevron-right"
              size={18}
              color={!canGoForward ? "#E5E5E5" : "#CE82FF"}
            />
          </TouchableOpacity>
        </View>

        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View style={styles.questionHeader}>
            <Text style={styles.questionCategory}>{question.title}</Text>
            <Text style={styles.questionText}>{question.text}</Text>
          </View>

          <View style={styles.answersContainer}>
            {question.options.map((opt, i) => {
              // Verifica se a opção renderizada foi a que o usuário marcou antes!
              const isSelected =
                currentAnswer && currentAnswer.label === opt.label;

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.answerBtn,
                    isSelected && styles.answerBtnSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleAnswer(opt)}
                >
                  <View
                    style={[
                      styles.answerIconBg,
                      { backgroundColor: opt.color + "20" },
                    ]}
                  >
                    <FontAwesome5
                      name={opt.icon}
                      solid
                      size={24}
                      color={opt.color}
                    />
                  </View>
                  <Text
                    style={[
                      styles.answerBtnText,
                      isSelected && { color: "#CE82FF", fontWeight: "900" },
                    ]}
                  >
                    {opt.label}
                  </Text>

                  {/* Ícone de Check se estiver selecionada */}
                  {isSelected && (
                    <FontAwesome5
                      name="check-circle"
                      solid
                      size={20}
                      color="#CE82FF"
                      style={{ marginLeft: 10 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    );
  };

  const renderCalculating = () => {
    const barWidth = loadingProgress.interpolate({
      inputRange: [0, 100],
      outputRange: ["0%", "100%"],
    });

    return (
      <View style={styles.centerContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={styles.spinnerRing}>
            <FontAwesome5 name="brain" size={40} color="#CE82FF" />
          </View>
        </Animated.View>
        <Text style={styles.calcTitle}>Avaliando Conexão</Text>

        <View style={styles.loadingBarContainer}>
          <Animated.View style={[styles.loadingBarFill, { width: barWidth }]} />
        </View>

        <Text style={styles.loadingMessageText}>{loadingMsg}</Text>
      </View>
    );
  };

  const renderResult = () => {
    const maxScore = questionsBank.length * 10;
    const temperature = Math.round((score / maxScore) * 100);

    const riskPercentage = Math.max(10, 100 - temperature);

    let resultTitle = "";
    let resultDesc = "";
    let tempColor = "";

    if (temperature < 40) {
      resultTitle = "Sinal de Alerta ❄️";
      resultDesc =
        "A rotina esfriou o que vocês têm de mais precioso. Mas a boa notícia é que o amor ainda está aí, só precisa ser regado.";
      tempColor = "#4BACFF";
    } else if (temperature < 75) {
      resultTitle = "Morno, mas com Potencial 🌥️";
      resultDesc =
        "Vocês têm uma base sólida, mas caíram no modo automático. A jornada de 90 dias vai reacender essa chama.";
      tempColor = "#FF9600";
    } else {
      resultTitle = "Conexão Forte 🔥";
      resultDesc =
        "Incrível! Vocês têm uma sintonia rara. A jornada será perfeita para blindar essa relação contra qualquer crise.";
      tempColor = "#FF4B4B";
    }

    const fillHeight = thermometerFill.interpolate({
      inputRange: [0, 100],
      outputRange: ["0%", "100%"],
    });

    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultHeader}>Sua Temperatura:</Text>

        <View style={styles.thermometerWrapper}>
          <View style={styles.thermometerGlass}>
            <Animated.View
              style={[
                styles.thermometerLiquid,
                { height: fillHeight, backgroundColor: tempColor },
              ]}
            />
            <View style={[styles.thermometerMark, { bottom: "25%" }]} />
            <View style={[styles.thermometerMark, { bottom: "50%" }]} />
            <View style={[styles.thermometerMark, { bottom: "75%" }]} />
          </View>
          <View
            style={[styles.thermometerBulb, { backgroundColor: tempColor }]}
          />
        </View>

        <Text style={[styles.resultTitle, { color: tempColor }]}>
          {temperature}º - {resultTitle}
        </Text>
        <Text style={styles.resultText}>{resultDesc}</Text>

        <View style={[styles.riskBox, { borderLeftColor: tempColor }]}>
          <View style={styles.riskHeader}>
            <FontAwesome5 name="chart-line" size={16} color={tempColor} />
            <Text style={[styles.riskTitle, { color: tempColor }]}>
              Risco Estatístico: {riskPercentage}%
            </Text>
          </View>
          <Text style={styles.riskText}>
            Baseado em mais de 40 anos de análises e padrões clínicos de
            milhares de casais, o seu cenário atual apresenta{" "}
            <Text style={{ fontWeight: "bold" }}>
              {riskPercentage}% de risco de afastamento severo ou separação
            </Text>{" "}
            no longo prazo. O verdadeiro destruidor de relações não são as
            brigas isoladas, mas sim o silêncio, a perda da admiração e a
            desconexão emocional invisível.
          </Text>
        </View>

        <View style={styles.hopeBox}>
          <FontAwesome5 name="home" size={22} color="#CE82FF" />
          <Text style={styles.hopeText}>
            Com base no seu diagnóstico, criamos a{" "}
            <Text style={{ fontWeight: "bold", color: "#CE82FF" }}>
              Jornada de 90 Dias
            </Text>{" "}
            ideal para resgatar o seu relacionamento, reacender a paixão e
            blindar a sua família.
          </Text>
        </View>

        {isPremium ? (
          <View style={styles.impulseBuyBox}>
            <Text style={styles.impulseBuyPriceText}>
              Acesso Liberado{" "}
              <Text style={[styles.priceHighlight, { color: "#4BDE95" }]}>
                ✓
              </Text>
            </Text>
            <Text style={styles.impulseBuySubText}>
              Sua conta já está vinculada ao plano Premium do seu parceiro(a).
              Você já pode iniciar a jornada.
            </Text>

            <TouchableOpacity
              style={[styles.paywallBtn, { backgroundColor: "#4BDE95" }]}
              activeOpacity={0.9}
              onPress={handleFinish}
              disabled={isSaving || isSkipping}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <FontAwesome5 name="play" size={18} color="#FFF" />
                  <Text style={styles.paywallBtnText}>Começar a Jornada</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.impulseBuyBox}>
            <Text style={styles.impulseBuyPriceText}>
              Adesão <Text style={styles.priceHighlight}>R$ 99,00</Text> + R$
              9,90/mês
            </Text>
            <Text style={styles.impulseBuySubText}>
              Acesso vitalício à Jornada de 90 Dias. Inclui Clube de Manutenção,
              novos cursos e reavaliações (Cancele a mensalidade a qualquer
              momento).
            </Text>

            <TouchableOpacity
              style={styles.paywallBtn}
              activeOpacity={0.9}
              onPress={handleFinish}
              disabled={isSaving || isSkipping}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <FontAwesome5 name="shield-alt" size={18} color="#FFF" />
                  <Text style={styles.paywallBtnText}>
                    Resgatar Nossa Conexão
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {!isPremium && (
          <TouchableOpacity
            onPress={handleSaveAndSkip}
            style={styles.skipLink}
            disabled={isSaving || isSkipping}
          >
            {isSkipping ? (
              <ActivityIndicator size="small" color="#AFAFAF" />
            ) : (
              <Text style={styles.skipLinkText}>
                Adiar o resgate da nossa relação
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {screenState === "intro" && renderIntro()}
      {screenState === "questions" && renderQuestions()}
      {screenState === "calculating" && renderCalculating()}
      {screenState === "result" && (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {renderResult()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFF0F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    boxShadow: "0px 10px 15px rgba(255,126,179,0.3)",
    elevation: 10,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#333",
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 34,
  },
  introText: {
    fontSize: 16,
    color: "#777",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },

  primaryBtn: {
    flexDirection: "row",
    backgroundColor: "#FF7EB3",
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: "center",
    gap: 10,
    boxShadow: "0px 5px 10px rgba(255,126,179,0.4)",
    elevation: 5,
  },
  primaryBtnText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },

  questionContainer: { flex: 1, padding: 24, paddingTop: 30 },

  // 🔥 ESTILOS DA NOVA BÚSSOLA DE NAVEGAÇÃO
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  navBtnDisabled: {
    backgroundColor: "#F9F9F9",
    borderColor: "#F0F0F0",
    elevation: 0,
    shadowOpacity: 0,
  },

  progressBarBg: {
    height: 8,
    backgroundColor: "#E5E5E5",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#CE82FF",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#AFAFAF",
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "center",
  },

  questionHeader: { marginBottom: 35 },
  questionCategory: {
    color: "#CE82FF",
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  questionText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    lineHeight: 34,
  },

  answersContainer: { gap: 12 },
  answerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#F0F0F0",
    boxShadow: "0px 2px 4px rgba(0,0,0,0.05)",
    elevation: 2,
  },

  // 🔥 ESTILO DA OPÇÃO SELECIONADA NA MEMÓRIA
  answerBtnSelected: { borderColor: "#CE82FF", backgroundColor: "#F9F0FF" },

  answerIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  answerBtnText: { fontSize: 16, fontWeight: "700", color: "#555", flex: 1 },

  spinnerRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: "#F2E5FF",
    borderTopColor: "#CE82FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  calcTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 30,
  },

  loadingBarContainer: {
    width: "100%",
    height: 12,
    backgroundColor: "#E5E5E5",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 20,
  },
  loadingBarFill: {
    height: "100%",
    backgroundColor: "#CE82FF",
    borderRadius: 6,
  },
  loadingMessageText: {
    fontSize: 16,
    color: "#AFAFAF",
    fontWeight: "bold",
    textAlign: "center",
    fontStyle: "italic",
  },

  resultContainer: {
    alignItems: "center",
    padding: 30,
    paddingTop: 40,
    paddingBottom: 50,
  },
  resultHeader: {
    fontSize: 16,
    fontWeight: "800",
    color: "#AFAFAF",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 20,
  },

  thermometerWrapper: { alignItems: "center", marginBottom: 20 },
  thermometerGlass: {
    width: 30,
    height: 180,
    backgroundColor: "#E5E5E5",
    borderRadius: 15,
    justifyContent: "flex-end",
    overflow: "hidden",
    zIndex: 2,
    borderWidth: 2,
    borderColor: "#FFF",
    boxShadow: "0px 4px 5px rgba(0,0,0,0.1)",
    elevation: 5,
  },
  thermometerLiquid: {
    width: "100%",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  thermometerMark: {
    position: "absolute",
    left: 0,
    width: "30%",
    height: 2,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  thermometerBulb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: -15,
    zIndex: 1,
    borderWidth: 4,
    borderColor: "#FFF",
    boxShadow: "0px 4px 5px rgba(0,0,0,0.2)",
    elevation: 5,
  },

  resultTitle: {
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 10,
    textAlign: "center",
  },
  resultText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },

  riskBox: {
    backgroundColor: "#FFF",
    borderLeftWidth: 5,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    width: "100%",
    boxShadow: "0px 2px 5px rgba(0,0,0,0.06)",
    elevation: 2,
  },
  riskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  riskTitle: { fontSize: 16, fontWeight: "900", textTransform: "uppercase" },
  riskText: { fontSize: 13, color: "#555", lineHeight: 20 },

  hopeBox: {
    flexDirection: "row",
    backgroundColor: "#F9F0FF",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    gap: 15,
    marginBottom: 30,
    width: "100%",
  },
  hopeText: { flex: 1, fontSize: 14, color: "#5C3D75", lineHeight: 20 },

  impulseBuyBox: {
    width: "100%",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    boxShadow: "0px 4px 8px rgba(0,0,0,0.1)",
    elevation: 4,
    marginBottom: 20,
  },
  impulseBuyPriceText: {
    fontSize: 16,
    color: "#555",
    marginBottom: 8,
    fontWeight: "700",
  },
  priceHighlight: { fontSize: 24, fontWeight: "900", color: "#2C3E50" },
  impulseBuySubText: {
    fontSize: 12,
    color: "#AFAFAF",
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 18,
    paddingHorizontal: 10,
  },

  paywallBtn: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#2C3E50",
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    boxShadow: "0px 4px 8px rgba(0,0,0,0.2)",
    elevation: 5,
  },
  paywallBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  skipLink: { marginTop: 10, padding: 10 },
  skipLinkText: {
    color: "#AFAFAF",
    fontSize: 13,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});
