import { FontAwesome5 } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import {
  collection,
  doc,
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

import { auth, db } from "../config/firebase";
import { t } from "../i18n/translations";
import { logAuditEvent } from "../services/auditService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch (e) {}

// 🎊 PARTÍCULAS DA EXPLOSÃO DE AMOR / MATCH (60 FPS NATIVO)
const EXPLOSION_COLORS = ["#67D4A8", "#EAB64A", "#202D3A", "#D96C6C", "#FFF"];

const LoveExplosionParticle = ({ index }: { index: number }) => {
  const anim = useRef(new Animated.Value(0)).current;

  const color = EXPLOSION_COLORS[index % EXPLOSION_COLORS.length];
  const angle = useRef((index / 16) * 2 * Math.PI).current;
  const distance = useRef(65 + Math.random() * 85).current;

  const targetX = useRef(Math.cos(angle) * distance).current;
  const targetY = useRef(Math.sin(angle) * distance).current;
  const size = useRef(10 + Math.random() * 8).current;
  const isHeart = index % 2 === 0;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 1000 + Math.random() * 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, targetX],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, targetY],
  });

  const scale = anim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.2, 1.4, 0],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 1, 0],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        transform: [{ translateX }, { translateY }, { scale }],
        opacity,
        pointerEvents: "none",
      }}
    >
      {isHeart ? (
        <FontAwesome5 name="heart" solid size={size} color={color} />
      ) : (
        <FontAwesome5 name="star" solid size={size * 0.8} color={color} />
      )}
    </Animated.View>
  );
};

