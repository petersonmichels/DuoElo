import { FontAwesome5 } from "@expo/vector-icons";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth, db } from "../config/firebase";
import { t } from "../i18n/translations";

let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch (e) {}

const ATOMIC_HABITS_CATALOG = [
  { id: "water_morning", icon: "tint", titleKey: "habit_water_morning_title", points: 5, frequency: "daily" },
  { id: "water_lunch", icon: "tint", titleKey: "habit_water_lunch_title", points: 5, frequency: "daily" },
  { id: "water_night", icon: "tint", titleKey: "habit_water_night_title", points: 5, frequency: "daily" },
  { id: "no_screens", icon: "mobile-alt", titleKey: "habit_no_screens_title", points: 10, frequency: "daily" },
  { id: "deep_breath", icon: "wind", titleKey: "habit_deep_breath_title", points: 5, frequency: "daily" },
  { id: "walk_express", icon: "walking", titleKey: "habit_walk_express_title", points: 10, frequency: "daily" },
  { id: "fruit_daily", icon: "apple-alt", titleKey: "habit_fruit_daily_title", points: 5, frequency: "daily" },
  { id: "compliment_partner", icon: "heart", titleKey: "habit_compliment_title", points: 10, frequency: "daily" },
  { id: "atomic_reading", icon: "book-open", titleKey: "habit_reading_title", points: 5, frequency: "daily" },
  { id: "gratitude_moment", icon: "sun", titleKey: "habit_gratitude_title", points: 5, frequency: "daily" },
];

