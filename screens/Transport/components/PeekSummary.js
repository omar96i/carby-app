import React from "react";
import { TouchableOpacity, View, Text, Image, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function PeekSummary({ service, price, onGo, onExpand }) {
  if (!service) return null;

  return (
    <TouchableOpacity style={styles.container} onPress={onExpand} activeOpacity={0.9}>
      <View style={styles.left}>
        <View style={styles.carVisual}>
          {service.iconUrl ? (
            <Image source={{ uri: service.iconUrl }} style={styles.carImg} resizeMode="contain" />
          ) : (
            <MaterialCommunityIcons name="package-variant-closed" size={24} color="#FF5500" />
          )}
        </View>
        <View>
          <Text style={styles.carName}>{service.name}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>{price ? `$${price}` : "--"}</Text>
        <TouchableOpacity style={styles.goBtn} onPress={onGo} activeOpacity={0.7}>
          <Text style={styles.goText}>Pedir</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  carVisual: {
    width: 42,
    height: 42,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  carImg: {
    width: 34,
    height: 24,
  },
  carName: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  price: {
    fontSize: 18,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
  },
  goBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#FF5500",
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 4,
  },
  goText: {
    fontSize: 13,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});
