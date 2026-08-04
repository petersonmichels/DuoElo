import { FontAwesome5 } from "@expo/vector-icons";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, authControls, db } from "../config/firebase";

const { width } = Dimensions.get("window");

export default function LoginScreen({ navigation }: any) {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [currentUserData, setCurrentUserData] = useState<any>(null);

  // 🔥 ESTADOS PARA A ANIMAÇÃO E CONFIRMAÇÃO DO MATCH
  const [pendingMatchPartner, setPendingMatchPartner] = useState<any>(null);
  const [isMatchConfirmationVisible, setIsMatchConfirmationVisible] =
    useState(false);
  const [isMatchAnimationVisible, setIsMatchAnimationVisible] = useState(false);

  const matchAnimTranslateX = useRef(new Animated.Value(0)).current;
  const matchHeartScale = useRef(new Animated.Value(0)).current;

  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "info-circle",
    color: "#CE82FF",
    showButton: false,
    onConfirm: null as (() => void) | null,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const btnColor = isLogin ? "#4BDE95" : "#FF7EB3";
  const btnIcon = isLogin ? "sign-in-alt" : "arrow-right";

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

  const showCustomAlert = (
    title: string,
    message: string,
    icon = "info-circle",
    color = "#CE82FF",
    showButton = false,
    onConfirm: (() => void) | null = null,
  ) => {
    setCustomAlert({
      visible: true,
      title,
      message,
      icon,
      color,
      showButton,
      onConfirm,
    });

    if (!showButton) {
      setTimeout(() => {
        setCustomAlert((prev) => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      }, 2500);
    }
  };

  // 🔥 FUNÇÃO DE FINALIZAÇÃO PÓS-AUTH (Login ou Cadastro)
  const finalizeAuth = async (wasCreated: boolean) => {
    if (wasCreated) {
      await signOut(auth);
      setIsLoading(false);
      showCustomAlert(
        "Conta Criada! 🎉",
        "Sucesso! Agora faça o login com sua nova conta para acessar a jornada.",
        "check-circle",
        "#4BDE95",
        false,
        () => setIsLogin(true),
      );
    } else {
      setIsLoading(false);
    }
  };

  // 🔥 LÓGICA PRINCIPAL DE AUTENTICAÇÃO E BUSCA DE MATCH
  const handleAuth = async () => {
    const cleanEmail = email.trim();
    const cleanCode = inviteCode.trim().toUpperCase();

    if (!cleanEmail || !password) {
      showCustomAlert(
        "Atenção",
        "Preencha e-mail e senha para continuar.",
        "exclamation-triangle",
        "#FF9600",
        false,
      );
      return;
    }

    if (password.length < 6) {
      showCustomAlert(
        "Senha Curta",
        "Sua senha deve ter pelo menos 6 caracteres.",
        "lock",
        "#FF9600",
        false,
      );
      return;
    }

    setIsLoading(true);

    try {
      let uid = "";
      let isNewUser = false;

      // 1. FAZ A AUTENTICAÇÃO OU CADASTRO
      if (isLogin) {
        const userCred = await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password,
        );
        uid = userCred.user.uid;
      } else {
        if (authControls) authControls.isCreatingAccount = true;
        const userCred = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password,
        );
        uid = userCred.user.uid;
        isNewUser = true;

        const myGeneratedCode = uid.substring(0, 6).toUpperCase();
        const userDataToSave: any = {
          email: cleanEmail,
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
        if (authControls) authControls.isCreatingAccount = false;
      }

      // 2. BUSCA OS DADOS ATUAIS (Para usar na Animação)
      const myDoc = await getDoc(doc(db, "users", uid));
      const myData = myDoc.exists()
        ? myDoc.data()
        : { email: cleanEmail, isPremium: false };
      setCurrentUserData(myData);

      // 3. SE O USUÁRIO DIGITOU UM CÓDIGO, TENTA FAZER O MATCH ANTES DE FINALIZAR
      if (cleanCode.length > 0) {
        const q = query(
          collection(db, "users"),
          where("myInviteCode", "==", cleanCode),
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          const partnerId = snap.docs[0].id;
          const partnerData = snap.docs[0].data();

          if (partnerId !== uid) {
            // Encontrou o parceiro! Pausa tudo e mostra a Confirmação
            setPendingMatchPartner({
              id: partnerId,
              data: partnerData,
              isNewUser,
              uid,
            });
            setIsLoading(false);
            setIsMatchConfirmationVisible(true);
            return;
          }
        } else {
          showCustomAlert(
            "Match Não Encontrado",
            "O código inserido não existe. Prosseguindo...",
            "search-minus",
            "#FF9600",
            false,
          );
        }
      }

      // 4. SE NÃO TEM CÓDIGO OU DEU ERRO NO CÓDIGO, SEGUE A VIDA NORMAL
      finalizeAuth(isNewUser);
    } catch (error: any) {
      if (authControls) authControls.isCreatingAccount = false;
      setIsLoading(false);

      if (error.code === "auth/email-already-in-use") {
        showCustomAlert(
          "Bem-vindo de volta! 👋",
          "Este e-mail já está cadastrado. Estamos te redirecionando para a área de Login.",
          "info-circle",
          "#CE82FF",
          false,
          () => setIsLogin(true),
        );
      } else {
        let msg = "Ocorreu um erro inesperado.";
        if (error.code === "auth/invalid-credential")
          msg = "E-mail ou senha incorretos.";
        if (error.code === "auth/too-many-requests")
          msg = "Muitas tentativas. Aguarde um momento.";

        showCustomAlert("Ops!", msg, "times-circle", "#FF4B4B", false);
      }
    }
  };

  // 🔥 CONFIRMAÇÃO E ANIMAÇÃO DO MATCH DE LOGIN/CADASTRO 🔥
  const confirmMatchCode = async () => {
    setIsMatchConfirmationVisible(false);
    setIsMatchAnimationVisible(true);

    // Inicia a animação de junção
    Animated.sequence([
      Animated.timing(matchAnimTranslateX, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(matchHeartScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Finaliza no banco de dados e encerra
    setTimeout(async () => {
      try {
        const partnerId = pendingMatchPartner.id;
        const partnerDataDb = pendingMatchPartner.data;
        const userId = pendingMatchPartner.uid;

        if (userId) {
          const partnerIsPremium = partnerDataDb?.isPremium || false;
          const currentUserIsPremium = currentUserData?.isPremium || false;
          const finalPremiumStatus = partnerIsPremium || currentUserIsPremium;

          // Atualiza os dois lados e HERDA o Premium
          await setDoc(
            doc(db, "users", userId),
            { partnerId: partnerId, isPremium: finalPremiumStatus },
            { merge: true },
          );
          await setDoc(
            doc(db, "users", partnerId),
            { partnerId: userId, isPremium: finalPremiumStatus },
            { merge: true },
          );
        }
      } catch (e) {
        console.error("Erro ao finalizar o match na animação:", e);
      } finally {
        setIsMatchAnimationVisible(false);
        setInviteCode("");
        // Continua o fluxo (Se era cadastro, desloga. Se era login, libera pro App)
        finalizeAuth(pendingMatchPartner.isNewUser);
        setPendingMatchPartner(null);
        matchAnimTranslateX.setValue(0);
        matchHeartScale.setValue(0);
      }
    }, 2800);
  };

  const handleSocialLogin = (provider: string) => {
    showCustomAlert(
      "Em Breve",
      `O login com ${provider} será ativado na próxima fase.`,
      "clock",
      "#AFAFAF",
      false,
    );
  };

  const userPhotoForAnim =
    currentUserData?.photoURL || currentUserData?.photoUrl;

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
            {/* EMAIL E SENHA */}
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
                  showCustomAlert(
                    "Recuperação",
                    "Em breve.",
                    "envelope",
                    "#AFAFAF",
                    false,
                  )
                }
              >
                <Text style={styles.forgotPasswordText}>
                  Esqueci minha senha
                </Text>
              </TouchableOpacity>
            )}

            {/* 🔥 CÓDIGO DE MATCH DISPONÍVEL NO CADASTRO E NO LOGIN 🔥 */}
            <View style={styles.inviteBox}>
              <View style={styles.inviteHeader}>
                <FontAwesome5 name="heart" solid size={16} color="#FF9600" />
                <Text style={styles.inviteTitle}>Conexão DuoElo</Text>
              </View>
              <Text style={styles.inviteDesc}>
                Se possui o código de match do parceiro(a), insira aqui antes de{" "}
                {isLogin ? "entrar" : "criar a conta"}.
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

            {/* BOTÃO PRINCIPAL */}
            <Animated.View
              style={[
                styles.floatingBtnWrapper,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.floatingBtn,
                  { backgroundColor: btnColor, shadowColor: btnColor },
                ]}
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
                    <FontAwesome5 name={btnIcon} size={18} color="#FFF" />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* DIVISOR */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou entre com</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ÍCONES SOCIAIS */}
            <View style={styles.socialIconsWrapper}>
              <TouchableOpacity
                onPress={() => handleSocialLogin("Google")}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <FontAwesome5 name="google" size={32} color="#EA4335" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSocialLogin("Apple")}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <FontAwesome5 name="apple" size={36} color="#000" />
              </TouchableOpacity>
            </View>

            {/* TOGGLE CRIAR CONTA / LOGIN */}
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

      {/* 🔥 MODAL DE CONFIRMAÇÃO DE IDENTIDADE 🔥 */}
      <Modal
        visible={isMatchConfirmationVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.codeModalCard}>
            <Text style={styles.codeModalTitle}>É esta pessoa?</Text>
            <Text style={styles.codeModalSub}>
              Verifique se a conta abaixo pertence ao seu amor.
            </Text>

            <View style={{ alignItems: "center", marginBottom: 25 }}>
              {pendingMatchPartner?.data?.photoURL ||
              pendingMatchPartner?.data?.photoUrl ? (
                <Image
                  source={{
                    uri:
                      pendingMatchPartner?.data?.photoURL ||
                      pendingMatchPartner?.data?.photoUrl,
                  }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    marginBottom: 15,
                    borderWidth: 3,
                    borderColor: "#CE82FF",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: "#F0F0F0",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 15,
                  }}
                >
                  <FontAwesome5 name="user-alt" size={30} color="#AFAFAF" />
                </View>
              )}
              <Text style={{ fontSize: 20, fontWeight: "900", color: "#333" }}>
                {pendingMatchPartner?.data?.displayName ||
                  pendingMatchPartner?.data?.email?.split("@")[0] ||
                  "Usuário Misterioso"}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: "#4BDE95" }]}
              onPress={confirmMatchCode}
            >
              <Text style={styles.linkButtonText}>Sim, Conectar!</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelLinkButton}
              onPress={() => {
                setIsMatchConfirmationVisible(false);
                // Se errou o código, continua com o login/cadastro que já deu certo, só não faz o match
                finalizeAuth(pendingMatchPartner.isNewUser);
                setPendingMatchPartner(null);
                setInviteCode("");
              }}
            >
              <Text style={styles.cancelLinkButtonText}>
                Não, errei o código
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🔥 MODAL DA ANIMAÇÃO DE CONEXÃO 🔥 */}
      <Modal visible={isMatchAnimationVisible} transparent animationType="fade">
        <View
          style={[
            styles.modalOverlayCenter,
            { backgroundColor: "rgba(255,126,179,0.95)" },
          ]}
        >
          <Text
            style={{
              color: "#FFF",
              fontSize: 24,
              fontWeight: "900",
              marginBottom: 50,
              letterSpacing: 1,
            }}
          >
            Conectando Almas...
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            {/* Usuário Local (Desliza da esquerda pra direita) */}
            <Animated.View
              style={{
                transform: [
                  {
                    translateX: matchAnimTranslateX.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 45],
                    }),
                  },
                ],
                zIndex: 5,
              }}
            >
              {userPhotoForAnim ? (
                <Image
                  source={{ uri: userPhotoForAnim }}
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    borderWidth: 4,
                    borderColor: "#FFF",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    backgroundColor: "#FFF",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 4,
                    borderColor: "#FFF",
                  }}
                >
                  <FontAwesome5 name="user-alt" size={35} color="#FF7EB3" />
                </View>
              )}
            </Animated.View>

            {/* Coração Central (Pulsa) */}
            <Animated.View
              style={{
                transform: [{ scale: matchHeartScale }],
                zIndex: 10,
                marginHorizontal: -15,
              }}
            >
              <View
                style={{
                  backgroundColor: "#FFF",
                  padding: 15,
                  borderRadius: 30,
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowRadius: 10,
                  elevation: 10,
                }}
              >
                <FontAwesome5 name="heart" solid size={35} color="#FF7EB3" />
              </View>
            </Animated.View>

            {/* Parceiro (Desliza da direita pra esquerda) */}
            <Animated.View
              style={{
                transform: [
                  {
                    translateX: matchAnimTranslateX.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -45],
                    }),
                  },
                ],
                zIndex: 5,
              }}
            >
              {pendingMatchPartner?.data?.photoURL ||
              pendingMatchPartner?.data?.photoUrl ? (
                <Image
                  source={{
                    uri:
                      pendingMatchPartner?.data?.photoURL ||
                      pendingMatchPartner?.data?.photoUrl,
                  }}
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    borderWidth: 4,
                    borderColor: "#FFF",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    backgroundColor: "#FFF",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 4,
                    borderColor: "#FFF",
                  }}
                >
                  <FontAwesome5 name="user-alt" size={35} color="#FF7EB3" />
                </View>
              )}
            </Animated.View>
          </View>

          <Text
            style={{
              color: "#FFF",
              fontSize: 16,
              fontWeight: "bold",
              marginTop: 50,
              opacity: 0.8,
            }}
          >
            A mágica está acontecendo no banco de dados...
          </Text>
        </View>
      </Modal>

      {/* MODAL DE ALERTAS */}
      <Modal visible={customAlert.visible} transparent animationType="fade">
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

            {customAlert.showButton && (
              <TouchableOpacity
                style={[
                  styles.bottomSheetButtonPrimary,
                  { backgroundColor: customAlert.color, marginTop: 10 },
                ]}
                onPress={() => {
                  setCustomAlert({ ...customAlert, visible: false });
                  if (customAlert.onConfirm) customAlert.onConfirm();
                }}
              >
                <Text style={styles.bottomSheetButtonPrimaryText}>Entendi</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
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
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 15,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
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
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    marginTop: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E5E5" },
  dividerText: {
    marginHorizontal: 15,
    color: "#AFAFAF",
    fontSize: 14,
    fontWeight: "600",
  },
  socialIconsWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 40,
    marginBottom: 25,
  },
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
  floatingBtnWrapper: { width: "100%", marginTop: 10, marginBottom: 10 },
  floatingBtn: {
    flexDirection: "row",
    paddingVertical: 18,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
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

  // 🔥 ESTILOS DOS MODAIS DE MATCH
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  codeModalCard: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  codeModalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#2C3E50",
    marginBottom: 10,
  },
  codeModalSub: {
    fontSize: 14,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 20,
  },
  linkButton: {
    backgroundColor: "#FF7EB3",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  linkButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  cancelLinkButton: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelLinkButtonText: { color: "#AFAFAF", fontSize: 14, fontWeight: "bold" },

  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    backgroundColor: "#E5E5E5",
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
    fontSize: 22,
    fontWeight: "900",
    color: "#2C3E50",
    marginBottom: 10,
    textAlign: "center",
  },
  bottomSheetText: {
    fontSize: 15,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  bottomSheetButtonPrimary: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetButtonPrimaryText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
