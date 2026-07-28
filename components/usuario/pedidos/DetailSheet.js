import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Animated, Easing, Dimensions, Linking } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, formatCOP, formatDate, metodoPagoLabel, SHADOWS, RADIUS } from "./helpers";
import StatusBadge from "./StatusBadge";
import RouteStops from "./RouteStops";
import DriverRow from "./DriverRow";
import PaymentBadge from "./PaymentBadge";
import ProductList from "./ProductList";

const { height: SCREEN_H } = Dimensions.get("window");

function parseJSON(maybe) {
  if (!maybe) return {};
  if (typeof maybe === "object") return maybe;
  try { return JSON.parse(maybe); } catch (e) { return {}; }
}

function getRouteCoords(item) {
  if (item.routeCoords) {
    return {
      origin: { lat: item.routeCoords.originLat || 0, lng: item.routeCoords.originLng || 0 },
      dest: { lat: item.routeCoords.destLat || 0, lng: item.routeCoords.destLng || 0 },
    };
  }
  if (item.es_carrera) {
    const recogida = item.punto_recogida ? parseJSON(item.punto_recogida) : {};
    const destino = item.destino_coords || {};
    return {
      origin: { lat: parseFloat(recogida.lat) || 0, lng: parseFloat(recogida.lng) || 0 },
      dest: { lat: parseFloat(destino.lat) || 0, lng: parseFloat(destino.lng) || 0 },
    };
  }
  return { origin: { lat: 0, lng: 0 }, dest: { lat: 0, lng: 0 } };
}

