import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { formatDistance } from "../utils";

export const RouteSummary = ({ origin, destination, distance, duration }) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.lineBox}>
          <View style={styles.originDot} />
          <View style={styles.line} />
          <Feather name="map-pin" size={16} color="#FF5500" />
        </View>
        <View style={styles.textBox}>
          <View>
            <Text style={styles.label}>Origen</Text>
            <Text style={styles.address} numberOfLines={2}>
              {origin || "Punto de recogida"}
            </Text>
          </View>
          <View style={styles.destBox}>
            <Text style={styles.label}>Destino</Text>
            <Text style={styles.address} numberOfLines={2}>
              {destination || "Destino"}
            </Text>
          </View>
        </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{formatDistance(distance)}</Text>
            <Text style={styles.badgeSub}>{duration ? `${duration} min` : "--"}</Text>
          </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  lineBox: {
    alignItems: "center",
    paddingTop: 4,
    marginRight: 12,
  },
  originDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#10B981",
    backgroundColor: "#FFFFFF",
  },
  line: {
    width: 2,
    height: 32,
    backgroundColor: "#E2E8F0",
    marginVertical: 4,
  },
  textBox: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  address: {
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#0F172A",
    lineHeight: 18,
    marginTop: 2,
  },
  destBox: {
    marginTop: 12,
  },
  badge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  badgeSub: {
    fontSize: 10,
    fontFamily: "Montserrat",
    color: "#64748B",
    marginTop: 2,
  },
});
