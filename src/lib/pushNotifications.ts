import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiRequest } from "@/api/client";

// Show notifications as banners even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Set by `eas init` in app.json (expo.extra.eas.projectId); Expo needs it to issue tokens.
function getProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

async function getExpoToken(): Promise<string | null> {
  const projectId = getProjectId();
  if (!projectId) {
    console.warn("[push] Missing EAS projectId; run `eas init` to enable push notifications.");
    return null;
  }
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

// Asks for permission (once) and registers this device with the backend. Silently
// does nothing on simulators, without permission, or without an EAS project.
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (!Device.isDevice) return;

    if (Platform.OS === "android") {
      // Android 8+ needs a channel before notifications can show.
      await Notifications.setNotificationChannelAsync("default", {
        name: "Mensajes y conexiones",
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: "#9333ea",
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== "granted") return;

    const token = await getExpoToken();
    if (!token) return;

    await apiRequest("/api/push-token", {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch (err) {
    console.warn("[push] registration failed:", err);
  }
}

// Call before clearing the session so this device stops receiving the user's pushes.
export async function unregisterPushNotifications(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    const token = await getExpoToken();
    if (!token) return;
    await apiRequest("/api/push-token", { method: "DELETE", body: JSON.stringify({ token }) });
  } catch {
    // Best effort: the backend also drops tokens Expo reports as unregistered.
  }
}
