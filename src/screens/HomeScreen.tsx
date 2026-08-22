import { FontAwesome5 } from "@expo/vector-icons";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { deleteUser } from "firebase/auth";
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
  Animated,
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
import { auth, db } from "../config/firebase";
import { t } from "../i18n/translations";
import { logAuditEvent } from "../services/auditService";
import { scheduleDailyReminder } from "../services/notificationService";
import { encryptText } from "../services/securityService";
import MissionExecutionScreen from "./MissionExecutionScreen";

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
        shouldSetBadge: false,
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
        <FontAwesome5 name="heart" solid size={size} color="#EAB64A" />
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
  if (isExpoGo || !Notifications) return null;

  let token;
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

  const [userLang, setUserLang] = useState("pt-BR");
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);
  const [isHardResetModalVisible, setIsHardResetModalVisible] = useState(false);
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false);

  const [isMasterPasswordModalVisible, setIsMasterPasswordModalVisible] = useState(false);
  const [pendingMissionStepIndex, setPendingMissionStepIndex] = useState<number | null>(null);

  const unreadNudges = userData?.cutucadas || 0;
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
    if (!currentUid) {
      setUserData(null);
      setPartnerData(null);
      return;
    }

    let unsubscribeUser: () => void;

    const timer = setTimeout(() => {
      registerForPushNotificationsAsync().then(async (token) => {
        if (token) {
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
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            if (data.language) {
              setUserLang(data.language);
              scheduleDailyReminder(data.language, 20, 0);
            }
          }
          setLoading(false);
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
    if (!userData?.partnerId) {
      setPartnerData(null);
      return;
    }
    let unsubscribePartner: () => void;

    const timer = setTimeout(() => {
      unsubscribePartner = onSnapshot(
        doc(db, "users", userData.partnerId),
        (docSnap) => {
          if (docSnap.exists()) setPartnerData(docSnap.data());
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
          const themeText = data.theme || data.title || data.name || data.topic;
          if (!isNaN(weekNum) && themeText) themes[weekNum] = themeText;
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
    const fAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    const pAnim = Animated.loop(
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
    );

    const rAnim = Animated.loop(
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
      ])
    );

    fAnim.start();
    pAnim.start();
    rAnim.start();

    return () => {
      fAnim.stop();
      pAnim.stop();
      rAnim.stop();
    };
  }, [floatAnim, pulseAnim, ringPulseAnim]);

  const hasCompletedAnamnesis = Boolean(userData?.hasCompletedAnamnesis);
  const partnerCompletedAnamnesis = Boolean(partnerData?.hasCompletedAnamnesis);

  const isPremium =
    Boolean(userData?.isPremium) || Boolean(partnerData?.isPremium);

  const hasPartner = Boolean(userData?.partnerId);
  const isSoloMode = Boolean(userData?.isSoloMode);
  const iAmReady = Boolean(
    userData?.isReadyToStart || userData?.hasPressedPlay
  );
  const partnerIsReady = Boolean(
    partnerData?.isReadyToStart || partnerData?.hasPressedPlay
  );

  const isMatchOrSoloDone = hasPartner || isSoloMode;

  const isTrailUnlocked =
    hasCompletedAnamnesis &&
    isPremium &&
    iAmReady &&
    (isSoloMode || (partnerIsReady && partnerCompletedAnamnesis));

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
      if (isTrailUnlocked) {
        setTimeout(() => scrollToActiveNode(false), 100);
      }
    });
    return unsubscribe;
  }, [navigation, isTrailUnlocked, currentStep]);

  useEffect(() => {
    if (isTrailUnlocked && !isInitialPositionSet) {
      setTimeout(() => scrollToActiveNode(false), 300);
    }
  }, [currentStep, isTrailUnlocked, isInitialPositionSet]);

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

      const shouldShow = distance > 50;

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
    t("partner_default_name", userLang);

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

  const handleHardReset = () => {
    triggerHaptic("warning");
    setIsHardResetModalVisible(true);
  };

  const handleSendNudge = async () => {
    triggerHaptic("light");
  };

  const handleCloseNudges = async () => {
    triggerHaptic("light");
    setIsNotificationsVisible(false);
  };

  const handleStartSolo = async () => {
    setIsGeneratingJourney(true);

    if (currentUid) {
      const personalTrail = await generateTrailMatrix(currentUid, null, true);
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
        t("solo_journey_generated_title", userLang),
        t("solo_journey_generated_msg", userLang),
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
        const myTrail = await generateTrailMatrix(
          currentUid,
          targetPartnerId,
          false
        );

        await setDoc(
          doc(db, "users", currentUid),
          {
            isReadyToStart: true,
            hasPressedPlay: true,
            anamnesisLocked: true,
            myTrail: myTrail,
          },
          { merge: true }
        );

        if (targetPartnerId) {
          const partnerTrail = await generateTrailMatrix(
            targetPartnerId,
            currentUid,
            false
          );
          await setDoc(
            doc(db, "users", targetPartnerId),
            {
              isReadyToStart: true,
              hasPressedPlay: true,
              anamnesisLocked: true,
              myTrail: partnerTrail,
            },
            { merge: true }
          );
        }

        if (partnerData?.pushToken) {
          sendPushNotificationDirectly(
            partnerData.pushToken,
            t("push_journey_unlocked_title", userLang),
            t("push_journey_unlocked_body", userLang)
          );
        }

        triggerHaptic("success");
        showCustomAlert(
          t("start_authorized_title", userLang),
          t("start_authorized_msg", userLang),
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
            t("push_green_light_title", userLang),
            t("push_green_light_body", userLang)
          );
        }

        triggerHaptic("medium");
        showCustomAlert(
          t("green_light_given_title", userLang),
          t("green_light_given_msg", userLang, { name: pName }),
          "hourglass-half",
          "#EAB64A"
        );
      }
    } catch (e) {
      showCustomAlert(
        t("error_title", userLang),
        t("error_try_again", userLang),
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
        t("plan_required_title", userLang),
        t("plan_required_msg", userLang),
        "lock",
        "#EAB64A",
        t("btn_see_plans", userLang),
        () => navigation.navigate("PaywallScreen"),
        t("btn_not_now", userLang),
        () => {}
      );
      return;
    }

    if (!hasCompletedAnamnesis) {
      showCustomAlert(
        t("relationship_compass_title", userLang),
        t("relationship_compass_msg", userLang),
        "heartbeat",
        "#202D3A",
        t("btn_answer_mapping", userLang),
        () => navigation.navigate("AnamneseScreen"),
        t("btn_use_default_profile", userLang),
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
                  t("waiting_partner_title", userLang),
                  t("waiting_partner_msg", userLang),
                  "hourglass-half",
                  "#EAB64A",
                  t("btn_understand", userLang)
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
              t("connection_error_title", userLang),
              t("connection_error_msg", userLang),
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
          t("waiting_partner_title", userLang),
          t("waiting_partner_msg", userLang),
          "hourglass-half",
          "#EAB64A",
          t("btn_understand", userLang)
        );
        return;
      }
      handleStartHandshake();
    } else if (isSoloMode) {
      handleStartSolo();
    } else {
      showCustomAlert(
        t("better_together_title", userLang),
        t("better_together_msg", userLang),
        "user-friends",
        "#EAB64A",
        t("btn_send_invite", userLang),
        () => navigation.navigate("Match"),
        t("btn_continue_solo", userLang),
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

  // 🎯 ABERTURA DA MISSÃO CORRIGIDA
  const handleOpenMission = async (
    stepIndex: number,
    isActuallyLocked: boolean,
    isWaiting: boolean,
    isCompleted: boolean
  ) => {
    triggerHaptic("light");

    if (!hasCompletedAnamnesis) {
      showCustomAlert(
        t("assessment_pending_title", userLang),
        t("assessment_pending_msg", userLang),
        "clipboard-list",
        "#EAB64A"
      );
      navigation.navigate("AnamneseScreen");
      return;
    }

    if (!isPremium) {
      showCustomAlert(
        t("sub_required_title", userLang),
        t("sub_required_msg", userLang),
        "lock",
        "#EAB64A",
        t("btn_see_plans", userLang),
        () => navigation.navigate("PaywallScreen"),
        t("btn_not_now", userLang),
        () => {}
      );
      return;
    }

    if (isActuallyLocked) return;

    if (isWaiting && !isCompleted) {
      showCustomAlert(
        t("all_in_good_time_title", userLang),
        t("all_in_good_time_msg", userLang),
        "hourglass-half",
        "#202D3A"
      );
      return;
    }

    // 🔒 MODO REVISÃO PARA MISSÕES CUMPRIDAS
    if (isCompleted) {
      setIsReviewMode(true);
      await executeMissionFetch(stepIndex, true);
      return;
    }

    setIsReviewMode(false);
    setPendingMissionStepIndex(stepIndex);

    if (userData?.masterPasswordHash) {
      setIsMasterPasswordModalVisible(true);
      return;
    }

    await executeMissionFetch(stepIndex, false);
  };

  const executeMissionFetch = async (stepIndex: number, isCompleted: boolean) => {
    setIsFetchingMission(true);
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
              t("your_mission_part_title", userLang),
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
          t("mission_under_construction_title", userLang),
          t("mission_under_construction_msg", userLang),
          "hard-hat",
          "#EAB64A"
        );
      }
    } catch (error) {
    } finally {
      setIsFetchingMission(false);
    }
  };

  // 🔐 ENCRIPTAÇÃO COM SESSÃO / UID
  const handleCompleteMission = async (journalText: string = "") => {
    if (!currentUid || !activeMission) return;

    try {
      const encryptedJournal = journalText.trim().length > 0 
        ? await encryptText(journalText, currentUid)
        : "";

      if (activeMission.isGoldChallenge) {
        await setDoc(
          doc(db, "users", currentUid),
          { totalPE: increment(activeMission.pointsPE || 150) },
          { merge: true }
        );

        const journalRef = doc(collection(db, "users", currentUid, "journals"));
        await setDoc(journalRef, {
          phase: activeMission.phase,
          text: encryptedJournal,
          date: new Date().toISOString(),
          isGold: true,
          isEncrypted: true,
        });

        setIsModalVisible(false);
        setActiveMission(null);

        triggerHaptic("success");
        showCustomAlert(
          t("gold_challenge_completed_title", userLang),
          t("gold_challenge_completed_msg", userLang, {
            points: activeMission.pointsPE || 150,
          }),
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
        const journalRef = doc(collection(db, "users", currentUid, "journals"));
        await setDoc(journalRef, {
          phase:
            activeMission.displayPhase ||
            activeMission.phase ||
            currentStep + 1,
          text: encryptedJournal,
          date: new Date().toISOString(),
          step: 3,
          isEncrypted: true,
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
          t("push_mission_done_title", userLang),
          t("push_mission_done_body", userLang)
        );
      }

      triggerHaptic("success");
      navigation.navigate("MissionReward", {
        earnedPE: earnedPE,
        currentDay90: completedDay,
        cupidProgress: weekCycleProgress,
        isChallenge: false,
      });
    } catch (error) {}
  };

  const handleOpenGoldChallenge = async (weekNumber: number) => {
    triggerHaptic("light");
    setIsFetchingMission(true);
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
          ? t("gold_challenge_default_title", userLang, { week: weekNumber })
          : querySnapshot.docs[0].data().title ||
            t("gold_challenge_default_title", userLang, { week: weekNumber });

      const challengeData = !querySnapshot.empty ? querySnapshot.docs[0].data() : {};

      setActiveMission({
        title: challengeTitle,
        description:
          challengeData.description ||
          t("gold_challenge_default_desc", userLang),
        concept:
          challengeData.concept ||
          challengeData.description ||
          t("gold_challenge_default_concept", userLang),
        action:
          challengeData.action ||
          challengeData.description ||
          t("gold_challenge_default_action", userLang),
        pointsPE: 150,
        isGoldChallenge: true,
        phase: `gold_week_${weekNumber}`,
      });

      setIsReviewMode(alreadyCompletedGold);
      setIsModalVisible(true);
    } catch (error) {
      console.error("Erro ao abrir desafio de ouro:", error);
    } finally {
      setIsFetchingMission(false);
    }
  };

  const getDisplayThemeForWeek = (weekNum: number) =>
    weekThemes[weekNum] ||
    DEFAULT_WEEK_THEMES[weekNum] ||
    t("connection_rescue", userLang);
  const bannerWeekTheme = getDisplayThemeForWeek(visibleWeek);
  const currentFlag =
    SUPPORTED_LANGUAGES.find((l) => l.code === userLang)?.flag || "🇧🇷";

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
            {unreadNudges > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNudges > 9 ? "9+" : unreadNudges}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.topBarItem}
          onPress={handleHardReset}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="eraser" size={20} color="#202D3A" />
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
              {t("week_tag", userLang, { week: visibleWeek })}
            </Text>
            <Text style={styles.bannerThemeTitle} numberOfLines={1}>
              {isTrailUnlocked ? bannerWeekTheme : t("hidden_trail", userLang)}
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
        <View style={styles.trailContainer}>
          {/* NÓ 1: AVALIAÇÃO */}
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
                <Text style={styles.freeBadgeText}>
                  {t("badge_free", userLang)}
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
                    t("redo_assessment_title", userLang),
                    t("redo_assessment_msg", userLang),
                    "heartbeat",
                    "#EAB64A",
                    t("btn_redo_assessment", userLang),
                    () => navigation.navigate("AnamneseScreen"),
                    t("btn_keep_current", userLang),
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
              {t("your_assessment_title", userLang)}
            </Text>
            <Text style={styles.anamnesisSub}>
              {hasCompletedAnamnesis
                ? t("diagnostic_completed", userLang)
                : t("discover_temp_sub", userLang)}
            </Text>
          </View>

          <View style={styles.trailConnector} />

          {/* NÓ 2: CADEIA DE MATCH */}
          <View style={styles.specialNodeContainer}>
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
                    t("match_completed_title", userLang),
                    t("match_completed_msg", userLang),
                    "check-circle",
                    "#67D4A8",
                    t("btn_ok", userLang),
                    () => {},
                    t("btn_manage_match", userLang),
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
                ? t("match_completed_label", userLang)
                : t("make_match_label", userLang)}
            </Text>
          </View>

          <View style={styles.trailConnector} />

          {/* NÓ 3: DAR O PLAY */}
          <View style={styles.specialNodeContainer}>
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
                  {t("active_trail_label", userLang)}
                </Text>
              </View>
            ) : iAmReady ? (
              <View style={{ alignItems: "center" }}>
                <TouchableOpacity
                  style={[
                    styles.startJourneyBtn,
                    { backgroundColor: "#EAB64A", borderColor: "#F9ECCC" },
                  ]}
                  activeOpacity={1}
                >
                  <FontAwesome5 name="hourglass-half" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.mapLabelText}>
                  {t("waiting_partner_label", userLang, { name: pName })}
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
                    {
                      backgroundColor: "#67D4A8",
                      borderColor: "#E8F4F1",
                      shadowColor: "#67D4A8",
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={handlePolitePlayTrigger}
                >
                  <FontAwesome5
                    name="play"
                    size={28}
                    color="#FFF"
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
                <Text style={[styles.mapLabelText, { color: "#202D3A" }]}>
                  {t("press_play_label", userLang)}
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
              if (isTrailUnlocked && !isInitialPositionSet)
                scrollToActiveNode(false);
            }}
          >
            {Array.from({ length: totalStepsInModule }).map((_, index) => {
              const isCompleted = isTrailUnlocked ? index < currentStep : false;
              const isNextUp = isTrailUnlocked ? index === currentStep : false;
              const isLocked = !isTrailUnlocked ? true : index > currentStep;

              const bypassDailyLock = Boolean(userData?.bypassDailyLock);

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
                currentStep - (weekNumber - 1) * 7
              );
              const starsActive = Math.min(3, tasksDoneThisWeek);
              const isGoldUnlocked = starsActive >= 3;

              const translateX = Math.sin(index * 0.8) * 60;

              let nodeSize = 70 + dayOfWeek * 2;
              let iconSize = 22 + dayOfWeek * 1.5;

              let faceColor = "#D1D9E0";
              let baseColor = "#F0F4F8";
              let iconName = WEEKLY_PROGRESSION_ICONS[dayOfWeek];
              let iconColor = "#202D3A";

              if (isWeeklyReward) {
                nodeSize = 92;
                iconSize = 36;
                iconName = "gift";
                if (isCompleted) {
                  faceColor = "#67D4A8";
                  baseColor = "#E8F4F1";
                  iconName = "check";
                  iconColor = "#FFF";
                } else if (isActive) {
                  faceColor = "#EAB64A";
                  baseColor = "#F9ECCC";
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
                  baseColor = "#E8F4F1";
                  iconName = "check";
                  iconColor = "#FFF";
                } else if (isActive) {
                  faceColor = "#EAB64A";
                  baseColor = "#F9ECCC";
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
                          {t("week_tag", userLang, { week: weekNumber })}
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
                        nodePositions[index] = e.nativeEvent.layout.y;

                        if (
                          index === currentStep &&
                          isTrailUnlocked &&
                          !isInitialPositionSet
                        ) {
                          setTimeout(() => scrollToActiveNode(false), 50);
                        }
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
                              isCompleted
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
                    </View>

                    {/* 🏆 DESAFIO DE OURO COM CONTAINER QUE NÃO BLOQUEIA O TOQUE ABAIXO */}
                    {isDay5 && (
                      <View
                        style={[
                          styles.goldChallengeWrapper,
                          {
                            transform: [
                              { translateX: translateX + nodeSize / 2 + 55 },
                            ],
                            top: 0,
                            zIndex: 99999,
                            elevation: 20,
                          },
                        ]}
                        pointerEvents="box-none"
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
                              <FontAwesome5
                                name="infinity"
                                solid
                                size={24}
                                color="#202D3A"
                              />
                            </TouchableOpacity>
                          </Animated.View>
                        ) : (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.goldBtnLocked}
                            onPress={(e) => {
                              e.stopPropagation();
                              showCustomAlert(
                                t("gold_challenge_locked_title", userLang),
                                t("gold_challenge_locked_msg", userLang, {
                                  progress: tasksDoneThisWeek,
                                }),
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
                          {t("challenge_label", userLang)}
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
                      t("congrats_completion_title", userLang),
                      t("congrats_completion_msg", userLang),
                      "trophy",
                      "#EAB64A"
                    );
                  } else if (hasCompletedAnamnesis && !isPremium) {
                    showCustomAlert(
                      t("sub_required_title", userLang),
                      t("sub_required_completion_msg", userLang),
                      "lock",
                      "#EAB64A",
                      t("btn_see_plans", userLang),
                      () => navigation.navigate("PaywallScreen"),
                      t("btn_not_now", userLang),
                      () => {}
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

      {isTrailUnlocked && showFab && !isModalVisible && (
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

      {/* MODAL DE MISSÃO */}
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

      {/* MODAL DE SENHA MESTRA */}
      <MasterPasswordModal
        visible={isMasterPasswordModalVisible}
        onSuccess={async () => {
          setIsMasterPasswordModalVisible(false);
          if (pendingMissionStepIndex !== null) {
            await executeMissionFetch(pendingMissionStepIndex, false);
            setPendingMissionStepIndex(null);
          }
        }}
        onCancel={() => {
          setIsMasterPasswordModalVisible(false);
          setPendingMissionStepIndex(null);
        }}
      />

      {/* MODAL DE IDIOMAS */}
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
                  if (currentUid)
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

      {/* MODAL DE NOTIFICAÇÕES */}
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
              <FontAwesome5 name="bell" solid size={26} color="#202D3A" />
            </View>

            <Text style={styles.bottomSheetTitle}>
              {t("notifications_title", userLang)}
            </Text>

            {unreadNudges > 0 ? (
              <View style={styles.nudgeItem}>
                <FontAwesome5
                  name="hand-point-right"
                  size={24}
                  color="#EAB64A"
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.nudgeTitle}>
                    {t("nudge_title", userLang)}
                  </Text>
                  <Text style={styles.nudgeText}>
                    {t("nudge_text_part1", userLang)}{" "}
                    <Text style={{ fontFamily: "Montserrat_900Black" }}>
                      {unreadNudges}
                    </Text>{" "}
                    {t("nudge_text_part2", userLang)}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.bottomSheetText}>
                {t("no_notifications_msg", userLang)}
              </Text>
            )}

            <View style={{ width: "100%", marginTop: 15, gap: 10 }}>
              <TouchableOpacity
                style={[
                  styles.bottomSheetButtonPrimary,
                  { backgroundColor: "#202D3A" },
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
                  {t("btn_nudge_partner", userLang)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bottomSheetButtonSecondary}
                onPress={handleCloseNudges}
              >
                <Text style={styles.bottomSheetButtonSecondaryText}>
                  {t("modal_close", userLang)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL GERANDO JORNADA */}
      <Modal visible={isGeneratingJourney} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color="#67D4A8"
              style={{ transform: [{ scale: 1.5 }], marginBottom: 15 }}
            />
            <Text style={styles.codeModalTitle}>
              {t("generating_journey_title", userLang)}
            </Text>
            <Text style={styles.codeModalSub}>
              {t("generating_journey_sub", userLang)}
            </Text>
          </View>
        </View>
      </Modal>

      {/* MODAL DE RESET DA CONTA */}
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

            <Text style={styles.bottomSheetTitle}>
              {t("delete_account_title", userLang)}
            </Text>
            <Text style={styles.bottomSheetText}>
              <Text
                style={{ fontFamily: "Montserrat_900Black", color: "#D96C6C" }}
              >
                {t("warning_label", userLang)}
              </Text>{" "}
              {t("delete_account_msg", userLang)}
            </Text>

            <TouchableOpacity
              style={[
                styles.bottomSheetButtonPrimary,
                { backgroundColor: "#D96C6C", marginBottom: 10 },
              ]}
              activeOpacity={0.8}
              onPress={async () => {
                triggerHaptic("warning");
                setIsHardResetModalVisible(false);
                if (currentUid) {
                  try {
                    showCustomAlert(
                      t("resetting_database_title", userLang),
                      t("resetting_database_msg", userLang),
                      "spinner",
                      "#EAB64A"
                    );

                    await logAuditEvent(
                      currentUid,
                      "ACCOUNT_EXCLUSION_REQUESTED",
                      "Exclusão total solicitada via Hard Reset na HomeScreen"
                    );

                    if (userData?.partnerId) {
                      await setDoc(
                        doc(db, "users", userData.partnerId),
                        {
                          partnerId: null,
                          isSoloMode: false,
                          myTrail: null,
                          isReadyToStart: false,
                          hasPressedPlay: false,
                        },
                        { merge: true }
                      );
                    }

                    const journalsSnap = await getDocs(
                      collection(db, "users", currentUid, "journals")
                    );
                    const deletePromises = journalsSnap.docs.map((d) =>
                      deleteDoc(d.ref)
                    );
                    await Promise.all(deletePromises);

                    await deleteDoc(doc(db, "users", currentUid));

                    const user = auth.currentUser;
                    if (user) {
                      await deleteUser(user);
                    } else {
                      await auth.signOut();
                    }
                  } catch (error) {
                    showCustomAlert(
                      t("reset_error_title", userLang),
                      t("reset_error_msg", userLang),
                      "times-circle",
                      "#D96C6C"
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
                  {t("btn_confirm_delete_account", userLang)}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomSheetButtonSecondary}
              onPress={() => {
                triggerHaptic("light");
                setIsHardResetModalVisible(false);
              }}
            >
              <Text style={styles.bottomSheetButtonSecondaryText}>
                {t("modal_cancel", userLang)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ALERTAS CUSTOMIZADOS */}
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
                  {customAlert.confirmText || t("btn_understand", userLang)}
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
    fontFamily: "Montserrat_900Black",
    color: "#FFF",
    fontSize: 9,
  },
  nudgeItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F4F1",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#67D4A8",
    width: "100%",
    marginBottom: 10,
  },
  nudgeTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
    color: "#202D3A",
    marginBottom: 2,
  },
  nudgeText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    color: "#2C3E50",
    lineHeight: 18,
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
  goldChallengeWrapper: {
    position: "absolute",
    alignItems: "center",
    zIndex: 99999,
    elevation: 20,
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