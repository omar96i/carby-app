import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AlertaModal from "../../components/ErrorModal";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  StatusBar,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import { GOOGLE_MAPS_API_KEY } from "../../constants/Keys";
import * as Location from "expo-location";
import MapView, { Marker, Polyline } from "react-native-maps";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import { useNotification } from "../../context/NotificationContext";
import Modal from "react-native-modal";

import DestinationBar from "../Transport/components/DestinationBar";
import RouteInfoBar from "../Transport/components/RouteInfoBar";
import VehicleCarousel from "../Transport/components/VehicleCarousel";
import BidPanel from "../Transport/components/BidPanel";
import PaymentSelector from "../Transport/components/PaymentSelector";
import NoteInput from "../Transport/components/NoteInput";
import SearchModal from "../Transport/components/SearchModal";

import PeekSummary from "../Transport/components/PeekSummary";

const screenH = Dimensions.get("window").height;
const screenW = Dimensions.get("window").width;
const COLLAPSED_SHEET_H = 94;
const EXPANDED_SHEET_H = Math.round(screenH * 0.58);

const decodePolyline = (encoded) => {
  const points = [];
  let index = 0,
    lat = 0,
    lng = 0;
  while (index < encoded.length) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
};

const toRad = (value) => (value * Math.PI) / 180;

const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    console.log("Coordenadas invalidas para calculo Haversine, usando valor predeterminado");
    return 3.0;
  }
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1.2;
};



