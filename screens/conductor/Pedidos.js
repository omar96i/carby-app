import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView, View, FlatList, TouchableOpacity, Text,
  ActivityIndicator, RefreshControl, StyleSheet, Linking, Image, ScrollView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useFonts, Montserrat_400Regular, Montserrat_700Bold, Montserrat_300Light, Montserrat_600SemiBold, Montserrat_800ExtraBold } from "@expo-google-fonts/montserrat";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNotification } from "../../context/NotificationContext";
import AlertaModal from "../../components/ErrorModal";

import PedidosHeader from "../../components/usuario/pedidos/PedidosHeader";
import PedidosTabs from "../../components/usuario/pedidos/PedidosTabs";
import StatusBadge from "../../components/usuario/pedidos/StatusBadge";
import RouteStops from "../../components/usuario/pedidos/RouteStops";
import DriverRow from "../../components/usuario/pedidos/DriverRow";
import PaymentBadge from "../../components/usuario/pedidos/PaymentBadge";
import EmptyState from "../../components/usuario/pedidos/EmptyState";
import DetailSheet from "../../components/usuario/pedidos/DetailSheet";
import { COLORS, SHADOWS, formatCOP, formatDate, metodoPagoLabel } from "../../components/usuario/pedidos/helpers";

import usePedidos from "../../hooks/conductor/usePedidos";
import { BASE_URL } from "../../constants/url";

