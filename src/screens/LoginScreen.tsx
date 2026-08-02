import { FontAwesome5 } from "@expo/vector-icons";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
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

const { width } = Dimensions.get("window");

export default function LoginScreen({ navigation }: any) {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isLogin]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, []);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // 🔥 MOTOR UNIFICADO (CRIAÇÃO E LOGIN SIMULTÂNEOS)
  const handleAuth = async () => {
    const cleanEmail = email.trim();
    const cleanCode = inviteCode.trim().toUpperCase();

    if (!cleanEmail || !password) {
      showAlert("Atenção", "Preencha e-mail e senha para continuar.");
      return;
    }

    if (password.length < 6) {
      showAlert("Senha Curta", "Sua senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      let user;

      // 1. AUTENTICAÇÃO (Isso nos dá permissão máxima no banco de dados)
      if (isLogin) {
        const userCred = await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password,
        );
        user = userCred.user;
      } else {
        const userCred = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password,
        );
        user = userCred.user;
      }

      const uid = user.uid;
      const myGeneratedCode = uid.substring(0, 6).toUpperCase();

      // 2. SALVA/ATUALIZA OS DADOS BÁSICOS DO USUÁRIO
      const userDataToSave: any = {
        email: cleanEmail,
        myInviteCode: myGeneratedCode,
      };

      if (!isLogin) {
        userDataToSave.createdAt = new Date().toISOString();
        userDataToSave.isPremium = false;
        userDataToSave.hasCompletedAnamnesis = false;
        userDataToSave.totalPE = 0;
        userDataToSave.streak = 0;
        userDataToSave.currentPhase = 1;
        userDataToSave.currentTaskStep = 0;
        userDataToSave.partnerId = null;
      }

      await setDoc(doc(db, "users", uid), userDataToSave, { merge: true });

      // 3. PROCESSA O MATCH SE UM CÓDIGO FOI INSERIDO
      if (cleanCode.length > 0) {
        // Agora que estamos logados, o Firebase vai permitir a busca com sucesso!
        const q = query(
          collection(db, "users"),
          where("myInviteCode", "==", cleanCode),
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          const partnerId = snap.docs[0].id;
          const partnerData = snap.docs[0].data();

          if (partnerId !== uid) {
            const isPartnerPremium = partnerData.isPremium || false;

            // Amarra você ao parceiro
            await setDoc(
              doc(db, "users", uid),
              {
                partnerId: partnerId,
                isPremium: isPartnerPremium, // Herda o Premium se for o caso
              },
              { merge: true },
            );

            // Amarra o parceiro a você (Reciprocidade)
            await setDoc(
              doc(db, "users", partnerId),
              {
                partnerId: uid,
              },
              { merge: true },
            );

            showAlert(
              "Match Concluído! ❤️",
              `Você e ${partnerData.email} estão conectados.`,
            );
          }
        } else {
          // Se não achou (porque a conta é antiga ou o código tá errado)
          showAlert(
            "Aviso de Match",
            "Sua conta foi acessada com sucesso, mas o Código de Match não foi encontrado. Verifique se o parceiro já criou a conta.",
          );
        }
      } else if (!isLogin) {
        // Se criou conta sem código
        showAlert("Conta Criada! 🎉", "Seu perfil foi criado com sucesso.");
      }

      // Tudo concluído! Não precisamos deslogar. O AppNavigator vai detectar
      // o login ativo e jogar a pessoa para a HomeScreen automaticamente e conectada!
    } catch (error: any) {
      setIsLoading(false);
      console.log("Erro no Auth:", error.code);
      let msg = "Ocorreu um erro inesperado.";

      if (error.code === "auth/email-already-in-use")
        msg = "Este e-mail já está cadastrado. Vá em 'Entrar' para acessar.";
      if (error.code === "auth/invalid-credential")
        msg = "E-mail ou senha incorretos.";
      if (error.code === "auth/too-many-requests")
        msg = "Muitas tentativas. Aguarde um momento.";

      showAlert("Ops!", msg);
    }
  };

  const handleSocialLogin = (provider: string) => {
    showAlert(
      "Em Breve",
      `O login com ${provider} será ativado na próxima fase. Use e-mail e senha por enquanto!`,
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.header,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Animated.View
              style={[
                styles.logoWrapper,
                { transform: [{ translateY: floatAnim }] },
              ]}
            >
              <View style={styles.logoImageContainer}>
                <Image
                  source={require("../assets/duoelo_brand_logo.jpg")}
                  style={styles.logoImage}
                  resizeMode="cover"
                />
              </View>
            </Animated.View>

            <Text style={styles.title}>
              {isLogin ? "Bem-vindo de volta" : "Comece sua jornada"}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin
                ? "Continue fortalecendo o seu elo hoje."
                : "Crie sua conta e dê o primeiro passo para resgatar a sua conexão."}
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.formContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* O CAMPO DE MATCH SEMPRE VISÍVEL */}
            <View style={styles.inviteBox}>
              <View style={styles.inviteHeader}>
                <FontAwesome5 name="heart" solid size={16} color="#FF9600" />
                <Text style={styles.inviteTitle}>Conexão DuoElo</Text>
              </View>
              <Text style={styles.inviteDesc}>
                Se possui o código de match do parceiro(a), insira aqui.
              </Text>
              <TextInput
                style={styles.inviteInput}
                placeholder="Código de Match (Opcional)"
                placeholderTextColor="#AFAFAF"
                autoCapitalize="characters"
                value={inviteCode}
                onChangeText={setInviteCode}
              />
            </View>

            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => handleSocialLogin("Google")}
              >
                <FontAwesome5 name="google" size={20} color="#EA4335" />
                <Text style={styles.socialBtnText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => handleSocialLogin("Apple")}
              >
                <FontAwesome5 name="apple" size={24} color="#000" />
                <Text style={styles.socialBtnText}>Apple</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou use seu e-mail</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.inputGroup}>
              <FontAwesome5
                name="envelope"
                size={16}
                color="#AFAFAF"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Seu e-mail"
                placeholderTextColor="#AFAFAF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <FontAwesome5
                name="lock"
                size={16}
                color="#AFAFAF"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Sua senha (mín 6 letras)"
                placeholderTextColor="#AFAFAF"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {isLogin && (
              <TouchableOpacity
                style={styles.forgotPasswordBtn}
                onPress={() =>
                  showAlert(
                    "Recuperação",
                    "Em breve você poderá redefinir sua senha aqui.",
                  )
                }
              >
                <Text style={styles.forgotPasswordText}>
                  Esqueci minha senha
                </Text>
              </TouchableOpacity>
            )}

            <Animated.View
              style={[
                styles.floatingBtnWrapper,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <TouchableOpacity
                style={styles.floatingBtn}
                activeOpacity={0.9}
                onPress={handleAuth}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.floatingBtnText}>
                      {isLogin ? "Entrar na Conta" : "Criar Minha Conta"}
                    </Text>
                    <FontAwesome5 name="arrow-right" size={18} color="#FFF" />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                {isLogin
                  ? "Ainda não tem uma conta?"
                  : "Já faz parte do DuoElo?"}
              </Text>
              <TouchableOpacity
                onPress={() => setIsLogin(!isLogin)}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Text style={styles.toggleLink}>
                  {isLogin ? "Criar conta" : "Entrar"}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    justifyContent: "center",
    paddingBottom: 40,
    paddingTop: 40,
  },

  header: { alignItems: "center", marginBottom: 35 },

  logoWrapper: { alignItems: "center", marginBottom: 25 },
  logoImageContainer: {
    width: 110,
    height: 110,
    borderRadius: 25,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0px 6px 10px rgba(0,0,0,0.15)",
    elevation: 8,
    overflow: "hidden",
  },
  logoImage: { width: "100%", height: "100%" },

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#2C3E50",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#7F8C8D",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  formContainer: { width: "100%" },

  inviteBox: {
    backgroundColor: "#FFF9E6",
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFE273",
  },
  inviteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  inviteTitle: { fontSize: 16, fontWeight: "bold", color: "#FF9600" },
  inviteDesc: { fontSize: 13, color: "#666", marginBottom: 15 },
  inviteInput: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    textAlign: "center",
    fontWeight: "bold",
    letterSpacing: 2,
  },

  socialButtonsContainer: { flexDirection: "row", gap: 15, marginBottom: 25 },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    boxShadow: "0px 2px 3px rgba(0,0,0,0.05)",
    elevation: 2,
  },
  socialBtnText: { fontSize: 15, fontWeight: "bold", color: "#333" },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E5E5" },
  dividerText: {
    marginHorizontal: 15,
    color: "#AFAFAF",
    fontSize: 14,
    fontWeight: "600",
  },

  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 15,
    paddingHorizontal: 15,
    boxShadow: "0px 2px 3px rgba(0,0,0,0.02)",
    elevation: 1,
  },
  inputIcon: { width: 24, textAlign: "center" },
  input: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 10,
    fontSize: 16,
    color: "#333",
  },

  forgotPasswordBtn: { alignSelf: "flex-end", marginBottom: 20, marginTop: -5 },
  forgotPasswordText: { color: "#AFAFAF", fontSize: 14, fontWeight: "bold" },

  floatingBtnWrapper: { width: "100%", marginTop: 10, marginBottom: 10 },
  floatingBtn: {
    flexDirection: "row",
    backgroundColor: "#FF7EB3",
    paddingVertical: 18,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    boxShadow: "0px 8px 12px rgba(255,126,179,0.4)",
    elevation: 8,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  floatingBtnText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    gap: 6,
  },
  toggleText: { color: "#7F8C8D", fontSize: 15 },
  toggleLink: { color: "#CE82FF", fontSize: 15, fontWeight: "bold" },
});
