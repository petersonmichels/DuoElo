import { FontAwesome5 } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

export default function PaywallScreen({ navigation }: any) {
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

  const features = [
    {
      icon: "map-marked-alt",
      title: "Acesso Vitalício à Jornada",
      desc: "90 dias de desafios guiados passo a passo para reacender a conexão.",
    },
    {
      icon: "infinity",
      title: "Clube de Manutenção",
      desc: "Novos minicursos semanais e reavaliações contínuas da relação.",
    },
    {
      icon: "user-plus",
      title: "Inclusão do Parceiro(a) Grátis",
      desc: "Sua assinatura já cobre a conexão da dupla, sem custos extras.",
    },
    {
      icon: "shield-alt",
      title: "Blindagem Familiar",
      desc: "Exercícios baseados nos 9 Pilares para proteger o futuro de vocês.",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome5 name="times" size={24} color="#AFAFAF" />
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
            <FontAwesome5 name="heartbeat" size={40} color="#FF7EB3" />
          </View>

          <Text style={styles.heroTitle}>
            O Plano de Resgate da Sua Relação
          </Text>
          <Text style={styles.heroSub}>
            Com base no seu diagnóstico, estruturamos o caminho exato para
            reacender a paixão e blindar a sua família contra qualquer crise.
          </Text>

          <View style={styles.featuresContainer}>
            {features.map((feat, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIconBg}>
                  <FontAwesome5 name={feat.icon} size={20} color="#CE82FF" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>{feat.title}</Text>
                  <Text style={styles.featureDesc}>{feat.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* 🔥 CAIXA DE PREÇO ESTRATÉGICA (TRIPWIRE + MRR) */}
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>
              COMBO: JORNADA 90 DIAS + CLUBE
            </Text>

            <View style={styles.priceRow}>
              <Text style={styles.pricePrefix}>Adesão Única</Text>
              <Text style={styles.priceCurrency}>R$</Text>
              <Text style={styles.priceValue}>99</Text>
            </View>

            <View style={styles.mrrRow}>
              <FontAwesome5 name="plus" size={12} color="#AFAFAF" />
              <Text style={styles.mrrText}>R$ 9,90 / mês</Text>
            </View>

            <View style={styles.guaranteeBox}>
              <Text style={styles.priceSub}>
                Cancele a mensalidade quando quiser. A Jornada de 90 Dias
                continuará sendo sua{" "}
                <Text style={{ fontWeight: "bold", color: "#333" }}>
                  para sempre
                </Text>
                .
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("PaymentSuccess")}
        >
          <FontAwesome5 name="shield-alt" size={20} color="#FFF" />
          <Text style={styles.ctaButtonText}>Resgatar Nossa Conexão</Text>
        </TouchableOpacity>
        <Text style={styles.guaranteeText}>
          <FontAwesome5 name="lock" size={10} color="#AFAFAF" /> Ambiente de
          Pagamento 100% Seguro
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
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
    backgroundColor: "#FFF0F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#2C3E50",
    textAlign: "center",
    lineHeight: 36,
    marginBottom: 15,
  },
  heroSub: {
    fontSize: 15,
    color: "#7F8C8D",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 35,
    paddingHorizontal: 5,
  },

  featuresContainer: {
    width: "100%",
    backgroundColor: "#FAFAFA",
    borderRadius: 24,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  featureItem: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  featureIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F4E5FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  featureTextContainer: { flex: 1 },
  featureTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  featureDesc: { fontSize: 13, color: "#777", lineHeight: 18 },

  priceBox: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFF9E6",
    borderWidth: 2,
    borderColor: "#FFE273",
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FF9600",
    letterSpacing: 1.5,
    marginBottom: 12,
    textAlign: "center",
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  pricePrefix: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    marginRight: 8,
  },
  priceCurrency: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C3E50",
    marginRight: 4,
  },
  priceValue: {
    fontSize: 54,
    fontWeight: "900",
    color: "#2C3E50",
    lineHeight: 60,
  },

  mrrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -5,
    marginBottom: 15,
  },
  mrrText: { fontSize: 20, fontWeight: "800", color: "#CE82FF" },

  guaranteeBox: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    padding: 12,
    borderRadius: 12,
    width: "100%",
  },
  priceSub: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 18,
  },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    paddingTop: 10,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  ctaButton: {
    flexDirection: "row",
    backgroundColor: "#2C3E50",
    paddingVertical: 20,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 15,
  },
  ctaButtonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  guaranteeText: {
    textAlign: "center",
    color: "#AFAFAF",
    fontSize: 12,
    fontWeight: "600",
  },
});
