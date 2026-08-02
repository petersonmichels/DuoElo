import { useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MissionTask } from "../services/taskEngine";

interface MissionExecutionProps {
  mission: MissionTask;
  userLanguage: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function MissionExecutionScreen({
  mission,
  userLanguage,
  onClose,
  onComplete,
}: MissionExecutionProps) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // === PROGRAMAÇÃO DEFENSIVA ===
  // Tenta pegar o idioma do celular. Se não existir no banco, força o 'pt' (Português).
  const safeLanguage = userLanguage as keyof typeof mission.title;
  const title =
    mission.title[safeLanguage] || mission.title.pt || "Missão DuoElo";
  const description =
    mission.description[safeLanguage] ||
    mission.description.pt ||
    "Siga as instruções para completar a missão.";

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeText}>✕ Fechar</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🔥 VALE {mission.pointsPE} PE</Text>
        </View>

        <Text style={styles.title}>{title}</Text>

        <View style={styles.card}>
          <Text style={styles.description}>{description}</Text>
        </View>

        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          {!isActive && timeLeft > 0 ? (
            <TouchableOpacity
              style={styles.timerButton}
              onPress={() => setIsActive(true)}
            >
              <Text style={styles.timerButtonText}>▶ Iniciar Foco</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerInstruction}>
              {timeLeft > 0 ? "Respire e execute a ação..." : "Tempo esgotado!"}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.completeButton}
          activeOpacity={0.8}
          onPress={onComplete}
        >
          <Text style={styles.completeButtonText}>✅ MISSÃO CUMPRIDA</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5F0",
  },
  closeButton: {
    padding: 20,
    alignSelf: "flex-end",
  },
  closeText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#FFD700",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeText: {
    fontWeight: "900",
    color: "#D2691E",
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    width: "100%",
    marginBottom: 40,
  },
  description: {
    fontSize: 18,
    lineHeight: 28,
    color: "#444",
    textAlign: "center",
  },
  timerContainer: {
    alignItems: "center",
  },
  timerText: {
    fontSize: 48,
    fontWeight: "300",
    color: "#FF4500",
    fontVariant: ["tabular-nums"],
    marginBottom: 10,
  },
  timerButton: {
    backgroundColor: "#F0F0F0",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  timerButtonText: {
    color: "#666",
    fontWeight: "bold",
  },
  timerInstruction: {
    color: "#888",
    fontSize: 16,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  completeButton: {
    backgroundColor: "#58CC02",
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: "center",
    borderBottomWidth: 6,
    borderBottomColor: "#46A302",
  },
  completeButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