export default function StepUno() {
  const mapRef = useRef(null);
  const navigation = useNavigation();
  const { expoPushToken, notification } = useNotification();

  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [serviceDetails, setServiceDetails] = useState({
    nombre_servicio: "",
    precio_kilometro: 0,
    precio_base: 0,
    precio_adicional: 0,
  });
  const [distance, setDistance] = useState(null);
  const [totalPrice, setTotalPrice] = useState("");
  const totalPriceRaw = useRef(0);

  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pickupCoord, setPickupCoord] = useState(null);
  const [deliveryCoord, setDeliveryCoord] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [observations, setObservations] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(null);

  const [isModalVisible, setModalVisible] = useState(false);
  const [isErrorModalVisible, setErrorModalVisible] = useState(false);
  const [createdCarreraId, setCreatedCarreraId] = useState(null);

  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [deliverySuggestions, setDeliverySuggestions] = useState([]);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDelivery, setIsSearchingDelivery] = useState(false);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDeliverySuggestions, setShowDeliverySuggestions] = useState(false);

  const [distanceInKm, setDistanceInKm] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);
  const [routeDurationInTraffic, setRouteDurationInTraffic] = useState(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [priceError, setPriceError] = useState(null);

  const [userPaymentSettings, setUserPaymentSettings] = useState(null);
  const [loadingUserSettings, setLoadingUserSettings] = useState(true);

  const [availableServices, setAvailableServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingCurrentLocation, setIsLoadingCurrentLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [isCreatingRide, setIsCreatingRide] = useState(false);
  const [showGoToRide, setShowGoToRide] = useState(false);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const sheetAnim = useRef(new Animated.Value(COLLAPSED_SHEET_H)).current;

  // Animación de creando carrera
  const creatingPulse = useRef(new Animated.Value(1)).current;
  const creatingMove = useRef(new Animated.Value(0)).current;

  const [pinMode, setPinMode] = useState(false);
  const [isLocationPickup, setIsLocationPickup] = useState(true);
  const [pinAddress, setPinAddress] = useState("");

  const [mapRegion, setMapRegion] = useState({
    latitude: 4.60971,
    longitude: -74.08175,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [recentLocations, setRecentLocations] = useState([]);

  const [userLocation, setUserLocation] = useState(null);
  const userLocationRef = useRef(null);
  const [ignoreNextRegionChange, setIgnoreNextRegionChange] = useState(false);
  const [userRole, setUserRole] = useState("usuario");

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "error", onPrimary: null, primaryLabel: null });

  const [bidOffset, setBidOffset] = useState(0);
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [displayPrice, setDisplayPrice] = useState("");
  const priceAnim = useRef(new Animated.Value(1)).current;
  const markerPulse = useRef(new Animated.Value(0)).current;
  const dragHandleAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(-screenW)).current;

  const searchTimeout = useRef(null);
  const mapFocusTimeout = useRef(null);
  const hasFocused = useRef(false);

  const showAlert = (message, type = "error", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  const goBack = () => navigation.goBack();

  const resetAll = () => {
    setSelectedServiceId(null);
    setServiceDetails({
      nombre_servicio: "",
      precio_kilometro: 0,
      precio_base: 0,
      precio_adicional: 0,
    });
    setPaymentMethod(null);
    setObservations("");
    setModalVisible(false);
    setErrorModalVisible(false);
    setPickupAddress("");
    setDeliveryAddress("");
    setPickupCoord(null);
    setDeliveryCoord(null);
    setRouteCoords([]);
    setTotalPrice("");
    totalPriceRaw.current = 0;
    setDisplayPrice("");
    setSuggestedPrice("");
    setBidOffset(0);
    setDistanceInKm(null);
    setDistance(null);
    setRouteDuration(null);
    setRouteDurationInTraffic(null);
    setIsCalculatingPrice(false);
    setPriceError(null);
    setIsLoadingServices(false);
    setIsLoadingCurrentLocation(false);
    setLocationError(null);
    setIsCreatingRide(false);
    setSheetExpanded(false);
    setPinMode(false);
    setIsLocationPickup(true);
    setPinAddress("");
    setMapSearchQuery("");
    setMapSearchResults([]);
    setIsSearchingMap(false);
    setSearchModalVisible(false);
    setPaymentModalVisible(false);
    setPickupSuggestions([]);
    setDeliverySuggestions([]);
    setIsSearchingPickup(false);
    setIsSearchingDelivery(false);
    setShowPickupSuggestions(false);
    setShowDeliverySuggestions(false);
    setMapRegion({
      latitude: 4.60971,
      longitude: -74.08175,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Animación "Creando carrera"
  useEffect(() => {
    if (!isCreatingRide) {
      creatingPulse.setValue(1);
      creatingMove.setValue(0);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(creatingPulse, { toValue: 1.2, duration: 700, useNativeDriver: true }),
        Animated.timing(creatingPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );

    const move = Animated.loop(
      Animated.sequence([
        Animated.timing(creatingMove, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(creatingMove, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );

    pulse.start();
    move.start();

    return () => {
      pulse.stop();
      move.stop();
    };
  }, [isCreatingRide]);

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const tipo = await AsyncStorage.getItem("tipo_usuario");
        if (tipo) setUserRole(tipo);
      } catch (error) {
        console.error("Error al obtener tipo_usuario:", error);
      }
    };
    getUserRole();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const tabNav = navigation.getParent();
      if (tabNav) tabNav.setOptions({ tabBarStyle: { display: "none" } });

      if (!hasFocused.current) {
        hasFocused.current = true;
      } else {
        resetAll();
        AsyncStorage.removeItem("selectedServiceId");
        AsyncStorage.removeItem("serviceName");
      }
      getCurrentLocation("pickup");
      fetchServices();
      fetchUserPaymentSettings();

      return () => {
        navigation.getParent()?.setOptions({
          tabBarStyle: { backgroundColor: "#FFF", height: 56, borderTopWidth: 1, borderTopColor: "#F0F0F0", display: "flex" },
        });
      };
    }, [navigation])
  );

  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
          setUserLocation(coords);
          userLocationRef.current = coords;
          setPickupCoord(coords);
          setMapRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 });
          setIgnoreNextRegionChange(true);
        }
      } catch (error) {
        console.log("Error obteniendo ubicacion inicial:", error);
      }
      getCurrentLocation("pickup");
    };
    initializeLocation();
  }, []);

  const saveRecentLocation = async (location) => {
    try {
      const stored = await AsyncStorage.getItem("recent_locations");
      let locations = stored ? JSON.parse(stored) : [];
      locations = locations.filter((l) => l.place_id !== location.place_id);
      locations.unshift(location);
      locations = locations.slice(0, 5);
      await AsyncStorage.setItem("recent_locations", JSON.stringify(locations));
      setRecentLocations(locations);
    } catch (error) {
      console.error("Error guardando ubicacion reciente:", error);
    }
  };

  const getRecentLocations = async () => {
    try {
      const stored = await AsyncStorage.getItem("recent_locations");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error leyendo ubicaciones recientes:", error);
      return [];
    }
  };

  useEffect(() => {
    if (userLocation) {
      setMapRegion({ latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
      setIgnoreNextRegionChange(true);
      setPickupCoord({ latitude: userLocation.latitude, longitude: userLocation.longitude });
      getAddressFromCoordinates(userLocation.latitude, userLocation.longitude).then((addr) => {
        if (addr && !pickupAddress) setPickupAddress(addr);
      });
    }
  }, [userLocation]);

  useEffect(() => {
    const load = async () => {
      const locations = await getRecentLocations();
      setRecentLocations(locations);
    };
    load();
  }, []);

  useEffect(() => {
    if (userPaymentSettings && !paymentMethod) {
      setPaymentMethod(getDefaultPaymentMethod(userPaymentSettings));
    }
  }, [userPaymentSettings, paymentMethod]);

  const fitMapBetween = useCallback((p1, p2) => {
    const midLat = (p1.latitude + p2.latitude) / 2;
    const midLng = (p1.longitude + p2.longitude) / 2;
    const latDelta = Math.max(Math.abs(p1.latitude - p2.latitude) * 1.6, 0.01);
    const lngDelta = Math.max(Math.abs(p1.longitude - p2.longitude) * 1.6, 0.01);
    setIgnoreNextRegionChange(true);
    const doFit = () => {
      if (mapRef.current) {
        mapRef.current.animateToRegion({ latitude: midLat, longitude: midLng, latitudeDelta: latDelta, longitudeDelta: lngDelta }, 800);
      } else {
        setTimeout(doFit, 200);
      }
    };
    doFit();
  }, []);

  const focusOnCoordThenFitBoth = (coord, delayMs = 6000) => {
    if (!coord || !mapRef.current) return;
    if (mapFocusTimeout.current) clearTimeout(mapFocusTimeout.current);
    setIgnoreNextRegionChange(true);
    mapRef.current.animateToRegion({ ...coord, latitudeDelta: 0.002, longitudeDelta: 0.002 }, 800);
    if (pickupCoord && deliveryCoord) {
      mapFocusTimeout.current = setTimeout(() => {
        fitMapBetween(pickupCoord, deliveryCoord);
      }, delayMs);
    }
  };

  useEffect(() => {
    if (mapFocusTimeout.current) return;
    if (pickupCoord && deliveryCoord) {
      const timer = setTimeout(() => fitMapBetween(pickupCoord, deliveryCoord), 400);
      return () => clearTimeout(timer);
    } else if (pickupCoord && mapRef.current) {
      setIgnoreNextRegionChange(true);
      mapRef.current.animateToRegion({ ...pickupCoord, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500);
    } else if (deliveryCoord && mapRef.current) {
      setIgnoreNextRegionChange(true);
      mapRef.current.animateToRegion({ ...deliveryCoord, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500);
    }
  }, [pickupCoord, deliveryCoord, fitMapBetween]);

  const fetchRoute = async (origin, destination) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.routes && data.routes.length > 0) {
        const points = data.routes[0].overview_polyline.points;
        setRouteCoords(decodePolyline(points));
      }
    } catch (e) {
      console.error("Error fetching route:", e);
    }
  };



  useEffect(() => {
    if (pickupCoord && deliveryCoord) fetchRoute(pickupCoord, deliveryCoord);
    else setRouteCoords([]);
  }, [pickupCoord, deliveryCoord]);

  const getLocationBiasParam = (lat, lng, radiusMeters = 20000) => {
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return "";
    return `&locationbias=circle:${radiusMeters}@${lat},${lng}`;
  };

  const searchMapLocation = async (query, userLat, userLng) => {
    setMapSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length > 3) {
      setIsSearchingMap(true);
      searchTimeout.current = setTimeout(async () => {
        try {
          const countryCode = "CO";
          const encodedQuery = encodeURIComponent(query);
          const lat = userLat ?? userLocationRef.current?.latitude;
          const lng = userLng ?? userLocationRef.current?.longitude;
          const locationBias = getLocationBiasParam(lat, lng, 20000);
          const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedQuery}&components=country:${countryCode}${locationBias}&key=${GOOGLE_MAPS_API_KEY}`;
          const response = await fetch(url);
          const data = await response.json();
          if (data.predictions) setMapSearchResults(data.predictions);
        } catch (error) {
          console.error("Error buscando ubicaciones en el mapa:", error);
        } finally {
          setIsSearchingMap(false);
        }
      }, 300);
    } else {
      const recents = await getRecentLocations();
      const recentsWithFlag = recents.map((r) => ({ ...r, recent: true }));
      setRecentLocations(recentsWithFlag);
      setMapSearchResults(recentsWithFlag);
    }
  };

  useEffect(() => {
    const loadRecents = async () => {
      const recents = await getRecentLocations();
      setRecentLocations(recents.map((r) => ({ ...r, recent: true })));
    };
    loadRecents();
  }, []);

  const centerMapOnUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showAlert("Permiso denegado: no se pudo acceder a tu ubicacion.");
        return;
      }
      const lastLocation = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
      if (lastLocation && mapRef.current) {
        mapRef.current.animateToRegion({ latitude: lastLocation.coords.latitude, longitude: lastLocation.coords.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 1000);
      }
      const preciseLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (mapRef.current) {
        mapRef.current.animateToRegion({ latitude: preciseLocation.coords.latitude, longitude: preciseLocation.coords.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 1000);
      }
    } catch (error) {
      console.error("Error general en ubicacion:", error);
      showAlert("No se pudo obtener tu ubicacion actual.");
    }
  };

  const selectMapLocation = async (placeId, description = null) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === "OK" && data.result?.geometry) {
        const location = data.result.geometry.location;
        let formattedAddress = data.result.formatted_address || description || "";
        if (/^[\w\d]+\+\w+/.test(formattedAddress)) formattedAddress = description || "";
        if (isLocationPickup) {
          setPickupAddress(formattedAddress);
          setPickupCoord({ latitude: location.lat, longitude: location.lng });
          setIgnoreNextRegionChange(true);
          mapRef.current?.animateToRegion({ latitude: location.lat, longitude: location.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 1000);
        } else {
          setDeliveryAddress(formattedAddress);
          const coords = { latitude: location.lat, longitude: location.lng };
          setDeliveryCoord(coords);
          await saveRecentLocation({ place_id: placeId, description: formattedAddress });
          expandSheet();
          focusOnCoordThenFitBoth(coords, 6000);
        }
        setMapSearchResults([]);
        setMapSearchQuery("");
        setSearchModalVisible(false);
      }
    } catch (error) {
      console.error("Error obteniendo detalles del lugar:", error);
    }
  };

  const geocodePlaceId = async (placeId) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === "OK" && data.results.length > 0) {
        const loc = data.results[0].geometry.location;
        return { latitude: loc.lat, longitude: loc.lng };
      }
    } catch (e) {
      console.error("Error geocodificando place_id:", e);
    }
    return null;
  };

  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === "OK" && data.results.length > 0) {
        const validResult = data.results.find((result) => !/^[\w\d]+\+\w+/.test(result.formatted_address));
        if (validResult) return validResult.formatted_address;
        return "Direccion no disponible";
      }
      return "Direccion no encontrada";
    } catch (error) {
      console.error("Error obteniendo direccion:", error);
      return "Error al obtener la direccion";
    }
  };

  const openLocationPicker = async (isPickup) => {
    setIsLocationPickup(isPickup);
    setPinMode(true);
    setPinAddress(isPickup ? pickupAddress : deliveryAddress);
    setMapSearchResults([]);
    setMapSearchQuery("");
    if (mapRef.current) {
      mapRef.current.animateToRegion({ ...mapRegion, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 500);
    }
  };

  const confirmPinLocation = async () => {
    const { latitude, longitude } = mapRegion;
    let address = pinAddress || (await getAddressFromCoordinates(latitude, longitude));
    if (/^[\w\d]+\+\w+/.test(address)) {
      address = await getAddressFromCoordinates(latitude, longitude);
      if (/^[\w\d]+\+\w+/.test(address)) {
        address = `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`;
      }
    }
    if (isLocationPickup) {
      setPickupAddress(address);
      setPickupCoord({ latitude, longitude });
    } else {
      setDeliveryAddress(address);
      const coords = { latitude, longitude };
      setDeliveryCoord(coords);
      expandSheet();
      focusOnCoordThenFitBoth(coords, 6000);
    }
    setPinMode(false);
    setPinAddress("");
  };

  const cancelPinMode = () => {
    setPinMode(false);
    setPinAddress("");
  };

  const getCurrentLocation = async (locationType = "pickup") => {
    setIsLoadingCurrentLocation(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Se requiere permiso para acceder a la ubicacion");
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === "OK" && data.results.length > 0) {
        const filteredResult = data.results.find((result) => {
          const isPlusCode = result.types.includes("plus_code");
          const isFormattedPlusCode = /^[A-Z0-9]{4}\+/.test(result.formatted_address);
          return !isPlusCode && !isFormattedPlusCode;
        });
        if (filteredResult) {
          const address = filteredResult.formatted_address;
          const coords = { latitude, longitude };
          if (locationType === "pickup") {
            setPickupAddress(address);
            setPickupCoord(coords);
            setUserLocation(coords);
            userLocationRef.current = coords;
          } else {
            setDeliveryAddress(address);
            setDeliveryCoord(coords);
          }
        } else {
          setLocationError("No se pudo convertir la ubicacion en direccion legible");
        }
      } else {
        setLocationError("No se pudo convertir la ubicacion en direccion");
      }
    } catch (error) {
      console.error("Error obteniendo ubicacion:", error);
      setLocationError("Error al obtener la ubicacion");
    } finally {
      setIsLoadingCurrentLocation(false);
    }
  };

  const fetchServices = async () => {
    try {
      setIsLoadingServices(true);
      const response = await fetch(`${BASE_URL}services`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      console.log("Servicios obtenidos:", data);
      if (data && data.services) {
        setAvailableServices(data.services);
      } else {
        console.log("No se encontraron servicios en la respuesta");
        setAvailableServices([]);
      }
    } catch (error) {
      console.error("Error al obtener servicios:", error);
      setAvailableServices([]);
    } finally {
      setIsLoadingServices(false);
    }
  };

  const getCoordinatesFromAddress = async (address) => {
    if (!address || address.trim() === "") return { lat: 4.60971, lng: -74.08175 };
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === "OK" && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
      }
      return { lat: 4.60971, lng: -74.08175 };
    } catch (error) {
      console.error("Error obteniendo coordenadas:", error);
      return { lat: 4.60971, lng: -74.08175 };
    }
  };

  const getCoordinatesFromAddressForAPI = async (address) => {
    if (!address || address.trim() === "") return { lat: 0, lng: 0 };
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === "OK" && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
      }
      return { lat: 4.60971, lng: -74.08175 };
    } catch (error) {
      console.error("Error obteniendo coordenadas:", error);
      return { lat: 4.60971, lng: -74.08175 };
    }
  };

  const fetchRouteInfo = async (origin, destination) => {
    if (!origin || !destination || origin.trim() === "" || destination.trim() === "") {
      return { distanceKm: 0, durationMin: 0, durationInTrafficMin: 0 };
    }
    try {
      const originEncoded = encodeURIComponent(origin);
      const destinationEncoded = encodeURIComponent(destination);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originEncoded}&destinations=${destinationEncoded}&mode=driving&departure_time=now&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === "OK" && data.rows[0].elements[0].status === "OK") {
        const element = data.rows[0].elements[0];
        const distanceKm = element.distance.value / 1000;
        const durationMin = Math.round(element.duration.value / 60);
        const durationInTrafficMin = element.duration_in_traffic
          ? Math.round(element.duration_in_traffic.value / 60)
          : durationMin;
        return { distanceKm, durationMin, durationInTrafficMin };
      }
      throw new Error("Distance Matrix no disponible");
    } catch (error) {
      console.error("Error calculando ruta:", error);
      // Fallback: calcular distancia por Haversine y estimar duracion
      try {
        const originCoords = await getCoordinatesFromAddress(origin);
        const destCoords = await getCoordinatesFromAddress(destination);
        if (originCoords && destCoords) {
          const distanceKm = calculateHaversineDistance(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);
          const durationMin = Math.round(distanceKm * 2.5);
          return { distanceKm, durationMin, durationInTrafficMin: durationMin };
        }
      } catch (e) {
        console.error("Error fallback ruta:", e);
      }
      return { distanceKm: 3.0, durationMin: 8, durationInTrafficMin: 8 };
    }
  };

  const calculateDistance = async (origin, destination) => {
    const info = await fetchRouteInfo(origin, destination);
    return info.distanceKm;
  };

  const verifyApiKey = async () => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === "REQUEST_DENIED") {
        console.error("Google Maps API Key invalida o con restricciones:", data.error_message);
        showAlert("Hay un problema con el acceso a los servicios de mapas. Contacta al soporte tecnico.");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error verificando API key:", error);
      return false;
    }
  };

  const formatPrice = (value) => Math.round(value).toLocaleString("es-CO");

  const computeSuggestedPrice = (distKm) => {
    const selectedService = availableServices.find((s) => s.id.toString() === selectedServiceId);
    if (!selectedService) return 0;
    const base = parseFloat(selectedService.precio_base) || 0;
    const perKm = parseFloat(selectedService.precio_km) || 0;
    const additional = parseFloat(selectedService.precio_adicional) || 0;
    const dist = distKm && distKm > 0 ? distKm : 0;
    let calculated = base + dist * perKm + additional;
    calculated = Math.max(calculated, 5.0);
    return parseFloat(calculated.toFixed(0));
  };

  const updatePriceDisplay = (distKm = distanceInKm) => {
    const suggestedRaw = computeSuggestedPrice(distKm);
    setSuggestedPrice(formatPrice(suggestedRaw));
    const finalRaw = Math.max(suggestedRaw + bidOffset, 5);
    totalPriceRaw.current = finalRaw;
    setDisplayPrice(formatPrice(finalRaw));
    setTotalPrice(formatPrice(finalRaw));
  };

  const calculateTotalPrice = async () => {
    if (pickupAddress && deliveryAddress && selectedServiceId) {
      setIsCalculatingPrice(true);
      setPriceError(null);
      try {
        const routeInfo = await fetchRouteInfo(pickupAddress, deliveryAddress);
        const distance = routeInfo.distanceKm;
        if (distance !== null && distance > 0) {
          setDistanceInKm(distance);
          setDistance(distance);
          setRouteDuration(routeInfo.durationMin);
          setRouteDurationInTraffic(routeInfo.durationInTrafficMin);
          await AsyncStorage.setItem("distance", distance.toString());
          updatePriceDisplay(distance);
        } else {
          setPriceError("No se pudo calcular la distancia entre las ubicaciones.");
          setTotalPrice("");
        }
      } catch (error) {
        console.error("Error calculando precio total:", error);
        setPriceError("Ocurrio un error al calcular el precio. Intenta de nuevo.");
        const estimatedDistance = 5.0;
        setDistanceInKm(estimatedDistance);
        setDistance(estimatedDistance);
        setRouteDuration(Math.round(estimatedDistance * 2.5));
        setRouteDurationInTraffic(Math.round(estimatedDistance * 2.5));
        updatePriceDisplay(estimatedDistance);
      } finally {
        setIsCalculatingPrice(false);
      }
    }
  };

  const searchPickupAddress = async (text) => {
    setPickupAddress(text);
    if (text.length > 3) {
      setIsSearchingPickup(true);
      setShowPickupSuggestions(true);
      try {
        const countryCode = "CO";
        const encodedQuery = encodeURIComponent(text.trim());
        const userLat = userLocationRef.current?.latitude;
        const userLng = userLocationRef.current?.longitude;
        const locationBias = getLocationBiasParam(userLat, userLng, 20000);
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedQuery}&components=country:${countryCode}${locationBias}&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        const predictions = data.predictions || [];
        const filtered = predictions.filter((item) => {
          const desc = item.description || "";
          return desc.trim() !== "" && !/^[\w\d]+\+\w+/.test(desc);
        });
        setPickupSuggestions(filtered);
      } catch (error) {
        console.error("Error fetching pickup address suggestions:", error);
      } finally {
        setIsSearchingPickup(false);
      }
    } else {
      setPickupSuggestions([]);
      setShowPickupSuggestions(false);
    }
  };

  const searchDeliveryAddress = async (text) => {
    setDeliveryAddress(text);
    if (text.length > 3) {
      setIsSearchingDelivery(true);
      setShowDeliverySuggestions(true);
      try {
        const countryCode = "CO";
        const encodedQuery = encodeURIComponent(text.trim());
        // Para el destino sesgamos desde el punto de recogida si ya existe; si no, desde la ubicacion del usuario
        const biasLat = pickupCoord?.latitude ?? userLocationRef.current?.latitude;
        const biasLng = pickupCoord?.longitude ?? userLocationRef.current?.longitude;
        const locationBias = getLocationBiasParam(biasLat, biasLng, 20000);
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedQuery}&components=country:${countryCode}${locationBias}&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        const predictions = data.predictions || [];
        const filtered = predictions.filter((item) => {
          const desc = item.description || "";
          return desc.trim() !== "" && !/^[\w\d]+\+\w+/.test(desc);
        });
        setDeliverySuggestions(filtered);
      } catch (error) {
        console.error("Error fetching delivery address suggestions:", error);
      } finally {
        setIsSearchingDelivery(false);
      }
    } else {
      setDeliverySuggestions([]);
      setShowDeliverySuggestions(false);
    }
  };

  const selectPickupAddress = async (item) => {
    Keyboard.dismiss();
    setPickupAddress(item.description);
    setShowPickupSuggestions(false);
    const coords = await geocodePlaceId(item.place_id);
    if (coords) setPickupCoord(coords);
  };

  const selectDeliveryAddress = async (item) => {
    Keyboard.dismiss();
    setDeliveryAddress(item.description);
    setShowDeliverySuggestions(false);
    const coords = await geocodePlaceId(item.place_id);
    if (coords) {
      setDeliveryCoord(coords);
      focusOnCoordThenFitBoth(coords, 6000);
      await saveRecentLocation({ place_id: item.place_id, description: item.description });
    }
  };

  const fetchUserPaymentSettings = async () => {
    try {
      setLoadingUserSettings(true);
      const token = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");
      if (!token || !userData) {
        console.log("No se encontro token o datos de usuario");
        return;
      }
      const userId = JSON.parse(userData).id;
      const response = await fetch(`${BASE_URL}usuario/${userId}`, {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Error HTTP! Estado: ${response.status}`);
      const data = await response.json();
      if (data.status && data.data) {
        setUserPaymentSettings(data.data);
        console.log("Configuracion de usuario cargada:", data.data);
      }
    } catch (error) {
      console.error("Error obteniendo configuracion de usuario:", error);
    } finally {
      setLoadingUserSettings(false);
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case "efectivo":
        return "Efectivo";
      case "nequi":
        return "Nequi";
      case "bancolombia":
        return "Bancolombia";
      default:
        return "Nequi o Bancolombia";
    }
  };

  const getDefaultPaymentMethod = (settings) => {
    if (settings && settings.puede_pagar_efectivo) return "efectivo";
    return "nequi";
  };

  const crearCarrera = async () => {
    try {
      setIsCreatingRide(true);
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) throw new Error("No se encontro ID de usuario");
      const puntoRecogidaCoords = await getCoordinatesFromAddressForAPI(pickupAddress);
      const destinoCoords = await getCoordinatesFromAddressForAPI(deliveryAddress);
      const carreraData = {
        usuario_id: parseInt(userId),
        conductor_id: null,
        service_id: selectedServiceId ? parseInt(selectedServiceId) : null,
        pedido_id: null,
        informacion_adicional: JSON.stringify({
          observaciones: observations || "",
          origen: pickupAddress || "",
          destino: deliveryAddress || "",
          metododepago: getPaymentMethodLabel(paymentMethod),
        }),
        punto_recogida: JSON.stringify(puntoRecogidaCoords),
        destino: JSON.stringify(destinoCoords),
        costo: totalPriceRaw.current,
        distancia: distanceInKm,
        estado: "pendiente",
        metodo_pago: getPaymentMethodLabel(paymentMethod),
      };
      console.log("Datos de carrera a enviar:", carreraData);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("No se encontro token de autenticacion");
      const response = await fetch(`${BASE_URL}carreras`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(carreraData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Error al crear el arrendamiento");
      console.log("Carrera creada exitosamente:", data);
      let newCarreraId = null;
      if (data && data.carrera && data.carrera.id) {
        newCarreraId = data.carrera.id;
        await AsyncStorage.setItem("carreraId", newCarreraId.toString());
      } else if (data && data.id) {
        newCarreraId = data.id;
        await AsyncStorage.setItem("carreraId", newCarreraId.toString());
      }
      setCreatedCarreraId(newCarreraId);
      return data;
    } catch (error) {
      console.error("Error al crear carrera:", error);
      setErrorModalVisible(true);
      return null;
    }
  };

  const handleContinue = async () => {
    if (!pickupAddress.trim() || !deliveryAddress.trim()) {
      showAlert("Por favor ingresa tanto la direccion de recogida como la direccion de destino.");
      return;
    }
    if (!paymentMethod) {
      showAlert("Por favor selecciona un metodo de pago antes de continuar.");
      return;
    }
    if (!totalPrice) {
      showAlert("No se ha podido calcular el precio del servicio. Por favor verifica las direcciones ingresadas.");
      return;
    }

    setIsCreatingRide(true);
    setShowGoToRide(false);
    const startTime = Date.now();
    let result = null;
    let createError = null;

    try {
      result = await crearCarrera();
    } catch (error) {
      console.error("Error en el proceso:", error);
      createError = error;
    }

    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, 3000 - elapsed);

    setTimeout(() => {
      if (createError || !result) {
        setIsCreatingRide(false);
        setErrorModalVisible(true);
        return;
      }

      const newCarreraId = result?.carrera?.id || result?.id;
      if (newCarreraId) {
        setCreatedCarreraId(newCarreraId);
        setShowGoToRide(true);
      } else {
        setIsCreatingRide(false);
        setErrorModalVisible(true);
      }
    }, remaining);
  };

  const handleGoToRide = () => {
    setIsCreatingRide(false);
    setShowGoToRide(false);
    if (createdCarreraId) {
      navigation.navigate("DetalleCarrera", { tripId: createdCarreraId, carreraId: createdCarreraId });
    }
  };

  const handleServiceSelect = (service) => {
    console.log("Datos completos del servicio:", service);
    if (service.icono) {
      console.log(`Icono del servicio: ${service.icono}`);
      console.log(`URL completa: ${BASE_URL}${service.icono}`);
    } else {
      console.log("El servicio no tiene icono");
    }
    setSelectedServiceId(service.id.toString());
    setServiceDetails({
      nombre_servicio: service.nombre || "",
      precio_kilometro: service.precio_km || 0,
      precio_base: service.precio_base || 0,
      precio_adicional: service.precio_adicional || 0,
    });
    setBidOffset(0);
    AsyncStorage.setItem("selectedServiceId", service.id.toString());
    if (service.nombre) AsyncStorage.setItem("serviceName", service.nombre);
  };

  const handlePaymentMethodSelect = (method) => {
    if (method === "efectivo" && userPaymentSettings && !userPaymentSettings.puede_pagar_efectivo) {
      showAlert("El pago en efectivo no esta disponible para tu cuenta. Por favor selecciona otro metodo de pago.");
      return;
    }
    setPaymentMethod(method);
  };

  // Efectos de carga inicial
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await AsyncStorage.removeItem("selectedServiceId");
        await AsyncStorage.removeItem("serviceName");
        setSelectedServiceId(null);
        setServiceDetails({
          nombre_servicio: "",
          precio_kilometro: 0,
          precio_base: 0,
          precio_adicional: 0,
        });
        await fetchServices();
        await fetchUserPaymentSettings();
        verifyApiKey();
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
      }
    };
    loadInitialData();
  }, []);

  // Calcular precio cuando cambian direcciones o servicio seleccionado
  useEffect(() => {
    if (pickupAddress && deliveryAddress && selectedServiceId) {
      calculateTotalPrice();
    } else {
      updatePriceDisplay(0);
    }
  }, [pickupAddress, deliveryAddress, selectedServiceId, pickupCoord, deliveryCoord]);

  // Actualizar display cuando cambia el bid offset
  useEffect(() => {
    updatePriceDisplay(distanceInKm || 0);
  }, [bidOffset]);

  // Auto-seleccionar primer servicio al cargar
  useEffect(() => {
    if (availableServices.length > 0 && !selectedServiceId) {
      handleServiceSelect(availableServices[0]);
    }
  }, [availableServices]);

  // Animaciones
  useEffect(() => {
    if (totalPrice) {
      Animated.sequence([
        Animated.timing(priceAnim, { toValue: 1.2, duration: 100, useNativeDriver: false }),
        Animated.spring(priceAnim, { toValue: 1, useNativeDriver: false, friction: 3, tension: 120 }),
      ]).start();
    }
  }, [totalPrice]);

  const pulseAnimation = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, { toValue: 1.05, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnimation, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.timing(markerPulse, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Animacion de destello en boton de accion
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: screenW, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: screenW, duration: 5000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Animacion del handle del bottom sheet
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dragHandleAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(dragHandleAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  // Bottom sheet animation
  useEffect(() => {
    Animated.spring(sheetAnim, {
      toValue: sheetExpanded ? EXPANDED_SHEET_H : COLLAPSED_SHEET_H,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [sheetExpanded]);

  // Reverse geocodificar direccion central en modo pin
  useEffect(() => {
    if (!pinMode) return;
    const timeout = setTimeout(async () => {
      try {
        const address = await getAddressFromCoordinates(mapRegion.latitude, mapRegion.longitude);
        setPinAddress(address);
      } catch (e) {
        console.error("Error geocodificando pin:", e);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [mapRegion.latitude, mapRegion.longitude, pinMode]);

  const toggleSheet = () => setSheetExpanded((prev) => !prev);
  const expandSheet = () => setSheetExpanded(true);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -30) setSheetExpanded(true);
        else if (gestureState.dy > 30) setSheetExpanded(false);
      },
    })
  ).current;

  const onSearchSelectSuggestion = (item) => {
    selectMapLocation(item.place_id, item.description);
  };

  const onSearchSelectMapPin = () => {
    setSearchModalVisible(false);
    openLocationPicker(false);
  };

  const openSearchForDestination = () => {
    setIsLocationPickup(false);
    setSearchModalVisible(true);
  };

  const currentService = availableServices.find((s) => s.id.toString() === selectedServiceId);

  const getServiceIconUrl = (service) => {
    if (!service || !service.icono) return null;
    return service.icono.startsWith("http")
      ? service.icono
      : `${BASE_URL.toString().replace("/api", "")}storage/${service.icono}`;
  };

  const getTrafficLevel = () => {
    if (!deliveryCoord || routeDuration === null || routeDurationInTraffic === null) return "ok";
    if (routeDuration <= 0) return "ok";
    const ratio = routeDurationInTraffic / routeDuration;
    if (ratio >= 1.5) return "bad";
    if (ratio >= 1.2) return "mid";
    return "ok";
  };

  const getETA = () => {
    if (!deliveryCoord || routeDurationInTraffic === null) return "~3 min";
    return `~${Math.max(2, routeDurationInTraffic)} min`;
  };

  const trafficLevel = getTrafficLevel();

  const onBidIncrease = () => setBidOffset((prev) => prev + 500);
  const onBidDecrease = () => setBidOffset((prev) => (displayPrice && parseInt(displayPrice.replace(/\./g, ""), 10) - 500 >= 2000 ? prev - 500 : prev));
  const onBidReset = () => setBidOffset(0);
  const onBidChipDelta = (delta) => {
    if (delta < 0) {
      const current = displayPrice ? parseInt(displayPrice.replace(/\./g, ""), 10) : 0;
      if (current - Math.abs(delta) >= 2000) setBidOffset((prev) => prev + delta);
    } else {
      setBidOffset((prev) => prev + delta);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* MAPA */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            region={mapRegion}
            showsUserLocation={false}
            showsMyLocationButton={false}
            loadingIndicatorColor="#FF5500"
            onRegionChangeComplete={(region) => {
              if (!ignoreNextRegionChange) setMapRegion(region);
              else setIgnoreNextRegionChange(false);
            }}
          >
            {pickupCoord && (
              <Marker coordinate={pickupCoord} anchor={{ x: 0.5, y: 0.5 }}>
                <Svg width={32} height={32} viewBox="0 0 30 30">
                  <Circle cx="15" cy="15" r="14" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                  <Path
                    d="M15 9.5 C16.6 9.5 17.7 10.6 17.7 12 C17.7 13.4 16.6 14.5 15 14.5 C13.4 14.5 12.3 13.4 12.3 12 C12.3 10.6 13.4 9.5 15 9.5 Z M15 15.2 C17.6 15.2 20 16.6 20 20 L10 20 C10 16.6 12.4 15.2 15 15.2 Z"
                    fill="#FFFFFF"
                  />
                </Svg>
              </Marker>
            )}
            {deliveryCoord && (
              <Marker coordinate={deliveryCoord} anchor={{ x: 0.5, y: 1 }} tracksViewChanges>
                <View style={styles.destMarkerBox}>
                  <Animated.View
                    style={{
                      transform: [
                        {
                          translateY: markerPulse.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0, -4, 0],
                          }),
                        },
                      ],
                    }}
                  >
                    <Svg width={30} height={30} viewBox="0 0 30 30">
                      <Path
                        d="M15 2 C21 2 26 7 26 13 C26 17 21 22 15 30 C9 22 4 17 4 13 C4 7 9 2 15 2 Z"
                        fill="#FF5500"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                      <SvgText
                        x="15"
                        y="17"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="12"
                        fontFamily="MontserratBold"
                      >B</SvgText>
                    </Svg>
                  </Animated.View>
                  <View style={styles.destMarkerShadow} />
                </View>
              </Marker>
            )}
            {routeCoords.length > 0 && (
              <>
                <Polyline coordinates={routeCoords} strokeWidth={6} strokeColor="rgba(255,85,0,0.15)" />
                <Polyline coordinates={routeCoords} strokeWidth={3} strokeColor="#FF5500" />
              </>
            )}
          </MapView>

          {/* Header flotante */}
          {!searchModalVisible && !pinMode && (
            <View style={styles.hdr}>
              <View style={styles.hdrRow}>
                <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.8}>
                  <Ionicons name="arrow-back" size={20} color="#0F172A" />
                </TouchableOpacity>
                <View style={styles.brandPill}>
                  <Image
                    source={require("../../assets/images/nuevo-icono.jpeg")}
                    style={styles.logoImg}
                    resizeMode="contain"
                  />
                  <Text style={styles.brandText}>
                    Car<Text style={{ color: "#FF5500" }}>By</Text>
                  </Text>
                </View>
                <View style={{ width: 44 }} />
              </View>
              <DestinationBar
                address={deliveryAddress}
                onPress={openSearchForDestination}
                onMapPress={() => openLocationPicker(false)}
              />
              {deliveryCoord && (
                <RouteInfoBar
                  distance={distanceInKm ? distanceInKm.toFixed(1) : "0.0"}
                  eta={routeDurationInTraffic !== null ? String(Math.max(2, routeDurationInTraffic)) : "3"}
                  trafficLevel={trafficLevel}
                />
              )}
            </View>
          )}

          {/* FAB de ubicacion */}
          {!pinMode && (
            <TouchableOpacity style={styles.fabLocate} onPress={centerMapOnUserLocation} activeOpacity={0.8}>
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#0F172A" />
            </TouchableOpacity>
          )}

          {/* Overlay modo pin */}
          {pinMode && (
            <>
              <View style={styles.pinBanner} pointerEvents="none">
                <View style={styles.pinBannerContent}>
                  <Ionicons name="location" size={18} color="#FF5500" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pinBannerTitle}>
                      {isLocationPickup ? "Seleccionando punto de recogida" : "Seleccionando destino"}
                    </Text>
                    <Text style={styles.pinBannerAddress} numberOfLines={1}>
                      {pinAddress || "Mueve el mapa para ajustar"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.pinCenterOverlay} pointerEvents="none">
                <View style={styles.pinHead}>
                  <View style={styles.pinIconWrapper}>
                    <Ionicons name="location" size={24} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.pinShadow} />
              </View>

              <View style={styles.pinBottomBar}>
                <TouchableOpacity style={styles.pinCancelBtn} onPress={cancelPinMode} activeOpacity={0.8}>
                  <Text style={styles.pinCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pinConfirmBtn} onPress={confirmPinLocation} activeOpacity={0.8}>
                  <Ionicons name="checkmark" size={20} color="#FFF" />
                  <Text style={styles.pinConfirmText}>Confirmar este punto</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* BOTTOM SHEET */}
        {!pinMode && !isCreatingRide && (
        <Animated.View
          style={[styles.sheet, { height: sheetAnim }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.dragHandleZone}>
            <Animated.View
              style={[
                styles.sheetTopBorder,
                {
                  width: dragHandleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [42, screenW * 0.3],
                  }),
                },
              ]}
            />
            <View style={styles.dragHandle} />
          </View>

          {!sheetExpanded ? (
            <PeekSummary
              service={currentService ? { name: currentService.nombre, iconUrl: getServiceIconUrl(currentService) } : null}
              price={displayPrice}
              onGo={handleContinue}
              onExpand={toggleSheet}
            />
          ) : (
            <>
              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <VehicleCarousel
                  services={availableServices}
                  selectedId={selectedServiceId}
                  onSelect={handleServiceSelect}
                  distanceKm={distanceInKm}
                />

                <BidPanel
                  displayPrice={displayPrice}
                  suggestedPrice={suggestedPrice}
                  onIncrease={onBidIncrease}
                  onDecrease={onBidDecrease}
                  onReset={onBidReset}
                  onChipDelta={onBidChipDelta}
                  priceAnim={priceAnim}
                  bidOffset={bidOffset}
                  hasPrice={!!displayPrice}
                />

                <NoteInput value={observations} onChangeText={setObservations} />

                <View style={styles.actionsRow}>
                  <PaymentSelector paymentMethod={paymentMethod} onPress={() => setPaymentModalVisible(true)} />
                  <TouchableOpacity
                    style={[
                      styles.goBtn,
                      (!pickupAddress || !deliveryAddress || !selectedServiceId || !paymentMethod || !displayPrice || isCalculatingPrice || isCreatingRide) &&
                        styles.goBtnDisabled,
                    ]}
                    disabled={!pickupAddress || !deliveryAddress || !selectedServiceId || !paymentMethod || !displayPrice || isCalculatingPrice || isCreatingRide}
                    onPress={handleContinue}
                    activeOpacity={0.8}
                  >
                    <Animated.View
                      style={[
                        styles.shimmer,
                        { transform: [{ translateX: shimmerAnim }] },
                      ]}
                      pointerEvents="none"
                    >
                      <LinearGradient
                        colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.4)", "rgba(255,255,255,0)"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.shimmerGradient}
                      />
                    </Animated.View>
                    {isCreatingRide ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.goBtnText}>
                        Ofrecer ${displayPrice || "--"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          )}
        </Animated.View>
        )}

        {/* Modal de busqueda */}
        <SearchModal
          visible={searchModalVisible}
          onClose={() => setSearchModalVisible(false)}
          origin={pickupAddress || "Mi ubicacion actual"}
          destination={mapSearchQuery}
          onDestinationChange={searchMapLocation}
          onSelectSuggestion={onSearchSelectSuggestion}
          onSelectMapPin={onSearchSelectMapPin}
          suggestions={mapSearchResults}
          isSearching={isSearchingMap}
          recentLocations={recentLocations}
        />

        {/* Modal de metodo de pago */}
        <Modal
          isVisible={paymentModalVisible}
          onBackdropPress={() => setPaymentModalVisible(false)}
          style={styles.paymentModal}
          backdropOpacity={0.4}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          animationInTiming={400}
          animationOutTiming={300}
          useNativeDriverForBackdrop
        >
          <View style={styles.paymentSheet}>
            <View style={styles.paymentHandle} />
            <Text style={styles.paymentTitle}>Metodo de pago</Text>
            <View style={styles.paymentOptions}>
              {!loadingUserSettings && userPaymentSettings && userPaymentSettings.puede_pagar_efectivo && (
                <TouchableOpacity
                  style={[styles.paymentOption, paymentMethod === "efectivo" && styles.paymentOptionActive]}
                  onPress={() => { handlePaymentMethodSelect("efectivo"); setPaymentModalVisible(false); }}
                >
                  <View style={styles.paymentOptionIcon}>
                    <MaterialCommunityIcons name="cash" size={20} color="#0F172A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentOptionText}>Efectivo</Text>
                    <Text style={styles.paymentOptionSub}>Paga al recibir</Text>
                  </View>
                  {paymentMethod === "efectivo" && <Ionicons name="checkmark-circle" size={22} color="#FF5500" />}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.paymentOption, paymentMethod === "nequi" && styles.paymentOptionActive]}
                onPress={() => { handlePaymentMethodSelect("nequi"); setPaymentModalVisible(false); }}
              >
                <View style={styles.paymentOptionIcon}>
                  <MaterialCommunityIcons name="cellphone" size={20} color="#0F172A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentOptionText}>Nequi</Text>
                  <Text style={styles.paymentOptionSub}>Pago por Nequi</Text>
                </View>
                {paymentMethod === "nequi" && <Ionicons name="checkmark-circle" size={22} color="#FF5500" />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentOption, paymentMethod === "bancolombia" && styles.paymentOptionActive]}
                onPress={() => { handlePaymentMethodSelect("bancolombia"); setPaymentModalVisible(false); }}
              >
                <View style={styles.paymentOptionIcon}>
                  <MaterialCommunityIcons name="bank" size={20} color="#0F172A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentOptionText}>Bancolombia</Text>
                  <Text style={styles.paymentOptionSub}>Transferencia Bancolombia</Text>
                </View>
                {paymentMethod === "bancolombia" && <Ionicons name="checkmark-circle" size={22} color="#FF5500" />}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal de exito */}
        <AlertaModal
          visible={isModalVisible}
          tipo="success"
          mensaje="Tu solicitud ha sido enviada. Un conductor la tomara pronto."
          onCerrar={() => {
            setModalVisible(false);
            if (createdCarreraId) {
              navigation.navigate("DetalleCarrera", { tripId: createdCarreraId, carreraId: createdCarreraId });
            } else {
              navigation.goBack();
            }
          }}
          onPrimary={() => {
            setModalVisible(false);
            if (createdCarreraId) {
              navigation.navigate("DetalleCarrera", { tripId: createdCarreraId, carreraId: createdCarreraId });
            } else {
              navigation.goBack();
              setTimeout(() => navigation.getParent()?.navigate("Pedidos"), 200);
            }
          }}
          primaryLabel={createdCarreraId ? "Ver mi arrendamiento" : "Ver mis viajes"}
        />

        {/* Modal de error */}
        <AlertaModal
          visible={isErrorModalVisible}
          mensaje="No se pudo crear el arrendamiento. Intenta de nuevo."
          onCerrar={() => setErrorModalVisible(false)}
        />

        {/* Modal de alertas */}
        <AlertaModal
          visible={alertVisible}
          tipo={alertData.type}
          mensaje={alertData.message}
          onCerrar={() => setAlertVisible(false)}
          onPrimary={alertData.onPrimary}
          primaryLabel={alertData.primaryLabel}
        />

        {/* Loading ubicacion */}
        {isLoadingCurrentLocation && (
          <View style={[styles.globalLoadingContainer, { backgroundColor: "rgba(255,255,255,0.92)" }]}>
            <View style={styles.globalLoadingContent}>
              <ActivityIndicator size="large" color="#FF5500" />
              <Text style={styles.globalLoadingText}>Ubicandote...</Text>
              <Text style={styles.globalLoadingSub}>Estamos buscando tu ubicacion actual</Text>
            </View>
          </View>
        )}

        {/* Loading global creando carrera */}
        {isCreatingRide && (
          <TouchableOpacity
            style={styles.globalLoadingContainer}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={styles.creatingRideContent}>
              {!showGoToRide ? (
                <>
                  <View style={styles.creatingRideRoad}>
                    <Animated.View
                      style={[
                        styles.creatingRideVehicle,
                        {
                          transform: [
                            { translateX: creatingMove.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] }) },
                            { scale: creatingPulse },
                          ],
                        },
                      ]}
                    >
                      <Ionicons name="car-sport" size={48} color="#FF5500" />
                    </Animated.View>
                  </View>
                  <Text style={styles.creatingRideTitle}>Se está creando tu arrendamiento</Text>
                  <Text style={styles.creatingRideSub}>Buscando el mejor conductor para ti...</Text>
                </>
              ) : (
                <>
                  <View style={styles.creatingRideSuccessIcon}>
                    <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                  </View>
                  <Text style={styles.creatingRideTitle}>¡Arrendamiento creado!</Text>
                  <Text style={styles.creatingRideSub}>Tu solicitud fue enviada exitosamente.</Text>
                  <TouchableOpacity style={styles.goToRideBtn} onPress={handleGoToRide} activeOpacity={0.8}>
                    <Text style={styles.goToRideBtnText}>Ir a mi arrendamiento</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F1F5F9" },
  flex: { flex: 1 },
  mapContainer: { flex: 1, backgroundColor: "#E2E8F0" },
  map: { ...StyleSheet.absoluteFillObject },

  // Header flotante
  hdr: {
    position: "absolute",
    top: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 52,
    left: 12,
    right: 12,
    zIndex: 1000,
    gap: 8,
  },
  hdrRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  logoImg: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  brandText: {
    fontSize: 19,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    letterSpacing: -0.3,
  },

  // FAB
  fabLocate: {
    position: "absolute",
    right: 14,
    top: 220,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1.5,
    borderColor: "rgba(228,228,231,0.85)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 8,
    zIndex: 900,
  },

  destMarkerBox: {
    width: 38,
    height: 42,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  destMarkerShadow: {
    width: 10,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,85,0,0.35)",
    marginTop: 2,
  },

  // Pin overlay
  pinBanner: {
    position: "absolute",
    top: Platform.OS === "android" ? 70 : 50,
    left: 16,
    right: 16,
    zIndex: 50,
    alignItems: "center",
  },
  pinBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#FF5500",
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
    maxWidth: "100%",
  },
  pinBannerTitle: {
    fontSize: 12,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  pinBannerAddress: {
    fontSize: 12,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 2,
  },
  pinCenterOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 30,
    marginTop: -40,
  },
  pinHead: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FF5500",
    borderTopLeftRadius: 23,
    borderTopRightRadius: 23,
    borderBottomLeftRadius: 4,
    transform: [{ rotate: "-45deg" }],
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  pinIconWrapper: {
    transform: [{ rotate: "45deg" }],
  },
  pinShadow: {
    width: 14,
    height: 5,
    borderRadius: 7,
    backgroundColor: "rgba(15,23,42,0.25)",
    marginTop: 6,
  },
  pinBottomBar: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 10,
    zIndex: 30,
  },
  pinCancelBtn: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  pinCancelText: { fontSize: 14, fontFamily: "MontserratBold",
    fontWeight: "bold", color: "#0F172A" },
  pinConfirmBtn: {
    flex: 2,
    backgroundColor: "#FF5500",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  pinConfirmText: { fontSize: 14, fontFamily: "MontserratBold",
    fontWeight: "bold", color: "#FFF" },

  // Bottom sheet
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderBottomWidth: 0,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 20,
    zIndex: 800,
  },
  dragHandleZone: {
    width: "100%",
    paddingTop: 8,
    paddingBottom: 10,
    alignItems: "center",
    gap: 6,
  },
  sheetTopBorder: {
    height: 2,
    borderRadius: 3,
    marginTop: -10,
    backgroundColor: "#FF5500",
  },
  dragHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FF5500",
  },
  sheetScroll: { flex: 1 },
  sheetContent: { paddingHorizontal: 16, paddingBottom: 24 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sheetHeaderAccent: {
    width: 4,
    height: 18,
    borderRadius: 4,
    backgroundColor: "#FF5500",
  },
  sheetTitle: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },

  // Acciones
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  goBtn: {
    flex: 1,
    height: 48,
    borderRadius: 18,
    backgroundColor: "#FF5500",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
    overflow: "hidden",
  },
  goBtnDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    width: screenW,
    height: "100%",
  },
  shimmerGradient: {
    width: 80,
    height: "100%",
  },
  goBtnText: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FFF",
    letterSpacing: 0.3,
  },

  // Payment modal
  paymentModal: { justifyContent: "flex-end", margin: 0 },
  paymentSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  paymentHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 24,
  },
  paymentTitle: {
    fontSize: 24,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 20,
  },
  paymentOptions: { gap: 12 },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 12,
  },
  paymentOptionActive: {
    borderColor: "rgba(255,85,0,0.4)",
    backgroundColor: "rgba(255,85,0,0.04)",
  },
  paymentOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  paymentOptionText: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  paymentOptionSub: {
    fontSize: 12,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#64748B",
    marginTop: 2,
  },

  // Loading
  globalLoadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
  },
  globalLoadingContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 60,
    elevation: 20,
  },
  globalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  globalLoadingSub: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Montserrat",
    color: "#64748B",
    textAlign: "center",
  },
  creatingRideContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 32,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.22,
    shadowRadius: 70,
    elevation: 24,
    minWidth: 260,
  },
  creatingRideRoad: {
    width: 160,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "#E2E8F0",
    marginBottom: 20,
  },
  creatingRideVehicle: {
    position: "absolute",
  },
  creatingRideTitle: {
    fontSize: 17,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    textAlign: "center",
  },
  creatingRideSub: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#64748B",
    textAlign: "center",
  },
  creatingRideSuccessIcon: {
    marginBottom: 16,
  },
  goToRideBtn: {
    marginTop: 20,
    backgroundColor: "#FF5500",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  goToRideBtnText: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});
