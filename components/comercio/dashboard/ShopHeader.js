import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A" };

export default function ShopHeader({ business, image, shopActive }) {
  return (
    <View style={s.container}>
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
          <View style={s.statusRow}>
            <View style={[s.statusDot, { backgroundColor: shopActive ? "#10B981" : "#EF4444" }]} />
            <Text style={[s.statusText, { color: shopActive ? "#10B981" : "#EF4444" }]}>
              {shopActive ? "Tienda activa — visible al público" : "Tienda inactiva — toca para activar"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: COLORS.ink,
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  info: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#FFF", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  iconImg: { width: 56, height: 56, borderRadius: 18 },
  infoCol: { flex: 1 },
  name: { fontSize: 22, fontFamily: "Montserrat_800ExtraBold", color: "#FFF", lineHeight: 26 },
  location: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#AAA", marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: "Montserrat_600SemiBold" },
});
