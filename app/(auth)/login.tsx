import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useAuthStore } from "@/store/useAuthStore";
import { login } from "@/api/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      const data = await login(email.trim(), password);
      setAuth(data.token, data.profile);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-white text-3xl font-bold mb-1">Órbita</Text>
        <Text className="text-zinc-400 text-sm mb-10">Inicia sesión para continuar</Text>

        <TextInput
          className="bg-card border border-[#2a2a2a] text-white rounded-xl px-4 py-3.5 mb-3"
          placeholder="Email"
          placeholderTextColor="#555"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          className="bg-card border border-[#2a2a2a] text-white rounded-xl px-4 py-3.5 mb-4"
          placeholder="Contraseña"
          placeholderTextColor="#555"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleLogin}
        />

        {error ? <Text className="text-red-400 text-sm mb-3">{error}</Text> : null}

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className="bg-accent rounded-xl py-3.5 items-center"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">Entrar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
