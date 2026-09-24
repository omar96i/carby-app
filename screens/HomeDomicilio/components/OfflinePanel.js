import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AvailabilitySummary from "./AvailabilitySummary";

export default function OfflinePanel({ availability, checkingSubscription, onConnect, onSubscribe }) {
  const { disponibles = 0 } = availability || {};
  const isEmpty = disponibles <= 0;

  return (
    <View style={styles.panel}>
      {/* Header */}
      <View style={styles.panelHeader}>
        <View style={styles.statusDot} />
        <Text style={styles.panelTitle}>Desconectado</Text>
        <Text style={styles.panelSub}>Activa tu disponibilidad para recibir arrendamientos</Text>
      </View>

      {/* Availability card */}
      <AvailabilitySummary availability={availability} />

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
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
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
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fa6205",
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
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
  emptyHint: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 12,
  },
});
