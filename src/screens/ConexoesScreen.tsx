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

export default function ConexoesScreen() {
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [isMatching, setIsMatching] = useState(false);

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

        // Se ainda não tiver myInviteCode, cria um
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

  useEffect(() => {
    if (userData && userData.partnerId) {
      const unsubscribePartner = onSnapshot(
        doc(db, "users", userData.partnerId),
        (docSnap) => {
          if (docSnap.exists()) setPartnerData(docSnap.data());
        },
      );
      return () => unsubscribePartner();
    } else {
      setPartnerData(null);
    }
  }, [userData?.partnerId]);

  const handleCopyCode = async () => {
    const codeToCopy = userData?.myInviteCode || currentUid;
    if (codeToCopy) {
      await Clipboard.setStringAsync(codeToCopy);
      Alert.alert("Código Copiado!", "Envie para o seu parceiro(a)!");
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
      Alert.alert(
        "Erro",
        "Não conseguimos abrir o WhatsApp. Por favor, copie o código e envie manualmente.",
      );
    }
  };

  // 🔥 BUSCA DUPLA (@USERNAME ou CÓDIGO) E CONEXÃO DEFINITIVA NO BANCO
  const handleLinkPartnerCode = async () => {
    const rawInput = inviteCodeInput.trim();

    if (rawInput.length < 3) {
      Alert.alert("Inválido", "Digite um código ou @username válido.");
      return;
    }

    if (!currentUid) return;
    setIsMatching(true);

    try {
      // 1. Tenta buscar pelo Código (Sempre em Maiúsculo)
      const cleanCode = rawInput.toUpperCase();
      let q = query(
        collection(db, "users"),
        where("myInviteCode", "==", cleanCode),
      );
      let querySnapshot = await getDocs(q);

      // 2. Se não achar, tenta buscar pelo @username (Sem o @ e minúsculo)
      if (querySnapshot.empty) {
        const cleanUsername = rawInput.replace("@", "").toLowerCase();
        q = query(
          collection(db, "users"),
          where("username", "==", cleanUsername),
        );
        querySnapshot = await getDocs(q);
      }

      if (querySnapshot.empty) {
        Alert.alert(
          "Match Não Encontrado",
          "Não encontramos ninguém com esse código ou @username.",
        );
        setIsMatching(false);
        return;
      }

      const partnerDoc = querySnapshot.docs[0];
      const partnerDataDb = partnerDoc.data();
      const partnerId = partnerDoc.id;

      if (partnerId === currentUid) {
        Alert.alert(
          "Ação Bloqueada",
          "Você não pode usar o seu próprio usuário/código!",
        );
        setIsMatching(false);
        return;
      }

      // 3. Compartilha o status Premium se alguém pagou
      const partnerIsPremium = partnerDataDb?.isPremium || false;
      const currentUserIsPremium = userData?.isPremium || false;
      const finalPremiumStatus = partnerIsPremium || currentUserIsPremium;

      // 4. Une as Contas Oficialmente no Banco de Dados
      await setDoc(
        doc(db, "users", currentUid),
        { partnerId: partnerId, isPremium: finalPremiumStatus },
        { merge: true },
      );
      await setDoc(
        doc(db, "users", partnerId),
        { partnerId: currentUid, isPremium: finalPremiumStatus },
        { merge: true },
      );

      setInviteCodeInput("");
      Alert.alert(
        "Match Realizado! ❤️",
        "As contas foram conectadas. Vá para a aba Home para dar a largada na jornada juntos.",
      );
    } catch (error) {
      Alert.alert(
        "Erro de Conexão",
        "Ocorreu um problema ao tentar buscar a conta. Tente novamente.",
      );
    } finally {
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
        "Parceiro(a)";

  const hasPartner = !!userData?.partnerId;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Seu Match</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. STATUS DO MATCH */}
          <View style={styles.section}>
            {hasPartner ? (
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
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
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
});
