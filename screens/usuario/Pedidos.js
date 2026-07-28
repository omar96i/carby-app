import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  SafeAreaView,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
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
  const { reservas, filteredReservas, isLoadingReservas, fetchReservas, setFilteredReservas, filtrarReservas } = useReservas();
  const calif = useCalificacion();

  const [activeTab, setActiveTab] = useState("activas");
  const [selectedItem, setSelectedItem] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  // ── Init + re-fetch on tab change ──
  useEffect(() => {
    setFilteredPedidos([]);
    fetchPedidos(activeTab);
    fetchReservas();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "reservas") {
      setFilteredReservas(filtrarReservas(reservas, "activas"));
    } else if (activeTab === "historial") {
      setFilteredReservas(filtrarReservas(reservas, "historial"));
    }
    if (activeTab === "reservas" && reservas.length === 0) {
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
        fetchPedidos();
      }
    }, [route?.params?.refreshTrigger, route?.params?.newOrderId])
  );

  // ── Navigate to detail ──
  const navigateToDetails = useCallback((item) => {
    if (!item) return;
    if (item.es_carrera) {
      navigation.navigate("StepNueve", {
        tripId: item.id,
        type: "carrera",
        esCarrera: true,
        carreraId: item.id,
        esConductor: false,
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
            showAlert("No se pudo cancelar la carrera", "error");
            return;
          }
          showAlert("Tu viaje ha sido cancelado", "success");
          fetchPedidos(activeTab);
        } catch (e) {
          showAlert("Hubo un problema al cancelar la carrera", "error");
        }
      },
      "Sí, cancelar"
    );
  }, [fetchPedidos, activeTab]);

  // ── Data dispatch ──
  const listData = activeTab === "reservas" ? filteredReservas : filteredPedidos;

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

  const renderItem = ({ item }) => {
    const isReserva = item.user_perfil && item.fecha && item.hora_inicio;
    if (activeTab === "reservas" || isReserva) {
      return <ReservaCard item={item} />;
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
                onRefresh={() => onRefresh(activeTab)}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
