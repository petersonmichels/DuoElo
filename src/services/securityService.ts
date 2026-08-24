import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { auth } from "../config/firebase";
import { t } from "../i18n/translations";

let LocalAuthentication: any = null;
try {
  LocalAuthentication = require("expo-local-authentication");
} catch (e) {}

const SALT_CONST = "DUOELO_E2EE_SALT_LUX_2026";
const TIMEOUT_MINUTES = 5;

let activeSessionPin: string | null = null;
let lastUnlockTimestamp: number | null = null;

function getCurrentUserUid(): string | null {
  return auth.currentUser?.uid || null;
}

// 🛠️ MOTOR BASE64 UNIVERSAL (Substitui atob/btoa que quebram o React Native)
const b64chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function encodeBase64(input: string): string {
  let str = input;
  let output = "";
  for (let block = 0, charCode, i = 0, map = b64chars; str.charAt(i | 0) || (map = "=", i % 1); output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
    charCode = str.charCodeAt(i += 3/4);
    block = block << 8 | charCode;
  }
  return output;
}

function decodeBase64(input: string): string {
  let str = input.replace(/=+$/, "");
  let output = "";
  for (let bc = 0, bs = 0, buffer, i = 0; buffer = str.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
    buffer = b64chars.indexOf(buffer);
  }
  return output;
}

export function isStrongPassword(password: string, userLang = "pt-BR"): { isValid: boolean; message?: string } {
  const fullInstructions = `${t("pwd_req_header", userLang) || "Requisitos de Senha:"}\n\n${t("pwd_req_min_len", userLang) || "• Mínimo de 8 caracteres"}\n${t("pwd_req_upper", userLang) || "• Pelo menos uma letra maiúscula"}\n${t("pwd_req_lower", userLang) || "• Pelo menos uma letra minúscula"}\n${t("pwd_req_number", userLang) || "• Pelo menos um número"}\n${t("pwd_req_special", userLang) || "• Pelo menos um caractere especial (!@#$%^&*)"}`;

  if (!password || password.length < 8) return { isValid: false, message: fullInstructions };

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, message: fullInstructions };
  }

  return { isValid: true };
}

export async function setSecurityPin(pin: string): Promise<void> {
  const uid = getCurrentUserUid();
  if (!pin || pin.length < 4) throw new Error("O PIN deve ter pelo menos 4 dígitos.");
  
  const saltedPin = `${SALT_CONST}::${uid || "guest"}::${pin}`;
  const hashedPin = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, saltedPin);

  const storageKey = uid ? `@duoelo_pin_${uid}` : "duoelo_security_pin_hash";
  await AsyncStorage.setItem(storageKey, hashedPin);

  activeSessionPin = pin;
  lastUnlockTimestamp = Date.now();
}

// 🎯 CHECAGEM RESILIENTE DE EXISTÊNCIA DO PIN
export async function hasSecurityPin(): Promise<boolean> {
  try {
    const uid = getCurrentUserUid();
    
    // 1. Tenta pela chave do UID atual
    if (uid) {
      const savedHash = await AsyncStorage.getItem(`@duoelo_pin_${uid}`);
      if (savedHash !== null && savedHash.length > 0) return true;
    }

    // 2. Fallback para a chave genérica
    const fallbackHash = await AsyncStorage.getItem("duoelo_security_pin_hash");
    if (fallbackHash !== null && fallbackHash.length > 0) return true;

    // 3. Fallback de varredura no AsyncStorage por qualquer chave de PIN salva
    const allKeys = await AsyncStorage.getAllKeys();
    const pinKeyExists = allKeys.some((key) => key.includes("duoelo_pin_"));
    return pinKeyExists;
  } catch (e) {
    return false;
  }
}

export function isSessionUnlocked(): boolean {
  if (!activeSessionPin || !lastUnlockTimestamp) return false;

  const elapsedMinutes = (Date.now() - lastUnlockTimestamp) / (1000 * 60);
  if (elapsedMinutes > TIMEOUT_MINUTES) {
    lockSession();
    return false;
  }

  lastUnlockTimestamp = Date.now();
  return true;
}

