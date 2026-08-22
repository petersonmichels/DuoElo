import { FontAwesome5 } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../config/firebase";
import {
  clearSecurityPin,
  hasSecurityPin,
  setSecurityPin,
  verifySecurityPin,
} from "../services/securityService";

interface MasterPasswordModalProps {
  visible: boolean;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

export const MasterPasswordModal: React.FC<MasterPasswordModalProps> = ({
  visible,
  onSuccess,
  onCancel,
  title,
  subtitle,
}) => {
  const [isPinCreated, setIsPinCreated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      checkPinStatus();
      setPinInput("");
      setConfirmPinInput("");
      setErrorMessage("");
    }
  }, [visible]);

  const checkPinStatus = async () => {
    try {
      const exists = await hasSecurityPin();
      setIsPinCreated(exists);
    } catch (e) {
      setIsPinCreated(false);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage("");
    if (isLoading) return;

    if (!pinInput || pinInput.length < 4) {
      setErrorMessage("O PIN de Segurança deve ter no mínimo 4 dígitos.");
      return;
    }

    setIsLoading(true);

    try {
      if (isPinCreated) {
        const isValid = await verifySecurityPin(pinInput);
        if (isValid) {
          setIsLoading(false);
          onSuccess(pinInput);
        } else {
          setIsLoading(false);
          setErrorMessage("PIN de Segurança incorreto. Tente novamente.");
        }
      } else {
        if (pinInput !== confirmPinInput) {
          setIsLoading(false);
          setErrorMessage("Os PINs digitados não coincidem.");
          return;
        }

        await setSecurityPin(pinInput);
        setIsPinCreated(true);
        setIsLoading(false);
        onSuccess(pinInput);
      }
    } catch (error) {
      setIsLoading(false);
      setErrorMessage("Erro ao processar PIN.");
    }
  };

  // 🔄 Redefinição Segura do PIN (Desconecta para validar a conta novamente)
  const handleForgotPin = () => {
    Alert.alert(
      "Redefinir PIN de Segurança",
      "Para cadastrar um novo PIN, será necessário realizar o login novamente com sua conta por motivos de segurança. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Redefinir e Sair",
          style: "destructive",
          onPress: async () => {
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
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.handle} />

          <View style={styles.iconContainer}>
            <FontAwesome5 name="lock" size={26} color="#EAB64A" />
          </View>

          <Text style={styles.title}>
            {title || (isPinCreated ? "🔒 PIN de Segurança" : "🔑 Criar PIN de Segurança")}
          </Text>

          <Text style={styles.subtitle}>
            {subtitle ||
              (isPinCreated
                ? "Informe seu PIN para liberar o acesso."
                : "Crie um PIN de Segurança para proteger suas informações.")}
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
              isPinCreated ? "Digite seu PIN" : "Crie um PIN (mín. 4 dígitos)"
            }
            placeholderTextColor="#AFAFAF"
            value={pinInput}
            onChangeText={setPinInput}
            style={styles.input}
          />

          {!isPinCreated && (
            <TextInput
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              placeholder="Confirme seu PIN"
              placeholderTextColor="#AFAFAF"
              value={confirmPinInput}
              onChangeText={setConfirmPinInput}
              style={[styles.input, { marginTop: 10 }]}
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
                {isPinCreated ? "Confirmar PIN" : "Cadastrar PIN"}
              </Text>
            )}
          </TouchableOpacity>

          {isPinCreated && (
            <TouchableOpacity style={styles.btnForgot} onPress={handleForgotPin}>
              <Text style={styles.btnForgotText}>Esqueci meu PIN</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.btnSecondary} onPress={onCancel}>
            <Text style={styles.btnSecondaryText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(32,45,58,0.7)",
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
    width: 56,
    height: 56,
    borderRadius: 28,
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
  btnForgot: {
    marginTop: 14,
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