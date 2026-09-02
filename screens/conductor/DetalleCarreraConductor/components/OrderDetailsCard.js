import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function OrderDetailsCard({ pedido }) {
  if (!pedido) return null;

  const pedidoLists = pedido.pedido_lists || pedido.items || [];
  if (!pedidoLists.length) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Detalles de tu pedido #{pedido.id}</Text>
      <Text style={styles.section}>Productos</Text>

      <View style={styles.list}>
        {pedidoLists.map((prod, idx) => {
          const cantidad = parseInt(prod.cantidad || 0);
          const nombre = prod.producto?.nombre || prod.nombre || "Producto";
          const adicionales = prod.adicionales || prod.pedido_list_adicionals || [];

          return (
            <View key={idx} style={[styles.item, idx < pedidoLists.length - 1 && styles.itemBorder]}>
              <View style={styles.row}>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyText}>{cantidad}</Text>
                </View>
                <Text style={styles.name} numberOfLines={2}>
                  {nombre}
                </Text>
              </View>
              {adicionales.length > 0 &&
                adicionales.map((ad, j) => {
                  const adNombre = ad.producto_adicional?.nombre || ad.nombre || "Adicional";
                  return (
                    <View key={j} style={styles.extra}>
                      <Text style={styles.extraName}>+ {adNombre}</Text>
                    </View>
                  );
                })}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  title: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    color: "#0F172A",
    marginBottom: 12,
  },
  section: {
    fontSize: 11,
    fontFamily: "Montserrat_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#94A3B8",
    marginBottom: 10,
  },
  list: {
    gap: 10,
  },
  item: {
    paddingBottom: 10,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  qtyBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#FFF0E8",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  qtyText: {
    fontSize: 12,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#FF5500",
  },
  name: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
    lineHeight: 18,
  },
  extra: {
    marginTop: 6,
    paddingLeft: 34,
  },
  extraName: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#64748B",
  },
});
