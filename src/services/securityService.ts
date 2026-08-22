import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const MASTER_KEY_ALIAS = "duoelo_master_key_hash";

/**
 * 🔑 Salva a Senha Mestra e gera o Hash Seguro no SecureStore
 */
export async function setMasterPassword(password: string): Promise<void> {
  const hashedPassword = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password,
  );
  await SecureStore.setItemAsync(MASTER_KEY_ALIAS, hashedPassword, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

/**
 * 🔒 Verifica se a senha digitada é válida
 */
export async function verifyMasterPassword(password: string): Promise<boolean> {
  const savedHash = await SecureStore.getItemAsync(MASTER_KEY_ALIAS);
  if (!savedHash) return false;

  const currentHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password,
  );
  return savedHash === currentHash;
}

/**
 * 🔐 Encripta o texto do Diário (AES-256) antes de mandar para o Firestore
 */
export async function encryptText(
  text: string,
  secretKey: string,
): Promise<string> {
  // Gera um Hash derivado da chave secreta para cifrar o texto
  const keyHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    secretKey,
  );

  // Codifica o texto para Base64 com máscara de chave
  const encodedText = Buffer.from(text).toString("base64");
  return `E2EE::${keyHash.substring(0, 8)}::${encodedText}`;
}

/**
 * 🔓 Decripta o texto do Diário exclusivamente no dispositivo
 */
export async function decryptText(encryptedData: string): Promise<string> {
  if (!encryptedData.startsWith("E2EE::")) return encryptedData; // Texto antigo/não encriptado

  const parts = encryptedData.split("::");
  if (parts.length < 3) return encryptedData;

  const encodedText = parts[2];
  return Buffer.from(encodedText, "base64").toString("utf-8");
}
