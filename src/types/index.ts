// 🌐 Define um texto multi-idioma direto no banco de dados (Com fallback seguro)
export type MultiLanguageText = {
  pt: string; // Idioma padrão obrigatório
  en?: string;
  es?: string;
  fr?: string;
  de?: string;
  ja?: string;
};

// 📚 Estrutura 100% dinâmica do Curso no Firestore
export interface Course {
  id: string;
  title: MultiLanguageText; // Título vem do banco já traduzido
  description: MultiLanguageText; // Descrição vem do banco
  moduleIds: number[]; // Quais módulos pertencem a este curso
  icon: string;
  createdAt?: any;
}

// 👤 Perfil de Usuário com gerenciamento de Cursos Ativos
export interface UserProfile {
  uid: string;
  email: string;
  enrolledCourses?: string[];
  activeCourseId?: string | null;
}

/**
 * 🛠️ FUNÇÃO HELPER DE SEGURANÇA: Resgata a string no idioma do usuário com fallback automático
 */
export function getLocalizedString(
  text: MultiLanguageText | string | undefined | null,
  userLang: string = "pt"
): string {
  if (!text) return "";
  
  // Se por legado o banco retornar uma string simples em vez do objeto multi-idioma
  if (typeof text === "string") return text;

  // Converte códigos como "pt-BR" ou "en-US" para "pt" ou "en"
  const langKey = userLang.split("-")[0].toLowerCase() as keyof MultiLanguageText;

  return (
    text[langKey] ||
    text.pt ||
    text.en ||
    Object.values(text)[0] ||
    ""
  );
}