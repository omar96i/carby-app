import React from "react";
import { TouchableOpacity, View, Text, Image, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function VehicleCard({ name, iconUrl, price, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.topRow}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
      </View>
      <View style={styles.iconWrap}>
        {iconUrl ? (
          <Image source={{ uri: iconUrl }} style={styles.vehicleImg} resizeMode="contain" />
        ) : (
          <MaterialCommunityIcons name="package-variant-closed" size={40} color="#FF5500" />
        )}
      </View>
      <View style={styles.bottomRow}>
        <Text style={[styles.price, selected && styles.priceActive]}>
          {price ? `$${price}` : "--"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 138,
    height: 150,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 10,
    justifyContent: "space-between",
    marginRight: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardActive: {
    borderColor: "#FF5500",
    borderWidth: 2,
    backgroundColor: "#FFF0E8",
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 13,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 74,
  },
  vehicleImg: {
    width: 130,
    height: 72,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  price: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  priceActive: {
    color: "#FF5500",
  },
});
