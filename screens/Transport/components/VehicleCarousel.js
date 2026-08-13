import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import VehicleCard from "./VehicleCard";

export default function VehicleCarousel({ vehicles, selectedType, onSelect, prices, tariffType, distanceKm }) {
  const scrollRef = useRef(null);
  const [scrollX, setScrollX] = useState(0);

  const getVehiclePrice = (v) => {
    if (!prices || prices.length === 0) return v.basePrice;
    const rolRider = `rider.${v.type}`;
    const match = prices.find(
      (p) => p.rol_rider === rolRider && p.tipo_tarifa === tariffType && p.estado === "activo"
    );
    if (!match) return v.basePrice;
    const base = match.precio_base ? parseFloat(match.precio_base) : 0;
    const perKm = parseFloat(match.precio) || 0;
    const dist = distanceKm || 0;
    return Math.round(base + perKm * Math.max(0, dist));
  };

  const scroll = (dir) => {
    const nextX = Math.max(0, scrollX + dir);
    scrollRef.current?.scrollTo({ x: nextX, animated: true });
    setScrollX(nextX);
  };

  const handleScroll = (event) => {
    setScrollX(event.nativeEvent.contentOffset.x);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Elige tu vehiculo</Text>
        <View style={styles.navBtns}>
          <TouchableOpacity style={styles.navBtn} onPress={() => scroll(-140)}>
            <Ionicons name="chevron-back" size={14} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => scroll(140)}>
            <Ionicons name="chevron-forward" size={14} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {vehicles.map((v) => (
          <VehicleCard
            key={v.type}
            type={v.type}
            name={v.name}
            tagline={v.tagline}
            price={getVehiclePrice(v).toLocaleString("es-CO")}
            eta={v.eta}
            selected={selectedType === v.type}
            onPress={() => onSelect(v.type)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    flexDirection: "row",
    alignItems: "center",
  },
  navBtns: {
    flexDirection: "row",
    gap: 6,
  },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingVertical: 6,
  },
});
