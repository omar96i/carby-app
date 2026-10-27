import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { HEADER_TEXT } from "../utils";

export const TopBar = ({ state, top = 0, onBack }) => {
  const config = HEADER_TEXT[state] || HEADER_TEXT.pendiente;

  return (
    <View style={[styles.container, { top: top + 10 }]}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
        <Feather name="arrow-left" size={21} color="#1C1C1E" />
      </TouchableOpacity>
      <View style={styles.content}>
        <View style={[styles.halo, { backgroundColor: config.tone + "26" }]}>
          <View style={[styles.dot, { backgroundColor: config.tone }]} />
        </View>
        <View style={styles.textBox}>
          <Text style={styles.title} numberOfLines={1}>{config.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{config.sub}</Text>
        </View>
      </View>
    </View>
  );
};

const SOMBRA = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 14,
  elevation: 6,
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    ...SOMBRA,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF",
    borderRadius: 999,
    height: 52,
    paddingLeft: 8,
    paddingRight: 16,
    ...SOMBRA,
  },
  halo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  textBox: {
    flex: 1,
  },
  title: {
    fontSize: 14.5,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#1C1C1E",
  },
  subtitle: {
    fontSize: 11.5,
    fontFamily: "Montserrat_400Regular",
    color: "#71717A",
    marginTop: 1,
  },
});
