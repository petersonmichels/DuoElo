import { useColorScheme as useRNColorScheme } from "react-native";

/**
 * Hook para detectar o tema nativo do sistema (iOS/Android) com fallback para 'dark'
 */
export function useColorScheme(): "light" | "dark" {
  const colorScheme = useRNColorScheme();
  return colorScheme === "light" ? "light" : "dark";
}