import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

const MASTER_KEY_ALIAS = "duoelo_master_key_hash";
const SALT_CONST = "DUOELO_E2EE_SALT_LUX_2026";

// 🔐 Carregamento dinâmico para evitar crash no ambiente Web
const getSecureStore = () => {
  if (Platform.OS !== "web") {
    return require("expo-secure-store");
  }
  return null;
};

/**
 * 🔑 Salva a Senha Mestra com Salt no SecureStore NATIVO ou AsyncStorage na Web
 */
export async function setMasterPassword(password: string): Promise<void> {
  const saltedPassword = `${SALT_CONST}::${password}`;
  const hashedPassword = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    saltedPassword
  );

  if (Platform.OS === "web") {
    await AsyncStorage.setItem(MASTER_KEY_ALIAS, hashedPassword);
  } else {
    const SecureStore = getSecureStore();
    if (SecureStore) {
      await SecureStore.setItemAsync(MASTER_KEY_ALIAS, hashedPassword, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }
  }
}

/**
 * 🔒 Verifica a Senha Mestra digitada comparando os hashes
 */
export async function verifyMasterPassword(password: string): Promise<boolean> {
  const saltedPassword = `${SALT_CONST}::${password}`;
  const currentHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    saltedPassword
  );

  let savedHash: string | null = null;

  if (Platform.OS === "web") {
    savedHash = await AsyncStorage.getItem(MASTER_KEY_ALIAS);
  } else {
    const SecureStore = getSecureStore();
    if (SecureStore) {
      savedHash = await SecureStore.getItemAsync(MASTER_KEY_ALIAS);
    }
  }

  if (!savedHash) return false;
  return savedHash === currentHash;
}

/**
 * Helper para codificação UTF-8 em Base64 segura no React Native/Hermes
 */
function toBase64(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

/**
 * Helper para decodificação Base64 em UTF-8 no React Native/Hermes
 */
function fromBase64(str: string): string {
  return decodeURIComponent(
    atob(str)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

/**
 * 🔐 Criptografia SHA-256 + Stream XOR para reflexões do diário
 */
export async function encryptText(
  text: string,
  secretKey: string
): Promise<string> {
  if (!text) return "";

  const keyHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    secretKey
  );

  let encrypted = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const keyChar = keyHash.charCodeAt(i % keyHash.length);
    encrypted += String.fromCharCode(charCode ^ keyChar);
  }

  const base64Data = toBase64(encrypted);
  return `E2EE::${keyHash.substring(0, 8)}::${base64Data}`;
}

/**
 * 🔓 Decripta o texto criptografado na RAM
 */
export async function decryptText(
  encryptedData: string,
  secretKey?: string
): Promise<string> {
  if (!encryptedData || !encryptedData.startsWith("E2EE::")) {
    return encryptedData;
  }

  const parts = encryptedData.split("::");
  if (parts.length < 3) return encryptedData;

  const base64Data = parts[2];

  try {
    const rawEncrypted = fromBase64(base64Data);

    if (!secretKey) {
      return "[Conteúdo Protegido por Senha Mestra]";
    }

    const keyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      secretKey
    );

    let decrypted = "";
    for (let i = 0; i < rawEncrypted.length; i++) {
      const charCode = rawEncrypted.charCodeAt(i);
      const keyChar = keyHash.charCodeAt(i % keyHash.length);
      decrypted += String.fromCharCode(charCode ^ keyChar);
    }

    return decrypted;
  } catch (error) {
    console.error("[DECRYPT_ERROR] Falha ao decodificar payload:", error);
    return "[Erro ao decodificar mensagem]";
  }
}