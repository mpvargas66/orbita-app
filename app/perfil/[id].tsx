import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { getProfile } from "@/api/profiles";

interface ProfileDetail {
  id: string;
  alias: string;
  profileType: string;
  city?: string;
  bio?: string;
  photoUrl?: string;
  membershipType?: string;
}

const PROFILE_TYPE_LABELS: Record<string, string> = {
  couple_het: "Pareja heterosexual",
  couple_gay: "Pareja gay",
  couple_lesbian: "Pareja lésbica",
  single_m: "Hombre soltero",
  single_f: "Mujer soltera",
  other: "Otro",
};

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile(id).then(setProfile).finally(() => setLoading(false));
  }, [id]);

  return (
    <View className="flex-1 bg-bg">
      <TouchableOpacity
        onPress={() => router.back()}
        className="absolute top-14 left-4 z-10 w-10 h-10 bg-black/50 rounded-full items-center justify-center"
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#9333ea" />
        </View>
      ) : !profile ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-zinc-400">Perfil no encontrado</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="items-center pt-24 pb-6 px-6">
            <Avatar photoUrl={profile.photoUrl} alias={profile.alias} size={96} />
            <Text className="text-white text-2xl font-bold mt-3">{profile.alias}</Text>
            <Text className="text-zinc-400 text-sm mt-1">
              {PROFILE_TYPE_LABELS[profile.profileType] ?? profile.profileType}
            </Text>
            {profile.city ? (
              <Text className="text-zinc-500 text-xs mt-1">📍 {profile.city}</Text>
            ) : null}
            {profile.bio ? (
              <Text className="text-zinc-300 text-sm text-center mt-4 leading-5 px-4">{profile.bio}</Text>
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
