import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";

import { usePedido } from "./hooks/usePedido";
import { useQrPayment } from "./hooks/useQrPayment";
import { useUserPing } from "./hooks/useUserPing";
import { useDriverLocation } from "./hooks/useDriverLocation";
import { useRoute as useRouteCoords } from "../DetalleCarrera/hooks/useRoute";
import { getCurrentStepKey, getStepDesc, getOrderCoords } from "./utils";

import { TopBar } from "./components/TopBar";
import { OrderMap } from "./components/OrderMap";
import { OrderSheet } from "./components/OrderSheet";
import { EvidenceModal } from "./components/EvidenceModal";
import OrderChatModal from "../../../components/OrderChatModal";
import AlertaModal from "../../../components/ErrorModal";

export default function PedidoDetalle() {
  const navigation = useNavigation();
  const route = useRoute();
  const { pedidoId, pedidoData } = route.params || {};

  const [userInfo, setUserInfo] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null, onClose = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel, onClose });
    setAlertVisible(true);
  };

  const { pedido, loading, error, refetch, cancelar } = usePedido(pedidoId, pedidoData);
  const { qrUrl } = useQrPayment(pedido?.comercio?.id);
  const currentKey = getCurrentStepKey(pedido);

  const coords = getOrderCoords(pedido);
  const routeCoords = useRouteCoords(coords?.start, coords?.end);

  const isActive = !["entregado", "cancelado"].includes(currentKey);
  const { location: userLocation, permissionDenied } = useUserPing(pedidoId > 0);
  const locationReady = !!userLocation || permissionDenied;

  const driverId = pedido?.carrera?.conductor_id;
  const driverLocation = useDriverLocation(driverId, isActive && !!driverId);

  const mapRef = useRef(null);

  const dingSource = require("../../../assets/sounds/mario-moneda.mp3");
  const dingPlayer = useAudioPlayer(dingSource);

  useEffect(() => {
    AsyncStorage.getItem("userData").then((data) => {
      if (data) setUserInfo(JSON.parse(data));
    });
  }, []);

  // Sonido al cambiar estado
  useEffect(() => {
    if (!pedido) return;
    const estado = (pedido.estado || "").toLowerCase();
    const carreraEstado = (pedido.carrera?.estado || "").toLowerCase();
    if (estado && estado !== "pendiente") {
      dingPlayer.seekTo(0);
      dingPlayer.play();
    }
  }, [pedido?.estado, pedido?.carrera?.estado]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
      return () => {
        navigation.getParent()?.setOptions({
          tabBarStyle: { backgroundColor: "#FFF", height: 56, borderTopWidth: 1, borderTopColor: "#F0F0F0", display: "flex" },
        });
      };
    }, [navigation])
  );

  const handleCancel = useCallback(() => {
    showAlert(
      "¿Confirmas cancelar el pedido?",
      "confirm",
      async () => {
        try {
          await cancelar();
          showAlert("Pedido cancelado", "success", () => navigation.goBack(), "Aceptar");
        } catch (e) {
          showAlert("No se pudo cancelar el pedido", "error");
        }
      },
      "Sí, cancelar"
    );
  }, [cancelar, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#F1F5F9" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5500" />
          <Text style={styles.loadingText}>Cargando pedido...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !pedido?.id) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#F1F5F9" />
        <View style={styles.center}>
          <Feather name="alert-triangle" size={48} color="#FF4757" style={{ marginBottom: 16 }} />
          <Text style={styles.errorText}>{error || "No se encontró información del pedido"}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refetch} activeOpacity={0.8}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F1F5F9" />
      <View style={styles.container}>
        <OrderMap
          mapRef={mapRef}
          restaurant={coords?.start}
          destination={coords?.end}
          userLocation={userLocation}
          driverLocation={driverLocation}
          route={routeCoords}
        />

        <TopBar state={currentKey} onBack={() => navigation.goBack()} />

        {permissionDenied && (
          <View style={styles.locationBanner}>
            <Feather name="map-pin" size={14} color="#B45309" />
            <Text style={styles.locationBannerText}>Activa ubicación para un mejor seguimiento</Text>
          </View>
        )}

        <OrderSheet
          pedido={pedido}
          currentKey={currentKey}
          onOpenChat={() => setShowChat(true)}
          onOpenEvidence={() => setShowEvidence(true)}
          onCancel={handleCancel}
        />

        {!locationReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FF5500" />
            <Text style={styles.loadingOverlayText}>Ubicando pedido...</Text>
          </View>
        )}

        <OrderChatModal
          visible={showChat}
          pedidoId={pedidoId}
          userInfo={userInfo}
          onClose={() => setShowChat(false)}
          peerName={pedido?.comercio?.establecimiento_nombre || pedido?.comercio?.nombre || "Comercio"}
          peerRole="Soporte del pedido"
        />

        <EvidenceModal
          visible={showEvidence}
          pedidoId={pedidoId}
          qrUrl={qrUrl}
          onClose={() => setShowEvidence(false)}
          onUploaded={() => refetch()}
        />

        <AlertaModal
          visible={alertVisible}
          mensaje={alertData.message}
          tipo={alertData.type}
          onCerrar={() => {
            setAlertVisible(false);
            if (alertData.onClose) alertData.onClose();
          }}
          onPrimary={alertData.onPrimary}
          primaryLabel={alertData.primaryLabel}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F1F5F9" },
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: "Montserrat",
    color: "#64748B",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Montserrat",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: "#FF5500",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 18,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
  },
  locationBanner: {
    position: "absolute",
    top: 105,
    left: 16,
    right: 16,
    zIndex: 90,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FCD34D",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  locationBannerText: {
    fontSize: 12,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#B45309",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(241,245,249,0.92)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  loadingOverlayText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: "Montserrat",
    color: "#64748B",
  },
});
