import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getNotifications, markAllNotificationsRead, type AppNotification } from "@/api/notifications";
import { notificationIcon, openNotification, timeAgo } from "@/lib/notifications";

export default function NotificacionesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await getNotifications();
      // Show unread highlights for this visit, then mark everything read on the server.
      setItems(data.notifications);
      setError("");
      if (data.unread > 0) markAllNotificationsRead().catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las notificaciones");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#9333ea" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#9333ea"
            />
          }
          renderItem={({ item: n }) => {
            const icon = notificationIcon(n.type);
            return (
              <TouchableOpacity
                style={[styles.item, !n.read && styles.itemUnread]}
                onPress={() => openNotification(router, n)}
                activeOpacity={0.8}
              >
                {n.senderPhotoUrl ? (
                  <View>
                    <Image source={{ uri: n.senderPhotoUrl }} style={styles.photo} />
                    <View style={[styles.typeBadge, { backgroundColor: icon.color }]}>
                      <Ionicons name={icon.name} size={10} color="#ffffff" />
                    </View>
                  </View>
                ) : (
                  <View style={[styles.icon, { backgroundColor: `${icon.color}22` }]}>
                    <Ionicons name={icon.name} size={20} color={icon.color} />
                  </View>
                )}
                <View style={styles.body}>
                  <Text style={styles.itemTitle}>{n.title}</Text>
                  {n.body ? <Text style={styles.itemBody} numberOfLines={2}>{n.body}</Text> : null}
                </View>
                <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={32} color="#2a2a2a" />
              <Text style={styles.emptyText}>{error || "Sin notificaciones por ahora"}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#141414",
  },
  itemUnread: {
    backgroundColor: "rgba(147, 51, 234, 0.08)",
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  photo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#141414",
  },
  typeBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
  },
  itemTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  itemBody: {
    color: "#888888",
    fontSize: 13,
    marginTop: 2,
  },
  time: {
    color: "#888888",
    fontSize: 11,
  },
  empty: {
    alignItems: "center",
    gap: 10,
    marginTop: 64,
  },
  emptyText: {
    color: "#888888",
    fontSize: 14,
  },
});
