import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

const PAYMENT_LABELS = {
  efectivo: "Efectivo",
  nequi: "Nequi",
  bancolombia: "Bancolombia",
};

const PAYMENT_ICONS = {
  efectivo: "cash",
  nequi: "cellphone",
  bancolombia: "bank",
};

export default function PaymentSelector({ paymentMethod, onPress }) {
  const iconName = PAYMENT_ICONS[paymentMethod] || "credit-card";
  const label = PAYMENT_LABELS[paymentMethod] || "Metodo de pago";

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name={iconName}
          size={16}
          color="#09090b"
        />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={16} color="#a1a1aa" style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fafafa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    paddingHorizontal: 12,
    height: 48,
    minWidth: 130,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4e4e7",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#09090b",
    marginHorizontal: 8,
    marginTop: 2,
  },
});
