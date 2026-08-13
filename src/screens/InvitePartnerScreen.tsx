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

export default function InvitePartnerScreen({ navigation }: any) {
  // 0 = Inicial (Convidar) | 1 = Aguardando Parceiro | 2 = Conectados
  const [connectionStep, setConnectionStep] = useState(0);

  // Estado do código gerado dinamicamente
  const [myInviteCode, setMyInviteCode] = useState("CARREGANDO...");

  // Animação de pulsação para o estado "Aguardando"
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

    // Escutador em tempo real: se o parceiro se conectar, avança para o passo 2 automaticamente!
    const unsubscribe = onSnapshot(doc(db, "users", currentUid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.partnerId) {
          setConnectionStep(2);
        }
      }
    });

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
      const message = `Amor, estou investindo na nossa relação porque você é muito importante pra mim. Vamos fazer juntos essa jornada de 90 dias do DuoElo? É só baixar o app e colocar o meu código pra gente dar o match: *${myInviteCode}* 👇\n\nhttps://duoelo.com/app`;
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

      try {
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
          setConnectionStep(1);
        } else {
          Alert.alert(
            "WhatsApp não encontrado",
            "Parece que você não tem o WhatsApp instalado. Copie o código e envie manualmente!",
          );
          setConnectionStep(1);
        }
      } catch (error) {
        console.error("Erro ao abrir WhatsApp", error);
      }
    } else if (connectionStep === 1) {
      Alert.alert(
        "Aguardando...",
        "Assim que seu parceiro(a) inserir o código no app dele, vocês serão conectados automaticamente!",
      );
    } else if (connectionStep === 2) {
      // 🔒 ROTEAMENTO INTELIGENTE PÓS-MATCH
      const currentUid = auth.currentUser?.uid;
      if (currentUid) {
        try {
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
          title: "Convide seu Par!",
          sub: "A jornada do DuoElo foi desenhada para ser vivida a dois. Conecte-se com seu parceiro(a) agora.",
        };
      case 1:
        return {
          title: "Vocês estão quase lá!",
          sub: "Falta pouco para a jornada começar. Peça para seu parceiro(a) inserir o código no app.",
        };
      case 2:
        return {
          title: "Vocês estão conectados!",
          sub: "Os elos foram unidos. Preparem-se para fortalecer a relação a partir de hoje.",
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
                  ? "1. Convite enviado!"
                  : "1. Enviar convite do DuoElo"}
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
                  ? "2. Parceiro instalou o app!"
                  : "2. Aguardando instalação do parceiro..."}
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
                3. Contas unidas
              </Text>
            </View>
          </View>
        </View>

        {/* ÁREA DOS BOTÕES */}
        <View style={styles.actionSection}>
          {connectionStep === 0 && (
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Código gerador</Text>
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
                ? "Convidar pelo WhatsApp"
                : connectionStep === 1
                  ? "Atualizar Status"
                  : "Começar a Trilha Juntos"}
            </Text>
          </TouchableOpacity>

          {connectionStep === 0 && (
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.6}
              onPress={() => navigation.navigate("MatchScreen")}
            >
              <Text style={styles.secondaryButtonText}>Já tenho um código</Text>
            </TouchableOpacity>
          )}

          {connectionStep === 2 && (
            <Text style={styles.welcomeText}>Bem-vindos ao DuoElo!</Text>
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

  // HEADER & AVATARES
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

  // WORKFLOW CARD
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

  // ACTIONS
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
