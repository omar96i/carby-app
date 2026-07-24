import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Modal,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  Easing,
  FlatList,
  Alert
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { BASE_URL } from "../../constants/url";
import { Ionicons, AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_600SemiBold,
  Montserrat_500Medium
} from "@expo-google-fonts/montserrat";

const { width } = Dimensions.get("window");
const AUTO_REJECT_TIME = 10000;

export default function HomeDelivery() {
  const navigation = useNavigation();

  // --- ESTADOS ---
  const [userData, setUserData] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [tripsData, setTripsData] = useState([]);
  const [rejectedTrips, setRejectedTrips] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  // Modales
  const [showActiveRideModal, setShowActiveRideModal] = useState(false);
  const [showRejectedListModal, setShowRejectedListModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Custom Alert Acceptance
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptStep, setAcceptStep] = useState('confirm');
  const [acceptErrorMsg, setAcceptErrorMsg] = useState('');
  const [selectedTripId, setSelectedTripId] = useState(null);

  const [hasActiveRide, setHasActiveRide] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);

  const mapRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const timerAnim = useRef(new Animated.Value(1)).current;

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_600SemiBold,
    Montserrat_500Medium
  });

  // --- 1. CICLO DE VIDA ---
  useFocusEffect(
    useCallback(() => {
      const loadInitial = async () => {
        const storedUserData = await AsyncStorage.getItem("userData");
        const userToken = await AsyncStorage.getItem("userToken");

        if (storedUserData) {
          const parsed = JSON.parse(storedUserData);
          setUserData(parsed);
          fetch(`${BASE_URL}usuario/${parsed.id}`, { headers: { Authorization: `Bearer ${userToken}` } })
            .then(r => r.json())
            .then(json => {
              if (json.status && json.data) {
                const r = parsed.tipo_usuario.includes('rider') ? json.data.promedio_puntuacion_conductor : json.data.promedio_puntuacion_usuario;
                setUserRating(r);
              }
            }).catch(() => {});
        }
        const storedSwitch = await AsyncStorage.getItem("isEnabled");
        if (storedSwitch === "true") setIsEnabled(true);
      };
      loadInitial();
    }, [])
  );

  useEffect(() => {
    let intervalId = null;
    if (isEnabled) {
      const init = async () => {
        const loc = await getCurrentLocation();
        const active = await checkActiveRide();

        if (!active && loc) {
          await fetchNearbyTrips(loc);
        } else if (active) {
          setTripsData([]);
          setShowActiveRideModal(true);
        }
      };
      init();

      intervalId = setInterval(async () => {
        if (!showAcceptModal) {
          const active = await checkActiveRide();
          if (!active) {
            fetchNearbyTrips();
          } else {
            setTripsData([]);
          }
        }
      }, 10000);
    } else {
      setTripsData([]);
      setRejectedTrips([]);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isEnabled, showAcceptModal]);

  // --- LOGICA DE MAPA Y TIMER ---
  useEffect(() => {
    if (tracksViewChanges) {
      const timer = setTimeout(() => setTracksViewChanges(false), 500);
      return () => clearTimeout(timer);
    }
  }, [tracksViewChanges]);

  useEffect(() => {
    const currentTrip = tripsData[0];
    if (currentTrip && mapRef.current) {
      try {
        const pickup = JSON.parse(currentTrip.punto_recogida);
        const markers = [{ latitude: pickup.lat, longitude: pickup.lng }];
        if (userLocation) markers.push(userLocation);
        try {
          const dest = JSON.parse(currentTrip.destino);
          markers.push({ latitude: dest.lat, longitude: dest.lng });
        } catch (e) { }

        mapRef.current.fitToCoordinates(markers, {
          edgePadding: { top: 100, right: 60, bottom: 400, left: 60 },
          animated: true,
        });
      } catch (e) { }
    } else if (!currentTrip && userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 1000);
    }
  }, [tripsData[0]?.id, userLocation, isEnabled]);

  useEffect(() => {
    let timerTimeout = null;
    const currentTrip = tripsData[0];

    if (currentTrip && isEnabled && !isInteractionPaused && !showAcceptModal) {
      timerAnim.setValue(1);
      Animated.timing(timerAnim, {
        toValue: 0,
        duration: AUTO_REJECT_TIME,
        useNativeDriver: false,
        easing: Easing.linear
      }).start();

      timerTimeout = setTimeout(() => {
        handleReject(currentTrip.id);
      }, AUTO_REJECT_TIME);
    } else {
      timerAnim.stopAnimation();
    }
    return () => {
      if (timerTimeout) clearTimeout(timerTimeout);
    };
  }, [tripsData[0]?.id, isInteractionPaused, showAcceptModal]);


  // --- 2. LOGICA DE NEGOCIO Y DATOS ---

  const checkActiveRide = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return false;

      const response = await fetch(`${BASE_URL}carreras/conductor/activa`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // Parseo seguro para evitar errores si el backend devuelve HTML o error 500
      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        return false;
      }

      if (!response.ok) {
        setHasActiveRide(false);
        return false;
      }

      const hasActiveRide = responseData &&
        responseData.status === true &&
        responseData.data &&
        responseData.data.estado !== "completado" &&
        responseData.data.estado !== "cancelado";

      setHasActiveRide(hasActiveRide);
      return hasActiveRide;

    } catch (error) {
      setHasActiveRide(false);
      return false;
    }
  };

  const checkActiveSuscriptions = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return false;
      const response = await fetch(`${BASE_URL}user-suscripcion`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return false;
      const responseData = await response.json();
      const hasApprovedSubscription = responseData &&
        responseData.status === true &&
        Array.isArray(responseData.data) &&
        responseData.data.some(sub => sub.estado === "aprobado");
      return hasApprovedSubscription;
    } catch (error) { return false; }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const location = await Location.getCurrentPositionAsync({});
      const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      setUserLocation(coords);
      return coords;
    } catch (e) { return null; }
  };

  const fetchNearbyTrips = async (explicitLocation = null) => {
    try {
      let loc = explicitLocation || userLocation;
      if (!loc) loc = await getCurrentLocation();
      if (!loc) return;

      const userToken = await AsyncStorage.getItem("userToken");
      if (!userToken) return;

      const response = await fetch(`${BASE_URL}carreras/nearby`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
        body: JSON.stringify({ lat: loc.latitude, lng: loc.longitude })
      });

      if (response.ok) {
        const json = await response.json();
        const rejectedJson = await AsyncStorage.getItem("rejectedServices");
        const rejectedIds = rejectedJson ? JSON.parse(rejectedJson) : [];

        const activeQueue = [];
        const rejectedQueue = [];

        (json.data || []).forEach(t => {
          if (t.estado === 'pendiente') {
            if (rejectedIds.includes(t.id)) {
              rejectedQueue.push(t);
            } else {
              activeQueue.push(t);
            }
          }
        });

        setRejectedTrips(rejectedQueue);

        setTripsData(prev => {
          if (prev.length === 0) {
            if (activeQueue.length > 0) setTracksViewChanges(true);
            return activeQueue;
          }
          const currentViewingTrip = prev[0];
          const currentStillValid = activeQueue.find(t => t.id === currentViewingTrip.id);

          if (currentStillValid) {
            const queue = activeQueue.filter(t => t.id !== currentViewingTrip.id);
            const newFullList = [currentViewingTrip, ...queue];
            const prevIds = prev.map(t => t.id).join(',');
            const newIds = newFullList.map(t => t.id).join(',');
            if (prevIds !== newIds) return newFullList;
            return prev;
          } else {
            setTracksViewChanges(true);
            return activeQueue;
          }
        });
      }
    } catch (e) { }
  };

  // --- 3. ACCIONES ---

  const toggleConnection = async () => {
    if (!isEnabled) {
      setCheckingSubscription(true);
      const hasActive = await checkActiveRide();
      if (hasActive) {
        setCheckingSubscription(false);
        setShowActiveRideModal(true);
        return;
      }
      const hasSub = await checkActiveSuscriptions();
      setCheckingSubscription(false);
      if (!hasSub) {
        setShowSubscriptionModal(true);
        return;
      }
      setIsEnabled(true);
      await AsyncStorage.setItem("isEnabled", "true");
    } else {
      setIsEnabled(false);
      await AsyncStorage.setItem("isEnabled", "false");
    }
  };

  const handleReject = async (tripId) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(async () => {
      try {
        const rejectedJson = await AsyncStorage.getItem("rejectedServices");
        const rejected = rejectedJson ? JSON.parse(rejectedJson) : [];
        if (!rejected.includes(tripId)) {
          rejected.push(tripId);
          await AsyncStorage.setItem("rejectedServices", JSON.stringify(rejected));
        }
      } catch (error) { }

      const tripToReject = tripsData.find(t => t.id === tripId);
      if (tripToReject) {
        setRejectedTrips(prev => [...prev, tripToReject]);
      }

      const newTrips = tripsData.filter(t => t.id !== tripId);
      setTripsData(newTrips);
      setTracksViewChanges(true);
      fadeAnim.setValue(1);
    });
  };

  // --- 4. CUSTOM MODAL LOGIC ---

  const handlePressAccept = async (tripId) => {
    if (hasActiveRide) {
      setShowActiveRideModal(true);
      return;
    }

    // Verificación de seguridad adicional
    const isActiveNow = await checkActiveRide();
    if (isActiveNow) {
      setShowActiveRideModal(true);
      return;
    }

    setIsInteractionPaused(true);
    setSelectedTripId(tripId);
    setAcceptStep('confirm');
    setShowAcceptModal(true);
  };

  const confirmAcceptation = async () => {
    setAcceptStep('loading');

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!userData || !token) {
        setAcceptErrorMsg("Error de sesión. Intenta reconectar.");
        setAcceptStep('error');
        return;
      }

      const response = await fetch(`${BASE_URL}carreras/${selectedTripId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conductor_id: userData.id,
          estado: 'aceptado'
        })
      });

      const json = await response.json();

      if (response.ok && json.id && json.estado === 'aceptado') {
        setAcceptStep('success');
        setTimeout(() => {
          setShowAcceptModal(false);
          setIsInteractionPaused(false);
          setShowRejectedListModal(false);
          navigation.navigate("StepTrece", { carreraId: selectedTripId });
        }, 1500);

      } else {
        const msg = json.message || "No se pudo aceptar la carrera (ya fue tomada).";
        setAcceptErrorMsg(msg);
        setAcceptStep('error');
        fetchNearbyTrips();
      }

    } catch (error) {
      setAcceptErrorMsg("Error de conexión. Verifica tu internet.");
      setAcceptStep('error');
    }
  };

  const closeAcceptModal = () => {
    setShowAcceptModal(false);
    setIsInteractionPaused(false);
    setAcceptStep('confirm');
  };

  // --- HELPERS ---

  const handleRestore = async (tripId) => {
    try {
      const rejectedJson = await AsyncStorage.getItem("rejectedServices");
      let rejected = rejectedJson ? JSON.parse(rejectedJson) : [];
      rejected = rejected.filter(id => id !== tripId);
      await AsyncStorage.setItem("rejectedServices", JSON.stringify(rejected));

      const tripToRestore = rejectedTrips.find(t => t.id === tripId);
      setRejectedTrips(prev => prev.filter(t => t.id !== tripId));
      if (tripToRestore) {
        setTripsData(prev => [tripToRestore, ...prev]);
        setTracksViewChanges(true);
      }
      setShowRejectedListModal(false);
    } catch (e) { }
  };

  const goToSubscriptions = () => {
    setShowSubscriptionModal(false);
    navigation.navigate("WalletRider");
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const formatPrice = (price) => {
    const isColombia = true;
    return `${"$"} ${parseFloat(price || 0).toLocaleString("es-CO")}`;
  };

  // --- RENDER ---
  const currentTrip = tripsData.length > 0 ? tripsData[0] : null;
  const nextTrip = tripsData.length > 1 ? tripsData[1] : null;
  const queueCount = tripsData.length - 1;

  let pickupCoords = null;
  let destCoords = null;
  let distanceFromMe = null;
  let infoAdicional = {};

  if (currentTrip && isEnabled) {
    try {
      pickupCoords = JSON.parse(currentTrip.punto_recogida);
      try { destCoords = JSON.parse(currentTrip.destino); } catch (e) { destCoords = null; }
      infoAdicional = typeof currentTrip.informacion_adicional === 'string' ? JSON.parse(currentTrip.informacion_adicional) : currentTrip.informacion_adicional;
      if (userLocation) {
        distanceFromMe = calculateDistance(userLocation.latitude, userLocation.longitude, pickupCoords.lat, pickupCoords.lng);
      }
    } catch (e) { }
  }

  const widthInterpolate = timerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"]
  });

  if (!fontsLoaded) return <ActivityIndicator style={{ flex: 1, backgroundColor: '#F2F2F7' }} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* MAPA */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 } : undefined}
        showsUserLocation={true}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {isEnabled && currentTrip && pickupCoords && (
          <>
            <Marker coordinate={{ latitude: pickupCoords.lat, longitude: pickupCoords.lng }} zIndex={10} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={tracksViewChanges}>
              <View style={[styles.dotMarker, { backgroundColor: '#fa6205', shadowColor: '#fa6205' }]} />
            </Marker>
            {destCoords && (
              <Marker coordinate={{ latitude: destCoords.lat, longitude: destCoords.lng }} zIndex={5} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={tracksViewChanges}>
                <View style={[styles.dotMarker, { backgroundColor: '#FF4757', shadowColor: '#FF4757' }]} />
              </Marker>
            )}
            {destCoords && (
              <Polyline coordinates={[{ latitude: pickupCoords.lat, longitude: pickupCoords.lng }, { latitude: destCoords.lat, longitude: destCoords.lng }]} strokeColor="#FFF" strokeWidth={3} lineDashPattern={[10, 10]} />
            )}
          </>
        )}
      </MapView>
      
      

      {/* HEADER */}
      <SafeAreaView style={styles.topContainer}>
        <View style={styles.headerPill}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarInitial}>{userData?.nombre_completo?.charAt(0) || "U"}</Text>
          </View>
          <View>
            <Text style={styles.welcomeText}>Hola, {userData?.nombre_completo?.split(" ")[0]}</Text>
            <View style={styles.ratingRow}>
              <AntDesign name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{userRating ? parseFloat(userRating).toFixed(1) : "5.0"}</Text>
            </View>
          </View>
        </View>

        {isEnabled && rejectedTrips.length > 0 && (
          <TouchableOpacity style={styles.rejectedListBtn} onPress={() => setShowRejectedListModal(true)}>
            <View style={styles.rejectedBadge}>
              <Text style={styles.rejectedBadgeText}>{rejectedTrips.length}</Text>
            </View>
            <MaterialCommunityIcons name="history" size={24} color="#1C1C1E" />
            <Text style={styles.rejectedListText}>Descartadas</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* OFFLINE */}
      {!isEnabled && (
        <View style={styles.offlineContainer}>
          <TouchableOpacity style={styles.bigConnectButton} onPress={toggleConnection} disabled={checkingSubscription}>
            {checkingSubscription ? <ActivityIndicator size="large" color="#FFF" /> : <Text style={styles.connectText}>CONECTARSE</Text>}
          </TouchableOpacity>
          <Text style={styles.offlineLabel}>Estás desconectado</Text>
        </View>
      )}

      {/* ONLINE & TARJETA */}
      {isEnabled && (
        <View style={styles.bottomSheetContainer}>
          <TouchableOpacity style={styles.powerBtn} onPress={toggleConnection}>
            <Ionicons name="power" size={20} color="#FFF" />
          </TouchableOpacity>

          {currentTrip ? (
            <View>
              {queueCount > 0 && <View style={styles.stackCardEffect1} />}
              {queueCount > 1 && <View style={styles.stackCardEffect2} />}

              <Animated.View style={[styles.tripCard, { opacity: fadeAnim }]}>
                {queueCount > 0 && (
                  <View style={styles.queueBar}>
                    <MaterialCommunityIcons name="layers-triple-outline" size={14} color="#fa6205" />
                    <Text style={styles.queueText}>
                      {queueCount === 1 ? "1 carrera más en espera" : `${queueCount} carreras más en espera`}
                      {nextTrip && <Text style={styles.queueNextPrice}> • Sig: {formatPrice(nextTrip.costo)}</Text>}
                    </Text>
                  </View>
                )}

                <View style={styles.tripHeader}>
                  <View>
                    <Text style={styles.serviceType}>{currentTrip.tipo_servicio || "Delivery"}</Text>
                    <View style={styles.distanceBadge}>
                      <Ionicons name="navigate" size={12} color="#FFF" />
                      <Text style={styles.distanceBadgeText}>{distanceFromMe ? `${distanceFromMe} km para llegar` : "..."}</Text>
                    </View>
                  </View>
                  <Text style={styles.tripPrice}>{formatPrice(currentTrip.costo)}</Text>
                </View>

                <View style={styles.pointsContainer}>
                  <View style={styles.pointRow}>
                    <View style={[styles.dot, { backgroundColor: '#fa6205' }]} />
                    <Text style={styles.pointText} numberOfLines={1}>{infoAdicional.origen || "Recogida"}</Text>
                  </View>
                  <View style={styles.line} />
                  <View style={styles.pointRow}>
                    <View style={[styles.dot, { backgroundColor: '#FF4757' }]} />
                    <Text style={styles.pointText} numberOfLines={1}>{infoAdicional.destino || "Entrega"}</Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(currentTrip.id)}>
                    <Ionicons name="close" size={30} color="#1C1C1E" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.acceptBtnContainer} onPress={() => handlePressAccept(currentTrip.id)} activeOpacity={0.8}>
                    <Animated.View style={[styles.acceptBtnProgress, { width: widthInterpolate }]} />
                    <Text style={styles.acceptText}>ACEPTAR CARRERA</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          ) : (
            <View style={styles.searchingCard}>
              <ActivityIndicator size="large" color="#fa6205" />
              <Text style={styles.searchingText}>Buscando...</Text>
              <Text style={styles.searchingSubText}>Mantente en línea</Text>
            </View>
          )}
        </View>
      )}

      {/* --- CUSTOM ACCEPT MODAL --- */}
      <Modal animationType="fade" transparent={true} visible={showAcceptModal} onRequestClose={() => { if (acceptStep === 'error' || acceptStep === 'confirm') closeAcceptModal() }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderColor: acceptStep === 'error' ? '#FF4757' : '#fa6205' }]}>

            {/* 1. CONFIRMACIÓN */}
            {acceptStep === 'confirm' && (
              <>
                <MaterialCommunityIcons name="help-circle-outline" size={50} color="#fa6205" />
                <Text style={styles.modalTitle}>¿Aceptar Carrera?</Text>
                <Text style={styles.modalText}>El servicio se asignará a tu cuenta inmediatamente.</Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={closeAcceptModal}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.subscribeButton]} onPress={confirmAcceptation}>
                    <Text style={styles.subscribeButtonText}>Confirmar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* 2. LOADING */}
            {acceptStep === 'loading' && (
              <>
                <ActivityIndicator size="large" color="#fa6205" style={{ marginVertical: 20 }} />
                <Text style={styles.modalTitle}>Procesando...</Text>
                <Text style={styles.modalText}>Validando disponibilidad de la carrera.</Text>
              </>
            )}

            {/* 3. SUCCESS */}
            {acceptStep === 'success' && (
              <>
                <MaterialCommunityIcons name="check-circle" size={50} color="#fa6205" />
                <Text style={styles.modalTitle}>¡Carrera Asignada!</Text>
                <Text style={styles.modalText}>Prepárate para recoger el pedido.</Text>
              </>
            )}

            {/* 4. ERROR */}
            {acceptStep === 'error' && (
              <>
                <MaterialCommunityIcons name="close-circle" size={50} color="#FF4757" />
                <Text style={[styles.modalTitle, { color: '#FF4757' }]}>No se pudo aceptar</Text>
                <Text style={styles.modalText}>{acceptErrorMsg}</Text>
                <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: "#FFF", borderWidth: 1.5, borderColor: '#fa6205', marginTop: 10 }]} onPress={closeAcceptModal}>
                  <Text style={[styles.modalActionText, { color: '#fa6205' }]}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* --- OTROS MODALES --- */}
      <Modal animationType="slide" transparent={true} visible={showSubscriptionModal} onRequestClose={() => setShowSubscriptionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="wallet-membership" size={40} color="#FFD700" />
            <Text style={styles.modalTitle}>Suscripción Requerida</Text>
            <Text style={styles.modalText}>Para recibir carreras necesitas un plan activo.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowSubscriptionModal(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.subscribeButton]} onPress={goToSubscriptions}>
                <Text style={styles.subscribeButtonText}>Ver Planes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={showRejectedListModal} onRequestClose={() => setShowRejectedListModal(false)}>
        <View style={styles.modalFullOverlay}>
          <View style={styles.rejectedListContainer}>
            <View style={styles.rejectedHeader}>
              <Text style={styles.rejectedTitle}>Descartadas Disponibles</Text>
              <TouchableOpacity onPress={() => setShowRejectedListModal(false)}>
                <Ionicons name="close-circle" size={28} color="#1C1C1E" />
              </TouchableOpacity>
            </View>
            {rejectedTrips.length === 0 ? (
              <Text style={styles.emptyListText}>No hay carreras descartadas disponibles.</Text>
            ) : (
              <FlatList
                data={rejectedTrips}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => {
                  let info = {};
                  try { info = typeof item.informacion_adicional === 'string' ? JSON.parse(item.informacion_adicional) : item.informacion_adicional; } catch (e) { }
                  return (
                    <View style={styles.rejectedItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rejectedPrice}>{formatPrice(item.costo)}</Text>
                        <View style={styles.miniPointRow}><View style={[styles.miniDot, { backgroundColor: '#fa6205' }]} /><Text style={styles.miniPointText} numberOfLines={1}>{info.origen}</Text></View>
                        <View style={styles.miniPointRow}><View style={[styles.miniDot, { backgroundColor: '#FF4757' }]} /><Text style={styles.miniPointText} numberOfLines={1}>{info.destino}</Text></View>
                      </View>
                      <TouchableOpacity style={styles.recoverBtn} onPress={() => handleRestore(item.id)}>
                        <MaterialCommunityIcons name="restore" size={24} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={showActiveRideModal} onRequestClose={() => setShowActiveRideModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="bike-fast" size={40} color="#fa6205" />
            <Text style={styles.modalTitle}>Carrera en Curso</Text>
            <Text style={styles.modalText}>Termina tu servicio actual.</Text>
            <TouchableOpacity style={styles.modalActionBtn} onPress={() => setShowActiveRideModal(false)}>
              <Text style={styles.modalActionText}>ENTENDIDO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  dotMarker: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: '#FFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 5 },

  topContainer: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 40, left: 20, right: 20, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between' },
  headerPill: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: 8, paddingRight: 20, borderRadius: 40, alignSelf: 'flex-start', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', elevation: 5 },
  avatarContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFFFFF", justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#fa6205' },
  avatarInitial: { color: '#fa6205', fontFamily: 'Montserrat_700Bold', fontSize: 16 },
  welcomeText: { color: '#1C1C1E', fontFamily: 'Montserrat_600SemiBold', fontSize: 14 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { color: '#FFD700', fontSize: 12, marginLeft: 4, fontFamily: 'Montserrat_500Medium' },

  rejectedListBtn: { backgroundColor: 'rgba(255, 255, 255, 0.95)', paddingHorizontal: 15, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DDD', flexDirection: 'row' },
  rejectedBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FF4757', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  rejectedBadgeText: { color: '#FFF', fontSize: 10, fontFamily: 'Montserrat_700Bold' },
  rejectedListText: { color: '#1C1C1E', marginLeft: 8, fontFamily: 'Montserrat_600SemiBold', fontSize: 12 },

  offlineContainer: { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center', zIndex: 20 },
  bigConnectButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fa6205', justifyContent: 'center', alignItems: 'center', shadowColor: "#fa6205", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20, elevation: 10, marginBottom: 15 },
  connectText: { color: '#FFF', fontFamily: 'Montserrat_700Bold', fontSize: 10 },
  offlineLabel: { color: '#1C1C1E', fontFamily: 'Montserrat_500Medium', backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },

  bottomSheetContainer: { position: 'absolute', bottom: 30, left: 20, right: 20, zIndex: 20 },
  powerBtn: { position: 'absolute', top: -50, right: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: '#FF4757', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: "#000", shadowOpacity: 0.3 },

  tripCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#DDD', shadowColor: "#000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10, zIndex: 10 },
  stackCardEffect1: { position: 'absolute', top: 8, left: 10, right: 10, height: '100%', backgroundColor: '#ECECEC', borderRadius: 24, zIndex: 5, borderWidth: 1, borderColor: '#DDD' },
  stackCardEffect2: { position: 'absolute', top: 16, left: 20, right: 20, height: '100%', backgroundColor: '#F0F0F0', borderRadius: 24, zIndex: 1, borderWidth: 1, borderColor: '#DDD' },

  queueBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(250, 98, 5, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(250, 98, 5, 0.3)' },
  queueText: { color: '#444', fontSize: 11, fontFamily: 'Montserrat_500Medium', marginLeft: 6 },
  queueNextPrice: { color: '#fa6205', fontFamily: 'Montserrat_700Bold' },

  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  serviceType: { color: '#888', fontFamily: 'Montserrat_700Bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  distanceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fa6205', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 5, alignSelf: 'flex-start' },
  distanceBadgeText: { color: '#FFF', fontFamily: 'Montserrat_700Bold', fontSize: 11, marginLeft: 4 },
  tripPrice: { color: '#1C1C1E', fontFamily: 'Montserrat_700Bold', fontSize: 26 },
  pointsContainer: { marginBottom: 20 },
  pointRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  line: { width: 2, height: 16, backgroundColor: "#ECECEC", marginLeft: 4, marginVertical: 2 },
  pointText: { color: '#444', fontFamily: 'Montserrat_500Medium', fontSize: 14, flex: 1 },

  actionButtons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rejectBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FF4757', marginRight: 15 },
  acceptBtnContainer: { flex: 1, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', backgroundColor: "#ECECEC", overflow: 'hidden', borderWidth: 1, borderColor: '#fa6205' },
  acceptBtnProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#fa6205' },
  acceptText: { color: '#FFF', fontFamily: 'Montserrat_700Bold', fontSize: 16, zIndex: 10 },

  searchingCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#DDD' },
  searchingText: { color: '#1C1C1E', fontFamily: 'Montserrat_600SemiBold', fontSize: 16, marginTop: 15 },
  searchingSubText: { color: '#666', fontFamily: 'Montserrat_400Regular', fontSize: 12, marginTop: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#FFFFFF', padding: 25, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#fa6205' },
  modalTitle: { color: '#1C1C1E', fontSize: 20, fontFamily: 'Montserrat_700Bold', marginTop: 15, marginBottom: 10 },
  modalText: { color: '#333', textAlign: 'center', marginBottom: 20, fontFamily: 'Montserrat_400Regular' },
  modalButtons: { flexDirection: 'row', marginTop: 20, width: '100%', justifyContent: 'space-between' },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, minWidth: 100, alignItems: 'center' },
  cancelButton: { backgroundColor: "#FFF", borderWidth: 1.5, borderColor: '#fa6205' },
  cancelButtonText: { color: '#fa6205', fontFamily: 'Montserrat_600SemiBold' },
  subscribeButton: { backgroundColor: '#fa6205' },
  subscribeButtonText: { color: '#FFF', fontFamily: 'Montserrat_700Bold' },
  modalActionBtn: { backgroundColor: '#fa6205', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  modalActionText: { color: '#FFF', fontFamily: 'Montserrat_700Bold' },

  modalFullOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  rejectedListContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, maxHeight: '70%' },
  rejectedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  rejectedTitle: { color: '#1C1C1E', fontFamily: 'Montserrat_700Bold', fontSize: 18 },
  emptyListText: { color: '#777', textAlign: 'center', marginTop: 20, fontFamily: 'Montserrat_500Medium' },
  rejectedItem: { flexDirection: 'row', backgroundColor: '#F0F0F0', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#DDD' },
  rejectedPrice: { color: '#fa6205', fontFamily: 'Montserrat_700Bold', fontSize: 16, marginBottom: 5 },
  miniPointRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  miniDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  miniPointText: { color: '#333', fontSize: 12, fontFamily: 'Montserrat_400Regular' },
  recoverBtn: { backgroundColor: '#fa6205', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }
});