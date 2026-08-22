import { Colors } from "../constants/theme";
import { useColorScheme } from "./use-color-scheme";

/**
 * Hook customizado para obter as cores ativas do tema DuoElo (Light ou Dark)
 */
export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? "dark" : "light";

  return {
    colors: Colors[theme],
    isDark: theme === "dark",
    colorScheme: theme,
  };
}