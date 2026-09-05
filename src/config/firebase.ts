import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth, initializeAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { Functions, getFunctions } from "firebase/functions";
import { Platform } from "react-native";

// 💳 CONFIGURAÇÃO SEGURA DO PROJETO FIREBASE
const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyCpxkTVOLTtyqe_4FdUsrsFA7EiMv3K4Mk",
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "duoelo-987fd.firebaseapp.com",
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "duoelo-987fd",
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "duoelo-987fd.firebasestorage.app",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "504286284116",
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    "1:504286284116:web:8c45c91c21b6affc2420c1",
  measurementId:
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-H9KY9VV72Z",
};

// 1. App Singleton
export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Auth Singleton com suporte a Fast Refresh e armazenamento assíncrono nativo
let authInstance: Auth;

if (Platform.OS === "web") {
  authInstance = getAuth(app);
} else {
  try {
    const { getReactNativePersistence } = require("firebase/auth");
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch (e: unknown) {
    // Caso o Auth já tenha sido inicializado durante o Fast Refresh / Hot Reloading
    authInstance = getAuth(app);
  }
}

export const auth: Auth = authInstance;

// 3. Firestore Singleton
export const db: Firestore = getFirestore(app);
export const getDb = (): Firestore => db;

// 4. Functions Singleton (Região do Luxemburgo / Europa)
export const functions: Functions = getFunctions(app, "europe-west1");
export const getFunctionsInstance = (): Functions => functions;

export const authControls = { isCreatingAccount: false };