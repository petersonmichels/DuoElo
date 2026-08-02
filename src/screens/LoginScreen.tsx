import { FontAwesome5 } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image, // 🔥 Importado para mostrar mensagens de erro bonitas
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

// 🔥 IMPORTANDO O MOTOR DE AUTENTICAÇÃO DO FIREBASE
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../config/firebase";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Feedback de carregamento

  // 🔥 A MÁGICA ACONTECE AQUI
  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert("Atenção", "Por favor, preencha e-mail e senha.");
      return;
    }

    setIsLoading(true);

    try {
      if (isLoginMode) {
        // Tenta fazer o Login
        await signInWithEmailAndPassword(auth, email, password);
        // ATENÇÃO: Nós não usamos navigation.navigate("Home") aqui!
        // Quando o signIn funciona, o AppNavigator percebe a mudança e joga você para a Home sozinho.
      } else {
        // Tenta Criar Nova Conta
        await createUserWithEmailAndPassword(auth, email, password);
        // O AppNavigator também vai jogar você para a Home aqui.
        // Dica de Tech Lead: No futuro, salvaremos o 'inviteCode' no perfil do usuário aqui!
      }
    } catch (error: any) {
      console.log(error);
      Alert.alert(
        "Ops, algo deu errado!",
        "Verifique seus dados de acesso ou senha.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    Alert.alert(
      "Em breve",
      "O login com Google será ativado nas próximas etapas!",
    );
  };

  const handleAppleAuth = () => {
    Alert.alert(
      "Em breve",
      "O login com Apple será ativado nas próximas etapas!",
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo e Boas Vindas */}
          <View style={styles.header}>
            <Image
              source={require("../assets/duoelo_brand_logo.jpg")}
              style={styles.logo}
              resizeMode="contain" // Mantém a proporção real da imagem
            />
            <Text style={styles.title}>
              {isLoginMode ? "Bem-vindo de volta" : "Comece sua jornada"}
            </Text>
            <Text style={styles.subtitle}>
              {isLoginMode
                ? "Entre para continuar fortalecendo seus elos."
                : "Crie sua conta e conecte-se com seu parceiro(a)."}
            </Text>
          </View>

          {/* O CAMPO MÁGICO DO CONVITE */}
          {!isLoginMode && (
            <View style={styles.inviteContainer}>
              <View style={styles.inviteHeader}>
                <FontAwesome5 name="gift" size={16} color="#FF9600" />
                <Text style={styles.inviteTitle}>Recebeu um convite?</Text>
              </View>
              <TextInput
                style={styles.inviteInput}
                placeholder="Cole o código do seu parceiro aqui"
                placeholderTextColor="#AFAFAF"
                autoCapitalize="characters"
                maxLength={8}
                value={inviteCode}
                onChangeText={setInviteCode}
              />
              <Text style={styles.inviteHint}>
                O match será feito automaticamente ao criar a conta.
              </Text>
            </View>
          )}

          {/* Botões Sociais */}
          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={[styles.socialButton, styles.appleButton]}
              onPress={handleAppleAuth}
            >
              <FontAwesome5 name="apple" size={20} color="#FFF" />
              <Text style={styles.appleButtonText}>Continuar com Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.googleButton]}
              onPress={handleGoogleAuth}
            >
              <FontAwesome5 name="google" size={18} color="#333" />
              <Text style={styles.googleButtonText}>Continuar com Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou use seu e-mail</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Formulário Tradicional */}
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Seu melhor e-mail"
              placeholderTextColor="#AFAFAF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Sua senha"
              placeholderTextColor="#AFAFAF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleEmailAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isLoginMode ? "Entrar" : "Criar Conta"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Alternador de Modo (Login <-> Cadastro) */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isLoginMode
                ? "Ainda não tem uma conta?"
                : "Já faz parte do DuoElo?"}
            </Text>
            <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)}>
              <Text style={styles.footerLink}>
                {isLoginMode ? " Criar nova conta" : " Fazer Login"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: "center",
  },

  header: { alignItems: "center", marginBottom: 35 },

  // 🔥 LOGO RESPONSIVO E GIGANTE: Pega 80% da tela e ajusta a altura sem distorcer!
  logo: { width: "80%", height: 110, marginBottom: 28 },

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#2C3E50",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#7F8C8D",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  // Convite Box
  inviteContainer: {
    backgroundColor: "#FFF9E6",
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#FFE273",
  },
  inviteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  inviteTitle: { fontSize: 16, fontWeight: "bold", color: "#FF9600" },
  inviteInput: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    letterSpacing: 1,
  },
  inviteHint: {
    fontSize: 12,
    color: "#B0B0B0",
    textAlign: "center",
    marginTop: 10,
  },

  // Social Auth
  socialContainer: { width: "100%", gap: 12, marginBottom: 25 },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  appleButton: { backgroundColor: "#000", borderColor: "#000" },
  appleButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  googleButton: { backgroundColor: "#FFF", borderColor: "#E5E5E5" },
  googleButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },

  // Divider
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E5E5" },
  dividerText: { marginHorizontal: 15, color: "#AFAFAF", fontSize: 14 },

  // Form Tradicional
  formContainer: { width: "100%", gap: 14 },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#333",
    borderWidth: 1,
    borderColor: "transparent",
  },
  primaryButton: {
    backgroundColor: "#FF7EB3",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#FF7EB3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  primaryButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },

  // Footer
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 40 },
  footerText: { color: "#7F8C8D", fontSize: 14 },
  footerLink: { color: "#FF7EB3", fontSize: 14, fontWeight: "bold" },
});
