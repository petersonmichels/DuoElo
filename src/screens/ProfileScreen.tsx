import { FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Campos de Faturamento Internacional
  const [fullName, setFullName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");

  // 🔥 ESTADO DA MENSAGEM FLUTUANTE (TOAST)
  const [toastMessage, setToastMessage] = useState("");
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // Função para exibir a mensagem flutuante
  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.timing(toastAnim, {
      toValue: Platform.OS === "ios" ? 50 : 30, // Desce a notificação
      duration: 400,
      useNativeDriver: false, // Evita warning na web
    }).start(() => {
      setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: -100, // Esconde a notificação de novo
          duration: 400,
          useNativeDriver: false,
        }).start();
      }, 3000); // Fica na tela por 3 segundos
    });
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", userId);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setPhotoURL(data.photoURL || null);

          setFullName(data.fullName || "");
          setDocumentId(data.documentId || "");
          setPhone(data.phone || "");
          setStreet(data.street || "");
          setCity(data.city || "");
          setRegion(data.region || "");
          setZipCode(data.zipCode || "");
          setCountry(data.country || "");
        }
      } catch (error) {
        console.error("Erro ao buscar perfil:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permissão necessária",
        "Precisamos de acesso à sua galeria para mudar a foto.",
      );
      return;
    }

    // 🔧 Atualizado para a nova API do Expo e com compressão agressiva
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.05, // 🔥 COMPRESSÃO SEVERA: Evita o erro de limite de Payload do Firebase!
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64String = result.assets[0].base64;

      // Proteção extra: O Firestore só aceita ~1MB por documento.
      // O tamanho do base64 em bytes é aprox. length * 0.75
      const sizeInBytes = base64String.length * 0.75;
      if (sizeInBytes > 900000) {
        // Se for maior que ~900KB
        Alert.alert(
          "Imagem muito grande",
          "Mesmo com a compressão, a imagem ainda é pesada. Escolha uma foto menor.",
        );
        return;
      }

      const imageUri = `data:image/jpeg;base64,${base64String}`;
      setPhotoURL(imageUri);

      const userId = auth.currentUser?.uid;
      if (userId) {
        try {
          // 🔧 setDoc com merge salva de forma segura blindando contra contas fantasmas
          await setDoc(
            doc(db, "users", userId),
            { photoURL: imageUri },
            { merge: true },
          );
          showToast("Foto de perfil atualizada!"); // 🔥 FEEDBACK PREMIUM
        } catch (error) {
          Alert.alert("Erro", "Não foi possível salvar a foto.");
          console.error(error);
        }
      }
    }
  };

  const handleSaveBillingData = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    setIsSaving(true);
    try {
      // 🔧 setDoc blindado
      await setDoc(
        doc(db, "users", userId),
        {
          fullName,
          documentId,
          phone,
          street,
          city,
          region,
          zipCode,
          country,
        },
        { merge: true },
      );
      showToast("Dados salvos com sucesso!"); // 🔥 FEEDBACK PREMIUM
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar os dados. Tente novamente.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // 🔥 FUNÇÃO DE LOGOUT BLINDADA
  const handleLogout = async () => {
    const executeSignOut = async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.log("Erro ao sair (conta pode ter sido excluída):", error);
        Alert.alert(
          "Sessão Encerrada",
          "Sua conta foi desconectada ou excluída com sucesso.",
        );
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Tem certeza que deseja desconectar?")) {
        await executeSignOut();
      }
    } else {
      Alert.alert("Sair", "Tem certeza que deseja desconectar?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: executeSignOut },
      ]);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#CE82FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 🔥 MENSAGEM FLUTUANTE DE SUCESSO (TOAST) */}
      <Animated.View style={[styles.toastContainer, { top: toastAnim }]}>
        <FontAwesome5 name="check-circle" solid size={20} color="#FFF" />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Meu Perfil</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.profileCard}>
            <TouchableOpacity
              style={styles.avatarContainer}
              activeOpacity={0.8}
              onPress={handlePickImage}
            >
              {photoURL ? (
                // 🔧 resizeMode="cover" passado como prop para remover warning web
                <Image
                  source={{ uri: photoURL }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <FontAwesome5 name="user" size={40} color="#CE82FF" />
              )}
              <View style={styles.cameraBadge}>
                <FontAwesome5 name="camera" size={12} color="#FFF" />
              </View>
            </TouchableOpacity>

            <Text style={styles.emailText}>
              {auth.currentUser?.email || "Usuário"}
            </Text>
            <Text style={styles.memberText}>Membro DuoElo</Text>

            {/* 🔥 CÓDIGO DO USUÁRIO ADICIONADO AQUI */}
            <View style={styles.myCodeBadge}>
              <Text style={styles.myCodeBadgeText}>
                Seu Código:{" "}
                {auth.currentUser?.uid.substring(0, 6).toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Dados de Faturamento</Text>
          <Text style={styles.sectionSubtitle}>
            Necessário para emissão de nota fiscal / invoice
          </Text>

          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <FontAwesome5
                name="user-tag"
                size={16}
                color="#AFAFAF"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Nome Completo"
                placeholderTextColor="#AFAFAF"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputGroup}>
              <FontAwesome5
                name="id-card"
                size={16}
                color="#AFAFAF"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Documento (CPF / NIF / Tax ID)"
                placeholderTextColor="#AFAFAF"
                value={documentId}
                onChangeText={setDocumentId}
              />
            </View>

            <View style={styles.inputGroup}>
              <FontAwesome5
                name="phone"
                size={16}
                color="#AFAFAF"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Telefone / WhatsApp"
                placeholderTextColor="#AFAFAF"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputGroup}>
              <FontAwesome5
                name="map-marker-alt"
                size={16}
                color="#AFAFAF"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Endereço (Rua, Número, Bairro)"
                placeholderTextColor="#AFAFAF"
                value={street}
                onChangeText={setStreet}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Cidade"
                  placeholderTextColor="#AFAFAF"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Estado/Província"
                  placeholderTextColor="#AFAFAF"
                  value={region}
                  onChangeText={setRegion}
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="CEP / Postal"
                  placeholderTextColor="#AFAFAF"
                  value={zipCode}
                  onChangeText={setZipCode}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="País"
                  placeholderTextColor="#AFAFAF"
                  value={country}
                  onChangeText={setCountry}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              activeOpacity={0.8}
              onPress={handleSaveBillingData}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <FontAwesome5 name="save" size={16} color="#FFF" />
                  <Text style={styles.saveBtnText}>Salvar Dados</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Conta</Text>

          <TouchableOpacity style={styles.optionButton}>
            <View style={styles.optionIcon}>
              <FontAwesome5 name="cog" size={20} color="#7F8C8D" />
            </View>
            <Text style={styles.optionText}>Configurações</Text>
            <FontAwesome5 name="chevron-right" size={16} color="#BDC3C7" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton}>
            <View style={styles.optionIcon}>
              <FontAwesome5 name="shield-alt" size={20} color="#7F8C8D" />
            </View>
            <Text style={styles.optionText}>Segurança e Privacidade</Text>
            <FontAwesome5 name="chevron-right" size={16} color="#BDC3C7" />
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Acesso</Text>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <FontAwesome5 name="sign-out-alt" size={20} color="#E74C3C" />
            <Text style={styles.logoutText}>Sair da Conta</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomMenu}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("Home")}
        >
          <FontAwesome5 name="home" size={26} color="#AFAFAF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <FontAwesome5 name="user-alt" size={26} color="#CE82FF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },

  // 🔥 ESTILO DO TOAST FLUTUANTE
  toastContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "#4BDE95",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    zIndex: 9999,
    boxShadow: "0px 4px 10px rgba(0,0,0,0.15)",
    elevation: 6,
    gap: 12,
  },
  toastText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },

  header: {
    padding: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  content: { padding: 20, paddingBottom: 100 },

  profileCard: {
    backgroundColor: "#FFF",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F4E5FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    position: "relative",
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#CE82FF",
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  emailText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  memberText: { fontSize: 14, color: "#7F8C8D", marginBottom: 15 },
  myCodeBadge: {
    backgroundColor: "#FFF0E5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  myCodeBadgeText: { color: "#FF9600", fontWeight: "bold", fontSize: 12 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#95A5A6",
    marginTop: 10,
    textTransform: "uppercase",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#AFAFAF",
    marginBottom: 15,
    marginTop: 4,
  },

  formCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 30,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 12,
    paddingHorizontal: 15,
  },
  rowInputs: { flexDirection: "row", justifyContent: "space-between" },
  inputIcon: { width: 24, textAlign: "center" },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 5,
    fontSize: 15,
    color: "#333",
  },

  saveBtn: {
    flexDirection: "row",
    backgroundColor: "#2C3E50",
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },

  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  optionIcon: { width: 30, alignItems: "center", marginRight: 12 },
  optionText: { flex: 1, fontSize: 16, color: "#34495E", fontWeight: "600" },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDEDEC",
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#F5B7B1",
    justifyContent: "center",
    gap: 10,
  },
  logoutText: { fontSize: 16, color: "#E74C3C", fontWeight: "bold" },

  bottomMenu: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingVertical: 15,
    paddingBottom: 30,
    borderTopWidth: 2,
    borderTopColor: "#E5E5E5",
  },
  menuItem: { padding: 10, alignItems: "center", justifyContent: "center" },
});
