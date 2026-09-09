import { FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { audioService } from "../services/AudioService";
import { Button3D } from "./Effects3D";

interface MissionCelebrationProps {
  visible: boolean;
  bondsEarned?: number;
  streakCount?: number;
  dayNumber?: number;
  userPhoto?: string | null;
  partnerPhoto?: string | null;
  onContinue: () => void;
}

export const MissionCelebrationModal = ({
  visible,
  bondsEarned = 50,
  streakCount = 1,
  dayNumber = 1,
  userPhoto,
  partnerPhoto,
  onContinue,
}: MissionCelebrationProps) => {
  const titleScale = useSharedValue(0.3);
  const titleOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // 1. Dispara o efeito sonoro de conquista e haptics com fallback seguro
      audioService.play("success");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        // Ignora caso haptics não esteja disponível
      }

      // 2. Animação de pop do título principal (+50 Bonds!)
      titleOpacity.value = withTiming(1, { duration: 300 });
      titleScale.value = withSequence(
        withSpring(1.25, { damping: 7, stiffness: 90 }),
        withSpring(1.0, { damping: 10, stiffness: 100 })
      );
    } else {
      titleScale.value = 0.3;
      titleOpacity.value = 0;
    }
  }, [visible]);

  const animatedTitleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ scale: titleScale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 🌟 TÍTULO ANIMADO DE BONDS */}
            <Animated.Text style={[styles.bondsTitle, animatedTitleStyle]}>
              +{bondsEarned} Bonds!
            </Animated.Text>

            {/* 👥 AVATARES DO CASAL */}
            <View style={styles.avatarsRow}>
              <View style={[styles.avatarFrame, styles.avatarFrameUser]}>
                {userPhoto ? (
                  <Image source={{ uri: userPhoto }} style={styles.avatarImage} />
                ) : (
                  <FontAwesome5 name="user" size={24} color="#202D3A" />
                )}
              </View>
              <View style={[styles.avatarFrame, styles.avatarFramePartner]}>
                {partnerPhoto ? (
                  <Image source={{ uri: partnerPhoto }} style={styles.avatarImage} />
                ) : (
                  <FontAwesome5 name="heart" solid size={24} color="#67D4A8" />
                )}
              </View>
            </View>

            {/* 📊 CARD PRINCIPAL DE PROGRESSO */}
            <View style={styles.progressCard}>
              {/* Missão Diária */}
              <View style={styles.progressSection}>
                <Text style={styles.progressTitle}>Missão Diária Concluída</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.barFill, { width: "100%", backgroundColor: "#67D4A8" }]} />
                  <Text style={styles.barText}>50 / 50</Text>
                  <FontAwesome5 name="gift" size={16} color="#67D4A8" style={styles.barIcon} />
                </View>
              </View>

              {/* Ofensiva Mantida */}
              <View style={styles.progressSection}>
                <Text style={styles.progressTitle}>Ofensiva Mantida</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.barFill, { width: "100%", backgroundColor: "#EAB64A" }]} />
                  <Text style={styles.barText}>{streakCount} / {streakCount}</Text>
                  <FontAwesome5 name="fire" solid size={16} color="#EAB64A" style={styles.barIcon} />
                </View>
              </View>

              {/* Energia do Cupido */}
              <View style={styles.progressSection}>
                <Text style={styles.progressTitle}>Energia do Cupido</Text>
                <Text style={styles.progressSubtitle}>Realizem missões para acordar o Cupido</Text>
                <View style={[styles.barContainer, { backgroundColor: "#F0F4F8" }]}>
                  <View style={[styles.barFill, { width: "33%", backgroundColor: "#202D3A" }]} />
                  <Text style={[styles.barText, { color: "#60646C" }]}>1 / 3</Text>
                  <FontAwesome5 name="battery-quarter" size={16} color="#60646C" style={styles.barIcon} />
                </View>
              </View>
            </View>

            {/* 🏆 CARD JORNADA DE 90 DIAS */}
            <View style={styles.journeyCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.journeyTitle}>Jornada de 90 Dias</Text>
                <Text style={styles.journeySubtitle}>Dia {dayNumber} de 90 Concluído</Text>
              </View>
              <View style={styles.trophyBadge}>
                <FontAwesome5 name="trophy" size={24} color="#EAB64A" />
              </View>
            </View>
          </ScrollView>

          {/* 🔘 BOTÃO 3D CONTINUAR */}
          <View style={styles.footer}>
            <Button3D title="CONTINUAR" onPress={onContinue} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#F4F7FA",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: 20,
  },
  bondsTitle: {
    fontSize: 38,
    fontFamily: "Montserrat_900Black",
    color: "#67D4A8",
    textAlign: "center",
    marginBottom: 20,
  },
  avatarsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  avatarFrame: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarFrameUser: {
    borderColor: "#EAB64A",
    marginRight: -12,
    zIndex: 2,
  },
  avatarFramePartner: {
    borderColor: "#202D3A",
    zIndex: 1,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  progressCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  progressSection: {
    marginBottom: 18,
  },
  progressTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#64748B",
    marginBottom: 8,
  },
  barContainer: {
    height: 36,
    backgroundColor: "#E2E8F0",
    borderRadius: 18,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  barFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
  },
  barText: {
    fontSize: 14,
    fontFamily: "Montserrat_900Black",
    color: "#FFFFFF",
    zIndex: 2,
  },
  barIcon: {
    position: "absolute",
    right: 14,
    zIndex: 2,
  },
  journeyCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  journeyTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
  },
  journeySubtitle: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    color: "#67D4A8",
    marginTop: 2,
  },
  trophyBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#EAB64A",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
  },
  footer: {
    width: "100%",
    paddingTop: 12,
  },
});