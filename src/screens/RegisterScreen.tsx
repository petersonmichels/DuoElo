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
  KeyboardAvoidingView,
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
import { auth, authControls, db } from "../config/firebase";

export default function RegisterScreen({ navigation }: any) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ESTADO DE ALERTAS PERSONALIZADOS (ESTILO BOTTOMSHEET)
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "info-circle",
    color: "#202D3A",
    confirmText: "Entendi",
    onConfirm: null as (() => void) | null,
  });

  const showCustomAlert = (
    title: string,
    message: string,
    icon = "info-circle",
    color = "#202D3A",
    confirmText = "Entendi",
    onConfirm: (() => void) | null = null,
  ) => {
    setCustomAlert({
      visible: true,
      title,
      message,
      icon,
      color,
      confirmText,
      onConfirm,
    });
  };

  const handleRegister = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    if (!cleanEmail || !password || !cleanUsername) {
      showCustomAlert(
        "Atenção",
        "Preencha todos os campos obrigatórios para continuar.",
        "exclamation-triangle",
        "#EAB64A",
      );
      return;
    }

    if (cleanUsername.length < 3) {
      showCustomAlert(
        "Nome Curto",
        "O seu @username deve ter pelo menos 3 caracteres.",
        "user",
        "#EAB64A",
      );
      return;
    }

    if (password.length < 6) {
      showCustomAlert(
        "Senha Curta",
        "A sua senha deve ter pelo menos 6 caracteres.",
        "lock",
        "#EAB64A",
      );
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
        showCustomAlert(
          "Nome Indisponível",
          "Este @username já está sendo usado. Por favor, escolha outro.",
          "user-times",
          "#EAB64A",
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

      // 6. Libera a trava de segurança e desloga o usuário para fazê-lo confirmar o e-mail
      if (authControls) authControls.isCreatingAccount = false;
      await signOut(auth);

      showCustomAlert(
        "Conta Criada com Sucesso! 🎉",
        "Enviamos um link de confirmação para o seu e-mail. Por favor, verifique sua caixa de entrada antes de entrar.",
        "check-circle",
        "#67D4A8",
        "IR PARA LOGIN",
        () => navigation.goBack(),
      );
    } catch (error: any) {
      if (authControls) authControls.isCreatingAccount = false;
      let errorMessage = "Ocorreu um erro ao tentar criar a conta.";

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Este e-mail já está cadastrado no DuoElo.";
      } else if (error.code === "auth/weak-password") {
        errorMessage =
          "A sua senha é muito fraca. Use pelo menos 6 caracteres.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "O formato do e-mail digitado é inválido.";
      }

      showCustomAlert(
        "Erro no Cadastro",
        errorMessage,
        "times-circle",
        "#D96C6C",
      );
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

      {/* MODAL DE ALERTAS PERSONALIZADOS */}
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
              <Text style={styles.bottomSheetButtonPrimaryText}>
                {customAlert.confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: "center", // Corrigido erro de sintaxe 'justify.Content'
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
