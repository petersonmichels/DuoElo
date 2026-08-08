import { FontAwesome5 } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// 🚀 CORREÇÃO DO SAFEAREAVIEW: Importação correta da nova biblioteca
import { SafeAreaView } from "react-native-safe-area-context";

import Svg, { Circle } from "react-native-svg";

import { auth, db } from "../config/firebase";
import MissionExecutionScreen from "./MissionExecutionScreen";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function sendPushNotificationDirectly(
  expoPushToken: string,
  title: string,
  body: string,
) {
  if (!expoPushToken) return;

  const message = {
    to: expoPushToken,
    sound: "default",
    title: title,
    body: body,
  };

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error("Erro ao enviar notificação direta:", error);
  }
}

const SUPPORTED_LANGUAGES = [
  { code: "pt-BR", flag: "🇧🇷" },
  { code: "pt-PT", flag: "🇵🇹" },
  { code: "en", flag: "🇺🇸" },
  { code: "es", flag: "🇪🇸" },
  { code: "fr", flag: "🇫🇷" },
  { code: "de", flag: "🇩🇪" },
  { code: "ja", flag: "🇯🇵" },
];

const WEEKLY_PROGRESSION_ICONS = [
  "map-pin",
  "compass",
  "seedling",
  "fire",
  "key",
  "gem",
  "gift",
];

const DEFAULT_WEEK_THEMES: { [key: number]: string } = {
  1: "Comunicação & Sintonia",
  2: "Reacendendo a Chama",
  3: "Gestão de Conflitos",
  4: "Intimidade & Cuidado",
  5: "ADM & Rotina do Casal",
  6: "Linguagens do Amor",
  7: "ADM & Finanças a Dois",
  8: "Projetos de Vida",
  9: "Cumplicidade & Riso",
  10: "Perdão & Recomeço",
  11: "Conexão Profunda",
  12: "Ritual de Agradecimento",
  13: "Pacto Inquebrável",
};

const SegmentedRing = ({ progress = 0, size = 106 }) => {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const lineLength = (105 / 360) * circumference;
  const gapLength = circumference - lineLength;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0, 1, 2].map((index) => {
        const rotation = -90 + index * 120 + 7.5;
        const isLit = progress > index;
        return (
          <Circle
            key={index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isLit ? "#E5A93C" : "#D1D9E0"}
            strokeWidth={7}
            fill="none"
            strokeDasharray={`${lineLength} ${gapLength}`}
            strokeLinecap="round"
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
          />
        );
      })}
    </Svg>
  );
};

const FloatingHearts = () => {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createHeartAnim = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }),
        ]),
      );
    };

    createHeartAnim(anim1, 0).start();
    createHeartAnim(anim2, 700).start();
    createHeartAnim(anim3, 1400).start();
  }, [anim1, anim2, anim3]);

  const renderHeart = (anim: Animated.Value, left: number, size: number) => {
    const translateY = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -60],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 0.2, 0.8, 1],
      outputRange: [0, 1, 1, 0],
    });
    const scale = anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.5, 1.2, 0.8],
    });

    return (
      <Animated.View
        style={{
          position: "absolute",
          left,
          bottom: 25,
          opacity,
          transform: [{ translateY }, { scale }],
        }}
      >
        <FontAwesome5 name="heart" solid size={size} color="#E5A93C" />
      </Animated.View>
    );
  };

  return (
    <>
      {renderHeart(anim1, -15, 14)}
      {renderHeart(anim2, 10, 18)}
      {renderHeart(anim3, -5, 12)}
    </>
  );
};

async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      if (!projectId)
        token = (await Notifications.getExpoPushTokenAsync()).data;
      else
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {}
  }
  return token;
}

