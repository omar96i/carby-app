import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  FlatList,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Text,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useFonts, Montserrat_400Regular, Montserrat_700Bold, Montserrat_300Light, Montserrat_600SemiBold, Montserrat_800ExtraBold } from "@expo-google-fonts/montserrat";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNotification } from "../../context/NotificationContext";
import AlertaModal from "../../components/ErrorModal";
import { BASE_URL } from "../../constants/url";
import logger from "../../utils/logger";

import PedidosHeader from "../../components/usuario/pedidos/PedidosHeader";
import PedidosTabs from "../../components/usuario/pedidos/PedidosTabs";
import TripCard from "../../components/usuario/pedidos/TripCard";
import ReservaCard from "../../components/usuario/pedidos/ReservaCard";
import EmptyState from "../../components/usuario/pedidos/EmptyState";
import DetailSheet from "../../components/usuario/pedidos/DetailSheet";
import CalificationModal from "../../components/usuario/pedidos/CalificationModal";
import { COLORS } from "../../components/usuario/pedidos/helpers";

import usePedidos from "../../hooks/usuario/usePedidos";
import useReservas from "../../hooks/usuario/useReservas";
import useCalificacion from "../../hooks/usuario/useCalificacion";

const getReservaImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL.toString().replace(/\/api\/?$/, "").replace(/\/$/, "")}/storage/${path}`;
};

export default function Pedidos({ route }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { notification } = useNotification();

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_300Light,
    Montserrat_600SemiBold,
    Montserrat_800ExtraBold,
  });

  const { pedidos, filteredPedidos, isLoading, error, refreshing, fetchPedidos, onRefresh, setFilteredPedidos, countActivas, countHistorial } = usePedidos();
  const { reservas, filteredReservas, isLoadingReservas, fetchReservas, setFilteredReservas, setReservas, filtrarReservas, cancelReserva } = useReservas();
  const calif = useCalificacion();

  const [activeTab, setActiveTab] = useState("activas");
  const [historialTipo, setHistorialTipo] = useState("carreras");
  const [selectedItem, setSelectedItem] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });
  const hasFetchedReservasRef = useRef(false);

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  // ── Init + re-fetch on tab change ──
  useEffect(() => {
    setFilteredPedidos([]);
    fetchPedidos(activeTab);
    if (!hasFetchedReservasRef.current) {
      hasFetchedReservasRef.current = true;
      fetchReservas();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "reservas") {
      setFilteredReservas(filtrarReservas(reservas, "activas"));
    } else if (activeTab === "historial") {
      setFilteredReservas(filtrarReservas(reservas, "historial"));
    }
    if (activeTab === "reservas" && reservas.length === 0 && !hasFetchedReservasRef.current) {
      hasFetchedReservasRef.current = true;
      fetchReservas();
    }
  }, [activeTab, reservas]);

  // ── Notification push refresh ──
  useEffect(() => {
    if (!notification) return;
    fetchPedidos(activeTab);
    fetchReservas();
  }, [notification]);

  // ── Focus refresh (back from PedidoDetalle) ──
  useFocusEffect(
    useCallback(() => {
      if (route?.params?.refreshTrigger || route?.params?.newOrderId) {
        fetchPedidos(activeTab);
      }
    }, [route?.params?.refreshTrigger, route?.params?.newOrderId, activeTab])
  );

  // ── Navigate to detail ──
  const navigateToDetails = useCallback((item) => {
    if (!item) return;
    if (item.es_carrera && !item.pedido_id) {
      navigation.navigate("DetalleCarrera", {
        tripId: item.id,
        carreraId: item.id,
      });
    } else if (item.es_carrera && item.pedido_id) {
      navigation.navigate("PedidoDetalle", {
        pedidoId: item.pedido_id,
        pedidoData: item,
      });
    } else {
      navigation.navigate("PedidoDetalle", {
        pedidoId: item.id,
        pedidoData: item,
      });
    }
  }, [navigation]);

  // ── Cancel carrera ──
  const handleCancelCarrera = useCallback(async (item) => {
    showAlert(
      "¿Cancelar este servicio?",
      "confirm",
      async () => {
        try {
          const token = await AsyncStorage.getItem("userToken");
          if (!token) {
            showAlert("No se encontró token de usuario", "error");
            return;
          }
          const cancelUrl = `${BASE_URL}carreras/${item.id}`;
          logger.request("POST", cancelUrl, { estado: "cancelado" });
          const response = await fetch(cancelUrl, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ estado: "cancelado" }),
          });
          if (!response.ok) {
            showAlert("No se pudo cancelar el arrendamiento", "error");
            return;
          }
          showAlert("Tu arrendamiento ha sido cancelado", "success");
          fetchPedidos(activeTab);
        } catch (e) {
          showAlert("Hubo un problema al cancelar el arrendamiento", "error");
        }
      },
      "Sí, cancelar"
    );
  }, [fetchPedidos, activeTab]);

  // ── Cancel reserva ──
  const handleCancelReserva = useCallback(async (item) => {
    showAlert(
      "¿Cancelar esta reserva?",
      "confirm",
      async () => {
        const result = await cancelReserva(item.id);
        if (result.ok) {
          showAlert("Tu reserva ha sido cancelada", "success");
        } else {
          showAlert("No se pudo cancelar la reserva", "error");
        }
      },
      "Sí, cancelar"
    );
  }, [cancelReserva]);

  // ── Chat reserva (vista independiente) ──
  const handleChatReserva = useCallback((item) => {
    if (!item) return;
    const foto = getReservaImageUrl(item.servicio_imagen || item.user_perfil?.file || item.user_perfil?.user?.foto_documento_file);
    const title = item.servicio_nombre || item.user_perfil?.nombre || "Perfil";
    navigation.navigate("ChatReservaView", {
      reservaId: item.id,
      chatTitle: title,
      chatAvatar: foto,
      peerName: title,
      peerAvatar: foto,
    });
  }, [navigation]);

  // ── Data dispatch ──
  const listData = activeTab === "reservas"
    ? filteredReservas
    : activeTab === "historial"
      ? filteredPedidos.filter((i) => historialTipo === "carreras" ? i.es_carrera : !i.es_carrera)
      : filteredPedidos;

  const countHistCarreras = activeTab === "historial" ? filteredPedidos.filter((i) => i.es_carrera).length : 0;
  const countHistPedidos = activeTab === "historial" ? filteredPedidos.length - countHistCarreras : 0;

  const reservaSections = [
    { title: "Pendientes", data: reservas.filter((r) => r.estado === "pendiente") },
    { title: "Aceptadas", data: reservas.filter((r) => r.estado === "aceptado") },
    { title: "Completadas / Canceladas", data: reservas.filter((r) => ["completado", "confirmado", "cancelado"].includes(r.estado)) },
  ].filter((s) => s.data.length > 0);

  const counts = {
    activas: countActivas,
    historial: countHistorial,
    reservas: reservas.length,
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </SafeAreaView>
    );
  }

  const renderReservaItem = ({ item }) => (
    <ReservaCard
      item={item}
      onCancel={handleCancelReserva}
      onChat={handleChatReserva}
      onEvidencia={(updated) => {
        if (!updated) return;
        setReservas((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      }}
    />
  );

  const renderItem = ({ item }) => {
    const isReserva = item.user_perfil && item.fecha && item.hora_inicio;
    if (activeTab === "reservas" || isReserva) {
      return <ReservaCard item={item} onCancel={handleCancelReserva} onChat={handleChatReserva} />;
    }
    return (
      <TripCard
        item={item}
        onOpenDetail={setSelectedItem}
        onNavigate={navigateToDetails}
        onCancel={handleCancelCarrera}
        onCalificar={calif.abrir}
        isHistorial={activeTab === "historial"}
      />
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <View style={s.root}>
        <PedidosHeader />
        <PedidosTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

        {activeTab === "historial" && (
          <View style={s.histSubWrap}>
            <View style={s.histSubBar}>
              {[
                { key: "carreras", label: "Carreras", count: countHistCarreras },
                { key: "pedidos", label: "Pedidos", count: countHistPedidos },
              ].map((t) => {
                const isActive = historialTipo === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[s.histSubTab, isActive && s.histSubTabActive]}
                    onPress={() => setHistorialTipo(t.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.histSubLabel, isActive ? s.histSubLabelActive : s.histSubLabelInactive]}>
                      {t.label} ({t.count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {(isLoading || isLoadingReservas) ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.brand} />
          </View>
        ) : error ? (
          <View style={s.loadingContainer}>
            <EmptyState tab={activeTab} />
          </View>
        ) : activeTab === "reservas" ? (
          <SectionList
            sections={reservaSections}
            renderItem={renderReservaItem}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={s.sectionHeader}>{title}</Text>
            )}
            keyExtractor={(item) => `reserva-${item.id}`}
            style={{ flex: 1 }}
            contentContainerStyle={[s.listContent, { flexGrow: 1, paddingBottom: 104 + insets.bottom }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  hasFetchedReservasRef.current = false;
                  onRefresh(activeTab);
                  fetchReservas();
                }}
                colors={[COLORS.brand]}
              />
            }
            ListEmptyComponent={<EmptyState tab={activeTab} />}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />
        ) : (
          <FlatList
            data={listData}
            renderItem={renderItem}
            keyExtractor={(item) => {
              const isReserva = item.user_perfil && item.fecha && item.hora_inicio;
              return isReserva ? `reserva-${item.id}` : `${item.id}-${item.es_carrera ? "carrera" : "pedido"}`;
            }}
            style={{ flex: 1 }}
            contentContainerStyle={[s.listContent, { flexGrow: 1, paddingBottom: 104 + insets.bottom }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  hasFetchedReservasRef.current = false;
                  onRefresh(activeTab);
                  fetchReservas();
                }}
                colors={[COLORS.brand]}
              />
            }
            ListEmptyComponent={<EmptyState tab={activeTab} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <DetailSheet item={selectedItem} onClose={() => setSelectedItem(null)} onNavigate={navigateToDetails} />

      <CalificationModal
        visible={calif.modalVisible}
        item={calif.itemACalificar}
        onClose={calif.cerrar}
        onSubmit={async ({ item, rating, comentario }) => {
          await calif.enviar(item, rating, comentario);
          fetchPedidos();
        }}
      />

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

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14,
  },
  histSubWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.bg,
  },
  histSubBar: {
    flexDirection: "row",
    backgroundColor: COLORS.zinc100,
    borderRadius: 12,
    padding: 3,
  },
  histSubTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 9,
  },
  histSubTabActive: {
    backgroundColor: COLORS.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  histSubLabel: {
    fontSize: 12,
    fontFamily: "Montserrat_800ExtraBold",
  },
  histSubLabelActive: {
    color: COLORS.ink,
  },
  histSubLabelInactive: {
    color: COLORS.muted,
  },
  sectionHeader: {
    fontSize: 13,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
