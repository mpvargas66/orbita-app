import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Linking,
  Platform,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { login, registerAccount } from "@/api/auth";

const TERMS_URL = "https://www.orbitalife.cl/terms";

// Same rules as the backend (/api/auth/register), checked here for faster feedback.
function validate(alias: string, email: string, password: string, accepted: boolean) {
  if (alias.length < 4) return "El alias debe tener al menos 4 caracteres";
  if (!/^[a-zA-Z0-9_]+$/.test(alias)) return "El alias solo puede tener letras, números y guiones bajos";
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Ingresa un email válido";
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (!accepted) return "Debes aceptar los términos y confirmar que eres mayor de 18 años";
  return null;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [alias, setAlias] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const cleanAlias = alias.trim();
    const cleanEmail = email.trim().toLowerCase();
    const problem = validate(cleanAlias, cleanEmail, password, accepted);
    if (problem) {
      setError(problem);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await registerAccount({ alias: cleanAlias, email: cleanEmail, password });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo crear la cuenta");
      setLoading(false);
      return;
    }

    // Sign in right away; without a profile yet, the root layout sends the user to
    // "Completa tu perfil".
    try {
      const data = await login(cleanEmail, password);
      setAuth(data.token, data.profile);
    } catch {
      setError("Tu cuenta fue creada. Toca «Inicia sesión» para entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Text style={styles.logo}>Órbita</Text>
          <Text style={styles.subtitle}>Crea tu cuenta</Text>

          <TextInput
            style={[styles.input, styles.inputSpacing]}
            placeholder="Alias (visible para otros)"
            placeholderTextColor="#555"
            autoCapitalize="none"
            autoCorrect={false}
            value={alias}
            onChangeText={setAlias}
            maxLength={30}
          />
          <TextInput
            style={[styles.input, styles.inputSpacing]}
            placeholder="Email"
            placeholderTextColor="#555"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Contraseña (mínimo 8 caracteres)"
              placeholderTextColor="#555"
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((v) => !v)}
              accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#888888" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAccepted((v) => !v)}
            activeOpacity={0.8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
            </View>
            <Text style={styles.termsText}>
              Acepto los{" "}
              <Text style={styles.termsLink} onPress={() => Linking.openURL(TERMS_URL)}>
                términos y condiciones
              </Text>{" "}
              y confirmo que soy mayor de 18 años
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            style={[styles.button, loading && styles.buttonDisabled]}
          >
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Crear cuenta</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchLink} onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.switchText}>
              ¿Ya tienes cuenta? <Text style={styles.switchTextStrong}>Inicia sesión</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  form: {
    width: "100%",
    maxWidth: 400,
  },
  logo: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    color: "#888888",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
  },
  input: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    color: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  inputSpacing: {
    marginBottom: 12,
  },
  passwordWrap: {
    justifyContent: "center",
    marginBottom: 16,
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#2a2a2a",
    backgroundColor: "#141414",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: "#9333ea",
    borderColor: "#9333ea",
  },
  termsText: {
    flex: 1,
    color: "#888888",
    fontSize: 13,
    lineHeight: 19,
  },
  termsLink: {
    color: "#c084fc",
    textDecorationLine: "underline",
  },
  error: {
    color: "#f87171",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#9333ea",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  switchLink: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  switchText: {
    color: "#888888",
    fontSize: 14,
  },
  switchTextStrong: {
    color: "#c084fc",
    fontWeight: "600",
  },
});
