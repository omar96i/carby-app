import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  View,
  FlatList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Linking,
  Image,
  Modal,
  ScrollView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useFonts, Montserrat_400Regular, Montserrat_700Bold, Montserrat_300Light, Montserrat_600SemiBold, Montserrat_800ExtraBold } from "@expo-google-fonts/montserrat";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNotification } from "../../context/NotificationContext";
import AlertaModal from "../../components/ErrorModal";

import PedidosHeader from "../../components/usuario/pedidos/PedidosHeader";
import PedidosTabs from "../../components/usuario/pedidos/PedidosTabs";
import TripCard from "../../components/usuario/pedidos/TripCard";
import EmptyState from "../../components/usuario/pedidos/EmptyState";
import DetailSheet from "../../components/usuario/pedidos/DetailSheet";
import { COLORS, SHADOWS, RADIUS, formatCOP, formatDate } from "../../components/usuario/pedidos/helpers";
import StatusBadge from "../../components/usuario/pedidos/StatusBadge";
import RouteStops from "../../components/usuario/pedidos/RouteStops";
import DriverRow from "../../components/usuario/pedidos/DriverRow";
import PaymentBadge from "../../components/usuario/pedidos/PaymentBadge";

import usePedidos from "../../hooks/comercio/usePedidos";
import useReservas from "../../hooks/comercio/useReservas";
import logger from "../../utils/logger";
import { BASE_URL } from "../../constants/url";