export default function MatchScreen({ navigation }: any) {
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Idioma do usuário
  const userLang = userData?.language || "pt-BR";

  // ESTADOS PARA O MODAL DE CONFIRMAÇÃO DO MATCH
  const [pendingMatchPartner, setPendingMatchPartner] = useState<any>(null);
  const [isMatchConfirmationVisible, setIsMatchConfirmationVisible] = useState(false);
  const [hasMatchExploded, setHasMatchExploded] = useState(false);

  // 💥 CONTROLES DA ANIMAÇÃO DE COLISÃO DO MATCH
  const leftAvatarAnim = useRef(new Animated.Value(-SCREEN_WIDTH * 0.7)).current;
  const rightAvatarAnim = useRef(new Animated.Value(SCREEN_WIDTH * 0.7)).current;
  const centerScaleAnim = useRef(new Animated.Value(1)).current;

  // ESTADO DE ALERTAS PERSONALIZADOS
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "info-circle",
    color: "#202D3A",
    onConfirm: null as (() => void) | null,
  });

  const showCustomAlert = (
    title: string,
    message: string,
    icon = "info-circle",
    color = "#202D3A",
    onConfirm: (() => void) | null = null,
  ) => {
    setCustomAlert({ visible: true, title, message, icon, color, onConfirm });
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

    const unsubscribe = onSnapshot(doc(db, "users", currentUid), (docSnap) => {
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
    });

    return () => unsubscribe();
  }, [currentUid]);

  // 🔍 HERANÇA AUTOMÁTICA DE ASSINATURA E LEITURA DO PARCEIRO
  useEffect(() => {
    if (userData && userData.partnerId) {
      const unsubscribePartner = onSnapshot(
        doc(db, "users", userData.partnerId),
        async (docSnap) => {
          if (docSnap.exists()) {
            const pData = docSnap.data();
            setPartnerData(pData);

            if (pData.isPremium && !userData.isPremium && currentUid) {
              await setDoc(
                doc(db, "users", currentUid),
                { isPremium: true, isPartnerPremium: true },
                { merge: true },
              );
            }
          }
        },
      );
      return () => unsubscribePartner();
    } else {
      setPartnerData(null);
    }
  }, [userData?.partnerId, userData?.isPremium, currentUid]);

  // 🚀 DISPARO DA ANIMAÇÃO AO ABRIR O MODAL DE CONFIRMAÇÃO DO PARCEIRO
  useEffect(() => {
    if (isMatchConfirmationVisible) {
      setHasMatchExploded(false);
      leftAvatarAnim.setValue(-SCREEN_WIDTH * 0.7);
      rightAvatarAnim.setValue(SCREEN_WIDTH * 0.7);
      centerScaleAnim.setValue(1);

      Animated.parallel([
        Animated.timing(leftAvatarAnim, {
          toValue: 0,
          duration: 650,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(rightAvatarAnim, {
          toValue: 0,
          duration: 650,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setHasMatchExploded(true);
        triggerHaptic("heavy");

        Animated.sequence([
          Animated.timing(centerScaleAnim, {
            toValue: 1.25,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(centerScaleAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [isMatchConfirmationVisible]);

  const handleCopyCode = async () => {
    const codeToCopy = userData?.myInviteCode || currentUid;
    if (codeToCopy) {
      await Clipboard.setStringAsync(codeToCopy);
      showCustomAlert(
        t("code_copied_title", userLang),
        t("code_copied_msg", userLang),
        "copy",
        "#67D4A8",
      );
    }
  };

  const handleSendInvite = async () => {
    const myCode = userData?.myInviteCode || "DUE-123";
    const message = t("invite_whatsapp_message", userLang, { code: myCode });
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        const webUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      showCustomAlert(
        t("whatsapp_error_title", userLang),
        t("whatsapp_error_msg", userLang),
        "exclamation-triangle",
        "#EAB64A",
      );
    }
  };

  const handleDisconnectPartner = () => {
    Alert.alert(
      t("disconnect_confirm_title", userLang),
      t("disconnect_confirm_msg", userLang),
      [
        { text: t("modal_cancel", userLang), style: "cancel" },
        {
          text: t("btn_yes_disconnect", userLang),
          style: "destructive",
          onPress: async () => {
            const partnerUid = userData?.partnerId;
            if (!currentUid) return;

            setIsDisconnecting(true);
            try {
              await logAuditEvent(
                currentUid,
                "PARTNER_UNLINKED",
                `Desvinculação efetuada com o parceiro ${partnerUid || "desconhecido"}`
              );

              await setDoc(
                doc(db, "users", currentUid),
                {
                  partnerId: null,
                  matchStatus: "disconnected",
                  isSoloMode: false,
                  myTrail: null,
                  isReadyToStart: false,
                  hasPressedPlay: false,
                },
                { merge: true },
              );

              if (partnerUid) {
                await setDoc(
                  doc(db, "users", partnerUid),
                  {
                    partnerId: null,
                    matchStatus: "disconnected",
                    isSoloMode: false,
                    myTrail: null,
                    isReadyToStart: false,
                    hasPressedPlay: false,
                  },
                  { merge: true },
                );
              }

              showCustomAlert(
                t("disconnected_title", userLang),
                t("disconnected_msg", userLang),
                "unlink",
                "#EAB64A",
              );
            } catch (e) {
              showCustomAlert(
                t("error_title", userLang),
                t("disconnect_error_msg", userLang),
                "times-circle",
                "#D96C6C",
              );
            } finally {
              setIsDisconnecting(false);
            }
          },
        },
      ],
    );
  };

  const handleLinkPartnerCode = async () => {
    const rawClean = inviteCodeInput.trim().replace(/^@/, "");

    if (rawClean.length < 3) {
      showCustomAlert(
        t("attention_title", userLang),
        t("invalid_code_or_username_msg", userLang),
        "exclamation-triangle",
        "#EAB64A",
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
          t("match_not_found_title", userLang),
          t("match_not_found_msg", userLang),
          "search-minus",
          "#EAB64A",
        );
        setIsMatching(false);
        return;
      }

      const partnerDoc = querySnapshot.docs[0];
      const partnerDataDb = partnerDoc.data();
      const partnerId = partnerDoc.id;

      if (partnerId === currentUid) {
        showCustomAlert(
          t("action_blocked_title", userLang),
          t("own_code_error_msg", userLang),
          "ban",
          "#D96C6C",
        );
        setIsMatching(false);
        return;
      }

      if (partnerDataDb?.partnerId && partnerDataDb.partnerId !== currentUid) {
        showCustomAlert(
          t("user_busy_title", userLang),
          t("user_busy_msg", userLang),
          "user-lock",
          "#EAB64A",
        );
        setIsMatching(false);
        return;
      }

      setPendingMatchPartner({ id: partnerId, data: partnerDataDb });
      setIsMatchConfirmationVisible(true);
    } catch (error) {
      console.error("Erro ao buscar parceiro:", error);
      showCustomAlert(
        t("connection_error_title", userLang),
        t("search_account_error_msg", userLang),
        "times-circle",
        "#D96C6C",
      );
    } finally {
      setIsMatching(false);
    }
  };

  const confirmMatchCode = async () => {
    setIsMatchConfirmationVisible(false);

    const currentUser = auth.currentUser;
    if (!currentUser || !pendingMatchPartner) {
      showCustomAlert(
        t("session_expired_title", userLang),
        t("session_expired_msg", userLang),
        "user-lock",
        "#D96C6C",
      );
      return;
    }

    setIsMatching(true);

    try {
      const codeToLink = pendingMatchPartner.data?.myInviteCode;

      if (!codeToLink) {
        showCustomAlert(
          t("code_unavailable_title", userLang),
          t("code_unavailable_msg", userLang),
          "exclamation-triangle",
          "#EAB64A",
        );
        setIsMatching(false);
        return;
      }

      const userRef = doc(db, "users", currentUser.uid);

      await setDoc(
        userRef,
        {
          linkedInviteCode: codeToLink,
          isSoloMode: false,
          isReadyToStart: false,
          hasPressedPlay: false,
          myTrail: null,
        },
        { merge: true },
      );

      await logAuditEvent(
        currentUser.uid,
        "PARTNER_MATCH_REQUESTED",
        `Solicitação de pareamento enviada para o parceiro ID: ${pendingMatchPartner.id}`
      );

      setInviteCodeInput("");
      setPendingMatchPartner(null);
      setIsMatching(false);

      showCustomAlert(
        t("match_success_title", userLang),
        t("match_success_msg", userLang),
        "heart",
        "#67D4A8",
        () => {
          navigation.reset({
            index: 0,
            routes: [
              { name: "MainTabs", state: { routes: [{ name: "Home" }] } },
            ],
          });
        },
      );
    } catch (error: any) {
      console.error("Erro ao solicitar o match no Firestore:", error);
      showCustomAlert(
        t("match_error_title", userLang),
        t("match_error_msg", userLang),
        "times-circle",
        "#D96C6C",
      );
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

  const hasPartner = !!userData?.partnerId;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate("MainTabs", { screen: "Home" })
            }
          >
            <FontAwesome5 name="times" size={20} color="#202D3A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t("match_header_title", userLang)}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. STATUS DO MATCH */}
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
                      {t("connected_with_label", userLang)}
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
                        {t("btn_disconnect_partner", userLang)}
                      </Text>
                    </>
                  )}
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
                    {t("no_connection_label", userLang)}
                  </Text>
                  <Text style={[styles.partnerName, { color: "#60646C" }]}>
                    {t("waiting_match_label", userLang)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* 2. ENVIAR CONVITE */}
          {!hasPartner && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("invite_section_1_title", userLang)}
              </Text>
              <View style={styles.card}>
                <Text style={styles.cardDesc}>
                  {t("invite_section_1_desc", userLang)}
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
                    {t("btn_invite_whatsapp", userLang)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 3. RECEBER CONVITE / BUSCA POR USERNAME */}
          {!hasPartner && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("invite_section_2_title", userLang)}
              </Text>
              <View
                style={[
                  styles.card,
                  { backgroundColor: "#E8F4F1", borderColor: "#67D4A8" },
                ]}
              >
                <Text style={styles.cardDesc}>
                  {t("invite_section_2_desc", userLang)}
                </Text>

                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder={t("placeholder_code_or_username", userLang)}
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
                        {t("btn_connect", userLang)}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 🏆 MODAL DE CONFIRMAÇÃO COM ANIMAÇÃO DE COLISÃO E EXPLOSÃO */}
      <Modal
        visible={isMatchConfirmationVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.codeModalCard}>
            <Text style={styles.codeModalTitle}>
              {t("is_this_person_title", userLang)}
            </Text>
            <Text style={styles.codeModalSub}>
              {t("is_this_person_sub", userLang)}
            </Text>

            {/* 💥 ENCONTRO DAS FOTOS NO CENTRO DO MODAL */}
            <View style={styles.avatarsCollisionWrapper}>
              {hasMatchExploded && (
                <View style={styles.explosionCenterEmitter}>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <LoveExplosionParticle key={i} index={i} />
                  ))}
                </View>
              )}

              {/* FOTO DO USUÁRIO ATUAL (Vem da Esquerda) */}
              <Animated.View
                style={[
                  styles.matchAvatarFrame,
                  { transform: [{ translateX: leftAvatarAnim }, { scale: centerScaleAnim }] },
                ]}
              >
                {myPhoto ? (
                  <Image source={{ uri: myPhoto }} style={styles.matchAvatarImage} />
                ) : (
                  <FontAwesome5 name="user" size={26} color="#202D3A" />
                )}
              </Animated.View>

              {/* FOTO DO PARCEIRO ENCONTRADO (Vem da Direita) */}
              <Animated.View
                style={[
                  styles.matchAvatarFrame,
                  { transform: [{ translateX: rightAvatarAnim }, { scale: centerScaleAnim }] },
                ]}
              >
                {pendingPhoto ? (
                  <Image source={{ uri: pendingPhoto }} style={styles.matchAvatarImage} />
                ) : (
                  <FontAwesome5 name="heart" solid size={26} color="#EAB64A" />
                )}
              </Animated.View>
            </View>

            <Text style={styles.pendingNameText}>{pendingName}</Text>

            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: "#67D4A8", marginTop: 15 }]}
              onPress={confirmMatchCode}
            >
              <Text style={styles.linkButtonText}>
                {t("btn_yes_connect", userLang)}
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
                {t("btn_no_wrong_code", userLang)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE ALERTAS CUSTOMIZADOS */}
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
                {t("btn_understand", userLang)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  },
  btnDisabled: { opacity: 0.6 },
  btnActionText: {
    color: "#FFF",
    fontFamily: "Montserrat_900Black",
    fontSize: 15,
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
    marginBottom: 15,
  },
  explosionCenterEmitter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99,
  },
  matchAvatarFrame: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: "#EAB64A",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
    marginHorizontal: -8,
  },
  matchAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
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