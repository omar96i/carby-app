import React from "react";
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function AcceptModal({ visible, step, errorMsg, onClose, onConfirm }) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={() => { if (step === "error" || step === "confirm") onClose(); }}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { borderColor: step === "error" ? "#FF4757" : "#fa6205" }]}>
          {step === "confirm" && (
            <>
              <MaterialCommunityIcons name="help-circle-outline" size={50} color="#fa6205" />
              <Text style={styles.modalTitle}>¿Aceptar Arrendamiento?</Text>
              <Text style={styles.modalText}>El servicio se asignará a tu cuenta inmediatamente.</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.subscribeButton]} onPress={onConfirm}>
                  <Text style={styles.subscribeButtonText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === "loading" && (
            <>
              <ActivityIndicator size="large" color="#fa6205" style={{ marginVertical: 20 }} />
              <Text style={styles.modalTitle}>Procesando...</Text>
              <Text style={styles.modalText}>Validando disponibilidad del arrendamiento.</Text>
            </>
          )}

          {step === "success" && (
            <>
              <MaterialCommunityIcons name="check-circle" size={50} color="#fa6205" />
              <Text style={styles.modalTitle}>¡Arrendamiento Asignado!</Text>
              <Text style={styles.modalText}>Prepárate para recoger el pedido.</Text>
            </>
          )}

          {step === "error" && (
            <>
              <MaterialCommunityIcons name="close-circle" size={50} color="#FF4757" />
              <Text style={[styles.modalTitle, { color: "#FF4757" }]}>No se pudo aceptar</Text>
              <Text style={styles.modalText}>{errorMsg}</Text>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#fa6205", marginTop: 10 }]} onPress={onClose}>
                <Text style={[styles.modalActionText, { color: "#fa6205" }]}>Cerrar</Text>
              </TouchableOpacity>
            </>
          )}
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
