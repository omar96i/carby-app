import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import Modal from "react-native-modal";

export const ShareLiveModal = ({ visible, onClose, onActivate }) => {
  return (
    <Modal isVisible={visible} backdropOpacity={0.5} onBackdropPress={onClose} animationIn="fadeInUp" animationOut="fadeOutDown">
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Feather name="radio" size={28} color="#FF5500" />
        </View>
        <Text style={styles.title}>Compartir ubicación en vivo</Text>
        <Text style={styles.subtitle}>
          Activa esta función para que tu conductor pueda ver tu ubicación en tiempo real mientras esperas.
        </Text>
        <Text style={styles.note}>
          Tu ubicación se enviará de forma segura cada pocos segundos y se detendrá cuando la desactives.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={onActivate} activeOpacity={0.8}>
          <Text style={styles.btnText}>Activar ahora</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  note: {
    fontSize: 12,
    fontFamily: "Montserrat",
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 12,
  },
  btn: {
    width: "100%",
    marginTop: 20,
    backgroundColor: "#FF5500",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});
