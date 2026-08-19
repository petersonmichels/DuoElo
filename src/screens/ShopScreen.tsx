import { FontAwesome5 } from "@expo/vector-icons";
import { doc, increment, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth, db } from "../config/firebase";

// 📦 Importação do banco de dados de presentes
import {
  GIFTS_DATABASE,
  getGiftIcon,
  getGiftTitle,
} from "../database/seed/gifts";

// 🌐 Importação do motor de traduções para CRM
import { t } from "../i18n/translations";

export default function ShopScreen({ userData, partnerData }: any) {
  const currentUid = auth.currentUser?.uid;
  const partnerUid = userData?.partnerId;
  const userLang = userData?.language || "pt-BR";

  const giftsList = GIFTS_DATABASE || [];

  // Estados dos Desejos e Status
  const [myDesires, setMyDesires] = useState<{ [week: number]: string }>({});
  const [partnerDesires, setPartnerDesires] = useState<{
    [week: number]: string;
  }>({});

  // Status das minhas compras para o parceiro
  const [myPurchases, setMyPurchases] = useState<{
    [week: number]: { status: string; giftId: string };
  }>({});

  // Status das compras que o parceiro fez para mim
  const [partnerPurchases, setPartnerPurchases] = useState<{
    [week: number]: { status: string; giftId: string };
  }>({});

  // Minhas confirmações de recebimento
  const [myConfirmations, setMyConfirmations] = useState<{
    [week: number]: boolean;
  }>({});

  // Confirmações enviadas pelo parceiro
  const [partnerConfirmations, setPartnerConfirmations] = useState<{
    [week: number]: boolean;
  }>({});

  // Modais e Loadings
  const [activeWeekSlot, setActiveWeekSlot] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "info-circle",
    color: "#202D3A",
  });

  const showAlert = (
    title: string,
    message: string,
    icon = "info-circle",
    color = "#202D3A",
  ) => {
    setCustomAlert({ visible: true, title, message, icon, color });
  };

  const currentBonds = userData?.totalPE || 0;
  const currentPhase = userData?.currentPhase || 1;
  const unlockedWeeksCount = Math.min(
    13,
    Math.floor((currentPhase - 1) / 7) + 1,
  );

  // 1. Leitura em Tempo Real (Perfil Logado)
  useEffect(() => {
    if (!currentUid) return;

    const unsubscribeMyDesires = onSnapshot(
      doc(db, "users", currentUid, "shop", "desires"),
      (snap) => {
        if (snap.exists()) setMyDesires(snap.data().list || {});
      },
    );

    const unsubscribeMyPurchases = onSnapshot(
      doc(db, "users", currentUid, "shop", "redemptions"),
      (snap) => {
        if (snap.exists()) {
          setMyPurchases(snap.data() || {});
        }
      },
    );

    const unsubscribeMyConfirmations = onSnapshot(
      doc(db, "users", currentUid, "shop", "confirmations"),
      (snap) => {
        if (snap.exists()) {
          setMyConfirmations(snap.data() || {});
        }
      },
    );

    return () => {
      unsubscribeMyDesires();
      unsubscribeMyPurchases();
      unsubscribeMyConfirmations();
    };
  }, [currentUid]);

  // 2. Leitura em Tempo Real (Perfil do Parceiro)
  useEffect(() => {
    if (!partnerUid) return;

    const unsubscribePartnerDesires = onSnapshot(
      doc(db, "users", partnerUid, "shop", "desires"),
      (snap) => {
        if (snap.exists()) {
          setPartnerDesires(snap.data().list || {});
        }
      },
    );

    const unsubscribePartnerPurchases = onSnapshot(
      doc(db, "users", partnerUid, "shop", "redemptions"),
      (snap) => {
        if (snap.exists()) {
          setPartnerPurchases(snap.data() || {});
        }
      },
    );

    const unsubscribePartnerConfirmations = onSnapshot(
      doc(db, "users", partnerUid, "shop", "confirmations"),
      (snap) => {
        if (snap.exists()) {
          setPartnerConfirmations(snap.data() || {});
        }
      },
    );

    return () => {
      unsubscribePartnerDesires();
      unsubscribePartnerPurchases();
      unsubscribePartnerConfirmations();
    };
  }, [partnerUid]);

  // Ação 1: Salvar ID do Presente no Slot
  const handleSelectGift = async (giftId: string) => {
    if (!currentUid || activeWeekSlot === null) return;

    if (partnerPurchases[activeWeekSlot]) {
      setActiveWeekSlot(null);
      showAlert(
        t("gift_locked_title", userLang),
        t("gift_locked_msg", userLang),
        "lock",
        "#EAB64A",
      );
      return;
    }

    setIsSaving(true);

    try {
      const updated = { ...myDesires, [activeWeekSlot]: giftId };
      await setDoc(
        doc(db, "users", currentUid, "shop", "desires"),
        { list: updated },
        { merge: true },
      );
      setMyDesires(updated);
      setActiveWeekSlot(null);
    } catch (e) {
      showAlert(
        t("error_title", userLang),
        t("error_save", userLang),
        "times-circle",
        "#D96C6C",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Ação 2: Comprar presente com Bonds
  const handleBuyGift = async (weekNum: number, giftId: string) => {
    const cost = 150;

    if (currentBonds < cost) {
      showAlert(
        t("insufficient_bonds_title", userLang),
        t("insufficient_bonds_msg", userLang),
        "lock",
        "#EAB64A",
      );
      return;
    }

    if (!currentUid || !partnerUid) return;

    try {
      await setDoc(
        doc(db, "users", currentUid, "shop", "redemptions"),
        {
          [weekNum]: {
            giftId,
            status: "bought",
            purchasedAt: new Date().toISOString(),
          },
        },
        { merge: true },
      );

      await setDoc(
        doc(db, "users", currentUid),
        { totalPE: increment(-cost) },
        { merge: true },
      );

      const translatedTitle = getGiftTitle(giftId, userLang);
      showAlert(
        t("gift_bought_title", userLang),
        t("gift_bought_msg", userLang, { gift: translatedTitle }),
        "gift",
        "#D96C6C",
      );
    } catch (e) {
      showAlert(
        t("error_title", userLang),
        t("error_register", userLang),
        "times-circle",
        "#D96C6C",
      );
    }
  };

  // Ação 3: Marcar como Entregue na Vida Real
  const handleMarkDelivered = async (weekNum: number) => {
    if (!currentUid) return;
    try {
      await setDoc(
        doc(db, "users", currentUid, "shop", "redemptions"),
        {
          [weekNum]: {
            status: "delivered",
            deliveredAt: new Date().toISOString(),
          },
        },
        { merge: true },
      );

      showAlert(
        t("delivered_success_title", userLang),
        t("delivered_success_msg", userLang),
        "check-circle",
        "#EAB64A",
      );
    } catch (e) {
      showAlert(
        t("error_title", userLang),
        t("error_save", userLang),
        "times-circle",
        "#D96C6C",
      );
    }
  };

  // Ação 4: Confirmar Recebimento
  const handleConfirmReceived = async (weekNum: number) => {
    if (!currentUid) return;
    try {
      await setDoc(
        doc(db, "users", currentUid, "shop", "confirmations"),
        {
          [weekNum]: true,
        },
        { merge: true },
      );

      showAlert(
        t("confirmed_success_title", userLang),
        t("confirmed_success_msg", userLang),
        "heart",
        "#67D4A8",
      );
    } catch (e) {
      showAlert(
        t("error_title", userLang),
        t("error_save", userLang),
        "times-circle",
        "#D96C6C",
      );
    }
  };

  const partnerName =
    partnerData?.billingFirstName || partnerData?.displayName || "Seu Amor";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SALDO DE BONDS */}
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>
            {t("available_bonds", userLang)}
          </Text>
          <View style={styles.balanceRow}>
            <FontAwesome5 name="infinity" solid size={26} color="#EAB64A" />
            <Text style={styles.balanceValue}>{currentBonds}</Text>
          </View>
        </View>

        {/* PARTE 1: PRESENTES QUE SEU AMOR QUER GANHAR */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            {t("partner_desires_title", userLang, { name: partnerName })}
          </Text>
          <Text style={styles.sectionSub}>
            {t("partner_desires_sub", userLang, { name: partnerName })}
          </Text>

          {!partnerUid ? (
            <View style={styles.emptyCard}>
              <FontAwesome5 name="user-plus" size={24} color="#AFAFAF" />
              <Text style={styles.emptyCardText}>
                {t("no_match_text", userLang)}
              </Text>
            </View>
          ) : Object.keys(partnerDesires).length === 0 ? (
            <View style={styles.emptyCard}>
              <FontAwesome5 name="hourglass-half" size={24} color="#EAB64A" />
              <Text style={styles.emptyCardText}>
                {t("partner_no_gifts", userLang, { name: partnerName })}
              </Text>
            </View>
          ) : (
            <View style={styles.listGap}>
              {Object.entries(partnerDesires).map(([week, giftId]) => {
                const weekNum = Number(week);
                const purchaseData = myPurchases[weekNum];
                const status = purchaseData?.status;
                const isConfirmedByPartner = Boolean(
                  partnerConfirmations[weekNum],
                );

                const giftTitle = getGiftTitle(giftId, userLang);
                const giftIcon = getGiftIcon(giftId);

                return (
                  <View
                    key={week}
                    style={[
                      styles.card,
                      status === "bought" && styles.cardBought,
                      status === "delivered" &&
                        !isConfirmedByPartner &&
                        styles.cardDelivered,
                      isConfirmedByPartner && styles.cardConfirmed,
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.weekTag}>
                        {t("week_tag", userLang, { week: weekNum })}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 2,
                        }}
                      >
                        <FontAwesome5
                          name={giftIcon}
                          size={14}
                          color="#202D3A"
                        />
                        <Text style={styles.giftTitle}>{giftTitle}</Text>
                      </View>
                    </View>

                    {/* BOTÃO DE COMPRAR */}
                    {!status && (
                      <TouchableOpacity
                        style={styles.btnBuy}
                        onPress={() => handleBuyGift(weekNum, giftId)}
                      >
                        <FontAwesome5
                          name="infinity"
                          solid
                          size={11}
                          color="#FFF"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.btnBuyText}>
                          {t("btn_buy", userLang)}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* STATUS 🔴 COMPRADO (VERMELHO) */}
                    {status === "bought" && (
                      <TouchableOpacity
                        style={styles.btnDeliverOrange}
                        onPress={() => handleMarkDelivered(weekNum)}
                      >
                        <FontAwesome5
                          name="hand-holding-heart"
                          size={14}
                          color="#FFF"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.btnDeliverText}>
                          {t("btn_mark_delivered", userLang)}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* STATUS 🟠 ENTREGUE (LARANJA) */}
                    {status === "delivered" && !isConfirmedByPartner && (
                      <View style={styles.statusBadgeWaiting}>
                        <Text style={styles.statusBadgeWaitingText}>
                          {t("waiting_partner_confirm", userLang, {
                            name: partnerName,
                          })}
                        </Text>
                      </View>
                    )}

                    {/* STATUS 🟢 CONFIRMADO (VERDE) */}
                    {isConfirmedByPartner && (
                      <View style={styles.statusBadgeConfirmed}>
                        <Text style={styles.statusBadgeConfirmedText}>
                          {t("delivered_confirmed_partner", userLang, {
                            name: partnerName,
                          })}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* PARTE 2: SEUS SLOTS DE 13 SEMANAS */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            {t("my_gifts_title", userLang)}
          </Text>
          <Text style={styles.sectionSub}>{t("my_gifts_sub", userLang)}</Text>

          <View style={styles.listGap}>
            {Array.from({ length: 13 }).map((_, index) => {
              const weekNum = index + 1;
              const isUnlocked = weekNum <= unlockedWeeksCount;
              const myGiftId = myDesires[weekNum];
              const myGiftTitle = myGiftId
                ? getGiftTitle(myGiftId, userLang)
                : "";
              const myGiftIcon = myGiftId ? getGiftIcon(myGiftId) : "gift";

              const partnerPurchase = partnerPurchases[weekNum];
              const isBoughtByPartner = Boolean(partnerPurchase);
              const isDeliveredByPartner =
                partnerPurchase?.status === "delivered";
              const isConfirmedByMe = Boolean(myConfirmations[weekNum]);

              return (
                <View
                  key={weekNum}
                  style={[
                    styles.slotCard,
                    !isUnlocked && styles.slotCardLocked,
                    isBoughtByPartner &&
                      !isDeliveredByPartner &&
                      styles.slotCardBought,
                    isDeliveredByPartner &&
                      !isConfirmedByMe &&
                      styles.slotCardDelivered,
                    isConfirmedByMe && styles.slotCardConfirmed,
                  ]}
                >
                  <View style={styles.slotHeader}>
                    <Text style={styles.slotWeekTitle}>
                      {t("week_tag", userLang, { week: weekNum })}
                    </Text>
                    {!isUnlocked ? (
                      <View style={styles.lockBadge}>
                        <FontAwesome5
                          name="lock"
                          size={10}
                          color="#AFAFAF"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.lockBadgeText}>
                          {t("status_locked", userLang)}
                        </Text>
                      </View>
                    ) : isBoughtByPartner && !isDeliveredByPartner ? (
                      <View style={styles.lockBadge}>
                        <FontAwesome5
                          name="lock"
                          size={10}
                          color="#D96C6C"
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[styles.lockBadgeText, { color: "#D96C6C" }]}
                        >
                          {t("status_bought_by_partner", userLang)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {myGiftId ? (
                    <View style={styles.selectedRow}>
                      <FontAwesome5
                        name={myGiftIcon}
                        size={14}
                        color="#EAB64A"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.selectedGiftText}>{myGiftTitle}</Text>

                      {isUnlocked && !isBoughtByPartner && (
                        <TouchableOpacity
                          onPress={() => setActiveWeekSlot(weekNum)}
                        >
                          <FontAwesome5 name="edit" size={14} color="#202D3A" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : isUnlocked ? (
                    <TouchableOpacity
                      style={styles.btnAddGift}
                      onPress={() => setActiveWeekSlot(weekNum)}
                    >
                      <FontAwesome5
                        name="plus-circle"
                        size={14}
                        color="#67D4A8"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.btnAddGiftText}>
                        {t("choose_weekly_gift", userLang)}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.lockedSub}>
                      {t("unlocks_at_week", userLang, { week: weekNum })}
                    </Text>
                  )}

                  {/* BOTAO DE CONFIRMAR 🟢 VERDE */}
                  {isDeliveredByPartner && !isConfirmedByMe && (
                    <TouchableOpacity
                      style={[styles.btnConfirmGreen, { marginTop: 10 }]}
                      onPress={() => handleConfirmReceived(weekNum)}
                    >
                      <FontAwesome5
                        name="heart"
                        solid
                        size={12}
                        color="#FFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.btnDeliverText}>
                        {t("btn_confirm_received", userLang)}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {isConfirmedByMe && (
                    <View style={styles.statusBadgeConfirmed}>
                      <Text style={styles.statusBadgeConfirmedText}>
                        {t("received_confirmed_with_love", userLang)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* MODAL DE SELEÇÃO DOS PRESENTES */}
      <Modal
        visible={activeWeekSlot !== null}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <Text style={styles.modalTitle}>
              {t("modal_select_title", userLang, {
                week: activeWeekSlot || 1,
              })}
            </Text>
            <Text style={styles.modalSub}>
              {t("modal_select_sub", userLang, { name: partnerName })}
            </Text>

            {isSaving ? (
              <ActivityIndicator
                size="large"
                color="#202D3A"
                style={{ marginVertical: 30 }}
              />
            ) : (
              <ScrollView
                style={{ maxHeight: 360, width: "100%" }}
                showsVerticalScrollIndicator={false}
              >
                {giftsList.map((item) => {
                  const title =
                    item.translations?.[userLang] ||
                    item.translations?.["pt-BR"] ||
                    item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.giftOption}
                      onPress={() => handleSelectGift(item.id)}
                    >
                      <FontAwesome5
                        name={item.icon || "gift"}
                        size={14}
                        color="#EAB64A"
                        style={{ marginRight: 10 }}
                      />
                      <Text style={styles.giftOptionText}>{title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.btnCancel}
              onPress={() => setActiveWeekSlot(null)}
            >
              <Text style={styles.btnCancelText}>
                {t("modal_cancel", userLang)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE ALERTA */}
      <Modal visible={customAlert.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardAlert}>
            <View
              style={[
                styles.alertIconBg,
                { backgroundColor: customAlert.color + "20" },
              ]}
            >
              <FontAwesome5
                name={customAlert.icon}
                size={28}
                color={customAlert.color}
              />
            </View>
            <Text style={styles.modalTitle}>{customAlert.title}</Text>
            <Text style={styles.modalSub}>{customAlert.message}</Text>
            <TouchableOpacity
              style={[
                styles.btnPrimaryAlert,
                { backgroundColor: customAlert.color },
              ]}
              onPress={() => setCustomAlert({ ...customAlert, visible: false })}
            >
              <Text style={styles.btnPrimaryAlertText}>
                {t("btn_understand", userLang)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  balanceHeader: {
    backgroundColor: "#202D3A",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    marginBottom: 20,
  },
  balanceLabel: {
    fontFamily: "Montserrat_900Black",
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  balanceValue: {
    fontFamily: "Montserrat_900Black",
    fontSize: 32,
    color: "#FFF",
  },
  sectionContainer: { marginBottom: 28 },
  sectionTitle: {
    fontFamily: "Montserrat_900Black",
    fontSize: 17,
    color: "#202D3A",
    marginBottom: 4,
  },
  sectionSub: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    color: "#60646C",
    lineHeight: 18,
    marginBottom: 14,
  },
  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D9E0",
    gap: 8,
  },
  emptyCardText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
    color: "#60646C",
    textAlign: "center",
  },
  listGap: { gap: 12 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D1D9E0",
  },

  /* 🔴 COMPRADO (VERMELHO) */
  cardBought: { backgroundColor: "#FDF2F2", borderColor: "#D96C6C" },
  /* 🟠 ENTREGUE (LARANJA) */
  cardDelivered: { backgroundColor: "#FFF9E6", borderColor: "#EAB64A" },
  /* 🟢 CONFIRMADO (VERDE) */
  cardConfirmed: { backgroundColor: "#E8F4F1", borderColor: "#67D4A8" },

  cardHeader: { marginBottom: 10 },
  weekTag: {
    fontFamily: "Montserrat_900Black",
    fontSize: 10,
    color: "#EAB64A",
    letterSpacing: 1,
    marginBottom: 2,
  },
  giftTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    color: "#202D3A",
    lineHeight: 18,
    flex: 1,
  },
  btnBuy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#202D3A",
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnBuyText: {
    fontFamily: "Montserrat_900Black",
    color: "#FFF",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  btnDeliverOrange: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAB64A",
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnConfirmGreen: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67D4A8",
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnDeliverText: {
    fontFamily: "Montserrat_900Black",
    color: "#FFF",
    fontSize: 12,
  },

  /* BADGES DE STATUS */
  statusBadgeWaiting: {
    backgroundColor: "#FFF9E6",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAB64A",
  },
  statusBadgeWaitingText: {
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
    fontSize: 12,
  },
  statusBadgeConfirmed: {
    backgroundColor: "#67D4A8",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  statusBadgeConfirmedText: {
    fontFamily: "Montserrat_900Black",
    color: "#FFF",
    fontSize: 12,
  },

  slotCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D1D9E0",
  },
  slotCardLocked: {
    backgroundColor: "#F0F4F8",
    borderColor: "#E0E6ED",
    opacity: 0.7,
  },
  slotCardBought: { backgroundColor: "#FDF2F2", borderColor: "#D96C6C" },
  slotCardDelivered: { backgroundColor: "#FFF9E6", borderColor: "#EAB64A" },
  slotCardConfirmed: { backgroundColor: "#E8F4F1", borderColor: "#67D4A8" },

  slotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  slotWeekTitle: {
    fontFamily: "Montserrat_900Black",
    fontSize: 12,
    color: "#202D3A",
    letterSpacing: 1,
  },
  lockBadge: { flexDirection: "row", alignItems: "center" },
  lockBadgeText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
    color: "#AFAFAF",
  },
  selectedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  selectedGiftText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    color: "#202D3A",
    flex: 1,
    marginRight: 10,
  },
  btnAddGift: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 4,
  },
  btnAddGiftText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    color: "#67D4A8",
  },
  lockedSub: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: "#AFAFAF",
    paddingTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(32,45,58,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCardLarge: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
  },
  modalCardAlert: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontFamily: "Montserrat_900Black",
    fontSize: 18,
    color: "#202D3A",
    marginBottom: 6,
    textAlign: "center",
  },
  modalSub: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    color: "#60646C",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  giftOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F8",
  },
  giftOptionText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
    color: "#202D3A",
    flex: 1,
  },
  btnCancel: { marginTop: 16, paddingVertical: 10 },
  btnCancelText: {
    fontFamily: "Montserrat_700Bold",
    color: "#60646C",
    fontSize: 14,
  },
  alertIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  btnPrimaryAlert: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
  },
  btnPrimaryAlertText: {
    fontFamily: "Montserrat_700Bold",
    color: "#FFF",
    fontSize: 15,
  },
});
