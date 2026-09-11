import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StatusBar, StyleSheet, Text, View } from "react-native";
import { t } from "../i18n/translations";

interface AppSplashScreenProps {
  onAnimationFinish?: () => void;
  userLanguage?: string;
  message?: string;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  onAnimationFinish,
  userLanguage = "pt-BR",
  message,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(-100)).current;

  const displayMessage =
    message ||
    (t("verifying_trail_status", userLanguage) === "verifying_trail_status"
      ? "Sincronizando sua jornada..."
      : t("verifying_trail_status", userLanguage) || "Sincronizando sua jornada...");

  useEffect(() => {
    // 🟢 Safety fallback: garante a liberação caso o callback seja necessário
    const autoFinishTimer = setTimeout(() => {
      if (onAnimationFinish) {
        onAnimationFinish();
      }
    }, 2000);

    // 🟢 Fade-in elegante da tela e entrada do card
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 🟢 Efeito "Heartbeat" sutil e constante
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
      ])
    );
    pulseLoop.start();

    // 🟢 Animação fluida da Barra de Progresso
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 140,
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    shimmerLoop.start();

    return () => {
      clearTimeout(autoFinishTimer);
      pulseLoop.stop();
      shimmerLoop.stop();
    };
  }, [onAnimationFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F4F8" />

      <Animated.View
        style={[
          styles.cardWrapper,
          {
            transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
          },
        ]}
      >
        <View style={styles.logoFrame}>
          <Image
            source={require("../../assets/duoelo_brand_logo.png")}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>

        {/* Nome do Produto Protegido contra Corte */}
        <Text style={styles.brandTitle} numberOfLines={1}>
          DuoElo
        </Text>

        <View style={styles.badgeRow}>
          <FontAwesome5 name="heartbeat" size={12} color="#67D4A8" />
          <Text style={styles.badgeText}>
            {t("connecting_links_sub", userLanguage) === "connecting_links_sub"
              ? "Conectando Elos"
              : t("connecting_links_sub", userLanguage) || "Conectando Elos"}
          </Text>
        </View>
      </Animated.View>

      <View style={styles.loaderFooter}>
        <Text style={styles.loadingMessage}>{displayMessage}</Text>
        
        <View style={styles.trackBar}>
          <Animated.View
            style={[
              styles.fillBar,
              {
                transform: [{ translateX: shimmerAnim }],
              },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
};

export default AppSplashScreen;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,    
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999999,
    elevation: 25,
  },
  cardWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logoFrame: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: "#202D3A",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 20,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  brandTitle: {
    fontFamily: "Montserrat_900Black",
    fontSize: 32,
    color: "#202D3A",
    textAlign: "center",
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D9E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
    color: "#2C3E50",
    letterSpacing: 0.3,
  },
  loaderFooter: {
    position: "absolute",
    bottom: 60,
    width: "90%",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  loadingMessage: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    color: "#202D3A",
    letterSpacing: 0.3,
    marginBottom: 12,
    textAlign: "center",
    flexWrap: "wrap",
    flexShrink: 0,
  },
  trackBar: {
    width: 140,
    height: 4,
    backgroundColor: "#D1D9E0",
    borderRadius: 2,
    overflow: "hidden",
    position: "relative",
  },
  fillBar: {
    width: 80,
    height: "100%",
    backgroundColor: "#67D4A8",
    borderRadius: 2,
  },
});