import { FontAwesome5 } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { auth, db } from "../config/firebase";
import { t } from "../i18n/translations";
import { logAuditEvent } from "../services/auditService";
import {
  authenticateWithBiometrics,
  clearSecurityPin,
  hasSecurityPin,
  setSecurityPin,
  setSessionUnlocked,
  verifySecurityPin,
} from "../services/securityService";

interface MasterPasswordModalProps {
  visible: boolean;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  userLanguage?: string;
}

export const MasterPasswordModal: React.FC<MasterPasswordModalProps> = ({
  visible,
  onSuccess,
  onCancel,
  title,
  subtitle,
  userLanguage = "pt-BR",
}) => {
  const [isPinCreated, setIsPinCreated] = useState<boolean>(false);
  const [isCheckingPinStatus, setIsCheckingPinStatus] = useState<boolean>(true);
  const [pinInput, setPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (visible) {
      setTimeout(() => {
        if (isMounted) {
          setPinInput("");
          setConfirmPinInput("");
          setErrorMessage("");
        }
      }, 0);

      const initModal = async () => {
        if (isMounted) setIsCheckingPinStatus(true);
        try {
          const hasLocalPin = await hasSecurityPin();

          let hasFirestorePin = false;
          const uid = auth.currentUser?.uid;
          if (uid) {
            try {
              const userSnap = await getDoc(doc(db, "users", uid));
              if (userSnap.exists()) {
                const data = userSnap.data();
                const pinVal = data?.masterPasswordHash || data?.securityPin;
                if (typeof pinVal === "string" && pinVal.trim().length >= 4) {
                  hasFirestorePin = true;
                }
              }
            } catch (err) {}
          }

          const pinExists = Boolean(hasLocalPin || hasFirestorePin);

          if (isMounted) {
            setIsPinCreated(pinExists);
            setIsCheckingPinStatus(false);

            if (pinExists) {
              setTimeout(() => {
                if (isMounted) {
                  triggerBiometrics();
                }
              }, 300);
            }
          }
        } catch (e) {
          if (isMounted) {
            setIsPinCreated(false);
            setIsCheckingPinStatus(false);
          }
        }
      };

      initModal();
    }

    return () => {
      isMounted = false;
    };
  }, [visible]);

  const triggerBiometrics = async () => {
    try {
      const res: any = await authenticateWithBiometrics();

      const isSuccess = typeof res === "boolean" ? res : Boolean(res?.success);

      if (isSuccess) {
        setSessionUnlocked(true);
        const uid = auth.currentUser?.uid;
        if (uid) {
          try {
            await logAuditEvent(
              uid,
              "MASTER_PASSWORD_VERIFIED",
              "Acesso ao cofre liberado via Biometria/Rosto",
              userLanguage
            );
          } catch (e) {}
        }
        onSuccess("BIOMETRIC_UNLOCKED");
      } else {
        if (res?.error !== "user_cancel" && res?.error !== "system_cancel") {
          setErrorMessage(
            t("biometric_error_msg", userLanguage) ||
              "Não foi possível autenticar com o Rosto/Biometria."
          );
        }
      }
    } catch (err) {
      setErrorMessage(
        t("biometric_error_msg", userLanguage) ||
          "Não foi possível autenticar com o Rosto/Biometria."
      );
    }
  };

  const handleBiometricPress = () => {
    setErrorMessage("");
    triggerBiometrics();
  };

  const handleSubmit = async () => {
    setErrorMessage("");
    if (isLoading) return;

    if (!pinInput || pinInput.length < 4) {
      setErrorMessage(
        t("pin_min_length_msg", userLanguage) ||
          "O PIN de Segurança deve ter no mínimo 4 dígitos."
      );
      return;
    }

    setIsLoading(true);

    try {
      const uid = auth.currentUser?.uid;

      if (isPinCreated) {
        const isValid = await verifySecurityPin(pinInput);
        if (isValid) {
          setSessionUnlocked(true);
          if (uid) {
            try {
              await logAuditEvent(
                uid,
                "MASTER_PASSWORD_VERIFIED",
                "Acesso ao cofre liberado via PIN de Segurança",
                userLanguage
              );
            } catch (e) {}
          }
          setIsLoading(false);
          onSuccess(pinInput);
        } else {
          setIsLoading(false);
          setErrorMessage(
            t("pin_incorrect_msg", userLanguage) ||
              "PIN de Segurança incorreto. Tente novamente."
          );
        }
      } else {
        if (pinInput !== confirmPinInput) {
          setIsLoading(false);
          setErrorMessage(
            t("pins_dont_match_msg", userLanguage) ||
              "Os PINs digitados não coincidem."
          );
          return;
        }

        await setSecurityPin(pinInput);
        setSessionUnlocked(true);

        if (uid) {
          try {
            await logAuditEvent(
              uid,
              "MASTER_PASSWORD_CHANGED",
              "Senha Mestra / PIN de Segurança cadastrado com sucesso",
              userLanguage
            );
          } catch (e) {}
        }

        setIsPinCreated(true);
        setIsLoading(false);
        onSuccess(pinInput);
      }
    } catch (error: unknown) {
      setIsLoading(false);
      setErrorMessage(
        t("pin_process_error_msg", userLanguage) ||
          "Erro ao processar PIN de Segurança."
      );
    }
  };

  const handleForgotPin = () => {
    Alert.alert(
      t("reset_pin_title", userLanguage) || "Redefinir PIN de Segurança",
      t("reset_pin_msg", userLanguage) ||
        "Para cadastrar um novo PIN, será necessário realizar o login novamente com sua conta por motivos de segurança. Deseja continuar?",
      [
        {
          text: t("modal_cancel", userLanguage) || "Cancelar",
          style: "cancel",
        },
        {
          text: t("btn_reset_logout", userLanguage) || "Redefinir e Sair",
          style: "destructive",
          onPress: async () => {
            const uid = auth.currentUser?.uid;
            if (uid) {
              try {
                await logAuditEvent(
                  uid,
                  "MASTER_PASSWORD_RESET_REQUESTED",
                  "Redefinição de PIN solicitada com deslogamento",
                  userLanguage
                );
              } catch (e) {}
            }
            await clearSecurityPin();
            await signOut(auth);
            onCancel();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <ScrollView
          contentContainerStyle={styles.scrollOverlay}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.handle} />

            {isCheckingPinStatus ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#EAB64A" />
                <Text
                  style={{
                    fontFamily: "Montserrat_600SemiBold",
                    color: "#60646C",
                    marginTop: 12,
                  }}
                >
                  {t("checking_security_msg", userLanguage) ||
                    "Verificando segurança..."}
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity onPress={handleBiometricPress} activeOpacity={0.8}>
                  <View style={styles.iconContainer}>
                    <FontAwesome5
                      name={isPinCreated ? "user-shield" : "lock"}
                      size={26}
                      color="#EAB64A"
                    />
                  </View>
                </TouchableOpacity>

                <Text style={styles.title}>
                  {title ||
                    (isPinCreated
                      ? t("pin_modal_title_unlock", userLanguage) || "🔒 PIN ou Rosto"
                      : t("pin_modal_title_create", userLanguage) ||
                        "🔑 Criar PIN de Segurança")}
                </Text>

                <Text style={styles.subtitle}>
                  {subtitle ||
                    (isPinCreated
                      ? t("pin_modal_sub_unlock", userLanguage) ||
                        "Use o Reconhecimento Facial ou informe seu PIN."
                      : t("pin_modal_sub_create", userLanguage) ||
                        "Crie um PIN de Segurança de 4 dígitos para proteger suas informações.")}
                </Text>

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <TextInput
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={6}
                  placeholder={
                    isPinCreated
                      ? t("placeholder_enter_pin", userLanguage) || "Digite seu PIN"
                      : t("placeholder_create_pin", userLanguage) ||
                        "Crie um PIN (mín. 4 dígitos)"
                  }
                  placeholderTextColor="#AFAFAF"
                  value={pinInput}
                  onChangeText={(txt) => {
                    setPinInput(txt);
                    setErrorMessage("");
                  }}
                  style={styles.input}
                  importantForAutofill="no"
                  autoComplete="off"
                  textContentType="oneTimeCode"
                />

                {!isPinCreated && (
                  <TextInput
                    secureTextEntry
                    keyboardType="numeric"
                    maxLength={6}
                    placeholder={
                      t("placeholder_confirm_pin", userLanguage) ||
                      "Confirme seu PIN"
                    }
                    placeholderTextColor="#AFAFAF"
                    value={confirmPinInput}
                    onChangeText={(txt) => {
                      setConfirmPinInput(txt);
                      setErrorMessage("");
                    }}
                    style={[styles.input, { marginTop: 10 }]}
                    importantForAutofill="no"
                    autoComplete="off"
                    textContentType="oneTimeCode"
                  />
                )}

                <TouchableOpacity
                  style={[styles.btnPrimary, isLoading && { opacity: 0.7 }]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>
                      {isPinCreated
                        ? t("btn_confirm_pin", userLanguage) || "Confirmar PIN"
                        : t("btn_register_pin", userLanguage) || "Cadastrar PIN"}
                    </Text>
                  )}
                </TouchableOpacity>

                {isPinCreated && (
                  <TouchableOpacity
                    style={styles.btnBiometrics}
                    onPress={handleBiometricPress}
                  >
                    <FontAwesome5 name="smile" size={18} color="#202D3A" />
                    <Text style={styles.btnBiometricsText}>
                      {t("btn_unlock_biometrics", userLanguage) ||
                        "Desbloquear com Rosto / Biometria"}
                    </Text>
                  </TouchableOpacity>
                )}

                {isPinCreated && (
                  <TouchableOpacity
                    style={styles.btnForgot}
                    onPress={handleForgotPin}
                  >
                    <Text style={styles.btnForgotText}>
                      {t("btn_forgot_pin", userLanguage) || "Esqueci meu PIN"}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.btnSecondary} onPress={onCancel}>
                  <Text style={styles.btnSecondaryText}>
                    {t("modal_cancel", userLanguage) || "Cancelar"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(32,45,58,0.7)",
  },
  scrollOverlay: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  handle: {
    width: 50,
    height: 5,
    backgroundColor: "#D1D9E0",
    borderRadius: 3,
    marginBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EAB64A20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: "Montserrat_900Black",
    fontSize: 20,
    color: "#202D3A",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#60646C",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  errorBox: {
    backgroundColor: "#FDF2F2",
    borderWidth: 1,
    borderColor: "#D96C6C",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    width: "100%",
  },
  errorText: {
    color: "#D96C6C",
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    textAlign: "center",
  },
  input: {
    width: "100%",
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
  btnPrimary: {
    width: "100%",
    backgroundColor: "#202D3A",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 18,
  },
  btnPrimaryText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  btnBiometrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F0F4F8",
    borderWidth: 1,
    borderColor: "#D1D9E0",
  },
  btnBiometricsText: {
    color: "#202D3A",
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
  },
  btnForgot: {
    marginTop: 12,
    paddingVertical: 6,
  },
  btnForgotText: {
    color: "#D96C6C",
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
  },
  btnSecondary: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  btnSecondaryText: {
    color: "#60646C",
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
  },
});