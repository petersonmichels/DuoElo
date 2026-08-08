import { NavigationContainer } from "@react-navigation/native";
import { useEffect } from "react";
import { Platform } from "react-native";
import "react-native-gesture-handler";
import "react-native-get-random-values";
import Purchases from "react-native-purchases";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  useEffect(() => {
    const setupRevenueCat = async () => {
      if (Platform.OS === "android") {
        // A MÁGICA ACONTECE AQUI 👇
        Purchases.configure({ apiKey: "goog_bYcEfvvHdSDOOPlWDlhsnYxJJov" });
      }
    };
    setupRevenueCat();
  }, []);

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
