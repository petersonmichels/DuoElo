import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
} from "react-native-purchases";

// 💳 CHAVES OFICIAIS REVENUECAT (DUOELO)
const API_KEYS = {
  apple:
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ||
    "appl_SUA_CHAVE_IOS_AQUI",
  google:
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ||
    "goog_bYcEfvvHdSDOOPlWDlhsnYxJJov",
};

/**
 * Inicializa a SDK do RevenueCat de forma idempotente.
 */
export const setupRevenueCat = async (userId?: string): Promise<void> => {
  try {
    const isConfigured = await Purchases.isConfigured();

    const apiKey = Platform.select({
      ios: API_KEYS.apple,
      android: API_KEYS.google,
    });

    if (!apiKey || apiKey.includes("AQUI")) {
      console.warn("[REVENUECAT] Chave de API não configurada para a plataforma atual.");
      return;
    }

    if (!isConfigured) {
      Purchases.configure({ apiKey, appUserID: userId });
      console.log("[REVENUECAT] SDK configurada com sucesso.");
    } else if (userId) {
      // Se já estava configurado, associa o ID do usuário do Firebase
      await Purchases.logIn(userId);
    }
  } catch (error) {
    console.error("[REVENUECAT_ERROR] Erro ao inicializar compras:", error);
  }
};

/**
 * Busca as ofertas ativas (Planos Mensal, Trimestral e Anual)
 */
export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current !== null) {
      return offerings.current;
    }
    return null;
  } catch (error) {
    console.error("[REVENUECAT_ERROR] Erro ao buscar planos:", error);
    return null;
  }
};

/**
 * Restaura compras anteriores efetuadas pela Apple ID / Google Account
 */
export const restoreUserPurchases = async (): Promise<CustomerInfo | null> => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error("[REVENUECAT_ERROR] Erro ao restaurar compras:", error);
    return null;
  }
};

export default Purchases;