import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  Easing,
  Image,
  Modal,
  ScrollView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { BASE_URL } from "../../constants/url";
import { Ionicons, AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_600SemiBold,
  Montserrat_500Medium,
} from "@expo-google-fonts/montserrat";

import TripCard from "./components/TripCard";
import OfflinePanel from "./components/OfflinePanel";
import SearchingState from "./components/SearchingState";
import ActiveRideModal from "./components/ActiveRideModal";
import SubscriptionModal from "./components/SubscriptionModal";
import RejectedTripsModal from "./components/RejectedTripsModal";
import AcceptModal from "./components/AcceptModal";
import { parseCoords, calculateDistance, getUserPhotoUrl } from "./utils";

const { width } = Dimensions.get("window");
const AUTO_REJECT_TIME = 20000;

export default function HomeDelivery() {
  const navigation = useNavigation();

  const [userData, setUserData] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [tripsData, setTripsData] = useState([]);
  const [rejectedTrips, setRejectedTrips] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  const [showActiveRideModal, setShowActiveRideModal] = useState(false);
  const [showRejectedListModal, setShowRejectedListModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showRatingsModal, setShowRatingsModal] = useState(false);
  const [ratingsData, setRatingsData] = useState(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptStep, setAcceptStep] = useState("confirm");
  const [acceptErrorMsg, setAcceptErrorMsg] = useState("");
  const [selectedTripId, setSelectedTripId] = useState(null);

  const [hasActiveRide, setHasActiveRide] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [requesterRating, setRequesterRating] = useState(null);
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);

  const mapRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const timerAnim = useRef(new Animated.Value(1)).current;

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_600SemiBold,
    Montserrat_500Medium,
  });

  useFocusEffect(
    useCallback(() => {
      const loadInitial = async () => {
        const storedUserData = await AsyncStorage.getItem("userData");
        const userToken = await AsyncStorage.getItem("userToken");

        if (storedUserData) {
          const parsed = JSON.parse(storedUserData);
          console.log("[HomeDelivery] STORED userData keys:", Object.keys(parsed).join(","));
          console.log("[HomeDelivery] STORED foto_documento_file:", parsed.foto_documento_file);
          setUserData(parsed);
          fetch(`${BASE_URL}usuario/${parsed.id}`, { headers: { Authorization: `Bearer ${userToken}` } })
            .then((r) => r.json())
            .then((json) => {
              console.log("[HomeDelivery] FETCH usuario response:", JSON.stringify(json).substring(0, 1000));
              if (json.status && json.data) {
                const updatedUser = { ...parsed, ...json.data };
                setUserData(updatedUser);
                console.log("[HomeDelivery] UPDATED userData foto:", updatedUser.foto_documento_file);
                const r = updatedUser.tipo_usuario?.includes("rider")
                  ? json.data.promedio_puntuacion_conductor
                  : json.data.promedio_puntuacion_usuario;
                setUserRating(r);
              }
            })
            .catch((err) => console.log("[HomeDelivery] FETCH usuario error:", err.message));
        }
        const storedSwitch = await AsyncStorage.getItem("isEnabled");
        if (storedSwitch === "true") setIsEnabled(true);

        fetchAvailability();
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
        const pickup = parseCoords(currentTrip.punto_recogida);
        const markers = [{ latitude: pickup.lat, longitude: pickup.lng }];
        if (userLocation) markers.push(userLocation);
        try {
          const dest = parseCoords(currentTrip.destino);
          markers.push({ latitude: dest.lat, longitude: dest.lng });
        } catch (e) {}

        mapRef.current.fitToCoordinates(markers, {
          edgePadding: { top: 100, right: 60, bottom: 400, left: 60 },
          animated: true,
        });
      } catch (e) {}
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
        easing: Easing.linear,
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

  useEffect(() => {
    const currentTrip = tripsData[0];
    if (!currentTrip?.usuario?.id) {
      setRequesterRating(null);
      return;
    }
    const fetchRequesterRating = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const response = await fetch(`${BASE_URL}usuario/${currentTrip.usuario.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await response.json();
        if (json.status && json.data) {
          setRequesterRating(json.data.promedio_puntuacion_usuario);
        }
      } catch (e) {}
    };
    fetchRequesterRating();
  }, [tripsData[0]?.usuario?.id]);

  const checkActiveRide = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return false;

      const response = await fetch(`${BASE_URL}carreras/conductor/activa`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

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

      const hasActiveRide =
        responseData &&
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
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return false;
      const responseData = await response.json();
      const hasApprovedSubscription =
        responseData &&
        responseData.status === true &&
        Array.isArray(responseData.data) &&
        responseData.data.some((sub) => sub.estado === "aprobado");
      return hasApprovedSubscription;
    } catch (error) { return false; }
  };

  const fetchAvailability = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;
      const response = await fetch(`${BASE_URL}conductor/disponibilidad`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const json = await response.json();
      console.log("[HomeDelivery] AVAILABILITY ->", JSON.stringify(json));
      if (json.status && json.data) {
        setAvailability(json.data);
      }
    } catch (error) {
      console.log("[HomeDelivery] AVAILABILITY ERROR ->", error.message);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
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

      const url = `${BASE_URL}carreras/nearby`;
      const body = { lat: loc.latitude, lng: loc.longitude };
      console.log("[HomeDelivery] API CALL ->", url);
      console.log("[HomeDelivery] PARAMS ->", JSON.stringify(body));

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      console.log("[HomeDelivery] RAW RESPONSE ->", responseText.substring(0, 2000));

      let json;
      try {
        json = JSON.parse(responseText);
      } catch (parseErr) {
        console.log("[HomeDelivery] JSON PARSE ERROR ->", parseErr.message);
        return;
      }

      if (response.ok) {
        console.log("[HomeDelivery] PARSED DATA -> carreras:", (json.data || []).length, "status:", json.status);
        const rejectedJson = await AsyncStorage.getItem("rejectedServices");
        const rejectedIds = rejectedJson ? JSON.parse(rejectedJson) : [];

        const activeQueue = [];
        const rejectedQueue = [];

        (json.data || []).forEach((t) => {
          if (t.estado === "pendiente") {
            if (rejectedIds.includes(t.id)) {
              rejectedQueue.push(t);
            } else {
              activeQueue.push(t);
            }
          }
        });

        setRejectedTrips(rejectedQueue);
        console.log("[HomeDelivery] REJECTED QUEUE -> count:", rejectedQueue.length, "ids:", rejectedQueue.map((t) => t.id).join(","));
        if (rejectedQueue.length > 0) {
          console.log("[HomeDelivery] FIRST REJECTED SAMPLE ->", JSON.stringify(rejectedQueue[0], null, 2).substring(0, 1500));
        }

        setTripsData((prev) => {
          if (prev.length === 0) {
            if (activeQueue.length > 0) setTracksViewChanges(true);
            return activeQueue;
          }
          const currentViewingTrip = prev[0];
          const currentStillValid = activeQueue.find((t) => t.id === currentViewingTrip.id);

          if (currentStillValid) {
            const queue = activeQueue.filter((t) => t.id !== currentViewingTrip.id);
            const newFullList = [currentViewingTrip, ...queue];
            const prevIds = prev.map((t) => t.id).join(",");
            const newIds = newFullList.map((t) => t.id).join(",");
            if (prevIds !== newIds) return newFullList;
            return prev;
          } else {
            setTracksViewChanges(true);
            return activeQueue;
          }
        });
      }
    } catch (e) {}
  };

  const toggleConnection = async () => {
    if (!isEnabled) {
      setCheckingSubscription(true);

      // Refrescar disponibilidad antes de conectar
      await fetchAvailability();

      const hasActive = await checkActiveRide();
      if (hasActive) {
        setCheckingSubscription(false);
        setShowActiveRideModal(true);
        return;
      }

      // Validar que tenga viajes disponibles
      if (availability && availability.disponibles <= 0) {
        setCheckingSubscription(false);
        setShowSubscriptionModal(true);
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
      } catch (error) {}

      const tripToReject = tripsData.find((t) => t.id === tripId);
      if (tripToReject) {
        setRejectedTrips((prev) => [...prev, tripToReject]);
      }

      const newTrips = tripsData.filter((t) => t.id !== tripId);
      setTripsData(newTrips);
      setTracksViewChanges(true);
      fadeAnim.setValue(1);
    });
  };

  const handlePressAccept = async (tripId) => {
    if (hasActiveRide) {
      setShowActiveRideModal(true);
      return;
    }

    const isActiveNow = await checkActiveRide();
    if (isActiveNow) {
      setShowActiveRideModal(true);
      return;
    }

    setIsInteractionPaused(true);
    setSelectedTripId(tripId);
    setAcceptStep("confirm");
    setShowAcceptModal(true);
  };

  const confirmAcceptation = async () => {
    setAcceptStep("loading");

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!userData || !token) {
        setAcceptErrorMsg("Error de sesión. Intenta reconectar.");
        setAcceptStep("error");
        return;
      }

      const acceptUrl = `${BASE_URL}carreras/${selectedTripId}`;
      const acceptBody = { conductor_id: userData.id, estado: "aceptado" };
      console.log("[HomeDelivery] ACCEPT API CALL ->", acceptUrl);
      console.log("[HomeDelivery] ACCEPT PARAMS ->", JSON.stringify(acceptBody));

      const response = await fetch(acceptUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(acceptBody),
      });

      const responseText = await response.text();
      console.log("[HomeDelivery] ACCEPT RAW RESPONSE ->", responseText.substring(0, 2000));

      let json;
      try {
        json = JSON.parse(responseText);
      } catch (parseErr) {
        console.log("[HomeDelivery] ACCEPT JSON PARSE ERROR ->", parseErr.message);
        setAcceptErrorMsg("Respuesta inválida del servidor.");
        setAcceptStep("error");
        return;
      }

      console.log("[HomeDelivery] ACCEPT PARSED -> status:", response.status, "data:", json);

      if (response.ok && json.id && json.estado === "aceptado") {
        setAcceptStep("success");
        setTimeout(() => {
          setShowAcceptModal(false);
          setIsInteractionPaused(false);
          setShowRejectedListModal(false);
          navigation.navigate("StepTrece", { carreraId: selectedTripId });
        }, 1500);
      } else {
        const msg = json.message || "No se pudo aceptar la carrera (ya fue tomada).";
        setAcceptErrorMsg(msg);
        setAcceptStep("error");
        fetchNearbyTrips();
      }
    } catch (error) {
      setAcceptErrorMsg("Error de conexión. Verifica tu internet.");
      setAcceptStep("error");
    }
  };

  const closeAcceptModal = () => {
    setShowAcceptModal(false);
    setIsInteractionPaused(false);
    setAcceptStep("confirm");
  };

  const handleRestore = async (tripId) => {
    try {
      const rejectedJson = await AsyncStorage.getItem("rejectedServices");
      let rejected = rejectedJson ? JSON.parse(rejectedJson) : [];
      rejected = rejected.filter((id) => id !== tripId);
      await AsyncStorage.setItem("rejectedServices", JSON.stringify(rejected));

      const tripToRestore = rejectedTrips.find((t) => t.id === tripId);
      setRejectedTrips((prev) => prev.filter((t) => t.id !== tripId));
      if (tripToRestore) {
        setTripsData((prev) => [tripToRestore, ...prev]);
        setTracksViewChanges(true);
      }
      setShowRejectedListModal(false);
    } catch (e) {}
  };

  const goToSubscriptions = () => {
    setShowSubscriptionModal(false);
    navigation.navigate("WalletRider");
  };

  const fetchDriverRatings = async () => {
    setRatingsLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await fetch(`${BASE_URL}conductor/calificaciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json().catch(() => ({}));
      if (response.ok && json.status) {
        setRatingsData(json);
      } else {
        setRatingsData({ promedio: 0, total: 0, data: [] });
      }
    } catch (e) {
      console.error("Error fetching driver ratings:", e);
      setRatingsData({ promedio: 0, total: 0, data: [] });
    } finally {
      setRatingsLoading(false);
    }
  };

  const openRatingsModal = () => {
    setShowRatingsModal(true);
    fetchDriverRatings();
  };

  const currentTrip = tripsData.length > 0 ? tripsData[0] : null;
  const nextTrip = tripsData.length > 1 ? tripsData[1] : null;
  const queueCount = tripsData.length - 1;

  let distanceFromMe = null;
  if (currentTrip && isEnabled && userLocation) {
    try {
      const pickup = parseCoords(currentTrip.punto_recogida);
      distanceFromMe = calculateDistance(userLocation.latitude, userLocation.longitude, pickup.lat, pickup.lng);
    } catch (e) {}
  }

  if (!fontsLoaded) return <ActivityIndicator style={{ flex: 1, backgroundColor: "#F2F2F7" }} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 } : undefined}
        showsUserLocation={true}
        showsMyLocationButton={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {isEnabled && currentTrip && (
          <>
            {(() => {
              const pickup = parseCoords(currentTrip.punto_recogida);
              return pickup ? (
                <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} zIndex={10} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={tracksViewChanges}>
                  <View style={[styles.dotMarker, { backgroundColor: "#fa6205", shadowColor: "#fa6205" }]} />
                </Marker>
              ) : null;
            })()}
            {(() => {
              const dest = parseCoords(currentTrip.destino);
              return dest ? (
                <Marker coordinate={{ latitude: dest.lat, longitude: dest.lng }} zIndex={5} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={tracksViewChanges}>
                  <View style={[styles.dotMarker, { backgroundColor: "#DC2626", shadowColor: "#DC2626" }]} />
                </Marker>
              ) : null;
            })()}
            {(() => {
              const pickup = parseCoords(currentTrip.punto_recogida);
              const dest = parseCoords(currentTrip.destino);
              return pickup && dest ? (
                <Polyline
                  coordinates={[
                    { latitude: pickup.lat, longitude: pickup.lng },
                    { latitude: dest.lat, longitude: dest.lng },
                  ]}
                  strokeColor="#FFF"
                  strokeWidth={3}
                  lineDashPattern={[10, 10]}
                />
              ) : null;
            })()}
          </>
        )}
      </MapView>

      <SafeAreaView style={styles.topContainer}>
        <View style={styles.headerPill}>
          {(() => {
            const driverPhoto = getUserPhotoUrl(userData);
            console.log("[HomeDelivery] HEADER PHOTO URL ->", driverPhoto);
            return driverPhoto ? (
              <Image source={{ uri: driverPhoto }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarInitial}>{userData?.nombre_completo?.charAt(0) || "U"}</Text>
              </View>
            );
          })()}
          <TouchableOpacity activeOpacity={0.8} onPress={openRatingsModal}>
            <Text style={styles.welcomeText}>Hola, {userData?.nombre_completo?.split(" ")[0]}</Text>
            <View style={styles.ratingRow}>
              <AntDesign name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{userRating ? parseFloat(userRating).toFixed(1) : "5.0"}</Text>
            </View>
          </TouchableOpacity>
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

      {!isEnabled && (
        <OfflinePanel
          availability={availability}
          checkingSubscription={checkingSubscription}
          onConnect={toggleConnection}
          onSubscribe={goToSubscriptions}
        />
      )}

      {isEnabled && (
        <View style={styles.bottomSheetContainer}>
          <TouchableOpacity style={styles.powerBtn} onPress={toggleConnection}>
            <Ionicons name="power" size={20} color="#FFF" />
          </TouchableOpacity>

          {currentTrip ? (
            <Animated.View style={{ opacity: fadeAnim }}>
              <TripCard
                trip={currentTrip}
                nextTrip={nextTrip}
                queueCount={queueCount}
                distanceFromMe={distanceFromMe}
                userRating={requesterRating}
                timerAnim={timerAnim}
                onReject={handleReject}
                onAccept={handlePressAccept}
              />
            </Animated.View>
          ) : (
            <SearchingState />
          )}
        </View>
      )}

      <ActiveRideModal visible={showActiveRideModal} onClose={() => setShowActiveRideModal(false)} />
      <SubscriptionModal visible={showSubscriptionModal} onClose={() => setShowSubscriptionModal(false)} onGoToSubscriptions={goToSubscriptions} />
      <RejectedTripsModal visible={showRejectedListModal} onClose={() => setShowRejectedListModal(false)} trips={rejectedTrips} onRestore={handleRestore} />
      <AcceptModal visible={showAcceptModal} step={acceptStep} errorMsg={acceptErrorMsg} onClose={closeAcceptModal} onConfirm={confirmAcceptation} />

      <Modal visible={showRatingsModal} transparent animationType="slide" onRequestClose={() => setShowRatingsModal(false)}>
        <View style={styles.ratingsOverlay}>
          <TouchableOpacity style={styles.ratingsBackdrop} activeOpacity={1} onPress={() => setShowRatingsModal(false)} />
          <View style={styles.ratingsSheet}>
            <View style={styles.ratingsHandleRow}>
              <View style={styles.ratingsSpacer} />
              <View style={styles.ratingsHandle} />
              <TouchableOpacity style={styles.ratingsCloseBtn} onPress={() => setShowRatingsModal(false)} activeOpacity={0.8}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {ratingsLoading ? (
              <ActivityIndicator size="large" color="#FF5500" style={{ marginVertical: 40 }} />
            ) : (
              <>
                <View style={styles.ratingsAverageBox}>
                  <Text style={styles.ratingsAverageValue}>{ratingsData?.promedio ? parseFloat(ratingsData.promedio).toFixed(1) : "0.0"}</Text>
                  <View style={styles.ratingsAverageStars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons key={n} name={n <= Math.round(ratingsData?.promedio || 0) ? "star" : "star-outline"} size={18} color="#FFD700" />
                    ))}
                  </View>
                  <Text style={styles.ratingsAverageTotal}>{ratingsData?.total || 0} calificaciones</Text>
                </View>

                <ScrollView style={styles.ratingsScroll} showsVerticalScrollIndicator={false}>
                  {(ratingsData?.data || []).length === 0 ? (
                    <Text style={styles.ratingsEmpty}>Aún no tienes calificaciones.</Text>
                  ) : (
                    (ratingsData?.data || []).map((item) => {
                      const photoUrl = getUserPhotoUrl(item.usuario);
                      return (
                        <View key={item.id?.toString()} style={styles.ratingItem}>
                          <View style={styles.ratingItemHeader}>
                            {photoUrl ? (
                              <Image source={{ uri: photoUrl }} style={styles.ratingItemAvatar} />
                            ) : (
                              <View style={styles.ratingItemAvatarFallback}>
                                <Text style={styles.ratingItemInitial}>{item.usuario?.nombre_completo?.charAt(0) || "U"}</Text>
                              </View>
                            )}
                            <View style={styles.ratingItemInfo}>
                              <Text style={styles.ratingItemName} numberOfLines={1}>{item.usuario?.nombre_completo || "Usuario"}</Text>
                              <View style={styles.ratingItemStars}>
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <Ionicons key={n} name={n <= (item.puntuacion || 0) ? "star" : "star-outline"} size={12} color="#FFD700" />
                                ))}
                              </View>
                            </View>
                            <Text style={styles.ratingItemDate}>
                              {item.created_at ? new Date(item.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }) : ""}
                            </Text>
                          </View>
                          {item.mensaje ? <Text style={styles.ratingItemMessage}>{item.mensaje}</Text> : null}
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  dotMarker: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: "#FFF", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 5 },

  topContainer: { position: "absolute", top: Platform.OS === "ios" ? 50 : 40, left: 20, right: 20, zIndex: 10, flexDirection: "row", justifyContent: "space-between" },
  headerPill: { flexDirection: "row", backgroundColor: "rgba(255, 255, 255, 0.95)", padding: 8, paddingRight: 20, borderRadius: 40, alignSelf: "flex-start", alignItems: "center", borderWidth: 1, borderColor: "#DDD", elevation: 5 },
  avatarContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", marginRight: 10, borderWidth: 1, borderColor: "#fa6205" },
  avatarImage: { width: 36, height: 36, borderRadius: 18, marginRight: 10, borderWidth: 1, borderColor: "#fa6205", backgroundColor: "#F0F0F0" },
  avatarInitial: { color: "#fa6205", fontFamily: "Montserrat_700Bold", fontSize: 16 },
  welcomeText: { color: "#1C1C1E", fontFamily: "Montserrat_600SemiBold", fontSize: 14 },
  ratingRow: { flexDirection: "row", alignItems: "center" },
  ratingText: { color: "#FFD700", fontSize: 12, marginLeft: 4, fontFamily: "Montserrat_500Medium" },

  rejectedListBtn: { backgroundColor: "rgba(255, 255, 255, 0.95)", paddingHorizontal: 15, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#DDD", flexDirection: "row" },
  rejectedBadge: { position: "absolute", top: -5, right: -5, backgroundColor: "#DC2626", width: 20, height: 20, borderRadius: 10, justifyContent: "center", alignItems: "center", zIndex: 2 },
  rejectedBadgeText: { color: "#FFF", fontSize: 10, fontFamily: "Montserrat_700Bold" },
  rejectedListText: { color: "#1C1C1E", marginLeft: 8, fontFamily: "Montserrat_600SemiBold", fontSize: 12 },

  bottomSheetContainer: { position: "absolute", bottom: 30, left: 20, right: 20, zIndex: 20 },
  powerBtn: { position: "absolute", top: -50, right: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: "#DC2626", justifyContent: "center", alignItems: "center", elevation: 5, shadowColor: "#000", shadowOpacity: 0.3 },

  ratingsOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.4)", justifyContent: "flex-end" },
  ratingsBackdrop: { ...StyleSheet.absoluteFillObject },
  ratingsSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
    maxHeight: "85%",
  },
  ratingsHandleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  ratingsSpacer: { width: 36 },
  ratingsHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: "#E2E8F0" },
  ratingsCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  ratingsAverageBox: { alignItems: "center", paddingVertical: 10, marginBottom: 8 },
  ratingsAverageValue: { fontSize: 48, fontFamily: "Montserrat_800ExtraBold", color: "#0F172A" },
  ratingsAverageStars: { flexDirection: "row", gap: 4, marginTop: 6 },
  ratingsAverageTotal: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#64748B", marginTop: 6 },
  ratingsScroll: { maxHeight: 400 },
  ratingsEmpty: { textAlign: "center", fontSize: 14, fontFamily: "Montserrat", color: "#94A3B8", marginTop: 20 },
  ratingItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  ratingItemHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  ratingItemAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E2E8F0" },
  ratingItemAvatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fa6205", justifyContent: "center", alignItems: "center" },
  ratingItemInitial: { color: "#FFF", fontFamily: "Montserrat_700Bold", fontSize: 16 },
  ratingItemInfo: { flex: 1 },
  ratingItemName: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: "#0F172A" },
  ratingItemStars: { flexDirection: "row", gap: 2, marginTop: 3 },
  ratingItemDate: { fontSize: 11, fontFamily: "Montserrat_500Medium", color: "#94A3B8" },
  ratingItemMessage: { fontSize: 13, fontFamily: "Montserrat", color: "#64748B", marginTop: 10, lineHeight: 18 },
});

