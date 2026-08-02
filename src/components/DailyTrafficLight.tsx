import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Os três estados exatos da nossa Máquina de Estados do Semáforo
export type TrafficLightStatus = "PENDING" | "CURRENT" | "COMPLETED";

interface DailyTrafficLightProps {
  status: TrafficLightStatus;
  label: string; // Texto já traduzido (ex: "Missão Diária")
  onPress: () => void; // Ação ao clicar no botão
}

export default function DailyTrafficLight({
  status,
  label,
  onPress,
}: DailyTrafficLightProps) {
  // Define as cores baseadas no estado atual
  const getStylesByStatus = () => {
    switch (status) {
      case "COMPLETED":
        return {
          bgColor: "#58CC02", // Verde Duolingo
          borderColor: "#46A302",
          icon: "✅",
        };
      case "CURRENT":
        return {
          bgColor: "#FF4500", // Laranja vibrante DuoElo
          borderColor: "#CC3700",
          icon: "🔥",
        };
      case "PENDING":
      default:
        return {
          bgColor: "#E5E5E5", // Cinza inativo
          borderColor: "#CCCCCC",
          icon: "🔒",
        };
    }
  };

  const theme = getStylesByStatus();

  return (
    <View style={styles.container}>
      <Text style={styles.labelText}>{label}</Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={status === "PENDING"} // Bloqueia o clique se estiver cinza
        style={[
          styles.button,
          {
            backgroundColor: theme.bgColor,
            borderBottomColor: theme.borderColor,
          },
        ]}
      >
        <Text style={styles.iconText}>{theme.icon}</Text>
      </TouchableOpacity>

      {/* Traço que conecta com a próxima missão (opcional, para dar efeito de trilha) */}
      <View style={styles.pathLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 15,
  },
  labelText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    // O segredo do "Botão Duolingo" é a borda inferior grossa
    borderBottomWidth: 6,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    borderLeftColor: "rgba(255,255,255,0.2)",
    borderRightColor: "rgba(0,0,0,0.1)",
  },
  iconText: {
    fontSize: 32,
  },
  pathLine: {
    width: 8,
    height: 40,
    backgroundColor: "#E5E5E5",
    marginTop: 15,
    borderRadius: 4,
  },
});
