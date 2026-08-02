import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
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
      showAlert("Atenção", "Preencha e-mail e senha.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Cria o usuário no Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // 2. Envia o e-mail de verificação oficial do Firebase
      await sendEmailVerification(userCredential.user);

      showAlert(
        "Conta Criada com Sucesso!",
        "Enviamos um link de confirmação para o seu e-mail. Por favor, verifique sua caixa de entrada (e o spam) antes de entrar.",
      );

      // O AppNavigator detectará a criação automática da conta e fará o roteamento.
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

      showAlert(
        "Erro no cadastro",
        `${errorMessage}\n\nDetalhe técnico: ${error.message}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Criar Conta</Text>
      <Text style={styles.subtitle}>
        Inicie a restauração do seu relacionamento hoje.
      </Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Seu e-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!isLoading}
        />
        <TextInput
          style={styles.input}
          placeholder="Crie uma senha (mín. 6 caracteres)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[
            styles.buttonMain,
            isLoading && { backgroundColor: "#95A5A6" },
          ]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Cadastrar e Validar E-mail</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          disabled={isLoading}
        >
          <Text style={styles.backButtonText}>
            Já tem uma conta? Faça Login
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2C3E50",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 40,
    marginTop: 8,
  },
  form: { gap: 16 },
  input: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  buttonMain: {
    backgroundColor: "#27AE60",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  buttonText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  backButton: { marginTop: 16, alignItems: "center" },
  backButtonText: { color: "#2980B9", fontSize: 14, fontWeight: "600" },
});
