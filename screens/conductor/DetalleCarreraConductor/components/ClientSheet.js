import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoComercio from "../../../../components/LogoComercio";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatCurrency, getImageUrl, formatPaymentMethod, isElectronicPayment } from "../utils";
import SafetyProtection from "../../../../components/SafetyProtection";
import OrderDetailsCard from "./OrderDetailsCard";

const { height: SCREEN_H } = Dimensions.get("window");
const COLLAPSED_BASE_H = 100;
const EXPANDED_RATIO = 0.5;

const formatAgo = (iso) => {
  if (!iso) return "";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h`;
};

export const ClientSheet = ({
  state,
  tripData,
  pickupAddress,
  destinationAddress,
  clientLive,
  onToggleClientLive,
  lastLocationUpdate,
  onShowChat,
  onShowCommerceChat,
  hasNewCommerceMessages,
  onApprovePayment,
  onRequestPayment,
  requestingPayment,
  onArrive,
  onArriveAtStore,
  onPickupOrder,
  onStartTrip,
  onFinish,
  onCompleteDelivery,
  onCancel,
  approvingPayment,
  paymentApproved,
  hasNewMessages,
  isDelivery,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);
  const collapsedH = COLLAPSED_BASE_H + bottomPad;
  const expandedH = SCREEN_H * EXPANDED_RATIO + bottomPad;
  const heightAnim = useRef(new Animated.Value(collapsedH)).current;
  const compactOpacity = useRef(new Animated.Value(1)).current;
  const expandedOpacity = useRef(new Animated.Value(0)).current;

  const client = tripData?.usuario;
  const imageUrl = getImageUrl(client?.foto_documento_file);
  const clientName = client?.nombre_completo || "Pasajero";
  const trips = client?.usuario_carreras_count ?? 0;
  const cost = tripData?.costo;
  const pedido = tripData?.pedido;
  const rating = client?.puntuacion || "4.8";

  const comercio = pedido?.comercio;
  const comercioImage = getImageUrl(
    comercio?.foto_documento_file || comercio?.imagen || comercio?.logo || comercio?.foto
  );
  const comercioName = comercio?.establecimiento_nombre || comercio?.nombre || "Comercio";

  const service = tripData?.service;
  const serviceName = service?.nombre || tripData?.tipo_servicio || "Servicio";
  const serviceIcon = getImageUrl(service?.icono);
  const metodoPago = formatPaymentMethod(tripData?.metodo_pago || tripData?.informacion_adicional?.metodo_pago || tripData?.informacion_adicional?.metododepago);
  const showRequestPay = !paymentApproved && (isElectronicPayment(tripData?.metodo_pago) || isElectronicPayment(metodoPago));

  const ageSec = lastLocationUpdate
    ? Math.max(0, Math.round((Date.now() - new Date(lastLocationUpdate).getTime()) / 1000))
    : Infinity;
  const isStale = clientLive && ageSec > 600;
  const liveOn = clientLive && lastLocationUpdate && !isStale;
  const liveLabel = !clientLive
    ? "Seguimiento apagado"
    : !lastLocationUpdate
      ? "Esperando señal…"
      : isStale
        ? `Última señal ${formatAgo(lastLocationUpdate)}`
        : `En vivo · ${formatAgo(lastLocationUpdate)}`;

  useEffect(() => {
    heightAnim.setValue(expanded ? expandedH : collapsedH);
  }, [bottomPad]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heightAnim, {
        toValue: expanded ? expandedH : collapsedH,
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
      onPanResponderRelease: (_, g) => {
        const tap = Math.abs(g.dy) < 10 && Math.abs(g.dx) < 10;
        if (tap) return setExpanded(!expanded);
        if (expanded) {
          if (g.dy > 30 || (g.vy || 0) > 0.3) setExpanded(false);
          else setExpanded(true);
        } else {
          if (g.dy < -30 || (g.vy || 0) < -0.3) setExpanded(true);
          else setExpanded(false);
        }
      },
    })
  ).current;

  return (
    <>
    <Animated.View style={[styles.sheet, { height: heightAnim, paddingBottom: bottomPad }]}>
      <View style={[styles.header, { height: expanded ? 36 : collapsedH }]} {...panResponder.panHandlers}>
        <View style={styles.handle} />
        <View style={styles.collapsedRowWrapper}>
          <Animated.View style={[styles.collapsedRow, { opacity: compactOpacity }]}>
            <Image source={imageUrl ? { uri: imageUrl } : require("../../../../assets/images/nuevo-icono.jpeg")} style={styles.collapsedAvatar} />
            <View style={styles.collapsedTextBox}>
              <Text style={styles.collapsedName} numberOfLines={1}>{clientName}</Text>
              <Text style={styles.collapsedSub}>{trips} viajes · {paymentApproved ? "Pagado" : "Pendiente"}</Text>
            </View>
            <Feather name="chevron-up" size={20} color="#64748B" />
          </Animated.View>
        </View>
      </View>

      <Animated.View style={[styles.expandedContent, { top: expanded ? 36 : collapsedH, bottom: bottomPad, opacity: expandedOpacity }]} pointerEvents={expanded ? "auto" : "none"}>
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: 8 }]} showsVerticalScrollIndicator={false}>
          {/* Client card */}
          <View style={styles.clientCard}>
            <TouchableOpacity style={styles.avatarWrap} onPress={() => setPhotoModalVisible(true)} activeOpacity={0.85}>
              <Image source={imageUrl ? { uri: imageUrl } : require("../../../../assets/images/nuevo-icono.jpeg")} style={styles.avatar} />
              <View style={styles.ratingBadge}><Text style={styles.ratingText}>{rating}</Text></View>
            </TouchableOpacity>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName} numberOfLines={1}>{clientName}</Text>
              <Text style={styles.clientTrips}>{trips} viajes completados</Text>
            </View>
            <TouchableOpacity style={styles.chatClientBtn} onPress={onShowChat} activeOpacity={0.8}>
              <View style={styles.actionIconWrap}>
                <Feather name="message-circle" size={18} color="#FFFFFF" />
                {hasNewMessages && <View style={styles.badge} />}
              </View>
            </TouchableOpacity>
          </View>

          {/* Service info */}
          <View style={styles.serviceRow}>
            {serviceIcon ? (
              <Image source={{ uri: serviceIcon }} style={styles.serviceIcon} />
            ) : (
              <View style={styles.serviceIconFallback}>
                <Ionicons name="bicycle" size={18} color="#FF5500" />
              </View>
            )}
            <View style={styles.serviceTextBox}>
              <Text style={styles.serviceName} numberOfLines={1}>{serviceName}</Text>
              <View style={styles.paymentBadge}>
                <Ionicons name="wallet-outline" size={10} color="#FFF" />
                <Text style={styles.paymentBadgeText}>{metodoPago}</Text>
              </View>
            </View>
            <Text style={styles.servicePrice}>{formatCurrency(cost)}</Text>
          </View>

          {/* Route */}
          <View style={styles.routeCard}>
            <View style={styles.routeRow}>
              <View style={styles.routeDots}>
                <View style={[styles.routeDot, { backgroundColor: "#10B981" }]} />
                <View style={styles.routeLine} />
                <View style={[styles.routeDot, { backgroundColor: "#FF5500" }]} />
              </View>
              <View style={styles.routeTextBox}>
                <Text style={styles.routeLabel}>Recoger en</Text>
                <Text style={styles.routeAddress} numberOfLines={2}>{pickupAddress || "Punto de recogida"}</Text>
                <Text style={styles.routeLabel}>Dejar en</Text>
                <Text style={styles.routeAddress} numberOfLines={2}>{destinationAddress || "Destino"}</Text>
              </View>
            </View>
          </View>

          {/* Pedido info */}
          {pedido && (
            <View style={styles.pedidoCard}>
              <View style={styles.pedidoHeader}>
                <LogoComercio
                  comercio={comercioImage ? { foto: comercioImage } : comercio}
                  comercioId={comercio?.id || pedido?.comercio_id}
                  size={44}
                />
                <View style={styles.pedidoHeaderText}>
                  <Text style={styles.pedidoLabel}>Comercio</Text>
                  <Text style={styles.pedidoTitle} numberOfLines={1}>{comercioName}</Text>
                  {comercio?.direccion && (
                    <Text style={styles.pedidoAddress} numberOfLines={1}>{comercio.direccion}</Text>
                  )}
                </View>
                <View style={styles.contactBtns}>
                  <TouchableOpacity
                    style={styles.chatCommerceBtn}
                    onPress={onShowCommerceChat}
                    activeOpacity={0.8}
                  >
                    <View style={styles.actionIconWrap}>
                      <Feather name="message-circle" size={16} color="#FFFFFF" />
                      {hasNewCommerceMessages && <View style={styles.badge} />}
                    </View>
                  </TouchableOpacity>
                  {comercio?.numero_telefono && (
                    <TouchableOpacity
                      style={styles.callCommerceBtn}
                      onPress={() => Linking.openURL(`tel:${comercio.numero_telefono}`)}
                      activeOpacity={0.8}
                    >
                      <Feather name="phone" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}

        {/* Order details - independent card */}
        {pedido && <OrderDetailsCard pedido={pedido} />}

        {/* Live location toggle -> píldora flotante sobre el card */}

          {/* Safety */}
          {state !== "finished" && tripData?.id && !pedido && (
            <View style={styles.safetyBox}>
              <SafetyProtection carreraId={tripData.id} role="conductor" />
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            {!paymentApproved ? (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={onApprovePayment} disabled={approvingPayment} activeOpacity={0.8}>
                {approvingPayment ? <ActivityIndicator size="small" color="#FF5500" /> : <Feather name="check-circle" size={18} color="#FF5500" />}
                <Text style={[styles.actionText, styles.actionTextOutline]}>Aprobar pago</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.actionBtn, styles.actionBtnOutline]}>
                <Feather name="check-circle" size={18} color="#10B981" />
                <Text style={[styles.actionText, { color: "#10B981" }]}>Pagado</Text>
              </View>
            )}
            {showRequestPay && (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={() => onRequestPayment(metodoPago)} disabled={requestingPayment} activeOpacity={0.8}>
                {requestingPayment ? <ActivityIndicator size="small" color="#3B82F6" /> : <Feather name="message-circle" size={18} color="#3B82F6" />}
                <Text style={[styles.actionText, { color: "#3B82F6" }]}>Solicitar por chat</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Primary action */}
          {isDelivery && state !== "finished" ? (
            state === "accepted" ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={onArriveAtStore} activeOpacity={0.8}>
                <Feather name="map-pin" size={20} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Llegué al comercio</Text>
              </TouchableOpacity>
            ) : state === "at_store" ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={onPickupOrder} activeOpacity={0.8}>
                <MaterialCommunityIcons name="package-variant" size={20} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Pedido recogido · en camino al usuario</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={onCompleteDelivery} activeOpacity={0.8}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Completar entrega</Text>
              </TouchableOpacity>
            )
          ) : (
            <>
              {state === "to_pickup" && (
                <TouchableOpacity style={styles.primaryBtn} onPress={onArrive} activeOpacity={0.8}>
                  <Feather name="map-pin" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Llegué donde el cliente</Text>
                </TouchableOpacity>
              )}
              {state === "arrived" && (
                <TouchableOpacity style={styles.primaryBtn} onPress={onStartTrip} activeOpacity={0.8}>
                  <Text style={styles.primaryBtnText}>Recogí al cliente · Iniciar viaje</Text>
                  <Feather name="chevron-right" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {state === "to_destination" && (
                <TouchableOpacity style={styles.primaryBtn} onPress={onFinish} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="flag-checkered" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Finalizar arrendamiento (PIN)</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {state !== "to_customer" && (
            <TouchableOpacity style={styles.cancelLink} onPress={onCancel} activeOpacity={0.8}>
              <Text style={styles.cancelLinkText}>Cancelar servicio</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>
      <Modal visible={photoModalVisible} transparent animationType="fade" onRequestClose={() => setPhotoModalVisible(false)}>
        <TouchableOpacity style={styles.photoModalBackdrop} activeOpacity={1} onPress={() => setPhotoModalVisible(false)}>
          <View style={styles.photoModalHeader}>
            <Text style={styles.photoModalName} numberOfLines={1}>{clientName}</Text>
            <TouchableOpacity style={styles.photoModalClose} onPress={() => setPhotoModalVisible(false)} activeOpacity={0.8}>
              <Feather name="x" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Image
            source={imageUrl ? { uri: imageUrl } : require("../../../../assets/images/nuevo-icono.jpeg")}
            style={styles.photoModalImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Modal>
    </Animated.View>
    {!pedido && (
      <Animated.View style={[styles.livePill, { bottom: Animated.add(heightAnim, 12) }]}>
        <TouchableOpacity style={styles.livePillBtn} onPress={onToggleClientLive} activeOpacity={0.8}>
          <Feather name="navigation" size={14} color={liveOn ? "#34D399" : "#94A3B8"} style={liveOn && styles.liveIconGlow} />
          <Text style={[styles.liveText, !liveOn && styles.liveTextOff]}>{liveLabel}</Text>
        </TouchableOpacity>
      </Animated.View>
    )}
    </>
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
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  serviceIcon: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  serviceIconFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 85, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  serviceTextBox: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  paymentBadgeText: {
    color: "#FFFFFF",
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    fontSize: 10,
    marginLeft: 4,
  },
  servicePrice: {
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#FF5500",
  },
  collapsedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  collapsedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
    borderWidth: 2,
    borderColor: "#FF5500",
  },
  collapsedTextBox: {
    flex: 1,
  },
  collapsedName: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  collapsedSub: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
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
    paddingBottom: 15,
  },
  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
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
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E2E8F0",
    borderWidth: 2,
    borderColor: "#FF5500",
  },
  ratingBadge: {
    position: "absolute",
    bottom: -4,
    alignSelf: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCD34D",
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  ratingText: {
    fontSize: 10,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#B45309",
  },
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoModalHeader: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  photoModalName: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#FFFFFF",
    marginRight: 12,
  },
  photoModalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoModalImage: {
    width: "90%",
    height: "70%",
  },
  clientInfo: {
    flex: 1,
    minWidth: 0,
  },
  clientName: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  clientTrips: {
    fontSize: 11,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#10B981",
    marginTop: 2,
  },
  routeCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 14,
    marginTop: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  routeRow: {
    flexDirection: "row",
    gap: 12,
  },
  routeDots: {
    alignItems: "center",
    paddingTop: 4,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 4,
  },
  routeTextBox: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 10,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  routeAddress: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#0F172A",
    marginTop: 2,
    marginBottom: 10,
    lineHeight: 18,
  },
  pedidoCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 14,
    marginTop: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  pedidoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  commerceImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
  },
  commerceIconFallback: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255, 85, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  pedidoHeaderText: {
    flex: 1,
  },
  pedidoLabel: {
    fontSize: 10,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#FF5500",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  pedidoTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  pedidoAddress: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#64748B",
    marginTop: 2,
  },
  pedidoItems: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#64748B",
    lineHeight: 17,
  },
  callCommerceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  contactBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  chatClientBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  chatCommerceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
  livePill: {
    position: "absolute",
    right: 16,
    zIndex: 30,
    elevation: 8,
  },
  livePillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0F172A",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  liveIconGlow: {
    textShadowColor: "#10B981",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  liveText: {
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  liveTextOff: {
    color: "#94A3B8",
  },
  safetyBox: {
    marginTop: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
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
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionBtnOutline: {
    backgroundColor: "#FFFFFF",
  },
  actionText: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  actionTextOutline: {
    color: "#FF5500",
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
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: "#FF5500",
    borderRadius: 16,
    paddingVertical: 13,
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  cancelLink: {
    alignItems: "center",
    paddingVertical: 14,
  },
  cancelLinkText: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#94A3B8",
  },
});
