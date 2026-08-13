import { FontAwesome5 } from "@expo/vector-icons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { deleteUser, sendEmailVerification, signOut } from "firebase/auth";
import { deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Image,
  KeyboardAvoidingView,
  Linking,
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
  const isFirstLoad = useRef(true);

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
        "E-mail Enviado! ✉️",
        "Um link de confirmação foi enviado para a sua caixa de entrada. Clique no link para verificar a sua conta.",
      );
    } catch (error: any) {
      if (error.code === "auth/too-many-requests") {
        Alert.alert(
          "Aguarde",
          "Já enviamos um e-mail recentemente. Verifique sua caixa de spam ou aguarde alguns minutos.",
        );
      } else {
        Alert.alert(
          "Erro",
          "Não foi possível enviar o e-mail de verificação no momento.",
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
          "Foto muito grande",
          "Por favor, escolha uma imagem com menor resolução.",
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
          Alert.alert("Erro", "Não foi possível atualizar a foto.");
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handlePickImage = () => {
    Alert.alert(
      "Foto de Perfil",
      "De onde você quer pegar a imagem?",
      [
        {
          text: "Tirar Foto (Câmera)",
          onPress: async () => {
            const permissionResult =
              await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert(
                "Permissão",
                "Você precisa permitir o acesso à câmera para tirar fotos.",
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
          text: "Escolher da Galeria",
          onPress: async () => {
            const permissionResult =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert(
                "Permissão",
                "Você precisa permitir o acesso à galeria para alterar a foto.",
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
        { text: "Cancelar", style: "cancel" },
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

  // 🌐 DESCONECTAR / LIMPAR SESSÃO DO GOOGLE
  const handleSwitchGoogleAccount = () => {
    Alert.alert(
      "Trocar Conta Google",
      "Deseja desconectar a conta do Google atual para poder escolher outro e-mail no próximo login?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sim, Desconectar Google",
          onPress: async () => {
            try {
              await GoogleSignin.signOut();
              await signOut(auth);
              Alert.alert(
                "Conta Desconectada 🌐",
                "Sua sessão do Google foi encerrada. No próximo acesso você poderá escolher outra conta.",
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
    Alert.alert("Sair da Conta", "Tem certeza de que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          try {
            try {
              await GoogleSignin.signOut();
            } catch (e) {}
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
      "Excluir Conta Permanentemente",
      "⚠️ Atenção: Esta ação é irreversível. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sim, Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const user = auth.currentUser;
              if (user) {
                if (userData?.partnerId) {
                  await setDoc(
                    doc(db, "users", userData.partnerId),
                    { partnerId: null },
                    { merge: true },
                  );
                }
                await deleteDoc(doc(db, "users", user.uid));
                try {
                  await GoogleSignin.signOut();
                } catch (e) {}
                await deleteUser(user);
              }
            } catch (error: any) {
              setLoading(false);
              if (error.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Segurança",
                  "Para excluir sua conta, faça login novamente para confirmar sua identidade.",
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
          "Sucesso! 🎉",
          "Suas assinaturas anteriores foram restauradas.",
        );
      } else {
        Alert.alert(
          "Nenhuma Assinatura Ativa",
          "Não encontramos nenhuma assinatura ativa nesta conta de loja.",
        );
      }
    } catch (e) {
      Alert.alert(
        "Erro ao Restaurar",
        "Não foi possível restaurar suas compras. Tente novamente.",
      );
    }
  };

  const handleSupport = () => {
    Linking.openURL("mailto:suporte@duoelo.com?subject=Suporte%20DuoElo%20App");
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert("Erro", "Não foi possível abrir a página."),
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
    nameStr ? nameStr.split(" ")[0] : null;

  const myPhoto = isValidPhoto(userData?.photoURL)
    ? userData.photoURL
    : isValidPhoto(userData?.photoUrl)
      ? userData.photoUrl
      : null;

  const isPremium = userData?.isPremium || false;
  const displayUsername = userData?.username
    ? `@${userData.username}`
    : getFirstName(userData?.displayName) ||
      getFirstName(userData?.billingFirstName) ||
      "Usuário";

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
          <Text style={styles.headerTitle}>Meu Perfil</Text>
          <View style={{ width: 40 }} />

          <Animated.View style={[styles.autoSaveToast, { opacity: saveAnim }]}>
            <FontAwesome5
              name={saveStatus === "saving" ? "sync" : "check"}
              size={12}
              color="#FFF"
            />
            <Text style={styles.autoSaveText}>
              {saveStatus === "saving" ? "Salvando..." : "Salvo ✓"}
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
                  key={myPhoto.substring(0, 100)}
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
                    Enviar link de verificação
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {isPremium ? (
              <View style={[styles.premiumBadge, { marginTop: 15 }]}>
                <FontAwesome5 name="crown" size={12} color="#202D3A" />
                <Text style={styles.premiumText}>DuoElo Premium</Text>
              </View>
            ) : (
              <View
                style={[
                  styles.premiumBadge,
                  { backgroundColor: "#D1D9E0", marginTop: 15 },
                ]}
              >
                <Text style={[styles.premiumText, { color: "#60646C" }]}>
                  Plano Gratuito
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estatísticas da Jornada</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <FontAwesome5 name="fire" size={24} color="#EAB64A" />
                <Text style={styles.statValue}>{userData?.streak || 0}</Text>
                <Text style={styles.statLabel}>Dias Seguidos</Text>
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
              Dados Pessoais (Salvo Automaticamente)
            </Text>
            <View style={styles.formCard}>
              <View style={styles.rowFields}>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>Nome</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: João"
                    placeholderTextColor="#AFAFAF"
                    value={firstName}
                    onChangeText={setFirstName}
                    onBlur={() => handleAutoSave("billingFirstName", firstName)}
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>Sobrenome</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Silva"
                    placeholderTextColor="#AFAFAF"
                    value={lastName}
                    onChangeText={setLastName}
                    onBlur={() => handleAutoSave("billingLastName", lastName)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Endereço Completo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Rua, Número, Bairro..."
                  placeholderTextColor="#AFAFAF"
                  value={address}
                  onChangeText={setAddress}
                  onBlur={() => handleAutoSave("billingAddress", address)}
                />
              </View>

              <View style={styles.rowFields}>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>CEP / Zip Code</Text>
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
                  <Text style={styles.inputLabel}>Telefone</Text>
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
            <Text style={styles.sectionTitle}>Assinatura & Jurídico</Text>

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
                <Text style={styles.menuOptionText}>Gerenciar Assinatura</Text>
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
                <Text style={styles.menuOptionText}>Restaurar Compras</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => openUrl("https://duoelo.com/termos")}
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
                <Text style={styles.menuOptionText}>Termos de Uso</Text>
              </View>
              <FontAwesome5
                name="external-link-alt"
                size={12}
                color="#D1D9E0"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => openUrl("https://duoelo.com/privacidade")}
            >
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5 name="user-shield" size={16} color="#202D3A" />
                </View>
                <Text style={styles.menuOptionText}>
                  Política de Privacidade
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
            <Text style={styles.sectionTitle}>Configurações da Conta</Text>

            <View style={[styles.menuOption, { paddingVertical: 12 }]}>
              <View style={styles.menuOptionLeft}>
                <View
                  style={[styles.menuIconBg, { backgroundColor: "#F0F4F8" }]}
                >
                  <FontAwesome5 name="unlock-alt" size={16} color="#EAB64A" />
                </View>
                <View>
                  <Text style={styles.menuOptionText}>
                    Ignorar Trava Diária
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#60646C",
                      marginTop: 2,
                      fontFamily: "Montserrat_400Regular",
                    }}
                  >
                    Permite fazer várias tarefas no mesmo dia
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

            {/* BOTÃO PARA TROCAR OU DESCONECTAR DA CONTA GOOGLE */}
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
                    Trocar Conta do Google
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#60646C",
                      marginTop: 2,
                      fontFamily: "Montserrat_400Regular",
                    }}
                  >
                    Força a seleção de e-mail no próximo login
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
                <Text style={styles.menuOptionText}>Ajustar Notificações</Text>
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
                <Text style={styles.menuOptionText}>Fale com o Suporte</Text>
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
                <Text style={styles.menuOptionText}>Sair da Conta</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#D1D9E0" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.deleteAccountLink}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteAccountText}>
              Excluir minha conta permanentemente
            </Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>DuoElo v1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
});
