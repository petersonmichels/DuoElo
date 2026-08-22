import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

export type AuditAction =
  | "EULA_ACCEPTED"
  | "ACCOUNT_EXCLUSION_REQUESTED"
  | "PARTNER_UNLINKED"
  | "MASTER_PASSWORD_CHANGED";

/**
 * 📜 Grava um log de auditoria imutável no Firestore
 */
export async function logAuditEvent(
  userId: string,
  action: AuditAction,
  details?: string,
) {
  try {
    await addDoc(collection(db, "audit_logs"), {
      userId,
      action,
      details: details || "",
      timestamp: serverTimestamp(),
      appVersion: "1.0.0",
    });
  } catch (error) {
    console.error("Erro ao gravar Audit Log:", error);
  }
}
