import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../config/firebase";

export function useSubscription() {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setIsPremium(false);
      setLoading(false);
      return;
    }

    // Monitora as alterações da conta em tempo real
    const unsubscribeUser = onSnapshot(
      doc(db, "users", user.uid),
      async (userDoc) => {
        if (!userDoc.exists()) {
          setIsPremium(false);
          setLoading(false);
          return;
        }

        const userData = userDoc.data();

        // 1. O próprio usuário é Premium?
        if (userData?.isPremium) {
          setIsPremium(true);
          setLoading(false);
          return;
        }

        // 2. Se não for, o Parceiro (Match) é Premium?
        if (userData?.partnerId) {
          try {
            const partnerDoc = await getDoc(
              doc(db, "users", userData.partnerId),
            );
            if (partnerDoc.exists() && partnerDoc.data()?.isPremium) {
              setIsPremium(true);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error("Erro ao verificar assinatura do parceiro:", e);
          }
        }

        // 3. Nenhum dos dois é Premium
        setIsPremium(false);
        setLoading(false);
      },
      (error) => {
        console.error("Erro no listener de assinatura:", error);
        setIsPremium(false);
        setLoading(false);
      },
    );

    return () => unsubscribeUser();
  }, []);

  return { isPremium, loading };
}
