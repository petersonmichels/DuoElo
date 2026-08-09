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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// 🔥 IMPORTAÇÃO MODERNA E CORRETA DO SAFE AREA
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, authControls, db } from "../config/firebase";

const { width } = Dimensions.get("window");

export default function LoginScreen({ navigation }: any) {
  const [isLogin, setIsLogin] = useState(false);
  const [username, setUsername] = useState("");
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
    color: "#202D3A",
    showButton: false,
    onConfirm: null as (() => void) | null,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 🔥 PALETA CLÍNICA APLICADA: Azul-Petróleo para Login (Estabilidade), Ouro Suave para Criar (Acolhimento)
  const btnColor = isLogin ? "#202D3A" : "#EAB64A";
  const btnIcon = isLogin ? "sign-in-alt" : "arrow-right";
  const btnTextColor = isLogin ? "#FFF" : "#202D3A";

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
    color = "#202D3A",
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

  const finalizeAuth = async (wasCreated: boolean) => {
    if (wasCreated) {
      await signOut(auth);
      setIsLoading(false);
      showCustomAlert(
        "Conta Criada! 🎉",
        "Sucesso! Agora faça o login com sua nova conta para acessar a jornada.",
        "check-circle",
        "#67D4A8",
        false,
        () => setIsLogin(true),
      );
    } else {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    const cleanEmail = email.trim();
    const cleanCode = inviteCode.trim().toUpperCase();

    const cleanUsername = username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    if (!cleanEmail || !password || (!isLogin && !cleanUsername)) {
      showCustomAlert(
        "Atenção",
        "Preencha todos os campos obrigatórios para continuar.",
        "exclamation-triangle",
        "#EAB64A",
        false,
      );
      return;
    }

    if (!isLogin && cleanUsername.length < 3) {
      showCustomAlert(
        "Nome Curto",
        "Seu nome de usuário deve ter pelo menos 3 caracteres.",
        "user",
        "#EAB64A",
        false,
      );
      return;
    }

    if (password.length < 6) {
      showCustomAlert(
        "Senha Curta",
        "Sua senha deve ter pelo menos 6 caracteres.",
        "lock",
        "#EAB64A",
        false,
      );
      return;
    }

    setIsLoading(true);

    try {
      let uid = "";
      let isNewUser = false;

      if (isLogin) {
        const userCred = await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password,
        );
        uid = userCred.user.uid;
      } else {
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
            false,
          );
          return;
        }

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
        if (authControls) authControls.isCreatingAccount = false;
      }

      const myDoc = await getDoc(doc(db, "users", uid));
      const myData = myDoc.exists()
        ? myDoc.data()
        : { email: cleanEmail, isPremium: false };
      setCurrentUserData(myData);

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
            "#EAB64A",
            false,
          );
        }
      }

      finalizeAuth(isNewUser);
    } catch (error: any) {
      if (authControls) authControls.isCreatingAccount = false;
      setIsLoading(false);
      console.error("ERRO DE AUTH:", error);

      if (error.code === "auth/email-already-in-use") {
        showCustomAlert(
          "Bem-vindo de volta! 👋",
          "Este e-mail já está cadastrado. Estamos te redirecionando para a área de Login.",
          "info-circle",
          "#202D3A",
          false,
          () => setIsLogin(true),
        );
      } else {
        let msg = "Ocorreu um erro inesperado.";

        if (
          error.code === "auth/invalid-credential" ||
          error.code === "auth/user-not-found" ||
          error.code === "auth/wrong-password"
        ) {
          msg = "E-mail não encontrado ou senha incorreta.";
        } else if (error.code === "auth/too-many-requests") {
          msg = "Muitas tentativas. Aguarde um momento.";
        } else if (error.code === "auth/invalid-email") {
          msg = "Formato de e-mail inválido.";
        } else if (error.message) {
          msg = `Erro interno: ${error.code || error.message}`;
        }

        showCustomAlert("Ops!", msg, "times-circle", "#D96C6C", false);
      }
    }
  };

  const confirmMatchCode = async () => {
    setIsMatchConfirmationVisible(false);
    setIsMatchAnimationVisible(true);

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

    setTimeout(async () => {
      try {
        const partnerId = pendingMatchPartner.id;
        const partnerDataDb = pendingMatchPartner.data;
        const userId = pendingMatchPartner.uid;

        if (userId) {
          const partnerIsPremium = partnerDataDb?.isPremium || false;
          const currentUserIsPremium = currentUserData?.isPremium || false;
          const finalPremiumStatus = partnerIsPremium || currentUserIsPremium;

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
                  source={require("../assets/duoelo_brand_logo.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
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
            {!isLogin && (
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
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
            )}

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
                color="#60646C"
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
                    "#202D3A",
                    false,
                  )
                }
              >
                <Text style={styles.forgotPasswordText}>
                  Esqueci minha senha
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.inviteBox}>
              <View style={styles.inviteHeader}>
                <FontAwesome5 name="heart" solid size={16} color="#67D4A8" />
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
                  <ActivityIndicator size="small" color={btnTextColor} />
                ) : (
                  <>
                    <Text
                      style={[styles.floatingBtnText, { color: btnTextColor }]}
                    >
                      {isLogin ? "Entrar na Conta" : "Criar Minha Conta"}
                    </Text>
                    <FontAwesome5
                      name={btnIcon}
                      size={18}
                      color={btnTextColor}
                    />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou entre com</Text>
              <View style={styles.dividerLine} />
            </View>

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
                <FontAwesome5 name="apple" size={36} color="#202D3A" />
              </TouchableOpacity>
            </View>

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
                    borderColor: "#EAB64A",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: "#F0F4F8",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 15,
                  }}
                >
                  <FontAwesome5 name="user-alt" size={30} color="#202D3A" />
                </View>
              )}
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: "Montserrat_900Black",
                  color: "#202D3A",
                }}
              >
                {pendingMatchPartner?.data?.displayName ||
                  pendingMatchPartner?.data?.email?.split("@")[0] ||
                  "Usuário Misterioso"}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: "#67D4A8" }]}
              onPress={confirmMatchCode}
            >
              <Text style={styles.linkButtonText}>Sim, Conectar!</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelLinkButton}
              onPress={() => {
                setIsMatchConfirmationVisible(false);
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

      <Modal visible={isMatchAnimationVisible} transparent animationType="fade">
        <View
          style={[
            styles.modalOverlayCenter,
            { backgroundColor: "rgba(32,45,58,0.95)" },
          ]}
        >
          <Text
            style={{
              color: "#FFF",
              fontSize: 24,
              fontFamily: "Montserrat_900Black",
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
                  <FontAwesome5 name="user-alt" size={35} color="#202D3A" />
                </View>
              )}
            </Animated.View>

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
                <FontAwesome5 name="heart" solid size={35} color="#EAB64A" />
              </View>
            </Animated.View>

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
                  <FontAwesome5 name="user-alt" size={35} color="#202D3A" />
                </View>
              )}
            </Animated.View>
          </View>

          <Text
            style={{
              color: "#FFF",
              fontSize: 16,
              fontFamily: "Montserrat_700Bold",
              marginTop: 50,
              opacity: 0.8,
            }}
          >
            A mágica está acontecendo no banco de dados...
          </Text>
        </View>
      </Modal>

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
  container: { flex: 1, backgroundColor: "#F0F4F8" },
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
    shadowColor: "#202D3A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    overflow: "hidden",
  },
  logoImage: { width: "100%", height: "100%" },
  title: {
    fontSize: 26,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#60646C",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
    fontFamily: "Montserrat_400Regular",
  },
  formContainer: { width: "100%" },
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
  inputIcon: { width: 24, textAlign: "center" },
  input: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 10,
    fontSize: 16,
    color: "#202D3A",
    fontFamily: "Montserrat_600SemiBold",
  },
  forgotPasswordBtn: { alignSelf: "flex-end", marginBottom: 20, marginTop: -5 },
  forgotPasswordText: {
    color: "#60646C",
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    marginTop: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#D1D9E0" },
  dividerText: {
    marginHorizontal: 15,
    color: "#AFAFAF",
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
  },
  socialIconsWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 40,
    marginBottom: 25,
  },
  inviteBox: {
    backgroundColor: "#E8F4F1",
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#67D4A8",
  },
  inviteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  inviteTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
  },
  inviteDesc: {
    fontSize: 13,
    color: "#2C3E50",
    marginBottom: 15,
    fontFamily: "Montserrat_400Regular",
  },
  inviteInput: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#202D3A",
    borderWidth: 1,
    borderColor: "#D1D9E0",
    textAlign: "center",
    fontFamily: "Montserrat_900Black",
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
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  floatingBtnText: {
    fontSize: 18,
    fontFamily: "Montserrat_900Black",
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

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(32,45,58,0.7)",
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
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 10,
  },
  codeModalSub: {
    fontSize: 14,
    color: "#60646C",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Montserrat_400Regular",
  },
  linkButton: {
    backgroundColor: "#202D3A",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  linkButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  cancelLinkButton: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelLinkButtonText: {
    color: "#60646C",
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
  },

  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(32,45,58,0.7)",
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
    fontSize: 22,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 10,
    textAlign: "center",
  },
  bottomSheetText: {
    fontSize: 15,
    color: "#60646C",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
    fontFamily: "Montserrat_400Regular",
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
    fontFamily: "Montserrat_700Bold",
  },
  bottomSheetButtonSecondary: {
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetButtonSecondaryText: {
    color: "#60646C",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
});
