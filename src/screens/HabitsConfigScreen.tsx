import { FontAwesome5 } from "@expo/vector-icons";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  { id: "water_morning", icon: "tint", titleKey: "habit_water_morning_title", subKey: "habit_water_morning_sub", points: 5 },
  { id: "water_lunch", icon: "tint", titleKey: "habit_water_lunch_title", subKey: "habit_water_lunch_sub", points: 5 },
  { id: "water_night", icon: "tint", titleKey: "habit_water_night_title", subKey: "habit_water_night_sub", points: 5 },
  { id: "no_screens", icon: "mobile-alt", titleKey: "habit_no_screens_title", subKey: "habit_no_screens_sub", points: 10 },
  { id: "deep_breath", icon: "wind", titleKey: "habit_deep_breath_title", subKey: "habit_deep_breath_sub", points: 5 },
  { id: "walk_express", icon: "walking", titleKey: "habit_walk_express_title", subKey: "habit_walk_express_sub", points: 10 },
  { id: "fruit_daily", icon: "apple-alt", titleKey: "habit_fruit_daily_title", subKey: "habit_fruit_daily_sub", points: 5 },
  { id: "compliment_partner", icon: "heart", titleKey: "habit_compliment_title", subKey: "habit_compliment_sub", points: 10 },
  { id: "atomic_reading", icon: "book-open", titleKey: "habit_reading_title", subKey: "habit_reading_sub", points: 5 },
  { id: "gratitude_moment", icon: "sun", titleKey: "habit_gratitude_title", subKey: "habit_gratitude_sub", points: 5 },
];

