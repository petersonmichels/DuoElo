import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  Auth,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Configuração do projeto Firebase DuoElo
const firebaseConfig = {
  apiKey: "AIzaSyCpxkTVOLTtyqe_4FdUsrsFA7EiMv3K4Mk",
  authDomain: "duoelo-987fd.firebaseapp.com",
  projectId: "duoelo-987fd",
  storageBucket: "duoelo-987fd.firebasestorage.app",
  messagingSenderId: "504286284116",
  appId: "1:504286284116:web:8c45c91c21b6affc2420c1",
  measurementId: "G-H9KY9VV72Z",
};

// 1. Inicializa o aplicativo Firebase (se ainda não existir)
export const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Tenta inicializar o Auth com AsyncStorage PRIMEIRO.
// Se já tiver sido inicializado (no Fast Refresh), faz o fallback para getAuth.
let authInstance: Auth;

try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (e) {
  // Se der erro dizendo que o Auth já foi inicializado neste App, reaproveita a instância existente
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
export const functions = getFunctions(app, "europe-west1");

export const authControls = { isCreatingAccount: false };
