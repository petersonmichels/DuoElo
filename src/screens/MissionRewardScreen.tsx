import { FontAwesome5 } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
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

const { width } = Dimensions.get("window");

export default function MissionRewardScreen({ navigation, route }: any) {
  // 🔥 VARIÁVEIS DINÂMICAS DO JOGO
  const earnedPE = route?.params?.earnedPE || 50;
  const currentDay90 = route?.params?.currentDay90 || 14; // Dia atual do desafio de 90 dias
  const cupidProgress = route?.params?.cupidProgress || 2; // Quantas tarefas fez na semana
  const cupidTotal = 3; // Total necessário para o cupido da semana

  // 🔥 TRAVA DE SEGURANÇA: Garante que a barra nunca passe de 100% e quebre o layout
  const cupidPercentage = Math.min((cupidProgress / cupidTotal) * 100, 100);

  // Animações das barras de progresso
  const bar1Anim = useRef(new Animated.Value(0)).current;
  const bar2Anim = useRef(new Animated.Value(0)).current;
  const bar3Anim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Animação de entrada da tela
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Animação das barras enchendo dinamicamente
    setTimeout(() => {
      Animated.stagger(300, [
        Animated.timing(bar1Anim, {
          toValue: 100, // 100% (Missão concluída)
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(bar2Anim, {
          toValue: 100, // 100% (Ofensiva mantida)
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(bar3Anim, {
          toValue: cupidPercentage, // Enche baseado no progresso da semana
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    }, 500);
  }, [cupidPercentage]); // Adicionada a dependência para atualizar corretamente

  // Interpolações de largura para as barras animadas
  const bar1Width = bar1Anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });
  const bar2Width = bar2Anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });
  const bar3Width = bar3Anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideUpAnim }],
            width: "100%",
            alignItems: "center",
          }}
        >
          {/* TÍTULO PRINCIPAL */}
          <Text style={styles.heroTitle}>{earnedPE} Pontos de Elo!</Text>

          {/* CARD PRINCIPAL DE MISSÕES */}
          <View style={styles.card}>
            {/* ITEM 1: Missão Diária (PE) */}
            <View style={styles.missionItem}>
              <Text style={styles.missionLabel}>Ganhe {earnedPE} PE</Text>
              <View style={styles.progressRow}>
                <View style={styles.progressBarBg}>
                  <Animated.View
                    style={[styles.progressBarFill, { width: bar1Width }]}
                  />
                  <Text style={styles.progressTextOver}>
                    {earnedPE} / {earnedPE}
                  </Text>
                </View>
                <View style={styles.iconContainer}>
                  <FontAwesome5 name="gift" solid size={24} color="#FF9600" />
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* ITEM 2: Ofensiva */}
            <View style={styles.missionItem}>
              <Text style={styles.missionLabel}>Mantenha sua Ofensiva</Text>
              <View style={styles.progressRow}>
                <View style={styles.progressBarBg}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      { width: bar2Width, backgroundColor: "#FF9600" },
                    ]}
                  />
                  <Text style={styles.progressTextOver}>1 / 1</Text>
                </View>
                <View style={styles.iconContainer}>
                  <FontAwesome5 name="fire" solid size={24} color="#FF4B4B" />
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* ITEM 3: Baú do Cupido (Desafio Semanal) */}
            <View style={styles.missionItem}>
              <Text style={styles.missionLabel}>
                Desperte o Cupido da Semana{"\n"}
                <Text style={styles.missionSubLabel}>
                  (só conta tarefas dos 90 dias realizadas)
                </Text>
              </Text>
              <View style={styles.progressRow}>
                <View style={styles.progressBarBg}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      { width: bar3Width, backgroundColor: "#CE82FF" },
                    ]}
                  />
                  <Text style={[styles.progressTextOver, { color: "#FFF" }]}>
                    {cupidProgress} / {cupidTotal}
                  </Text>
                </View>
                <View style={[styles.iconContainer, { opacity: 0.5 }]}>
                  <FontAwesome5
                    name="box-open"
                    solid
                    size={24}
                    color="#CE82FF"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* CARD SECUNDÁRIO: JORNADA 90 DIAS */}
          <View style={[styles.card, styles.badgeCard]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.badgeTitle}>Jornada de 90 Dias</Text>
              <Text style={styles.badgeProgressText}>
                Dia {currentDay90} / 90
              </Text>
            </View>
            <View style={styles.badgeIconBg}>
              <FontAwesome5 name="trophy" solid size={30} color="#FFC800" />
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* BOTÃO FLUTUANTE */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.9}
          onPress={() => {
            navigation.navigate("Home");
          }}
        >
          <Text style={styles.continueBtnText}>CONTINUAR</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 120,
    alignItems: "center",
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#4BDE95",
    marginBottom: 25,
    textAlign: "center",
  },

  card: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    paddingVertical: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  missionItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  missionLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4B4B4B",
    marginBottom: 6,
  },
  missionSubLabel: {
    fontSize: 12,
    fontWeight: "normal",
    color: "#7F8C8D",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  progressBarBg: {
    flex: 1,
    height: 24,
    backgroundColor: "#E5E5E5",
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    position: "relative",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4BDE95",
    borderRadius: 12,
    position: "absolute",
    left: 0,
    top: 0,
  },
  progressTextOver: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    color: "#FFF",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  iconContainer: {
    marginLeft: 15,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginHorizontal: 20,
  },

  badgeCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  badgeTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#4B4B4B",
    marginBottom: 5,
  },
  badgeProgressText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#4BDE95",
  },
  badgeIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF9E6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFE273",
  },

  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 35,
    backgroundColor: "#FFF",
    borderTopWidth: 2,
    borderTopColor: "#E5E5E5",
  },
  continueBtn: {
    width: "100%",
    backgroundColor: "#1CB0F6",
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1CB0F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
    borderBottomWidth: 4,
    borderBottomColor: "#1899D6",
  },
  continueBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
});
