import { enableScreens } from "react-native-screens";
// 🚀 DESATIVA O MODO FABRIC EXPERIMENTAL DE SCREENS QUE CAUSA NULL POINTER NO ANDROID
enableScreens(false);

import { NavigationContainer } from "@react-navigation/native";
import { useEffect } from "react";
import { ActivityIndicator, LogBox, Platform, View } from "react-native";
import "react-native-gesture-handler";
import "react-native-get-random-values";
import Purchases from "react-native-purchases";
import AppNavigator from "./src/navigation/AppNavigator";

// 🙈 SILENCIA WARNINGS INFORMATIVOS NO METRO
LogBox.ignoreLogs([
  "You are initializing Firebase Auth for React Native without providing AsyncStorage",
  "@firebase/auth",
  "Purchases instance already set",
]);

// Ocultar notificações flutuantes do LogBox no Emulador:
LogBox.ignoreAllLogs(true);

// 🔥 IMPORTAÇÃO DA TIPOGRAFIA OFICIAL DA MARCA
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

  useEffect(() => {
    const setupRevenueCat = async () => {
      try {
        const isAlreadyConfigured = await Purchases.isConfigured();
        if (isAlreadyConfigured) return;

        if (Platform.OS === "android") {
          Purchases.configure({ apiKey: "goog_bYcEfvvHdSDOOPlWDlhsnYxJJov" });
        } else if (Platform.OS === "ios") {
          Purchases.configure({ apiKey: "appl_SUA_CHAVE_IOS_AQUI" });
        }
      } catch (error) {
        console.error("Erro ao configurar RevenueCat:", error);
      }
    };

    setupRevenueCat();
  }, []);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#202D3A",
        }}
      >
        <ActivityIndicator size="large" color="#EAB64A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
