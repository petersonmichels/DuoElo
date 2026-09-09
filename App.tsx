import "react-native-gesture-handler"; // 👈 OBRIGATÓRIO: Deve ser estritamente a primeira linha!
import "react-native-get-random-values";

import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { LogBox, Platform, TouchableOpacity, View } from "react-native";
import Purchases from "react-native-purchases";
import { enableScreens } from "react-native-screens";

// 🔥 IMPORTAÇÃO DA TIPOGRAFIA OFICIAL DUOELO
import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_900Black,
  useFonts,
} from "@expo-google-fonts/montserrat";

import { SplashLogo3D } from "./src/components/SplashLogo3D";
import AppNavigator from "./src/navigation/AppNavigator";
import { audioService } from "./src/services/AudioService";

// 🚀 ATIVA O SUPORTE A TELAS NATIVAS DE ALTA PERFORMANCE
enableScreens(true);

// 🛡️ MANTÉM A SPLASH SCREEN VISÍVEL ATÉ A INICIALIZACAO COMPLETA
SplashScreen.preventAutoHideAsync().catch(() => {});

// 🙈 FILTRAGEM ESTRITA DE WARNINGS DE TERCEIROS CONHECIDOS
LogBox.ignoreLogs([
  "You are initializing Firebase Auth for React Native without providing AsyncStorage",
  "@firebase/auth",
  "Purchases instance already set",
]);

export default function App() {
  const [isSplashAnimationDone, setIsSplashAnimationDone] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_900Black,
  });

  // 🔊 INICIALIZAÇÃO DO SERVIÇO DE ÁUDIO E DESATIVAÇÃO DO SOM NATIVO DO ANDROID
  useEffect(() => {
    const initAudio = async () => {
      const isSfxActive = await audioService.init();

      // 🛡️ BLOQUEIA O BIPE NATIVO DO ANDROID NOS BOTÕES SE O SFX ESTIVER DESLIGADO
      if (Platform.OS === "android") {
        (TouchableOpacity as any).defaultProps = {
          ...(TouchableOpacity as any).defaultProps,
          soundEnabled: isSfxActive,
        };
      }
    };

    initAudio().catch((err) => {
      console.log("[AUDIO_SERVICE] Erro ao inicializar áudio:", err);
    });
  }, []);

  // 🛡️ TIMEOUT OBRIGATÓRIO PARA FECHAR A SPLASH SCREEN NATIVA (Evita tela travada)
  useEffect(() => {
    const forceHideSplashTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 2000);

    return () => clearTimeout(forceHideSplashTimer);
  }, []);

  // 💳 INICIALIZAÇÃO SEGURA DO REVENUECAT
  useEffect(() => {
    let isMounted = true;

    const setupRevenueCat = async () => {
      if (Platform.OS === "web") return;

      try {
        if (__DEV__) {
          Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
        }

        const apiKey = Platform.select({
          ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
          android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
        });

        if (apiKey && apiKey.trim().length > 0) {
          if (isMounted) {
            Purchases.configure({ apiKey });
          }
        } else if (__DEV__) {
          console.warn(
            "[REVENUECAT_WARNING] Chave do RevenueCat não encontrada nas variáveis de ambiente (.env)."
          );
        }
      } catch (error) {
        console.error("[REVENUECAT_ERROR] Erro na inicialização das compras:", error);
      }
    };

    setupRevenueCat();

    return () => {
      isMounted = false;
    };
  }, []);

  // 🎨 LIBERA A SPLASH SCREEN NATIVA E EXIBE A ABERTURA ANIMADA
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {}
    }
  }, [fontsLoaded, fontError]);

  // Exibe o Logo Pulsante 3D durante o carregamento
  if ((!fontsLoaded && !fontError) || !isSplashAnimationDone) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0F0F12",
        }}
        onLayout={onLayoutRootView}
      >
        <SplashLogo3D
          onAnimationComplete={() => setIsSplashAnimationDone(true)}
        />
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: "#0F0F12" }}
      onLayout={onLayoutRootView}
    >
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </View>
  );
}