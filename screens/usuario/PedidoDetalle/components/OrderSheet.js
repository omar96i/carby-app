import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  Linking,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatCurrency, formatDate, metodoPagoLabel, parseJSON, getOrderCoords, calculateProductsTotal, calculateDeliveryCost } from "../utils";
import OrderStatusStepper from "../../../../components/OrderStatusStepper";

const { height: SCREEN_H } = Dimensions.get("window");
const COLLAPSED_H = 130;
const EXPANDED_H = SCREEN_H * 0.76;

const RESTO_STATUS = {
  pendiente: { label: "Pendiente", tone: "amber" },
  aceptado: { label: "En preparación", tone: "primary" },
  confirmado: { label: "En preparación", tone: "primary" },
  preparado: { label: "En preparación", tone: "primary" },
  completado: { label: "Listo", tone: "emerald" },
  en_camino: { label: "Entregado al repartidor", tone: "emerald" },
  entregado: { label: "Completado", tone: "emerald" },
  cancelado: { label: "Cancelado", tone: "muted" },
};

const COURIER_STATUS = {
  pendiente: { label: "Buscando repartidor", tone: "muted" },
  aceptado: { label: "Repartidor asignado", tone: "emerald" },
  confirmado: { label: "Repartidor asignado", tone: "emerald" },
  preparado: { label: "Repartidor asignado", tone: "emerald" },
  completado: { label: "Esperando repartidor", tone: "primary" },
  en_camino: { label: "En camino a ti", tone: "primary" },
  entregado: { label: "Entregado", tone: "emerald" },
  cancelado: { label: "Cancelado", tone: "muted" },
};