export default function PedidosConductor({ route }) {
  const navigation = useNavigation();
  const { notification } = useNotification();

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular, Montserrat_700Bold, Montserrat_300Light,
    Montserrat_600SemiBold, Montserrat_800ExtraBold,
  });

  const {
    carreras, filteredCarreras, isLoading, error, refreshing,
    fetchPedidos, onRefresh, setFilteredCarreras,
    countActivas, countHistorial,
  } = usePedidos();

  const [activeTab, setActiveTab] = useState("activas");
  const [selectedItem, setSelectedItem] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  useEffect(() => {
    setFilteredCarreras([]);
    fetchPedidos(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!notification) return;
    fetchPedidos(activeTab);
  }, [notification]);

  useFocusEffect(useCallback(() => {
    if (route?.params?.refreshTrigger) fetchPedidos(activeTab);
  }, [route?.params?.refreshTrigger]));

  const navigateToDetails = useCallback((item) => {
    navigation.navigate("StepTrece", { carreraId: item.id, esConductor: true });
  }, [navigation]);

  const handleLlamarCliente = (item) => {
    const tel = item.usuario?.telefono;
    if (tel) Linking.openURL(`tel:${tel}`);
    else showAlert("No hay teléfono disponible", "info");
  };

  const handleChatComercio = (item) => {
    if (!item.pedido?.comercio) {
      showAlert("No hay información del comercio", "info");
      return;
    }
    navigation.navigate("ChatRiderComercio", {
      pedidoId: item.pedido.id,
      carreraId: item.id,
      comercioNombre: item.pedido.comercio.establecimiento_nombre || "Comercio",
      tipo: "rider-comercio",
    });
  };

  const renderItem = ({ item }) => {
    const tienePedido = !!item.pedido;
    const esActivo = ["pendiente", "aceptado", "activo"].includes(item.estado);

    return (
      <View style={[ds.card, SHADOWS.card]}>
        {/* Header */}
        <View style={ds.header}>
          <View style={ds.iconBox}>
            <Ionicons name="car" size={20} color={COLORS.ink} />
          </View>
          <View style={ds.headerInfo}>
            <Text style={ds.title} numberOfLines={1}>
              {item.usuario?.nombre_completo || "Cliente"}
            </Text>
            <Text style={ds.sub}>#{item.id} · {formatDate(item.created_at)}</Text>
          </View>
          <StatusBadge status={item.estado} type="carrera" />
        </View>

        {/* Route */}
        <View style={ds.routeSection}>
          <RouteStops
            origin={{ label: "Recogida", address: item.start_lugar || item.origen || "" }}
            destination={{ label: "Destino", address: item.end_lugar || item.destino || "" }}
          />
        </View>

        {/* Pedido info (if delivery) */}
        {tienePedido && (
          <View style={ds.pedidoSection}>
            <View style={ds.pedidoHeader}>
              <Ionicons name="cube" size={14} color={COLORS.brand} />
              <Text style={ds.pedidoTitle}>{item.pedido.comercio?.establecimiento_nombre || "Comercio"}</Text>
              <StatusBadge status={item.pedido.estado} type="pedido" />
            </View>
            {item.pedido.items?.length > 0 && (
              <View style={ds.productRow}>
                {item.pedido.items[0]?.producto?.foto ? (
                  <Image source={{ uri: item.pedido.items[0].producto.foto.startsWith("http") ? item.pedido.items[0].producto.foto : `${BASE_URL.toString().replace("/api", "")}/storage/${item.pedido.items[0].producto.foto}` }} style={ds.productImg} />
                ) : null}
                <Text style={ds.productText} numberOfLines={2}>
                  {item.pedido.items.map((p) => `${p.cantidad}x ${p.producto?.nombre || "Producto"}`).join(", ")}
                </Text>
                <Text style={ds.productBadge}>
                  {item.pedido.items.reduce((s, p) => s + (p.cantidad || 0), 0)} art.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={ds.footer}>
          <View style={ds.footerLeft}>
            <View>
              <Text style={ds.footerLabel}>Total</Text>
              <Text style={ds.footerPrice}>{formatCOP(item.costo)}</Text>
            </View>
            <PaymentBadge metodo={item.metodo_pago || "EFECTIVO"} />
          </View>
          <View style={ds.footerActions}>
            <TouchableOpacity style={ds.detailBtn} onPress={() => navigateToDetails(item)}>
              <Ionicons name="receipt-outline" size={20} color={COLORS.surface} />
            </TouchableOpacity>
            <TouchableOpacity style={ds.moreBtn} onPress={() => setSelectedItem(item)}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.brand} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions */}
        {esActivo && (
          <View style={ds.actions}>
            <TouchableOpacity style={ds.callBtnFull} onPress={() => handleLlamarCliente(item)}>
              <Ionicons name="call" size={16} color={COLORS.surface} />
              <Text style={ds.callBtnText}>Llamar cliente</Text>
            </TouchableOpacity>
            {tienePedido && (
              <TouchableOpacity style={ds.chatBtn} onPress={() => handleChatComercio(item)}>
                <Ionicons name="chatbubble" size={16} color={COLORS.brand} />
                <Text style={ds.chatBtnText}>Chat con comercio</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  if (!fontsLoaded) {
    return <SafeAreaView style={ds.safe}><ActivityIndicator size="large" color={COLORS.brand} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={ds.safe}>
      <View style={ds.root}>
        <PedidosHeader />
        <PedidosTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={{ activas: countActivas, historial: countHistorial, reservas: 0 }}
          hideReservas
        />

        {isLoading ? (
          <View style={ds.center}><ActivityIndicator size="large" color={COLORS.brand} /></View>
        ) : error ? (
          <View style={ds.center}><EmptyState tab={activeTab} /></View>
        ) : (
          <FlatList
            data={filteredCarreras}
            renderItem={renderItem}
            keyExtractor={(item) => `carrera-${item.id}`}
            contentContainerStyle={ds.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => onRefresh(activeTab)} colors={[COLORS.brand]} />}
            ListEmptyComponent={<EmptyState tab={activeTab} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <DetailSheet item={selectedItem} onClose={() => setSelectedItem(null)} onNavigate={navigateToDetails} />

      <AlertaModal
        visible={alertVisible} mensaje={alertData.message} tipo={alertData.type}
        onCerrar={() => setAlertVisible(false)} onPrimary={alertData.onPrimary} primaryLabel={alertData.primaryLabel}
      />
    </SafeAreaView>
  );
}

const ds = StyleSheet.create({
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
  pinRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3, backgroundColor: COLORS.brandSoft, alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  pinText: { fontSize: 10, fontFamily: "Montserrat_800ExtraBold", color: COLORS.brand, letterSpacing: 1 },
  routeSection: { paddingHorizontal: 16, paddingTop: 16 },
  pedidoSection: { marginHorizontal: 16, marginTop: 12, backgroundColor: COLORS.zinc50, borderRadius: 14, padding: 10 },
  pedidoHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  pedidoTitle: { flex: 1, fontSize: 13, fontFamily: "Montserrat_700Bold", color: COLORS.ink },
  productRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(253,238,226,0.5)", borderRadius: 10, padding: 8 },
  productImg: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.zinc100 },
  productText: { flex: 1, fontSize: 12, fontFamily: "Montserrat_700Bold", color: COLORS.ink, lineHeight: 15 },
  productBadge: { fontSize: 10, fontFamily: "Montserrat_800ExtraBold", color: COLORS.brand, backgroundColor: COLORS.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.zinc200, borderStyle: "dashed", marginTop: 12, overflow: "hidden" },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, overflow: "hidden" },
  footerLabel: { fontSize: 9, fontFamily: "Montserrat_800ExtraBold", textTransform: "uppercase", letterSpacing: 1, color: COLORS.muted },
  footerPrice: { fontSize: 19, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink },
  footerActions: { flexDirection: "row", gap: 8, flexShrink: 0 },
  detailBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.ink, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  moreBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: COLORS.zinc200, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  actions: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  callBtnFull: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.brand, paddingVertical: 12, borderRadius: 14 },
  callBtnText: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: COLORS.surface },
  chatBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  chatBtnText: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: COLORS.brand },
});
