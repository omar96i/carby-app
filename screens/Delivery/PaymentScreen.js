import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  Linking,
  AppState,
  Animated,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import AlertaModal from "../../components/ErrorModal";
import {
  Montserrat_300Light,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { GOOGLE_MAPS_API_KEY } from "../../constants/Keys";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import MapView, { Marker } from "react-native-maps";
const { height, width } = Dimensions.get("window");
const screenH = height;
const COLLAPSED_SHEET_H = 95;
const EXPANDED_SHEET_H = Math.round(screenH * 0.5);
import * as Location from "expo-location";
const PaymentScreen = () => {
  // Estados generales
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderId, setOrderId] = useState(null);

  // Estados para dirección y búsqueda
  const [address, setAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressInputRef = useRef(null);
  const scrollViewRef = useRef(null);
  const [addressPosition, setAddressPosition] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [showPendingPaymentModal, setShowPendingPaymentModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState(null); // Estados para métodos de pago
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const [paymentMethods, setPaymentMethods] = useState(null);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [userPaymentSettings, setUserPaymentSettings] = useState(null);

  // Estados para cálculo de envío
  const [establishmentLocation, setEstablishmentLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryService, setDeliveryService] = useState(null);
  const [loadingDeliveryFee, setLoadingDeliveryFee] = useState(false);
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState("day"); // 'day', 'night', 'holiday'

  // Estados para QR y evidencia
  const [showQrEvidenceModal, setShowQrEvidenceModal] = useState(false);
  const [qrOrderId, setQrOrderId] = useState(null);
  const [evidenceImage, setEvidenceImage] = useState(null);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [evidenceUploaded, setEvidenceUploaded] = useState(false);
  // Añade este estado en la sección de declaración de estados del componente
  const [lastMapPress, setLastMapPress] = useState(0);
  const [isLocating, setIsLocating] = useState(true);
  const navigation = useNavigation();

  // Estados para bottom sheet y modo pin
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [pinMode, setPinMode] = useState(false);
  const [pinAddress, setPinAddress] = useState("");
  const sheetAnim = useRef(new Animated.Value(COLLAPSED_SHEET_H)).current;
  const compactOpacity = useRef(new Animated.Value(1)).current;
  const expandedOpacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
    return () => navigation.getParent()?.setOptions({ tabBarStyle: { backgroundColor: '#FFF', height: 56, borderTopWidth: 1, borderTopColor: '#F0F0F0', display: 'flex' } });
  }, [navigation]));
  const route = useRoute();
  const [ignoreNextRegionChange, setIgnoreNextRegionChange] = useState(false);

  const searchTimeout = useRef(null);
  const userLocationRef = useRef(null);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ title: "", message: "", type: "info", onPrimary: null, primaryLabel: null });
  const showAlert = (title, message, type, onPrimary, primaryLabel) => {
    setAlertData({ title, message, type: type || (title === "Éxito" ? "success" : "error"), onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  const [mapRegion, setMapRegion] = useState({
    latitude: 4.60971,
    longitude: -74.08175,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [isSearchingMap, setIsSearchingMap] = useState(false);

  const { onPaymentComplete } = route.params || {};
  useEffect(() => {
    let isMounted = true;

    const locateUser = async () => {
      if (!isMounted) return;
      setIsLocating(true);

      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setIsLocating(false);
          showAlert("Permiso denegado", "No se puede acceder a la ubicación");
          return;
        }

        // 1. Última ubicación conocida (rápida)
        let lastLocation = null;
        try {
          lastLocation = await Location.getLastKnownPositionAsync({ maxAge: 120000 });
        } catch (e) {
          console.log("[PaymentScreen] No hay última ubicación conocida");
        }

        if (lastLocation && isMounted) {
          const { latitude, longitude } = lastLocation.coords;
          const region = {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          setMapRegion(region);
          setSelectedLocation({ latitude, longitude });
          setUserLocation({ latitude, longitude });
          userLocationRef.current = { latitude, longitude };
          if (mapRef.current) {
            mapRef.current.animateToRegion(region, 800);
          }
        }

        // 2. Ubicación precisa actual
        let currentLocation = null;
        try {
          currentLocation = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout ubicación")), 10000)),
          ]);
        } catch (e) {
          console.log("[PaymentScreen] Timeout o error ubicación precisa:", e.message);
        }

        const locationToUse = currentLocation || lastLocation;

        if (!locationToUse) {
          setIsLocating(false);
          showAlert("Error", "No se pudo obtener tu ubicación. Verifica que el GPS esté activado.");
          return;
        }

        if (isMounted) {
          const { latitude, longitude } = locationToUse.coords;
          const region = {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };

          setMapRegion(region);
          setUserLocation({ latitude, longitude });
          userLocationRef.current = { latitude, longitude };
          setSelectedLocation({ latitude, longitude });
          setIgnoreNextRegionChange(true);

          // Dar tiempo a que el mapa monte antes de animar
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.animateToRegion(region, 1000);
            }
          }, 300);

          resolveAddressFromCoords(latitude, longitude);
        }
      } catch (err) {
        console.error("[PaymentScreen] Error obteniendo ubicación automática:", err);
        showAlert("Error", "No se pudo obtener tu ubicación actual.");
      } finally {
        if (isMounted) setIsLocating(false);
      }
    };

    locateUser();
    return () => { isMounted = false; };
  }, []);

  const mapRef = useRef(null);


  const handleContinue = () => {
    if (onPaymentComplete) {
      onPaymentComplete();
      console.log("Carrito limpiado con éxito");
    }
    setShowSuccessModal(false);
    navigation.goBack();
    setTimeout(() => navigation.getParent()?.navigate("Pedidos"), 100);
  };

  const saveRecentLocation = async (location) => {
    try {
      const stored = await AsyncStorage.getItem("recent_locations");
      let locations = stored ? JSON.parse(stored) : [];

      // Evitar duplicados
      locations = locations.filter((l) => l.place_id !== location.place_id);

      // Insertar al principio
      locations.unshift(location);

      // Limitar a 3
      locations = locations.slice(0, 5);
      console.log("viendo que datos trae esta localizacion", locations)

      await AsyncStorage.setItem("recent_locations", JSON.stringify(locations));
    } catch (error) {
      console.error("Error guardando ubicación reciente:", error);
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

  // Función para buscar ubicaciones en el mapa
  const searchMapLocation = async (query) => {
    setMapSearchQuery(query);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }


    if (query.length > 3) {
      setIsSearchingMap(true);

      searchTimeout.current = setTimeout(async () => {
        try {
          const encodedQuery = encodeURIComponent(query);

          // Obtener ubicación actual del usuario si está disponible
          const lat = userLocationRef.current?.latitude;
          const lng = userLocationRef.current?.longitude;

          const locationBias =
            lat && lng ? `&location=${lat},${lng}&radius=50000` : `&location=4.60971,-74.08175&radius=50000`;

          const countryCode = "CO";

         const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedQuery}&components=country:${countryCode}${locationBias}&key=${GOOGLE_MAPS_API_KEY}`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.predictions) {
            setMapSearchResults(data.predictions);
          }
        } catch (error) {
          console.error("Error buscando ubicaciones en el mapa:", error);
        } finally {
          setIsSearchingMap(false);
        }
      }, 300);
    } else {
      // No mostrar historial: limpiar resultados si el query es corto o vacío
      setMapSearchResults([]);
    }
  };


  const centerMapOnUserLocation = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setIsLocating(false);
        showAlert("Permiso denegado", "No se pudo acceder a tu ubicación.");
        return;
      }

      let lastLocation = null;
      try {
        lastLocation = await Location.getLastKnownPositionAsync({ maxAge: 120000 });
      } catch (e) {
        console.log("[PaymentScreen] No hay última ubicación conocida");
      }

      if (lastLocation) {
        const region = {
          latitude: lastLocation.coords.latitude,
          longitude: lastLocation.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setMapRegion(region);
        setSelectedLocation({ latitude: region.latitude, longitude: region.longitude });
        setUserLocation({ latitude: region.latitude, longitude: region.longitude });
        userLocationRef.current = { latitude: region.latitude, longitude: region.longitude };
        setTimeout(() => mapRef.current?.animateToRegion(region, 800), 100);
      }

      let currentLocation = null;
      try {
        currentLocation = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout ubicación")), 10000)),
        ]);
      } catch (e) {
        console.log("[PaymentScreen] Timeout o error ubicación precisa:", e.message);
      }

      const locationToUse = currentLocation || lastLocation;
      if (!locationToUse) {
        setIsLocating(false);
        showAlert("Error", "No se pudo obtener tu ubicación. Verifica que el GPS esté activado.");
        return;
      }

      const { latitude, longitude } = locationToUse.coords;
      const region = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setMapRegion(region);
      setSelectedLocation({ latitude, longitude });
      setUserLocation({ latitude, longitude });
      userLocationRef.current = { latitude, longitude };
      setIgnoreNextRegionChange(true);

      setTimeout(() => {
        if (mapRef.current) mapRef.current.animateToRegion(region, 1000);
      }, 200);

      resolveAddressFromCoords(latitude, longitude);
    } catch (error) {
      console.error("[PaymentScreen] Error general en ubicación:", error);
      showAlert("Error", "No se pudo obtener tu ubicación actual.");
    } finally {
      setIsLocating(false);
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
        console.log(data.result)
        // Si es un Plus Code, lo ignoramos y usamos la descripción bonita
        if (/^[\w\d]+\+\w+/.test(formattedAddress)) {
          formattedAddress = description || "";
        }

        const newRegion = {
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setIgnoreNextRegionChange(true);
        mapRef.current?.animateToRegion(newRegion, 1000);

        setSelectedLocation({
          latitude: location.lat,
          longitude: location.lng,
          address: formattedAddress,
        });

        await saveRecentLocation({
          place_id: placeId,
          description: formattedAddress,
        });

        setMapSearchResults([]);
        setMapSearchQuery("");
        setSheetExpanded(true);
      }
    } catch (error) {
      console.error("Error obteniendo detalles del lugar:", error);
    }
  };

  // Geo-resolve timeout ref for debouncing
  const geoTimeout = useRef(null);

  // Resuelve dirección desde coordenadas; el cálculo de distancia/envío lo hacen los useEffect
  const resolveAddressFromCoords = useCallback((lat, lng) => {
    if (geoTimeout.current) clearTimeout(geoTimeout.current);

    geoTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();

        if (data.status === "OK" && data.results.length > 0) {
          setAddress(data.results[0].formatted_address);
        } else {
          setAddress(`${lat}, ${lng}`);
        }

        setUserLocation({ latitude: lat, longitude: lng });
      } catch (error) {
        console.error("Error resolviendo dirección:", error);
      }
    }, 400);
  }, []);
  // Datos del carrito
  const {
    products = [],
    totalAmount = 0,
    totalQuantity = 0,
    establishmentId,
    establishmentName = "",
  } = route.params || {};

  // Calcular total final
  const finalTotal = totalAmount + deliveryFee;

  // Cargar fuentes (no bloqueante)
  const [fontsLoaded] = useFonts({
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });

  // Determinar hora del día al inicializar (optimizado)
  useEffect(() => {
    const now = new Date();
    const hours = now.getHours();
    const dayOfWeek = now.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      setTimeOfDay("holiday");
    } else if (hours >= 20 || hours < 6) {
      setTimeOfDay("night");
    } else {
      setTimeOfDay("day");
    }
  }, []);

  // Monitorear cambios en el estado de la app para detectar retorno del pago
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      // Detecta cuando la app pasa a segundo plano y luego vuelve a primer plano
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        paymentInProgress
      ) {
        // Si estábamos en proceso de pago y volvimos a la app, cerrar el modal
        setShowPendingPaymentModal(false);
        setPaymentInProgress(false);

        // Verificar estado del pedido si tenemos un pendingOrderId
        if (pendingOrderId) {
          checkOrderStatus(pendingOrderId);
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [paymentInProgress, pendingOrderId]);

  // Optimizar carga inicial - Cargar datos esenciales primero
  useEffect(() => {
    const loadEssentialData = async () => {
      if (!establishmentId) {
        setLoadingPaymentMethods(false);
        return;
      }

      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          setLoadingPaymentMethods(false);
          return;
        }

        // Cargar solo métodos de pago primero (lo más importante)
        const paymentResponse = await fetch(`${BASE_URL}user-tipo-pago/getByUser/${establishmentId}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          if (paymentData.status && paymentData.data) {
            setPaymentMethods(paymentData.data);

            // Si QR está habilitado, establecer la URL de la imagen QR
            if (paymentData.data.qr_estado === 1 && paymentData.data.qr_file) {
              setQrImageUrl(getImageUrl(paymentData.data.qr_file));
            }
          }
        }
      } catch (error) {
        console.error("Error cargando métodos de pago:", error);
      } finally {
        setLoadingPaymentMethods(false);
      }
    };

    loadEssentialData();
  }, [establishmentId]);

  // Cargar datos secundarios de forma asíncrona
  useEffect(() => {
    const loadSecondaryData = async () => {
      if (!establishmentId) return;

      try {
        const token = await AsyncStorage.getItem("userToken");
        const userData = await AsyncStorage.getItem("userData");

        if (!token || !userData) return;

        const userId = JSON.parse(userData).id;

        // Cargar datos secundarios en paralelo (no bloquea la UI)
        const [userResponse, locationResponse, serviceResponse] = await Promise.allSettled([
          // Configuración del usuario
          fetch(`${BASE_URL}usuario/${userId}`, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          // Ubicación del establecimiento
          fetch(`${BASE_URL}localizacion/${establishmentId}`, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          // Servicio de delivery del comercio
          fetch(`${BASE_URL}services/comercio`, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        // Procesar respuesta del usuario
        if (userResponse.status === "fulfilled" && userResponse.value.ok) {
          try {
            const userDataResponse = await userResponse.value.json();
            if (userDataResponse.status && userDataResponse.data) {
              setUserPaymentSettings(userDataResponse.data);
            }
          } catch (error) {
            console.error("Error parseando datos de usuario:", error);
          }
        }

        // Procesar respuesta de ubicación del establecimiento
        if (locationResponse.status === "fulfilled" && locationResponse.value.ok) {
          try {
            const locationData = await locationResponse.value.json();
            if (locationData.status && locationData.data) {
              const location = {
                latitude: parseFloat(locationData.data.latitud),
                longitude: parseFloat(locationData.data.longitud),
              };
              setEstablishmentLocation(location);
            }
          } catch (error) {
            console.error("Error parseando ubicación del establecimiento:", error);
          }
        }

        // Procesar respuesta de servicio de envío
        if (serviceResponse.status === "fulfilled" && serviceResponse.value.ok) {
          try {
            const serviceData = await serviceResponse.value.json();
            console.log("[PaymentScreen] SERVICE COMERCIO ->", JSON.stringify(serviceData));
            if (serviceData.status && serviceData.service) {
              setDeliveryService(serviceData.service);
            }
          } catch (error) {
            console.error("Error parseando servicio de envío:", error);
          }
        }
      } catch (error) {
        console.error("Error cargando datos secundarios:", error);
      }
    };

    // Solo cargar datos secundarios después de un breve delay
    const timeoutId = setTimeout(loadSecondaryData, 100);
    return () => clearTimeout(timeoutId);
  }, [establishmentId]);

  // Función para buscar direcciones con Google Places API (optimizada con debouncing)
  const searchAddresses = useCallback(
    debounce(async (text) => {
      setAddress(text);

      if (text.length > 3) {
        setIsSearching(true);
        setShowSuggestions(true);

        // Optimizado: medir posición con pequeño delay para precisión
        if (addressInputRef.current) {
          setTimeout(() => {
            addressInputRef.current.measureInWindow((x, y, width, height) => {
              setAddressPosition({
                x,
                y: y + height + 60,
                width,
                height,
              });
            });
          }, 50); // Reducido el delay
        }

        try {
          // Timeout reducido para respuesta más rápida
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos

          const urls = [
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${text}&types=address&components=country:CO&key=${GOOGLE_MAPS_API_KEY}`
          ];

          const responses = await Promise.all(urls.map(url => fetch(url)));
          const dataResults = await Promise.all(responses.map(res => res.json()));

          const resultados = dataResults.flatMap(d => d.predictions || []);
          setAddressSuggestions(resultados);
        } catch (error) {
          if (error.name === "AbortError") {
            console.log("Búsqueda de direcciones cancelada por timeout");
          } else {
            console.error("Error fetching address suggestions:", error);
          }
        } finally {
          setIsSearching(false);
        }
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    }, 0), // Debounce de 300ms
    [addressInputRef]
  );

  const searchAddress = async (text) => {
    setAddress(text);

    if (text.length > 3) {
      setIsSearching(true);
      setShowSuggestions(true);

      // Medir posición del input (opcional)
      if (addressInputRef.current) {
        setTimeout(() => {
          addressInputRef.current.measureInWindow((x, y, width, height) => {
            setAddressPosition({
              x,
              y: y + height + 60,
              width,
              height,
            });
          });
        }, 50);
      }

      try {
        const encodedQuery = encodeURIComponent(text.trim());
        const locationBias = `&location=4.60971,-74.08175&radius=50000`;

        const countryCode = "CO";

        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedQuery}&components=country:${countryCode}${locationBias}&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        console.log("estas son las direcciones", data)

        const predictions = data.predictions || [];

        // Filtro: eliminar descripciones vacías y Plus Codes
        const filtered = predictions.filter(item => {
          const desc = item.description || "";
          return desc.trim() !== "" && !/^[\w\d]+\+\w+/.test(desc);
        });

        setAddressSuggestions(filtered);
      } catch (error) {
        console.error("Error buscando dirección:", error);
      } finally {
        setIsSearching(false);
      }
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };
  // Función helper para debouncing
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Función para obtener coordenadas de dirección
  const getCoordinatesFromAddress = async (address) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng,
        };
      }

      throw new Error("No se encontraron coordenadas para esta dirección");
    } catch (error) {
      console.error("Error obteniendo coordenadas:", error);
      return null;
    }
  };

  // Función para calcular distancia entre dos puntos (fórmula de Haversine)
  const calculateDistance = (point1, point2) => {
    const toRad = (value) => (value * Math.PI) / 180;

    const R = 6371; // Radio de la Tierra en km
    const dLat = toRad(point2.latitude - point1.latitude);
    const dLon = toRad(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(point1.latitude)) *
      Math.cos(toRad(point2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distancia en km

    return distance;
  };

  const calculateDistanceGoogle = async (point1, point2) => {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${point1.latitude},${point1.longitude}&destination=${point2.latitude},${point2.longitude}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error(`Google Directions API error: ${data.status}`);
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    // leg.distance.value está en METROS
    return leg.distance.value / 1000; // retorno en KM
  };

  // Función para calcular valor de envío según el servicio de comercio
  const calculateDeliveryFee = (distance) => {
    if (!deliveryService) {
      console.log("[PaymentScreen] No hay servicio de comercio, usando tarifa por defecto");
      return 0; // Sin servicio no hay envío calculado aún
    }

    const baseFee = parseFloat(deliveryService.precio_base || 0);
    const pricePerKm = parseFloat(deliveryService.precio_km || 0);
    const additionalFee = parseFloat(deliveryService.precio_adicional || 0);

    // Calcular precio: base + (distancia × precio_km) + adicional
    let fee = baseFee + (distance * pricePerKm) + additionalFee;

    console.log("[PaymentScreen] DELIVERY FEE -> base:", baseFee, "km:", distance, "pricePerKm:", pricePerKm, "adicional:", additionalFee, "total:", fee);

    // Redondear a 2 decimales
    return Math.max(0, Math.round(fee * 100) / 100);
  };

  // Calcular distancia por ruta de Google cuando ambas ubicaciones estén listas
  useEffect(() => {
    if (!selectedLocation || !establishmentLocation) {
      console.log("[PaymentScreen] DISTANCE SKIP -> selectedLocation:", !!selectedLocation, "establishmentLocation:", !!establishmentLocation);
      return;
    }

    const calcDistance = async () => {
      console.log("[PaymentScreen] CALCULANDO DISTANCIA -> origen:", establishmentLocation, "destino:", selectedLocation);
      try {
        let km = await calculateDistanceGoogle(establishmentLocation, selectedLocation);
        console.log("[PaymentScreen] DISTANCIA GOOGLE ->", km);
        setDistance(km);
      } catch (err) {
        console.log("[PaymentScreen] Google Directions falló:", err.message);
        const km = calculateDistance(establishmentLocation, selectedLocation);
        console.log("[PaymentScreen] DISTANCIA HAVERSINE ->", km);
        setDistance(km);
      }
    };

    calcDistance();
  }, [selectedLocation, establishmentLocation]);

  // Recalcular envío cuando cambie el servicio o la distancia
  useEffect(() => {
    console.log("[PaymentScreen] FEE EFFECT TRIGGER -> deliveryService:", !!deliveryService, "distance:", distance);
    if (deliveryService) {
      const fee = calculateDeliveryFee(distance);
      setDeliveryFee(fee);
      setCalculatedDeliveryFee(true);
      console.log("[PaymentScreen] Recalculado envío:", fee);
    }
  }, [deliveryService, distance]);

  // Seleccionar dirección de sugerencias
  const selectAddress = async (suggestion) => {
    setAddress(suggestion.description);
    setShowSuggestions(false);
    setLoadingDeliveryFee(true);

    try {
      // Obtener coordenadas
      const coordinates = await getCoordinatesFromAddress(
        suggestion.description
      );

      if (coordinates && establishmentLocation) {
        setUserLocation(coordinates);

        // Calcular distancia
        const calculatedDistance = calculateDistance(
          establishmentLocation,
          coordinates
        );
        setDistance(calculatedDistance);

        // Calcular valor de envío
        const fee = calculateDeliveryFee(calculatedDistance);
        setDeliveryFee(fee);
        setCalculatedDeliveryFee(true);
      } else {
        showAlert("Error de ubicación", "No pudimos calcular la distancia para esta dirección. Se aplicará una tarifa estándar.");
        setDeliveryFee(10); // Valor predeterminado
      }
    } catch (error) {
      console.error("Error al calcular valor de envío:", error);
      setDeliveryFee(10); // Valor predeterminado
    } finally {
      setLoadingDeliveryFee(false);
    }
  };

  // Obtener URL de imagen
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${BASE_URL.toString().replace("/api", "")}/storage/${path}`;
  };

  // Seleccionar método de pago
  const selectPaymentMethod = (method) => {
    setSelectedPaymentMethod(method);
  };

  // Función para seleccionar imagen de la galería
  const pickImage = async () => {
    // Solicitar permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      showAlert("Permisos requeridos", "Necesitamos acceso a tu galería para cargar la evidencia de pago.");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Comprimir la imagen para reducir tamaño
        const manipResult = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1000 } }],
          { format: SaveFormat.JPEG, compress: 0.7 }
        );

        setEvidenceImage(manipResult.uri);
      }
    } catch (error) {
      console.error("Error al seleccionar imagen:", error);
      showAlert("Error", "No se pudo seleccionar la imagen.");
    }
  };

  // Crear pedido en API
  const createOrder = async (paymentMethod) => {
    if (isCreatingOrder) return;

    setIsCreatingOrder(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      // Obtener ID de usuario
      const userData = await AsyncStorage.getItem("userData");
      const userId = userData ? JSON.parse(userData).id : null;

      if (!userId) {
        throw new Error("No se encontró ID de usuario");
      }

      // Datos de ubicación en formato correcto
      const locationData = {
        start_latitud: establishmentLocation?.latitude || 0,
        start_longitud: establishmentLocation?.longitude || 0,
        start_lugar: establishmentName || "Establecimiento",
        end_latitud: userLocation?.latitude || 0,
        end_longitud: userLocation?.longitude || 0,
        end_lugar: address || "Dirección de destino",
      };

      // Items del pedido
      const orderItems = products.map((item) => ({
        producto_id: item.productId,
        cantidad: item.quantity,
      }));

      // Datos del pedido
      const orderData = {
        user_id: userId,
        comercio_id: establishmentId,
        estado: "pendiente",
        metodo_pago: paymentMethod,
        estado_pago: "pendiente",
        datos_generales: JSON.stringify(locationData),
        costo_total: totalAmount,
        costo_envio: deliveryFee,
        tipo_viaje: "rider.moto",
        items: orderItems,
      };

      console.log("Datos del pedido:", JSON.stringify(orderData));

      // Enviar petición para crear pedido
      const response = await fetch(`${BASE_URL}pedidos`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      // Mejorar el manejo de errores para ver más detalles
      const responseText = await response.text();
      console.log("Respuesta completa del servidor:", responseText);

      if (!response.ok) {
        if (response.status === 409) {
          try {
            const errorData = JSON.parse(responseText);
            const msg = errorData?.error || "Conflicto detectado.";
            throw new Error(msg);
          } catch (e) {
            throw new Error("Ya tienes un pedido en proceso.");
          }
        }
        console.error("Error creando pedido. Estado:", response.status);
        console.error("Respuesta:", responseText);
        throw new Error(`Error HTTP! Estado: ${response.status}`);
      }

      // Intentar parsear la respuesta solo si hay contenido
      let data;
      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error("Error al parsear respuesta JSON:", e);
          throw new Error("Error al parsear respuesta del servidor");
        }
      }

      // Verificar si la respuesta tiene el formato esperado
      if (data && data.pedido) {
        // CORRECCIÓN: El ID está en data.pedido.id
        const newOrderId = data.pedido.id || null;

        if (!newOrderId) {
          throw new Error("No se pudo obtener el ID del pedido creado");
        }

        console.log("Pedido creado con ID:", newOrderId);
        console.log("Respuesta completa del pedido:", data);

        // Enviar adicionales pasando el objeto pedido completo
        await sendAdicionales(newOrderId, data.pedido, token);

        // Limpiar carrito después de crear el pedido
        try {
          await AsyncStorage.removeItem(`cart_${establishmentId}`);
        } catch (error) {
          console.log("Error limpiando carrito:", error);
        }

        // Manejar según el método de pago
        if (paymentMethod === "mercadopago") {
          // Construir URL de pago
          const paymentUrl = `https://back.carbycol.com/proceso-pago/pedido?user_id=${userId}&pedido_id=${newOrderId}&amount=${finalTotal}`;
          console.log("Redirigiendo a pago con Mercado Pago:", paymentUrl);

          // Mostrar modal informativo antes de redirigir
          setPendingOrderId(newOrderId);
          setShowPendingPaymentModal(true);
          setPaymentInProgress(true);

          // Esperar brevemente para que el usuario vea el mensaje antes de la redirección
          setTimeout(async () => {
            const canOpen = await Linking.canOpenURL(paymentUrl);
            if (canOpen) {
              await Linking.openURL(paymentUrl);
            } else {
              setPaymentInProgress(false);
              setShowPendingPaymentModal(false);
              showAlert("Error", "No se pudo abrir la página de pago. Por favor, intenta nuevamente.");
            }
          }, 2000);
        } else if (paymentMethod === "qr") {
          // Para pago con QR, mostrar modal para cargar evidencia
          console.log(`Mostrando modal QR para pedido ${newOrderId}`);

          // Resetear estado del modal de evidencia
          setEvidenceImage(null);
          setEvidenceUploaded(false);
          setIsSubmittingEvidence(false);

          // Asegurar que el QR esté disponible
          if (!qrImageUrl) {
            console.error("Error: No hay imagen QR disponible");
            showAlert("Error", "No se pudo cargar el código QR de pago. Por favor, intenta con otro método de pago.");
            setIsCreatingOrder(false);
            return;
          }

          // Verificar otros modales y cerrarlos si están abiertos
          if (showSuccessModal) setShowSuccessModal(false);
          if (showPendingPaymentModal) setShowPendingPaymentModal(false);

          // Establecer el ID del pedido
          setQrOrderId(newOrderId);

          // Desactivar la bandera de creación de pedido antes de mostrar el modal
          setIsCreatingOrder(false);

          // Mostrar modal QR
          setTimeout(() => {
            console.log("Mostrando modal QR ahora");
            setShowQrEvidenceModal(true);
          }, 1000);
        } else {
          // Para otros métodos (efectivo), mostrar modal de éxito
          setOrderId(newOrderId);
          setShowSuccessModal(true);
        }
      } else {
        throw new Error("Respuesta de API no válida al crear pedido");
      }
    } catch (error) {
      console.error("Error al crear pedido:", error);
      showAlert("Error", "No se pudo crear el pedido: " + error.message);
    } finally {
      setIsCreatingOrder(false);
    }
  };
  // Nueva función para enviar adicionales (corregida)
  const sendAdicionales = async (pedidoId, pedidoData, token) => {
    try {
      console.log("Iniciando envío de adicionales para pedido:", pedidoId);
      console.log(
        "Datos del pedido recibidos:",
        JSON.stringify(pedidoData, null, 2)
      );

      // Acceder al array pedido_lists desde los datos del pedido
      const pedidoLists = pedidoData.pedido_lists || [];

      if (!pedidoLists || pedidoLists.length === 0) {
        console.log("No se encontraron pedido_lists en los datos del pedido");
        return;
      }

      console.log("Pedido lists encontrados:", pedidoLists);

      // Crear un mapa de pedido_list_id por producto_id para facilitar la búsqueda
      const pedidoListMap = {};
      pedidoLists.forEach((item) => {
        pedidoListMap[item.producto_id] = item.id;
      });

      console.log("Mapa de pedido_list:", pedidoListMap);

      // Recopilar todos los adicionales de todos los productos
      const allAdicionales = [];

      products.forEach((product) => {
        console.log(`Procesando producto ${product.productId}:`, product);

        if (product.adicionales && product.adicionales.length > 0) {
          const pedidoListId = pedidoListMap[product.productId];

          if (pedidoListId) {
            console.log(
              `Encontrado pedido_list_id ${pedidoListId} para producto ${product.productId}`
            );

            product.adicionales.forEach((adicional) => {
              // Calcular la cantidad total del adicional (cantidad del adicional × cantidad del producto)
              const cantidadTotal = adicional.quantity * product.quantity;

              const adicionalData = {
                pedido_list_id: pedidoListId,
                producto_adicional_id: adicional.id,
                cantidad: cantidadTotal,
              };

              allAdicionales.push(adicionalData);

              console.log(`Adicional preparado:`, adicionalData);
            });
          } else {
            console.warn(
              `No se encontró pedido_list_id para producto ${product.productId}`
            );
            console.warn(
              `IDs disponibles en pedido_lists:`,
              Object.keys(pedidoListMap)
            );
          }
        } else {
          console.log(`Producto ${product.productId} no tiene adicionales`);
        }
      });

      console.log("Adicionales a enviar:", allAdicionales);

      // Si hay adicionales, enviarlos uno por uno
      if (allAdicionales.length > 0) {
        console.log(`Enviando ${allAdicionales.length} adicionales...`);

        for (const adicional of allAdicionales) {
          try {
            console.log(`Enviando adicional:`, adicional);

            const response = await fetch(`${BASE_URL}pedido-list-adicionales`, {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(adicional),
            });

            const responseText = await response.text();
            console.log(
              `Respuesta adicional ID ${adicional.producto_adicional_id}:`,
              responseText
            );

            if (!response.ok) {
              console.error(
                `Error enviando adicional ${adicional.producto_adicional_id}:`,
                response.status
              );
              console.error("Respuesta:", responseText);
            } else {
              console.log(
                `✓ Adicional ${adicional.producto_adicional_id} enviado exitosamente`
              );

              // Intentar parsear la respuesta para ver si hay información útil
              try {
                const parsedResponse = JSON.parse(responseText);
                console.log("Respuesta parseada:", parsedResponse);
              } catch (e) {
                console.log(
                  "Respuesta no es JSON válido, pero el envío fue exitoso"
                );
              }
            }
          } catch (error) {
            console.error(
              `Error enviando adicional ${adicional.producto_adicional_id}:`,
              error
            );
          }
        }

        console.log("✓ Proceso de envío de adicionales completado");
      } else {
        console.log("No hay adicionales para enviar");
      }
    } catch (error) {
      console.error("Error general enviando adicionales:", error);
      // No lanzamos el error para que no interrumpa el flujo principal
      // Solo registramos el error para debugging
    }
  }; // Procesar pago
  const handlePayment = async () => {
    // Validar que se haya seleccionado un método de pago
    if (!selectedPaymentMethod) {
      showAlert("Error", "Por favor selecciona un método de pago");
      return;
    }

    // Validar dirección
    if (!address.trim()) {
      showAlert("Error", "Por favor selecciona una ubicación en el mapa");
      return;
    }

    // Verificar cálculo de envío
    if (!calculatedDeliveryFee) {
      showAlert("Aviso", "No se ha calculado el valor del envío. ¿Deseas continuar con una tarifa estándar?", "confirm", () => processPayment(), "Continuar");
    } else {
      processPayment();
    }
  };
  // Función para verificar el estado del pedido después de pago externo
  const checkOrderStatus = async (orderId) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;

      const response = await fetch(`${BASE_URL}pedidos/${orderId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data && data.pedido) {
        const pedido = data.pedido;

        // Si el pago está completado o confirmado
        if (
          pedido.estado_pago === "completado" ||
          pedido.estado_pago === "pagado"
        ) {
          // Limpiar el carrito si existe la función
          if (onPaymentComplete) {
            onPaymentComplete();
            console.log("Carrito limpiado después de pago con Mercado Pago");
          }

          setOrderId(orderId);
          setShowSuccessModal(true);
        }
        // Si el pago está pendiente o hubo error, mostrar un modal informativo
        else {
          showAlert("Estado del Pedido", `Tu pedido #${orderId} está en estado ${pedido.estado}. El pago está ${pedido.estado_pago}.`, "info", () => navigation.navigate("Pedidos", { refreshTrigger: Date.now() }), "Ver mis pedidos");
        }
      }
    } catch (error) {
      console.error("Error verificando estado del pedido:", error);
    }
  };

  // Función para subir la evidencia de pago
  const uploadEvidencia = async () => {
    if (!evidenceImage) {
      showAlert("Error", "Por favor selecciona una imagen como evidencia de pago.");
      return;
    }

    setIsSubmittingEvidence(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("No se encontró token de autenticación");

      // Crear formData para enviar archivo
      const formData = new FormData();
      const filename = evidenceImage.split("/").pop();
      const fileType = "image/jpeg"; // O determinar el tipo basado en la extensión

      console.log(
        `Preparando evidencia para pedido ${qrOrderId}, imagen: ${evidenceImage}`
      );

      // Añadir archivo al formData - manera correcta para React Native
      formData.append("archivo_evidencia", {
        uri:
          Platform.OS === "ios"
            ? evidenceImage.replace("file://", "")
            : evidenceImage,
        name: filename || "evidence.jpg",
        type: fileType,
      });

      // Log para depuración
      console.log("FormData preparado:", JSON.stringify(formData));

      // URL de la API
      const apiUrl = `${BASE_URL}pedidos/${qrOrderId}/evidencia`;
      console.log("URL de la API:", apiUrl);

      // Enviar a la API - sin especificar Content-Type, React Native lo hace automáticamente
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          // No incluir 'Content-Type' para que boundary sea configurado automáticamente
        },
        body: formData,
      });

      // Log para depuración
      console.log("Estado de respuesta:", response.status);
      const responseText = await response.text();
      console.log("Respuesta completa:", responseText);

      if (!response.ok) {
        console.error("Error al subir evidencia. Estado:", response.status);
        console.error("Respuesta:", responseText);
        throw new Error(`Error HTTP: ${response.status}`);
      }

      // Intentar parsear respuesta solo si hay contenido
      let responseData = {};
      if (responseText.trim()) {
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.warn(
            "La respuesta no es JSON válido, pero el envío puede haber sido exitoso"
          );
        }
      }

      console.log("Respuesta procesada:", responseData);

      // Limpiar el carrito si existe la función
      if (onPaymentComplete) {
        onPaymentComplete();
        console.log("Carrito limpiado después de cargar evidencia");
      }

      // Marcar como subida exitosamente incluso si la respuesta no es JSON
      setEvidenceUploaded(true);

      // Mostrar mensaje de éxito y cerrar modal después de un tiempo
      showAlert("Éxito", "La evidencia de pago fue cargada correctamente", "success");

      setTimeout(() => {
        setShowQrEvidenceModal(false);
        setOrderId(qrOrderId);
        setShowSuccessModal(true);
      }, 1500);
    } catch (error) {
      console.error("Error al subir evidencia:", error);
      showAlert("Error", "No se pudo cargar la evidencia: " + error.message, "error", () => setIsSubmittingEvidence(false), "Reintentar");
    } finally {
      // Solo desactivamos la bandera de envío si hubo error
      // Si fue exitoso, mantenemos disabled para evitar múltiples envíos
      if (!evidenceUploaded) {
        setIsSubmittingEvidence(false);
      }
    }
  };
  // Procesar según método de pago
  const processPayment = () => {
    switch (selectedPaymentMethod) {
      case "qr":
        // En lugar de preguntar, ahora creamos el pedido directamente
        createOrder("qr");
        break;

      case "mercadopago":
        // Mercado Pago - ahora creamos el pedido y luego redirigimos
        showAlert("Mercado Pago", "Serás redirigido a Mercado Pago para completar el pago.", "confirm", () => createOrder("mercadopago"), "Continuar");
        break;

      case "efectivo":
      default:
        // Efectivo
        createOrder("efectivo");
        break;
    }
  };

  // Solo mostrar cargando si es crítico (no por fuentes)
  // Las fuentes se cargan de forma no bloqueante

  // Función para cerrar sugerencias
  const handleDismissSuggestions = () => {
    setShowSuggestions(false);
  };

  // Animación del bottom sheet
  useEffect(() => {
    Animated.parallel([
      Animated.spring(sheetAnim, {
        toValue: sheetExpanded ? EXPANDED_SHEET_H : COLLAPSED_SHEET_H,
        useNativeDriver: false,
        friction: 9,
        tension: 60,
      }),
      Animated.timing(compactOpacity, { toValue: sheetExpanded ? 0 : 1, duration: 200, useNativeDriver: true }),
      Animated.timing(expandedOpacity, { toValue: sheetExpanded ? 1 : 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [sheetExpanded]);

  const toggleSheet = () => setSheetExpanded((v) => !v);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        const base = sheetExpanded ? EXPANDED_SHEET_H : COLLAPSED_SHEET_H;
        sheetAnim.setValue(Math.max(COLLAPSED_SHEET_H, base - g.dy));
      },
      onPanResponderRelease: (_, g) => {
        const tap = Math.abs(g.dy) < 10 && Math.abs(g.dx) < 10;
        if (tap) return toggleSheet();
        if (sheetExpanded) {
          if (g.dy > 80 || (g.vy || 0) > 0.5) setSheetExpanded(false);
          else setSheetExpanded(true);
        } else {
          if (g.dy < -80 || (g.vy || 0) < -0.5) setSheetExpanded(true);
          else setSheetExpanded(false);
        }
      },
    })
  ).current;

  // Modo pin para seleccionar ubicación manualmente
  const openPinMode = () => {
    setPinMode(true);
    setPinAddress(address || "Mueve el mapa para ajustar");
  };

  const cancelPinMode = () => {
    setPinMode(false);
  };

  const confirmPinLocation = () => {
    if (mapRegion) {
      const { latitude, longitude } = mapRegion;
      setSelectedLocation({ latitude, longitude });
      resolveAddressFromCoords(latitude, longitude);
    }
    setPinMode(false);
  };

  useEffect(() => {
    if (!pinMode) return;
    const updatePinAddress = async () => {
      if (!mapRegion) return;
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${mapRegion.latitude},${mapRegion.longitude}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();
        if (data.status === "OK" && data.results.length > 0) {
          setPinAddress(data.results[0].formatted_address);
        }
      } catch (e) {}
    };
    const timeout = setTimeout(updatePinAddress, 300);
    return () => clearTimeout(timeout);
  }, [mapRegion, pinMode]);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* Mapa a pantalla completa */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            region={mapRegion}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={false}
            showsScale={false}
            showsTraffic={false}
            showsIndoors={false}
            showsBuildings={false}
            showsPointsOfInterest={false}
            toolbarEnabled={false}
            loadingEnabled={true}
            loadingIndicatorColor="#fa6205"
            loadingBackgroundColor="#F2F2F7"
            onRegionChangeComplete={(region) => {
              if (ignoreNextRegionChange) {
                setIgnoreNextRegionChange(false);
              } else {
                setMapRegion(region);
                // Solo actualizar ubicación automáticamente en modo pin al confirmar
              }
            }}
          >
            {establishmentLocation && (
              <Marker coordinate={establishmentLocation} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.originMarker}>
                  <Ionicons name="storefront" size={14} color="#FFF" />
                </View>
              </Marker>
            )}
            {selectedLocation && (
              <Marker coordinate={selectedLocation} anchor={{ x: 0.5, y: 1 }}>
                <View style={styles.destMarker}>
                  <Ionicons name="location" size={22} color="#FFF" />
                </View>
              </Marker>
            )}
          </MapView>

          {/* Header flotante */}
          <View style={styles.floatingHeader}>
            <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={22} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Confirmar pedido</Text>
            <View style={{ width: 44 }} />
          </View>
          {/* FAB ubicación */}
          {!pinMode && (
            <TouchableOpacity style={styles.fabLocate} onPress={centerMapOnUserLocation} activeOpacity={0.8}>
              <Ionicons name="locate" size={22} color="#0F172A" />
            </TouchableOpacity>
          )}

          {/* Pin central - solo visible en modo pin */}
          {pinMode && (
            <View style={styles.centerPin} pointerEvents="none">
              <Ionicons name="location" size={36} color="#fa6205" />
            </View>
          )}

          {/* Modo pin overlay */}
          {pinMode && (
            <>
              <View style={styles.pinBanner} pointerEvents="none">
                <View style={styles.pinBannerContent}>
                  <Ionicons name="location" size={18} color="#fa6205" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pinBannerTitle}>Ajusta tu ubicación</Text>
                    <Text style={styles.pinBannerAddress} numberOfLines={1}>{pinAddress || "Mueve el mapa para ajustar"}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.pinBottomBar}>
                <TouchableOpacity style={styles.pinCancelBtn} onPress={cancelPinMode} activeOpacity={0.8}>
                  <Text style={styles.pinCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pinConfirmBtn} onPress={confirmPinLocation} activeOpacity={0.8}>
                  <Ionicons name="checkmark" size={20} color="#FFF" />
                  <Text style={styles.pinConfirmText}>Confirmar punto</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Bottom Sheet */}
        {!pinMode && (
          <Animated.View style={[styles.bottomSheet, { height: sheetAnim }]}>
            <View style={styles.dragHandleZone} {...panResponder.panHandlers}>
              <View style={styles.dragHandle} />
            </View>

            {!sheetExpanded ? (
              <Animated.View style={[styles.compactSheet, { opacity: compactOpacity }]}>
                <View style={styles.compactLeft}>
                  <Text style={styles.compactLabel}>Total a pagar</Text>
                  <Text style={styles.compactTotal}>${finalTotal.toLocaleString()}</Text>
                  <Text style={styles.compactDetail} numberOfLines={1}>
                    {distance > 0 ? `${distance.toFixed(1)} km · ` : ""}
                    {products.length} productos
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.compactPayButton, (isCreatingOrder || !selectedPaymentMethod) && styles.payButtonDisabled]}
                  onPress={handlePayment}
                  disabled={isCreatingOrder || !selectedPaymentMethod}
                  activeOpacity={0.8}
                >
                  {isCreatingOrder ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.payButtonText}>Pedir</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <Animated.View style={[styles.expandedSheet, { opacity: expandedOpacity }]} pointerEvents={sheetExpanded ? "auto" : "none"}>
                <ScrollView
                  style={styles.sheetScroll}
                  contentContainerStyle={styles.sheetContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Buscador de dirección */}
                  <View style={styles.searchCard}>
                    <View style={styles.searchInputWrap}>
                      <Ionicons name="search" size={18} color="#64748B" />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar dirección de entrega..."
                        placeholderTextColor="#94A3B8"
                        value={mapSearchQuery}
                        onChangeText={searchMapLocation}
                      />
                      {mapSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setMapSearchQuery(""); setMapSearchResults([]); }}>
                          <Ionicons name="close-circle" size={20} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <TouchableOpacity style={styles.pinModeBtn} onPress={openPinMode} activeOpacity={0.8}>
                      <Ionicons name="locate-outline" size={18} color="#fa6205" />
                      <Text style={styles.pinModeText}>Fijar en el mapa</Text>
                    </TouchableOpacity>

                    {mapSearchResults.length > 0 && (
                      <View style={styles.searchResults}>
                        {isSearchingMap ? (
                          <ActivityIndicator size="small" color="#fa6205" style={{ padding: 12 }} />
                        ) : (
                          <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
                            {mapSearchResults.map((result) => (
                              <TouchableOpacity
                                key={result.place_id}
                                style={styles.searchResultItem}
                                onPress={() => selectMapLocation(result.place_id, result.description)}
                              >
                                <Ionicons
                                  name={result.recent ? "time-outline" : "location-outline"}
                                  size={18}
                                  color={result.recent ? "#888" : "#fa6205"}
                                  style={{ marginRight: 10 }}
                                />
                                <Text style={styles.searchResultText} numberOfLines={2}>{result.description}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Ubicaciones */}
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="map-outline" size={18} color="#0F172A" />
                      <Text style={styles.sectionTitle}>Recorrido</Text>
                    </View>
                    <View style={styles.locationRow}>
                      <View style={[styles.locationDot, { backgroundColor: "#10B981" }]} />
                      <Text style={styles.locationLabel}>Desde</Text>
                      <Text style={styles.locationText} numberOfLines={1}>{establishmentName || "Comercio"}</Text>
                    </View>
                    <View style={styles.locationLine} />
                    <View style={styles.locationRow}>
                      <View style={[styles.locationDot, { backgroundColor: "#fa6205" }]} />
                      <Text style={styles.locationLabel}>Hasta</Text>
                      <Text style={[styles.locationText, !address && styles.locationTextPlaceholder]} numberOfLines={1}>
                        {address || "Selecciona tu dirección"}
                      </Text>
                    </View>
                  </View>

                  {/* Resumen de orden */}
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="receipt-outline" size={18} color="#0F172A" />
                      <Text style={styles.sectionTitle}>Tu pedido ({totalQuantity})</Text>
                    </View>

                    {products.map((item, index) => (
                      <View key={`${item.productId}-${index}`} style={styles.productRow}>
                        <View style={styles.productQtyBadge}>
                          <Text style={styles.productQtyText}>{item.quantity}</Text>
                        </View>
                        <View style={styles.productInfo}>
                          <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
                          {item.adicionales && item.adicionales.length > 0 && (
                            <Text style={styles.productExtras} numberOfLines={1}>
                              + {item.adicionales.map((a) => a.nombre).join(", ")}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.productPrice}>${item.itemTotal.toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Servicio de envío */}
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="bicycle-outline" size={18} color="#0F172A" />
                      <Text style={styles.sectionTitle}>Envío</Text>
                    </View>
                    <View style={styles.deliveryServiceRow}>
                      <View style={styles.deliveryServiceInfo}>
                        <Text style={styles.deliveryServiceName}>
                          {deliveryService?.nombre || "Delivery moto"}
                        </Text>
                        <Text style={styles.deliveryServiceDetail}>
                          {distance > 0 ? `${distance.toFixed(1)} km` : "Calculando distancia..."}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {loadingDeliveryFee && <ActivityIndicator size="small" color="#fa6205" style={{ marginRight: 8 }} />}
                        <Text style={styles.deliveryServicePrice}>${deliveryFee.toLocaleString()}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Método de pago */}
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="wallet-outline" size={18} color="#0F172A" />
                      <Text style={styles.sectionTitle}>Método de pago</Text>
                    </View>

                    {loadingPaymentMethods ? (
                      <ActivityIndicator size="small" color="#fa6205" />
                    ) : (
                      <View style={styles.paymentOptions}>
                        {!selectedPaymentMethod && (
                          <View style={styles.paymentHintBox}>
                            <Ionicons name="information-circle-outline" size={16} color="#fa6205" />
                            <Text style={styles.paymentHintText}>
                              Selecciona una opción para continuar con el pago
                            </Text>
                          </View>
                        )}

                        {userPaymentSettings && userPaymentSettings.puede_pagar_efectivo && (
                          <TouchableOpacity
                            style={[
                              styles.paymentCard,
                              selectedPaymentMethod === "efectivo" && styles.paymentCardActive,
                            ]}
                            onPress={() => selectPaymentMethod("efectivo")}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.paymentIconWrap, selectedPaymentMethod === "efectivo" && styles.paymentIconWrapActive]}>
                              <Ionicons name="cash-outline" size={24} color={selectedPaymentMethod === "efectivo" ? "#fff" : "#fa6205"} />
                            </View>
                            <View style={styles.paymentCardBody}>
                              <Text style={[styles.paymentCardTitle, selectedPaymentMethod === "efectivo" && styles.paymentCardTitleActive]}>
                                Efectivo
                              </Text>
                              <Text style={styles.paymentCardDesc}>Paga en la entrega</Text>
                            </View>
                            <View style={styles.radioOuter}>
                              {selectedPaymentMethod === "efectivo" && <View style={styles.radioInner} />}
                            </View>
                          </TouchableOpacity>
                        )}

                        {paymentMethods && paymentMethods.qr_estado === 1 && (
                          <TouchableOpacity
                            style={[
                              styles.paymentCard,
                              selectedPaymentMethod === "qr" && styles.paymentCardActive,
                            ]}
                            onPress={() => selectPaymentMethod("qr")}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.paymentIconWrap, selectedPaymentMethod === "qr" && styles.paymentIconWrapActive]}>
                              <Ionicons name="qr-code-outline" size={24} color={selectedPaymentMethod === "qr" ? "#fff" : "#fa6205"} />
                            </View>
                            <View style={styles.paymentCardBody}>
                              <Text style={[styles.paymentCardTitle, selectedPaymentMethod === "qr" && styles.paymentCardTitleActive]}>
                                Código QR
                              </Text>
                              <Text style={styles.paymentCardDesc}>Escanea y paga desde tu banco</Text>
                            </View>
                            <View style={styles.radioOuter}>
                              {selectedPaymentMethod === "qr" && <View style={styles.radioInner} />}
                            </View>
                          </TouchableOpacity>
                        )}

                        {paymentMethods && paymentMethods.mercado_pago_estado === 1 && (
                          <TouchableOpacity
                            style={[
                              styles.paymentCard,
                              selectedPaymentMethod === "mercadopago" && styles.paymentCardActive,
                            ]}
                            onPress={() => selectPaymentMethod("mercadopago")}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.paymentIconWrap, selectedPaymentMethod === "mercadopago" && styles.paymentIconWrapActive]}>
                              <Ionicons name="card-outline" size={24} color={selectedPaymentMethod === "mercadopago" ? "#fff" : "#fa6205"} />
                            </View>
                            <View style={styles.paymentCardBody}>
                              <Text style={[styles.paymentCardTitle, selectedPaymentMethod === "mercadopago" && styles.paymentCardTitleActive]}>
                                Mercado Pago
                              </Text>
                              <Text style={styles.paymentCardDesc}>Pago online seguro</Text>
                            </View>
                            <View style={styles.radioOuter}>
                              {selectedPaymentMethod === "mercadopago" && <View style={styles.radioInner} />}
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  <View style={{ height: 90 }} />
                </ScrollView>

                {/* Barra de pago inferior */}
                <View style={styles.payBar}>
                  <View>
                    <Text style={styles.payBarLabel}>Total a pagar</Text>
                    <Text style={styles.payBarTotal}>${finalTotal.toLocaleString()}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.payButton, (isCreatingOrder || !selectedPaymentMethod) && styles.payButtonDisabled]}
                    onPress={handlePayment}
                    disabled={isCreatingOrder || !selectedPaymentMethod}
                    activeOpacity={0.8}
                  >
                    {isCreatingOrder ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.payButtonText}>Pedir ahora</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        )}
        {/* Modal ubicando */}
        <Modal visible={isLocating} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <ActivityIndicator size="large" color="#fa6205" />
              <Text style={[styles.modalTitle, { marginTop: 16 }]}>Ubicándote...</Text>
              <Text style={styles.modalMessage}>Estamos obteniendo tu ubicación actual para calcular el envío.</Text>
            </View>
          </View>
        </Modal>

        {/* Success Modal */}
        <Modal visible={showSuccessModal} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#fa6205" style={styles.successIcon} />
              <Text style={styles.modalTitle}>Pago exitoso</Text>
              <Text style={styles.modalMessage}>A continuación te asignaremos alguien para llevarte tu pedido en pocos minutos.</Text>
              <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                <Text style={styles.continueButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal para pagos pendientes con Mercado Pago */}
        <Modal visible={showPendingPaymentModal} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Ionicons name="hourglass-outline" size={80} color="#fa6205" style={styles.successIcon} />
              <Text style={styles.modalTitle}>Pedido Creado</Text>
              <Text style={styles.modalMessage}>
                Tu pedido #{pendingOrderId} ha sido creado. Serás redirigido a Mercado Pago para completar el pago.
              </Text>
              <ActivityIndicator size="large" color="#fa6205" style={{ marginTop: 15 }} />
              <TouchableOpacity
                style={[styles.continueButton, { marginTop: 20, backgroundColor: "#333" }]}
                onPress={() => { setShowPendingPaymentModal(false); setPaymentInProgress(false); }}
              >
                <Text style={[styles.continueButtonText, { color: "#FFF" }]}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal para QR */}
        <Modal visible={showQrEvidenceModal} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { paddingVertical: 30 }]}>
              <Text style={styles.modalTitle}>¡Listo! Pedido enviado</Text>
              <Text style={styles.modalMessage}>
                Hemos enviado tu pedido #{qrOrderId} al comercio. Una vez lo acepten, empezarán a prepararlo y te avisaremos.
              </Text>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => {
                  onPaymentComplete();
                  setShowQrEvidenceModal(false);
                  navigation.navigate("Pedidos", { newOrderId: qrOrderId });
                }}
              >
                <Text style={styles.continueButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>

      <AlertaModal
        visible={alertVisible}
        tipo={alertData.type}
        mensaje={alertData.message}
        onCerrar={() => setAlertVisible(false)}
        onPrimary={alertData.onPrimary}
        primaryLabel={alertData.primaryLabel || "Entendido"}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#F1F5F9" },
  container: { flex: 1 },

  // Mapa
  mapContainer: { flex: 1, backgroundColor: "#E2E8F0" },
  map: { ...StyleSheet.absoluteFillObject },

  // Header flotante
  floatingHeader: {
    position: "absolute",
    top: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 52,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 100,
  },
  headerBackBtn: {
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
  headerTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#0F172A",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },

  // Marcadores
  originMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  destMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fa6205",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },

  // Barra de ubicaciones
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  locationLabel: {
    fontSize: 11,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#94A3B8",
    textTransform: "uppercase",
    width: 42,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#0F172A",
  },
  locationTextPlaceholder: {
    color: "#94A3B8",
  },
  locationLine: {
    width: 2,
    height: 20,
    backgroundColor: "#E2E8F0",
    marginLeft: 4,
    marginVertical: 6,
  },

  // FAB
  fabLocate: {
    position: "absolute",
    right: 14,
    bottom: 340,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 100,
  },

  // Pin central
  centerPin: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -18,
    marginTop: -36,
    zIndex: 50,
  },

  // Bottom Sheet
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
    zIndex: 110,
    overflow: "hidden",
  },
  dragHandleZone: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
  },
  compactSheet: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    flex: 1,
  },
  compactLeft: {
    flex: 1,
  },
  compactLabel: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: "#64748B",
  },
  compactTotal: {
    fontSize: 20,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 1,
  },
  compactDetail: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: "#64748B",
    marginTop: 1,
  },
  compactPayButton: {
    backgroundColor: "#fa6205",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  expandedSheet: {
    flex: 1,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // Buscador
  searchCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#0F172A",
  },
  searchResults: {
    marginTop: 8,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  searchResultText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#333",
  },

  // Pin mode button
  pinModeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
  },
  pinModeText: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    color: "#fa6205",
  },

  // Pin mode overlay
  pinBanner: {
    position: "absolute",
    top: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 70 : 110,
    left: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 120,
  },
  pinBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pinBannerTitle: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  pinBannerAddress: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#64748B",
    marginTop: 2,
  },
  pinBottomBar: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 10,
    zIndex: 120,
  },
  pinCancelBtn: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pinCancelText: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#64748B",
  },
  pinConfirmBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fa6205",
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  pinConfirmText: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#FFF",
  },

  // Cards
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#0F172A",
  },

  // Productos
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  productQtyBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  productQtyText: {
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#fa6205",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#0F172A",
  },
  productExtras: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: "#64748B",
    marginTop: 2,
  },
  productPrice: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#0F172A",
  },

  // Delivery service
  deliveryServiceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  deliveryServiceInfo: {
    flex: 1,
  },
  deliveryServiceName: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  deliveryServiceDetail: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#64748B",
    marginTop: 2,
  },
  deliveryServicePrice: {
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#fa6205",
  },

  // Payment
  paymentOptions: {
    gap: 12,
  },
  paymentHintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  paymentHintText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    color: "#9A3412",
  },
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentCardActive: {
    borderColor: "#fa6205",
    backgroundColor: "#FFF7ED",
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  paymentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
  },
  paymentIconWrapActive: {
    backgroundColor: "#fa6205",
  },
  paymentCardBody: {
    flex: 1,
    gap: 2,
  },
  paymentCardTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  paymentCardTitleActive: {
    color: "#9A3412",
  },
  paymentCardDesc: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#64748B",
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fa6205",
  },

  // Pay bar
  payBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
  },
  payBarLabel: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#64748B",
  },
  payBarTotal: {
    fontSize: 22,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  payButton: {
    backgroundColor: "#fa6205",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  payButtonDisabled: {
    backgroundColor: "#CBD5E1",
    shadowColor: "transparent",
  },
  payButtonText: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#FFF",
  },

  // Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  successIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#64748B",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: "#fa6205",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#FFF",
  },
});

export default PaymentScreen;
