import { FontAwesome5 } from "@expo/vector-icons";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, authControls, db } from "../config/firebase";

// Adaptador de Alertas para funcionar em Web e Celular
const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function RegisterScreen({ navigation }: any) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    if (!cleanEmail || !password || !cleanUsername) {
      showAlert("Atenção", "Preencha todos os campos para continuar.");
      return;
    }

    if (cleanUsername.length < 3) {
      showAlert(
        "Nome de Usuário Curto",
        "O seu @username deve ter pelo menos 3 caracteres.",
      );
      return;
    }

    if (password.length < 6) {
      showAlert("Senha Curta", "A sua senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Verifica se o @username já está em uso no Firestore
      const usernameQuery = query(
        collection(db, "users"),
        where("username", "==", cleanUsername),
      );
      const usernameSnap = await getDocs(usernameQuery);

      if (!usernameSnap.empty) {
        setIsLoading(false);
        showAlert(
          "Nome Indisponível",
          "Este @username já está sendo usado. Por favor, escolha outro.",
        );
        return;
      }

      // 2. Trava a transição automática do AppNavigator durante a criação
      if (authControls) authControls.isCreatingAccount = true;

      // 3. Cria o usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password,
      );
      const uid = userCredential.user.uid;

      // 4. Cria o documento oficial no Firestore com todos os dados padrão do DuoElo
      const myGeneratedCode = uid.substring(0, 6).toUpperCase();
      const userDataToSave: any = {
        email: cleanEmail,
        username: cleanUsername,
        myInviteCode: myGeneratedCode,
        createdAt: new Date().toISOString(),
        isPremium: false,
        hasCompletedAnamnesis: false,
        totalPE: 0,
        streak: 0,
        currentPhase: 1,
        currentTaskStep: 0,
        partnerId: null,
      };

      await setDoc(doc(db, "users", uid), userDataToSave, { merge: true });

      // 5. Envia o e-mail de verificação oficial do Firebase
      await sendEmailVerification(userCredential.user);

      // 6. Libera a trava de segurança e desloga o usuário para fazê-lo confirmar o e-mail antes de entrar
      if (authControls) authControls.isCreatingAccount = false;
      await signOut(auth);

      showAlert(
        "Conta Criada com Sucesso! 🎉",
        "Enviamos um link de confirmação para o seu e-mail. Por favor, verifique sua caixa de entrada (e o spam) antes de entrar.",
      );

      // Volta para a tela de login
      navigation.goBack();
    } catch (error: any) {
      if (authControls) authControls.isCreatingAccount = false;
      let errorMessage = "Ocorreu um erro ao tentar criar a conta.";

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Este e-mail já está cadastrado no DuoElo.";
      } else if (error.code === "auth/weak-password") {
        errorMessage =
          "A sua senha é muito fraca. Use pelo menos 6 caracteres.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "O formato do e-mail é inválido.";
      }

      showAlert("Erro no cadastro", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <FontAwesome5 name="seedling" size={36} color="#EAB64A" />
            </View>
            <Text style={styles.title}>Criar Conta</Text>
            <Text style={styles.subtitle}>
              Inicie a restauração do seu relacionamento plantando a primeira
              semente hoje.
            </Text>
          </View>

          <View style={styles.formContainer}>
            {/* CAMPO DE USERNAME */}
            <View style={styles.inputGroup}>
              <FontAwesome5
                name="at"
                size={16}
                color="#60646C"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Nome de usuário (ex: joao_silva)"
                placeholderTextColor="#AFAFAF"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            {/* CAMPO DE E-MAIL */}
            <View style={styles.inputGroup}>
              <FontAwesome5
                name="envelope"
                size={16}
                color="#60646C"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Seu e-mail"
                placeholderTextColor="#AFAFAF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>

            {/* CAMPO DE SENHA */}
            <View style={styles.inputGroup}>
              <FontAwesome5
                name="lock"
                size={16}
                color="#60646C"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Crie uma senha (mín. 6 letras)"
                placeholderTextColor="#AFAFAF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            <View style={styles.actionWrapper}>
              <TouchableOpacity
                style={[
                  styles.buttonMain,
                  isLoading && { backgroundColor: "#D1D9E0", shadowOpacity: 0 },
                ]}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#202D3A" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Cadastrar Conta</Text>
                    <FontAwesome5
                      name="arrow-right"
                      size={16}
                      color="#202D3A"
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>Já faz parte do DuoElo?</Text>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                disabled={isLoading}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Text style={styles.toggleLink}>Faça Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F0F4F8",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    justify.Content: "center",
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 35,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#EAB64A",
    shadowColor: "#EAB64A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
    color: "#60646C",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  formContainer: {
    width: "100%",
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D1D9E0",
    marginBottom: 15,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  inputIcon: {
    width: 24,
    textAlign: "center",
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 10,
    fontSize: 16,
    color: "#202D3A",
    fontFamily: "Montserrat_600SemiBold",
  },
  actionWrapper: {
    marginTop: 10,
    marginBottom: 20,
  },
  buttonMain: {
    flexDirection: "row",
    backgroundColor: "#EAB64A",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#EAB64A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: "#202D3A",
    fontFamily: "Montserrat_900Black",
    fontSize: 17,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  toggleText: {
    color: "#60646C",
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
  },
  toggleLink: {
    color: "#202D3A",
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    textDecorationLine: "underline",
  },
});