export default function PedidosComercio({ route }) {
  const navigation = useNavigation();
  const { notification } = useNotification();

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_300Light,
    Montserrat_600SemiBold,
    Montserrat_800ExtraBold,
  });

  const {
    pedidos, filteredPedidos, isLoading, error, refreshing,
    fetchPedidos, onRefresh, setFilteredPedidos,
    countActivas, countHistorial,
    aceptarPedido, crearCarrera,
  } = usePedidos();

  const {
    reservas, isLoading: loadingReservas,
    perfiles, perfilSeleccionado, setPerfilSeleccionado,
    fetchPerfiles, fetchReservas, aceptarReserva,
  } = useReservas();

  const [activeTab, setActiveTab] = useState("activas");
  const [selectedItem, setSelectedItem] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  // Evidencia modal
  const [evidenciaVisible, setEvidenciaVisible] = useState(false);
  const [evidenciaUrl, setEvidenciaUrl] = useState(null);

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  useEffect(() => {
    setFilteredPedidos([]);
    fetchPedidos(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "reservas") fetchPerfiles();
  }, [activeTab]);

  useEffect(() => {
    if (perfilSeleccionado) {
      fetchReservas(perfilSeleccionado);
    }
  }, [perfilSeleccionado]);

  useEffect(() => {
    if (!notification) return;
    fetchPedidos(activeTab);
  }, [notification]);

  useFocusEffect(
    useCallback(() => {
      if (route?.params?.refreshTrigger || route?.params?.newOrderId) {
        fetchPedidos(activeTab);
      }
    }, [route?.params?.refreshTrigger, route?.params?.newOrderId])
  );

  const navigateToDetails = useCallback((item) => {
    navigation.navigate("PedidoDetalleComercio", { pedidoId: item.id, pedidoData: item });
  }, [navigation]);

  const handleAceptar = async (item) => {
    try {
      showAlert("Aceptando pedido...", "info");
      await aceptarPedido(item.id);
      showAlert("Tu pedido está en proceso", "success");
      fetchPedidos(activeTab);
    } catch (e) {
      showAlert("Error al aceptar el pedido", "error");
    }
  };

  const handleCrearCarrera = async (item) => {
    showAlert(
      "¿Solicitar conductor?",
      "confirm",
      async () => {
        try {
          showAlert("Creando carrera...", "info");
          await crearCarrera(item);
          showAlert("Carrera creada exitosamente", "success");
          fetchPedidos(activeTab);
        } catch (e) {
          showAlert("Error al crear la carrera", "error");
        }
      },
      "Sí, solicitar"
    );
  };

  const handleChatRider = (item) => {
    if (!item.carrera?.conductor) {
      showAlert("No hay conductor asignado aún", "info");
      return;
    }
    navigation.navigate("ChatComercioRider", {
      pedidoId: item.id,
      carreraId: item.carrera?.id,
      conductorId: item.carrera.conductor.id,
      conductorNombre: item.carrera.conductor.nombre_completo || "Conductor",
      tipo: "comercio-rider",
    });
  };

  const handleVerEvidencia = (item) => {
    if (!item.archivo_evidencia) return;
    const url = item.archivo_evidencia.startsWith("http")
      ? item.archivo_evidencia
      : `${BASE_URL.toString().replace("/api", "")}/storage/${item.archivo_evidencia}`;
    setEvidenciaUrl(url);
    setEvidenciaVisible(true);
  };

  const handleAceptarReserva = async (item) => {
    try {
      await aceptarReserva(item.id);
      showAlert("Reserva confirmada exitosamente", "success");
      if (perfilSeleccionado) fetchReservas(perfilSeleccionado);
    } catch (e) {
      showAlert("Error al confirmar la reserva", "error");
    }
  };

  // Render reserva card
  const renderReservaItem = ({ item }) => {
    const fechaFormateada = item.fecha_formateada || formatDate(item.fecha);
    const canAccept = item.estado === "pendiente";
    const isDomicilio = item.tipo_reserva === "domicilio";
    const canShip = item.estado === "completado" && isDomicilio;

    let direccion = "";
    try {
      if (item.datos_generales) {
        const dg = typeof item.datos_generales === "string" ? JSON.parse(item.datos_generales) : item.datos_generales;
        direccion = dg.direccion || "";
      }
    } catch (e) {}

    return (
      <View style={[cs.card, SHADOWS.card]}>
        <View style={cs.header}>
          <View style={cs.iconBox}>
            <Ionicons name="calendar" size={20} color={COLORS.ink} />
          </View>
          <View style={cs.headerInfo}>
            <Text style={cs.title} numberOfLines={1}>{item.cliente_nombre || "Cliente"}</Text>
            <Text style={cs.sub}>Reserva #{item.id} · {fechaFormateada}</Text>
          </View>
          <StatusBadge status={item.estado === "confirmado" ? "confirmado" : item.estado} />
        </View>
        <View style={cs.reservaBody}>
          <View style={cs.infoRow}><Text style={cs.infoLabel}>Perfil:</Text><Text style={cs.infoValue}>{item.servicio_nombre}</Text></View>
          <View style={cs.infoRow}><Text style={cs.infoLabel}>Tipo:</Text><Text style={cs.infoValue}>{isDomicilio ? "A domicilio" : "En local"}</Text></View>
          {item.hora_inicio ? <View style={cs.infoRow}><Text style={cs.infoLabel}>Horario:</Text><Text style={cs.infoValue}>{item.hora_inicio_formateada} - {item.hora_fin_formateada}</Text></View> : null}
          {!!direccion && <View style={cs.infoRow}><Text style={cs.infoLabel}>Dirección:</Text><Text style={cs.infoValue} numberOfLines={2}>{direccion}</Text></View>}
          <View style={cs.infoRow}><Text style={cs.infoLabel}>Precio:</Text><Text style={cs.infoValue}>{formatCOP(item.costo_total)}</Text></View>
        </View>
        {canAccept && (
          <View style={cs.actions}>
            <TouchableOpacity style={cs.acceptBtn} onPress={() => handleAceptarReserva(item)}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.surface} />
              <Text style={cs.acceptText}>Confirmar reserva</Text>
            </TouchableOpacity>
          </View>
        )}
        {canShip && (
          <View style={cs.actions}>
            <TouchableOpacity style={cs.shipBtn} onPress={() => showAlert("Crear carrera para esta reserva próximamente", "info")}>
              <Ionicons name="car" size={18} color={COLORS.surface} />
              <Text style={cs.shipText}>Solicitar conductor</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Render commerce-specific TripCard with extra actions
  const renderItem = ({ item }) => {
    if (item.es_carrera) return null;

    const canAccept = item.estado === "pendiente";
    const canShip = item.estado === "aceptado" && !item.carrera;
    const hasCarrera = !!item.carrera;

    return (
      <View style={[cs.card, SHADOWS.card]}>
        {/* Header */}
        <View style={cs.header}>
          <View style={cs.iconBox}>
            <Ionicons name="cube" size={20} color={COLORS.ink} />
          </View>
          <View style={cs.headerInfo}>
            <Text style={cs.title} numberOfLines={1}>
              {item.usuario?.nombre_completo || "Cliente"}
            </Text>
            <Text style={cs.sub}>#{item.id} · {formatDate(item.created_at)}</Text>
          </View>
          <StatusBadge status={item.estado} type="pedido" />
        </View>

        {/* Products */}
        {item.pedido_lists?.length > 0 && (
          <View style={cs.productPreview}>
            {item.pedido_lists[0]?.producto?.foto ? (
              <Image
                source={{ uri: item.pedido_lists[0].producto.foto.startsWith("http") ? item.pedido_lists[0].producto.foto : `${BASE_URL.toString().replace("/api", "")}/storage/${item.pedido_lists[0].producto.foto}` }}
                style={cs.productImg}
              />
            ) : (
              <View style={cs.productPlaceholder}>
                <Ionicons name="cube" size={14} color={COLORS.brand} />
              </View>
            )}
            <Text style={cs.productText} numberOfLines={2}>
              {item.pedido_lists.map((p) => `${p.cantidad}x ${p.producto?.nombre || "Producto"}`).join(", ")}
            </Text>
            <Text style={cs.productBadge}>
              {item.pedido_lists.reduce((s, p) => s + (p.cantidad || 0), 0)} art.
            </Text>
          </View>
        )}

        {/* Route */}
        <View style={cs.routeSection}>
          <RouteStops
            origin={{ label: "Recogida", address: item.start_lugar || "Establecimiento" }}
            destination={{ label: "Destino", address: item.end_lugar || "" }}
          />
        </View>

        {/* Driver */}
        {hasCarrera && (
          <View style={cs.driverSection}>
            {item.conductor ? (
              <View style={cs.driverRow}>
                <View style={{ flex: 1 }}>
                  <DriverRow driver={item.conductor} showEta />
                </View>
                {item.conductor.phone ? (
                  <TouchableOpacity style={cs.callBtn} onPress={() => Linking.openURL(`tel:${item.conductor.phone}`)}>
                    <Ionicons name="call" size={18} color={COLORS.surface} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <View style={cs.searchingRow}>
                <View style={cs.searchingIcon}>
                  <Ionicons name="search" size={16} color="#F59E0B" />
                </View>
                <Text style={cs.searchingText}>Buscando conductor…</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={cs.footer}>
          <View style={cs.footerLeft}>
            <View>
              <Text style={cs.footerLabel}>Total</Text>
              <Text style={cs.footerPrice}>{formatCOP(item.costo_total)}</Text>
            </View>
            <PaymentBadge metodo={item.metodo_pago || "EFECTIVO"} />
          </View>
          <View style={cs.footerActions}>
            <TouchableOpacity style={cs.detailBtn} onPress={() => navigateToDetails(item)}>
              <Ionicons name="receipt-outline" size={20} color={COLORS.surface} />
            </TouchableOpacity>
            <TouchableOpacity style={cs.moreBtn} onPress={() => setSelectedItem(item)}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.brand} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action buttons */}
        <View style={cs.actions}>
          {canAccept && (
            <TouchableOpacity style={cs.acceptBtn} onPress={() => handleAceptar(item)}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.surface} />
              <Text style={cs.acceptText}>Aceptar pedido</Text>
            </TouchableOpacity>
          )}
          {canShip && (
            <TouchableOpacity style={cs.shipBtn} onPress={() => handleCrearCarrera(item)}>
              <Ionicons name="car" size={18} color={COLORS.surface} />
              <Text style={cs.shipText}>Solicitar conductor</Text>
            </TouchableOpacity>
          )}
          {hasCarrera && item.conductor && (
            <TouchableOpacity style={cs.chatBtn} onPress={() => handleChatRider(item)}>
              <Ionicons name="chatbubble" size={16} color={COLORS.brand} />
              <Text style={cs.chatText}>Chat con conductor</Text>
            </TouchableOpacity>
          )}
          {item.archivo_evidencia && (
            <TouchableOpacity style={cs.evidenceBtn} onPress={() => handleVerEvidencia(item)}>
              <Ionicons name="document-attach" size={16} color={COLORS.ink} />
              <Text style={cs.evidenceText}>Ver evidencia de pago</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (!fontsLoaded) {
    return <SafeAreaView style={cs.safe}><ActivityIndicator size="large" color={COLORS.brand} /></SafeAreaView>;
  }

  const reservaCount = reservas.length;

  const listData = activeTab === "reservas" ? reservas : filteredPedidos;

  return (
    <SafeAreaView style={cs.safe}>
      <View style={cs.root}>
        <PedidosHeader />
        <PedidosTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={{ activas: countActivas, historial: countHistorial, reservas: reservaCount }}
        />

        {/* Profile selector for reservas tab */}
        {activeTab === "reservas" && (
          <View style={cs.filterBar}>
            <Text style={cs.filterLabel}>Perfil:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cs.filterScroll}>
              {perfiles.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[cs.filterChip, perfilSeleccionado === p.id && cs.filterChipActive]}
                  onPress={() => setPerfilSeleccionado(p.id)}
                >
                  <Text style={[cs.filterChipText, perfilSeleccionado === p.id && cs.filterChipTextActive]}>
                    {p.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {!perfilSeleccionado && activeTab === "reservas" ? (
          <View style={cs.center}>
            <EmptyState tab="reservas" />
          </View>
        ) : (isLoading || loadingReservas) ? (
          <View style={cs.center}><ActivityIndicator size="large" color={COLORS.brand} /></View>
        ) : error ? (
          <View style={cs.center}><EmptyState tab={activeTab} /></View>
        ) : (
          <FlatList
            data={listData}
            renderItem={activeTab === "reservas" ? renderReservaItem : renderItem}
            keyExtractor={(item) => `${item.id}`}
            contentContainerStyle={cs.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => activeTab === "reservas" ? perfilSeleccionado && fetchReservas(perfilSeleccionado) : onRefresh(activeTab)} colors={[COLORS.brand]} />}
            ListEmptyComponent={<EmptyState tab={activeTab} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <DetailSheet item={selectedItem} onClose={() => setSelectedItem(null)} onNavigate={navigateToDetails} />

      {/* Evidencia modal */}
      <Modal visible={evidenciaVisible} transparent animationType="fade" onRequestClose={() => setEvidenciaVisible(false)}>
        <View style={cs.evModal}>
          <View style={cs.evCard}>
            <TouchableOpacity style={cs.evClose} onPress={() => setEvidenciaVisible(false)}>
              <Ionicons name="close" size={22} color={COLORS.ink} />
            </TouchableOpacity>
            <Text style={cs.evTitle}>Evidencia de pago</Text>
            {evidenciaUrl && <Image source={{ uri: evidenciaUrl }} style={cs.evImage} resizeMode="contain" />}
          </View>
        </View>
      </Modal>

      <AlertaModal
        visible={alertVisible}
        mensaje={alertData.message}
        tipo={alertData.type}
        onCerrar={() => setAlertVisible(false)}
        onPrimary={alertData.onPrimary}
        primaryLabel={alertData.primaryLabel}
      />
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  root: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 14 },

  card: { backgroundColor: COLORS.surface, borderRadius: 26, borderWidth: 1, borderColor: COLORS.zinc100 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.zinc50, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.zinc200 },
  headerInfo: { flex: 1 },
  title: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink },
  sub: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: COLORS.muted, marginTop: 1 },

  productPreview: { marginHorizontal: 16, marginTop: 12, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(253,238,226,0.5)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  productImg: { width: 40, height: 40, borderRadius: 8, backgroundColor: COLORS.zinc100 },
  productPlaceholder: { width: 40, height: 40, borderRadius: 8, backgroundColor: COLORS.zinc100, justifyContent: "center", alignItems: "center" },
  productText: { flex: 1, fontSize: 12, fontFamily: "Montserrat_700Bold", color: COLORS.ink, lineHeight: 16 },
  productBadge: { fontSize: 10, fontFamily: "Montserrat_800ExtraBold", color: COLORS.brand, backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },

  routeSection: { paddingHorizontal: 16, paddingTop: 16 },
  driverSection: { marginHorizontal: 16, marginTop: 12, backgroundColor: COLORS.zinc50, borderRadius: 16, padding: 12 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.brand, justifyContent: "center", alignItems: "center" },
  searchingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchingIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  searchingText: { fontSize: 12, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink },

  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.zinc200, borderStyle: "dashed", marginTop: 12, overflow: "hidden" },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, overflow: "hidden" },
  footerLabel: { fontSize: 9, fontFamily: "Montserrat_800ExtraBold", textTransform: "uppercase", letterSpacing: 1, color: COLORS.muted },
  footerPrice: { fontSize: 19, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink },
  footerActions: { flexDirection: "row", gap: 8, flexShrink: 0 },
  detailBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.ink, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  moreBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: COLORS.zinc200, justifyContent: "center", alignItems: "center", flexShrink: 0 },

  actions: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  acceptBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.brand, paddingVertical: 12, borderRadius: 14 },
  acceptText: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: COLORS.surface },
  shipBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.ink, paddingVertical: 12, borderRadius: 14 },
  shipText: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: COLORS.surface },
  chatBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  chatText: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: COLORS.brand },
  evidenceBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  evidenceText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: COLORS.muted },

  evModal: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  evCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, width: "100%", maxHeight: "80%" },
  evClose: { alignSelf: "flex-end", width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.zinc100, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  evTitle: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink, textAlign: "center", marginBottom: 16 },
  evImage: { width: "100%", height: 300, borderRadius: 12, backgroundColor: COLORS.zinc100 },
  filterBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterLabel: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: COLORS.muted },
  filterScroll: { flex: 1 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.zinc100, marginRight: 8 },
  filterChipActive: { backgroundColor: COLORS.brand },
  filterChipText: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: COLORS.ink },
  filterChipTextActive: { color: COLORS.surface, fontFamily: "Montserrat_700Bold" },
  reservaBody: { paddingHorizontal: 16, paddingTop: 8 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  infoLabel: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: COLORS.muted },
  infoValue: { fontSize: 12, fontFamily: "Montserrat_700Bold", color: COLORS.ink },
});
