import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "./helpers";

export default function PaymentBadge({ metodo }) {
  return (
    <View style={s.badge}>
      <Text style={s.label}>{metodo}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.zinc100,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 5,
  },
  label: {
    fontSize: 11,
    fontFamily: "Montserrat_700Bold",
    color: COLORS.ink,
  },
});
