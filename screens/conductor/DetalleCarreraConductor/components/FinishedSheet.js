import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../utils";

const Star = ({ filled, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.starBtn} activeOpacity={0.7}>
    <Ionicons name={filled ? "star" : "star-outline"} size={32} color={filled ? "#F59E0B" : "#E2E8F0"} />
  </TouchableOpacity>
);

export const FinishedSheet = ({ tripData, clientName, onDone, loading }) => {
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const earning = tripData?.costo || 0;

  const handleDone = () => {
    onDone({ rating, message });
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Feather name="check" size={36} color="#10B981" />
        </View>
        <Text style={styles.title}>Carrera finalizada</Text>
        <Text style={styles.subtitle}>El PIN fue verificado y el pago quedó confirmado.</Text>

        <View style={styles.earningBox}>
          <Text style={styles.earningLabel}>Ganancia del viaje</Text>
          <Text style={styles.earningValue}>{formatCurrency(earning)}</Text>
        </View>

        <Text style={styles.rateLabel}>Califica al pasajero</Text>
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
        />

        <TouchableOpacity style={[styles.doneBtn, loading && styles.doneBtnDisabled]} onPress={handleDone} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.doneText}>Buscar nueva carrera</Text>}
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
  earningBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  earningLabel: {
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#64748B",
  },
  earningValue: {
    fontSize: 22,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#10B981",
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
  messageInput: {
    width: "100%",
    minHeight: 70,
    maxHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#0F172A",
    textAlignVertical: "top",
    marginTop: 14,
  },
  doneBtn: {
    width: "100%",
    marginTop: 16,
    backgroundColor: "#FF5500",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
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
