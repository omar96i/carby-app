import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  Linking,
  Alert,
  TextInput,
  Dimensions,
  StatusBar,
  Platform
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { MaterialIcons, FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_500Medium } from "@expo-google-fonts/inter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { BASE_URL } from "../../constants/url";
import ChatScreen from "../../components/ChatScreen";
import AlertaModal from "../../components/ErrorModal";

const { height } = Dimensions.get("window");

export default function StepTrece({ route }) {
  const { carreraId, tripId } = route.params || {};
  const activeId = carreraId || tripId || 0;
  const navigation = useNavigation();

  const [tripData, setTripData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [parsedInfo, setParsedInfo] = useState({});
  const [origen, setOrigen] = useState("Cargando dirección...");
  const [destino, setDestino] = useState("Cargando dirección...");
  const [imageError, setImageError] = useState(false);
  
  const [userLocation, setUserLocation] = useState(null);
  const mapRef = useRef(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [approvingPayment, setApprovingPayment] = useState(false);

  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [hasShownInfoModal, setHasShownInfoModal] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({});

  const showAlert = (title, message, type, onConfirm, primaryLabel) => {
    setAlertData({ title, message, type: type || (title === "Éxito" ? "success" : "error"), onConfirm: onConfirm || null, primaryLabel: primaryLabel || null });
    setAlertVisible(true);
  };

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Inter_500Medium,
  });

  // --- OBTENER UBICACIÓN INICIAL Y CONFIGURAR INTERVALO DE PING ---
  useEffect(() => {
    let locationInterval;

    const startLocationTracking = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // 1. Obtener ubicación inicial
      let location = await Location.getCurrentPositionAsync({});
      const initialCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(initialCoords);

      // 2. Función para mandar coordenadas al servidor (Ping)
      const sendLocationPing = async () => {
        try {
            // Obtenemos la posición actual fresca
            let currentLoc = await Location.getCurrentPositionAsync({});
            const lat = currentLoc.coords.latitude;
            const lng = currentLoc.coords.longitude;
            
            // Actualizamos estado local (opcional, para mover el mapa si quisieras)
            setUserLocation({ latitude: lat, longitude: lng });

            const userToken = await AsyncStorage.getItem("userToken");
            if (!userToken) return;
            console.log("enviando el ping")
            // Enviamos a la API solo para registrar la ubicación
            await fetch(`${BASE_URL}carreras/nearby`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
                body: JSON.stringify({ lat: lat, lng: lng })
            });
            // No procesamos la respuesta JSON, solo nos importa el envío.
        } catch (e) {
            // Error silencioso en el ping para no molestar al usuario
            console.log("Error enviando ubicación:", e); 
        }
      };

      // 3. Ejecutar inmediatamente el primer ping
      sendLocationPing();

      // 4. Configurar intervalo cada 10 segundos
      locationInterval = setInterval(sendLocationPing, 10000);
    };

    startLocationTracking();

    // Limpieza al salir de la pantalla
    return () => {
        if (locationInterval) clearInterval(locationInterval);
    };
  }, []);

  useEffect(() => {
    if (tripData && mapRef.current) {
        try {
            const pRecogida = typeof tripData.punto_recogida === 'string' ? JSON.parse(tripData.punto_recogida) : tripData.punto_recogida;
            const pDestino = typeof tripData.destino === 'string' ? JSON.parse(tripData.destino) : tripData.destino;
            
            const markers = [];
            if (userLocation) markers.push(userLocation);
            if (pRecogida?.lat) markers.push({ latitude: pRecogida.lat, longitude: pRecogida.lng });
            if (pDestino?.lat) markers.push({ latitude: pDestino.lat, longitude: pDestino.lng });

            if (markers.length > 0) {
                mapRef.current.fitToCoordinates(markers, {
                    edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
                    animated: true,
                });
            }
        } catch (e) {}
    }
  }, [tripData, userLocation]);

  const getAddressFromCoordinates = async (lat, lng, setter) => {
    try {
      const response = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (response && response.length > 0) {
        const addr = response[0];
        const street = addr.street ? `${addr.street} ${addr.streetNumber || ''}` : '';
        setter(street || addr.name || addr.district || "Dirección detectada");
      } else {
        setter("Dirección no encontrada");
      }
    } catch (error) {
      setter("Error al obtener dirección");
    }
  };

  const processCarreraData = (data) => {
    if (data?.informacion_adicional) {
      try {
        setParsedInfo(typeof data.informacion_adicional === "string" ? JSON.parse(data.informacion_adicional) : data.informacion_adicional);
      } catch (e) { setParsedInfo({}); }
    }
    if (data?.punto_recogida) {
      try {
        const o = typeof data.punto_recogida === "string" ? JSON.parse(data.punto_recogida) : data.punto_recogida;
        if (o.lat && o.lng) getAddressFromCoordinates(o.lat, o.lng, setOrigen);
      } catch (e) {}
    }
    if (data?.destino) {
      try {
        const d = typeof data.destino === "string" ? JSON.parse(data.destino) : data.destino;
        if (d.lat && d.lng) getAddressFromCoordinates(d.lat, d.lng, setDestino);
      } catch (e) {}
    }
  };

  const fetchTripData = async () => {
    if (!activeId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await fetch(`${BASE_URL}carreras/${activeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Error API");
      const responseData = await response.json();
      const data = responseData.data || responseData;
      
      setTripData(data);
      processCarreraData(data);
      if (data.estado_pago === 'aprobado') setPaymentApproved(true);

    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTripData(); }, [activeId]);

  useEffect(() => {
    const showInfoModalIfNeeded = async () => {
      if (tripData && !hasShownInfoModal) {
        const hasShown = await checkIfInfoModalShown();
        if (!hasShown) setInfoModalVisible(true);
        else setHasShownInfoModal(true);
      }
    };
    showInfoModalIfNeeded();
  }, [tripData, hasShownInfoModal]);

  const checkIfInfoModalShown = async () => {
    try { return await AsyncStorage.getItem(`info_modal_shown_${activeId}`) === 'true'; } catch (e) { return false; }
  };
  const closeInfoModal = async () => {
    setInfoModalVisible(false);
    try { await AsyncStorage.setItem(`info_modal_shown_${activeId}`, 'true'); setHasShownInfoModal(true); } catch (e) {}
  };

  const handleNotifyArrival = async (from) => {
    try {
      let url = '';
      if (from === 'comercio') {
        if (!tripData?.pedido_id) return;
        url = `${BASE_URL}enviar-comercio/${tripData.pedido_id}`;
      } else if (from === 'usuario') {
        if (!tripData?.usuario_id) return;
        url = `${BASE_URL}enviar-usuario/${tripData.usuario_id}`;
      } else {
        url = `${BASE_URL}enviar-comercio-finish/${tripData.pedido_id}`;
      }
      
      const token = await AsyncStorage.getItem("userToken");
      const response = await fetch(url, { 
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Error al notificar");
      showAlert("Éxito", `Se ha notificado al ${from === 'comercio' ? 'comercio' : 'cliente'} exitosamente.`);
    } catch (error) {
      showAlert("Error", "No se pudo enviar la notificación");
    }
  };

  const navigateWithGoogleMaps = async () => {
    try {
        const dropoff = typeof tripData.destino === 'string' ? JSON.parse(tripData.destino) : tripData.destino;
        const pickup = typeof tripData.punto_recogida === 'string' ? JSON.parse(tripData.punto_recogida) : tripData.punto_recogida;
        
        if (dropoff?.lat) {
            const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation?.latitude},${userLocation?.longitude}&destination=${dropoff.lat},${dropoff.lng}&waypoints=${pickup?.lat},${pickup?.lng}&travelmode=driving`;
            Linking.openURL(url);
        } else {
            showAlert("Error", "Coordenadas incompletas");
        }
    } catch (e) { showAlert("Error", "No se puede abrir mapas"); }
  };

  const approvePayment = async () => {
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
          setTripData(prev => ({ ...prev, estado_pago: "aprobado" }));
          showAlert("Éxito", "Pago aprobado correctamente");
      } else {
          showAlert("Error", "No se pudo aprobar el pago");
      }
    } catch (error) {
      showAlert("Error", "Problema de conexión");
    } finally {
      setApprovingPayment(false);
    }
  };

  const verifyPin = async () => {
    if (enteredPin === tripData?.pin) {
      setSuccessMessage(true);
      setPinError(false);
      try {
        const token = await AsyncStorage.getItem("userToken");
        await fetch(`${BASE_URL}carreras/${activeId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ estado: "completado" }),
        });
        
        setTimeout(() => {
          setModalVisible(false);
          navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
          });
        }, 1500);

      } catch (error) {
        showAlert("Error", "Error al finalizar en servidor");
      }
    } else {
      setPinError(true);
    }
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
          showAlert("Cancelado", "Carrera cancelada.");
      } catch (e) { showAlert("Error", "No se pudo cancelar"); }
  };

  const submitRating = async () => {
    if (rating === 0) return showAlert("Error", "Selecciona estrellas");
    setIsSubmittingRating(true);
    try {
        const token = await AsyncStorage.getItem("userToken");
        const response = await fetch(`${BASE_URL}carrera/${activeId}/calificar-pasajero`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ puntuacion: rating, mensaje: ratingComment || "Sin comentarios" }),
        });
        if (response.ok) {
            setRatingModalVisible(false);
            setHasRated(true);
            showAlert("Éxito", "Calificación enviada");
        }
    } catch (e) { showAlert("Error", "Error enviando calificación"); }
    finally { setIsSubmittingRating(false); }
  };

  const renderStars = () => {
    let stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={() => setRating(i)} style={{padding: 5}}>
          <FontAwesome name={i <= rating ? "star" : "star-o"} size={32} color={i <= rating ? "#FFD700" : "#CCCCCC"} />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  if (!fontsLoaded || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fa6205" />
        <Text style={styles.loadingText}>Cargando viaje...</Text>
      </View>
    );
  }

  let pickupCoords = null, destCoords = null;
  try {
      pickupCoords = typeof tripData?.punto_recogida === 'string' ? JSON.parse(tripData.punto_recogida) : tripData?.punto_recogida;
      destCoords = typeof tripData?.destino === 'string' ? JSON.parse(tripData.destino) : tripData?.destino;
  } catch(e){}

  return (
    <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />

        <View style={styles.mapContainer}>
             <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFillObject}
                showsUserLocation={true}
                initialRegion={{
                    latitude: userLocation?.latitude || 4.8, longitude: userLocation?.longitude || -75.7,
                    latitudeDelta: 0.05, longitudeDelta: 0.05,
                }}
            >
                {pickupCoords?.lat && <Marker coordinate={{latitude: pickupCoords.lat, longitude: pickupCoords.lng}} title="Recogida" zIndex={5} anchor={{ x: 0.5, y: 0.5 }}><View style={[styles.dotMarker, {backgroundColor: '#fa6205'}]} /></Marker>}
                {destCoords?.lat && <Marker coordinate={{latitude: destCoords.lat, longitude: destCoords.lng}} title="Destino" zIndex={5} anchor={{ x: 0.5, y: 0.5 }}><View style={[styles.dotMarker, {backgroundColor: '#FF4757'}]} /></Marker>}
                
                {pickupCoords?.lat && destCoords?.lat && (
                    <Polyline coordinates={[{latitude: pickupCoords.lat, longitude: pickupCoords.lng}, {latitude: destCoords.lat, longitude: destCoords.lng}]} strokeColor="#FFF" strokeWidth={2} lineDashPattern={[10,10]} />
                )}
            </MapView>

            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.floatNavButton} onPress={navigateWithGoogleMaps}>
                <MaterialCommunityIcons name="google-maps" size={24} color="#1C1C1E" />
                <Text style={styles.floatNavText}>Abrir Maps</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.bottomSheet}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
                
                <View style={styles.userCard}>
                    {!imageError && tripData?.usuario?.foto_documento_file ? (
                        <Image 
                            source={{ uri: `${(BASE_URL || "").toString().replace("/api", "")}storage/${tripData.usuario.foto_documento_file}` }}
                            onError={() => setImageError(true)}
                            style={styles.userAvatar} 
                        />
                    ) : (
                        <View style={styles.userAvatarFallback}>
                            <Text style={styles.userAvatarInitial}>
                                {(tripData?.usuario?.nombre_completo || "U").charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{tripData?.usuario?.nombre_completo || "Usuario"}</Text>
                        <Text style={styles.userPhone}>{tripData?.usuario?.numero_telefono || "Sin teléfono"}</Text>
                        <TouchableOpacity style={[styles.ratingBtnSmall, hasRated && {backgroundColor: '#CCC'}]} onPress={() => setRatingModalVisible(true)} disabled={hasRated}>
                            <FontAwesome name="star" size={11} color={hasRated ? "#FFF" : "#FFF"} />
                            <Text style={styles.ratingBtnText}>{hasRated ? "Calificado" : "Calificar"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.routeCard}>
                    <View style={styles.timelineRow}>
                        <View style={[styles.dot, {backgroundColor: '#fa6205'}]} />
                        <Text style={styles.addressText}>{origen}</Text>
                    </View>
                    <View style={styles.line} />
                    <View style={styles.timelineRow}>
                        <View style={[styles.dot, {backgroundColor: '#FF4757'}]} />
                        <Text style={styles.addressText}>{destino}</Text>
                    </View>
                    
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Valor Total:</Text>
                        <Text style={styles.priceValue}>
                            {"$"} {tripData?.costo ? parseFloat(tripData.costo).toLocaleString() : "0"}
                        </Text>
                    </View>
                </View>

                {parsedInfo?.observaciones ? (
                    <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>Observaciones:</Text>
                        <Text style={styles.infoText}>{parsedInfo.observaciones}</Text>
                    </View>
                ) : null}

                <View style={styles.notifyContainer}>
                    {tripData?.pedido_id && (
                         <TouchableOpacity style={styles.notifyBtn} onPress={() => handleNotifyArrival('comercio')}>
                             <MaterialIcons name="store" size={20} color="#FFF" />
                             <Text style={styles.notifyBtnText}>Llegué al Comercio</Text>
                         </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.notifyBtn} onPress={() => handleNotifyArrival('usuario')}>
                         <MaterialIcons name="person-pin-circle" size={20} color="#FFF" />
                         <Text style={styles.notifyBtnText}>Llegué donde Cliente</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.actionsGrid}>
                    <TouchableOpacity style={[styles.actionItem, styles.actionPrimary]} onPress={() => setShowChat(true)}>
                        <Ionicons name="chatbubble-ellipses" size={24} color="#FFF" />
                        <Text style={[styles.actionText, styles.actionTextPrimary]}>Chat</Text>
                    </TouchableOpacity>

                    {!paymentApproved ? (
                        <TouchableOpacity style={[styles.actionItem, styles.actionSecondary]} onPress={approvePayment} disabled={approvingPayment}>
                            {approvingPayment ? <ActivityIndicator color="#fa6205"/> : <MaterialIcons name="attach-money" size={24} color="#fa6205" />}
                            <Text style={[styles.actionText, styles.actionTextSecondary]}>Aprobar Pago</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.actionItem, {backgroundColor: '#FFF5EE'}]}>
                            <MaterialIcons name="check-circle" size={24} color="#fa6205" />
                            <Text style={[styles.actionText, {color: '#fa6205'}]}>Pagado</Text>
                        </View>
                    )}
                </View>

                {!paymentApproved && (
                    <Text style={styles.warningText}>Verifica el pago en el chat antes de aprobar.</Text>
                )}

                <TouchableOpacity style={styles.finishBtn} onPress={() => setModalVisible(true)}>
                    <Text style={styles.finishBtnText}>Finalizar Carrera</Text>
                    <MaterialCommunityIcons name="flag-checkered" size={20} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelLink} onPress={() => showAlert("Cancelar", "¿Confirmas cancelar?", "confirm", () => cancelarCarrera(tripData.id), "Sí, cancelar")}>
                    <Text style={styles.cancelLinkText}>Cancelar servicio</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>

        <Modal transparent visible={modalVisible} animationType="slide" onRequestClose={()=>setModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {!successMessage ? (
                        <>
                            <Text style={styles.modalTitle}>Código PIN</Text>
                            <Text style={styles.modalSub}>Solicita el código al cliente</Text>
                            <TextInput 
                                style={[styles.pinInput, pinError && {borderColor: '#FF4757', color: '#FF4757'}]}
                                placeholder="####" placeholderTextColor="#666"
                                keyboardType="number-pad" maxLength={6}
                                value={enteredPin} onChangeText={setEnteredPin}
                            />
                            {pinError && <Text style={{color: '#FF4757', marginBottom: 10}}>PIN Incorrecto</Text>}
                            <View style={styles.modalBtnsRow}>
                                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalVisible(false)}>
                                    <Text style={{color: '#1C1C1E'}}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalBtnVerify} onPress={verifyPin}>
                                    <Text style={{color: '#FFF', fontWeight: 'bold'}}>Verificar</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <View style={{alignItems: 'center'}}>
                            <Ionicons name="checkmark-circle" size={60} color="#fa6205" />
                            <Text style={styles.modalTitle}>¡Entregado!</Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>

        <Modal transparent visible={ratingModalVisible} animationType="slide">
             <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Calificar Cliente</Text>
                    <View style={{flexDirection: 'row', justifyContent:'center', marginVertical: 15}}>
                        {renderStars()}
                    </View>
                    <TextInput 
                        style={styles.commentInput} 
                        placeholder="Comentario..." placeholderTextColor="#666"
                        multiline value={ratingComment} onChangeText={setRatingComment}
                    />
                    <View style={styles.modalBtnsRow}>
                         <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setRatingModalVisible(false)}>
                            <Text style={{color: '#1C1C1E'}}>Cancelar</Text>
                         </TouchableOpacity>
                         <TouchableOpacity style={styles.modalBtnVerify} onPress={submitRating} disabled={isSubmittingRating}>
                            <Text style={{color: '#FFF', fontWeight: 'bold'}}>{isSubmittingRating ? "Enviando..." : "Enviar"}</Text>
                         </TouchableOpacity>
                    </View>
                </View>
             </View>
        </Modal>

        <AlertaModal
            visible={infoModalVisible}
            titulo="Usuario Nuevo"
            mensaje="Recuerda solicitar el pago por adelantado si el usuario no tiene calificaciones previas."
            tipo="info"
            onCerrar={closeInfoModal}
            onPrimary={closeInfoModal}
            primaryLabel="Entendido"
        />

        {showChat && (
                <View style={styles.chatOverlay}>
                <View style={styles.chatHeaderOverlay}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <View style={{width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 10}}>
                            <Ionicons name="chatbubble-ellipses" size={18} color="#fa6205" />
                        </View>
                        <Text style={{color: '#FFF', fontSize: 18, fontFamily: 'Inter_700Bold'}}>Chat</Text>
                    </View>
                    <TouchableOpacity style={{width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center'}} onPress={() => setShowChat(false)}><Ionicons name="close" size={22} color="#FFF"/></TouchableOpacity>
                </View>
                <ChatScreen tripId={activeId} />
            </View>
        )}

        <AlertaModal
          visible={alertVisible}
          mensaje={alertData.message}
          onCerrar={() => setAlertVisible(false)}
          titulo={alertData.title}
          tipo={alertData.type}
          onPrimary={alertData.onConfirm}
          primaryLabel={alertData.primaryLabel || "Entendido"}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  loadingContainer: { flex: 1, backgroundColor: "#F2F2F7", justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fa6205', marginTop: 10, fontFamily: 'Inter_700Bold' },
  mapContainer: { height: height * 0.42, width: '100%' },
  dotMarker: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#FFF' },
  backButton: { position: 'absolute', top: 40, left: 20, backgroundColor: '#fa6205', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
  floatNavButton: { position: 'absolute', bottom: 60, right: 20, backgroundColor: '#FFF', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 22, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  floatNavText: { color: '#1C1C1E', marginLeft: 6, fontFamily: 'Inter_700Bold', fontSize: 13 },
  bottomSheet: { flex: 1, backgroundColor: '#F2F2F7', marginTop: -20, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 25 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  userAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#fa6205' },
  userAvatarFallback: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fa6205', justifyContent: 'center', alignItems: 'center' },
  userAvatarInitial: { color: '#FFF', fontSize: 20, fontFamily: 'Inter_700Bold' },
  userInfo: { flex: 1, marginLeft: 15 },
  userName: { color: '#1C1C1E', fontSize: 16, fontFamily: 'Inter_700Bold' },
  userPhone: { color: '#888', fontSize: 12 },
  ratingBtnSmall: { backgroundColor: '#fa6205', flexDirection: 'row', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginTop: 6, alignItems: 'center' },
  ratingBtnText: { color: '#FFF', fontSize: 11, fontFamily: 'Inter_700Bold', marginLeft: 4 },
  routeCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  timelineRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, borderWidth: 2, borderColor: '#FFF' },
  line: { width: 2, height: 22, backgroundColor: '#E8E8E8', marginLeft: 4, marginVertical: 2 },
  addressText: { color: '#333', fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1, lineHeight: 18 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12 },
  priceLabel: { color: '#888' },
  priceValue: { color: '#fa6205', fontSize: 18, fontFamily: 'Inter_700Bold' },
  infoBox: { backgroundColor: '#FFF8F0', padding: 12, borderRadius: 12, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#fa6205' },
  infoLabel: { color: '#fa6205', fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  infoText: { color: '#555', fontSize: 13, lineHeight: 18 },
  notifyContainer: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  notifyBtn: { flex: 1, backgroundColor: '#fa6205', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: '#fa6205', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  notifyBtnText: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 12, marginLeft: 6 },
  actionsGrid: { flexDirection: 'row', marginBottom: 12, gap: 10 },
  actionItem: { flex: 1, padding: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 72 },
  actionPrimary: { backgroundColor: '#fa6205' },
  actionTextPrimary: { color: '#FFF' },
  actionSecondary: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#fa6205' },
  actionTextSecondary: { color: '#fa6205' },
  actionText: { fontSize: 13, marginTop: 6, textAlign: 'center', fontFamily: 'Inter_700Bold' },
  warningText: { color: '#888', fontSize: 11, textAlign: 'center', marginBottom: 14, lineHeight: 16, paddingHorizontal: 10 },
  finishBtn: { backgroundColor: '#fa6205', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 16, marginBottom: 10, shadowColor: '#fa6205', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  finishBtnText: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_700Bold', marginRight: 8 },
  cancelLink: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, alignSelf: 'center' },
  cancelLinkText: { color: '#999', fontSize: 13, fontFamily: 'Inter_500Medium' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#DDD', alignItems: 'center' },
  modalTitle: { color: '#1C1C1E', fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 5 },
  modalSub: { color: '#888', textAlign: 'center', marginBottom: 15 },
  pinInput: { backgroundColor: '#F0F0F0', color: '#1C1C1E', fontSize: 24, textAlign: 'center', padding: 10, borderRadius: 10, width: '80%', marginBottom: 15, letterSpacing: 5 },
  commentInput: { backgroundColor: '#F0F0F0', color: '#1C1C1E', padding: 10, borderRadius: 10, width: '100%', minHeight: 60, textAlignVertical: 'top' },
  modalBtnsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 10 },
  modalBtnCancel: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#ECECEC', borderRadius: 10, marginRight: 5 },
  modalBtnVerify: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#fa6205', borderRadius: 10, marginLeft: 5 },
  chatOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#F5F0E8', zIndex: 100 },
  chatHeaderOverlay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, paddingTop: Platform.OS === "android" ? 40 : 14, backgroundColor: '#fa6205', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 }
});