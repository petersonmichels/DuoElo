import { FontAwesome5 } from "@expo/vector-icons";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import {
  collection,
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
  Animated,
  AppState,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { MasterPasswordModal } from "../components/MasterPasswordModal";
import { NotificationsModal } from "../components/NotificationsModal";
import { auth, db } from "../config/firebase";
import { t } from "../i18n/translations";
import { scheduleDailyReminder } from "../services/notificationService";
import {
  isSessionUnlocked,
  lockSession,
} from "../services/securityService";
import MissionExecutionScreen from "./MissionExecutionScreen";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch (e) {}

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {}
}

async function sendPushNotificationDirectly(
  expoPushToken: string,
  title: string,
  body: string
) {
  if (!expoPushToken || isExpoGo) return;

  const message = {
    to: expoPushToken,
    sound: "default",
    title: title,
    body: body,
    badge: 1,
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
  } catch (error) {}
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (isExpoGo || !Notifications) return null;

  let token: string | null = null;
  try {
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
      if (finalStatus !== "granted") return null;

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      if (!projectId)
        token = (await Notifications.getExpoPushTokenAsync()).data;
      else
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    }
  } catch (e) {}
  return token;
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
            stroke={isLit ? "#EAB64A" : "#D1D9E0"}
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
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const a1 = createHeartAnim(anim1, 0);
    const a2 = createHeartAnim(anim2, 700);
    const a3 = createHeartAnim(anim3, 1400);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [anim1, anim2, anim3]);

  const renderIcon = (
    anim: Animated.Value,
    left: number,
    size: number,
    iconName: "heart" | "fire",
    color: string
  ) => {
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
        <FontAwesome5 name={iconName} solid size={size} color={color} />
      </Animated.View>
    );
  };

  return (
    <>
      {renderIcon(anim1, -15, 16, "heart", "#D96C6C")}
      {renderIcon(anim2, 10, 18, "fire", "#EAB64A")}
      {renderIcon(anim3, -5, 14, "heart", "#D96C6C")}
    </>
  );
};

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

  const anamnesisYRef = useRef<number>(0);
  const matchYRef = useRef<number>(120);
  const playYRef = useRef<number>(240);

  const fabVisibleRef = useRef(false);
  const [showFab, setShowFab] = useState(false);

  const [activeMission, setActiveMission] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [fetchingStepIndex, setFetchingStepIndex] = useState<number | string | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);

  const [userLang, setUserLang] = useState("pt-BR");
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);

  // 🔔 ESTADOS DAS NOTIFICAÇÕES (USANDO COMPONENTE ISOLADO)
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const [isMasterPasswordModalVisible, setIsMasterPasswordModalVisible] = useState(false);
  const [pendingMissionStepIndex, setPendingMissionStepIndex] = useState<number | null>(null);

  const [isGeneratingJourney, setIsGeneratingJourney] = useState(false);

  const triggerHaptic = (
    type:
      | "light"
      | "medium"
      | "heavy"
      | "success"
      | "warning"
      | "error" = "light"
  ) => {
    if (!Haptics || userData?.enableHaptics === false) return;
    try {
      if (type === "light")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === "medium")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (type === "heavy")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (type === "success")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === "warning")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      else if (type === "error")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {}
  };

  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "info-circle",
    color: "#202D3A",
    confirmText: "",
    onConfirm: null as any,
    secondaryText: "",
    onSecondary: null as any,
  });

  const showCustomAlert = (
    title: string,
    message: string,
    icon = "info-circle",
    color = "#202D3A",
    confirmText = "",
    onConfirm: any = null,
    secondaryText = "",
    onSecondary: any = null
  ) => {
    triggerHaptic("warning");
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

  const scrollViewRef = useRef<ScrollView>(null);
  const totalStepsInModule = 90;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringPulseAnim = useRef(new Animated.Value(1)).current;
  const logoPulseAnim = useRef(new Animated.Value(1)).current;

  const currentTaskStep = userData?.currentTaskStep || 0;

  const today = new Date();
  const lastTaskDateObj = userData?.lastTaskDate
    ? new Date(userData.lastTaskDate)
    : null;
  const hasCompletedTaskToday = Boolean(
    lastTaskDateObj &&
      lastTaskDateObj.getDate() === today.getDate() &&
      lastTaskDateObj.getMonth() === today.getMonth() &&
      lastTaskDateObj.getFullYear() === today.getFullYear()
  );
  const bypassDailyLock = Boolean(userData?.bypassDailyLock);

  const rawPhaseStep = (userData?.currentPhase || 1) - 1;
  const nextAvailableStep = Math.min(
    totalStepsInModule - 1,
    Math.max(0, rawPhaseStep)
  );

  const currentStep = nextAvailableStep;
  const isJourneyFinished = currentStep >= totalStepsInModule;

  // 🔔 LISTENER DE MENSAGENS NÃO LIDADAS PARA O BADGE DO SININHO
  useEffect(() => {
    if (!currentUid) return;

    const notifQuery = query(
      collection(db, "users", currentUid, "notifications"),
      where("read", "==", false)
    );

    const unsubscribeNotifs = onSnapshot(notifQuery, (snapshot) => {
      setHasUnreadNotifications(!snapshot.empty);
    });

    return () => unsubscribeNotifs();
  }, [currentUid]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoPulseAnim, {
          toValue: 1.0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [logoPulseAnim]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        lockSession();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUid(user?.uid || null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUid) {
      setUserData(null);
      setPartnerData(null);
      setLoading(false);
      return;
    }

    let unsubscribeUser: () => void;

    const timer = setTimeout(() => {
      registerForPushNotificationsAsync().then(async (token: string | null) => {
        if (token && auth.currentUser) {
          try {
            await setDoc(
              doc(db, "users", currentUid),
              { pushToken: token },
              { merge: true }
            );
          } catch (e) {}
        }
      });

      unsubscribeUser = onSnapshot(
        doc(db, "users", currentUid),
        (docSnap) => {
          if (!auth.currentUser) return;
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            if (data.language) {
              setUserLang(data.language);
              scheduleDailyReminder(data.language, 20, 0);
            }
          }
          setLoading(false);
        },
        (error) => {
          if (error.code === "permission-denied") {
            console.log("[HomeScreen] Listener de usuário encerrado.");
          }
        }
      );
    }, 50);

    return () => {
      clearTimeout(timer);
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [currentUid]);

  useEffect(() => {
    if (currentUid && userData && !userData.myInviteCode) {
      const generatedCode = currentUid.substring(0, 6).toUpperCase();
      setDoc(
        doc(db, "users", currentUid),
        { myInviteCode: generatedCode },
        { merge: true }
      ).catch(() => {});
    }
  }, [currentUid, userData]);

  useEffect(() => {
    if (!userData?.partnerId || !auth.currentUser) {
      setPartnerData(null);
      return;
    }
    let unsubscribePartner: () => void;

    const timer = setTimeout(() => {
      unsubscribePartner = onSnapshot(
        doc(db, "users", userData.partnerId),
        (docSnap) => {
          if (!auth.currentUser) return;
          if (docSnap.exists()) setPartnerData(docSnap.data());
        },
        (error) => {
          if (error.code === "permission-denied") {
            console.log("[HomeScreen] Listener de parceiro encerrado.");
          }
        }
      );
    }, 50);

    return () => {
      clearTimeout(timer);
      if (unsubscribePartner) unsubscribePartner();
    };
  }, [userData?.partnerId]);

  useEffect(() => {
    if (!userData) return;
    let isMounted = true;

    const fetchWeekThemes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "weeks"));
        const themes: any = {};
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const weekNum = Number(
            data.weekNumber || data.week || docSnap.id.replace(/\D/g, "")
          );
          const themeData = data.translations || data.theme || data.title || data.topic;
          if (!isNaN(weekNum) && themeData) themes[weekNum] = themeData;
        });
        if (isMounted) setWeekThemes(themes);
      } catch (error) {}
    };

    const timer = setTimeout(() => {
      fetchWeekThemes();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
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
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(ringPulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim, pulseAnim, ringPulseAnim]);

  const hasCompletedAnamnesis = Boolean(userData?.hasCompletedAnamnesis);
  const partnerCompletedAnamnesis = Boolean(partnerData?.hasCompletedAnamnesis);

  const myIsPremium = Boolean(userData?.isPremium);

  const partnerIsPremium = Boolean(partnerData?.isPremium);
  const partnerPlanType = partnerData?.planType || (partnerData?.activeProductId?.includes("_duo_") ? "duo" : "solo");

  const isPremium =
    myIsPremium || (partnerIsPremium && partnerPlanType === "duo");

  const hasPartner = Boolean(userData?.partnerId);
  const isSoloMode = Boolean(userData?.isSoloMode);
  const iAmReady = Boolean(
    userData?.isReadyToStart || userData?.hasPressedPlay || (userData?.currentPhase || 1) > 1
  );
  const partnerIsReady = Boolean(
    partnerData?.isReadyToStart || partnerData?.hasPressedPlay || (partnerData?.currentPhase || 1) > 1
  );

  const isMatchOrSoloDone = hasPartner || isSoloMode;

  const isTrailUnlocked =
    hasCompletedAnamnesis &&
    isPremium &&
    (iAmReady || partnerIsReady) &&
    (isSoloMode || !hasPartner || partnerCompletedAnamnesis || partnerIsReady);

  const getTargetStepIndex = () => {
    return nextAvailableStep;
  };

  const getActiveNodeScrollY = (): number | null => {
    if (isTrailUnlocked) {
      const targetStep = getTargetStepIndex();
      const rawY = nodePositions[targetStep];
      if (rawY !== undefined && rawY !== null && rawY >= 0) {
        return Math.max(0, rawY + nodesWrapperY.current - SCREEN_HEIGHT / 3);
      }
    } else {
      if (!hasCompletedAnamnesis) return Math.max(0, anamnesisYRef.current);
      if (!isMatchOrSoloDone) return Math.max(0, matchYRef.current);
      return Math.max(0, playYRef.current);
    }
    return null;
  };

  const executeScrollToTarget = (animated = true) => {
    const targetScrollY = getActiveNodeScrollY();
    if (scrollViewRef.current && targetScrollY !== null) {
      scrollViewRef.current.scrollTo({ y: targetScrollY, animated });
      setShowFab(false);
      fabVisibleRef.current = false;
    }
  };

  const scrollToActiveNode = (animated = true) => {
    let attempts = 0;
    const performScroll = () => {
      const targetScrollY = getActiveNodeScrollY();
      if (scrollViewRef.current && targetScrollY !== null) {
        requestAnimationFrame(() => {
          scrollViewRef.current?.scrollTo({ y: targetScrollY, animated });
          setShowFab(false);
          fabVisibleRef.current = false;
        });
      } else if (attempts < 25) {
        attempts++;
        setTimeout(performScroll, 80);
      }
    };
    performScroll();
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      setTimeout(() => scrollToActiveNode(true), 200);
      setTimeout(() => scrollToActiveNode(true), 500);
    });
    return unsubscribe;
  }, [navigation, isTrailUnlocked, nextAvailableStep, userData?.currentPhase]);

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

    const targetScrollY = getActiveNodeScrollY();
    if (targetScrollY !== null) {
      const distance = Math.abs(offsetY - targetScrollY);
      const shouldShow = distance > 300;

      if (shouldShow !== fabVisibleRef.current) {
        fabVisibleRef.current = shouldShow;
        setShowFab(shouldShow);
      }
    }
  };

  const getFirstName = (data?: any) => {
    if (data?.billingFirstName) return data.billingFirstName;
    if (data?.firstName) return data.firstName;
    if (data?.displayName) return data.displayName.split(" ")[0];
    return null;
  };

  const pName =
    getFirstName(partnerData) ||
    partnerData?.email?.split("@")[0] ||
    t("partner_default_name", userLang) ||
    "Seu Amor";

  const generateTrailMatrix = async (
    uid: string,
    partnerId: string | null,
    isSolo: boolean
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

      let isSecondaryPartner = false;
      if (!isSolo && partnerId) {
        isSecondaryPartner = uid > partnerId;
      }

      for (let i = 0; i < allTasks.length; i += 5) {
        let chunk = allTasks.slice(i, i + 5).map((t) => t.day);

        if (isSecondaryPartner && chunk.length > 1) {
          const firstTask = chunk.shift();
          if (firstTask !== undefined) {
            chunk.push(firstTask);
          }
        }
        myPersonalTrail.push(...chunk);
      }

      return myPersonalTrail;
    } catch (error) {
      return Array.from({ length: 90 }, (_, i) => i + 1);
    }
  };

  const handleStartSolo = async () => {
    setIsGeneratingJourney(true);

    if (currentUid) {
      const personalTrail = userData?.myTrail && userData.myTrail.length > 0 
        ? userData.myTrail 
        : await generateTrailMatrix(currentUid, null, true);
      try {
        await setDoc(
          doc(db, "users", currentUid),
          {
            isReadyToStart: true,
            hasPressedPlay: true,
            anamnesisLocked: true,
            myTrail: personalTrail,
          },
          { merge: true }
        );
      } catch (e) {}
    }

    setTimeout(async () => {
      setIsGeneratingJourney(false);
      triggerHaptic("success");
      showCustomAlert(
        t("solo_journey_generated_title", userLang) || "Jornada Gerada!",
        t("solo_journey_generated_msg", userLang) || "Sua jornada solo foi configurada com sucesso.",
        "check-circle",
        "#67D4A8"
      );
    }, 2000);
  };

  const handleStartHandshake = async () => {
    if (!currentUid) return;
    setIsGeneratingJourney(true);

    const targetPartnerId = userData?.partnerId || partnerData?.id || null;

    try {
      if (partnerIsReady && partnerCompletedAnamnesis) {
        const myTrail = userData?.myTrail && userData.myTrail.length > 0 
          ? userData.myTrail 
          : await generateTrailMatrix(currentUid, targetPartnerId, false);

        await setDoc(
          doc(db, "users", currentUid),
          {
            isReadyToStart: true,
            hasPressedPlay: true,
            isSoloMode: false,
            anamnesisLocked: true,
            myTrail: myTrail,
          },
          { merge: true }
        );

        if (targetPartnerId) {
          const partnerTrail = partnerData?.myTrail && partnerData.myTrail.length > 0
            ? partnerData.myTrail
            : await generateTrailMatrix(targetPartnerId, currentUid, false);

          await setDoc(
            doc(db, "users", targetPartnerId),
            {
              isReadyToStart: true,
              hasPressedPlay: true,
              isSoloMode: false,
              anamnesisLocked: true,
              myTrail: partnerTrail,
            },
            { merge: true }
          );
        }

        if (partnerData?.pushToken) {
          sendPushNotificationDirectly(
            partnerData.pushToken,
            t("push_journey_unlocked_title", userLang) || "Jornada Desbloqueada!",
            t("push_journey_unlocked_body", userLang) || "Sua jornada a dois começou!"
          );
        }

        triggerHaptic("success");
        showCustomAlert(
          t("start_authorized_title", userLang) || "Jornada Iniciada!",
          t("start_authorized_msg", userLang) || "O elo foi firmado com sucesso!",
          "flag-checkered",
          "#67D4A8"
        );
      } else {
        await setDoc(
          doc(db, "users", currentUid),
          {
            isReadyToStart: true,
            hasPressedPlay: true,
            anamnesisLocked: true,
          },
          { merge: true }
        );

        if (partnerData?.pushToken) {
          sendPushNotificationDirectly(
            partnerData.pushToken,
            t("push_green_light_title", userLang) || "Sinal Verde Dado!",
            t("push_green_light_body", userLang) || "Seu amor deu play na jornada!"
          );
        }

        triggerHaptic("medium");
        showCustomAlert(
          t("green_light_given_title", userLang) || "Sinal Verde Dado",
          t("green_light_given_msg", userLang, { name: pName }) || `Aguardando ${pName} para dar o play juntos.`,
          "hourglass-half",
          "#EAB64A"
        );
      }
    } catch (e) {
      showCustomAlert(
        t("error_title", userLang) || "Erro",
        t("error_try_again", userLang) || "Erro ao iniciar. Tente novamente.",
        "times-circle",
        "#D96C6C"
      );
    } finally {
      setIsGeneratingJourney(false);
    }
  };

  const handlePolitePlayTrigger = () => {
    triggerHaptic("medium");

    if (!isPremium) {
      showCustomAlert(
        t("plan_required_title", userLang) || "Plano Necessário",
        t("plan_required_msg", userLang) || "Assine para desbloquear sua jornada completa.",
        "lock",
        "#EAB64A",
        t("btn_see_plans", userLang) || "Ver Planos",
        () => navigation.navigate("PaywallScreen"),
        t("btn_not_now", userLang) || "Agora Não",
        () => {}
      );
      return;
    }

    if (!hasCompletedAnamnesis) {
      showCustomAlert(
        t("relationship_compass_title", userLang) || "Bússola do Relacionamento",
        t("relationship_compass_msg", userLang) || "Responda à Anamnese antes de dar o Play.",
        "heartbeat",
        "#202D3A",
        t("btn_answer_mapping", userLang) || "Responder",
        () => navigation.navigate("AnamneseScreen"),
        t("btn_use_default_profile", userLang) || "Usar Padrão",
        async () => {
          if (!currentUid) return;

          try {
            setIsGeneratingJourney(true);

            await setDoc(
              doc(db, "users", currentUid),
              { hasCompletedAnamnesis: true, profileType: "standard_default" },
              { merge: true }
            );

            if (hasPartner) {
              if (!partnerCompletedAnamnesis) {
                setIsGeneratingJourney(false);
                showCustomAlert(
                  t("waiting_partner_title", userLang) || "Aguardando o Amor ⏳",
                  t("waiting_partner_msg", userLang, { name: pName }) || `${pName} ainda está preenchendo a avaliação inicial.`,
                  "hourglass-half",
                  "#EAB64A",
                  t("btn_understand", userLang) || "Entendi"
                );
                return;
              }
              await handleStartHandshake();
            } else if (isSoloMode) {
              await handleStartSolo();
            } else {
              await setDoc(
                doc(db, "users", currentUid),
                { isSoloMode: true },
                { merge: true }
              );
              await handleStartSolo();
            }
          } catch (error) {
            setIsGeneratingJourney(false);
            showCustomAlert(
              t("connection_error_title", userLang) || "Erro de Conexão",
              t("connection_error_msg", userLang) || "Não foi possível conectar ao servidor.",
              "times-circle",
              "#D96C6C"
            );
          }
        }
      );
      return;
    }

    if (hasPartner) {
      if (!partnerCompletedAnamnesis) {
        showCustomAlert(
          t("waiting_partner_title", userLang) || "Aguardando o Amor ⏳",
          t("waiting_partner_msg", userLang, { name: pName }) || `${pName} ainda está preenchendo a avaliação inicial.`,
          "hourglass-half",
          "#EAB64A",
          t("btn_understand", userLang) || "Entendi"
        );
        return;
      }
      handleStartHandshake();
    } else if (isSoloMode) {
      handleStartSolo();
    } else {
      showCustomAlert(
        t("better_together_title", userLang) || "Melhor Juntos",
        t("better_together_msg", userLang) || "Deseja convidar seu parceiro ou continuar em modo solo?",
        "user-friends",
        "#EAB64A",
        t("btn_send_invite", userLang) || "Conectar Amor",
        () => navigation.navigate("Match"),
        t("btn_continue_solo", userLang) || "Continuar Solo",
        async () => {
          if (currentUid) {
            await setDoc(
              doc(db, "users", currentUid),
              { isSoloMode: true },
              { merge: true }
            );
            handleStartSolo();
          }
        }
      );
    }
  };

  const handleOpenMission = async (
    stepIndex: number,
    isActuallyLocked: boolean,
    isWaiting: boolean,
    isCompleted: boolean
  ) => {
    triggerHaptic("light");

    if (!hasCompletedAnamnesis) {
      showCustomAlert(
        t("assessment_pending_title", userLang) || "Diagnóstico Pendente",
        t("assessment_pending_msg", userLang) || "Preencha a Anamnese para desbloquear as tarefas.",
        "clipboard-list",
        "#EAB64A"
      );
      navigation.navigate("AnamneseScreen");
      return;
    }

    if (!isPremium) {
      showCustomAlert(
        t("sub_required_title", userLang) || "Assinatura Necessária",
        t("sub_required_msg", userLang) || "Assine para acessar as tarefas da jornada.",
        "lock",
        "#EAB64A",
        t("btn_see_plans", userLang) || "Ver Planos",
        () => navigation.navigate("PaywallScreen"),
        t("btn_not_now", userLang) || "Agora Não",
        () => {}
      );
      return;
    }

    if (isActuallyLocked) return;

    if (isWaiting && !isCompleted) {
      showCustomAlert(
        t("all_in_good_time_title", userLang) || "Tudo a Seu Tempo",
        t("all_in_good_time_msg", userLang) || "A próxima missão estará disponível amanhã!",
        "hourglass-half",
        "#202D3A"
      );
      return;
    }

    if (!isSessionUnlocked()) {
      setIsReviewMode(Boolean(isCompleted));
      setPendingMissionStepIndex(stepIndex);
      setIsMasterPasswordModalVisible(true);
      return; 
    }

    await executeMissionFetch(stepIndex, isCompleted);
  };

  const executeMissionFetch = async (stepIndex: number, isCompleted: boolean) => {
    setFetchingStepIndex(stepIndex);
    try {
      const phaseToFetch = userData?.myTrail
        ? userData.myTrail[stepIndex]
        : stepIndex + 1;

      let q = query(
        collection(db, "tasks"),
        where("language", "==", userLang),
        where("day", "==", phaseToFetch)
      );
      let querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        q = query(
          collection(db, "tasks"),
          where("language", "==", "pt-BR"),
          where("day", "==", phaseToFetch)
        );
        querySnapshot = await getDocs(q);
      }

      if (!querySnapshot.empty) {
        const requiredScope = hasPartner ? "bilateral" : "unilateral";
        let missionsList = querySnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        let pool = missionsList.filter(
          (m: any) => m.scope === requiredScope || !m.scope
        );
        if (pool.length === 0) pool = missionsList;

        let selectedIndex = 0;
        let isSecondary = false;

        if (hasPartner && currentUid && userData?.partnerId) {
          isSecondary = currentUid > userData.partnerId;
          if (isSecondary && pool.length > 1) {
            selectedIndex = 1;
          }
        }

        let rawMission: any = pool[selectedIndex] || pool[0];

        let matchedMission = { ...rawMission, displayPhase: stepIndex + 1 };

        if (isSecondary && pool.length === 1 && hasPartner) {
          matchedMission = {
            ...rawMission,
            displayPhase: stepIndex + 1,
            title:
              rawMission.partnerTitle ||
              rawMission.title ||
              t("your_mission_part_title", userLang) ||
              "Sua Parte da Missão",
            concept:
              rawMission.partnerConcept ||
              rawMission.action ||
              rawMission.concept,
            action:
              rawMission.partnerAction ||
              rawMission.concept ||
              rawMission.action,
          };
        }

        setActiveMission(matchedMission);
        setIsReviewMode(Boolean(isCompleted));
        setIsModalVisible(true);
      } else {
        showCustomAlert(
          t("mission_under_construction_title", userLang) || "Em Construção",
          t("mission_under_construction_msg", userLang) || "Esta missão está sendo preparada.",
          "hard-hat",
          "#EAB64A"
        );
      }
    } catch (error) {
    } finally {
      setFetchingStepIndex(null);
    }
  };

  const handleCompleteMission = async (journalText: string = "") => {
    if (!currentUid || !activeMission) return;

    try {
      const targetPhase =
        activeMission.displayPhase ||
        activeMission.phase ||
        activeMission.day ||
        nextAvailableStep + 1;

      if (activeMission.isGoldChallenge) {
        await setDoc(
          doc(db, "users", currentUid),
          { totalPE: increment(activeMission.pointsPE || 150) },
          { merge: true }
        );

        if (journalText.trim().length > 0) {
          const goldJournalId = String(activeMission.phase || `gold_week_${visibleWeek}`);
          const journalRef = doc(db, "users", currentUid, "journals", goldJournalId);
          await setDoc(journalRef, {
            phase: goldJournalId,
            numericPhase: Number(visibleWeek),
            text: journalText,
            date: new Date().toISOString(),
            isGold: true,
            isEncrypted: true,
          });
        }

        setIsModalVisible(false);
        setActiveMission(null);

        triggerHaptic("success");
        showCustomAlert(
          t("gold_challenge_completed_title", userLang) || "Desafio Concluído!",
          t("gold_challenge_completed_msg", userLang, {
            points: activeMission.pointsPE || 150,
          }) || `Você ganhou ${activeMission.pointsPE || 150} Bonds!`,
          "trophy",
          "#EAB64A"
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
          todayDate.getDate()
        );
        const lastZero = new Date(
          lastDate.getFullYear(),
          lastDate.getMonth(),
          lastDate.getDate()
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
        lastTaskId: activeMission.id || null,
        currentTaskStep: 0,
        streak: newStreak,
      };

      await setDoc(doc(db, "users", currentUid), updates, { merge: true });

      if (journalText.trim().length > 0) {
        const docId = String(targetPhase);
        const journalRef = doc(db, "users", currentUid, "journals", docId);
        await setDoc(journalRef, {
          phase: targetPhase,
          numericPhase: Number(targetPhase) || nextAvailableStep + 1,
          text: journalText,
          date: new Date().toISOString(),
          step: 3,
          isEncrypted: true,
        });
      }

      const earnedPE = activeMission.pointsPE || 50;
      setIsModalVisible(false);
      setActiveMission(null);

      const completedDay = nextAvailableStep + 1;
      const weekCycleProgress = ((completedDay - 1) % 7) + 1;

      if (partnerData?.pushToken && !hasCompletedTaskToday) {
        sendPushNotificationDirectly(
          partnerData.pushToken,
          t("push_mission_done_title", userLang) || "Tarefa Concluída!",
          t("push_mission_done_body", userLang) || "Seu amor concluiu a tarefa do dia!"
        );
      }

      triggerHaptic("success");
      navigation.navigate("MissionReward", {
        earnedPE: earnedPE,
        currentDay90: completedDay,
        cupidProgress: weekCycleProgress,
        isChallenge: false,
      });
    } catch (error) {
      console.error("Erro ao salvar conclusão na Home:", error);
    }
  };

  const handleOpenGoldChallenge = async (weekNumber: number) => {
    triggerHaptic("light");

    if (!isSessionUnlocked()) {
      setIsMasterPasswordModalVisible(true);
      return;
    }

    setFetchingStepIndex(`gold_${weekNumber}`);
    try {
      let q = query(
        collection(db, "weekly_challenges"),
        where("language", "==", userLang),
        where("week", "==", weekNumber)
      );
      let querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        q = query(
          collection(db, "weekly_challenges"),
          where("language", "==", "pt-BR"),
          where("week", "==", weekNumber)
        );
        querySnapshot = await getDocs(q);
      }

      const uid = auth.currentUser?.uid;
      let alreadyCompletedGold = false;
      if (uid) {
        const journalQuery = query(
          collection(db, "users", uid, "journals"),
          where("phase", "==", `gold_week_${weekNumber}`)
        );
        const journalSnap = await getDocs(journalQuery);
        alreadyCompletedGold = !journalSnap.empty;
      }

      const challengeTitle =
        querySnapshot.empty
          ? t("gold_challenge_default_title", userLang, { week: weekNumber }) || `Desafio de Ouro - Semana ${weekNumber}`
          : querySnapshot.docs[0].data().title ||
            t("gold_challenge_default_title", userLang, { week: weekNumber }) || `Desafio de Ouro - Semana ${weekNumber}`;

      const challengeData = !querySnapshot.empty ? querySnapshot.docs[0].data() : {};

      setActiveMission({
        title: challengeTitle,
        description:
          challengeData.description ||
          t("gold_challenge_default_desc", userLang) || "Desafio especial da semana.",
        concept:
          challengeData.concept ||
          challengeData.description ||
          t("gold_challenge_default_concept", userLang) || "Reforce seu elo com esta ação.",
        action:
          challengeData.action ||
          challengeData.description ||
          t("gold_challenge_default_action", userLang) || "Realize o desafio e registre no diário.",
        pointsPE: 150,
        isGoldChallenge: true,
        phase: `gold_week_${weekNumber}`,
        week: weekNumber,
      });

      setIsReviewMode(alreadyCompletedGold);
      setIsModalVisible(true);
    } catch (error) {
      console.error("Erro ao abrir desafio de ouro:", error);
    } finally {
      setFetchingStepIndex(null);
    }
  };

  const getDisplayThemeForWeek = (weekNum: number) => {
    const weekData = weekThemes[weekNum];

    if (typeof weekData === "object" && weekData !== null) {
      return (
        weekData[userLang] ||
        weekData["pt-BR"] ||
        weekData.theme ||
        t(`week_theme_${weekNum}`, userLang)
      );
    }

    if (typeof weekData === "string" && weekData.trim().length > 0) {
      return weekData;
    }

    const staticKeyTranslation = t(`week_theme_${weekNum}`, userLang);
    if (staticKeyTranslation && staticKeyTranslation !== `week_theme_${weekNum}`) {
      return staticKeyTranslation;
    }

    return DEFAULT_WEEK_THEMES[weekNum] || t("connection_rescue", userLang) || "Módulo do Elo";
  };

  const bannerWeekTheme = getDisplayThemeForWeek(visibleWeek);
  const currentFlag =
    SUPPORTED_LANGUAGES.find((l) => l.code === userLang)?.flag || "🇧🇷";

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingSplashContainer]}>
        <Animated.View style={{ transform: [{ scale: logoPulseAnim }], alignItems: "center" }}>
          <Image
            source={require("../assets/duoelo_brand_logo.png")}
            style={{ width: 110, height: 110, borderRadius: 25, marginBottom: 20 }}
            resizeMode="contain"
          />
        </Animated.View>
        <ActivityIndicator size="large" color="#67D4A8" style={{ marginBottom: 12 }} />
        <Text style={{ fontFamily: "Montserrat_700Bold", color: "#202D3A", fontSize: 16 }}>
          {t("welcome_loading_msg", userLang) || "Bem-vindo ao DuoElo! Carregando sua jornada..."}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBarItem}
          onPress={() => {
            triggerHaptic("light");
            setIsLangModalVisible(true);
          }}
        >
          <Text style={styles.flagEmoji}>{currentFlag}</Text>
        </TouchableOpacity>

        <View style={styles.topBarItem}>
          <FontAwesome5 name="fire" size={20} color="#EAB64A" />
          <Text style={[styles.topBarText, { color: "#EAB64A" }]}>
            {userData?.streak || 0}
          </Text>
        </View>

        <View style={styles.topBarItem}>
          <FontAwesome5 name="infinity" solid size={20} color="#EAB64A" />
          <Text style={[styles.topBarText, { color: "#EAB64A" }]}>
            {userData?.totalPE || 0}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.topBarItem}
          onPress={() => {
            triggerHaptic("light");
            setIsNotificationsVisible(true);
          }}
        >
          <View style={{ position: "relative" }}>
            <FontAwesome5 name="bell" solid size={22} color="#202D3A" />
            {hasUnreadNotifications && (
              <View style={styles.notificationBadge} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.fixedHeaderBannerContainer}>
        <TouchableOpacity
          style={styles.fixedHeaderBanner}
          activeOpacity={0.9}
          onPress={() => {
            triggerHaptic("light");
            scrollToActiveNode(true);
          }}
        >
          <View style={styles.bannerLeftContent}>
            <Text style={styles.bannerSectionTitle}>
              {t("week_tag", userLang, { week: visibleWeek }) || `SEMANA ${visibleWeek}`}
            </Text>
            <Text style={styles.bannerThemeTitle} numberOfLines={1}>
              {isTrailUnlocked ? bannerWeekTheme : t("hidden_trail", userLang) || "Trilha Bloqueada"}
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
        style={styles.scrollContainer}
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.trailContainer}>
          {/* NÓ 1: AVALIAÇÃO */}
          <View
            style={styles.anamnesisNodeContainer}
            onLayout={(e) => {
              anamnesisYRef.current = e.nativeEvent.layout.y;
            }}
          >
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
                <Text style={styles.freeBadgeText}>
                  {t("badge_free", userLang) || "GRÁTIS"}
                </Text>
              </Animated.View>
            )}

            <TouchableOpacity
              style={[
                styles.anamnesisBtn,
                hasCompletedAnamnesis && styles.anamnesisBtnCompleted,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic("light");
                if (hasCompletedAnamnesis) {
                  showCustomAlert(
                    t("redo_assessment_title", userLang) || "Refazer Diagnóstico",
                    t("redo_assessment_msg", userLang) || "Deseja refazer a avaliação para recalibrar o Elo?",
                    "heartbeat",
                    "#EAB64A",
                    t("btn_redo_assessment", userLang) || "Refazer",
                    () => navigation.navigate("AnamneseScreen"),
                    t("btn_keep_current", userLang) || "Manter Atual",
                    () => {}
                  );
                } else {
                  navigation.navigate("AnamneseScreen");
                }
              }}
            >
              <FontAwesome5
                name={hasCompletedAnamnesis ? "check-double" : "heartbeat"}
                size={32}
                color="#FFF"
              />
            </TouchableOpacity>
            <Text style={styles.anamnesisTitle}>
              {t("your_assessment_title", userLang) || "Diagnóstico do Elo"}
            </Text>
            <Text style={styles.anamnesisSub}>
              {hasCompletedAnamnesis
                ? t("diagnostic_completed", userLang) || "Diagnóstico Concluído"
                : t("discover_temp_sub", userLang) || "Descubra a temperatura do casal"}
            </Text>
          </View>

          <View style={styles.trailConnector} />

          {/* NÓ 2: CADEIA DE MATCH */}
          <View
            style={styles.specialNodeContainer}
            onLayout={(e) => {
              matchYRef.current = e.nativeEvent.layout.y;
            }}
          >
            <TouchableOpacity
              style={[
                styles.startJourneyBtn,
                isMatchOrSoloDone
                  ? {
                      backgroundColor: "#67D4A8",
                      borderColor: "#E8F4F1",
                      shadowColor: "#67D4A8",
                    }
                  : {
                      backgroundColor: "#EAB64A",
                      borderColor: "#FFF9E6",
                      shadowColor: "#EAB64A",
                    },
              ]}
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic("light");
                if (isMatchOrSoloDone) {
                  showCustomAlert(
                    t("match_completed_title", userLang) || "Match Ativo",
                    t("match_completed_msg", userLang) || "Sua conexão está estabelecida.",
                    "check-circle",
                    "#67D4A8",
                    t("btn_ok", userLang) || "OK",
                    () => {},
                    t("btn_manage_match", userLang) || "Gerenciar Match",
                    () => navigation.navigate("Match")
                  );
                } else {
                  navigation.navigate("Match");
                }
              }}
            >
              <FontAwesome5
                name={isMatchOrSoloDone ? "check" : "user-plus"}
                size={28}
                color="#FFF"
              />
            </TouchableOpacity>
            <Text
              style={[
                styles.mapLabelText,
                isMatchOrSoloDone ? { color: "#67D4A8" } : { color: "#EAB64A" },
              ]}
            >
              {isMatchOrSoloDone
                ? t("match_completed_label", userLang) || "Match Concluído"
                : t("make_match_label", userLang) || "Fazer o Match"}
            </Text>
          </View>

          <View style={styles.trailConnector} />

          {/* NÓ 3: DAR O PLAY */}
          <View
            style={styles.specialNodeContainer}
            onLayout={(e) => {
              playYRef.current = e.nativeEvent.layout.y;
            }}
          >
            {isTrailUnlocked ? (
              <View style={{ alignItems: "center" }}>
                <TouchableOpacity
                  style={[
                    styles.startJourneyBtn,
                    { backgroundColor: "#202D3A", borderColor: "#2C3E50" },
                  ]}
                  activeOpacity={1}
                >
                  <FontAwesome5 name="flag-checkered" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.mapLabelText}>
                  {t("active_trail_label", userLang) || "Trilha Ativa"}
                </Text>
              </View>
            ) : (
              <Animated.View
                style={{
                  alignItems: "center",
                  transform: [{ scale: pulseAnim }],
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.startJourneyBtn,
                    iAmReady
                      ? { backgroundColor: "#EAB64A", borderColor: "#F9ECCC" }
                      : {
                          backgroundColor: "#67D4A8",
                          borderColor: "#E8F4F1",
                          shadowColor: "#67D4A8",
                        },
                  ]}
                  activeOpacity={0.8}
                  onPress={handlePolitePlayTrigger}
                >
                  <FontAwesome5
                    name={iAmReady ? "hourglass-half" : "play"}
                    size={28}
                    color="#FFF"
                    style={!iAmReady ? { marginLeft: 4 } : {}}
                  />
                </TouchableOpacity>
                <Text style={[styles.mapLabelText, { color: "#202D3A" }]}>
                  {iAmReady
                    ? t("waiting_partner_label", userLang, { name: pName }) || `Aguardando ${pName}...`
                    : t("press_play_label", userLang) || "Dar o Play na Jornada"}
                </Text>
              </Animated.View>
            )}
          </View>

          {/* TRILHA DE 90 DIAS */}
          <View
            style={[
              styles.nodesWrapper,
              !isTrailUnlocked && styles.lockedTrailOverlay,
            ]}
            onLayout={(e) => {
              nodesWrapperY.current = e.nativeEvent.layout.y;
              if (isTrailUnlocked) {
                setTimeout(() => scrollToActiveNode(false), 50);
              }
            }}
          >
            {Array.from({ length: totalStepsInModule }).map((_, index) => {
              const isCompleted = isTrailUnlocked ? index < nextAvailableStep : false;
              const isNextUp = isTrailUnlocked ? index === nextAvailableStep : false;
              const isLocked = !isTrailUnlocked ? true : index > nextAvailableStep;

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
                nextAvailableStep - (weekNumber - 1) * 7
              );
              const starsActive = Math.min(3, tasksDoneThisWeek);
              const isGoldUnlocked = starsActive >= 3;

              const translateX = Math.sin(index * 0.8) * 60;

              let nodeSize = 70 + dayOfWeek * 2;
              let iconSize = 22 + dayOfWeek * 1.5;

              let faceColor = "#D1D9E0";
              let baseColor = "#AFAFAF";
              let iconName = WEEKLY_PROGRESSION_ICONS[dayOfWeek];
              let iconColor = "#202D3A";

              if (isWeeklyReward) {
                nodeSize = 92;
                iconSize = 36;
                iconName = "gift";
                if (isCompleted) {
                  faceColor = "#67D4A8";
                  baseColor = "#4BB890";
                  iconName = "check";
                  iconColor = "#FFF";
                } else if (isActive) {
                  faceColor = "#EAB64A";
                  baseColor = "#C99632";
                  iconName = "check";
                  iconColor = "#FFF";
                } else if (isWaitingForTomorrow) {
                  faceColor = "#F0F4F8";
                  baseColor = "#D1D9E0";
                  iconName = "clock";
                  iconColor = "#202D3A";
                } else {
                  faceColor = "#F0F4F8";
                  baseColor = "#D1D9E0";
                  iconColor = "#202D3A";
                }
              } else {
                if (isCompleted) {
                  faceColor = "#67D4A8";
                  baseColor = "#4BB890";
                  iconName = "check";
                  iconColor = "#FFF";
                } else if (isActive) {
                  faceColor = "#EAB64A";
                  baseColor = "#C99632";
                  iconName = "check";
                  iconColor = "#FFF";
                } else if (isWaitingForTomorrow) {
                  faceColor = "#E8F4F1";
                  baseColor = "#D1D9E0";
                  iconName = "clock";
                  iconColor = "#202D3A";
                }
              }

              const ringPadding = 26;
              const ringSize = nodeSize + ringPadding;
              const isThisNodeFetching = fetchingStepIndex === index;

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
                          {t("week_tag", userLang, { week: weekNumber }) || `SEMANA ${weekNumber}`}
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
                    style={{
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      marginVertical: 5,
                    }}
                  >
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
                        const y = e.nativeEvent.layout.y;
                        nodePositions[index] = y + nodesWrapperY.current;
                        if (index === nextAvailableStep) {
                          if (isTrailUnlocked) {
                            executeScrollToTarget(true);
                          }
                        }
                      }}
                    >
                      {isNextUp && (
                        <Animated.View
                          style={{
                            position: "absolute",
                            width: ringSize,
                            height: ringSize,
                            transform: [{ scale: ringPulseAnim }],
                            zIndex: 0,
                            pointerEvents: "none",
                            justifyContent: "center",
                            alignItems: "center",
                            top: -(ringSize - nodeSize) / 2,
                            left: -(ringSize - nodeSize) / 2,
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
                              isCompleted
                            )
                          }
                          style={({ pressed }: { pressed: boolean }) => [
                            styles.nodeFace,
                            {
                              backgroundColor: faceColor,
                              width: nodeSize,
                              height: nodeSize,
                              borderRadius: nodeSize / 2,
                              transform: [{ translateY: pressed ? 0 : -6 }],
                            },
                          ]}
                        >
                          {isThisNodeFetching ? (
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

                      {isActive && (
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
                    </View>

                    {isDay5 && (
                      <View
                        style={{
                          position: "absolute",
                          left: "50%",
                          transform: [
                            { translateX: translateX + nodeSize / 2 + 25 },
                          ],
                          top: -5,
                          alignItems: "center",
                          zIndex: 999999,
                          elevation: 30,
                        }}
                      >
                        {isGoldUnlocked ? (
                          <Animated.View
                            style={{
                              transform: [{ scale: pulseAnim }],
                            }}
                          >
                            <TouchableOpacity
                              activeOpacity={0.8}
                              style={styles.goldBtnUnlocked}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleOpenGoldChallenge(weekNumber);
                              }}
                            >
                              {fetchingStepIndex === `gold_${weekNumber}` ? (
                                <ActivityIndicator size="small" color="#202D3A" />
                              ) : (
                                <FontAwesome5
                                  name="infinity"
                                  solid
                                  size={24}
                                  color="#202D3A"
                                />
                              )}
                            </TouchableOpacity>
                          </Animated.View>
                        ) : (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.goldBtnLocked}
                            onPress={(e) => {
                              e.stopPropagation();
                              showCustomAlert(
                                t("gold_challenge_locked_title", userLang) || "Desafio Bloqueado",
                                t("gold_challenge_locked_msg", userLang, {
                                  progress: tasksDoneThisWeek,
                                }) || `Complete 3 missões na semana para desbloquear este desafio. (${tasksDoneThisWeek}/3)`,
                                "lock",
                                "#EAB64A"
                              );
                            }}
                          >
                            <FontAwesome5
                              name="lock"
                              size={20}
                              color="rgba(234, 182, 74, 0.7)"
                            />
                          </TouchableOpacity>
                        )}
                        <Text style={styles.challengeLabel}>
                          {t("challenge_label", userLang) || "DESAFIO DE OURO"}
                        </Text>
                        <View style={styles.challengeStarsRow}>
                          {[1, 2, 3].map((starNum) => (
                            <FontAwesome5
                              key={starNum}
                              name="infinity"
                              solid
                              size={10}
                              color={
                                starNum <= starsActive ? "#EAB64A" : "#D1D9E0"
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
                  triggerHaptic("light");
                  if (isTrailUnlocked && isJourneyFinished) {
                    showCustomAlert(
                      t("congrats_completion_title", userLang) || "🏆 Parabéns pelo Dia 90!",
                      t("congrats_completion_msg", userLang) || "Vocês concluíram a Jornada DuoElo de 90 dias com sucesso!",
                      "trophy",
                      "#EAB64A"
                    );
                  } else if (hasCompletedAnamnesis && !isPremium) {
                    showCustomAlert(
                      t("sub_required_title", userLang) || "Assinatura Necessária",
                      t("sub_required_completion_msg", userLang) || "Assine para desbloquear todo o percurso até o Dia 90.",
                      "lock",
                      "#EAB64A",
                      t("btn_see_plans", userLang) || "Ver Planos",
                      () => navigation.navigate("PaywallScreen"),
                      t("btn_not_now", userLang) || "Agora Não",
                      () => {}
                    );
                  } else {
                    showCustomAlert(
                      "Jornada em Andamento",
                      "Continue realizando as tarefas diárias para desbloquear a conquista do Dia 90!",
                      "lock",
                      "#202D3A"
                    );
                  }
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

      {showFab && !isModalVisible && (
        <TouchableOpacity
          style={styles.floatingTargetBtn}
          onPress={() => {
            triggerHaptic("light");
            scrollToActiveNode(true);
          }}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="location-arrow" size={20} color="#FFF" />
        </TouchableOpacity>
      )}

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

      <MasterPasswordModal
        visible={isMasterPasswordModalVisible}
        userLanguage={userLang}
        onSuccess={async () => {
          setIsMasterPasswordModalVisible(false);
          if (pendingMissionStepIndex !== null) {
            await executeMissionFetch(pendingMissionStepIndex, isReviewMode);
            setPendingMissionStepIndex(null);
          }
        }}
        onCancel={() => {
          setIsMasterPasswordModalVisible(false);
          setPendingMissionStepIndex(null);
        }}
      />

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
                  triggerHaptic("light");
                  setUserLang(lang.code);
                  setIsLangModalVisible(false);
                  if (currentUid && auth.currentUser)
                    await setDoc(
                      doc(db, "users", currentUid),
                      { language: lang.code },
                      { merge: true }
                    );
                }}
              >
                <Text style={styles.compactFlagText}>{lang.flag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 🔔 COMPONENTE DE NOTIFICAÇÕES SEPARADO */}
      <NotificationsModal
        visible={isNotificationsVisible}
        onClose={() => setIsNotificationsVisible(false)}
        userLanguage={userLang}
      />

      <Modal visible={isGeneratingJourney} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color="#67D4A8"
              style={{ transform: [{ scale: 1.5 }], marginBottom: 15 }}
            />
            <Text style={styles.codeModalTitle}>
              {t("generating_journey_title", userLang) || "Gerando sua Jornada..."}
            </Text>
            <Text style={styles.codeModalSub}>
              {t("generating_journey_sub", userLang) || "Personalizando as 90 missões com base no seu perfil."}
            </Text>
          </View>
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

            <View style={{ width: "100%", gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[
                  styles.bottomSheetButtonPrimary,
                  { backgroundColor: customAlert.color },
                ]}
                onPress={() => {
                  triggerHaptic("light");
                  setCustomAlert({ ...customAlert, visible: false });
                  if (customAlert.onConfirm) customAlert.onConfirm();
                }}
              >
                <Text style={styles.bottomSheetButtonPrimaryText}>
                  {customAlert.confirmText || t("btn_understand", userLang) || "Entendi"}
                </Text>
              </TouchableOpacity>

              {customAlert.secondaryText ? (
                <TouchableOpacity
                  style={styles.bottomSheetButtonSecondary}
                  onPress={() => {
                    triggerHaptic("light");
                    setCustomAlert({ ...customAlert, visible: false });
                    if (customAlert.onSecondary) customAlert.onSecondary();
                  }}
                >
                  <Text style={styles.bottomSheetButtonSecondaryText}>
                    {customAlert.secondaryText}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8", width: "100%" },
  loadingSplashContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F4F8",
  },
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
  topBarItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EA4335",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  flagEmoji: { fontSize: 22 },
  topBarText: { fontFamily: "Montserrat_900Black", fontSize: 16 },
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
    backgroundColor: "#202D3A",
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
    fontFamily: "Montserrat_900Black",
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  bannerThemeTitle: {
    fontFamily: "Montserrat_700Bold",
    color: "#FFFFFF",
    fontSize: 19,
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
    paddingBottom: 120,
  },
  trailConnector: {
    width: 2,
    height: 25,
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: "#D1D9E0",
  },
  anamnesisNodeContainer: {
    alignItems: "center",
    marginBottom: 15,
    marginTop: 20,
    position: "relative",
  },
  freeBadge: {
    position: "absolute",
    top: -15,
    zIndex: 10,
    backgroundColor: "#EAB64A",
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
    fontFamily: "Montserrat_900Black",
    color: "#FFF",
    fontSize: 11,
    letterSpacing: 1,
  },
  anamnesisBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#202D3A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#202D3A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: "#F0F4F8",
  },
  anamnesisBtnCompleted: {
    backgroundColor: "#67D4A8",
    borderColor: "#E8F4F1",
    shadowColor: "#67D4A8",
  },
  anamnesisTitle: {
    fontFamily: "Montserrat_900Black",
    marginTop: 16,
    fontSize: 18,
    color: "#202D3A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  anamnesisSub: {
    fontFamily: "Montserrat_600SemiBold",
    marginTop: 4,
    fontSize: 14,
    color: "#2C3E50",
  },
  nodesWrapper: { width: "100%", alignItems: "center" },
  lockedTrailOverlay: { opacity: 0.35 },
  specialNodeContainer: {
    alignItems: "center",
    marginBottom: 15,
    marginTop: 15,
  },
  startJourneyBtn: {
    width: 75,
    height: 75,
    borderRadius: 24,
    backgroundColor: "#202D3A",
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
  mapLabelText: {
    fontFamily: "Montserrat_700Bold",
    marginTop: 10,
    color: "#2C3E50",
    fontSize: 13,
    textTransform: "uppercase",
    textAlign: "center",
    padding: 5,
  },
  goldBtnUnlocked: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EAB64A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EAB64A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 2,
    borderColor: "#FFF",
    zIndex: 10000,
  },
  goldBtnLocked: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(234, 182, 74, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(234, 182, 74, 0.5)",
  },
  challengeLabel: {
    fontFamily: "Montserrat_700Bold",
    marginTop: 8,
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
  endJourneyBtnActive: { backgroundColor: "#EAB64A", borderColor: "#FFF9E6" },
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
    fontFamily: "Montserrat_900Black",
    fontSize: 15,
    color: "#2C3E50",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  weekThemeText: {
    fontFamily: "Montserrat_900Black",
    fontSize: 20,
    color: "#202D3A",
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    position: "relative",
  },
  nodeFace: {
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 2,
  },
  floatingTargetBtn: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#202D3A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#202D3A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(32, 45, 58, 0.3)",
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
    borderColor: "#202D3A",
  },
  compactFlagText: { fontSize: 28 },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(32,45,58,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  codeModalTitle: {
    fontFamily: "Montserrat_900Black",
    fontSize: 20,
    color: "#202D3A",
    marginBottom: 10,
  },
  codeModalSub: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#2C3E50",
    textAlign: "center",
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
  bottomSheetButtonSecondary: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetButtonSecondaryText: {
    fontFamily: "Montserrat_700Bold",
    color: "#2C3E50",
    fontSize: 16,
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