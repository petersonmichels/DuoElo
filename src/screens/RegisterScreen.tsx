import { FontAwesome5 } from "@expo/vector-icons";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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

import { COUNTRY_CODES, CountryData } from "../constants/countries";
import { t } from "../i18n/translations";
import { logAuditEvent } from "../services/auditService";
import { isStrongPassword } from "../services/securityService";

export default function RegisterScreen({ navigation }: any) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // 📱 Estados de DDI e Telefone Internacional
  const [selectedCountry, setSelectedCountry] = useState<CountryData>(COUNTRY_CODES[0]);
  const [localPhone, setLocalPhone] = useState("");
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [searchCountry, setSearchCountry] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  // Idioma do usuário (padrão pt-BR)
  const [userLang, setUserLang] = useState("pt-BR");

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (currentUid) {
      const fetchLang = async () => {
        try {
          const userSnap = await getDocs(
            query(collection(db, "users"), where("uid", "==", currentUid))
          );
          if (!userSnap.empty) {
            const data = userSnap.docs[0].data();
            if (data.language) setUserLang(data.language);
          }
        } catch (e) {}
      };
      fetchLang();
    }
  }, []);

  // 📞 Formatador de Telefone Internacional conforme o DDI
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

  // ESTADO DE ALERTAS PERSONALIZADOS
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "info-circle",
    color: "#202D3A",
    confirmText: t("btn_understand", userLang) || "Entendi",
    onConfirm: null as (() => void) | null,
  });

  const showCustomAlert = (
    title: string,
    message: string,
    icon = "info-circle",
    color = "#202D3A",
    confirmText = t("btn_understand", userLang) || "Entendi",
    onConfirm: (() => void) | null = null
  ) => {
    setCustomAlert({
      visible: true,
      title,
      message,
      icon,
      color,
      confirmText,
      onConfirm,
    });
  };

  const handleRegister = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    const fullPhone = localPhone ? `${selectedCountry.ddi} ${localPhone}`.trim() : "";

    if (!cleanEmail || !password || !cleanUsername) {
      showCustomAlert(
        t("attention_title", userLang) || "Atenção",
        t("fill_required_fields_msg", userLang) || "Preencha todos os campos obrigatórios.",
        "exclamation-triangle",
        "#EAB64A"
      );
      return;
    }

    if (cleanUsername.length < 3) {
      showCustomAlert(
        t("short_username_title", userLang) || "Usuário Curto",
        t("short_username_msg", userLang) || "O nome de usuário deve conter pelo menos 3 caracteres.",
        "user",
        "#EAB64A"
      );
      return;
    }

    // Validação de senha forte
    const passwordCheck = isStrongPassword(password, userLang);
    if (!passwordCheck.isValid) {
      showCustomAlert(
        t("security_req_title", userLang) || "Exigência de Segurança",
        passwordCheck.message || t("weak_password_fallback", userLang) || "Escolha uma senha com letras e números.",
        "shield-alt",
        "#EAB64A"
      );
      return;
    }

    setIsLoading(true);

    try {
      // 1. Validação defensiva do username no Firestore
      try {
        const usernameQuery = query(
          collection(db, "users"),
          where("username", "==", cleanUsername)
        );
        const usernameSnap = await getDocs(usernameQuery);

        if (!usernameSnap.empty) {
          setIsLoading(false);
          showCustomAlert(
            t("username_unavailable_title", userLang) || "Nome de Usuário Indisponível",
            t("username_unavailable_msg", userLang) || "Este nome de usuário já está em uso. Escolha outro.",
            "user-times",
            "#EAB64A"
          );
          return;
        }
      } catch (firestoreCheckErr) {
        console.warn("[RegisterScreen] Ignorada verificação prévia de username por regras de leitura pública:", firestoreCheckErr);
      }

      // 2. Trava a transição automática do AppNavigator durante a criação
      if (authControls) authControls.isCreatingAccount = true;

      // 3. Cria o usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );
      const uid = userCredential.user.uid;

      // 4. Cria o documento oficial no Firestore (Com inicialização explícita do plano)
      const myGeneratedCode = uid.substring(0, 6).toUpperCase();
      const userDataToSave: any = {
        uid: uid,
        email: cleanEmail,
        username: cleanUsername,
        displayName: cleanUsername,
        billingFirstName: cleanUsername,
        billingLastName: "",
        billingPhone: fullPhone,
        phone: fullPhone,
        phoneNumber: fullPhone,
        countryCode: selectedCountry.code,
        language: userLang,
        myInviteCode: myGeneratedCode,
        createdAt: new Date().toISOString(),
        isPremium: false,
        planType: "free",
        hasCompletedAnamnesis: false,
        totalPE: 0,
        streak: 0,
        currentPhase: 1,
        currentTaskStep: 0,
        partnerId: null,
      };

      await setDoc(doc(db, "users", uid), userDataToSave, { merge: true });

      // 📜 REGISTRO DE AUDITORIA DE SEGURANÇA (ACEITE DE EULA/PRIVACIDADE)
      try {
        await logAuditEvent(
          uid,
          "EULA_ACCEPTED",
          "Conta criada diretamente via RegisterScreen com aceite do EULA",
          userLang
        );
      } catch (auditErr) {
        console.warn("[RegisterScreen] Falha silenciosa no log de auditoria:", auditErr);
      }

      // 5. Envia e-mail de verificação oficial do Firebase
      try {
        await sendEmailVerification(userCredential.user);
      } catch (emailErr) {
        console.log("[RegisterScreen] Não foi possível enviar e-mail de verificação:", emailErr);
      }

      // 6. Desloga para exigir verificação ou novo acesso limpo
      await signOut(auth);

      showCustomAlert(
        t("account_created_success_title", userLang) || "Conta Criada!",
        t("account_created_verify_email_msg", userLang) || "Sua conta foi criada. Enviamos um e-mail de verificação para você.",
        "check-circle",
        "#67D4A8",
        t("btn_go_to_login", userLang) || "Ir para o Login",
        () => navigation.goBack()
      );
    } catch (error: any) {
      let errorMessage = t("register_error_default_msg", userLang) || "Não foi possível concluir o cadastro.";

      if (error?.code === "auth/email-already-in-use") {
        errorMessage = t("email_already_in_use_msg", userLang) || "Este e-mail já está em uso por outra conta.";
      } else if (error?.code === "auth/weak-password") {
        errorMessage = t("short_password_msg", userLang) || "A senha informada é muito fraca.";
      } else if (error?.code === "auth/invalid-email") {
        errorMessage = t("invalid_email_msg", userLang) || "O e-mail informado não é válido.";
      }

      showCustomAlert(
        t("signup_error_title", userLang) || "Erro no Cadastro",
        errorMessage,
        "times-circle",
        "#D96C6C"
      );
    } finally {
      if (authControls) authControls.isCreatingAccount = false;
      setIsLoading(false);
    }
  };

  const filteredCountries = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchCountry.toLowerCase()) ||
      c.ddi.includes(searchCountry) ||
      c.code.toLowerCase().includes(searchCountry.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <FontAwesome5 name="seedling" size={36} color="#EAB64A" />
            </View>
            <Text style={styles.title}>
              {t("create_account_title", userLang) || "Criar sua Conta"}
            </Text>
            <Text style={styles.subtitle}>
              {t("create_account_sub", userLang) || "Inicie a transformação do seu relacionamento no DuoElo."}
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <FontAwesome5
                name="at"
                size={16}
                color="#60646C"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder={t("placeholder_username", userLang) || "Nome de usuário (@unico)"}
                placeholderTextColor="#AFAFAF"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <FontAwesome5
                name="envelope"
                size={16}
                color="#60646C"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder={t("placeholder_email", userLang) || "Seu e-mail"}
                placeholderTextColor="#AFAFAF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>

            {/* 📱 CAMPO DE TELEFONE COM SELETOR DE DDI DE 175 PAÍSES */}
            <View style={styles.phoneContainer}>
              <TouchableOpacity
                style={styles.countryPickerBtn}
                onPress={() => setIsCountryModalVisible(true)}
                disabled={isLoading}
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
                maxLength={selectedCountry.code === "BR" ? 15 : 16}
                editable={!isLoading}
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
                placeholder={t("placeholder_password_register", userLang) || "Sua senha segura"}
                placeholderTextColor="#AFAFAF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            <View style={styles.actionWrapper}>
              <TouchableOpacity
                style={[
                  styles.buttonMain,
                  isLoading && { backgroundColor: "#D1D9E0", shadowOpacity: 0 },
                ]}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#202D3A" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      {t("btn_register_submit", userLang) || "Cadastrar"}
                    </Text>
                    <FontAwesome5
                      name="arrow-right"
                      size={16}
                      color="#202D3A"
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                {t("already_part_of_duoelo_msg", userLang) || "Já possui uma conta?"}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                disabled={isLoading}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Text style={styles.toggleLink}>
                  {t("do_login_link", userLang) || "Faça Login"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 🌐 MODAL DE SELEÇÃO DE PAÍS / DDI */}
      <Modal visible={isCountryModalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setIsCountryModalVisible(false)}
        >
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>
              {t("select_country_title", userLang) || "Selecione o País"}
            </Text>

            <View style={styles.searchBox}>
              <FontAwesome5 name="search" size={14} color="#AFAFAF" />
              <TextInput
                style={styles.searchInput}
                placeholder={t("placeholder_search_country", userLang) || "Buscar país ou DDI..."}
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

      {/* MODAL DE ALERTA CUSTOMIZADO */}
      <Modal visible={customAlert.visible} transparent animationType="slide">
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
                {customAlert.confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F0F4F8",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    justifyContent: "center",
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 35,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#EAB64A",
    shadowColor: "#EAB64A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
    color: "#60646C",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  formContainer: {
    width: "100%",
  },
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
  inputIcon: {
    width: 24,
    textAlign: "center",
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 10,
    fontSize: 16,
    color: "#202D3A",
    fontFamily: "Montserrat_600SemiBold",
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D1D9E0",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 15,
  },
  countryPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F4F1",
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: "#D1D9E0",
  },
  flagText: { fontSize: 16 },
  ddiText: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
    fontSize: 15,
    color: "#202D3A",
    fontFamily: "Montserrat_600SemiBold",
  },
  actionWrapper: {
    marginTop: 10,
    marginBottom: 20,
  },
  buttonMain: {
    flexDirection: "row",
    backgroundColor: "#EAB64A",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#EAB64A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: "#202D3A",
    fontFamily: "Montserrat_900Black",
    fontSize: 17,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
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
  alertIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  bottomSheetTitle: {
    fontFamily: "Montserrat_900Black",
    fontSize: 22,
    color: "#202D3A",
    marginBottom: 10,
    textAlign: "center",
  },
  bottomSheetText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 15,
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  bottomSheetButtonPrimary: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetButtonPrimaryText: {
    fontFamily: "Montserrat_700Bold",
    color: "#FFF",
    fontSize: 16,
  },
});