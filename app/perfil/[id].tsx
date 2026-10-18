import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { getProfile, sendMessageRequest, type ProfileDetail } from "@/api/profiles";
import { getConversations } from "@/api/messages";
import { ApiError } from "@/api/client";
import { ReportSheet, showModerationMenu, confirmBlock } from "@/components/Moderation";

const PROFILE_TYPE_LABELS: Record<string, string> = {
  couple_het: "Pareja heterosexual",
  couple_gay: "Pareja gay",
  couple_lesbian: "Pareja lésbica",
  single_m: "Hombre soltero",
  single_f: "Mujer soltera",
  other: "Otro",
};

const LOOKING_FOR_LABELS: Record<string, string> = {
  intercambio: "Intercambio",
  voyeur: "Voyeurismo",
  exhibicionismo: "Exhibicionismo",
  solo_conocer: "Solo conocer",
  trio: "Trío",
  grupo: "Encuentros grupales",
  bdsm: "BDSM / Fetiche",
  viajes: "Viajes y eventos",
  otro: "Otro",
};

const MAX_REQUEST_LENGTH = 500;
const WEB_PROFILE_URL = "https://www.orbitalife.cl/profile";

function formatAge(min: number | null, max: number | null) {
  if (min && max && min !== max) return `${min}–${max} años`;
  if (min ?? max) return `${min ?? max} años`;
  return null;
}

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    getProfile(id)
      .then((data) => {
        setProfile(data);
        setError("");
      })
      .catch((e: unknown) => {
        setProfile(null);
        // 404 also covers hidden and blocked profiles.
        if (e instanceof ApiError && e.status === 404) setError("Este perfil no está disponible");
        else setError(e instanceof Error ? e.message : "No se pudo cargar el perfil");
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Only non-explicit still photos are shown in the app.
  const safePhotos = useMemo(
    () => (profile?.photos ?? []).filter((p) => !p.isExplicit && p.mediaType === "photo"),
    [profile]
  );
  const profilePhoto = safePhotos.find((p) => p.isProfilePhoto) ?? safePhotos[0] ?? null;
  const heroPhoto = safePhotos.find((p) => p.id === selectedPhotoId) ?? profilePhoto;

  async function handleOpenChat() {
    if (!profile) return;
    setOpeningChat(true);
    try {
      const conversations = await getConversations();
      const conversation = conversations.find((c) => c.other?.profileId === profile.id);
      if (!conversation) {
        Alert.alert("Mensajes", "La conversación aún no está disponible. Inténtalo en unos minutos.");
        return;
      }
      router.push({
        pathname: "/chat/[id]",
        params: { id: conversation.id, alias: profile.alias, profileId: profile.id },
      });
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo abrir el chat");
    } finally {
      setOpeningChat(false);
    }
  }

  async function handleSendRequest() {
    if (!profile) return;
    const message = requestText.trim();
    if (!message || sendingRequest) return;
    setSendingRequest(true);
    try {
      await sendMessageRequest(profile.id, message);
      setProfile({ ...profile, requestStatus: "pending" });
      setComposerOpen(false);
      setRequestText("");
    } catch (e: unknown) {
      Alert.alert("No se pudo enviar", e instanceof Error ? e.message : "Inténtalo de nuevo");
    } finally {
      setSendingRequest(false);
    }
  }

  function renderActions(p: ProfileDetail) {
    if (p.isOwnerViewer) return null;

    if (p.isMutualMatch || p.requestStatus === "accepted") {
      return (
        <TouchableOpacity
          style={[styles.primaryButton, openingChat && styles.buttonDisabled]}
          onPress={handleOpenChat}
          disabled={openingChat}
        >
          {openingChat ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="chatbubble" size={18} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Enviar mensaje</Text>
            </>
          )}
        </TouchableOpacity>
      );
    }

    if (p.requestStatus === "pending") {
      return (
        <View style={[styles.secondaryButton, styles.buttonDisabled]}>
          <Ionicons name="time-outline" size={18} color="#888888" />
          <Text style={styles.secondaryButtonText}>Solicitud enviada</Text>
        </View>
      );
    }

    if (p.requestStatus === "rejected_cooldown") {
      return (
        <View style={[styles.secondaryButton, styles.buttonDisabled]}>
          <Text style={styles.secondaryButtonText}>
            Podrás volver a solicitar en {p.cooldownDays} {p.cooldownDays === 1 ? "día" : "días"}
          </Text>
        </View>
      );
    }

    if (composerOpen) {
      return (
        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            placeholder={`Escribe un mensaje para ${p.alias}...`}
            placeholderTextColor="#888888"
            value={requestText}
            onChangeText={setRequestText}
            maxLength={MAX_REQUEST_LENGTH}
            multiline
            autoFocus
          />
          <Text style={styles.composerCounter}>
            {requestText.length}/{MAX_REQUEST_LENGTH}
          </Text>
          <View style={styles.composerActions}>
            <TouchableOpacity
              style={[styles.secondaryButton, styles.composerButton]}
              onPress={() => setComposerOpen(false)}
              disabled={sendingRequest}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                styles.composerButton,
                (!requestText.trim() || sendingRequest) && styles.buttonDisabled,
              ]}
              onPress={handleSendRequest}
              disabled={!requestText.trim() || sendingRequest}
            >
              {sendingRequest ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Enviar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity style={styles.primaryButton} onPress={() => setComposerOpen(true)}>
        <Ionicons name="paper-plane" size={18} color="#ffffff" />
        <Text style={styles.primaryButtonText}>Solicitar contacto</Text>
      </TouchableOpacity>
    );
  }

  const age = profile ? formatAge(profile.ageMin, profile.ageMax) : null;
  const meta = profile
    ? [PROFILE_TYPE_LABELS[profile.profileType] ?? profile.profileType, age, profile.region]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={20} color="#ffffff" />
      </TouchableOpacity>

      {profile && !profile.isOwnerViewer ? (
        <>
          <TouchableOpacity
            onPress={() =>
              showModerationMenu(
                profile.alias,
                () => setReportOpen(true),
                () => confirmBlock(profile.id, profile.alias, () => router.back())
              )
            }
            style={styles.menuButton}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#ffffff" />
          </TouchableOpacity>
          <ReportSheet
            visible={reportOpen}
            profileId={profile.id}
            alias={profile.alias}
            onClose={() => setReportOpen(false)}
          />
        </>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#9333ea" />
        </View>
      ) : !profile ? (
        <View style={styles.centered}>
          <Text style={styles.notFound}>{error || "Perfil no encontrado"}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {heroPhoto ? (
            <Image source={{ uri: heroPhoto.cloudinaryUrl }} style={styles.hero} resizeMode="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Avatar alias={profile.alias} size={112} />
            </View>
          )}

          {safePhotos.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gallery}
            >
              {safePhotos.map((photo) => {
                const selected = photo.id === heroPhoto?.id;
                return (
                  <TouchableOpacity
                    key={photo.id}
                    onPress={() => setSelectedPhotoId(photo.id)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: photo.thumbnailUrl ?? photo.cloudinaryUrl }}
                      style={[styles.thumb, selected && styles.thumbSelected]}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={styles.body}>
            <View style={styles.nameRow}>
              <Text style={styles.alias} numberOfLines={1}>{profile.alias}</Text>
              {profile.isVerified ? (
                <Ionicons name="checkmark-circle" size={22} color="#9333ea" />
              ) : null}
            </View>
            {meta ? <Text style={styles.meta}>{meta}</Text> : null}

            {profile.isAvailable || profile.isTraveling ? (
              <View style={styles.statusRow}>
                {profile.isAvailable ? (
                  <View style={styles.statusChip}>
                    <View style={styles.availableDot} />
                    <Text style={styles.statusText}>Disponible ahora</Text>
                  </View>
                ) : null}
                {profile.isTraveling ? (
                  <View style={styles.statusChip}>
                    <Ionicons name="airplane" size={14} color="#9333ea" />
                    <Text style={styles.statusText}>
                      De viaje{profile.travelCurrentCity ? ` en ${profile.travelCurrentCity}` : ""}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {profile.lookingFor && profile.lookingFor.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Busca</Text>
                <View style={styles.chips}>
                  {profile.lookingFor.map((item) => (
                    <View key={item} style={styles.chip}>
                      <Text style={styles.chipText}>{LOOKING_FOR_LABELS[item] ?? item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {profile.bio ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sobre nosotros</Text>
                <View style={styles.card}>
                  <Text style={styles.bio}>{profile.bio}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.actions}>
              {renderActions(profile)}
              <TouchableOpacity
                style={styles.webLink}
                onPress={() => Linking.openURL(`${WEB_PROFILE_URL}/${profile.id}`)}
              >
                <Text style={styles.webLinkText}>Ver perfil completo en orbitalife.cl</Text>
                <Ionicons name="open-outline" size={18} color="#9333ea" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  backButton: {
    position: "absolute",
    top: 56,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuButton: {
    position: "absolute",
    top: 56,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  notFound: {
    color: "#888888",
    textAlign: "center",
  },
  content: {
    paddingBottom: 48,
  },
  hero: {
    width: "100%",
    aspectRatio: 4 / 5,
    backgroundColor: "#141414",
  },
  heroPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 112,
    paddingBottom: 24,
  },
  gallery: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#141414",
    borderWidth: 2,
    borderColor: "#2a2a2a",
  },
  thumbSelected: {
    borderColor: "#9333ea",
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alias: {
    flexShrink: 1,
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "700",
  },
  meta: {
    color: "#888888",
    fontSize: 14,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  availableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  statusText: {
    color: "#ffffff",
    fontSize: 13,
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
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "rgba(147, 51, 234, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(147, 51, 234, 0.4)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    color: "#ffffff",
    fontSize: 13,
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
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#9333ea",
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: "#888888",
    fontSize: 15,
    fontWeight: "500",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  composer: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 16,
    padding: 12,
  },
  composerInput: {
    minHeight: 96,
    maxHeight: 180,
    color: "#ffffff",
    fontSize: 15,
    textAlignVertical: "top",
  },
  composerCounter: {
    color: "#888888",
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
  },
  composerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  composerButton: {
    flex: 1,
  },
  webLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#9333ea",
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 12,
  },
  webLinkText: {
    color: "#9333ea",
    fontSize: 15,
    fontWeight: "600",
  },
});
