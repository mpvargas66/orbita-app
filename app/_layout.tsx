import { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/store/useAuthStore";
import { OrbitaFrame } from "@/components/OrbitaFrame";
import { pingPresence } from "@/api/profiles";
import * as Notifications from "expo-notifications";
import { registerForPushNotifications } from "@/lib/pushNotifications";

const PRESENCE_INTERVAL_MS = 2 * 60 * 1000;

export default function RootLayout() {
  const { token, hydrate } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate().finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === "(auth)";
    if (!token && !inAuth) {
      router.replace("/(auth)/login");
    } else if (token && inAuth) {
      router.replace("/(tabs)/inicio");
    }
  }, [token, segments, ready]);

  // Register this device for push notifications whenever there's a session.
  useEffect(() => {
    if (token) registerForPushNotifications();
  }, [token]);

  // Tapping a message or match notification opens Mensajes (also on cold start).
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!ready || !token || !lastResponse) return;
    const type = lastResponse.notification.request.content.data?.type;
    if (type === "message" || type === "match") router.push("/(tabs)/mensajes");
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }, [lastResponse, ready, token]);

  // Keep "last seen" fresh while the app is open and in the foreground.
  useEffect(() => {
    if (!token) return;
    const ping = () => { pingPresence().catch(() => {}); };
    ping();
    const interval = setInterval(() => {
      if (AppState.currentState === "active") ping();
    }, PRESENCE_INTERVAL_MS);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") ping();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [token]);

  if (!ready) return null;

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0a0a0a" } }} />
      {/* Global glow overlay, rendered above every screen */}
      <OrbitaFrame />
    </View>
  );
}
