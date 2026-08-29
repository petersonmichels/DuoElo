import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";

export interface CourseSeedPayload {
  id: string;
  titleKey: string;
  moduleIds: number[];
  icon: string;
  createdAt?: any;
}

export async function createDefaultCourses(): Promise<boolean> {
  const courses: CourseSeedPayload[] = [
    {
      id: "trilha_semaforo",
      titleKey: "course.main.title",
      moduleIds: [1, 2, 3, 4, 5, 6, 7, 8, 9], // A jornada completa dos 9 Módulos Clínicos
      icon: "flag-checkered",
    },
    {
      id: "curso_comunicacao",
      titleKey: "course.communication.title",
      moduleIds: [1, 2], // Apenas Início Áspero e 4 Cavaleiros
      icon: "comments",
    },
    {
      id: "curso_intimidade",
      titleKey: "course.intimacy.title",
      moduleIds: [9], // Apenas Neuroquímica e Intimidade
      icon: "heart",
    },
  ];

  try {
    for (const course of courses) {
      await setDoc(
        doc(db, "courses", course.id),
        {
          ...course,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
    console.log("✅ [SEED] Cursos criados/atualizados com sucesso no Firebase!");
    return true;
  } catch (error: any) {
    if (error?.code === "permission-denied") {
      console.log("[SEED] Permissão encerrada ao criar cursos (sessão inativa).");
    } else {
      console.error("❌ Erro ao criar cursos no Firebase: ", error);
    }
    return false;
  }
}