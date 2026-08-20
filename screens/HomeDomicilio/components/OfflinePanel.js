import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function OfflinePanel({ availability, checkingSubscription, onConnect, onSubscribe }) {
  const {
    total_permitido = 0,
    completadas = 0,
    cancelaciones = 0,
    usadas = 0,
    disponibles = 0,
  } = availability || {};

  const progressAnim = useRef(new Animated.Value(0)).current;
  const total = Math.max(total_permitido, 1);
  const percentage = Math.min((usadas / total) * 100, 100);
  const isEmpty = disponibles <= 0;
  const isLow = !isEmpty && disponibles <= total * 0.2;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: percentage,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const widthInterpolate = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const statusColor = isEmpty ? "#FF4757" : isLow ? "#F59E0B" : "#10B981";

  return (
    <View style={styles.panel}>
      {/* Header */}
      <View style={styles.panelHeader}>
        <View style={styles.statusDot} />
        <Text style={styles.panelTitle}>Desconectado</Text>
        <Text style={styles.panelSub}>Activa tu disponibilidad para recibir carreras</Text>
      </View>

      {/* Availability card */}
      <View style={styles.availabilityCard}>
        <View style={styles.availabilityHeader}>
          <MaterialCommunityIcons name="speedometer" size={22} color={statusColor} />
          <Text style={styles.availabilityTitle}>Viajes disponibles</Text>
        </View>

        <View style={styles.numbersRow}>
          <View style={styles.numberBox}>
            <Text style={[styles.bigNumber, { color: statusColor }]}>{disponibles}</Text>
            <Text style={styles.numberLabel}>Disponibles</Text>
          </View>
          <View style={styles.numberDivider} />
          <View style={styles.numberBox}>
            <Text style={[styles.bigNumber, { color: "#1C1C1E" }]}>{usadas}</Text>
            <Text style={styles.numberLabel}>Usados</Text>
          </View>
          <View style={styles.numberDivider} />
          <View style={styles.numberBox}>
            <Text style={[styles.bigNumber, { color: "#1C1C1E" }]}>{total_permitido}</Text>
            <Text style={styles.numberLabel}>Total</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: widthInterpolate, backgroundColor: statusColor }]} />
        </View>

        <View style={styles.miniStatsRow}>
          <Text style={styles.miniStat}>
            <Text style={{ color: "#10B981", fontFamily: "Montserrat_700Bold" }}>{completadas}</Text> completados
          </Text>
          <Text style={styles.miniStat}>
            <Text style={{ color: "#FF4757", fontFamily: "Montserrat_700Bold" }}>{cancelaciones}</Text> cancelados
          </Text>
        </View>
      </View>

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
  availabilityCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  availabilityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  availabilityTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
    color: "#1C1C1E",
  },
  numbersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  numberBox: {
    flex: 1,
    alignItems: "center",
  },
  bigNumber: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 30,
  },
  numberLabel: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  numberDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E2E8F0",
  },
  progressTrack: {
    height: 10,
    backgroundColor: "#E2E8F0",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  miniStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  miniStat: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    color: "#64748B",
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
