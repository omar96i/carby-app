import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function RouteInfoBar({ distance, eta, trafficLevel, embedded = false }) {
  if (!distance) return null;

  const trafficColors = {
    ok: { dot: "#10B981", text: "#059669", label: "Trafico normal" },
    mid: { dot: "#F59E0B", text: "#B45309", label: "Trafico moderado" },
    bad: { dot: "#EF4444", text: "#DC2626", label: "Trafico pesado" },
  };
  const traffic = trafficColors[trafficLevel] || trafficColors.ok;

  return (
    <View style={embedded ? styles.embedded : styles.container}>
      <View style={styles.stat}>
        <Ionicons name="navigate" size={13} color="#fa6205" />
        <Text style={styles.val}>{distance} km</Text>
      </View>
      <View style={styles.sep} />
      <View style={styles.stat}>
        <Ionicons name="time" size={13} color="#1C1C1E" />
        <Text style={styles.val}>{eta} min</Text>
      </View>
      <View style={styles.sep} />
      <View style={styles.stat}>
        <View style={[styles.dot, { backgroundColor: traffic.dot }]} />
        <Text style={[styles.traffic, { color: traffic.text }]}>{traffic.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 36,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  embedded: {
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    gap: 10,
    paddingLeft: 1,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  val: {
    fontSize: 13,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#1C1C1E",
  },
  sep: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D4D4D8",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  traffic: {
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
  },
});
