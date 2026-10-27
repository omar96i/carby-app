import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Image, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import IconoVehiculo, { nombreCategoriaViaje } from "../../IconoVehiculo";
import useTiposVehiculo from "../../../hooks/useTiposVehiculo";
import { useNavigation } from "@react-navigation/native";
import { COLORS, formatCOP, formatDate, metodoPagoLabel, RADIUS, SHADOWS, VEHICULOS, calcOrderCosts } from "./helpers";
import StatusBadge from "./StatusBadge";
import RouteStops from "./RouteStops";
import DriverRow from "./DriverRow";
import PaymentBadge from "./PaymentBadge";
import ProductList from "./ProductList";
import LogoComercio from "../../LogoComercio";
import { BASE_URL } from "../../../constants/url";

function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL.toString().replace("/api", "")}/storage/${path}`;
}

function TripCard({ item, onOpenDetail, onNavigate, onCancel, onCalificar, isHistorial, irAlComercio = false, onOcultar, onMostrar }) {
  const navigation = useNavigation();
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (item.estado !== "pendiente") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(colorAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(colorAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [item.estado]);

  const esCarrera = item.es_carrera;

  // Determinar estado visible y tipo
  let displayStatus = item.estado;
  let displayType = esCarrera ? "carrera" : "pedido";

  if (!esCarrera && item.estado === "completado" && item.carrera) {
    displayType = "carrera";
    displayStatus = item.carrera.estado || "pendiente";
  }
  const isClickable = esCarrera ? item.estado === "aceptado" : true;
  const metodo = metodoPagoLabel(item.metodo_pago);
  const costs = calcOrderCosts(item);
  const showCostBreakdown = !esCarrera && costs.productos > 0;

  let tituloServicio, nombreServicio;
  if (esCarrera) {
    if (item.es_conductor) {
      tituloServicio = "Pasajero:";
      nombreServicio = item.usuario?.nombre_completo || item.usuario?.name || "Cliente";
    } else {
      tituloServicio = "Conductor:";
      nombreServicio = item.conductor?.name || item.conductor?.nombre_completo || "Conductor";
    }
  } else {
    tituloServicio = "Establecimiento:";
    nombreServicio = item.comercio?.establecimiento_nombre || "Comercio no disponible";
  }

  const tieneProductos = !esCarrera && item.pedido_lists?.length > 0;
  const driver = item.conductor || null;

  const comercioId = item.comercio?.id || item.comercio_id;
  const tiposVehiculo = useTiposVehiculo();
  const categoriaViaje = nombreCategoriaViaje(item, tiposVehiculo);
  const puedeIrAlComercio = irAlComercio && !esCarrera && !!comercioId;
  const abrirComercio = () => {
    navigation.navigate("Shop", { establishmentId: comercioId, userId: comercioId, establishmentName: item.comercio?.establecimiento_nombre });
  };
  const origenCrudo = item.start_lugar || item.origen || "";
  const origenTexto = !esCarrera && origenCrudo.trim().toLowerCase() === "establecimiento"
    ? (item.comercio?.establecimiento_nombre || origenCrudo)
    : origenCrudo;

  const originLabel = "Recogida";
  const destLabel = "Destino";

  const CardBody = () => (
    <View style={s.body}>
      <View style={s.infoRow}>
        <Text style={s.infoLabel}>{tituloServicio}</Text>
        <Text style={s.infoValue} numberOfLines={1}>{nombreServicio}</Text>
      </View>
      {tieneProductos && <ProductList pedidoLists={item.pedido_lists} compact />}
    </View>
  );

  const content = (
    <View style={[s.card, SHADOWS.card]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerTap} onPress={abrirComercio} disabled={!puedeIrAlComercio} activeOpacity={0.7}>
        {esCarrera ? (
          <View style={s.iconBox}>
            <IconoVehiculo item={item} size={22} color={COLORS.brand} fallback="car" />
          </View>
        ) : (
          <LogoComercio comercio={item.comercio} comercioId={comercioId} size={48} radius={16} />
        )}
        <View style={s.headerInfo}>
          <View style={s.tituloFila}>
            <Text style={s.headerTitle} numberOfLines={1}>
              {esCarrera ? (categoriaViaje || item.tipo_viaje || "Estándar") : (item.comercio?.establecimiento_nombre || "Pedido")}
            </Text>
            {puedeIrAlComercio && <Ionicons name="chevron-forward" size={15} color={COLORS.muted} />}
          </View>
          <Text style={s.headerSub}>
            #{item.id} · {formatDate(item.created_at || item.fecha)}
          </Text>
          {(item.pin || item.carrera?.pin) ? (
            <View style={s.pinRow}>
              <Ionicons name="key" size={12} color={COLORS.brand} />
              <Text style={s.pinText}>PIN: {item.pin || item.carrera.pin}</Text>
            </View>
          ) : null}
        </View>
        </TouchableOpacity>
        <View style={s.statusWrap}>
          {item.estado === "pendiente" ? (
            <Animated.View style={[s.statusChipAnimated, { backgroundColor: colorAnim.interpolate({ inputRange: [0, 1], outputRange: ["#FFE5C4", "#FFD0A0"] }) }]}>
              <Text style={[s.statusChipText, { color: COLORS.ink }]}>Pendiente</Text>
            </Animated.View>
          ) : (
            <StatusBadge status={displayStatus} type={displayType} />
          )}
        </View>
      </View>

      {/* Route */}
      <View style={s.routeSection}>
        <RouteStops
          origin={{ label: originLabel, address: origenTexto }}
          destination={{ label: destLabel, address: item.end_lugar || item.destino || "" }}
        />
      </View>

      {/* Product preview for pedidos */}
      {!esCarrera && tieneProductos && (
        <View style={s.productPreview}>
          <View style={s.fotosApiladas}>
            {item.pedido_lists.slice(0, 3).map((p, i) => (
              <View key={i} style={[s.fotoApilada, { marginLeft: i === 0 ? 0 : -12, zIndex: 3 - i }]}>
                {p.producto?.foto ? (
                  <Image source={{ uri: getImageUrl(p.producto.foto) }} style={s.productImg} />
                ) : (
                  <View style={s.productImgPlaceholder}>
                    <Ionicons name="fast-food-outline" size={16} color={COLORS.brand} />
                  </View>
                )}
              </View>
            ))}
          </View>
          <Text style={s.productText} numberOfLines={2}>
            {item.pedido_lists.map((p) => `${p.cantidad}x ${p.producto?.nombre || "Producto"}`).join(", ")}
          </Text>
          <Text style={s.productCount}>
            {item.pedido_lists.reduce((s, p) => s + (p.cantidad || 0), 0)} art.
          </Text>
        </View>
      )}

      {/* Driver / Searching — for carreras and pedidos with carrera assigned */}
      {(esCarrera || (!esCarrera && item.estado === "completado")) && (
        <View style={s.driverSection}>
          {driver ? (
            <View style={s.driverRowContainer}>
              <View style={{ flex: 1 }}>
                <DriverRow driver={driver} showEta={["aceptado", "activo"].includes(item.carrera?.estado || item.estado)} />
              </View>
              {driver.phone ? (
                <TouchableOpacity
                  style={s.callBtn}
                  onPress={() => Linking.openURL(`tel:${driver.phone}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={18} color={COLORS.surface} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={s.searchingRow}>
              <View style={s.searchingIcon}>
                <Ionicons name="search" size={16} color="#F59E0B" />
              </View>
              <View>
                <Text style={s.searchingTitle}>Buscando conductor…</Text>
                <Text style={s.searchingSub}>Te asignaremos el más cercano</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={s.footer}>
        <View style={s.footerLeft}>
          {showCostBreakdown ? (
            <View style={s.costsColumn}>
              <View style={s.costRow}>
                <Text style={s.costLabel}>Pedido</Text>
                <Text style={s.costValue}>{formatCOP(costs.productos)}</Text>
              </View>
              <View style={s.costRow}>
                <Text style={s.costLabel}>Envío</Text>
                <Text style={s.costValue}>{formatCOP(costs.delivery)}</Text>
              </View>
              <View style={[s.costRow, s.totalCostRow]}>
                <Text style={s.totalCostLabel}>Total</Text>
                <Text style={s.totalCostValue}>{formatCOP(costs.total)}</Text>
              </View>
            </View>
          ) : (
            <View>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalPrice}>{formatCOP(item.costo_total)}</Text>
            </View>
          )}
          <PaymentBadge metodo={metodo} />
        </View>
        <View style={s.footerActions}>
          {isHistorial && !!onMostrar && (
            <TouchableOpacity
              style={s.ocultarBtn}
              onPress={() => onMostrar(item)}
              activeOpacity={0.7}
              accessibilityLabel="Mostrar de nuevo en el historial"
            >
              <Ionicons name="eye-outline" size={18} color={COLORS.brand} />
            </TouchableOpacity>
          )}
          {isHistorial && !!onOcultar && (
            <TouchableOpacity
              style={s.ocultarBtn}
              onPress={() => onOcultar(item)}
              activeOpacity={0.7}
              accessibilityLabel="Ocultar del historial"
            >
              <Ionicons name="eye-off-outline" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={s.detailBtn}
            onPress={() => (isHistorial ? onOpenDetail?.(item) : onNavigate?.(item))}
            activeOpacity={0.7}
          >
            <Ionicons name={isHistorial ? "document-text-outline" : "receipt-outline"} size={17} color={COLORS.surface} />
            <Text style={s.detailBtnText}>{isHistorial ? "Ver detalle" : esCarrera ? "Ver viaje" : "Ver pedido"}</Text>
          </TouchableOpacity>
          {isClickable && !isHistorial && (
            <TouchableOpacity
              style={s.moreBtn}
              onPress={() => onOpenDetail?.(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle-outline" size={18} color={COLORS.brand} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Bottom actions row */}
      {!esCarrera && isHistorial && item.completado_no_calificado && (
        <TouchableOpacity style={s.rateBtn} onPress={() => onCalificar?.(item)} activeOpacity={0.7}>
          <Text style={s.rateBtnText}>
            {esCarrera ? "Calificar conductor" : "Calificar al comercio"}
          </Text>
        </TouchableOpacity>
      )}
      {esCarrera && !["cancelado", "completado", "entregado"].includes(item.estado) && (
        <TouchableOpacity style={s.cancelBtn} onPress={() => onCancel?.(item)} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={16} color={COLORS.red600} />
          <Text style={s.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isHistorial) {
    return (
      <TouchableOpacity onPress={() => onOpenDetail?.(item)} activeOpacity={0.95}>
        {content}
      </TouchableOpacity>
    );
  }

  if (isClickable) {
    return (
      <TouchableOpacity onPress={() => onNavigate?.(item)} activeOpacity={0.95}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

export default React.memo(TripCard);

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.zinc100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.brandSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
  },
  headerTap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  tituloFila: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerTitle: {
    flexShrink: 1,
    fontSize: 16,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: COLORS.muted,
    marginTop: 1,
  },
  pinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
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
  statusWrap: {
    flexShrink: 0,
    maxWidth: "50%",
  },
  statusChipAnimated: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusChipText: {
    fontSize: 10,
    fontFamily: "Montserrat_800ExtraBold",
    textTransform: "uppercase",
  },
  routeSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  driverSection: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.zinc50,
    borderRadius: 16,
    padding: 12,
  },
  driverRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "visible",
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  searchingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchingIcon: {
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
  searchingTitle: {
    fontSize: 12,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.ink,
  },
  searchingSub: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: COLORS.muted,
  },
  productPreview: {
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.zinc100,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },
  fotosApiladas: { flexDirection: "row", alignItems: "center" },
  fotoApilada: { borderRadius: 14, borderWidth: 2, borderColor: COLORS.surface, backgroundColor: COLORS.surface },
  productImg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.zinc100,
  },
  productImgPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.brandSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  productText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: "Montserrat_700Bold",
    color: COLORS.ink,
    lineHeight: 17,
  },
  productCount: {
    fontSize: 10,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.brand,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    flexShrink: 0,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "Montserrat_600SemiBold",
    color: COLORS.muted,
  },
  infoValue: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
    color: COLORS.ink,
    textAlign: "right",
    marginLeft: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.zinc200,
    borderStyle: "dashed",
    marginTop: 12,
    overflow: "hidden",
  },
  footerLeft: {
    alignItems: "flex-start",
    gap: 8,
    flex: 1,
  },
  costsColumn: {
    gap: 2,
  },
  costRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  costLabel: {
    fontSize: 10,
    fontFamily: "Montserrat_600SemiBold",
    color: COLORS.muted,
    minWidth: 44,
  },
  costValue: {
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
    color: COLORS.ink,
  },
  totalCostRow: {
    marginTop: 2,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.zinc200,
    borderStyle: "dashed",
  },
  totalCostLabel: {
    fontSize: 10,
    fontFamily: "Montserrat_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: COLORS.ink,
    minWidth: 44,
  },
  totalCostValue: {
    fontSize: 15,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.brand,
    letterSpacing: -0.3,
  },
  totalLabel: {
    fontSize: 9,
    fontFamily: "Montserrat_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: COLORS.muted,
  },
  totalPrice: {
    fontSize: 19,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.ink,
    letterSpacing: -0.5,
  },
  footerActions: {
    flexDirection: "row",
    gap: 8,
    flexShrink: 0,
  },
  detailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.ink,
    justifyContent: "center",
    flexShrink: 0,
  },
  ocultarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.zinc100,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  detailBtnText: {
    fontSize: 12,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.surface,
  },
  moreBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brandSoft,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  rateBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: COLORS.brandSoft,
    gap: 6,
  },
  rateBtnText: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    color: COLORS.brand,
  },
  cancelBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    color: COLORS.red600,
  },
});
