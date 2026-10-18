import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { getBlockedProfiles, unblockProfile, type BlockedProfile } from "@/api/moderation";

export default function BlockedUsersScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<BlockedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    getBlockedProfiles()
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo cargar la lista"))
      .finally(() => setLoading(false));
  }, []);

  function confirmUnblock(row: BlockedProfile) {
    Alert.alert(`¿Desbloquear a ${row.alias}?`, "Podrán volver a ver sus perfiles y escribirse.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Desbloquear",
        onPress: async () => {
          setUnblocking(row.profileId);
          try {
            await unblockProfile(row.profileId);
            setRows((prev) => prev.filter((r) => r.profileId !== row.profileId));
          } catch (e: unknown) {
            Alert.alert("Error", e instanceof Error ? e.message : "No se pudo desbloquear");
          } finally {
            setUnblocking(null);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Usuarios bloqueados</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#9333ea" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.profileId}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.description}>
              No pueden ver tu perfil ni escribirte, y tú tampoco los ves a ellos.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Avatar photoUrl={item.photoUrl} alias={item.alias} size={44} />
              <View style={styles.rowBody}>
                <Text style={styles.alias} numberOfLines={1}>{item.alias}</Text>
                <Text style={styles.meta}>
                  Bloqueado el {new Date(item.blockedAt).toLocaleDateString("es-CL")}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.unblockButton, unblocking === item.profileId && styles.disabled]}
                onPress={() => confirmUnblock(item)}
                disabled={unblocking === item.profileId}
              >
                {unblocking === item.profileId ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.unblockText}>Desbloquear</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="ban-outline" size={28} color="#2a2a2a" />
              <Text style={styles.emptyText}>{error || "No has bloqueado a nadie"}</Text>
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
  list: {
    padding: 16,
  },
  description: {
    color: "#888888",
    fontSize: 14,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  rowBody: {
    flex: 1,
  },
  alias: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  meta: {
    color: "#888888",
    fontSize: 12,
    marginTop: 2,
  },
  unblockButton: {
    minWidth: 104,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  unblockText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "500",
  },
  empty: {
    alignItems: "center",
    gap: 10,
    marginTop: 48,
  },
  emptyText: {
    color: "#888888",
    fontSize: 14,
    textAlign: "center",
  },
});
