import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { t } from "../i18n/translations";

export type AuditAction =
  | "EULA_ACCEPTED"
  | "ANAMNESE_COMPLETED"
  | "ANAMNESE_SKIPPED"
  | "JOURNAL_ENTRY_CREATED"
  | "PARTNER_LINKED"
  | "PARTNER_UNLINKED"
  | "PARTNER_MATCH_REQUESTED"
  | "ACCOUNT_EXCLUSION_REQUESTED"
  | "MASTER_PASSWORD_CHANGED"
  | "MASTER_PASSWORD_VERIFIED"
  | "MASTER_PASSWORD_RESET_REQUESTED"
  | "SUBSCRIPTION_ACTIVATED"
  | "PURCHASE_RESTORED"
  | "GIFT_REDEEMED";

export interface AuditLogPayload {
  uid: string;
  action: AuditAction;
  details?: string;
  timestamp: string;
  platform: string;
  language?: string;
}

/**
 * Grava um log de auditoria imutável na coleção 'audit_logs' do Firestore.
 * Atende às exigências de conformidade LGPD, GDPR e regulamentações internacionais.
 */
export async function logAuditEvent(
  uid: string,
  action: AuditAction,
  details?: string | null,
  userLang: string = "pt-BR"
): Promise<void> {
  if (!uid) return;

  try {
    const auditRef = doc(collection(db, "audit_logs"));

    const translatedFallback = t(`audit_action_${action.toLowerCase()}`, userLang);
    const resolvedDetails =
      details && details.trim().length > 0
        ? details
        : typeof translatedFallback === "string"
        ? translatedFallback
        : action;

    const payload: AuditLogPayload = {
      uid,
      action,
      details: resolvedDetails,
      timestamp: new Date().toISOString(),
      platform: "react-native",
      language: userLang,
    };

    await setDoc(auditRef, payload);
  } catch (error) {
    console.error("[AUDIT_SERVICE_ERROR] Falha ao registrar log de auditoria:", error);
  }
}