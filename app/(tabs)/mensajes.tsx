import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { PinModal } from "@/components/PinModal";
import { useAuthStore } from "@/store/useAuthStore";
import { usePrivateChatsStore } from "@/store/usePrivateChatsStore";
import { getConversations, type Conversation } from "@/api/messages";
import { getChatLockState, setChatPin, setConversationLocked, verifyChatPin } from "@/api/chatLock";

type PinPrompt = {
  mode: "enter" | "setup";
  title: string;
  subtitle?: string;
  onSubmit: (pin: string) => Promise<string | null>;
};

function errorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

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
  const [hasPin, setHasPin] = useState(false);
  const [pinPrompt, setPinPrompt] = useState<PinPrompt | null>(null);
  const unlocked = usePrivateChatsStore((s) => s.unlocked);
  const unlock = usePrivateChatsStore((s) => s.unlock);
  const lock = usePrivateChatsStore((s) => s.lock);

  async function load() {
    try {
      setError("");
      setConversations(await getConversations());
      getChatLockState().then((state) => setHasPin(state.hasPin)).catch(() => {});
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

  function goToChat(item: Conversation) {
    router.push({
      pathname: "/chat/[id]",
      params: { id: item.id, alias: item.other?.alias ?? "Usuario", profileId: item.other?.profileId ?? "" },
    });
  }

  function openConversation(item: Conversation) {
    if (!item.isLocked || unlocked) {
      goToChat(item);
      return;
    }
    setPinPrompt({
      mode: "enter",
      title: "Chats privados",
      subtitle: "Ingresa tu PIN para ver tus chats privados",
      onSubmit: async (pin) => {
        try {
          await verifyChatPin(pin);
        } catch (e: unknown) {
          return errorMessage(e, "PIN incorrecto");
        }
        unlock();
        setPinPrompt(null);
        goToChat(item);
        return null;
      },
    });
  }

  function markLocked(id: string, locked: boolean) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, isLocked: locked } : c)));
  }

  async function lockConversation(item: Conversation) {
    try {
      await setConversationLocked(item.id, true);
      markLocked(item.id, true);
    } catch (e: unknown) {
      Alert.alert("Error", errorMessage(e, "No se pudo hacer privado el chat"));
    }
  }

  function makePrivate(item: Conversation) {
    if (hasPin) {
      lockConversation(item);
      return;
    }
    // First private chat: create the PIN that will protect all of them.
    setPinPrompt({
      mode: "setup",
      title: "Crea tu PIN",
      subtitle: "Lo usarás para abrir todos tus chats privados",
      onSubmit: async (pin) => {
        try {
          await setChatPin(pin);
        } catch (e: unknown) {
          return errorMessage(e, "No se pudo guardar el PIN");
        }
        setHasPin(true);
        unlock();
        setPinPrompt(null);
        await lockConversation(item);
        return null;
      },
    });
  }

  function removePrivacy(item: Conversation) {
    setPinPrompt({
      mode: "enter",
      title: "Quitar privacidad",
      subtitle: "Ingresa tu PIN para que este chat vuelva a la lista normal",
      onSubmit: async (pin) => {
        try {
          await setConversationLocked(item.id, false, pin);
        } catch (e: unknown) {
          return errorMessage(e, "PIN incorrecto");
        }
        markLocked(item.id, false);
        setPinPrompt(null);
        return null;
      },
    });
  }

  function handleLongPress(item: Conversation) {
    const hidden = item.isLocked && !unlocked;
    Alert.alert(hidden ? "Chat privado" : item.other?.alias ?? "Conversación", undefined, [
      item.isLocked
        ? { text: "Quitar privacidad", onPress: () => removePrivacy(item) }
        : { text: "Hacer privado", onPress: () => makePrivate(item) },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  const hasLocked = conversations.some((c) => c.isLocked);

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color="#9333ea" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Mensajes</Text>
        {hasLocked && unlocked ? (
          <TouchableOpacity style={styles.lockAllButton} onPress={lock} accessibilityLabel="Bloquear chats privados">
            <Ionicons name="lock-open-outline" size={18} color="#9333ea" />
            <Text style={styles.lockAllText}>Bloquear</Text>
          </TouchableOpacity>
        ) : null}
      </View>
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
          // Locked chats hide who and what until the PIN is entered.
          if (item.isLocked && !unlocked) {
            return (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.75}
                onPress={() => openConversation(item)}
                onLongPress={() => handleLongPress(item)}
                delayLongPress={300}
              >
                <View style={styles.lockedAvatar}>
                  <Ionicons name="lock-closed" size={22} color="#9333ea" />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.alias}>Chat privado</Text>
                  <Text style={[styles.preview, styles.lockedPreview]}>
                    {unread ? "Mensajes nuevos · " : ""}Toca para desbloquear
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.75}
              onPress={() => openConversation(item)}
              onLongPress={() => handleLongPress(item)}
              delayLongPress={300}
            >
              <Avatar photoUrl={item.other?.photoUrl} alias={alias} size={52} />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.alias} numberOfLines={1}>{alias}</Text>
                  {item.isLocked ? <Ionicons name="lock-closed" size={13} color="#9333ea" /> : null}
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

      <PinModal
        visible={pinPrompt !== null}
        mode={pinPrompt?.mode}
        title={pinPrompt?.title ?? ""}
        subtitle={pinPrompt?.subtitle}
        onSubmit={(pin) => pinPrompt?.onSubmit(pin) ?? Promise.resolve(null)}
        onClose={() => setPinPrompt(null)}
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
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingRight: 16,
  },
  lockAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingBottom: 14,
  },
  lockAllText: {
    color: "#9333ea",
    fontSize: 13,
    fontWeight: "600",
  },
  lockedAvatar: {
    width: 52,
    height: 52,
    borderRadius: 13,
    backgroundColor: "rgba(147, 51, 234, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedPreview: {
    marginTop: 4,
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
