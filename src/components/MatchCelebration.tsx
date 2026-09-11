import { FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { audioService } from "../services/AudioService";

interface MatchCelebrationProps {
  onAnimationEnd?: () => void;
  userLang?: string;
}

export const MatchCelebration = ({
  onAnimationEnd,
  userLang = "pt-BR",
}: MatchCelebrationProps) => {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    // ⚡ Dispara som de Match e vibração tátil
    try {
      audioService.play("match");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}

    // 🎨 Animação de entrada suave
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withSpring(1, { damping: 10, stiffness: 90 });

    // 🟢 Pulso suave e constante do ícone institucional
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );

    if (onAnimationEnd) {
      const timer = setTimeout(onAnimationEnd, 3200);
      return () => clearTimeout(timer);
    }
  }, []);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.card, cardAnimatedStyle]}>
        <Animated.View style={[styles.iconWrapper, iconAnimatedStyle]}>
          <FontAwesome5 name="heartbeat" size={48} color="#67D4A8" />
        </Animated.View>

        <Text style={styles.title}>Match Confirmado!</Text>
        <Text style={styles.subtitle}>
          Seu elo foi conectado com sucesso. Preparem-se para iniciar a jornada a dois!
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(32, 45, 58, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
    elevation: 20,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#D1D9E0",
  },
  iconWrapper: {
    width: 92,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E8F4F1", // Fundo suave tom pastel verde
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#67D4A8",
  },
  title: {
    fontSize: 24,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#60646C",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
});