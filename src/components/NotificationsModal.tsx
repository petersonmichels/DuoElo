import { FontAwesome5 } from "@expo/vector-icons";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../config/firebase";
import { t } from "../i18n/translations";

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

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const uid = auth.currentUser?.uid;

    if (visible && uid) {
      const q = query(
        collection(db, "users", uid, "notifications"),
        orderBy("createdAt", "desc"),
        limit(20)
      );

      const processDocs = (snapshotDocs: any[]) => {
        const docs = snapshotDocs.map((d) => ({ id: d.id, ...d.data() }));
        setNotifications(docs);

        // 🎯 Marca as notificações não lidas como lidas de forma assíncrona
        const unreadDocs = snapshotDocs.filter((d) => !d.data().read);
        if (unreadDocs.length > 0) {
          const batch = writeBatch(db);
          unreadDocs.forEach((d) => {
            batch.update(doc(db, "users", uid, "notifications", d.id), {
              read: true,
            });
          });
          batch.commit().catch(() => {});
        }
      };

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          processDocs(snapshot.docs);
        },
        (error: unknown) => {
          // Fallback seguro caso o índice de ordenação do Firestore não esteja pronto
          const fallbackQuery = query(
            collection(db, "users", uid, "notifications"),
            limit(20)
          );
          onSnapshot(fallbackQuery, (fbSnapshot) => {
            processDocs(fbSnapshot.docs);
          });
        }
      );
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [visible]);

  // 🎨 MAPEAMENTO COMPLETO DE ÍCONES E CORES POR TIPO DE NOTIFICAÇÃO
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
        return { name: "gift", color: "#EAB64A" };
      case "GIFT_CONFIRMED":
        return { name: "gift", color: "#67D4A8" };
      case "DAILY_REMINDER":
        return { name: "clock", color: "#EAB64A" };
      default:
        return { name: "bell", color: "#202D3A" };
    }
  };

  // 📅 FORMATAÇÃO DE DATA E HORA
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
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.container}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>
              {t("notifications_title", userLanguage) || "Notificações"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome5 name="times" size={18} color="#60646C" />
            </TouchableOpacity>
          </View>

          {notifications.length === 0 ? (
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
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={{ width: "100%", maxHeight: 360 }}
              renderItem={({ item }) => {
                const iconInfo = getNotificationIcon(item.type);
                const isUnread = !item.read;

                return (
                  <View
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
              }}
            />
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>
              {t("modal_close", userLanguage) || "Fechar"}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
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
    paddingBottom: 40,
    alignItems: "center",
    width: "100%",
  },
  handle: {
    width: 50,
    height: 5,
    backgroundColor: "#D1D9E0",
    borderRadius: 3,
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
  closeBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#202D3A",
    alignItems: "center",
    marginTop: 15,
  },
  closeBtnText: {
    fontFamily: "Montserrat_700Bold",
    color: "#FFF",
    fontSize: 16,
  },
});