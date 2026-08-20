import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function SubscriptionModal({ visible, onClose, onGoToSubscriptions }) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <MaterialCommunityIcons name="wallet-membership" size={40} color="#FFD700" />
          <Text style={styles.modalTitle}>Suscripción Requerida</Text>
          <Text style={styles.modalText}>Para recibir carreras necesitas un plan activo.</Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.subscribeButton]} onPress={onGoToSubscriptions}>
              <Text style={styles.subscribeButtonText}>Ver Planes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#FFFFFF",
    padding: 25,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fa6205",
  },
  modalTitle: {
    color: "#1C1C1E",
    fontSize: 20,
    fontFamily: "Montserrat_700Bold",
    marginTop: 15,
    marginBottom: 10,
  },
  modalText: {
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Montserrat_400Regular",
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 20,
    width: "100%",
    justifyContent: "space-between",
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#fa6205",
  },
  cancelButtonText: {
    color: "#fa6205",
    fontFamily: "Montserrat_600SemiBold",
  },
  subscribeButton: {
    backgroundColor: "#fa6205",
  },
  subscribeButtonText: {
    color: "#FFF",
    fontFamily: "Montserrat_700Bold",
  },
});
