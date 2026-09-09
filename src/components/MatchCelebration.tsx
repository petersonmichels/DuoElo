import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { audioService } from "../services/AudioService";

interface MatchCelebrationProps {
  onAnimationEnd?: () => void;
}

export const MatchCelebration = ({ onAnimationEnd }: MatchCelebrationProps) => {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // ⚡ Dispara o som harmonioso de Match e vibração tátil
    audioService.play("match");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // 🎨 Animação de entrada e pulso dos corações
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSequence(
      withSpring(1.3, { damping: 6, stiffness: 80 }),
      withSpring(1.0, { damping: 10, stiffness: 100 })
    );

    if (onAnimationEnd) {
      const timer = setTimeout(onAnimationEnd, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <Text style={styles.icon}>💖</Text>
        <Text style={styles.title}>É um Match!</Text>
        <Text style={styles.subtitle}>Vocês agora estão conectados no DuoElo.</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill, // 👈 Ajustado de absoluteFillObject para absoluteFill
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 32,
    borderRadius: 28,
    alignItems: "center",
    width: "80%",
    shadowColor: "#EAB64A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  icon: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#60646C",
    textAlign: "center",
  },
});