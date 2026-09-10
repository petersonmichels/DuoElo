import { FontAwesome5 } from "@expo/vector-icons";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CustomAlertModal } from "../components/CustomAlertModal";
import { auth, db } from "../config/firebase";

import { t } from "../i18n/translations";

export default function InvitePartnerScreen({ navigation }: any) {
  const [myInviteCode, setMyInviteCode] = useState("DUE-000");
  const [userLang, setUserLang] = useState("pt-BR");

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 🔔 ESTADO DO ALERT CUSTOMIZADO (Design System DuoElo)
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "info-circle",
    color: "#202D3A",
    confirmText: t("btn_understand", userLang) || "Entendido",
    onConfirm: null as (() => void) | null,
    secondaryText: "",
    onSecondary: null as (() => void) | null,
  });

  const showCustomAlert = (
    title: string,
    message: string,
    icon = "info-circle",
    color = "#202D3A",
    confirmText = t("btn_understand", userLang) || "Entendido",
    onConfirm: (() => void) | null = null,
    secondaryText = "",
    onSecondary: (() => void) | null = null
  ) => {
    setCustomAlert({
      visible: true,
      title,
      message,
      icon,
      color,
      confirmText,
      onConfirm,
      secondaryText,
      onSecondary,
    });
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    const code = currentUid.substring(0, 6).toUpperCase();
    setMyInviteCode(code);

    // Garante a gravação do código no perfil
    setDoc(
      doc(db, "users", currentUid),
      { myInviteCode: code },
      { merge: true }
    ).catch(() => {});

    // Redireciona caso o parceiro conecte enquanto a tela estiver aberta
    const unsubscribe = onSnapshot(
      doc(db, "users", currentUid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.language) setUserLang(data.language);
          
          if (data.partnerId) {
            navigation.navigate("MainTabs", { screen: "Home" });
          }
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // 🎯 DISPARO RÁPIDO DO CONVITE VIA WHATSAPP
  const handleSendWhatsAppInvite = async () => {
    const activeCode = myInviteCode !== "DUE-000" ? myInviteCode : "DUE-XXX";
    const message =
      t("invite_whatsapp_message", userLang, { code: activeCode }) ||
      `Olá! Baixe o DuoElo para conectarmos nosso elo. Use meu código de convite: ${activeCode}`;
    
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    const webUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      showCustomAlert(
        t("whatsapp_error_title", userLang) || "Erro no WhatsApp",
        t("whatsapp_error_msg", userLang) || "Não foi possível abrir o aplicativo do WhatsApp.",
        "exclamation-triangle",
        "#EAB64A"
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* BOTÃO VOLTAR / FECHAR */}
        <TouchableOpacity
          style={styles.floatingCloseBtn}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("MainTabs", { screen: "Home" });
            }
          }}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <FontAwesome5 name="times" size={22} color="#202D3A" />
        </TouchableOpacity>

        <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>
          {/* CABEÇALHO */}
          <View style={styles.headerSection}>
            <View style={styles.iconCircle}>
              <FontAwesome5 name="paper-plane" size={32} color="#67D4A8" />
            </View>
            <Text style={styles.title}>
              {t("invite_header_title_0", userLang) || "Conectar Seu Amor"}
            </Text>
            <Text style={styles.subtitle}>
              {t("invite_header_sub_0", userLang) || "Envie o convite pelo WhatsApp para sincronizarem suas missões no aplicativo."}
            </Text>
          </View>

          {/* CARD DO CÓDIGO */}
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>
              {t("code_generator_label", userLang) || "Seu Código de Convite"}
            </Text>
            <Text style={styles.codeValue}>{myInviteCode}</Text>
          </View>

          {/* AÇÕES */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.mainButton}
              activeOpacity={0.85}
              onPress={handleSendWhatsAppInvite}
            >
              <FontAwesome5 name="whatsapp" size={22} color="#FFF" />
              <Text style={styles.mainButtonText}>
                {t("btn_invite_whatsapp", userLang) || "Enviar pelo WhatsApp"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Match")}
            >
              <Text style={styles.secondaryButtonText}>
                {t("btn_already_have_code", userLang) || "Inserir Código ou Username do Parceiro"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* 🔔 MODAL DE ALERTA PADRONIZADO DA APLICAÇÃO */}
      <CustomAlertModal
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        icon={customAlert.icon}
        color={customAlert.color}
        confirmText={customAlert.confirmText}
        onConfirm={customAlert.onConfirm}
        secondaryText={customAlert.secondaryText}
        onSecondary={customAlert.onSecondary}
        onClose={() => setCustomAlert((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F0F4F8",
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 40,
    justifyContent: "center",
  },
  floatingCloseBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  contentWrapper: {
    alignItems: "center",
    width: "100%",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F4F1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 26,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
    color: "#2C3E50",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  codeCard: {
    backgroundColor: "#FFF",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D9E0",
    alignItems: "center",
    marginBottom: 30,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  codeLabel: {
    fontSize: 12,
    color: "#60646C",
    textTransform: "uppercase",
    fontFamily: "Montserrat_700Bold",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  codeValue: {
    fontSize: 24,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    letterSpacing: 3,
  },
  actionSection: {
    width: "100%",
    alignItems: "center",
    gap: 14,
  },
  mainButton: {
    flexDirection: "row",
    backgroundColor: "#25D366",
    borderRadius: 16,
    paddingVertical: 18,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    shadowColor: "#25D366",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  mainButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  secondaryButton: {
    paddingVertical: 14,
    width: "100%",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#D1D9E0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  secondaryButtonText: {
    color: "#2C3E50",
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    textAlign: "center",
  },
});