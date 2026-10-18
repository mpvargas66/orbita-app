import { useCallback, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { getRooms, type Room } from "@/api/rooms";

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

export default function SalasScreen() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setRooms(await getRooms());
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las salas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Refresh activity counts whenever the tab gains focus.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  function openRoom(room: Room) {
    router.push({
      pathname: "/sala/[id]",
      params: {
        id: room.id,
        name: room.name,
        icon: room.icon ?? "💬",
        premiumOnly: room.premiumOnly ? "1" : "0",
      },
    });
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color="#9333ea" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Salas</Text>
      <FlatList
        data={rooms}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor="#9333ea"
          />
        }
        renderItem={({ item: room }) => (
          <TouchableOpacity style={styles.card} onPress={() => openRoom(room)} activeOpacity={0.8}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{room.icon ?? "💬"}</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={styles.name} numberOfLines={1}>{room.name}</Text>
                {room.premiumOnly ? (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="star" size={9} color="#f59e0b" />
                    <Text style={styles.premiumText}>Premium</Text>
                  </View>
                ) : null}
                {room.lastMessageAt ? (
                  <Text style={styles.time}>{timeAgo(room.lastMessageAt)}</Text>
                ) : null}
              </View>
              {room.lastMessageContent ? (
                <Text style={styles.preview} numberOfLines={1}>
                  <Text style={styles.previewAlias}>{room.lastMessageAlias}: </Text>
                  {room.lastMessageContent}
                </Text>
              ) : room.description ? (
                <Text style={styles.preview} numberOfLines={1}>{room.description}</Text>
              ) : null}
              {room.activeUsers > 0 ? (
                <View style={styles.activeRow}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeText}>
                    {room.activeUsers} {room.activeUsers === 1 ? "activo" : "activos"} ahora
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{error || "No hay salas disponibles"}</Text>
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 24,
  },
  cardBody: {
    flex: 1,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumText: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "700",
  },
  time: {
    color: "#888888",
    fontSize: 11,
  },
  preview: {
    color: "#888888",
    fontSize: 13,
    marginTop: 3,
  },
  previewAlias: {
    color: "#ffffff",
    fontWeight: "600",
  },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  activeText: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "600",
  },
  empty: {
    color: "#888888",
    textAlign: "center",
    marginTop: 48,
  },
});
