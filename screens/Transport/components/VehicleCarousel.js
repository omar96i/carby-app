import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { BASE_URL } from "../../../constants/url";
import VehicleCard, { VEHICLE_CARD_W } from "./VehicleCard";

export default function VehicleCarousel({ services, selectedId, onSelect, distanceKm, surgePct = 0 }) {
  const getEffectivePricing = (service) => {
    const tarifa = service.tarifa_vigente || null;
    return {
      base: parseFloat(service.precio_base_efectivo ?? tarifa?.precio_base ?? service.precio_base) || 0,
      perKm: parseFloat(service.precio_km_efectivo ?? tarifa?.precio_km ?? service.precio_km) || 0,
      additional: parseFloat(service.precio_adicional_efectivo ?? tarifa?.precio_adicional ?? service.precio_adicional) || 0,
      schedule: tarifa,
    };
  };

  const getServicePrice = (service) => {
    const { base, perKm, additional } = getEffectivePricing(service);
    const dist = distanceKm || 0;
    const raw = base + perKm * Math.max(0, dist) + additional;
    const pct = Number(surgePct) || 0;
    return Math.round(Math.max(pct > 0 ? raw * (1 + pct / 100) : raw, 5));
  };

  const getServiceIconUrl = (service) => {
    if (!service.icono) return null;
    return service.icono.startsWith("http")
      ? service.icono
      : `${BASE_URL.toString().replace("/api", "")}storage/${service.icono}`;
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Elige tu servicio</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        decelerationRate="fast"
        snapToInterval={VEHICLE_CARD_W + GAP}
        snapToAlignment="start"
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

const GAP = 10;

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#1C1C1E",
    marginBottom: 8,
    marginLeft: 2,
  },
  list: {
    gap: GAP,
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
});
