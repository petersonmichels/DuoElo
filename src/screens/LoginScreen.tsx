import { FontAwesome5 } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants, { ExecutionEnvironment } from "expo-constants";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, authControls, db } from "../config/firebase";

import { t } from "../i18n/translations";
import { logAuditEvent } from "../services/auditService";
import {
  hasSecurityPin,
  isStrongPassword,
  setSecurityPin,
  verifySecurityPin,
} from "../services/securityService";

const { width } = Dimensions.get("window");

const SUPPORTED_LANGUAGES = [
  { code: "pt-BR", flag: "🇧🇷" },
  { code: "pt-PT", flag: "🇵🇹" },
  { code: "en", flag: "🇺🇸" },
  { code: "es", flag: "🇪🇸" },
  { code: "fr", flag: "🇫🇷" },
  { code: "de", flag: "🇩🇪" },
  { code: "ja", flag: "🇯🇵" },
];

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let GoogleSignin: any = null;
let statusCodes: any = {};
if (!isExpoGo) {
  try {
    const googleModule = require("@react-native-google-signin/google-signin");
    GoogleSignin = googleModule.GoogleSignin;
    statusCodes = googleModule.statusCodes;
  } catch (e) {
    console.log("GoogleSignin indisponível neste ambiente.");
  }
}

