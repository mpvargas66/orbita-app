import { View, Text } from "react-native";

export default function MensajesScreen() {
  return (
    <View className="flex-1 bg-bg items-center justify-center">
      <Text className="text-white text-xl font-bold">Mensajes</Text>
      <Text className="text-zinc-500 text-sm mt-2">Próximamente</Text>
    </View>
  );
}
