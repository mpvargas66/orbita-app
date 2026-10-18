import { View, Text, StyleSheet } from "react-native";

export default function SalasScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Salas</Text>
      <Text style={styles.subtitle}>Próximamente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: "#888888",
    fontSize: 14,
    marginTop: 8,
  },
});
