import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", green: "#10B981", red: "#EF4444" };

export default function ShopHeader({ business, image, estado, onEstadoPress, onCambiarFoto, subiendoFoto = false }) {
  return (
    <View style={s.container}>
      <View style={s.info}>
        <TouchableOpacity style={s.logoWrap} onPress={onCambiarFoto} disabled={!onCambiarFoto || subiendoFoto} activeOpacity={0.8}>
          <View style={s.iconBox}>
            {image ? (
              <Image source={{ uri: image }} style={s.iconImg} />
            ) : (
              <Ionicons name="storefront" size={24} color={COLORS.brand} />
            )}
            {subiendoFoto && (
              <View style={s.subiendo}>
                <ActivityIndicator size="small" color="#FFF" />
              </View>
            )}
          </View>
          {!!onCambiarFoto && (
            <View style={s.lapiz}>
              <Ionicons name="pencil" size={11} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>
        <View style={s.infoCol}>
          <Text style={s.name} numberOfLines={1}>{business?.nombre || "Mi Negocio"}</Text>
          {business?.ubicacion ? (
            <View style={s.locationRow}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.55)" />
              <Text style={s.location} numberOfLines={1}>{business.ubicacion}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {estado ? (
        <TouchableOpacity style={s.pills} onPress={onEstadoPress} activeOpacity={0.8}>
          <View style={[s.pill, estado.abierto ? s.pillOn : s.pillOff]}>
            <View style={[s.dot, { backgroundColor: estado.abierto ? COLORS.green : COLORS.red }]} />
            <Text style={[s.pillText, { color: estado.abierto ? "#6EE7B7" : "#FCA5A5" }]} numberOfLines={1}>
              {estado.horarioTexto}
            </Text>
          </View>
          <View style={[s.pill, estado.publico ? s.pillOn : s.pillOff]}>
            <Ionicons name={estado.publico ? "eye" : "eye-off"} size={12} color={estado.publico ? "#6EE7B7" : "#FCA5A5"} />
            <Text style={[s.pillText, { color: estado.publico ? "#6EE7B7" : "#FCA5A5" }]} numberOfLines={1}>
              {estado.publico ? "Visible para clientes" : "No visible"}
            </Text>
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: COLORS.ink,
    paddingTop: 14,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  info: { flexDirection: "row", alignItems: "center", gap: 14 },
  logoWrap: { width: 60, height: 60 },
  lapiz: { position: "absolute", right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.brand, borderWidth: 2, borderColor: COLORS.ink, alignItems: "center", justifyContent: "center" },
  subiendo: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  iconBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#FFF", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  iconImg: { width: 56, height: 56, borderRadius: 18 },
  infoCol: { flex: 1 },
  name: { fontSize: 21, fontFamily: "Montserrat_800ExtraBold", color: "#FFF", lineHeight: 26 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  location: { flex: 1, fontSize: 12.5, fontFamily: "Montserrat_600SemiBold", color: "rgba(255,255,255,0.55)" },
  pills: { flexDirection: "row", gap: 8, marginTop: 14 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15, flexShrink: 1 },
  pillOn: { backgroundColor: "rgba(16,185,129,0.16)" },
  pillOff: { backgroundColor: "rgba(239,68,68,0.16)" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 11.5, fontFamily: "Montserrat_700Bold", flexShrink: 1 },
});
