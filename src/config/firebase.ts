import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

// Exportamos as instâncias para usar no resto do app
export const auth = getAuth(app);
export const db = getFirestore(app);
