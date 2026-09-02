import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../utils";

const Star = ({ filled, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.starBtn} activeOpacity={0.7}>
    <Ionicons name={filled ? "star" : "star-outline"} size={34} color={filled ? "#F59E0B" : "#E2E8F0"} />
  </TouchableOpacity>
);

export const FinishedSheet = ({ tripData, driverName, onDone, loading, onTypingChange }) => {
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const cost = tripData?.costo;
  const firstName = driverName ? driverName.split(" ")[0] : "conductor";

  const handleDone = () => {
    onTypingChange?.(false);
    onDone({ rating, message });
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Feather name="check" size={36} color="#10B981" />
        </View>
        <Text style={styles.title}>Viaje finalizado</Text>
        <Text style={styles.subtitle}>
          Esperamos que hayas tenido un gran viaje con {firstName}.
        </Text>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total pagado</Text>
          <Text style={styles.totalValue}>{formatCurrency(cost)}</Text>
        </View>

        <Text style={styles.rateLabel}>Califica tu experiencia</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} filled={n <= rating} onPress={() => setRating(n)} />
          ))}
        </View>

        <TextInput
          style={styles.messageInput}
          placeholder="Comentario opcional..."
          placeholderTextColor="#94A3B8"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
          editable={!loading}
          onFocus={() => onTypingChange?.(true)}
          onBlur={() => onTypingChange?.(false)}
        />

        <TouchableOpacity
          style={[styles.doneBtn, loading && styles.doneBtnDisabled]}
          onPress={handleDone}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.doneText}>Listo</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 20,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: "center",
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 20,
  },
  totalBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    width: "100%",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#64748B",
  },
  totalValue: {
    fontSize: 22,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
  },
  rateLabel: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 20,
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  starBtn: {
    padding: 4,
  },
  starFilled: {
    fill: "#F59E0B",
  },
  messageInput: {
    width: "100%",
    minHeight: 70,
    maxHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#0F172A",
    textAlignVertical: "top",
    marginTop: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  doneBtn: {
    width: "100%",
    marginTop: 16,
    backgroundColor: "#FF5500",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  doneBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
  doneText: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});
