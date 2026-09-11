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

// 1. Botão 3D Tátil Padronizado
export const Button3D = ({
  title,
  onPress,
  style,
  color = '#202D3A',
  shadowColor = '#141F28',
}: {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  color?: string;
  shadowColor?: string;
}) => {
  const translateY = useSharedValue<number>(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handlePressIn = () => {
    animatePressIn(translateY);
    try {
      audioService.play('click');
    } catch (e) {}
  };

  const handlePressOut = () => {
    animatePressOut(translateY);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[styles.btnContainer, { backgroundColor: shadowColor }, style]}
    >
      <Animated.View style={[styles.btnBody, { backgroundColor: color }, animatedStyle]}>
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
    try {
      audioService.play('click');
    } catch (e) {}
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
    backgroundColor: '#141F28',
    borderRadius: 16,
    paddingBottom: 4,
  },
  btnBody: {
    backgroundColor: '#202D3A',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_900Black',
    fontSize: 16,
  },
  heroContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  badge3D: {
    width: 72,
    height: 72,
    backgroundColor: '#67D4A8',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 5,
    borderBottomColor: '#4BB890',
    marginBottom: 12,
    shadowColor: '#67D4A8',
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
    fontFamily: 'Montserrat_900Black',
    color: '#202D3A',
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#60646C',
    marginTop: 4,
  },
});