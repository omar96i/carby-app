import React from "react";
import { TouchableOpacity, View, Text, Image, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export const VEHICLE_CARD_W = 116;

export default function VehicleCard({ name, iconUrl, price, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.iconWrap}>
        {iconUrl ? (
          <Image source={{ uri: iconUrl }} style={styles.vehicleImg} resizeMode="contain" />
        ) : (
          <MaterialCommunityIcons name="package-variant-closed" size={32} color="#fa6205" />
        )}
      </View>
      <View style={styles.nameRow}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {selected && <Ionicons name="checkmark-circle" size={16} color="#fa6205" />}
      </View>
      <Text style={[styles.price, selected && styles.priceActive]}>
        {price ? `$${price}` : "--"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: VEHICLE_CARD_W,
    backgroundColor: "#F4F4F5",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  cardActive: {
    backgroundColor: "#FFF0E5",
    borderColor: "#fa6205",
  },
  iconWrap: {
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  vehicleImg: {
    width: 92,
    height: 56,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  name: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
  },
  price: {
    fontSize: 14,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#1C1C1E",
    marginTop: 2,
  },
  priceActive: {
    color: "#fa6205",
  },
});
