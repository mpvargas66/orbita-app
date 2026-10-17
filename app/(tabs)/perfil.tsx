import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar } from "@/components/Avatar";

const PROFILE_TYPE_LABELS: Record<string, string> = {
  couple_het: "Pareja heterosexual",
  couple_gay: "Pareja gay",
  couple_lesbian: "Pareja lésbica",
  single_m: "Hombre soltero",
  single_f: "Mujer soltera",
  other: "Otro",
};

export default function PerfilScreen() {
  const { profile, clearAuth } = useAuthStore();

  if (!profile) return null;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="items-center pt-16 pb-6 px-6">
        <Avatar photoUrl={profile.photoUrl} alias={profile.alias} size={88} />
        <Text className="text-white text-xl font-bold mt-3">{profile.alias}</Text>
        <Text className="text-zinc-400 text-sm mt-1">
          {PROFILE_TYPE_LABELS[profile.profileType] ?? profile.profileType}
        </Text>
        {profile.city ? (
          <Text className="text-zinc-500 text-xs mt-1">📍 {profile.city}</Text>
        ) : null}
        {profile.bio ? (
          <Text className="text-zinc-300 text-sm text-center mt-4 leading-5">{profile.bio}</Text>
        ) : null}
      </View>

      <View className="px-6">
        <TouchableOpacity
          onPress={clearAuth}
          className="border border-red-500/30 bg-red-500/10 rounded-xl py-3.5 items-center"
        >
          <Text className="text-red-400 font-medium">Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
