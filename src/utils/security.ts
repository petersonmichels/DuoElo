import CryptoJS from "crypto-js";

// Sal adicional (Salt) para proteger contra ataques de Rainbow Table (Força Bruta).
// Mesmo que um hacker descubra os UIDs, ele não tem o Salt do código-fonte.
const APP_SECRET_SALT = "DuoElo_Vault_Sec_2026_X9";

/**
 * Gera a chave criptográfica simétrica fundindo os UIDs do casal.
 * A ordenação garante que UID_A + UID_B gere a mesma chave que UID_B + UID_A.
 */
export const generateVaultKey = (uid1: string, uid2: string): string => {
  const combined = [uid1, uid2].sort().join("|");
  return CryptoJS.SHA256(combined + APP_SECRET_SALT).toString();
};

/**
 * Criptografa qualquer dado (Texto, Array, Objeto) para AES-256.
 */
export const encryptData = (data: any, key: string): string | null => {
  if (!data) return null;
  try {
    const jsonStr = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonStr, key).toString();
  } catch (error) {
    console.error("🛡️ Falha ao criptografar dados:", error);
    return null;
  }
};

/**
 * Descriptografa do AES-256 e converte de volta para o formato original (na RAM).
 */
export const decryptData = (cipherText: string, key: string): any => {
  if (!cipherText) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedStr);
  } catch (error) {
    console.error(
      "🛡️ Falha na descriptografia (Chave incorreta ou dado corrompido):",
      error,
    );
    return null;
  }
};
