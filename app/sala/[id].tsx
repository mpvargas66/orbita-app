import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { getRoomMessages, sendRoomMessage, type RoomMessage } from "@/api/rooms";
import { getBlockedProfiles } from "@/api/moderation";
import { ApiError } from "@/api/client";
import { ReportSheet, confirmBlock } from "@/components/Moderation";

const POLL_INTERVAL_MS = 3000;
const MAX_LENGTH = 500;

const PROFILE_TYPE_SHORT: Record<string, string> = {
  couple_het: "Pareja",
  couple_gay: "Pareja gay",
  couple_lesbian: "Pareja lésbica",
  single_m: "Hombre",
  single_f: "Mujer",
  other: "Otro",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export default function SalaScreen() {
  const { id, name, icon, premiumOnly } = useLocalSearchParams<{
    id: string;
    name?: string;
    icon?: string;
    premiumOnly?: string;
  }>();
  const router = useRouter();
  const myProfile = useAuthStore((s) => s.profile);

  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<RoomMessage | null>(null);

  // The backend enforces this too; here it just avoids a pointless attempt.
  const canWrite = premiumOnly !== "1" || myProfile?.membershipType === "premium";

  useEffect(() => {
    getBlockedProfiles()
      .then((rows) => setBlockedIds(new Set(rows.map((r) => r.profileId))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchMessages() {
      try {
        const data = await getRoomMessages(id);
        if (!active) return;
        setMessages(data);
        setError("");
      } catch (e: unknown) {
        if (active) setError(e instanceof Error ? e.message : "No se pudieron cargar los mensajes");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id]);

  // Newest first for the inverted list; messages from blocked profiles are hidden.
  const visibleMessages = useMemo(
    () => messages.filter((m) => !blockedIds.has(m.profileId)).slice().reverse(),
    [messages, blockedIds]
  );

  async function handleSend() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const msg = await sendRoomMessage(id, content);
      setMessages((prev) => [...prev.filter((m) => m.id !== msg.id), msg]);
      setText("");
    } catch (e: unknown) {
      const message =
        e instanceof ApiError && e.status === 429
          ? "Espera un momento antes de enviar otro mensaje."
          : e instanceof Error
            ? e.message
            : "Inténtalo de nuevo";
      Alert.alert("No se pudo enviar", message);
    } finally {
      setSending(false);
    }
  }

  function handleLongPress(msg: RoomMessage) {
    if (msg.profileId === myProfile?.id) return;

    const actions: { label: string; run: () => void; destructive?: boolean }[] = [
      { label: "Ver perfil", run: () => router.push(`/perfil/${msg.profileId}`) },
      { label: "Reportar mensaje", run: () => setReportTarget(msg), destructive: true },
      {
        label: `Bloquear a ${msg.alias}`,
        destructive: true,
        run: () =>
          confirmBlock(msg.profileId, msg.alias, () =>
            setBlockedIds((prev) => new Set(prev).add(msg.profileId))
          ),
      },
    ];

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: msg.alias,
          options: ["Cancelar", ...actions.map((a) => a.label)],
          cancelButtonIndex: 0,
          destructiveButtonIndex: actions
            .map((a, i) => (a.destructive ? i + 1 : -1))
            .filter((i) => i > 0),
        },
        (index) => {
          if (index > 0) actions[index - 1].run();
        }
      );
    } else {
      // Android alerts show up to three buttons, so the menu skips "Cancelar"
      // (tapping outside dismisses it).
      Alert.alert(
        msg.alias,
        undefined,
        actions.map((a) => ({
          text: a.label,
          style: a.destructive ? ("destructive" as const) : undefined,
          onPress: a.run,
        })),
        { cancelable: true }
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerIcon}>{icon ?? "💬"}</Text>
        <Text style={styles.headerTitle} numberOfLines={1}>{name ?? "Sala"}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#9333ea" />
        </View>
      ) : (
        <FlatList
          data={visibleMessages}
          inverted
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: msg }) => {
            const mine = msg.profileId === myProfile?.id;
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onLongPress={() => handleLongPress(msg)}
                delayLongPress={300}
                style={[styles.messageRow, mine && styles.messageRowMine]}
              >
                {!mine ? (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{msg.alias.charAt(0).toUpperCase()}</Text>
                  </View>
                ) : null}
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  {!mine ? (
                    <View style={styles.bubbleHeader}>
                      <Text style={styles.bubbleAlias}>{msg.alias}</Text>
                      {msg.profileType ? (
                        <Text style={styles.bubbleType}>
                          {PROFILE_TYPE_SHORT[msg.profileType] ?? msg.profileType}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                  <Text style={styles.bubbleText}>{msg.content}</Text>
                  <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
                    {formatTime(msg.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            // Inverted lists flip their children, so flip the empty state back.
            <Text style={styles.empty}>{error || "Sé el primero en escribir"}</Text>
          }
        />
      )}

      {canWrite ? (
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Escribe algo..."
            placeholderTextColor="#888888"
            value={text}
            onChangeText={setText}
            maxLength={MAX_LENGTH}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.lockedBar}>
          <Ionicons name="lock-closed" size={14} color="#f59e0b" />
          <Text style={styles.lockedText}>Solo usuarios Premium pueden escribir en esta sala</Text>
        </View>
      )}

      {reportTarget ? (
        <ReportSheet
          visible
          profileId={reportTarget.profileId}
          alias={reportTarget.alias}
          context={`Mensaje en la sala "${name ?? "Sala"}": "${reportTarget.content}"`}
          onClose={() => setReportTarget(null)}
        />
      ) : null}
    </KeyboardAvoidingView>
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
  headerIcon: {
    fontSize: 22,
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
  list: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginVertical: 4,
  },
  messageRowMine: {
    justifyContent: "flex-end",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#c084fc",
    fontSize: 13,
    fontWeight: "700",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleMine: {
    backgroundColor: "#9333ea",
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderBottomLeftRadius: 4,
  },
  bubbleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  bubbleAlias: {
    color: "#c084fc",
    fontSize: 12,
    fontWeight: "700",
  },
  bubbleType: {
    color: "#888888",
    fontSize: 11,
  },
  bubbleText: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleTime: {
    color: "#888888",
    fontSize: 10,
    marginTop: 2,
    alignSelf: "flex-end",
  },
  bubbleTimeMine: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  empty: {
    color: "#888888",
    textAlign: "center",
    marginTop: 48,
    transform: [{ scaleY: -1 }],
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
    backgroundColor: "#0a0a0a",
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 20,
    color: "#ffffff",
    fontSize: 15,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#9333ea",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  lockedBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 14,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
  },
  lockedText: {
    color: "#888888",
    fontSize: 13,
  },
});
