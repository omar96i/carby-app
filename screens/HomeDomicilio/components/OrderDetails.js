import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatPrice, getCommerceImageUrl, getProductImageUrl, getAdicionalImageUrl } from "../utils";

export default function OrderDetails({ pedido }) {
  const [expanded, setExpanded] = useState(false);

  if (!pedido) return null;

  const comercio = pedido.comercio;
  const items = pedido.pedido_lists || [];
  const commerceImageUrl = getCommerceImageUrl(comercio);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            {commerceImageUrl ? (
              <Image source={{ uri: commerceImageUrl }} style={styles.commerceImage} resizeMode="cover" />
            ) : (
              <MaterialCommunityIcons name="store" size={18} color="#fa6205" />
            )}
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
          {items.map((item) => {
            const productImageUrl = getProductImageUrl(item.producto);
            const adicionales = item.pedido_list_adicionals || [];
            return (
              <View key={item.id?.toString()} style={styles.itemBlock}>
                <View style={styles.itemRow}>
                  {productImageUrl ? (
                    <Image source={{ uri: productImageUrl }} style={styles.productImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.productImageFallback}>
                      <Ionicons name="cube" size={14} color="#fa6205" />
                    </View>
                  )}
                  <Text style={styles.itemQty}>{item.cantidad}x</Text>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.producto?.nombre || "Producto"}
                  </Text>
                  <Text style={styles.itemPrice}>{formatPrice(item.producto?.precio)}</Text>
                </View>
                {adicionales.length > 0 && (
                  <View style={styles.adicionalesBox}>
                    {adicionales.map((adicionalItem) => {
                      const adicional = adicionalItem.producto_adicional;
                      const adicionalImageUrl = getAdicionalImageUrl(adicional);
                      return (
                        <View key={adicionalItem.id?.toString()} style={styles.adicionalRow}>
                          {adicionalImageUrl ? (
                            <Image source={{ uri: adicionalImageUrl }} style={styles.adicionalImage} resizeMode="cover" />
                          ) : (
                            <View style={styles.adicionalImageFallback}>
                              <Ionicons name="add-circle" size={10} color="#fa6205" />
                            </View>
                          )}
                          <Text style={styles.adicionalName} numberOfLines={1}>
                            + {adicional?.nombre || "Adicional"}
                          </Text>
                          <Text style={styles.adicionalPrice}>{formatPrice(adicional?.precio)}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}

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
    overflow: "hidden",
  },
  commerceImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  itemBlock: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  productImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#E2E8F0",
  },
  productImageFallback: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(250, 98, 5, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
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
  adicionalesBox: {
    marginTop: 6,
    paddingLeft: 40,
  },
  adicionalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  adicionalImage: {
    width: 22,
    height: 22,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: "#E2E8F0",
  },
  adicionalImageFallback: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(250, 98, 5, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  adicionalName: {
    flex: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    color: "#666",
  },
  adicionalPrice: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
    color: "#888",
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
