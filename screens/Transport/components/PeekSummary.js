import React from "react";
import { TouchableOpacity, View, Text, Image, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function PeekSummary({ service, price, onGo, onExpand, demandaText, tachado }) {
  if (!service) return null;

  return (
    <TouchableOpacity style={styles.container} onPress={onExpand} activeOpacity={0.9}>
      <View style={styles.left}>
        <View style={styles.carVisual}>
          {service.iconUrl ? (
            <Image source={{ uri: service.iconUrl }} style={styles.carImg} resizeMode="contain" />
          ) : (
            <MaterialCommunityIcons name="package-variant-closed" size={24} color="#fa6205" />
          )}
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.carName} numberOfLines={1}>{service.name}</Text>
          {demandaText ? (
            <View style={styles.demandaRow}>
              <Ionicons name="flame" size={11} color="#fa6205" />
              <Text style={styles.demandaText}>{demandaText}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>
        {!tachado && (
          <Text style={styles.price}>{price ? `$${price}` : "--"}</Text>
        )}
        <TouchableOpacity
          style={[styles.goBtn, tachado && styles.goBtnNublado]}
          onPress={onGo}
          activeOpacity={0.8}
          disabled={tachado}
        >
          <Text style={styles.goText}>Pedir</Text>
          <Ionicons name="arrow-forward" size={15} color="#FFF" />
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
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  carVisual: {
    width: 56,
    height: 42,
    backgroundColor: "#F4F4F5",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  carImg: {
    width: 50,
    height: 34,
  },
  carName: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  price: {
    fontSize: 18,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#1C1C1E",
  },
  goBtnNublado: {
    opacity: 0.45,
  },
  goBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#fa6205",
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  goText: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    color: "#FFFFFF",
  },
  demandaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  demandaText: {
    fontSize: 11.5,
    fontFamily: "Montserrat_600SemiBold",
    color: "#71717A",
  },
});
