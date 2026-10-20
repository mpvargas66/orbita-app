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
import {
  addGalleryPhoto,
  deletePhoto,
  getMyPhotos,
  setCoverPhoto,
  setPhotoVisibility,
  setProfilePhoto,
  type MyPhoto,
} from "@/api/profiles";

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
    return () => { active = false; };
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  async function handleAddPhoto() {
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
      setPhotos((prev) => prev.map((p) => ({ ...p, isProfilePhoto: p.id === photo.id })));
      reload();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo cambiar la foto de perfil");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetCover(photo: MyPhoto) {
    setBusyId(photo.id);
    try {
      await setCoverPhoto(photo.id);
      Alert.alert("Listo", "Foto de portada actualizada");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo cambiar la foto de portada");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleVisibility(photo: MyPhoto) {
    setBusyId(photo.id);
    try {
      const result = await setPhotoVisibility(photo.id, !photo.isExplicit);
      setPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, isExplicit: result.isExplicit } : p))
      );
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo cambiar la visibilidad");
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

    type Action = { label: string; run: () => void; destructive?: boolean };
    const actions: Action[] = [];

    if (!photo.isProfilePhoto) {
      actions.push({ label: "📌 Establecer como foto de perfil", run: () => handleSetProfile(photo) });
    }
    actions.push({ label: "🖼️ Establecer como foto de portada", run: () => handleSetCover(photo) });
    if (photo.isExplicit) {
      actions.push({ label: "🔓 Marcar como Pública", run: () => handleToggleVisibility(photo) });
    } else {
      actions.push({ label: "🔒 Marcar como Restringida", run: () => handleToggleVisibility(photo) });
    }
    actions.push({ label: "🗑️ Eliminar foto", run: () => confirmDelete(photo), destructive: true });

    if (Platform.OS === "ios") {
      const options = ["Cancelar", ...actions.map((a) => a.label)];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: options.indexOf("🗑️ Eliminar foto"),
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Fotos y videos</Text>
          <Text style={styles.headerSubtitle}>Mantén pulsada una foto para ver las opciones disponibles</Text>
        </View>
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

              {/* Profile badge */}
              {item.isProfilePhoto && (
                <View style={styles.badgeProfile}>
                  <Ionicons name="person" size={11} color="#ffffff" />
                </View>
              )}

              {/* Visibility badge */}
              <View style={[styles.badgeVisibility, item.isExplicit ? styles.badgeRestricted : styles.badgePublic]}>
                <Text style={styles.badgeText}>{item.isExplicit ? "Restringida" : "Pública"}</Text>
              </View>

              {busyId === item.id && (
                <View style={styles.cellOverlay}>
                  <ActivityIndicator color="#ffffff" />
                </View>
              )}
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
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#888888",
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
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
    paddingTop: 12,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
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
  badgeProfile: {
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
  badgeVisibility: {
    position: "absolute",
    top: 5,
    left: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePublic: {
    backgroundColor: "rgba(16,185,129,0.85)",
  },
  badgeRestricted: {
    backgroundColor: "rgba(220,38,38,0.85)",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "700",
  },
  cellOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
