import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  BackHandler,
  Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import { useTripData } from "./hooks/useTripData";
import { usePassengerLocation } from "./hooks/usePassengerLocation";
import { useDriverPing } from "./hooks/useDriverPing";
import { useRoute as useRouteCoords } from "../../usuario/DetalleCarrera/hooks/useRoute";
import { parseCoords, getTripState, getPedidoState, formatCurrency, getImageUrl } from "./utils";
import { BASE_URL } from "../../../constants/url";

import { TopBar } from "./components/TopBar";
import { RideMap } from "./components/RideMap";
import { ClientSheet } from "./components/ClientSheet";
import { FinishedSheet } from "./components/FinishedSheet";
import { PinModal } from "./components/PinModal";
import ChatScreen from "../../../components/ChatScreen";
import ChatRiderComercio from "../../../screens/ChatRiderComercio";import { useNotification } from "../../../context/NotificationContext";
import AlertaModal from "../../../components/ErrorModal";

export default function DetalleCarreraConductor() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { tripId = 0, carreraId = 0 } = route.params || {};
  const activeId = tripId || carreraId;

  const mapRef = useRef(null);
  const [parsedInfo, setParsedInfo] = useState({ origen: "", destino: "", observaciones: "" });
  const [clientLive, setClientLive] = useState(true);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [approvingPayment, setApprovingPayment] = useState(false);
  const [requestingPayment, setRequestingPayment] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null, onClose = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel, onClose });
    setAlertVisible(true);
  };

  const { tripData, isLoading, error, refetch } = useTripData(activeId);
  const { notification } = useNotification();

  // Refetch ante push (estado o chat)
  useEffect(() => {
    if (!notification) return;
    refetch();
  }, [notification, refetch]);
  useDriverPing(true);
  const passengerLocation = usePassengerLocation(tripData?.usuario_id, clientLive);

  useEffect(() => {
    let interval;
    const track = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDriverLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      interval = setInterval(async () => {
        const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setDriverLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude });
      }, 5000);
    };
    track();
    return () => interval && clearInterval(interval);
  }, []);

  const pickup = useMemo(() => parseCoords(tripData?.punto_recogida), [tripData?.punto_recogida]);
  const destination = useMemo(() => parseCoords(tripData?.destino), [tripData?.destino]);
  const routeCoords = useRouteCoords(pickup, destination);
  const isDelivery = !!tripData?.pedido;
  const pedido = tripData?.pedido;
  const comercio = pedido?.comercio;
  const comercioFotoRaw =
    comercio?.foto_documento_file ||
    comercio?.imagen ||
    comercio?.logo ||
    comercio?.foto ||
    comercio?.foto_perfil ||
    null;
  const comercioFoto = comercioFotoRaw
    ? (comercioFotoRaw.startsWith("http")
      ? comercioFotoRaw
      : `${BASE_URL.toString().replace(/\/api\/?$/, "").replace(/\/$/, "")}/storage/${comercioFotoRaw}`)
    : null;
  const userName = tripData?.usuario?.nombre_completo || "Cliente";
  const userPhotoUrl = getImageUrl(tripData?.usuario?.foto_documento_file);
  const comercioName = comercio?.establecimiento_nombre || comercio?.nombre || "Comercio";
  const state = useMemo(
    () => (isDelivery ? getPedidoState(tripData?.estado) : getTripState(tripData?.estado)),
    [tripData?.estado, isDelivery]
  );
  const isFinished = state === "finished";

  useEffect(() => {
    if (tripData?.estado_pago === "aprobado") setPaymentApproved(true);
  }, [tripData?.estado_pago]);

  useEffect(() => {
    if (tripData?.informacion_adicional) {
      try {
        const info = typeof tripData.informacion_adicional === "string"
          ? JSON.parse(tripData.informacion_adicional)
          : tripData.informacion_adicional;
        setParsedInfo({
          origen: info.origen || "",
          destino: info.destino || "",
          observaciones: info.observaciones || "",
        });
      } catch (e) {
        setParsedInfo({ origen: "", destino: "", observaciones: "" });
      }
    }
  }, [tripData?.informacion_adicional]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
      navigation.setOptions({ gestureEnabled: false });
      return () => {
        navigation.getParent()?.setOptions({
          tabBarStyle: { backgroundColor: "#FFF", height: 56, borderTopWidth: 1, borderTopColor: "#F0F0F0", display: "flex" },
        });
      };
    }, [navigation])
  );

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    }, [])
  );

  const updateEstado = async (nuevoEstado) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await fetch(`${BASE_URL}carreras/${activeId}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      refetch();
    } catch (e) {
      console.error("Error updateEstado:", e);
      showAlert(`No se pudo actualizar el estado: ${e.message}`, "error");
    }
  };

  const handleArriveAtStore = async () => {
    await updateEstado("en_comercio");
  };

  const handleArrive = async () => {
    await updateEstado("llegado");
  };

  const handlePickupOrder = async () => {
    await updateEstado("recogido");
  };

  const handleStartTrip = () => {
    updateEstado("activo");
  };

  const handleFinish = () => {
    setPinModalVisible(true);
  };

  const verifyPin = async () => {
    if (enteredPin !== tripData?.pin) {
      setPinError(true);
      return;
    }
    setPinError(false);
    setPinSuccess(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      await fetch(`${BASE_URL}carreras/${activeId}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado: "completado" }),
      });
      setTimeout(() => {
        setPinModalVisible(false);
        refetch();
      }, 1500);
    } catch (e) {
      showAlert("Error al finalizar en servidor", "error");
    }
  };

  const handleApprovePayment = async () => {
    setApprovingPayment(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await fetch(`${BASE_URL}carreras/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado_pago: "aprobado" }),
      });
      if (response.ok) {
        setPaymentApproved(true);
        showAlert("Pago aprobado correctamente", "success");
      } else {
        showAlert("No se pudo aprobar el pago", "error");
      }
    } catch (e) {
      showAlert("Problema de conexión", "error");
    } finally {
      setApprovingPayment(false);
    }
  };

  const openChat = useCallback(() => {
    navigation.navigate("ChatCliente", {
      tripId: activeId,
      peerName: userName,
      peerRole: "Pasajero",
      peerAvatar: userPhotoUrl,
    });
  }, [navigation, activeId, userName, userPhotoUrl]);

  const openCommerceChat = useCallback(() => {
    if (!pedido?.id) return;
    navigation.navigate("ChatComercio", {
      pedidoId: pedido.id,
      carreraId: activeId,
      comercioId: comercio?.id || pedido.comercio_id,
      comercioNombre: comercioName,
      peerName: comercioName,
      peerAvatar: comercioFoto,
      tipo: "rider-comercio",
    });
  }, [navigation, pedido, activeId, comercio, comercioName, comercioFoto]);

  const handleRequestPayment = async (metodoLabel) => {
    setRequestingPayment(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const userId = await AsyncStorage.getItem("userId");
      if (!token || !userId) throw new Error("No se encontró sesión");
      const texto = `Hola, te solicito el pago de ${formatCurrency(tripData?.costo)} por ${metodoLabel}. ¿Me confirmas el comprobante por este chat?`;
      const formData = new FormData();
      formData.append("carrera_id", activeId.toString());
      formData.append("conductor_id", userId.toString());
      const escapedJson = JSON.stringify({ type: "text", content: texto }).replace(/"/g, '\\"');
      formData.append("message", `"${escapedJson}"`);
      const response = await fetch(`${BASE_URL}carrera-chat/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        body: formData,
      });
      if (!response.ok) throw new Error("No se pudo enviar la solicitud");
      openChat();
    } catch (e) {
      showAlert(`No se pudo solicitar el pago: ${e.message}`, "error");
    } finally {
      setRequestingPayment(false);
    }
  };

  const handleCancel = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("No se encontró sesión");

      // Intentar endpoint específico de cancelación por conductor
      let response = await fetch(`${BASE_URL}carreras/${activeId}/conductor-cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      // Fallback al endpoint de estados si el específico no existe (404)
      if (response.status === 404) {
        response = await fetch(`${BASE_URL}carreras/${activeId}/estado`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ estado: "cancelado" }),
        });
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      showAlert("Arrendamiento cancelado", "success", () => navigation.replace("BottomTabNavigatorDelivery"), "Aceptar");
    } catch (e) {
      console.error("Error cancelando:", e);
      showAlert(`No se pudo cancelar: ${e.message}`, "error");
    }
  };

  const handleDone = async ({ rating, message } = {}) => {
    // Las carreras con pedido no requieren calificación; solo las normales.
    if (rating) {
      setRatingLoading(true);
      try {
        const token = await AsyncStorage.getItem("userToken");
        await fetch(`${BASE_URL}carrera/${activeId}/calificar-pasajero`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ puntuacion: rating, mensaje: message || "" }),
        });
      } catch (e) {
        console.error("Error calificando:", e);
      } finally {
        setRatingLoading(false);
      }
    }
    navigation.replace("BottomTabNavigatorDelivery");
  };

  const openMaps = () => {
    if (!pickup || !destination) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${pickup.latitude},${pickup.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
    Linking.openURL(url);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#F1F5F9" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5500" />
          <Text style={styles.loadingText}>Cargando viaje...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !tripData?.id) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#F1F5F9" />
        <View style={styles.center}>
          <Feather name="alert-triangle" size={48} color="#FF4757" style={{ marginBottom: 16 }} />
          <Text style={styles.errorText}>{error || "No se encontró información del viaje"}</Text>
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
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.container}>
          <View style={styles.mapContainer}>
            <RideMap
              mapRef={mapRef}
              pickup={pickup}
              destination={destination}
              driverLocation={driverLocation}
              passengerLocation={passengerLocation}
              driverType={tripData?.conductor?.tipo_usuario}
              route={(state === "to_destination" || state === "to_customer") ? routeCoords.coords : []}
              state={state}
            />
          </View>

          <TopBar state={state} isDelivery={isDelivery} onBack={() => navigation.replace("BottomTabNavigatorDelivery")} />

          {!isFinished && (
            <TouchableOpacity style={styles.mapsBtnTop} onPress={openMaps} activeOpacity={0.8}>
              <MaterialCommunityIcons name="directions" size={20} color="#FFFFFF" />
              <Text style={styles.mapsBtnText}>Cómo llegar</Text>
            </TouchableOpacity>
          )}

          {isFinished ? (
            <FinishedSheet
              tripData={tripData}
              clientName={tripData?.usuario?.nombre_completo}
              onDone={handleDone}
              loading={ratingLoading}
              showRating={!isDelivery}
              pickupAddress={parsedInfo.origen}
              destinationAddress={parsedInfo.destino}
            />
          ) : (
            <ClientSheet
              state={state}
              tripData={tripData}
              pickupAddress={parsedInfo.origen}
              destinationAddress={parsedInfo.destino}
              clientLive={clientLive}
              onToggleClientLive={() => setClientLive((v) => !v)}
              lastLocationUpdate={passengerLocation?.updatedAt}
              onShowChat={openChat}
              onShowCommerceChat={openCommerceChat}
              onApprovePayment={handleApprovePayment}
              onRequestPayment={handleRequestPayment}
              requestingPayment={requestingPayment}
              onArrive={handleArrive}
              onArriveAtStore={handleArriveAtStore}
              onPickupOrder={handlePickupOrder}
              onStartTrip={handleStartTrip}
              onFinish={handleFinish}
              onCompleteDelivery={handleFinish}
              onCancel={() =>
                showAlert(
                  "¿Cancelar arrendamiento?\n\nSi cancelas, este arrendamiento contará como un viaje y afectará tu historial.",
                  "confirm",
                  handleCancel,
                  "Sí, cancelar"
                )
              }
              isDelivery={isDelivery}
              approvingPayment={approvingPayment}
              paymentApproved={paymentApproved}
              hasNewMessages={false}
            />
          )}

          <PinModal
            visible={pinModalVisible}
            pin={tripData?.pin}
            enteredPin={enteredPin}
            setEnteredPin={setEnteredPin}
            pinError={pinError}
            success={pinSuccess}
            onClose={() => {
              setPinModalVisible(false);
              setEnteredPin("");
              setPinError(false);
              setPinSuccess(false);
            }}
            onVerify={verifyPin}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F1F5F9" },
  flex: { flex: 1 },
  container: { flex: 1 },
  mapContainer: { ...StyleSheet.absoluteFillObject },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#64748B",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
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
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
  },
  mapsBtnTop: {
    position: "absolute",
    top: 220,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1A73E8",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 22,
    shadowColor: "#1A73E8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 110,
  },
  mapsBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
  },
});
