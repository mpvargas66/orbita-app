import { useEffect, useState } from "react";
import { View, FlatList, ActivityIndicator, Text, RefreshControl } from "react-native";
import { ProfileCard } from "@/components/ProfileCard";
import { getProfiles } from "@/api/profiles";

interface Profile {
  id: string;
  alias: string;
  profileType: string;
  city?: string;
  photoUrl?: string;
}

export default function ExploreScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
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
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#9333ea" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <Text className="text-white text-xl font-bold px-4 pt-14 pb-3">Explorar</Text>
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProfileCard profile={item} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor="#9333ea"
          />
        }
        ListEmptyComponent={
          <Text className="text-zinc-500 text-center mt-12">Sin perfiles por ahora</Text>
        }
      />
    </View>
  );
}
