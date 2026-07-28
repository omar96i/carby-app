import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, formatCOP } from "./helpers";

export default function ProductList({ pedidoLists, compact = false }) {
  if (!pedidoLists || !pedidoLists.length) return null;

  const totalItems = pedidoLists.reduce((sum, p) => sum + (p.cantidad || 0), 0);

  return (
    <View style={s.container}>
      {!compact && (
        <View style={s.header}>
          <Text style={s.headerLabel}>PRODUCTOS</Text>
          <Text style={s.headerCount}>{totalItems} art.</Text>
        </View>
      )}
      {pedidoLists.map((prod, idx) => {
        const precio = parseFloat(prod.producto?.precio || prod.precio_unitario || prod.precio || 0);
        const cantidad = parseInt(prod.cantidad || 0);
        const nombre = prod.producto?.nombre || prod.producto?.name || prod.nombre || "Producto";
        const subtotal = precio * cantidad;
        const adicionales = prod.adicionales || prod.pedido_list_adicionals || [];

        return (
          <View key={idx} style={[s.item, idx < pedidoLists.length - 1 && s.itemBorder]}>
            <View style={s.row}>
              <View style={s.qtyBadge}>
                <Text style={s.qtyText}>{cantidad}</Text>
              </View>
              <Text style={s.name} numberOfLines={compact ? 1 : 2}>{nombre}</Text>
              <Text style={s.price}>{formatCOP(subtotal)}</Text>
            </View>
            {adicionales.length > 0 && adicionales.map((ad, j) => {
              const adPrecio = parseFloat(ad.producto_adicional?.precio || ad.precio || 0);
              const adCant = parseInt(ad.cantidad || 0);
              const adSubtotal = adPrecio * adCant;
              const adNombre = ad.producto_adicional?.nombre || ad.nombre || ad.name || "Adicional";
              return (
                <View key={j} style={s.extra}>
                  <Text style={s.extraName}>+ {adNombre}</Text>
                  <Text style={s.extraPrice}>{formatCOP(adSubtotal)}</Text>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: COLORS.zinc50,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 10,
    fontFamily: "Montserrat_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: COLORS.muted,
  },
  headerCount: {
    fontSize: 10,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.brand,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  item: {
    paddingBottom: 10,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.zinc200,
    borderStyle: "dashed",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  qtyBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: COLORS.brandSoft,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  qtyText: {
    fontSize: 11,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.brand,
  },
  name: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    color: COLORS.ink,
  },
  price: {
    fontSize: 13,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.ink,
  },
  extra: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginLeft: 28,
    marginTop: 4,
  },
  extraName: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: COLORS.muted,
  },
  extraPrice: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: COLORS.muted,
  },
});
