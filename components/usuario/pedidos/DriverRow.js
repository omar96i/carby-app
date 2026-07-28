import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { COLORS } from "./helpers";
import { BASE_URL } from "../../../constants/url";

function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL.toString().replace("/api", "")}/storage/${path}`;
}

export default function DriverRow({ driver, showEta = true }) {
  if (!driver) return null;

  return (
    <View style={s.row}>
      <Image
        source={driver.photo ? { uri: getImageUrl(driver.photo) } : require("../../../assets/images/imagen.jpg")}
        style={s.photo}
      />
      <View style={s.info}>
        <View style={s.nameRow}>
          <Text style={s.name} numberOfLines={1}>{driver.name || "Conductor"}</Text>
          {driver.rating != null && (
            <View style={s.ratingChip}>
              <Text style={s.starIcon}>★</Text>
              <Text style={s.ratingText}>{Number(driver.rating).toFixed(1)}</Text>
            </View>
          )}
        </View>
        <Text style={s.detail} numberOfLines={1}>
          {[driver.vehicle, driver.plate].filter(Boolean).join(" · ") || "Sin información"}
        </Text>
      </View>
      {showEta && driver.eta && (
        <View style={s.etaChip}>
          <Text style={s.etaLabel}>Llega</Text>
          <Text style={s.etaValue}>{driver.eta}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  photo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.surface,
    backgroundColor: COLORS.zinc100,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 13,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.ink,
  },
  ratingChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  starIcon: {
    fontSize: 10,
    color: "#F59E0B",
  },
  ratingText: {
    fontSize: 10,
    fontFamily: "Montserrat_700Bold",
    color: "#B45309",
  },
  detail: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: COLORS.muted,
    marginTop: 2,
  },
  etaChip: {
    backgroundColor: COLORS.brandSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  etaLabel: {
    fontSize: 9,
    fontFamily: "Montserrat_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: COLORS.brand,
    opacity: 0.7,
  },
  etaValue: {
    fontSize: 12,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.brand,
  },
});
