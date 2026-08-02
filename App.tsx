import { NavigationContainer } from "@react-navigation/native";
import "react-native-gesture-handler"; // 🔥 ESSA É A REGRA DE OURO DO REACT NAVIGATION
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
