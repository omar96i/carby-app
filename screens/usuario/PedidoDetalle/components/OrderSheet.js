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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatCurrency, formatDate, metodoPagoLabel, parseJSON, getOrderCoords, getImageUrl, calculateProductsTotal, calculateDeliveryCost, calculateDiscount, HEADER_TEXT } from "../utils";
import OrderStatusStepper from "../../../../components/OrderStatusStepper";
import LogoComercio from "../../../../components/LogoComercio";

const { height: SCREEN_H } = Dimensions.get("window");
const COLLAPSED_BASE_H = 90;
const EXPANDED_RATIO = 0.62;

const RESTO_STATUS = {
  pendiente: { label: "Pendiente", tone: "amber" },
  aceptado: { label: "En preparación", tone: "primary" },
  confirmado: { label: "En preparación", tone: "primary" },
  preparado: { label: "En preparación", tone: "primary" },
  completado: { label: "Listo", tone: "emerald" },
  asignado: { label: "Listo", tone: "emerald" },
  en_camino: { label: "Entregado al repartidor", tone: "emerald" },
  entregado: { label: "Completado", tone: "emerald" },
  cancelado: { label: "Cancelado", tone: "muted" },
};

const COURIER_STATUS = {
  pendiente: { label: "Buscando delivery", tone: "muted" },
  aceptado: { label: "Delivery asignado", tone: "emerald" },
  confirmado: { label: "Delivery asignado", tone: "emerald" },
  preparado: { label: "Delivery asignado", tone: "emerald" },
  completado: { label: "En el comercio", tone: "primary" },
  asignado: { label: "En camino al comercio", tone: "primary" },
  en_comercio: { label: "En el comercio", tone: "primary" },
  recogido: { label: "En camino a ti", tone: "primary" },
  en_camino: { label: "En camino a ti", tone: "primary" },
  entregado: { label: "Entregado", tone: "emerald" },
  cancelado: { label: "Cancelado", tone: "muted" },
};

