import React, { useEffect, useRef } from "react";
import { Marker } from "react-native-maps";
import { View, Text, StyleSheet } from "react-native";

const SIMULATED_DRIVERS = [
  { id: 1, latOffset: 0.004, lngOffset: -0.003, name: "Carlos M.", rating: "4.8" },
  { id: 2, latOffset: -0.003, lngOffset: 0.005, name: "Andres R.", rating: "4.9" },
  { id: 3, latOffset: 0.006, lngOffset: 0.002, name: "Maria V.", rating: "5.0" },
  { id: 4, latOffset: -0.005, lngOffset: -0.004, name: "Daniel X.", rating: "4.7" },
];

export default function NearbyDriversMap({ userLocation }) {
  if (!userLocation) return null;

  return (
    <>
      {SIMULATED_DRIVERS.map((driver) => (
        <Marker
          key={driver.id}
          coordinate={{
            latitude: userLocation.latitude + driver.latOffset,
            longitude: userLocation.longitude + driver.lngOffset,
          }}
          anchor={{ x: 0.5, y: 0.5 }}
          flat
        >
          <View style={styles.marker}>
            <View style={styles.avatar}>
              <Text style={styles.initial}>{driver.name.charAt(0)}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{driver.rating}</Text>
            </View>
          </View>
        </Marker>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  marker: {
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
  },
  initial: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    color: "#FFFFFF",
  },
  badge: {
    position: "absolute",
    bottom: -4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 9999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "MontserratBold",
    color: "#D97706",
  },
});
