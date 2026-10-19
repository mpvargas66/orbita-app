import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import {
  getConversationMessages,
  sendMessage,
  setMessageReaction,
  REACTION_EMOJIS,
  type Message,
  type MessageReaction,
  type ReactionEmoji,
} from "@/api/messages";
import { ApiError } from "@/api/client";
import { ReportSheet, showModerationMenu, confirmBlock } from "@/components/Moderation";

const POLL_INTERVAL_MS = 5000;

// Newest first, because the list is inverted (index 0 renders at the bottom).
function sortNewestFirst(list: Message[]) {
  return [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Groups a message's reactions by emoji, in order of first appearance.
function groupReactions(reactions: MessageReaction[] | undefined) {
  const groups: { emoji: string; profileIds: string[] }[] = [];
  for (const r of reactions ?? []) {
    const group = groups.find((g) => g.emoji === r.emoji);
    if (group) group.profileIds.push(r.profileId);
    else groups.push({ emoji: r.emoji, profileIds: [r.profileId] });
  }
  return groups;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatScreen() {
  const { id, alias, profileId } = useLocalSearchParams<{
    id: string;
    alias?: string;
    profileId?: string;
  }>();
  const router = useRouter();
  const myProfileId = useAuthStore((s) => s.profile?.id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  // Message whose reaction picker is open (long-press on a bubble).
  const [pickerFor, setPickerFor] = useState<Message | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  // Set when the backend refuses the conversation (403/404), e.g. after a block.
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    let interval: ReturnType<typeof setInterval> | undefined;

    async function fetchMessages() {
      try {
        const data = await getConversationMessages(id);
        if (!active) return;
        setMessages(sortNewestFirst(data));
        setError("");
      } catch (e: unknown) {
        if (!active) return;
        if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
          setUnavailable(true);
          clearInterval(interval);
        } else {
          setError(e instanceof Error ? e.message : "No se pudieron cargar los mensajes");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchMessages();
    interval = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id]);

  async function handleSend() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const sent = await sendMessage(id, content);
      setMessages((prev) =>
        sortNewestFirst([sent, ...prev.filter((m) => m.id !== sent.id)])
      );
      setText("");
      setError("");
    } catch (e: unknown) {
      if (e instanceof ApiError && (e.status === 403 || e.status === 404)) setUnavailable(true);
      else setError(e instanceof Error ? e.message : "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  }

  async function react(message: Message, emoji: ReactionEmoji | null) {
    setPickerFor(null);
    if (!myProfileId) return;
    const previous = message.reactions ?? [];
    const others = previous.filter((r) => r.profileId !== myProfileId);
    const next = emoji ? [...others, { profileId: myProfileId, emoji }] : others;
    const apply = (reactions: MessageReaction[]) =>
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, reactions } : m)));

    apply(next); // Optimistic; reconcile with the server or roll back.
    try {
      const res = await setMessageReaction(message.id, emoji);
      apply(res.reactions);
    } catch (e: unknown) {
      apply(previous);
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo guardar la reacción");
    }
  }

  function isMine(message: Message) {
    return (message.senderProfileId ?? message.senderId) === myProfileId;
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
        <Text style={styles.headerTitle} numberOfLines={1}>{alias ?? "Chat"}</Text>
        {profileId && !unavailable ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              showModerationMenu(
                alias ?? "Usuario",
                () => setReportOpen(true),
                () => confirmBlock(profileId, alias ?? "este usuario", () => router.back())
              )
            }
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#ffffff" />
          </TouchableOpacity>
        ) : null}
      </View>

      {profileId ? (
        <ReportSheet
          visible={reportOpen}
          profileId={profileId}
          alias={alias ?? "Usuario"}
          conversationId={id}
          onClose={() => setReportOpen(false)}
        />
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#9333ea" />
        </View>
      ) : unavailable ? (
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={28} color="#888888" />
          <Text style={styles.unavailable}>Esta conversación ya no está disponible</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const mine = isMine(item);
            const groups = groupReactions(item.reactions);
            return (
              <View style={[styles.messageBlock, mine ? styles.alignEnd : styles.alignStart]}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onLongPress={() => setPickerFor(item)}
                  delayLongPress={250}
                  style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
                >
                  <Text style={styles.bubbleText}>{item.content}</Text>
                  <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </TouchableOpacity>
                {groups.length > 0 ? (
                  <View style={[styles.reactionRow, mine ? styles.alignEnd : styles.alignStart]}>
                    {groups.map((g) => {
                      const reactedByMe = g.profileIds.includes(myProfileId ?? "");
                      return (
                        <TouchableOpacity
                          key={g.emoji}
                          style={[styles.reactionChip, reactedByMe && styles.reactionChipMine]}
                          // Tapping your own emoji removes it; another one switches to it.
                          onPress={() => react(item, reactedByMe ? null : (g.emoji as ReactionEmoji))}
                        >
                          <Text style={styles.reactionEmoji}>{g.emoji}</Text>
                          {g.profileIds.length > 1 ? (
                            <Text style={styles.reactionCount}>{g.profileIds.length}</Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={
            // Inverted lists flip their children, so flip the empty state back.
            <Text style={styles.empty}>Escribe el primer mensaje</Text>
          }
        />
      )}

      <Modal
        visible={pickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerFor(null)}
      >
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setPickerFor(null)}>
          <View style={styles.picker}>
            {REACTION_EMOJIS.map((emoji) => {
              const current = pickerFor?.reactions?.find((r) => r.profileId === myProfileId)?.emoji;
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.pickerOption, current === emoji && styles.pickerOptionSelected]}
                  onPress={() => pickerFor && react(pickerFor, current === emoji ? null : emoji)}
                >
                  <Text style={styles.pickerEmoji}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {unavailable ? null : (
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#888888"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      )}
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
    gap: 10,
    paddingHorizontal: 24,
  },
  unavailable: {
    color: "#888888",
    fontSize: 14,
    textAlign: "center",
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  messageBlock: {
    maxWidth: "78%",
    marginVertical: 3,
  },
  alignEnd: {
    alignSelf: "flex-end",
  },
  alignStart: {
    alignSelf: "flex-start",
  },
  reactionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: -4,
    paddingHorizontal: 6,
  },
  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  reactionChipMine: {
    borderColor: "#9333ea",
    backgroundColor: "rgba(147, 51, 234, 0.2)",
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  picker: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 999,
    padding: 8,
  },
  pickerOption: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerOptionSelected: {
    backgroundColor: "rgba(147, 51, 234, 0.3)",
  },
  pickerEmoji: {
    fontSize: 26,
  },
  bubble: {
    // Width is capped by messageBlock.
    maxWidth: "100%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "#9333ea",
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    alignSelf: "flex-start",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderBottomLeftRadius: 4,
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
  error: {
    color: "#f87171",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingBottom: 6,
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
});
