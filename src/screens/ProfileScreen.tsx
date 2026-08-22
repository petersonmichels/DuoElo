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

export default function ProfileScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const saveAnim = useRef(new Animated.Value(0)).current;

  const [bypassDailyLock, setBypassDailyLock] = useState(false);
  const [enableHaptics, setEnableHaptics] = useState(true);
  const isFirstLoad = useRef(true);

  // 🌐 Estado e Modal de Idioma
  const [userLang, setUserLang] = useState("pt-BR");
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);

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
    }, []),
  );

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    const appStateSubscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (nextAppState === "active" && auth.currentUser) {
          await auth.currentUser.reload();
          setIsEmailVerified(auth.currentUser.emailVerified || false);
        }
      },
    );

    const userRef = doc(db, "users", currentUid);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        setBypassDailyLock(data.bypassDailyLock || false);
        setEnableHaptics(data.enableHaptics !== false);
        if (data.language) setUserLang(data.language);

        if (isFirstLoad.current) {
          setFirstName(data.billingFirstName || "");
          setLastName(data.billingLastName || "");
          setAddress(data.billingAddress || "");
          setZipCode(data.billingZipCode || "");
          setPhone(data.billingPhone || "");
          isFirstLoad.current = false;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeUser();
      appStateSubscription.remove();
    };
  }, []);

  const triggerSaveAnimation = (toValue: number, callback?: () => void) => {
    Animated.timing(saveAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start(callback);
  };

  const handleAutoSave = async (field: string, value: string) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid || userData?.[field] === value) return;

    setSaveStatus("saving");
    triggerSaveAnimation(1);

    try {
      await setDoc(
        doc(db, "users", currentUid),
        { [field]: value },
        { merge: true },
      );
      setSaveStatus("saved");
      setTimeout(
        () => triggerSaveAnimation(0, () => setSaveStatus("idle")),
        2000,
      );
    } catch (e) {
      setSaveStatus("idle");
      triggerSaveAnimation(0);
    }
  };

  const handleVerifyEmail = async () => {
    if (!auth.currentUser) return;
    setIsSendingEmail(true);
    try {
      await sendEmailVerification(auth.currentUser);
      Alert.alert(
        t("verify_email_sent_title", userLang),
        t("verify_email_sent_msg", userLang),
      );
    } catch (error: any) {
      if (error.code === "auth/too-many-requests") {
        Alert.alert(
          t("wait_title", userLang),
          t("verify_email_too_many_msg", userLang),
        );
      } else {
        Alert.alert(
          t("error_title", userLang),
          t("verify_email_error_msg", userLang),
        );
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePhoneChange = (text: string) => {
    let cleaned = text.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length > 0) {
      if (cleaned.length <= 2) formatted = `+${cleaned}`;
      else if (cleaned.length <= 4)
        formatted = `+${cleaned.slice(0, 2)} (${cleaned.slice(2)}`;
      else if (cleaned.length <= 9)
        formatted = `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4)}`;
      else
        formatted = `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9, 13)}`;
    }
    setPhone(formatted);
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
          t("photo_too_large_title", userLang),
          t("photo_too_large_msg", userLang),
        );
        return;
      }

      if (currentUid) {
        setLoading(true);
        try {
          await setDoc(
            doc(db, "users", currentUid),
            { photoURL: imageUri, photoUrl: imageUri },
            { merge: true },
          );
        } catch (e) {
          Alert.alert(
            t("error_title", userLang),
            t("update_photo_error_msg", userLang),
          );
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handlePickImage = () => {
    Alert.alert(
      t("profile_photo_prompt_title", userLang),
      t("profile_photo_prompt_msg", userLang),
      [
        {
          text: t("btn_take_photo", userLang),
          onPress: async () => {
            const permissionResult =
              await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert(
                t("permission_title", userLang),
                t("camera_permission_msg", userLang),
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
          text: t("btn_choose_gallery", userLang),
          onPress: async () => {
            const permissionResult =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert(
                t("permission_title", userLang),
                t("gallery_permission_msg", userLang),
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
        { text: t("modal_cancel", userLang), style: "cancel" },
      ],
      { cancelable: true },
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
        { merge: true },
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
        { merge: true },
      );
    } catch (e) {
      setEnableHaptics(!value);
    }
  };

  const handleSwitchGoogleAccount = () => {
    Alert.alert(
      t("switch_google_account_title", userLang),
      t("switch_google_account_msg", userLang),
      [
        { text: t("modal_cancel", userLang), style: "cancel" },
        {
          text: t("btn_disconnect_google", userLang),
          onPress: async () => {
            try {
              if (GoogleSignin && typeof GoogleSignin.signOut === "function") {
                await GoogleSignin.signOut();
              }
              await signOut(auth);
              Alert.alert(
                t("account_disconnected_title", userLang),
                t("account_disconnected_msg", userLang),
              );
            } catch (e) {
              await signOut(auth);
            }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert(t("logout_title", userLang), t("logout_msg", userLang), [
      { text: t("modal_cancel", userLang), style: "cancel" },
      {
        text: t("btn_logout", userLang),
        style: "destructive",
        onPress: async () => {
          try {
            if (GoogleSignin && typeof GoogleSignin.signOut === "function") {
              try {
                await GoogleSignin.signOut();
              } catch (e) {}
            }
            await signOut(auth);
          } catch (error) {
            console.error("Erro ao deslogar:", error);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t("delete_account_title", userLang),
      t("delete_account_warning_msg", userLang),
      [
        { text: t("modal_cancel", userLang), style: "cancel" },
        {
          text: t("btn_yes_delete", userLang),
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const user = auth.currentUser;
              if (user) {
                if (userData?.partnerId) {
                  await setDoc(
                    doc(db, "users", userData.partnerId),
                    { partnerId: null, isSoloMode: false },
                    { merge: true },
                  );
                }

                const journalsSnap = await getDocs(
                  collection(db, "users", user.uid, "journals"),
                );
                const deletePromises = journalsSnap.docs.map((d) =>
                  deleteDoc(d.ref),
                );
                await Promise.all(deletePromises);

                await deleteDoc(doc(db, "users", user.uid));

                if (
                  GoogleSignin &&
                  typeof GoogleSignin.signOut === "function"
                ) {
                  try {
                    await GoogleSignin.signOut();
                  } catch (e) {}
                }

                await deleteUser(user);
              }
            } catch (error: any) {
              setLoading(false);
              if (error.code === "auth/requires-recent-login") {
                Alert.alert(
                  t("security_title", userLang),
                  t("reauth_required_delete_msg", userLang),
                );
              } else {
                Alert.alert(
                  t("delete_error_title", userLang),
                  t("delete_error_msg", userLang),
                );
              }
            }
          },
        },
      ],
    );
  };

  const handleManageSubscription = () => {
    if (Platform.OS === "ios")
      Linking.openURL("https://apps.apple.com/account/subscriptions");
    else Linking.openURL("https://play.google.com/store/account/subscriptions");
  };

  const handleRestorePurchases = async () => {
    try {
      const restoredInfo = await Purchases.restorePurchases();
      if (Object.keys(restoredInfo.entitlements.active).length > 0) {
        Alert.alert(
          t("sub_restored_title", userLang),
          t("sub_restored_msg", userLang),
        );
      } else {
        Alert.alert(
          t("no_active_sub_title", userLang),
          t("no_active_sub_msg", userLang),
        );
      }
    } catch (e) {
      Alert.alert(
        t("error_title", userLang),
        t("restore_purchases_error_msg", userLang),
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
        t("error_title", userLang),
        t("cannot_open_page_msg", userLang),
      ),
    );
  };

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

  const getFirstName = (nameStr?: string) =>
    nameStr ? nameStr.trim().split(" ")[0] : null;

  const rawPhoto = userData?.photoURL || userData?.photoUrl;
  const myPhoto: string | null = isValidPhoto(rawPhoto)
    ? String(rawPhoto)
    : null;
  const avatarKey: string = myPhoto
    ? myPhoto.substring(0, 50)
    : "default-avatar";

  const isPremium = userData?.isPremium || false;

  const displayUsername = userData?.username
    ? `@${userData.username}`
    : firstName.trim()
      ? firstName.trim()
      : getFirstName(userData?.billingFirstName) ||
        getFirstName(userData?.displayName) ||
        getFirstName(auth.currentUser?.displayName) ||
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
          <Text style={styles.headerTitle}>
            {t("my_profile_title", userLang)}
          </Text>
          <View style={{ width: 40 }} />

          <Animated.View style={[styles.autoSaveToast, { opacity: saveAnim }]}>
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
                  <FontAwesome5
                    name="check-circle"
                    solid
                    size={14}
                    color="#67D4A8"
                  />
                </View>
              ) : (
                <View style={styles.unverifiedBadge}>
                  <FontAwesome5
                    name="exclamation-circle"
                    solid
                    size={14}
                    color="#EAB64A"
                  />
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

            {isPremium ? (
              <View style={[styles.premiumBadge, { marginTop: 15 }]}>
                <FontAwesome5 name="crown" size={12} color="#202D3A" />
                <Text style={styles.premiumText}>
                  {t("premium_status_label", userLang)}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.premiumBadge,
                  { backgroundColor: "#D1D9E0", marginTop: 15 },
                ]}
              >
                <Text style={[styles.premiumText, { color: "#60646C" }]}>
                  {t("free_status_label", userLang)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("journey_stats_title", userLang)}
            </Text>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <FontAwesome5 name="fire" size={24} color="#EAB64A" />
                <Text style={styles.statValue}>{userData?.streak || 0}</Text>
                <Text style={styles.statLabel}>
                  {t("consecutive_days_label", userLang)}
                </Text>
              </View>
              <View style={styles.statBox}>
                <FontAwesome5 name="infinity" size={24} color="#EAB64A" />
                <Text style={styles.statValue}>{userData?.totalPE || 0}</Text>
                <Text style={styles.statLabel}>Bonds</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("personal_data_autosave_title", userLang)}
            </Text>
            <View style={styles.formCard}>
              <View style={styles.rowFields}>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>
                    {t("first_name_label", userLang)}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t("first_name_placeholder", userLang)}
                    placeholderTextColor="#AFAFAF"
                    value={firstName}
                    onChangeText={setFirstName}
                    onBlur={() => handleAutoSave("billingFirstName", firstName)}
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>
                    {t("last_name_label", userLang)}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t("last_name_placeholder", userLang)}
                    placeholderTextColor="#AFAFAF"
                    value={lastName}
                    onChangeText={setLastName}
                    onBlur={() => handleAutoSave("billingLastName", lastName)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("full_address_label", userLang)}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("full_address_placeholder", userLang)}
                  placeholderTextColor="#AFAFAF"
                  value={address}
                  onChangeText={setAddress}
                  onBlur={() => handleAutoSave("billingAddress", address)}
                />
              </View>

              <View style={styles.rowFields}>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>
                    {t("zip_code_label", userLang)}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="00000-000"
                    placeholderTextColor="#AFAFAF"
                    keyboardType="number-pad"
                    value={zipCode}
                    onChangeText={handleZipChange}
                    onBlur={() => handleAutoSave("billingZipCode", zipCode)}
                    maxLength={9}
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>
                    {t("phone_label", userLang)}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+55 (11) 99999-9999"
                    placeholderTextColor="#AFAFAF"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    onBlur={() => handleAutoSave("billingPhone", phone)}
                    maxLength={19}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("sub_legal_title", userLang)}
            </Text>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleManageSubscription}
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5 name="credit-card" size={16} color="#EAB64A" />
                </View>
                <Text style={styles.menuOptionText}>
                  {t("menu_manage_sub", userLang)}
                </Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleRestorePurchases}
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#E8F4F1" }]}
                >
                  <FontAwesome5 name="sync-alt" size={16} color="#67D4A8" />
                </View>
                <Text style={styles.menuOptionText}>
                  {t("btn_restore_purchases", userLang)}
                </Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() =>
                openUrl(`https://duoelo.lu/termos?lang=${userLang}`)
              }
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5
                    name="file-contract"
                    size={16}
                    color="#202D3A"
                  />
                </View>
                <Text style={styles.menuOptionText}>
                  {t("terms_of_use_eula", userLang)}
                </Text>
              </View>
              <FontAwesome5
                name="external-link-alt"
                size={12}
                color="#D1D9E0"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() =>
                openUrl(`https://duoelo.lu/privacidade?lang=${userLang}`)
              }
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5 name="user-shield" size={16} color="#202D3A" />
                </View>
                <Text style={styles.menuOptionText}>
                  {t("privacy_policy_link", userLang)}
                </Text>
              </View>
              <FontAwesome5
                name="external-link-alt"
                size={12}
                color="#D1D9E0"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("account_settings_title", userLang)}
            </Text>

            {/* 🌐 SELETOR DE IDIOMA */}
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => setIsLangModalVisible(true)}
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <Text style={{ fontSize: 18 }}>{currentFlag}</Text>
                </View>
                <View>
                  <Text style={styles.menuOptionText}>Idioma do App</Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#60646C",
                      marginTop: 2,
                      fontFamily: "Montserrat_400Regular",
                    }}
                  >
                    {
                      SUPPORTED_LANGUAGES.find((l) => l.code === userLang)
                        ?.label
                    }
                  </Text>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            {/* 📳 ALTERNADOR DE HAPTICS / RESPOSTA TÁTIL */}
            <View style={[styles.menuOption, { paddingVertical: 12 }]}>
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5 name="mobile-alt" size={16} color="#67D4A8" />
                </View>
                <View>
                  <Text style={styles.menuOptionText}>
                    Efeitos Táteis (Haptics)
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#60646C",
                      marginTop: 2,
                      fontFamily: "Montserrat_400Regular",
                    }}
                  >
                    Vibrações ao concluir tarefas e interagir
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
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5 name="unlock-alt" size={16} color="#EAB64A" />
                </View>
                <View>
                  <Text style={styles.menuOptionText}>
                    {t("bypass_lock_label", userLang)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#60646C",
                      marginTop: 2,
                      fontFamily: "Montserrat_400Regular",
                    }}
                  >
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

            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleSwitchGoogleAccount}
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#FDE8E8" }]}
                >
                  <FontAwesome5 name="google" size={16} color="#EA4335" />
                </View>

                <View>
                  <Text style={styles.menuOptionText}>
                    {t("switch_google_account_menu", userLang)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#60646C",
                      marginTop: 2,
                      fontFamily: "Montserrat_400Regular",
                    }}
                  >
                    {t("switch_google_account_desc", userLang)}
                  </Text>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleOpenSettings}
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5 name="bell" size={16} color="#202D3A" />
                </View>
                <Text style={styles.menuOptionText}>
                  {t("adjust_notifications_menu", userLang)}
                </Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption} onPress={handleSupport}>
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5 name="headset" size={16} color="#202D3A" />
                </View>
                <Text style={styles.menuOptionText}>
                  {t("contact_support_menu", userLang)}
                </Text>
              </View>
              <FontAwesome5 name="envelope" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOption, { borderBottomWidth: 0 }]}
              onPress={handleLogout}
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5 name="sign-out-alt" size={16} color="#60646C" />
                </View>
                <Text style={styles.menuOptionText}>
                  {t("logout_menu_option", userLang)}
                </Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.deleteAccountLink}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteAccountText}>
              {t("delete_account_permanently_btn", userLang)}
            </Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>DuoElo v1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL SELETOR DE IDIOMAS */}
      <Modal visible={isLangModalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setIsLangModalVisible(false)}
        >
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>Escolha seu Idioma</Text>

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
                        { merge: true },
                      );
                    }
                  }}
                >
                  <Text style={{ fontSize: 24, marginRight: 12 }}>
                    {lang.flag}
                  </Text>
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
  rowFields: { flexDirection: "row", gap: 12 },
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
    padding: 14,
    fontSize: 15,
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
  menuOptionLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuOptionText: {
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
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
    marginBottom: 20,
    textAlign: "center",
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
