import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

// 🔥 Adicione a importação do authControls
import { auth, authControls } from "../config/firebase";

import AnamneseScreen from "../screens/AnamneseScreen";
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import MissionRewardScreen from "../screens/MissionRewardScreen";
import PaywallScreen from "../screens/PaywallScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // 🔥 O SEGREDO AQUI: Se estiver criando a conta, ignora a mudança de estado!
      // Isso impede a tela de piscar para a Home.
      if (authControls && authControls.isCreatingAccount) {
        return;
      }

      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FAFAFA",
        }}
      >
        <ActivityIndicator size="large" color="#FF7EB3" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={user ? "Home" : "Login"}
    >
      {user ? (
        <Stack.Group>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Anamnesis" component={AnamneseScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Paywall" component={PaywallScreen} />
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
