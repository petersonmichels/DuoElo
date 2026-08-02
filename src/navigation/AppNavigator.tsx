import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { auth } from "../config/firebase";

import AnamneseScreen from "../screens/AnamneseScreen";
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import ProfileScreen from "../screens/ProfileScreen";
// O InvitePartnerScreen original nem precisa mais ser importado se tudo vai rolar na Home!

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
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
      // 🔥 AGORA É SIMPLES: Tem usuário? Vai pra Home. Não tem? Vai pro Login.
      initialRouteName={user ? "Home" : "Login"}
    >
      {user ? (
        <Stack.Group>
          {/* A Home agora é a rainha do aplicativo, ela gerencia tudo */}
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Anamnesis" component={AnamneseScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          {/* Nossa nova super tela unificada de Login/Cadastro */}
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
