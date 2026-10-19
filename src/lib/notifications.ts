import { Linking } from "react-native";
import type { useRouter } from "expo-router";
import type { Ionicons } from "@expo/vector-icons";
import type { AppNotification } from "@/api/notifications";

const WEB_BASE = "https://www.orbitalife.cl";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type Router = ReturnType<typeof useRouter>;

const ICONS: Record<string, { name: IconName; color: string }> = {
  match: { name: "people", color: "#9333ea" },
  message: { name: "chatbubble", color: "#3b82f6" },
  profile_view: { name: "eye", color: "#22c55e" },
  like: { name: "heart", color: "#f43f5e" },
  post_comment: { name: "chatbox-ellipses", color: "#f43f5e" },
  new_event: { name: "calendar", color: "#f97316" },
};

export function notificationIcon(type: string | null) {
  return ICONS[type ?? ""] ?? { name: "notifications" as IconName, color: "#888888" };
}

export function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

// Notifications store web paths in `link`; map each type to the matching app screen,
// falling back to the web for things the app doesn't have (posts, events).
export function openNotification(router: Router, n: AppNotification) {
  switch (n.type) {
    case "match":
    case "message":
      router.push("/(tabs)/mensajes");
      return;
    case "profile_view":
      if (n.senderProfileId) router.push(`/perfil/${n.senderProfileId}`);
      return;
    case "new_event":
      // The web has no per-event page yet, only the list.
      Linking.openURL(`${WEB_BASE}/events`);
      return;
    default:
      if (n.link) Linking.openURL(`${WEB_BASE}${n.link}`);
  }
}
