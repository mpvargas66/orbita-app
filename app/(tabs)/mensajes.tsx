import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Avatar } from "@/components/Avatar";
import { useAuthStore } from "@/store/useAuthStore";
import { getConversations, type Conversation } from "@/api/messages";

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" });
}

export default function MensajesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      setConversations(await getConversations());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los mensajes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const token = useAuthStore((s) => s.token);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, []);

  // Reload whenever the tab gains focus so unread badges stay current after leaving a chat.
  useFocusEffect(
    useCallback(() => {
      if (token) load();
    }, [token])
  );

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color="#9333ea" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Mensajes</Text>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor="#9333ea"
          />
        }
        renderItem={({ item }) => {
          const alias = item.other?.alias ?? "Usuario";
          const unread = item.unreadCount > 0;
          return (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.75}
              onPress={() =>
                router.push({
                  pathname: "/chat/[id]",
                  params: { id: item.id, alias, profileId: item.other?.profileId ?? "" },
                })
              }
            >
              <Avatar photoUrl={item.other?.photoUrl} alias={alias} size={52} />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.alias} numberOfLines={1}>{alias}</Text>
                  {item.lastMessage ? (
                    <Text style={[styles.time, unread && styles.timeUnread]}>
                      {formatTime(item.lastMessage.createdAt)}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.rowBottom}>
                  <Text
                    style={[styles.preview, unread && styles.previewUnread]}
                    numberOfLines={1}
                  >
                    {item.lastMessage?.content ?? "Sin mensajes"}
                  </Text>
                  {unread ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {item.unreadCount > 99 ? "99+" : item.unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>{error || "Sin mensajes aún"}</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  rowBody: {
    flex: 1,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  alias: {
    flex: 1,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  time: {
    color: "#888888",
    fontSize: 12,
  },
  timeUnread: {
    color: "#9333ea",
  },
  preview: {
    flex: 1,
    color: "#888888",
    fontSize: 14,
  },
  previewUnread: {
    color: "#ffffff",
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  empty: {
    color: "#888888",
    textAlign: "center",
    marginTop: 48,
  },
});
