import { FontAwesome5 } from "@expo/vector-icons";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { auth } from "../config/firebase";

// Adaptador de Alertas para funcionar perfeitamente na Web e no Celular
const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) {
      showAlert("Atenção", "Preencha e-mail e senha para continuar.");
      return;
    }

    if (password.length < 6) {
      showAlert("Senha Curta", "A sua senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Cria o usuário no Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      // 2. Envia o e-mail de verificação oficial do Firebase
      await sendEmailVerification(userCredential.user);

      showAlert(
        "Conta Criada com Sucesso! 🎉",
        "Enviamos um link de confirmação para o seu e-mail. Por favor, verifique sua caixa de entrada (e o spam) antes de entrar.",
      );

      // Volta para o login após criar a conta
      navigation.goBack();
    } catch (error: any) {
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
              <FontAwesome5 name="seedling" size={36} color="#E5A93C" />
            </View>
            <Text style={styles.title}>Criar Conta</Text>
            <Text style={styles.subtitle}>
              Inicie a restauração do seu relacionamento plantando a primeira
              semente hoje.
            </Text>
          </View>

          <View style={styles.formContainer}>
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
                  <ActivityIndicator color="#1A2F3B" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Cadastrar Conta</Text>
                    <FontAwesome5
                      name="arrow-right"
                      size={16}
                      color="#1A2F3B"
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
    backgroundColor: "#F0F4F8", // Fundo Clínico Azul-Cinza
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    justifyContent: "center",
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
    borderColor: "#E5A93C", // Borda Ouro Suave
    shadowColor: "#E5A93C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1A2F3B", // Azul Petróleo Escuro
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
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
    borderColor: "#D1D9E0", // Borda Clínica
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
    color: "#1A2F3B",
  },
  actionWrapper: {
    marginTop: 10,
    marginBottom: 20,
  },
  buttonMain: {
    flexDirection: "row",
    backgroundColor: "#E5A93C", // Ouro Suave (Destaque acolhedor)
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#E5A93C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: "#1A2F3B", // Acessibilidade WCAG AAA
    fontWeight: "900",
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
  },
  toggleLink: {
    color: "#1A2F3B",
    fontSize: 15,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});
