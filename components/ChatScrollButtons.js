import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Botones flotantes de scroll para el chat (arriba = antiguos,
 * abajo = nuevos). Se ocultan con `hidden` (teclado abierto).
 */
export default function ChatScrollButtons({ listRef, inverted = true, hidden }) {
  if (hidden) return null;

  const goNewest = () => {
    if (inverted) listRef.current?.scrollToOffset({ offset: 0, animated: true });
    else listRef.current?.scrollToEnd({ animated: true });
  };
  const goOldest = () => {
    if (inverted) listRef.current?.scrollToEnd({ animated: true });
    else listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  return (
    <View style={s.wrap} pointerEvents="box-none">
      <TouchableOpacity style={s.btn} onPress={goOldest} activeOpacity={0.8}>
        <Ionicons name="arrow-up" size={16} color="#0F172A" />
      </TouchableOpacity>
      <TouchableOpacity style={s.btn} onPress={goNewest} activeOpacity={0.8}>
        <Ionicons name="arrow-down" size={16} color="#0F172A" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 8,
    left: 12,
    gap: 8,
    zIndex: 10,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
});
