import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { unregisterPushNotifications } from "@/lib/pushNotifications";

interface Profile {
  id: string;
  alias: string;
  profileType: string;
  city?: string;
  bio?: string;
  photoUrl?: string;
  membershipType?: string;
}

interface AuthState {
  token: string | null;
  profile: Profile | null;
  setAuth: (token: string, profile: Profile) => void;
  clearAuth: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  profile: null,

  setAuth: (token, profile) => {
    SecureStore.setItemAsync("orbita_token", token);
    SecureStore.setItemAsync("orbita_profile", JSON.stringify(profile));
    set({ token, profile });
  },

  clearAuth: () => {
    // Log out in the UI right away; the stored token is deleted after unregistering
    // this device's push token (that request still needs it), capped at 3 s.
    set({ token: null, profile: null });
    const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
    Promise.race([unregisterPushNotifications(), timeout]).finally(() => {
      SecureStore.deleteItemAsync("orbita_token");
      SecureStore.deleteItemAsync("orbita_profile");
    });
  },

  hydrate: async () => {
    const token = await SecureStore.getItemAsync("orbita_token");
    const raw = await SecureStore.getItemAsync("orbita_profile");
    if (token && raw) {
      try {
        const profile = JSON.parse(raw) as Profile;
        set({ token, profile });
      } catch {
        // corrupted store — ignore
      }
    }
  },
}));
