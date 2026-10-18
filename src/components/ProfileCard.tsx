import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
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
      style={styles.card}
      activeOpacity={0.75}
    >
      <Avatar photoUrl={profile.photoUrl} alias={profile.alias} size={52} />
      <View style={styles.info}>
        <Text style={styles.alias}>{profile.alias}</Text>
        <Text style={styles.meta}>
          {PROFILE_TYPE_LABELS[profile.profileType] ?? profile.profileType}
          {profile.city ? ` · ${profile.city}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  info: {
    flex: 1,
  },
  alias: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  meta: {
    color: "#888888",
    fontSize: 12,
    marginTop: 2,
  },
});
