import { FontAwesome5 } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../config/firebase";

import { t } from "../i18n/translations";
import { logAuditEvent } from "../services/auditService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// 📳 Carregamento seguro do Haptics
let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch (e) {}

// 🎊 PARTÍCULAS DA EXPLOSÃO DE AMOR / ENERGIA (60 FPS NATIVO)
const EXPLOSION_COLORS = ["#EAB64A", "#67D4A8", "#202D3A", "#D96C6C", "#FFF"];

const LoveExplosionParticle = ({ index }: { index: number }) => {
  const anim = useRef(new Animated.Value(0)).current;

  const color = EXPLOSION_COLORS[index % EXPLOSION_COLORS.length];
  const angle = useRef((index / 16) * 2 * Math.PI).current;
  const distance = useRef(75 + Math.random() * 95).current;

  const targetX = useRef(Math.cos(angle) * distance).current;
  const targetY = useRef(Math.sin(angle) * distance).current;
  const size = useRef(10 + Math.random() * 8).current;
  const isHeart = index % 2 === 0;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 1000 + Math.random() * 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, targetX],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, targetY],
  });

  const scale = anim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.2, 1.4, 0],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 1, 0],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        transform: [{ translateX }, { translateY }, { scale }],
        opacity,
        pointerEvents: "none",
      }}
    >
      {isHeart ? (
        <FontAwesome5 name="heart" solid size={size} color={color} />
      ) : (
        <FontAwesome5 name="star" solid size={size * 0.8} color={color} />
      )}
    </Animated.View>
  );
};

