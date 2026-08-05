import { FontAwesome5 } from "@expo/vector-icons";
import { doc, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  const [selectedPlan, setSelectedPlan] = useState<
    "mensal" | "trimestral" | "anual"
  >("trimestral");
  const [isProcessing, setIsProcessing] = useState(false);

  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
      // 1. Simula o tempo do Gateway (Apple/Google Pay)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 2. Injeta o Premium no Banco usando setDoc para evitar "No document to update"
      const userId = auth.currentUser?.uid;
      if (userId) {
        await setDoc(
          doc(db, "users", userId),
          { isPremium: true },
          { merge: true },
        );
      }

      // 3. Joga o usuário direto pra Home
      navigation.navigate("Home");
    } catch (error) {
      console.error("Erro na simulação do pagamento", error);
      setIsProcessing(false);
    }
  };

  const features = [
    {
      icon: "map-marked-alt",
      title: "Trilha Completa de 90 Dias",
      desc: "Desafios guiados passo a passo para reacender a conexão do casal.",
    },
    {
      icon: "user-plus",
      title: "Inclusão do Parceiro(a) Grátis",
      desc: "Sua assinatura já cobre a conexão da dupla, sem custos extras.",
    },
    {
      icon: "star",
      title: "Missões Práticas do Cupido",
      desc: "Desafios semanais extras para quebrar a rotina e inovar.",
    },
    {
      icon: "shield-alt",
      title: "Sinal Verde Imediato",
      desc: "Libere o Modo Casal e inicie a trilha agora mesmo.",
    },
  ];

  const plans = [
    {
      id: "mensal",
      name: "Mensal",
      desc: "Renovação mês a mês",
      price: "19,90",
      period: "/mês",
    },
    {
      id: "trimestral",
      name: "Jornada 90 Dias",
      desc: "O tempo exato da trilha",
      price: "49,90",
      period: "/trimestre",
      highlight: "RECOMENDADO",
    },
    {
      id: "anual",
      name: "Anual",
      desc: "Proteção a longo prazo",
      price: "199,90",
      period: "/ano",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
          disabled={isProcessing}
        >
          <FontAwesome5 name="times" size={24} color="#1A2F3B" />
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
            <FontAwesome5 name="heartbeat" size={40} color="#4BDE95" />
          </View>

          <Text style={styles.heroTitle}>
            O Plano de Resgate da Sua Relação
          </Text>
          <Text style={styles.heroSub}>
            Com base no seu diagnóstico, estruturamos o caminho exato para
            reacender a paixão e blindar a sua família contra qualquer crise.
          </Text>

          {/* 🔥 PLANOS AGORA ESTÃO AQUI EM CIMA */}
          <View style={styles.plansWrapper}>
            {plans.map((plan) => {
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

          {/* 🔥 GARANTIA DE TEMPO: VERDE SEGURANÇA */}
          <View style={styles.guaranteeBox}>
            <View style={styles.guaranteeHeader}>
              <FontAwesome5 name="shield-alt" size={16} color="#4BDE95" />
              <Text style={styles.guaranteeTitle}>
                Seu tempo está protegido!
              </Text>
            </View>
            <Text style={styles.priceSub}>
              O período da Jornada de 90 dias{" "}
              <Text style={{ fontWeight: "bold", color: "#1A2F3B" }}>
                só começa a contar a partir da sua primeira tarefa concluída.
              </Text>{" "}
              Caso precise de mais tempo, a assinatura será ajustada
              automaticamente para R$ 19,90/mês após os 90 dias para você
              continuar no seu ritmo.
            </Text>
          </View>

          {/* 🔥 LISTA DE BENEFÍCIOS */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresSectionTitle}>
              O que está incluso no Premium?
            </Text>
            {features.map((feat, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIconBg}>
                  <FontAwesome5 name={feat.icon} size={20} color="#1A2F3B" />
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
            <ActivityIndicator size="small" color="#1A2F3B" />
          ) : (
            <>
              <FontAwesome5 name="star" solid size={18} color="#1A2F3B" />
              <Text style={styles.ctaButtonText}>
                Assinar Plano{" "}
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
  container: { flex: 1, backgroundColor: "#F0F4F8" }, // Azul-Cinza Suave
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: "flex-end",
  },
  closeBtn: { padding: 10 },

  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: "center",
  },

  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F4F1", // Verde Menta Suave
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
    fontWeight: "900",
    color: "#1A2F3B",
    textAlign: "center",
    lineHeight: 34,
    marginBottom: 15,
  },
  heroSub: {
    fontSize: 15,
    color: "#60646C",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 25,
    paddingHorizontal: 5,
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
    backgroundColor: "#FFF", // Branco para contraste
    borderWidth: 2,
    borderColor: "#D1D9E0",
    borderRadius: 16,
    padding: 20,
    position: "relative",
  },
  planCardSelected: {
    borderColor: "#E5A93C", // Borda Ouro Suave
    backgroundColor: "#FFFDF5", // Levissímo tom quente
    shadowColor: "#E5A93C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeContainer: {
    position: "absolute",
    top: -10,
    left: 20,
    backgroundColor: "#E5A93C",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: "#1A2F3B", // Texto Azul-Petróleo para Contraste AAA
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A2F3B",
    marginBottom: 4,
  },
  planDesc: {
    fontSize: 13,
    color: "#60646C",
  },
  planPriceBox: {
    alignItems: "flex-end",
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1A2F3B",
  },
  planPeriod: {
    fontSize: 12,
    color: "#60646C",
    fontWeight: "bold",
  },

  guaranteeBox: {
    backgroundColor: "#E8F4F1", // Fundo Menta calmante
    padding: 18,
    borderRadius: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#4BDE95", // Borda Verde Sucesso
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
    fontWeight: "bold",
    color: "#1A2F3B",
    textTransform: "uppercase",
  },
  priceSub: {
    fontSize: 13,
    color: "#2C3E50",
    textAlign: "center",
    lineHeight: 20,
  },

  featuresContainer: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    marginTop: 30,
    borderWidth: 1,
    borderColor: "#D1D9E0",
  },
  featuresSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#60646C",
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  featureItem: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  featureIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  featureTextContainer: { flex: 1 },
  featureTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A2F3B",
    marginBottom: 4,
  },
  featureDesc: { fontSize: 13, color: "#60646C", lineHeight: 18 },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    paddingTop: 10,
    backgroundColor: "#F0F4F8", // Acompanha o fundo geral
  },
  ctaButton: {
    flexDirection: "row",
    backgroundColor: "#E5A93C", // Ouro Suave Premium
    paddingVertical: 20,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    shadowColor: "#E5A93C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 15,
  },
  ctaButtonText: {
    color: "#1A2F3B", // Texto Azul-Petróleo para Leitura Perfeita
    fontSize: 17,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  guaranteeText: {
    textAlign: "center",
    color: "#60646C",
    fontSize: 12,
    fontWeight: "600",
  },
});
