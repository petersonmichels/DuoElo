import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ALERT_THEME } from "../constants/alertTheme";

interface CustomAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: string;
  color?: string;
  confirmText?: string;
  onConfirm?: (() => void) | null;
  secondaryText?: string;
  onSecondary?: (() => void) | null;
  onClose?: () => void;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  visible,
  title,
  message,
  icon = "info-circle",
  color = ALERT_THEME.colors.secondary,
  confirmText = "Entendido",
  onConfirm,
  secondaryText,
  onSecondary,
  onClose,
}) => {
  // 🟢 GARANTE UM RÓTULO VÁLIDO PARA O BOTÃO PRINCIPAL
  const buttonLabel =
    confirmText && confirmText.trim() !== "" ? confirmText : "Entendido";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* 🟢 PRESSABLE NO OVERLAY: PERMITE FECHAR AO CLICAR EM QUALQUER LUGAR DO FUNDO */}
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.cardContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={[styles.iconContainer, { backgroundColor: `${color}1A` }]}>
            <FontAwesome5 name={icon} size={28} color={color} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: color }]}
              activeOpacity={0.8}
              onPress={() => {
                if (onClose) onClose();
                if (onConfirm) onConfirm();
              }}
            >
              <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
            </TouchableOpacity>

            {Boolean(secondaryText) && (
              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.7}
                onPress={() => {
                  if (onClose) onClose();
                  if (onSecondary) onSecondary();
                }}
              >
                <Text style={styles.secondaryButtonText}>{secondaryText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: ALERT_THEME.colors.backdrop,
    justifyContent: "flex-end",
  },
  cardContainer: {
    backgroundColor: ALERT_THEME.colors.background,
    borderTopLeftRadius: ALERT_THEME.borderRadius.card,
    borderTopRightRadius: ALERT_THEME.borderRadius.card,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    alignItems: "center",
    ...ALERT_THEME.shadows.modal,
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: ALERT_THEME.colors.border,
    borderRadius: 3,
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    ...ALERT_THEME.typography.title,
    color: ALERT_THEME.colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    ...ALERT_THEME.typography.body,
    color: ALERT_THEME.colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  buttonGroup: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: ALERT_THEME.borderRadius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    ...ALERT_THEME.typography.button,
    color: "#FFFFFF",
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    ...ALERT_THEME.typography.button,
    color: ALERT_THEME.colors.textSecondary,
  },
});