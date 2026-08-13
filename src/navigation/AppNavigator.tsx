import { FontAwesome5 } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

// 🔥 Controle de segurança do Firebase
import { auth, authControls } from "../config/firebase";

// Suas Telas Oficiais
import AnamneseScreen from "../screens/AnamneseScreen";
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import MatchScreen from "../screens/MatchScreen";
import MissionRewardScreen from "../screens/MissionRewardScreen";
import PaywallScreen from "../screens/PaywallScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ==========================================
// 🚀 TELAS PROVISÓRIAS
// ==========================================
const PlaceholderScreen = ({
  title,
  icon,
}: {
  title: string;
  icon: string;
}) => (
  <View style={styles.placeholderContainer}>
    <FontAwesome5
      name={icon}
      size={60}
      color="#D1D9E0"
      style={{ marginBottom: 20 }}
    />
    <Text style={styles.placeholderTitle}>{title}</Text>
    <Text style={styles.placeholderSub}>
      Área em construção (Próxima Sprint)
    </Text>
  </View>
);

const TarefasScreen = () => (
  <PlaceholderScreen title="Feed de Tarefas" icon="clipboard-list" />
);

const LojaScreen = () => <PlaceholderScreen title="Loja DuoElo" icon="store" />;

// ==========================================
// 🚀 O MENU INFERIOR (BOTTOM TABS)
// ==========================================
function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#202D3A",
        tabBarInactiveTintColor: "#AFAFAF",
        tabBarStyle: {
          backgroundColor: "#FFF",
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
        name="Tarefas"
        component={TarefasScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="tasks" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Match"
        component={MatchScreen}
        options={{
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
                color={focused ? "#202D3A" : "#FFF"}
              />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Loja"
        component={LojaScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="shopping-bag" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="user-alt" size={20} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ==========================================
// 🚀 NAVEGADOR PRINCIPAL (STACK)
// ==========================================
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
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F4F8",
  },
  placeholderTitle: {
    fontSize: 22,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
  },
  placeholderSub: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    color: "#60646C",
    marginTop: 8,
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
    borderColor: "#FFF",
  },
  floatingButtonActive: {
    backgroundColor: "#67D4A8",
    shadowColor: "#67D4A8",
  },
});
