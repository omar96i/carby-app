import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "./helpers";

export default function PedidosHeader() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Mis viajes y pedidos</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 22,
    marginBottom: 16,
    backgroundColor: "#1C1C1E",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  title: {
    fontSize: 18,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#FFF",
  },
});