export default function LoginScreen({ navigation }: any) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [userLang, setUserLang] = useState("pt-BR");
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);

  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [hasExistingPin, setHasExistingPin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [pendingUid, setPendingUid] = useState<string | null>(null);

  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "info-circle",
    color: "#202D3A",
    confirmText: t("btn_understand", userLang) || "Entendi",
    onConfirm: null as (() => void) | null,
    secondaryText: "",
    onSecondary: null as (() => void) | null,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const btnColor = isLogin ? "#202D3A" : "#EAB64A";
  const btnIcon = isLogin ? "sign-in-alt" : "arrow-right";
  const btnTextColor = isLogin ? "#FFF" : "#202D3A";

  useEffect(() => {
    if (!isExpoGo && GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId:
            "504286284116-akoj0ufb3q6rrfb2b3gpskbjaatgeqle.apps.googleusercontent.com",
          iosClientId:
            "504286284116-akoj0ufb3q6rrfb2b3gpskbjaatgeqle.apps.googleusercontent.com",
        });
      } catch (e) {
        console.log("Erro ao configurar GoogleSignin:", e);
      }
    }
  }, []);

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
      ])
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
      ])
    ).start();
  }, []);

  const showCustomAlert = (
    title: string,
    message: string,
    icon = "info-circle",
    color = "#202D3A",
    confirmText = t("btn_understand", userLang) || "Entendi",
    onConfirm: (() => void) | null = null,
    secondaryText = "",
    onSecondary: (() => void) | null = null
  ) => {
    setCustomAlert({
      visible: true,
      title,
      message,
      icon,
      color,
      confirmText,
      onConfirm,
      secondaryText,
      onSecondary,
    });
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      showCustomAlert(
        t("forgot_pwd_empty_title", userLang) || "E-mail Necessário",
        t("forgot_pwd_empty_msg", userLang) || "Informe seu e-mail para redefinir a senha.",
        "envelope",
        "#EAB64A"
      );
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setIsLoading(false);
      showCustomAlert(
        t("forgot_pwd_success_title", userLang) || "E-mail Enviado!",
        t("forgot_pwd_success_msg", userLang, { email: cleanEmail }) || `Instruções enviadas para ${cleanEmail}`,
        "check-circle",
        "#67D4A8"
      );
    } catch (error: any) {
      setIsLoading(false);
      let errorMsg = t("forgot_pwd_error_default", userLang) || "Não foi possível enviar o e-mail de redefinição.";
      if (
        error?.code === "auth/user-not-found" ||
        error?.code === "auth/invalid-credential"
      ) {
        errorMsg = t("forgot_pwd_error_not_found", userLang) || "Não encontramos nenhuma conta vinculada a este e-mail.";
      } else if (error?.code === "auth/invalid-email") {
        errorMsg = t("forgot_pwd_error_invalid_email", userLang) || "Formato de e-mail inválido.";
      }

      showCustomAlert(
        t("forgot_pwd_error_title", userLang) || "Erro ao Redefinir",
        errorMsg,
        "times-circle",
        "#D96C6C"
      );
    }
  };

  const routeUserAfterLogin = async (uid: string) => {
    try {
      const userSnap = await getDoc(doc(db, "users", uid));
      const userData = userSnap.data();

      if (!userData?.hasCompletedAnamnesis) {
        navigation.reset({
          index: 0,
          routes: [{ name: "AnamneseScreen" }],
        });
        return;
      }

      if (!userData?.partnerId || userData?.pendingMatchRequest || userData?.sentMatchRequestTo) {
        navigation.reset({
          index: 0,
          routes: [{ name: "MainTabs", params: { screen: "Match" } }],
        });
        return;
      }

      let isUserPremium = Boolean(userData?.isPremium);

      if (!isUserPremium && userData?.partnerId) {
        const partnerSnap = await getDoc(doc(db, "users", userData.partnerId));
        if (partnerSnap.exists() && partnerSnap.data()?.isPremium) {
          isUserPremium = true;
        }
      }

      if (!isUserPremium) {
        navigation.reset({
          index: 0,
          routes: [{ name: "PaywallScreen" }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: "MainTabs", params: { screen: "Home" } }],
        });
      }
    } catch (e) {
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs", params: { screen: "Home" } }],
      });
    }
  };

  const triggerPinCheck = async (uid: string) => {
    setPendingUid(uid);
    setPinInput("");
    setConfirmPinInput("");
    const pinExists = await hasSecurityPin();
    setHasExistingPin(pinExists);
    setIsPinModalVisible(true);
  };

  const handlePinSubmit = async () => {
    if (hasExistingPin) {
      const isValid = await verifySecurityPin(pinInput);
      if (isValid) {
        setIsPinModalVisible(false);
        if (pendingUid) {
          await routeUserAfterLogin(pendingUid);
        }
      } else {
        showCustomAlert(
          t("pin_err_incorrect_title", userLang) || "PIN Incorreto",
          t("pin_err_incorrect_msg", userLang) || "O PIN digitado está incorreto.",
          "lock",
          "#D96C6C"
        );
      }
    } else {
      if (pinInput.length < 4) {
        showCustomAlert(
          t("pin_err_short_title", userLang) || "PIN Muito Curto",
          t("pin_err_short_msg", userLang) || "O PIN de segurança deve ter pelo menos 4 dígitos.",
          "exclamation-triangle",
          "#EAB64A"
        );
        return;
      }

      if (pinInput !== confirmPinInput) {
        showCustomAlert(
          t("pin_err_mismatch_title", userLang) || "PINs Não Coincidem",
          t("pin_err_mismatch_msg", userLang) || "Os dígitos inseridos não são iguais.",
          "exclamation-circle",
          "#EAB64A"
        );
        return;
      }

      await setSecurityPin(pinInput);
      setIsPinModalVisible(false);
      if (pendingUid) {
        await routeUserAfterLogin(pendingUid);
      }
    }
  };

  const finalizeAuth = async (wasCreated: boolean) => {
    if (wasCreated) {
      await signOut(auth);
      setIsLoading(false);
      showCustomAlert(
        t("account_created_title", userLang) || "Conta Criada!",
        t("account_created_msg", userLang) || "Sua conta foi criada com sucesso. Faça login para iniciar.",
        "check-circle",
        "#67D4A8",
        t("btn_login_now", userLang) || "Fazer Login",
        () => setIsLogin(true)
      );
    } else {
      setIsLoading(false);
      const uid = auth.currentUser?.uid;
      if (uid) {
        await triggerPinCheck(uid);
      } else if (navigation && navigation.navigate) {
        navigation.navigate("MainTabs", { screen: "Home" });
      }
    }
  };

  const handleAuth = async () => {
    if (isLoading) return;

    const cleanEmail = email.trim().toLowerCase();
    const rawUsername = username.trim().toLowerCase();

    if (!cleanEmail || !password || (!isLogin && !rawUsername)) {
      showCustomAlert(
        t("attention_title", userLang) || "Atenção",
        t("fill_required_fields_msg", userLang) || "Preencha todos os campos obrigatórios.",
        "exclamation-triangle",
        "#EAB64A"
      );
      return;
    }

    if (!isLogin) {
      const validUsernameRegex = /^[a-z0-9_]+$/;
      if (!validUsernameRegex.test(rawUsername)) {
        showCustomAlert(
          t("attention_title", userLang) || "Atenção",
          t("invalid_username_format_msg", userLang) || "O nome de usuário deve conter apenas letras, números ou caracteres sublinhados (_).",
          "user-times",
          "#EAB64A"
        );
        return;
      }

      if (rawUsername.length < 3) {
        showCustomAlert(
          t("short_username_title", userLang) || "Usuário Curto",
          t("short_username_msg", userLang) || "O nome de usuário deve ter pelo menos 3 caracteres.",
          "user",
          "#EAB64A"
        );
        return;
      }

      const passwordCheck = isStrongPassword(password, userLang);
      if (!passwordCheck.isValid) {
        showCustomAlert(
          t("security_req_title", userLang) || "Senha Fraca",
          passwordCheck.message || t("weak_password_fallback", userLang) || "Escolha uma senha mais forte.",
          "shield-alt",
          "#EAB64A"
        );
        return;
      }
    }

    if (isLogin && password.length < 6) {
      showCustomAlert(
        t("short_password_title", userLang) || "Senha Curta",
        t("short_password_msg", userLang) || "A senha deve ter pelo menos 6 caracteres.",
        "lock",
        "#EAB64A"
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
          password
        );
        uid = userCred.user.uid;
        await setDoc(
          doc(db, "users", uid),
          { language: userLang },
          { merge: true }
        );
      } else {
        if (authControls) authControls.isCreatingAccount = true;

        const userCred = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );
        uid = userCred.user.uid;
        isNewUser = true;

        const myGeneratedCode = uid.substring(0, 6).toUpperCase();
        const userDataToSave: any = {
          email: cleanEmail,
          username: rawUsername,
          language: userLang,
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

        try {
          await logAuditEvent(
            uid,
            "EULA_ACCEPTED",
            "Conta criada via E-mail/Senha com aceite do EULA e Política de Privacidade",
            userLang
          );
        } catch (e) {
          console.warn("Audit log error ignored:", e);
        }

        if (authControls) authControls.isCreatingAccount = false;
      }

      finalizeAuth(isNewUser);
    } catch (error: any) {
      if (authControls) authControls.isCreatingAccount = false;
      setIsLoading(false);

      const errorCode = error?.code || "";

      if (errorCode === "auth/email-already-in-use") {
        showCustomAlert(
          t("email_in_use_title", userLang) || "E-mail em Uso",
          t("email_in_use_msg", userLang) || "Este e-mail já está cadastrado. Faça login para acessar.",
          "info-circle",
          "#202D3A",
          t("btn_go_to_login", userLang) || "Ir para Login",
          () => setIsLogin(true)
        );
      } else if (
        errorCode === "auth/invalid-credential" ||
        errorCode === "auth/user-not-found" ||
        errorCode === "auth/wrong-password"
      ) {
        if (isLogin) {
          showCustomAlert(
            t("account_not_found_title", userLang) || "Conta Não Encontrada",
            t("account_not_found_msg", userLang, { email: cleanEmail }) || "E-mail ou senha incorretos.",
            "user-plus",
            "#EAB64A",
            t("btn_create_account", userLang) || "Criar Conta",
            () => setIsLogin(false),
            t("btn_try_again", userLang) || "Tentar Novamente",
            () => {}
          );
        } else {
          showCustomAlert(
            t("signup_error_title", userLang) || "Erro no Cadastro",
            t("signup_error_msg", userLang) || "Não foi possível criar a conta neste momento.",
            "times-circle",
            "#D96C6C"
          );
        }
      } else if (errorCode === "auth/too-many-requests") {
        showCustomAlert(
          t("temp_block_title", userLang) || "Bloqueio Temporário",
          t("temp_block_msg", userLang) || "Muitas tentativas malsucedidas. Tente novamente mais tarde.",
          "hourglass-half",
          "#EAB64A"
        );
      } else if (errorCode === "auth/invalid-email") {
        showCustomAlert(
          t("invalid_email_title", userLang) || "E-mail Inválido",
          t("invalid_email_msg", userLang) || "O endereço de e-mail informado é inválido.",
          "exclamation-circle",
          "#EAB64A"
        );
      } else {
        showCustomAlert(
          t("ops_title", userLang) || "Ops!",
          `${t("auth_error_default_msg", userLang) || "Falha na autenticação."}\n(${errorCode || error?.message || "erro_desconhecido"})`,
          "times-circle",
          "#D96C6C"
        );
      }
    }
  };

  const handleGoogleSignIn = async () => {
    if (isExpoGo || !GoogleSignin) {
      showCustomAlert(
        t("dev_mode_title", userLang) || "Modo de Desenvolvimento",
        t("dev_mode_msg", userLang) || "O Google Sign-In requer uma build nativa executada.",
        "info-circle",
        "#EAB64A"
      );
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      try {
        await GoogleSignin.signOut();
      } catch (e) {}

      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken || signInResult.idToken;

      if (!idToken) {
        throw new Error("Token ID do Google não retornado.");
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const userCred = await signInWithCredential(auth, credential);
      const user = userCred.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const cleanUsername = (
          user.displayName ||
          user.email?.split("@")[0] ||
          "user"
        )
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "");

        const myGeneratedCode = user.uid.substring(0, 6).toUpperCase();

        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          username: cleanUsername,
          displayName: user.displayName || "Usuário",
          photoURL: user.photoURL || null,
          language: userLang,
          myInviteCode: myGeneratedCode,
          createdAt: new Date().toISOString(),
          isPremium: false,
          hasCompletedAnamnesis: false,
          totalPE: 0,
          streak: 0,
          currentPhase: 1,
          currentTaskStep: 0,
          partnerId: null,
        });

        try {
          await logAuditEvent(
            user.uid,
            "EULA_ACCEPTED",
            "Conta criada via Google Sign-In com aceite do EULA",
            userLang
          );
        } catch (e) {}
      } else {
        await setDoc(userRef, { language: userLang }, { merge: true });
      }

      setIsLoading(false);
      await triggerPinCheck(user.uid);
    } catch (error: any) {
      setIsLoading(false);

      if (
        error?.code === statusCodes?.SIGN_IN_IN_PROGRESS ||
        error?.code === statusCodes?.IN_PROGRESS ||
        error?.code === statusCodes?.SIGN_IN_CANCELLED ||
        error?.code === "12501" ||
        error?.message?.includes("cancel")
      ) {
        return;
      }

      showCustomAlert(
        t("login_canceled_title", userLang) || "Login Cancelado",
        t("login_canceled_msg", userLang) || "A autenticação com o Google não pôde ser concluída.",
        "times-circle",
        "#D96C6C"
      );
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== "ios") {
      showCustomAlert(
        t("ios_only_title", userLang) || "Disponível no iOS",
        t("ios_only_msg", userLang) || "O Apple Sign-In está disponível apenas em dispositivos Apple.",
        "apple",
        "#202D3A"
      );
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

    try {
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken } = appleCredential;
      if (!identityToken) {
        throw new Error("Token de identidade da Apple não retornado.");
      }

      const provider = new OAuthProvider("apple.com");
      const credential = provider.credential({
        idToken: identityToken,
      });

      const userCred = await signInWithCredential(auth, credential);
      const user = userCred.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const fullName = appleCredential.fullName;
        const displayName = fullName?.givenName
          ? `${fullName.givenName} ${fullName.familyName || ""}`.trim()
          : "Usuário Apple";

        const cleanUsername = (
          displayName ||
          user.email?.split("@")[0] ||
          "apple_user"
        )
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "");

        const myGeneratedCode = user.uid.substring(0, 6).toUpperCase();

        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          username: cleanUsername,
          displayName,
          photoURL: user.photoURL || null,
          language: userLang,
          myInviteCode: myGeneratedCode,
          createdAt: new Date().toISOString(),
          isPremium: false,
          hasCompletedAnamnesis: false,
          totalPE: 0,
          streak: 0,
          currentPhase: 1,
          currentTaskStep: 0,
          partnerId: null,
        });

        try {
          await logAuditEvent(
            user.uid,
            "EULA_ACCEPTED",
            "Conta criada via Apple Sign-In com aceite do EULA",
            userLang
          );
        } catch (e) {}
      } else {
        await setDoc(userRef, { language: userLang }, { merge: true });
      }

      setIsLoading(false);
      await triggerPinCheck(user.uid);
    } catch (error: any) {
      setIsLoading(false);
      if (error?.code === "ERR_REQUEST_CANCELED") {
        return;
      }
      showCustomAlert(
        t("apple_login_error_title", userLang) || "Erro Apple Sign-In",
        t("apple_login_error_msg", userLang) || "Falha ao autenticar com Apple.",
        "times-circle",
        "#D96C6C"
      );
    }
  };

  const handleSocialLogin = (provider: string) => {
    if (provider === "Google") {
      handleGoogleSignIn();
    } else if (provider === "Apple") {
      handleAppleSignIn();
    }
  };

  const currentFlag =
    SUPPORTED_LANGUAGES.find((l) => l.code === userLang)?.flag || "🇧🇷";

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.langSelectorBtn}
        onPress={() => setIsLangModalVisible(true)}
      >
        <Text style={styles.langSelectorFlag}>{currentFlag}</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "android" ? 20 : 0}
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
              {isLogin
                ? t("login_welcome_back_title", userLang) || "Bem-vindo de Volta!"
                : t("login_start_journey_title", userLang) || "Crie sua Conta"}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin
                ? t("login_welcome_back_sub", userLang) || "Acesse seu Elo para continuar a jornada a dois."
                : t("login_start_journey_sub", userLang) || "Inicie a transformação do seu relacionamento hoje."}
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
                  placeholder={t("placeholder_username", userLang) || "Nome de Usuário (@unico)"}
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
                placeholder={t("placeholder_email", userLang) || "Seu E-mail"}
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
                placeholder={t("placeholder_password", userLang) || "Sua Senha"}
                placeholderTextColor="#AFAFAF"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {isLogin && (
              <TouchableOpacity
                style={styles.forgotPasswordBtn}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>
                  {t("forgot_password_link", userLang) || "Esqueceu a senha?"}
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
                style={[
                  styles.floatingBtn,
                  { backgroundColor: btnColor, shadowColor: btnColor },
                  isLoading && { opacity: 0.6 },
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
                      {isLogin
                        ? t("btn_login_submit", userLang) || "Entrar"
                        : t("btn_signup_submit", userLang) || "Cadastrar"}
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
              <Text style={styles.dividerText}>
                {t("divider_social_login", userLang) || "ou continue com"}
              </Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialIconsWrapper}>
              <TouchableOpacity
                onPress={() => handleSocialLogin("Google")}
                disabled={isLoading}
                style={isLoading ? { opacity: 0.5 } : {}}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <FontAwesome5 name="google" size={32} color="#EA4335" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSocialLogin("Apple")}
                disabled={isLoading}
                style={isLoading ? { opacity: 0.5 } : {}}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <FontAwesome5 name="apple" size={36} color="#202D3A" />
              </TouchableOpacity>
            </View>

            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                {isLogin
                  ? t("toggle_no_account_msg", userLang) || "Não tem uma conta?"
                  : t("toggle_has_account_msg", userLang) || "Já possui uma conta?"}
              </Text>
              <TouchableOpacity
                onPress={() => setIsLogin(!isLogin)}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Text style={styles.toggleLink}>
                  {isLogin
                    ? t("toggle_create_account_link", userLang) || "Cadastre-se"
                    : t("toggle_login_link", userLang) || "Faça Login"}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 🔒 MODAL DE PIN DE SEGURANÇA */}
      <Modal visible={isPinModalVisible} transparent animationType="fade">
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHandle} />

            <View
              style={[
                styles.alertIconContainer,
                { backgroundColor: "#EAB64A20" },
              ]}
            >
              <FontAwesome5 name="lock" size={28} color="#EAB64A" />
            </View>

            <Text style={styles.bottomSheetTitle}>
              🔒 {t("pin_modal_title", userLang) || "PIN de Segurança"}
            </Text>
            <Text style={styles.bottomSheetText}>
              {hasExistingPin
                ? t("pin_enter_msg", userLang) || "Informe seu PIN para desbloquear."
                : t("pin_create_msg", userLang) || "Crie um PIN numérico para proteger sua conta."}
            </Text>

            <View style={{ width: "100%", gap: 12 }}>
              <TextInput
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
                placeholder={
                  hasExistingPin
                    ? t("pin_placeholder_enter", userLang) || "Digite o PIN"
                    : t("pin_placeholder_create", userLang) || "Crie o PIN"
                }
                placeholderTextColor="#AFAFAF"
                value={pinInput}
                onChangeText={setPinInput}
                style={styles.pinInputStyle}
              />

              {!hasExistingPin && (
                <TextInput
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={6}
                  placeholder={t("pin_placeholder_confirm", userLang) || "Confirme o PIN"}
                  placeholderTextColor="#AFAFAF"
                  value={confirmPinInput}
                  onChangeText={setConfirmPinInput}
                  style={styles.pinInputStyle}
                />
              )}

              <TouchableOpacity
                style={[
                  styles.bottomSheetButtonPrimary,
                  { backgroundColor: "#202D3A", marginTop: 8 },
                ]}
                onPress={handlePinSubmit}
              >
                <Text style={styles.bottomSheetButtonPrimaryText}>
                  {hasExistingPin
                    ? t("pin_btn_confirm", userLang) || "Confirmar PIN"
                    : t("pin_btn_create", userLang) || "Salvar PIN"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomSheetButtonSecondary}
                onPress={() => setIsPinModalVisible(false)}
              >
                <Text style={styles.bottomSheetButtonSecondaryText}>
                  {t("modal_cancel", userLang) || "Cancelar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE IDIOMAS */}
      <Modal visible={isLangModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsLangModalVisible(false)}
        >
          <View style={styles.compactLangModal}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.compactFlagBtn,
                  userLang === lang.code && styles.compactFlagBtnActive,
                ]}
                onPress={() => {
                  setUserLang(lang.code);
                  setIsLangModalVisible(false);
                }}
              >
                <Text style={styles.compactFlagText}>{lang.flag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL DE ALERTAS CUSTOMIZADOS */}
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

            <View style={{ width: "100%", gap: 10, marginTop: 10 }}>
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
                  {customAlert.confirmText || t("btn_understand", userLang) || "Entendi"}
                </Text>
              </TouchableOpacity>

              {customAlert.secondaryText ? (
                <TouchableOpacity
                  style={styles.bottomSheetButtonSecondary}
                  onPress={() => {
                    setCustomAlert({ ...customAlert, visible: false });
                    if (customAlert.onSecondary) customAlert.onSecondary();
                  }}
                >
                  <Text style={styles.bottomSheetButtonSecondaryText}>
                    {customAlert.secondaryText}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  langSelectorBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    right: 24,
    zIndex: 100,
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D9E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  langSelectorFlag: { fontSize: 22 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    justifyContent: "center",
    paddingBottom: 60,
    paddingTop: 60,
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
  pinInputStyle: {
    backgroundColor: "#F0F4F8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D9E0",
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    color: "#202D3A",
    textAlign: "center",
    letterSpacing: 4,
    fontFamily: "Montserrat_700Bold",
  },
  forgotPasswordBtn: { alignSelf: "flex-end", marginBottom: 15, marginTop: -5 },
  forgotPasswordText: {
    color: "#60646C",
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
  },
  floatingBtnWrapper: { width: "100%", marginTop: 5, marginBottom: 10 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(32, 45, 58, 0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  compactLangModal: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 12,
    marginTop: Platform.OS === "ios" ? 95 : 65,
    marginRight: 20,
    width: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  compactFlagBtn: {
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  compactFlagBtnActive: {
    backgroundColor: "#F0F4F8",
    borderWidth: 2,
    borderColor: "#202D3A",
  },
  compactFlagText: { fontSize: 28 },
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
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
  },
});