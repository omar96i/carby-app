import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatPrice } from "../utils";

export default function OrderDetails({ pedido }) {
  const [expanded, setExpanded] = useState(false);

  if (!pedido) return null;

  const comercio = pedido.comercio;
  const items = pedido.pedido_lists || [];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="store" size={18} color="#fa6205" />
          </View>
          <View>
            <Text style={styles.title}>Incluye pedido</Text>
            {comercio?.establecimiento_nombre && (
              <Text style={styles.subtitle} numberOfLines={1}>{comercio.establecimiento_nombre}</Text>
            )}
          </View>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#666" />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {comercio && (
            <View style={styles.commerceBox}>
              <Text style={styles.commerceName}>{comercio.establecimiento_nombre}</Text>
              {comercio.direccion_principal && (
                <Text style={styles.commerceText}>{comercio.direccion_principal}</Text>
              )}
              {comercio.numero_telefono && (
                <Text style={styles.commerceText}>Tel: {comercio.numero_telefono}</Text>
              )}
            </View>
          )}

          <Text style={styles.itemsTitle}>Items</Text>
          {items.map((item) => (
            <View key={item.id?.toString()} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.cantidad}x</Text>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.producto?.nombre || "Producto"}
              </Text>
              <Text style={styles.itemPrice}>{formatPrice(item.producto?.precio)}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total pedido</Text>
            <Text style={styles.totalPrice}>{formatPrice(pedido.costo_total)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF8F5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(250, 98, 5, 0.15)",
    overflow: "hidden",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(250, 98, 5, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  title: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    color: "#1C1C1E",
  },
  subtitle: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  commerceBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  commerceName: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    color: "#1C1C1E",
    marginBottom: 4,
  },
  commerceText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: "#555",
    marginTop: 2,
  },
  itemsTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  itemQty: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
    color: "#fa6205",
    width: 28,
  },
  itemName: {
    flex: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 13,
    color: "#333",
  },
  itemPrice: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    color: "#666",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(250, 98, 5, 0.2)",
  },
  totalLabel: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    color: "#1C1C1E",
  },
  totalPrice: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    color: "#fa6205",
  },
});
