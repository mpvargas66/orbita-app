import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { getMyProfile } from "@/api/profiles";

// Onboarding (profile type, location, photos…) only exists on the web for now.
const ONBOARDING_URL = "https://www.orbitalife.cl/onboarding/step-0";

// Shown by the root layout to signed-in users who don't have a profile yet.
export default function CompletarPerfilScreen() {
  const token = useAuthStore((s) => s.token);
  const profile = useAuthStore((s) => s.profile);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  async function checkProfile() {
    if (!token) return;
    setChecking(true);
    setMessage("");
    try {
      const data = await getMyProfile();
      const p = data.profile;
      if (!p) {
        setMessage("Todavía no encontramos tu perfil. Termina los pasos en la web y vuelve a intentarlo.");
        return;
      }
      const photo = data.photos.find((ph) => ph.isProfilePhoto && !ph.isExplicit && ph.mediaType === "photo");
      // Saving a profile with an id lets the root layout continue into the app.
      setAuth(token, {
        id: p.id,
        alias: p.alias,
        profileType: p.profileType,
        city: p.city ?? undefined,
        bio: p.bio ?? undefined,
        photoUrl: photo?.cloudinaryUrl,
        membershipType: p.membershipType ?? undefined,
      });
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "No se pudo verificar tu perfil");
    } finally {
      setChecking(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.icon}>
          <Ionicons name="person-add" size={30} color="#9333ea" />
        </View>
        <Text style={styles.title}>
          {profile?.alias ? `¡Bienvenido, ${profile.alias}!` : "¡Bienvenido!"}
        </Text>
        <Text style={styles.text}>
          Tu cuenta está creada. Antes de usar la app, completa tu perfil (tipo de perfil, ubicación y
          fotos) en orbitalife.cl con el mismo email y contraseña.
        </Text>
        <Text style={styles.hint}>Te enviamos un email para verificar tu cuenta.</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={() => Linking.openURL(ONBOARDING_URL)}>
          <Text style={styles.primaryButtonText}>Completar perfil en orbitalife.cl</Text>
          <Ionicons name="open-outline" size={18} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, checking && styles.disabled]}
          onPress={checkProfile}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#9333ea" />
          ) : (
            <Text style={styles.secondaryButtonText}>Ya lo completé</Text>
          )}
        </TouchableOpacity>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <TouchableOpacity style={styles.logout} onPress={clearAuth}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    alignItems: "center",
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "rgba(147, 51, 234, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  text: {
    color: "#888888",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 12,
  },
  hint: {
    color: "#888888",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 28,
  },
  primaryButton: {
    width: "100%",
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
    width: "100%",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#9333ea",
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#9333ea",
    fontSize: 16,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.6,
  },
  message: {
    color: "#f87171",
    fontSize: 13,
    textAlign: "center",
    marginTop: 14,
  },
  logout: {
    paddingVertical: 16,
    marginTop: 16,
  },
  logoutText: {
    color: "#888888",
    fontSize: 14,
  },
});
