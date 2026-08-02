import { FontAwesome5 } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function InvitePartnerScreen({ navigation }: any) {
  // 0 = Inicial (Convidar) | 1 = Aguardando Parceiro | 2 = Conectados
  const [connectionStep, setConnectionStep] = useState(0);

  // Animação de pulsação para o estado "Aguardando"
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Código de convite do usuário (No futuro, puxaremos do Firebase)
  const myInviteCode = "DUE-123X";

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

  // 🔥 AÇÃO PRINCIPAL ATUALIZADA COM O WHATSAPP (Opção 3)
  const handleMainAction = async () => {
    if (connectionStep === 0) {
      const message = `Amor, estou investindo na nossa relação porque você é muito importante pra mim. Vamos fazer juntos essa jornada de 90 dias do DuoElo? É só baixar o app e colocar o meu código pra gente dar o match: *${myInviteCode}* 👇\n\nhttps://duoelo.com/app`;
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

      try {
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
          // Avança para o estado "Aguardando" após abrir o WhatsApp
          setConnectionStep(1);
        } else {
          Alert.alert(
            "WhatsApp não encontrado",
            "Parece que você não tem o WhatsApp instalado. Copie o código e envie manualmente!",
          );
          // Avança para o passo 1 mesmo assim, para não travar a experiência
          setConnectionStep(1);
        }
      } catch (error) {
        console.error("Erro ao abrir WhatsApp", error);
      }
    } else if (connectionStep === 1) {
      console.log("Atualizando status do banco de dados...");
      // Simula o parceiro aceitando e completando o Match
      setConnectionStep(2);
    } else if (connectionStep === 2) {
      // Vai para a trilha principal!
      navigation.navigate("Home");
    }
  };

  // Textos dinâmicos baseados no estado
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
        {/* --- CABEÇALHO COM AVATARES --- */}
        <View style={styles.headerSection}>
          <View style={styles.avatarsContainer}>
            {/* Foto do Usuário atual */}
            <View style={[styles.avatarWrapper, { zIndex: 2 }]}>
              <View style={styles.avatarPlaceholder}>
                <FontAwesome5 name="user-alt" size={32} color="#AFAFAF" />
              </View>
            </View>

            {/* Foto do Parceiro (Fica cinza até conectar) */}
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
                  color={connectionStep === 2 ? "#FF7EB3" : "#E5E5E5"}
                />
              </View>
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{sub}</Text>
        </View>

        {/* --- WORKFLOW (LINHA DO TEMPO) --- */}
        <View style={styles.workflowCard}>
          {/* Linha conectora ao fundo */}
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

          {/* PASSO 2: Aguardando (Com Animação de Pulso) */}
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
                  borderColor: "rgba(255, 200, 0, 0.3)", // Glow amarelo suave
                },
              ]}
            >
              <FontAwesome5
                name={connectionStep === 2 ? "check" : "download"}
                size={16}
                color={
                  connectionStep === 1
                    ? "#FFC800"
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
                color={connectionStep === 2 ? "#FFF" : "#AFAFAF"}
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

        {/* --- ÁREA DOS BOTÕES --- */}
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
            >
              <Text style={styles.secondaryButtonText}>Já tenho um código</Text>
            </TouchableOpacity>
          )}

          {/* Feedback amigável extra */}
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
    backgroundColor: "#F8F9FA",
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 30,
    justifyContent: "space-between",
  },

  // --- HEADER & AVATARES ---
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
    padding: 4, // Cria uma bordinha branca legal
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  partnerAvatarWrapper: {
    marginLeft: -20, // Sobrepõe a imagem do parceiro levemente
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  partnerAvatarConnected: {
    backgroundColor: "#FFF0F6",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#2C3E50",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#7F8C8D",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 15,
  },

  // --- WORKFLOW CARD ---
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
    borderColor: "#F0F0F0",
    position: "relative",
  },
  workflowLine: {
    position: "absolute",
    left: 41, // Centralizado com os ícones
    top: 50,
    bottom: 50,
    width: 2,
    backgroundColor: "#E5E5E5",
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
    backgroundColor: "#2C3E50", // Azul Escuro
  },
  stepIconWaiting: {
    backgroundColor: "#FFF9E6", // Fundo amarelinho
  },
  stepIconSuccess: {
    backgroundColor: "#4BDE95", // Verde de sucesso
  },
  stepIconInactive: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    elevation: 0,
    shadowOpacity: 0,
  },
  stepTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  stepTextSuccess: {
    color: "#4BDE95",
  },
  stepTextWaiting: {
    color: "#FF9600",
  },
  stepTextInactive: {
    color: "#AFAFAF",
    fontWeight: "500",
  },

  // --- ACTIONS ---
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
    borderColor: "#E5E5E5",
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  codeLabel: {
    fontSize: 12,
    color: "#AFAFAF",
    textTransform: "uppercase",
    fontWeight: "bold",
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#333",
    letterSpacing: 2,
  },
  mainButton: {
    flexDirection: "row",
    backgroundColor: "#25D366", // Verde WhatsApp
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
    backgroundColor: "#3498DB", // Azul padrão para botão neutro
    shadowColor: "#3498DB",
  },
  mainButtonConnected: {
    backgroundColor: "#4BDE95", // Verde Sucesso
    shadowColor: "#4BDE95",
  },
  mainButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
    marginLeft: 10,
  },
  secondaryButton: {
    paddingVertical: 14,
    width: "100%",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#7F8C8D",
    fontSize: 15,
    fontWeight: "bold",
  },
  welcomeText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "bold",
    color: "#AFAFAF",
  },
});
