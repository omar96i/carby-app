import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";

import { usePedido } from "./hooks/usePedido";
import { useQrPayment } from "./hooks/useQrPayment";
import { useUserPing } from "./hooks/useUserPing";
import { useDriverLocation } from "./hooks/useDriverLocation";
import { useNotification } from "../../../context/NotificationContext";
import { useRoute as useRouteCoords } from "../DetalleCarrera/hooks/useRoute";
import { getCurrentStepKey, getStepDesc, getOrderCoords, getStepLabel, HEADER_TEXT } from "./utils";

import { TopBar } from "./components/TopBar";
import { OrderMap } from "./components/OrderMap";
import { OrderSheet } from "./components/OrderSheet";
import { EvidenceModal } from "./components/EvidenceModal";
import { getImageUrl } from "./utils";
import AlertaModal from "../../../components/ErrorModal";

export default function PedidoDetalle() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);
  const route = useRoute();
  const { pedidoId, pedidoData } = route.params || {};

  const [showEvidence, setShowEvidence] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null, onClose = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel, onClose });
    setAlertVisible(true);
  };

  const { pedido, loading, error, refetch, cancelar, driverMessageCount } = usePedido(pedidoId, pedidoData);
  const { notification } = useNotification();
  const { qrUrl } = useQrPayment(pedido?.comercio?.id);
  const currentKey = getCurrentStepKey(pedido);

  const coords = getOrderCoords(pedido);
  const routeCoords = useRouteCoords(coords?.start, coords?.end);

  const isActive = !["entregado", "cancelado"].includes(currentKey);
  const { location: pingLocation, permissionDenied, settled: pingSettled } = useUserPing(pedidoId > 0);
  const locationReady = !!pingLocation || permissionDenied || pingSettled;

  // Ubicación inicial desde el pedido (llega con el detalle) para no
  // esperar al GPS; el ping en vivo la reemplaza cuando hay fix.
  const orderEnd = coords?.end && coords.end.latitude && coords.end.longitude
    ? { latitude: coords.end.latitude, longitude: coords.end.longitude }
    : null;
  const userLocation = pingLocation || orderEnd;

  const driverId = pedido?.carrera?.conductor_id;
  const driverLocation = useDriverLocation(driverId, isActive && !!driverId);

  const mapRef = useRef(null);

  const openStoreChat = useCallback(() => {
    const comercio = pedido?.comercio || {};
    const fotoRaw =
      comercio.foto_documento_file ||
      comercio.imagen ||
      comercio.logo ||
      comercio.foto ||
      comercio.foto_perfil ||
      null;
    const status = HEADER_TEXT[currentKey] || HEADER_TEXT.pendiente;
    navigation.navigate("ChatPedido", {
      pedidoId,
      peerName: comercio.establecimiento_nombre || comercio.nombre || "Comercio",
      peerRole: "Soporte del pedido",
      peerAvatar: getImageUrl(fotoRaw),
      statusTitle: status.title,
      statusSub: status.sub,
      statusTone: status.tone,
    });
  }, [navigation, pedidoId, pedido?.comercio, currentKey]);

  const openDriverChat = useCallback(() => {
    if (!pedido?.carrera?.id) return;
    const conductor = pedido?.carrera?.conductor || {};
    const status = HEADER_TEXT[currentKey] || HEADER_TEXT.pendiente;
    navigation.navigate("ChatConductor", {
      tripId: pedido.carrera.id,
      pedidoId,
      peerName: conductor.nombre_completo || "Repartidor",
      peerRole: "Repartidor",
      peerAvatar: getImageUrl(conductor.foto_documento_file),
      statusTitle: status.title,
      statusSub: status.sub,
      statusTone: status.tone,
    });
  }, [navigation, pedido?.carrera, pedidoId, currentKey]);

  const dingSource = require("../../../assets/sounds/mario-moneda.mp3");
  const dingPlayer = useAudioPlayer(dingSource);

  useEffect(() => {
    if (!pedido) return;
    const estado = (pedido.estado || "").toLowerCase();
    const carreraEstado = (pedido.carrera?.estado || "").toLowerCase();
    if (estado && estado !== "pendiente") {
      dingPlayer.seekTo(0);
      dingPlayer.play();
    }
  }, [pedido?.estado, pedido?.carrera?.estado]);

  // Refetch ante push (estado o chat)
  useEffect(() => {
    if (!notification) return;
    refetch();
  }, [notification, refetch]);

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

  const goHome = useCallback(() => {
    navigation.replace("BottomTabNavigatorUsuario");
  }, [navigation]);

  const goNewOrder = useCallback(() => {
    navigation.replace("BottomTabNavigatorUsuario", { screen: "Home" });
  }, [navigation]);

  const isDelivered = currentKey === "entregado";

  if (isDelivered) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#F1F5F9" />
        <View style={styles.finishedWrap}>
          <View style={styles.finishedIconCircle}>
            <Feather name="check" size={36} color="#10B981" />
          </View>
          <Text style={styles.finishedTitle}>Gracias por realizar tu pedido</Text>
          <Text style={styles.finishedSub}>
            Tu pedido #{pedidoId} fue entregado correctamente. ¡Buen provecho!
          </Text>
          <TouchableOpacity style={styles.finishedPrimary} onPress={goNewOrder} activeOpacity={0.8}>
            <Text style={styles.finishedPrimaryText}>Realizar otro pedido</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.finishedSecondary} onPress={goHome} activeOpacity={0.8}>
            <Text style={styles.finishedSecondaryText}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
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

        <TopBar state={currentKey} top={insets.top} onBack={() => navigation.goBack()} />

        {permissionDenied && (
          <View style={[styles.locationBanner, { top: insets.top + 96 }]}>
            <Feather name="map-pin" size={14} color="#B45309" />
            <Text style={styles.locationBannerText}>Activa ubicación para un mejor seguimiento</Text>
          </View>
        )}

        <OrderSheet
          pedido={pedido}
          currentKey={currentKey}
          bottomPad={bottomPad}
          onOpenChat={openStoreChat}
          onOpenDriverChat={openDriverChat}
          hasNewDriverMessages={driverMessageCount > 0}
          onOpenEvidence={() => setShowEvidence(true)}
          onCancel={handleCancel}
        />

        {!locationReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FF5500" />
            <Text style={styles.loadingOverlayText}>Ubicando pedido...</Text>
          </View>
        )}

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
  finishedWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  finishedIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  finishedTitle: {
    fontSize: 22,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    textAlign: "center",
  },
  finishedSub: {
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  finishedPrimary: {
    width: "100%",
    marginTop: 24,
    backgroundColor: "#FF5500",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  finishedPrimaryText: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  finishedSecondary: {
    width: "100%",
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 15,
    alignItems: "center",
  },
  finishedSecondaryText: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
});
