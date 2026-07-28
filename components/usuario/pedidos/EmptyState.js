import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "./helpers";

const TAB_COPY = {
  activas: { icon: "navigate", title: "Sin servicios activos", sub: "Tus viajes y pedidos en curso aparecerán aquí." },
  historial: { icon: "archive", title: "Historial vacío", sub: "Aún no has completado ningún servicio." },
  reservas: { icon: "calendar", title: "Sin reservas", sub: "Programa un viaje con anticipación." },
};

export default function EmptyState({ tab = "activas" }) {
  const copy = TAB_COPY[tab] || TAB_COPY.activas;
  return (
    <View style={s.container}>
      <View style={s.iconBox}>
        <Ionicons name={copy.icon} size={28} color={COLORS.muted} />
      </View>
      <Text style={s.title}>{copy.title}</Text>
      <Text style={s.sub}>{copy.sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.ink,
    textAlign: "center",
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    color: COLORS.muted,
    textAlign: "center",
  },
});
