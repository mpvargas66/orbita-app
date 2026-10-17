import { View, Image, Text } from "react-native";

interface AvatarProps {
  photoUrl?: string | null;
  alias: string;
  size?: number;
}

export function Avatar({ photoUrl, alias, size = 48 }: AvatarProps) {
  const initials = alias.slice(0, 2).toUpperCase();

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 4 }}
      className="bg-zinc-800 overflow-hidden items-center justify-center"
    >
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      ) : (
        <Text style={{ fontSize: size * 0.35 }} className="text-zinc-400 font-semibold">
          {initials}
        </Text>
      )}
    </View>
  );
}
