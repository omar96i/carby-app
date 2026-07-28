import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "./helpers";

export default function RouteStops({ origin, destination }) {
  return (
    <View style={s.container}>
      <View style={s.connector} />
      <View style={s.stop}>
        <View style={s.dotOrigin} />
        <View style={s.textCol}>
          <Text style={s.label}>{origin?.label || "Origen"}</Text>
          <Text style={s.address} numberOfLines={2}>{origin?.address || ""}</Text>
        </View>
      </View>
      <View style={[s.stop, { marginTop: 12 }]}>
        <View style={s.dotDest}>
          <View style={s.dotDestInner} />
        </View>
        <View style={s.textCol}>
          <Text style={[s.label, { color: COLORS.brand }]}>{destination?.label || "Destino"}</Text>
          <Text style={s.address} numberOfLines={2}>{destination?.address || ""}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingLeft: 26,
    position: "relative",
  },
  connector: {
    position: "absolute",
    left: 4,
    top: 10,
    bottom: 10,
    width: 2,
    borderRadius: 1,
    backgroundColor: COLORS.zinc200,
  },
  stop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dotOrigin: {
    position: "absolute",
    left: -22,
    top: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.ink,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  dotDest: {
    position: "absolute",
    left: -23,
    top: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(250,98,5,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  dotDestInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brand,
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  textCol: {
    flex: 1,
    marginLeft: 6,
  },
  label: {
    fontSize: 9,
    fontFamily: "Montserrat_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: COLORS.muted,
    marginBottom: 1,
  },
  address: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    color: COLORS.ink,
    lineHeight: 17,
  },
});
