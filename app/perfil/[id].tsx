import { useEffect, useMemo, useRef, useState } from "react";
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
  Animated,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import {
  getProfile,
  getReactions,
  sendFriendRequest,
  sendMessageRequest,
  toggleReaction,
  type ProfileDetail,
  type ReactionState,
} from "@/api/profiles";
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

// Same labels as the web profile page.
const EXPERIENCE_LABELS: Record<string, string> = {
  curious: "🌱 Curioso",
  exploring: "🔥 Explorando",
  active: "⚡ Activo",
  veteran: "👑 Veterano",
};

const MAX_REQUEST_LENGTH = 500;
const WEB_PROFILE_URL = "https://www.orbitalife.cl/profile";

function formatAge(min: number | null, max: number | null) {
  if (min && max && min !== max) return `${min}–${max} años`;
  if (min ?? max) return `${min ?? max} años`;
  return null;
}

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

// Profile fields are free text; format them like the web does.
function cap(value: string | null | undefined) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : null;
}

function yesNo(value: string | null | undefined) {
  if (!value) return null;
  if (value === "si") return "Sí";
  if (value === "no") return "No";
  if (value === "socialmente") return "Socialmente";
  return cap(value);
}

function friendlyError(e: unknown, fallback: string) {
  if (e instanceof ApiError && e.message === "VERIFICATION_REQUIRED")
    return "Debes verificar tu identidad en orbitalife.cl para hacer esto.";
  return e instanceof Error ? e.message : fallback;
}

type DetailRow = { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string };

