import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A" };

export default function ShopHeader({ business, image }) {
  return (
    <View style={s.container}>
      <View style={s.topRow}>
        <View style={s.badge}>
          <Ionicons name="checkmark-circle" size={12} color="#FFF" />
          <Text style={s.badgeText}>Tienda activa</Text>
        </View>
      </View>
      <View style={s.info}>
        <View style={s.iconBox}>
          {image ? (
            <Image source={{ uri: image }} style={s.iconImg} />
          ) : (
            <Ionicons name="storefront" size={24} color={COLORS.ink} />
          )}
        </View>
        <View style={s.infoCol}>
          <Text style={s.name} numberOfLines={1}>{business?.nombre || "Mi Negocio"}</Text>
          {business?.ubicacion ? (
            <Text style={s.location} numberOfLines={1}>
              <Ionicons name="location-outline" size={12} color="#999" /> {business.ubicacion}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: COLORS.ink,
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginBottom: 16 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.brand, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 10, fontFamily: "Montserrat_800ExtraBold", color: "#FFF", textTransform: "uppercase" },
  info: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#FFF", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  iconImg: { width: 56, height: 56, borderRadius: 18 },
  infoCol: { flex: 1 },
  name: { fontSize: 22, fontFamily: "Montserrat_800ExtraBold", color: "#FFF", lineHeight: 26 },
  location: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#AAA", marginTop: 2 },
});
