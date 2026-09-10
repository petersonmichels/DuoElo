import { addDoc, collection } from "firebase/firestore";
import { Platform } from "react-native";
import { db } from "../config/firebase";
import { t } from "../i18n/translations";

export type AuditAction =
  | "EULA_ACCEPTED"
  | "ANAMNESE_COMPLETED"
  | "ANAMNESE_SKIPPED"
  | "JOURNAL_ENTRY_CREATED"
  | "PARTNER_LINKED"
  | "PARTNER_UNLINKED"
  | "PARTNER_UNLINKED_WITH_SUBSCRIPTION_CHECK" // 👈 Chave necessária para a desvinculação com checagem de assinatura
  | "PARTNER_MATCH_REQUESTED"
  | "ACCOUNT_EXCLUSION_REQUESTED"
  | "MASTER_PASSWORD_CHANGED"
  | "MASTER_PASSWORD_VERIFIED"
  | "MASTER_PASSWORD_RESET_REQUESTED"
  | "SUBSCRIPTION_ACTIVATED"
  | "PURCHASE_RESTORED"
  | "GIFT_REDEEMED"
  | "PLAY_PRESSED";

export interface AuditLogPayload {
  uid: string;
  userId: string;
  action: AuditAction;
  details?: string;
  timestamp: string;
  platform: string;
  language?: string;
}

/**
 * Grava um log de auditoria imutável na coleção 'audit_logs' do Firestore.
 */
export async function logAuditEvent(
  uid: string,
  action: AuditAction,
  details?: string | null,
  userLang: string = "pt-BR"
): Promise<void> {
  if (!uid) return;

  try {
    const auditCollectionRef = collection(db, "audit_logs");

    const translatedFallback = t(`audit_action_${action.toLowerCase()}`, userLang);
    
    let resolvedDetails = action as string;
    if (typeof details === "string" && details.trim().length > 0) {
      resolvedDetails = details.trim();
    } else if (typeof translatedFallback === "string" && translatedFallback.trim().length > 0) {
      resolvedDetails = translatedFallback.trim();
    }

    const payload: AuditLogPayload = {
      uid: String(uid),
      userId: String(uid),
      action,
      details: resolvedDetails,
      timestamp: new Date().toISOString(),
      platform: Platform.OS || "react-native",
      language: userLang,
    };

    await addDoc(auditCollectionRef, payload);
  } catch (error: unknown) {
    // 🛡️ Captura silenciosa para evitar travar o fluxo do usuário em caso de permissão negada
    console.warn("[AUDIT_SERVICE] Falha ao registrar log de auditoria:", error);
  }
}