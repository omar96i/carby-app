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
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={iconName} size={17} color="#1C1C1E" />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={15} color="#71717A" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F4F5",
    borderRadius: 999,
    paddingLeft: 6,
    paddingRight: 16,
    height: 56,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
    marginHorizontal: 12,
  },
});
