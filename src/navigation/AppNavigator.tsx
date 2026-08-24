import { FontAwesome5 } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  View,
} from "react-native";

import { auth, authControls, db } from "../config/firebase";
import { t } from "../i18n/translations";

import AnamneseScreen from "../screens/AnamneseScreen";
import HabitsConfigScreen from "../screens/HabitsConfigScreen";
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import MatchScreen from "../screens/MatchScreen";
import MissionRewardScreen from "../screens/MissionRewardScreen";
import PaywallScreen from "../screens/PaywallScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ShopScreen from "../screens/ShopScreen";
import VidaScreen from "../screens/VidaScreen";

export type RootStackParamList = {
  MainTabs: { screen?: string } | undefined;
  AnamneseScreen: undefined;
  PaywallScreen: undefined;
  MissionReward: undefined;
  Login: undefined;
  HabitsConfigScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// 💡 ÍCONE DA VIDA PULSANTE EM VERMELHO VIVO QUANDO HÁ PENDÊNCIAS
const PulsingVidaIcon = ({ color, uid }: { color: string; uid: string | undefined }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    if (!uid || !auth.currentUser) return;
    const todayStr = new Date().toISOString().split("T")[0];

    const unsubscribeUser = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (!auth.currentUser) return;
        if (snap.exists()) {
          const data = snap.data();
          const partnerUid = data.partnerId;

          // Onboarding e Dados Cadastrais
          const noPhoto = !data.photoURL && !data.photoUrl;
          const noPartner = !partnerUid && !data.isSoloMode;

          const hasName = !!(data.billingFirstName || data.firstName || data.displayName);
          const hasPhone = !!(data.billingPhone || data.phone || data.phoneNumber);
          const hasCompleteProfileData = hasName && hasPhone;

          const isJourneyStarted =
            !!data.isSoloMode ||
            !!data.isJourneyStarted ||
            !!data.anamneseCompleted ||
            !!data.anamneseSkipped ||
            !!data.lastTaskDate ||
            (data.currentPhase && data.currentPhase > 0);

          // Checagem rigorosa da missão do dia
          const isMissionDoneToday =
            data.lastTaskDate === todayStr ||
            data.isDailyTaskCompleted === true ||
            data.dailyTaskDone === true ||
            data.isTaskPending === false;

          const habitsNotDone =
            data.habitsCompletedDate !== todayStr ||
            (data.completedHabitsToday || []).length === 0;

          // Subcoleção de Compras
          const unSubRedemptions = onSnapshot(
            doc(db, "users", uid, "shop", "redemptions"),
            (redemptionSnap) => {
              if (!auth.currentUser) return;
              const myPurchases = redemptionSnap.exists() ? redemptionSnap.data() : {};
              const hasGiftToDeliver = Object.entries(myPurchases).some(
                ([_, value]: [string, any]) => value?.status === "bought"
              );

              // Subcoleção de Desejos
              const unSubDesires = onSnapshot(
                doc(db, "users", uid, "shop", "desires"),
                (desiresSnap) => {
                  if (!auth.currentUser) return;
                  const currentPhase = data.currentPhase || 1;
                  const currentWeek = Math.min(13, Math.floor((currentPhase - 1) / 7) + 1);
                  const myDesires = desiresSnap.exists() ? desiresSnap.data().list || {} : {};
                  const hasSelectedMyCurrentWeekGift = !!myDesires[currentWeek];

                  setHasPending(
                    noPhoto ||
                    !hasCompleteProfileData ||
                    noPartner ||
                    !isJourneyStarted ||
                    !isMissionDoneToday ||
                    !hasSelectedMyCurrentWeekGift ||
                    hasGiftToDeliver ||
                    habitsNotDone
                  );
                },
                (err) => {
                  if (err.code === "permission-denied")
                    console.log("[AppNavigator] Listener de desejos encerrado.");
                }
              );

              return () => unSubDesires();
            },
            (err) => {
              if (err.code === "permission-denied")
                console.log("[AppNavigator] Listener de compras encerrado.");
            }
          );

          return () => unSubRedemptions();
        }
      },
      (err) => {
        if (err.code === "permission-denied")
          console.log("[AppNavigator] Listener de usuário encerrado.");
      }
    );

    return () => unsubscribeUser();
  }, [uid]);

  useEffect(() => {
    if (hasPending) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasPending]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <FontAwesome5
        name="heartbeat"
        size={20}
        color={hasPending ? "#FF4B4B" : color}
      />
    </Animated.View>
  );
};

