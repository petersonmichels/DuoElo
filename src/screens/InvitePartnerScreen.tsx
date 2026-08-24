import { FontAwesome5 } from "@expo/vector-icons";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../config/firebase";

import { t } from "../i18n/translations";
import { logAuditEvent } from "../services/auditService";

export default function InvitePartnerScreen({ navigation }: any) {
  // 0 = Inicial (Convidar) | 1 = Aguardando Parceiro | 2 = Conectados
  const [connectionStep, setConnectionStep] = useState(0);

  // Estado do código gerado dinamicamente
  const [myInviteCode, setMyInviteCode] = useState("CARREGANDO...");

  // Animação de pulsação para o estado "Aguardando"
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Idioma do Usuário
  const [userLang, setUserLang] = useState("pt-BR");

  // Busca o UID do Firebase e monitora o status do Match em tempo real
  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      setMyInviteCode("DUE-000");
      return;
    }

    // Gera o código a partir do UID do Firebase
    const code = currentUid.substring(0, 6).toUpperCase();
    setMyInviteCode(code);

    // Salva o código no documento do usuário caso ainda não exista
    setDoc(
      doc(db, "users", currentUid),
      { myInviteCode: code },
      { merge: true },
    ).catch(() => {});

    // Escutador em tempo real: desabilita graciosamente em caso de logout
    const unsubscribe = onSnapshot(
      doc(db, "users", currentUid),
      (docSnap) => {
        if (!auth.currentUser) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.language) {
            setUserLang(data.language);
          }
          if (data.partnerId) {
            setConnectionStep(2);
          }
        }
      },
      (error) => {
        if (error.code === "permission-denied") {
          console.log("[InvitePartnerScreen] Listener de convite encerrado.");
        }
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (connectionStep === 1) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [connectionStep, pulseAnim]);

  // AÇÃO PRINCIPAL COM O WHATSAPP E NAVEGAÇÃO INTELIGENTE
  const handleMainAction = async () => {
    if (connectionStep === 0) {
      const message =
        t("invite_whatsapp_message", userLang, {
          code: myInviteCode,
        }) || `Olá! Baixe o DuoElo para conectarmos nosso elo. Use meu código de convite: ${myInviteCode}`;
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

      try {
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
          setConnectionStep(1);
        } else {
          Alert.alert(
            t("whatsapp_not_found_title", userLang) || "WhatsApp não Encontrado",
            t("whatsapp_not_found_msg", userLang) || "Compartilhe seu código manualmente com seu amor.",
          );
          setConnectionStep(1);
        }
      } catch (error) {
        console.error("Erro ao abrir WhatsApp", error);
      }
    } else if (connectionStep === 1) {
      Alert.alert(
        t("waiting_partner_alert_title", userLang) || "Aguardando Seu Amor",
        t("waiting_partner_alert_msg", userLang) || "Assim que seu parceiro aceitar o convite, vocês estarão conectados!",
      );
    } else if (connectionStep === 2) {
      // 🔒 ROTEAMENTO INTELIGENTE PÓS-MATCH
      const currentUid = auth.currentUser?.uid;
      if (currentUid) {
        try {
          // Desativa o modo solo e vincula como casal ativo
          await setDoc(
            doc(db, "users", currentUid),
            { isSoloMode: false },
            { merge: true },
          );

          // 📜 REGISTRO DE AUDITORIA DE SEGURANÇA (PARTNER_LINKED)
          await logAuditEvent(
            currentUid,
            "PARTNER_LINKED",
            "Parceiro vinculado com sucesso via convite",
            userLang
          );

          const userSnap = await getDoc(doc(db, "users", currentUid));
          const userData = userSnap.data();

          if (!userData?.hasCompletedAnamnesis) {
            navigation.navigate("AnamneseScreen");
            return;
          }

          let isUserPremium = Boolean(userData?.isPremium);
          if (!isUserPremium && userData?.partnerId) {
            const partnerSnap = await getDoc(
              doc(db, "users", userData.partnerId),
            );
            if (partnerSnap.exists() && partnerSnap.data()?.isPremium) {
              isUserPremium = true;
            }
          }

          if (!isUserPremium) {
            navigation.navigate("PaywallScreen");
            return;
          }
        } catch (e) {
          console.error("Erro ao verificar requisitos pós-match:", e);
        }
      }

      navigation.navigate("MainTabs", { screen: "Home" });
    }
  };

  const getHeaderTexts = () => {
    switch (connectionStep) {
      case 0:
        return {
          title: t("invite_header_title_0", userLang) || "Conectar Seu Amor",
          sub: t("invite_header_sub_0", userLang) || "Envie o convite para iniciarem o Elo juntos.",
        };
      case 1:
        return {
          title: t("invite_header_title_1", userLang) || "Convite Enviado!",
          sub: t("invite_header_sub_1", userLang) || "Aguardando seu amor aceitar a conexão...",
        };
      case 2:
        return {
          title: t("invite_header_title_2", userLang) || "Elo Conectado! ❤️",
          sub: t("invite_header_sub_2", userLang) || "Vocês agora estão vinculados na jornada.",
        };
      default:
        return { title: "", sub: "" };
    }
  };

  const { title, sub } = getHeaderTexts();

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
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome5 name="times" size={22} color="#202D3A" />
        </TouchableOpacity>

        {/* CABEÇALHO COM AVATARES */}
        <View style={styles.headerSection}>
          <View style={styles.avatarsContainer}>
            {/* Foto do Usuário atual */}
            <View style={[styles.avatarWrapper, { zIndex: 2 }]}>
              <View style={styles.avatarPlaceholder}>
                <FontAwesome5 name="user-alt" size={32} color="#202D3A" />
              </View>
            </View>

            {/* Foto do Parceiro */}
            <View
              style={[
                styles.avatarWrapper,
                styles.partnerAvatarWrapper,
                { zIndex: 1 },
              ]}
            >
              <View
                style={[
                  styles.avatarPlaceholder,
                  connectionStep === 2 ? styles.partnerAvatarConnected : {},
                ]}
              >
                <FontAwesome5
                  name="user-alt"
                  size={32}
                  color={connectionStep === 2 ? "#67D4A8" : "#D1D9E0"}
                />
              </View>
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{sub}</Text>
        </View>

        {/* WORKFLOW (LINHA DO TEMPO) */}
        <View style={styles.workflowCard}>
          <View style={styles.workflowLine} />

          {/* PASSO 1: Convite */}
          <View style={styles.workflowStep}>
            <View
              style={[
                styles.stepIconContainer,
                connectionStep >= 1
                  ? styles.stepIconSuccess
                  : styles.stepIconActive,
              ]}
            >
              <FontAwesome5
                name={connectionStep >= 1 ? "check" : "share-alt"}
                size={16}
                color="#FFF"
              />
            </View>
            <View style={styles.stepTextContainer}>
              <Text
                style={[
                  styles.stepTitle,
                  connectionStep >= 1 ? styles.stepTextSuccess : {},
                ]}
              >
                {connectionStep >= 1
                  ? t("workflow_step_1_done", userLang) || "Convite enviado"
                  : t("workflow_step_1_active", userLang) || "Enviar convite"}
              </Text>
            </View>
          </View>

          {/* PASSO 2: Aguardando */}
          <View style={styles.workflowStep}>
            <Animated.View
              style={[
                styles.stepIconContainer,
                connectionStep === 1 ? styles.stepIconWaiting : {},
                connectionStep === 2 ? styles.stepIconSuccess : {},
                connectionStep === 0 ? styles.stepIconInactive : {},
                {
                  transform:
                    connectionStep === 1
                      ? [{ scale: pulseAnim }]
                      : [{ scale: 1 }],
                  borderWidth: connectionStep === 1 ? 4 : 0,
                  borderColor: "rgba(234, 182, 74, 0.3)",
                },
              ]}
            >
              <FontAwesome5
                name={connectionStep === 2 ? "check" : "download"}
                size={16}
                color={
                  connectionStep === 1
                    ? "#EAB64A"
                    : connectionStep === 2
                      ? "#FFF"
                      : "#AFAFAF"
                }
              />
            </Animated.View>
            <View style={styles.stepTextContainer}>
              <Text
                style={[
                  styles.stepTitle,
                  connectionStep === 1 ? styles.stepTextWaiting : {},
                  connectionStep === 2 ? styles.stepTextSuccess : {},
                  connectionStep === 0 ? styles.stepTextInactive : {},
                ]}
              >
                {connectionStep >= 2
                  ? t("workflow_step_2_done", userLang) || "Convite aceito"
                  : t("workflow_step_2_waiting", userLang) || "Aguardando aceite do amor"}
              </Text>
            </View>
          </View>

          {/* PASSO 3: Conexão */}
          <View style={styles.workflowStep}>
            <View
              style={[
                styles.stepIconContainer,
                connectionStep === 2
                  ? styles.stepIconSuccess
                  : styles.stepIconInactive,
              ]}
            >
              <FontAwesome5
                name={connectionStep === 2 ? "check" : "link"}
                size={16}
                color={connectionStep === 2 ? "#FFF" : "#D1D9E0"}
              />
            </View>
            <View style={styles.stepTextContainer}>
              <Text
                style={[
                  styles.stepTitle,
                  connectionStep === 2
                    ? styles.stepTextSuccess
                    : styles.stepTextInactive,
                ]}
              >
                {t("workflow_step_3_title", userLang) || "Elo Estabelecido"}
              </Text>
            </View>
          </View>
        </View>

        {/* ÁREA DOS BOTÕES */}
        <View style={styles.actionSection}>
          {connectionStep === 0 && (
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>{t("code_generator_label", userLang) || "Seu Código de Convite"}</Text>
              <Text style={styles.codeValue}>{myInviteCode}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.mainButton,
              connectionStep === 1 ? styles.mainButtonWaiting : {},
              connectionStep === 2 ? styles.mainButtonConnected : {},
            ]}
            activeOpacity={0.8}
            onPress={handleMainAction}
          >
            {connectionStep === 0 && (
              <FontAwesome5 name="whatsapp" size={20} color="#FFF" />
            )}
            <Text style={styles.mainButtonText}>
              {connectionStep === 0
                ? t("btn_invite_whatsapp", userLang) || "Enviar pelo WhatsApp"
                : connectionStep === 1
                  ? t("btn_update_status", userLang) || "Verificar Status"
                  : t("btn_start_trail_together", userLang) || "Iniciar Trilha do Casal"}
            </Text>
          </TouchableOpacity>

          {connectionStep === 0 && (
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.6}
              onPress={() => navigation.navigate("Match")}
            >
              <Text style={styles.secondaryButtonText}>
                {t("btn_already_have_code", userLang) || "Inserir Código ou Username do Parceiro"}
              </Text>
            </TouchableOpacity>
          )}

          {connectionStep === 2 && (
            <Text style={styles.welcomeText}>
              {t("welcome_duoelo_msg", userLang) || "Sejam bem-vindos ao DuoElo! ❤️"}
            </Text>
          )}
        </View>
      </View>
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
    paddingTop: 40,
    paddingBottom: 30,
    justifyContent: "space-between",
    position: "relative",
  },
  floatingCloseBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  headerSection: {
    alignItems: "center",
    marginTop: 10,
  },
  avatarsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF",
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  partnerAvatarWrapper: {
    marginLeft: -20,
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: "#F0F4F8",
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  partnerAvatarConnected: {
    backgroundColor: "#E8F4F1",
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
    paddingHorizontal: 15,
  },
  workflowCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 35,
    paddingHorizontal: 20,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: Platform.OS === "android" ? 0 : 1,
    borderColor: "#D1D9E0",
    position: "relative",
  },
  workflowLine: {
    position: "absolute",
    left: 41,
    top: 50,
    bottom: 50,
    width: 2,
    backgroundColor: "#D1D9E0",
    zIndex: 0,
  },
  workflowStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 35,
    zIndex: 1,
  },
  stepIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepIconActive: {
    backgroundColor: "#202D3A",
  },
  stepIconWaiting: {
    backgroundColor: "#FFF9E6",
  },
  stepIconSuccess: {
    backgroundColor: "#67D4A8",
  },
  stepIconInactive: {
    backgroundColor: "#F0F4F8",
    borderWidth: 1,
    borderColor: "#D1D9E0",
    elevation: 0,
    shadowOpacity: 0,
  },
  stepTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    color: "#202D3A",
  },
  stepTextSuccess: {
    color: "#67D4A8",
  },
  stepTextWaiting: {
    color: "#EAB64A",
  },
  stepTextInactive: {
    color: "#60646C",
  },
  actionSection: {
    width: "100%",
    alignItems: "center",
  },
  codeContainer: {
    backgroundColor: "#FFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D1D9E0",
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  codeLabel: {
    fontSize: 12,
    color: "#60646C",
    textTransform: "uppercase",
    fontFamily: "Montserrat_700Bold",
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 20,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    letterSpacing: 2,
  },
  mainButton: {
    flexDirection: "row",
    backgroundColor: "#25D366",
    borderRadius: 16,
    paddingVertical: 18,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#25D366",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  mainButtonWaiting: {
    backgroundColor: "#202D3A",
    shadowColor: "#202D3A",
  },
  mainButtonConnected: {
    backgroundColor: "#67D4A8",
    shadowColor: "#67D4A8",
  },
  mainButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Montserrat_700Bold",
    marginLeft: 10,
  },
  secondaryButton: {
    paddingVertical: 14,
    width: "100%",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#D1D9E0",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#2C3E50",
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
  },
  welcomeText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    color: "#60646C",
  },
});