export default function HabitsConfigScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [activeHabits, setActiveHabits] = useState<string[]>([
    "water_morning",
    "water_lunch",
    "water_night",
    "no_screens",
  ]);
  const [customHabits, setCustomHabits] = useState<any[]>([]);
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [selectedFrequency, setSelectedFrequency] = useState<"daily" | "weekly">("daily");

  const userLang = userData?.language || "pt-BR";

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "users", currentUid),
      (docSnap) => {
        if (!auth.currentUser) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          if (data.activeHabits) setActiveHabits(data.activeHabits);
          if (data.customHabits) setCustomHabits(data.customHabits);
        }
        setLoading(false);
      },
      (error) => {
        if (error.code === "permission-denied") {
          console.log("[HabitsConfigScreen] Listener de hábitos encerrado.");
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const triggerHaptic = () => {
    if (Haptics) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
  };

  const toggleHabitSelection = async (habitId: string) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid || isSaving) return;
    triggerHaptic();

    let updated: string[] = [];
    if (activeHabits.includes(habitId)) {
      updated = activeHabits.filter((id) => id !== habitId);
    } else {
      updated = [...activeHabits, habitId];
    }

    setActiveHabits(updated);
    try {
      await setDoc(doc(db, "users", currentUid), { activeHabits: updated }, { merge: true });
    } catch (err) {
      console.error("[HabitsConfigScreen] Erro ao alternar hábito:", err);
    }
  };

  const handleAddCustomHabit = async () => {
    const trimmedTitle = newHabitTitle.trim();
    if (!trimmedTitle || isSaving) return;

    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;
    triggerHaptic();
    setIsSaving(true);

    const habitId = `custom_${Date.now()}`;
    const newHabit = {
      id: habitId,
      title: trimmedTitle,
      frequency: selectedFrequency,
      points: 5,
    };

    const updatedCustoms = [...customHabits, newHabit];
    const updatedActive = [...activeHabits, habitId];

    setCustomHabits(updatedCustoms);
    setActiveHabits(updatedActive);
    setNewHabitTitle("");

    try {
      await setDoc(
        doc(db, "users", currentUid),
        { customHabits: updatedCustoms, activeHabits: updatedActive },
        { merge: true }
      );
    } catch (err) {
      console.error("[HabitsConfigScreen] Erro ao criar hábito personalizado:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveCustomHabit = (habitId: string) => {
    Alert.alert(
      t("attention_title", userLang) || "Atenção",
      t("confirm_delete_custom_habit_msg", userLang) || "Deseja realmente excluir este hábito personalizado?",
      [
        { text: t("modal_cancel", userLang) || "Cancelar", style: "cancel" },
        {
          text: t("btn_yes_delete", userLang) || "Excluir",
          style: "destructive",
          onPress: async () => {
            const currentUid = auth.currentUser?.uid;
            if (!currentUid) return;
            triggerHaptic();

            const updatedCustoms = customHabits.filter((h) => h.id !== habitId);
            const updatedActive = activeHabits.filter((id) => id !== habitId);

            setCustomHabits(updatedCustoms);
            setActiveHabits(updatedActive);

            try {
              await setDoc(
                doc(db, "users", currentUid),
                { customHabits: updatedCustoms, activeHabits: updatedActive },
                { merge: true }
              );
            } catch (err) {
              console.error("[HabitsConfigScreen] Erro ao remover hábito:", err);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#202D3A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <FontAwesome5 name="chevron-left" size={20} color="#202D3A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("habits_config_header_title", userLang) || "Gerenciar Hábitos"}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionDesc}>
            {t("habits_config_desc", userLang) || "Ative os hábitos que farão parte do seu feed VIDA e pontuarão no Elo."}
          </Text>

          {/* CONTAINER DE CRIAÇÃO DO HÁBITO + SELETOR DE FREQUÊNCIA */}
          <View style={styles.createBox}>
            <Text style={styles.subGroupTitle}>
              {t("create_custom_habit_label", userLang) || "Criar Hábito Personalizado"}
            </Text>
            
            <View style={styles.createHabitRow}>
              <TextInput
                style={styles.createHabitInput}
                placeholder={t("placeholder_custom_habit", userLang) || "Ex: Ler 5 páginas..."}
                placeholderTextColor="#AFAFAF"
                value={newHabitTitle}
                onChangeText={setNewHabitTitle}
                editable={!isSaving}
              />
              <TouchableOpacity
                style={[styles.createHabitBtn, (!newHabitTitle.trim() || isSaving) && styles.createHabitBtnDisabled]}
                onPress={handleAddCustomHabit}
                disabled={!newHabitTitle.trim() || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <FontAwesome5 name="plus" size={16} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.frequencySectionTitle}>SELECIONE A FREQUÊNCIA:</Text>
            
            <View style={styles.frequencyRow}>
              <TouchableOpacity
                style={[
                  styles.frequencyButton,
                  selectedFrequency === "daily" && styles.frequencyButtonActive,
                ]}
                onPress={() => setSelectedFrequency("daily")}
              >
                <FontAwesome5
                  name={selectedFrequency === "daily" ? "check-circle" : "circle"}
                  solid={selectedFrequency === "daily"}
                  size={14}
                  color={selectedFrequency === "daily" ? "#FFF" : "#60646C"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.frequencyButtonText,
                    selectedFrequency === "daily" && styles.frequencyButtonTextActive,
                  ]}
                >
                  {(t("frequency_daily", userLang) || "Diário").toUpperCase()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.frequencyButton,
                  selectedFrequency === "weekly" && styles.frequencyButtonActive,
                ]}
                onPress={() => setSelectedFrequency("weekly")}
              >
                <FontAwesome5
                  name={selectedFrequency === "weekly" ? "check-circle" : "circle"}
                  solid={selectedFrequency === "weekly"}
                  size={14}
                  color={selectedFrequency === "weekly" ? "#FFF" : "#60646C"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.frequencyButtonText,
                    selectedFrequency === "weekly" && styles.frequencyButtonTextActive,
                  ]}
                >
                  {(t("frequency_weekly", userLang) || "Semanal").toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* MEUS HÁBITOS PERSONALIZADOS */}
          {customHabits.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.subGroupTitle}>
                {t("your_custom_habits_label", userLang) || "Seus Hábitos Personalizados"}
              </Text>
              {customHabits.map((c) => {
                const isSelected = activeHabits.includes(c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.customHabitCard,
                      isSelected && styles.customHabitCardActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => toggleHabitSelection(c.id)}
                  >
                    <FontAwesome5 name="star" solid size={16} color="#EAB64A" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customHabitTitle}>{c.title}</Text>
                      <Text style={styles.customHabitSub}>
                        5 BONDS • {c.frequency === "weekly" ? (t("frequency_weekly", userLang) || "Semanal") : (t("frequency_daily", userLang) || "Diário")}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRemoveCustomHabit(c.id);
                      }}
                    >
                      <FontAwesome5 name="trash-alt" size={16} color="#D96C6C" />
                    </TouchableOpacity>

                    <View style={[styles.checkboxCircle, isSelected && styles.checkboxCircleActive]}>
                      {isSelected && <FontAwesome5 name="check" size={10} color="#FFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* CATÁLOGO SUGERIDO (HÁBITOS ATÔMICOS) */}
          <View style={styles.section}>
            <Text style={styles.subGroupTitle}>
              {t("atomic_catalog_label", userLang) || "Catálogo Sugerido"}
            </Text>
            {ATOMIC_HABITS_CATALOG.map((habit) => {
              const isSelected = activeHabits.includes(habit.id);
              return (
                <TouchableOpacity
                  key={habit.id}
                  style={[styles.habitSelectItem, isSelected && styles.habitSelectItemActive]}
                  onPress={() => toggleHabitSelection(habit.id)}
                >
                  <FontAwesome5
                    name={habit.icon}
                    size={18}
                    color={isSelected ? "#67D4A8" : "#202D3A"}
                    style={{ marginRight: 15 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.habitSelectTitle}>{t(habit.titleKey, userLang) || habit.id}</Text>
                    <Text style={styles.habitSelectSub}>{t(habit.subKey, userLang) || ""}</Text>
                  </View>
                  <View style={[styles.checkboxCircle, isSelected && styles.checkboxCircleActive]}>
                    {isSelected && <FontAwesome5 name="check" size={10} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F0F4F8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerTitle: { fontSize: 20, fontFamily: "Montserrat_900Black", color: "#202D3A" },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  sectionDesc: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#60646C",
    lineHeight: 20,
    marginBottom: 20,
  },
  createBox: {
    backgroundColor: "#FFF",
    padding: 18,
    borderRadius: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#D1D9E0",
  },
  subGroupTitle: {
    fontSize: 13,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  createHabitRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  createHabitInput: {
    flex: 1,
    backgroundColor: "#F0F4F8",
    borderWidth: 1,
    borderColor: "#D1D9E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#202D3A",
  },
  createHabitBtn: {
    width: 50,
    height: 50,
    backgroundColor: "#20C997",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  createHabitBtnDisabled: {
    backgroundColor: "#D1D9E0",
  },
  frequencySectionTitle: {
    fontSize: 12,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  frequencyRow: { flexDirection: "row", gap: 12 },
  frequencyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F4F8",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D1D9E0",
  },
  frequencyButtonActive: {
    backgroundColor: "#1D2836",
    borderColor: "#1D2836",
  },
  frequencyButtonText: {
    fontSize: 13,
    fontFamily: "Montserrat_900Black",
    color: "#60646C",
  },
  frequencyButtonTextActive: { color: "#FFF" },
  section: { marginBottom: 25 },
  customHabitCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#EAB64A",
  },
  customHabitCardActive: {
    backgroundColor: "#FFF9E6",
    borderColor: "#EAB64A",
  },
  customHabitTitle: { fontFamily: "Montserrat_700Bold", fontSize: 15, color: "#202D3A" },
  customHabitSub: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
    color: "#60646C",
    marginTop: 2,
    textTransform: "uppercase",
  },
  deleteBtn: { padding: 8, marginRight: 8 },
  habitSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#D1D9E0",
  },
  habitSelectItemActive: { backgroundColor: "#E8F4F1", borderColor: "#67D4A8" },
  habitSelectTitle: { fontFamily: "Montserrat_700Bold", fontSize: 15, color: "#202D3A" },
  habitSelectSub: { fontFamily: "Montserrat_400Regular", fontSize: 12, color: "#60646C", marginTop: 2 },
  checkboxCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D9E0",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxCircleActive: { backgroundColor: "#67D4A8", borderColor: "#67D4A8" },
});