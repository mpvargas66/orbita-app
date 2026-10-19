import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  StyleSheet,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { getNotifications, type AppNotification } from "@/api/notifications";
import { getUpcomingEvents, joinEvent, type AppEvent } from "@/api/events";
import { getRooms, type Room } from "@/api/rooms";
import { getProfiles, type ProfileSummary } from "@/api/profiles";
import { notificationIcon, openNotification, timeAgo } from "@/lib/notifications";

const WEB_EVENTS_URL = "https://www.orbitalife.cl/events";

function formatEventDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default function InicioScreen() {
  const router = useRouter();
  const alias = useAuthStore((s) => s.profile?.alias ?? "");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  async function load() {
    // Each section loads on its own; one failing doesn't hide the others.
    const [notifRes, profilesRes, roomsRes, eventsRes] = await Promise.allSettled([
      getNotifications(),
      getProfiles(),
      getRooms(),
      getUpcomingEvents(4),
    ]);
    if (notifRes.status === "fulfilled") {
      setNotifications(notifRes.value.notifications.slice(0, 6));
      setUnread(notifRes.value.unread);
    }
    if (profilesRes.status === "fulfilled") setProfiles(profilesRes.value.slice(0, 10));
    if (roomsRes.status === "fulfilled") {
      // Most active rooms first.
      setRooms([...roomsRes.value].sort((a, b) => b.activity24h - a.activity24h).slice(0, 6));
    }
    if (eventsRes.status === "fulfilled") setEvents(eventsRes.value);
    setLoading(false);
    setRefreshing(false);
  }

  // Refresh on focus so the unread badge updates after visiting notifications.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function handleJoin(event: AppEvent) {
    // Paid events are joined and paid on the web, never in the app.
    if (event.priceCLP) {
      Linking.openURL(WEB_EVENTS_URL);
      return;
    }
    setJoiningId(event.id);
    try {
      await joinEvent(event.id);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id ? { ...e, isGoing: true, confirmedCount: e.confirmedCount + 1 } : e
        )
      );
    } catch (e: unknown) {
      Alert.alert("No se pudo apuntar", e instanceof Error ? e.message : "Inténtalo de nuevo");
    } finally {
      setJoiningId(null);
    }
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color="#9333ea" />
      </View>
    );
  }

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
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.alias} numberOfLines={1}>{alias}</Text>
        </View>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => router.push("/notificaciones")}
          accessibilityLabel="Notificaciones"
        >
          <Ionicons name="notifications-outline" size={22} color="#ffffff" />
          {unread > 0 ? (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unread > 9 ? "9+" : unread}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {notifications.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Actividad reciente</Text>
            <TouchableOpacity onPress={() => router.push("/notificaciones")}>
              <Text style={styles.seeAll}>Ver todo</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={notifications}
            keyExtractor={(n) => n.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            renderItem={({ item: n }) => {
              const icon = notificationIcon(n.type);
              return (
                <TouchableOpacity
                  style={[styles.notifCard, !n.read && styles.notifCardUnread]}
                  onPress={() => openNotification(router, n)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.notifIcon, { backgroundColor: `${icon.color}22` }]}>
                    <Ionicons name={icon.name} size={18} color={icon.color} />
                  </View>
                  <Text style={styles.notifTitle} numberOfLines={2}>{n.title}</Text>
                  {n.body ? <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text> : null}
                  <Text style={styles.notifTime}>{timeAgo(n.createdAt)}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      ) : null}

      {profiles.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Perfiles para ti</Text>
            <TouchableOpacity onPress={() => router.navigate("/(tabs)")}>
              <Text style={styles.seeAll}>Ver más</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={profiles}
            keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            renderItem={({ item: p }) => (
              <TouchableOpacity
                style={styles.profileCard}
                onPress={() => router.push(`/perfil/${p.id}`)}
                activeOpacity={0.85}
              >
                <View>
                  {p.photoUrl ? (
                    <Image source={{ uri: p.photoUrl }} style={styles.profilePhoto} />
                  ) : (
                    <View style={[styles.profilePhoto, styles.profilePhotoEmpty]}>
                      <Text style={styles.profileInitials}>{p.alias.slice(0, 2).toUpperCase()}</Text>
                    </View>
                  )}
                  {p.isAvailable ? <View style={styles.availableDot} /> : null}
                </View>
                <Text style={styles.profileAlias} numberOfLines={1}>{p.alias}</Text>
                {(p.city ?? p.region) ? (
                  <Text style={styles.profileMeta} numberOfLines={1}>{p.city ?? p.region}</Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      {rooms.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Salas activas</Text>
            <TouchableOpacity onPress={() => router.navigate("/(tabs)/salas")}>
              <Text style={styles.seeAll}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={rooms}
            keyExtractor={(r) => r.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            renderItem={({ item: r }) => (
              <TouchableOpacity
                style={styles.roomCard}
                onPress={() =>
                  router.push({
                    pathname: "/sala/[id]",
                    params: { id: r.id, name: r.name, icon: r.icon ?? "💬", premiumOnly: r.premiumOnly ? "1" : "0" },
                  })
                }
                activeOpacity={0.85}
              >
                <Text style={styles.roomIcon}>{r.icon ?? "💬"}</Text>
                <Text style={styles.roomName} numberOfLines={2}>{r.name}</Text>
                {r.activeUsers > 0 ? (
                  <View style={styles.roomActive}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>{r.activeUsers} activos</Text>
                  </View>
                ) : null}
                {r.lastMessageContent ? (
                  <Text style={styles.roomPreview} numberOfLines={1}>{r.lastMessageContent}</Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      {events.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Próximos eventos</Text>
            <TouchableOpacity onPress={() => Linking.openURL(WEB_EVENTS_URL)}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          {events.map((ev) => (
            <View key={ev.id} style={styles.eventCard}>
              {ev.coverImageUrl ? (
                <Image source={{ uri: ev.coverImageUrl }} style={styles.eventImage} />
              ) : (
                <View style={[styles.eventImage, styles.eventImageEmpty]}>
                  <Ionicons name="calendar-outline" size={32} color="#888888" />
                </View>
              )}
              <View style={styles.eventBody}>
                <View style={styles.eventTop}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{ev.title}</Text>
                  <View style={[styles.priceBadge, !ev.priceCLP && styles.freeBadge]}>
                    <Text style={[styles.priceText, !ev.priceCLP && styles.freeText]}>
                      {ev.priceCLP ? `$${ev.priceCLP.toLocaleString("es-CL")}` : "Gratis"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.eventMeta} numberOfLines={1}>
                  {ev.locationCity} · {formatEventDate(ev.dateStart)}
                </Text>
                <View style={styles.eventBottom}>
                  <Text style={styles.eventAttendees}>
                    {ev.confirmedCount} {ev.confirmedCount === 1 ? "confirmado" : "confirmados"}
                  </Text>
                  {ev.isGoing ? (
                    <View style={styles.goingBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                      <Text style={styles.goingText}>Apuntado</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.joinButton,
                        !!ev.priceCLP && styles.joinButtonPaid,
                        joiningId === ev.id && styles.disabled,
                      ]}
                      onPress={() => handleJoin(ev)}
                      disabled={joiningId === ev.id}
                    >
                      {joiningId === ev.id ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.joinText}>{ev.priceCLP ? "Ver en la web" : "Apuntarse"}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    color: "#888888",
    fontSize: 14,
  },
  alias: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: "#9333ea",
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  section: {
    marginTop: 24,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  seeAll: {
    color: "#9333ea",
    fontSize: 13,
    fontWeight: "600",
  },
  hList: {
    gap: 10,
    paddingHorizontal: 16,
  },
  notifCard: {
    width: 170,
    gap: 6,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 14,
    padding: 12,
  },
  notifCardUnread: {
    borderColor: "rgba(147, 51, 234, 0.5)",
  },
  notifIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  notifTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  notifBody: {
    color: "#888888",
    fontSize: 12,
    lineHeight: 16,
  },
  notifTime: {
    color: "#888888",
    fontSize: 11,
  },
  profileCard: {
    width: 88,
    alignItems: "center",
    gap: 6,
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#141414",
  },
  profilePhotoEmpty: {
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitials: {
    color: "#888888",
    fontSize: 22,
    fontWeight: "600",
  },
  availableDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#0a0a0a",
  },
  profileAlias: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  profileMeta: {
    color: "#888888",
    fontSize: 11,
    textAlign: "center",
  },
  roomCard: {
    width: 140,
    gap: 6,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 14,
    padding: 12,
  },
  roomIcon: {
    fontSize: 24,
  },
  roomName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  roomActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  activeText: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "600",
  },
  roomPreview: {
    color: "#888888",
    fontSize: 12,
  },
  eventCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 16,
    overflow: "hidden",
  },
  eventImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#0a0a0a",
  },
  eventImageEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  eventBody: {
    gap: 6,
    padding: 14,
  },
  eventTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventTitle: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  priceBadge: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  freeBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  priceText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  freeText: {
    color: "#22c55e",
  },
  eventMeta: {
    color: "#888888",
    fontSize: 12,
  },
  eventBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  eventAttendees: {
    color: "#888888",
    fontSize: 12,
  },
  joinButton: {
    minWidth: 96,
    alignItems: "center",
    backgroundColor: "#9333ea",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  joinButtonPaid: {
    backgroundColor: "#2a2a2a",
  },
  joinText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
  goingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  goingText: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "600",
  },
});
