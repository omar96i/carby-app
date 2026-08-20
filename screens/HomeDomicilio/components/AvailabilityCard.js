import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AvailabilityCard({ data, onSubscribe }) {
  const {
    total_permitido = 0,
    completadas = 0,
    cancelaciones = 0,
    usadas = 0,
    disponibles = 0,
  } = data || {};

  const progressAnim = useRef(new Animated.Value(0)).current;
  const total = Math.max(total_permitido, 1);
  const percentage = Math.min((usadas / total) * 100, 100);
  const isLow = disponibles > 0 && disponibles <= total * 0.2;
  const isEmpty = disponibles <= 0;

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
  const statusBg = isEmpty ? "rgba(255, 71, 87, 0.1)" : isLow ? "rgba(245, 158, 11, 0.1)" : "rgba(16, 185, 129, 0.1)";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: statusBg }]}>
          <Ionicons name="speedometer-outline" size={22} color={statusColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Tus viajes disponibles</Text>
          <Text style={styles.subtitle}>
            {isEmpty ? "No tienes viajes disponibles" : isLow ? "Te estás quedando sin viajes" : "Tienes viajes para realizar"}
          </Text>
        </View>
      </View>

      <View style={styles.numberRow}>
        <View style={styles.numberBlock}>
          <Text style={[styles.bigNumber, { color: statusColor }]}>{disponibles}</Text>
          <Text style={styles.numberLabel}>Disponibles</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.numberBlock}>
          <Text style={styles.bigNumberDark}>{usadas}</Text>
          <Text style={styles.numberLabel}>Usados</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.numberBlock}>
          <Text style={styles.bigNumberDark}>{total_permitido}</Text>
          <Text style={styles.numberLabel}>Permitidos</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: widthInterpolate, backgroundColor: statusColor }]} />
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailText}>
          <Text style={{ color: "#10B981", fontFamily: "Montserrat_700Bold" }}>{completadas}</Text> completados
        </Text>
        <Text style={styles.detailText}>
          <Text style={{ color: "#FF4757", fontFamily: "Montserrat_700Bold" }}>{cancelaciones}</Text> cancelados
        </Text>
      </View>

      {(isEmpty || isLow) && (
        <TouchableOpacity style={[styles.subscribeBtn, { backgroundColor: statusColor }]} onPress={onSubscribe} activeOpacity={0.8}>
          <Ionicons name="card-outline" size={18} color="#FFF" />
          <Text style={styles.subscribeText}>{isEmpty ? "Comprar suscripción" : "Recargar viajes"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    margin: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    color: "#1C1C1E",
  },
  subtitle: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  numberBlock: {
    flex: 1,
    alignItems: "center",
  },
  bigNumber: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 32,
  },
  bigNumberDark: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 28,
    color: "#1C1C1E",
  },
  numberLabel: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: "#E2E8F0",
  },
  progressTrack: {
    height: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  detailText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    color: "#64748B",
  },
  subscribeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  subscribeText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
});
