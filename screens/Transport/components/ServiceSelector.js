import React from "react";
import { TouchableOpacity, View, Text, Image, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BASE_URL } from "../../../constants/url";

export default function ServiceSelector({ services, selectedId, onSelect, loading }) {
  if (loading) {
    return <ActivityIndicator size="small" color="#FF5500" style={{ marginVertical: 16 }} />;
  }

  if (!services || services.length === 0) {
    return (
      <Text style={styles.empty}>No hay servicios disponibles</Text>
    );
  }

  return (
    <View style={styles.list}>
      {services.map((service) => {
        const isSelected = selectedId === service.id.toString();
        const iconUrl = service.icono
          ? service.icono.startsWith("http")
            ? service.icono
            : `${BASE_URL.toString().replace("/api", "")}storage/${service.icono}`
          : null;

        return (
          <TouchableOpacity
            key={service.id}
            style={[styles.card, isSelected && styles.cardActive]}
            onPress={() => onSelect(service)}
            activeOpacity={0.85}
          >
            <View style={[styles.iconBox, isSelected && styles.iconBoxActive]}>
              {iconUrl ? (
                <Image source={{ uri: iconUrl }} style={styles.img} />
              ) : (
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={20}
                  color={isSelected ? "#FFF" : "#FF5500"}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{service.nombre}</Text>
              <Text style={styles.detail}>
                Adicional: ${(service.precio || 0).toLocaleString("es-CO")}
              </Text>
            </View>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={22} color="#FF5500" />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(241,245,249,0.5)",
    borderRadius: 18,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardActive: {
    borderColor: "#FF5500",
    backgroundColor: "rgba(255,85,0,0.04)",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,85,0,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconBoxActive: {
    backgroundColor: "#FF5500",
  },
  img: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
  name: {
    fontSize: 16,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  detail: {
    fontSize: 12,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#64748B",
    marginTop: 2,
  },
  empty: {
    fontSize: 14,
    fontFamily: "MontserratRegular",
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 16,
  },
});
