import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PIN_LENGTH = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

interface PinModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  // "setup" asks twice to confirm a new PIN.
  mode?: "enter" | "setup";
  // Resolve with an error message to show it and clear the dots, or null on success.
  onSubmit: (pin: string) => Promise<string | null>;
  onClose: () => void;
}

export function PinModal({ visible, title, subtitle, mode = "enter", onSubmit, onClose }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Start clean every time the modal opens.
  useEffect(() => {
    if (visible) {
      setPin("");
      setFirstPin(null);
      setError("");
      setBusy(false);
    }
  }, [visible]);

  // Submit automatically once the fourth digit is in.
  useEffect(() => {
    if (pin.length !== PIN_LENGTH || busy) return;

    if (mode === "setup" && firstPin === null) {
      setFirstPin(pin);
      setPin("");
      setError("");
      return;
    }
    if (mode === "setup" && firstPin !== pin) {
      Vibration.vibrate(200);
      setError("Los PIN no coinciden. Vuelve a empezar.");
      setFirstPin(null);
      setPin("");
      return;
    }

    setBusy(true);
    onSubmit(pin)
      .then((message) => {
        if (message) {
          Vibration.vibrate(300);
          setError(message);
          setPin("");
        }
      })
      .catch(() => {
        setError("No se pudo verificar el PIN");
        setPin("");
      })
      .finally(() => setBusy(false));
  }, [pin]);

  function press(key: string) {
    if (busy) return;
    if (key === "del") setPin((p) => p.slice(0, -1));
    else if (key && pin.length < PIN_LENGTH) setPin((p) => p + key);
  }

  const heading = mode === "setup" && firstPin !== null ? "Confirma tu PIN" : title;
  const hint =
    mode === "setup" && firstPin !== null ? "Ingresa el mismo PIN otra vez" : subtitle;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color="#888888" />
          </TouchableOpacity>

          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={26} color="#9333ea" />
          </View>
          <Text style={styles.title}>{heading}</Text>
          {hint ? <Text style={styles.subtitle}>{hint}</Text> : null}

          <View style={styles.dots}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
            ))}
          </View>

          <View style={styles.status}>
            {busy ? (
              <ActivityIndicator color="#9333ea" />
            ) : error ? (
              <Text style={styles.error}>{error}</Text>
            ) : null}
          </View>

          <View style={styles.pad}>
            {KEYS.map((key, i) => (
              <TouchableOpacity
                key={i}
                style={styles.key}
                onPress={() => press(key)}
                disabled={!key || busy}
                accessibilityLabel={key === "del" ? "Borrar" : key || undefined}
              >
                {key === "del" ? (
                  <Ionicons name="backspace-outline" size={24} color="#ffffff" />
                ) : (
                  <Text style={styles.keyText}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  closeButton: {
    position: "absolute",
    top: 14,
    right: 14,
  },
  lockIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(147, 51, 234, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: "#888888",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  dots: {
    flexDirection: "row",
    gap: 16,
    marginTop: 22,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#888888",
  },
  dotFilled: {
    backgroundColor: "#9333ea",
    borderColor: "#9333ea",
  },
  status: {
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    color: "#f87171",
    fontSize: 13,
    textAlign: "center",
  },
  pad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 234,
  },
  key: {
    width: 78,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "300",
  },
});
