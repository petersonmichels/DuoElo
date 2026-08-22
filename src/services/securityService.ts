import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const SECURITY_PIN_ALIAS = "duoelo_security_pin_hash";
const SALT_CONST = "DUOELO_E2EE_SALT_LUX_2026";
const TIMEOUT_MINUTES = 5;

// Estado em memória para controle da sessão de 5 minutos
let activeSessionPin: string | null = null;
let lastUnlockTimestamp: number | null = null;

/**
 * 🔑 Salva o PIN de Segurança com Salt no AsyncStorage
 */
export async function setSecurityPin(pin: string): Promise<void> {
  if (!pin || pin.length < 4) {
    throw new Error("O PIN de Segurança precisa ter pelo menos 4 dígitos.");
  }
  const saltedPin = `${SALT_CONST}::${pin}`;
  const hashedPin = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    saltedPin
  );

  await AsyncStorage.setItem(SECURITY_PIN_ALIAS, hashedPin);

  // Ativa a sessão automaticamente ao cadastrar
  activeSessionPin = pin;
  lastUnlockTimestamp = Date.now();
}

/**
 * 🔍 Verifica se o usuário já possui PIN cadastrado
 */
export async function hasSecurityPin(): Promise<boolean> {
  try {
    const savedHash = await AsyncStorage.getItem(SECURITY_PIN_ALIAS);
    return savedHash !== null && savedHash.length > 0;
  } catch (e) {
    return false;
  }
}

/**
 * ⏱️ Verifica se a sessão do PIN está ativa (menos de 5 minutos desde a última atividade)
 */
export function isSessionUnlocked(): boolean {
  if (!activeSessionPin || !lastUnlockTimestamp) return false;

  const elapsedMinutes = (Date.now() - lastUnlockTimestamp) / (1000 * 60);
  if (elapsedMinutes > TIMEOUT_MINUTES) {
    // Expira a sessão por inatividade
    activeSessionPin = null;
    lastUnlockTimestamp = null;
    return false;
  }

  // Renova o tempo de sessão a cada checagem ativa
  lastUnlockTimestamp = Date.now();
  return true;
}

/**
 * 🔒 Valida o PIN e abre uma nova sessão temporizada
 */
export async function verifySecurityPin(pin: string): Promise<boolean> {
  if (!pin) return false;
  try {
    const saltedPin = `${SALT_CONST}::${pin}`;
    const currentHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      saltedPin
    );

    const savedHash = await AsyncStorage.getItem(SECURITY_PIN_ALIAS);
    const isValid = savedHash === currentHash;

    if (isValid) {
      activeSessionPin = pin;
      lastUnlockTimestamp = Date.now();
    }

    return isValid;
  } catch (e) {
    return false;
  }
}

/**
 * 🔒 Bloqueia a sessão ativa (usado ao minimizar/fechar o app)
 */
export function lockSession(): void {
  activeSessionPin = null;
  lastUnlockTimestamp = null;
}

/**
 * 🗑️ Limpa o PIN armazenado
 */
export async function clearSecurityPin(): Promise<void> {
  try {
    lockSession();
    await AsyncStorage.removeItem(SECURITY_PIN_ALIAS);
  } catch (e) {
    console.warn("Erro ao limpar PIN de Segurança:", e);
  }
}

// Helpers de conversão em UTF-8 Base64
function toBase64(str: string): string {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  } catch (e) {
    return str;
  }
}

function fromBase64(str: string): string {
  try {
    return decodeURIComponent(
      atob(str)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (e) {
    return str;
  }
}

/**
 * 🔐 Criptografa o texto utilizando o PIN da sessão ativa ou chave informada
 */
export async function encryptText(text: string, secretKey?: string): Promise<string> {
  const keyToUse = secretKey || activeSessionPin;
  if (!text) return "";
  if (!keyToUse) return text;

  try {
    const keyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      keyToUse
    );

    let encrypted = "";
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const keyChar = keyHash.charCodeAt(i % keyHash.length);
      encrypted += String.fromCharCode(charCode ^ keyChar);
    }

    return `E2EE::${keyHash.substring(0, 8)}::${toBase64(encrypted)}`;
  } catch (e) {
    console.warn("Erro ao criptografar texto:", e);
    return text;
  }
}

/**
 * 🔓 Descriptografa o texto testando a chave fornecida, a sessão ativa ou o UID
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

  const tryDecryptWithKey = async (key: string): Promise<string | null> => {
    try {
      const rawEncrypted = fromBase64(base64Data);
      const keyHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        key
      );

      let decrypted = "";
      for (let i = 0; i < rawEncrypted.length; i++) {
        const charCode = rawEncrypted.charCodeAt(i);
        const keyChar = keyHash.charCodeAt(i % keyHash.length);
        decrypted += String.fromCharCode(charCode ^ keyChar);
      }
      return decrypted;
    } catch (e) {
      return null;
    }
  };

  // 1. Tenta descriptografar com a chave/PIN ou UID informado
  if (secretKey) {
    const result = await tryDecryptWithKey(secretKey);
    if (result && !result.includes("\0")) return result;
  }

  // 2. Fallback: Tenta descriptografar com o PIN ativo da sessão
  if (activeSessionPin) {
    const result = await tryDecryptWithKey(activeSessionPin);
    if (result && !result.includes("\0")) return result;
  }

  return "⚠️ Falha ao descriptografar.";
}