import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { iconoDeCategoria } from "../../../components/IconoVehiculo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AvailabilitySummary from "./AvailabilitySummary";

export default function OfflinePanel({ availability, checkingSubscription, vehicleTypeNames = [], onConnect, onSubscribe }) {
  const { disponibles = 0 } = availability || {};
  const isEmpty = disponibles <= 0;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.panel, { bottom: 104 + insets.bottom }]}>
      {/* Header */}
      <View style={styles.panelHeader}>
        <View style={styles.statusDot} />
        <Text style={styles.panelTitle}>Desconectado</Text>
        <Text style={styles.panelSub}>Activa tu disponibilidad para recibir arrendamientos</Text>
      </View>

      {/* Availability card */}
      <AvailabilitySummary availability={availability} />

      {/* Vehicle types (sutil) */}
      {vehicleTypeNames.length > 0 && (
        <View style={styles.vehicleRow}>
          <View style={styles.vehiclePill}>
            {iconoDeCategoria(vehicleTypeNames[0]) ? (
              <MaterialCommunityIcons name={iconoDeCategoria(vehicleTypeNames[0])} size={16} color="#1C1C1E" />
            ) : (
              <Ionicons name="car-outline" size={14} color="#1C1C1E" />
            )}
            <Text style={styles.vehicleText} numberOfLines={1}>
              {vehicleTypeNames.join("  ·  ")}
            </Text>
          </View>
        </View>
      )}

      {/* Connect button */}
      <TouchableOpacity
        style={[styles.connectButton, isEmpty && styles.connectButtonDisabled]}
        onPress={isEmpty ? onSubscribe : onConnect}
        disabled={checkingSubscription}
        activeOpacity={0.8}
      >
        {checkingSubscription ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Ionicons name={isEmpty ? "card-outline" : "power"} size={22} color="#FFF" />
            <Text style={styles.connectButtonText}>
              {isEmpty ? "Comprar suscripción" : "CONECTARSE"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {isEmpty && (
        <Text style={styles.emptyHint}>No tienes viajes disponibles. Compra una suscripción para continuar.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 20,
    zIndex: 25,
  },
  panelHeader: {
    alignItems: "center",
    marginBottom: 18,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF4757",
    marginBottom: 8,
  },
  panelTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    color: "#1C1C1E",
  },
  panelSub: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12.5,
    color: "#71717A",
    marginTop: 4,
    textAlign: "center",
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fa6205",
    height: 56,
    borderRadius: 28,
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  connectButtonDisabled: {
    backgroundColor: "#94A3B8",
    shadowColor: "#94A3B8",
  },
  connectButtonText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  vehicleRow: {
    alignItems: "center",
    marginBottom: 14,
  },
  vehiclePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 30,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: "#F4F4F5",
    maxWidth: "100%",
  },
  vehicleText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
    color: "#1C1C1E",
    flexShrink: 1,
  },
  emptyHint: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: "#71717A",
    textAlign: "center",
    marginTop: 12,
  },
});
