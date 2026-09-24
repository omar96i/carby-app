import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  SafeAreaView,
  View,
  FlatList,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import ChatReserva from "./ChatReserva";
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
  const { notification } = useNotification();

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_300Light,
    Montserrat_600SemiBold,
    Montserrat_800ExtraBold,
  });

  const { pedidos, filteredPedidos, isLoading, error, refreshing, fetchPedidos, onRefresh, setFilteredPedidos, countActivas, countHistorial } = usePedidos();
  const { reservas, filteredReservas, isLoadingReservas, fetchReservas, setFilteredReservas, filtrarReservas, cancelReserva } = useReservas();
  const calif = useCalificacion();

  const [activeTab, setActiveTab] = useState("activas");
  const [selectedItem, setSelectedItem] = useState(null);
  const [chatReserva, setChatReserva] = useState(null);
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

  // ── Chat reserva (modal 70%) ──
  const handleChatReserva = useCallback((item) => {
    if (!item) return;
    setChatReserva({
      reservaId: item.id,
      perfilNombre: item.servicio_nombre || item.user_perfil?.nombre || "Perfil",
      perfilFoto: getReservaImageUrl(item.servicio_imagen || item.user_perfil?.file || item.user_perfil?.user?.foto_documento_file),
    });
  }, []);

  // ── Data dispatch ──
  const listData = activeTab === "reservas" ? filteredReservas : filteredPedidos;

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
    <ReservaCard item={item} onCancel={handleCancelReserva} onChat={handleChatReserva} />
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
    <SafeAreaView style={s.safe}>
      <View style={s.root}>
        <PedidosHeader />
        <PedidosTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

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
            contentContainerStyle={s.listContent}
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
            contentContainerStyle={s.listContent}
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

      <Modal
        visible={!!chatReserva}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setChatReserva(null)}
      >
        {chatReserva && (
          <View style={s.chatOverlay}>
            <TouchableOpacity
              style={s.chatBackdrop}
              activeOpacity={1}
              onPress={() => setChatReserva(null)}
            />
            <View style={s.chatPanel}>
              <View style={s.chatHeader}>
                {chatReserva.perfilFoto ? (
                  <Image source={{ uri: chatReserva.perfilFoto }} style={s.chatAvatarImg} />
                ) : (
                  <View style={s.chatAvatar}>
                    <Ionicons name="person" size={20} color="#FFFFFF" />
                  </View>
                )}
                <View style={s.chatHeaderText}>
                  <Text style={s.chatTitle} numberOfLines={1}>
                    {chatReserva.perfilNombre || "Perfil"}
                  </Text>
                  <Text style={s.chatSub}>Reserva #{chatReserva.reservaId}</Text>
                </View>
                <TouchableOpacity
                  style={s.closeChatBtn}
                  onPress={() => setChatReserva(null)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <View style={s.chatBody}>
                <ChatReserva
                  reservaId={chatReserva.reservaId}
                  perfilNombre={chatReserva.perfilNombre}
                  perfilFoto={chatReserva.perfilFoto}
                  onClose={() => setChatReserva(null)}
                  modalMode={true}
                />
              </View>
            </View>
          </View>
        )}
      </Modal>

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
  chatOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.35)" },
  chatBackdrop: { ...StyleSheet.absoluteFillObject },
  chatPanel: { height: "70%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  chatHeader: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FF5500", paddingHorizontal: 16, paddingVertical: 14 },
  chatAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  chatAvatarImg: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.25)" },
  chatHeaderText: { flex: 1 },
  chatTitle: { fontSize: 16, fontFamily: "Montserrat_700Bold", color: "#FFFFFF" },
  chatSub: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: "rgba(255,255,255,0.85)", marginTop: 2 },
  closeChatBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  chatBody: { flex: 1 },
});
