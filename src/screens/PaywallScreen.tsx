import { FontAwesome5 } from "@expo/vector-icons";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../config/firebase";

const { width } = Dimensions.get("window");

export default function PaywallScreen({ navigation }: any) {
  // Modalidade de plano: 'duo' (Casal - 2 Acessos) ou 'individual' (1 Acesso)
  const [planCategory, setPlanCategory] = useState<"duo" | "individual">("duo");

  // Período selecionado
  const [selectedPlan, setSelectedPlan] = useState<
    "mensal" | "trimestral" | "anual"
  >("trimestral");

  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPartner, setHasPartner] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Busca dados do usuário para identificar se ele já possui um Match
  useEffect(() => {
    const fetchUserData = async () => {
      const currentUid = auth.currentUser?.uid;
      if (currentUid) {
        try {
          const userSnap = await getDoc(doc(db, "users", currentUid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.partnerId) {
              setHasPartner(true);
              setPartnerId(data.partnerId);
              setPlanCategory("duo"); // Se já tem parceiro, trava a modalidade no Duo
            }
          }
        } catch (error) {
          console.error("Erro ao carregar dados do usuário no Paywall:", error);
        }
      }
    };

    fetchUserData();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSubscribe = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const currentUid = auth.currentUser?.uid;

      if (!currentUid) {
        Alert.alert("Erro", "Você não está conectado no momento.");
        setIsProcessing(false);
        return;
      }

      // 🛠️ MODO DE TESTE (SIMULADOR DE COMPRA)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const payloadToSave = {
        isPremium: true,
        planSelected: selectedPlan,
        planCategory: planCategory,
        isSoloMode: planCategory === "individual",
      };

      // 1. Atualiza a conta de quem efetuou a compra
      await setDoc(doc(db, "users", currentUid), payloadToSave, {
        merge: true,
      });

      // 2. Se for plano Duo e o usuário tiver um parceiro conectado, libera a conta dele também!
      if (planCategory === "duo" && partnerId) {
        await setDoc(doc(db, "users", partnerId), payloadToSave, {
          merge: true,
        });
      }

      Alert.alert(
        "Sucesso! 🎉",
        planCategory === "duo"
          ? "Assinatura Casal Duo confirmada! A jornada da dupla foi liberada."
          : "Assinatura Individual confirmada! Seu acesso foi liberado.",
      );

      // Redireciona com segurança para a aba 'Home'
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "MainTabs",
            params: { screen: "Home" },
          },
        ],
      });
    } catch (error: any) {
      Alert.alert("Erro na Compra", "Falha ao liberar a conta de teste.");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const featuresDuo = [
    {
      icon: "users",
      title: "1 Assinatura Cobre 2 Pessoas",
      desc: "Você e seu amor conectados sem precisar pagar dois acessos.",
    },
    {
      icon: "map-marked-alt",
      title: "Trilha Sincronizada de 90 Dias",
      desc: "Desafios em tempo real para blindar e resgatar o relacionamento.",
    },
    {
      icon: "heart",
      title: "Desafios de Ouro do Casal",
      desc: "Missões bônus nos fins de semana para sair da rotina.",
    },
  ];

  const featuresIndividual = [
    {
      icon: "user",
      title: "Acesso Individual (Modo Solo)",
      desc: "Para quem quer iniciar a jornada de autocuidado primeiro.",
    },
    {
      icon: "map-marked-alt",
      title: "Trilha de 90 Dias Unilateral",
      desc: "Missões focadas em postura, escuta ativa e mudança pessoal.",
    },
  ];

  const duoPlans = [
    {
      id: "mensal",
      name: "Duo Mensal",
      desc: "R$ 19,90/mês para o casal",
      price: "19,90",
      period: "/mês",
    },
    {
      id: "trimestral",
      name: "Jornada 90 Dias",
      desc: "R$ 16,60/mês (Total R$ 49,90)",
      price: "49,90",
      period: "/trimestre",
      highlight: "RECOMENDADO (CASAL)",
    },
    {
      id: "anual",
      name: "Duo Anual",
      desc: "R$ 14,99/mês (Total R$ 179,90)",
      price: "179,90",
      period: "/ano",
    },
  ];

  const individualPlans = [
    {
      id: "mensal",
      name: "Individual Mensal",
      desc: "Renovação mês a mês",
      price: "14,90",
      period: "/mês",
    },
    {
      id: "trimestral",
      name: "Trimestral Solo",
      desc: "R$ 13,30/mês (Total R$ 39,90)",
      price: "39,90",
      period: "/trimestre",
      highlight: "MELHOR VALOR SOLO",
    },
    {
      id: "anual",
      name: "Anual Solo",
      desc: "R$ 10,82/mês (Total R$ 129,90)",
      price: "129,90",
      period: "/ano",
    },
  ];

  const activePlans = planCategory === "duo" ? duoPlans : individualPlans;
  const activeFeatures =
    planCategory === "duo" ? featuresDuo : featuresIndividual;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
          disabled={isProcessing}
        >
          <FontAwesome5 name="times" size={24} color="#202D3A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            alignItems: "center",
            width: "100%",
          }}
        >
          <View style={styles.iconWrapper}>
            <FontAwesome5 name="heartbeat" size={40} color="#67D4A8" />
          </View>

          <Text style={styles.heroTitle}>
            O Plano de Resgate da Sua Relação
          </Text>
          <Text style={styles.heroSub}>
            Escolha como prefere iniciar. Lembre-se: no Plano Duo, uma única
            assinatura libera o aplicativo para os dois!
          </Text>

          {/* CHAVE SELETORA: CASAL DUO VS INDIVIDUAL (Se não tiver parceiro fixado) */}
          {!hasPartner && (
            <View style={styles.categoryToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.categoryToggleBtn,
                  planCategory === "duo" && styles.categoryToggleBtnActive,
                ]}
                onPress={() => setPlanCategory("duo")}
              >
                <FontAwesome5
                  name="user-friends"
                  size={14}
                  color={planCategory === "duo" ? "#202D3A" : "#60646C"}
                />
                <Text
                  style={[
                    styles.categoryToggleText,
                    planCategory === "duo" && styles.categoryToggleTextActive,
                  ]}
                >
                  Casal Duo (2 Acessos)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryToggleBtn,
                  planCategory === "individual" &&
                    styles.categoryToggleBtnActive,
                ]}
                onPress={() => setPlanCategory("individual")}
              >
                <FontAwesome5
                  name="user"
                  size={14}
                  color={planCategory === "individual" ? "#202D3A" : "#60646C"}
                />
                <Text
                  style={[
                    styles.categoryToggleText,
                    planCategory === "individual" &&
                      styles.categoryToggleTextActive,
                  ]}
                >
                  Individual Solo
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {hasPartner && (
            <View style={styles.partnerNoticeBox}>
              <FontAwesome5 name="heart" solid size={16} color="#67D4A8" />
              <Text style={styles.partnerNoticeText}>
                Vocês já estão conectados! Apenas uma assinatura Duo libera o
                acesso dos dois.
              </Text>
            </View>
          )}

          {/* LISTA DE CARDS DE PLANOS */}
          <View style={styles.plansWrapper}>
            {activePlans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    isSelected && styles.planCardSelected,
                  ]}
                  activeOpacity={0.9}
                  onPress={() => setSelectedPlan(plan.id as any)}
                  disabled={isProcessing}
                >
                  {plan.highlight && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>{plan.highlight}</Text>
                    </View>
                  )}

                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planDesc}>{plan.desc}</Text>
                  </View>

                  <View style={styles.planPriceBox}>
                    <Text style={styles.planPrice}>R$ {plan.price}</Text>
                    <Text style={styles.planPeriod}>{plan.period}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* BOX DE GARANTIA E REGRAS */}
          <View style={styles.guaranteeBox}>
            <View style={styles.guaranteeHeader}>
              <FontAwesome5 name="shield-alt" size={16} color="#67D4A8" />
              <Text style={styles.guaranteeTitle}>
                Seu tempo está protegido!
              </Text>
            </View>
            <Text style={styles.priceSub}>
              A Jornada de 90 dias{" "}
              <Text
                style={{ fontFamily: "Montserrat_700Bold", color: "#202D3A" }}
              >
                só começa a contar a partir da sua primeira tarefa.
              </Text>{" "}
              {planCategory === "duo"
                ? "Sua assinatura cobre você e seu parceiro(a) sem taxas adicionais."
                : "Você pode atualizar para o Plano Duo a qualquer momento."}
            </Text>
          </View>

          {/* O QUE ESTÁ INCLUSO */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresSectionTitle}>
              O que está incluso no{" "}
              {planCategory === "duo" ? "Plano Duo" : "Plano Solo"}?
            </Text>
            {activeFeatures.map((feat, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIconBg}>
                  <FontAwesome5 name={feat.icon} size={20} color="#202D3A" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>{feat.title}</Text>
                  <Text style={styles.featureDesc}>{feat.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.ctaButton, isProcessing && { opacity: 0.8 }]}
          activeOpacity={0.9}
          onPress={handleSubscribe}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#202D3A" />
          ) : (
            <>
              <FontAwesome5 name="star" solid size={18} color="#202D3A" />
              <Text style={styles.ctaButtonText}>
                Assinar Plano {planCategory === "duo" ? "Duo" : "Solo"}{" "}
                {selectedPlan === "mensal"
                  ? "Mensal"
                  : selectedPlan === "trimestral"
                    ? "Trimestral"
                    : "Anual"}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.guaranteeText}>
          <FontAwesome5 name="lock" size={10} color="#60646C" /> Ambiente de
          Pagamento 100% Seguro
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: "flex-end",
  },
  closeBtn: { padding: 10 },

  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    alignItems: "center",
  },

  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F4F1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    textAlign: "center",
    lineHeight: 34,
    marginBottom: 10,
  },
  heroSub: {
    fontSize: 14,
    color: "#60646C",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 5,
    fontFamily: "Montserrat_400Regular",
  },

  // CHAVE SELETORA
  categoryToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    padding: 4,
    width: "100%",
    marginBottom: 20,
  },
  categoryToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  categoryToggleBtnActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryToggleText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    color: "#60646C",
  },
  categoryToggleTextActive: {
    color: "#202D3A",
  },

  partnerNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F4F1",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#67D4A8",
    gap: 10,
    marginBottom: 20,
    width: "100%",
  },
  partnerNoticeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
    lineHeight: 18,
  },

  plansWrapper: {
    width: "100%",
    marginBottom: 20,
    gap: 12,
  },
  planCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#D1D9E0",
    borderRadius: 16,
    padding: 20,
    position: "relative",
  },
  planCardSelected: {
    borderColor: "#EAB64A",
    backgroundColor: "#FFFDF5",
    shadowColor: "#EAB64A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeContainer: {
    position: "absolute",
    top: -10,
    left: 20,
    backgroundColor: "#EAB64A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: "#202D3A",
    fontSize: 10,
    fontFamily: "Montserrat_900Black",
    letterSpacing: 1,
  },
  planInfo: { flex: 1 },
  planName: {
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
    marginBottom: 4,
  },
  planDesc: {
    fontSize: 13,
    color: "#60646C",
    fontFamily: "Montserrat_400Regular",
  },
  planPriceBox: { alignItems: "flex-end" },
  planPrice: {
    fontSize: 20,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
  },
  planPeriod: {
    fontSize: 12,
    color: "#60646C",
    fontFamily: "Montserrat_700Bold",
  },

  guaranteeBox: {
    backgroundColor: "#E8F4F1",
    padding: 18,
    borderRadius: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#67D4A8",
  },
  guaranteeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    gap: 8,
  },
  guaranteeTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
    textTransform: "uppercase",
  },
  priceSub: {
    fontSize: 13,
    color: "#2C3E50",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "Montserrat_400Regular",
  },

  featuresContainer: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    marginTop: 25,
    borderWidth: 1,
    borderColor: "#D1D9E0",
  },
  featuresSectionTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    color: "#60646C",
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  featureItem: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  featureIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  featureTextContainer: { flex: 1 },
  featureTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: "#60646C",
    lineHeight: 16,
    fontFamily: "Montserrat_400Regular",
  },

  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 30,
    backgroundColor: "#F0F4F8",
    borderTopWidth: 1,
    borderTopColor: "#D1D9E0",
  },
  ctaButton: {
    flexDirection: "row",
    backgroundColor: "#EAB64A",
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    shadowColor: "#EAB64A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 12,
  },
  ctaButtonText: {
    color: "#202D3A",
    fontSize: 16,
    fontFamily: "Montserrat_900Black",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  guaranteeText: {
    textAlign: "center",
    color: "#60646C",
    fontSize: 12,
    fontFamily: "Montserrat_600SemiBold",
  },
});
