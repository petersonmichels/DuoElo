/**
 * Tema Clínico e Validado - DuoElo
 * Foco: Redução de carga cognitiva, segurança psicológica e indução de ocitocina.
 */

import { Platform } from "react-native";

export const Colors = {
  light: {
    // Cores de Superfície (Segurança / Calma)
    background: "#F0F4F8", // Fundo principal Azul-Cinza Suave
    backgroundElement: "#FFFFFF", // Fundo de cards para destacar suavemente
    backgroundSelected: "#E8F4F1", // Verde-Menta atenuado para áreas selecionadas

    // Texto & Legibilidade (Estabilidade)
    text: "#1A2F3B", // Azul-Petróleo Escuro (evita o contraste agressivo do preto)
    textSecondary: "#2C3E50", // Slate Blue para textos de apoio

    // Ações & Feedbacks (Ocitocina e Destaque)
    primary: "#1A2F3B",
    accent: "#EAB64A", // Ouro/Mel Suave para destaque
    mint: "#67D4A8", // Verde Menta
    success: "#4BDE95", // Verde Esmeralda
    border: "#D1D9E0",
  },
  dark: {
    // Cores de Superfície (Conforto em baixa luminosidade)
    background: "#09090C", // Fundo primário Dark
    backgroundElement: "#1A1A22", // Card Background Dark
    backgroundSelected: "#2D2D3B", // Elevação suave para seleções

    // Texto & Legibilidade
    text: "#E1E7ED", // Azul-Cinza claro
    textSecondary: "#94A3B8", // Tom acinzentado de apoio

    // Ações & Feedbacks
    primary: "#0F0F12",
    accent: "#EAB64A", // Ouro/Mel Suave
    mint: "#67D4A8", // Verde Menta
    success: "#4BDE95",
    border: "#2D2D3B",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Tipografia oficial Montserrat vinculada às fontes do Expo
export const Fonts = Platform.select({
  ios: {
    regular: "Montserrat_400Regular",
    semiBold: "Montserrat_600SemiBold",
    bold: "Montserrat_700Bold",
    black: "Montserrat_900Black",
    mono: "ui-monospace",
  },
  android: {
    regular: "Montserrat_400Regular",
    semiBold: "Montserrat_600SemiBold",
    bold: "Montserrat_700Bold",
    black: "Montserrat_900Black",
    mono: "monospace",
  },
  default: {
    regular: "Montserrat_400Regular",
    semiBold: "Montserrat_600SemiBold",
    bold: "Montserrat_700Bold",
    black: "Montserrat_900Black",
    mono: "monospace",
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