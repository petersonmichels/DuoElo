import { FontAwesome5 } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import * as Clipboard from "expo-clipboard";
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
  Image,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Svg, { Circle } from "react-native-svg";

import { auth, db } from "../config/firebase";
import MissionExecutionScreen from "./MissionExecutionScreen";

const SUPPORTED_LANGUAGES = [
  { code: "pt-BR", flag: "🇧🇷" },
  { code: "pt-PT", flag: "🇵🇹" },
  { code: "pt-CV", flag: "🇨🇻" },
  { code: "en", flag: "🇺🇸" },
  { code: "es", flag: "🇪🇸" },
];

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
            stroke={isLit ? "#FF7EB3" : "#E5E5E5"}
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
          left: left,
          bottom: 25,
          opacity,
          transform: [{ translateY }, { scale }],
        }}
      >
        <FontAwesome5 name="heart" solid size={size} color="#FF7EB3" />
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

export default function HomeScreen({ navigation }: any) {
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [weekThemes, setWeekThemes] = useState<any>({});
  const [visibleWeek, setVisibleWeek] = useState(1);
  const weekPositions = useRef<{ [key: number]: number }>({}).current;
  const nodesWrapperY = useRef<number>(0);

  const [activeMission, setActiveMission] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isFetchingMission, setIsFetchingMission] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);

  const [isJourneyVideoVisible, setIsJourneyVideoVisible] = useState(false);
  const [userLang, setUserLang] = useState("pt-BR");
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);

  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  const [isHardResetModalVisible, setIsHardResetModalVisible] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [isMatching, setIsMatching] = useState(false);

  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "info-circle",
    color: "#CE82FF",
    confirmText: "",
    onConfirm: null as any,
  });

  const showCustomAlert = (
    title: string,
    message: string,
    icon = "info-circle",
    color = "#CE82FF",
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
  const activeNodeY = useRef<number>(0);
  const hasAutoScrolled = useRef<boolean>(false);
  const [arrowDirection, setArrowDirection] = useState<"up" | "down" | null>(
    null,
  );

  const totalStepsInModule = 90;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUid(user?.uid || null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (currentUid) {
      const userRef = doc(db, "users", currentUid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          if (data.language) setUserLang(data.language);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setUserData(null);
      setPartnerData(null);
    }
  }, [currentUid]);

  useEffect(() => {
    if (currentUid && userData) {
      if (!userData.myInviteCode) {
        const generatedCode = currentUid.substring(0, 6).toUpperCase();
        setDoc(
          doc(db, "users", currentUid),
          {
            myInviteCode: generatedCode,
          },
          { merge: true },
        ).catch((e) => console.log("Erro na auto-cura:", e));
      }
    }
  }, [currentUid, userData]);

  useEffect(() => {
    if (userData && userData.partnerId) {
      const partnerRef = doc(db, "users", userData.partnerId);
      const unsubscribePartner = onSnapshot(partnerRef, (docSnap) => {
        if (docSnap.exists()) {
          setPartnerData(docSnap.data());
        }
      });
      return () => unsubscribePartner();
    } else {
      setPartnerData(null);
    }
  }, [userData?.partnerId]);

  useEffect(() => {
    if (!userData) return;
    const fetchWeekThemes = async () => {
      try {
        const q = query(collection(db, "weeks"), where("moduleId", "==", 1));
        const querySnapshot = await getDocs(q);
        const themes: any = {};
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const weekNum = Number(data.weekNumber);
          if (!isNaN(weekNum)) themes[weekNum] = data.theme;
        });
        setWeekThemes(themes);
      } catch (error) {
        console.error("Erro ao buscar temas:", error);
      }
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
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [floatAnim, pulseAnim]);

  const hasCompletedAnamnesis = userData?.hasCompletedAnamnesis || false;
  const isPremium = userData?.isPremium || false;
  const hasPartner = !!userData?.partnerId;
  const currentTaskStep = userData?.currentTaskStep || 0;
  const currentStep = (userData?.currentPhase || 1) - 1;
  const isJourneyFinished = currentStep >= totalStepsInModule;
  const myInviteCode = currentUid?.substring(0, 6).toUpperCase() || "DUE-123";

  const isTrailUnlocked = hasCompletedAnamnesis && isPremium;

  const today = new Date();
  const lastTaskDateObj = userData?.lastTaskDate
    ? new Date(userData.lastTaskDate)
    : null;
  const hasCompletedTaskToday =
    lastTaskDateObj &&
    lastTaskDateObj.getDate() === today.getDate() &&
    lastTaskDateObj.getMonth() === today.getMonth() &&
    lastTaskDateObj.getFullYear() === today.getFullYear();

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

    if (activeNodeY.current > 0) {
      if (relativeY > activeNodeY.current + 100) {
        setArrowDirection("up");
      } else if (relativeY + 450 < activeNodeY.current) {
        setArrowDirection("down");
      } else {
        setArrowDirection(null);
      }
    }
  };

  const scrollToActiveNode = () => {
    if (scrollViewRef.current && activeNodeY.current > 0) {
      const absoluteY = activeNodeY.current + nodesWrapperY.current;
      scrollViewRef.current.scrollTo({
        y: Math.max(0, absoluteY - 250),
        animated: true,
      });
    }
  };

  const handleHardReset = () => setIsHardResetModalVisible(true);

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(myInviteCode);
      showCustomAlert(
        "Código Copiado! ✂️",
        "Cole no WhatsApp ou envie para o celular do seu parceiro(a) para conectarem as contas.",
        "copy",
        "#4BDE95",
      );
    } catch (error) {
      console.error("Erro ao copiar", error);
    }
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
        showCustomAlert(
          "Atenção",
          "WhatsApp não instalado neste dispositivo. Copie e envie o código manualmente!",
          "exclamation-triangle",
          "#FF9600",
        );
        setInviteSent(true);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleLinkPartnerCode = async () => {
    const cleanCode = inviteCodeInput.trim().toUpperCase();

    if (cleanCode.length < 5) {
      showCustomAlert(
        "Código Inválido",
        "Digite um código válido com pelo menos 5 caracteres.",
        "exclamation-circle",
        "#FF9600",
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
          "Não encontramos nenhuma conta com esse código. Verifique se o seu parceiro já acessou o app.",
          "search-minus",
          "#FF9600",
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
          "#FF4B4B",
        );
        setIsMatching(false);
        return;
      }

      const isPartnerPremium = partnerDataDb?.isPremium || false;

      await setDoc(
        doc(db, "users", currentUid),
        {
          partnerId: partnerId,
          isPremium: isPartnerPremium ? true : userData?.isPremium || false,
        },
        { merge: true },
      );

      await setDoc(
        doc(db, "users", partnerId),
        {
          partnerId: currentUid,
        },
        { merge: true },
      );

      setIsInviteModalVisible(false);
      setInviteCodeInput("");

      showCustomAlert(
        "Match Realizado! ❤️",
        `Você e o parceiro agora estão oficialmente conectados!`,
        "heart",
        "#FF7EB3",
      );
    } catch (error) {
      console.error("Erro ao fazer match:", error);
      showCustomAlert(
        "Erro de Conexão",
        "Ocorreu um problema ao tentar conectar as contas. Tente novamente.",
        "times-circle",
        "#FF4B4B",
      );
    } finally {
      setIsMatching(false);
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
        "#FF9600",
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
        "#CE82FF",
      );
      return;
    }

    const fetchMissionData = async () => {
      setIsFetchingMission(true);
      try {
        const phaseToFetch = stepIndex + 1;
        const q = query(
          collection(db, "tasks"),
          where("moduleId", "==", 1),
          where("phase", "==", phaseToFetch),
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          setActiveMission(querySnapshot.docs[0].data());
          setIsReviewMode(isCompleted);
          setIsModalVisible(true);

          if (!isCompleted && currentTaskStep === 0) {
            if (currentUid)
              await setDoc(
                doc(db, "users", currentUid),
                { currentTaskStep: 1 },
                { merge: true },
              );
          }
        } else {
          showCustomAlert(
            "Missão em Construção 🚧",
            "A missão desta fase está sendo preparada com muito carinho e estará disponível em breve!",
            "hard-hat",
            "#FF9600",
          );
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsFetchingMission(false);
      }
    };

    if (!hasPartner && !isCompleted) {
      showCustomAlert(
        "Modo Solo Ativado 👤",
        "Você pode fazer esta atividade sozinho(a), mas a verdadeira transformação acontece quando os dois participam juntos. Deseja continuar a missão?",
        "user",
        "#CE82FF",
        "Continuar Missão",
        fetchMissionData,
      );
    } else {
      fetchMissionData();
    }
  };

  const handleCompleteMission = async (journalText: string = "") => {
    if (!currentUid || !activeMission) return;
    try {
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
          phase: activeMission.phase || currentStep + 1,
          text: journalText,
          date: new Date().toISOString(),
        });
      }

      setIsModalVisible(false);
      setActiveMission(null);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#FF7EB3" />
      </View>
    );
  }

  const getThemeForWeek = (weekNum: number) => {
    const priorityModules = userData?.priorityModules || [];
    if (priorityModules.length >= 3) {
      if (weekNum <= 4) return priorityModules[0];
      if (weekNum <= 8) return priorityModules[1];
      return priorityModules[2];
    } else if (priorityModules.length > 0) {
      return priorityModules[0];
    }
    return weekThemes[weekNum] || "Fortalecendo o Elo";
  };

  const bannerWeekTheme = getThemeForWeek(visibleWeek);

  const currentFlag =
    SUPPORTED_LANGUAGES.find((l) => l.code === userLang)?.flag || "🇧🇷";
  const userPhoto = userData?.photoURL || userData?.photoUrl;
  const partnerPhoto =
    partnerData?.photoURL || partnerData?.photoUrl || userData?.partnerPhotoURL;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.miniAvatarsContainer}>
          <View style={[styles.miniAvatar, { zIndex: 2, overflow: "hidden" }]}>
            {userPhoto ? (
              <Image
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
                source={{ uri: partnerPhoto }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <FontAwesome5
                name="user-alt"
                size={16}
                color={hasPartner ? "#FF7EB3" : "#E5E5E5"}
              />
            )}
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.topBarItem}
            onPress={handleHardReset}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="eraser" size={20} color="#AFAFAF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topBarItem}
            onPress={() => setIsLangModalVisible(true)}
          >
            <Text style={styles.flagEmoji}>{currentFlag}</Text>
          </TouchableOpacity>
          <View style={styles.topBarItem}>
            <FontAwesome5 name="heart" solid size={20} color="#FF7EB3" />
            <Text style={[styles.topBarText, { color: "#FF7EB3" }]}>
              {userData?.totalPE || 0}
            </Text>
          </View>
          <View style={styles.topBarItem}>
            <FontAwesome5 name="fire" size={20} color="#FF9600" />
            <Text style={[styles.topBarText, { color: "#FF9600" }]}>
              {userData?.streak || 0}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.fixedHeaderBannerContainer}>
        <TouchableOpacity
          style={styles.fixedHeaderBanner}
          activeOpacity={0.9}
          onPress={scrollToActiveNode}
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
        style={styles.scrollContainer}
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
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
                      "Sua jornada já está em andamento com base no seu diagnóstico.",
                      "heartbeat",
                      "#FF7EB3",
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

            {!hasPartner && isPremium && (
              <TouchableOpacity
                style={styles.haveCodeLink}
                onPress={() => setIsInviteModalVisible(true)}
              >
                <Text style={styles.haveCodeLinkText}>
                  Fui convidado pelo meu par (Inserir Código)
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {hasCompletedAnamnesis && !hasPartner && isPremium && (
            <View style={styles.workflowCard}>
              <Text style={styles.workflowMainTitle}>Jornada Liberada! 🚀</Text>
              <Text style={styles.workflowSubTitle}>
                Você pode fazer as atividades no{" "}
                <Text style={{ fontWeight: "bold", color: "#FF7EB3" }}>
                  Modo Solo
                </Text>
                , mas a transformação real acontece quando os dois participam.
              </Text>

              <View style={styles.workflowLine} />

              <View style={styles.workflowStep}>
                <View
                  style={[
                    styles.stepIconContainer,
                    inviteSent ? styles.stepIconSuccess : styles.stepIconActive,
                  ]}
                >
                  <FontAwesome5
                    name={inviteSent ? "check" : "share-alt"}
                    size={16}
                    color="#FFF"
                  />
                </View>
                <Text
                  style={[
                    styles.stepTitle,
                    inviteSent ? styles.stepTextSuccess : {},
                  ]}
                >
                  {inviteSent
                    ? "1. Convite enviado!"
                    : "1. Enviar convite ao parceiro"}
                </Text>
              </View>

              <View style={styles.workflowStep}>
                <Animated.View
                  style={[
                    styles.stepIconContainer,
                    inviteSent
                      ? styles.stepIconWaiting
                      : styles.stepIconInactive,
                    {
                      transform: inviteSent
                        ? [{ scale: pulseAnim }]
                        : [{ scale: 1 }],
                    },
                  ]}
                >
                  <FontAwesome5
                    name="download"
                    size={16}
                    color={inviteSent ? "#FFC800" : "#AFAFAF"}
                  />
                </Animated.View>
                <Text
                  style={[
                    styles.stepTitle,
                    inviteSent
                      ? styles.stepTextWaiting
                      : styles.stepTextInactive,
                  ]}
                >
                  2. Aguardando parceiro(a)...
                </Text>
              </View>

              <TouchableOpacity
                style={styles.codeContainer}
                activeOpacity={0.7}
                onPress={handleCopyCode}
              >
                <Text style={styles.codeLabel}>Seu Código de Convite</Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 15,
                  }}
                >
                  <Text style={styles.codeValue}>{myInviteCode}</Text>
                  <FontAwesome5 name="copy" size={22} color="#AFAFAF" />
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    color: "#CECECE",
                    marginTop: 5,
                    fontWeight: "bold",
                  }}
                >
                  Toque para copiar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.whatsappButton}
                activeOpacity={0.8}
                onPress={handleSendInvite}
              >
                <FontAwesome5 name="whatsapp" size={20} color="#FFF" />
                <Text style={styles.whatsappButtonText}>
                  Convidar pelo WhatsApp
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View
            style={[
              styles.nodesWrapper,
              !isTrailUnlocked && styles.lockedTrailOverlay,
            ]}
            onLayout={(e) => {
              nodesWrapperY.current = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.specialNodeContainer}>
              <TouchableOpacity
                style={styles.startJourneyBtn}
                activeOpacity={0.8}
                onPress={() => {
                  if (isTrailUnlocked) setIsJourneyVideoVisible(true);
                  else if (hasCompletedAnamnesis && !isPremium)
                    navigation.navigate("Paywall");
                  else
                    showCustomAlert(
                      "Acesso Restrito",
                      "Conclua a Avaliação e assine o Premium primeiro.",
                      "lock",
                      "#FF9600",
                    );
                }}
              >
                <FontAwesome5
                  name={isTrailUnlocked ? "play" : "lock"}
                  size={28}
                  color="#FFF"
                />
              </TouchableOpacity>
              <Text style={styles.mapLabelText}>Instruções</Text>
            </View>

            {Array.from({ length: totalStepsInModule }).map((_, index) => {
              const isCompleted = isTrailUnlocked ? index < currentStep : false;
              const isNextUp = isTrailUnlocked ? index === currentStep : false;
              const isLocked = !isTrailUnlocked ? true : index > currentStep;

              const isWaitingForTomorrow = isNextUp && hasCompletedTaskToday;
              const isActive = isNextUp && !hasCompletedTaskToday;

              const isStartOfWeek = index % 7 === 0;
              const weekNumber = Math.floor(index / 7) + 1;
              const isWeeklyReward = (index + 1) % 7 === 0;
              const isDay5 = index % 7 === 4;

              const tasksDoneThisWeek = Math.max(
                0,
                currentStep - (weekNumber - 1) * 7,
              );
              const starsActive = Math.min(3, tasksDoneThisWeek);
              const isChallengeUnlocked = starsActive === 3;

              const translateX = Math.sin(index * 0.8) * 60;

              let nodeSize = 70;
              let iconSize = 24;
              let faceColor = "#E5E5E5";
              let baseColor = "#CECECE";
              let iconName = "lock";
              let iconColor = "#AFAFAF";

              if (isWeeklyReward) {
                nodeSize = 90;
                iconSize = 34;
                if (isCompleted) {
                  faceColor = "#4BDE95";
                  baseColor = "#38C982";
                  iconName = "check";
                  iconColor = "#FFF";
                } else if (isActive) {
                  faceColor = "#FFC800";
                  baseColor = "#E5B400";
                  iconName = "gift";
                  iconColor = "#FFF";
                } else if (isWaitingForTomorrow) {
                  faceColor = "#FFE899";
                  baseColor = "#FFD147";
                  iconName = "clock";
                  iconColor = "#FFF";
                } else {
                  faceColor = "#E5E5E5";
                  baseColor = "#CECECE";
                  iconName = "gift";
                  iconColor = "#AFAFAF";
                }
              } else {
                if (isCompleted) {
                  faceColor = "#4BDE95";
                  baseColor = "#38C982";
                  iconName = "check";
                  iconColor = "#FFF";
                } else if (isActive) {
                  faceColor = "#FF7EB3";
                  baseColor = "#E04A85";
                  iconName = "play";
                  iconColor = "#FFF";
                } else if (isWaitingForTomorrow) {
                  faceColor = "#F2D5FF";
                  baseColor = "#DCA3FF";
                  iconName = "clock";
                  iconColor = "#FFF";
                }
              }

              const ringPadding = 24;
              const ringSize = nodeSize + ringPadding;
              const absoluteOffset = -(ringPadding / 2);

              return (
                <React.Fragment key={index}>
                  {isStartOfWeek && (
                    <View
                      style={styles.weekDividerContainer}
                      onLayout={(event) => {
                        weekPositions[weekNumber] =
                          event.nativeEvent.layout.y + nodesWrapperY.current;
                      }}
                    >
                      <View style={styles.dashedLine} />
                      <View style={styles.weekTextWrapper}>
                        <Text style={styles.weekTitleText}>
                          SEMANA {weekNumber}
                        </Text>
                        <Text style={[styles.weekThemeText, { minHeight: 24 }]}>
                          {isTrailUnlocked ? getThemeForWeek(weekNumber) : "🔒"}
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
                    onLayout={(event) => {
                      if (isNextUp) {
                        activeNodeY.current = event.nativeEvent.layout.y;
                        if (
                          !hasAutoScrolled.current &&
                          scrollViewRef.current &&
                          isTrailUnlocked
                        ) {
                          hasAutoScrolled.current = true;
                          setTimeout(() => {
                            const absoluteY =
                              activeNodeY.current + nodesWrapperY.current;
                            scrollViewRef.current?.scrollTo({
                              y: Math.max(0, absoluteY - 250),
                              animated: false,
                            });
                          }, 100);
                        }
                      }
                    }}
                  >
                    {isNextUp && (
                      <Animated.View
                        style={
                          {
                            position: "absolute",
                            top: absoluteOffset,
                            left: absoluteOffset,
                            width: ringSize,
                            height: ringSize,
                            transform: [
                              { translateY: -5 },
                              { scale: pulseAnim },
                            ],
                            zIndex: 0,
                            pointerEvents: "none",
                          } as any
                        }
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
                          styles.weeklyChallengeWrapper,
                          { left: nodeSize + 45, top: (nodeSize - 65) / 2 },
                        ]}
                      >
                        <TouchableOpacity
                          style={[
                            styles.weeklyChallengeBtn,
                            !isChallengeUnlocked &&
                              styles.weeklyChallengeBtnLocked,
                          ]}
                          activeOpacity={0.8}
                          onPress={() => {
                            if (!isChallengeUnlocked) {
                              showCustomAlert(
                                "Cupido Dormindo 💤",
                                "Complete 3 missões desta semana para acordar o Cupido e liberar este desafio extra!",
                                "moon",
                                "#AFAFAF",
                              );
                            } else if (isTrailUnlocked) {
                              showCustomAlert(
                                "Desafio da Semana",
                                "O Desafio prático liberado pelo Cupido da semana!",
                                "star",
                                "#FF9600",
                              );
                            } else if (hasCompletedAnamnesis && !isPremium) {
                              navigation.navigate("Paywall");
                            } else {
                              showCustomAlert(
                                "Aviso",
                                "Conclua a Avaliação primeiro.",
                                "lock",
                                "#AFAFAF",
                              );
                            }
                          }}
                        >
                          <Animated.View
                            style={[
                              styles.cupidFloatingBadge,
                              {
                                transform: [{ translateY: floatAnim }],
                                pointerEvents: "none",
                              } as any,
                            ]}
                          >
                            <Image
                              source={{
                                uri: isChallengeUnlocked
                                  ? "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f498.png"
                                  : "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f47c.png",
                              }}
                              style={[
                                styles.cupid3DImage,
                                !isChallengeUnlocked && { opacity: 0.3 },
                              ]}
                              resizeMode="cover"
                            />
                            {!isChallengeUnlocked && (
                              <View style={styles.zzzOverlay}>
                                <Text style={styles.zzzText}>Zzz</Text>
                              </View>
                            )}
                          </Animated.View>
                          <FontAwesome5
                            name={isChallengeUnlocked ? "star" : "lock"}
                            size={24}
                            color={isChallengeUnlocked ? "#FFF" : "#AFAFAF"}
                          />
                        </TouchableOpacity>
                        <Text style={styles.challengeLabel}>Desafio</Text>

                        <View style={styles.challengeStarsRow}>
                          {[1, 2, 3].map((starNum) => (
                            <FontAwesome5
                              key={starNum}
                              name="star"
                              solid
                              size={10}
                              color={
                                starNum <= starsActive ? "#FFC800" : "#E5E5E5"
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
                      "Você completou os 90 dias de conexão profunda. O elo de vocês agora é inquebrável.",
                      "trophy",
                      "#FFC800",
                    );
                  else if (hasCompletedAnamnesis && !isPremium)
                    navigation.navigate("Paywall");
                  else
                    showCustomAlert(
                      "Bloqueado 🔒",
                      "Chegue ao final dos 90 dias para desbloquear a recompensa suprema.",
                      "lock",
                      "#AFAFAF",
                    );
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

      {arrowDirection && isTrailUnlocked && (
        <TouchableOpacity
          style={styles.scrollToActiveBtn}
          activeOpacity={0.8}
          onPress={scrollToActiveNode}
        >
          <FontAwesome5
            name={`chevron-${arrowDirection}`}
            size={24}
            color="#FFF"
          />
        </TouchableOpacity>
      )}

      <View style={styles.bottomMenu}>
        <TouchableOpacity style={styles.menuItem}>
          <FontAwesome5 name="home" size={26} color="#FF7EB3" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("Profile")}
        >
          <FontAwesome5 name="user-alt" size={26} color="#AFAFAF" />
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
                onPress={() => {
                  setUserLang(lang.code);
                  setIsLangModalVisible(false);
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
            <Video
              source={require("../assets/Jornada_de_90_Dias.mp4")}
              style={styles.fullscreenVideo}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={isJourneyVideoVisible}
              onPlaybackStatusUpdate={(status) => {
                if (status.isLoaded && status.didJustFinish)
                  setIsJourneyVideoVisible(false);
              }}
            />
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
                <Text style={styles.linkButtonText}>Conectar Contas</Text>
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

      {/* 🔥 BOTTOM SHEET DE AUDITORIA CORRIGIDO E VISÍVEL */}
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
                { backgroundColor: "#FF4B4B20" },
              ]}
            >
              <FontAwesome5 name="eraser" size={28} color="#FF4B4B" />
            </View>

            <Text style={styles.bottomSheetTitle}>Zerar Sistema?</Text>
            <Text style={styles.bottomSheetText}>
              <Text style={{ fontWeight: "bold", color: "#FF4B4B" }}>
                ⚠️ MODO DE AUDITORIA:
              </Text>{" "}
              Isso apagará sua avaliação, o status premium, desconectará o
              parceiro e resetará a trilha para o Dia 0.
            </Text>

            {/* 🔥 BOTÃO DE ZERAR AGORA É VERMELHO VIBRANTE E 100% VISÍVEL */}
            <TouchableOpacity
              style={[
                styles.bottomSheetButtonPrimary,
                { backgroundColor: "#FF4B4B", marginBottom: 10 },
              ]}
              activeOpacity={0.8}
              onPress={async () => {
                setIsHardResetModalVisible(false);
                if (currentUid) {
                  try {
                    if (userData?.partnerId) {
                      try {
                        await setDoc(
                          doc(db, "users", userData.partnerId),
                          {
                            partnerId: null,
                            partnerPhotoURL: null,
                            partnerPhotoUrl: null,
                          },
                          { merge: true },
                        );
                      } catch (e) {}
                    }
                    await setDoc(
                      doc(db, "users", currentUid),
                      {
                        hasCompletedAnamnesis: false,
                        isPremium: false,
                        priorityModules: [],
                        diagnosticTags: [],
                        anamnesisScores: [],
                        anamnesisScore: 0,
                        currentPhase: 1,
                        currentTaskStep: 0,
                        totalPE: 0,
                        streak: 0,
                        partnerId: null,
                        linkedInviteCode: null,
                        partnerPhotoURL: null,
                        partnerPhotoUrl: null,
                        lastTaskDate: null,
                      },
                      { merge: true },
                    );
                    showCustomAlert(
                      "Auditoria Concluída",
                      "Sistema limpo com sucesso. Você voltou para o Modo Gratuito / Dia 0.",
                      "check-circle",
                      "#4BDE95",
                    );
                  } catch (error) {
                    showCustomAlert(
                      "Erro de Reset",
                      "Não foi possível resetar os dados.",
                      "times-circle",
                      "#FF4B4B",
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
                  SIM, APAGAR TUDO
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

      {/* 🔥 MODAL DE ALERTA PERSONALIZADO (Substitui alerts do navegador) */}
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
  container: { flex: 1, backgroundColor: "#FFFFFF", width: "100%" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "#FFF",
    width: "100%",
  },
  miniAvatarsContainer: { flexDirection: "row", alignItems: "center" },
  miniAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
  miniPartnerAvatar: { marginLeft: -12, backgroundColor: "#FFF0F6" },
  avatarImage: { width: "100%", height: "100%" },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  topBarItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  flagEmoji: { fontSize: 26 },
  topBarText: { fontSize: 17, fontWeight: "900" },
  fixedHeaderBannerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 2,
    borderBottomColor: "#E5E5E5",
    zIndex: 10,
    width: "100%",
  },
  fixedHeaderBanner: {
    backgroundColor: "#FF7EB3",
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
  anamnesisNodeContainer: {
    alignItems: "center",
    marginVertical: 35,
    position: "relative",
  },
  freeBadge: {
    position: "absolute",
    top: -15,
    zIndex: 10,
    backgroundColor: "#FF4B4B",
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
    backgroundColor: "#CE82FF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#CE82FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: "#F2E5FF",
  },
  anamnesisBtnCompleted: {
    backgroundColor: "#4BDE95",
    borderColor: "#D8F7E8",
    shadowColor: "#4BDE95",
  },
  anamnesisTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "900",
    color: "#333",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  anamnesisSub: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "#AFAFAF",
  },
  haveCodeLink: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#FFF0E5",
    borderRadius: 20,
  },
  haveCodeLinkText: { color: "#FF9600", fontWeight: "bold", fontSize: 14 },
  workflowCard: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 25,
    marginTop: 10,
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  workflowMainTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 8,
  },
  workflowSubTitle: {
    fontSize: 14,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 20,
  },
  workflowLine: {
    position: "absolute",
    left: 45,
    top: 115,
    bottom: 180,
    width: 2,
    backgroundColor: "#E5E5E5",
    zIndex: 0,
  },
  workflowStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    zIndex: 1,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepIconActive: { backgroundColor: "#2C3E50" },
  stepIconWaiting: {
    backgroundColor: "#FFF9E6",
    borderWidth: 2,
    borderColor: "#FFC800",
  },
  stepIconSuccess: { backgroundColor: "#4BDE95" },
  stepIconInactive: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    elevation: 0,
  },
  stepTitle: { fontSize: 14, fontWeight: "600", color: "#333", marginLeft: 16 },
  stepTextSuccess: { color: "#4BDE95" },
  stepTextWaiting: { color: "#FF9600" },
  stepTextInactive: { color: "#AFAFAF" },
  codeContainer: {
    backgroundColor: "#F8F9FA",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  codeLabel: {
    fontSize: 11,
    color: "#AFAFAF",
    textTransform: "uppercase",
    fontWeight: "bold",
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#333",
    letterSpacing: 2,
  },
  whatsappButton: {
    flexDirection: "row",
    backgroundColor: "#25D366",
    borderRadius: 14,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  whatsappButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  nodesWrapper: { width: "100%", alignItems: "center" },
  lockedTrailOverlay: { opacity: 0.35 },
  specialNodeContainer: { alignItems: "center", marginBottom: 35 },
  startJourneyBtn: {
    width: 75,
    height: 75,
    borderRadius: 24,
    backgroundColor: "#CE82FF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 3,
    borderColor: "#EAD1FF",
  },
  mapLabelText: {
    marginTop: 10,
    fontWeight: "bold",
    color: "#AFAFAF",
    fontSize: 13,
    textTransform: "uppercase",
    textAlign: "center",
  },

  weeklyChallengeWrapper: {
    position: "absolute",
    alignItems: "center",
    zIndex: 50,
  },
  weeklyChallengeBtn: {
    width: 65,
    height: 65,
    borderRadius: 22,
    backgroundColor: "#FF9600",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF9600",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: "#FFE273",
    position: "relative",
  },
  weeklyChallengeBtnLocked: {
    backgroundColor: "#F5F5F5",
    borderColor: "#E5E5E5",
    shadowColor: "transparent",
    elevation: 0,
  },
  challengeLabel: {
    marginTop: 8,
    fontWeight: "bold",
    color: "#AFAFAF",
    fontSize: 12,
    textTransform: "uppercase",
    textAlign: "center",
  },
  challengeStarsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
  },
  cupidFloatingBadge: {
    position: "absolute",
    top: -35,
    right: -15,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    borderRadius: 32.5,
    backgroundColor: "#FFF",
  },
  cupid3DImage: { width: 65, height: 65, borderRadius: 32.5 },
  zzzOverlay: { position: "absolute", top: 15, left: 15 },
  zzzText: { color: "#AFAFAF", fontSize: 14, fontWeight: "900" },

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
  endJourneyBtnLocked: { backgroundColor: "#E5E5E5", borderColor: "#CECECE" },
  endJourneyBtnActive: { backgroundColor: "#FFC800", borderColor: "#FFE273" },
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
    borderColor: "#E5E5E5",
    borderStyle: "dashed",
    borderRadius: 1,
    marginBottom: 16,
  },
  weekTextWrapper: { alignItems: "center", justifyContent: "center" },
  weekTitleText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#B0B0B0",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  weekThemeText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#555",
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
  scrollToActiveBtn: {
    position: "absolute",
    right: 25,
    bottom: 95,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF7EB3",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 100,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  bottomMenu: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingVertical: 15,
    paddingBottom: 30,
    borderTopWidth: 2,
    borderTopColor: "#E5E5E5",
  },
  menuItem: { padding: 10, alignItems: "center", justifyContent: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  compactLangModal: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 12,
    marginTop: 60,
    marginLeft: 20,
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
    backgroundColor: "#FFF0F6",
    borderWidth: 2,
    borderColor: "#FF7EB3",
  },
  compactFlagText: { fontSize: 28 },
  videoModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)" },
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
    backgroundColor: "rgba(0,0,0,0.5)",
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
    color: "#2C3E50",
    marginBottom: 10,
  },
  codeModalSub: {
    fontSize: 14,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 20,
  },
  codeInputField: {
    width: "100%",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 20,
    color: "#333",
  },
  linkButton: {
    backgroundColor: "#FF7EB3",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  linkButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  cancelLinkButton: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelLinkButtonText: { color: "#AFAFAF", fontSize: 14, fontWeight: "bold" },

  // 🔥 BOTTOM SHEET E ALERTA SLIDING MENU
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    backgroundColor: "#E5E5E5",
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
    color: "#2C3E50",
    marginBottom: 10,
    textAlign: "center",
  },
  bottomSheetText: {
    fontSize: 15,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  bottomSheetButtonPrimary: {
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
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
  },
  bottomSheetButtonSecondaryText: {
    color: "#AFAFAF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
