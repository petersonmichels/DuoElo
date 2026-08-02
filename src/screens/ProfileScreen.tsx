import { FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db } from "../config/firebase";

export default function ProfileScreen({ navigation }: any) {
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Busca a foto do Firebase assim que a tela abre
  useEffect(() => {
    const fetchUserData = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      try {
        const userRef = doc(db, "users", userId);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setPhotoURL(data.photoURL || null);
        }
      } catch (error) {
        console.error("Erro ao buscar perfil:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Abre a galeria e já salva a foto cortada no Firebase
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

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // Habilita a tela de corte
      aspect: [1, 1], // Força ser quadrado
      quality: 0.2, // Comprime para não pesar o banco de dados
      base64: true, // Salva o formato diretamente no código
    });

    if (!result.canceled && result.assets[0].base64) {
      const imageUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhotoURL(imageUri); // Atualiza na tela na mesma hora

      // Salva no banco de dados
      const userId = auth.currentUser?.uid;
      if (userId) {
        try {
          await updateDoc(doc(db, "users", userId), {
            photoURL: imageUri,
          });
          Alert.alert("Sucesso!", "Sua foto de perfil foi atualizada.");
        } catch (error) {
          Alert.alert("Erro", "Não foi possível salvar a foto.");
          console.error(error);
        }
      }
    }
  };

  const handleLogout = () => {
    Alert.alert("Sair", "Tem certeza que deseja desconectar?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => auth.signOut() },
    ]);
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar e Informações Básicas */}
        <View style={styles.profileCard}>
          {/* 🔥 AVATAR CLICÁVEL PARA UPLOAD DE FOTO */}
          <TouchableOpacity
            style={styles.avatarContainer}
            activeOpacity={0.8}
            onPress={handlePickImage}
          >
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatarImage} />
            ) : (
              <FontAwesome5 name="user" size={40} color="#CE82FF" />
            )}

            {/* Ícone indicando que dá pra editar */}
            <View style={styles.cameraBadge}>
              <FontAwesome5 name="camera" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>

          <Text style={styles.emailText}>{auth.currentUser?.email}</Text>
          <Text style={styles.memberText}>Membro DuoElo</Text>
        </View>

        <Text style={styles.sectionTitle}>Conta</Text>

        {/* Botão de Configurações */}
        <TouchableOpacity style={styles.optionButton}>
          <View style={styles.optionIcon}>
            <FontAwesome5 name="cog" size={20} color="#7F8C8D" />
          </View>
          <Text style={styles.optionText}>Configurações</Text>
          <FontAwesome5 name="chevron-right" size={16} color="#BDC3C7" />
        </TouchableOpacity>

        {/* Botão de Segurança */}
        <TouchableOpacity style={styles.optionButton}>
          <View style={styles.optionIcon}>
            <FontAwesome5 name="shield-alt" size={20} color="#7F8C8D" />
          </View>
          <Text style={styles.optionText}>Segurança e Privacidade</Text>
          <FontAwesome5 name="chevron-right" size={16} color="#BDC3C7" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Acesso</Text>

        {/* Botão de Sair */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <FontAwesome5 name="sign-out-alt" size={20} color="#E74C3C" />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MENU INFERIOR FIXO */}
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
    resizeMode: "cover",
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
  memberText: { fontSize: 14, color: "#7F8C8D" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#95A5A6",
    marginBottom: 10,
    marginTop: 10,
    textTransform: "uppercase",
  },

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