export async function verifySecurityPin(pin: string): Promise<boolean> {
  if (!pin) return false;
  try {
    const uid = getCurrentUserUid();
    const saltedPin = `${SALT_CONST}::${uid || "guest"}::${pin}`;
    const currentHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, saltedPin);

    // 1. Tenta verificar na chave do UID
    let storageKey = uid ? `@duoelo_pin_${uid}` : "duoelo_security_pin_hash";
    let savedHash = await AsyncStorage.getItem(storageKey);

    // 2. Se não achou na chave do UID, tenta a chave genérica
    if (!savedHash) {
      savedHash = await AsyncStorage.getItem("duoelo_security_pin_hash");
    }

    if (savedHash === currentHash) {
      activeSessionPin = pin;
      lastUnlockTimestamp = Date.now();
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  if (!LocalAuthentication) return false;
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Autenticação DuoElo",
      fallbackLabel: "Usar PIN de Segurança",
      cancelLabel: "Cancelar",
      disableDeviceFallback: false,
    });

    if (result.success) {
      activeSessionPin = "BIOMETRIC_UNLOCKED";
      lastUnlockTimestamp = Date.now();
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

export function lockSession(): void {
  activeSessionPin = null;
  lastUnlockTimestamp = null;
}

export async function clearSecurityPin(): Promise<void> {
  try {
    const uid = getCurrentUserUid();
    lockSession();
    if (uid) {
      await AsyncStorage.removeItem(`@duoelo_pin_${uid}`);
    }
    await AsyncStorage.removeItem("duoelo_security_pin_hash");
  } catch (e) {}
}

export async function encryptText(text: string, userUid?: string): Promise<string> {
  const uid = userUid || getCurrentUserUid();
  if (!text || text.trim().length === 0) return "";
  if (!uid) return text;

  try {
    const keyHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, uid + "duoelo_secret_salt");
    
    let utf8Text = text;
    try {
      utf8Text = unescape(encodeURIComponent(text));
    } catch (e) {
      utf8Text = text;
    }

    let encrypted = "";
    for (let i = 0; i < utf8Text.length; i++) {
      const charCode = utf8Text.charCodeAt(i);
      const keyChar = keyHash.charCodeAt(i % keyHash.length);
      encrypted += String.fromCharCode(charCode ^ keyChar);
    }

    return `E2EE::${keyHash.substring(0, 8)}::${encodeBase64(encrypted)}`;
  } catch (e) {
    return text;
  }
}

// 🔓 DESCRIPTOGRAFIA ATÔMICA E ROBUSTA COM MOTOR NATIVO
export async function decryptText(encryptedData: string, userUid?: string): Promise<string> {
  if (!encryptedData) return "";
  
  // Se não contém a tag de criptografia E2EE::, é um texto simples e retorna direto
  if (!encryptedData.includes("E2EE::")) {
    return encryptedData.replace(/[\u0000-\u001F\u007F-\u009F\uFFFD]/g, "").trim();
  }

  const uid = userUid || getCurrentUserUid();
  if (!uid) return encryptedData;

  const parts = encryptedData.split("::");
  const base64Data = parts.length >= 3 ? parts[2] : parts[parts.length - 1];

  try {
    const rawEncrypted = decodeBase64(base64Data);
    
    const keyHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, uid + "duoelo_secret_salt");
    let decrypted = "";
    
    for (let i = 0; i < rawEncrypted.length; i++) {
      const charCode = rawEncrypted.charCodeAt(i);
      const keyChar = keyHash.charCodeAt(i % keyHash.length);
      decrypted += String.fromCharCode(charCode ^ keyChar);
    }

    try {
      const cleanText = decodeURIComponent(escape(decrypted));
      const result = cleanText.replace(/[\u0000-\u001F\u007F-\u009F\uFFFD]/g, "").trim();
      if (result && result.length > 0) return result;
    } catch (e) {}

    const fallbackClean = rawEncrypted.replace(/[\u0000-\u001F\u007F-\u009F\uFFFD]/g, "").trim();
    if (fallbackClean && fallbackClean.length > 0) {
      return fallbackClean;
    }
  } catch (e) {}

  return "Mensagem protegida (Falha ao descriptografar)";
}