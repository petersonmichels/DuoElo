import { FontAwesome5 } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
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

  // Estados do Formulário de Faturamento
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isFirstLoad = useRef(true);

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    // Escuta os dados do usuário atual
    const userRef = doc(db, "users", currentUid);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);

        // Preenche o formulário apenas na primeira vez que carrega para não sobrescrever a digitação
        if (isFirstLoad.current) {
          setFirstName(data.billingFirstName || "");
          setLastName(data.billingLastName || "");
          setAddress(data.billingAddress || "");
          setZipCode(data.billingZipCode || "");
          setPhone(data.billingPhone || "");
          isFirstLoad.current = false;
        }

        // Se tiver parceiro, escuta os dados do parceiro em tempo real
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

  // Máscara para Telefone (Código do País + DDD + Número)
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

  // Máscara para CEP
  const handleZipChange = (text: string) => {
    let cleaned = text.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length > 5) {
      formatted = `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
    }
    setZipCode(formatted);
  };

  // Salvar Dados de Faturamento no Firebase
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
      "⚠️ Atenção: Esta ação é irreversível. Todos os seus dados, histórico, e a conexão com o seu parceiro serão apagados do sistema da Apple e do Google. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sim, Excluir",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Auditoria",
              "Por segurança, a exclusão será processada pelo painel.",
            ),
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF7EB3" />
      </SafeAreaView>
    );
  }

  // Tratamento de Nomes e Fotos
  const getFirstName = (nameStr?: string) =>
    nameStr ? nameStr.split(" ")[0] : null;

  const myName =
    getFirstName(userData?.displayName) ||
    userData?.email?.split("@")[0] ||
    "Usuário";
  const myPhoto = userData?.photoURL || userData?.photoUrl;

  const partnerName =
    getFirstName(partnerData?.displayName) ||
    partnerData?.email?.split("@")[0] ||
    "Parceiro(a)";
  const partnerPhoto = partnerData?.photoURL || partnerData?.photoUrl;

  const hasPartner = !!userData?.partnerId;
  const isPremium = userData?.isPremium || false;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome5 name="chevron-left" size={20} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meu Perfil</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* AVATAR PRINCIPAL */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {myPhoto ? (
                <Image source={{ uri: myPhoto }} style={styles.avatarImage} />
              ) : (
                <FontAwesome5 name="user-alt" size={40} color="#FF7EB3" />
              )}
            </View>
            <Text style={styles.userName}>{myName}</Text>
            <Text style={styles.userEmail}>{userData?.email}</Text>

            {isPremium ? (
              <View style={styles.premiumBadge}>
                <FontAwesome5 name="crown" size={12} color="#FFF" />
                <Text style={styles.premiumText}>DuoElo Premium</Text>
              </View>
            ) : (
              <View
                style={[styles.premiumBadge, { backgroundColor: "#AFAFAF" }]}
              >
                <Text style={styles.premiumText}>Plano Gratuito</Text>
              </View>
            )}
          </View>

          {/* CARD DO PARCEIRO */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sua Conexão</Text>

            {hasPartner ? (
              <View style={styles.partnerCard}>
                <View style={styles.partnerAvatarContainer}>
                  {partnerPhoto ? (
                    <Image
                      source={{ uri: partnerPhoto }}
                      style={styles.partnerAvatarImage}
                    />
                  ) : (
                    <FontAwesome5 name="heart" size={24} color="#FFF" />
                  )}
                </View>
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerLabel}>Conectado com</Text>
                  <Text style={styles.partnerName}>{partnerName}</Text>
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
                  { backgroundColor: "#F9F9F9", borderColor: "#E5E5E5" },
                ]}
              >
                <View
                  style={[
                    styles.partnerAvatarContainer,
                    { backgroundColor: "#E5E5E5" },
                  ]}
                >
                  <FontAwesome5 name="user-plus" size={20} color="#AFAFAF" />
                </View>
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerLabel}>Nenhuma conexão</Text>
                  <Text style={[styles.partnerName, { color: "#AFAFAF" }]}>
                    Aguardando Match
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* DADOS DA JORNADA */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estatísticas da Jornada</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <FontAwesome5 name="fire" size={24} color="#FF9600" />
                <Text style={styles.statValue}>{userData?.streak || 0}</Text>
                <Text style={styles.statLabel}>Dias Seguidos</Text>
              </View>
              <View style={styles.statBox}>
                <FontAwesome5 name="star" solid size={24} color="#FFC800" />
                <Text style={styles.statValue}>{userData?.totalPE || 0}</Text>
                <Text style={styles.statLabel}>Pontos PE</Text>
              </View>
            </View>
          </View>

          {/* 🔥 DADOS DE FATURAMENTO 🔥 */}
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

          {/* ASSINATURAS E COMPRAS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assinatura</Text>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() =>
                Alert.alert(
                  "Assinatura",
                  "Redirecionando para o gerenciamento de assinaturas da loja...",
                )
              }
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#FFF9E6" }]}
                >
                  <FontAwesome5 name="credit-card" size={16} color="#FF9600" />
                </View>
                <Text style={styles.menuOptionText}>Gerenciar Assinatura</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#CECECE" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() =>
                Alert.alert(
                  "Restaurar Compras",
                  "Buscando histórico de compras na Apple/Google...",
                )
              }
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#E8F8F5" }]}
                >
                  <FontAwesome5 name="sync-alt" size={16} color="#1ABC9C" />
                </View>
                <Text style={styles.menuOptionText}>Restaurar Compras</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#CECECE" />
            </TouchableOpacity>
          </View>

          {/* OPÇÕES DA CONTA */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configurações da Conta</Text>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() =>
                Alert.alert(
                  "Em breve",
                  "Sistema de notificações estará disponível na próxima atualização.",
                )
              }
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F4E5FF" }]}
                >
                  <FontAwesome5 name="bell" size={16} color="#CE82FF" />
                </View>
                <Text style={styles.menuOptionText}>Notificações</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#CECECE" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption} onPress={handleLogout}>
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#FFF0F6" }]}
                >
                  <FontAwesome5 name="sign-out-alt" size={16} color="#FF7EB3" />
                </View>
                <Text style={styles.menuOptionText}>Sair da Conta</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#CECECE" />
            </TouchableOpacity>

            {/* EXIGÊNCIA DA APPLE */}
            <TouchableOpacity
              style={[styles.menuOption, { borderBottomWidth: 0 }]}
              onPress={handleDeleteAccount}
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#FF4B4B20" }]}
                >
                  <FontAwesome5 name="trash-alt" size={16} color="#FF4B4B" />
                </View>
                <Text style={[styles.menuOptionText, { color: "#FF4B4B" }]}>
                  Excluir Conta
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#2C3E50",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF",
    borderWidth: 4,
    borderColor: "#FF7EB3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#FF7EB3",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  userName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#2C3E50",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#7F8C8D",
    marginBottom: 12,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFC800",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  premiumText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#AFAFAF",
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
    borderColor: "#FF7EB3",
    shadowColor: "#FF7EB3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  partnerAvatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FF7EB3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    overflow: "hidden",
  },
  partnerAvatarImage: {
    width: "100%",
    height: "100%",
  },
  partnerInfo: {
    flex: 1,
  },
  partnerLabel: {
    fontSize: 13,
    color: "#7F8C8D",
    marginBottom: 2,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#2C3E50",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 15,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#333",
    marginTop: 10,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#AFAFAF",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  // Formulário de Faturamento
  formCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rowFields: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#7F8C8D",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#2C3E50",
  },
  saveBtn: {
    backgroundColor: "#4BDE95",
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
    borderColor: "#E5E5E5",
  },
  menuOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuOptionText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2C3E50",
  },
});
