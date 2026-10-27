import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function DestinationBar({ origin, address, onPress, onMapPress, onOriginPress, footer }) {
  const displayText = address || "¿A donde vamos?";
  const isEmpty = !address;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.paradas}>
        <View style={styles.routeLine} />

        <TouchableOpacity style={styles.row} onPress={onOriginPress} disabled={!onOriginPress} activeOpacity={0.7}>
          <View style={styles.dotOrigin} />
          <Text style={styles.origin} numberOfLines={2}>
            {origin || "Mi ubicacion actual"}
          </Text>
          {!!onOriginPress && <Ionicons name="pencil" size={13} color="#A1A1AA" style={styles.originEdit} />}
        </TouchableOpacity>

        <View style={styles.sep} />

        <View style={styles.row}>
          <View style={styles.dotDest} />
          <Text style={[styles.text, isEmpty && styles.textMuted]} numberOfLines={2}>
            {displayText}
          </Text>
          <TouchableOpacity style={styles.mapBtn} onPress={onMapPress} activeOpacity={0.8} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="map-outline" size={17} color="#fa6205" />
          </TouchableOpacity>
        </View>
      </View>

      {footer ? (
        <>
          <View style={styles.footerSep} />
          {footer}
        </>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  paradas: {
    paddingVertical: 2,
  },
  footerSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E4E4E7",
    marginRight: 10,
  },
  routeLine: {
    position: "absolute",
    left: 20.5,
    top: 24,
    bottom: 26,
    width: 2,
    borderRadius: 1,
    backgroundColor: "#E4E4E7",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E4E4E7",
    marginLeft: 23,
    marginRight: 10,
  },
  dotOrigin: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  dotDest: {
    width: 11,
    height: 11,
    borderRadius: 3,
    backgroundColor: "#fa6205",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  originEdit: {
    marginRight: 12,
  },
  origin: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "Montserrat_600SemiBold",
    color: "#71717A",
    paddingRight: 10,
    paddingVertical: 6,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
    paddingVertical: 6,
  },
  textMuted: {
    color: "#A1A1AA",
  },
  mapBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF0E5",
    alignItems: "center",
    justifyContent: "center",
  },
});
