import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "./helpers";

export default function PedidosHeader() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Mis viajes y pedidos</Text>
      <Text style={s.sub}>Revisa tus carreras, envíos y reservas en un solo lugar.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 28,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.ink,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    color: COLORS.muted,
  },
});
