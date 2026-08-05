import { FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { deleteUser, signOut } from "firebase/auth";
import { deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../config/firebase";

export default function ProfileScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [bypassDailyLock, setBypassDailyLock] = useState(false);

  const isFirstLoad = useRef(true);

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    const userRef = doc(db, "users", currentUid);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);

        setBypassDailyLock(data.bypassDailyLock || false);

        if (isFirstLoad.current) {
          setFirstName(data.billingFirstName || "");
          setLastName(data.billingLastName || "");
          setAddress(data.billingAddress || "");
          setZipCode(data.billingZipCode || "");
          setPhone(data.billingPhone || "");
          isFirstLoad.current = false;
        }

        if (data.partnerId) {
          const partnerRef = doc(db, "users", data.partnerId);
          onSnapshot(partnerRef, (partnerSnap) => {
            if (partnerSnap.exists()) {
              setPartnerData(partnerSnap.data());
            }
          });
        }
      }
      setLoading(false);
    });

    return () => unsubscribeUser();
  }, []);

  const handlePhoneChange = (text: string) => {
    let cleaned = text.replace(/\D/g, "");
    let formatted = cleaned;

    if (cleaned.length > 0) {
      if (cleaned.length <= 2) formatted = `+${cleaned}`;
      else if (cleaned.length <= 4)
        formatted = `+${cleaned.slice(0, 2)} (${cleaned.slice(2)}`;
      else if (cleaned.length <= 9)
        formatted = `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4)}`;
      else
        formatted = `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9, 13)}`;
    }
    setPhone(formatted);
  };

  const handleZipChange = (text: string) => {
    let cleaned = text.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length > 5) {
      formatted = `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
    }
    setZipCode(formatted);
  };

  const handleSaveBilling = async () => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    setIsSaving(true);
    try {
      await setDoc(
        doc(db, "users", currentUid),
        {
          billingFirstName: firstName,
          billingLastName: lastName,
          billingAddress: address,
          billingZipCode: zipCode,
          billingPhone: phone,
        },
        { merge: true },
      );
      Alert.alert("Sucesso", "Seus dados de faturamento foram salvos!");
    } catch (e) {
      Alert.alert("Erro", "Falha ao salvar os dados. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permissão necessária",
        "Você precisa permitir o acesso à galeria para alterar a foto.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.05,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const currentUid = auth.currentUser?.uid;
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;

      if (base64Image.length > 900000) {
        Alert.alert(
          "Foto muito grande",
          "Por favor, escolha uma imagem com menos detalhes.",
        );
        return;
      }

      if (currentUid) {
        setLoading(true);
        try {
          await setDoc(
            doc(db, "users", currentUid),
            { photoURL: base64Image, photoUrl: base64Image },
            { merge: true },
          );
        } catch (e) {
          Alert.alert("Erro", "Não foi possível atualizar a foto.");
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const toggleBypassLock = async (value: boolean) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;
    setBypassDailyLock(value);
    try {
      await setDoc(
        doc(db, "users", currentUid),
        { bypassDailyLock: value },
        { merge: true },
      );
    } catch (e) {
      Alert.alert("Erro", "Não foi possível alterar a trava.");
      setBypassDailyLock(!value);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível sair da conta.");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Excluir Conta Permanentemente",
      "⚠️ Atenção: Esta ação é irreversível. Todos os seus dados, histórico, e a conexão com o seu parceiro serão apagados. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sim, Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const user = auth.currentUser;
              if (user) {
                if (userData?.partnerId) {
                  await setDoc(
                    doc(db, "users", userData.partnerId),
                    { partnerId: null },
                    { merge: true },
                  );
                }
                await deleteDoc(doc(db, "users", user.uid));
                await deleteUser(user);
              }
            } catch (error: any) {
              setLoading(false);
              if (error.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Segurança",
                  "Para excluir sua conta, por favor, saia do aplicativo e faça login novamente para confirmar sua identidade.",
                );
              } else {
                Alert.alert(
                  "Erro",
                  "Não foi possível excluir a conta no momento.",
                );
              }
            }
          },
        },
      ],
    );
  };

  const handleManageSubscription = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("https://apps.apple.com/account/subscriptions");
    } else {
      Linking.openURL("https://play.google.com/store/account/subscriptions");
    }
  };

  const handleSupport = () => {
    Linking.openURL("mailto:suporte@duoelo.com?subject=Suporte%20DuoElo%20App");
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert("Erro", "Não foi possível abrir a página."),
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A2F3B" />
      </SafeAreaView>
    );
  }

  const isValidPhoto = (url: any) => {
    if (!url || typeof url !== "string") return false;
    const trimmed = url.trim();
    if (
      trimmed.length <= 5 ||
      trimmed.toLowerCase() === "null" ||
      trimmed.toLowerCase() === "undefined"
    )
      return false;
    return true;
  };

  const getFirstName = (nameStr?: string) =>
    nameStr ? nameStr.split(" ")[0] : null;

  const myName =
    getFirstName(userData?.displayName) ||
    userData?.email?.split("@")[0] ||
    "Usuário";
  const myPhoto = isValidPhoto(userData?.photoURL)
    ? userData.photoURL
    : isValidPhoto(userData?.photoUrl)
      ? userData.photoUrl
      : null;
  const partnerPhoto = isValidPhoto(partnerData?.photoURL)
    ? partnerData.photoURL
    : isValidPhoto(partnerData?.photoUrl)
      ? partnerData.photoUrl
      : null;

  const partnerName =
    partnerData?.billingFirstName && partnerData?.billingLastName
      ? `${partnerData.billingFirstName} ${partnerData.billingLastName}`
      : partnerData?.displayName && partnerData.displayName.trim().length > 0
        ? partnerData.displayName
        : partnerData?.email?.split("@")[0] || "Parceiro(a)";

  const hasPartner = !!userData?.partnerId;
  const isPremium = userData?.isPremium || false;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome5 name="chevron-left" size={20} color="#1A2F3B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meu Perfil</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              activeOpacity={0.8}
              onPress={handlePickImage}
            >
              {myPhoto ? (
                <Image
                  key={myPhoto.substring(0, 100)}
                  source={{ uri: myPhoto }}
                  style={styles.avatarImage}
                />
              ) : (
                <FontAwesome5 name="user-alt" size={40} color="#E5A93C" />
              )}
              <View style={styles.editPhotoBadge}>
                <FontAwesome5 name="camera" size={12} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>{myName}</Text>
            <Text style={styles.userEmail}>{userData?.email}</Text>

            {isPremium ? (
              <View style={styles.premiumBadge}>
                <FontAwesome5 name="crown" size={12} color="#1A2F3B" />
                <Text style={styles.premiumText}>DuoElo Premium</Text>
              </View>
            ) : (
              <View
                style={[styles.premiumBadge, { backgroundColor: "#D1D9E0" }]}
              >
                <Text style={[styles.premiumText, { color: "#60646C" }]}>
                  Plano Gratuito
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sua Conexão</Text>
            {hasPartner ? (
              <View style={styles.partnerCard}>
                <View style={styles.partnerAvatarContainer}>
                  {partnerPhoto ? (
                    <Image
                      key={partnerPhoto.substring(0, 100)}
                      source={{ uri: partnerPhoto }}
                      style={styles.partnerAvatarImage}
                    />
                  ) : (
                    <FontAwesome5 name="heart" size={24} color="#4BDE95" />
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
                  color="#4BDE95"
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estatísticas da Jornada</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <FontAwesome5 name="fire" size={24} color="#E5A93C" />
                <Text style={styles.statValue}>{userData?.streak || 0}</Text>
                <Text style={styles.statLabel}>Dias Seguidos</Text>
              </View>
              <View style={styles.statBox}>
                <FontAwesome5 name="star" solid size={24} color="#E5A93C" />
                <Text style={styles.statValue}>{userData?.totalPE || 0}</Text>
                <Text style={styles.statLabel}>Pontos PE</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dados de Faturamento</Text>
            <View style={styles.formCard}>
              <View style={styles.rowFields}>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>Nome</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: João"
                    placeholderTextColor="#AFAFAF"
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>Sobrenome</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Silva"
                    placeholderTextColor="#AFAFAF"
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Endereço Completo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Rua, Número, Bairro..."
                  placeholderTextColor="#AFAFAF"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

              <View style={styles.rowFields}>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>CEP / Zip Code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="00000-000"
                    placeholderTextColor="#AFAFAF"
                    keyboardType="number-pad"
                    value={zipCode}
                    onChangeText={handleZipChange}
                    maxLength={9}
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>Telefone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+55 (11) 99999-9999"
                    placeholderTextColor="#AFAFAF"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    maxLength={19}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                activeOpacity={0.8}
                onPress={handleSaveBilling}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Salvar Dados</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assinatura & Jurídico</Text>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleManageSubscription}
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5 name="credit-card" size={16} color="#E5A93C" />
                </View>
                <Text style={styles.menuOptionText}>Gerenciar Assinatura</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() =>
                Alert.alert(
                  "Restaurar",
                  "Lógica do RevenueCat a ser implementada.",
                )
              }
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#E8F4F1" }]}
                >
                  <FontAwesome5 name="sync-alt" size={16} color="#4BDE95" />
                </View>
                <Text style={styles.menuOptionText}>Restaurar Compras</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => openUrl("https://duoelo.com/termos")}
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5
                    name="file-contract"
                    size={16}
                    color="#1A2F3B"
                  />
                </View>
                <Text style={styles.menuOptionText}>Termos de Uso</Text>
              </View>
              <FontAwesome5
                name="external-link-alt"
                size={12}
                color="#D1D9E0"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => openUrl("https://duoelo.com/privacidade")}
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5 name="user-shield" size={16} color="#1A2F3B" />
                </View>
                <Text style={styles.menuOptionText}>
                  Política de Privacidade
                </Text>
              </View>
              <FontAwesome5
                name="external-link-alt"
                size={12}
                color="#D1D9E0"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configurações da Conta</Text>

            <View style={[styles.menuOption, { paddingVertical: 12 }]}>
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5 name="unlock-alt" size={16} color="#E5A93C" />
                </View>
                <View>
                  <Text style={styles.menuOptionText}>
                    Ignorar Trava Diária
                  </Text>
                  <Text
                    style={{ fontSize: 11, color: "#60646C", marginTop: 2 }}
                  >
                    Permite fazer várias tarefas no mesmo dia
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: "#D1D9E0", true: "#4BDE95" }}
                thumbColor={"#FFF"}
                ios_backgroundColor="#D1D9E0"
                onValueChange={toggleBypassLock}
                value={bypassDailyLock}
              />
            </View>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleOpenSettings}
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5 name="bell" size={16} color="#1A2F3B" />
                </View>
                <Text style={styles.menuOptionText}>Ajustar Notificações</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption} onPress={handleSupport}>
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5 name="headset" size={16} color="#1A2F3B" />
                </View>
                <Text style={styles.menuOptionText}>Fale com o Suporte</Text>
              </View>
              <FontAwesome5 name="envelope" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption} onPress={handleLogout}>
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5 name="sign-out-alt" size={16} color="#60646C" />
                </View>
                <Text style={styles.menuOptionText}>Sair da Conta</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOption, { borderBottomWidth: 0 }]}
              onPress={handleDeleteAccount}
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#FFF0F0" }]}
                >
                  <FontAwesome5 name="trash-alt" size={16} color="#D96C6C" />
                </View>
                <Text style={[styles.menuOptionText, { color: "#D96C6C" }]}>
                  Excluir Conta
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>DuoElo v1.0.0</Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#1A2F3B" },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  avatarSection: { alignItems: "center", marginTop: 10, marginBottom: 30 },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF",
    borderWidth: 4,
    borderColor: "#E5A93C", // Ouro suave
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#E5A93C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    overflow: "hidden",
    position: "relative",
  },
  editPhotoBadge: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "rgba(26,47,59,0.7)", // Azul petróleo transparente
    paddingVertical: 4,
    alignItems: "center",
  },
  avatarImage: { width: "100%", height: "100%" },
  userName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1A2F3B",
    marginBottom: 4,
  },
  userEmail: { fontSize: 14, color: "#60646C", marginBottom: 12 },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5A93C",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  premiumText: {
    color: "#1A2F3B", // Texto de alto contraste
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  section: { marginBottom: 30 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1A2F3B",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 15,
  },
  partnerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#4BDE95", // Borda Sucesso Verde
    shadowColor: "#4BDE95",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  partnerAvatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8F4F1", // Fundo Menta
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    overflow: "hidden",
  },
  partnerAvatarImage: { width: "100%", height: "100%" },
  partnerInfo: { flex: 1 },
  partnerLabel: { fontSize: 13, color: "#60646C", marginBottom: 2 },
  partnerName: { fontSize: 18, fontWeight: "900", color: "#1A2F3B" },
  statsContainer: { flexDirection: "row", gap: 15 },
  statBox: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D9E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1A2F3B",
    marginTop: 10,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#60646C",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  formCard: {
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
  rowFields: { flexDirection: "row", gap: 12 },
  halfInput: { flex: 1 },
  inputGroup: { marginBottom: 15 },
  inputLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#60646C",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F0F4F8", // Fundo cinza/azul sutil
    borderWidth: 1,
    borderColor: "#D1D9E0",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1A2F3B",
  },
  saveBtn: {
    backgroundColor: "#1A2F3B", // Azul Petróleo (estabilidade para salvar dados)
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  saveBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#D1D9E0",
  },
  menuOptionLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuOptionText: { fontSize: 16, fontWeight: "bold", color: "#1A2F3B" },
  versionText: {
    textAlign: "center",
    color: "#D1D9E0",
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 20,
  },
});