export const OrderSheet = ({
  pedido,
  currentKey,
  bottomPad = 12,
  onOpenChat,
  onOpenDriverChat,
  hasNewDriverMessages,
  onOpenEvidence,
  onCancel,
}) => {
  const [expanded, setExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(bottomPad, insets.bottom, 12);
  const collapsedH = COLLAPSED_BASE_H + safeBottom;
  const expandedH = SCREEN_H * EXPANDED_RATIO + safeBottom;
  const heightAnim = useRef(new Animated.Value(collapsedH)).current;
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
    heightAnim.setValue(expanded ? expandedH : collapsedH);
  }, [safeBottom]);

  const expandedRef = useRef(expanded);
  const alturasRef = useRef({ collapsedH, expandedH });
  alturasRef.current = { collapsedH, expandedH };

  useEffect(() => {
    expandedRef.current = expanded;
    Animated.spring(heightAnim, {
      toValue: expanded ? expandedH : collapsedH,
      useNativeDriver: false,
      friction: 9,
      tension: 60,
    }).start();
    Animated.timing(compactOpacity, { toValue: expanded ? 0 : 1, duration: 200, useNativeDriver: true }).start();
    Animated.timing(expandedOpacity, { toValue: expanded ? 1 : 0, duration: 250, useNativeDriver: true }).start();
  }, [expanded]);

  const volverAAltura = () => {
    const { collapsedH: cH, expandedH: eH } = alturasRef.current;
    Animated.spring(heightAnim, {
      toValue: expandedRef.current ? eH : cH,
      useNativeDriver: false,
      friction: 9,
      tension: 60,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        const { collapsedH: cH, expandedH: eH } = alturasRef.current;
        const base = expandedRef.current ? eH : cH;
        heightAnim.setValue(Math.min(eH, Math.max(cH, base - g.dy)));
      },
      onPanResponderRelease: (_, g) => {
        const abierto = expandedRef.current;
        const tap = Math.abs(g.dy) < 10 && Math.abs(g.dx) < 10;
        let siguiente;
        if (tap) siguiente = !abierto;
        else if (abierto) siguiente = !(g.dy > 80 || (g.vy || 0) > 0.5);
        else siguiente = g.dy < -80 || (g.vy || 0) < -0.5;
        if (siguiente === abierto) volverAAltura();
        else setExpanded(siguiente);
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

  const tonoEstado = (HEADER_TEXT[currentKey] || HEADER_TEXT.pendiente).tone;
  const pagado = pedido?.estado_pago === "aprobado";
  const items = pedido?.pedido_lists || [];
  const origenTexto = coords?.startAddress && coords.startAddress.trim().toLowerCase() !== "establecimiento"
    ? coords.startAddress
    : comercio?.direccion || null;

  return (
    <Animated.View style={[styles.sheet, { height: heightAnim, paddingBottom: safeBottom }]}>
      <View style={[styles.header, { height: expanded ? 30 : COLLAPSED_BASE_H }]} {...panResponder.panHandlers}>
        <View style={styles.handle} />
        <View style={styles.collapsedRowWrapper}>
          <Animated.View style={[styles.collapsedRow, { opacity: compactOpacity }]}>
            <LogoComercio comercio={comercio} comercioId={comercio?.id || pedido?.comercio_id} size={46} />
            <View style={styles.collapsedTextBox}>
              <Text style={styles.collapsedName} numberOfLines={1}>{comercioName}</Text>
              <Text style={styles.collapsedSub}>Pedido #{pedido?.id} · {formatDate(pedido?.created_at)}</Text>
            </View>
            <View style={styles.chevronCircle}>
              <Feather name="chevron-up" size={18} color={C.ink} />
            </View>
          </Animated.View>
        </View>
      </View>

      <Animated.View style={[styles.expandedContent, { top: expanded ? 30 : COLLAPSED_BASE_H, bottom: safeBottom, opacity: expandedOpacity }]} pointerEvents={expanded ? "auto" : "none"}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.recibo}>
            <View style={styles.reciboHead}>
              <LogoComercio comercio={comercio} comercioId={comercio?.id || pedido?.comercio_id} size={48} radius={16} />
              <View style={styles.reciboHeadText}>
                <Text style={styles.reciboName} numberOfLines={1}>{comercioName}</Text>
                <Text style={styles.reciboOrder} numberOfLines={1}>Pedido #{pedido?.id}</Text>
                <Text style={styles.reciboOrder} numberOfLines={1}>{formatDate(pedido?.created_at)}</Text>
              </View>
              <View style={styles.reciboTotalBox}>
                <Text style={styles.reciboTotalLabel}>Total</Text>
                <Text style={styles.reciboTotal}>{formatCurrency(orderTotal)}</Text>
              </View>
            </View>

            <View style={styles.reciboEstado}>
              <View style={styles.blockHead}>
                <View style={[styles.estadoDot, { backgroundColor: tonoEstado }]} />
                <Text style={styles.reciboLabelInline}>Estado del pedido</Text>
              </View>
              <OrderStatusStepper
                steps={[
                  { key: "pendiente", label: "Pendiente", icon: "clock-o" },
                  { key: "aceptado", label: "Aceptado", icon: "thumbs-up" },
                  { key: "confirmado", label: "Confirmado", icon: "check" },
                  { key: "preparado", label: "Preparado", icon: "cutlery" },
                  { key: "completado", label: "Listo", icon: "shopping-bag" },
                  { key: "asignado", label: "Asignado", icon: "map-marker" },
                  { key: "en_comercio", label: "En comercio", icon: "mci-storefront" },
                  { key: "recogido", label: "En camino", icon: "motorcycle" },
                  { key: "entregado", label: "Entregado", icon: "check" },
                ]}
                currentStatus={currentKey}
              />
            </View>

            <View style={styles.corte} />

            <View style={styles.reciboSection}>
              <View style={styles.ruta}>
                <View style={styles.rutaFila}>
                  <View style={styles.rutaRiel}>
                    <View style={styles.rutaPuntoOrigen} />
                    <View style={styles.rutaLinea} />
                  </View>
                  <View style={[styles.rutaTexto, styles.rutaTextoOrigen]}>
                    {origenTexto ? (
                      <>
                        <Text style={styles.rutaLabel}>{comercioName}</Text>
                        <Text style={styles.rutaValor} numberOfLines={2}>{origenTexto}</Text>
                      </>
                    ) : (
                      <Text style={styles.rutaValor} numberOfLines={1}>{comercioName}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.rutaFila}>
                  <View style={styles.rutaRiel}>
                    <View style={styles.rutaPuntoDestino} />
                  </View>
                  <View style={styles.rutaTexto}>
                    <Text style={styles.rutaLabel}>Entregar en</Text>
                    <Text style={styles.rutaValor} numberOfLines={2}>{coords?.endAddress || pedido?.destino || "No disponible"}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.corte} />

            <View style={styles.reciboSection}>
              <Text style={styles.reciboLabel}>Información del conductor o delivery</Text>
              {courierAssigned ? (
                <View style={styles.courierRow}>
                  {driverImage ? (
                    <Image source={{ uri: driverImage }} style={styles.courierAvatarImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.courierAvatarBox}>
                      <Ionicons name="person" size={22} color={C.brand} />
                    </View>
                  )}
                  <View style={styles.courierInfo}>
                    <Text style={styles.courierName} numberOfLines={1}>{driver.nombre_completo || driver.name || driver.nombre || "Delivery"}</Text>
                    <Text style={styles.courierVehicle} numberOfLines={1}>
                      {driver.tipo_vehiculo || driver.vehiculo || driver.tipo_usuario || "Moto"}
                      {driver.placa || driver.plate ? ` · ${driver.placa || driver.plate}` : ""}
                    </Text>
                    <View style={styles.courierStatusPill}>
                      <Text style={styles.courierStatus}>{courierSub.label}</Text>
                    </View>
                  </View>
                  <View style={styles.contactBtns}>
                    <TouchableOpacity style={styles.chatIconBtn} onPress={onOpenDriverChat} activeOpacity={0.8}>
                      <View style={styles.actionIconWrap}>
                        <Feather name="message-circle" size={18} color="#FFFFFF" />
                        {hasNewDriverMessages && <View style={styles.badge} />}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.callIconBtn} onPress={handleCallDriver} activeOpacity={0.8}>
                      <Feather name="phone" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.courierRow}>
                  <View style={styles.searchingIcon}>
                    <MaterialCommunityIcons name="motorbike" size={22} color={C.brand} />
                  </View>
                  <View style={styles.searchingTextBox}>
                    <Text style={styles.searchingTitle}>Buscando delivery cercano</Text>
                    <Text style={styles.searchingSub}>Te asignaremos uno apenas el restaurante confirme.</Text>
                  </View>
                </View>
              )}

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
            </View>

            <View style={styles.corte} />

            <View style={styles.reciboSection}>
              <Text style={styles.reciboLabel}>Tu pedido</Text>
              <View style={styles.itemsList}>
                {items.map((it, idx) => {
                  const precio = parseFloat(it.producto?.precio || it.precio_unitario || it.precio || 0);
                  const cantidad = parseInt(it.cantidad || 0);
                  const nombre = it.producto?.nombre || it.producto?.name || it.nombre || "Producto";
                  const foto = getImageUrl(it.producto?.foto || null);
                  return (
                    <View key={idx} style={styles.itemRow}>
                      <View style={styles.itemThumbWrap}>
                        {foto ? (
                          <Image source={{ uri: foto }} style={styles.itemThumb} resizeMode="cover" />
                        ) : (
                          <View style={[styles.itemThumb, styles.itemThumbVacio]}>
                            <Ionicons name="fast-food-outline" size={20} color={C.brand} />
                          </View>
                        )}
                        <View style={styles.itemQtyBadge}>
                          <Text style={styles.itemQtyBadgeText}>{cantidad}x</Text>
                        </View>
                      </View>
                      <Text style={styles.itemName} numberOfLines={2}>{nombre}</Text>
                      <Text style={styles.itemPrice}>{formatCurrency(precio * cantidad)}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.summaryBox}>
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
              </View>
            </View>

            <View style={styles.reciboFoot}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(orderTotal)}</Text>
              </View>
              <View style={styles.paymentRow}>
                <View style={styles.paymentIcon}>
                  <Ionicons name={metodo === "Efectivo" ? "cash-outline" : metodo === "QR" ? "qr-code-outline" : "card-outline"} size={17} color={C.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentLabel}>Método de pago</Text>
                  <Text style={styles.paymentValue}>{metodo}</Text>
                </View>
                <View style={[styles.paymentStatusPill, pagado && styles.paymentStatusPillPaid]}>
                  <Text style={[styles.paymentStatus, pagado && styles.paymentStatusPaid]}>
                    {pagado ? "Pagado" : "Pendiente"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {(showEvidenceBtn || canCancel) && (
            <View style={styles.accionesFila}>
              {showEvidenceBtn && (
                <TouchableOpacity style={styles.evidenceBtn} onPress={onOpenEvidence} activeOpacity={0.8}>
                  <Feather name="image" size={17} color={C.brand} />
                  <Text style={styles.evidenceText}>Evidencia</Text>
                </TouchableOpacity>
              )}
              {canCancel && (
                <TouchableOpacity style={styles.cancelLink} onPress={onCancel} activeOpacity={0.8}>
                  <Feather name="x-circle" size={16} color="#EF4444" />
                  <Text style={styles.cancelLinkText}>Cancelar pedido</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.contactBar}>
          <TouchableOpacity style={styles.contactChat} onPress={onOpenChat} activeOpacity={0.8}>
            <Feather name="message-circle" size={18} color="#FFF" />
            <Text style={styles.contactChatText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactCall} onPress={handleCallCommerce} activeOpacity={0.8}>
            <Feather name="phone" size={18} color="#FFF" />
            <Text style={styles.contactCallText}>Llamar</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", edge: "#E4E4E7", iconBg: "#FFF0E5", green: "#10B981", placeholder: "#A1A1AA" };

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
    overflow: "hidden",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 16,
    zIndex: 10,
    overflow: "hidden",
    backgroundColor: C.surface,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: C.edge,
    alignSelf: "center",
    marginBottom: 6,
  },
  collapsedRowWrapper: { flex: 1, justifyContent: "center" },
  collapsedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  commerceIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.iconBg, justifyContent: "center", alignItems: "center" },
  commerceIconImage: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.bg },
  collapsedTextBox: { flex: 1 },
  collapsedName: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  collapsedSub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 2 },
  chevronCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },

  expandedContent: { position: "absolute", left: 0, right: 0, bottom: 0 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 },

  storeHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  commerceIconLarge: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.iconBg, justifyContent: "center", alignItems: "center" },
  commerceImageLarge: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.bg },
  storeTextBox: { flex: 1, minWidth: 0 },
  storeName: { fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  storeAddress: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 1 },
  storeOrder: { fontSize: 11.5, fontFamily: "Montserrat_600SemiBold", color: C.placeholder, marginTop: 2 },
  contactBtns: { flexDirection: "row", gap: 8 },
  chatIconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.ink, justifyContent: "center", alignItems: "center" },
  callIconBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: C.brand, justifyContent: "center", alignItems: "center",
    shadowColor: C.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  actionIconWrap: { position: "relative" },
  badge: { position: "absolute", top: -3, right: -4, width: 9, height: 9, borderRadius: 5, backgroundColor: "#EF4444", borderWidth: 1.5, borderColor: C.ink },

  block: { backgroundColor: C.bg, borderRadius: 22, padding: 14, marginBottom: 12 },
  blockHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, paddingHorizontal: 8 },
  estadoDot: { width: 9, height: 9, borderRadius: 5 },
  blockTitle: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  sectionLabel: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: C.muted, marginBottom: 8, marginLeft: 4 },

  courierCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.bg, borderRadius: 22, padding: 12, marginBottom: 12 },
  courierAvatarImage: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.edge },
  courierAvatarBox: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.iconBg, justifyContent: "center", alignItems: "center" },
  courierInfo: { flex: 1, minWidth: 0 },
  courierName: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  courierVehicle: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: C.muted, marginTop: 1 },
  courierStatusPill: { alignSelf: "flex-start", backgroundColor: C.iconBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 5 },
  courierStatus: { fontSize: 11, fontFamily: "Montserrat_700Bold", color: C.brand },
  searchingCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.bg, borderRadius: 22, padding: 14, marginBottom: 12 },
  searchingIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.iconBg, justifyContent: "center", alignItems: "center" },
  searchingTextBox: { flex: 1 },
  searchingTitle: { fontSize: 14.5, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  searchingSub: { fontSize: 12, lineHeight: 17, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 2 },

  pinSegment: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.ink, borderRadius: 20, padding: 14, marginTop: 12 },
  pinSegmentTextBox: { flex: 1 },
  pinSegmentLabel: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: C.surface },
  pinSegmentSub: { fontSize: 11.5, fontFamily: "Montserrat_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 },
  pinSegmentDigits: { flexDirection: "row", gap: 6 },
  pinSegmentDigit: { width: 34, height: 42, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", justifyContent: "center", alignItems: "center" },
  pinSegmentDigitText: { fontSize: 20, fontFamily: "Montserrat_800ExtraBold", color: C.surface },

  addressCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.bg, borderRadius: 22, padding: 12, marginBottom: 12 },
  addressIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, justifyContent: "center", alignItems: "center" },
  addressTextBox: { flex: 1 },
  addressLabel: { fontSize: 11.5, fontFamily: "Montserrat_600SemiBold", color: C.muted },
  addressValue: { fontSize: 13.5, lineHeight: 18, fontFamily: "Montserrat_700Bold", color: C.ink, marginTop: 1 },

  itemsList: { gap: 12 },
  itemThumbWrap: { width: 52, height: 52 },
  itemThumb: { width: 52, height: 52, borderRadius: 16, backgroundColor: C.bg },
  itemThumbVacio: { backgroundColor: C.iconBg, alignItems: "center", justifyContent: "center" },
  itemQtyBadge: {
    position: "absolute", right: -6, bottom: -6, minWidth: 26, height: 22, borderRadius: 11, paddingHorizontal: 5,
    backgroundColor: C.brand, borderWidth: 2, borderColor: C.surface, alignItems: "center", justifyContent: "center",
  },
  itemQtyBadgeText: { fontSize: 10.5, fontFamily: "Montserrat_800ExtraBold", color: C.surface },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemQtyPill: { minWidth: 32, height: 26, borderRadius: 999, backgroundColor: C.iconBg, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  itemQty: { fontSize: 12, fontFamily: "Montserrat_800ExtraBold", color: C.brand },
  itemName: { flex: 1, fontSize: 14, lineHeight: 19, fontFamily: "Montserrat_700Bold", color: C.ink, marginLeft: 4 },
  itemPrice: { fontSize: 13.5, fontFamily: "Montserrat_700Bold", color: C.ink },
  summaryBox: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#D4D4D8", gap: 6 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: C.muted },
  summaryValue: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: C.ink },
  discountValue: { color: C.green },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  totalValue: { fontSize: 22, fontFamily: "Montserrat_800ExtraBold", color: C.brand },

  paymentCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.bg, borderRadius: 22, padding: 12, marginBottom: 12 },
  paymentIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, justifyContent: "center", alignItems: "center" },
  paymentLabel: { fontSize: 11.5, fontFamily: "Montserrat_600SemiBold", color: C.muted },
  paymentValue: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: C.ink, marginTop: 1 },
  paymentStatusPill: { backgroundColor: "#FEF3C7", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  paymentStatusPillPaid: { backgroundColor: "#ECFDF5" },
  paymentStatus: { fontSize: 12, fontFamily: "Montserrat_700Bold", color: "#B45309" },
  paymentStatusPaid: { color: "#047857" },

  accionesFila: { flexDirection: "row", gap: 10, marginBottom: 4 },
  evidenceBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 999, backgroundColor: C.iconBg },
  evidenceText: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: C.brand },
  cancelLink: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 48, borderRadius: 999, backgroundColor: "#FEF2F2" },
  cancelLinkText: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: "#EF4444" },
  recibo: {
    backgroundColor: C.surface, borderRadius: 24, overflow: "hidden", marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 18, elevation: 6,
  },
  reciboHead: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.ink, paddingHorizontal: 14, paddingVertical: 14 },
  reciboLogo: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#2C2C2E" },
  reciboLogoVacio: { backgroundColor: C.iconBg, alignItems: "center", justifyContent: "center" },
  reciboHeadText: { flex: 1, minWidth: 0 },
  reciboName: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: C.surface },
  reciboOrder: { fontSize: 11.5, fontFamily: "Montserrat_400Regular", color: "rgba(255,255,255,0.6)", marginTop: 1 },
  reciboTotalBox: { alignItems: "flex-end" },
  reciboTotalLabel: { fontSize: 10.5, fontFamily: "Montserrat_600SemiBold", color: "rgba(255,255,255,0.6)" },
  reciboTotal: { fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: C.brand },
  reciboSection: { paddingHorizontal: 16, paddingVertical: 14 },
  reciboEstado: { paddingHorizontal: 8, paddingTop: 12, paddingBottom: 6 },
  reciboLabelInline: { fontSize: 12.5, fontFamily: "Montserrat_700Bold", color: C.muted },
  reciboLabel: { fontSize: 12.5, fontFamily: "Montserrat_700Bold", color: C.muted, marginBottom: 10 },
  corte: { marginHorizontal: 16, borderTopWidth: 1.5, borderColor: C.edge, borderStyle: "dashed" },

  ruta: {},
  rutaFila: { flexDirection: "row", alignItems: "stretch", gap: 14 },
  rutaRiel: { width: 12, alignItems: "center" },
  rutaLinea: { flex: 1, width: 2, borderRadius: 1, backgroundColor: C.edge, marginTop: 3, marginBottom: -1 },
  rutaTextoOrigen: { paddingBottom: 14 },
  rutaPuntoOrigen: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.green, borderWidth: 2, borderColor: C.surface, marginTop: 4 },
  rutaPuntoDestino: { width: 12, height: 12, borderRadius: 3, backgroundColor: C.brand, borderWidth: 2, borderColor: C.surface, marginTop: 4 },
  rutaTexto: { flex: 1 },
  rutaLabel: { fontSize: 11.5, fontFamily: "Montserrat_600SemiBold", color: C.muted },
  rutaValor: { fontSize: 13.5, lineHeight: 18, fontFamily: "Montserrat_700Bold", color: C.ink, marginTop: 1 },

  courierRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  reciboFoot: { backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, gap: 12 },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: 12 },

  contactBar: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, backgroundColor: C.surface },
  contactChat: { flex: 1, height: 52, borderRadius: 999, backgroundColor: C.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  contactChatText: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#FFF" },
  contactCall: {
    flex: 1, height: 52, borderRadius: 999, backgroundColor: C.brand, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: C.brand, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  contactCallText: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#FFF" },
});
