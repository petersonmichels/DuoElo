import React, { useEffect } from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { audioService } from '../services/AudioService';

// Importação do ícone de src/assets/icon.png
const defaultIcon = require('../assets/icon.png');

interface SplashLogo3DProps {
  logoSource?: ImageSourcePropType;
  onAnimationComplete?: () => void;
}

export const SplashLogo3D = ({
  logoSource = defaultIcon,
  onAnimationComplete,
}: SplashLogo3DProps) => {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);
  const glowScale = useSharedValue(0.8);

  useEffect(() => {
    // 🔊 Toca o som de abertura SOMENTE após checar e confirmar que o som está ATIVADO
    const playSplashSound = async () => {
      const soundOn = await audioService.init();
      if (soundOn) {
        audioService.play('match');
      }
    };
    playSplashSound();

    // 🎨 Animação do ícone e brilho
    opacity.value = withTiming(1, { duration: 400 });

    scale.value = withSequence(
      withSpring(1.15, { damping: 9, stiffness: 80 }),
      withSpring(1.0, { damping: 10, stiffness: 90 }),
      withRepeat(
        withSequence(
          withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    let timer: ReturnType<typeof setTimeout>;
    if (onAnimationComplete) {
      timer = setTimeout(onAnimationComplete, 2200);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: opacity.value * 0.25,
  }));

  return (
    <View style={styles.container}>
      {/* Aura de brilho pulsante */}
      <Animated.View style={[styles.glowRing, glowAnimatedStyle]} />

      {/* Ícone limpo pulsando */}
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F12',
  },
  glowRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#EAB64A',
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#EAB64A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
});