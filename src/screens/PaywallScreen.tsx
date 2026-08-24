import { FontAwesome5 } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db } from "../config/firebase";

import { t } from "../i18n/translations";
import { logAuditEvent } from "../services/auditService";

const { width } = Dimensions.get("window");

export default function PaywallScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const [planCategory, setPlanCategory] = useState<"duo" | "individual">("duo");
  const [selectedPlan, setSelectedPlan] = useState<
    "mensal" | "trimestral" | "anual"
  >("trimestral");

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [availablePackages, setAvailablePackages] = useState<
    PurchasesPackage[]
  >([]);
  const [hasPartner, setHasPartner] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);

  // 🌐 Estado dinâmico do Idioma
  const [userLang, setUserLang] = useState("pt-BR");

  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      const currentUid = auth.currentUser?.uid;
      if (currentUid) {
        try {
          const userSnap = await getDoc(doc(db, "users", currentUid));
          if (isMounted && userSnap.exists()) {
            const data = userSnap.data();
            if (data.language) {
              setUserLang(data.language);
            }
            if (data.partnerId) {
              setHasPartner(true);
              setPartnerId(data.partnerId);
              setPlanCategory("duo");
            }
          }
        } catch (error) {
          console.error("Erro ao carregar dados do usuário no Paywall:", error);
        }
      }
    };

    const fetchOfferings = async () => {
      try {
        if (isMounted) setIsLoadingOfferings(true);
        const offerings = await Purchases.getOfferings();
        if (
          isMounted &&
          offerings?.current &&
          offerings.current.availablePackages.length > 0
        ) {
          setAvailablePackages(offerings.current.availablePackages);
        }
      } catch (e: any) {
        if (isMounted) setAvailablePackages([]);
      } finally {
        if (isMounted) setIsLoadingOfferings(false);
      }
    };

    fetchUserData();
    fetchOfferings();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      isMounted = false;
    };
  }, []);

  // 🎯 MAPEAMENTO CIRÚRGICO COM BASE NOS PRODUTOS DO REVENUECAT
  const findPackage = (
    category: "duo" | "individual",
    period: "mensal" | "trimestral" | "anual",
  ) => {
    return availablePackages.find((pkg) => {
      const prodId = pkg.product.identifier.toLowerCase();
      const pkgId = pkg.identifier.toLowerCase();

      if (category === "individual") {
        if (period === "mensal")
          return (
            prodId.includes("duoelo_mensal") || pkgId.includes("solo_monthly")
          );
        if (period === "trimestral")
          return (
            prodId.includes("duoelo_trimestral") ||
            pkgId.includes("solo_three_month") ||
            pkgId.includes("solo_quarterly")
          );
        if (period === "anual")
          return (
            (prodId.includes("duoelo_anual") &&
              !prodId.includes("duo_anual")) ||
            pkgId.includes("solo_annual")
          );
      } else {
        if (period === "mensal")
          return (
            prodId.includes("duoelo_duo_mensal") || pkgId.includes("monthly")
          );
        if (period === "trimestral")
          return (
            prodId.includes("duoelo_duo_trimestral") ||
            pkgId.includes("three_month") ||
            pkgId.includes("quarterly")
          );
        if (period === "anual")
          return (
            prodId.includes("duoelo_duo_anual") || pkgId.includes("annual")
          );
      }
      return false;
    });
  };

  const handleClose = async () => {
    const currentUid = auth.currentUser?.uid;

    if (!currentUid) {
      handleForceLogout();
      return;
    }

    if (navigation && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation) {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "MainTabs",
            params: { screen: "Home" },
          },
        ],
      });
    }
  };

  const handleForceLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.log("Erro ao desconectar:", e);
    } finally {
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    }
  };

  const handleSubscribe = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const currentUid = auth.currentUser?.uid;

      if (!currentUid) {
        Alert.alert(
          t("session_expired_title", userLang) || "Sessão Expirada",
          t("session_expired_sub_msg", userLang) || "Por favor, faça login novamente.",
          [
            {
              text: t("btn_go_to_login", userLang) || "Ir para Login",
              onPress: handleForceLogout,
            },
          ],
        );
        setIsProcessing(false);
        return;
      }

      const pkgToPurchase = findPackage(planCategory, selectedPlan);

      if (pkgToPurchase) {
        // 💳 PROCESSA A COMPRA VIA REVENUECAT
        const { customerInfo } = await Purchases.purchasePackage(pkgToPurchase);
        const activeProdId = customerInfo.activeSubscriptions[0] || pkgToPurchase.product.identifier;
        const isDuoPlan = planCategory === "duo" || activeProdId.includes("_duo_");

        const userUpdates: any = {
          isPremium: true,
          planType: isDuoPlan ? "duo" : "solo",
          activeProductId: activeProdId,
          subscriptionCategory: planCategory,
          subscriptionPlan: selectedPlan,
          subscriptionDate: new Date().toISOString(),
        };

        await setDoc(doc(db, "users", currentUid), userUpdates, { merge: true });

        // 🎯 O PARCEIRO SÓ HERDA A ASSINATURA SE FOR PLANO DUO
        if (isDuoPlan && partnerId) {
          await setDoc(
            doc(db, "users", partnerId),
            { isPremium: true, isPartnerPremium: true, planType: "duo" },
            { merge: true },
          );
        }
      } else {
        // Fallback em ambiente de teste sem RevenueCat configurado
        const isDuoPlan = planCategory === "duo";
        const userUpdates: any = {
          isPremium: true,
          planType: isDuoPlan ? "duo" : "solo",
          activeProductId: isDuoPlan
            ? `duoelo_duo_${selectedPlan}`
            : `duoelo_${selectedPlan}`,
          subscriptionCategory: planCategory,
          subscriptionPlan: selectedPlan,
          subscriptionDate: new Date().toISOString(),
        };

        await setDoc(doc(db, "users", currentUid), userUpdates, { merge: true });

        if (isDuoPlan && partnerId) {
          await setDoc(
            doc(db, "users", partnerId),
            { isPremium: true, isPartnerPremium: true, planType: "duo" },
            { merge: true },
          );
        }
      }

      // 📜 REGISTRO DE AUDITORIA DE SEGURANÇA (ATIVAÇÃO DE ASSINATURA)
      await logAuditEvent(
        currentUid,
        "SUBSCRIPTION_ACTIVATED",
        `Assinatura ativada no plano ${planCategory.toUpperCase()} - ciclo: ${selectedPlan}`,
        userLang
      );

      Alert.alert(
        t("sub_confirmed_title", userLang) || "Assinatura Confirmada!",
        t("sub_confirmed_msg", userLang, {
          category: planCategory === "duo" ? "Duo" : "Solo",
          plan: selectedPlan,
          partnerBonus:
            hasPartner && planCategory === "duo"
              ? t("sub_confirmed_partner_bonus", userLang) || "Seu parceiro também recebeu acesso!"
              : "",
        }) || "Sua jornada agora está totalmente liberada.",
        [
          {
            text: t("btn_access_app", userLang) || "Acessar o App",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: "MainTabs",
                    params: { screen: "Home" },
                  },
                ],
              });
            },
          },
        ],
      );
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert(
          t("sub_error_title", userLang) || "Erro na Assinatura",
          t("sub_error_msg", userLang) || "Não foi possível concluir o pagamento."
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const restoredInfo = await Purchases.restorePurchases();
      if (Object.keys(restoredInfo.entitlements.active).length > 0) {
        const currentUid = auth.currentUser?.uid;
        if (currentUid) {
          const activeSubId = restoredInfo.activeSubscriptions[0] || "";
          const isDuoPlan = activeSubId.includes("_duo_");

          await setDoc(
            doc(db, "users", currentUid),
            {
              isPremium: true,
              planType: isDuoPlan ? "duo" : "solo",
              activeProductId: activeSubId,
            },
            { merge: true },
          );

          if (isDuoPlan && partnerId) {
            await setDoc(
              doc(db, "users", partnerId),
              { isPremium: true, isPartnerPremium: true, planType: "duo" },
              { merge: true },
            );
          }

          // 📜 REGISTRO DE AUDITORIA (RESTAURAÇÃO DE COMPRA)
          await logAuditEvent(
            currentUid,
            "PURCHASE_RESTORED",
            "Restauração de assinatura processada com sucesso",
            userLang
          );
        }

        Alert.alert(
          t("sub_restored_title", userLang) || "Compras Restauradas",
          t("sub_restored_msg", userLang) || "Sua assinatura ativa foi restaurada com sucesso.",
          [
            {
              text: t("btn_go_to_start", userLang) || "Ir para Início",
              onPress: () =>
                navigation.reset({
                  index: 0,
                  routes: [{ name: "MainTabs", params: { screen: "Home" } }],
                }),
            },
          ],
        );
      } else {
        Alert.alert(
          t("no_active_sub_title", userLang) || "Nenhuma Assinatura Ativa",
          t("no_active_sub_msg", userLang) || "Não encontramos assinaturas vinculadas a esta conta de loja.",
        );
      }
    } catch (error) {
      Alert.alert(
        t("error_title", userLang) || "Erro",
        t("restore_purchases_error_msg", userLang) || "Erro ao restaurar compras.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert(
        t("error_title", userLang) || "Erro",
        t("cannot_open_page_msg", userLang) || "Não foi possível abrir o link.",
      ),
    );
  };

  const featuresDuo = [
    {
      icon: "users",
      title: t("feat_duo_1_title", userLang) || "Acesso para o Casal",
      desc: t("feat_duo_1_desc", userLang) || "Apenas uma assinatura libera ambos os perfis.",
    },
    {
      icon: "map-marked-alt",
      title: t("feat_duo_2_title", userLang) || "Jornada de 90 Dias",
      desc: t("feat_duo_2_desc", userLang) || "Tarefas diárias dinâmicas e conectadas.",
    },
    {
      icon: "heart",
      title: t("feat_duo_3_title", userLang) || "Loja do Amor & Desafios",
      desc: t("feat_duo_3_desc", userLang) || "Mimos semanais e desafios de ouro.",
    },
  ];

  const featuresIndividual = [
    {
      icon: "user",
      title: t("feat_solo_1_title", userLang) || "Jornada Individual",
      desc: t("feat_solo_1_desc", userLang) || "Desenvolva sua melhor versão na relação.",
    },
    {
      icon: "map-marked-alt",
      title: t("feat_solo_2_title", userLang) || "Mapeamento Completo",
      desc: t("feat_solo_2_desc", userLang) || "Acesso à bússola e missões de evolução.",
    },
  ];

  const duoPlans = [
    {
      id: "mensal",
      name: t("plan_duo_monthly_name", userLang) || "Plano Mensal",
      desc: t("plan_duo_monthly_desc", userLang) || "Cobrança mensal para 2 pessoas",
      price: "19,90",
      period: t("period_per_month", userLang) || "/mês",
    },
    {
      id: "trimestral",
      name: t("plan_duo_quarterly_name", userLang) || "Plano Trimestral",
      desc: t("plan_duo_quarterly_desc", userLang) || "Cobrança a cada 3 meses para o casal",
      price: "49,90",
      period: t("period_per_quarter", userLang) || "/trimestre",
      highlight: t("highlight_recommended_couple", userLang) || "MAIS POPULAR PARA CASAIS",
    },
    {
      id: "anual",
      name: t("plan_duo_annual_name", userLang) || "Plano Anual",
      desc: t("plan_duo_annual_desc", userLang) || "Economia máxima anual para 2 pessoas",
      price: "179,90",
      period: t("period_per_year", userLang) || "/ano",
    },
  ];

  const individualPlans = [
    {
      id: "mensal",
      name: t("plan_solo_monthly_name", userLang) || "Plano Mensal",
      desc: t("plan_solo_monthly_desc", userLang) || "Cobrança mensal individual",
      price: "14,90",
      period: t("period_per_month", userLang) || "/mês",
    },
    {
      id: "trimestral",
      name: t("plan_solo_quarterly_name", userLang) || "Plano Trimestral",
      desc: t("plan_solo_quarterly_desc", userLang) || "Cobrança trimestral individual",
      price: "39,90",
      period: t("period_per_quarter", userLang) || "/trimestre",
      highlight: t("highlight_best_value_solo", userLang) || "RECOMENDADO SOLO",
    },
    {
      id: "anual",
      name: t("plan_solo_annual_name", userLang) || "Plano Anual",
      desc: t("plan_solo_annual_desc", userLang) || "Acesso individual por 1 ano",
      price: "129,90",
      period: t("period_per_year", userLang) || "/ano",
    },
  ];

  const activePlans = planCategory === "duo" ? duoPlans : individualPlans;
  const activeFeatures =
    planCategory === "duo" ? featuresDuo : featuresIndividual;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleClose}
          disabled={isProcessing}
          activeOpacity={0.7}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
        >
          <FontAwesome5 name="times" size={20} color="#202D3A" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleForceLogout}
          disabled={isProcessing}
          activeOpacity={0.7}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
        >
          <FontAwesome5 name="sign-out-alt" size={18} color="#E74C3C" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            alignItems: "center",
            width: "100%",
          }}
        >
          <View style={styles.iconWrapper}>
            <FontAwesome5 name="heartbeat" size={40} color="#67D4A8" />
          </View>

          <Text style={styles.heroTitle}>
            {t("paywall_hero_title", userLang) || "Desbloqueie o Seu Elo"}
          </Text>
          <Text style={styles.heroSub}>
            {t("paywall_hero_sub", userLang) || "Escolha o melhor plano para transformar o seu relacionamento."}
          </Text>

          {!hasPartner && (
            <View style={styles.categoryToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.categoryToggleBtn,
                  planCategory === "duo" && styles.categoryToggleBtnActive,
                ]}
                onPress={() => setPlanCategory("duo")}
              >
                <FontAwesome5
                  name="user-friends"
                  size={14}
                  color={planCategory === "duo" ? "#202D3A" : "#60646C"}
                />
                <Text
                  style={[
                    styles.categoryToggleText,
                    planCategory === "duo" && styles.categoryToggleTextActive,
                  ]}
                >
                  {t("toggle_couple_duo", userLang) || "Para o Casal"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryToggleBtn,
                  planCategory === "individual" &&
                    styles.categoryToggleBtnActive,
                ]}
                onPress={() => setPlanCategory("individual")}
              >
                <FontAwesome5
                  name="user"
                  size={14}
                  color={planCategory === "individual" ? "#202D3A" : "#60646C"}
                />
                <Text
                  style={[
                    styles.categoryToggleText,
                    planCategory === "individual" &&
                      styles.categoryToggleTextActive,
                  ]}
                >
                  {t("toggle_individual_solo", userLang) || "Individual"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {hasPartner && (
            <View style={styles.partnerNoticeBox}>
              <FontAwesome5 name="heart" solid size={16} color="#67D4A8" />
              <Text style={styles.partnerNoticeText}>
                {t("partner_connected_notice", userLang) || "Seu plano Duo ativará o acesso para você e seu parceiro!"}
              </Text>
            </View>
          )}

          {isLoadingOfferings ? (
            <ActivityIndicator
              size="large"
              color="#EAB64A"
              style={{ marginVertical: 20 }}
            />
          ) : (
            <View style={styles.plansWrapper}>
              {activePlans.map((plan) => {
                const isSelected = selectedPlan === plan.id;

                let displayPrice = plan.price;
                let displayDesc = plan.desc;

                const matchedPkg = findPackage(
                  planCategory,
                  plan.id as "mensal" | "trimestral" | "anual",
                );

                if (matchedPkg && matchedPkg.product.priceString) {
                  displayPrice = matchedPkg.product.priceString
                    .replace("R$", "")
                    .trim();
                  displayDesc = matchedPkg.product.description || plan.desc;
                }

                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planCard,
                      isSelected && styles.planCardSelected,
                    ]}
                    activeOpacity={0.9}
                    onPress={() => setSelectedPlan(plan.id as any)}
                    disabled={isProcessing}
                  >
                    {plan.highlight && (
                      <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>{plan.highlight}</Text>
                      </View>
                    )}

                    <View style={styles.planInfo}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planDesc}>{displayDesc}</Text>
                    </View>

                    <View style={styles.planPriceBox}>
                      <Text style={styles.planPrice}>R$ {displayPrice}</Text>
                      <Text style={styles.planPeriod}>{plan.period}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.guaranteeBox}>
            <View style={styles.guaranteeHeader}>
              <FontAwesome5 name="shield-alt" size={16} color="#67D4A8" />
              <Text style={styles.guaranteeTitle}>
                {t("time_protected_title", userLang) || "Sua Jornada Protegida"}
              </Text>
            </View>
            <Text style={styles.priceSub}>
              {t("journey_starts_text_part1", userLang) || "Acesso completo a todas as tarefas,"}{" "}
              <Text
                style={{ fontFamily: "Montserrat_700Bold", color: "#202D3A" }}
              >
                {t("journey_starts_text_highlight", userLang) || "diário criptografado"}
              </Text>{" "}
              {planCategory === "duo"
                ? t("duo_sub_coverage_desc", userLang) || "e área de mimos do casal."
                : t("solo_upgrade_desc", userLang) || "e evolução pessoal."}
            </Text>
          </View>

          <View style={styles.featuresContainer}>
            <Text style={styles.featuresSectionTitle}>
              {t("what_is_included_title", userLang, {
                category: planCategory === "duo" ? "Plano Duo" : "Plano Solo",
              }) || `O que está incluso no ${planCategory === "duo" ? "Plano Duo" : "Plano Solo"}:`}
            </Text>
            {activeFeatures.map((feat, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIconBg}>
                  <FontAwesome5 name={feat.icon} size={20} color="#202D3A" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>{feat.title}</Text>
                  <Text style={styles.featureDesc}>{feat.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.legalSection}>
            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={handleRestorePurchases}
              disabled={isProcessing}
            >
              <Text style={styles.restoreBtnText}>
                {t("btn_restore_purchases", userLang) || "Restaurar Compras"}
              </Text>
            </TouchableOpacity>

            <View style={styles.legalLinksRow}>
              <TouchableOpacity
                onPress={() =>
                  openUrl(`https://duoelo.lu/termos?lang=${userLang}`)
                }
              >
                <Text style={styles.legalLinkText}>
                  {t("terms_of_use_eula", userLang) || "Termos de Uso (EULA)"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.legalDivider}>•</Text>
              <TouchableOpacity
                onPress={() =>
                  openUrl(`https://duoelo.lu/privacidade?lang=${userLang}`)
                }
              >
                <Text style={styles.legalLinkText}>
                  {t("privacy_policy_link", userLang) || "Política de Privacidade"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.ctaButton, isProcessing && { opacity: 0.8 }]}
          activeOpacity={0.9}
          onPress={handleSubscribe}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#202D3A" />
          ) : (
            <>
              <FontAwesome5 name="star" solid size={18} color="#202D3A" />
              <Text style={styles.ctaButtonText}>
                {t("btn_subscribe_plan_cta", userLang, {
                  category: planCategory === "duo" ? "Duo" : "Solo",
                  period:
                    selectedPlan === "mensal"
                      ? t("period_monthly_word", userLang) || "Mensal"
                      : selectedPlan === "trimestral"
                        ? t("period_quarterly_word", userLang) || "Trimestral"
                        : t("period_annual_word", userLang) || "Anual",
                }) || `Assinar ${planCategory === "duo" ? "Duo" : "Solo"} ${selectedPlan}`}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.guaranteeText}>
          <FontAwesome5 name="lock" size={10} color="#60646C" />{" "}
          {t("secure_payment_env", userLang) || "Ambiente de Pagamento 100% Seguro"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: Platform.OS === "android" ? 45 : 20,
    marginBottom: 10,
    zIndex: 99999,
    elevation: 20,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D9E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  logoutBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FADBD8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    alignItems: "center",
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F4F1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
    textAlign: "center",
    lineHeight: 34,
    marginBottom: 10,
  },
  heroSub: {
    fontSize: 14,
    color: "#60646C",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 5,
    fontFamily: "Montserrat_400Regular",
  },
  categoryToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    padding: 4,
    width: "100%",
    marginBottom: 20,
  },
  categoryToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  categoryToggleBtnActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryToggleText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    color: "#60646C",
  },
  categoryToggleTextActive: {
    color: "#202D3A",
  },
  partnerNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F4F1",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#67D4A8",
    gap: 10,
    marginBottom: 20,
    width: "100%",
  },
  partnerNoticeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
    lineHeight: 18,
  },
  plansWrapper: {
    width: "100%",
    marginBottom: 20,
    gap: 12,
  },
  planCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#D1D9E0",
    borderRadius: 16,
    padding: 20,
    position: "relative",
  },
  planCardSelected: {
    borderColor: "#EAB64A",
    backgroundColor: "#FFFDF5",
    shadowColor: "#EAB64A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeContainer: {
    position: "absolute",
    top: -10,
    left: 20,
    backgroundColor: "#EAB64A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: "#202D3A",
    fontSize: 10,
    fontFamily: "Montserrat_900Black",
    letterSpacing: 1,
  },
  planInfo: { flex: 1 },
  planName: {
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
    marginBottom: 4,
  },
  planDesc: {
    fontSize: 13,
    color: "#60646C",
    fontFamily: "Montserrat_400Regular",
  },
  planPriceBox: { alignItems: "flex-end" },
  planPrice: {
    fontSize: 20,
    fontFamily: "Montserrat_900Black",
    color: "#202D3A",
  },
  planPeriod: {
    fontSize: 12,
    color: "#60646C",
    fontFamily: "Montserrat_700Bold",
  },
  guaranteeBox: {
    backgroundColor: "#E8F4F1",
    padding: 18,
    borderRadius: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#67D4A8",
  },
  guaranteeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    gap: 8,
  },
  guaranteeTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
    textTransform: "uppercase",
  },
  priceSub: {
    fontSize: 13,
    color: "#2C3E50",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "Montserrat_400Regular",
  },
  featuresContainer: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    marginTop: 25,
    borderWidth: 1,
    borderColor: "#D1D9E0",
  },
  featuresSectionTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    color: "#60646C",
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  featureItem: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  featureIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  featureTextContainer: { flex: 1 },
  featureTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: "#60646C",
    lineHeight: 16,
    fontFamily: "Montserrat_400Regular",
  },
  legalSection: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
    gap: 8,
  },
  restoreBtn: {
    padding: 8,
  },
  restoreBtnText: {
    color: "#60646C",
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    textDecorationLine: "underline",
    textAlign: "center",
  },
  legalLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legalLinkText: {
    color: "#AFAFAF",
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    textDecorationLine: "underline",
  },
  legalDivider: {
    color: "#D1D9E0",
    fontSize: 10,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 30,
    backgroundColor: "#F0F4F8",
    borderTopWidth: 1,
    borderTopColor: "#D1D9E0",
  },
  ctaButton: {
    flexDirection: "row",
    backgroundColor: "#EAB64A",
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    shadowColor: "#EAB64A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 12,
  },
  ctaButtonText: {
    color: "#202D3A",
    fontSize: 16,
    fontFamily: "Montserrat_900Black",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  guaranteeText: {
    textAlign: "center",
    color: "#60646C",
    fontSize: 12,
    fontFamily: "Montserrat_600SemiBold",
  },
});