function ShopScreenWrapper(props: any) {
  const [userData, setUserData] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUid || !auth.currentUser) return;
    let unsubscribeUser: () => void;

    const timer = setTimeout(() => {
      unsubscribeUser = onSnapshot(
        doc(db, "users", currentUid),
        (docSnap) => {
          if (!auth.currentUser) return;
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        },
        (err) => {
          if (err.code === "permission-denied")
            console.log("[AppNavigator] Listener Wrapper encerrado.");
        }
      );
    }, 50);

    return () => {
      clearTimeout(timer);
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [currentUid]);

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
          if (docSnap.exists()) {
            setPartnerData(docSnap.data());
          }
        },
        (err) => {
          if (err.code === "permission-denied")
            console.log("[AppNavigator] Listener Parceiro Wrapper encerrado.");
        }
      );
    }, 50);

    return () => {
      clearTimeout(timer);
      if (unsubscribePartner) unsubscribePartner();
    };
  }, [userData?.partnerId]);

  return (
    <ShopScreen {...props} userData={userData} partnerData={partnerData} />
  );
}

function MainTabs() {
  const [userLang, setUserLang] = useState("pt-BR");
  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUid || !auth.currentUser) return;
    let unsubscribe: () => void;

    const timer = setTimeout(() => {
      unsubscribe = onSnapshot(
        doc(db, "users", currentUid),
        (docSnap) => {
          if (!auth.currentUser) return;
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data?.language) {
              setUserLang(data.language);
            }
          }
        },
        (err) => {
          if (err.code === "permission-denied")
            console.log("[AppNavigator] Listener Idioma encerrado.");
        }
      );
    }, 50);

    return () => {
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
    };
  }, [currentUid]);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#1A2F3B",
        tabBarInactiveTintColor: "#AFAFAF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          elevation: 15,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          height: Platform.OS === "ios" ? 90 : 70,
          paddingBottom: Platform.OS === "ios" ? 25 : 10,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Montserrat_700Bold",
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Vida"
        component={VidaScreen}
        options={{
          tabBarLabel: "VIDA",
          tabBarIcon: ({ color }) => (
            <PulsingVidaIcon color={color} uid={currentUid} />
          ),
        }}
      />

      <Tab.Screen
        name="Match"
        component={MatchScreen}
        options={{
          tabBarLabel: t("tab_match", userLang) || "Match",
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="user-friends" size={18} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.floatingButton,
                focused && styles.floatingButtonActive,
              ]}
            >
              <FontAwesome5
                name="map-marked-alt"
                size={24}
                color={focused ? "#1A2F3B" : "#FFFFFF"}
              />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Loja"
        component={ShopScreenWrapper}
        options={{
          tabBarLabel: t("tab_shop", userLang) || "Loja",
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="shopping-bag" size={20} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarLabel: t("tab_profile", userLang) || "Perfil",
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="user-alt" size={20} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (authControls && authControls.isCreatingAccount) {
        return;
      }

      if (currentUser && currentUser.uid) {
        setUser(currentUser);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EAB64A" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Group>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="AnamneseScreen" component={AnamneseScreen} />
          <Stack.Screen name="PaywallScreen" component={PaywallScreen} />
          <Stack.Screen name="MissionReward" component={MissionRewardScreen} />
          <Stack.Screen
            name="HabitsConfigScreen"
            component={HabitsConfigScreen}
          />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F4F8",
  },
  floatingButton: {
    top: -20,
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#EAB64A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EAB64A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  floatingButtonActive: {
    backgroundColor: "#67D4A8",
    shadowColor: "#67D4A8",
  },
});