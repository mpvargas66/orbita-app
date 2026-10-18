import { useEffect, useState } from "react";
import { View, FlatList, ActivityIndicator, Text, RefreshControl, StyleSheet } from "react-native";
import { ProfileCard } from "@/components/ProfileCard";
import { getProfiles, type ProfileSummary } from "@/api/profiles";

export default function ExploreScreen() {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await getProfiles();
      setProfiles(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color="#9333ea" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Explorar</Text>
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProfileCard profile={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor="#9333ea"
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Sin perfiles por ahora</Text>
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
  empty: {
    color: "#888888",
    textAlign: "center",
    marginTop: 48,
  },
});
