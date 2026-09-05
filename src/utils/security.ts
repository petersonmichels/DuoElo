import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { t } from "../i18n/translations";

const MASTER_KEY_ALIAS = "duoelo_master_key_hash";
const SALT_CONST = "DUOELO_E2EE_SALT_LUX_2026";

// 🔐 Carregamento dinâmico para evitar crash no ambiente Web
const getSecureStore = () => {
  if (Platform.OS !== "web") {
    try {
      return require("expo-secure-store");
    } catch (e) {
      return null;
    }
  }
  return null;
};

// 🛠️ MOTOR BASE64 UNIVERSAL (Garante funcionamento no Hermes, JSC, Android, iOS e Web sem atob/btoa)
const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function encodeBase64(input: string): string {
  let str = input;
  let output = "";
  for (
    let block = 0, charCode, i = 0, map = B64_CHARS;
    str.charAt(i | 0) || ((map = "="), i % 1);
    output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
  ) {
    charCode = str.charCodeAt((i += 3 / 4));
    block = (block << 8) | charCode;
  }
  return output;
}

function decodeBase64(input: string): string {
  let str = input.replace(/[\s\r\n]+/g, "").replace(/=+$/, "");
  let output = "";
  for (
    let bc = 0, bs = 0, buffer, i = 0;
    (buffer = str.charAt(i++));
    ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0
  ) {
    buffer = B64_CHARS.indexOf(buffer);
  }
  return output;
}

/**
 * 🔑 Salva a Senha Mestra com Salt no SecureStore NATIVO ou AsyncStorage na Web
 */
export async function setMasterPassword(password: string, userUid?: string): Promise<void> {
  const targetUid = userUid || "global_user";
  const saltedPassword = `${SALT_CONST}::${targetUid}::${password}`;
  const hashedPassword = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    saltedPassword
  );

  const aliasKey = userUid ? `${MASTER_KEY_ALIAS}_${userUid}` : MASTER_KEY_ALIAS;

  if (Platform.OS === "web") {
    await AsyncStorage.setItem(aliasKey, hashedPassword);
  } else {
    const SecureStore = getSecureStore();
    if (SecureStore) {
      try {
        await SecureStore.setItemAsync(aliasKey, hashedPassword, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY || 0,
        });
      } catch (e) {
        await AsyncStorage.setItem(aliasKey, hashedPassword);
      }
    } else {
      await AsyncStorage.setItem(aliasKey, hashedPassword);
    }
  }
}

/**
 * 🔒 Verifica a Senha Mestra digitada comparando os hashes
 */
export async function verifyMasterPassword(password: string, userUid?: string): Promise<boolean> {
  if (!password) return false;

  const targetUid = userUid || "global_user";
  const saltedPassword = `${SALT_CONST}::${targetUid}::${password}`;
  const currentHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    saltedPassword
  );

  let savedHash: string | null = null;
  const aliasKey = userUid ? `${MASTER_KEY_ALIAS}_${userUid}` : MASTER_KEY_ALIAS;

  if (Platform.OS === "web") {
    savedHash = await AsyncStorage.getItem(aliasKey);
    if (!savedHash && userUid) savedHash = await AsyncStorage.getItem(MASTER_KEY_ALIAS);
  } else {
    const SecureStore = getSecureStore();
    if (SecureStore) {
      try {
        savedHash = await SecureStore.getItemAsync(aliasKey);
      } catch (e) {
        savedHash = null;
      }
      if (!savedHash && userUid) {
        try {
          savedHash = await SecureStore.getItemAsync(MASTER_KEY_ALIAS);
        } catch (e) {
          savedHash = null;
        }
      }
    }
    
    if (!savedHash) {
      savedHash = await AsyncStorage.getItem(aliasKey);
      if (!savedHash && userUid) savedHash = await AsyncStorage.getItem(MASTER_KEY_ALIAS);
    }
  }

  if (!savedHash) return false;
  return savedHash === currentHash;
}

/**
 * 🔐 Criptografia SHA-256 + Stream XOR para reflexões do diário (Suporta Emojis e UTF-8 nativo)
 */
export async function encryptText(
  text: string,
  secretKey: string
): Promise<string> {
  if (!text || text.trim().length === 0) return "";
  if (!secretKey) return text;

  try {
    const keyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      secretKey + "_duoelo_e2ee"
    );

    // Converte a string UTF-8 para uma sequência segura de percent-encoding (suporta emojis de 4 bytes)
    const utf8Text = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );

    let encrypted = "";
    for (let i = 0; i < utf8Text.length; i++) {
      const charCode = utf8Text.charCodeAt(i);
      const keyChar = keyHash.charCodeAt(i % keyHash.length);
      encrypted += String.fromCharCode(charCode ^ keyChar);
    }

    const base64Data = encodeBase64(encrypted);
    return `E2EE::${keyHash.substring(0, 8)}::${base64Data}`;
  } catch (e) {
    return text;
  }
}

/**
 * 🔓 Decripta o texto criptografado na RAM de forma segura
 */
export async function decryptText(
  encryptedData: string,
  secretKey?: string,
  userLang: string = "pt-BR"
): Promise<string> {
  if (!encryptedData) return "";

  if (!encryptedData.startsWith("E2EE::")) {
    return encryptedData.replace(/[\u0000-\u001F\u007F-\u009F\uFFFD]/g, "").trim();
  }

  const parts = encryptedData.split("::");
  if (parts.length < 3) return encryptedData;

  const base64Data = parts[2];

  try {
    if (!secretKey) {
      return (
        t("protected_content_msg", userLang) ||
        "[Conteúdo Protegido por Senha Mestra]"
      );
    }

    const rawEncrypted = decodeBase64(base64Data);

    const keyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      secretKey + "_duoelo_e2ee"
    );

    let decryptedRaw = "";
    for (let i = 0; i < rawEncrypted.length; i++) {
      const charCode = rawEncrypted.charCodeAt(i);
      const keyChar = keyHash.charCodeAt(i % keyHash.length);
      decryptedRaw += String.fromCharCode(charCode ^ keyChar);
    }

    try {
      // Reconstitui a string UTF-8 original tratando percent-encoding e emojis corretamente
      const percentEncoded = decryptedRaw
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("");

      const cleanText = decodeURIComponent(percentEncoded);
      const result = cleanText.replace(/[\u0000-\u001F\u007F-\u009F\uFFFD]/g, "").trim();
      if (result && result.length > 0) return result;
    } catch (e) {}

    const fallbackClean = decryptedRaw.replace(/[\u0000-\u001F\u007F-\u009F\uFFFD]/g, "").trim();
    if (fallbackClean && fallbackClean.length > 0) {
      return fallbackClean;
    }
  } catch (error) {
    console.error("[DECRYPT_ERROR] Falha ao decodificar payload:", error);
  }

  return (
    t("decryption_error_msg", userLang) || "[Erro ao decodificar mensagem]"
  );
}