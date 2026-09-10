// src/constants/alertTheme.ts
export const ALERT_THEME = {
  colors: {
    primary: "#67D4A8",     // Verde padrão DuoElo
    secondary: "#202D3A",   // Azul escuro principal
    warning: "#EAB64A",     // Amarelo para avisos/Dismatch
    danger: "#D96C6C",      // Vermelho para ações destrutivas
    background: "#FFFFFF",
    backdrop: "rgba(32, 45, 58, 0.65)",
    textPrimary: "#202D3A",
    textSecondary: "#60646C",
    border: "#D1D9E0",
  },
  borderRadius: {
    card: 24,
    button: 14,
    badge: 12,
  },
  typography: {
    title: {
      fontSize: 20,
      fontFamily: "Montserrat_900Black",
    },
    body: {
      fontSize: 14,
      fontFamily: "Montserrat_400Regular",
      lineHeight: 20,
    },
    button: {
      fontSize: 15,
      fontFamily: "Montserrat_700Bold",
    },
  },
  shadows: {
    modal: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 8,
    },
  },
};