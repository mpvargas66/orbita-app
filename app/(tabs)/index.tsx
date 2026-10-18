import { useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { ProfileCard } from "@/components/ProfileCard";
import { getProfiles, type ProfileSummary, type ProfileTypeFilter } from "@/api/profiles";

const TYPE_FILTERS: { label: string; value: ProfileTypeFilter }[] = [
  { label: "Parejas", value: "couple" },
  { label: "Ellas", value: "single_f" },
  { label: "Ellos", value: "single_m" },
];

export default function ExploreScreen() {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ProfileTypeFilter | null>(null);
  // Ignore responses from filters that changed while the request was in flight.
  const requestId = useRef(0);

  async function load() {
    const current = ++requestId.current;
    try {
      const data = await getProfiles({ availableOnly, type: typeFilter });
      if (current !== requestId.current) return;
      setProfiles(data);
      setError("");
    } catch (e: unknown) {
      if (current === requestId.current)
        setError(e instanceof Error ? e.message : "No se pudieron cargar los perfiles");
    } finally {
      if (current === requestId.current) {
        setInitialLoading(false);
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    load();
  }, [availableOnly, typeFilter]);

  function toggleAvailable() {
    setLoading(true);
    setAvailableOnly((v) => !v);
  }

  function toggleType(value: ProfileTypeFilter) {
    setLoading(true);
    setTypeFilter((current) => (current === value ? null : value));
  }

  if (initialLoading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color="#9333ea" />
      </View>
    );
  }

  const filtered = availableOnly || typeFilter !== null;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Explorar</Text>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.chip, availableOnly && styles.chipActive]}
            onPress={toggleAvailable}
          >
            <View style={[styles.dot, availableOnly && styles.dotActive]} />
            <Text style={[styles.chipText, availableOnly && styles.chipTextActive]}>Disponibles</Text>
          </TouchableOpacity>
          {TYPE_FILTERS.map((f) => {
            const active = typeFilter === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleType(f.value)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.inlineLoading}>
          <ActivityIndicator color="#9333ea" />
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProfileCard profile={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#9333ea"
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {error || (filtered ? "Ningún perfil coincide con estos filtros" : "Sin perfiles por ahora")}
            </Text>
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
  filterRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: {
    borderColor: "#9333ea",
    backgroundColor: "rgba(147, 51, 234, 0.15)",
  },
  chipText: {
    color: "#888888",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#ffffff",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#888888",
  },
  dotActive: {
    backgroundColor: "#22c55e",
  },
  inlineLoading: {
    paddingTop: 48,
    alignItems: "center",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  empty: {
    color: "#888888",
    textAlign: "center",
    marginTop: 48,
  },
});
