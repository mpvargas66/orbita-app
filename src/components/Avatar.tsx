import { View, Image, Text, StyleSheet } from "react-native";

interface AvatarProps {
  photoUrl?: string | null;
  alias: string;
  size?: number;
}

export function Avatar({ photoUrl, alias, size = 48 }: AvatarProps) {
  const initials = alias.slice(0, 2).toUpperCase();

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 4 }]}>
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.35 }]}>
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#2a2a2a",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#888888",
    fontWeight: "600",
  },
});