function computeRegion(origin, dest) {
  if (!origin.lat || !dest.lat) return null;
  const midLat = (origin.lat + dest.lat) / 2;
  const midLng = (origin.lng + dest.lng) / 2;
  const latDelta = Math.max(Math.abs(origin.lat - dest.lat) * 1.8, 0.01);
  const lngDelta = Math.max(Math.abs(origin.lng - dest.lng) * 1.8, 0.01);
  return {
    latitude: midLat,
    longitude: midLng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

export default function DetailSheet({ item, onClose, onNavigate }) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = React.useState(false);

  useEffect(() => {
    if (!item) {
      setVisible(false);
      return;
    }
    setVisible(true);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [item]);

  const handleClose = () => {
    onClose?.();
  };

  if (!visible || !item) return null;

  const esCarrera = item.es_carrera;

  let displayStatus = item.estado;
  let displayType = esCarrera ? "carrera" : "pedido";

  if (!esCarrera && item.estado === "completado" && item.carrera) {
    displayType = "carrera";
    displayStatus = item.carrera.estado || "pendiente";
  }

  const isDelivery = !esCarrera && item.pedido_lists?.length > 0;
  const metodo = metodoPagoLabel(item.metodo_pago);
  const isActive = ["pendiente", "aceptado", "activo"].includes(displayStatus);

  const driver = item.conductor || null;

  const originAddress = item.start_lugar || item.origen || "No disponible";
  const destAddress = item.end_lugar || item.destino || "No disponible";

  const coords = getRouteCoords(item);
  const mapRegion = computeRegion(coords.origin, coords.dest);

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose}>
      <View style={s.root}>
        <TouchableOpacity
          style={s.backdropTouchOverlay}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]} pointerEvents="none" />

        <Animated.View style={[s.sheet, { transform: [{ translateY }] }]}>
          {/* Grabber + close */}
          <View style={s.topBar}>
            <View style={s.grabber} />
              <TouchableOpacity style={s.closeBtn} onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={16} color={COLORS.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
            {/* Title */}
            <View style={s.titleRow}>
              <View style={s.iconBox}>
                <Ionicons name={esCarrera ? "car" : "cube"} size={24} color={COLORS.brand} />
              </View>
              <View style={s.titleCol}>
                <Text style={s.title} numberOfLines={1}>
                  {esCarrera ? `Viaje en ${item.tipo_viaje || "Estándar"}` : (item.comercio?.establecimiento_nombre || "Pedido")}
                </Text>
                <Text style={s.titleSub}>#{item.id} · {formatDate(item.created_at || item.fecha)}</Text>
                {(item.pin || item.carrera?.pin) ? (
                  <View style={s.pinRow}>
                    <Ionicons name="key" size={12} color={COLORS.brand} />
                    <Text style={s.pinText}>PIN: {item.pin || item.carrera?.pin}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <StatusBadge status={displayStatus} type={displayType} />

            {/* Mini map */}
            {mapRegion ? (
              <View style={s.miniMap}>
                <MapView
                  style={s.mapFull}
                  region={mapRegion}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                >
                  <Marker coordinate={{ latitude: coords.origin.lat, longitude: coords.origin.lng }}>
                    <View style={s.markerOrigin}>
                      <View style={s.markerOriginDot} />
                    </View>
                  </Marker>
                  <Marker coordinate={{ latitude: coords.dest.lat, longitude: coords.dest.lng }}>
                    <View style={s.markerDest}>
                      <View style={s.markerDestDot} />
                    </View>
                  </Marker>
                </MapView>
              </View>
            ) : (
              <View style={[s.miniMap, s.miniMapEmpty]}>
                <Ionicons name="map-outline" size={24} color={COLORS.zinc400} />
              </View>
            )}

            {/* Route */}
            <View style={s.sectionCard}>
              <View style={s.sectionHeader}>
                <Ionicons name="location-outline" size={14} color={COLORS.brand} />
                <Text style={s.sectionTitle}>Ruta</Text>
              </View>
              <RouteStops
                origin={{ label: "Recogida", address: originAddress }}
                destination={{ label: "Destino", address: destAddress }}
              />
            </View>

            {/* Driver */}
            {driver && (
              <View style={s.sectionCard}>
                <View style={s.sectionHeader}>
                  <Ionicons name="person" size={14} color={COLORS.ink} />
                  <Text style={s.sectionTitle}>Conductor asignado</Text>
                </View>
                <DriverRow driver={driver} showEta={isActive} />
                {isActive && (
                  <View style={s.driverActions}>
                    <TouchableOpacity
                      style={s.driverBtnDark}
                      onPress={() => driver.phone ? Linking.openURL(`tel:${driver.phone}`) : null}
                    >
                      <Ionicons name="call" size={14} color={COLORS.surface} />
                      <Text style={s.driverBtnText}>Llamar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.driverBtnBrand}>
                      <Ionicons name="navigate" size={14} color={COLORS.surface} />
                      <Text style={s.driverBtnText}>Ver en vivo</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Products */}
            {isDelivery && <ProductList pedidoLists={item.pedido_lists} />}

            {/* Payment summary */}
            <View style={s.sectionCard}>
              <View style={s.sectionHeader}>
                <Ionicons name="card-outline" size={14} color={COLORS.ink} />
                <Text style={s.sectionTitle}>Pago</Text>
              </View>
              <View style={s.paymentRow}>
                <View style={s.paymentIcon}>
                  <Ionicons name="cash-outline" size={16} color={COLORS.ink} />
                </View>
                <Text style={s.paymentName}>{metodo}</Text>
              </View>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Total</Text>
                <Text style={s.totalValue}>{formatCOP(item.costo_total)}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer CTA */}
          <View style={s.footer}>
            <TouchableOpacity
              style={[s.ctaBtn, isActive ? s.ctaBrand : s.ctaDark]}
              onPress={() => { handleClose(); onNavigate?.(item); }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? "eye-outline" : "refresh"}
                size={20}
                color={COLORS.surface}
              />
              <Text style={s.ctaText}>
                {isActive ? "Ver detalles completos" : "Ver pedido"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9,9,11,0.4)",
  },
  backdropTouchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    maxHeight: "92%",
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.sheetTop,
    borderTopRightRadius: RADIUS.sheetTop,
    ...SHADOWS.sheet,
    zIndex: 10,
    bottom: 0,
    left: 0,
    right: 0,
    position: "absolute",
  },
  topBar: {
    alignItems: "center",
    paddingTop: 12,
    position: "relative",
  },
  grabber: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.zinc200,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.zinc100,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.zinc50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.zinc200,
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.ink,
    letterSpacing: -0.5,
  },
  titleSub: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: COLORS.muted,
    marginTop: 2,
  },
  pinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    backgroundColor: COLORS.brandSoft,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pinText: {
    fontSize: 10,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.brand,
    letterSpacing: 1,
  },
  miniMap: {
    height: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.zinc100,
    overflow: "hidden",
    marginTop: 16,
    marginBottom: 16,
  },
  miniMapEmpty: {
    backgroundColor: COLORS.zinc100,
    justifyContent: "center",
    alignItems: "center",
  },
  mapFull: {
    ...StyleSheet.absoluteFillObject,
  },
  markerOrigin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.ink,
  },
  markerOriginDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.ink,
  },
  markerDest: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(250,98,5,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  markerDestDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.brand,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  sectionCard: {
    backgroundColor: COLORS.zinc50,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Montserrat_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: COLORS.muted,
  },
  driverActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  driverBtnDark: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.ink,
    paddingVertical: 10,
    borderRadius: 12,
  },
  driverBtnBrand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.brand,
    paddingVertical: 10,
    borderRadius: 12,
  },
  driverBtnText: {
    fontSize: 12,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.surface,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentName: {
    fontSize: 13,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.ink,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.zinc200,
    borderStyle: "dashed",
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.ink,
  },
  totalValue: {
    fontSize: 18,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.brand,
    letterSpacing: -0.5,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: COLORS.zinc100,
    backgroundColor: COLORS.surface,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 20,
  },
  ctaBrand: {
    backgroundColor: COLORS.brand,
    ...SHADOWS.ctaDark,
  },
  ctaDark: {
    backgroundColor: COLORS.ink,
    ...SHADOWS.ctaDark,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.surface,
    letterSpacing: 0.5,
  },
});
