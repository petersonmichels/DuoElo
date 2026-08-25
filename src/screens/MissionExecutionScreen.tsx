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
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth, db } from "../config/firebase";
import { t } from "../i18n/translations";
import { logAuditEvent } from "../services/auditService";
import { decryptText, encryptText } from "../services/securityService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch (e) {}

export default function MissionExecutionScreen({
  mission,
  userLanguage = "pt-BR",
  onClose,
  onComplete,
  isReviewMode,
}: any) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const [journalEntry, setJournalEntry] = useState("");
  const [userEnableHaptics, setUserEnableHaptics] = useState(true);

  const [loadingJournal, setLoadingJournal] = useState(false);
  const [fetchedJournal, setFetchedJournal] = useState<string | null>(null);

  const [showGuideBox, setShowGuideBox] = useState(true);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const ringPulseAnim = useRef(new Animated.Value(1)).current;

  const currentDayOrPhase = Number(
    mission?.displayPhase || mission?.day || mission?.phase || 1
  );
  const isGold = Boolean(mission?.isGoldChallenge);

  const triggerHaptic = (
    type: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light"
  ) => {
    if (!Haptics || !userEnableHaptics) return;
    try {
      if (type === "light") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === "medium") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (type === "heavy") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (type === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === "warning") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      else if (type === "error") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {}
  };

  const extractText = (field: any, fieldName: string, fallbackKey: string) => {
    if (mission?.translations?.[userLanguage]?.[fieldName]) {
      return mission.translations[userLanguage][fieldName];
    }
    if (typeof field === "object" && field !== null) {
      return (
        field[userLanguage] ||
        field["pt-BR"] ||
        field["pt"] ||
        field["en"] ||
        t(fallbackKey, userLanguage)
      );
    }
    if (typeof field === "string") {
      return field;
    }
    return t(fallbackKey, userLanguage);
  };

  const conceptText = extractText(
    mission?.concept || mission?.description,
    "concept",
    "fallback_mission_concept"
  );

  const actionText = extractText(
    mission?.action || mission?.description,
    "action",
    "fallback_mission_action"
  );

  useEffect(() => {
    let isMounted = true;

    if (isReviewMode) {
      setCurrentStep(1);
      if (isMounted) setLoading(false);
      return;
    }

    const fetchCurrentStep = async () => {
      const userId = auth.currentUser?.uid;
      if (userId) {
        try {
          const snap = await getDoc(doc(db, "users", userId));
          if (isMounted && snap.exists()) {
            const data = snap.data();
            setUserEnableHaptics(data.enableHaptics !== false);

            if (!isGold) {
              if (data.currentTaskStep === 2) {
                setCurrentStep(2);
                progressAnim.setValue(50);
              } else if (data.currentTaskStep === 3) {
                setCurrentStep(3);
                progressAnim.setValue(100);
              }
            }
          }
        } catch (error: any) {}
      }
      if (isMounted) setLoading(false);
    };

    fetchCurrentStep();

    return () => {
      isMounted = false;
    };
  }, [isReviewMode, isGold]);

  useEffect(() => {
    let isMounted = true;

    if (isReviewMode) {
      const fetchJournal = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        if (isMounted) setLoadingJournal(true);
        try {
          const rawPhase =
            mission.displayPhase || mission.phase || mission.day || mission.week;
          const strPhase = String(rawPhase);
          const numPhase = Number(rawPhase);

          let journalData: any = null;

          const directDocRef = doc(db, "users", uid, "journals", strPhase);
          const directSnap = await getDoc(directDocRef);

          if (directSnap.exists()) {
            journalData = directSnap.data();
          } else {
            let q = query(
              collection(db, "users", uid, "journals"),
              where("phase", "==", numPhase)
            );
            let snapshot = await getDocs(q);

            if (snapshot.empty) {
              q = query(
                collection(db, "users", uid, "journals"),
                where("phase", "==", strPhase)
              );
              snapshot = await getDocs(q);
            }

            if (!snapshot.empty) {
              journalData = snapshot.docs[0].data();
            } else {
              const allSnap = await getDocs(collection(db, "users", uid, "journals"));
              if (!allSnap.empty) {
                const docsData = allSnap.docs.map((d) => d.data());
                docsData.sort(
                  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                journalData = docsData[0];
              }
            }
          }

          if (isMounted) {
            if (journalData && journalData.text) {
              const decryptedText = await decryptText(journalData.text, uid);
              setFetchedJournal(decryptedText);
            } else {
              setFetchedJournal("");
            }
          }
        } catch (error: any) {
          if (isMounted) setFetchedJournal("");
        } finally {
          if (isMounted) setLoadingJournal(false);
        }
      };
      fetchJournal();
    }

    return () => {
      isMounted = false;
    };
  }, [isReviewMode, mission, userLanguage, isGold]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulseAnim, {
          toValue: 1.12,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringPulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [ringPulseAnim]);

  const goToStep = async (nextStep: number) => {
    if (currentStep === nextStep) return;

    triggerHaptic("light");

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(async () => {
      setCurrentStep(nextStep);
      slideAnim.setValue(30);

      const targetProgress = nextStep === 1 ? 0 : nextStep === 2 ? 50 : 100;
      Animated.timing(progressAnim, {
        toValue: targetProgress,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      if (!isReviewMode && !isGold) {
        const userId = auth.currentUser?.uid;
        if (userId) {
          setDoc(
            doc(db, "users", userId),
            { currentTaskStep: nextStep },
            { merge: true }
          ).catch(() => {});
        }
      }

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
  };

  const handlePause = () => {
    triggerHaptic("light");
    onClose();
  };

  const handleFinish = async () => {
    if (isFinishing) return;
    triggerHaptic("heavy");
    setIsFinishing(true);

    try {
      const uid = auth.currentUser?.uid;
      let finalJournalToSave: string = journalEntry;

      if (uid && journalEntry.trim().length > 0) {
        finalJournalToSave = await encryptText(journalEntry, uid);

        try {
          await logAuditEvent(
            uid,
            "JOURNAL_ENTRY_CREATED",
            `Reflexão salva e protegida com criptografia E2EE (Fase/Dia: ${mission.id || currentDayOrPhase})`,
            userLanguage
          );
        } catch (auditErr) {}
      }

      await onComplete(finalJournalToSave);
    } catch (e) {
      await onComplete(journalEntry);
    } finally {
      setIsFinishing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#202D3A" />
      </View>
    );
  }

  if (isReviewMode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerReview}>
          <Text style={styles.headerTitle}>
            {isGold
              ? t("gold_challenge_review_title", userLanguage) || "Desafio de Ouro"
              : t("daily_mission_review_title", userLanguage) || "Revisão da Missão"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic("light");
              onClose();
            }}
            style={styles.closeBtnReview}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <FontAwesome5 name="times" size={20} color="#202D3A" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.missionHeaderCard,
              isGold && { backgroundColor: "#FFF9E6", borderColor: "#EAB64A", borderWidth: 2 },
            ]}
          >
            <View style={[styles.missionIconBadge, { backgroundColor: isGold ? "#EAB64A" : "#67D4A8" }]}>
              <FontAwesome5 name={isGold ? "infinity" : "check"} size={24} color="#FFF" solid={isGold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.missionMainTitle, isGold && { color: "#202D3A" }]}>
                {mission.title ||
                  (isGold
                    ? t("gold_challenge_title_default", userLanguage) || "Desafio de Ouro"
                    : t("mission_day_title_default", userLanguage, { day: currentDayOrPhase }) || "Missão")}
              </Text>
              <Text style={{ fontSize: 13, color: isGold ? "#EAB64A" : "#67D4A8", fontFamily: "Montserrat_700Bold" }}>
                {isGold
                  ? t("gold_challenge_completed_badge", userLanguage) || "Concluído com Sucesso"
                  : t("mission_accomplished_badge", userLanguage) || "Missão Cumprida"}
              </Text>
            </View>
          </View>

          {conceptText && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                <FontAwesome5 name="lightbulb" solid color={isGold ? "#EAB64A" : "#202D3A"} />{" "}
                {t("concept_section_title", userLanguage) || "Conceito"}
              </Text>
              <Text style={styles.cardText}>{conceptText}</Text>
            </View>
          )}

          {actionText && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                <FontAwesome5 name="bullseye" solid color="#EAB64A" />{" "}
                {t("action_section_title", userLanguage) || "Ação Prática"}
              </Text>
              <Text style={styles.cardText}>{actionText}</Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              📖 {t("journal_section_title", userLanguage) || "Seu Diário (Opcional)"}
            </Text>
            <Text style={styles.cardSubtitle}>
              {t("journal_section_sub", userLanguage) || "Sua reflexão e sentimentos salvos para revisitar depois."}
            </Text>

            {loadingJournal ? (
              <ActivityIndicator size="small" color="#202D3A" style={{ marginTop: 10, alignSelf: "flex-start" }} />
            ) : (
              <View style={[styles.textInput, { minHeight: 120, height: "auto", backgroundColor: "#F0F4F8" }]}>
                <Text
                  style={[
                    styles.cardText,
                    {
                      fontStyle: fetchedJournal ? "italic" : "normal",
                      color: fetchedJournal ? "#2C3E50" : "#60646C",
                    },
                  ]}
                >
                  {fetchedJournal
                    ? fetchedJournal
                    : t("no_reflection_recorded_msg", userLanguage) || "Nenhuma reflexão registrada neste dia."}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 50, 100],
    outputRange: ["0%", "50%", "100%"],
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              triggerHaptic("light");
              onClose();
            }}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <FontAwesome5 name="times" size={20} color="#202D3A" />
          </TouchableOpacity>

          <View style={styles.trailContainer}>
            <View style={styles.trailLineBg}>
              <Animated.View
                style={[
                  styles.trailLineFill,
                  { width: progressBarWidth },
                  isGold && { backgroundColor: "#EAB64A" },
                ]}
              />
            </View>

            <View style={styles.trailNodes}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => goToStep(1)}
                style={[
                  styles.node,
                  currentStep >= 1
                    ? isGold
                      ? { backgroundColor: "#EAB64A", borderColor: "#FFF" }
                      : styles.nodeActive
                    : styles.nodeInactive,
                ]}
              >
                <FontAwesome5
                  name={isGold ? "infinity" : "lightbulb"}
                  solid
                  size={14}
                  color={currentStep >= 1 ? (isGold ? "#202D3A" : "#FFF") : "#60646C"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => goToStep(2)}
                style={[
                  styles.node,
                  currentStep >= 2
                    ? isGold
                      ? { backgroundColor: "#EAB64A", borderColor: "#FFF" }
                      : styles.nodeActive
                    : styles.nodeInactive,
                ]}
              >
                <FontAwesome5
                  name="hands-helping"
                  size={12}
                  color={currentStep >= 2 ? (isGold ? "#202D3A" : "#FFF") : "#60646C"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => goToStep(3)}
                style={[
                  styles.node,
                  currentStep === 3 ? styles.nodeComplete : styles.nodeInactive,
                ]}
              >
                <FontAwesome5 name="check" size={14} color={currentStep === 3 ? "#FFF" : "#60646C"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              flex: 1,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {currentStep === 1 && (
              <View style={styles.stepContainer}>
                <View style={[styles.stepBadge, isGold && { backgroundColor: "#FFF9E6" }]}>
                  <Text style={[styles.stepBadgeText, isGold && { color: "#EAB64A" }]}>
                    {isGold
                      ? t("step_badge_gold", userLanguage) || "DESAFIO DE OURO"
                      : t("step_badge_1", userLanguage) || "PASSO 1 DE 3"}
                  </Text>
                </View>
                <Text style={styles.titleText}>
                  {isGold ? mission.title : t("concept_section_title", userLanguage) || "Conceito"}
                </Text>

                <View style={[styles.contentCard, isGold && { borderColor: "#EAB64A", backgroundColor: "#FFF9E6" }]}>
                  <FontAwesome5
                    name={isGold ? "crown" : "quote-left"}
                    size={24}
                    color={isGold ? "#EAB64A" : "#D1D9E0"}
                    style={{ marginBottom: 15 }}
                  />
                  <Text style={styles.contentText}>{conceptText}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, isGold && { backgroundColor: "#EAB64A", shadowColor: "#EAB64A" }]}
                  activeOpacity={0.8}
                  onPress={() => goToStep(2)}
                >
                  <Text style={[styles.primaryBtnText, isGold && { color: "#202D3A" }]}>
                    {t("btn_advance_to_action", userLanguage) || "AVANÇAR PARA AÇÃO"}
                  </Text>
                  <FontAwesome5 name="arrow-right" size={16} color={isGold ? "#202D3A" : "#FFF"} />
                </TouchableOpacity>
              </View>
            )}

            {currentStep === 2 && (
              <View style={styles.stepContainer}>
                <View style={[styles.stepBadge, isGold && { backgroundColor: "#FFF9E6" }]}>
                  <Text style={[styles.stepBadgeText, isGold && { color: "#EAB64A" }]}>
                    {t("step_badge_2", userLanguage) || "PASSO 2 DE 3"}
                  </Text>
                </View>

                <Text style={styles.titleText}>
                  {t("action_section_title", userLanguage) || "Ação Prática"}
                </Text>

                <View style={[styles.contentCard, { borderColor: "#EAB64A", backgroundColor: "#FFF9E6" }]}>
                  <FontAwesome5 name="bolt" size={24} color="#EAB64A" style={{ marginBottom: 15 }} />
                  <Text
                    style={[
                      styles.contentText,
                      {
                        color: "#202D3A",
                        fontSize: 18,
                        lineHeight: 26,
                        textAlign: "center",
                        fontFamily: "Montserrat_600SemiBold",
                      },
                    ]}
                  >
                    {actionText}
                  </Text>
                </View>

                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.circleBtn, styles.circleBtnCheck]}
                    activeOpacity={0.8}
                    onPress={() => goToStep(3)}
                  >
                    <FontAwesome5 name="check" size={28} color="#FFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.circleBtn, styles.circleBtnClock]}
                    activeOpacity={0.8}
                    onPress={handlePause}
                  >
                    <FontAwesome5 name="clock" size={28} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {currentDayOrPhase <= 3 && !isGold && showGuideBox && (
                  <View style={styles.guideBannerFooter}>
                    <TouchableOpacity
                      style={styles.guideCloseBtn}
                      onPress={() => setShowGuideBox(false)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <FontAwesome5 name="times" size={14} color="#AFAFAF" />
                    </TouchableOpacity>

                    <View style={{ flexDirection: "row", alignItems: "flex-start", flex: 1 }}>
                      <FontAwesome5 name="info-circle" size={16} color="#202D3A" style={{ marginRight: 10, marginTop: 2 }} />
                      <Text style={styles.guideText}>
                        <Text style={{ color: "#27AE60", fontFamily: "Montserrat_700Bold" }}>
                          ✓ {t("guide_green_label", userLanguage) || "Verde:"}
                        </Text>{" "}
                        {t("guide_green_desc", userLanguage) || "Você já fez a tarefa e quer registrar."}
                        {"\n"}
                        <Text style={{ color: "#E67E22", fontFamily: "Montserrat_700Bold" }}>
                          ⏰ {t("guide_orange_label", userLanguage) || "Laranja:"}
                        </Text>{" "}
                        {t("guide_orange_desc", userLanguage) || "Precisamos fazer ao longo do dia."}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {currentStep === 3 && (
              <View style={styles.stepContainer}>
                <View style={[styles.stepBadge, isGold && { backgroundColor: "#FFF9E6" }]}>
                  <Text style={[styles.stepBadgeText, isGold && { color: "#EAB64A" }]}>
                    {t("step_badge_3", userLanguage) || "PASSO 3 DE 3"}
                  </Text>
                </View>

                <Text style={styles.titleText}>
                  {t("conclusion_title", userLanguage) || "Conclusão"}
                </Text>

                <Text style={styles.subText}>
                  {isGold
                    ? t("conclusion_sub_gold", userLanguage) || "Registre o que aprenderam com este desafio."
                    : t("conclusion_sub_default", userLanguage) || "O elo de vocês foi fortalecido. Que tal registrar no diário como foi a experiência?"}
                </Text>

                <View style={styles.journalContainer}>
                  <TextInput
                    style={styles.journalInput}
                    placeholder={t("placeholder_journal_entry", userLanguage) || "Opcional: Deixe sua reflexão..."}
                    placeholderTextColor="#AFAFAF"
                    multiline
                    textAlignVertical="top"
                    value={journalEntry}
                    onChangeText={setJournalEntry}
                    editable={!isFinishing}
                  />
                  <FontAwesome5 name="book-open" size={18} color="#D1D9E0" style={styles.journalIcon} />
                </View>

                <View style={styles.victoryButtonSection}>
                  <Animated.View
                    style={[
                      styles.victoryOuterRing,
                      { transform: [{ scale: ringPulseAnim }] },
                    ]}
                  />

                  <View style={styles.victory3DBase}>
                    <Pressable
                      onPress={handleFinish}
                      disabled={isFinishing}
                      style={({ pressed }) => [
                        styles.victory3DFace,
                        isGold && styles.victory3DFaceGold,
                        { transform: [{ translateY: pressed ? 0 : -6 }] },
                        isFinishing && { opacity: 0.8 },
                      ]}
                    >
                      {isFinishing ? (
                        <ActivityIndicator size="large" color="#202D3A" />
                      ) : (
                        <FontAwesome5
                          name={isGold ? "trophy" : "check"}
                          size={46}
                          color="#202D3A"
                        />
                      )}
                    </Pressable>
                  </View>

                  <Text style={styles.victoryButtonTextLabel}>
                    {isFinishing
                      ? t("btn_completing_label", userLanguage) || "REGISTRANDO..."
                      : isGold
                      ? t("btn_complete_gold_label", userLanguage) || "CONCLUIR DESAFIO DE OURO"
                      : t("btn_mark_accomplished_label", userLanguage) || "CONCLUIR CONQUISTA DO DIA"}
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F4F8",
  },
  header: {
    padding: 25,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D9E0",
    alignItems: "center",
    position: "relative",
    zIndex: 10,
  },
  headerReview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D9E0",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
  },
  closeBtn: {
    position: "absolute",
    right: 25,
    top: 25,
    zIndex: 20,
  },
  closeBtnReview: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D1D9E0",
    justifyContent: "center",
    alignItems: "center",
  },
  trailContainer: {
    width: "70%",
    marginTop: 10,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  trailLineBg: {
    position: "absolute",
    top: 14,
    left: "10%",
    right: "10%",
    height: 4,
    backgroundColor: "#D1D9E0",
    borderRadius: 2,
  },
  trailLineFill: {
    height: "100%",
    backgroundColor: "#202D3A",
    borderRadius: 2,
  },
  trailNodes: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  node: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  nodeInactive: { backgroundColor: "#D1D9E0" },
  nodeActive: {
    backgroundColor: "#202D3A",
    shadowColor: "#202D3A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  nodeComplete: {
    backgroundColor: "#67D4A8",
    shadowColor: "#67D4A8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContent: { flexGrow: 1, padding: 30, justifyContent: "center" },
  stepContainer: { alignItems: "center", width: "100%" },
  stepBadge: {
    backgroundColor: "#F0F4F8",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 15,
  },
  stepBadgeText: {
    color: "#202D3A",
    fontSize: 12,
    fontFamily: "Montserrat_900Black",
    letterSpacing: 1,
  },
  titleText: {
    fontSize: 32,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 25,
    textAlign: "center",
  },
  subText: {
    fontSize: 15,
    color: "#60646C",
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  journalContainer: { width: "100%", position: "relative", marginBottom: 25 },
  journalInput: {
    backgroundColor: "#FFF",
    width: "100%",
    height: 120,
    borderRadius: 16,
    padding: 20,
    paddingRight: 45,
    paddingTop: 20,
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    color: "#202D3A",
    borderWidth: 1,
    borderColor: "#D1D9E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  journalIcon: { position: "absolute", right: 20, top: 20 },
  contentCard: {
    width: "100%",
    backgroundColor: "#FFF",
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D9E0",
    marginBottom: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  contentText: {
    fontSize: 16,
    color: "#2C3E50",
    lineHeight: 26,
    fontFamily: "Montserrat_400Regular",
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 36,
    marginTop: 5,
    marginBottom: 25,
  },
  circleBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  circleBtnCheck: {
    backgroundColor: "#27AE60",
  },
  circleBtnClock: {
    backgroundColor: "#E67E22",
  },
  guideBannerFooter: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#D1D9E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    position: "relative",
  },
  guideCloseBtn: {
    position: "absolute",
    top: 10,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  guideText: {
    fontSize: 13,
    color: "#60646C",
    fontFamily: "Montserrat_400Regular",
    lineHeight: 20,
    flex: 1,
    paddingRight: 15,
  },
  primaryBtn: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "#202D3A",
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    shadowColor: "#202D3A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  victoryButtonSection: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 15,
    position: "relative",
    width: "100%",
  },
  victoryOuterRing: {
    position: "absolute",
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 4,
    borderColor: "#67D4A8",
    top: -8,
  },
  victory3DBase: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#C99632",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  victory3DFace: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#EAB64A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFF",
  },
  victory3DFaceGold: {
    backgroundColor: "#FFD700",
  },
  victoryButtonTextLabel: {
    marginTop: 18,
    fontSize: 13,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  missionHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  missionIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#67D4A8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  missionMainTitle: {
    fontSize: 22,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#FFF",
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 10,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#60646C",
    fontFamily: "Montserrat_400Regular",
    marginBottom: 15,
    lineHeight: 18,
  },
  cardText: {
    fontSize: 15,
    color: "#2C3E50",
    fontFamily: "Montserrat_400Regular",
    lineHeight: 24,
  },
  textInput: {
    backgroundColor: "#F0F4F8",
    borderWidth: 1,
    borderColor: "#D1D9E0",
    borderRadius: 16,
    padding: 16,
    height: 120,
    fontSize: 15,
    color: "#202D3A",
    textAlignVertical: "top",
  },
});