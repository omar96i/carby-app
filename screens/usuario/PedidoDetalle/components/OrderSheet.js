import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  Linking,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatCurrency, formatDate, metodoPagoLabel, parseJSON, getOrderCoords, getImageUrl, calculateProductsTotal, calculateDeliveryCost, calculateDiscount } from "../utils";
import OrderStatusStepper from "../../../../components/OrderStatusStepper";

const { height: SCREEN_H } = Dimensions.get("window");
const COLLAPSED_H = 90;
const EXPANDED_H = SCREEN_H * 0.5;

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
  completado: { label: "En el comercio", tone: "primary" },
  en_comercio: { label: "En el comercio", tone: "primary" },
  recogido: { label: "En camino a ti", tone: "primary" },
  en_camino: { label: "En camino a ti", tone: "primary" },
  entregado: { label: "Entregado", tone: "emerald" },
  cancelado: { label: "Cancelado", tone: "muted" },
};

export const OrderSheet = ({
  pedido,
  currentKey,
  onOpenChat,
  onOpenDriverChat,
  hasNewDriverMessages,
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
  const discount = calculateDiscount(pedido);
  const orderTotal = parseFloat(pedido?.costo_total || 0) + deliveryCost;
  const pin = pedido?.pin || pedido?.carrera?.pin;
  const comercioImage =
    comercio?.foto_documento_file ||
    comercio?.imagen ||
    comercio?.logo ||
    comercio?.foto ||
    comercio?.foto_perfil ||
    comercio?.imagen_url ||
    comercio?.url_imagen ||
    comercio?.logo_url ||
    comercio?.foto_url ||
    null;
  const driver = pedido?.conductor || pedido?.carrera?.conductor;
  const driverImage = getImageUrl(driver?.foto_documento_file || driver?.foto || driver?.imagen || driver?.logo || null);
  const isFinished = ["entregado", "cancelado"].includes(currentKey);
  const canCancel = !isFinished && !["recogido", "en_camino"].includes(currentKey);
  const courierAssigned = !!driver;
  const payMethod = (pedido?.metodo_pago || "").toLowerCase();
  const showEvidenceBtn =
    (payMethod.includes("qr") ||
      payMethod.includes("nequi") ||
      payMethod.includes("transfer") ||
      payMethod.includes("bancolombia")) &&
    pedido?.estado_pago !== "aprobado";

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
    const phone = driver?.numero_telefono || driver?.telefono || driver?.celular;
    if (phone) Linking.openURL(`tel:${phone}`);
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
      <View style={[styles.header, { height: expanded ? 36 : COLLAPSED_H }]} {...panResponder.panHandlers}>
        <View style={styles.handle} />
        <View style={styles.collapsedRowWrapper}>
          <Animated.View style={[styles.collapsedRow, { opacity: compactOpacity }]}>
            {comercioImage ? (
              <Image source={{ uri: getImageUrl(comercioImage) }} style={styles.commerceIconImage} resizeMode="cover" />
            ) : (
              <View style={styles.commerceIcon}>
                <Ionicons name="cube" size={20} color="#FF5500" />
              </View>
            )}
            <View style={styles.collapsedTextBox}>
              <Text style={styles.collapsedName} numberOfLines={1}>{comercioName}</Text>
              <Text style={styles.collapsedSub}>Pedido #{pedido?.id} · {formatDate(pedido?.created_at)}</Text>
            </View>
            <Feather name="chevron-up" size={20} color="#64748B" />
          </Animated.View>
        </View>
      </View>

      <Animated.View style={[styles.expandedContent, { top: expanded ? 36 : COLLAPSED_H, opacity: expandedOpacity }]} pointerEvents={expanded ? "auto" : "none"}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Store header */}
          <View style={styles.storeHeader}>
            {comercioImage ? (
              <Image source={{ uri: getImageUrl(comercioImage) }} style={styles.commerceImageLarge} resizeMode="cover" />
            ) : (
              <View style={styles.commerceIconLarge}>
                <Ionicons name="storefront" size={24} color="#FF5500" />
              </View>
            )}
            <View style={styles.storeTextBox}>
              <Text style={styles.storeName} numberOfLines={1}>{comercioName}</Text>
              <Text style={styles.storeAddress} numberOfLines={1}>{coords?.startAddress || comercio?.direccion || "Dirección del comercio"}</Text>
            </View>
            <View style={styles.contactBtns}>
              <TouchableOpacity style={styles.chatIconBtn} onPress={onOpenChat} activeOpacity={0.8}>
                <Feather name="message-circle" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.callIconBtn} onPress={handleCallCommerce} activeOpacity={0.8}>
                <Feather name="phone" size={18} color="#FFFFFF" />
              </TouchableOpacity>
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
              {driverImage ? (
                <Image source={{ uri: driverImage }} style={styles.courierAvatarImage} resizeMode="cover" />
              ) : (
                <View style={styles.courierAvatarBox}>
                  <Ionicons name="person" size={22} color="#FF5500" />
                </View>
              )}
              <View style={styles.courierInfo}>
                <Text style={styles.courierName}>{driver.nombre_completo || driver.name || driver.nombre || "Repartidor"}</Text>
                <Text style={styles.courierVehicle}>{driver.tipo_vehiculo || driver.vehiculo || driver.tipo_usuario || "Moto"}</Text>
                <Text style={styles.courierPlate}>{driver.placa || driver.plate || ""}</Text>
              </View>
              <View style={styles.contactBtns}>
                <TouchableOpacity style={styles.chatIconBtnGreen} onPress={onOpenDriverChat} activeOpacity={0.8}>
                  <View style={styles.actionIconWrap}>
                    <Feather name="message-circle" size={18} color="#FFFFFF" />
                    {hasNewDriverMessages && <View style={styles.badge} />}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.callBtn} onPress={handleCallDriver} activeOpacity={0.8}>
                  <Feather name="phone" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
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

          {/* PIN */}
          {pin && (
            <View style={styles.pinSegment}>
              <View style={styles.pinSegmentTextBox}>
                <Text style={styles.pinSegmentLabel}>PIN de entrega</Text>
                <Text style={styles.pinSegmentSub}>Compártelo al recibir tu pedido</Text>
              </View>
              <View style={styles.pinSegmentDigits}>
                {String(pin).split("").map((d, i) => (
                  <View key={i} style={styles.pinSegmentDigit}>
                    <Text style={styles.pinSegmentDigitText}>{d}</Text>
                  </View>
                ))}
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
                { key: "en_comercio", label: "En comercio", icon: "mci-storefront" },
                { key: "recogido", label: "En camino", icon: "motorcycle" },
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
            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Descuento</Text>
                <Text style={[styles.summaryValue, styles.discountValue]}>-{formatCurrency(discount)}</Text>
              </View>
            )}
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

          {/* Actions */}
          {showEvidenceBtn && (
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={onOpenEvidence} activeOpacity={0.8}>
                <Feather name="image" size={18} color="#FF5500" />
                <Text style={[styles.actionText, styles.actionTextOutline]}>Evidencia</Text>
              </TouchableOpacity>
            </View>
          )}

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
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.14,
    shadowRadius: 32,
    elevation: 20,
    overflow: "hidden",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 16,
    zIndex: 10,
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 6,
  },
  collapsedRowWrapper: {
    flex: 1,
    justifyContent: "center",
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
  commerceIconImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FDEEE2",
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
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
    minWidth: 0,
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
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
  courierAvatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FDEEE2",
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
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
  commerceImageLarge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#FDEEE2",
  },
  discountValue: {
    color: "#10B981",
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
  actionTextBox: {
    flex: 1,
  },
  contactBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  chatIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
  chatIconBtnGreen: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#10B981",
  },
  callIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FF5500",
    justifyContent: "center",
    alignItems: "center",
  },
  actionIconWrap: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF5500",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  actionTextOutline: {
    color: "#FF5500",
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
  pinSegment: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,85,0,0.2)",
    backgroundColor: "#FDEEE2",
    padding: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  pinSegmentTextBox: {
    flex: 1,
  },
  pinSegmentLabel: {
    fontSize: 11,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pinSegmentSub: {
    fontSize: 11,
    fontFamily: "Montserrat",
    color: "#C2410C",
    marginTop: 2,
  },
  pinSegmentDigits: {
    flexDirection: "row",
    gap: 6,
  },
  pinSegmentDigit: {
    width: 30,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,85,0,0.2)",
  },
  pinSegmentDigitText: {
    fontSize: 17,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
  },
});
