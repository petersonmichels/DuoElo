import { FontAwesome5 } from "@expo/vector-icons";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../config/firebase";

export default function PaymentSuccessScreen({ navigation }: any) {
  const [status, setStatus] = useState<"processing" | "success">("processing");

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animação de pulsar durante o processamento
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Lógica do Pagamento FAKE (que injeta o Premium no banco de dados)
    const processPayment = async () => {
      try {
        // Simulando delay do gateway de pagamento (2.5 segundos)
        await new Promise((resolve) => setTimeout(resolve, 2500));

        const userId = auth.currentUser?.uid;
        if (userId) {
          // 🔥 MAGIA ACONTECENDO AQUI: O usuário vira Premium!
          await updateDoc(doc(db, "users", userId), {
            isPremium: true,
          });
        }

        // Transição para o Sucesso
        setStatus("success");
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(slideUpAnim, {
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
        ]).start();
      } catch (error) {
        console.error("Erro na simulação do pagamento", error);
      }
    };

    processPayment();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {status === "processing" ? (
        <View style={styles.centerContent}>
          <Animated.View
            style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}
          >
            <FontAwesome5 name="apple-pay" size={50} color="#2C3E50" />
          </Animated.View>
          <Text style={styles.processingTitle}>Processando pagamento...</Text>
          <Text style={styles.processingSub}>Ambiente seguro Apple/Google</Text>
        </View>
      ) : (
        <Animated.View
          style={[
            styles.centerContent,
            { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] },
          ]}
        >
          <View style={styles.successIconBg}>
            <FontAwesome5 name="check" size={50} color="#FFF" />
          </View>
          <Text style={styles.successTitle}>Pagamento Aprovado!</Text>
          <Text style={styles.successSub}>
            Sua Trilha de 90 Dias foi desbloqueada com sucesso. A transformação
            da sua relação começa agora.
          </Text>

          <TouchableOpacity
            style={styles.homeBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Home")} // Manda de volta pra Home que agora vai estar liberada!
          >
            <Text style={styles.homeBtnText}>Começar Minha Jornada</Text>
            <FontAwesome5 name="arrow-right" size={16} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  pulseCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  processingTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  processingSub: { fontSize: 14, color: "#AFAFAF" },

  successIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#4BDE95",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    shadowColor: "#4BDE95",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#2C3E50",
    marginBottom: 15,
    textAlign: "center",
  },
  successSub: {
    fontSize: 16,
    color: "#777",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },

  homeBtn: {
    flexDirection: "row",
    backgroundColor: "#CE82FF",
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: "center",
    gap: 10,
    shadowColor: "#CE82FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  homeBtnText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
});
