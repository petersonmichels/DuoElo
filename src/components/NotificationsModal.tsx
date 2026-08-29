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
      // 🛡️ BÚSSOLA SEGURA: Tenta ordenar por createdAt, se falhar por falta de índice, usa listener básico
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
        (error) => {
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

  // 🎨 MAPEAMENTO DINÂMICO DE ÍCONES POR TIPO DE NOTIFICAÇÃO
  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case "MATCH_INVITE":
        return { name: "heart", color: "#E74C3C" };
      case "DAILY_REMINDER":
        return { name: "clock", color: "#EAB64A" };
      case "MISSION_COMPLETED":
        return { name: "check-circle", color: "#67D4A8" };
      default:
        return { name: "bell", color: "#202D3A" };
    }
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
              style={{ width: "100%", maxHeight: 320 }}
              renderItem={({ item }) => {
                const iconInfo = getNotificationIcon(item.type);
                return (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <FontAwesome5
                        name={iconInfo.name}
                        solid
                        size={14}
                        color={iconInfo.color}
                      />
                      <Text style={styles.cardTitle}>
                        {item.title || t("notification_default_title", userLanguage) || "Notificação"}
                      </Text>
                    </View>
                    <Text style={styles.cardBody}>
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
    backgroundColor: "#F0F4F8",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#D1D9E0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    color: "#202D3A",
  },
  cardBody: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    color: "#2C3E50",
    lineHeight: 18,
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