export default function VidaScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completedToday, setCompletedToday] = useState<string[]>([]);

  // Subcoleções da Loja
  const [myDesires, setMyDesires] = useState<{ [week: number]: string }>({});
  const [partnerDesires, setPartnerDesires] = useState<{ [week: number]: string }>({});
  const [myPurchases, setMyPurchases] = useState<{ [week: number]: { status: string; giftId: string } }>({});
  const [partnerPurchases, setPartnerPurchases] = useState<{ [week: number]: { status: string; giftId: string } }>({});

  const userLang = userData?.language || "pt-BR";
  const todayStr = new Date().toISOString().split("T")[0];
  const uid = auth.currentUser?.uid;
  const partnerUid = userData?.partnerId;

  // 1. Escuta Dados do Usuário
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const unsubscribeUser = onSnapshot(doc(db, "users", uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);

        if (data.habitsCompletedDate === todayStr) {
          setCompletedToday(data.completedHabitsToday || []);
        } else {
          setCompletedToday([]);
        }
      }
      setLoading(false);
    });

    return () => unsubscribeUser();
  }, [uid, todayStr]);

  // 2. Escuta Dados do Parceiro
  useEffect(() => {
    if (!partnerUid) {
      setPartnerData(null);
      return;
    }

    const unsubscribePartner = onSnapshot(doc(db, "users", partnerUid), (docSnap) => {
      if (docSnap.exists()) {
        setPartnerData(docSnap.data());
      }
    });

    return () => unsubscribePartner();
  }, [partnerUid]);

  // 3. Escuta Subcoleções da Loja
  useEffect(() => {
    if (!uid) return;

    const unSubDesires = onSnapshot(doc(db, "users", uid, "shop", "desires"), (snap) => {
      if (snap.exists()) setMyDesires(snap.data().list || {});
    });

    const unSubRedemptions = onSnapshot(doc(db, "users", uid, "shop", "redemptions"), (snap) => {
      if (snap.exists()) setMyPurchases(snap.data() || {});
    });

    return () => {
      unSubDesires();
      unSubRedemptions();
    };
  }, [uid]);

  useEffect(() => {
    if (!partnerUid) return;

    const unSubPartnerDesires = onSnapshot(doc(db, "users", partnerUid, "shop", "desires"), (snap) => {
      if (snap.exists()) setPartnerDesires(snap.data().list || {});
    });

    const unSubPartnerRedemptions = onSnapshot(doc(db, "users", partnerUid, "shop", "redemptions"), (snap) => {
      if (snap.exists()) setPartnerPurchases(snap.data() || {});
    });

    return () => {
      unSubPartnerDesires();
      unSubPartnerRedemptions();
    };
  }, [partnerUid]);

  const triggerHaptic = () => {
    if (Haptics) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
    }
  };

  const handleToggleHabit = async (habitId: string, points: number) => {
    if (!uid || !userData) return;

    triggerHaptic();

    let updatedCompleted: string[] = [];
    let pointDelta = 0;

    if (completedToday.includes(habitId)) {
      updatedCompleted = completedToday.filter((id) => id !== habitId);
      pointDelta = -points;
    } else {
      updatedCompleted = [...completedToday, habitId];
      pointDelta = points;
    }

    setCompletedToday(updatedCompleted);

    const newPE = Math.max(0, (userData.pointsPE || userData.totalPE || 0) + pointDelta);

    await setDoc(
      doc(db, "users", uid),
      {
        completedHabitsToday: updatedCompleted,
        habitsCompletedDate: todayStr,
        pointsPE: newPE,
        totalPE: newPE,
      },
      { merge: true }
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#202D3A" />
      </SafeAreaView>
    );
  }

  // 🔎 VARREDURA DE PENDÊNCIAS DO SISTEMA
  const hasPhoto = !!(userData?.photoURL || userData?.photoUrl);
  const hasPartner = !!userData?.partnerId;
  const isSoloMode = !!userData?.isSoloMode;

  // 📋 VALIDAÇÃO DE DADOS PESSOAIS (Nome e Telefone/DDI preenchidos)
  const hasName = !!(userData?.billingFirstName || userData?.firstName || userData?.displayName);
  const hasPhone = !!(userData?.billingPhone || userData?.phone || userData?.phoneNumber);
  const hasCompleteProfileData = hasName && hasPhone;

  const isJourneyActive =
    isSoloMode ||
    !!userData?.isJourneyStarted ||
    !!userData?.anamneseCompleted ||
    !!userData?.anamneseSkipped ||
    !!userData?.lastTaskDate ||
    (userData?.currentPhase && userData.currentPhase > 0) ||
    (userData?.currentWeek && userData.currentWeek > 0);

  // 🎯 CHECAGEM RIGOROSA DA MISSÃO DO DIA (Avaliando todas as flags de conclusão/espera)
  const currentPhase = userData?.currentPhase || 1;
  const currentWeek = Math.min(13, Math.floor((currentPhase - 1) / 7) + 1);
  const lastTaskDate = userData?.lastTaskDate;
  
  // Se o usuário concluiu a tarefa hoje, se a flag de tarefa completa estiver true, ou se estiver aguardando o timer, NÃO há missão pendente
  const isMissionDoneToday =
    lastTaskDate === todayStr ||
    userData?.isDailyTaskCompleted === true ||
    userData?.dailyTaskDone === true ||
    userData?.isTaskPending === false;

  // Economia de Presentes da Loja
  const userBonds = userData?.totalPE || userData?.pointsPE || 0;
  const partnerName = partnerData?.displayName || partnerData?.billingFirstName || t("partner_default_name", userLang);

  // Presentes a entregar e confirmar
  const hasGiftToDeliver = Object.entries(myPurchases).some(
    ([_, val]: [string, any]) => val && val.status === "bought"
  );
  const hasGiftToConfirm = Object.entries(partnerPurchases).some(
    ([_, val]: [string, any]) => val && val.status === "delivered"
  );

  // Presente do parceiro para comprar
  const partnerCurrentWeekGiftId = partnerDesires[currentWeek];
  const myPurchaseCurrentWeek = myPurchases[currentWeek];

  const needsToBuyGift =
    hasPartner &&
    !!partnerCurrentWeekGiftId &&
    (!myPurchaseCurrentWeek || myPurchaseCurrentWeek.status === "none");

  const hasEnoughBondsToBuy = userBonds >= 150;

  // Escolha do meu presente
  const hasSelectedMyCurrentWeekGift = !!myDesires[currentWeek];

  // Hábitos Atômicos e Personalizados
  const activeHabitIds: string[] = userData?.activeHabits || [
    "water_morning",
    "water_lunch",
    "water_night",
    "no_screens",
  ];
  const customHabits = userData?.customHabits || [];

  const nativeHabits = ATOMIC_HABITS_CATALOG.filter((h) =>
    activeHabitIds.includes(h.id)
  ).map((h) => ({
    id: h.id,
    icon: h.icon,
    title: t(h.titleKey, userLang),
    points: h.points,
    frequency: h.frequency,
  }));

  const userCustomActive = customHabits
    .filter((c: any) => activeHabitIds.includes(c.id))
    .map((c: any) => ({
      id: c.id,
      icon: "star",
      title: c.title,
      points: c.points || 5,
      frequency: c.frequency || "daily",
    }));

  const allActiveHabits = [...nativeHabits, ...userCustomActive];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VIDA</Text>
        <Text style={styles.headerSub}>Tecnologia para viver o mundo real</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. SEÇÃO DE ESTRUTURA DO ELO E ONBOARDING */}
        {(!hasPhoto || !hasCompleteProfileData || (!hasPartner && !isSoloMode) || !isJourneyActive) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estrutura do Seu Elo</Text>

            {/* ADICIONAR FOTO DE PERFIL */}
            {!hasPhoto && (
              <TouchableOpacity
                style={styles.actionCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("Perfil")}
              >
                <View style={[styles.iconBox, { backgroundColor: "#FFF9E6" }]}>
                  <FontAwesome5 name="camera" size={18} color="#EAB64A" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>Adicionar Foto de Perfil</Text>
                  <Text style={styles.cardSub}>Dê um rosto ao seu perfil no aplicativo.</Text>
                </View>
                <FontAwesome5 name="chevron-right" size={14} color="#AFAFAF" />
              </TouchableOpacity>
            )}

            {/* 📋 PREENCHER DADOS PESSOAIS */}
            {!hasCompleteProfileData && (
              <TouchableOpacity
                style={styles.actionCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("Perfil")}
              >
                <View style={[styles.iconBox, { backgroundColor: "#F0F4F8" }]}>
                  <FontAwesome5 name="user-edit" size={18} color="#202D3A" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>Completar Dados Pessoais</Text>
                  <Text style={styles.cardSub}>Preencha nome e telefone no Perfil.</Text>
                </View>
                <FontAwesome5 name="chevron-right" size={14} color="#AFAFAF" />
              </TouchableOpacity>
            )}

            {/* CONECTAR PARCEIRO */}
            {!hasPartner && !isSoloMode && (
              <TouchableOpacity
                style={styles.actionCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("Match")}
              >
                <View style={[styles.iconBox, { backgroundColor: "#E8F4F1" }]}>
                  <FontAwesome5 name="heart" size={18} color="#67D4A8" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>Conectar Parceiro(a)</Text>
                  <Text style={styles.cardSub}>Vincule sua alma gêmea para trilhar a dois.</Text>
                </View>
                <FontAwesome5 name="chevron-right" size={14} color="#AFAFAF" />
              </TouchableOpacity>
            )}

            {/* BÚSSOLA DE DIAGNÓSTICO */}
            {!isJourneyActive && (
              <TouchableOpacity
                style={styles.actionCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("AnamneseScreen")}
              >
                <View style={[styles.iconBox, { backgroundColor: "#EBF3FF" }]}>
                  <FontAwesome5 name="compass" size={18} color="#4A90E2" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>Bússola do Relacionamento</Text>
                  <Text style={styles.cardSub}>Preencha o diagnóstico para calibrar suas missões.</Text>
                </View>
                <FontAwesome5 name="chevron-right" size={14} color="#AFAFAF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 2. SEÇÃO DE AÇÕES DA JORNADA PRINCIPAL E LOJA */}
        {(!isMissionDoneToday ||
          !hasSelectedMyCurrentWeekGift ||
          hasGiftToDeliver ||
          hasGiftToConfirm ||
          needsToBuyGift) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ações da Jornada Principal</Text>

            {/* MISSÃO DO DIA PENDENTE */}
            {!isMissionDoneToday && (
              <TouchableOpacity
                style={styles.actionCardHighlight}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
              >
                <View style={[styles.iconBox, { backgroundColor: "#EAB64A" }]}>
                  <FontAwesome5 name="fire" size={18} color="#FFF" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitleHighlight}>Missão do Dia Pendente</Text>
                  <Text style={styles.cardSubHighlight}>Fortaleça o seu elo realizando a tarefa de hoje.</Text>
                </View>
                <FontAwesome5 name="chevron-right" size={14} color="#202D3A" />
              </TouchableOpacity>
            )}

            {hasGiftToDeliver && (
              <TouchableOpacity
                style={[styles.actionCard, { borderColor: "#EAB64A", backgroundColor: "#FFF9E6" }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("MainTabs", { screen: "Loja" })}
              >
                <View style={[styles.iconBox, { backgroundColor: "#EAB64A" }]}>
                  <FontAwesome5 name="gift" size={18} color="#FFF" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>Entregar Presente de {partnerName}</Text>
                  <Text style={styles.cardSub}>Você comprou o presente! Entregue na vida real e marque na Loja.</Text>
                </View>
                <FontAwesome5 name="chevron-right" size={14} color="#202D3A" />
              </TouchableOpacity>
            )}

            {hasGiftToConfirm && (
              <TouchableOpacity
                style={[styles.actionCard, { borderColor: "#67D4A8", backgroundColor: "#E8F4F1" }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("MainTabs", { screen: "Loja" })}
              >
                <View style={[styles.iconBox, { backgroundColor: "#67D4A8" }]}>
                  <FontAwesome5 name="heart" size={18} color="#FFF" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>Confirmar Recebimento de Presente</Text>
                  <Text style={styles.cardSub}>{partnerName} te entregou um presente! Confirme o recebimento na Loja.</Text>
                </View>
                <FontAwesome5 name="chevron-right" size={14} color="#202D3A" />
              </TouchableOpacity>
            )}

            {needsToBuyGift && (
              <TouchableOpacity
                style={styles.actionCard}
                activeOpacity={0.8}
                onPress={() =>
                  hasEnoughBondsToBuy
                    ? navigation.navigate("MainTabs", { screen: "Loja" })
                    : navigation.navigate("MainTabs", { screen: "Home" })
                }
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: hasEnoughBondsToBuy ? "#F9EBF7" : "#FFEDED" },
                  ]}
                >
                  <FontAwesome5
                    name={hasEnoughBondsToBuy ? "shopping-bag" : "exclamation-triangle"}
                    size={18}
                    color={hasEnoughBondsToBuy ? "#D066B3" : "#FF4B4B"}
                  />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>
                    {hasEnoughBondsToBuy
                      ? `Comprar Presente de ${partnerName}`
                      : `Saldo Insuficiente para Presente`}
                  </Text>
                  <Text style={styles.cardSub}>
                    {hasEnoughBondsToBuy
                      ? `Você tem ${userBonds} Bonds. Compre o carinho da Semana ${currentWeek}!`
                      : `Você tem ${userBonds}/150 Bonds. Complete missões na Home para pontuar!`}
                  </Text>
                </View>
                <FontAwesome5 name="chevron-right" size={14} color="#AFAFAF" />
              </TouchableOpacity>
            )}

            {!hasSelectedMyCurrentWeekGift && (
              <TouchableOpacity
                style={styles.actionCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("MainTabs", { screen: "Loja" })}
              >
                <View style={[styles.iconBox, { backgroundColor: "#F9EBF7" }]}>
                  <FontAwesome5 name="heart" size={18} color="#D066B3" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>Escolher Seu Presente da Semana {currentWeek}</Text>
                  <Text style={styles.cardSub}>Defina no app o mimo que você gostaria de receber.</Text>
                </View>
                <FontAwesome5 name="chevron-right" size={14} color="#AFAFAF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 3. SEÇÃO DE HÁBITOS DA VIDA */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>SUAS AÇÕES DA VIDA</Text>
            
            <TouchableOpacity
              style={styles.cogButton}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("HabitsConfigScreen")}
            >
              <FontAwesome5 name="cog" size={18} color="#67D4A8" />
            </TouchableOpacity>
          </View>

          {allActiveHabits.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Nenhum hábito ativo. Clique na engrenagem para ativar hábitos!
              </Text>
            </View>
          ) : (
            allActiveHabits.map((habit) => {
              const isChecked = completedToday.includes(habit.id);
              return (
                <TouchableOpacity
                  key={habit.id}
                  style={[styles.habitCard, isChecked && styles.habitCardChecked]}
                  activeOpacity={0.8}
                  onPress={() => handleToggleHabit(habit.id, habit.points)}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                    {isChecked && <FontAwesome5 name="check" size={12} color="#FFF" />}
                  </View>

                  <View style={styles.habitInfo}>
                    <Text style={[styles.habitTitle, isChecked && styles.habitTitleChecked]}>
                      {habit.title}
                    </Text>
                    <View style={styles.badgeRow}>
                      <Text style={styles.pointsBadge}>+{habit.points} Bonds</Text>
                      <Text style={styles.freqBadge}>
                        • {habit.frequency === "weekly" ? t("frequency_weekly", userLang) : t("frequency_daily", userLang)}
                      </Text>
                    </View>
                  </View>

                  <FontAwesome5
                    name={habit.icon}
                    size={18}
                    color={isChecked ? "#67D4A8" : "#202D3A"}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 24, paddingTop: 15, paddingBottom: 15 },
  headerTitle: { fontSize: 28, fontFamily: "Montserrat_900Black", color: "#202D3A" },
  headerSub: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: "#60646C" },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
  section: { marginBottom: 25 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cogButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#D1D9E0",
  },
  actionCardHighlight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#EAB64A",
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontFamily: "Montserrat_900Black", color: "#202D3A" },
  cardSub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: "#60646C", marginTop: 2 },
  cardTitleHighlight: { fontSize: 14, fontFamily: "Montserrat_900Black", color: "#202D3A" },
  cardSubHighlight: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: "#202D3A", marginTop: 2 },
  habitCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#D1D9E0",
  },
  habitCardChecked: { backgroundColor: "#E8F4F1", borderColor: "#67D4A8" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D9E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  checkboxChecked: { backgroundColor: "#67D4A8", borderColor: "#67D4A8" },
  habitInfo: { flex: 1 },
  habitTitle: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#202D3A" },
  habitTitleChecked: { textDecorationLine: "line-through", color: "#60646C" },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  pointsBadge: { fontSize: 11, fontFamily: "Montserrat_900Black", color: "#67D4A8" },
  freqBadge: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: "#60646C", textTransform: "lowercase" },
  emptyBox: {
    padding: 20,
    backgroundColor: "#FFF",
    borderRadius: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#60646C",
    textAlign: "center",
  },
});