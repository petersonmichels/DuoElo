import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { t } from "../i18n/translations";

export type MultiLanguageText = {
  pt: string;
  en: string;
  es: string;
  fr: string;
  de: string;
  ja: string;
};

export interface MissionTask {
  id: string;
  moduleId: number;
  phase: number;
  pointsPE: number;
  title: MultiLanguageText;
  description: MultiLanguageText;
  concept?: MultiLanguageText;
  action?: MultiLanguageText;
}

/**
 * Retorna a data no formato YYYY-MM-DD respeitando o fuso horário local
 */
function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Normaliza um campo de texto bruto ou objeto para a interface MultiLanguageText.
 */
function resolveMultiLangText(
  raw: any,
  fallbackText: string = "",
  userLang: string = "pt-BR"
): MultiLanguageText {
  const defaultFallback = fallbackText || t("task_default_desc", userLang) || "Realize a missão do dia para fortalecer seu elo.";

  if (typeof raw === "string") {
    return {
      pt: raw,
      en: raw,
      es: raw,
      fr: raw,
      de: raw,
      ja: raw,
    };
  }

  if (typeof raw === "object" && raw !== null) {
    const ptText = raw["pt-BR"] || raw["pt"] || defaultFallback;
    return {
      pt: ptText,
      en: raw["en"] || ptText,
      es: raw["es"] || ptText,
      fr: raw["fr"] || ptText,
      de: raw["de"] || ptText,
      ja: raw["ja"] || ptText,
    };
  }

  return {
    pt: defaultFallback,
    en: defaultFallback,
    es: defaultFallback,
    fr: defaultFallback,
    de: defaultFallback,
    ja: defaultFallback,
  };
}

/**
 * Algoritmo Sniper: Busca a próxima Missão Diária ideal para o usuário.
 *
 * @param userId ID do usuário logado
 * @param userLang Idioma do usuário para fallback de traduções
 * @returns O objeto da tarefa (MissionTask) totalmente multi-idioma ou null.
 */
export async function getDailySniperTask(
  userId: string,
  userLang: string = "pt-BR"
): Promise<MissionTask | null> {
  if (!userId) return null;

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("Usuário não encontrado no banco de dados.");
    }

    const userData = userSnap.data();

    // --- TRAVA DE GAMIFICAÇÃO DIÁRIA (FUSO LOCAL COM BYPASS) ---
    const today = getLocalDateString(new Date());
    const lastTaskDate = userData.lastTaskDate;
    const bypassDailyLock = Boolean(userData.bypassDailyLock);

    if (lastTaskDate === today && !bypassDailyLock) {
      console.log("✅ [SNIPER] Usuário já completou a missão de hoje.");
      return null;
    }
    // ------------------------------------------------

    const priorityModules: number[] = userData.priorityModules || [1];
    const completedTasks: string[] = userData.completedTasks || [];
    const currentPhase: number = userData.currentPhase || 1;

    for (const moduleId of priorityModules) {
      const tasksRef = collection(db, "tasks");

      // Consulta flexível aceitando 'phase' ou 'day'
      let q = query(
        tasksRef,
        where("moduleId", "==", moduleId),
        where("phase", "==", currentPhase)
      );

      let querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        q = query(
          tasksRef,
          where("moduleId", "==", moduleId),
          where("day", "==", currentPhase)
        );
        querySnapshot = await getDocs(q);
      }

      // Fallback para campo module_id com sublinhado
      if (querySnapshot.empty) {
        q = query(
          tasksRef,
          where("module_id", "==", moduleId),
          where("day", "==", currentPhase)
        );
        querySnapshot = await getDocs(q);
      }

      const defaultTitle = t("task_default_title", userLang) || "Missão do Elo";
      const defaultDesc =
        t("task_default_desc", userLang) ||
        "Realize a missão do dia para fortalecer seu elo.";

      const availableTasks = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          moduleId: Number(data.moduleId || data.module_id || moduleId),
          phase: Number(data.phase || data.day || currentPhase),
          pointsPE: Number(data.pointsPE || data.points || 50),
          title: resolveMultiLangText(data.title || data.name, defaultTitle, userLang),
          description: resolveMultiLangText(
            data.description || data.concept || data.action,
            defaultDesc,
            userLang
          ),
          concept: resolveMultiLangText(data.concept || data.description, "", userLang),
          action: resolveMultiLangText(data.action || data.description, "", userLang),
        } as MissionTask;
      });

      // Filtra tarefas pendentes não concluídas
      const pendingTasks = availableTasks.filter(
        (task) => !completedTasks.includes(task.id)
      );

      if (pendingTasks.length > 0) {
        return pendingTasks[0];
      }
    }

    console.log("🎯 [SNIPER] Fase concluída para os módulos prioritários!");
    return null;
  } catch (error: any) {
    if (error?.code === "permission-denied") {
      console.log("[SNIPER_SERVICE] Permissão expirada ou sessão encerrada.");
      return null;
    }
    console.error("❌ Erro no Algoritmo Sniper:", error);
    return null;
  }
}