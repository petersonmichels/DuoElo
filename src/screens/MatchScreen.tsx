import { FontAwesome5 } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth, db } from "../config/firebase";

export default function MatchScreen({ navigation }: any) {
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // ESTADOS PARA O MODAL DE CONFIRMAÇÃO DO MATCH
  const [pendingMatchPartner, setPendingMatchPartner] = useState<any>(null);
  const [isMatchConfirmationVisible, setIsMatchConfirmationVisible] =
    useState(false);

  // ESTADO DE ALERTAS PERSONALIZADOS
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "info-circle",
    color: "#202D3A",
    onConfirm: null as (() => void) | null,
  });

  const showCustomAlert = (
    title: string,
    message: string,
    icon = "info-circle",
    color = "#202D3A",
    onConfirm: (() => void) | null = null,
  ) => {
    setCustomAlert({ visible: true, title, message, icon, color, onConfirm });
  };

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUid(user?.uid || null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUid) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", currentUid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);

        if (!data.myInviteCode) {
          const generatedCode = currentUid.substring(0, 6).toUpperCase();
          setDoc(
            doc(db, "users", currentUid),
            { myInviteCode: generatedCode },
            { merge: true },
          ).catch(() => {});
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUid]);

  // 🔍 HERANÇA AUTOMÁTICA DE ASSINATURA E LEITURA DO PARCEIRO
  useEffect(() => {
    if (userData && userData.partnerId) {
      const unsubscribePartner = onSnapshot(
        doc(db, "users", userData.partnerId),
        async (docSnap) => {
          if (docSnap.exists()) {
            const pData = docSnap.data();
            setPartnerData(pData);

            if (pData.isPremium && !userData.isPremium && currentUid) {
              await setDoc(
                doc(db, "users", currentUid),
                { isPremium: true, isPartnerPremium: true },
                { merge: true },
              );
            }
          }
        },
      );
      return () => unsubscribePartner();
    } else {
      setPartnerData(null);
    }
  }, [userData?.partnerId, userData?.isPremium, currentUid]);

  const handleCopyCode = async () => {
    const codeToCopy = userData?.myInviteCode || currentUid;
    if (codeToCopy) {
      await Clipboard.setStringAsync(codeToCopy);
      showCustomAlert(
        "Código Copiado! 📋",
        "Código copiado para a área de transferência. Envie para o seu amor!",
        "copy",
        "#67D4A8",
      );
    }
  };

  const handleSendInvite = async () => {
    const myCode = userData?.myInviteCode || "DUE-123";
    const message = `Amor, estou investindo na nossa relação. Vamos fazer juntos a jornada de 90 dias do DuoElo? Baixe o app e use o meu código pra gente dar o match: *${myCode}* 👇\n\nhttps://duoelo.com/app`;
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        const webUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      showCustomAlert(
        "Erro ao Abrir WhatsApp",
        "Não conseguimos abrir o WhatsApp. Por favor, copie o código e envie manualmente.",
        "exclamation-triangle",
        "#EAB64A",
      );
    }
  };

  const handleDisconnectPartner = () => {
    Alert.alert(
      "Desconectar Parceiro",
      "Tem certeza de que deseja desfazer o vínculo? Sua trilha pessoal, histórico e pontos permanecerão salvos intactos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sim, Desconectar",
          style: "destructive",
          onPress: async () => {
            const partnerUid = userData?.partnerId;
            if (!currentUid) return;

            setIsDisconnecting(true);
            try {
              await setDoc(
                doc(db, "users", currentUid),
                {
                  partnerId: null,
                  matchStatus: "disconnected",
                  isSoloMode: false,
                  myTrail: null,
                  isReadyToStart: false,
                  hasPressedPlay: false,
                },
                { merge: true },
              );

              if (partnerUid) {
                await setDoc(
                  doc(db, "users", partnerUid),
                  {
                    partnerId: null,
                    matchStatus: "disconnected",
                    isSoloMode: false,
                    myTrail: null,
                    isReadyToStart: false,
                    hasPressedPlay: false,
                  },
                  { merge: true },
                );
              }

              showCustomAlert(
                "Desconectado",
                "O vínculo foi desfeito. Sua trilha individual de progresso permanece salva intacta!",
                "unlink",
                "#EAB64A",
              );
            } catch (e) {
              showCustomAlert(
                "Erro",
                "Não foi possível desfazer a conexão no momento.",
                "times-circle",
                "#D96C6C",
              );
            } finally {
              setIsDisconnecting(false);
            }
          },
        },
      ],
    );
  };

  const handleLinkPartnerCode = async () => {
    const rawClean = inviteCodeInput.trim().replace(/^@/, "");

    if (rawClean.length < 3) {
      showCustomAlert(
        "Atenção",
        "Digite um código ou @username válido.",
        "exclamation-triangle",
        "#EAB64A",
      );
      return;
    }

    if (!currentUid) return;
    setIsMatching(true);

    try {
      const cleanCode = rawClean.toUpperCase();
      let q = query(
        collection(db, "users"),
        where("myInviteCode", "==", cleanCode),
      );
      let querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        const cleanUsername = rawClean.toLowerCase();
        q = query(
          collection(db, "users"),
          where("username", "==", cleanUsername),
        );
        querySnapshot = await getDocs(q);
      }

      if (querySnapshot.empty) {
        showCustomAlert(
          "Match Não Encontrado",
          "Não encontramos ninguém com esse código ou @username. Verifique se digitou corretamente.",
          "search-minus",
          "#EAB64A",
        );
        setIsMatching(false);
        return;
      }

      const partnerDoc = querySnapshot.docs[0];
      const partnerDataDb = partnerDoc.data();
      const partnerId = partnerDoc.id;

      if (partnerId === currentUid) {
        showCustomAlert(
          "Ação Bloqueada",
          "Você não pode utilizar o seu próprio código ou usuário!",
          "ban",
          "#D96C6C",
        );
        setIsMatching(false);
        return;
      }

      if (partnerDataDb?.partnerId && partnerDataDb.partnerId !== currentUid) {
        showCustomAlert(
          "Usuário Ocupado",
          "Este perfil já está conectado a outro parceiro no DuoElo.",
          "user-lock",
          "#EAB64A",
        );
        setIsMatching(false);
        return;
      }

      setPendingMatchPartner({ id: partnerId, data: partnerDataDb });
      setIsMatchConfirmationVisible(true);
    } catch (error) {
      console.error("Erro ao buscar parceiro:", error);
      showCustomAlert(
        "Erro de Conexão",
        "Ocorreu um problema ao tentar buscar a conta. Tente novamente.",
        "times-circle",
        "#D96C6C",
      );
    } finally {
      setIsMatching(false);
    }
  };

  const confirmMatchCode = async () => {
    setIsMatchConfirmationVisible(false);

    const currentUser = auth.currentUser;
    if (!currentUser || !pendingMatchPartner) {
      showCustomAlert(
        "Sessão Expirada 🔒",
        "Sua sessão expirou. Faça login novamente.",
        "user-lock",
        "#D96C6C",
      );
      return;
    }

    setIsMatching(true);

    try {
      const codeToLink = pendingMatchPartner.data?.myInviteCode;

      if (!codeToLink) {
        showCustomAlert(
          "Código Indisponível",
          "Não conseguimos obter o código deste perfil. Tente novamente.",
          "exclamation-triangle",
          "#EAB64A",
        );
        setIsMatching(false);
        return;
      }

      const userRef = doc(db, "users", currentUser.uid);

      // 🔗 VINCULA O PARCEIRO, LIMPA TRILHA SOLO ANTERIOR E RESETA O STATUS DE PLAY
      await setDoc(
        userRef,
        {
          linkedInviteCode: codeToLink,
          isSoloMode: false,
          isReadyToStart: false,
          hasPressedPlay: false,
          myTrail: null,
        },
        { merge: true },
      );

      setInviteCodeInput("");
      setPendingMatchPartner(null);
      setIsMatching(false);

      showCustomAlert(
        "Match Realizado! ❤️",
        "Vocês foram conectados com sucesso! Agora voltem para a Home e deem o Play juntos para liberar a trilha sincronizada.",
        "heart",
        "#67D4A8",
        () => {
          navigation.reset({
            index: 0,
            routes: [
              { name: "MainTabs", state: { routes: [{ name: "Home" }] } },
            ],
          });
        },
      );
    } catch (error: any) {
      console.error("Erro ao solicitar o match no Firestore:", error);
      showCustomAlert(
        "Erro no Match",
        "Não foi possível processar a conexão no momento.",
        "times-circle",
        "#D96C6C",
      );
      setIsMatching(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#202D3A" />
      </SafeAreaView>
    );
  }

  const isValidPhoto = (url: any) =>
    url &&
    typeof url === "string" &&
    url.length > 5 &&
    url.toLowerCase() !== "null";

  const partnerPhoto = isValidPhoto(partnerData?.photoURL)
    ? partnerData.photoURL
    : isValidPhoto(partnerData?.photoUrl)
      ? partnerData.photoUrl
      : null;

  const partnerName =
    partnerData?.billingFirstName && partnerData?.billingLastName
      ? `${partnerData.billingFirstName} ${partnerData.billingLastName}`
      : partnerData?.displayName ||
        partnerData?.email?.split("@")[0] ||
        (partnerData?.username ? `@${partnerData.username}` : "Parceiro(a)");

  const pendingPhoto = isValidPhoto(pendingMatchPartner?.data?.photoURL)
    ? pendingMatchPartner.data.photoURL
    : isValidPhoto(pendingMatchPartner?.data?.photoUrl)
      ? pendingMatchPartner.data.photoUrl
      : null;

  const pendingName =
    pendingMatchPartner?.data?.billingFirstName &&
    pendingMatchPartner?.data?.billingLastName
      ? `${pendingMatchPartner.data.billingFirstName} ${pendingMatchPartner.data.billingLastName}`
      : pendingMatchPartner?.data?.displayName ||
        pendingMatchPartner?.data?.email?.split("@")[0] ||
        (pendingMatchPartner?.data?.username
          ? `@${pendingMatchPartner.data.username}`
          : "Usuário Misterioso");

  const hasPartner = !!userData?.partnerId;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate("MainTabs", { screen: "Home" })
            }
          >
            <FontAwesome5 name="times" size={20} color="#202D3A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seu Match</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. STATUS DO MATCH */}
          <View style={styles.section}>
            {hasPartner ? (
              <View style={styles.connectedCardContainer}>
                <View style={styles.partnerCard}>
                  <View style={styles.partnerAvatarContainer}>
                    {partnerPhoto ? (
                      <Image
                        source={{ uri: partnerPhoto }}
                        style={styles.partnerAvatarImage}
                      />
                    ) : (
                      <FontAwesome5 name="heart" size={24} color="#67D4A8" />
                    )}
                  </View>
                  <View style={styles.partnerInfo}>
                    <Text style={styles.partnerLabel}>Conectado com</Text>
                    <Text style={styles.partnerName} numberOfLines={1}>
                      {partnerName}
                    </Text>
                  </View>
                  <FontAwesome5
                    name="check-circle"
                    solid
                    size={24}
                    color="#67D4A8"
                  />
                </View>

                <TouchableOpacity
                  style={styles.disconnectBtn}
                  activeOpacity={0.8}
                  onPress={handleDisconnectPartner}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? (
                    <ActivityIndicator size="small" color="#D96C6C" />
                  ) : (
                    <>
                      <FontAwesome5 name="unlink" size={14} color="#D96C6C" />
                      <Text style={styles.disconnectBtnText}>
                        Desconectar Parceiro
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.partnerCard,
                  { backgroundColor: "#FFF", borderColor: "#D1D9E0" },
                ]}
              >
                <View
                  style={[
                    styles.partnerAvatarContainer,
                    { backgroundColor: "#F0F4F8" },
                  ]}
                >
                  <FontAwesome5 name="user-plus" size={20} color="#D1D9E0" />
                </View>
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerLabel}>Nenhuma conexão</Text>
                  <Text style={[styles.partnerName, { color: "#60646C" }]}>
                    Aguardando Match
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* 2. ENVIAR CONVITE */}
          {!hasPartner && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                1. Convide seu Parceiro(a)
              </Text>
              <View style={styles.card}>
                <Text style={styles.cardDesc}>
                  Envie o seu código exclusivo. O seu parceiro precisará dele
                  para que vocês iniciem a jornada sincronizados.
                </Text>

                <TouchableOpacity
                  style={styles.codeContainer}
                  onPress={handleCopyCode}
                >
                  <Text style={styles.codeValue}>
                    {userData?.myInviteCode || "DUE-XXX"}
                  </Text>
                  <FontAwesome5 name="copy" size={20} color="#AFAFAF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.whatsappButton}
                  onPress={handleSendInvite}
                >
                  <FontAwesome5 name="whatsapp" size={20} color="#FFF" />
                  <Text style={styles.whatsappButtonText}>
                    Convidar pelo WhatsApp
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 3. RECEBER CONVITE / BUSCA POR USERNAME */}
          {!hasPartner && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Já tem um código ou @?</Text>
              <View
                style={[
                  styles.card,
                  { backgroundColor: "#E8F4F1", borderColor: "#67D4A8" },
                ]}
              >
                <Text style={styles.cardDesc}>
                  Cole o código ou o @username do seu parceiro(a) abaixo para
                  dar o Match.
                </Text>

                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Código ou @username"
                    placeholderTextColor="#AFAFAF"
                    autoCapitalize="none"
                    value={inviteCodeInput}
                    onChangeText={setInviteCodeInput}
                  />
                  <TouchableOpacity
                    style={[
                      styles.btnAction,
                      (!inviteCodeInput || isMatching) && styles.btnDisabled,
                    ]}
                    onPress={handleLinkPartnerCode}
                    disabled={isMatching || inviteCodeInput.trim().length < 3}
                  >
                    {isMatching ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.btnActionText}>Conectar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL DE CONFIRMAÇÃO DO MATCH */}
      <Modal
        visible={isMatchConfirmationVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.codeModalCard}>
            <Text style={styles.codeModalTitle}>É esta pessoa?</Text>
            <Text style={styles.codeModalSub}>
              Verifique se a conta abaixo pertence ao seu amor.
            </Text>

            <View style={{ alignItems: "center", marginBottom: 25 }}>
              {pendingPhoto ? (
                <Image
                  source={{ uri: pendingPhoto }}
                  style={styles.pendingAvatarImage}
                />
              ) : (
                <View style={styles.pendingAvatarPlaceholder}>
                  <FontAwesome5 name="user-alt" size={30} color="#202D3A" />
                </View>
              )}
              <Text style={styles.pendingNameText}>{pendingName}</Text>
            </View>

            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: "#67D4A8" }]}
              onPress={confirmMatchCode}
            >
              <Text style={styles.linkButtonText}>Sim, Conectar!</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelLinkButton}
              onPress={() => {
                setIsMatchConfirmationVisible(false);
                setPendingMatchPartner(null);
              }}
            >
              <Text style={styles.cancelLinkButtonText}>
                Não, errei o código
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE ALERTAS CUSTOMIZADOS */}
      <Modal visible={customAlert.visible} transparent animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHandle} />

            <View
              style={[
                styles.alertIconContainer,
                { backgroundColor: customAlert.color + "20" },
              ]}
            >
              <FontAwesome5
                name={customAlert.icon}
                size={30}
                color={customAlert.color}
              />
            </View>

            <Text style={styles.bottomSheetTitle}>{customAlert.title}</Text>
            <Text style={styles.bottomSheetText}>{customAlert.message}</Text>

            <TouchableOpacity
              style={[
                styles.bottomSheetButtonPrimary,
                { backgroundColor: customAlert.color },
              ]}
              onPress={() => {
                setCustomAlert({ ...customAlert, visible: false });
                if (customAlert.onConfirm) customAlert.onConfirm();
              }}
            >
              <Text style={styles.bottomSheetButtonPrimaryText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F4F8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 20,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
  },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 120 },

  section: { marginBottom: 25 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D9E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDesc: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#60646C",
    lineHeight: 20,
    marginBottom: 15,
  },

  connectedCardContainer: {
    gap: 12,
  },
  partnerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#67D4A8",
    shadowColor: "#67D4A8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  partnerAvatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8F4F1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    overflow: "hidden",
  },
  partnerAvatarImage: { width: "100%", height: "100%" },
  partnerInfo: { flex: 1 },
  partnerLabel: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    color: "#60646C",
    marginBottom: 2,
  },
  partnerName: {
    fontSize: 18,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
  },

  disconnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "#FDE8E8",
    borderWidth: 1,
    borderColor: "#F8B4B4",
  },
  disconnectBtnText: {
    color: "#D96C6C",
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
  },

  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0F4F8",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D9E0",
    marginBottom: 15,
  },
  codeValue: {
    fontSize: 20,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    letterSpacing: 3,
  },

  whatsappButton: {
    flexDirection: "row",
    backgroundColor: "#25D366",
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  whatsappButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    marginLeft: 10,
  },

  inputRow: { flexDirection: "row", gap: 10 },
  input: {
    flex: 1,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#67D4A8",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
    textAlign: "center",
    letterSpacing: 1,
  },
  btnAction: {
    backgroundColor: "#202D3A",
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnActionText: {
    color: "#FFF",
    fontFamily: "Montserrat_900Black",
    fontSize: 15,
  },

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(32, 45, 58, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  codeModalCard: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  codeModalTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 10,
  },
  codeModalSub: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#60646C",
    textAlign: "center",
    marginBottom: 20,
  },
  pendingAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: "#202D3A",
  },
  pendingAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  pendingNameText: {
    fontSize: 20,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
  },
  linkButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  linkButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  cancelLinkButton: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelLinkButtonText: {
    color: "#60646C",
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
  },

  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(32,45,58,0.6)",
    justifyContent: "flex-end",
  },
  bottomSheetContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    width: "100%",
  },
  bottomSheetHandle: {
    width: 50,
    height: 5,
    backgroundColor: "#D1D9E0",
    borderRadius: 3,
    marginBottom: 20,
  },
  alertIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  bottomSheetTitle: {
    fontFamily: "Montserrat_900Black",
    fontSize: 22,
    color: "#202D3A",
    marginBottom: 10,
    textAlign: "center",
  },
  bottomSheetText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 15,
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  bottomSheetButtonPrimary: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetButtonPrimaryText: {
    fontFamily: "Montserrat_700Bold",
    color: "#FFF",
    fontSize: 16,
  },
});
