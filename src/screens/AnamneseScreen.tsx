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
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../config/firebase";

import { t } from "../i18n/translations";
import { logAuditEvent } from "../services/auditService";
import { encryptText } from "../services/securityService";

const { width } = Dimensions.get("window");

const SUPPORTED_LANGUAGES = [
  { code: "pt-BR", flag: "🇧🇷" },
  { code: "pt-PT", flag: "🇵🇹" },
  { code: "en", flag: "🇺🇸" },
  { code: "es", flag: "🇪🇸" },
  { code: "fr", flag: "🇫🇷" },
  { code: "de", flag: "🇩🇪" },
  { code: "ja", flag: "🇯🇵" },
];

export default function AnamneseScreen({ navigation, route }: any) {
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

  const [userLang, setUserLang] = useState("pt-BR");
  const [loadingMsg, setLoadingMsg] = useState(
    t("anamnesis_loading_start", userLang),
  );

  const [isLangModalVisible, setIsLangModalVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const isGuestOrHasPartner =
    route?.params?.isPartnerPremium || currentUserData?.partnerId;

  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "info-circle",
    color: "#202D3A",
    confirmText: "",
    onConfirm: null as any,
    secondaryText: "",
    onSecondary: null as any,
  });

  const showCustomAlert = (
    title: string,
    message: string,
    icon = "info-circle",
    color = "#202D3A",
    confirmText = "",
    onConfirm: any = null,
    secondaryText = "",
    onSecondary: any = null,
  ) => {
    setCustomAlert({
      visible: true,
      title,
      message,
      icon,
      color,
      confirmText,
      onConfirm,
      secondaryText,
      onSecondary,
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

            let hasActivePremium = Boolean(data.isPremium);

            if (!hasActivePremium && data.partnerId) {
              const partnerSnap = await getDoc(
                doc(db, "users", data.partnerId),
              );
              if (partnerSnap.exists()) {
                const partnerData = partnerSnap.data();
                if (partnerData.isPremium) {
                  hasActivePremium = true;
                  await setDoc(
                    doc(db, "users", user.uid),
                    { isPremium: true, isPartnerPremium: true },
                    { merge: true },
                  );
                }
              }
            }

            if (hasActivePremium) setIsPremium(true);

            if (data.hasPressedPlay && data.anamnesisLocked) {
              setScreenState("locked");
            } else {
              setScreenState("intro");
            }

            if (data.language) {
              currentLang = data.language;
              setUserLang(data.language);
            }
          }
        } catch (e) {
          console.log("Erro ao checar status do usuário/parceiro:", e);
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
          title:
            data.pillar ||
            `${t("connection_axis", langToFetch)} ${data.module_id || 1}`,
          text:
            data.translations?.[langToFetch] ||
            data.translations?.["pt-BR"] ||
            t("question_not_found", langToFetch),
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
                t("option_default", langToFetch),
              score: Number(opt.points ?? opt.score ?? fallbackScore),
              tag: opt.tag || "sintonia_geral",
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

  const handleSkipAnamnesis = () => {
    showCustomAlert(
      t("skip_anamnesis_title", userLang),
      t("skip_anamnesis_msg", userLang),
      "compass",
      "#EAB64A",
      t("btn_answer_assessment", userLang),
      null,
      t("btn_use_default_profile", userLang),
      async () => {
        const userId = auth.currentUser?.uid;
        if (userId) {
          setIsSkipping(true);
          try {
            await setDoc(
              doc(db, "users", userId),
              {
                hasCompletedAnamnesis: true,
                isSoloMode: false,
                profileType: "standard_default",
                anamnesisSkippedAt: new Date().toISOString(),
              },
              { merge: true },
            );

            // 📜 REGISTRO DE AUDITORIA DE SEGURANÇA (ANAMNESE PULADA)
            await logAuditEvent(
              userId,
              "ANAMNESE_SKIPPED",
              "Anamnese pulada: Perfil padrão ativado pelo usuário",
              userLang
            );

            if (isGuestOrHasPartner) {
              navigation.navigate("MatchScreen");
            } else {
              navigation.navigate("MainTabs", { screen: "Home" });
            }
          } catch (e) {
            console.log("Erro ao salvar perfil padrão:", e);
          } finally {
            setIsSkipping(false);
          }
        }
      },
    );
  };

  const handleSafeClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("MainTabs", { screen: "Home" });
    }
  };

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

      const pillar = ans.pillar || t("default_pillar_name", userLang);
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

    setLoadingMsg(t("loading_step_1", userLang));
    Animated.timing(loadingProgress, {
      toValue: 100,
      duration: 4000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    setTimeout(() => setLoadingMsg(t("loading_step_2", userLang)), 1200);
    setTimeout(() => setLoadingMsg(t("loading_step_3", userLang)), 2200);
    setTimeout(() => setLoadingMsg(t("loading_step_4", userLang)), 3200);

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
        if (q && ans.tag && ans.tag !== "sintonia_geral") {
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

      // 🔐 CRIPTOGRAFIA ZERO-KNOWLEDGE (AES-256)
      const secretKey = userId;
      const encryptedTags = await encryptText(JSON.stringify(diagnosticTags), secretKey);
      const encryptedScores = await encryptText(JSON.stringify(priorityPillars), secretKey);

      const payloadToSave = {
        hasCompletedAnamnesis: true,
        anamnesisScore: finalTemperature,
        priorityModules:
          priorityModulesNames.length > 0
            ? priorityModulesNames
            : [t("default_pillar_name", userLang)],
        diagnosticTagsEncrypted: encryptedTags,
        anamnesisScoresEncrypted: encryptedScores,
        anamnesisCompletedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", userId), payloadToSave, { merge: true });

      // 📜 REGISTRO DE AUDITORIA DE SEGURANÇA (ANAMNESE CONCLUÍDA)
      await logAuditEvent(
        userId,
        "ANAMNESE_COMPLETED",
        "Anamnese concluída e encriptada com sucesso",
        userLang
      );

      return true;
    } catch (error) {
      console.error("❌ Erro ao salvar avaliação no Firebase:", error);
      return false;
    }
  };

  const executePlayAction = async () => {
    setIsSaving(true);
    try {
      await saveAssessmentToFirebase();

      const userId = auth.currentUser?.uid;
      if (userId) {
        await setDoc(
          doc(db, "users", userId),
          {
            hasPressedPlay: true,
            anamnesisLocked: true,
            playPressedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      }
      navigation.navigate("MainTabs", { screen: "Home" });
    } catch (error) {
      console.error("Erro ao registrar Play:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePressPlayWithValidation = async () => {
    if (
      !currentUserData?.hasCompletedAnamnesis &&
      selectedAnswers.length === 0
    ) {
      showCustomAlert(
        t("compass_prompt_title", userLang),
        t("compass_prompt_msg", userLang),
        "heartbeat",
        "#202D3A",
        t("btn_answer_assessment_now", userLang),
        () => setScreenState("questions"),
        t("btn_start_default_profile", userLang),
        async () => {
          await handleSaveAndSkip();
        },
      );
      return;
    }

    if (!currentUserData?.partnerId) {
      showCustomAlert(
        t("solo_mode_alert_title", userLang),
        t("solo_mode_alert_msg", userLang),
        "user-friends",
        "#EAB64A",
        t("btn_send_partner_invite", userLang),
        () => navigation.navigate("InvitePartnerScreen"),
        t("btn_continue_solo_for_now", userLang),
        async () => {
          await executePlayAction();
        },
      );
      return;
    }

    await executePlayAction();
  };

  const handleGoToPaywall = async () => {
    if (isSaving) return;
    setIsSaving(true);
    await saveAssessmentToFirebase();
    setIsSaving(false);
    navigation.navigate("PaywallScreen");
  };

  const handleFinishFree = async () => {
    if (isSaving) return;
    await handlePressPlayWithValidation();
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
          {t("loading_info_text", userLang)}
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
      <Text style={styles.introTitle}>
        {t("journey_locked_title", userLang)}
      </Text>
      <Text style={styles.introText}>{t("journey_locked_msg", userLang)}</Text>

      <TouchableOpacity
        style={[styles.primaryBtn, { paddingHorizontal: 40, marginBottom: 12 }]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
      >
        <FontAwesome5 name="home" size={16} color="#FFF" />
        <Text style={styles.primaryBtnText}>
          {t("btn_back_to_home", userLang)}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderIntro = () => (
    <View style={styles.centerContainer}>
      <TouchableOpacity
        style={styles.floatingCloseBtn}
        onPress={handleSafeClose}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <FontAwesome5 name="times" size={22} color="#202D3A" />
      </TouchableOpacity>

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

      <Text style={styles.introTitle}>{t("intro_title", userLang)}</Text>
      <Text style={styles.introText}>
        {t("intro_text_part1", userLang)}{" "}
        <Text style={{ fontFamily: "Montserrat_700Bold", color: "#EAB64A" }}>
          {t("intro_text_highlight", userLang)}
        </Text>
        {t("intro_text_part2", userLang)}
      </Text>

      <Animated.View
        style={{ width: "100%", transform: [{ scale: pulseAnim }] }}
      >
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.8}
          onPress={handleStart}
          disabled={questionsBank.length === 0}
        >
          <Text style={styles.primaryBtnText}>
            {t("btn_start_mapping", userLang)}
          </Text>
          <FontAwesome5 name="arrow-right" size={18} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>

      <TouchableOpacity
        style={styles.skipBtn}
        activeOpacity={0.7}
        onPress={handleSkipAnamnesis}
      >
        <Text style={styles.skipBtnText}>
          {t("btn_skip_assessment", userLang)}
        </Text>
      </TouchableOpacity>
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

          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <View style={styles.progressBarBg}>
              <Animated.View
                style={[styles.progressBarFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {t("step_counter", userLang, {
                current: currentIndex + 1,
                total: questionsBank.length,
              })}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleForward}
            disabled={!canGoForward || isAnimating}
            style={[
              styles.navBtn,
              !canGoForward && styles.navBtnDisabled,
              { marginRight: 8 },
            ]}
          >
            <FontAwesome5
              name="chevron-right"
              size={18}
              color={!canGoForward ? "#D1D9E0" : "#202D3A"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSafeClose}
            style={[styles.navBtn, { borderColor: "#D96C6C" }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome5 name="times" size={18} color="#D96C6C" />
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
        <Text style={styles.calcTitle}>
          {t("analyzing_tuning_title", userLang)}
        </Text>

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
      resultTitle = t("result_cold_title", userLang);
      resultDesc = t("result_cold_desc", userLang);
      tempColor = "#2C3E50";
    } else if (finalTemperature < 75) {
      resultTitle = t("result_warm_title", userLang);
      resultDesc = t("result_warm_desc", userLang);
      tempColor = "#EAB64A";
    } else {
      resultTitle = t("result_hot_title", userLang);
      resultDesc = t("result_hot_desc", userLang);
      tempColor = "#67D4A8";
    }

    const fillHeight = thermometerFill.interpolate({
      inputRange: [0, 100],
      outputRange: ["0%", "100%"],
    });

    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultHeader}>
          {t("tuning_index_header", userLang)}
        </Text>

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
              {t("risk_box_title", userLang, { risk: finalRisk })}
            </Text>
          </View>
          <Text style={styles.riskText}>
            {t("risk_box_text_part1", userLang)}{" "}
            <Text style={{ fontFamily: "Montserrat_700Bold" }}>
              {t("risk_box_text_highlight", userLang, { risk: finalRisk })}
            </Text>{" "}
            {t("risk_box_text_part2", userLang)}
          </Text>
        </View>

        <View style={styles.hopeBox}>
          <FontAwesome5 name="seedling" size={22} color="#202D3A" />
          <Text style={styles.hopeText}>
            {t("hope_box_part1", userLang)}{" "}
            <Text
              style={{ fontFamily: "Montserrat_700Bold", color: "#202D3A" }}
            >
              {t("hope_box_highlight", userLang)}
            </Text>{" "}
            {t("hope_box_part2", userLang)}
          </Text>
        </View>

        {isPremium ? (
          <View style={styles.impulseBuyBox}>
            <Text style={styles.impulseBuyPriceText}>
              {t("access_unlocked_label", userLang)}{" "}
              <Text style={[styles.priceHighlight, { color: "#67D4A8" }]}>
                ✓
              </Text>
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
                  <Text style={styles.paywallBtnText}>
                    {t("btn_start_journey_now", userLang)}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.impulseBuyBox}>
            <Text style={styles.impulseBuyPriceText}>
              {t("unlock_rescue_trail", userLang)}
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
                    {t("btn_unlock_my_journey", userLang)}
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
              <ActivityIndicator size="small" color="#60646C" />
            ) : (
              <Text style={styles.skipLinkText}>
                {t("btn_postpone_rescue", userLang)}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {screenState === "locked" && renderLocked()}
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

      {/* MODAL IDIOMAS */}
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

      {/* MODAL DE ALERTAS COM SUPORTE A BOTAO SECUNDARIO */}
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

            <View style={{ width: "100%", gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[
                  styles.bottomSheetButtonPrimary,
                  { backgroundColor: customAlert.color },
                ]}
                onPress={() => {
                  setCustomAlert({ ...customAlert, visible: false });
                  if (customAlert.onConfirm) customAlert.onConfirm();
                }}
              >
                <Text style={styles.bottomSheetButtonPrimaryText}>
                  {customAlert.confirmText || t("btn_understand", userLang)}
                </Text>
              </TouchableOpacity>

              {customAlert.secondaryText ? (
                <TouchableOpacity
                  style={styles.bottomSheetButtonSecondary}
                  onPress={() => {
                    setCustomAlert({ ...customAlert, visible: false });
                    if (customAlert.onSecondary) customAlert.onSecondary();
                  }}
                >
                  <Text style={styles.bottomSheetButtonSecondaryText}>
                    {customAlert.secondaryText}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
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
  floatingCloseBtn: {
    position: "absolute",
    top: 50,
    left: 30,
    padding: 10,
    zIndex: 10,
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
    elevation: 5,
  },
  compactFlagBtn: {
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
    borderRadius: 10,
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
  },
  introTitle: {
    fontSize: 26,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 32,
  },
  introText: {
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  primaryBtn: {
    flexDirection: "row",
    backgroundColor: "#202D3A",
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    elevation: 5,
    marginBottom: 16,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  skipBtn: { paddingVertical: 10 },
  skipBtnText: {
    color: "#AFAFAF",
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    textDecorationLine: "underline",
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
    elevation: 2,
  },
  navBtnDisabled: { backgroundColor: "#F0F4F8", borderColor: "#E5E5E5" },
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
  paywallBtn: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    elevation: 5,
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