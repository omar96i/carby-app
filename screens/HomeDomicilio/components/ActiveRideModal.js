import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function ActiveRideModal({ visible, onClose }) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <MaterialCommunityIcons name="bike-fast" size={40} color="#fa6205" />
          <Text style={styles.modalTitle}>Arrendamiento en Curso</Text>
          <Text style={styles.modalText}>Termina tu servicio actual.</Text>
          <TouchableOpacity style={styles.modalActionBtn} onPress={onClose}>
            <Text style={styles.modalActionText}>ENTENDIDO</Text>
          </TouchableOpacity>
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
  modalActionBtn: {
    backgroundColor: "#fa6205",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  modalActionText: {
    color: "#FFF",
    fontFamily: "Montserrat_700Bold",
  },
});
