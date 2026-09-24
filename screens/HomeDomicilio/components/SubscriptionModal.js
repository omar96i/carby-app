import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

export default function SubscriptionModal({ visible, onClose, onGoToSubscriptions }) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="crown" size={48} color="#fa6205" />
          </View>

          <Text style={styles.title}>¡Activa tu plan y sigue rodando!</Text>
          <Text style={styles.subtitle}>
            Para recibir arrendamientos necesitas un plan activo. Con tu suscripción desbloqueas:
          </Text>

          <View style={styles.benefits}>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Viajes disponibles sin interrupciones</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Prioridad en arrendamientos cercanos</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Mejores ganancias cada día</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={onGoToSubscriptions} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Ver planes</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.secondaryBtnText}>Ahora no</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(250, 98, 5, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: "#1C1C1E",
    fontSize: 22,
    fontFamily: "Montserrat_700Bold",
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 28,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  benefits: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 10,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  benefitText: {
    color: "#334155",
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    flex: 1,
  },
  primaryBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fa6205",
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 12,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secondaryBtnText: {
    color: "#94A3B8",
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
  },
});
