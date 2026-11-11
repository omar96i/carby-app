import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { BASE_URL } from "../../../constants/url";
import VehicleCard, { VEHICLE_CARD_W } from "./VehicleCard";
import { cotizarServicio } from "../../../utils/tarifas";

export default function VehicleCarousel({ services, selectedId, onSelect, distanceKm, surgePct = 0, route = null, hasRoute = false }) {
  const getServicePrice = (service) => {
    if (!hasRoute || !route || !route.km || route.km <= 0) return null;
    const cot = cotizarServicio({
      service,
      km: route.km,
      minCon: route.minCon,
      minSin: route.minSin,
      o: route.o,
      d: route.d,
    });
    if (!cot) return null;
    const pct = Number(surgePct) || 0;
    const raw = pct > 0 ? cot.precio * (1 + pct / 100) : cot.precio;
    if (cot.rama === "actual") return Math.round(Math.max(raw, 5));
    return Math.max(Math.round(raw / 100) * 100, cot.precio);
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
            price={(() => {
              const p = getServicePrice(service);
              return p == null ? null : p.toLocaleString("es-CO");
            })()}
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
