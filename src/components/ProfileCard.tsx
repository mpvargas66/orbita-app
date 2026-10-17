import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Avatar } from "./Avatar";

interface ProfileCardProps {
  profile: {
    id: string;
    alias: string;
    profileType: string;
    city?: string;
    photoUrl?: string;
  };
}

const PROFILE_TYPE_LABELS: Record<string, string> = {
  couple_het: "Pareja",
  couple_gay: "Pareja gay",
  couple_lesbian: "Pareja lésbica",
  single_m: "Hombre",
  single_f: "Mujer",
  other: "Otro",
};

export function ProfileCard({ profile }: ProfileCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push(`/perfil/${profile.id}`)}
      className="flex-row items-center gap-3 bg-card border border-[#2a2a2a] rounded-2xl px-4 py-3 mb-3"
      activeOpacity={0.75}
    >
      <Avatar photoUrl={profile.photoUrl} alias={profile.alias} size={52} />
      <View className="flex-1">
        <Text className="text-white font-semibold text-base">{profile.alias}</Text>
        <Text className="text-zinc-400 text-xs mt-0.5">
          {PROFILE_TYPE_LABELS[profile.profileType] ?? profile.profileType}
          {profile.city ? ` · ${profile.city}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
