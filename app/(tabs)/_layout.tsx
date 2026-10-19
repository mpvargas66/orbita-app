import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const TABS: { name: string; icon: IconName; iconActive: IconName }[] = [
  { name: "inicio",   icon: "home-outline",       iconActive: "home" },
  { name: "index",    icon: "compass-outline",   iconActive: "compass" },
  { name: "mensajes", icon: "chatbubble-outline", iconActive: "chatbubble" },
  { name: "salas",    icon: "people-outline",     iconActive: "people" },
  { name: "perfil",   icon: "person-outline",     iconActive: "person" },
];

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="inicio"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { backgroundColor: "#0a0a0a", borderTopColor: "#2a2a2a" },
        tabBarActiveTintColor: "#9333ea",
        tabBarInactiveTintColor: "#555",
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
