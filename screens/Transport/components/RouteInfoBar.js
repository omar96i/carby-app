import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function RouteInfoBar({ distance, eta, trafficLevel }) {
  if (!distance) return null;

  const trafficColors = {
    ok: { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0", label: "Trafico normal" },
    mid: { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A", label: "Trafico moderado" },
    bad: { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA", label: "Trafico pesado" },
  };
  const traffic = trafficColors[trafficLevel] || trafficColors.ok;

  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <View style={styles.iconBox}>
          <Ionicons name="location" size={14} color="#FF5500" />
        </View>
        <Text style={styles.valOrange}>{distance} km</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.stat}>
        <View style={styles.iconBox}>
          <Ionicons name="time-outline" size={14} color="#0F172A" />
        </View>
        <Text style={styles.valDark}>{eta} min</Text>
      </View>
      <View style={styles.divider} />
      <View style={[styles.trafficBadge, { backgroundColor: traffic.bg, borderColor: traffic.border }]}>
        <Text style={[styles.trafficText, { color: traffic.text }]}>
          {traffic.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    marginTop: 8,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  valOrange: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
  },
  valDark: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
  },
  trafficBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  trafficText: {
    fontSize: 11,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
  },
});
