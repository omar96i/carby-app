import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { COLORS, STATUS_STYLES, obtenerLabelEstado } from "./helpers";

export default function StatusBadge({ status, type }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pendiente;
  const label = obtenerLabelEstado(status, type);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!style.pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [style.pulse]);

  return (
    <View style={[s.badge, { backgroundColor: style.bg }]}>
      {style.pulse ? (
        <Animated.View style={[s.dotPulse, { backgroundColor: style.dot, opacity: pulseAnim }]} />
      ) : null}
      <View style={[s.dot, { backgroundColor: style.dot }]} />
      <Text style={[s.label, { color: style.text }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  dotPulse: {
    position: "absolute",
    left: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 10,
    fontFamily: "Montserrat_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
