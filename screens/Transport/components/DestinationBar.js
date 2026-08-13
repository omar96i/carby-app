import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function DestinationBar({ address, onPress, onMapPress }) {
  const displayText = address || "¿A donde vamos?";
  const isEmpty = !address;

  return (
    <TouchableOpacity style={styles.bar} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.iconCircle}>
        <Ionicons name="location" size={20} color="#FF5500" />
      </View>
      <Text style={[styles.text, isEmpty && styles.textMuted]} numberOfLines={1}>
        {displayText}
      </Text>
      <TouchableOpacity style={styles.mapBtn} onPress={onMapPress} activeOpacity={0.7}>
        <Ionicons name="map-outline" size={15} color="#FF5500" />
        <Text style={styles.mapBtnText}>Mapa</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 9999,
    paddingLeft: 10,
    paddingRight: 10,
    paddingVertical: 7,
    gap: 12,
    borderWidth: 1.5,
    borderColor: "rgba(228,228,231,0.85)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,85,0,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,85,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    flex: 1,
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  textMuted: {
    color: "#94A3B8",
  },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,85,0,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255,85,0,0.2)",
    borderRadius: 9999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  mapBtnText: {
    fontSize: 12,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
  },
});
