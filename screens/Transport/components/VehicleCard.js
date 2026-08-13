import React from "react";
import { TouchableOpacity, View, Text, Image, StyleSheet } from "react-native";

const VEHICLE_IMAGES = {
  taxi: require("../../../assets/images/icono-carro.png"),
  moto: require("../../../assets/images/icono-moto.png"),
};

const VEHICLE_TAGS = {
  taxi: "4",
  moto: "1",
};

export default function VehicleCard({ type, name, price, eta, selected, onPress }) {
  const imageSource = VEHICLE_IMAGES[type];
  const tag = VEHICLE_TAGS[type] || "?";

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.topRow}>
        <Text style={styles.name}>{name}</Text>
        <View style={[styles.tag, selected && styles.tagActive]}>
          <Text style={[styles.tagText, selected && styles.tagTextActive]}>{tag}</Text>
        </View>
      </View>
      <View style={styles.iconWrap}>
        <Image source={imageSource} style={styles.vehicleImg} resizeMode="contain" />
      </View>
      <View style={styles.bottomRow}>
        <Text style={[styles.price, selected && styles.priceActive]}>
          {price ? `$${price}` : "--"}
        </Text>
        <Text style={styles.eta}>{eta || "~3 min"}</Text>
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
    backgroundColor: "#FFF8F5",
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
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
  tag: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagActive: {
    backgroundColor: "rgba(255,85,0,0.08)",
    borderColor: "#FF5500",
  },
  tagText: {
    fontSize: 9,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#475569",
  },
  tagTextActive: {
    color: "#FF5500",
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
  eta: {
    fontSize: 10,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#10B981",
  },
});
