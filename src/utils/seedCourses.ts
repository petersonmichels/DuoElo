import { doc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase"; // Ajuste o caminho se o seu arquivo firebase.ts estiver em outra pasta

export async function createDefaultCourses() {
  const courses = [
    {
      id: "trilha_semaforo",
      titleKey: "course.main.title",
      moduleIds: [1, 2, 3, 4, 5, 6, 7, 8, 9], // A jornada completa
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
      // Cria a coleção 'courses' e salva cada curso lá dentro
      await setDoc(doc(db, "courses", course.id), course);
    }
    console.log("✅ Cursos criados com sucesso no Firebase!");
  } catch (error) {
    console.error("❌ Erro ao criar cursos: ", error);
  }
}
