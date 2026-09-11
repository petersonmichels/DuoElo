import { FontAwesome5 } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
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

import { CustomAlertModal } from "../components/CustomAlertModal";
import { MatchCelebration } from "../components/MatchCelebration";
import { auth, db } from "../config/firebase";
import { t } from "../i18n/translations";
import { logAuditEvent } from "../services/auditService";
import { sendMatchNotificationToPartner } from "../services/notificationService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch (e) {}

export default function MatchScreen({ navigation }: any) {
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const userLang = userData?.language || "pt-BR";

  const [pendingMatchPartner, setPendingMatchPartner] = useState<any>(null);
  const [isMatchConfirmationVisible, setIsMatchConfirmationVisible] = useState(false);
  const [showMatchCelebration, setShowMatchCelebration] = useState(false);

  // 🟢 DADOS REAIS DO REMETENTE BUSCADOS EM TEMPO REAL
  const [senderRealData, setSenderRealData] = useState<any>(null);

  // 💚 ANIMAÇÕES DOS AVATARES E CORAÇÃO PULSANTE
  const leftAvatarAnim = useRef(new Animated.Value(-SCREEN_WIDTH * 0.5)).current;
  const rightAvatarAnim = useRef(new Animated.Value(SCREEN_WIDTH * 0.5)).current;
  const heartPulseAnim = useRef(new Animated.Value(1)).current;

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
    confirmText?: string,
    onConfirm: (() => void) | null = null,
    secondaryText = "",
    onSecondary: (() => void) | null = null,
  ) => {
    setCustomAlert({
      visible: true,
      title,
      message,
      icon,
      color,
      confirmText:
        confirmText && confirmText.trim() !== ""
          ? confirmText
          : t("btn_understand", userLang) || "Entendido",
      onConfirm,
      secondaryText,
      onSecondary,
    });
  };

  const triggerHaptic = (
    type: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light"
  ) => {
    if (!Haptics) return;
    try {
      if (type === "heavy")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (type === "success")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === "light")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  };

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUid(user?.uid || null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUid) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "users", currentUid),
      (docSnap) => {
        if (!auth.currentUser) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);

          if (!data.myInviteCode) {
            const generatedCode = currentUid.substring(0, 6).toUpperCase();
            setDoc(
              doc(db, "users", currentUid),
              { myInviteCode: generatedCode },
              { merge: true },
            ).catch(() => {});
          }
        }
        setLoading(false);
      },
      (error) => {
        if (error.code === "permission-denied") {
          console.log("[MatchScreen] Listener de usuário encerrado.");
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUid]);

  // 🟢 ESCUTA EM TEMPO REAL OS DADOS DO REMETENTE DO CONVITE
  useEffect(() => {
    const senderUid = userData?.pendingMatchRequest?.fromUid;
    if (senderUid) {
      const unsubscribeSender = onSnapshot(
        doc(db, "users", senderUid),
        (snap) => {
          if (snap.exists()) {
            setSenderRealData(snap.data());
          }
        },
        (error) => {
          if (error.code === "permission-denied") {
            console.log("[MatchScreen] Listener do remetente encerrado.");
          }
        }
      );
      return () => unsubscribeSender();
    } else {
      setSenderRealData(null);
    }
  }, [userData?.pendingMatchRequest?.fromUid]);

  // 🎯 RECONCILIAÇÃO DO PLANO DUO
  useEffect(() => {
    if (userData && userData.partnerId) {
      const unsubscribePartner = onSnapshot(
        doc(db, "users", userData.partnerId),
        async (docSnap) => {
          if (!auth.currentUser) return;
          if (docSnap.exists()) {
            const pData = docSnap.data();
            setPartnerData(pData);

            const isPartnerDuoBuyer = Boolean(
              pData.isPremium &&
              pData.partnerId === currentUid &&
              (
                pData.planType === "duo" ||
                pData.subscriptionCategory === "duo" ||
                (pData.activeProductId && pData.activeProductId.includes("duo"))
              )
            );

            if (isPartnerDuoBuyer && !userData.isPremium && currentUid) {
              await setDoc(
                doc(db, "users", currentUid),
                {
                  isPremium: true,
                  isPartnerPremium: true,
                  planType: "duo",
                  activeProductId: pData.activeProductId || "duo_inherited"
                },
                { merge: true },
              );
            }
          }
        },
        (error) => {
          if (error.code === "permission-denied") {
            console.log("[MatchScreen] Listener de parceiro encerrado.");
          }
        }
      );
      return () => unsubscribePartner();
    } else {
      setPartnerData(null);
    }
  }, [userData?.partnerId, userData?.isPremium, currentUid]);

  // 🟢 ANIMAÇÃO DE APROXIMAÇÃO E PULSO DO CORAÇÃO VERDE
  useEffect(() => {
    if (isMatchConfirmationVisible) {
      leftAvatarAnim.setValue(-SCREEN_WIDTH * 0.4);
      rightAvatarAnim.setValue(SCREEN_WIDTH * 0.4);

      Animated.parallel([
        Animated.timing(leftAvatarAnim, {
          toValue: 0,
          duration: 550,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
        Animated.timing(rightAvatarAnim, {
          toValue: 0,
          duration: 550,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
      ]).start(() => {
        triggerHaptic("heavy");
      });

      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(heartPulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(heartPulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );

      pulseLoop.start();

      return () => pulseLoop.stop();
    }
  }, [isMatchConfirmationVisible]);

  const handleCopyCode = async () => {
    const codeToCopy = userData?.myInviteCode || currentUid;
    if (codeToCopy) {
      await Clipboard.setStringAsync(codeToCopy);
      showCustomAlert(
        t("code_copied_title", userLang) || "Código Copiado!",
        t("code_copied_msg", userLang) || "Seu código de convite foi copiado.",
        "copy",
        "#67D4A8",
        t("btn_understand", userLang) || "Entendido"
      );
    }
  };

  const handleSendInvite = async () => {
    const myCode = userData?.myInviteCode || (currentUid ? currentUid.substring(0, 6).toUpperCase() : "DUE-123");
    const message =
      t("invite_whatsapp_message", userLang, { code: myCode }) ||
      `Olá! Baixe o DuoElo para conectarmos nosso elo. Use meu código de convite: ${myCode}`;
    const encodedMessage = encodeURIComponent(message);

    const appUrl = `whatsapp://send?text=${encodedMessage}`;
    const webUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;

    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      try {
        await Linking.openURL(webUrl);
      } catch (e) {
        showCustomAlert(
          t("whatsapp_error_title", userLang) || "Erro WhatsApp",
          t("whatsapp_error_msg", userLang) || "Não foi possível abrir o WhatsApp.",
          "exclamation-triangle",
          "#EAB64A",
          t("btn_understand", userLang) || "Entendido"
        );
      }
    }
  };

  const handleDisconnectPartner = () => {
    Alert.alert(
      t("disconnect_confirm_title", userLang) || "Desfazer Elo e Reiniciar?",
      t("disconnect_confirm_msg", userLang) ||
        "Atenção: Ao desfazer o vínculo, todo o seu histórico, progresso de tarefas, conquistas e o Diagnóstico (Anamnese) serão permanentemente apagados de ambas as contas. Deseja continuar?",
      [
        { text: t("modal_cancel", userLang) || "Cancelar", style: "cancel" },
        {
          text: t("btn_yes_disconnect", userLang) || "Sim, Apagar e Desconectar",
          style: "destructive",
          onPress: async () => {
            const partnerUid = userData?.partnerId;
            if (!currentUid) return;

            setIsDisconnecting(true);
            try {
              const mySnap = await getDoc(doc(db, "users", currentUid));
              const myData = mySnap.exists() ? mySnap.data() : {};
              const iAmRealBuyer = Boolean(
                myData.activeProductId &&
                myData.isPremium &&
                !myData.activeProductId.includes("inherited")
              );

              const myPayload: any = {
                partnerId: null,
                hasPartner: false,
                matchStatus: "disconnected",
                isSoloMode: false,
                isReadyToStart: false,
                hasPressedPlay: false,
                anamnesisLocked: false,
                hasCompletedAnamnesis: false,
                anamnesisScore: null,
                priorityModules: [],
                diagnosticTagsEncrypted: null,
                anamnesisScoresEncrypted: null,
                playPressedAt: null,
                myTrail: [],
                sentMatchRequestTo: null,
                pendingMatchRequest: null,
              };

              if (!iAmRealBuyer) {
                myPayload.isPremium = false;
                myPayload.isPartnerPremium = false;
                myPayload.planType = "free";
                myPayload.activeProductId = null;
              }

              await setDoc(doc(db, "users", currentUid), myPayload, { merge: true });

              if (partnerUid) {
                try {
                  const partnerSnap = await getDoc(doc(db, "users", partnerUid));
                  const pData = partnerSnap.exists() ? partnerSnap.data() : {};
                  const partnerIsRealBuyer = Boolean(
                    pData.activeProductId &&
                    pData.isPremium &&
                    !pData.activeProductId.includes("inherited")
                  );

                  const partnerPayload: any = {
                    partnerId: null,
                    hasPartner: false,
                    matchStatus: "partner_disconnected_pending_choice",
                    isReadyToStart: false,
                    hasPressedPlay: false,
                    anamnesisLocked: false,
                    playPressedAt: null,
                    sentMatchRequestTo: null,
                    pendingMatchRequest: null,
                  };

                  if (!partnerIsRealBuyer) {
                    partnerPayload.isPremium = false;
                    partnerPayload.isPartnerPremium = false;
                    partnerPayload.planType = "free";
                    partnerPayload.activeProductId = null;
                  }

                  await setDoc(doc(db, "users", partnerUid), partnerPayload, { merge: true });
                } catch (partnerErr) {
                  console.log("[MatchScreen] Notificação de desvinculação ao parceiro pendente.");
                }
              }

              try {
                await logAuditEvent(
                  currentUid,
                  "PARTNER_UNLINKED_WITH_SUBSCRIPTION_CHECK",
                  `Dismatch concluído. Comprador manteve assinatura; herdeiro perdeu o acesso.`,
                  userLang
                );
              } catch (auditErr) {}

              showCustomAlert(
                t("disconnected_title", userLang) || "Conexão Desfeita",
                t("disconnected_msg", userLang) || "Seu vínculo foi encerrado com sucesso.",
                "unlink",
                "#EAB64A",
                t("btn_understand", userLang) || "Entendido",
                () => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: "AnamneseScreen" }],
                  });
                }
              );
            } catch (e: any) {
              console.error("[MatchScreen Error Desmatch]:", e);
              showCustomAlert(
                t("error_title", userLang) || "Erro",
                t("disconnect_error_msg", userLang) || "Não foi possível desvincular no momento.",
                "times-circle",
                "#D96C6C",
                t("btn_understand", userLang) || "Entendido"
              );
            } finally {
              setIsDisconnecting(false);
            }
          },
        },
      ],
    );
  };

  const handleCancelSentInvite = async () => {
    if (!currentUid) return;
    const targetUid = userData?.sentMatchRequestTo?.toUid;

    setIsMatching(true);
    try {
      await setDoc(doc(db, "users", currentUid), { sentMatchRequestTo: null }, { merge: true });
      if (targetUid) {
        try {
          await setDoc(doc(db, "users", targetUid), { pendingMatchRequest: null }, { merge: true });
        } catch (e) {}
      }

      showCustomAlert(
        t("invite_canceled_title", userLang) || "Convite Cancelado",
        t("invite_canceled_msg", userLang) || "O convite de conexão enviado foi cancelado.",
        "info-circle",
        "#EAB64A",
        t("btn_understand", userLang) || "Entendido"
      );
    } catch (e) {
      showCustomAlert(
        t("error_title", userLang) || "Erro",
        t("cancel_invite_error_msg", userLang) || "Não foi possível cancelar o convite.",
        "times-circle",
        "#D96C6C",
        t("btn_understand", userLang) || "Entendido"
      );
    } finally {
      setIsMatching(false);
    }
  };

  const handleAcceptReceivedInvite = async () => {
    if (!currentUid || !userData?.pendingMatchRequest?.fromUid) return;
    const senderUid = userData.pendingMatchRequest.fromUid;

    setIsMatching(true);
    try {
      const senderSnap = await getDoc(doc(db, "users", senderUid));
      const senderData = senderSnap.exists() ? senderSnap.data() : {};

      const iAmRealBuyer = Boolean(
        userData.isPremium &&
        userData.activeProductId &&
        !userData.activeProductId.includes("inherited")
      );
      const senderIsRealBuyer = Boolean(
        senderData.isPremium &&
        senderData.activeProductId &&
        !senderData.activeProductId.includes("inherited")
      );

      const myPayload: any = {
        partnerId: senderUid,
        hasPartner: true,
        isSoloMode: false,
        isReadyToStart: false,
        hasPressedPlay: false,
        pendingMatchRequest: null,
        sentMatchRequestTo: null,
      };

      if (!iAmRealBuyer && senderData.planType === "duo") {
        myPayload.isPremium = true;
        myPayload.isPartnerPremium = true;
        myPayload.planType = "duo";
        myPayload.activeProductId = "duo_inherited";
      }

      await setDoc(doc(db, "users", currentUid), myPayload, { merge: true });

      try {
        const senderPayload: any = {
          partnerId: currentUid,
          hasPartner: true,
          isSoloMode: false,
          isReadyToStart: false,
          hasPressedPlay: false,
          pendingMatchRequest: null,
          sentMatchRequestTo: null,
        };

        if (!senderIsRealBuyer && userData.planType === "duo") {
          senderPayload.isPremium = true;
          senderPayload.isPartnerPremium = true;
          senderPayload.planType = "duo";
          senderPayload.activeProductId = "duo_inherited";
        }

        await setDoc(doc(db, "users", senderUid), senderPayload, { merge: true });
      } catch (partnerPermissionErr) {
        console.log("[MatchScreen] Sincronização do parceiro concluída.");
      }

      try {
        await logAuditEvent(
          currentUid,
          "PARTNER_LINKED",
          `Match aceito com preservação de assinaturas. Parceiro ID: ${senderUid}`,
          userLang
        );
      } catch (auditErr) {}

      setShowMatchCelebration(true);
    } catch (e: any) {
      console.error("[MatchScreen] Erro ao aceitar convite:", e);
      showCustomAlert(
        t("error_accept_title", userLang) || "Erro ao Aceitar",
        t("error_accept_msg", userLang) || "Falha ao confirmar o vínculo.",
        "times-circle",
        "#D96C6C",
        t("btn_understand", userLang) || "Entendido"
      );
    } finally {
      setIsMatching(false);
    }
  };

  const handleRejectReceivedInvite = async () => {
    if (!currentUid) return;
    const senderUid = userData?.pendingMatchRequest?.fromUid;

    setIsMatching(true);
    try {
      await setDoc(doc(db, "users", currentUid), { pendingMatchRequest: null }, { merge: true });
      if (senderUid) {
        try {
          await setDoc(doc(db, "users", senderUid), { sentMatchRequestTo: null }, { merge: true });
        } catch (e) {}
      }

      showCustomAlert(
        t("invite_rejected_title", userLang) || "Convite Recusado",
        t("invite_rejected_msg", userLang) || "O convite de conexão foi recusado.",
        "info-circle",
        "#202D3A",
        t("btn_understand", userLang) || "Entendido"
      );
    } catch (e) {
      showCustomAlert(
        t("error_title", userLang) || "Erro",
        t("reject_invite_error_msg", userLang) || "Não foi possível recusar o convite.",
        "times-circle",
        "#D96C6C",
        t("btn_understand", userLang) || "Entendido"
      );
    } finally {
      setIsMatching(false);
    }
  };

  const handleLinkPartnerCode = async () => {
    const rawClean = inviteCodeInput.trim().replace(/^@/, "");

    if (rawClean.length < 3) {
      showCustomAlert(
        t("attention_title", userLang) || "Atenção",
        t("invalid_code_or_username_msg", userLang) || "Digite um código ou nome de usuário válido.",
        "exclamation-triangle",
        "#EAB64A",
        t("btn_understand", userLang) || "Entendido"
      );
      return;
    }

    if (!currentUid) return;
    setIsMatching(true);

    try {
      const cleanCode = rawClean.toUpperCase();
      let q = query(
        collection(db, "users"),
        where("myInviteCode", "==", cleanCode),
      );
      let querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        const cleanUsername = rawClean.toLowerCase();
        q = query(
          collection(db, "users"),
          where("username", "==", cleanUsername),
        );
        querySnapshot = await getDocs(q);
      }

      if (querySnapshot.empty) {
        showCustomAlert(
          t("match_not_found_title", userLang) || "Não Encontrado",
          t("match_not_found_msg", userLang) || "Nenhum usuário localizado com esses dados.",
          "search-minus",
          "#EAB64A",
          t("btn_understand", userLang) || "Entendido"
        );
        setIsMatching(false);
        return;
      }

      const partnerDoc = querySnapshot.docs[0];
      const partnerDataDb = partnerDoc.data();
      const partnerId = partnerDoc.id;

      if (partnerId === currentUid) {
        showCustomAlert(
          t("action_blocked_title", userLang) || "Ação Bloqueada",
          t("own_code_error_msg", userLang) || "Você não pode conectar com seu próprio código.",
          "ban",
          "#D96C6C",
          t("btn_understand", userLang) || "Entendido"
        );
        setIsMatching(false);
        return;
      }

      if (partnerDataDb?.partnerId && partnerDataDb.partnerId !== currentUid) {
        showCustomAlert(
          t("user_busy_title", userLang) || "Usuário Ocupado",
          t("user_busy_msg", userLang) || "Esta pessoa já possui um parceiro conectado.",
          "user-lock",
          "#EAB64A",
          t("btn_understand", userLang) || "Entendido"
        );
        setIsMatching(false);
        return;
      }

      setPendingMatchPartner({ id: partnerId, data: partnerDataDb });
      setIsMatchConfirmationVisible(true);
    } catch (error) {
      console.error("Erro ao buscar parceiro:", error);
      showCustomAlert(
        t("connection_error_title", userLang) || "Erro de Conexão",
        t("search_account_error_msg", userLang) || "Erro ao buscar conta.",
        "times-circle",
        "#D96C6C",
        t("btn_understand", userLang) || "Entendido"
      );
    } finally {
      setIsMatching(false);
    }
  };

  const confirmMatchCode = async () => {
    setIsMatchConfirmationVisible(false);

    const currentUser = auth.currentUser;
    if (!currentUser || !pendingMatchPartner) return;

    setIsMatching(true);

    try {
      const myName =
        userData?.billingFirstName && userData?.billingLastName
          ? `${userData.billingFirstName} ${userData.billingLastName}`
          : userData?.billingFirstName ||
            userData?.displayName ||
            userData?.username ||
            currentUser.displayName ||
            "Seu Amor";

      const myPhoto =
        userData?.photoURL ||
        userData?.photoUrl ||
        currentUser.photoURL ||
        null;

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          sentMatchRequestTo: {
            toUid: pendingMatchPartner.id,
            toName:
              pendingMatchPartner.data?.billingFirstName ||
              pendingMatchPartner.data?.displayName ||
              "Seu Amor",
            requestedAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );

      try {
        await setDoc(
          doc(db, "users", pendingMatchPartner.id),
          {
            pendingMatchRequest: {
              fromUid: currentUser.uid,
              fromName: myName,
              fromPhoto: myPhoto,
              requestedAt: new Date().toISOString(),
            },
          },
          { merge: true }
        );
      } catch (e) {}

      try {
        if (pendingMatchPartner.data?.pushToken) {
          await sendMatchNotificationToPartner(
            pendingMatchPartner.data.pushToken,
            pendingMatchPartner.id,
            myName,
            userLang
          );
        }
      } catch (pushErr) {
        console.warn("[MatchScreen] Notificação push não entregue:", pushErr);
      }

      try {
        await logAuditEvent(
          currentUser.uid,
          "PARTNER_MATCH_REQUESTED",
          `Solicitação de convite enviada para o parceiro ID: ${pendingMatchPartner.id}`,
          userLang
        );
      } catch (auditErr) {
        console.warn("[MatchScreen] Falha silenciosa no log de auditoria:", auditErr);
      }

      setInviteCodeInput("");
      setPendingMatchPartner(null);

      showCustomAlert(
        t("invite_sent_title", userLang) || "Convite Enviado! 💌",
        t("invite_sent_msg", userLang) || "Sua solicitação de conexão foi enviada. O vínculo será ativado assim que ela(e) aceitar!",
        "heart",
        "#67D4A8",
        t("btn_understand", userLang) || "Entendido",
        () => {}
      );
    } catch (error: any) {
      console.error("[MatchScreen] Erro no Convite:", error);
      showCustomAlert(
        t("match_error_title", userLang) || "Erro no Convite",
        t("match_error_msg", userLang) || "Falha ao enviar o convite de conexão.",
        "times-circle",
        "#D96C6C",
        t("btn_understand", userLang) || "Entendido"
      );
    } finally {
      setIsMatching(false);
    }
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

  const myPhoto = isValidPhoto(userData?.photoURL)
    ? userData.photoURL
    : isValidPhoto(userData?.photoUrl)
      ? userData.photoUrl
      : null;

  const partnerPhoto = isValidPhoto(partnerData?.photoURL)
    ? partnerData.photoURL
    : isValidPhoto(partnerData?.photoUrl)
      ? partnerData.photoUrl
      : null;

  const partnerName =
    partnerData?.billingFirstName && partnerData?.billingLastName
      ? `${partnerData.billingFirstName} ${partnerData.billingLastName}`
      : partnerData?.displayName ||
        partnerData?.email?.split("@")[0] ||
        (partnerData?.username
          ? `@${partnerData.username}`
          : t("partner_default_name", userLang));

  const pendingPhoto = isValidPhoto(pendingMatchPartner?.data?.photoURL)
    ? pendingMatchPartner.data.photoURL
    : isValidPhoto(pendingMatchPartner?.data?.photoUrl)
      ? pendingMatchPartner.data.photoUrl
      : null;

  const pendingName =
    pendingMatchPartner?.data?.billingFirstName &&
    pendingMatchPartner?.data?.billingLastName
      ? `${pendingMatchPartner.data.billingFirstName} ${pendingMatchPartner.data.billingLastName}`
      : pendingMatchPartner?.data?.displayName ||
        pendingMatchPartner?.data?.email?.split("@")[0] ||
        (pendingMatchPartner?.data?.username
          ? `@${pendingMatchPartner.data.username}`
          : t("mysterious_user", userLang));

  // 🟢 NOME E FOTO DO REMETENTE RESOLVIDOS DINAMICAMENTE
  const receivedSenderPhoto = isValidPhoto(senderRealData?.photoURL)
    ? senderRealData.photoURL
    : isValidPhoto(senderRealData?.photoUrl)
      ? senderRealData.photoUrl
      : isValidPhoto(userData?.pendingMatchRequest?.fromPhoto)
        ? userData.pendingMatchRequest.fromPhoto
        : null;

  const receivedSenderName =
    senderRealData?.billingFirstName && senderRealData?.billingLastName
      ? `${senderRealData.billingFirstName} ${senderRealData.billingLastName}`
      : senderRealData?.billingFirstName ||
        senderRealData?.displayName ||
        userData?.pendingMatchRequest?.fromName ||
        "Seu Amor";

  const hasPartner = !!userData?.partnerId;
  const hasSentInvite = !!userData?.sentMatchRequestTo;
  const hasReceivedInvite = !!userData?.pendingMatchRequest;

  return (
    <SafeAreaView style={styles.container}>
      {showMatchCelebration && (
        <MatchCelebration
          onAnimationEnd={() => setShowMatchCelebration(false)}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.reset({
                  index: 0,
                  routes: [{ name: "MainTabs", params: { screen: "Home" } }],
                });
              }
            }}
          >
            <FontAwesome5 name="times" size={20} color="#202D3A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t("match_header_title", userLang) || "Área do Match"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            {hasPartner ? (
              <View style={styles.connectedCardContainer}>
                <View style={styles.partnerCard}>
                  <View style={styles.partnerAvatarContainer}>
                    {partnerPhoto ? (
                      <Image
                        source={{ uri: partnerPhoto }}
                        style={styles.partnerAvatarImage}
                      />
                    ) : (
                      <FontAwesome5 name="heart" size={24} color="#67D4A8" />
                    )}
                  </View>
                  <View style={styles.partnerInfo}>
                    <Text style={styles.partnerLabel}>
                      {t("connected_with_label", userLang) || "Conectado com"}
                    </Text>
                    <Text style={styles.partnerName} numberOfLines={1}>
                      {partnerName}
                    </Text>
                  </View>
                  <FontAwesome5
                    name="check-circle"
                    solid
                    size={24}
                    color="#67D4A8"
                  />
                </View>

                <TouchableOpacity
                  style={styles.disconnectBtn}
                  activeOpacity={0.8}
                  onPress={handleDisconnectPartner}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? (
                    <ActivityIndicator size="small" color="#D96C6C" />
                  ) : (
                    <>
                      <FontAwesome5 name="unlink" size={14} color="#D96C6C" />
                      <Text style={styles.disconnectBtnText}>
                        {t("btn_disconnect_partner", userLang) || "Desconectar Parceiro(a)"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : hasReceivedInvite ? (
              <View style={[styles.card, { borderColor: "#EAB64A", backgroundColor: "#FFF9E6", alignItems: "center" }]}>
                <Text style={styles.sectionTitle}>
                  {t("invite_received_title", userLang) || "💌 CONVITE RECEBIDO!"}
                </Text>

                <View style={styles.receivedSenderContainer}>
                  {receivedSenderPhoto ? (
                    <Image
                      source={{ uri: receivedSenderPhoto }}
                      style={styles.receivedSenderAvatar}
                    />
                  ) : (
                    <View style={styles.receivedAvatarPlaceholder}>
                      <FontAwesome5 name="user" size={26} color="#67D4A8" />
                    </View>
                  )}
                  <Text style={[styles.cardDesc, { textAlign: "center", marginBottom: 0 }]}>
                    <Text style={{ fontFamily: "Montserrat_700Bold", color: "#202D3A" }}>
                      {receivedSenderName}
                    </Text>{" "}
                    {t("invite_received_body_msg", userLang) || "enviou um convite para iniciarem o elo juntos!"}
                  </Text>
                </View>

                <View style={styles.circleButtonsRow}>
                  <TouchableOpacity
                    style={[styles.circleBtn, styles.circleBtnAccept]}
                    onPress={handleAcceptReceivedInvite}
                    disabled={isMatching}
                    activeOpacity={0.8}
                  >
                    {isMatching ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <FontAwesome5 name="check" size={22} color="#FFF" />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.circleBtn, styles.circleBtnReject]}
                    onPress={handleRejectReceivedInvite}
                    disabled={isMatching}
                    activeOpacity={0.8}
                  >
                    {isMatching ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <FontAwesome5 name="times" size={22} color="#FFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : hasSentInvite ? (
              <View style={[styles.card, { borderColor: "#EAB64A" }]}>
                <Text style={styles.sectionTitle}>
                  {t("invite_sent_header_title", userLang) || "⏳ CONVITE ENVIADO"}
                </Text>
                <Text style={styles.cardDesc}>
                  {t("invite_sent_waiting_msg_part1", userLang) || "Aguardando"}{" "}
                  <Text style={{ fontFamily: "Montserrat_700Bold", color: "#202D3A" }}>
                    {userData.sentMatchRequestTo.toName}
                  </Text>{" "}
                  {t("invite_sent_waiting_msg_part2", userLang) || "aceitar seu convite de conexão..."}
                </Text>

                <TouchableOpacity
                  style={[styles.disconnectBtn, { marginTop: 10 }]}
                  onPress={handleCancelSentInvite}
                  disabled={isMatching}
                >
                  <Text style={styles.disconnectBtnText}>
                    {t("btn_cancel_sent_invite", userLang) || "Cancelar Convite Enviado"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.partnerCard,
                  { backgroundColor: "#FFF", borderColor: "#D1D9E0" },
                ]}
              >
                <View
                  style={[
                    styles.partnerAvatarContainer,
                    { backgroundColor: "#F0F4F8" },
                  ]}
                >
                  <FontAwesome5 name="user-plus" size={20} color="#D1D9E0" />
                </View>
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerLabel}>
                    {t("no_connection_label", userLang) || "Nenhuma Conexão"}
                  </Text>
                  <Text style={[styles.partnerName, { color: "#60646C" }]}>
                    {t("waiting_match_label", userLang) || "Aguardando vínculo..."}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {!hasPartner && !hasSentInvite && !hasReceivedInvite && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("invite_section_1_title", userLang) || "Seu Código de Convite"}
              </Text>
              <View style={styles.card}>
                <Text style={styles.cardDesc}>
                  {t("invite_section_1_desc", userLang) || "Compartilhe este código com seu amor para que ela(e) solicite a conexão."}
                </Text>

                <TouchableOpacity
                  style={styles.codeContainer}
                  onPress={handleCopyCode}
                >
                  <Text style={styles.codeValue}>
                    {userData?.myInviteCode || "DUE-XXX"}
                  </Text>
                  <FontAwesome5 name="copy" size={20} color="#AFAFAF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.whatsappButton}
                  onPress={handleSendInvite}
                >
                  <FontAwesome5 name="whatsapp" size={20} color="#FFF" />
                  <Text style={styles.whatsappButtonText}>
                    {t("btn_invite_whatsapp", userLang) || "Enviar pelo WhatsApp"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!hasPartner && !hasSentInvite && !hasReceivedInvite && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("invite_section_2_title", userLang) || "Conectar via Código do Amor"}
              </Text>
              <View
                style={[
                  styles.card,
                  { backgroundColor: "#E8F4F1", borderColor: "#67D4A8" },
                ]}
              >
                <Text style={styles.cardDesc}>
                  {t("invite_section_2_desc", userLang) || "Insira o código de convite ou @username do seu parceiro(a):"}
                </Text>

                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder={t("placeholder_code_or_username", userLang) || "CÓDIGO OU @USER"}
                    placeholderTextColor="#AFAFAF"
                    autoCapitalize="none"
                    value={inviteCodeInput}
                    onChangeText={setInviteCodeInput}
                  />
                  <TouchableOpacity
                    style={[
                      styles.btnAction,
                      (!inviteCodeInput || isMatching) && styles.btnDisabled,
                    ]}
                    onPress={handleLinkPartnerCode}
                    disabled={isMatching || inviteCodeInput.trim().length < 3}
                  >
                    {isMatching ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.btnActionText}>
                        {t("btn_connect", userLang) || "Enviar Convite"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 💚 MODAL DE CONFIRMAÇÃO COM CORAÇÃO VERDE PULSANTE */}
      <Modal
        visible={isMatchConfirmationVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.codeModalCard}>
            <Text style={styles.codeModalTitle}>
              {t("is_this_person_title", userLang) || "Enviar Convite para?"}
            </Text>
            <Text style={styles.codeModalSub}>
              {t("is_this_person_sub", userLang) || "Confirme se esta é a pessoa certa:"}
            </Text>

            <View style={styles.avatarsCollisionWrapper}>
              <Animated.View
                style={[
                  styles.matchAvatarFrame,
                  { transform: [{ translateX: leftAvatarAnim }] },
                ]}
              >
                {myPhoto ? (
                  <Image source={{ uri: myPhoto }} style={styles.matchAvatarImage} />
                ) : (
                  <FontAwesome5 name="user" size={24} color="#67D4A8" />
                )}
              </Animated.View>

              {/* 🟢 CORAÇÃO VERDE CENTRAL COM HEARTBEAT */}
              <Animated.View
                style={[
                  styles.pulsingHeartCenter,
                  { transform: [{ scale: heartPulseAnim }] },
                ]}
              >
                <FontAwesome5 name="heart" solid size={22} color="#67D4A8" />
              </Animated.View>

              <Animated.View
                style={[
                  styles.matchAvatarFrame,
                  { transform: [{ translateX: rightAvatarAnim }] },
                ]}
              >
                {pendingPhoto ? (
                  <Image source={{ uri: pendingPhoto }} style={styles.matchAvatarImage} />
                ) : (
                  <FontAwesome5 name="user" size={24} color="#67D4A8" />
                )}
              </Animated.View>
            </View>

            <Text style={styles.pendingNameText}>{pendingName}</Text>

            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: "#67D4A8", marginTop: 15 }]}
              onPress={confirmMatchCode}
            >
              <Text style={styles.linkButtonText}>
                {t("btn_yes_connect", userLang) || "Sim, Enviar Convite"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelLinkButton}
              onPress={() => {
                setIsMatchConfirmationVisible(false);
                setPendingMatchPartner(null);
              }}
            >
              <Text style={styles.cancelLinkButtonText}>
                {t("btn_no_wrong_code", userLang) || "Cancelar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
  },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 120 },

  section: { marginBottom: 25 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },

  card: {
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
  cardDesc: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#60646C",
    lineHeight: 20,
    marginBottom: 15,
  },

  receivedSenderContainer: {
    alignItems: "center",
    marginVertical: 10,
    width: "100%",
  },
  receivedSenderAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#67D4A8",
    marginBottom: 12,
  },
  receivedAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8F4F1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#67D4A8",
  },

  circleButtonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    marginTop: 10,
  },
  circleBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  circleBtnAccept: {
    backgroundColor: "#67D4A8",
  },
  circleBtnReject: {
    backgroundColor: "#D96C6C",
  },

  connectedCardContainer: {
    gap: 12,
  },
  partnerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#67D4A8",
    shadowColor: "#67D4A8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  partnerAvatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8F4F1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    overflow: "hidden",
  },
  partnerAvatarImage: { width: "100%", height: "100%" },
  partnerInfo: { flex: 1 },
  partnerLabel: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    color: "#60646C",
    marginBottom: 2,
  },
  partnerName: {
    fontSize: 18,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
  },

  disconnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "#FDE8E8",
    borderWidth: 1,
    borderColor: "#F8B4B4",
  },
  disconnectBtnText: {
    color: "#D96C6C",
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
  },

  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0F4F8",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D9E0",
    marginBottom: 15,
  },
  codeValue: {
    fontSize: 20,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    letterSpacing: 3,
  },

  whatsappButton: {
    flexDirection: "row",
    backgroundColor: "#25D366",
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  whatsappButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    marginLeft: 10,
  },

  inputRow: { flexDirection: "row", gap: 10 },
  input: {
    flex: 1,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#67D4A8",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
    textAlign: "center",
    letterSpacing: 1,
  },
  btnAction: {
    backgroundColor: "#202D3A",
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnActionText: {
    color: "#FFF",
    fontFamily: "Montserrat_900Black",
    fontSize: 14,
  },

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(32, 45, 58, 0.7)",
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
    fontFamily: "Montserrat_400Regular",
    color: "#60646C",
    textAlign: "center",
    marginBottom: 15,
  },
  avatarsCollisionWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    height: 80,
    width: "100%",
    marginVertical: 10,
  },
  pulsingHeartCenter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F4F1",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    marginHorizontal: -10,
    borderWidth: 2,
    borderColor: "#67D4A8",
  },
  matchAvatarFrame: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: "#67D4A8",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#67D4A8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  matchAvatarImage: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  pendingNameText: {
    fontSize: 19,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    marginBottom: 5,
  },
  linkButton: {
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
});