import { FontAwesome5 } from "@expo/vector-icons";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../config/firebase";

import { encryptData, generateVaultKey } from "../utils/security";

const { width, height } = Dimensions.get("window");

const SUPPORTED_LANGUAGES = [
  { code: "pt-BR", flag: "🇧🇷" },
  { code: "pt-PT", flag: "🇵🇹" },
  { code: "en", flag: "🇺🇸" },
  { code: "es", flag: "🇪🇸" },
  { code: "fr", flag: "🇫🇷" },
  { code: "de", flag: "🇩🇪" },
  { code: "ja", flag: "🇯🇵" },
];

export default function AnamnesisScreen({ navigation }: any) {
  const [screenState, setScreenState] = useState<
    "intro" | "questions" | "calculating" | "result" | "locked"
  >("intro");
  const [currentIndex, setCurrentIndex] = useState(0);

  const [questionsBank, setQuestionsBank] = useState<any[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [isCheckingUser, setIsCheckingUser] = useState(true);

  const [currentUserData, setCurrentUserData] = useState<any>(null);

  const [selectedAnswers, setSelectedAnswers] = useState<any[]>([]);

  const [finalTemperature, setFinalTemperature] = useState(100);
  const [finalRisk, setFinalRisk] = useState(10);
  const [priorityPillars, setPriorityPillars] = useState<any[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const [isPremium, setIsPremium] = useState(false);
  const [hasPartner, setHasPartner] = useState(false);

  const [loadingMsg, setLoadingMsg] = useState("Iniciando varredura...");

  const [userLang, setUserLang] = useState("pt-BR");
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);

  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [isMatching, setIsMatching] = useState(false);

  const [pendingMatchPartner, setPendingMatchPartner] = useState<any>(null);
  const [isMatchConfirmationVisible, setIsMatchConfirmationVisible] =
    useState(false);
  const [isMatchAnimationVisible, setIsMatchAnimationVisible] = useState(false);

  const [isAnimating, setIsAnimating] = useState(false);

  const matchAnimTranslateX = useRef(new Animated.Value(0)).current;
  const matchHeartScale = useRef(new Animated.Value(0)).current;

  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "info-circle",
    color: "#202D3A",
    confirmText: "",
    onConfirm: null as any,
  });

  const showCustomAlert = (
    title: string,
    message: string,
    icon = "info-circle",
    color = "#202D3A",
    confirmText = "",
    onConfirm: any = null,
  ) => {
    setCustomAlert({
      visible: true,
      title,
      message,
      icon,
      color,
      confirmText,
      onConfirm,
    });
  };

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const thermometerFill = useRef(new Animated.Value(0)).current;
  const loadingProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        let currentLang = "pt-BR";
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            setCurrentUserData(data);
            if (data.isPremium) setIsPremium(true);
            if (data.hasCompletedAnamnesis) setScreenState("locked");
            if (data.partnerId) setHasPartner(true);
            if (data.language) {
              currentLang = data.language;
              setUserLang(data.language);
            }
          }
        } catch (e) {
          console.log("Erro ao checar status do usuário:", e);
        }
        setIsCheckingUser(false);
        loadQuestionsFromFirebase(currentLang);
      } else {
        setIsCheckingUser(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadQuestionsFromFirebase = async (langToFetch: string) => {
    setIsLoadingQuestions(true);
    try {
      let q = query(
        collection(db, "anamnesis"),
        where("language", "==", langToFetch),
      );
      let qSnap = await getDocs(q);

      if (qSnap.empty) {
        q = query(
          collection(db, "anamnesis"),
          where("language", "==", "pt-BR"),
        );
        qSnap = await getDocs(q);
      }

      const loadedQuestions: any[] = [];
      qSnap.forEach((docSnap) => {
        const data = docSnap.data();
        loadedQuestions.push({
          id: data.question_id || docSnap.id,
          title: data.pillar || `Pilar ${data.module_id || 1}`,
          text:
            data.translations?.[langToFetch] ||
            data.translations?.["pt-BR"] ||
            "Pergunta não encontrada",
          options: (data.options || []).map((opt: any, index: number) => {
            let defaultIcon = "smile-beam";
            let defaultColor = "#67D4A8";
            let fallbackScore = 1;

            if (index === 1) {
              defaultIcon = "meh";
              defaultColor = "#EAB64A";
              fallbackScore = 4;
            } else if (index === 2) {
              defaultIcon = "sad-tear";
              defaultColor = "#E28743";
              fallbackScore = 7;
            } else if (index > 2) {
              defaultIcon = "frown";
              defaultColor = "#D96C6C";
              fallbackScore = 10;
            }

            return {
              label:
                opt.translations?.[langToFetch] ||
                opt.translations?.["pt-BR"] ||
                opt.label ||
                "Opção",
              score: Number(opt.points ?? opt.score ?? fallbackScore),
              tag: opt.tag || "geral",
              icon: opt.icon || defaultIcon,
              color: opt.color || defaultColor,
            };
          }),
        });
      });

      loadedQuestions.sort((a, b) => a.id.localeCompare(b.id));
      setQuestionsBank(loadedQuestions);
    } catch (error) {
      console.error("Erro ao buscar perguntas do Firebase:", error);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleChangeLanguage = async (langCode: string) => {
    setUserLang(langCode);
    setIsLangModalVisible(false);

    const userId = auth.currentUser?.uid;
    if (userId) {
      await setDoc(
        doc(db, "users", userId),
        { language: langCode },
        { merge: true },
      );
    }

    loadQuestionsFromFirebase(langCode);
  };

  const handleStart = () => setScreenState("questions");

  const handleBack = () => {
    if (isAnimating) return;

    if (currentIndex > 0) {
      setIsAnimating(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 40,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentIndex(currentIndex - 1);
        slideAnim.setValue(-40);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsAnimating(false);
        });
      });
    }
  };

  const handleForward = () => {
    if (isAnimating) return;

    if (
      currentIndex < selectedAnswers.length &&
      currentIndex < questionsBank.length - 1
    ) {
      setIsAnimating(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -40,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentIndex(currentIndex + 1);
        slideAnim.setValue(40);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsAnimating(false);
        });
      });
    }
  };

  const handleAnswer = (option: any) => {
    if (isAnimating) return;
    setIsAnimating(true);

    const newAnswers = [...selectedAnswers];
    newAnswers[currentIndex] = {
      questionId: questionsBank[currentIndex].id,
      pillar: questionsBank[currentIndex].title,
      score: Number(option.score) || 0,
      tag: option.tag,
      label: option.label,
    };
    setSelectedAnswers(newAnswers);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -40,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (currentIndex < questionsBank.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        slideAnim.setValue(40);

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsAnimating(false);
        });
      } else {
        fadeAnim.setValue(1);
        slideAnim.setValue(0);
        setIsAnimating(false);
        startCalculation(newAnswers);
      }
    });
  };

  const startCalculation = (finalAnswers: any[]) => {
    setScreenState("calculating");
    loadingProgress.setValue(0);

    const pillarStats: Record<string, { sumHealth: number; count: number }> =
      {};
    let totalSumHealth = 0;
    let validAnswersCount = 0;

    finalAnswers.forEach((ans) => {
      const q = questionsBank.find((qb) => qb.id === ans.questionId);
      if (!q) return;

      const pillar = ans.pillar || "Geral";
      if (!pillarStats[pillar]) {
        pillarStats[pillar] = { sumHealth: 0, count: 0 };
      }

      const scores = q.options.map((o: any) => Number(o.score) || 0);
      const qMin = Math.min(...scores);
      const qMax = Math.max(...scores);

      const firstOptScore = Number(q.options[0]?.score) || 0;
      const lastOptScore = Number(q.options[q.options.length - 1]?.score) || 0;
      const isHighGood = firstOptScore > lastOptScore;

      const range = qMax - qMin;
      let ansHealth = 0;

      if (range > 0) {
        const rawPercent = ((ans.score - qMin) / range) * 100;
        ansHealth = isHighGood ? rawPercent : 100 - rawPercent;
      } else {
        ansHealth = 50;
      }

      pillarStats[pillar].sumHealth += ansHealth;
      pillarStats[pillar].count += 1;

      totalSumHealth += ansHealth;
      validAnswersCount += 1;
    });

    const finalTempRaw =
      validAnswersCount > 0
        ? Math.round(totalSumHealth / validAnswersCount)
        : 50;
    setFinalTemperature(finalTempRaw);
    setFinalRisk(Math.max(5, 100 - finalTempRaw));

    const calculatedPillars = Object.keys(pillarStats).map((pillarName) => {
      const stats = pillarStats[pillarName];
      const healthPercent = Math.round(stats.sumHealth / stats.count);
      return { name: pillarName, health: healthPercent };
    });

    calculatedPillars.sort((a, b) => a.health - b.health);
    setPriorityPillars(calculatedPillars);

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
      animateThermometer(finalTempRaw);
    }, 4200);
  };

  const animateThermometer = (temperature: number) => {
    Animated.timing(thermometerFill, {
      toValue: temperature,
      duration: 2000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const saveAssessmentToFirebase = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return false;

    try {
      const diagnosticTags: string[] = [];
      const safeAnswers = selectedAnswers || [];

      safeAnswers.forEach((ans) => {
        const q = questionsBank.find((qb) => qb.id === ans.questionId);
        if (q && ans.tag && ans.tag !== "geral") {
          const scores = q.options.map((o: any) => Number(o.score) || 0);
          const qMin = Math.min(...scores);
          const qMax = Math.max(...scores);
          const firstOptScore = Number(q.options[0]?.score) || 0;
          const lastOptScore =
            Number(q.options[q.options.length - 1]?.score) || 0;
          const isHighGood = firstOptScore > lastOptScore;

          const range = qMax - qMin;
          if (range > 0) {
            const rawPercent = ((ans.score - qMin) / range) * 100;
            const health = isHighGood ? rawPercent : 100 - rawPercent;
            if (health <= 40) {
              diagnosticTags.push(ans.tag);
            }
          }
        }
      });

      const priorityModulesNames = priorityPillars
        .slice(0, 3)
        .map((p) => p.name);

      const pId = currentUserData?.partnerId;
      const vaultKey = pId
        ? generateVaultKey(userId, pId)
        : generateVaultKey(userId, userId);

      const encryptedTags = encryptData(diagnosticTags, vaultKey);
      const encryptedScores = encryptData(priorityPillars, vaultKey);

      const payloadToSave = {
        hasCompletedAnamnesis: true,
        anamnesisScore: finalTemperature,
        priorityModules:
          priorityModulesNames.length > 0 ? priorityModulesNames : ["Geral"],
        diagnosticTagsEncrypted: encryptedTags,
        anamnesisScoresEncrypted: encryptedScores,
        anamnesisCompletedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", userId), payloadToSave, { merge: true });
      return true;
    } catch (error) {
      console.error("❌ Erro ao salvar avaliação no Firebase:", error);
      return false;
    }
  };

  const handleLinkPartnerCode = async () => {
    const cleanCode = inviteCodeInput.trim().toUpperCase();

    if (cleanCode.length < 5) {
      showCustomAlert(
        "Código Inválido",
        "Digite um código válido com pelo menos 5 caracteres.",
        "exclamation-circle",
        "#EAB64A",
      );
      return;
    }

    const userId = auth.currentUser?.uid;
    if (!userId) return;

    setIsMatching(true);

    try {
      const q = query(
        collection(db, "users"),
        where("myInviteCode", "==", cleanCode),
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showCustomAlert(
          "Match Não Encontrado",
          "Não encontramos nenhuma conta com esse código. Verifique se o parceiro já acessou o app.",
          "search-minus",
          "#EAB64A",
        );
        setIsMatching(false);
        return;
      }

      const partnerDoc = querySnapshot.docs[0];
      const partnerDataDb = partnerDoc.data();
      const partnerId = partnerDoc.id;

      if (partnerId === userId) {
        showCustomAlert(
          "Ação Bloqueada",
          "Você não pode usar o seu próprio código!",
          "ban",
          "#D96C6C",
        );
        setIsMatching(false);
        return;
      }

      setPendingMatchPartner({ id: partnerId, data: partnerDataDb });
      setIsInviteModalVisible(false);
      setIsMatchConfirmationVisible(true);
    } catch (error) {
      showCustomAlert(
        "Erro de Conexão",
        "Ocorreu um problema ao tentar buscar a conta. Tente novamente.",
        "times-circle",
        "#D96C6C",
      );
    } finally {
      setIsMatching(false);
    }
  };

  const confirmMatchCode = async () => {
    setIsMatchConfirmationVisible(false);
    setIsMatchAnimationVisible(true);

    Animated.sequence([
      Animated.timing(matchAnimTranslateX, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(matchHeartScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const cleanCode = inviteCodeInput.trim().toUpperCase();

        await setDoc(
          doc(db, "users", userId),
          { linkedInviteCode: cleanCode },
          { merge: true },
        );

        setHasPartner(true);
        setInviteCodeInput("");

        showCustomAlert(
          "Conectando Almas! ❤️",
          "Seu código foi enviado aos nossos servidores com segurança. Em poucos instantes a jornada de vocês estará oficialmente conectada!",
          "heart",
          "#67D4A8",
        );
      } catch (error) {
        showCustomAlert(
          "Erro de Comunicação",
          "Não foi possível enviar o seu pedido de match ao servidor. Tente novamente.",
          "times-circle",
          "#D96C6C",
        );
      } finally {
        setIsMatchAnimationVisible(false);
        setPendingMatchPartner(null);
        matchAnimTranslateX.setValue(0);
        matchHeartScale.setValue(0);
      }
    }, 2800);
  };

  // 🔥 DIRECIONAMENTO ÚNICO: Salva a Anamnese e abre a PaywallScreen centralizada
  const handleGoToPaywall = async () => {
    if (isSaving) return;
    setIsSaving(true);
    await saveAssessmentToFirebase();
    setIsSaving(false);
    navigation.navigate("Paywall");
  };

  const handleFinishFree = async () => {
    if (isSaving) return;
    setIsSaving(true);
    await saveAssessmentToFirebase();
    setIsSaving(false);
    navigation.navigate("MainTabs", { screen: "Home" });
  };

  const handleSaveAndSkip = async () => {
    if (isSkipping) return;
    setIsSkipping(true);
    await saveAssessmentToFirebase();
    setIsSkipping(false);
    navigation.navigate("MainTabs", { screen: "Home" });
  };

  if (isLoadingQuestions || isCheckingUser) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#202D3A" />
        <Text
          style={{
            marginTop: 20,
            color: "#60646C",
            fontFamily: "Montserrat_700Bold",
          }}
        >
          Carregando informações...
        </Text>
      </SafeAreaView>
    );
  }

  const currentFlag =
    SUPPORTED_LANGUAGES.find((l) => l.code === userLang)?.flag || "🇧🇷";

  const renderLocked = () => (
    <View style={styles.centerContainer}>
      <Animated.View
        style={[
          styles.iconWrapper,
          { backgroundColor: "#E8F4F1", shadowColor: "#999" },
        ]}
      >
        <FontAwesome5 name="lock" size={50} color="#2C3E50" />
      </Animated.View>
      <Text style={styles.introTitle}>Avaliação Concluída</Text>
      <Text style={styles.introText}>
        Você já realizou a sua anamnese e seu plano de resgate está estruturado.
        Foque nas missões da sua jornada!
      </Text>
      <TouchableOpacity
        style={[styles.primaryBtn, { paddingHorizontal: 40 }]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
      >
        <FontAwesome5 name="home" size={18} color="#FFF" />
        <Text style={styles.primaryBtnText}>Ir para o Início</Text>
      </TouchableOpacity>
    </View>
  );

  const renderIntro = () => (
    <View style={styles.centerContainer}>
      <TouchableOpacity
        style={styles.floatingLangBtn}
        onPress={() => setIsLangModalVisible(true)}
      >
        <Text style={{ fontSize: 26 }}>{currentFlag}</Text>
      </TouchableOpacity>

      <Animated.View
        style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}
      >
        <FontAwesome5 name="heartbeat" size={70} color="#67D4A8" />
      </Animated.View>
      <Text style={styles.introTitle}>
        Descubra a Temperatura da sua Relação
      </Text>
      <Text style={styles.introText}>
        Responda com sinceridade. Não existe certo ou errado, apenas o ponto de
        partida para a melhor fase da vida a dois.
      </Text>

      <TouchableOpacity
        style={[styles.primaryBtn, { marginBottom: 15 }]}
        activeOpacity={0.8}
        onPress={handleStart}
        disabled={questionsBank.length === 0}
      >
        <Text style={styles.primaryBtnText}>Iniciar Avaliação</Text>
        <FontAwesome5 name="arrow-right" size={18} color="#FFF" />
      </TouchableOpacity>

      {!hasPartner && (
        <TouchableOpacity
          onPress={() => setIsInviteModalVisible(true)}
          style={{ padding: 10 }}
        >
          <Text
            style={{
              color: "#202D3A",
              fontFamily: "Montserrat_700Bold",
              textDecorationLine: "underline",
            }}
          >
            Fui convidado(a) e já tenho um código
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderQuestions = () => {
    const question = questionsBank[currentIndex];
    const progress = ((currentIndex + 1) / questionsBank.length) * 100;
    const currentAnswer = selectedAnswers[currentIndex];
    const canGoForward = currentIndex < selectedAnswers.length;

    if (!question) return null;

    return (
      <View style={styles.questionContainer}>
        <View style={styles.navHeader}>
          <TouchableOpacity
            onPress={handleBack}
            disabled={currentIndex === 0 || isAnimating}
            style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          >
            <FontAwesome5
              name="chevron-left"
              size={18}
              color={currentIndex === 0 ? "#D1D9E0" : "#202D3A"}
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
            disabled={!canGoForward || isAnimating}
            style={[styles.navBtn, !canGoForward && styles.navBtnDisabled]}
          >
            <FontAwesome5
              name="chevron-right"
              size={18}
              color={!canGoForward ? "#D1D9E0" : "#202D3A"}
            />
          </TouchableOpacity>
        </View>

        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
        >
          <View style={styles.questionHeader}>
            <Text style={styles.questionCategory}>{question.title}</Text>
            <Text style={styles.questionText}>{question.text}</Text>
          </View>

          <ScrollView
            key={currentIndex}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.answersContainer}>
              {question.options.map((opt: any, i: number) => {
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
                    disabled={isAnimating}
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
                        isSelected && {
                          color: "#202D3A",
                          fontFamily: "Montserrat_900Black",
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>

                    {isSelected && (
                      <FontAwesome5
                        name="check-circle"
                        solid
                        size={20}
                        color="#67D4A8"
                        style={{ marginLeft: 10 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
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
            <FontAwesome5 name="brain" size={40} color="#202D3A" />
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
    let resultTitle = "";
    let resultDesc = "";
    let tempColor = "";

    if (finalTemperature < 40) {
      resultTitle = "Distanciamento Emocional ❄️";
      resultDesc =
        "A rotina esfriou a relação. Mas a base do amor ainda está aí, esperando para ser nutrida e reconectada através da jornada.";
      tempColor = "#2C3E50";
    } else if (finalTemperature < 75) {
      resultTitle = "Morno, com Grande Potencial 🌥️";
      resultDesc =
        "Vocês têm uma base sólida, mas caíram no modo automático. A jornada de 90 dias vai reacender essa chama com tranquilidade.";
      tempColor = "#EAB64A";
    } else {
      resultTitle = "Conexão Segura e Forte 🌿";
      resultDesc =
        "Incrível! Vocês têm uma sintonia rara. A jornada será perfeita para blindar essa relação contra qualquer crise.";
      tempColor = "#67D4A8";
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
          {finalTemperature}º - {resultTitle}
        </Text>
        <Text style={styles.resultText}>{resultDesc}</Text>

        <View style={[styles.riskBox, { borderLeftColor: tempColor }]}>
          <View style={styles.riskHeader}>
            <FontAwesome5 name="chart-line" size={16} color={tempColor} />
            <Text style={[styles.riskTitle, { color: tempColor }]}>
              Risco Estatístico: {finalRisk}%
            </Text>
          </View>
          <Text style={styles.riskText}>
            Baseado em análises e padrões clínicos, seu cenário atual apresenta{" "}
            <Text style={{ fontFamily: "Montserrat_700Bold" }}>
              {finalRisk}% de risco de afastamento
            </Text>{" "}
            no longo prazo se não for cuidado. O verdadeiro destruidor de
            relações não são as brigas isoladas, mas sim a perda da admiração e
            a desconexão emocional.
          </Text>
        </View>

        <View style={styles.hopeBox}>
          <FontAwesome5 name="seedling" size={22} color="#202D3A" />
          <Text style={styles.hopeText}>
            Com base no seu diagnóstico, estruturamos a{" "}
            <Text
              style={{ fontFamily: "Montserrat_700Bold", color: "#202D3A" }}
            >
              Jornada de 90 Dias
            </Text>{" "}
            ideal para blindar e resgatar o seu relacionamento.
          </Text>
        </View>

        {isPremium ? (
          <View style={styles.impulseBuyBox}>
            <Text style={styles.impulseBuyPriceText}>
              Acesso Liberado{" "}
              <Text style={[styles.priceHighlight, { color: "#67D4A8" }]}>
                ✓
              </Text>
            </Text>
            <Text style={styles.impulseBuySubText}>
              Sua conta já está vinculada ao plano Premium. Você já pode iniciar
              a jornada.
            </Text>

            <TouchableOpacity
              style={[styles.paywallBtn, { backgroundColor: "#67D4A8" }]}
              activeOpacity={0.9}
              onPress={handleFinishFree}
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
          /* 🔥 UNIFICADO: Botão Direto para a Paywall Centralizada */
          <View style={styles.impulseBuyBox}>
            <Text
              style={[
                styles.resultHeader,
                { marginBottom: 10, color: "#202D3A" },
              ]}
            >
              Libere sua Trilha de Resgate
            </Text>
            <Text style={styles.impulseBuySubText}>
              Escolha entre a Assinatura Casal Duo (1 plano para os dois) ou
              Individual.
            </Text>

            <TouchableOpacity
              style={[styles.paywallBtn, { backgroundColor: "#EAB64A" }]}
              activeOpacity={0.9}
              onPress={handleGoToPaywall}
              disabled={isSaving || isSkipping}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#202D3A" />
              ) : (
                <>
                  <FontAwesome5 name="shield-alt" size={18} color="#202D3A" />
                  <Text style={[styles.paywallBtnText, { color: "#202D3A" }]}>
                    LIBERAR MINHA JORNADA
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {!hasPartner && (
              <TouchableOpacity
                onPress={() => setIsInviteModalVisible(true)}
                style={{ marginTop: 20 }}
              >
                <Text
                  style={{
                    color: "#2C3E50",
                    fontFamily: "Montserrat_700Bold",
                    textDecorationLine: "underline",
                  }}
                >
                  Fui convidado(a) e tenho um código
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!isPremium && (
          <TouchableOpacity
            onPress={handleSaveAndSkip}
            style={styles.skipLink}
            disabled={isSaving || isSkipping}
          >
            {isSkipping ? (
              <ActivityIndicator size="small" color="#60646C" />
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

  const userPhotoForAnim =
    currentUserData?.photoURL || currentUserData?.photoUrl;

  return (
    <SafeAreaView style={styles.container}>
      {screenState === "locked" && renderLocked()}
      {screenState === "intro" && renderIntro()}
      {screenState === "questions" && renderQuestions()}
      {screenState === "calculating" && renderCalculating()}

      {screenState === "result" && (
        <>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {renderResult()}
          </ScrollView>

          {!isPremium && (
            <TouchableOpacity
              style={styles.floatingCartBtn}
              activeOpacity={0.8}
              onPress={handleGoToPaywall}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#202D3A" />
              ) : (
                <FontAwesome5 name="shopping-cart" size={22} color="#202D3A" />
              )}
            </TouchableOpacity>
          )}
        </>
      )}

      <Modal visible={isLangModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsLangModalVisible(false)}
        >
          <View style={styles.compactLangModal}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.compactFlagBtn,
                  userLang === lang.code && styles.compactFlagBtnActive,
                ]}
                onPress={() => handleChangeLanguage(lang.code)}
              >
                <Text style={styles.compactFlagText}>{lang.flag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isInviteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.codeModalCard}>
            <Text style={styles.codeModalTitle}>Vincular Parceiro</Text>
            <Text style={styles.codeModalSub}>
              Insira o código que você recebeu do seu amor para se conectar e
              liberar o acesso à jornada.
            </Text>
            <TextInput
              style={styles.codeInputField}
              placeholder="Ex: DUE-123X"
              placeholderTextColor="#AFAFAF"
              autoCapitalize="characters"
              maxLength={8}
              value={inviteCodeInput}
              onChangeText={setInviteCodeInput}
            />
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleLinkPartnerCode}
              disabled={isMatching}
            >
              {isMatching ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.linkButtonText}>Avançar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelLinkButton}
              onPress={() => setIsInviteModalVisible(false)}
            >
              <Text style={styles.cancelLinkButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isMatchConfirmationVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.codeModalCard}>
            <Text style={styles.codeModalTitle}>É esta pessoa?</Text>
            <Text style={styles.codeModalSub}>
              Verifique se a conta abaixo pertence ao seu amor.
            </Text>

            <View style={{ alignItems: "center", marginBottom: 25 }}>
              {pendingMatchPartner?.data?.photoURL ||
              pendingMatchPartner?.data?.photoUrl ? (
                <Image
                  source={{
                    uri:
                      pendingMatchPartner?.data?.photoURL ||
                      pendingMatchPartner?.data?.photoUrl,
                  }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    marginBottom: 15,
                    borderWidth: 3,
                    borderColor: "#EAB64A",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: "#FFFFFF",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 15,
                    borderWidth: 1,
                    borderColor: "#D1D9E0",
                  }}
                >
                  <FontAwesome5 name="user-alt" size={30} color="#AFAFAF" />
                </View>
              )}
              <Text
                style={{
                  fontFamily: "Montserrat_900Black",
                  fontSize: 20,
                  color: "#202D3A",
                }}
              >
                {pendingMatchPartner?.data?.displayName ||
                  pendingMatchPartner?.data?.email?.split("@")[0] ||
                  "Usuário Misterioso"}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: "#67D4A8" }]}
              onPress={confirmMatchCode}
            >
              <Text style={styles.linkButtonText}>Sim, Conectar!</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelLinkButton}
              onPress={() => {
                setIsMatchConfirmationVisible(false);
                setPendingMatchPartner(null);
                setInviteCodeInput("");
              }}
            >
              <Text style={styles.cancelLinkButtonText}>
                Não, errei o código
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isMatchAnimationVisible} transparent animationType="fade">
        <View
          style={[
            styles.modalOverlayCenter,
            { backgroundColor: "rgba(32,45,58,0.95)" },
          ]}
        >
          <Text
            style={{
              color: "#FFF",
              fontSize: 24,
              fontFamily: "Montserrat_900Black",
              marginBottom: 50,
              letterSpacing: 1,
            }}
          >
            Conectando Almas...
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    translateX: matchAnimTranslateX.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 45],
                    }),
                  },
                ],
                zIndex: 5,
              }}
            >
              {userPhotoForAnim ? (
                <Image
                  source={{ uri: userPhotoForAnim }}
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    borderWidth: 4,
                    borderColor: "#FFF",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    backgroundColor: "#FFF",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 4,
                    borderColor: "#FFF",
                  }}
                >
                  <FontAwesome5 name="user-alt" size={35} color="#202D3A" />
                </View>
              )}
            </Animated.View>

            <Animated.View
              style={{
                transform: [{ scale: matchHeartScale }],
                zIndex: 10,
                marginHorizontal: -15,
              }}
            >
              <View
                style={{
                  backgroundColor: "#FFF",
                  padding: 15,
                  borderRadius: 30,
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowRadius: 10,
                  elevation: 10,
                }}
              >
                <FontAwesome5 name="heart" solid size={35} color="#EAB64A" />
              </View>
            </Animated.View>

            <Animated.View
              style={{
                transform: [
                  {
                    translateX: matchAnimTranslateX.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -45],
                    }),
                  },
                ],
                zIndex: 5,
              }}
            >
              {pendingMatchPartner?.data?.photoURL ||
              pendingMatchPartner?.data?.photoUrl ? (
                <Image
                  source={{
                    uri:
                      pendingMatchPartner?.data?.photoURL ||
                      pendingMatchPartner?.data?.photoUrl,
                  }}
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    borderWidth: 4,
                    borderColor: "#FFF",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    backgroundColor: "#FFF",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 4,
                    borderColor: "#FFF",
                  }}
                >
                  <FontAwesome5 name="user-alt" size={35} color="#202D3A" />
                </View>
              )}
            </Animated.View>
          </View>

          <Text
            style={{
              color: "#FFF",
              fontSize: 16,
              fontFamily: "Montserrat_700Bold",
              marginTop: 50,
              opacity: 0.8,
            }}
          >
            A mágica está acontecendo no servidor...
          </Text>
        </View>
      </Modal>

      <Modal visible={customAlert.visible} transparent animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHandle} />

            <View
              style={[
                styles.alertIconContainer,
                { backgroundColor: customAlert.color + "20" },
              ]}
            >
              <FontAwesome5
                name={customAlert.icon}
                size={30}
                color={customAlert.color}
              />
            </View>

            <Text style={styles.bottomSheetTitle}>{customAlert.title}</Text>
            <Text style={styles.bottomSheetText}>{customAlert.message}</Text>

            {customAlert.onConfirm ? (
              <View style={{ width: "100%", gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.bottomSheetButtonPrimary,
                    { backgroundColor: customAlert.color },
                  ]}
                  onPress={() => {
                    setCustomAlert({ ...customAlert, visible: false });
                    customAlert.onConfirm();
                  }}
                >
                  <Text style={styles.bottomSheetButtonPrimaryText}>
                    {customAlert.confirmText || "Continuar"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bottomSheetButtonSecondary}
                  onPress={() =>
                    setCustomAlert({ ...customAlert, visible: false })
                  }
                >
                  <Text style={styles.bottomSheetButtonSecondaryText}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.bottomSheetButtonPrimary,
                  { backgroundColor: customAlert.color, marginTop: 10 },
                ]}
                onPress={() =>
                  setCustomAlert({ ...customAlert, visible: false })
                }
              >
                <Text style={styles.bottomSheetButtonPrimaryText}>Entendi</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  floatingLangBtn: {
    position: "absolute",
    top: 50,
    right: 30,
    padding: 10,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(32, 45, 58, 0.6)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  compactLangModal: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 12,
    marginTop: 100,
    marginRight: 20,
    width: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  compactFlagBtn: {
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  compactFlagBtnActive: {
    backgroundColor: "#E8F4F1",
    borderWidth: 2,
    borderColor: "#67D4A8",
  },
  compactFlagText: { fontSize: 28 },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E8F4F1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    elevation: 10,
    shadowColor: "#202D3A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  introTitle: {
    fontSize: 28,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 34,
  },
  introText: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },
  primaryBtn: {
    flexDirection: "row",
    backgroundColor: "#202D3A",
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: "center",
    gap: 10,
    elevation: 5,
    shadowColor: "#202D3A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
  },
  questionContainer: { flex: 1, padding: 24, paddingTop: 30 },
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
    borderColor: "#D1D9E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  navBtnDisabled: {
    backgroundColor: "#F0F4F8",
    borderColor: "#E5E5E5",
    elevation: 0,
    shadowOpacity: 0,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#D1D9E0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#EAB64A",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#60646C",
    fontFamily: "Montserrat_700Bold",
    textTransform: "uppercase",
    textAlign: "center",
  },
  questionHeader: { marginBottom: 35 },
  questionCategory: {
    color: "#EAB64A",
    fontSize: 16,
    fontFamily: "Montserrat_900Black",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  questionText: {
    fontSize: 26,
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
    lineHeight: 34,
  },
  answersContainer: { gap: 12, paddingBottom: 20 },
  answerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  answerBtnSelected: { borderColor: "#67D4A8", backgroundColor: "#E8F4F1" },
  answerIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  answerBtnText: {
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    color: "#2C3E50",
    flex: 1,
  },
  spinnerRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: "#D1D9E0",
    borderTopColor: "#202D3A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  calcTitle: {
    fontSize: 24,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 30,
  },
  loadingBarContainer: {
    width: "100%",
    height: 12,
    backgroundColor: "#D1D9E0",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 20,
  },
  loadingBarFill: {
    height: "100%",
    backgroundColor: "#67D4A8",
    borderRadius: 6,
  },
  loadingMessageText: {
    fontSize: 16,
    color: "#60646C",
    fontFamily: "Montserrat_600SemiBold",
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
    fontFamily: "Montserrat_900Black",
    color: "#60646C",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 20,
  },
  thermometerWrapper: { alignItems: "center", marginBottom: 20 },
  thermometerGlass: {
    width: 30,
    height: 180,
    backgroundColor: "#FFF",
    borderRadius: 15,
    justifyContent: "flex-end",
    overflow: "hidden",
    zIndex: 2,
    borderWidth: 2,
    borderColor: "#D1D9E0",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
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
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  resultTitle: {
    fontSize: 26,
    fontFamily: "Montserrat_900Black",
    marginBottom: 10,
    textAlign: "center",
  },
  resultText: {
    fontSize: 15,
    color: "#2C3E50",
    fontFamily: "Montserrat_400Regular",
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
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  riskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  riskTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_900Black",
    textTransform: "uppercase",
  },
  riskText: {
    fontSize: 13,
    color: "#60646C",
    lineHeight: 20,
    fontFamily: "Montserrat_400Regular",
  },
  hopeBox: {
    flexDirection: "row",
    backgroundColor: "#E8F4F1",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    gap: 15,
    marginBottom: 30,
    width: "100%",
  },
  hopeText: {
    flex: 1,
    fontSize: 14,
    color: "#202D3A",
    lineHeight: 20,
    fontFamily: "Montserrat_400Regular",
  },
  impulseBuyBox: {
    width: "100%",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D9E0",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 20,
  },
  impulseBuyPriceText: {
    fontSize: 16,
    color: "#2C3E50",
    marginBottom: 8,
    fontFamily: "Montserrat_700Bold",
  },
  priceHighlight: {
    fontSize: 24,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
  },
  impulseBuySubText: {
    fontSize: 13,
    color: "#60646C",
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 18,
    paddingHorizontal: 10,
    fontFamily: "Montserrat_400Regular",
  },
  paywallBtn: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  paywallBtnText: {
    fontSize: 16,
    fontFamily: "Montserrat_900Black",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  skipLink: { marginTop: 10, padding: 10 },
  skipLinkText: {
    color: "#60646C",
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    textDecorationLine: "underline",
  },
  floatingCartBtn: {
    position: "absolute",
    bottom: 40,
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EAB64A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EAB64A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(32,45,58,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  codeModalCard: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  codeModalTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 10,
  },
  codeModalSub: {
    fontSize: 14,
    color: "#60646C",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Montserrat_400Regular",
  },
  codeInputField: {
    width: "100%",
    backgroundColor: "#F0F4F8",
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 20,
    color: "#202D3A",
  },
  linkButton: {
    backgroundColor: "#EAB64A",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  linkButtonText: {
    color: "#202D3A",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  cancelLinkButton: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelLinkButtonText: {
    color: "#60646C",
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
  },

  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(32,45,58,0.6)",
    justifyContent: "flex-end",
  },
  bottomSheetContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    width: "100%",
  },
  bottomSheetHandle: {
    width: 50,
    height: 5,
    backgroundColor: "#D1D9E0",
    borderRadius: 3,
    marginBottom: 20,
  },
  alertIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  bottomSheetTitle: {
    fontSize: 22,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 10,
    textAlign: "center",
  },
  bottomSheetText: {
    fontSize: 15,
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
    fontFamily: "Montserrat_400Regular",
  },
  bottomSheetButtonPrimary: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetButtonPrimaryText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  bottomSheetButtonSecondary: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetButtonSecondaryText: {
    color: "#2C3E50",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
});
