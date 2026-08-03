import { useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  StatusBar,
  Dimensions
} from "react-native";
import { FontAwesome, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_600SemiBold,
  Montserrat_500Medium,
  Montserrat_300Light,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import React, { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import ChatUsuario from "../../components/ChatUsuario";
import AlertaModal from "../../components/ErrorModal";
import Modal from "react-native-modal";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps"; // Importamos MapView
import SafetyProtection from "../../components/SafetyProtection";

const { height, width } = Dimensions.get("window");

// --- Helper (Reverse Geocode) ---
const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json", "User-Agent": "YaRidersApp" } }
    );
    if (!response.ok) throw new Error("Error en geocodificación");
    const data = await response.json();
    return data.display_name
      ? data.display_name.length > 60
        ? data.display_name.substring(0, 60) + "..."
        : data.display_name
      : `${lat}, ${lng}`;
  } catch (error) {
    return `${lat}, ${lng}`;
  }
};

export default function StepNueve({ route }) {
  const { tripId = 0, type = "carrera" } = route.params || {};
  const [tripData, setTripData] = useState({});
  const [isLoading, setIsLoading] = useState(true); // Empezamos cargando
  const [error, setError] = useState(null);
  const [parsedInfo, setParsedInfo] = useState({});

  // Estados para modales
  const [isModalVisible, setModalVisible] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [codigoConfirmacion, setCodigoConfirmacion] = useState("");
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [riderQrData, setRiderQrData] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);

  // Estados Mapa y Tracking
  const mapRef = useRef(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  const navigation = useNavigation();

  let [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_600SemiBold,
    Montserrat_500Medium,
    Montserrat_300Light,
  });

  // --- 1. CARGAR DATOS DEL VIAJE ---
  const fetchTripData = async () => {
    if (!tripId) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("No token");

      const endpoint = type === "pedido" ? `pedidos/${tripId}` : `carreras/${tripId}`;
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Error obteniendo viaje");
      const responseData = await response.json();
      setTripData(responseData);

      if (type === "carrera" && responseData.pin) setCodigoConfirmacion(responseData.pin);

      // Parsear Coordenadas Fijas
      if (responseData.punto_recogida) {
        const p = typeof responseData.punto_recogida === 'string' ? JSON.parse(responseData.punto_recogida) : responseData.punto_recogida;
        setPickupCoords({ latitude: parseFloat(p.lat), longitude: parseFloat(p.lng) });
      }
      if (responseData.destino) {
        const d = typeof responseData.destino === 'string' ? JSON.parse(responseData.destino) : responseData.destino;
        setDestCoords({ latitude: parseFloat(d.lat), longitude: parseFloat(d.lng) });
      }

    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTripData(); }, [tripId]);

  // --- 2. TRACKING EN VIVO (PING CADA 5s) ---
  useEffect(() => {
    let intervalId;

    const fetchDriverLocation = async () => {
      // Solo buscamos si hay un conductor asignado
      if (!tripData?.conductor?.id) return;

      try {
        console.log("obteniendo la ubicacion del driver")
        const token = await AsyncStorage.getItem("userToken");
        // Usamos la API que definimos: ubicacion-conductor/{user_id}
        const response = await fetch(`${BASE_URL}ubicacion-conductor/${tripData.conductor.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const json = await response.json();

        if (json.status && json.data) {
          const { latitud, longitud } = json.data;
          const newLoc = { latitude: parseFloat(latitud), longitude: parseFloat(longitud) };
          setDriverLocation(newLoc);
        }
      } catch (e) {
        console.log("Error fetching driver location (silent):", e);
      }
    };

    // Ejecutar inmediatamente si ya tenemos datos del trip
    if (tripData?.conductor?.id) {
      fetchDriverLocation();
      intervalId = setInterval(fetchDriverLocation, 5000); // 5 segundos
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [tripData?.conductor?.id]);

  // --- 3. AJUSTAR CÁMARA DEL MAPA ---
  useEffect(() => {
    if (mapRef.current && driverLocation && pickupCoords) {
      // Intentamos mostrar Conductor + Destino (o Recogida si está empezando)
      // Prioridad: Conductor y hacia donde va.
      const markers = [driverLocation];
      if (destCoords) markers.push(destCoords);
      else if (pickupCoords) markers.push(pickupCoords);

      mapRef.current.fitToCoordinates(markers, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true
      });
    }
  }, [driverLocation, destCoords]);


  // --- PARSEAR INFO TEXTO (DIRECCIONES) ---
  useEffect(() => {
    const procesarInfo = async () => {
      if (!tripData) return;
      let pA = "Origen", pB = "Destino", obs = "";

      if (type === "pedido" && tripData.datos_generales) {
        try {
          const info = JSON.parse(tripData.datos_generales);
          pA = info.start_lugar || pA; pB = info.end_lugar || pB;
        } catch (e) { }
      } else {
        if (pickupCoords) pA = await reverseGeocode(pickupCoords.latitude, pickupCoords.longitude);
        if (destCoords) pB = await reverseGeocode(destCoords.latitude, destCoords.longitude);
        if (tripData.informacion_adicional) {
          try { obs = JSON.parse(tripData.informacion_adicional).observaciones || ""; } catch (e) { }
        }
      }
      setParsedInfo({ addresA: pA, addresB: pB, observaciones: obs });
    };
    if (tripData.id) procesarInfo();
  }, [tripData, pickupCoords, destCoords]);


  // --- FUNCIONES AUXILIARES (QR, Cancelar) ---
  const fetchRiderQrCode = async () => {
    if (!tripData?.conductor?.id) return;
    try {
      setLoadingQr(true);
      const token = await AsyncStorage.getItem("userToken");
      const response = await fetch(`${BASE_URL}usuario/${tripData.conductor.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setRiderQrData(data);
      setQrModalVisible(true);
    } catch (error) { showAlert("No se pudo obtener el QR", "error"); }
    finally { setLoadingQr(false); }
  };

  const cancelarCarrera = async (id) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      await fetch(`${BASE_URL}carreras/${id}`, {
        method: 'POST',
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado: 'cancelado' }),
      });
      navigation.goBack();
      showAlert("Servicio cancelado.", "success");
    } catch (e) { showAlert("No se pudo cancelar", "error"); }
  };

  if (!fontsLoaded) return null;

  let imageUrl = "https://via.placeholder.com/150";
  if (tripData?.conductor?.foto_documento_file) imageUrl = `https://back.carbycol.com/storage/${tripData.conductor.foto_documento_file}`;
  else if (tripData?.comercio?.foto_documento_file) imageUrl = `https://back.carbycol.com/storage/${tripData.comercio.foto_documento_file}`;

  const getVehicleIcon = (tipoUsuario) => {
    switch (tipoUsuario) {
      case 'rider.taxi':
        return 'car-side'; // O 'car'
      case 'rider.moto':
        return 'motorbike';
      case 'rider.mototaxi':
        return 'rickshaw';
      default:
        return 'motorbike'; // Por defecto si no detecta
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />

      {/* Header Flotante */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {type === "pedido" ? "Tu Pedido" : "En Camino"}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#fa6205" />
          <Text style={styles.loadingText}>Conectando con conductor...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Feather name="alert-triangle" size={48} color="#FF4757" style={{ marginBottom: 16 }} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTripData}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

            {/* --- MAPA EN VIVO --- */}
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                  latitude: pickupCoords?.latitude || -12.0464, // Fallback Lima/Pereira
                  longitude: pickupCoords?.longitude || -77.0428,
                  latitudeDelta: 0.015,
                  longitudeDelta: 0.015,
                }}
              >
                {/* Marcador Origen */}
                {pickupCoords && (
                  <Marker coordinate={pickupCoords} title="Recogida" zIndex={5} anchor={{ x: 0.5, y: 0.5 }}>
                    <View style={[styles.dotMarker, { backgroundColor: '#fa6205' }]} />
                  </Marker>
                )}

                {/* Marcador Destino */}
                {destCoords && (
                  <Marker coordinate={destCoords} title="Destino" zIndex={5} anchor={{ x: 0.5, y: 0.5 }}>
                    <View style={[styles.dotMarker, { backgroundColor: '#FF4757' }]} />
                  </Marker>
                )}


                {/* --- CONDUCTOR EN VIVO --- */}
                {driverLocation && (
                  <Marker
                    coordinate={driverLocation}
                    title="Conductor"
                    anchor={{ x: 0.5, y: 0.5 }}
                  // flat={true} // Opcional: hace que el icono rote con el mapa si añades rotación luego
                  >
                    <View style={styles.driverMarker}>
                      {/* AQUÍ USAMOS LA FUNCIÓN DINÁMICA */}
                      <MaterialCommunityIcons
                        name={getVehicleIcon(tripData?.conductor?.tipo_usuario)}
                        size={15}
                        color="#000"
                      />
                    </View>
                  </Marker>
                )}
              </MapView>

              {/* Overlay de estado */}
              <View style={styles.mapStatusOverlay}>
                <View style={styles.statusBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.statusText}>En vivo</Text>
                </View>
              </View>
            </View>

            {/* Tarjeta Conductor */}
            <View style={styles.driverCard}>
              <Image source={{ uri: imageUrl }} style={styles.driverImage} />
              <View style={styles.driverInfo}>
                <Text style={styles.driverLabel}>{type === "pedido" ? "Comercio" : "Conductor"}</Text>
                <Text style={styles.driverName} numberOfLines={1}>
                  {type === "pedido" ? tripData?.comercio?.establecimiento_nombre : tripData?.conductor?.nombre_completo || "Asignando..."}
                </Text>
                <View style={styles.driverPhoneContainer}>
                  <Feather name="phone" size={14} color="#fa6205" />
                  <Text style={styles.driverPhone}>
                    {type === "pedido" ? tripData?.comercio?.numero_telefono : tripData?.conductor?.numero_telefono || "---"}
                  </Text>
                </View>
                {type === "carrera" && tripData?.service?.nombre && (
                  <Text style={styles.serviceTag}>{tripData.service.nombre}</Text>
                )}
              </View>
            </View>

            {type === "carrera" && ["aceptado", "activo"].includes(tripData?.estado) && (
              <SafetyProtection carreraId={tripData.id || tripId} role="usuario" />
            )}

            {/* Acciones */}
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]} onPress={fetchRiderQrCode} disabled={loadingQr}>
                <MaterialCommunityIcons name="qrcode-scan" size={20} color="#000" />
                <Text style={styles.actionButtonTextPrimary}>
                  "Pago Nequi / Bancolombia"
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={() => setModalVisible(true)}>
                <Feather name="lock" size={20} color="#1C1C1E" />
                <Text style={styles.actionButtonTextSecondary}>Ver PIN</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={() => setShowChat(true)}>
                <Feather name="message-circle" size={20} color="#1C1C1E" />
                <Text style={styles.actionButtonTextSecondary}>Chat</Text>
              </TouchableOpacity>
            </View>

            {/* Vehículo */}
            {tripData?.conductor && (
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <MaterialCommunityIcons name="car-sports" size={20} color="#fa6205" />
                  <Text style={styles.infoCardTitle}>Vehículo</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Placa</Text>
                  <Text style={styles.infoValueHighlight}>{tripData?.conductor?.placa || "---"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Detalles</Text>
                  <Text style={styles.infoValue}>{tripData?.conductor?.marca_vehiculo} - {tripData?.conductor?.color}</Text>
                </View>
              </View>
            )}

            {/* Ruta Texto */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Feather name="map-pin" size={18} color="#fa6205" />
                <Text style={styles.infoCardTitle}>Ruta</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.routeRow}>
                <View style={styles.dotOrigin} />
                <Text style={styles.routeText}>{parsedInfo?.addresA}</Text>
              </View>
              <View style={styles.connectorLine} />
              <View style={styles.routeRow}>
                <View style={styles.dotDest} />
                <Text style={styles.routeText}>{parsedInfo?.addresB}</Text>
              </View>
            </View>

            {/* Costo */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Feather name="dollar-sign" size={18} color="#fa6205" />
                <Text style={styles.infoCardTitle}>Costo</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Estimado</Text>
                <Text style={styles.priceValue}>
                  {"$"}
                  {type === "pedido" ? parseFloat(tripData?.costo_total || 0).toLocaleString() : parseFloat(tripData?.costo || 0).toLocaleString()}
                </Text>
              </View>
              {parsedInfo?.observaciones ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.infoLabel}>Observaciones:</Text>
                  <Text style={styles.infoValueItalic}>{parsedInfo.observaciones}</Text>
                </View>
              ) : null}
            </View>

            {/* Cancelar */}
            <TouchableOpacity style={styles.cancelButton} onPress={() => showAlert("¿Seguro?", "confirm", () => cancelarCarrera(tripData.id), "Sí, cancelar")}>
              <Text style={styles.cancelButtonText}>Cancelar Servicio</Text>
            </TouchableOpacity>

          </ScrollView>

          {showChat && (
            <View style={styles.chatOverlay}>
              <View style={styles.chatHeaderOverlay}>
                <Text style={styles.chatHeaderTitle}>Chat con Conductor</Text>
                <TouchableOpacity onPress={() => setShowChat(false)} style={styles.closeChatBtn}><Feather name="x" size={24} color="#1C1C1E" /></TouchableOpacity>
              </View>
              <ChatUsuario tripId={tripId} />
            </View>
          )}
        </KeyboardAvoidingView>
      )}

      {/* MODALES QR Y PIN (Iguales) */}
      <Modal isVisible={qrModalVisible} backdropOpacity={0.8} onBackdropPress={() => setQrModalVisible(false)} animationIn="zoomIn" animationOut="zoomOut">
        <View style={styles.modalContent}>
          <Text style={styles.modalHeader}>Escanea para Pagar</Text>
          <View style={styles.qrFrame}>
            {riderQrData?.data?.user_tipo_pago?.qr_file ? (
              <Image source={{ uri: `${BASE_URL.toString().replace("/api", "")}storage/${riderQrData.data.user_tipo_pago.qr_file}` }} style={styles.qrImage} resizeMode="contain" />
            ) : (
              <View style={styles.noQrBox}><Feather name="image" size={40} color="#555" /><Text style={styles.noQrText}>Sin QR</Text></View>
            )}
          </View>
          <TouchableOpacity style={styles.modalButtonPrimary} onPress={() => setQrModalVisible(false)}><Text style={styles.modalButtonText}>Cerrar</Text></TouchableOpacity>
        </View>
      </Modal>

      <Modal isVisible={isModalVisible} backdropOpacity={0.8} onBackdropPress={() => setModalVisible(false)} animationIn="fadeInUp" animationOut="fadeOutDown">
        <View style={styles.modalContent}>
          <Feather name="shield" size={40} color="#fa6205" style={{ marginBottom: 15 }} />
          <Text style={styles.modalHeader}>PIN de Seguridad</Text>
          <Text style={styles.modalSubtext}>Comparte este código con el conductor.</Text>
          <View style={styles.pinBox}><Text style={styles.pinText}>{codigoConfirmacion || "----"}</Text></View>
          <TouchableOpacity style={styles.modalButtonPrimary} onPress={() => setModalVisible(false)}><Text style={styles.modalButtonText}>Entendido</Text></TouchableOpacity>
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

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#F2F2F7" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15, paddingTop: 30, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  backButton: { padding: 8, marginRight: 10 },
  headerTitle: { fontSize: 18, fontFamily: "Montserrat_700Bold", color: "#1C1C1E" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  loadingText: { marginTop: 15, color: "#fa6205", fontFamily: "Montserrat_500Medium" },
  errorText: { color: "#1C1C1E", textAlign: "center", marginBottom: 20, fontFamily: "Montserrat_400Regular" },
  contentContainer: { flex: 1, padding: 20 },

  // MAPA ESTILO
  mapContainer: { height: 250, borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  dotMarker: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#FFF' },
  driverMarker: { backgroundColor: '#fa6205', padding: 5, borderRadius: 20, borderWidth: 2, borderColor: '#FFF' },
  mapStatusOverlay: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4757', marginRight: 5 },
  statusText: { color: '#1C1C1E', fontSize: 10, fontWeight: 'bold' },

  // DRIVER CARD
  driverCard: { flexDirection: "row", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, alignItems: "center", marginBottom: 20, borderWidth: 1, borderColor: "#F0F0F0" },
  driverImage: { width: 60, height: 60, borderRadius: 30, marginRight: 15, backgroundColor: '#333' },
  driverInfo: { flex: 1 },
  driverLabel: { fontSize: 12, color: "#888", fontFamily: "Montserrat_400Regular" },
  driverName: { fontSize: 16, color: "#1C1C1E", fontFamily: "Montserrat_700Bold", marginBottom: 2 },
  driverPhoneContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  driverPhone: { fontSize: 14, color: "#CCC", marginLeft: 6, fontFamily: "Montserrat_500Medium" },
  serviceTag: { marginTop: 4, backgroundColor: 'rgba(160, 255, 0, 0.1)', color: '#fa6205', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 10, fontFamily: "Montserrat_700Bold" },

  // ACCIONES
  actionsGrid: { flexDirection: 'column', gap: 10, marginBottom: 25 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  actionButtonPrimary: { backgroundColor: "#fa6205", elevation: 4 },
  actionButtonSecondary: { backgroundColor: "#F0F0F0", borderWidth: 1, borderColor: "#333" },
  actionButtonTextPrimary: { color: "#000", fontFamily: "Montserrat_700Bold", marginLeft: 8, fontSize: 16 },
  actionButtonTextSecondary: { color: "#1C1C1E", fontFamily: "Montserrat_600SemiBold", marginLeft: 8, fontSize: 16 },

  // INFO GENERAL
  infoCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: "#F0F0F0" },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoCardTitle: { color: "#1C1C1E", fontFamily: "Montserrat_600SemiBold", fontSize: 14, marginLeft: 8 },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  infoLabel: { color: "#888", fontSize: 13, fontFamily: "Montserrat_500Medium" },
  infoValue: { color: "#1C1C1E", fontSize: 13, fontFamily: "Montserrat_400Regular", textAlign: 'right', flex: 1, marginLeft: 10 },
  infoValueHighlight: { color: "#1C1C1E", fontSize: 15, fontFamily: "Montserrat_700Bold", backgroundColor: "#F0F0F0", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  infoValueItalic: { color: "#CCC", fontSize: 13, fontFamily: "Montserrat_400Regular", fontStyle: 'italic', marginTop: 4 },
  priceValue: { color: "#fa6205", fontSize: 18, fontFamily: "Montserrat_700Bold" },

  // RUTA VISUAL
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 2 },
  dotOrigin: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#CCC", marginTop: 4, marginRight: 10 },
  dotDest: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#fa6205", marginTop: 4, marginRight: 10 },
  connectorLine: { width: 2, height: 15, backgroundColor: "#333", marginLeft: 4, marginVertical: 2 },
  routeText: { color: "#1C1C1E", fontSize: 13, fontFamily: "Montserrat_400Regular", flex: 1 },

  // BOTONES VARIOS
  cancelButton: { marginTop: 10, paddingVertical: 15, borderWidth: 1, borderColor: "#FF4757", borderRadius: 12, alignItems: 'center', marginBottom: 30 },
  cancelButtonText: { color: "#FF4757", fontFamily: "Montserrat_600SemiBold", fontSize: 14 },
  retryButton: { backgroundColor: "#fa6205", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  retryButtonText: { color: "#000", fontWeight: 'bold' },

  // CHAT
  chatOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '85%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 20, padding: 20 },
  chatHeaderOverlay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  chatHeaderTitle: { color: "#1C1C1E", fontSize: 18, fontFamily: "Montserrat_700Bold" },
  closeChatBtn: { padding: 5 },

  // MODALES
  modalContent: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 25, alignItems: "center", borderWidth: 1, borderColor: "#333" },
  modalHeader: { fontSize: 20, color: "#1C1C1E", fontFamily: "Montserrat_700Bold", marginBottom: 10 },
  modalSubtext: { color: "#AAA", textAlign: 'center', marginBottom: 20, fontSize: 14, fontFamily: "Montserrat_400Regular" },
  qrFrame: { backgroundColor: "#FFF", padding: 10, borderRadius: 12, marginBottom: 20 },
  qrImage: { width: 220, height: 220 },
  noQrBox: { width: 220, height: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEE' },
  noQrText: { marginTop: 10, color: '#555', fontFamily: "Montserrat_500Medium" },
  pinBox: { backgroundColor: "#F0F0F0", paddingHorizontal: 40, paddingVertical: 15, borderRadius: 12, marginBottom: 25, borderWidth: 1, borderColor: "#fa6205" },
  pinText: { color: "#fa6205", fontSize: 32, fontFamily: "Montserrat_700Bold", letterSpacing: 4 },
  modalButtonPrimary: { backgroundColor: "#fa6205", width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalButtonText: { color: "#000", fontSize: 16, fontFamily: "Montserrat_700Bold" }
});
