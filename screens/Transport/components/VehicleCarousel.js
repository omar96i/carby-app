import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../../../constants/url";
import VehicleCard from "./VehicleCard";

export default function VehicleCarousel({ services, selectedId, onSelect, distanceKm }) {
  const scrollRef = useRef(null);
  const [scrollX, setScrollX] = useState(0);

  const getServicePrice = (service) => {
    const base = parseFloat(service.precio_base) || 0;
    const perKm = parseFloat(service.precio_km) || 0;
    const additional = parseFloat(service.precio_adicional) || 0;
    const dist = distanceKm || 0;
    return Math.round(base + perKm * Math.max(0, dist) + additional);
  };

  const getServiceIconUrl = (service) => {
    if (!service.icono) return null;
    return service.icono.startsWith("http")
      ? service.icono
      : `${BASE_URL.toString().replace("/api", "")}storage/${service.icono}`;
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
        <Text style={styles.title}>Elige tu servicio</Text>
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
        {services.map((service) => (
          <VehicleCard
            key={service.id}
            name={service.nombre}
            iconUrl={getServiceIconUrl(service)}
            price={getServicePrice(service).toLocaleString("es-CO")}
            selected={selectedId === service.id.toString()}
            onPress={() => onSelect(service)}
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
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
});
