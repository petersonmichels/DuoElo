import { FontAwesome5 } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
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

  const [userLang, setUserLang] = useState("pt-BR");
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);
  const [isHardResetModalVisible, setIsHardResetModalVisible] = useState(false);
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false);

  const unreadNudges = userData?.cutucadas || 0;
  const [isGeneratingJourney, setIsGeneratingJourney] = useState(false);

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
    onSecondary: any = null,
  ) => {
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
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
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

  const hasCompletedAnamnesis = Boolean(userData?.hasCompletedAnamnesis);
  const partnerCompletedAnamnesis = Boolean(partnerData?.hasCompletedAnamnesis);

  const isPremium =
    Boolean(userData?.isPremium) || Boolean(partnerData?.isPremium);

  const hasPartner = Boolean(userData?.partnerId);
  const isSoloMode = Boolean(userData?.isSoloMode);
  const iAmReady = Boolean(userData?.isReadyToStart);
  const partnerIsReady = Boolean(partnerData?.isReadyToStart);

  const isMatchOrSoloDone = hasPartner || isSoloMode;

  const canActuallyPlay =
    isSoloMode || (hasPartner && partnerCompletedAnamnesis);

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
    "Parceiro(a)";

  const today = new Date();
  const lastTaskDateObj = userData?.lastTaskDate
    ? new Date(userData.lastTaskDate)
    : null;
  const hasCompletedTaskToday = Boolean(
    lastTaskDateObj &&
    lastTaskDateObj.getDate() === today.getDate() &&
    lastTaskDateObj.getMonth() === today.getMonth() &&
    lastTaskDateObj.getFullYear() === today.getFullYear(),
  );

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
          const firstTwo = chunk.splice(0, 2);
          chunk.push(...firstTwo);
        }
        myPersonalTrail.push(...chunk);
      }

      return myPersonalTrail;
    } catch (error) {
      console.error("Erro ao gerar matriz de tarefas:", error);
      return Array.from({ length: 90 }, (_, i) => i + 1);
    }
  };

  const handleHardReset = () => setIsHardResetModalVisible(true);
  const handleSendNudge = async () => {};
  const handleCloseNudges = async () => setIsNotificationsVisible(false);

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
        "Cruzamos os dados da sua avaliação. A trilha oficial de 90 dias está liberada!",
        "check-circle",
        "#67D4A8",
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
        if (partnerData?.pushToken) {
          sendPushNotificationDirectly(
            partnerData.pushToken,
            "🚀 Jornada Liberada!",
            "A trilha de vocês começou. Toque para ver a 1ª missão!",
          );
        }
        showCustomAlert(
          "Largada Autorizada! 🚀",
          "O algoritmo sincronizou as tarefas. A trilha oficial de 90 dias de vocês está liberada!",
          "flag-checkered",
          "#67D4A8",
        );
      } else {
        if (partnerData?.pushToken) {
          sendPushNotificationDirectly(
            partnerData.pushToken,
            "Sinal Verde Dado! 🚦",
            "Seu amor já deu o Play para a Jornada. Falta você!",
          );
        }
        showCustomAlert(
          "Sinal Verde Dado! 🚦",
          "Aguardando seu parceiro(a) apertar o Play para a largada oficial!",
          "hourglass-half",
          "#EAB64A",
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
        "#EAB64A",
      );
      navigation.navigate("AnamneseScreen");
      return;
    }

    if (!isPremium) {
      showCustomAlert(
        "Assinatura Necessária 🔒",
        "Para acessar e realizar esta missão, escolha um plano de assinatura.",
        "lock",
        "#EAB64A",
        "Ver Planos",
        () => navigation.navigate("PaywallScreen"),
        "Agora Não",
        () => {},
      );
      return;
    }

    if (isActuallyLocked) return;

    if (isWaiting && !isCompleted) {
      showCustomAlert(
        "Tudo no seu tempo ⏳",
        "Você já concluiu a missão de hoje! Volte amanhã para continuarmos fortalecendo o seu elo.",
        "hourglass-half",
        "#202D3A",
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
            "#EAB64A",
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
          "#EAB64A",
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
          onPress={() => setIsNotificationsVisible(true)}
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
                  showCustomAlert(
                    "Refazer Avaliação?",
                    "Sua avaliação já foi registrada com perfil padrão/personalizado. Deseja responder novamente para atualizar o diagnóstico do casal?",
                    "heartbeat",
                    "#EAB64A",
                    "Refazer Avaliação",
                    () => navigation.navigate("AnamneseScreen"),
                    "Manter Atual",
                    () => {},
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
            <Text style={styles.anamnesisTitle}>Sua Avaliação</Text>
            <Text style={styles.anamnesisSub}>
              {hasCompletedAnamnesis
                ? "Diagnóstico Concluído ✓"
                : "Descubram a temperatura da relação"}
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
                if (isMatchOrSoloDone) {
                  showCustomAlert(
                    "Match Concluído ✅",
                    "Sua opção de Match/Solo já foi registrada. Siga para o botão Play!",
                    "check-circle",
                    "#67D4A8",
                    "OK",
                    () => {},
                    "Gerenciar Match",
                    () => navigation.navigate("MainTabs", { screen: "Match" }),
                  );
                } else {
                  navigation.navigate("MainTabs", { screen: "Match" });
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
              {isMatchOrSoloDone ? "Match Concluído" : "Fazer Match"}
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
                <Text style={styles.mapLabelText}>Trilha Ativa</Text>
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
                <Text style={styles.mapLabelText}>Aguardando {pName}...</Text>
              </View>
            ) : (
              <Animated.View
                style={{
                  alignItems: "center",
                  transform:
                    isMatchOrSoloDone && canActuallyPlay
                      ? [{ scale: pulseAnim }]
                      : [{ scale: 1 }],
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.startJourneyBtn,
                    isMatchOrSoloDone
                      ? canActuallyPlay
                        ? {
                            backgroundColor: "#67D4A8",
                            borderColor: "#E8F4F1",
                            shadowColor: "#67D4A8",
                          }
                        : {
                            backgroundColor: "#EAB64A",
                            borderColor: "#FFF9E6",
                            shadowColor: "#EAB64A",
                          }
                      : {
                          backgroundColor: "#F0F4F8",
                          borderColor: "#D1D9E0",
                          elevation: 0,
                        },
                  ]}
                  activeOpacity={0.8}
                  disabled={!isMatchOrSoloDone}
                  onPress={() => {
                    // 🔒 MURALHA DE SEGURANÇA PREMIUM DO BOTÃO PLAY (Com Alerta de Segurança)
                    if (!isPremium) {
                      showCustomAlert(
                        "Plano Necessário 🔒",
                        "Para liberar a trilha oficial de 90 dias de desafios, escolha um dos planos de assinatura.",
                        "lock",
                        "#EAB64A",
                        "Ver Planos",
                        () => navigation.navigate("PaywallScreen"),
                        "Agora Não",
                        () => {},
                      );
                      return;
                    }
                    if (hasPartner) {
                      if (!partnerCompletedAnamnesis) {
                        showCustomAlert(
                          "Aguardando o Amor ⏳",
                          "O parceiro(a) ainda não concluiu a avaliação inicial.\n\nA largada só pode ser dada quando os dois finalizarem o diagnóstico!",
                          "clipboard-list",
                          "#EAB64A",
                          "Entendi",
                        );
                        return;
                      }
                      handleStartHandshake();
                    } else if (isSoloMode) {
                      handleStartSolo();
                    }
                  }}
                >
                  <FontAwesome5
                    name={
                      canActuallyPlay || !isMatchOrSoloDone
                        ? "play"
                        : "hourglass-half"
                    }
                    size={28}
                    color={isMatchOrSoloDone ? "#FFF" : "#AFAFAF"}
                    style={
                      canActuallyPlay || !isMatchOrSoloDone
                        ? { marginLeft: 4 }
                        : {}
                    }
                  />
                </TouchableOpacity>
                <Text
                  style={[
                    styles.mapLabelText,
                    !isMatchOrSoloDone && { color: "#AFAFAF" },
                    isMatchOrSoloDone &&
                      !canActuallyPlay && { color: "#EAB64A" },
                  ]}
                >
                  {isMatchOrSoloDone && !canActuallyPlay
                    ? "Aguardando Avaliação"
                    : "Dar o Play"}
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
                                color="#202D3A"
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
                                `Complete pelo menos 3 missões esta semana para desbloquear.\n\nProgresso atual: ${tasksDoneThisWeek}/3`,
                                "lock",
                                "#EAB64A",
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
                        <Text style={styles.challengeLabel}>Desafio</Text>
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
                  if (isTrailUnlocked && isJourneyFinished) {
                    showCustomAlert(
                      "🏆 Parabéns!",
                      "Você completou os 90 dias de conexão profunda.",
                      "trophy",
                      "#EAB64A",
                    );
                  } else if (hasCompletedAnamnesis && !isPremium) {
                    showCustomAlert(
                      "Assinatura Necessária 🔒",
                      "Para desbloquear a conclusão da sua jornada, escolha um plano.",
                      "lock",
                      "#EAB64A",
                      "Ver Planos",
                      () => navigation.navigate("PaywallScreen"),
                      "Agora Não",
                      () => {},
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

      {isTrailUnlocked && showFab && (
        <TouchableOpacity
          style={styles.floatingTargetBtn}
          onPress={() => scrollToActiveNode(true)}
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

            <Text style={styles.bottomSheetTitle}>Notificações</Text>

            {unreadNudges > 0 ? (
              <View style={styles.nudgeItem}>
                <FontAwesome5
                  name="hand-point-right"
                  size={24}
                  color="#EAB64A"
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.nudgeTitle}>Ei, atenção aqui!</Text>
                  <Text style={styles.nudgeText}>
                    Seu parceiro(a) te mandou{" "}
                    <Text style={{ fontFamily: "Montserrat_900Black" }}>
                      {unreadNudges}
                    </Text>{" "}
                    cutucada(s)! 👀
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

      {/* MODAL GERANDO JORNADA */}
      <Modal visible={isGeneratingJourney} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color="#67D4A8"
              style={{ transform: [{ scale: 1.5 }], marginBottom: 15 }}
            />
            <Text style={styles.codeModalTitle}>Gerando sua Jornada...</Text>
            <Text style={styles.codeModalSub}>
              Estamos cruzando os dados da avaliação. Prepare-se para a largada!
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
              Excluir Conta Permanentemente?
            </Text>
            <Text style={styles.bottomSheetText}>
              <Text
                style={{ fontFamily: "Montserrat_900Black", color: "#D96C6C" }}
              >
                ⚠️ ATENÇÃO:
              </Text>{" "}
              Isso apagará permanentemente sua avaliação, o status premium,
              desconectará o parceiro e resetará a conta do zero para refazer o
              teste.
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
                    showCustomAlert(
                      "Limpando o Banco...",
                      "Aguarde, destruindo todos os dados desta conta.",
                      "spinner",
                      "#EAB64A",
                    );

                    if (userData?.partnerId) {
                      await setDoc(
                        doc(db, "users", userData.partnerId),
                        { partnerId: null },
                        { merge: true },
                      );
                    }

                    const journalsSnap = await getDocs(
                      collection(db, "users", currentUid, "journals"),
                    );
                    const deletePromises = journalsSnap.docs.map((d) =>
                      deleteDoc(d.ref),
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
                      "Erro de Reset",
                      "Verifique a conexão ou faça login recente.",
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
                  SIM, EXCLUIR MINHA CONTA
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
                  setCustomAlert({ ...customAlert, visible: false });
                  if (customAlert.onConfirm) customAlert.onConfirm();
                }}
              >
                <Text style={styles.bottomSheetButtonPrimaryText}>
                  {customAlert.confirmText || "Entendi"}
                </Text>
              </TouchableOpacity>

              {customAlert.secondaryText ? (
                <TouchableOpacity
                  style={styles.bottomSheetButtonSecondary}
                  onPress={() => {
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
    zIndex: 50,
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
    elevation: 8,
    borderWidth: 2,
    borderColor: "#FFF",
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
