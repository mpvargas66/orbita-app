import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { addGalleryPhoto, deletePhoto, getMyPhotos, setProfilePhoto, type MyPhoto } from "@/api/profiles";

const COLUMNS = 3;
const GAP = 6;
const SIDE_PADDING = 16;

export default function MisFotosScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cellSize = (width - SIDE_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  const [photos, setPhotos] = useState<MyPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  // Photo with a request in flight (setting as profile or deleting).
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getMyPhotos()
      .then((data) => {
        if (!active) return;
        setPhotos(data);
        setError("");
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "No se pudieron cargar tus fotos");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  async function handleAddPhoto() {
    // The system photo picker needs no library permission on iOS 11+ or Android.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      await addGalleryPhoto(result.assets[0].uri);
      reload();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo subir la foto");
    } finally {
      setUploading(false);
    }
  }

  async function handleSetProfile(photo: MyPhoto) {
    if (photo.isProfilePhoto || busyId) return;
    setBusyId(photo.id);
    try {
      await setProfilePhoto(photo.id);
      // Reflect the change right away; the next load confirms the order.
      setPhotos((prev) => prev.map((p) => ({ ...p, isProfilePhoto: p.id === photo.id })));
      reload();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo cambiar la foto de perfil");
    } finally {
      setBusyId(null);
    }
  }

  function confirmDelete(photo: MyPhoto) {
    Alert.alert(
      "Eliminar foto",
      photo.isProfilePhoto
        ? "Es tu foto de perfil. Se usará la siguiente foto de tu galería en su lugar."
        : "¿Seguro que quieres eliminar esta foto?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setBusyId(photo.id);
            try {
              await deletePhoto(photo.id);
              setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
              reload();
            } catch (e: unknown) {
              Alert.alert("Error", e instanceof Error ? e.message : "No se pudo eliminar la foto");
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  }

  function handleLongPress(photo: MyPhoto) {
    if (busyId) return;
    const actions: { label: string; run: () => void; destructive?: boolean }[] = [];
    if (!photo.isProfilePhoto) {
      actions.push({ label: "Usar como foto de perfil", run: () => handleSetProfile(photo) });
    }
    actions.push({ label: "Eliminar foto", run: () => confirmDelete(photo), destructive: true });

    if (Platform.OS === "ios") {
      const options = ["Cancelar", ...actions.map((a) => a.label)];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: options.indexOf("Eliminar foto"),
        },
        (index) => {
          if (index > 0) actions[index - 1].run();
        }
      );
    } else {
      Alert.alert("Opciones de foto", undefined, [
        ...actions.map((a) => ({
          text: a.label,
          style: a.destructive ? ("destructive" as const) : undefined,
          onPress: a.run,
        })),
        { text: "Cancelar", style: "cancel" as const },
      ]);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis fotos</Text>
        <TouchableOpacity
          onPress={handleAddPhoto}
          disabled={uploading}
          style={styles.headerButton}
          accessibilityLabel="Agregar foto"
        >
          {uploading ? (
            <ActivityIndicator color="#9333ea" size="small" />
          ) : (
            <Ionicons name="add" size={26} color="#9333ea" />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#9333ea" />
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="images-outline" size={44} color="#2a2a2a" />
          <Text style={styles.emptyText}>{error || "Aún no tienes fotos"}</Text>
          {error ? null : (
            <TouchableOpacity onPress={handleAddPhoto} style={styles.emptyButton} disabled={uploading}>
              <Text style={styles.emptyButtonText}>Subir primera foto</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(p) => p.id}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          ListHeaderComponent={
            <Text style={styles.hint}>
              Toca una foto para usarla como foto de perfil. Mantén presionada para más opciones.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.cell,
                { width: cellSize, height: cellSize },
                item.isProfilePhoto && styles.cellSelected,
              ]}
              onPress={() => handleSetProfile(item)}
              onLongPress={() => handleLongPress(item)}
              delayLongPress={300}
              activeOpacity={0.8}
              accessibilityLabel={item.isProfilePhoto ? "Foto de perfil actual" : "Usar como foto de perfil"}
            >
              <Image source={{ uri: item.thumbnailUrl ?? item.url }} style={styles.image} />
              {item.isProfilePhoto ? (
                <View style={styles.badge}>
                  <Ionicons name="person" size={11} color="#ffffff" />
                </View>
              ) : null}
              {busyId === item.id ? (
                <View style={styles.cellOverlay}>
                  <ActivityIndicator color="#ffffff" />
                </View>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyText: {
    color: "#888888",
    fontSize: 15,
    textAlign: "center",
  },
  emptyButton: {
    backgroundColor: "#9333ea",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 4,
  },
  emptyButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  grid: {
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 32,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  hint: {
    color: "#888888",
    fontSize: 13,
    textAlign: "center",
    marginVertical: 14,
  },
  cell: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "#141414",
  },
  cellSelected: {
    borderColor: "#9333ea",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#9333ea",
    alignItems: "center",
    justifyContent: "center",
  },
  cellOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
