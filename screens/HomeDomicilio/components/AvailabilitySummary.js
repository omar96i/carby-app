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

export default function AvailabilitySummary({ availability, loading, onRefresh }) {
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
    <View style={styles.availabilityCard}>
      <View style={styles.availabilityHeader}>
        <MaterialCommunityIcons name="speedometer" size={22} color={statusColor} />
        <Text style={styles.availabilityTitle}>Viajes disponibles</Text>
        {onRefresh && (
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.7}>
            {loading ? (
              <ActivityIndicator size="small" color="#64748B" />
            ) : (
              <Ionicons name="refresh" size={16} color="#64748B" />
            )}
          </TouchableOpacity>
        )}
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
  );
}

const styles = StyleSheet.create({
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
    flex: 1,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
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
});
