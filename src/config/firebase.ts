import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Extraímos a função via 'require' para o TypeScript não encher o saco
const firebaseAuth = require("firebase/auth");

// Credenciais de produção/teste do DuoElo
const firebaseConfig = {
  apiKey: "AIzaSyCpxkTVOLTtyqe_4FdUsrsFA7EiMv3K4Mk",
  authDomain: "duoelo-987fd.firebaseapp.com",
  projectId: "duoelo-987fd",
  storageBucket: "duoelo-987fd.firebasestorage.app",
  messagingSenderId: "504286284116",
  appId: "1:504286284116:web:8c45c91c21b6affc2420c1",
  measurementId: "G-H9KY9VV72Z",
};

const app = initializeApp(firebaseConfig);

// Inicializamos a Autenticação COM persistência local usando a função importada de forma silenciosa
export const auth = initializeAuth(app, {
  persistence: firebaseAuth.getReactNativePersistence(AsyncStorage),
});

// Exportamos as instâncias para usar no resto do app
export const db = getFirestore(app);

// Lá no final do seu arquivo config/firebase.js (junto com os exports)
export const authControls = { isCreatingAccount: false };
