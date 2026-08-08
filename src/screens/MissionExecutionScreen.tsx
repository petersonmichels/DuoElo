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
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db } from "../config/firebase";
// 🔥 IMPORT DA SEGURANÇA PARA DESCRIPTOGRAFIA
import { decryptData, generateVaultKey } from "../utils/security";

const { width } = Dimensions.get("window");

export default function MissionExecutionScreen({
  mission,
  userLanguage,
  onClose,
  onComplete,
  isReviewMode,
}: any) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const [journalEntry, setJournalEntry] = useState("");

  const [loadingJournal, setLoadingJournal] = useState(false);
  const [fetchedJournal, setFetchedJournal] = useState<string | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const extractText = (field: any, fieldName: string, fallback: string) => {
    if (mission?.translations?.[userLanguage]?.[fieldName]) {
      return mission.translations[userLanguage][fieldName];
    }
    if (typeof field === "object" && field !== null) {
      return (
        field[userLanguage] ||
        field["pt-BR"] ||
        field["pt"] ||
        field["en"] ||
        fallback
      );
    }
    if (typeof field === "string") {
      return field;
    }
    return fallback;
  };

  const conceptText = extractText(
    mission?.concept || mission?.description,
    "concept",
    "Com o tempo, a rotina faz com que casais parem de se olhar de verdade. Conversamos sobre contas, sobre os filhos, mas não nos conectamos mais. O silêncio e a falta de contato visual são os primeiros sinais de distanciamento.",
  );

  const actionText = extractText(
    mission?.action || mission?.description,
    "action",
    "Hoje, sente-se de frente para o seu parceiro(a), segurem as mãos e olhem-se nos olhos por 2 minutos ininterruptos, sem falar nada.",
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
            if (data.currentTaskStep === 2) {
              setCurrentStep(2);
              progressAnim.setValue(50);
            } else if (data.currentTaskStep === 3) {
              setCurrentStep(3);
              progressAnim.setValue(100);
            }
          }
        } catch (error: any) {
          if (error?.message && !error.message.includes("closing/hidden")) {
            console.log("Erro ao buscar passo da missão:", error);
          }
        }
      }
      if (isMounted) setLoading(false);
    };

    fetchCurrentStep();

    return () => {
      isMounted = false;
    };
  }, [isReviewMode]);

  // 🔥 LÓGICA DE DESCRIPTOGRAFIA NO MODO REVISÃO
  useEffect(() => {
    let isMounted = true;

    if (isReviewMode) {
      const fetchJournal = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        if (isMounted) setLoadingJournal(true);
        try {
          const phaseToFetch =
            mission.phase ||
            mission.displayPhase ||
            mission.day ||
            mission.week;
          const q = query(
            collection(db, "users", uid, "journals"),
            where("phase", "==", phaseToFetch),
          );
          const snapshot = await getDocs(q);

          if (isMounted) {
            if (!snapshot.empty) {
              const data = snapshot.docs[0].data();

              // 🛡️ DESCRIPTOGRAFIA EM TEMPO REAL
              if (data.textEncrypted) {
                const userDoc = await getDoc(doc(db, "users", uid));
                const pId = userDoc.data()?.partnerId;
                const vaultKey = pId
                  ? generateVaultKey(uid, pId)
                  : generateVaultKey(uid, uid);

                const decryptedText = decryptData(data.textEncrypted, vaultKey);
                setFetchedJournal(
                  decryptedText || "⚠️ Falha ao descriptografar.",
                );
              } else {
                // Fallback para dados velhos não criptografados
                setFetchedJournal(data.text || "");
              }
            } else {
              setFetchedJournal("");
            }
          }
        } catch (error: any) {
          if (
            isMounted &&
            error?.message &&
            !error.message.includes("closing/hidden")
          ) {
            setFetchedJournal("");
          }
        } finally {
          if (isMounted) setLoadingJournal(false);
        }
      };
      fetchJournal();
    }

    return () => {
      isMounted = false;
    };
  }, [isReviewMode, mission]);

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

  const goToStep = async (nextStep: number) => {
    if (currentStep === nextStep) return;

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

      if (!isReviewMode) {
        const userId = auth.currentUser?.uid;
        if (userId) {
          try {
            await setDoc(
              doc(db, "users", userId),
              { currentTaskStep: nextStep },
              { merge: true },
            );
          } catch (e) {
            console.log("Erro ao salvar state da task", e);
          }
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
    onClose();
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    await onComplete(journalEntry);
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#1A2F3B" />
      </View>
    );
  }

  const isGold = mission?.isGoldChallenge;

  if (isReviewMode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerReview}>
          <Text style={styles.headerTitle}>
            {isGold ? "Desafio de Ouro" : "Missão do Dia"}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtnReview}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <FontAwesome5 name="times" size={20} color="#1A2F3B" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.missionHeaderCard,
              isGold && {
                backgroundColor: "#FFF9E6",
                borderColor: "#E5A93C",
                borderWidth: 2,
              },
            ]}
          >
            <View
              style={[
                styles.missionIconBadge,
                { backgroundColor: isGold ? "#E5A93C" : "#4BDE95" },
              ]}
            >
              <FontAwesome5
                name={isGold ? "infinity" : "check"}
                size={24}
                color="#FFF"
                solid={isGold}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.missionMainTitle,
                  isGold && { color: "#1A2F3B" },
                ]}
              >
                {mission.title ||
                  (isGold
                    ? "Desafio de Ouro"
                    : `Dia ${mission.day || mission.phase}`)}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: isGold ? "#E5A93C" : "#4BDE95",
                  fontWeight: "bold",
                }}
              >
                {isGold
                  ? "🏆 Desafio Concluído (+150 Bonds)"
                  : "Missão Cumprida"}
              </Text>
            </View>
          </View>

          {conceptText && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                <FontAwesome5
                  name="lightbulb"
                  solid
                  color={isGold ? "#E5A93C" : "#1A2F3B"}
                />{" "}
                O Conceito
              </Text>
              <Text style={styles.cardText}>{conceptText}</Text>
            </View>
          )}

          {actionText && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                <FontAwesome5 name="bullseye" solid color="#E5A93C" /> Ação
                Prática
              </Text>
              <Text style={styles.cardText}>{actionText}</Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📖 Seu Diário (Opcional)</Text>
            <Text style={styles.cardSubtitle}>
              Sua reflexão e sentimentos salvos para revisitar depois.
            </Text>

            {loadingJournal ? (
              <ActivityIndicator
                size="small"
                color="#1A2F3B"
                style={{ marginTop: 10, alignSelf: "flex-start" }}
              />
            ) : (
              <View
                style={[
                  styles.textInput,
                  {
                    minHeight: 120,
                    height: "auto",
                    backgroundColor: "#F0F4F8",
                  },
                ]}
              >
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
                    : "Nenhuma reflexão foi escrita neste dia."}
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <FontAwesome5 name="times" size={20} color="#1A2F3B" />
        </TouchableOpacity>

        <View style={styles.trailContainer}>
          <View style={styles.trailLineBg}>
            <Animated.View
              style={[
                styles.trailLineFill,
                { width: progressBarWidth },
                isGold && { backgroundColor: "#E5A93C" },
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
                    ? { backgroundColor: "#E5A93C", borderColor: "#FFF" }
                    : styles.nodeActive
                  : styles.nodeInactive,
              ]}
            >
              <FontAwesome5
                name={isGold ? "infinity" : "lightbulb"}
                solid
                size={14}
                color={
                  currentStep >= 1 ? (isGold ? "#1A2F3B" : "#FFF") : "#60646C"
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => goToStep(2)}
              style={[
                styles.node,
                currentStep >= 2
                  ? isGold
                    ? { backgroundColor: "#E5A93C", borderColor: "#FFF" }
                    : styles.nodeActive
                  : styles.nodeInactive,
              ]}
            >
              <FontAwesome5
                name="hands-helping"
                size={12}
                color={
                  currentStep >= 2 ? (isGold ? "#1A2F3B" : "#FFF") : "#60646C"
                }
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
              <FontAwesome5
                name="check"
                size={14}
                color={currentStep === 3 ? "#FFF" : "#60646C"}
              />
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
              <View
                style={[
                  styles.stepBadge,
                  isGold && { backgroundColor: "#FFF9E6" },
                ]}
              >
                <Text
                  style={[styles.stepBadgeText, isGold && { color: "#E5A93C" }]}
                >
                  {isGold ? "DESAFIO DE OURO" : "PASSO 1 DE 3"}
                </Text>
              </View>
              <Text style={styles.titleText}>
                {isGold ? mission.title : "O Conceito"}
              </Text>

              <View
                style={[
                  styles.contentCard,
                  isGold && {
                    borderColor: "#E5A93C",
                    backgroundColor: "#FFF9E6",
                  },
                ]}
              >
                <FontAwesome5
                  name={isGold ? "crown" : "quote-left"}
                  size={24}
                  color={isGold ? "#E5A93C" : "#D1D9E0"}
                  style={{ marginBottom: 15 }}
                />
                <Text style={styles.contentText}>{conceptText}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  isGold && {
                    backgroundColor: "#E5A93C",
                    shadowColor: "#E5A93C",
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => goToStep(2)}
              >
                <Text
                  style={[
                    styles.primaryBtnText,
                    isGold && { color: "#1A2F3B" },
                  ]}
                >
                  Avançar para Ação
                </Text>
                <FontAwesome5
                  name="arrow-right"
                  size={16}
                  color={isGold ? "#1A2F3B" : "#FFF"}
                />
              </TouchableOpacity>
            </View>
          )}

          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <View
                style={[
                  styles.stepBadge,
                  isGold && { backgroundColor: "#FFF9E6" },
                ]}
              >
                <Text
                  style={[styles.stepBadgeText, isGold && { color: "#E5A93C" }]}
                >
                  PASSO 2 DE 3
                </Text>
              </View>
              <Text style={styles.titleText}>A Ação</Text>

              <View
                style={[
                  styles.contentCard,
                  { borderColor: "#E5A93C", backgroundColor: "#FFF9E6" },
                ]}
              >
                <FontAwesome5
                  name="bolt"
                  size={24}
                  color="#E5A93C"
                  style={{ marginBottom: 15 }}
                />
                <Text
                  style={[
                    styles.contentText,
                    {
                      color: "#1A2F3B",
                      fontSize: 18,
                      lineHeight: 26,
                      textAlign: "center",
                    },
                  ]}
                >
                  {actionText}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { backgroundColor: "#E5A93C", shadowColor: "#E5A93C" },
                ]}
                activeOpacity={0.8}
                onPress={() => goToStep(3)}
              >
                <Text style={[styles.primaryBtnText, { color: "#1A2F3B" }]}>
                  Avançar para Finalização
                </Text>
                <FontAwesome5 name="arrow-right" size={16} color="#1A2F3B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handlePause}
              >
                <FontAwesome5 name="clock" size={16} color="#60646C" />
                <Text style={styles.secondaryBtnText}>
                  Sair e fazer mais tarde
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <View
                style={[
                  styles.stepBadge,
                  isGold && { backgroundColor: "#FFF9E6" },
                ]}
              >
                <Text
                  style={[styles.stepBadgeText, isGold && { color: "#E5A93C" }]}
                >
                  PASSO 3 DE 3
                </Text>
              </View>
              <Text style={styles.titleText}>Conclusão</Text>

              <Text style={styles.subText}>
                {isGold
                  ? "Incrível! Vocês completaram o Desafio de Ouro da semana. Registrem abaixo o momento para gerar +150 Bonds!"
                  : "O elo de vocês foi fortalecido. Que tal registrar no diário de bordo como foi a experiência antes de concluir?"}
              </Text>

              <View style={styles.journalContainer}>
                <TextInput
                  style={styles.journalInput}
                  placeholder="Como você se sentiu hoje? (Opcional)"
                  placeholderTextColor="#AFAFAF"
                  multiline
                  textAlignVertical="top"
                  value={journalEntry}
                  onChangeText={setJournalEntry}
                />
                <FontAwesome5
                  name="book-open"
                  size={18}
                  color="#D1D9E0"
                  style={styles.journalIcon}
                />
              </View>

              <View style={styles.bigCheckContainer}>
                <FontAwesome5
                  name="heart"
                  solid
                  size={20}
                  color="#E5A93C"
                  style={styles.floatingHeartIcon}
                />
                <View style={styles.floatingFireIcon}>
                  <FontAwesome5
                    name={isGold ? "infinity" : "fire"}
                    solid
                    size={16}
                    color="#FFF"
                  />
                </View>

                <Animated.View
                  style={[
                    styles.outerRing,
                    { transform: [{ scale: pulseAnim }] },
                    isGold && { borderColor: "#E5A93C" },
                  ]}
                >
                  <View style={styles.innerRing}>
                    <TouchableOpacity
                      style={[
                        styles.bigCheckButton,
                        isGold && {
                          backgroundColor: "#E5A93C",
                          shadowColor: "#E5A93C",
                        },
                      ]}
                      activeOpacity={0.8}
                      onPress={handleFinish}
                      disabled={isFinishing}
                    >
                      {isFinishing ? (
                        <ActivityIndicator
                          size="large"
                          color={isGold ? "#1A2F3B" : "#FFF"}
                        />
                      ) : (
                        <FontAwesome5
                          name="check"
                          size={40}
                          color={isGold ? "#1A2F3B" : "#FFF"}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </View>

              <Text style={styles.bigCheckLabel}>MARCAR COMO CUMPRIDA</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
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
    fontWeight: "900",
    color: "#1A2F3B",
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
    backgroundColor: "#1A2F3B",
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
    backgroundColor: "#1A2F3B",
    shadowColor: "#1A2F3B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  nodeComplete: {
    backgroundColor: "#4BDE95",
    shadowColor: "#4BDE95",
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
    color: "#1A2F3B",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },

  titleText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#1A2F3B",
    marginBottom: 25,
    textAlign: "center",
  },
  subText: {
    fontSize: 15,
    color: "#60646C",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 10,
  },

  journalContainer: { width: "100%", position: "relative", marginBottom: 30 },
  journalInput: {
    backgroundColor: "#FFF",
    width: "100%",
    height: 120,
    borderRadius: 16,
    padding: 20,
    paddingRight: 45,
    paddingTop: 20,
    fontSize: 15,
    color: "#1A2F3B",
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
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  contentText: { fontSize: 16, color: "#2C3E50", lineHeight: 26 },

  primaryBtn: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "#1A2F3B",
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    shadowColor: "#1A2F3B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },

  secondaryBtn: {
    flexDirection: "row",
    marginTop: 25,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  secondaryBtnText: {
    color: "#60646C",
    fontSize: 15,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },

  bigCheckContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    position: "relative",
  },
  floatingHeartIcon: { position: "absolute", top: -25, zIndex: 10 },
  floatingFireIcon: {
    position: "absolute",
    left: 10,
    top: 0,
    backgroundColor: "#DCA052",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    borderWidth: 2,
    borderColor: "#FFF",
  },

  outerRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 6,
    borderColor: "#E5A93C",
    borderLeftColor: "#D1D9E0",
    borderTopColor: "#D1D9E0",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "45deg" }],
  },
  innerRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: "#4BDE95",
    borderRightColor: "#D1D9E0",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "-45deg" }],
  },
  bigCheckButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#1A2F3B",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1A2F3B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  bigCheckLabel: {
    marginTop: 15,
    fontSize: 14,
    fontWeight: "900",
    color: "#60646C",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  missionHeaderCardReview: {
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
  missionIconBadgeReview: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4BDE95",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  missionMainTitleReview: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1A2F3B",
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
    fontWeight: "900",
    color: "#1A2F3B",
    marginBottom: 10,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#60646C",
    marginBottom: 15,
    lineHeight: 18,
  },
  cardText: {
    fontSize: 15,
    color: "#2C3E50",
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
    color: "#1A2F3B",
    textAlignVertical: "top",
  },
});
