import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { audioService } from '../services/AudioService';

// Worklets auxiliares puras para alterar os SharedValues fora do escopo de render do React
function animatePressIn(translateY: SharedValue<number>) {
  'worklet';
  translateY.value = withSpring(4, { damping: 15 });
}

function animatePressOut(translateY: SharedValue<number>) {
  'worklet';
  translateY.value = withSpring(0, { damping: 15 });
}

// 1. Botão 3D Tátil
export const Button3D = ({
  title,
  onPress,
  style,
}: {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
}) => {
  const translateY = useSharedValue<number>(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handlePressIn = () => {
    animatePressIn(translateY);
    audioService.play('click');
  };

  const handlePressOut = () => {
    animatePressOut(translateY);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[styles.btnContainer, style]}
    >
      <Animated.View style={[styles.btnBody, animatedStyle]}>
        <Text style={styles.btnText}>{title}</Text>
      </Animated.View>
    </Pressable>
  );
};

// 2. Header de Abertura Animado
export const AnimatedHeroHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => {
  const scale = useSharedValue<number>(0.8);
  const opacity = useSharedValue<number>(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
    scale.value = withSequence(
      withSpring(1.1, { damping: 10 }),
      withSpring(1.0, { damping: 12 })
    );
    audioService.play('click');
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.heroContainer, animatedStyle]}>
      <View style={styles.badge3D}>
        <Text style={styles.logoIcon}>⚡</Text>
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  btnContainer: {
    backgroundColor: '#15803d',
    borderRadius: 16,
    paddingBottom: 4,
  },
  btnBody: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  heroContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  badge3D: {
    width: 72,
    height: 72,
    backgroundColor: '#22c55e',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 5,
    borderBottomColor: '#15803d',
    marginBottom: 12,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoIcon: {
    fontSize: 36,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
});