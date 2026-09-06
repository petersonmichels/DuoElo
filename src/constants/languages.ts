export interface SupportedLanguage {
  code: string;
  flag: string;
  label: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "pt-BR", flag: "🇧🇷", label: "Português (Brasil)" },
  { code: "pt-PT", flag: "🇵🇹", label: "Português (Portugal)" },
  { code: "en", flag: "🇺🇸", label: "English" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "ja", flag: "🇯🇵", label: "日本語" },
];

export const getLanguageFlag = (langCode: string): string => {
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
  return found ? found.flag : "🇧🇷";
};