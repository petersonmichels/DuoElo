import { FontAwesome5 } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// 🔥 IMPORTAÇÃO CORRETA E MODERNA DO SAFE AREA
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function MissionRewardScreen({ navigation, route }: any) {
  const earnedPE = route?.params?.earnedPE || 50;
  const currentDay90 = route?.params?.currentDay90 || 1;
  const cupidProgress = route?.params?.cupidProgress || 1;
  const cupidTotal = 3;

  const isCupidAwake = cupidProgress >= cupidTotal;
  const cupidPercentage = Math.min((cupidProgress / cupidTotal) * 100, 100);

  const bar1Anim = useRef(new Animated.Value(0)).current;
  const bar2Anim = useRef(new Animated.Value(0)).current;
  const bar3Anim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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

  // 🔥 NAVEGAÇÃO AJUSTADA PARA MainTabs -> Home
  const handleContinue = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: "MainTabs",
          params: { screen: "Home" },
        },
      ],
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
          {/* 🔥 TÍTULO COM O NOVO TERMO */}
          <Text style={styles.heroTitle}>+{earnedPE} Bonds!</Text>

          <View style={styles.card}>
            <View style={styles.missionItem}>
              <Text style={styles.missionLabel}>Missão Diária Concluída</Text>
              <View style={styles.progressRow}>
                <View style={styles.progressBarBg}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      { width: bar1Width, backgroundColor: "#67D4A8" },
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
                  <FontAwesome5 name="gift" solid size={24} color="#67D4A8" />
                </Animated.View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.missionItem}>
              <Text style={styles.missionLabel}>Ofensiva Mantida</Text>
              <View style={styles.progressRow}>
                <View style={styles.progressBarBg}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      { width: bar2Width, backgroundColor: "#EAB64A" },
                    ]}
                  />
                  <Text style={[styles.progressTextOver, { color: "#202D3A" }]}>
                    1 / 1
                  </Text>
                </View>
                <Animated.View
                  style={[
                    styles.iconContainer,
                    { transform: [{ scale: popAnim }] },
                  ]}
                >
                  <FontAwesome5 name="fire" solid size={24} color="#EAB64A" />
                </Animated.View>
              </View>
            </View>

            <View style={styles.divider} />

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
                      { width: bar3Width, backgroundColor: "#202D3A" },
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
                    name={isCupidAwake ? "infinity" : "box"}
                    solid
                    size={24}
                    color={isCupidAwake ? "#EAB64A" : "#202D3A"}
                  />
                </Animated.View>
              </View>
            </View>
          </View>

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
              <FontAwesome5 name="trophy" solid size={30} color="#EAB64A" />
            </Animated.View>
          </View>
        </Animated.View>
      </ScrollView>

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
    backgroundColor: "#F0F4F8",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 120,
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "Montserrat_900Black",
    color: "#67D4A8",
    marginBottom: 25,
    textAlign: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D9E0",
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
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 6,
  },
  missionSubLabel: {
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
    color: "#60646C",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 24,
    backgroundColor: "#F0F4F8",
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
    fontFamily: "Montserrat_900Black",
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
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
    marginBottom: 5,
  },
  badgeProgressText: {
    fontSize: 16,
    fontFamily: "Montserrat_900Black",
    color: "#67D4A8",
  },
  badgeIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#EAB64A",
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
    backgroundColor: "#202D3A",
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#202D3A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Montserrat_900Black",
    letterSpacing: 1.5,
  },
});
