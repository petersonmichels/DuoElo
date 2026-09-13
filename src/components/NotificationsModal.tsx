import { FontAwesome5 } from "@expo/vector-icons";
import {
  collection,
  doc,
  onSnapshot,
  query,
  writeBatch,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
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
import { t } from "../i18n/translations";
import { audioService } from "../services/AudioService";
import { Button3D } from "./Effects3D";

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  userLanguage?: string;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  userLanguage = "pt-BR",
}) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hasMarkedReadRef = useRef(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const uid = auth.currentUser?.uid;

    if (visible && uid) {
      setLoading(true);
      hasMarkedReadRef.current = false;

      // 🟢 Busca sem orderBy para evitar bloqueios de índice e falhas no Firestore
      const q = query(collection(db, "users", uid, "notifications"));

      unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

          // 🟢 Ordenação estritamente feita na memória do dispositivo (mais recentes primeiro)
          docs.sort((a: any, b: any) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });

          setNotifications(docs);
          setLoading(false);

          // 🟢 Limpa a bolinha vermelha marcando todas como lidas em lote (batch) no Firestore
          if (!hasMarkedReadRef.current) {
            const unreadDocs = snapshot.docs.filter((d) => !d.data().read);
            if (unreadDocs.length > 0) {
              hasMarkedReadRef.current = true;
              try {
                const batch = writeBatch(db);
                unreadDocs.forEach((d) => {
                  batch.update(doc(db, "users", uid, "notifications", d.id), {
                    read: true,
                  });
                });
                await batch.commit();
              } catch (e) {
                console.warn("[NOTIF_MODAL] Erro ao marcar como lidas:", e);
              }
            }
          }
        },
        (error) => {
          console.warn("[NOTIFICATIONS_MODAL] Erro de busca:", error);
          setLoading(false);
        }
      );
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [visible]);

  const handleClose = () => {
    audioService.play("click");
    onClose();
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case "MATCH_INVITE":
        return { name: "heart", color: "#D96C6C" };
      case "MATCH_ACCEPT":
        return { name: "heart", color: "#67D4A8" };
      case "PLAY_STARTED":
        return { name: "play-circle", color: "#202D3A" };
      case "LESSON_COMPLETED":
        return { name: "check-circle", color: "#67D4A8" };
      case "GIFT_RECEIVED":
      case "GIFT_CHOSEN":
      case "GIFT_BOUGHT":
      case "GIFT_DELIVERED":
        return { name: "gift", color: "#EAB64A" };
      case "GIFT_CONFIRMED":
        return { name: "gift", color: "#67D4A8" };
      case "DAILY_REMINDER":
        return { name: "clock", color: "#EAB64A" };
      default:
        return { name: "bell", color: "#202D3A" };
    }
  };

  const formatDate = (rawDate: any) => {
    if (!rawDate) return "";
    let dateObj: Date;

    if (rawDate?.toDate) {
      dateObj = rawDate.toDate();
    } else if (typeof rawDate === "string") {
      dateObj = new Date(rawDate);
    } else {
      return "";
    }

    if (isNaN(dateObj.getTime())) return "";

    const day = dateObj.getDate().toString().padStart(2, "0");
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const hours = dateObj.getHours().toString().padStart(2, "0");
    const minutes = dateObj.getMinutes().toString().padStart(2, "0");

    return `${day}/${month} às ${hours}:${minutes}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <SafeAreaView edges={["bottom"]} style={{ width: "100%", maxHeight: "100%" }}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>
                {t("notifications_title", userLanguage) || "Notificações"}
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <FontAwesome5 name="times" size={18} color="#60646C" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#202D3A" style={{ marginVertical: 40 }} />
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.bellIconBg}>
                  <FontAwesome5 name="bell" solid size={26} color="#202D3A" />
                </View>
                <Text style={styles.emptyText}>
                  {t("no_notifications_msg", userLanguage) ||
                    "Nenhuma notificação nova no momento. Está tudo tranquilo por aqui!"}
                </Text>
              </View>
            ) : (
              /* 🟢 ScrollView isolado para garanta que a rolagem funcione no iOS/Android sem ser travada pelo Modal */
              <ScrollView
                style={styles.scrollList}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                {notifications.map((item) => {
                  const iconInfo = getNotificationIcon(item.type);
                  const isUnread = !item.read;

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.card,
                        isUnread ? styles.cardUnread : styles.cardRead,
                      ]}
                    >
                      <View style={styles.cardHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                          <FontAwesome5
                            name={iconInfo.name}
                            solid
                            size={14}
                            color={iconInfo.color}
                          />
                          <Text
                            style={[
                              styles.cardTitle,
                              isUnread ? styles.textBoldTitle : styles.textNormalTitle,
                            ]}
                            numberOfLines={1}
                          >
                            {item.title || t("notification_default_title", userLanguage) || "Notificação"}
                          </Text>
                        </View>
                        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                      </View>

                      <Text
                        style={[
                          styles.cardBody,
                          isUnread ? styles.textBoldBody : styles.textNormalBody,
                        ]}
                      >
                        {item.body || item.message || ""}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.footer}>
              <Button3D
                title={t("modal_close", userLanguage) || "Fechar"}
                onPress={handleClose}
              />
            </View>
          </SafeAreaView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(32,45,58,0.6)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 20,
    alignItems: "center",
    width: "100%",
    maxHeight: "85%",
  },
  handle: {
    width: 50,
    height: 5,
    backgroundColor: "#D1D9E0",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Montserrat_900Black",
    fontSize: 20,
    color: "#202D3A",
  },
  emptyContainer: {
    alignItems: "center",
    marginVertical: 15,
  },
  bellIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#60646C",
    textAlign: "center",
    lineHeight: 20,
  },
  scrollList: {
    width: "100%",
    maxHeight: 380,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardUnread: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EAB64A",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardRead: {
    backgroundColor: "#F0F4F8",
    borderColor: "#D1D9E0",
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    color: "#202D3A",
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    color: "#AFAFAF",
    fontFamily: "Montserrat_400Regular",
    marginLeft: 6,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  textBoldTitle: {
    fontFamily: "Montserrat_900Black",
  },
  textNormalTitle: {
    fontFamily: "Montserrat_700Bold",
    color: "#2C3E50",
  },
  textBoldBody: {
    fontFamily: "Montserrat_700Bold",
    color: "#202D3A",
  },
  textNormalBody: {
    fontFamily: "Montserrat_400Regular",
    color: "#60646C",
  },
  footer: {
    width: "100%",
    marginTop: 15,
  },
});