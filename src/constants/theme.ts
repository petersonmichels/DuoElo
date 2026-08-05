/**
 * Tema Clínico e Validado - DuoElo
 * Foco: Redução de carga cognitiva, segurança psicológica e indução de ocitocina.
 */

import "@/global.css";
import { Platform } from "react-native";

export const Colors = {
  light: {
    // Cores de Superfície (Segurança/Calma)
    background: "#F0F4F8", // Fundo principal Azul-Cinza Suave
    backgroundElement: "#FFFFFF", // Fundo de cards para destacar suavemente
    backgroundSelected: "#E8F4F1", // Verde-Menta atenuado para áreas selecionadas

    // Texto & Legibilidade (Estabilidade)
    text: "#1A2F3B", // Azul-Petróleo Escuro (Evita o contraste agressivo do preto)
    textSecondary: "#2C3E50", // Slate Blue para textos de apoio

    // Ações & Feedbacks (Ocitocina e Dopamina)
    primary: "#1A2F3B",
    accent: "#E5A93C", // Ouro Suave para destaque ativo/calor
    success: "#4BDE95", // Verde Esmeralda para cura e sucesso
  },
  dark: {
    // Cores de Superfície (Abraço/Conforto em baixa luz)
    background: "#1A2F3B", // Fundo principal Azul-Petróleo Escuro
    backgroundElement: "#2C3E50", // Slate Blue para cards
    backgroundSelected: "#3A506B", // Elevação suave para seleções

    // Texto & Legibilidade
    text: "#F0F4F8", // Azul-Cinza muito claro (Evita o brilho do branco puro)
    textSecondary: "#B0C4DE", // Tom de azul acinzentado de apoio

    // Ações & Feedbacks
    primary: "#E8F4F1",
    accent: "#DCA052", // Mel Quente para destaque ativo no dark mode
    success: "#4BDE95",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
