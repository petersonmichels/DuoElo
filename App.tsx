import { NavigationContainer } from "@react-navigation/native";
import { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import "react-native-gesture-handler";
import "react-native-get-random-values";
import Purchases from "react-native-purchases";
import AppNavigator from "./src/navigation/AppNavigator";

// 🔥 IMPORTAÇÃO DA NOVA TIPOGRAFIA OFICIAL DA MARCA
import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_900Black,
  useFonts,
} from "@expo-google-fonts/montserrat";

export default function App() {
  // 🔥 CARREGAMENTO DAS FONTES NO INÍCIO DO APP
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_900Black,
  });

  useEffect(() => {
    const setupRevenueCat = async () => {
      if (Platform.OS === "android") {
        // A MÁGICA ACONTECE AQUI 👇
        Purchases.configure({ apiKey: "goog_bYcEfvvHdSDOOPlWDlhsnYxJJov" });
      }
    };
    setupRevenueCat();
  }, []);

  // 🔥 TELA DE ESPERA SEGURA (Evita que o app quebre enquanto a fonte baixa)
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
