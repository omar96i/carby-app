import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  Vibration,
  Animated,
} from "react-native";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";

import { useRideData } from "./hooks/useRideData";
import { useDriverLocation } from "./hooks/useDriverLocation";
import { useChatPolling } from "./hooks/useChatPolling";
import { useRoute as useRouteCoords } from "./hooks/useRoute";
import { useShareLocation } from "./hooks/useShareLocation";
import { parseCoords, reverseGeocode, getRideState, getImageUrl } from "./utils";
import { BASE_URL } from "../../../constants/url";
import { useAudioPlayer } from "expo-audio";

import { TopBar } from "./components/TopBar";
import { RideMap } from "./components/RideMap";
import { SearchingSheet } from "./components/SearchingSheet";
import { DriverSheet } from "./components/DriverSheet";
import { FinishedSheet } from "./components/FinishedSheet";
import { ShareLiveModal } from "./components/ShareLiveModal";
import ChatUsuario from "../../../components/ChatUsuario";
import AlertaModal from "../../../components/ErrorModal";

export default function DetalleCarrera() {
  const navigation = useNavigation();
  const route = useRoute();
  const { tripId = 0, showBack = false } = route.params || {};

  const mapRef = useRef(null);
  const [parsedInfo, setParsedInfo] = useState({ addresA: "", addresB: "", observaciones: "" });
  const [showChat, setShowChat] = useState(false);
  const [shareLive, setShareLive] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });
  const [ratingLoading, setRatingLoading] = useState(false);
  const arrivedSoundTimes = useRef(0);

  const { tripData, isLoading, error, refetch } = useRideData(tripId);
  const driverLocation = useDriverLocation(tripData?.conductor?.id);
  const { messageCount } = useChatPolling(tripId);
  const arrivedPlayer = useAudioPlayer(require("../../../assets/sounds/sonido_close_carro.mp3"));
  useShareLocation(shareLive);

  const pickup = useMemo(() => parseCoords(tripData?.punto_recogida), [tripData?.punto_recogida]);
  const destination = useMemo(() => parseCoords(tripData?.destino), [tripData?.destino]);
  const routeCoords = useRouteCoords(pickup, destination);
  const state = useMemo(() => getRideState(tripData?.estado, tripData?.conductor), [tripData?.estado, tripData?.conductor]);
  const isFinished = state === "finished";

  // Play arrival sound 3 times + vibrate when state becomes "arrived"
  useEffect(() => {
    if (state !== "arrived" || !arrivedPlayer) return;
    arrivedSoundTimes.current = 0;
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    const sub = arrivedPlayer.addListener("playbackStatusUpdate", (status) => {
      if (status?.didJustFinish) {
        arrivedSoundTimes.current += 1;
        if (arrivedSoundTimes.current < 3) {
          arrivedPlayer.seekTo(0);
          arrivedPlayer.play();
        } else {
          arrivedPlayer.remove();
        }
      }
    });
    arrivedPlayer.play();
    return () => sub?.remove();
  }, [state, arrivedPlayer]);

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null, onClose = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel, onClose });
    setAlertVisible(true);
  };

  // Resolve addresses
  useEffect(() => {
    const procesar = async () => {
      let pA = "";
      let pB = "";
      let obs = "";

      // Try to read saved address strings first
      if (tripData?.informacion_adicional) {
        try {
          const info = JSON.parse(tripData.informacion_adicional);
          pA = info.origen || "";
          pB = info.destino || "";
          obs = info.observaciones || "";
        } catch (e) {}
      }

      // Parse coords and fall back to reverse geocoding
      const pickup = parseCoords(tripData?.punto_recogida);
      const destination = parseCoords(tripData?.destino);
      if (!pA && pickup) pA = await reverseGeocode(pickup.latitude, pickup.longitude);
      if (!pB && destination) pB = await reverseGeocode(destination.latitude, destination.longitude);

      const next = {
        addresA: pA || "Punto de recogida",
        addresB: pB || "Destino",
        observaciones: obs,
      };

      setParsedInfo((prev) => {
        if (prev.addresA === next.addresA && prev.addresB === next.addresB && prev.observaciones === next.observaciones) {
          return prev;
        }
        return next;
      });
    };
    if (tripData?.id) procesar();
  }, [tripData?.id, tripData?.punto_recogida, tripData?.destino, tripData?.informacion_adicional]);

  // Hide tab bar
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
      return () =>
        navigation.getParent()?.setOptions({
          tabBarStyle: { backgroundColor: "#FFF", height: 56, borderTopWidth: 1, borderTopColor: "#F0F0F0", display: "flex" },
        });
    }, [navigation])
  );

  const goHome = () => {
    navigation.replace("BottomTabNavigatorUsuario");
  };

  const handleCancel = () => {
    showAlert("¿Seguro que deseas cancelar?", "confirm", async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        await fetch(`${BASE_URL}carreras/${tripData.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ estado: "cancelado" }),
        });
        showAlert("Viaje cancelado", "success", goHome, "Aceptar", goHome);
      } catch (e) {
        showAlert("No se pudo cancelar el viaje", "error");
      }
    }, "Sí, cancelar");
  };

  const handleToggleShare = () => {
    if (!shareLive) {
      setShareModalVisible(true);
    } else {
      setShareLive(false);
    }
  };

  const handleActivateShare = () => {
    setShareModalVisible(false);
    setShareLive(true);
  };

  const handleShowPin = () => {
    showAlert(
      `PIN de seguridad: ${tripData?.pin || "----"}`,
      "info",
      () => setAlertVisible(false),
      "Entendido"
    );
  };

  const handleDone = async ({ rating, message }) => {
    if (rating > 0 && tripData?.id) {
      setRatingLoading(true);
      try {
        const token = await AsyncStorage.getItem("userToken");
        await fetch(`${BASE_URL}carrera/${tripData.id}/calificar-conductor`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ puntuacion: rating, mensaje: message || "" }),
        });
      } catch (e) {
        console.error("Error calificando:", e);
      } finally {
        setRatingLoading(false);
      }
    }
    navigation.navigate("Home");
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#F1F5F9" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5500" />
          <Text style={styles.loadingText}>Conectando con conductor...</Text>
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
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F1F5F9" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.container}>
          {/* Map */}
          <View style={styles.mapContainer}>
            <RideMap
              mapRef={mapRef}
              pickup={pickup}
              destination={destination}
              driverLocation={driverLocation}
              driverType={tripData?.conductor?.tipo_usuario}
              route={routeCoords}
              state={state}
            />
          </View>

          {/* Top Bar */}
          <TopBar
            state={state}
            showBack={showBack}
            onBack={() => navigation.goBack()}
          />

          {/* Arrived banner */}
          {state === "arrived" && <ArrivedBanner />}

          {/* Bottom Sheet */}
          {state === "searching" ? (
            <SearchingSheet
              origin={parsedInfo?.addresA}
              destination={parsedInfo?.addresB}
              distance={tripData?.distancia}
              duration={tripData?.duracion_estimada}
              onCancel={handleCancel}
            />
          ) : state === "canceled" ? (
            <View style={styles.canceledSheet}>
              <Feather name="x-circle" size={48} color="#FF4757" />
              <Text style={styles.canceledTitle}>Viaje cancelado</Text>
              <Text style={styles.canceledSub}>Tu solicitud fue cancelada correctamente.</Text>
              <TouchableOpacity style={styles.canceledBtn} onPress={goHome} activeOpacity={0.8}>
                <Text style={styles.canceledBtnText}>Volver al inicio</Text>
              </TouchableOpacity>
            </View>
          ) : isFinished ? (
            <FinishedSheet
              tripData={tripData}
              driverName={tripData?.conductor?.nombre_completo}
              onDone={handleDone}
              loading={ratingLoading}
            />
          ) : (
            <DriverSheet
              state={state}
              tripData={tripData}
              parsedInfo={parsedInfo}
              shareLive={shareLive}
              onToggleShare={handleToggleShare}
              onShowPin={handleShowPin}
              onShowChat={() => setShowChat(true)}
              onCall={() => {}}
              onCancel={handleCancel}
              hasNewMessages={messageCount > 0}
            />
          )}

          {/* Chat overlay */}
          {showChat && (
            <View style={styles.chatOverlay}>
              <TouchableOpacity
                style={styles.chatBackdrop}
                activeOpacity={1}
                onPress={() => setShowChat(false)}
              />
              <View style={styles.chatPanel}>
                <View style={styles.chatHeader}>
                  <Image
                    source={
                      getImageUrl(tripData?.conductor?.foto_documento_file)
                        ? { uri: getImageUrl(tripData.conductor.foto_documento_file) }
                        : require("../../../assets/images/nuevo-icono.jpeg")
                    }
                    style={styles.chatAvatar}
                  />
                  <View style={styles.chatHeaderText}>
                    <Text style={styles.chatTitle} numberOfLines={1}>
                      {tripData?.conductor?.nombre_completo || "Conductor"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowChat(false)} style={styles.closeChatBtn}>
                    <Feather name="x" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <View style={styles.chatBody}>
                  <ChatUsuario tripId={tripId} />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Share live modal */}
        <ShareLiveModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          onActivate={handleActivateShare}
        />

        {/* Alert modal */}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ArrivedBanner() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={[styles.arrivedBanner, { transform: [{ scale: pulseAnim }] }]}>
      <View style={styles.arrivedIconWrap}>
        <Feather name="map-pin" size={22} color="#FF5500" />
      </View>
      <View style={styles.arrivedTextBox}>
        <Text style={styles.arrivedTitle}>¡Tu conductor llegó!</Text>
        <Text style={styles.arrivedSub}>Sal ahora, te espera en el punto de recogida.</Text>
      </View>
    </Animated.View>
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
  arrivedBanner: {
    position: "absolute",
    top: 140,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FF5500",
    padding: 14,
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 100,
  },
  arrivedIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
  },
  arrivedTextBox: {
    flex: 1,
  },
  arrivedTitle: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  arrivedSub: {
    fontSize: 12,
    fontFamily: "Montserrat",
    color: "#64748B",
    marginTop: 2,
  },
  chatOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2000,
  },
  chatBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.35)",
  },
  chatPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "80%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
    overflow: "hidden",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FF5500",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  chatHeaderText: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  closeChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  chatBody: {
    flex: 1,
  },
  canceledSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#E2E8F0",
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 20,
  },
  canceledTitle: {
    fontSize: 18,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 16,
  },
  canceledSub: {
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  canceledBtn: {
    width: "100%",
    backgroundColor: "#FF4757",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
  },
  canceledBtnText: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});
