import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { HEADER_TEXT } from "../utils";

export const TopBar = ({ state, isDelivery, onBack }) => {
  const config = HEADER_TEXT[state] || HEADER_TEXT.to_pickup;
  const title = isDelivery && state !== "finished" ? "Entrega en curso" : config.title;
  const sub = isDelivery && state !== "finished" ? "Dirígete al comercio y luego al cliente" : config.sub;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
            <Feather name="arrow-left" size={20} color="#0F172A" />
          </TouchableOpacity>
        )}

        <View style={[styles.content, !onBack && styles.contentFull]}>
          <View style={[styles.dot, { backgroundColor: config.tone }]} />
          <View style={styles.textBox}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {sub}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  contentFull: {
    marginLeft: 0,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textBox: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Montserrat",
    color: "#64748B",
    marginTop: 2,
  },
});