export default function MissionRewardScreen({ navigation, route }: any) {
  // Tratamento seguro de parâmetros numéricos
  const earnedPE = Number(route?.params?.earnedPE) || 50;
  const currentDay90 = Number(route?.params?.currentDay90) || 1;
  const rawCupidProgress = Number(route?.params?.cupidProgress) || 1;
  
  // 🎯 LIMITAÇÃO MÁXIMA DE 3 NO CUPIDO
  const cupidProgress = Math.min(3, Math.max(1, rawCupidProgress));
  const cupidTotal = 3;

  // Idioma do usuário (padrão pt-BR)
  const [userLang, setUserLang] = useState("pt-BR");
  const [userData, setUserData] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [hasExploded, setHasExploded] = useState(false);

  const isCupidAwake = cupidProgress >= cupidTotal;
  const cupidPercentage = Math.min((cupidProgress / cupidTotal) * 100, 100);

  // 🎬 ANIMAÇÕES ORIGINAIS DE BARRA DE PROGRESSO
  const bar1Anim = useRef(new Animated.Value(0)).current;
  const bar2Anim = useRef(new Animated.Value(0)).current;
  const bar3Anim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(0)).current;

  // 💥 ANIMAÇÃO DE TRAJETÓRIA DIRETA DOS LADOS OPOSTOS PARA O CENTRO
  const leftAvatarAnim = useRef(new Animated.Value(-SCREEN_WIDTH * 0.8)).current;
  const rightAvatarAnim = useRef(new Animated.Value(SCREEN_WIDTH * 0.8)).current;
  const centerScaleAnim = useRef(new Animated.Value(1)).current;

  const triggerHaptic = (
    type: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light"
  ) => {
    if (!Haptics) return;
    try {
      if (type === "success")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === "heavy")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (type === "light")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserData(data);
            if (data.language) {
              setUserLang(data.language);
            }

            if (data.partnerId) {
              const pSnap = await getDoc(doc(db, "users", data.partnerId));
              if (pSnap.exists()) {
                setPartnerData(pSnap.data());
              }
            }
          }

          // 📜 REGISTRO DE AUDITORIA DE RECOMPENSA RESGATADA
          await logAuditEvent(
            uid,
            "GIFT_REDEEMED",
            `Recompensa de missão resgatada: +${earnedPE} Bonds`,
            userLang
          );
        } catch (e) {
          console.log("Erro ao carregar dados na tela de recompensa:", e);
        }
      }
    };

    fetchUserData();

    // 🚀 CORRIDA DAS FOTOS DE MARGENS OPOSTAS EM DIREÇÃO AO CENTRO
    Animated.parallel([
      Animated.timing(leftAvatarAnim, {
        toValue: 0,
        duration: 650,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(rightAvatarAnim, {
        toValue: 0,
        duration: 650,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 💥 CHOQUE NO CENTRO + VIBRAÇÃO FÍSICA + EXPLOSÃO VISUAL
      setHasExploded(true);
      triggerHaptic("heavy");

      Animated.sequence([
        Animated.timing(centerScaleAnim, {
          toValue: 1.3,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(centerScaleAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Entradas suaves de tela
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

    // Animação escalonada das barras de progresso (Gamificação)
    const timeout = setTimeout(() => {
      Animated.stagger(250, [
        Animated.timing(bar1Anim, {
          toValue: 100,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(bar2Anim, {
          toValue: 100,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(bar3Anim, {
          toValue: cupidPercentage,
          duration: 700,
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
    }, 400);

    return () => clearTimeout(timeout);
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

  const handleContinue = () => {
    triggerHaptic("light");
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

  const isSolo = !userData?.partnerId || userData?.isSoloMode;
  const myPhoto = userData?.photoURL || userData?.avatarUrl;
  const partnerPhoto = partnerData?.photoURL || partnerData?.avatarUrl;

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
          <Text style={styles.heroTitle}>+{earnedPE} Bonds!</Text>

          {/* 🏆 ENCONTRO DAS FOTOS CORRENDO DE LADOS OPOSTOS */}
          <View style={styles.avatarsCollisionWrapper}>
            {hasExploded && (
              <View style={styles.explosionCenterEmitter}>
                {Array.from({ length: 22 }).map((_, i) => (
                  <LoveExplosionParticle key={i} index={i} />
                ))}
              </View>
            )}

            {/* FOTO DO USUÁRIO (Vem da Esquerda) */}
            <Animated.View
              style={[
                styles.avatarFrame,
                { transform: [{ translateX: leftAvatarAnim }, { scale: centerScaleAnim }] },
              ]}
            >
              {myPhoto ? (
                <Image source={{ uri: myPhoto }} style={styles.avatarImage} />
              ) : (
                <FontAwesome5 name="user" size={30} color="#202D3A" />
              )}
            </Animated.View>

            {/* FOTO DO PARCEIRO OU LOGO DUOELO NO SOLO (Vem da Direita) */}
            <Animated.View
              style={[
                styles.avatarFrame,
                isSolo && styles.logoFrameSolo,
                { transform: [{ translateX: rightAvatarAnim }, { scale: centerScaleAnim }] },
              ]}
            >
              {isSolo ? (
                <Image
                  source={require("../assets/duoelo_brand_logo.png")}
                  style={styles.logoImageSolo}
                  resizeMode="contain"
                />
              ) : partnerPhoto ? (
                <Image source={{ uri: partnerPhoto }} style={styles.avatarImage} />
              ) : (
                <FontAwesome5 name="heart" solid size={30} color="#EAB64A" />
              )}
            </Animated.View>
          </View>

          <View style={styles.card}>
            {/* MISSÃO DIÁRIA */}
            <View style={styles.missionItem}>
              <Text style={styles.missionLabel}>
                {t("daily_mission_completed_label", userLang)}
              </Text>
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

            {/* OFENSIVA / STREAK */}
            <View style={styles.missionItem}>
              <Text style={styles.missionLabel}>
                {t("streak_maintained_label", userLang)}
              </Text>
              <View style={styles.progressRow}>
                <View style={styles.progressBarBg}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      { width: bar2Width, backgroundColor: "#EAB64A" },
                    ]}
                  />
                  <Text style={[styles.progressTextOver, { color: "#202D3A" }]}>
                    {userData?.streak || 1} / {userData?.streak || 1}
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

            {/* CUPIDO / DESAFIO SEMANAL */}
            <View style={styles.missionItem}>
              <Text style={styles.missionLabel}>
                {isCupidAwake
                  ? t("cupid_awake_title", userLang)
                  : t("cupid_asleep_title", userLang)}
                {"\n"}
                <Text style={styles.missionSubLabel}>
                  {isCupidAwake
                    ? t("cupid_awake_sub", userLang)
                    : t("cupid_asleep_sub", userLang)}
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

          {/* CARD DE JORNADA */}
          <View style={[styles.card, styles.badgeCard]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.badgeTitle}>
                {t("journey_90_days_title", userLang)}
              </Text>
              <Text style={styles.badgeProgressText}>
                {t("day_counter_text", userLang, {
                  day: currentDay90,
                  total: 90,
                })}
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

      {/* BOTÃO FIXO DE CONTINUAR */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.8}
          onPress={handleContinue}
        >
          <Text style={styles.continueBtnText}>
            {t("btn_continue_label", userLang)}
          </Text>
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
    paddingTop: 30,
    paddingBottom: 120,
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: "Montserrat_900Black",
    color: "#67D4A8",
    marginBottom: 15,
    textAlign: "center",
  },
  avatarsCollisionWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    height: 90,
    width: "100%",
    marginBottom: 20,
  },
  explosionCenterEmitter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99,
  },
  avatarFrame: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#EAB64A",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
    marginHorizontal: -8, // Encontro perfeito com sobreposição suave
  },
  logoFrameSolo: {
    borderColor: "#202D3A",
    backgroundColor: "#202D3A",
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  logoImageSolo: {
    width: 42,
    height: 42,
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