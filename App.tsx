import "react-native-gesture-handler"; // 👈 OBRIGATÓRIO: Primeira linha
import "react-native-get-random-values";

import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { LogBox, Platform, StatusBar, TouchableOpacity, View } from "react-native";
import Purchases from "react-native-purchases";
import { enableScreens } from "react-native-screens";

// 🔥 TIPOGRAFIA OFICIAL DUOELO
import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_900Black,
  useFonts,
} from "@expo-google-fonts/montserrat";

import AppSplashScreen from "./src/components/AppSplashScreen";
import AppNavigator from "./src/navigation/AppNavigator";
import { audioService } from "./src/services/AudioService";

// 🚀 DESEMPENHO DE TELAS NATIVAS
enableScreens(true);

// 🛡️ TRAVA A SPLASH NATIVA ATÉ O CARREGAMENTO COMPLETO
SplashScreen.preventAutoHideAsync().catch(() => {});

// 🙈 FILTRAGEM DE WARNINGS CONHECIDOS
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

  // 🔊 INICIALIZAÇÃO DE ÁUDIO E DESATIVAÇÃO DO SOM NATIVO DO ANDROID
  useEffect(() => {
    const initAudio = async () => {
      const isSfxActive = await audioService.init();

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

  // 🛡️ TIMEOUT DE SEGURANÇA PARA A SPLASH SCREEN NATIVA
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

  // 🎨 ESCONDE A SPLASH NATIVA ASSIM QUE AS FONTES CARREGAM
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {}
    }
  }, [fontsLoaded, fontError]);

  // 🟢 EXIBE O NOVO COMPONENTE DE SPLASH COM A COR OFICIAL CLEAN (#F0F4F8)
  if ((!fontsLoaded && !fontError) || !isSplashAnimationDone) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F0F4F8", // 👈 CORRIGIDO PARA O DESIGN SYSTEM CLEAN
        }}
        onLayout={onLayoutRootView}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#F0F4F8" />
        <AppSplashScreen
          onAnimationFinish={() => setIsSplashAnimationDone(true)}
        />
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: "#F0F4F8" }}
      onLayout={onLayoutRootView}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F0F4F8" />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </View>
  );
}