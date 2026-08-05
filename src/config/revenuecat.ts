import { Platform } from "react-native";
import Purchases from "react-native-purchases";

// Estas chaves virão do painel do RevenueCat
const API_KEYS = {
  apple: process.env.EXPO_PUBLIC_RC_APPLE_KEY || "chave_apple_temporaria",
  google: process.env.EXPO_PUBLIC_RC_GOOGLE_KEY || "chave_google_temporaria",
};

export const setupRevenueCat = async (userId?: string) => {
  try {
    if (Platform.OS === "ios") {
      Purchases.configure({ apiKey: API_KEYS.apple, appUserID: userId });
    } else if (Platform.OS === "android") {
      Purchases.configure({ apiKey: API_KEYS.google, appUserID: userId });
    }
    console.log("RevenueCat configurado com sucesso!");
  } catch (error) {
    console.error("Erro ao configurar o RevenueCat:", error);
  }
};

export default Purchases;
