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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../config/firebase";

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

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 🔥 EXTRATOR BLINDADO DE TEXTO (A alteração importante de hoje para evitar crashs)
  const extractText = (field: any, fieldName: string, fallback: string) => {
    // 1. Tenta buscar da propriedade 'translations' se existir
    if (mission?.translations?.[userLanguage]?.[fieldName]) {
      return mission.translations[userLanguage][fieldName];
    }
    // 2. Se o próprio campo for o objeto de idiomas (O causador do erro clássico)
    if (typeof field === "object" && field !== null) {
      return (
        field[userLanguage] ||
        field["pt-BR"] ||
        field["pt"] ||
        field["en"] ||
        fallback
      );
    }
    // 3. Se for uma string simples e direta
    if (typeof field === "string") {
      return field;
    }
    return fallback;
  };

  // Aplicação do extrator para os textos dos passos 1 e 2
  const conceptText = extractText(
    mission?.concept,
    "concept",
    "Com o tempo, a rotina faz com que casais parem de se olhar de verdade. Conversamos sobre contas, sobre os filhos, mas não nos conectamos mais. O silêncio e a falta de contato visual são os primeiros sinais de distanciamento.",
  );

  const actionText = extractText(
    mission?.action,
    "action",
    "Hoje, sente-se de frente para o seu parceiro(a), segurem as mãos e olhem-se nos olhos por 2 minutos ininterruptos, sem falar nada.",
  );

  useEffect(() => {
    // Se for modo de leitura (revisão de velha missão), ele já começa no passo 1.
    if (isReviewMode) {
      setCurrentStep(1);
      setLoading(false);
      return;
    }

    const fetchCurrentStep = async () => {
      const userId = auth.currentUser?.uid;
      if (userId) {
        try {
          const snap = await getDoc(doc(db, "users", userId));
          if (snap.exists()) {
            const data = snap.data();
            if (data.currentTaskStep === 2) {
              setCurrentStep(2);
              progressAnim.setValue(50);
            } else if (data.currentTaskStep === 3) {
              setCurrentStep(3);
              progressAnim.setValue(100);
            }
          }
        } catch (error) {
          console.log("Erro ao buscar passo da missão:", error);
        }
      }
      setLoading(false);
    };

    fetchCurrentStep();
  }, [isReviewMode]);

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

      // 🔥 Se for revisão, ele NÃO SALVA NADA no banco de dados para não sobrescrever a trilha principal.
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
        <ActivityIndicator size="large" color="#CE82FF" />
      </View>
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
          <FontAwesome5 name="times" size={20} color="#AFAFAF" />
        </TouchableOpacity>

        <View style={styles.trailContainer}>
          <View style={styles.trailLineBg}>
            <Animated.View
              style={[styles.trailLineFill, { width: progressBarWidth }]}
            />
          </View>

          <View style={styles.trailNodes}>
            <View
              style={[
                styles.node,
                currentStep >= 1 ? styles.nodeActive : styles.nodeInactive,
              ]}
            >
              <FontAwesome5
                name="lightbulb"
                solid
                size={14}
                color={currentStep >= 1 ? "#FFF" : "#AFAFAF"}
              />
            </View>
            <View
              style={[
                styles.node,
                currentStep >= 2 ? styles.nodeActive : styles.nodeInactive,
              ]}
            >
              <FontAwesome5
                name="hands-helping"
                size={12}
                color={currentStep >= 2 ? "#FFF" : "#AFAFAF"}
              />
            </View>
            <View
              style={[
                styles.node,
                currentStep === 3 ? styles.nodeComplete : styles.nodeInactive,
              ]}
            >
              <FontAwesome5
                name="check"
                size={14}
                color={currentStep === 3 ? "#FFF" : "#AFAFAF"}
              />
            </View>
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
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>PASSO 1 DE 3</Text>
              </View>
              <Text style={styles.titleText}>O Contexto</Text>

              <View style={styles.contentCard}>
                <FontAwesome5
                  name="quote-left"
                  size={24}
                  color="#F0E6FA"
                  style={{ marginBottom: 15 }}
                />
                {/* 🔥 Usando a variável extraída com segurança */}
                <Text style={styles.contentText}>{conceptText}</Text>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                activeOpacity={0.8}
                onPress={() => goToStep(2)}
              >
                <Text style={styles.primaryBtnText}>
                  {isReviewMode ? "Avançar" : "Entendi o objetivo"}
                </Text>
                <FontAwesome5 name="arrow-right" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}

          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>PASSO 2 DE 3</Text>
              </View>
              <Text style={styles.titleText}>A Ação</Text>

              <View
                style={[
                  styles.contentCard,
                  { borderColor: "#FFE273", backgroundColor: "#FFF9E6" },
                ]}
              >
                <FontAwesome5
                  name="bolt"
                  size={24}
                  color="#FF9600"
                  style={{ marginBottom: 15 }}
                />
                {/* 🔥 Usando a variável extraída com segurança */}
                <Text
                  style={[
                    styles.contentText,
                    {
                      color: "#333",
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
                  { backgroundColor: "#FF9600", shadowColor: "#FF9600" },
                ]}
                activeOpacity={0.8}
                onPress={() => goToStep(3)}
              >
                <Text style={styles.primaryBtnText}>
                  {isReviewMode ? "Avançar" : "Já realizamos a Ação!"}
                </Text>
                <FontAwesome5 name="arrow-right" size={16} color="#FFF" />
              </TouchableOpacity>

              {/* Esconde botão "fazer mais tarde" se for só leitura */}
              {!isReviewMode && (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handlePause}
                >
                  <FontAwesome5 name="clock" size={16} color="#AFAFAF" />
                  <Text style={styles.secondaryBtnText}>
                    Sair e fazer mais tarde
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>PASSO 3 DE 3</Text>
              </View>
              <Text style={styles.titleText}>Conclusão</Text>

              <Text style={styles.subText}>
                {isReviewMode
                  ? "Você já concluiu esta missão. Continue focado(a) na jornada para fortalecer ainda mais o seu elo!"
                  : "O elo de vocês foi fortalecido. Que tal registrar no diário de bordo como foi a experiência antes de concluir?"}
              </Text>

              {/* Esconde diário de bordo se for só leitura */}
              {!isReviewMode && (
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
                    color="#E5E5E5"
                    style={styles.journalIcon}
                  />
                </View>
              )}

              <View style={styles.bigCheckContainer}>
                <FontAwesome5
                  name="heart"
                  solid
                  size={20}
                  color="#FF7EB3"
                  style={styles.floatingHeartIcon}
                />
                <View style={styles.floatingFireIcon}>
                  <FontAwesome5 name="fire" solid size={16} color="#FFF" />
                </View>

                <Animated.View
                  style={[
                    styles.outerRing,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <View style={styles.innerRing}>
                    <TouchableOpacity
                      style={[
                        styles.bigCheckButton,
                        isReviewMode && {
                          backgroundColor: "#4BDE95",
                          shadowColor: "#4BDE95",
                        },
                      ]}
                      activeOpacity={0.8}
                      onPress={isReviewMode ? onClose : handleFinish}
                      disabled={isFinishing}
                    >
                      {isFinishing ? (
                        <ActivityIndicator size="large" color="#FFF" />
                      ) : (
                        <FontAwesome5
                          name={isReviewMode ? "times" : "check"}
                          size={40}
                          color="#FFF"
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </View>

              <Text style={styles.bigCheckLabel}>
                {isReviewMode ? "FECHAR REVISÃO" : "MARCAR COMO CUMPRIDA"}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },

  header: {
    padding: 25,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    alignItems: "center",
    position: "relative",
    zIndex: 10,
  },
  closeBtn: { position: "absolute", right: 25, top: 25, zIndex: 20 },

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
    backgroundColor: "#F0F0F0",
    borderRadius: 2,
  },
  trailLineFill: {
    height: "100%",
    backgroundColor: "#CE82FF",
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
  nodeInactive: { backgroundColor: "#E5E5E5" },
  nodeActive: {
    backgroundColor: "#CE82FF",
    shadowColor: "#CE82FF",
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
    backgroundColor: "#F9F0FF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 15,
  },
  stepBadgeText: {
    color: "#C67AFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },

  titleText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#2C3E50",
    marginBottom: 25,
    textAlign: "center",
  },
  subText: {
    fontSize: 15,
    color: "#7F8C8D",
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
    color: "#333",
    borderWidth: 1,
    borderColor: "#E5E5E5",
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
    borderColor: "#E5E5E5",
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  contentText: { fontSize: 16, color: "#555", lineHeight: 26 },

  primaryBtn: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "#CE82FF",
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    shadowColor: "#CE82FF",
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
    color: "#AFAFAF",
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
    backgroundColor: "#FF9600",
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
    borderColor: "#FF7EB3",
    borderLeftColor: "#E5E5E5",
    borderTopColor: "#E5E5E5",
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
    borderRightColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "-45deg" }],
  },
  bigCheckButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#CE82FF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#CE82FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },

  bigCheckLabel: {
    marginTop: 15,
    fontSize: 14,
    fontWeight: "900",
    color: "#AFAFAF",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