function buildDetails(p: ProfileDetail): DetailRow[] {
  const isCouple = p.profileType.startsWith("couple");
  const label1 = p.profileType === "couple_het" ? "♂" : "Int. 1";
  const label2 = p.profileType === "couple_het" ? "♀" : "Int. 2";

  // Couples show "♂ x · ♀ y"; singles show the first value only.
  const pair = (a: string | null, b: string | null) =>
    isCouple
      ? [a && `${label1} ${a}`, b && `${label2} ${b}`].filter(Boolean).join(" · ") || null
      : a;

  const rows: DetailRow[] = [];
  const add = (icon: DetailRow["icon"], label: string, value: string | null) => {
    if (value) rows.push({ icon, label, value });
  };

  add("resize-outline", "Altura", pair(p.height1, p.height2));
  add("body-outline", "Contextura", pair(cap(p.bodyType1), cap(p.bodyType2)));
  add("cut-outline", "Vello corporal", pair(cap(p.bodyHair1), cap(p.bodyHair2)));
  add(
    "heart-circle-outline",
    "Orientación",
    isCouple ? pair(cap(p.sexuality1), cap(p.sexuality2)) : cap(p.sexuality)
  );
  add(
    "star-outline",
    "Experiencia",
    p.experienceLevel ? EXPERIENCE_LABELS[p.experienceLevel] ?? cap(p.experienceLevel) : null
  );
  add("flame-outline", "Fuma", isCouple ? pair(yesNo(p.smokes1), yesNo(p.smokes2)) : yesNo(p.smokes));
  add("wine-outline", "Bebe alcohol", isCouple ? pair(yesNo(p.drinks1), yesNo(p.drinks2)) : yesNo(p.drinks));
  add("language-outline", "Idiomas", p.languages);
  return rows;
}

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const [reactions, setReactions] = useState<ReactionState | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [sendingFriend, setSendingFriend] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // Set when a friend request turns into a match, so the chat opens directly.
  const [matchConversationId, setMatchConversationId] = useState<string | null>(null);

  const likeScale = useRef(new Animated.Value(1)).current;
  const hotScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setLoading(true);
    getProfile(id)
      .then((data) => {
        setProfile(data);
        setError("");
        if (!data.isOwnerViewer) getReactions(data.id).then(setReactions).catch(() => {});
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
  const details = useMemo(() => (profile ? buildDetails(profile) : []), [profile]);

  function bounce(value: Animated.Value) {
    Animated.sequence([
      Animated.timing(value, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.spring(value, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }

  async function handleReaction(type: "like" | "hot") {
    if (!profile || !reactions) return;
    const key = type === "like" ? "myLike" : "myHot";
    const countKey = type === "like" ? "likes" : "hots";
    const previous = reactions;
    const next = !reactions[key];
    // Optimistic update, then reconcile with the server's counts.
    setReactions({
      ...reactions,
      [key]: next,
      [countKey]: Math.max(0, reactions[countKey] + (next ? 1 : -1)),
    });
    bounce(type === "like" ? likeScale : hotScale);
    try {
      const res = await toggleReaction(profile.id, type);
      setReactions((r) =>
        r ? { ...r, [key]: res.active, likes: res.counts.likes, hots: res.counts.hots } : r
      );
    } catch (e: unknown) {
      setReactions(previous);
      Alert.alert("Error", friendlyError(e, "No se pudo guardar tu reacción"));
    }
  }

  async function handleFriendRequest() {
    if (!profile || sendingFriend) return;
    setSendingFriend(true);
    try {
      const res = await sendFriendRequest(profile.id);
      if (res.status === "mutual") {
        setProfile({ ...profile, likeStatus: "mutual", isMutualMatch: true });
        if (res.conversationId) setMatchConversationId(res.conversationId);
        Alert.alert("¡Es un match!", `Tú y ${profile.alias} ya pueden enviarse mensajes.`);
      } else {
        setProfile({ ...profile, likeStatus: "sent" });
      }
    } catch (e: unknown) {
      Alert.alert("No se pudo enviar", friendlyError(e, "Inténtalo de nuevo"));
    } finally {
      setSendingFriend(false);
    }
  }

  async function handleOpenChat() {
    if (!profile) return;
    setOpeningChat(true);
    try {
      let conversationId = matchConversationId;
      if (!conversationId) {
        const conversations = await getConversations();
        conversationId = conversations.find((c) => c.other?.profileId === profile.id)?.id ?? null;
      }
      if (!conversationId) {
        Alert.alert("Mensajes", "La conversación aún no está disponible. Inténtalo en unos minutos.");
        return;
      }
      router.push({
        pathname: "/chat/[id]",
        params: { id: conversationId, alias: profile.alias, profileId: profile.id },
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
      Alert.alert("No se pudo enviar", friendlyError(e, "Inténtalo de nuevo"));
    } finally {
      setSendingRequest(false);
    }
  }

  function renderReactions() {
    if (!reactions) return null;
    return (
      <View style={styles.reactionRow}>
        <TouchableOpacity style={styles.reactionButton} onPress={() => handleReaction("like")} activeOpacity={0.8}>
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Ionicons
              name={reactions.myLike ? "heart" : "heart-outline"}
              size={26}
              color={reactions.myLike ? "#f43f5e" : "#888888"}
            />
          </Animated.View>
          <Text style={[styles.reactionLabel, reactions.myLike && styles.reactionLike]}>
            Me gusta{reactions.likes > 0 ? ` · ${reactions.likes}` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reactionButton} onPress={() => handleReaction("hot")} activeOpacity={0.8}>
          <Animated.View style={{ transform: [{ scale: hotScale }] }}>
            <Ionicons
              name={reactions.myHot ? "flame" : "flame-outline"}
              size={26}
              color={reactions.myHot ? "#f97316" : "#888888"}
            />
          </Animated.View>
          <Text style={[styles.reactionLabel, reactions.myHot && styles.reactionHot]}>
            Enciende{reactions.hots > 0 ? ` · ${reactions.hots}` : ""}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderConnection(p: ProfileDetail) {
    if (p.isMutualMatch || p.likeStatus === "mutual" || p.requestStatus === "accepted") {
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
          <View style={styles.twoButtons}>
            <TouchableOpacity
              style={[styles.secondaryButton, styles.flex]}
              onPress={() => setComposerOpen(false)}
              disabled={sendingRequest}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                styles.flex,
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

    const friendSent = p.likeStatus === "sent";
    return (
      <View style={styles.twoButtons}>
        <TouchableOpacity
          style={[styles.outlineButton, styles.flex, (friendSent || sendingFriend) && styles.buttonDisabled]}
          onPress={handleFriendRequest}
          disabled={friendSent || sendingFriend}
        >
          {sendingFriend ? (
            <ActivityIndicator color="#9333ea" size="small" />
          ) : (
            <>
              <Ionicons name={friendSent ? "checkmark" : "person-add-outline"} size={17} color="#9333ea" />
              <Text style={styles.outlineButtonText}>
                {friendSent ? "Solicitud enviada" : "Solicitar amistad"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {p.requestStatus === "pending" ? (
          <View style={[styles.secondaryButton, styles.flex, styles.buttonDisabled]}>
            <Ionicons name="time-outline" size={17} color="#888888" />
            <Text style={styles.secondaryButtonText}>Mensaje enviado</Text>
          </View>
        ) : p.requestStatus === "rejected_cooldown" ? (
          <View style={[styles.secondaryButton, styles.flex, styles.buttonDisabled]}>
            <Text style={styles.secondaryButtonText}>
              En {p.cooldownDays} {p.cooldownDays === 1 ? "día" : "días"}
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={[styles.primaryButton, styles.flex]} onPress={() => setComposerOpen(true)}>
            <Ionicons name="paper-plane" size={17} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Contactar</Text>
          </TouchableOpacity>
        )}
      </View>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
              {safePhotos.map((photo) => (
                <TouchableOpacity key={photo.id} onPress={() => setSelectedPhotoId(photo.id)} activeOpacity={0.8}>
                  <Image
                    source={{ uri: photo.thumbnailUrl ?? photo.cloudinaryUrl }}
                    style={[styles.thumb, photo.id === heroPhoto?.id && styles.thumbSelected]}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.body}>
            <View style={styles.nameRow}>
              <Text style={styles.alias} numberOfLines={1}>{profile.alias}</Text>
              {profile.isVerified ? <Ionicons name="checkmark-circle" size={22} color="#9333ea" /> : null}
              {profile.isIdentityVerified ? (
                <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
              ) : null}
            </View>
            {meta ? <Text style={styles.meta}>{meta}</Text> : null}
            {/* Hidden when the profile hides its online status. */}
            {profile.lastSeenAt ? (
              <View style={styles.lastSeenRow}>
                <Ionicons name="time-outline" size={12} color="#888888" />
                <Text style={styles.lastSeen}>{timeAgo(profile.lastSeenAt)}</Text>
              </View>
            ) : null}

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

            {profile.isOwnerViewer ? null : (
              <View style={styles.actions}>
                {renderReactions()}
                {renderConnection(profile)}
              </View>
            )}

            {profile.bio ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sobre nosotros</Text>
                <View style={styles.card}>
                  <Text style={styles.bio}>{profile.bio}</Text>
                </View>
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

            {details.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Detalles</Text>
                <View style={styles.detailsCard}>
                  {details.map((row, i) => (
                    <View key={row.label} style={[styles.detailRow, i > 0 && styles.detailRowBorder]}>
                      <Ionicons name={row.icon} size={16} color="#888888" />
                      <Text style={styles.detailLabel}>{row.label}</Text>
                      <Text style={styles.detailValue}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.webLink}
              onPress={() => Linking.openURL(`${WEB_PROFILE_URL}/${profile.id}`)}
            >
              <Text style={styles.webLinkText}>Ver perfil completo en orbitalife.cl</Text>
              <Ionicons name="open-outline" size={18} color="#9333ea" />
            </TouchableOpacity>
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
    gap: 6,
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
  lastSeenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  lastSeen: {
    color: "#888888",
    fontSize: 12,
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
  actions: {
    marginTop: 24,
    gap: 12,
  },
  reactionRow: {
    flexDirection: "row",
    gap: 12,
  },
  reactionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 14,
    paddingVertical: 12,
  },
  reactionLabel: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "600",
  },
  reactionLike: {
    color: "#f43f5e",
  },
  reactionHot: {
    color: "#f97316",
  },
  twoButtons: {
    flexDirection: "row",
    gap: 10,
  },
  flex: {
    flex: 1,
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
    fontSize: 15,
    fontWeight: "600",
  },
  outlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#9333ea",
    borderRadius: 12,
    paddingVertical: 13,
  },
  outlineButtonText: {
    color: "#9333ea",
    fontSize: 15,
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
    fontSize: 14,
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
    gap: 8,
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
  detailsCard: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  detailRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
  },
  detailLabel: {
    color: "#888888",
    fontSize: 13,
    width: 104,
  },
  detailValue: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
    textAlign: "right",
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
    marginTop: 28,
  },
  webLinkText: {
    color: "#9333ea",
    fontSize: 15,
    fontWeight: "600",
  },
});
