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
import { logAuditEvent } from "../services/auditService";

// 📳 Carregamento seguro do Haptics
let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch (e) {
  console.log("Haptics indisponível neste ambiente.");
}

export default function ShopScreen({ userData, partnerData }: any) {
  const currentUid = auth.currentUser?.uid;
  const partnerUid = userData?.partnerId;
  const userLang = userData?.language || "pt-BR";

  const giftsList = GIFTS_DATABASE || [];

  const triggerHaptic = (
    type:
      | "light"
      | "medium"
      | "heavy"
      | "success"
      | "warning"
      | "error" = "light"
  ) => {
    if (!Haptics || userData?.enableHaptics === false) return;
    try {
      if (type === "light")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === "medium")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (type === "heavy")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (type === "success")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === "warning")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      else if (type === "error")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {}
  };

  // 🟢 ABA ATIVA DA LOJA ("partner" = Desejos do Amor | "my" = Minha Lista)
  const [activeTab, setActiveTab] = useState<"partner" | "my">("partner");

  // Estados dos Desejos e Status
  const [myDesires, setMyDesires] = useState<{ [week: number]: string }>({});
  const [partnerDesires, setPartnerDesires] = useState<{
    [week: number]: string;
  }>({});

  const [myPurchases, setMyPurchases] = useState<{
    [week: number]: { status: string; giftId: string };
  }>({});

  const [partnerPurchases, setPartnerPurchases] = useState<{
    [week: number]: { status: string; giftId: string };
  }>({});

  const [myConfirmations, setMyConfirmations] = useState<{
    [week: number]: boolean;
  }>({});

  const [partnerConfirmations, setPartnerConfirmations] = useState<{
    [week: number]: boolean;
  }>({});

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
    hapticType: "warning" | "success" | "error" = "warning"
  ) => {
    triggerHaptic(hapticType);
    setCustomAlert({ visible: true, title, message, icon, color });
  };

  // Compatibilidade de saldo Bonds (totalPE ou pointsPE)
  const currentBonds = userData?.totalPE ?? userData?.pointsPE ?? 0;
  const currentPhase = userData?.currentPhase || 1;
  const unlockedWeeksCount = Math.min(
    13,
    Math.floor((currentPhase - 1) / 7) + 1
  );

  // 1. Leitura em Tempo Real (Perfil Logado)
  useEffect(() => {
    if (!currentUid) return;

    const unsubscribeMyDesires = onSnapshot(
      doc(db, "users", currentUid, "shop", "desires"),
      (snap) => {
        if (snap.exists()) setMyDesires(snap.data().list || {});
      },
      (err) => console.log("Erro ao escutar desejos:", err)
    );

    const unsubscribeMyPurchases = onSnapshot(
      doc(db, "users", currentUid, "shop", "redemptions"),
      (snap) => {
        if (snap.exists()) setMyPurchases(snap.data() || {});
      },
      (err) => console.log("Erro ao escutar compras:", err)
    );

    const unsubscribeMyConfirmations = onSnapshot(
      doc(db, "users", currentUid, "shop", "confirmations"),
      (snap) => {
        if (snap.exists()) setMyConfirmations(snap.data() || {});
      },
      (err) => console.log("Erro ao escutar confirmações:", err)
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
        if (snap.exists()) setPartnerDesires(snap.data().list || {});
      },
      (err) => console.log("Erro ao escutar desejos do parceiro:", err)
    );

    const unsubscribePartnerPurchases = onSnapshot(
      doc(db, "users", partnerUid, "shop", "redemptions"),
      (snap) => {
        if (snap.exists()) setPartnerPurchases(snap.data() || {});
      },
      (err) => console.log("Erro ao escutar compras do parceiro:", err)
    );

    const unsubscribePartnerConfirmations = onSnapshot(
      doc(db, "users", partnerUid, "shop", "confirmations"),
      (snap) => {
        if (snap.exists()) setPartnerConfirmations(snap.data() || {});
      },
      (err) => console.log("Erro ao escutar confirmações do parceiro:", err)
    );

    return () => {
      unsubscribePartnerDesires();
      unsubscribePartnerPurchases();
      unsubscribePartnerConfirmations();
    };
  }, [partnerUid]);

  // Ação 1: Salvar ID do Presente no Slot (Protegido contra falhas)
  const handleSelectGift = async (giftId: string) => {
    if (!currentUid || activeWeekSlot === null) return;

    if (partnerPurchases[activeWeekSlot]) {
      setActiveWeekSlot(null);
      showAlert(
        t("gift_locked_title", userLang) || "Slot Bloqueado",
        t("gift_locked_msg", userLang) || "Seu amor já comprou este presente para você!",
        "lock",
        "#EAB64A",
        "warning"
      );
      return;
    }

    setIsSaving(true);

    try {
      const updated = { ...myDesires, [activeWeekSlot]: giftId };

      await setDoc(
        doc(db, "users", currentUid, "shop", "desires"),
        {
          list: updated,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setMyDesires(updated);
      setActiveWeekSlot(null);
      triggerHaptic("success");
    } catch (e: any) {
      console.error("❌ ERRO AO SALVAR PRESENTE NO FIRESTORE:", e);
      showAlert(
        t("error_title", userLang) || "Erro",
        t("error_save", userLang) || "Não foi possível salvar o presente.",
        "times-circle",
        "#D96C6C",
        "error"
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
        t("insufficient_bonds_title", userLang) || "Bonds Insuficientes",
        t("insufficient_bonds_msg", userLang) || "Você precisa de 150 Bonds para resgatar este presente.",
        "lock",
        "#EAB64A",
        "warning"
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
        { merge: true }
      );

      // Desconta em ambos os campos para manter sincronizado no perfil
      await setDoc(
        doc(db, "users", currentUid),
        {
          totalPE: increment(-cost),
          pointsPE: increment(-cost),
        },
        { merge: true }
      );

      try {
        const auditDetails =
          t("audit_gift_redeemed", userLang, {
            week: weekNum,
            giftId,
          }) || `Presente resgatado na Semana ${weekNum}`;

        await logAuditEvent(currentUid, "GIFT_REDEEMED", auditDetails, userLang);
      } catch (e) {}

      const translatedTitle = getGiftTitle(giftId, userLang);
      showAlert(
        t("gift_bought_title", userLang) || "Presente Adquirido!",
        t("gift_bought_msg", userLang, { gift: translatedTitle }) || `Você adquiriu ${translatedTitle}!`,
        "gift",
        "#D96C6C",
        "success"
      );
    } catch (e) {
      showAlert(
        t("error_title", userLang) || "Erro",
        t("error_register", userLang) || "Não foi possível registrar a compra.",
        "times-circle",
        "#D96C6C",
        "error"
      );
    }
  };

  // Ação 3: Marcar como Entregue na Vida Real
  const handleMarkDelivered = async (weekNum: number) => {
    if (!currentUid) return;
    try {
      const existing = myPurchases[weekNum] || {};
      await setDoc(
        doc(db, "users", currentUid, "shop", "redemptions"),
        {
          [weekNum]: {
            ...existing,
            status: "delivered",
            deliveredAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );

      showAlert(
        t("delivered_success_title", userLang) || "Marcado como Entregue!",
        t("delivered_success_msg", userLang) || "Aguarde seu amor confirmar o recebimento.",
        "check-circle",
        "#EAB64A",
        "success"
      );
    } catch (e) {
      showAlert(
        t("error_title", userLang) || "Erro",
        t("error_save", userLang) || "Erro ao atualizar status.",
        "times-circle",
        "#D96C6C",
        "error"
      );
    }
  };

  // Ação 4: Confirmar Recebimento (Lado de quem ganha)
  const handleConfirmReceived = async (weekNum: number) => {
    if (!currentUid) return;
    try {
      await setDoc(
        doc(db, "users", currentUid, "shop", "confirmations"),
        {
          [weekNum]: true,
        },
        { merge: true }
      );

      showAlert(
        t("confirmed_success_title", userLang) || "Recebimento Confirmado!",
        t("confirmed_success_msg", userLang) || "Que momento especial juntos!",
        "heart",
        "#67D4A8",
        "success"
      );
    } catch (e) {
      showAlert(
        t("error_title", userLang) || "Erro",
        t("error_save", userLang) || "Erro ao confirmar recebimento.",
        "times-circle",
        "#D96C6C",
        "error"
      );
    }
  };

  const partnerName =
    partnerData?.billingFirstName ||
    partnerData?.displayName ||
    t("partner_default_name", userLang) ||
    "Seu Amor";

  return (
    <SafeAreaView style={styles.container}>
      {/* SALDO DE BONDS */}
      <View style={styles.balanceHeader}>
        <Text style={styles.balanceLabel}>
          {t("available_bonds", userLang) || "SEUS BONDS DISPONÍVEIS"}
        </Text>
        <View style={styles.balanceRow}>
          <FontAwesome5 name="infinity" solid size={26} color="#EAB64A" />
          <Text style={styles.balanceValue}>{currentBonds}</Text>
        </View>
      </View>

      {/* 🟢 SELETOR DE ABAS (ORGANIZA A LOJA E ACABA COM A CONFUSÃO VISUAL) */}
      <View style={styles.tabToggleRow}>
        <TouchableOpacity
          style={[styles.toggleTab, activeTab === "partner" && styles.toggleTabActive]}
          onPress={() => {
            triggerHaptic("light");
            setActiveTab("partner");
          }}
        >
          <FontAwesome5 name="gift" size={14} color={activeTab === "partner" ? "#FFF" : "#60646C"} />
          <Text style={[styles.toggleTabText, activeTab === "partner" && styles.toggleTabTextActive]}>
            Desejos de {partnerName}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleTab, activeTab === "my" && styles.toggleTabActive]}
          onPress={() => {
            triggerHaptic("light");
            setActiveTab("my");
          }}
        >
          <FontAwesome5 name="star" size={14} color={activeTab === "my" ? "#FFF" : "#60646C"} />
          <Text style={[styles.toggleTabText, activeTab === "my" && styles.toggleTabTextActive]}>
            Sua Lista
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ==================== ABA 1: DESEJOS DO SEU AMOR ==================== */}
        {activeTab === "partner" && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionSub}>
              {t("partner_desires_sub", userLang, { name: partnerName }) || `Compre os presentes que ${partnerName} gostaria de receber!`}
            </Text>

            {!partnerUid ? (
              <View style={styles.emptyCard}>
                <FontAwesome5 name="user-plus" size={24} color="#AFAFAF" />
                <Text style={styles.emptyCardText}>
                  {t("no_match_text", userLang) || "Conecte-se ao seu amor para ver os desejos."}
                </Text>
              </View>
            ) : Object.keys(partnerDesires).length === 0 ? (
              <View style={styles.emptyCard}>
                <FontAwesome5 name="hourglass-half" size={24} color="#EAB64A" />
                <Text style={styles.emptyCardText}>
                  {t("partner_no_gifts", userLang, { name: partnerName }) || `${partnerName} ainda não escolheu presentes.`}
                </Text>
              </View>
            ) : (
              <View style={styles.listGap}>
                {Object.entries(partnerDesires).map(([week, giftId]) => {
                  const weekNum = Number(week);
                  const purchaseData = myPurchases[weekNum];
                  const status = purchaseData?.status;
                  const isConfirmedByPartner = Boolean(partnerConfirmations[weekNum]);

                  const giftTitle = getGiftTitle(giftId, userLang);
                  const giftIcon = getGiftIcon(giftId);

                  return (
                    <View
                      key={week}
                      style={[
                        styles.card,
                        status === "bought" && styles.cardBought,
                        status === "delivered" && !isConfirmedByPartner && styles.cardDelivered,
                        isConfirmedByPartner && styles.cardConfirmed,
                      ]}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={styles.weekTag}>
                          {t("week_tag", userLang, { week: weekNum }) || `SEMANA ${weekNum}`}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                          <FontAwesome5 name={giftIcon} size={14} color="#202D3A" />
                          <Text style={styles.giftTitle}>{giftTitle}</Text>
                        </View>
                      </View>

                      {/* BOTÃO DE COMPRAR */}
                      {!status && (
                        <TouchableOpacity
                          style={[styles.btnBuy, currentBonds < 150 && styles.btnBuyDisabled]}
                          onPress={() => {
                            triggerHaptic("medium");
                            handleBuyGift(weekNum, giftId);
                          }}
                        >
                          <FontAwesome5 name="infinity" solid size={11} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.btnBuyText}>
                            {currentBonds >= 150
                              ? t("btn_buy", userLang) || "COMPRAR (150 BONDS)"
                              : "SALDO INSUFICIENTE (150 BONDS)"}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* STATUS COMPRADO (PRONTO PARA ENTREGAR) */}
                      {status === "bought" && (
                        <TouchableOpacity
                          style={styles.btnDeliverOrange}
                          onPress={() => {
                            triggerHaptic("light");
                            handleMarkDelivered(weekNum);
                          }}
                        >
                          <FontAwesome5 name="hand-holding-heart" size={14} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.btnDeliverText}>
                            {t("btn_mark_delivered", userLang) || "MARCAR COMO ENTREGUE NA VIDA REAL"}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* STATUS ENTREGUE */}
                      {status === "delivered" && !isConfirmedByPartner && (
                        <View style={styles.statusBadgeWaiting}>
                          <Text style={styles.statusBadgeWaitingText}>
                            {t("waiting_partner_confirm", userLang, { name: partnerName }) || `⏳ Entregue! Aguardando ${partnerName} confirmar`}
                          </Text>
                        </View>
                      )}

                      {/* STATUS CONFIRMADO */}
                      {isConfirmedByPartner && (
                        <View style={styles.statusBadgeConfirmed}>
                          <Text style={styles.statusBadgeConfirmedText}>
                            {t("delivered_confirmed_partner", userLang, { name: partnerName }) || `✓ Entregue & Confirmado por ${partnerName}! ❤️`}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ==================== ABA 2: SUA LISTA DE DESEJOS ==================== */}
        {activeTab === "my" && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionSub}>
              {t("my_gifts_sub", userLang) || "Escolha os presentes que você gostaria de ganhar de cada semana:"}
            </Text>

            <View style={styles.listGap}>
              {Array.from({ length: 13 }).map((_, index) => {
                const weekNum = index + 1;
                const isUnlocked = weekNum <= unlockedWeeksCount;
                const myGiftId = myDesires[weekNum];
                const myGiftTitle = myGiftId ? getGiftTitle(myGiftId, userLang) : "";
                const myGiftIcon = myGiftId ? getGiftIcon(myGiftId) : "gift";

                const partnerPurchase = partnerPurchases[weekNum];
                const isBoughtByPartner = Boolean(partnerPurchase);
                const isDeliveredByPartner = partnerPurchase?.status === "delivered";
                const isConfirmedByMe = Boolean(myConfirmations[weekNum]);

                return (
                  <View
                    key={weekNum}
                    style={[
                      styles.slotCard,
                      !isUnlocked && styles.slotCardLocked,
                      isBoughtByPartner && !isDeliveredByPartner && styles.slotCardBought,
                      isDeliveredByPartner && !isConfirmedByMe && styles.slotCardDelivered,
                      isConfirmedByMe && styles.slotCardConfirmed,
                    ]}
                  >
                    <View style={styles.slotHeader}>
                      <Text style={styles.slotWeekTitle}>
                        {t("week_tag", userLang, { week: weekNum }) || `SEMANA ${weekNum}`}
                      </Text>

                      {!isUnlocked ? (
                        <View style={styles.lockBadge}>
                          <FontAwesome5 name="lock" size={10} color="#AFAFAF" style={{ marginRight: 4 }} />
                          <Text style={styles.lockBadgeText}>{t("status_locked", userLang) || "Bloqueado"}</Text>
                        </View>
                      ) : isBoughtByPartner && !isDeliveredByPartner ? (
                        <View style={styles.lockBadge}>
                          <FontAwesome5 name="lock" size={10} color="#D96C6C" style={{ marginRight: 4 }} />
                          <Text style={[styles.lockBadgeText, { color: "#D96C6C" }]}>
                            {t("status_bought_by_partner", userLang) || "Comprado pelo seu amor"}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {myGiftId ? (
                      <View style={styles.selectedRow}>
                        <FontAwesome5 name={myGiftIcon} size={14} color="#EAB64A" style={{ marginRight: 8 }} />
                        <Text style={styles.selectedGiftText}>{myGiftTitle}</Text>

                        {isUnlocked && !isBoughtByPartner && (
                          <TouchableOpacity
                            onPress={() => {
                              triggerHaptic("light");
                              setActiveWeekSlot(weekNum);
                            }}
                          >
                            <FontAwesome5 name="edit" size={14} color="#202D3A" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : isUnlocked ? (
                      <TouchableOpacity
                        style={styles.btnAddGift}
                        onPress={() => {
                          triggerHaptic("light");
                          setActiveWeekSlot(weekNum);
                        }}
                      >
                        <FontAwesome5 name="plus-circle" size={14} color="#67D4A8" style={{ marginRight: 6 }} />
                        <Text style={styles.btnAddGiftText}>
                          {t("choose_weekly_gift", userLang) || "Escolher presente da semana"}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.lockedSub}>
                        {t("unlocks_at_week", userLang, { week: weekNum }) || `Libera ao alcançar a Semana ${weekNum} na Home`}
                      </Text>
                    )}

                    {/* BOTÃO DE CONFIRMAR RECEBIMENTO QUANDO O PARCEIRO ENTREGOU */}
                    {isDeliveredByPartner && !isConfirmedByMe && (
                      <TouchableOpacity
                        style={[styles.btnConfirmGreen, { marginTop: 10 }]}
                        onPress={() => {
                          triggerHaptic("light");
                          handleConfirmReceived(weekNum);
                        }}
                      >
                        <FontAwesome5 name="heart" solid size={12} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.btnDeliverText}>
                          {t("btn_confirm_received", userLang) || "CONFIRMAR QUE RECEBI NA VIDA REAL ❤️"}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {isConfirmedByMe && (
                      <View style={styles.statusBadgeConfirmed}>
                        <Text style={styles.statusBadgeConfirmedText}>
                          {t("received_confirmed_with_love", userLang) || "✓ Recebido & Confirmado com Amor"}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* MODAL DE SELEÇÃO DOS PRESENTES */}
      <Modal visible={activeWeekSlot !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <Text style={styles.modalTitle}>
              {t("modal_select_title", userLang, { week: activeWeekSlot || 1 }) || `Presente da Semana ${activeWeekSlot}`}
            </Text>
            <Text style={styles.modalSub}>
              {t("modal_select_sub", userLang, { name: partnerName }) || `O que você gostaria de ganhar de ${partnerName}?`}
            </Text>

            {isSaving ? (
              <ActivityIndicator size="large" color="#202D3A" style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={{ maxHeight: 360, width: "100%" }} showsVerticalScrollIndicator={false}>
                {giftsList.map((item) => {
                  const title =
                    item.translations?.[userLang] ||
                    item.translations?.["pt-BR"] ||
                    item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.giftOption}
                      onPress={() => {
                        triggerHaptic("light");
                        handleSelectGift(item.id);
                      }}
                    >
                      <FontAwesome5 name={item.icon || "gift"} size={14} color="#EAB64A" style={{ marginRight: 10 }} />
                      <Text style={styles.giftOptionText}>{title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.btnCancel}
              onPress={() => {
                triggerHaptic("light");
                setActiveWeekSlot(null);
              }}
            >
              <Text style={styles.btnCancelText}>{t("modal_cancel", userLang) || "Cancelar"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE ALERTA */}
      <Modal visible={customAlert.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardAlert}>
            <View style={[styles.alertIconBg, { backgroundColor: customAlert.color + "20" }]}>
              <FontAwesome5 name={customAlert.icon} size={28} color={customAlert.color} />
            </View>
            <Text style={styles.modalTitle}>{customAlert.title}</Text>
            <Text style={styles.modalSub}>{customAlert.message}</Text>
            <TouchableOpacity
              style={[styles.btnPrimaryAlert, { backgroundColor: customAlert.color }]}
              onPress={() => {
                triggerHaptic("light");
                setCustomAlert({ ...customAlert, visible: false });
              }}
            >
              <Text style={styles.btnPrimaryAlertText}>{t("btn_understand", userLang) || "Entendi"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  balanceHeader: {
    backgroundColor: "#202D3A",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
  },
  balanceLabel: {
    fontFamily: "Montserrat_900Black",
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  balanceValue: { fontFamily: "Montserrat_900Black", fontSize: 32, color: "#FFF" },
  tabToggleRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 10,
  },
  toggleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#D1D9E0",
  },
  toggleTabActive: { backgroundColor: "#202D3A", borderColor: "#202D3A" },
  toggleTabText: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: "#60646C" },
  toggleTabTextActive: { color: "#FFF" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 120 },
  sectionContainer: { marginBottom: 28 },
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
  cardBought: { backgroundColor: "#FFF9E6", borderColor: "#EAB64A", borderWidth: 1.5 },
  cardDelivered: { backgroundColor: "#FFF9E6", borderColor: "#EAB64A" },
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
  btnBuyDisabled: { backgroundColor: "#AFAFAF" },
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