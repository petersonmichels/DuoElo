import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { db } from "../config/firebase"; // Ajuste o caminho se necessário

interface HeaderStatsProps {
  userId: string;
}

export default function HeaderStats({ userId }: HeaderStatsProps) {
  const [streak, setStreak] = useState(0);
  const [duoCoins, setDuoCoins] = useState(0);

  useEffect(() => {
    const userRef = doc(db, "users", userId);

    // O 'onSnapshot' escuta as mudanças no documento do usuário em tempo real
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStreak(data.streak || 0);
        setDuoCoins(data.duoCoins || 0);
      }
    });

    // Limpeza de memória: desliga o ouvinte se a tela for fechada
    return () => unsubscribe();
  }, [userId]);

  return (
    <View style={styles.container}>
      {/* Foguinho (Ofensiva) */}
      <View style={styles.statBox}>
        <Text style={styles.icon}>🔥</Text>
        <Text
          style={[
            styles.text,
            streak > 0 ? styles.streakActive : styles.inactive,
          ]}
        >
          {streak}
        </Text>
      </View>

      {/* Moedas (Carteira DuoElo) */}
      <View style={styles.statBox}>
        <Text style={styles.icon}>🪙</Text>
        <Text style={[styles.text, styles.coinActive]}>{duoCoins}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    // Adiciona uma leve sombra para separar do restante do mapa
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10,
  },
  statBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F7F7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  icon: {
    fontSize: 18,
    marginRight: 6,
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
  },
  streakActive: {
    color: "#FF4500", // Laranja do fogo
  },
  coinActive: {
    color: "#FFD700", // Dourado da moeda
  },
  inactive: {
    color: "#AAAAAA", // Cinza se a ofensiva for zero
  },
});
