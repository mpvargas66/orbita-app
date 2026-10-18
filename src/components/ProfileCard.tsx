import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ProfileSummary } from "@/api/profiles";

const PROFILE_TYPE_LABELS: Record<string, string> = {
  couple_het: "Pareja",
  couple_gay: "Pareja gay",
  couple_lesbian: "Pareja lésbica",
  single_m: "Hombre",
  single_f: "Mujer",
  other: "Otro",
};

const LOOKING_FOR_LABELS: Record<string, string> = {
  intercambio: "Intercambio",
  voyeur: "Voyeurismo",
  exhibicionismo: "Exhibicionismo",
  solo_conocer: "Solo conocer",
  trio: "Trío",
  grupo: "Grupal",
  bdsm: "BDSM",
  viajes: "Viajes",
  otro: "Otro",
};

const PLAN_BADGE: Record<ProfileSummary["membershipType"], { label: string; color: string }> = {
  premium: { label: "Premium", color: "#f59e0b" },
  plus: { label: "Plus", color: "#9333ea" },
  free: { label: "Free", color: "#888888" },
};

const MAX_TAGS = 3;

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "Activo ahora";
  if (mins < 60) return `Activo hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Activo hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Activo hace ${days} d`;
  return `Activo hace ${Math.floor(days / 7)} sem`;
}

function ageLabel(min: number | null, max: number | null): string | null {
  if (min && max && min !== max) return `${min}–${max}`;
  if (min ?? max) return `${min ?? max}`;
  return null;
}

export function ProfileCard({ profile }: { profile: ProfileSummary }) {
  const router = useRouter();
  const plan = PLAN_BADGE[profile.membershipType] ?? PLAN_BADGE.free;
  const age = ageLabel(profile.ageMin, profile.ageMax);
  const location = profile.city ?? profile.region;
  const tags = (profile.lookingFor ?? []).slice(0, MAX_TAGS);

  return (
    <TouchableOpacity
      onPress={() => router.push(`/perfil/${profile.id}`)}
      style={styles.card}
      activeOpacity={0.8}
    >
      <View style={styles.photoWrap}>
        {profile.photoUrl ? (
          <Image source={{ uri: profile.photoUrl }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <Text style={styles.initials}>{profile.alias.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        {profile.isAvailable ? <View style={styles.availableDot} /> : null}
        <View style={[styles.planBadge, { borderColor: plan.color }]}>
          <Text style={[styles.planText, { color: plan.color }]}>{plan.label}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.alias} numberOfLines={1}>
            {profile.alias}
            {age ? <Text style={styles.age}> · {age}</Text> : null}
          </Text>
          {profile.isVerified ? (
            <Ionicons name="checkmark-circle" size={15} color="#9333ea" />
          ) : null}
          {profile.isIdentityVerified ? (
            <Ionicons name="shield-checkmark" size={14} color="#22c55e" />
          ) : null}
        </View>

        <Text style={styles.meta} numberOfLines={1}>
          {PROFILE_TYPE_LABELS[profile.profileType] ?? profile.profileType}
          {location ? ` · ${location}` : ""}
        </Text>

        {/* Hidden when the profile hides its online status. */}
        {profile.lastSeenAt ? (
          <View style={styles.lastSeenRow}>
            <Ionicons name="time-outline" size={11} color="#888888" />
            <Text style={styles.lastSeen}>{timeAgo(profile.lastSeenAt)}</Text>
          </View>
        ) : null}

        {tags.length > 0 ? (
          <View style={styles.tags}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{LOOKING_FOR_LABELS[tag] ?? tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  photoWrap: {
    width: 72,
    height: 72,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#0a0a0a",
  },
  noPhoto: {
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#888888",
    fontSize: 22,
    fontWeight: "600",
  },
  availableDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#141414",
  },
  planBadge: {
    position: "absolute",
    right: -6,
    bottom: -6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: "#0a0a0a",
  },
  planText: {
    fontSize: 9,
    fontWeight: "700",
  },
  info: {
    flex: 1,
    paddingTop: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  alias: {
    flexShrink: 1,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  age: {
    color: "#888888",
    fontWeight: "400",
  },
  meta: {
    color: "#888888",
    fontSize: 12,
    marginTop: 2,
  },
  lastSeenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  lastSeen: {
    color: "#888888",
    fontSize: 11,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 8,
  },
  tag: {
    backgroundColor: "rgba(147, 51, 234, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(147, 51, 234, 0.35)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    color: "#c084fc",
    fontSize: 10,
    fontWeight: "500",
  },
});
