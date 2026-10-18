import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// Neon violet glow along the four screen edges. Raise the alpha in GLOW or
// EDGE_SIZE to make it stronger or thicker.
const GLOW = "rgba(168, 85, 247, 0.55)";
const TRANSPARENT = "rgba(168, 85, 247, 0)";
const EDGE_SIZE = 28;

// Purely decorative overlay: pointerEvents="none" lets every touch through.
export function OrbitaFrame() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[GLOW, TRANSPARENT]} style={[styles.edge, styles.top]} />
      <LinearGradient colors={[TRANSPARENT, GLOW]} style={[styles.edge, styles.bottom]} />
      <LinearGradient
        colors={[GLOW, TRANSPARENT]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.edge, styles.left]}
      />
      <LinearGradient
        colors={[TRANSPARENT, GLOW]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.edge, styles.right]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: "absolute",
  },
  top: {
    top: 0,
    left: 0,
    right: 0,
    height: EDGE_SIZE,
  },
  bottom: {
    bottom: 0,
    left: 0,
    right: 0,
    height: EDGE_SIZE,
  },
  left: {
    top: 0,
    bottom: 0,
    left: 0,
    width: EDGE_SIZE,
  },
  right: {
    top: 0,
    bottom: 0,
    right: 0,
    width: EDGE_SIZE,
  },
});
