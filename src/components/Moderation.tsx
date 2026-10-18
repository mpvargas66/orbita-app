import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { blockProfile, reportProfile, REPORT_REASONS, type ReportReason } from "@/api/moderation";

// "⋯" menu with Report and Block. Alert keeps it native on both platforms.
export function showModerationMenu(alias: string, onReport: () => void, onBlock: () => void) {
  Alert.alert(alias, undefined, [
    { text: "Reportar", onPress: onReport },
    { text: "Bloquear", style: "destructive", onPress: onBlock },
    { text: "Cancelar", style: "cancel" },
  ]);
}

export function confirmBlock(profileId: string, alias: string, onBlocked: () => void) {
  Alert.alert(
    `¿Bloquear a ${alias}?`,
    "No podrán ver sus perfiles ni enviarse mensajes. Puedes desbloquear desde tu perfil, en Usuarios bloqueados.",
    [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Bloquear",
        style: "destructive",
        onPress: async () => {
          try {
            await blockProfile(profileId);
            onBlocked();
          } catch (e: unknown) {
            Alert.alert("Error", e instanceof Error ? e.message : "No se pudo bloquear el perfil");
          }
        },
      },
    ]
  );
}

export function ReportSheet({
  visible,
  profileId,
  alias,
  conversationId,
  onClose,
}: {
  visible: boolean;
  profileId: string;
  alias: string;
  conversationId?: string | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  function close() {
    setReason(null);
    setDetails("");
    onClose();
  }

  async function submit() {
    if (!reason || sending) return;
    setSending(true);
    try {
      await reportProfile({
        profileId,
        reason,
        details: details.trim() || null,
        conversationId: conversationId ?? null,
      });
      close();
      Alert.alert("Reporte enviado", "Gracias. Lo revisaremos pronto.");
    } catch (e: unknown) {
      Alert.alert("No se pudo enviar", e instanceof Error ? e.message : "Inténtalo de nuevo");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>Reportar a {alias}</Text>
            <TouchableOpacity onPress={close} hitSlop={10}>
              <Ionicons name="close" size={22} color="#888888" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Selecciona el motivo del reporte:</Text>

          {REPORT_REASONS.map((r) => {
            const selected = reason === r.value;
            return (
              <TouchableOpacity
                key={r.value}
                style={[styles.reason, selected && styles.reasonSelected]}
                onPress={() => setReason(r.value)}
              >
                <Text style={styles.reasonText}>{r.label}</Text>
                {selected ? <Ionicons name="checkmark" size={18} color="#9333ea" /> : null}
              </TouchableOpacity>
            );
          })}

          <TextInput
            style={styles.details}
            placeholder="Cuéntanos qué pasó (opcional)"
            placeholderTextColor="#888888"
            value={details}
            onChangeText={setDetails}
            maxLength={1000}
            multiline
          />

          <TouchableOpacity
            style={[styles.submit, (!reason || sending) && styles.submitDisabled]}
            onPress={submit}
            disabled={!reason || sending}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitText}>Enviar reporte</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#141414",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    color: "#888888",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 12,
  },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  reasonSelected: {
    borderColor: "#9333ea",
    backgroundColor: "rgba(147, 51, 234, 0.12)",
  },
  reasonText: {
    color: "#ffffff",
    fontSize: 15,
  },
  details: {
    minHeight: 80,
    maxHeight: 140,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    color: "#ffffff",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    marginTop: 12,
    textAlignVertical: "top",
  },
  submit: {
    backgroundColor: "#9333ea",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
