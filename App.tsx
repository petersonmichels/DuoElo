import "react-native-gesture-handler"; // 👈 OBRIGATÓRIO: Deve ser estritamente a primeira linha!
import "react-native-get-random-values";

import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, LogBox, Platform, View } from "react-native";
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

import AppNavigator from "./src/navigation/AppNavigator";

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
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_900Black,
  });

  // 🛡️ TIMEOUT OBRIGATÓRIO PARA FECHAR A SPLASH SCREEN (Evita tela travada)
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
            // Purchases.configure lança um aviso no LogBox se já configurado (que já tratamos com o LogBox.ignore)
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

  // 🎨 LIBERA A SPLASH SCREEN QUANDO AS FONTES FOREM CARREGADAS
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {}
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
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