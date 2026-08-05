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
  const currentDay90 = route?.params?.currentDay90 || 1;
  const cupidProgress = route?.params?.cupidProgress || 1;
  const cupidTotal = 3;

  const isCupidAwake = cupidProgress >= cupidTotal;
  const cupidPercentage = Math.min((cupidProgress / cupidTotal) * 100, 100);

  // Animações das barras de progresso e ícones
  const bar1Anim = useRef(new Animated.Value(0)).current;
  const bar2Anim = useRef(new Animated.Value(0)).current;
  const bar3Anim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(0)).current;

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

    // 2. Animação das barras e do troféu enchendo dinamicamente
    setTimeout(() => {
      Animated.stagger(300, [
        Animated.timing(bar1Anim, {
          toValue: 100,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(bar2Anim, {
          toValue: 100,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(bar3Anim, {
          toValue: cupidPercentage,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.spring(popAnim, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }, 500);
  }, [cupidPercentage]);

  // Interpolações
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

  // Função segura para voltar à Home limpando a pilha de navegação
  const handleContinue = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  };

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
          {/* TÍTULO PRINCIPAL (Verde Cura) */}
          <Text style={styles.heroTitle}>+{earnedPE} Pontos PE!</Text>

          {/* CARD PRINCIPAL DE MISSÕES */}
          <View style={styles.card}>
            {/* ITEM 1: Missão Diária (PE) - Verde Esmeralda */}
            <View style={styles.missionItem}>
              <Text style={styles.missionLabel}>Missão Diária Concluída</Text>
              <View style={styles.progressRow}>
                <View style={styles.progressBarBg}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      { width: bar1Width, backgroundColor: "#4BDE95" },
                    ]}
                  />
                  <Text style={[styles.progressTextOver, { color: "#FFF" }]}>
                    {earnedPE} / {earnedPE}
                  </Text>
                </View>
                <Animated.View
                  style={[
                    styles.iconContainer,
                    { transform: [{ scale: popAnim }] },
                  ]}
                >
                  <FontAwesome5 name="gift" solid size={24} color="#4BDE95" />
                </Animated.View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* ITEM 2: Ofensiva - Ouro Suave (Sem vermelho) */}
            <View style={styles.missionItem}>
              <Text style={styles.missionLabel}>Ofensiva Mantida</Text>
              <View style={styles.progressRow}>
                <View style={styles.progressBarBg}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      { width: bar2Width, backgroundColor: "#E5A93C" },
                    ]}
                  />
                  {/* WCAG AA: Azul Escuro sobre Fundo Ouro */}
                  <Text style={[styles.progressTextOver, { color: "#1A2F3B" }]}>
                    1 / 1
                  </Text>
                </View>
                <Animated.View
                  style={[
                    styles.iconContainer,
                    { transform: [{ scale: popAnim }] },
                  ]}
                >
                  <FontAwesome5 name="fire" solid size={24} color="#E5A93C" />
                </Animated.View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* ITEM 3: Baú do Cupido (Desafio Semanal) - Azul Petróleo / Ouro */}
            <View style={styles.missionItem}>
              <Text style={styles.missionLabel}>
                {isCupidAwake
                  ? "Cupido Desperto! 🎉"
                  : "Desperte o Cupido da Semana"}
                {"\n"}
                <Text style={styles.missionSubLabel}>
                  {isCupidAwake
                    ? "Desafio prático liberado no mapa."
                    : "(Complete 3 missões na semana)"}
                </Text>
              </Text>
              <View style={styles.progressRow}>
                <View style={styles.progressBarBg}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      { width: bar3Width, backgroundColor: "#1A2F3B" },
                    ]}
                  />
                  <Text style={[styles.progressTextOver, { color: "#FFF" }]}>
                    {cupidProgress} / {cupidTotal}
                  </Text>
                </View>
                <Animated.View
                  style={[
                    styles.iconContainer,
                    {
                      opacity: isCupidAwake ? 1 : 0.4,
                      transform: [{ scale: popAnim }],
                    },
                  ]}
                >
                  <FontAwesome5
                    name={isCupidAwake ? "star" : "box"}
                    solid
                    size={24}
                    color={isCupidAwake ? "#E5A93C" : "#1A2F3B"}
                  />
                </Animated.View>
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
            <Animated.View
              style={[styles.badgeIconBg, { transform: [{ scale: popAnim }] }]}
            >
              <FontAwesome5 name="trophy" solid size={30} color="#E5A93C" />
            </Animated.View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* BOTÃO FLUTUANTE (Ancoragem Azul-Petróleo) */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.8}
          onPress={handleContinue}
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
    backgroundColor: "#F0F4F8", // Fundo Clínico Azul-Cinza
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
    color: "#4BDE95", // Sucesso
    marginBottom: 25,
    textAlign: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D9E0", // Borda Clínica
    paddingVertical: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  missionItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  missionLabel: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1A2F3B", // Texto Principal
    marginBottom: 6,
  },
  missionSubLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#60646C", // Texto Secundário
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 24,
    backgroundColor: "#F0F4F8", // Fundo da barra macio
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    position: "relative",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 12,
    position: "absolute",
    left: 0,
    top: 0,
  },
  progressTextOver: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 1,
  },
  iconContainer: {
    marginLeft: 15,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 2,
    backgroundColor: "#F0F4F8",
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
    color: "#1A2F3B",
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
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5A93C", // Borda Ouro
  },
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 35,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#D1D9E0",
  },
  continueBtn: {
    width: "100%",
    backgroundColor: "#1A2F3B", // Azul Petróleo (Ancoragem)
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1A2F3B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueBtnText: {
    color: "#FFF", // WCAG AAA
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
});
