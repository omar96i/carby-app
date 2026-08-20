import React from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Modal } from "react-native";

export const PinModal = ({ visible, pin, enteredPin, setEnteredPin, pinError, success, onClose, onVerify }) => {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          {!success ? (
            <>
              <Text style={styles.title}>Código PIN</Text>
              <Text style={styles.subtitle}>Solicita el código al cliente</Text>
              <TextInput
                style={[styles.input, pinError && styles.inputError]}
                placeholder="####"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
                value={enteredPin}
                onChangeText={setEnteredPin}
              />
              {pinError && <Text style={styles.errorText}>PIN incorrecto</Text>}
              <View style={styles.row}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.verifyBtn} onPress={onVerify} activeOpacity={0.8}>
                  <Text style={styles.verifyText}>Verificar</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.title}>¡Entregado!</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    width: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#64748B",
    marginBottom: 18,
  },
  input: {
    width: "80%",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    fontSize: 24,
    textAlign: "center",
    padding: 12,
    letterSpacing: 6,
    color: "#0F172A",
    marginBottom: 12,
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#FF4757",
    color: "#FF4757",
  },
  errorText: {
    color: "#FF4757",
    fontSize: 12,
    marginBottom: 12,
    fontFamily: "Montserrat",
  },
  row: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
  },
  cancelText: {
    color: "#0F172A",
    fontFamily: "MontserratBold",
    fontWeight: "bold",
  },
  verifyBtn: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    backgroundColor: "#FF5500",
    borderRadius: 14,
  },
  verifyText: {
    color: "#FFFFFF",
    fontFamily: "MontserratBold",
    fontWeight: "bold",
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 20,
  },
  successIcon: {
    fontSize: 48,
    color: "#10B981",
    marginBottom: 10,
  },
});
