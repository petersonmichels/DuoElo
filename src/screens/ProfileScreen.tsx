import { FontAwesome5 } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { deleteUser, sendEmailVerification, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { CustomAlertModal } from "../components/CustomAlertModal";
import { auth, db } from "../config/firebase";

import { COUNTRY_CODES } from "../constants/countries";
import { SUPPORTED_LANGUAGES } from "../constants/languages";
import { t } from "../i18n/translations";
import { audioService } from "../services/AudioService";
import { logAuditEvent } from "../services/auditService";
import { clearSecurityPin } from "../services/securityService";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let GoogleSignin: any = null;

const LANGUAGE_TO_COUNTRY_CODE: Record<string, string> = {
  "pt-BR": "BR",
  "pt-PT": "PT",
  en: "US",
  es: "ES",
  fr: "FR",
  de: "DE",
  ja: "JP",
};

const getLegalUrlLangParam = (lang: string): string => {
  const langMap: Record<string, string> = {
    "pt-BR": "pt",
    "pt-PT": "pt",
    en: "en",
    es: "es",
    fr: "fr",
    de: "de",
    ja: "ja",
  };
  return langMap[lang] || "en";
};

export default function ProfileScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [localPhone, setLocalPhone] = useState("");
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [searchCountry, setSearchCountry] = useState("");

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const saveAnim = useRef(new Animated.Value(0));

  const [bypassDailyLock, setBypassDailyLock] = useState(false);
  const [enableHaptics, setEnableHaptics] = useState(true);
  const [enableSfx, setEnableSfx] = useState(true);
  const isFirstLoad = useRef(true);

  const [userLang, setUserLang] = useState("pt-BR");
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);
  const [isPremiumActive, setIsPremiumActive] = useState(false);

  const userListenerUnsubscribe = useRef<(() => void) | null>(null);

  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "info-circle",
    color: "#202D3A",
    confirmText: t("btn_understand", userLang) || "Entendido",
    onConfirm: null as (() => void) | null,
    secondaryText: "",
    onSecondary: null as (() => void) | null,
  });

  const showCustomAlert = (
    title: string,
    message: string,
    icon = "info-circle",
    color = "#202D3A",
    confirmText = t("btn_understand", userLang) || "Entendido",
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

  const appVersion = Constants.expoConfig?.version || "1.0.3";
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ||
    Constants.expoConfig?.android?.versionCode ||
    "19";

  const formatLocalNumber = useCallback((text: string, country = selectedCountry) => {
    let cleaned = text.replace(/\D/g, "");

    if (country.code === "BR") {
      if (cleaned.length <= 2) return cleaned;
      if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
      if (cleaned.length <= 10)
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    }

    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    if (cleaned.length <= 9)
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 12)}`;
  }, [selectedCountry]);

  const parseInitialPhone = useCallback((raw: string) => {
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
  }, [selectedCountry, formatLocalNumber]);

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

  const syncSubscriptionWithRevenueCat = useCallback(async (currentFirestorePremium: boolean) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid || Platform.OS === "web") return;

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const hasActiveEntitlement = Object.keys(customerInfo.entitlements.active).length > 0;

      if (currentFirestorePremium && !hasActiveEntitlement) {
        await setDoc(
          doc(db, "users", currentUid),
          {
            isPremium: false,
            planType: "free",
            activeProductId: null,
          },
          { merge: true }
        );
      }
    } catch (e) {
      console.log("[PROFILE] Erro ao validar assinatura no RevenueCat:", e);
    }
  }, []);

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    audioService.init().then((sfxState) => {
      setEnableSfx(sfxState);
    });

    const appStateSubscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (nextAppState === "active" && auth.currentUser) {
          try {
            await auth.currentUser.reload();
            setIsEmailVerified(auth.currentUser.emailVerified || false);
            syncSubscriptionWithRevenueCat(Boolean(userData?.isPremium));
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

          const isDirectPremium = Boolean(data.isPremium);
          const isDuoPartnerPremium = Boolean(
            data.isPartnerPremium &&
            (data.partnerPlanType === "duo" || data.partnerPlanType === "duo_annual" || data.partnerPlanType === "duo_monthly")
          );

          const hasActivePremiumAccess = isDirectPremium || isDuoPartnerPremium;
          setIsPremiumActive(hasActivePremiumAccess);

          if (isFirstLoad.current) {
            setFirstName(data.billingFirstName || data.firstName || "");
            setLastName(data.billingLastName || data.lastName || "");

            const rawPhone = data.billingPhone || data.phone || data.phoneNumber || "";
            
            if (rawPhone) {
              parseInitialPhone(rawPhone);
            } else {
              const defaultCountryCode = LANGUAGE_TO_COUNTRY_CODE[data.language || "pt-BR"] || "BR";
              const matchedCountry = COUNTRY_CODES.find((c) => c.code === defaultCountryCode);
              if (matchedCountry) {
                setSelectedCountry(matchedCountry);
              }
            }

            isFirstLoad.current = false;
          }
        }
        setLoading(false);
      },
      (error) => {
        if (error.code === "permission-denied") {
          console.log("[ProfileScreen] Sessão encerrada ou permissão alterada.");
        }
        setLoading(false);
      }
    );

    userListenerUnsubscribe.current = unsubscribeUser;

    return () => {
      if (userListenerUnsubscribe.current) {
        userListenerUnsubscribe.current();
      }
      appStateSubscription.remove();
    };
  }, [parseInitialPhone, syncSubscriptionWithRevenueCat]);

  const triggerSaveAnimation = (toValue: number, callback?: () => void) => {
    Animated.timing(saveAnim.current, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start(callback);
  };

  const handleAutoSave = async (fields: { [key: string]: any }) => {
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
      countryCode: country.code,
    });
  };

  const handleVerifyEmail = async () => {
    if (!auth.currentUser) return;
    setIsSendingEmail(true);
    try {
      await sendEmailVerification(auth.currentUser);
      showCustomAlert(
        t("verify_email_sent_title", userLang) || "E-mail de Verificação Enviado",
        t("verify_email_sent_msg", userLang) || "Confira sua caixa de entrada para confirmar o e-mail.",
        "check-circle",
        "#67D4A8"
      );
    } catch (error: any) {
      if (error.code === "auth/too-many-requests") {
        showCustomAlert(
          t("wait_title", userLang) || "Aguarde",
          t("verify_email_too_many_msg", userLang) || "Muitas solicitações enviadas. Tente novamente mais tarde.",
          "hourglass-half",
          "#EAB64A"
        );
      } else {
        showCustomAlert(
          t("error_title", userLang) || "Erro",
          t("verify_email_error_msg", userLang) || "Não foi possível enviar o e-mail de verificação.",
          "times-circle",
          "#D96C6C"
        );
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  const processImageResult = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const currentUid = auth.currentUser?.uid;
      const asset = result.assets[0];
      const imageUri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;

      if (imageUri.length > 900000) {
        showCustomAlert(
          t("photo_too_large_title", userLang) || "Foto Muito Grande",
          t("photo_too_large_msg", userLang) || "Escolha uma imagem de menor tamanho.",
          "exclamation-triangle",
          "#EAB64A"
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
          showCustomAlert(
            t("error_title", userLang) || "Erro",
            t("update_photo_error_msg", userLang) || "Não foi possível atualizar a foto.",
            "times-circle",
            "#D96C6C"
          );
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handlePickImage = () => {
    showCustomAlert(
      t("profile_photo_prompt_title", userLang) || "Foto do Perfil",
      t("profile_photo_prompt_msg", userLang) || "Escolha de onde deseja selecionar sua foto:",
      "camera",
      "#202D3A",
      t("btn_take_photo", userLang) || "Câmera",
      async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
          showCustomAlert(
            t("permission_title", userLang) || "Permissão Necessária",
            t("camera_permission_msg", userLang) || "Permita o acesso à câmera para continuar.",
            "ban",
            "#EAB64A"
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
      t("btn_choose_gallery", userLang) || "Galeria",
      async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
          showCustomAlert(
            t("permission_title", userLang) || "Permissão Necessária",
            t("gallery_permission_msg", userLang) || "Permita o acesso à galeria para continuar.",
            "ban",
            "#EAB64A"
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
      }
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

  const toggleEnableSfx = async (value: boolean) => {
    const currentUid = auth.currentUser?.uid;
    setEnableSfx(value);
    await audioService.setSfxEnabled(value);

    if (value) {
      audioService.play("click");
    }

    if (currentUid) {
      try {
        await setDoc(
          doc(db, "users", currentUid),
          { enableSfx: value },
          { merge: true }
        );
      } catch (e) {
        console.warn("[ProfileScreen] Erro ao salvar estado de SFX no Firestore:", e);
      }
    }
  };

  const handleLogout = () => {
    showCustomAlert(
      t("logout_title", userLang) || "Sair da Conta",
      t("logout_msg", userLang) || "Deseja encerar sua sessão atual no aplicativo?",
      "sign-out-alt",
      "#EAB64A",
      t("btn_logout", userLang) || "Sim, Sair",
      async () => {
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
      t("modal_cancel", userLang) || "Cancelar",
      () => {}
    );
  };

  // 🟢 ERRO 5: DISPATCH DE DISMATCH SÍNCRONO NO BANCO DO PARCEIRO
  const handleDeleteAccount = () => {
    showCustomAlert(
      t("delete_account_title", userLang) || "Excluir Conta Permanentemente?",
      t("delete_account_warning_msg", userLang) || "Atenção: Essa ação apaga todo o seu histórico, conquistas e vínculo de forma irreversível.",
      "user-slash",
      "#D96C6C",
      t("btn_yes_delete", userLang) || "Sim, Apagar Tudo",
      async () => {
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
            const detailsText = t("audit_account_deleted", userLang, {
              partner: partnerString,
            });

            await logAuditEvent(
              uidString,
              "ACCOUNT_EXCLUSION_REQUESTED",
              detailsText,
              userLang
            );
          } catch (auditErr) {}

          // 🛡️ DESVINCULA E NOTIFICA O PARCEIRO IMEDIATAMENTE
          if (userData?.partnerId) {
            try {
              const partnerSnap = await getDoc(doc(db, "users", userData.partnerId));
              const partnerData = partnerSnap.exists() ? partnerSnap.data() : null;

              const partnerUpdates: any = {
                partnerId: null,
                hasPartner: false,
                matchStatus: "partner_disconnected_pending_choice",
                isSoloMode: false,
                isReadyToStart: false,
                hasPressedPlay: false,
                myTrail: [],
              };

              if (!partnerData?.activeProductId) {
                partnerUpdates.isPremium = false;
                partnerUpdates.isPartnerPremium = false;
                partnerUpdates.planType = "free";
              }

              await setDoc(
                doc(db, "users", userData.partnerId),
                partnerUpdates,
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
          if (
            error.code === "auth/requires-recent-login" ||
            error.message?.includes("requires-recent-login")
          ) {
            showCustomAlert(
              t("security_title", userLang) || "Reautenticação Necessária",
              t("reauth_required_delete_msg", userLang) || "Por motivos de segurança, faça login novamente para confirmar a exclusão.",
              "lock",
              "#EAB64A",
              t("btn_login_again", userLang) || "Fazer Login Novamente",
              async () => {
                await signOut(auth);
              },
              t("modal_cancel", userLang) || "Cancelar",
              () => {}
            );
          } else {
            showCustomAlert(
              t("delete_error_title", userLang) || "Erro ao Excluir",
              t("delete_error_msg", userLang) || "Não foi possível excluir sua conta no momento.",
              "times-circle",
              "#D96C6C"
            );
          }
        } finally {
          setLoading(false);
        }
      },
      t("modal_cancel", userLang) || "Cancelar",
      () => {}
    );
  };

  const handleManageSubscription = () => {
    if (Platform.OS === "ios")
      Linking.openURL("https://apps.apple.com/account/subscriptions");
    else
      Linking.openURL("https://play.google.com/store/account/subscriptions");
  };

  const handleRestorePurchases = async () => {
    setLoading(true);
    try {
      const restoredInfo = await Purchases.restorePurchases();
      const hasActiveEntitlement = Object.keys(restoredInfo.entitlements.active).length > 0;

      const currentUid = auth.currentUser?.uid;
      if (currentUid && hasActiveEntitlement) {
        const activeSubId = restoredInfo.activeSubscriptions[0] || "";
        const isDuoPlan = activeSubId.includes("duo") || activeSubId.includes("_duo_");

        const userUpdates: any = {
          isPremium: true,
          planType: isDuoPlan ? "duo" : "solo",
          activeProductId: activeSubId,
        };

        await setDoc(doc(db, "users", currentUid), userUpdates, { merge: true });

        if (isDuoPlan && userData?.partnerId) {
          try {
            await setDoc(
              doc(db, "users", userData.partnerId),
              { isPremium: true, isPartnerPremium: true, planType: "duo" },
              { merge: true }
            );
          } catch (partnerErr) {}
        }

        try {
          await logAuditEvent(
            currentUid,
            "PURCHASE_RESTORED",
            "Restauração de compras concluída com sucesso no perfil",
            userLang
          );
        } catch (aErr) {}

        setIsPremiumActive(true);

        showCustomAlert(
          t("sub_restored_title", userLang) || "Compras Restauradas",
          t("sub_restored_msg", userLang) || "Sua assinatura ativa foi restaurada com sucesso.",
          "check-circle",
          "#67D4A8"
        );
      } else {
        if (currentUid) {
          await setDoc(
            doc(db, "users", currentUid),
            { isPremium: false, planType: "free", activeProductId: null },
            { merge: true }
          );
        }
        setIsPremiumActive(false);
        showCustomAlert(
          t("no_active_sub_title", userLang) || "Nenhuma Assinatura Ativa",
          t("no_active_sub_msg", userLang) || "Não encontramos assinaturas ativas vinculadas à sua conta na loja.",
          "info-circle",
          "#EAB64A"
        );
      }
    } catch (e: any) {
      showCustomAlert(
        t("error_title", userLang) || "Erro",
        e?.message || t("restore_purchases_error_msg", userLang) || "Erro ao restaurar compras.",
        "times-circle",
        "#D96C6C"
      );
    } finally {
      setLoading(false);
    }
  };

  // 🟢 ERRO 3: E-MAIL DE SUPORTE ATUALIZADO PARA help@duoelo.lu
  const handleSupport = () => {
    Linking.openURL("mailto:help@duoelo.lu?subject=Suporte%20DuoElo%20App");
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() =>
      showCustomAlert(
        t("error_title", userLang) || "Erro",
        t("cannot_open_page_msg", userLang) || "Não foi possível abrir o link.",
        "times-circle",
        "#D96C6C"
      )
    );
  };

  const handleSelectLanguage = async (newLang: string) => {
    setUserLang(newLang);
    setIsLangModalVisible(false);

    if (!localPhone.trim()) {
      const defaultCountryCode = LANGUAGE_TO_COUNTRY_CODE[newLang] || "BR";
      const matchedCountry = COUNTRY_CODES.find((c) => c.code === defaultCountryCode);
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
      }
    }

    const uid = auth.currentUser?.uid;
    if (uid) {
      await setDoc(
        doc(db, "users", uid),
        { language: newLang },
        { merge: true }
      );
    }
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

  const getFirstNameStr = (nameStr?: string | null) =>
    nameStr ? nameStr.trim().split(" ")[0] : null;

  const rawPhoto = userData?.photoURL || userData?.photoUrl;
  const myPhoto: string | null = isValidPhoto(rawPhoto) ? String(rawPhoto) : null;
  const avatarKey: string = myPhoto ? myPhoto.substring(0, 50) : "default-avatar";

  const displayUsername = userData?.username
    ? `@${userData.username}`
    : firstName.trim()
    ? firstName.trim()
    : getFirstNameStr(userData?.billingFirstName ?? undefined) ||
      getFirstNameStr(userData?.displayName ?? undefined) ||
      getFirstNameStr(auth.currentUser?.displayName ?? undefined) ||
      t("user_default_name", userLang);

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
          <Text style={styles.headerTitle}>{t("my_profile_title", userLang)}</Text>
          <View style={{ width: 40 }} />

          <Animated.View style={[styles.autoSaveToast, { opacity: saveAnim.current }]}>
            <FontAwesome5
              name={saveStatus === "saving" ? "sync" : "check"}
              size={12}
              color="#FFF"
            />
            <Text style={styles.autoSaveText}>
              {saveStatus === "saving"
                ? t("saving_label", userLang)
                : t("saved_label", userLang)}
            </Text>
          </Animated.View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
                    {t("send_verify_email_btn", userLang)}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {isPremiumActive ? (
              <View style={[styles.premiumBadge, { marginTop: 15 }]}>
                <FontAwesome5 name="crown" size={12} color="#202D3A" />
                <Text style={styles.premiumText}>
                  {t("premium_status_label", userLang)}
                </Text>
              </View>
            ) : (
              <View style={[styles.premiumBadge, { backgroundColor: "#D1D9E0", marginTop: 15 }]}>
                <Text style={[styles.premiumText, { color: "#60646C" }]}>
                  {t("free_status_label", userLang)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("life_habits_section_title", userLang)}
            </Text>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => navigation.navigate("HabitsConfigScreen")}
            >
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#E8F4F1" }]}>
                  <FontAwesome5 name="leaf" size={16} color="#67D4A8" />
                </View>
                <View style={{ flex: 1, flexShrink: 1 }}>
                  <Text style={styles.menuOptionText}>
                    {t("menu_configure_habits", userLang)}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#60646C", fontFamily: "Montserrat_400Regular", marginTop: 2 }}>
                    {t("menu_configure_habits_sub", userLang)}
                  </Text>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("journey_stats_title", userLang)}</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <FontAwesome5 name="fire" size={24} color="#EAB64A" />
                <Text style={styles.statValue}>{userData?.streak || 0}</Text>
                <Text style={styles.statLabel}>{t("consecutive_days_label", userLang)}</Text>
              </View>
              <View style={styles.statBox}>
                <FontAwesome5 name="infinity" size={24} color="#EAB64A" />
                <Text style={styles.statValue}>{userData?.totalPE || userData?.pointsPE || 0}</Text>
                <Text style={styles.statLabel}>Bonds</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("personal_data_autosave_title", userLang)}</Text>
            <View style={styles.formCard}>
              <View style={styles.rowFields}>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>{t("first_name_label", userLang)}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t("first_name_placeholder", userLang)}
                    placeholderTextColor="#AFAFAF"
                    value={firstName}
                    onChangeText={setFirstName}
                    onBlur={() => {
                      const clean = firstName.trim();
                      handleAutoSave({
                        billingFirstName: clean,
                        firstName: clean,
                        displayName: `${clean} ${lastName.trim()}`.trim(),
                      });
                    }}
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>{t("last_name_label", userLang)}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t("last_name_placeholder", userLang)}
                    placeholderTextColor="#AFAFAF"
                    value={lastName}
                    onChangeText={setLastName}
                    onBlur={() => {
                      const clean = lastName.trim();
                      handleAutoSave({
                        billingLastName: clean,
                        lastName: clean,
                        displayName: `${firstName.trim()} ${clean}`.trim(),
                      });
                    }}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("phone_label", userLang)}</Text>
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("sub_legal_title", userLang)}</Text>

            <TouchableOpacity style={styles.menuOption} onPress={handleManageSubscription}>
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}>
                  <FontAwesome5 name="credit-card" size={16} color="#EAB64A" />
                </View>
                <Text style={styles.menuOptionText}>{t("menu_manage_sub", userLang)}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption} onPress={handleRestorePurchases}>
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#E8F4F1" }]}>
                  <FontAwesome5 name="sync-alt" size={16} color="#67D4A8" />
                </View>
                <Text style={styles.menuOptionText}>{t("btn_restore_purchases", userLang)}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                const legalLang = getLegalUrlLangParam(userLang);
                openUrl(`https://duoelo.lu/termos?lang=${legalLang}`);
              }}
            >
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}>
                  <FontAwesome5 name="file-contract" size={16} color="#202D3A" />
                </View>
                <Text style={styles.menuOptionText}>{t("terms_of_use_eula", userLang)}</Text>
              </View>
              <FontAwesome5 name="external-link-alt" size={12} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                const legalLang = getLegalUrlLangParam(userLang);
                openUrl(`https://duoelo.lu/privacidade?lang=${legalLang}`);
              }}
            >
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}>
                  <FontAwesome5 name="user-shield" size={16} color="#202D3A" />
                </View>
                <Text style={styles.menuOptionText}>{t("privacy_policy_link", userLang)}</Text>
              </View>
              <FontAwesome5 name="external-link-alt" size={12} color="#D1D9E0" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("account_settings_title", userLang)}</Text>

            <TouchableOpacity style={styles.menuOption} onPress={() => setIsLangModalVisible(true)}>
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}>
                  <Text style={{ fontSize: 18 }}>{currentFlag}</Text>
                </View>
                <View style={{ flex: 1, flexShrink: 1 }}>
                  <Text style={styles.menuOptionText}>{t("app_language_title", userLang)}</Text>
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
                <View style={{ flex: 1, flexShrink: 1, paddingRight: 8 }}>
                  <Text style={styles.menuOptionText}>
                    {t("haptics_label", userLang)}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#60646C", marginTop: 2, fontFamily: "Montserrat_400Regular" }}>
                    {t("haptics_subtitle", userLang)}
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
                  <FontAwesome5 name="volume-up" size={16} color="#EAB64A" />
                </View>
                <View style={{ flex: 1, flexShrink: 1, paddingRight: 8 }}>
                  <Text style={styles.menuOptionText}>
                    {t("sfx_title", userLang)}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#60646C", marginTop: 2, fontFamily: "Montserrat_400Regular" }}>
                    {t("sfx_subtitle", userLang)}
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: "#D1D9E0", true: "#67D4A8" }}
                thumbColor={"#FFF"}
                ios_backgroundColor="#D1D9E0"
                onValueChange={toggleEnableSfx}
                value={enableSfx}
              />
            </View>

            <View style={[styles.menuOption, { paddingVertical: 12 }]}>
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}>
                  <FontAwesome5 name="unlock-alt" size={16} color="#EAB64A" />
                </View>
                <View style={{ flex: 1, flexShrink: 1, paddingRight: 8 }}>
                  <Text style={styles.menuOptionText}>{t("bypass_lock_label", userLang)}</Text>
                  <Text style={{ fontSize: 11, color: "#60646C", marginTop: 2, fontFamily: "Montserrat_400Regular" }}>
                    {t("bypass_lock_desc", userLang)}
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

            <TouchableOpacity style={styles.menuOption} onPress={handleOpenSettings}>
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}>
                  <FontAwesome5 name="bell" size={16} color="#202D3A" />
                </View>
                <Text style={styles.menuOptionText}>{t("adjust_notifications_menu", userLang)}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption} onPress={handleSupport}>
              <View style={styles.menuOptionLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}>
                  <FontAwesome5 name="headset" size={16} color="#202D3A" />
                </View>
                <Text style={styles.menuOptionText}>{t("contact_support_menu", userLang)}</Text>
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
                <Text style={styles.menuOptionText}>{t("logout_menu_option", userLang)}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.deleteAccountLink} onPress={handleDeleteAccount}>
            <Text style={styles.deleteAccountText}>
              {t("delete_account_permanently_btn", userLang)}
            </Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>
            {`DuoElo v${appVersion} (Build ${buildNumber})`}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={isCountryModalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setIsCountryModalVisible(false)}
        >
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>
              {t("select_country_title", userLang)}
            </Text>

            <View style={styles.searchBox}>
              <FontAwesome5 name="search" size={14} color="#AFAFAF" />
              <TextInput
                style={styles.searchInput}
                placeholder={t("placeholder_search_country", userLang)}
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

      <Modal visible={isLangModalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setIsLangModalVisible(false)}
        >
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>
              {t("choose_language_title", userLang)}
            </Text>

            <ScrollView style={{ width: "100%", maxHeight: 300 }}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langOptionItem,
                    userLang === lang.code && styles.langOptionItemActive,
                  ]}
                  onPress={() => handleSelectLanguage(lang.code)}
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

      <CustomAlertModal
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        icon={customAlert.icon}
        color={customAlert.color}
        confirmText={customAlert.confirmText}
        onConfirm={customAlert.onConfirm}
        secondaryText={customAlert.secondaryText}
        onSecondary={customAlert.onSecondary}
        onClose={() => setCustomAlert((prev) => ({ ...prev, visible: false }))}
      />
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