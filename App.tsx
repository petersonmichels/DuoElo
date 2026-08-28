import "react-native-gesture-handler";
import "react-native-get-random-values";

import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, LogBox, Platform, View } from "react-native";
import Purchases from "react-native-purchases";
import { enableScreens } from "react-native-screens";

import AppNavigator from "./src/navigation/AppNavigator";

// 🚀 ATIVA O SUPORTE A TELAS NATIVAS DE ALTA PERFORMANCE
enableScreens(true);

// 🛡️ IMPEDE O AUTO-HIDE DA SPLASH SCREEN ATÉ O CARREGAMENTO TOTAL DE RECURSOS
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignora exceções se já estiver oculto */
});

// 🙈 FILTRAGEM ESTRITA DE WARNINGS DE TERCEIROS CONHECIDOS
LogBox.ignoreLogs([
  "You are initializing Firebase Auth for React Native without providing AsyncStorage",
  "@firebase/auth",
  "Purchases instance already set",
]);

// 🔥 IMPORTAÇÃO DA TIPOGRAFIA OFICIAL DUOELO
import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_900Black,
  useFonts,
} from "@expo-google-fonts/montserrat";

export default function App() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_900Black,
  });

  // 💳 INICIALIZAÇÃO SEGURA DO REVENUECAT VIA VARIÁVEIS DE AMBIENTE
  useEffect(() => {
    let isMounted = true;

    const setupRevenueCat = async () => {
      // O SDK de compras nativas do RevenueCat só é executado no Android e iOS
      if (Platform.OS === "web") return;

      try {
        const isAlreadyConfigured = await Purchases.isConfigured();
        if (isAlreadyConfigured || !isMounted) return;

        // Ativa os logs de debug do RevenueCat apenas em desenvolvimento
        if (__DEV__) {
          Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
        }

        const apiKey = Platform.select({
          ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY_appl_xZNigunYBjnJfNUXAOfFqIyXbgY,
          android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY_goog_bYcEfvvHdSDOOPlWDlhsnYxJJov,
        });

        if (apiKey && apiKey.trim().length > 0) {
          Purchases.configure({ apiKey });
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

  // 🎨 CONTROLE DE RENDERIZAÇÃO DA SPLASH SCREEN E DE FONTES
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0F0F12",
        }}
      >
        <ActivityIndicator size="large" color="#EAB64A" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0F0F12" }} onLayout={onLayoutRootView}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </View>
  );
}