export const OrderSheet = ({
  pedido,
  currentKey,
  onOpenChat,
  onOpenEvidence,
  onCancel,
}) => {
  const [expanded, setExpanded] = useState(false);
  const heightAnim = useRef(new Animated.Value(COLLAPSED_H)).current;
  const compactOpacity = useRef(new Animated.Value(1)).current;
  const expandedOpacity = useRef(new Animated.Value(0)).current;

  const comercio = pedido?.comercio;
  const comercioName = comercio?.establecimiento_nombre || comercio?.nombre || "Comercio";
  const phone = comercio?.numero_telefono;
  const metodo = metodoPagoLabel(pedido?.metodo_pago);
  const coords = getOrderCoords(pedido);
  const productsTotal = calculateProductsTotal(pedido?.pedido_lists);
  const deliveryCost = calculateDeliveryCost(pedido);
  const orderTotal = parseFloat(pedido?.costo_total || 0);
  const driver = pedido?.conductor || pedido?.carrera?.conductor;
  const isFinished = ["entregado", "cancelado"].includes(currentKey);
  const canCancel = !isFinished && currentKey !== "en_camino";
  const courierAssigned = !!driver && ["aceptado", "confirmado", "preparado", "completado", "en_camino", "entregado"].includes(currentKey);

  const restoSub = RESTO_STATUS[currentKey] || RESTO_STATUS.pendiente;
  const courierSub = COURIER_STATUS[currentKey] || COURIER_STATUS.pendiente;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heightAnim, {
        toValue: expanded ? EXPANDED_H : COLLAPSED_H,
        useNativeDriver: false,
        friction: 9,
        tension: 60,
      }),
      Animated.timing(compactOpacity, { toValue: expanded ? 0 : 1, duration: 200, useNativeDriver: true }),
      Animated.timing(expandedOpacity, { toValue: expanded ? 1 : 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [expanded]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        const base = expanded ? EXPANDED_H : COLLAPSED_H;
        heightAnim.setValue(Math.max(COLLAPSED_H, base - g.dy));
      },
      onPanResponderRelease: (_, g) => {
        const tap = Math.abs(g.dy) < 10 && Math.abs(g.dx) < 10;
        if (tap) return setExpanded(!expanded);
        if (expanded) {
          if (g.dy > 80 || (g.vy || 0) > 0.5) setExpanded(false);
          else setExpanded(true);
        } else {
          if (g.dy < -80 || (g.vy || 0) < -0.5) setExpanded(true);
          else setExpanded(false);
        }
      },
    })
  ).current;

  const handleCallCommerce = () => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleCallDriver = () => {
    if (driver?.numero_telefono) Linking.openURL(`tel:${driver.numero_telefono}`);
  };

  const renderToneBox = (tone, label, sub) => {
    const colors = {
      amber: { bg: "#FFFBEB", border: "#FCD34D", text: "#B45309" },
      primary: { bg: "#FDEEE2", border: "rgba(255,85,0,0.2)", text: "#FF5500" },
      emerald: { bg: "#ECFDF5", border: "rgba(16,185,129,0.2)", text: "#047857" },
      muted: { bg: "#F4F4F5", border: "#E4E4E7", text: "#52525B" },
    };
    const c = colors[tone] || colors.muted;
    return (
      <View style={[styles.toneBox, { backgroundColor: c.bg, borderColor: c.border }]}>
        <Text style={[styles.toneLabel, { color: "#64748B" }]}>{sub}</Text>
        <Text style={[styles.toneValue, { color: c.text }]}>{label}</Text>
      </View>
    );
  };

  return (
    <Animated.View style={[styles.sheet, { height: heightAnim }]}>
      <View style={styles.header} {...panResponder.panHandlers}>
        <View style={styles.handle} />
        <Animated.View style={[styles.collapsedRow, { opacity: compactOpacity }]}>
          <View style={styles.commerceIcon}>
            <Ionicons name="cube" size={20} color="#FF5500" />
          </View>
          <View style={styles.collapsedTextBox}>
            <Text style={styles.collapsedName} numberOfLines={1}>{comercioName}</Text>
            <Text style={styles.collapsedSub}>Pedido #{pedido?.id} · {formatDate(pedido?.created_at)}</Text>
          </View>
          <Feather name="chevron-up" size={20} color="#64748B" />
        </Animated.View>
      </View>

      <Animated.View style={[styles.expandedContent, { opacity: expandedOpacity }]} pointerEvents={expanded ? "auto" : "none"}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Store header */}
          <View style={styles.storeHeader}>
            <View style={styles.commerceIconLarge}>
              <Ionicons name="storefront" size={24} color="#FF5500" />
            </View>
            <View style={styles.storeTextBox}>
              <Text style={styles.storeName} numberOfLines={1}>{comercioName}</Text>
              <Text style={styles.storeAddress} numberOfLines={1}>{coords?.startAddress || comercio?.direccion || "Dirección del comercio"}</Text>
            </View>
          </View>

          {/* Dual status */}
          <View style={styles.dualStatusRow}>
            {renderToneBox(restoSub.tone, restoSub.label, "Restaurante")}
            {renderToneBox(courierSub.tone, courierSub.label, "Repartidor")}
          </View>

          {/* Courier or searching */}
          {courierAssigned ? (
            <View style={styles.courierCard}>
              <View style={styles.courierAvatarBox}>
                <Ionicons name="person" size={22} color="#FF5500" />
              </View>
              <View style={styles.courierInfo}>
                <Text style={styles.courierName}>{driver.nombre_completo || "Repartidor"}</Text>
                <Text style={styles.courierVehicle}>{driver.tipo_usuario || "Moto"}</Text>
                <Text style={styles.courierPlate}>{driver.placa || ""}</Text>
              </View>
              <TouchableOpacity style={styles.callBtn} onPress={handleCallDriver} activeOpacity={0.8}>
                <Feather name="phone" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.searchingCard}>
              <View style={styles.searchingIconBox}>
                <View style={styles.sonarRing} />
                <View style={styles.searchingIcon}>
                  <MaterialCommunityIcons name="motorbike" size={20} color="#FF5500" />
                </View>
              </View>
              <View style={styles.searchingTextBox}>
                <Text style={styles.searchingTitle}>Buscando repartidor cercano</Text>
                <Text style={styles.searchingSub}>Te asignaremos uno apenas el restaurante confirme.</Text>
              </View>
            </View>
          )}

          {/* Timeline */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Estado del pedido</Text>
            <OrderStatusStepper
              steps={[
                { key: "pendiente", label: "Pendiente", icon: "clock-o" },
                { key: "aceptado", label: "Aceptado", icon: "thumbs-up" },
                { key: "confirmado", label: "Confirmado", icon: "check" },
                { key: "preparado", label: "Preparado", icon: "cutlery" },
                { key: "completado", label: "Listo", icon: "shopping-bag" },
                { key: "en_camino", label: "En camino", icon: "motorcycle" },
                { key: "entregado", label: "Entregado", icon: "check" },
              ]}
              currentStatus={currentKey}
            />
          </View>

          {/* Delivery address */}
          <View style={styles.addressCard}>
            <Feather name="map-pin" size={20} color="#FF5500" style={{ marginTop: 2 }} />
            <View style={styles.addressTextBox}>
              <Text style={styles.addressLabel}>Entregar en</Text>
              <Text style={styles.addressValue}>{coords?.endAddress || pedido?.destino || "No disponible"}</Text>
            </View>
            <Feather name="navigation" size={16} color="#94A3B8" />
          </View>

          {/* Order items + total */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tu pedido</Text>
            {(pedido?.pedido_lists || []).map((it, idx) => {
              const precio = parseFloat(it.producto?.precio || it.precio_unitario || it.precio || 0);
              const cantidad = parseInt(it.cantidad || 0);
              const nombre = it.producto?.nombre || it.producto?.name || it.nombre || "Producto";
              return (
                <View key={idx} style={[styles.itemRow, idx < (pedido?.pedido_lists || []).length - 1 && styles.itemBorder]}>
                  <Text style={styles.itemName}>
                    <Text style={styles.itemQty}>{cantidad}x</Text> {nombre}
                  </Text>
                  <Text style={styles.itemPrice}>{formatCurrency(precio * cantidad)}</Text>
                </View>
              );
            })}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Productos</Text>
              <Text style={styles.summaryValue}>{formatCurrency(productsTotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Domicilio</Text>
              <Text style={styles.summaryValue}>{formatCurrency(deliveryCost)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(orderTotal)}</Text>
            </View>
          </View>

          {/* Payment */}
          <View style={styles.paymentCard}>
            <View>
              <Text style={styles.paymentLabel}>Método de pago</Text>
              <Text style={styles.paymentValue}>{metodo}</Text>
            </View>
            <Text style={[styles.paymentStatus, pedido?.estado_pago === "aprobado" && styles.paymentStatusPaid]}>
              {pedido?.estado_pago === "aprobado" ? "Pagado" : "Pendiente"}
            </Text>
          </View>

          {/* PIN */}
          {pedido?.pin && (
            <View style={styles.pinCard}>
              <View>
                <Text style={styles.pinLabel}>PIN de entrega</Text>
                <Text style={styles.pinSub}>Compártelo al recibir tu pedido</Text>
              </View>
              <View style={styles.pinDigits}>
                {String(pedido.pin).split("").map((d, i) => (
                  <View key={i} style={styles.pinDigit}>
                    <Text style={styles.pinDigitText}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={onOpenChat} activeOpacity={0.8}>
              <Feather name="message-circle" size={18} color="#3B82F6" />
              <Text style={styles.actionText}>Chat</Text>
            </TouchableOpacity>

            {pedido?.metodo_pago?.toLowerCase() === "qr" && pedido?.estado_pago !== "aprobado" && (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={onOpenEvidence} activeOpacity={0.8}>
                <Feather name="image" size={18} color="#FF5500" />
                <Text style={[styles.actionText, styles.actionTextOutline]}>Evidencia</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Commerce contact */}
          <TouchableOpacity style={styles.commerceContactRow} onPress={handleCallCommerce} activeOpacity={0.8}>
            <Feather name="phone" size={16} color="#64748B" />
            <Text style={styles.commerceContactText}>Llamar al comercio</Text>
            <Feather name="chevron-right" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {canCancel && (
            <TouchableOpacity style={styles.cancelLink} onPress={onCancel} activeOpacity={0.8}>
              <Text style={styles.cancelLinkText}>Cancelar pedido</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 20,
    overflow: "hidden",
  },
  header: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginTop: 2,
    marginBottom: 10,
  },
  collapsedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  commerceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FDEEE2",
    justifyContent: "center",
    alignItems: "center",
  },
  collapsedTextBox: {
    flex: 1,
  },
  collapsedName: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  collapsedSub: {
    fontSize: 12,
    fontFamily: "Montserrat",
    color: "#64748B",
    marginTop: 3,
  },
  expandedContent: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  commerceIconLarge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#FDEEE2",
    justifyContent: "center",
    alignItems: "center",
  },
  storeTextBox: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  storeAddress: {
    fontSize: 12,
    fontFamily: "Montserrat",
    color: "#64748B",
    marginTop: 2,
  },
  dualStatusRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  toneBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  toneLabel: {
    fontSize: 9,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  toneValue: {
    fontSize: 13,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
  },
  courierCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 12,
  },
  courierAvatarBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FDEEE2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FF5500",
  },
  courierInfo: {
    flex: 1,
  },
  courierName: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  courierVehicle: {
    fontSize: 12,
    fontFamily: "Montserrat",
    color: "#64748B",
    marginTop: 2,
  },
  courierPlate: {
    fontSize: 12,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 2,
  },
  callBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  searchingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 14,
  },
  searchingIconBox: {
    width: 54,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  sonarRing: {
    position: "absolute",
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: "rgba(255,85,0,0.35)",
  },
  searchingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FDEEE2",
    justifyContent: "center",
    alignItems: "center",
  },
  searchingTextBox: {
    flex: 1,
  },
  searchingTitle: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  searchingSub: {
    fontSize: 12,
    fontFamily: "Montserrat",
    color: "#64748B",
    marginTop: 3,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 14,
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 14,
  },
  addressTextBox: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 10,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  addressValue: {
    fontSize: 13,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 3,
    lineHeight: 18,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#0F172A",
    marginRight: 12,
  },
  itemQty: {
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
  },
  itemPrice: {
    fontSize: 13,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#64748B",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#64748B",
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  totalValue: {
    fontSize: 20,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
  },
  paymentCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 14,
  },
  paymentLabel: {
    fontSize: 10,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  paymentValue: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 3,
  },
  paymentStatus: {
    fontSize: 12,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#F59E0B",
  },
  paymentStatusPaid: {
    color: "#10B981",
  },
  pinCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,85,0,0.2)",
    backgroundColor: "#FDEEE2",
    padding: 14,
  },
  pinLabel: {
    fontSize: 11,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pinSub: {
    fontSize: 11,
    fontFamily: "Montserrat",
    color: "#C2410C",
    marginTop: 2,
  },
  pinDigits: {
    flexDirection: "row",
    gap: 6,
  },
  pinDigit: {
    width: 32,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,85,0,0.2)",
  },
  pinDigitText: {
    fontSize: 18,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
  },
  actionBtnOutline: {
    backgroundColor: "#FFFFFF",
  },
  actionText: {
    fontSize: 13,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  actionTextOutline: {
    color: "#FF5500",
  },
  commerceContactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
  },
  commerceContactText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  cancelLink: {
    alignItems: "center",
    paddingVertical: 18,
  },
  cancelLinkText: {
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#94A3B8",
  },
});
