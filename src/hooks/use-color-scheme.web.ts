import { useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

/**
 * Hook com hidratação segura para ambiente Web (evita erros de renderização SSR)
 */
export function useColorScheme(): "light" | "dark" {
  const [hasHydrated, setHasHydrated] = useState(false);
  const colorScheme = useRNColorScheme();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    return "dark"; // Default seguro para o tema Dark do DuoElo
  }

  return colorScheme === "light" ? "light" : "dark";
}