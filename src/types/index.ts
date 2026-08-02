// Define um texto multi-idioma direto no banco de dados
export type MultiLanguageText = {
  pt: string;
  en: string;
  es: string;
  fr: string;
  de: string;
  ja: string;
};

// Nova estrutura 100% dinâmica do Curso
export interface Course {
  id: string;
  title: MultiLanguageText; // Título vem do banco já traduzido
  description: MultiLanguageText; // Descrição vem do banco
  moduleIds: number[]; // Quais módulos pertencem a este curso
  icon: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  enrolledCourses: string[];
  activeCourseId: string;
}