export default function HomeScreen({ navigation }: any) {
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [weekThemes, setWeekThemes] = useState<any>({});
  const [visibleWeek, setVisibleWeek] = useState(1);
  const weekPositions = useRef<{ [key: number]: number }>({}).current;
  const nodesWrapperY = useRef<number>(0);
  const nodePositions = useRef<{ [key: number]: number }>({}).current;

  const [isInitialPositionSet, setIsInitialPositionSet] = useState(false);
  const fabVisibleRef = useRef(false);
  const [showFab, setShowFab] = useState(false);

  const [activeMission, setActiveMission] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isFetchingMission, setIsFetchingMission] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);

  const [isJourneyVideoVisible, setIsJourneyVideoVisible] = useState(false);
  const [userLang, setUserLang] = useState("pt-BR");
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  const [isHardResetModalVisible, setIsHardResetModalVisible] = useState(false);
  const [isPitStopModalVisible, setIsPitStopModalVisible] = useState(false);
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false);

  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [pendingMatchPartner, setPendingMatchPartner] = useState<any>(null);
  const [isMatchConfirmationVisible, setIsMatchConfirmationVisible] =
    useState(false);
  const [isMatchAnimationVisible, setIsMatchAnimationVisible] = useState(false);

  const unreadNudges = userData?.cutucadas || 0;
  const [isGeneratingJourney, setIsGeneratingJourney] = useState(false);

  const matchAnimTranslateX = useRef(new Animated.Value(0)).current;
  const matchHeartScale = useRef(new Animated.Value(0)).current;

  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "info-circle",
    color: "#1A2F3B",
    confirmText: "",
    onConfirm: null as any,
  });

  const showCustomAlert = (
    title: string,
    message: string,
    icon = "info-circle",
    color = "#1A2F3B",
    confirmText = "",
    onConfirm: any = null,
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

  const scrollViewRef = useRef<ScrollView>(null);
  const totalStepsInModule = 90;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringPulseAnim = useRef(new Animated.Value(1)).current;

  const currentTaskStep = userData?.currentTaskStep || 0;
  const currentStep = (userData?.currentPhase || 1) - 1;
  const isJourneyFinished = currentStep >= totalStepsInModule;

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUid(user?.uid || null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (currentUid) {
      registerForPushNotificationsAsync().then(async (token) => {
        if (token) {
          try {
            await setDoc(
              doc(db, "users", currentUid),
              { pushToken: token },
              { merge: true },
            );
          } catch (e) {}
        }
      });
      const unsubscribe = onSnapshot(
        doc(db, "users", currentUid),
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            if (data.language) setUserLang(data.language);
          }
          setLoading(false);
        },
      );
      return () => unsubscribe();
    } else {
      setUserData(null);
      setPartnerData(null);
    }
  }, [currentUid]);

  useEffect(() => {
    if (currentUid && userData && !userData.myInviteCode) {
      const generatedCode = currentUid.substring(0, 6).toUpperCase();
      setDoc(
        doc(db, "users", currentUid),
        { myInviteCode: generatedCode },
        { merge: true },
      ).catch(() => {});
    }
  }, [currentUid, userData]);

  useEffect(() => {
    if (userData && userData.partnerId) {
      const unsubscribePartner = onSnapshot(
        doc(db, "users", userData.partnerId),
        (docSnap) => {
          if (docSnap.exists()) setPartnerData(docSnap.data());
        },
      );
      return () => unsubscribePartner();
    } else {
      setPartnerData(null);
    }
  }, [userData?.partnerId]);

  useEffect(() => {
    if (!userData) return;
    const fetchWeekThemes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "weeks"));
        const themes: any = {};
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const weekNum = Number(
            data.weekNumber || data.week || docSnap.id.replace(/\D/g, ""),
          );
          const themeText = data.theme || data.title || data.name || data.topic;
          if (!isNaN(weekNum) && themeText) themes[weekNum] = themeText;
        });
        setWeekThemes(themes);
      } catch (error) {}
    };
    fetchWeekThemes();
  }, [userData]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulseAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(ringPulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [floatAnim, pulseAnim, ringPulseAnim]);

  const hasCompletedAnamnesis = userData?.hasCompletedAnamnesis ?? false;
  const partnerCompletedAnamnesis = partnerData?.hasCompletedAnamnesis ?? false;
  const isPremium = userData?.isPremium ?? false;
  const hasPartner = !!userData?.partnerId;
  const iAmReady = !!userData?.isReadyToStart;
  const partnerIsReady = !!partnerData?.isReadyToStart;

  const isTrailUnlocked =
    hasCompletedAnamnesis &&
    isPremium &&
    iAmReady &&
    (!hasPartner || (partnerIsReady && partnerCompletedAnamnesis));

  useEffect(() => {
    if (isTrailUnlocked && isPitStopModalVisible)
      setIsPitStopModalVisible(false);
  }, [isTrailUnlocked, isPitStopModalVisible]);

  const scrollToActiveNode = (animated = false) => {
    const targetY = nodePositions[currentStep];
    if (scrollViewRef.current && targetY !== undefined) {
      const absoluteY = targetY + nodesWrapperY.current;
      const targetScrollY = Math.max(0, absoluteY - 250);
      scrollViewRef.current.scrollTo({ y: targetScrollY, animated: animated });
      setIsInitialPositionSet(true);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (isTrailUnlocked)
        setTimeout(() => {
          scrollToActiveNode(false);
        }, 100);
    });
    return unsubscribe;
  }, [navigation, isTrailUnlocked, currentStep]);

  useEffect(() => {
    if (isTrailUnlocked)
      setTimeout(() => {
        scrollToActiveNode(false);
      }, 100);
  }, [currentStep, isTrailUnlocked]);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const relativeY = offsetY - nodesWrapperY.current;
    const triggerLine = relativeY + 250;

    let active = 1;
    const weeks = Object.keys(weekPositions)
      .map(Number)
      .sort((a, b) => a - b);
    for (let w of weeks) {
      if (weekPositions[w] <= triggerLine) active = w;
    }
    if (visibleWeek !== active) setVisibleWeek(active);

    const targetY = nodePositions[currentStep];
    if (targetY !== undefined) {
      const absoluteY = targetY + nodesWrapperY.current;
      const idealScrollY = Math.max(0, absoluteY - 250);
      const distance = Math.abs(offsetY - idealScrollY);

      // 🔥 CORREÇÃO: Reduzimos a distância de 300 para 50!
      // Agora o botão aparece quase que instantaneamente ao tirar a missão de foco.
      const shouldShow = distance > 50;

      if (shouldShow !== fabVisibleRef.current) {
        fabVisibleRef.current = shouldShow;
        setShowFab(shouldShow);
      }
    }
  };

  const isValidPhoto = (url: any) => {
    if (!url || typeof url !== "string") return false;
    const trimmed = url.trim();
    if (
      trimmed.length <= 5 ||
      trimmed.toLowerCase() === "null" ||
      trimmed.toLowerCase() === "undefined"
    )
      return false;
    return true;
  };

  const getFirstName = (data?: any) => {
    if (data?.billingFirstName) return data.billingFirstName;
    if (data?.firstName) return data.firstName;
    if (data?.displayName) return data.displayName.split(" ")[0];
    return null;
  };

  const myName =
    getFirstName(userData) || userData?.email?.split("@")[0] || "Você";
  const pName =
    getFirstName(partnerData) ||
    partnerData?.email?.split("@")[0] ||
    "Parceiro(a)";

  const userPhoto = isValidPhoto(userData?.photoURL)
    ? userData.photoURL
    : isValidPhoto(userData?.photoUrl)
      ? userData.photoUrl
      : null;
  const partnerPhoto = isValidPhoto(partnerData?.photoURL)
    ? partnerData.photoURL
    : isValidPhoto(partnerData?.photoUrl)
      ? partnerData.photoUrl
      : isValidPhoto(userData?.partnerPhotoURL)
        ? userData.partnerPhotoURL
        : null;
  const pendingPhoto = isValidPhoto(pendingMatchPartner?.data?.photoURL)
    ? pendingMatchPartner.data.photoURL
    : isValidPhoto(pendingMatchPartner?.data?.photoUrl)
      ? pendingMatchPartner.data.photoUrl
      : null;

  const hasPendingPhoto = !!pendingPhoto;

  const myInviteCode = currentUid?.substring(0, 6).toUpperCase() || "DUE-123";
  const today = new Date();
  const lastTaskDateObj = userData?.lastTaskDate
    ? new Date(userData.lastTaskDate)
    : null;
  const hasCompletedTaskToday =
    lastTaskDateObj &&
    lastTaskDateObj.getDate() === today.getDate() &&
    lastTaskDateObj.getMonth() === today.getMonth() &&
    lastTaskDateObj.getFullYear() === today.getFullYear();

  const generateTrailMatrix = async (
    uid: string,
    partnerId: string | null,
    isSolo: boolean,
  ) => {
    try {
      let q = query(collection(db, "tasks"), where("language", "==", userLang));
      let snap = await getDocs(q);

      if (snap.empty) {
        q = query(collection(db, "tasks"), where("language", "==", "pt-BR"));
        snap = await getDocs(q);
      }

      let allTasks = snap.docs
        .map((d) => d.data())
        .sort((a: any, b: any) => a.day - b.day);
      let myPersonalTrail: number[] = [];

      let isShifted = false;
      if (!isSolo && partnerId) {
        isShifted = uid > partnerId;
      }

      for (let i = 0; i < allTasks.length; i += 5) {
        let chunk = allTasks.slice(i, i + 5).map((t) => t.day);

        if (isShifted && chunk.length > 1) {
          const first = chunk.shift();
          if (first !== undefined) chunk.push(first);
        }
        myPersonalTrail.push(...chunk);
      }

      return myPersonalTrail;
    } catch (error) {
      console.error("Erro ao gerar matriz:", error);
      return Array.from({ length: 90 }, (_, i) => i + 1);
    }
  };

  const handleHardReset = () => setIsHardResetModalVisible(true);
  const handleSendNudge = async () => {};
  const handleCloseNudges = async () => {
    setIsNotificationsVisible(false);
  };
  const handleCopyCode = async () => {
    setInviteSent(true);
  };

  const handleSendInvite = async () => {
    const message = `Amor, estou investindo na nossa relação porque você é muito importante pra mim. Vamos fazer juntos essa jornada de 90 dias do DuoElo? É só baixar o app e colocar o meu código pra gente dar o match: *${myInviteCode}* 👇\n\nhttps://duoelo.com/app`;

    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        setInviteSent(true);
      } else {
        const webUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webUrl);
        setInviteSent(true);
      }
    } catch (error) {
      console.error("Erro ao abrir WhatsApp", error);
      Alert.alert(
        "WhatsApp indisponível",
        "Não conseguimos abrir o WhatsApp. Por favor, copie o código e envie manualmente.",
      );
      setInviteSent(true);
    }
  };

  const handleLinkPartnerCode = async () => {
    const cleanCode = inviteCodeInput.trim().toUpperCase();

    if (cleanCode.length < 5) {
      showCustomAlert(
        "Código Inválido",
        "Digite um código válido com pelo menos 5 caracteres.",
        "exclamation-circle",
        "#E5A93C",
      );
      return;
    }

    if (!currentUid) return;
    setIsMatching(true);

    try {
      const q = query(
        collection(db, "users"),
        where("myInviteCode", "==", cleanCode),
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showCustomAlert(
          "Match Não Encontrado",
          "Não encontramos nenhuma conta com esse código. Verifique se o parceiro já acessou o app.",
          "search-minus",
          "#E5A93C",
        );
        setIsMatching(false);
        return;
      }

      const partnerDoc = querySnapshot.docs[0];
      const partnerDataDb = partnerDoc.data();
      const partnerId = partnerDoc.id;

      if (partnerId === currentUid) {
        showCustomAlert(
          "Ação Bloqueada",
          "Você não pode usar o seu próprio código!",
          "ban",
          "#D96C6C",
        );
        setIsMatching(false);
        return;
      }

      setPendingMatchPartner({ id: partnerId, data: partnerDataDb });
      setIsInviteModalVisible(false);
      setIsMatchConfirmationVisible(true);
    } catch (error) {
      console.error("Erro ao buscar match:", error);
      showCustomAlert(
        "Erro de Conexão",
        "Ocorreu um problema ao tentar buscar a conta. Tente novamente.",
        "times-circle",
        "#D96C6C",
      );
    } finally {
      setIsMatching(false);
    }
  };

  const confirmMatchCode = async () => {
    setIsMatchConfirmationVisible(false);
    setIsMatchAnimationVisible(true);

    Animated.sequence([
      Animated.timing(matchAnimTranslateX, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(matchHeartScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(async () => {
      try {
        if (!currentUid) return;
        const cleanCode = inviteCodeInput.trim().toUpperCase();

        await setDoc(
          doc(db, "users", currentUid),
          { linkedInviteCode: cleanCode },
          { merge: true },
        );

        setInviteCodeInput("");

        showCustomAlert(
          "Conectando Almas! ❤️",
          "Seu pedido foi enviado ao nosso servidor seguro. Em instantes a jornada de vocês estará conectada!",
          "heart",
          "#4BDE95",
        );
      } catch (error) {
        showCustomAlert(
          "Erro de Conexão",
          "Não foi possível efetivar o match.",
          "times-circle",
          "#D96C6C",
        );
      } finally {
        setIsMatchAnimationVisible(false);
        setPendingMatchPartner(null);
        matchAnimTranslateX.setValue(0);
        matchHeartScale.setValue(0);
      }
    }, 2800);
  };

  const confirmStartSolo = () => {
    setIsPitStopModalVisible(false);

    setTimeout(() => {
      showCustomAlert(
        "Modo Solo 🚀",
        "Atenção: Ao iniciar a jornada sozinho(a), a opção de vincular a conta de um parceiro(a) será desativada permanentemente nesta trilha.\n\nDeseja gerar suas missões e seguir sozinho(a)?",
        "user-astronaut",
        "#E5A93C",
        "Sim, Iniciar",
        () => {
          handleStartSolo();
        },
      );
    }, 400);
  };

  const handleStartSolo = async () => {
    setIsGeneratingJourney(true);

    if (currentUid) {
      const personalTrail = await generateTrailMatrix(currentUid, null, true);
      try {
        await setDoc(
          doc(db, "users", currentUid),
          { isReadyToStart: true, myTrail: personalTrail },
          { merge: true },
        );
      } catch (e) {}
    }

    setTimeout(async () => {
      setIsGeneratingJourney(false);
      showCustomAlert(
        "Jornada Solo Gerada! 🚀",
        "Cruzamos os dados da sua avaliação. Sua trilha individual de 90 dias está liberada. Boa sorte!",
        "check-circle",
        "#4BDE95",
      );
    }, 2000);
  };

  const handleStartHandshake = async () => {
    if (!currentUid) return;
    setIsGeneratingJourney(true);

    const personalTrail = await generateTrailMatrix(
      currentUid,
      partnerData?.id || null,
      false,
    );

    try {
      await setDoc(
        doc(db, "users", currentUid),
        { isReadyToStart: true, myTrail: personalTrail },
        { merge: true },
      );

      if (partnerIsReady && partnerCompletedAnamnesis) {
        setIsPitStopModalVisible(false);
        if (partnerData?.pushToken) {
          sendPushNotificationDirectly(
            partnerData.pushToken,
            "🚀 Jornada Liberada!",
            "A trilha de vocês acabou de começar. Toque aqui para ver a primeira missão!",
          );
        }
        showCustomAlert(
          "Jornada em Casal Gerada! 🚀",
          "O algoritmo sincronizou as tarefas. Vocês não farão a mesma missão no mesmo dia. A trilha oficial está liberada!",
          "map-marked-alt",
          "#4BDE95",
        );
      } else {
        if (partnerData?.pushToken) {
          sendPushNotificationDirectly(
            partnerData.pushToken,
            "Sinal Verde Dado! 🚦",
            "Seu amor já apertou os cintos para a Jornada. Só falta o seu OK para darmos a largada!",
          );
        }
        showCustomAlert(
          "Sinal Verde Dado! 🚦",
          "O seu aplicativo já sincronizou. Assim que seu parceiro(a) der o sinal verde, a jornada começará para os dois!",
          "check-circle",
          "#4BDE95",
        );
      }
    } catch (e) {
      showCustomAlert("Erro", "Tente novamente.", "times-circle", "#D96C6C");
    } finally {
      setIsGeneratingJourney(false);
    }
  };

  const handleOpenMission = async (
    stepIndex: number,
    isActuallyLocked: boolean,
    isWaiting: boolean,
    isCompleted: boolean,
  ) => {
    if (!hasCompletedAnamnesis) {
      showCustomAlert(
        "Avaliação Pendente",
        "Faça a avaliação primeiro para descobrirmos o diagnóstico exato da sua relação.",
        "clipboard-list",
        "#E5A93C",
      );
      navigation.navigate("Anamnesis");
      return;
    }

    if (!isPremium) {
      navigation.navigate("Paywall");
      return;
    }

    if (isActuallyLocked) return;

    if (isWaiting && !isCompleted) {
      showCustomAlert(
        "Tudo no seu tempo ⏳",
        "Você já concluiu a missão de hoje! Volte amanhã para continuarmos fortalecendo o seu elo.",
        "hourglass-half",
        "#1A2F3B",
      );
      return;
    }

    const fetchMissionData = async () => {
      setIsFetchingMission(true);
      try {
        const phaseToFetch = userData?.myTrail
          ? userData.myTrail[stepIndex]
          : stepIndex + 1;

        let q = query(
          collection(db, "tasks"),
          where("language", "==", userLang),
          where("day", "==", phaseToFetch),
        );
        let querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          q = query(
            collection(db, "tasks"),
            where("language", "==", userLang),
            where("day", "==", String(phaseToFetch)),
          );
          querySnapshot = await getDocs(q);
        }

        if (querySnapshot.empty) {
          q = query(
            collection(db, "tasks"),
            where("language", "==", "pt-BR"),
            where("day", "==", phaseToFetch),
          );
          querySnapshot = await getDocs(q);
        }

        if (!querySnapshot.empty) {
          const requiredScope = hasPartner ? "bilateral" : "unilateral";
          let missionsList = querySnapshot.docs.map((d) => d.data());

          let pool = missionsList.filter(
            (m) => m.scope === requiredScope || !m.scope,
          );
          if (pool.length === 0) pool = missionsList;

          let roleOffset = 0;
          if (hasPartner && currentUid && userData?.partnerId) {
            roleOffset = currentUid < userData.partnerId ? 0 : 1;
          }

          const targetIndex = roleOffset % pool.length;
          let matchedMission = pool[targetIndex];

          if (!matchedMission) {
            matchedMission = pool[0];
          }

          matchedMission = { ...matchedMission, displayPhase: stepIndex + 1 };

          setActiveMission(matchedMission);
          setIsReviewMode(Boolean(isCompleted));
          setIsModalVisible(true);
        } else {
          showCustomAlert(
            "Missão em Construção 🚧",
            `A missão desta etapa está sendo preparada e estará disponível em breve!`,
            "hard-hat",
            "#E5A93C",
          );
        }
      } catch (error) {
        console.error("Erro ao carregar missão:", error);
      } finally {
        setIsFetchingMission(false);
      }
    };

    fetchMissionData();
  };

  const handleCompleteMission = async (journalText: string = "") => {
    if (!currentUid || !activeMission) return;

    try {
      if (activeMission.isGoldChallenge) {
        await setDoc(
          doc(db, "users", currentUid),
          { totalPE: increment(activeMission.pointsPE || 150) },
          { merge: true },
        );

        const journalRef = doc(collection(db, "users", currentUid, "journals"));
        await setDoc(journalRef, {
          phase: activeMission.phase,
          text: journalText,
          date: new Date().toISOString(),
          isGold: true,
        });

        setIsModalVisible(false);
        setActiveMission(null);

        showCustomAlert(
          "Desafio de Ouro Concluído! 🏆",
          "O elo de vocês ficou ainda mais forte neste fim de semana. +150 Bonds gerados!",
          "infinity",
          "#E5A93C",
        );
        return;
      }

      const todayDate = new Date();
      const lastDate = userData?.lastTaskDate
        ? new Date(userData.lastTaskDate)
        : null;
      let newStreak = userData?.streak || 0;

      if (lastDate) {
        const todayZero = new Date(
          todayDate.getFullYear(),
          todayDate.getMonth(),
          todayDate.getDate(),
        );
        const lastZero = new Date(
          lastDate.getFullYear(),
          lastDate.getMonth(),
          lastDate.getDate(),
        );
        const diffDays =
          (todayZero.getTime() - lastZero.getTime()) / (1000 * 3600 * 24);

        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      const updates: any = {
        currentPhase: increment(1),
        totalPE: increment(activeMission.pointsPE || 50),
        lastTaskDate: new Date().toISOString(),
        currentTaskStep: 0,
        streak: newStreak,
      };

      await setDoc(doc(db, "users", currentUid), updates, { merge: true });

      if (journalText.trim().length > 0) {
        const journalRef = doc(collection(db, "users", currentUid, "journals"));
        await setDoc(journalRef, {
          phase:
            activeMission.displayPhase ||
            activeMission.phase ||
            currentStep + 1,
          text: journalText,
          date: new Date().toISOString(),
          step: 3,
        });
      }

      const earnedPE = activeMission.pointsPE || 50;
      setIsModalVisible(false);
      setActiveMission(null);

      const completedDay = currentStep + 1;
      const weekCycleProgress = ((completedDay - 1) % 7) + 1;

      if (partnerData?.pushToken && !hasCompletedTaskToday) {
        sendPushNotificationDirectly(
          partnerData.pushToken,
          "Missão Cumprida! 🌟",
          "Seu amor já completou a missão de hoje! Agora é a sua vez de fazer a sua parte e fortalecer o elo.",
        );
      }

      navigation.navigate("MissionReward", {
        earnedPE: earnedPE,
        currentDay90: completedDay,
        cupidProgress: weekCycleProgress,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenGoldChallenge = async (weekNumber: number) => {
    setIsFetchingMission(true);
    try {
      let q = query(
        collection(db, "weekly_challenges"),
        where("language", "==", userLang),
        where("week", "==", weekNumber),
      );
      let querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        q = query(
          collection(db, "weekly_challenges"),
          where("language", "==", "pt-BR"),
          where("week", "==", weekNumber),
        );
        querySnapshot = await getDocs(q);
      }

      const uid = auth.currentUser?.uid;
      let alreadyCompletedGold = false;
      if (uid) {
        const journalQuery = query(
          collection(db, "users", uid, "journals"),
          where("phase", "==", `gold_week_${weekNumber}`),
        );
        const journalSnap = await getDocs(journalQuery);
        alreadyCompletedGold = !journalSnap.empty;
      }

      if (!querySnapshot.empty) {
        const challengeData = querySnapshot.docs[0].data();
        setActiveMission({
          title:
            challengeData.title || `Desafio de Ouro da Semana ${weekNumber}`,
          description:
            challengeData.description ||
            "Esta é a missão especial da semana para o casal.",
          concept:
            challengeData.concept ||
            challengeData.description ||
            "Conectar o casal através de uma ação prática e especial de fim de semana.",
          action:
            challengeData.action ||
            challengeData.description ||
            "Realizem a atividade juntos sem distrações.",
          pointsPE: 150,
          isGoldChallenge: true,
          phase: `gold_week_${weekNumber}`,
        });
        setIsReviewMode(alreadyCompletedGold);
        setIsModalVisible(true);
      } else {
        setActiveMission({
          title: `Desafio de Ouro da Semana ${weekNumber}`,
          description:
            "Desafio prático bônus para fortalecer o elo do casal no fim de semana.",
          concept:
            "Momento de sintonia total para revalidar a conexão construída ao longo da semana.",
          action:
            "Reservem 30 minutos a sós para realizar uma atividade leve e romântica.",
          pointsPE: 150,
          isGoldChallenge: true,
          phase: `gold_week_${weekNumber}`,
        });
        setIsReviewMode(alreadyCompletedGold);
        setIsModalVisible(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsFetchingMission(false);
    }
  };

  const getDisplayThemeForWeek = (weekNum: number) =>
    weekThemes[weekNum] || DEFAULT_WEEK_THEMES[weekNum] || "Resgate da Conexão";
  const bannerWeekTheme = getDisplayThemeForWeek(visibleWeek);
  const currentFlag =
    SUPPORTED_LANGUAGES.find((l) => l.code === userLang)?.flag || "🇧🇷";
  const isInviteStepCompleted = hasPartner || inviteSent;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBarItem}
          onPress={() => setIsLangModalVisible(true)}
        >
          <Text style={styles.flagEmoji}>{currentFlag}</Text>
        </TouchableOpacity>

        <View style={styles.topBarItem}>
          <FontAwesome5 name="fire" size={20} color="#E5A93C" />
          <Text style={[styles.topBarText, { color: "#E5A93C" }]}>
            {userData?.streak || 0}
          </Text>
        </View>

        <View style={styles.topBarItem}>
          <FontAwesome5 name="infinity" solid size={20} color="#E5A93C" />
          <Text style={[styles.topBarText, { color: "#E5A93C" }]}>
            {userData?.totalPE || 0}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.topBarItem}
          onPress={() => setIsNotificationsVisible(true)}
        >
          <View style={{ position: "relative" }}>
            <FontAwesome5 name="bell" solid size={22} color="#1A2F3B" />
            {unreadNudges > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNudges > 9 ? "9+" : unreadNudges}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.miniAvatarsContainer}>
          <View style={[styles.miniAvatar, { zIndex: 2, overflow: "hidden" }]}>
            {userPhoto ? (
              <Image
                key={userPhoto.substring(0, 100)}
                source={{ uri: userPhoto }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <FontAwesome5 name="user-alt" size={16} color="#AFAFAF" />
            )}
          </View>
          <View
            style={[
              styles.miniAvatar,
              styles.miniPartnerAvatar,
              { zIndex: 1, overflow: "hidden" },
            ]}
          >
            {partnerPhoto ? (
              <Image
                key={partnerPhoto.substring(0, 100)}
                source={{ uri: partnerPhoto }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <FontAwesome5
                name="user-alt"
                size={16}
                color={hasPartner ? "#E5A93C" : "#D1D9E0"}
              />
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.topBarItem}
          onPress={handleHardReset}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="eraser" size={20} color="#1A2F3B" />
        </TouchableOpacity>
      </View>

      <View style={styles.fixedHeaderBannerContainer}>
        <TouchableOpacity
          style={styles.fixedHeaderBanner}
          activeOpacity={0.9}
          onPress={() => scrollToActiveNode(true)}
        >
          <View style={styles.bannerLeftContent}>
            <Text style={styles.bannerSectionTitle}>SEMANA {visibleWeek}</Text>
            <Text style={styles.bannerThemeTitle} numberOfLines={1}>
              {isTrailUnlocked ? bannerWeekTheme : "Trilha Oculta 🔒"}
            </Text>
          </View>
          <View style={styles.bannerRightDivider} />
          <View style={styles.bannerRightIcon}>
            <FontAwesome5
              name={isTrailUnlocked ? "book-open" : "lock"}
              size={26}
              color="#FFF"
            />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[
          styles.scrollContainer,
          { opacity: isTrailUnlocked && !isInitialPositionSet ? 0 : 1 },
        ]}
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {!isPremium && !hasPartner && (
          <View style={styles.intelligentCard}>
            <View style={styles.intelligentCardHeader}>
              <View style={styles.intelligentCardIcon}>
                <FontAwesome5 name="gift" size={18} color="#FFF" />
              </View>
              <Text style={styles.intelligentCardTitle}>Foi convidado(a)?</Text>
            </View>
            <Text style={styles.intelligentCardSub}>
              Insira o código do seu parceiro para liberar o seu acesso Premium
              instantaneamente.
            </Text>
            <View style={styles.intelligentCardInputRow}>
              <TextInput
                style={styles.intelligentCardInput}
                placeholder="Ex: DUE-123X"
                placeholderTextColor="#AFAFAF"
                autoCapitalize="characters"
                maxLength={8}
                value={inviteCodeInput}
                onChangeText={setInviteCodeInput}
              />
              <TouchableOpacity
                style={styles.intelligentCardBtn}
                onPress={handleLinkPartnerCode}
                disabled={isMatching || inviteCodeInput.length < 5}
              >
                {isMatching ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.intelligentCardBtnText}>Ativar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.trailContainer}>
          <View style={styles.anamnesisNodeContainer}>
            {!hasCompletedAnamnesis && (
              <Animated.View
                style={[
                  styles.freeBadge,
                  {
                    transform: [{ scale: pulseAnim }],
                    pointerEvents: "none",
                  } as any,
                ]}
              >
                <Text style={styles.freeBadgeText}>GRATUITO</Text>
              </Animated.View>
            )}

            <TouchableOpacity
              style={[
                styles.anamnesisBtn,
                hasCompletedAnamnesis && styles.anamnesisBtnCompleted,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                if (hasCompletedAnamnesis) {
                  if (!isPremium) navigation.navigate("Paywall");
                  else
                    showCustomAlert(
                      "Diagnóstico Ativo",
                      "Sua avaliação foi concluída. Siga para o Check-in no mapa para cruzar os dados.",
                      "heartbeat",
                      "#1A2F3B",
                    );
                } else navigation.navigate("Anamnesis");
              }}
            >
              <FontAwesome5
                name={hasCompletedAnamnesis ? "check-double" : "heartbeat"}
                size={32}
                color="#FFF"
              />
            </TouchableOpacity>

            <Text style={styles.anamnesisTitle}>Sua Avaliação</Text>
            <Text style={styles.anamnesisSub}>
              {hasCompletedAnamnesis
                ? "Diagnóstico Concluído"
                : "Descubram a temperatura da relação"}
            </Text>
          </View>

          <View
            style={[
              styles.nodesWrapper,
              !isTrailUnlocked && styles.lockedTrailOverlay,
            ]}
            onLayout={(e) => {
              nodesWrapperY.current = e.nativeEvent.layout.y;
              if (isTrailUnlocked) scrollToActiveNode(false);
            }}
          >
            <View style={styles.specialNodeContainer}>
              <TouchableOpacity
                style={[
                  styles.startJourneyBtn,
                  !hasCompletedAnamnesis && {
                    backgroundColor: "#D1D9E0",
                    borderColor: "#F0F4F8",
                    shadowColor: "transparent",
                    elevation: 0,
                  },
                  hasCompletedAnamnesis &&
                    !isTrailUnlocked && {
                      backgroundColor: "#1A2F3B",
                      borderColor: "#2C3E50",
                      shadowColor: "#1A2F3B",
                    },
                  isTrailUnlocked && {
                    backgroundColor: "#1A2F3B",
                    borderColor: "#2C3E50",
                    shadowColor: "#1A2F3B",
                  },
                ]}
                activeOpacity={0.8}
                disabled={!hasCompletedAnamnesis}
                onPress={() => {
                  if (isTrailUnlocked) {
                    showCustomAlert(
                      "Check-in Concluído ✅",
                      "Vocês já deram o sinal verde e a jornada está ativa! Foque nas missões do mapa.",
                      "check-circle",
                      "#4BDE95",
                    );
                  } else if (!isPremium) {
                    navigation.navigate("Paywall");
                  } else {
                    setIsPitStopModalVisible(true);
                  }
                }}
              >
                <FontAwesome5
                  name={isTrailUnlocked ? "play" : "flag-checkered"}
                  size={isTrailUnlocked ? 28 : 32}
                  color={hasCompletedAnamnesis ? "#FFF" : "#D1D9E0"}
                />
              </TouchableOpacity>
              <Text style={styles.mapLabelText}>
                <FontAwesome5
                  name={isTrailUnlocked ? "check-circle" : "map-marker-alt"}
                />{" "}
                {isTrailUnlocked ? "Check-in Concluído" : "Check-in"}
              </Text>
            </View>

            {Array.from({ length: totalStepsInModule }).map((_, index) => {
              const isCompleted = isTrailUnlocked ? index < currentStep : false;
              const isNextUp = isTrailUnlocked ? index === currentStep : false;
              const isLocked = !isTrailUnlocked ? true : index > currentStep;

              const bypassDailyLock = userData?.bypassDailyLock ?? false;

              const isWaitingForTomorrow =
                isNextUp && hasCompletedTaskToday && !bypassDailyLock;
              const isActive =
                isNextUp && (!hasCompletedTaskToday || bypassDailyLock);

              const dayOfWeek = index % 7;
              const isStartOfWeek = dayOfWeek === 0;
              const weekNumber = Math.floor(index / 7) + 1;
              const isWeeklyReward = dayOfWeek === 6;
              const isDay5 = dayOfWeek === 4;

              const tasksDoneThisWeek = Math.max(
                0,
                currentStep - (weekNumber - 1) * 7,
              );
              const starsActive = Math.min(3, tasksDoneThisWeek);
              const isGoldUnlocked = starsActive >= 3;

              const translateX = Math.sin(index * 0.8) * 60;

              let nodeSize = 70 + dayOfWeek * 2;
              let iconSize = 22 + dayOfWeek * 1.5;

              let faceColor = "#D1D9E0";
              let baseColor = "#F0F4F8";
              let iconName = WEEKLY_PROGRESSION_ICONS[dayOfWeek];
              let iconColor = "#1A2F3B";

              if (isWeeklyReward) {
                nodeSize = 92;
                iconSize = 36;
                iconName = "gift";
                if (isCompleted) {
                  faceColor = "#4BDE95";
                  baseColor = "#E8F4F1";
                  iconName = "check";
                  iconColor = "#FFF";
                } else if (isActive) {
                  faceColor = "#E5A93C";
                  baseColor = "#DCA052";
                  iconColor = "#FFF";
                } else if (isWaitingForTomorrow) {
                  faceColor = "#F0F4F8";
                  baseColor = "#D1D9E0";
                  iconName = "clock";
                  iconColor = "#1A2F3B";
                } else {
                  faceColor = "#F0F4F8";
                  baseColor = "#D1D9E0";
                  iconColor = "#1A2F3B";
                }
              } else {
                if (isCompleted) {
                  faceColor = "#4BDE95";
                  baseColor = "#E8F4F1";
                  iconName = "check";
                  iconColor = "#FFF";
                } else if (isActive) {
                  faceColor = "#E5A93C";
                  baseColor = "#DCA052";
                  iconColor = "#FFF";
                } else if (isWaitingForTomorrow) {
                  faceColor = "#E8F4F1";
                  baseColor = "#D1D9E0";
                  iconName = "clock";
                  iconColor = "#1A2F3B";
                }
              }

              const ringPadding = 26;
              const ringSize = nodeSize + ringPadding;
              const ringOffset = (ringSize - nodeSize) / 2;

              return (
                <React.Fragment key={index}>
                  {isStartOfWeek && (
                    <View
                      style={styles.weekDividerContainer}
                      onLayout={(e) => {
                        weekPositions[weekNumber] =
                          e.nativeEvent.layout.y + nodesWrapperY.current;
                      }}
                    >
                      <View style={styles.dashedLine} />
                      <View style={styles.weekTextWrapper}>
                        <Text style={styles.weekTitleText}>
                          SEMANA {weekNumber}
                        </Text>
                        <Text style={[styles.weekThemeText, { minHeight: 24 }]}>
                          {isTrailUnlocked
                            ? getDisplayThemeForWeek(weekNumber)
                            : "🔒"}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View
                    style={[
                      styles.nodeWrapper,
                      {
                        width: nodeSize,
                        height: nodeSize,
                        transform: [{ translateX }],
                      },
                    ]}
                    onLayout={(e) => {
                      nodePositions[index] = e.nativeEvent.layout.y;
                    }}
                  >
                    {isNextUp && (
                      <Animated.View
                        style={{
                          position: "absolute",
                          width: ringSize,
                          height: ringSize,
                          top: -ringOffset - 2.5,
                          left: -ringOffset,
                          transform: [{ scale: ringPulseAnim }],
                          zIndex: 0,
                          pointerEvents: "none",
                        }}
                      >
                        <SegmentedRing
                          progress={currentTaskStep}
                          size={ringSize}
                        />
                      </Animated.View>
                    )}

                    <View
                      style={[
                        styles.nodeBase,
                        {
                          backgroundColor: baseColor,
                          width: nodeSize,
                          height: nodeSize,
                          borderRadius: nodeSize / 2,
                          zIndex: 1,
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() =>
                          handleOpenMission(
                            index,
                            isLocked,
                            isWaitingForTomorrow,
                            isCompleted,
                          )
                        }
                        style={({ pressed }) => [
                          styles.nodeFace,
                          {
                            backgroundColor: faceColor,
                            width: nodeSize,
                            height: nodeSize,
                            borderRadius: nodeSize / 2,
                            transform: [{ translateY: pressed ? 0 : -5 }],
                          },
                        ]}
                      >
                        {isFetchingMission && isActive ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <FontAwesome5
                            name={iconName}
                            size={iconSize}
                            color={iconColor}
                          />
                        )}
                      </Pressable>
                    </View>

                    {isActive && currentTaskStep === 0 && (
                      <View
                        style={[
                          styles.floatingHeartsContainer,
                          {
                            left: (nodeSize - 60) / 2,
                            top: -20,
                            pointerEvents: "none",
                          } as any,
                        ]}
                      >
                        <FloatingHearts />
                      </View>
                    )}

                    {isDay5 && (
                      <View
                        style={[
                          styles.goldChallengeWrapper,
                          { left: nodeSize + 30, top: (nodeSize - 60) / 2 },
                        ]}
                      >
                        {isGoldUnlocked ? (
                          <Animated.View
                            style={{ transform: [{ scale: pulseAnim }] }}
                          >
                            <TouchableOpacity
                              style={styles.goldBtnUnlocked}
                              activeOpacity={0.8}
                              onPress={() =>
                                handleOpenGoldChallenge(weekNumber)
                              }
                            >
                              <FontAwesome5
                                name="infinity"
                                solid
                                size={24}
                                color="#1A2F3B"
                              />
                            </TouchableOpacity>
                          </Animated.View>
                        ) : (
                          <TouchableOpacity
                            style={styles.goldBtnLocked}
                            activeOpacity={0.8}
                            onPress={() => {
                              showCustomAlert(
                                "Desafio de Ouro Bloqueado 🔒",
                                `Complete pelo menos 3 missões esta semana para desbloquear o Desafio de Ouro a dois.\n\nProgresso atual: ${tasksDoneThisWeek}/3`,
                                "lock",
                                "#DCA052",
                              );
                            }}
                          >
                            <FontAwesome5
                              name="lock"
                              size={20}
                              color="rgba(220, 160, 82, 0.7)"
                            />
                          </TouchableOpacity>
                        )}
                        <Text style={styles.challengeLabel}>Desafio</Text>
                        <View style={styles.challengeStarsRow}>
                          {[1, 2, 3].map((starNum) => (
                            <FontAwesome5
                              key={starNum}
                              name="infinity"
                              solid
                              size={10}
                              color={
                                starNum <= starsActive ? "#E5A93C" : "#D1D9E0"
                              }
                              style={{ marginHorizontal: 2 }}
                            />
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                </React.Fragment>
              );
            })}

            <View style={[styles.endNodeContainer, { marginTop: 40 }]}>
              <TouchableOpacity
                style={[
                  styles.endJourneyBtn,
                  isJourneyFinished && isTrailUnlocked
                    ? styles.endJourneyBtnActive
                    : styles.endJourneyBtnLocked,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  if (isTrailUnlocked && isJourneyFinished)
                    showCustomAlert(
                      "🏆 Parabéns!",
                      "Você completou os 90 dias de conexão profunda.",
                      "trophy",
                      "#E5A93C",
                    );
                  else if (hasCompletedAnamnesis && !isPremium)
                    navigation.navigate("Paywall");
                }}
              >
                <FontAwesome5
                  name="trophy"
                  size={34}
                  color={
                    isJourneyFinished && isTrailUnlocked ? "#FFF" : "#AFAFAF"
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {isTrailUnlocked && showFab && (
        <TouchableOpacity
          style={styles.floatingTargetBtn}
          onPress={() => scrollToActiveNode(true)}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="location-arrow" size={20} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* 🔥 MENU INFERIOR */}
      <View style={styles.bottomMenu}>
        <TouchableOpacity style={[styles.menuItem, styles.menuItemActive]}>
          <FontAwesome5 name="home" size={24} color="#E5A93C" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            showCustomAlert(
              "Loja em Breve! 🛍️",
              "Nesta loja você poderá trocar seus Bonds por presentes reais...",
              "store",
              "#4BDE95",
            )
          }
        >
          <FontAwesome5 name="store" size={24} color="#1A2F3B" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("Profile")}
        >
          <FontAwesome5 name="user-alt" size={24} color="#1A2F3B" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {activeMission && (
          <MissionExecutionScreen
            mission={activeMission}
            userLanguage={userLang}
            onClose={() => setIsModalVisible(false)}
            onComplete={handleCompleteMission}
            isReviewMode={isReviewMode}
          />
        )}
      </Modal>

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
                onPress={async () => {
                  setUserLang(lang.code);
                  setIsLangModalVisible(false);
                  if (currentUid)
                    await setDoc(
                      doc(db, "users", currentUid),
                      { language: lang.code },
                      { merge: true },
                    );
                }}
              >
                <Text style={styles.compactFlagText}>{lang.flag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isJourneyVideoVisible} transparent animationType="fade">
        <View style={styles.videoModalOverlay}>
          <View style={styles.videoHeaderBar}>
            <Text style={styles.videoTitleText}>Instruções da Jornada</Text>
            <TouchableOpacity
              style={styles.closeVideoBtn}
              onPress={() => setIsJourneyVideoVisible(false)}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <FontAwesome5 name="times" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.floatingVideoContainer}>
            {/* 🚀 CORREÇÃO 2: Tag de vídeo temporariamente desativada */}
            <Text
              style={{
                color: "#FFF",
                textAlign: "center",
                padding: 20,
                fontSize: 16,
              }}
            >
              O vídeo de instruções está temporariamente indisponível.
            </Text>
          </View>
        </View>
      </Modal>

      <Modal visible={isInviteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.codeModalCard}>
            <Text style={styles.codeModalTitle}>Vincular Parceiro</Text>
            <Text style={styles.codeModalSub}>
              Insira o código que você recebeu pelo WhatsApp para unir as
              contas.
            </Text>
            <TextInput
              style={styles.codeInputField}
              placeholder="Ex: DUE-123X"
              placeholderTextColor="#AFAFAF"
              autoCapitalize="characters"
              maxLength={8}
              value={inviteCodeInput}
              onChangeText={setInviteCodeInput}
            />
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleLinkPartnerCode}
              disabled={isMatching}
            >
              {isMatching ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.linkButtonText}>Avançar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelLinkButton}
              onPress={() => setIsInviteModalVisible(false)}
            >
              <Text style={styles.cancelLinkButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isNotificationsVisible} transparent animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHandle} />

            <View
              style={[
                styles.alertIconContainer,
                { backgroundColor: "#F0F4F8" },
              ]}
            >
              <FontAwesome5 name="bell" solid size={26} color="#1A2F3B" />
            </View>

            <Text style={styles.bottomSheetTitle}>Notificações</Text>

            {unreadNudges > 0 ? (
              <View style={styles.nudgeItem}>
                <FontAwesome5
                  name="hand-point-right"
                  size={24}
                  color="#E5A93C"
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.nudgeTitle}>Ei, atenção aqui!</Text>
                  <Text style={styles.nudgeText}>
                    Seu parceiro(a) te mandou{" "}
                    <Text style={{ fontWeight: "bold" }}>{unreadNudges}</Text>{" "}
                    cutucada(s)! Parece que alguém está sentindo sua falta. 👀
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.bottomSheetText}>
                Nenhuma notificação nova no momento. Está tudo tranquilo por
                aqui!
              </Text>
            )}

            <View style={{ width: "100%", marginTop: 15, gap: 10 }}>
              <TouchableOpacity
                style={[
                  styles.bottomSheetButtonPrimary,
                  { backgroundColor: "#1A2F3B" },
                ]}
                onPress={handleSendNudge}
              >
                <FontAwesome5
                  name="hand-point-right"
                  size={16}
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.bottomSheetButtonPrimaryText}>
                  Cutucar Parceiro(a)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bottomSheetButtonSecondary}
                onPress={handleCloseNudges}
              >
                <Text style={styles.bottomSheetButtonSecondaryText}>
                  Fechar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isPitStopModalVisible} transparent animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContainerLg}>
            <View style={styles.bottomSheetHandle} />
            <TouchableOpacity
              style={{ position: "absolute", top: 20, right: 20, padding: 10 }}
              onPress={() => setIsPitStopModalVisible(false)}
            >
              <FontAwesome5 name="times" size={20} color="#AFAFAF" />
            </TouchableOpacity>

            {hasPartner ? (
              <View
                style={{
                  width: "100%",
                  alignItems: "center",
                  paddingHorizontal: 10,
                }}
              >
                <Text style={styles.workflowMainTitle}>
                  Check-in do Casal 🚦
                </Text>
                <Text style={styles.workflowSubTitle}>
                  Sua conta já está conectada! Verifique o status abaixo para
                  liberar a Jornada.
                </Text>

                <View style={styles.statusBoxLg}>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>
                      Avaliação de {myName}:
                    </Text>
                    <Text style={styles.statusValue}>
                      {hasCompletedAnamnesis ? "✅ Feita" : "⏳ Pendente"}
                    </Text>
                  </View>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>
                      Avaliação de {pName}:
                    </Text>
                    <Text style={styles.statusValue}>
                      {partnerCompletedAnamnesis ? "✅ Feita" : "⏳ Pendente"}
                    </Text>
                  </View>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>
                      Sinal Verde de {myName}:
                    </Text>
                    <Text style={styles.statusValue}>
                      {iAmReady ? "✅ Dado" : "⏳ Pendente"}
                    </Text>
                  </View>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>
                      Sinal Verde de {pName}:
                    </Text>
                    <Text style={styles.statusValue}>
                      {partnerIsReady ? "✅ Dado" : "⏳ Pendente"}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.workflowMainTitle}>
                  Jornada Liberada! 🚀
                </Text>
                <Text style={styles.workflowSubTitle}>
                  Você pode fazer as atividades no{" "}
                  <Text style={{ fontWeight: "bold", color: "#E5A93C" }}>
                    Modo Solo
                  </Text>
                  , mas a transformação real acontece quando os dois participam.
                </Text>

                <View
                  style={{
                    width: "100%",
                    position: "relative",
                    marginTop: 10,
                    paddingLeft: 10,
                  }}
                >
                  <View style={styles.workflowLineVertical} />

                  <View style={styles.workflowStepModal}>
                    <View
                      style={[
                        styles.stepIconContainerModal,
                        isInviteStepCompleted
                          ? styles.stepIconSuccess
                          : styles.stepIconActive,
                      ]}
                    >
                      <FontAwesome5
                        name={isInviteStepCompleted ? "check" : "user-plus"}
                        size={16}
                        color="#FFF"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.stepTitle,
                          isInviteStepCompleted
                            ? styles.stepTextSuccess
                            : styles.stepTextActive,
                        ]}
                      >
                        {isInviteStepCompleted
                          ? "1. Convite Enviado!"
                          : "1. Enviar convite ao parceiro"}
                      </Text>

                      <View style={{ marginTop: 15, paddingRight: 10 }}>
                        {inviteSent && (
                          <Text
                            style={{
                              fontSize: 13,
                              color: "#4BDE95",
                              fontWeight: "bold",
                              marginBottom: 12,
                            }}
                          >
                            ✅ Convite enviado! Mantenha esta tela e aguarde o
                            seu parceiro(a) baixar o app e inserir o código.
                          </Text>
                        )}

                        <TouchableOpacity
                          style={styles.codeContainerMini}
                          onPress={handleCopyCode}
                        >
                          <Text style={styles.codeValueMini}>
                            {myInviteCode}
                          </Text>
                          <FontAwesome5 name="copy" size={16} color="#AFAFAF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.whatsappButtonMini}
                          onPress={handleSendInvite}
                        >
                          <FontAwesome5
                            name="whatsapp"
                            size={18}
                            color="#FFF"
                          />
                          <Text style={styles.whatsappButtonTextMini}>
                            Convidar pelo WhatsApp
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setIsInviteModalVisible(true)}
                        >
                          <Text style={styles.haveCodeLinkTextMini}>
                            Fui convidado(a) e já tenho um código
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View
                    style={[styles.workflowStepModal, { marginBottom: 10 }]}
                  >
                    <Animated.View
                      style={[
                        styles.stepIconContainerModal,
                        styles.stepIconInactive,
                        {
                          transform: !partnerIsReady
                            ? [{ scale: pulseAnim }]
                            : [{ scale: 1 }],
                        },
                      ]}
                    >
                      <FontAwesome5
                        name="hourglass-half"
                        size={16}
                        color="#AFAFAF"
                      />
                    </Animated.View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stepTitle, styles.stepTextInactive]}>
                        2. Aguardando parceiro(a)...
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            <View style={{ width: "100%", marginTop: 25, gap: 12 }}>
              {isTrailUnlocked ? (
                <TouchableOpacity
                  style={[
                    styles.bottomSheetButtonPrimary,
                    { backgroundColor: "#4BDE95" },
                  ]}
                  onPress={() => {
                    setIsPitStopModalVisible(false);
                  }}
                >
                  <FontAwesome5
                    name="play"
                    size={16}
                    color="#FFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.bottomSheetButtonPrimaryText}>
                    CONTINUAR JORNADA
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.bottomSheetButtonPrimary,
                    {
                      backgroundColor: "#4BDE95",
                      opacity: iAmReady || !hasPartner ? 0.6 : 1,
                    },
                  ]}
                  disabled={
                    iAmReady && (!partnerIsReady || !partnerCompletedAnamnesis)
                  }
                  onPress={() => {
                    if (!hasPartner) {
                      showCustomAlert(
                        "Aguardando Match",
                        "Para iniciar a jornada em casal, você precisa primeiro conectar as contas no Passo 1.",
                        "user-clock",
                        "#FF9600",
                      );
                    } else {
                      handleStartHandshake();
                    }
                  }}
                >
                  <FontAwesome5
                    name={iAmReady ? "check-circle" : "car"}
                    size={16}
                    color="#FFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.bottomSheetButtonPrimaryText}>
                    {iAmReady
                      ? "SINAL VERDE DADO ✅"
                      : "INICIAR EM CASAL (DAR SINAL VERDE)"}
                  </Text>
                </TouchableOpacity>
              )}

              {!isTrailUnlocked && !hasPartner && (
                <TouchableOpacity
                  style={styles.bottomSheetButtonSecondary}
                  onPress={confirmStartSolo}
                >
                  <FontAwesome5
                    name="user"
                    size={14}
                    color="#AFAFAF"
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.bottomSheetButtonSecondaryText,
                      { fontSize: 14 },
                    ]}
                  >
                    Seguir Carreira Solo (Sem parceiro por enquanto)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isGeneratingJourney} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color="#4BDE95"
              style={{ transform: [{ scale: 1.5 }], marginBottom: 15 }}
            />
            <Text style={styles.codeModalTitle}>Gerando sua Jornada...</Text>
            <Text style={styles.codeModalSub}>
              Estamos cruzando os dados da avaliação. Prepare-se para a largada!
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isHardResetModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHandle} />

            <View
              style={[
                styles.alertIconContainer,
                { backgroundColor: "#D96C6C20" },
              ]}
            >
              <FontAwesome5 name="eraser" size={28} color="#D96C6C" />
            </View>

            <Text style={styles.bottomSheetTitle}>Zerar Sistema?</Text>
            <Text style={styles.bottomSheetText}>
              <Text style={{ fontWeight: "bold", color: "#D96C6C" }}>
                ⚠️ MODO DE AUDITORIA:
              </Text>{" "}
              Isso apagará sua avaliação, o status premium, desconectará o
              parceiro e resetará a trilha para o Dia 0.
            </Text>

            <TouchableOpacity
              style={[
                styles.bottomSheetButtonPrimary,
                { backgroundColor: "#D96C6C", marginBottom: 10 },
              ]}
              activeOpacity={0.8}
              onPress={async () => {
                setIsHardResetModalVisible(false);
                if (currentUid) {
                  try {
                    // 1. Mostrar um alerta de carregamento
                    showCustomAlert(
                      "Limpando o Banco...",
                      "Aguarde, destruindo todos os dados desta conta.",
                      "spinner",
                      "#E5A93C",
                    );

                    // 2. Apagar a subcoleção de Diários
                    const journalsSnap = await getDocs(
                      collection(db, "users", currentUid, "journals"),
                    );
                    const deletePromises = journalsSnap.docs.map((d) =>
                      deleteDoc(d.ref),
                    );
                    await Promise.all(deletePromises);

                    // 3. Destruir o documento principal do Usuário
                    await deleteDoc(doc(db, "users", currentUid));

                    // 4. Deslogar o usuário do App
                    await auth.signOut();
                  } catch (error) {
                    // 🔥 OLHA O NOSSO ESPIÃO AQUI:
                    console.error("🕵️ ERRO REAL AO ZERAR O BANCO:", error);

                    showCustomAlert(
                      "Erro de Reset",
                      "Verifique o terminal do VS Code para ver o motivo exato!",
                      "times-circle",
                      "#D96C6C",
                    );
                  }
                }
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <FontAwesome5 name="trash-alt" size={16} color="#FFF" />
                <Text style={styles.bottomSheetButtonPrimaryText}>
                  SIM, DESTRUIR MINHA CONTA
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomSheetButtonSecondary}
              onPress={() => setIsHardResetModalVisible(false)}
            >
              <Text style={styles.bottomSheetButtonSecondaryText}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isMatchConfirmationVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.codeModalCard}>
            <Text style={styles.codeModalTitle}>É esta pessoa?</Text>
            <Text style={styles.codeModalSub}>
              Verifique se a conta abaixo pertence ao seu amor.
            </Text>

            <View style={{ alignItems: "center", marginBottom: 25 }}>
              {hasPendingPhoto ? (
                <Image
                  source={{ uri: pendingPhoto }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    marginBottom: 15,
                    borderWidth: 3,
                    borderColor: "#1A2F3B",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: "#F0F4F8",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 15,
                  }}
                >
                  <FontAwesome5 name="user-alt" size={30} color="#1A2F3B" />
                </View>
              )}
              <Text
                style={{ fontSize: 20, fontWeight: "900", color: "#1A2F3B" }}
              >
                {pendingMatchPartner?.data?.billingFirstName &&
                pendingMatchPartner?.data?.billingLastName
                  ? `${pendingMatchPartner.data.billingFirstName} ${pendingMatchPartner.data.billingLastName}`
                  : pendingMatchPartner?.data?.displayName ||
                    pendingMatchPartner?.data?.email?.split("@")[0] ||
                    "Usuário Misterioso"}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: "#4BDE95" }]}
              onPress={confirmMatchCode}
            >
              <Text style={styles.linkButtonText}>Sim, Conectar!</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelLinkButton}
              onPress={() => {
                setIsMatchConfirmationVisible(false);
                setPendingMatchPartner(null);
                setInviteCodeInput("");
              }}
            >
              <Text style={styles.cancelLinkButtonText}>
                Não, errei o código
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isMatchAnimationVisible} transparent animationType="fade">
        <View
          style={[
            styles.modalOverlayCenter,
            { backgroundColor: "rgba(26, 47, 59, 0.95)" },
          ]}
        >
          <Text
            style={{
              color: "#FFF",
              fontSize: 24,
              fontWeight: "900",
              marginBottom: 50,
              letterSpacing: 1,
            }}
          >
            Conectando Almas...
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    translateX: matchAnimTranslateX.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 45],
                    }),
                  },
                ],
                zIndex: 5,
              }}
            >
              {userPhoto ? (
                <Image
                  source={{ uri: userPhoto }}
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    borderWidth: 4,
                    borderColor: "#FFF",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    backgroundColor: "#FFF",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 4,
                    borderColor: "#FFF",
                  }}
                >
                  <FontAwesome5 name="user-alt" size={35} color="#1A2F3B" />
                </View>
              )}
            </Animated.View>

            <Animated.View
              style={{
                transform: [{ scale: matchHeartScale }],
                zIndex: 10,
                marginHorizontal: -15,
              }}
            >
              <View
                style={{
                  backgroundColor: "#FFF",
                  padding: 15,
                  borderRadius: 30,
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowRadius: 10,
                  elevation: 10,
                }}
              >
                <FontAwesome5 name="heart" solid size={35} color="#E5A93C" />
              </View>
            </Animated.View>

            <Animated.View
              style={{
                transform: [
                  {
                    translateX: matchAnimTranslateX.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -45],
                    }),
                  },
                ],
                zIndex: 5,
              }}
            >
              {hasPendingPhoto ? (
                <Image
                  source={{ uri: pendingPhoto }}
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    borderWidth: 4,
                    borderColor: "#FFF",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    backgroundColor: "#FFF",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 4,
                    borderColor: "#FFF",
                  }}
                >
                  <FontAwesome5 name="user-alt" size={35} color="#1A2F3B" />
                </View>
              )}
            </Animated.View>
          </View>

          <Text
            style={{
              color: "#FFF",
              fontSize: 16,
              fontWeight: "bold",
              marginTop: 50,
              opacity: 0.8,
            }}
          >
            A mágica está acontecendo no servidor...
          </Text>
        </View>
      </Modal>

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

            {customAlert.onConfirm ? (
              <View style={{ width: "100%", gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.bottomSheetButtonPrimary,
                    { backgroundColor: customAlert.color },
                  ]}
                  onPress={() => {
                    setCustomAlert({ ...customAlert, visible: false });
                    customAlert.onConfirm();
                  }}
                >
                  <Text style={styles.bottomSheetButtonPrimaryText}>
                    {customAlert.confirmText || "Continuar"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bottomSheetButtonSecondary}
                  onPress={() =>
                    setCustomAlert({ ...customAlert, visible: false })
                  }
                >
                  <Text style={styles.bottomSheetButtonSecondaryText}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.bottomSheetButtonPrimary,
                  { backgroundColor: customAlert.color, marginTop: 10 },
                ]}
                onPress={() =>
                  setCustomAlert({ ...customAlert, visible: false })
                }
              >
                <Text style={styles.bottomSheetButtonPrimaryText}>Entendi</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8", width: "100%" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "#FFF",
    width: "100%",
  },
  miniAvatarsContainer: { flexDirection: "row", alignItems: "center" },
  miniAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  miniPartnerAvatar: { marginLeft: -12, backgroundColor: "#E8F4F1" },
  avatarImage: { width: "100%", height: "100%" },
  topBarItem: { flexDirection: "row", alignItems: "center", gap: 4 },

  notificationBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#D96C6C",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  notificationBadgeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  nudgeItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F4F1",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#4BDE95",
    width: "100%",
    marginBottom: 10,
  },
  nudgeTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1A2F3B",
    marginBottom: 2,
  },
  nudgeText: {
    fontSize: 13,
    color: "#2C3E50",
    lineHeight: 18,
  },

  flagEmoji: { fontSize: 22 },
  topBarText: { fontSize: 16, fontWeight: "900" },
  fixedHeaderBannerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 2,
    borderBottomColor: "#D1D9E0",
    zIndex: 10,
    width: "100%",
  },
  fixedHeaderBanner: {
    backgroundColor: "#1A2F3B",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerLeftContent: { flex: 1, paddingRight: 10 },
  bannerSectionTitle: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  bannerThemeTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "bold",
    minHeight: 24,
  },
  bannerRightDivider: {
    width: 1.5,
    height: "80%",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 12,
  },
  bannerRightIcon: {
    paddingLeft: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: { flex: 1, width: "100%", overflow: "hidden" },
  scrollContent: {
    width: "100%",
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 140,
  },

  intelligentCard: {
    width: "85%",
    backgroundColor: "#E8F4F1",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#4BDE95",
    marginBottom: 10,
    shadowColor: "#4BDE95",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  intelligentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  intelligentCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1A2F3B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  intelligentCardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1A2F3B",
  },
  intelligentCardSub: {
    fontSize: 13,
    color: "#2C3E50",
    marginBottom: 15,
    lineHeight: 18,
  },
  intelligentCardInputRow: {
    flexDirection: "row",
    gap: 10,
  },
  intelligentCardInput: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 15,
    fontWeight: "bold",
    color: "#1A2F3B",
    borderWidth: 1,
    borderColor: "#4BDE95",
    textAlign: "center",
    letterSpacing: 2,
  },
  intelligentCardBtn: {
    backgroundColor: "#1A2F3B",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  intelligentCardBtnText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 14,
  },

  anamnesisNodeContainer: {
    alignItems: "center",
    marginVertical: 35,
    position: "relative",
  },
  freeBadge: {
    position: "absolute",
    top: -15,
    zIndex: 10,
    backgroundColor: "#E5A93C",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  freeBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  anamnesisBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#1A2F3B",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1A2F3B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: "#F0F4F8",
  },
  anamnesisBtnCompleted: {
    backgroundColor: "#4BDE95",
    borderColor: "#E8F4F1",
    shadowColor: "#4BDE95",
  },
  anamnesisTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "900",
    color: "#1A2F3B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  anamnesisSub: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
  },

  nodesWrapper: { width: "100%", alignItems: "center" },
  lockedTrailOverlay: { opacity: 0.35 },
  specialNodeContainer: { alignItems: "center", marginBottom: 35 },
  startJourneyBtn: {
    width: 75,
    height: 75,
    borderRadius: 24,
    backgroundColor: "#1A2F3B",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 3,
    borderColor: "#F0F4F8",
  },

  activeCheckinBadge: {
    backgroundColor: "#E5A93C",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: "#E5A93C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },

  mapLabelText: {
    marginTop: 10,
    fontWeight: "bold",
    color: "#2C3E50",
    fontSize: 13,
    textTransform: "uppercase",
    textAlign: "center",
    padding: 5,
  },

  goldChallengeWrapper: {
    position: "absolute",
    alignItems: "center",
    zIndex: 50,
  },
  goldBtnUnlocked: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E5A93C",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#E5A93C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  goldBtnLocked: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(220, 160, 82, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(220, 160, 82, 0.5)",
  },
  challengeLabel: {
    marginTop: 8,
    fontWeight: "bold",
    color: "#2C3E50",
    fontSize: 12,
    textTransform: "uppercase",
    textAlign: "center",
  },
  challengeStarsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
  },

  endNodeContainer: { alignItems: "center", marginVertical: 30 },
  endJourneyBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 4,
  },
  endJourneyBtnLocked: { backgroundColor: "#D1D9E0", borderColor: "#F0F4F8" },
  endJourneyBtnActive: { backgroundColor: "#E5A93C", borderColor: "#FFF9E6" },
  weekDividerContainer: {
    width: "85%",
    alignSelf: "center",
    marginTop: 30,
    marginBottom: 35,
    alignItems: "center",
  },
  dashedLine: {
    width: "100%",
    height: 1,
    borderWidth: 1.5,
    borderColor: "#D1D9E0",
    borderStyle: "dashed",
    borderRadius: 1,
    marginBottom: 16,
  },
  weekTextWrapper: { alignItems: "center", justifyContent: "center" },
  weekTitleText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2C3E50",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  weekThemeText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1A2F3B",
    textAlign: "center",
  },
  trailContainer: { width: "100%", alignItems: "center", paddingVertical: 10 },
  nodeWrapper: {
    marginBottom: 40,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  floatingHeartsContainer: {
    position: "absolute",
    width: 60,
    height: 60,
    zIndex: 99,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  nodeBase: {
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  nodeFace: {
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 1,
  },

  floatingTargetBtn: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#1A2F3B",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1A2F3B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 100,
  },

  bottomMenu: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 25 : 10,
    borderTopWidth: 2,
    borderTopColor: "#D1D9E0",
  },
  menuItem: {
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    width: 60,
    height: 50,
  },
  menuItemActive: {
    backgroundColor: "#F0F4F8",
    borderWidth: 2,
    borderColor: "#1A2F3B",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(26, 47, 59, 0.3)",
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
    marginTop: 60,
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
    borderColor: "#1A2F3B",
  },
  compactFlagText: { fontSize: 28 },
  videoModalOverlay: { flex: 1, backgroundColor: "rgba(26,47,59,0.92)" },
  floatingVideoContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  videoHeaderBar: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 100,
  },
  videoTitleText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  closeVideoBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenVideo: { width: "100%", height: "100%" },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(26,47,59,0.7)",
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
    fontWeight: "900",
    color: "#1A2F3B",
    marginBottom: 10,
  },
  codeModalSub: {
    fontSize: 14,
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 20,
  },
  codeInputField: {
    width: "100%",
    backgroundColor: "#F0F4F8",
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 20,
    color: "#1A2F3B",
  },
  linkButton: {
    backgroundColor: "#E5A93C",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  linkButtonText: { color: "#1A2F3B", fontSize: 16, fontWeight: "bold" },
  cancelLinkButton: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelLinkButtonText: { color: "#60646C", fontSize: 14, fontWeight: "bold" },

  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(26,47,59,0.6)",
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
  bottomSheetContainerLg: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    alignItems: "center",
    width: "100%",
    minHeight: 450,
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
    fontWeight: "900",
    color: "#1A2F3B",
    marginBottom: 10,
    textAlign: "center",
  },
  bottomSheetText: {
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
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  bottomSheetButtonSecondary: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetButtonSecondaryText: {
    color: "#2C3E50",
    fontSize: 16,
    fontWeight: "bold",
  },

  workflowMainTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1A2F3B",
    textAlign: "center",
    marginBottom: 8,
  },
  workflowSubTitle: {
    fontSize: 14,
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 20,
  },
  workflowLineVertical: {
    position: "absolute",
    left: 28,
    top: 35,
    bottom: 45,
    width: 2,
    backgroundColor: "#D1D9E0",
    zIndex: 0,
  },
  workflowStepModal: {
    flexDirection: "row",
    marginBottom: 25,
    zIndex: 1,
  },
  stepIconContainerModal: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 15,
  },
  stepIconActive: { backgroundColor: "#1A2F3B" },
  stepIconSuccess: { backgroundColor: "#4BDE95" },
  stepIconInactive: {
    backgroundColor: "#F0F4F8",
    borderWidth: 1,
    borderColor: "#D1D9E0",
    elevation: 0,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1A2F3B",
    marginTop: 8,
  },
  stepTextSuccess: { color: "#4BDE95" },
  stepTextActive: { color: "#1A2F3B" },
  stepTextInactive: { color: "#60646C" },
  stepDoneText: { fontSize: 13, color: "#2C3E50", marginTop: 4 },

  statusBoxLg: {
    backgroundColor: "#F0F4F8",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D9E0",
    width: "100%",
    marginTop: 15,
    gap: 10,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 14,
    color: "#2C3E50",
    fontWeight: "bold",
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1A2F3B",
  },

  statusBox: {
    backgroundColor: "#F0F4F8",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#D1D9E0",
  },
  statusBoxText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1A2F3B",
    marginVertical: 3,
  },
  codeContainerMini: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D9E0",
    marginBottom: 10,
  },
  codeValueMini: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1A2F3B",
    letterSpacing: 2,
  },
  whatsappButtonMini: {
    flexDirection: "row",
    backgroundColor: "#25D366",
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  whatsappButtonTextMini: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  haveCodeLinkTextMini: {
    color: "#1A2F3B",
    fontWeight: "bold",
    fontSize: 13,
    textAlign: "center",
    textDecorationLine: "underline",
  },

  loadingCard: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
});
