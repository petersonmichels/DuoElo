import { FontAwesome5 } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { deleteUser, sendEmailVerification, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Purchases from "react-native-purchases";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../config/firebase";

import { t } from "../i18n/translations";
import { logAuditEvent } from "../services/auditService";
import { clearSecurityPin } from "../services/securityService";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let GoogleSignin: any = null;

const SUPPORTED_LANGUAGES = [
  { code: "pt-BR", flag: "🇧🇷", label: "Português (Brasil)" },
  { code: "pt-PT", flag: "🇵🇹", label: "Português (Portugal)" },
  { code: "en", flag: "🇺🇸", label: "English" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "ja", flag: "🇯🇵", label: "日本語" },
];

const COUNTRY_CODES = [
  { code: "BR", flag: "🇧🇷", ddi: "+55", name: "Brasil" },
  { code: "PT", flag: "🇵🇹", ddi: "+351", name: "Portugal" },
  { code: "US", flag: "🇺🇸", ddi: "+1", name: "EUA / Canadá" },
  { code: "ES", flag: "🇪🇸", ddi: "+34", name: "Espanha" },
  { code: "FR", flag: "🇫🇷", ddi: "+33", name: "França" },
  { code: "DE", flag: "🇩🇪", ddi: "+49", name: "Alemanha" },
  { code: "IT", flag: "🇮🇹", ddi: "+39", name: "Itália" },
  { code: "GB", flag: "🇬🇧", ddi: "+44", name: "Reino Unido" },
  { code: "LU", flag: "🇱🇺", ddi: "+352", name: "Luxemburgo" },
  { code: "CH", flag: "🇨🇭", ddi: "+41", name: "Suíça" },
  { code: "AR", flag: "🇦🇷", ddi: "+54", name: "Argentina" },
  { code: "MX", flag: "🇲🇽", ddi: "+52", name: "México" },
  { code: "CL", flag: "🇨🇱", ddi: "+56", name: "Chile" },
  { code: "CO", flag: "🇨🇴", ddi: "+57", name: "Colômbia" },
  { code: "UY", flag: "🇺🇾", ddi: "+598", name: "Uruguai" },
  { code: "BE", flag: "🇧🇪", ddi: "+32", name: "Bélgica" },
  { code: "NL", flag: "🇳🇱", ddi: "+31", name: "Holanda" },
  { code: "IE", flag: "🇮🇪", ddi: "+353", name: "Irlanda" },
  { code: "AU", flag: "🇦🇺", ddi: "+61", name: "Austrália" },
  { code: "JP", flag: "🇯🇵", ddi: "+81", name: "Japão" },
];

export default function ProfileScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");

  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [localPhone, setLocalPhone] = useState("");
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [searchCountry, setSearchCountry] = useState("");

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const saveAnim = useRef(new Animated.Value(0)).current;

  const [bypassDailyLock, setBypassDailyLock] = useState(false);
  const [enableHaptics, setEnableHaptics] = useState(true);
  const isFirstLoad = useRef(true);

  const [userLang, setUserLang] = useState("pt-BR");
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);

  const userListenerUnsubscribe = useRef<(() => void) | null>(null);

  useFocusEffect(
    useCallback(() => {
      const checkEmailVerification = async () => {
        if (auth.currentUser) {
          try {
            await auth.currentUser.reload();
            setIsEmailVerified(auth.currentUser.emailVerified || false);
          } catch (e) {
            console.log("Erro ao recarregar status do usuário", e);
          }
        }
      };
      checkEmailVerification();
    }, [])
  );

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    const appStateSubscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (nextAppState === "active" && auth.currentUser) {
          try {
            await auth.currentUser.reload();
            setIsEmailVerified(auth.currentUser.emailVerified || false);
          } catch (e) {}
        }
      }
    );

    const userRef = doc(db, "users", currentUid);
    const unsubscribeUser = onSnapshot(
      userRef,
      (docSnap) => {
        if (!auth.currentUser) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setBypassDailyLock(data.bypassDailyLock || false);
          setEnableHaptics(data.enableHaptics !== false);
          if (data.language) setUserLang(data.language);

          if (isFirstLoad.current) {
            setFirstName(data.billingFirstName || data.firstName || "");
            setLastName(data.billingLastName || data.lastName || "");
            setAddress(data.billingAddress || data.fullAddress || data.address || "");
            setZipCode(data.billingZipCode || data.billingZip || data.zipCode || "");

            const rawPhone = data.billingPhone || data.phone || data.phoneNumber || "";
            parseInitialPhone(rawPhone);

            isFirstLoad.current = false;
          }
        }
        setLoading(false);
      },
      (error) => {
        if (error.code === "permission-denied") {
          console.log("[ProfileScreen] Sessão encerrada ou permissão alterada.");
        }
      }
    );

    userListenerUnsubscribe.current = unsubscribeUser;

    return () => {
      if (userListenerUnsubscribe.current) {
        userListenerUnsubscribe.current();
      }
      appStateSubscription.remove();
    };
  }, []);

  // 🛠️ MÁSCARA DINÂMICA DE TELEFONE (POR PAÍS/DDI)
  const formatLocalNumber = (text: string, country = selectedCountry) => {
    let cleaned = text.replace(/\D/g, "");

    // Se for Brasil (+55), aplica padrão (XX) XXXXX-XXXX
    if (country.code === "BR") {
      if (cleaned.length <= 2) return cleaned;
      if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
      if (cleaned.length <= 10)
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    }

    // Se for Luxemburgo ou Europa, formata em grupos de 3 dígitos (ex: 661 123 456)
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    if (cleaned.length <= 9)
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 12)}`;
  };

  const parseInitialPhone = (raw: string) => {
    if (!raw) return;
    const matchedCountry = COUNTRY_CODES.find((c) => raw.startsWith(c.ddi));
    if (matchedCountry) {
      setSelectedCountry(matchedCountry);
      const numberOnly = raw.replace(matchedCountry.ddi, "").trim();
      setLocalPhone(formatLocalNumber(numberOnly, matchedCountry));
    } else {
      const numberOnly = raw.replace(/\D/g, "");
      setLocalPhone(formatLocalNumber(numberOnly, selectedCountry));
    }
  };

  const triggerSaveAnimation = (toValue: number, callback?: () => void) => {
    Animated.timing(saveAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start(callback);
  };

  const handleAutoSave = async (fields: { [key: string]: string }) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    setSaveStatus("saving");
    triggerSaveAnimation(1);

    try {
      await setDoc(doc(db, "users", currentUid), fields, { merge: true });
      setSaveStatus("saved");
      setTimeout(() => triggerSaveAnimation(0, () => setSaveStatus("idle")), 2000);
    } catch (e) {
      setSaveStatus("idle");
      triggerSaveAnimation(0);
    }
  };

  const savePhoneWithDDI = (newLocalPhone: string, country = selectedCountry) => {
    const fullNumber = `${country.ddi} ${newLocalPhone}`.trim();
    handleAutoSave({
      billingPhone: fullNumber,
      phone: fullNumber,
      phoneNumber: fullNumber,
    });
  };

  const handleVerifyEmail = async () => {
    if (!auth.currentUser) return;
    setIsSendingEmail(true);
    try {
      await sendEmailVerification(auth.currentUser);
      Alert.alert(
        t("verify_email_sent_title", userLang) || "E-mail Enviado!",
        t("verify_email_sent_msg", userLang) || "Confira sua caixa de entrada para confirmar seu e-mail."
      );
    } catch (error: any) {
      if (error.code === "auth/too-many-requests") {
        Alert.alert(
          t("wait_title", userLang) || "Aguarde",
          t("verify_email_too_many_msg", userLang) || "Muitas solicitações enviadas. Aguarde alguns minutos."
        );
      } else {
        Alert.alert(
          t("error_title", userLang) || "Erro",
          t("verify_email_error_msg", userLang) || "Não foi possível enviar o e-mail de verificação."
        );
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleZipChange = (text: string) => {
    let cleaned = text.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length > 5) {
      formatted = `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
    }
    setZipCode(formatted);
  };

  const processImageResult = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const currentUid = auth.currentUser?.uid;
      const asset = result.assets[0];
      const imageUri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;

      if (imageUri.length > 900000) {
        Alert.alert(
          t("photo_too_large_title", userLang) || "Imagem Muito Grande",
          t("photo_too_large_msg", userLang) || "Escolha uma foto de menor tamanho."
        );
        return;
      }

      if (currentUid) {
        setLoading(true);
        try {
          await setDoc(
            doc(db, "users", currentUid),
            { photoURL: imageUri, photoUrl: imageUri },
            { merge: true }
          );
        } catch (e) {
          Alert.alert(
            t("error_title", userLang) || "Erro",
            t("update_photo_error_msg", userLang) || "Não foi possível atualizar sua foto."
          );
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handlePickImage = () => {
    Alert.alert(
      t("profile_photo_prompt_title", userLang) || "Foto de Perfil",
      t("profile_photo_prompt_msg", userLang) || "Escolha de onde deseja selecionar sua imagem:",
      [
        {
          text: t("btn_take_photo", userLang) || "Tirar Foto",
          onPress: async () => {
            const permissionResult =
              await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert(
                t("permission_title", userLang) || "Permissão Necessária",
                t("camera_permission_msg", userLang) || "Permita o acesso à câmera nas configurações do dispositivo."
              );
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: "images",
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.1,
              base64: true,
            });
            processImageResult(result);
          },
        },
        {
          text: t("btn_choose_gallery", userLang) || "Escolher da Galeria",
          onPress: async () => {
            const permissionResult =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert(
                t("permission_title", userLang) || "Permissão Necessária",
                t("gallery_permission_msg", userLang) || "Permita o acesso à galeria nas configurações."
              );
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: "images",
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.1,
              base64: true,
            });
            processImageResult(result);
          },
        },
        { text: t("modal_cancel", userLang) || "Cancelar", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const toggleBypassLock = async (value: boolean) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;
    setBypassDailyLock(value);
    try {
      await setDoc(
        doc(db, "users", currentUid),
        { bypassDailyLock: value },
        { merge: true }
      );
    } catch (e) {
      setBypassDailyLock(!value);
    }
  };

  const toggleEnableHaptics = async (value: boolean) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;
    setEnableHaptics(value);
    try {
      await setDoc(
        doc(db, "users", currentUid),
        { enableHaptics: value },
        { merge: true }
      );
    } catch (e) {
      setEnableHaptics(!value);
    }
  };

  const handleSwitchGoogleAccount = () => {
    Alert.alert(
      t("switch_google_account_title", userLang) || "Desconectar Conta Google",
      t("switch_google_account_msg", userLang) || "Deseja alternar ou desconectar sua conta Google?",
      [
        { text: t("modal_cancel", userLang) || "Cancelar", style: "cancel" },
        {
          text: t("btn_disconnect_google", userLang) || "Desconectar",
          onPress: async () => {
            try {
              if (userListenerUnsubscribe.current) {
                userListenerUnsubscribe.current();
              }
              if (GoogleSignin && typeof GoogleSignin.signOut === "function") {
                try {
                  await GoogleSignin.signOut();
                } catch (e) {}
              }
              await clearSecurityPin();
              await signOut(auth);
            } catch (e) {
              await signOut(auth);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t("logout_title", userLang) || "Sair da Conta",
      t("logout_msg", userLang) || "Deseja realmente sair da sua conta?",
      [
        { text: t("modal_cancel", userLang) || "Cancelar", style: "cancel" },
        {
          text: t("btn_logout", userLang) || "Sair",
          style: "destructive",
          onPress: async () => {
            try {
              if (userListenerUnsubscribe.current) {
                userListenerUnsubscribe.current();
              }

              if (GoogleSignin && typeof GoogleSignin.signOut === "function") {
                try {
                  await GoogleSignin.signOut();
                } catch (e) {}
              }
              await clearSecurityPin();

              await signOut(auth);
            } catch (error) {
              console.error("Erro ao deslogar:", error);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t("delete_account_title", userLang) || "Excluir Conta",
      t("delete_account_warning_msg", userLang) ||
        "Esta ação é irreversível. Todos os seus dados serão apagados permanentemente.",
      [
        { text: t("modal_cancel", userLang) || "Cancelar", style: "cancel" },
        {
          text: t("btn_yes_delete", userLang) || "Sim, Excluir",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (!user || !user.uid) return;

            setLoading(true);
            const uidString = String(user.uid);
            const partnerString = userData?.partnerId
              ? String(userData.partnerId)
              : "sem_parceiro";

            try {
              if (userListenerUnsubscribe.current) {
                userListenerUnsubscribe.current();
              }

              try {
                const rawDetails = t("audit_account_deleted", userLang, {
                  partner: partnerString,
                });
                const detailsText =
                  rawDetails ??
                  "Exclusão de conta solicitada pelo usuário no perfil. Logs mantidos para auditoria legal.";

                await logAuditEvent(
                  uidString,
                  "ACCOUNT_EXCLUSION_REQUESTED",
                  detailsText,
                  userLang
                );
              } catch (auditErr) {
                console.log("[ProfileScreen] Log de auditoria concluído.");
              }

              if (userData?.partnerId) {
                try {
                  await setDoc(
                    doc(db, "users", userData.partnerId),
                    { partnerId: null, isSoloMode: false },
                    { merge: true }
                  );
                } catch (e) {}
              }

              if (userData?.sentMatchRequestTo?.toUid) {
                try {
                  await setDoc(
                    doc(db, "users", userData.sentMatchRequestTo.toUid),
                    { pendingMatchRequest: null },
                    { merge: true }
                  );
                } catch (e) {}
              }

              try {
                const journalsSnap = await getDocs(
                  collection(db, "users", uidString, "journals")
                );
                const deleteJournalsPromises = journalsSnap.docs.map((d) =>
                  deleteDoc(d.ref)
                );
                await Promise.all(deleteJournalsPromises);
              } catch (e) {}

              try {
                const shopDocs = ["desires", "redemptions", "confirmations"];
                const shopPromises = shopDocs.map((docName) =>
                  deleteDoc(doc(db, "users", uidString, "shop", docName))
                );
                await Promise.all(shopPromises);
              } catch (e) {}

              try {
                await deleteDoc(doc(db, "users", uidString));
              } catch (e) {}

              await clearSecurityPin();

              if (GoogleSignin && typeof GoogleSignin.signOut === "function") {
                try {
                  await GoogleSignin.signOut();
                } catch (e) {}
              }

              await deleteUser(user);
            } catch (error: any) {
              setLoading(false);

              if (
                error.code === "auth/requires-recent-login" ||
                error.message?.includes("requires-recent-login")
              ) {
                Alert.alert(
                  t("security_title", userLang) || "Sessão Expirada",
                  t("reauth_required_delete_msg", userLang) ||
                    "Por motivos de segurança, você precisa fazer login novamente no aplicativo para confirmar a exclusão da sua conta.",
                  [
                    {
                      text: "Fazer Login Novamente",
                      onPress: async () => {
                        await signOut(auth);
                      },
                    },
                    { text: "Cancelar", style: "cancel" },
                  ]
                );
              } else {
                Alert.alert(
                  t("delete_error_title", userLang) || "Erro ao Excluir",
                  t("delete_error_msg", userLang) ||
                    "Não foi possível excluir sua conta neste momento. Tente novamente mais tarde."
                );
              }
            }
          },
        },
      ]
    );
  };

  const handleManageSubscription = () => {
    if (Platform.OS === "ios")
      Linking.openURL("https://apps.apple.com/account/subscriptions");
    else
      Linking.openURL("https://play.google.com/store/account/subscriptions");
  };

  const handleRestorePurchases = async () => {
    try {
      const restoredInfo = await Purchases.restorePurchases();
      if (Object.keys(restoredInfo.entitlements.active).length > 0) {
        Alert.alert(
          t("sub_restored_title", userLang) || "Compras Restauradas",
          t("sub_restored_msg", userLang) || "Sua assinatura foi identificada e restaurada com sucesso."
        );
      } else {
        Alert.alert(
          t("no_active_sub_title", userLang) || "Sem Assinatura Ativa",
          t("no_active_sub_msg", userLang) || "Nenhuma assinatura ativa localizada para esta conta."
        );
      }
    } catch (e) {
      Alert.alert(
        t("error_title", userLang) || "Erro",
        t("restore_purchases_error_msg", userLang) || "Falha ao consultar compras restauradas."
      );
    }
  };

  const handleSupport = () => {
    Linking.openURL("mailto:suporte@duoelo.lu?subject=Suporte%20DuoElo%20App");
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert(
        t("error_title", userLang) || "Erro",
        t("cannot_open_page_msg", userLang) || "Não foi possível abrir o link."
      )
    );
  };

  const filteredCountries = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchCountry.toLowerCase()) ||
      c.ddi.includes(searchCountry) ||
      c.code.toLowerCase().includes(searchCountry.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#202D3A" />
      </SafeAreaView>
    );
  }

  const isValidPhoto = (url: any) =>
    url &&
    typeof url === "string" &&
    url.length > 5 &&
    url.toLowerCase() !== "null";

  const getFirstName = (nameStr?: string | null) =>
    nameStr ? nameStr.trim().split(" ")[0] : null;

  const rawPhoto = userData?.photoURL || userData?.photoUrl;
  const myPhoto: string | null = isValidPhoto(rawPhoto) ? String(rawPhoto) : null;
  const avatarKey: string = myPhoto ? myPhoto.substring(0, 50) : "default-avatar";

  const isPremium = userData?.isPremium || false;

  const displayUsername = userData?.username
    ? `@${userData.username}`
    : firstName.trim()
    ? firstName.trim()
    : getFirstName(userData?.billingFirstName ?? undefined) ||
      getFirstName(userData?.displayName ?? undefined) ||
      getFirstName(auth.currentUser?.displayName ?? undefined) ||
      t("user_default_name", userLang) || "Usuário DuoElo";

  const currentFlag =
    SUPPORTED_LANGUAGES.find((l) => l.code === userLang)?.flag || "🇧🇷";

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
          >
            <FontAwesome5 name="chevron-left" size={20} color="#202D3A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("my_profile_title", userLang) || "Meu Perfil"}</Text>
          <View style={{ width: 40 }} />

          <Animated.View style={[styles.autoSaveToast, { opacity: saveAnim }]}>
            <FontAwesome5
              name={saveStatus === "saving" ? "sync" : "check"}
              size={12}
              color="#FFF"
            />
            <Text style={styles.autoSaveText}>
              {saveStatus === "saving"
                ? t("saving_label", userLang) || "Salvando..."
                : t("saved_label", userLang) || "Salvo"}
            </Text>
          </Animated.View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 📸 CABEÇALHO DO PERFIL */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              activeOpacity={0.8}
              onPress={handlePickImage}
            >
              {myPhoto ? (
                <Image
                  key={avatarKey}
                  source={{ uri: myPhoto }}
                  style={styles.avatarImage}
                />
              ) : (
                <FontAwesome5 name="user-alt" size={40} color="#EAB64A" />
              )}
              <View style={styles.editPhotoBadge}>
                <FontAwesome5 name="camera" size={12} color="#FFF" />
              </View>
            </TouchableOpacity>

            <Text style={styles.userName}>{displayUsername}</Text>

            <View style={styles.emailContainer}>
              <Text style={styles.userEmail}>{auth.currentUser?.email}</Text>
              {isEmailVerified ? (
                <View style={styles.verifiedBadge}>
                  <FontAwesome5 name="check-circle" solid size={14} color="#67D4A8" />
                </View>
              ) : (
                <View style={styles.unverifiedBadge}>
                  <FontAwesome5 name="exclamation-circle" solid size={14} color="#EAB64A" />
                </View>
              )}
            </View>

            {!isEmailVerified && (
              <TouchableOpacity
                style={styles.verifyEmailBtn}
                onPress={handleVerifyEmail}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? (
                  <ActivityIndicator size="small" color="#EAB64A" />
                ) : (
                  <Text style={styles.verifyEmailText}>
                    {t("send_verify_email_btn", userLang) || "Verificar E-mail"}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {isPremium ? (
              <View style={[styles.premiumBadge, { marginTop: 15 }]}>
                <FontAwesome5 name="crown" size={12} color="#202D3A" />
                <Text style={styles.premiumText}>
                  {t("premium_status_label", userLang) || "PREMIUM ATIVO"}
                </Text>
              </View>
            ) : (
              <View style={[styles.premiumBadge, { backgroundColor: "#D1D9E0", marginTop: 15 }]}>
                <Text style={[styles.premiumText, { color: "#60646C" }]}>
                  {t("free_status_label", userLang) || "PLANO GRATUITO"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("life_habits_section_title", userLang) || "HÁBITOS DA VIDA"}
            </Text>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => navigation.navigate("HabitsConfigScreen")}
            >
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#E8F4F1" }]}>
                  <FontAwesome5 name="leaf" size={16} color="#67D4A8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuOptionText}>
                    {t("menu_configure_habits", userLang) || "Configurar Hábitos Diários"}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#60646C", fontFamily: "Montserrat_400Regular", marginTop: 2 }}>
                    {t("menu_configure_habits_sub", userLang) || "Personalize e selecione seus hábitos no feed VIDA"}
                  </Text>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("journey_stats_title", userLang) || "ESTATÍSTICAS DA JORNADA"}</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <FontAwesome5 name="fire" size={24} color="#EAB64A" />
                <Text style={styles.statValue}>{userData?.streak || 0}</Text>
                <Text style={styles.statLabel}>{t("consecutive_days_label", userLang) || "Dias Seguidos"}</Text>
              </View>
              <View style={styles.statBox}>
                <FontAwesome5 name="infinity" size={24} color="#EAB64A" />
                <Text style={styles.statValue}>{userData?.totalPE || userData?.pointsPE || 0}</Text>
                <Text style={styles.statLabel}>Bonds</Text>
              </View>
            </View>
          </View>

          {/* 📝 FORMULÁRIO DE DADOS PESSOAIS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("personal_data_autosave_title", userLang) || "DADOS PESSOAIS"}</Text>
            <View style={styles.formCard}>
              <View style={styles.rowFields}>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>{t("first_name_label", userLang) || "Nome"}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t("first_name_placeholder", userLang) || "Seu nome"}
                    placeholderTextColor="#AFAFAF"
                    value={firstName}
                    onChangeText={setFirstName}
                    onBlur={() =>
                      handleAutoSave({
                        billingFirstName: firstName,
                        firstName: firstName,
                      })
                    }
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>{t("last_name_label", userLang) || "Sobrenome"}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t("last_name_placeholder", userLang) || "Seu sobrenome"}
                    placeholderTextColor="#AFAFAF"
                    value={lastName}
                    onChangeText={setLastName}
                    onBlur={() =>
                      handleAutoSave({
                        billingLastName: lastName,
                        lastName: lastName,
                      })
                    }
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("full_address_label", userLang) || "Endereço Completo"}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("full_address_placeholder", userLang) || "Rua, Número, Bairro"}
                  placeholderTextColor="#AFAFAF"
                  value={address}
                  onChangeText={setAddress}
                  onBlur={() =>
                    handleAutoSave({
                      billingAddress: address,
                      fullAddress: address,
                      address: address,
                    })
                  }
                />
              </View>

              <View style={styles.rowFields}>
                <View style={[styles.inputGroup, { flex: 0.38 }]}>
                  <Text style={styles.inputLabel}>{t("zip_code_label", userLang) || "CEP"}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="00000-000"
                    placeholderTextColor="#AFAFAF"
                    keyboardType="number-pad"
                    value={zipCode}
                    onChangeText={handleZipChange}
                    onBlur={() =>
                      handleAutoSave({
                        billingZipCode: zipCode,
                        billingZip: zipCode,
                        zipCode: zipCode,
                      })
                    }
                    maxLength={9}
                  />
                </View>

                {/* 📞 TELEFONE AJUSTADO COM MÁSCARA DINÂMICA */}
                <View style={[styles.inputGroup, { flex: 0.62 }]}>
                  <Text style={styles.inputLabel}>{t("phone_label", userLang) || "Telefone"}</Text>
                  <View style={styles.phoneContainer}>
                    <TouchableOpacity
                      style={styles.countryPickerBtn}
                      onPress={() => setIsCountryModalVisible(true)}
                    >
                      <Text style={styles.flagText}>{selectedCountry.flag}</Text>
                      <Text style={styles.ddiText}>{selectedCountry.ddi}</Text>
                      <FontAwesome5 name="chevron-down" size={10} color="#60646C" />
                    </TouchableOpacity>

                    <TextInput
                      style={styles.phoneInput}
                      placeholder={selectedCountry.code === "BR" ? "(99) 99999-9999" : "661 123 456"}
                      placeholderTextColor="#AFAFAF"
                      keyboardType="phone-pad"
                      value={localPhone}
                      onChangeText={(txt) => {
                        const formatted = formatLocalNumber(txt, selectedCountry);
                        setLocalPhone(formatted);
                      }}
                      onBlur={() => savePhoneWithDDI(localPhone, selectedCountry)}
                      maxLength={selectedCountry.code === "BR" ? 15 : 16}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("sub_legal_title", userLang) || "ASSINATURA E TERMOS"}</Text>

            <TouchableOpacity style={styles.menuOption} onPress={handleManageSubscription}>
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}>
                  <FontAwesome5 name="credit-card" size={16} color="#EAB64A" />
                </View>
                <Text style={styles.menuOptionText}>{t("menu_manage_sub", userLang) || "Gerenciar Assinatura"}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption} onPress={handleRestorePurchases}>
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#E8F4F1" }]}>
                  <FontAwesome5 name="sync-alt" size={16} color="#67D4A8" />
                </View>
                <Text style={styles.menuOptionText}>{t("btn_restore_purchases", userLang) || "Restaurar Compras"}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => openUrl(`https://duoelo.lu/termos?lang=${userLang}`)}
            >
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}>
                  <FontAwesome5 name="file-contract" size={16} color="#202D3A" />
                </View>
                <Text style={styles.menuOptionText}>{t("terms_of_use_eula", userLang) || "Termos de Uso (EULA)"}</Text>
              </View>
              <FontAwesome5 name="external-link-alt" size={12} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => openUrl(`https://duoelo.lu/privacidade?lang=${userLang}`)}
            >
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}>
                  <FontAwesome5 name="user-shield" size={16} color="#202D3A" />
                </View>
                <Text style={styles.menuOptionText}>{t("privacy_policy_link", userLang) || "Política de Privacidade"}</Text>
              </View>
              <FontAwesome5 name="external-link-alt" size={12} color="#D1D9E0" />
            </TouchableOpacity>
          </View>

          {/* ⚙️ CONFIGURAÇÕES DA CONTA (COM FLEXWRAP PROTEGENDO TEXTOS EM ALEMÃO/INGLÊS) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("account_settings_title", userLang) || "CONFIGURAÇÕES DA CONTA"}</Text>

            <TouchableOpacity style={styles.menuOption} onPress={() => setIsLangModalVisible(true)}>
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}>
                  <Text style={{ fontSize: 18 }}>{currentFlag}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuOptionText}>{t("app_language_title", userLang) || "Idioma do Aplicativo"}</Text>
                  <Text style={{ fontSize: 11, color: "#60646C", marginTop: 2, fontFamily: "Montserrat_400Regular" }}>
                    {SUPPORTED_LANGUAGES.find((l) => l.code === userLang)?.label}
                  </Text>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <View style={[styles.menuOption, { paddingVertical: 12 }]}>
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}>
                  <FontAwesome5 name="mobile-alt" size={16} color="#67D4A8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuOptionText}>{t("haptics_label", userLang) || "Vibração Tátil (Haptics)"}</Text>
                  <Text style={{ fontSize: 11, color: "#60646C", marginTop: 2, fontFamily: "Montserrat_400Regular" }}>
                    {t("haptics_desc", userLang) || "Vibração ao tocar nos botões do app"}
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: "#D1D9E0", true: "#67D4A8" }}
                thumbColor={"#FFF"}
                ios_backgroundColor="#D1D9E0"
                onValueChange={toggleEnableHaptics}
                value={enableHaptics}
              />
            </View>

            <View style={[styles.menuOption, { paddingVertical: 12 }]}>
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}>
                  <FontAwesome5 name="unlock-alt" size={16} color="#EAB64A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuOptionText}>{t("bypass_lock_label", userLang) || "Desbloqueio sem Trava Diária"}</Text>
                  <Text style={{ fontSize: 11, color: "#60646C", marginTop: 2, fontFamily: "Montserrat_400Regular" }}>
                    {t("bypass_lock_desc", userLang) || "Permite responder mais de 1 missão por dia"}
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: "#D1D9E0", true: "#67D4A8" }}
                thumbColor={"#FFF"}
                ios_backgroundColor="#D1D9E0"
                onValueChange={toggleBypassLock}
                value={bypassDailyLock}
              />
            </View>

            <TouchableOpacity style={styles.menuOption} onPress={handleSwitchGoogleAccount}>
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#FDE8E8" }]}>
                  <FontAwesome5 name="google" size={16} color="#EA4335" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuOptionText}>{t("switch_google_account_menu", userLang) || "Desconectar Conta Google"}</Text>
                  <Text style={{ fontSize: 11, color: "#60646C", marginTop: 2, fontFamily: "Montserrat_400Regular" }}>
                    {t("switch_google_account_desc", userLang) || "Desconecta e limpa sessão do Google"}
                  </Text>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption} onPress={handleOpenSettings}>
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}>
                  <FontAwesome5 name="bell" size={16} color="#202D3A" />
                </View>
                <Text style={styles.menuOptionText}>{t("adjust_notifications_menu", userLang) || "Ajustar Notificações"}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption} onPress={handleSupport}>
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}>
                  <FontAwesome5 name="headset" size={16} color="#202D3A" />
                </View>
                <Text style={styles.menuOptionText}>{t("contact_support_menu", userLang) || "Falar com Suporte"}</Text>
              </View>
              <FontAwesome5 name="envelope" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOption, { borderBottomWidth: 0 }]}
              onPress={handleLogout}
            >
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}>
                  <FontAwesome5 name="sign-out-alt" size={16} color="#60646C" />
                </View>
                <Text style={styles.menuOptionText}>{t("logout_menu_option", userLang) || "Sair da Conta"}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.deleteAccountLink} onPress={handleDeleteAccount}>
            <Text style={styles.deleteAccountText}>
              {t("delete_account_permanently_btn", userLang) || "Excluir Conta Permanentemente"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>DuoElo v1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 🌐 MODAL DE SELEÇÃO DE PAÍS COM BUSCA INTEGRADA */}
      <Modal visible={isCountryModalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setIsCountryModalVisible(false)}
        >
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>Selecione o País</Text>

            <View style={styles.searchBox}>
              <FontAwesome5 name="search" size={14} color="#AFAFAF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar país ou DDI..."
                placeholderTextColor="#AFAFAF"
                value={searchCountry}
                onChangeText={setSearchCountry}
              />
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code + item.ddi}
              style={{ width: "100%", maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.langOptionItem,
                    selectedCountry.code === item.code && styles.langOptionItemActive,
                  ]}
                  onPress={() => {
                    setSelectedCountry(item);
                    setIsCountryModalVisible(false);
                    const formatted = formatLocalNumber(localPhone, item);
                    setLocalPhone(formatted);
                    savePhoneWithDDI(formatted, item);
                    setSearchCountry("");
                  }}
                >
                  <Text style={{ fontSize: 22, marginRight: 12 }}>{item.flag}</Text>
                  <Text style={styles.langOptionText}>{item.name}</Text>
                  <Text style={{ fontFamily: "Montserrat_700Bold", color: "#60646C" }}>
                    {item.ddi}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 🌐 MODAL DE SELEÇÃO DE IDIOMA */}
      <Modal visible={isLangModalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setIsLangModalVisible(false)}
        >
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>
              {t("choose_language_title", userLang) || "Escolha o Idioma"}
            </Text>

            <ScrollView style={{ width: "100%", maxHeight: 300 }}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langOptionItem,
                    userLang === lang.code && styles.langOptionItemActive,
                  ]}
                  onPress={async () => {
                    setUserLang(lang.code);
                    setIsLangModalVisible(false);
                    const uid = auth.currentUser?.uid;
                    if (uid) {
                      await setDoc(
                        doc(db, "users", uid),
                        { language: lang.code },
                        { merge: true }
                      );
                    }
                  }}
                >
                  <Text style={{ fontSize: 24, marginRight: 12 }}>{lang.flag}</Text>
                  <Text
                    style={[
                      styles.langOptionText,
                      userLang === lang.code && styles.langOptionTextActive,
                    ]}
                  >
                    {lang.label}
                  </Text>
                  {userLang === lang.code && (
                    <FontAwesome5 name="check" size={16} color="#67D4A8" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F4F8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 20,
    position: "relative",
  },
  autoSaveToast: {
    position: "absolute",
    top: 15,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#202D3A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
  },
  autoSaveText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
  },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  avatarSection: { alignItems: "center", marginTop: 10, marginBottom: 30 },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF",
    borderWidth: 4,
    borderColor: "#EAB64A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#EAB64A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    overflow: "hidden",
  },
  editPhotoBadge: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "rgba(32,45,58,0.7)",
    paddingVertical: 4,
    alignItems: "center",
  },
  avatarImage: { width: "100%", height: "100%" },
  userName: {
    fontSize: 24,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 4,
  },
  emailContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: "#60646C",
    fontFamily: "Montserrat_400Regular",
  },
  verifiedBadge: { justifyContent: "center", alignItems: "center" },
  unverifiedBadge: { justifyContent: "center", alignItems: "center" },
  verifyEmailBtn: {
    marginTop: 5,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(234, 182, 74, 0.15)",
  },
  verifyEmailText: {
    color: "#EAB64A",
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAB64A",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  premiumText: {
    color: "#202D3A",
    fontSize: 12,
    fontFamily: "Montserrat_900Black",
    textTransform: "uppercase",
  },
  section: { marginBottom: 30 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 15,
  },
  statsContainer: { flexDirection: "row", gap: 15 },
  statBox: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D9E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginTop: 10,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#60646C",
    fontFamily: "Montserrat_700Bold",
    textTransform: "uppercase",
  },
  formCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D9E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rowFields: { flexDirection: "row", gap: 10 },
  halfInput: { flex: 1 },
  inputGroup: { marginBottom: 15 },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    color: "#60646C",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F0F4F8",
    borderWidth: 1,
    borderColor: "#D1D9E0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#202D3A",
    fontFamily: "Montserrat_600SemiBold",
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4F8",
    borderWidth: 1,
    borderColor: "#D1D9E0",
    borderRadius: 12,
    overflow: "hidden",
  },
  countryPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F4F1",
    paddingHorizontal: 6,
    paddingVertical: 12,
    gap: 3,
    borderRightWidth: 1,
    borderRightColor: "#D1D9E0",
  },
  flagText: { fontSize: 15 },
  ddiText: {
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 13,
    color: "#202D3A",
    fontFamily: "Montserrat_600SemiBold",
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#D1D9E0",
  },
  menuOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    flex: 1,
    marginRight: 10,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuOptionText: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
    flexShrink: 1,
  },
  deleteAccountLink: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
    padding: 10,
  },
  deleteAccountText: {
    color: "#AFAFAF",
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    textDecorationLine: "underline",
  },
  versionText: {
    textAlign: "center",
    color: "#D1D9E0",
    fontFamily: "Montserrat_700Bold",
    marginTop: 10,
    marginBottom: 20,
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
  bottomSheetTitle: {
    fontFamily: "Montserrat_900Black",
    fontSize: 20,
    color: "#202D3A",
    marginBottom: 16,
    textAlign: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4F8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
    width: "100%",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#202D3A",
    fontFamily: "Montserrat_400Regular",
  },
  langOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F0F4F8",
  },
  langOptionItemActive: {
    backgroundColor: "#E8F4F1",
    borderWidth: 1,
    borderColor: "#67D4A8",
  },
  langOptionText: {
    flex: 1,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 15,
    color: "#202D3A",
  },
  langOptionTextActive: {
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
  },
});