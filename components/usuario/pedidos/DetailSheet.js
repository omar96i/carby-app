import React, { useEffect, useRef } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal, ScrollView, Animated, Easing, Dimensions, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import IconoVehiculo, { nombreCategoriaViaje } from "../../IconoVehiculo";
import useTiposVehiculo from "../../../hooks/useTiposVehiculo";
import { COLORS, formatCOP, formatDate, metodoPagoLabel, SHADOWS, RADIUS, calcOrderCosts } from "./helpers";
import StatusBadge from "./StatusBadge";
import DriverRow from "./DriverRow";
import LogoComercio from "../../LogoComercio";
import { BASE_URL } from "../../../constants/url";

const { height: SCREEN_H } = Dimensions.get("window");

function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL.toString().replace("/api", "")}/storage/${path}`;
}

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

export default function DetailSheet({ item, onClose, onNavigate, tipoConductor }) {
  const tiposVehiculo = useTiposVehiculo();
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = React.useState(false);
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);

  useEffect(() => {
    if (!item) {
      setVisible(false);
      return;
    }
    translateY.setValue(SCREEN_H);
    backdropOpacity.setValue(0);
    cerrandoRef.current = false;
    setVisible(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 400,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();
    Animated.timing(backdropOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [item]);

  const cerrandoRef = useRef(false);
  const handleClose = () => {
    if (cerrandoRef.current) return;
    cerrandoRef.current = true;
    Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    Animated.timing(translateY, { toValue: SCREEN_H, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
      onClose?.();
    });
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
  const costs = calcOrderCosts(item);
  const metodo = metodoPagoLabel(item.metodo_pago);
  const isActive = ["pendiente", "aceptado", "activo"].includes(displayStatus);

  const driver = item.conductor || null;

  const origenCrudo = item.start_lugar || item.origen || "";
  const comercioNombre = item.comercio?.establecimiento_nombre || "Pedido";
  const originAddress = !esCarrera && origenCrudo.trim().toLowerCase() === "establecimiento"
    ? (item.comercio?.establecimiento_nombre || origenCrudo)
    : origenCrudo || "No disponible";
  const destAddress = item.end_lugar || item.destino || "No disponible";

  const coords = getRouteCoords(item);
  const mapRegion = computeRegion(coords.origin, coords.dest);
  const pin = item.pin || item.carrera?.pin;
  const titulo = esCarrera ? `Arrendamiento en ${nombreCategoriaViaje(item, tiposVehiculo) || item.tipo_viaje || "Estándar"}` : comercioNombre;
  const fotoComercio = !esCarrera ? getImageUrl(item.comercio?.foto_documento_file || item.comercio?.foto || null) : null;

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
          <View style={s.headerOscuro}>
            <View style={s.grabber} />
            <View style={s.modalHeader}>
              <View style={s.headerSpacer} />
              <Text style={s.modalHeaderTitle}>Detalle</Text>
              <TouchableOpacity style={s.modalHeaderClose} onPress={handleClose} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={COLORS.surface} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.mapArea}>
            {mapRegion ? (
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
            ) : (
              <View style={s.mapEmpty}>
                <Ionicons name="map-outline" size={30} color={COLORS.zinc400} />
              </View>
            )}
            <View style={s.mapChips}>
              <View style={s.mapChip}>
                <StatusBadge status={displayStatus} type={displayType} />
              </View>
              {pin ? (
                <View style={s.pinPill}>
                  <Ionicons name="key" size={12} color={COLORS.surface} />
                  <Text style={s.pinText}>PIN {pin}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={s.titleRow}>
              {esCarrera ? (
                <View style={[s.logo, s.logoVacio]}>
                  <IconoVehiculo item={item} tipoConductor={tipoConductor} size={20} color={COLORS.brand} fallback="car" />
                </View>
              ) : (
                <LogoComercio comercio={item.comercio} comercioId={item.comercio?.id || item.comercio_id} size={46} />
              )}
              <View style={s.titleCol}>
                <Text style={s.title} numberOfLines={2}>{titulo}</Text>
                <Text style={s.titleSub}>#{item.id} · {formatDate(item.created_at || item.fecha)}</Text>
              </View>
              <Text style={s.titleTotal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{formatCOP(item.costo_total)}</Text>
            </View>

            <View style={s.sep} />

            <View style={s.block}>
              <View style={s.rutaFila}>
                <View style={s.rutaRiel}>
                  <View style={s.rutaPuntoOrigen} />
                  <View style={s.rutaLinea} />
                </View>
                <View style={[s.rutaTexto, s.rutaTextoOrigen]}>
                  <Text style={s.rutaLabel}>Recogida</Text>
                  <Text style={s.rutaValor} numberOfLines={2}>{originAddress}</Text>
                </View>
              </View>
              <View style={s.rutaFila}>
                <View style={s.rutaRiel}>
                  <View style={s.rutaPuntoDestino} />
                </View>
                <View style={s.rutaTexto}>
                  <Text style={s.rutaLabel}>Destino</Text>
                  <Text style={s.rutaValor} numberOfLines={3}>{destAddress}</Text>
                </View>
              </View>
            </View>

            {driver && (
              <>
                <View style={s.sep} />
                <View style={s.block}>
                  <Text style={s.blockTitle}>Conductor asignado</Text>
                  <DriverRow driver={driver} showEta={isActive} />
                  {isActive && (
                    <View style={s.driverActions}>
                      <TouchableOpacity
                        style={s.driverBtnDark}
                        onPress={() => driver.phone ? Linking.openURL(`tel:${driver.phone}`) : null}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="call" size={15} color={COLORS.surface} />
                        <Text style={s.driverBtnText}>Llamar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.driverBtnBrand} onPress={() => { onClose?.(); onNavigate?.(item); }} activeOpacity={0.8}>
                        <Ionicons name="navigate" size={15} color={COLORS.surface} />
                        <Text style={s.driverBtnText}>Ver en vivo</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </>
            )}

            {isDelivery && (
              <>
                <View style={s.sep} />
                <View style={s.block}>
                  <Text style={s.blockTitle}>Productos</Text>
                  <View style={s.itemsList}>
                    {item.pedido_lists.map((prod, idx) => {
                      const precio = parseFloat(prod.producto?.precio || prod.precio_unitario || prod.precio || 0);
                      const cantidad = parseInt(prod.cantidad || 0);
                      const nombre = prod.producto?.nombre || prod.producto?.name || prod.nombre || "Producto";
                      const foto = getImageUrl(prod.producto?.foto || null);
                      const adicionales = prod.adicionales || prod.pedido_list_adicionals || [];
                      return (
                        <View key={idx}>
                          <View style={s.itemRow}>
                            {foto ? (
                              <Image source={{ uri: foto }} style={s.itemThumb} resizeMode="cover" />
                            ) : (
                              <View style={[s.itemThumb, s.itemThumbVacio]}>
                                <Ionicons name="fast-food-outline" size={18} color={COLORS.brand} />
                              </View>
                            )}
                            <Text style={s.itemQty}>{cantidad}x</Text>
                            <Text style={s.itemName} numberOfLines={2}>{nombre}</Text>
                            <Text style={s.itemPrice}>{formatCOP(precio * cantidad)}</Text>
                          </View>
                          {adicionales.map((ad, j) => {
                            const adPrecio = parseFloat(ad.producto_adicional?.precio || ad.precio || 0);
                            const adCant = parseInt(ad.cantidad || 0);
                            const adNombre = ad.producto_adicional?.nombre || ad.nombre || ad.name || "Adicional";
                            return (
                              <View key={j} style={s.extra}>
                                <Text style={s.extraName}>+ {adNombre}</Text>
                                <Text style={s.extraPrice}>{formatCOP(adPrecio * adCant)}</Text>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            <View style={s.sep} />

            <View style={s.block}>
              {isDelivery && (
                <>
                  <View style={s.lineRow}>
                    <Text style={s.lineLabel}>Productos</Text>
                    <Text style={s.lineValue}>{formatCOP(costs.productos)}</Text>
                  </View>
                  <View style={s.lineRow}>
                    <Text style={s.lineLabel}>Envío</Text>
                    <Text style={s.lineValue}>{formatCOP(costs.delivery)}</Text>
                  </View>
                </>
              )}
              <View style={s.lineRow}>
                <View style={s.payLeft}>
                  <Ionicons name={metodo === "Efectivo" ? "cash-outline" : metodo === "QR" ? "qr-code-outline" : "card-outline"} size={16} color={COLORS.ink} />
                  <Text style={s.lineLabel}>Pago</Text>
                </View>
                <Text style={s.lineValueStrong}>{metodo}</Text>
              </View>
              <View style={[s.lineRow, s.totalRow]}>
                <Text style={s.totalLabel}>Total</Text>
                <Text style={s.totalValue}>{formatCOP(item.costo_total)}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={[s.footer, { paddingBottom: bottomPad + 10 }]}>
            <TouchableOpacity
              style={[s.ctaBtn, isActive ? s.ctaBrand : s.ctaDark]}
              onPress={() => { onClose?.(); onNavigate?.(item); }}
              activeOpacity={0.8}
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

const SOMBRA = { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 };

const s = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(9,9,11,0.45)" },
  backdropTouchOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  sheet: {
    maxHeight: "92%",
    backgroundColor: COLORS.ink,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    ...SHADOWS.sheet,
    zIndex: 10,
    bottom: 0,
    left: 0,
    right: 0,
    position: "absolute",
  },

  headerOscuro: { backgroundColor: COLORS.ink },
  grabber: { width: 40, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.25)", alignSelf: "center", marginTop: 10 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 },
  modalHeaderTitle: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: COLORS.surface },
  modalHeaderClose: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", justifyContent: "center", alignItems: "center" },
  headerSpacer: { width: 38 },

  mapArea: { height: 210, backgroundColor: COLORS.zinc100 },
  mapFull: { ...StyleSheet.absoluteFillObject },
  mapEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  mapGrabber: { position: "absolute", top: 10, alignSelf: "center", width: 40, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.9)", ...SOMBRA, elevation: 2 },
  mapClose: { position: "absolute", top: 14, right: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", ...SOMBRA },
  mapChips: { position: "absolute", left: 14, right: 14, bottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mapChip: { backgroundColor: COLORS.surface, borderRadius: 999, padding: 3, ...SOMBRA },
  pinPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, ...SOMBRA },
  pinText: { fontSize: 12.5, fontFamily: "Montserrat_800ExtraBold", color: COLORS.surface, letterSpacing: 1 },
  markerOrigin: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFF", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: COLORS.ink },
  markerOriginDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.ink },
  markerDest: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(250,98,5,0.25)", justifyContent: "center", alignItems: "center" },
  markerDestDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.brand, borderWidth: 2, borderColor: "#FFF" },

  scroll: { flexGrow: 0, backgroundColor: COLORS.surface },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },

  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.zinc100 },
  logoVacio: { backgroundColor: COLORS.brandSoft, alignItems: "center", justifyContent: "center" },
  titleCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, lineHeight: 21, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink },
  titleSub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: COLORS.muted, marginTop: 2 },
  titleTotal: { maxWidth: "36%", fontSize: 19, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink, textAlign: "right" },

  sep: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.zinc200, marginVertical: 16 },
  block: {},
  blockTitle: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: COLORS.muted, marginBottom: 10 },

  rutaFila: { flexDirection: "row", alignItems: "stretch", gap: 14 },
  rutaRiel: { width: 12, alignItems: "center" },
  rutaLinea: { flex: 1, width: 2, borderRadius: 1, backgroundColor: COLORS.zinc200, marginTop: 3, marginBottom: -1 },
  rutaPuntoOrigen: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#10B981", borderWidth: 2, borderColor: COLORS.surface, marginTop: 4 },
  rutaPuntoDestino: { width: 12, height: 12, borderRadius: 3, backgroundColor: COLORS.brand, borderWidth: 2, borderColor: COLORS.surface, marginTop: 4 },
  rutaTexto: { flex: 1 },
  rutaTextoOrigen: { paddingBottom: 14 },
  rutaLabel: { fontSize: 11.5, fontFamily: "Montserrat_600SemiBold", color: COLORS.muted },
  rutaValor: { fontSize: 14, lineHeight: 19, fontFamily: "Montserrat_700Bold", color: COLORS.ink, marginTop: 1 },

  driverActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  driverBtnDark: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: COLORS.ink, height: 44, borderRadius: 999 },
  driverBtnBrand: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: COLORS.brand, height: 44, borderRadius: 999 },
  driverBtnText: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: COLORS.surface },

  itemsList: { gap: 12 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemThumb: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.zinc100 },
  itemThumbVacio: { backgroundColor: COLORS.brandSoft, alignItems: "center", justifyContent: "center" },
  itemQty: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: COLORS.brand },
  itemName: { flex: 1, fontSize: 14, lineHeight: 19, fontFamily: "Montserrat_700Bold", color: COLORS.ink },
  itemPrice: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink },
  extra: { flexDirection: "row", justifyContent: "space-between", marginLeft: 54, marginTop: 4 },
  extraName: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: COLORS.muted },
  extraPrice: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: COLORS.muted },

  lineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  lineLabel: { fontSize: 14, fontFamily: "Montserrat_400Regular", color: COLORS.muted },
  lineValue: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: COLORS.ink },
  lineValueStrong: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink },
  payLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  totalRow: { marginTop: 6 },
  totalLabel: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink },
  totalValue: { fontSize: 22, fontFamily: "Montserrat_800ExtraBold", color: COLORS.brand },

  footer: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: COLORS.surface },
  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 56, borderRadius: 999 },
  ctaBrand: {
    backgroundColor: COLORS.brand,
    shadowColor: COLORS.brand, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  ctaDark: { backgroundColor: COLORS.ink },
  ctaText: { fontSize: 16, fontFamily: "Montserrat_700Bold", color: COLORS.surface },
});
