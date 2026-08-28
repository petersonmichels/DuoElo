import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../config/firebase";

export function useSubscription() {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Monitora o estado da sessão de autenticação do Firebase
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setIsPremium(false);
        setLoading(false);
        return;
      }

      // Monitora os dados do usuário em tempo real no Firestore
      const unsubscribeUser = onSnapshot(
        doc(db, "users", user.uid),
        async (userDoc) => {
          if (!userDoc.exists()) {
            setIsPremium(false);
            setLoading(false);
            return;
          }

          const userData = userDoc.data();

          // 1. O próprio usuário tem assinatura ativa?
          if (userData?.isPremium) {
            setIsPremium(true);
            setLoading(false);
            return;
          }

          // 2. Se não for, o Parceiro (Match) possui o plano Premium?
          if (userData?.partnerId) {
            try {
              const partnerDoc = await getDoc(
                doc(db, "users", userData.partnerId)
              );
              if (partnerDoc.exists() && partnerDoc.data()?.isPremium) {
                setIsPremium(true);
                setLoading(false);
                return;
              }
            } catch (e) {
              console.error("[SUBSCRIPTION_ERROR] Erro ao verificar parceiro:", e);
            }
          }

          // 3. Nenhum dos dois membros do casal possui Premium
          setIsPremium(false);
          setLoading(false);
        },
        (error) => {
          console.error("[SUBSCRIPTION_ERROR] Erro no listener de assinatura:", error);
          setIsPremium(false);
          setLoading(false);
        }
      );

      return () => unsubscribeUser();
    });

    return () => unsubscribeAuth();
  }, []);

  return { isPremium, loading };
}