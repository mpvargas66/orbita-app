import { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar } from "@/components/Avatar";
import { getMyProfile, type MyProfileResponse } from "@/api/profiles";

const PROFILE_TYPE_LABELS: Record<string, string> = {
  couple_het: "Pareja heterosexual",
  couple_gay: "Pareja gay",
  couple_lesbian: "Pareja lésbica",
  single_m: "Hombre soltero",
  single_f: "Mujer soltera",
  other: "Otro",
};

const EDIT_PROFILE_URL = "https://www.orbitalife.cl/profile/edit";

type Membership = "free" | "plus" | "premium";

const MEMBERSHIP_LABELS: Record<Membership, string> = {
  free: "Free",
  plus: "Plus",
  premium: "Premium",
};

interface DisplayProfile {
  alias: string;
  profileType: string | null;
  location: string | null;
  bio: string | null;
  membership: Membership;
  isVerified: boolean | null;
  photoUrl: string | null;
  photoCount: number | null;
}

function toMembership(value: string | null | undefined): Membership {
  return value === "plus" || value === "premium" ? value : "free";
}

function fromApi(data: MyProfileResponse): DisplayProfile | null {
  const p = data.profile;
  if (!p) return null;
  // Never show explicit media in the app, even the owner's own.
  const safePhotos = data.photos.filter((ph) => !ph.isExplicit && ph.mediaType === "photo");
  const avatar = safePhotos.find((ph) => ph.isProfilePhoto) ?? safePhotos[0] ?? null;
  return {
    alias: p.alias,
    profileType: p.profileType,
    location: [p.city, p.region].filter(Boolean).join(", ") || null,
    bio: p.bio,
    membership: toMembership(p.membershipType),
    isVerified: p.isVerified,
    photoUrl: avatar?.cloudinaryUrl ?? null,
    photoCount: data.photos.filter((ph) => ph.mediaType === "photo").length,
  };
}

export default function PerfilScreen() {
  const router = useRouter();
  const { profile: storedProfile, clearAuth } = useAuthStore();
  const [remote, setRemote] = useState<DisplayProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  async function load() {
    try {
      const data = await getMyProfile();
      const mapped = fromApi(data);
      setRemote(mapped);
      setUsingFallback(!mapped);
    } catch {
      setUsingFallback(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Refresh whenever the tab gains focus, e.g. after editing the profile on the web.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  function confirmLogout() {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: clearAuth },
    ]);
  }

  const fallback: DisplayProfile | null = storedProfile
    ? {
        alias: storedProfile.alias,
        profileType: storedProfile.profileType,
        location: storedProfile.city ?? null,
        bio: storedProfile.bio ?? null,
        membership: toMembership(storedProfile.membershipType),
        isVerified: null,
        photoUrl: storedProfile.photoUrl ?? null,
        photoCount: null,
      }
    : null;

  const profile = remote ?? fallback;

  if (loading && !profile) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color="#9333ea" />
      </View>
    );
  }

  if (!profile) return null;

  const membershipStyle =
    profile.membership === "premium"
      ? styles.badgePremium
      : profile.membership === "plus"
        ? styles.badgePlus
        : styles.badgeFree;
  const membershipTextStyle =
    profile.membership === "free" ? styles.badgeTextFree : styles.badgeTextPaid;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor="#9333ea"
        />
      }
    >
      <View style={styles.header}>
        <Avatar photoUrl={profile.photoUrl} alias={profile.alias} size={96} />

        <View style={styles.nameRow}>
          <Text style={styles.alias} numberOfLines={1}>{profile.alias}</Text>
          {profile.isVerified ? (
            <Ionicons name="checkmark-circle" size={20} color="#9333ea" />
          ) : null}
        </View>

        {profile.profileType ? (
          <Text style={styles.type}>
            {PROFILE_TYPE_LABELS[profile.profileType] ?? profile.profileType}
          </Text>
        ) : null}
        {profile.location ? (
          <Text style={styles.location}>📍 {profile.location}</Text>
        ) : null}

        <View style={[styles.badge, membershipStyle]}>
          {profile.membership === "premium" ? (
            <Ionicons name="star" size={12} color="#ffffff" />
          ) : null}
          <Text style={[styles.badgeText, membershipTextStyle]}>
            {MEMBERSHIP_LABELS[profile.membership]}
          </Text>
        </View>

        {usingFallback ? (
          <Text style={styles.fallbackNote}>Mostrando datos guardados</Text>
        ) : null}
      </View>

      <View style={styles.body}>
        {profile.photoCount !== null ? (
          <View style={styles.statCard}>
            <Ionicons name="images-outline" size={20} color="#9333ea" />
            <Text style={styles.statValue}>{profile.photoCount}</Text>
            <Text style={styles.statLabel}>
              {profile.photoCount === 1 ? "foto subida" : "fotos subidas"}
            </Text>
          </View>
        ) : null}

        {profile.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bio</Text>
            <View style={styles.card}>
              <Text style={styles.bio}>{profile.bio}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => Linking.openURL(EDIT_PROFILE_URL)}
          >
            <Text style={styles.editButtonText}>Editar perfil en orbitalife.cl</Text>
            <Ionicons name="open-outline" size={18} color="#9333ea" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuRow} onPress={() => router.push("/bloqueados")}>
            <Ionicons name="ban-outline" size={18} color="#888888" />
            <Text style={styles.menuRowText}>Usuarios bloqueados</Text>
            <Ionicons name="chevron-forward" size={18} color="#888888" />
          </TouchableOpacity>

          <TouchableOpacity onPress={confirmLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  content: {
    paddingBottom: 48,
  },
  header: {
    alignItems: "center",
    paddingTop: 72,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  alias: {
    flexShrink: 1,
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
  },
  type: {
    color: "#888888",
    fontSize: 14,
    marginTop: 4,
  },
  location: {
    color: "#888888",
    fontSize: 13,
    marginTop: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 12,
  },
  badgeFree: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  badgePlus: {
    backgroundColor: "rgba(147, 51, 234, 0.15)",
    borderWidth: 1,
    borderColor: "#9333ea",
  },
  badgePremium: {
    backgroundColor: "#9333ea",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  badgeTextFree: {
    color: "#888888",
  },
  badgeTextPaid: {
    color: "#ffffff",
  },
  fallbackNote: {
    color: "#888888",
    fontSize: 11,
    marginTop: 10,
  },
  body: {
    paddingHorizontal: 20,
  },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    color: "#888888",
    fontSize: 14,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 16,
    padding: 16,
  },
  bio: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    marginTop: 32,
    gap: 12,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#9333ea",
    borderRadius: 12,
    paddingVertical: 13,
  },
  editButtonText: {
    color: "#9333ea",
    fontSize: 15,
    fontWeight: "600",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuRowText: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: {
    color: "#f87171",
    fontSize: 15,
    fontWeight: "500",
  },
});
