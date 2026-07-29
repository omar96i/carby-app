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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import AlertaModal from "../../components/ErrorModal";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_300Light,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { GOOGLE_MAPS_API_KEY } from "../../constants/Keys";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import MapView, { Marker } from "react-native-maps";
const { height, width } = Dimensions.get("window");
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
  const [deliveryPrices, setDeliveryPrices] = useState(null);
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
  const navigation = useNavigation();

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
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert("Permiso denegado", "No se puede acceder a la ubicación");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      setUserLocation({ latitude, longitude });
      userLocationRef.current = { latitude, longitude };
      setSelectedLocation({ latitude, longitude });
      resolveAddressFromCoords(latitude, longitude);
      setIgnoreNextRegionChange(true);
    })().catch((err) => {
      console.error("Error obteniendo ubicación automática:", err);
    });
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

  useEffect(() => {
    const loadRecentsIfEmpty = async () => {
      if (!mapSearchQuery || mapSearchQuery.trim() === "") {
        const recents = await getRecentLocations();
        const recentsWithFlag = recents.map((r) => ({ ...r, recent: true }));
        setMapSearchResults(recentsWithFlag);
      }
    };

    loadRecentsIfEmpty();
  }, [mapSearchQuery]);
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
      // Mostrar lugares recientes si el query es corto o vacío
      const recents = await getRecentLocations();
      const recentsWithFlag = recents.map((r) => ({ ...r, recent: true }));
      setMapSearchResults(recentsWithFlag);
    }
  };

  const centerMapOnUserLocation = async () => {
    try {
      showAlert("Ubicándote...", "Buscando tu ubicación...", "info");

      Location.requestForegroundPermissionsAsync().then(({ status }) => {
        if (status !== "granted") {
          showAlert("Permiso denegado", "No se pudo acceder a tu ubicación.");
          return;
        }

        Location.getLastKnownPositionAsync({
          maxAge: 60000,
        })
          .then((lastLocation) => {
            if (lastLocation) {
              const region = {
                latitude: lastLocation.coords.latitude,
                longitude: lastLocation.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              };

              mapRef.current?.animateToRegion(region, 1000); // <--- cambio clave
              setSelectedLocation({
                latitude: region.latitude,
                longitude: region.longitude,
              });
            }

            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            })
              .then((preciseLocation) => {
                const region = {
                  latitude: preciseLocation.coords.latitude,
                  longitude: preciseLocation.coords.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                };

                mapRef.current?.animateToRegion(region, 1000); // <--- también aquí
                setSelectedLocation({
                  latitude: region.latitude,
                  longitude: region.longitude,
                });
              })
              .catch((error) => {
                console.log("Error obteniendo ubicación precisa:", error);
              });
          })
          .catch((error) => {
            console.log("Error obteniendo última ubicación conocida:", error);

            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            })
              .then((location) => {
                const region = {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                };

                mapRef.current?.animateToRegion(region, 1000);
                setSelectedLocation({
                  latitude: region.latitude,
                  longitude: region.longitude,
                });
              })
              .catch((err) => {
                showAlert("Error", "No se pudo obtener tu ubicación actual.");
              });
          });
      });
    } catch (error) {
      console.error("Error general en ubicación:", error);
    }
  };
  // Función para seleccionar una ubicación desde resultados de búsqueda
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
      }
    } catch (error) {
      console.error("Error obteniendo detalles del lugar:", error);
    }
  };

  // Geo-resolve timeout ref for debouncing
  const geoTimeout = useRef(null);

  // Resuelve dirección y distancia desde coordenadas (auto al arrastrar el mapa)
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

        if (establishmentLocation) {
          let km;
          try {
            km = await calculateDistanceGoogle(establishmentLocation, { latitude: lat, longitude: lng });
          } catch (err) {
            km = calculateDistance(establishmentLocation, { latitude: lat, longitude: lng });
          }
          setDistance(km);
          const fee = calculateDeliveryFee(km);
          setDeliveryFee(fee);
          setCalculatedDeliveryFee(true);
        }
      } catch (error) {
        console.error("Error resolviendo dirección:", error);
      }
    }, 400);
  }, [establishmentLocation]);
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
    MontserratRegular: Montserrat_400Regular,
    MontserratBold: Montserrat_700Bold,
    MontserratLight: Montserrat_300Light,
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
        const [userResponse, locationResponse, pricesResponse] = await Promise.allSettled([
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
          // Precios de envío
          fetch(`${BASE_URL}precios/activos`, {
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

        // Procesar respuesta de precios de envío
        if (pricesResponse.status === "fulfilled" && pricesResponse.value.ok) {
          try {
            const pricesData = await pricesResponse.value.json();
            if (pricesData.status && pricesData.data) {
              // Filtrar solo tarifas para rider.moto
              const motoRiderPrices = pricesData.data.filter(
                (price) => price.rol_rider === "rider.moto"
              );
              console.log(motoRiderPrices)
              setDeliveryPrices(motoRiderPrices);
            }
          } catch (error) {
            console.error("Error parseando precios de envío:", error);
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

  // Función para calcular valor de envío según distancia
  const calculateDeliveryFee = (distance) => {
    if (!deliveryPrices || deliveryPrices.length === 0) {
      return 10; // Valor predeterminado
    }

    // Encontrar tarifa según horario
    let priceMultiplier = 1.0;
    let baseFee = 5; // Tarifa base mínima

    const priceData = deliveryPrices.find((price) => {
      if (timeOfDay === "night" && price.tipo_tarifa === "noche") return true;
      if (timeOfDay === "holiday" && price.tipo_tarifa === "festivo")
        return true;
      if (timeOfDay === "day" && price.tipo_tarifa === "dia") return true;
      return false;
    });

    if (priceData) {
      baseFee = parseFloat(priceData.precio_base || 5);
      priceMultiplier = parseFloat(priceData.precio || 1.0);
    }

    // Calcular precio
    let fee = baseFee;
    // Si distancia > 1km, agregar cargo por km adicional
    if (distance > 1) {
      fee += distance * priceMultiplier;
    }

    // Redondear a 2 decimales
    return Math.round(fee * 100) / 100;
  };

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
        costo_total: finalTotal,
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

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pagar</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Main Scrollable Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Delivery Location Section - Inline Map */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ubicación de entrega</Text>
            <View style={styles.inlineMapCard}>
              {/* Search bar */}
              <View style={styles.inlineMapSearchContainer}>
                <Ionicons name="search" size={18} color="#999" />
                <TextInput
                  style={styles.inlineMapSearchInput}
                  placeholder="Buscar dirección..."
                  placeholderTextColor="#999"
                  value={mapSearchQuery}
                  onChangeText={searchMapLocation}
                />
                {mapSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => { setMapSearchQuery(""); setMapSearchResults([]); }}>
                    <Ionicons name="close-circle" size={20} color="#bbb" />
                  </TouchableOpacity>
                )}
              </View>
              {/* Search results */}
              {mapSearchResults.length > 0 && (
                <View style={styles.inlineSearchResults}>
                  {isSearchingMap ? (
                    <ActivityIndicator size="small" color="#fa6205" style={{ padding: 10 }} />
                  ) : (
                    <ScrollView style={styles.inlineSearchResultsScroll} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                      {mapSearchResults.map((result) => (
                        <TouchableOpacity
                          key={result.place_id}
                          style={styles.inlineSearchResultItem}
                          onPress={() => selectMapLocation(result.place_id)}
                        >
                          <Ionicons
                            name={result.recent ? "time-outline" : "location-outline"}
                            size={18}
                            color={result.recent ? "#888" : "#fa6205"}
                            style={{ marginRight: 10 }}
                          />
                          <Text style={styles.inlineSearchResultText} numberOfLines={2}>
                            {result.description}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
              {/* Map */}
              <View style={styles.inlineMapWrapper}>
                <MapView
                  ref={mapRef}
                  style={styles.inlineMap}
                  region={mapRegion}
                  liteMode={false}
                  showsUserLocation={true}
                  showsMyLocationButton={true}
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
                      setSelectedLocation({ latitude: region.latitude, longitude: region.longitude });
                      resolveAddressFromCoords(region.latitude, region.longitude);
                    }
                  }}
                >
                  {selectedLocation && (
                    <Marker
                      coordinate={{
                        latitude: selectedLocation.latitude,
                        longitude: selectedLocation.longitude,
                      }}
                      pinColor="#fa6205"
                    />
                  )}
                </MapView>
                {/* Center pin */}
                <View style={styles.inlineCenterPin} pointerEvents="none">
                  <Ionicons name="location" size={32} color="#fa6205" />
                  <View style={styles.inlineCenterPinDot} />
                </View>
                {/* My location button */}
                <TouchableOpacity style={styles.inlineLocateBtn} onPress={centerMapOnUserLocation}>
                  <Ionicons name="locate" size={18} color="#fa6205" />
                  <Text style={styles.inlineLocateLabel}>Ubícame</Text>
                </TouchableOpacity>
              </View>
              {/* Selected address */}
              <View style={styles.inlineAddressRow}>
                <Ionicons name="location-outline" size={20} color="#fa6205" />
                <Text style={styles.inlineAddressText} numberOfLines={2}>
                  {address || "Arrastra el mapa para elegir tu ubicación"}
                </Text>
              </View>
            </View>
            {/* Distance and delivery info */}
            {distance > 0 && (
              <View style={styles.deliveryInfoContainer}>
                <View style={styles.deliveryInfoRow}>
                  <Text style={styles.deliveryInfoLabel}>Distancia</Text>
                  <Text style={styles.deliveryInfoValue}>
                    {distance.toFixed(2)} km
                  </Text>
                </View>
                <View style={styles.deliveryInfoRow}>
                  <Text style={styles.deliveryInfoLabel}>Horario</Text>
                  <Text style={styles.deliveryInfoValue}>
                    {timeOfDay === "day" && "Diurno"}
                    {timeOfDay === "night" && "Nocturno"}
                    {timeOfDay === "holiday" && "Fin de semana/Festivo"}
                  </Text>
                </View>
              </View>
            )}
          </View>
          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Resumen de Orden ({totalQuantity} productos)
            </Text>
            <View style={styles.productList}>
              {products.map((item, index) => (
                <View
                  key={`${item.productId}-${index}`}
                  style={styles.productItemContainer}
                >
                  {/* Información principal del producto */}
                  <View style={styles.productItem}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {item.productName}
                      </Text>
                      <Text style={styles.productQuantity}>
                        x{item.quantity}
                      </Text>
                      <Text style={styles.productBasePrice}>
                        Base: {"$"}{item.basePrice.toLocaleString()}
                      </Text>
                    </View>
                    <Text style={styles.productPrice}>
                      {"$"}{item.itemTotal.toLocaleString()}
                    </Text>
                  </View>

                  {/* Mostrar adicionales si existen */}
                  {item.adicionales && item.adicionales.length > 0 && (
                    <View style={styles.adicionalesContainer}>
                      <Text style={styles.adicionalesTitle}>
                        Adicionales:
                      </Text>
                      {item.adicionales.map((adicional, adIndex) => (
                        <View
                          key={`${adicional.id}-${adIndex}`}
                          style={styles.adicionalItem}
                        >
                          <Text
                            style={styles.adicionalText}
                            numberOfLines={1}
                          >
                            • {adicional.nombre}
                          </Text>
                          <Text style={styles.adicionalQuantity}>
                            x{adicional.quantity}
                          </Text>
                          <Text style={styles.adicionalPrice}>
                            +{"$"}
                            {(
                              parseFloat(adicional.precio) *
                              adicional.quantity
                            ).toLocaleString()}
                          </Text>
                        </View>
                      ))}
                      {/* Mostrar total de adicionales para este producto */}
                      <View style={styles.adicionalesTotal}>
                        <Text style={styles.adicionalesTotalText}>
                          Total adicionales: {"$"}
                          {item.adicionalesTotal.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
          {/* Price Summary */}
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Valor envio</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {loadingDeliveryFee && (
                  <ActivityIndicator
                    size="small"
                    color="#fa6205"
                    style={{ marginRight: 5 }}
                  />
                )}
                <Text style={styles.priceValue}>
                  {"$"}{deliveryFee.toLocaleString()}
                </Text>
              </View>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Valor compra</Text>
              <Text style={styles.priceValue}>
                {"$"}{totalAmount.toLocaleString()}
              </Text>
            </View>
          </View>
          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metodo de pago</Text>

            {loadingPaymentMethods ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fa6205" />
                <Text style={styles.loadingText}>
                  Cargando métodos de pago...
                </Text>
              </View>
            ) : (
              <View style={styles.paymentMethodsContainer}>
                {/* Cash Option - Solo mostrar si el usuario puede pagar en efectivo */}
                {userPaymentSettings &&
                  userPaymentSettings.puede_pagar_efectivo && (
                    <TouchableOpacity
                      style={styles.paymentOption}
                      onPress={() => selectPaymentMethod("efectivo")}
                    >
                      <View style={styles.paymentIconContainer}>
                        <Ionicons
                          name="wallet-outline"
                          size={24}
                          color="#1C1C1E"
                        />
                      </View>
                      <Text style={styles.paymentMethodLabel}>Efectivo</Text>
                      <View
                        style={
                          selectedPaymentMethod === "efectivo"
                            ? styles.radioButtonSelected
                            : styles.radioButtonEmpty
                        }
                      >
                        {selectedPaymentMethod === "efectivo" && (
                          <View style={styles.radioButtonInner} />
                        )}
                      </View>
                    </TouchableOpacity>
                  )}

                {/* QR Code Option */}
                {paymentMethods && paymentMethods.qr_estado === 1 && (
                  <TouchableOpacity
                    style={styles.paymentOption}
                    onPress={() => selectPaymentMethod("qr")}
                  >
                    <View style={styles.paymentIconContainer}>
                      <Ionicons
                        name="qr-code-outline"
                        size={24}
                        color="#1C1C1E"
                      />
                    </View>
                    <Text style={styles.paymentMethodLabel}>
                      Pagar con código QR
                    </Text>
                    <View
                      style={
                        selectedPaymentMethod === "qr"
                          ? styles.radioButtonSelected
                          : styles.radioButtonEmpty
                      }
                    >
                      {selectedPaymentMethod === "qr" && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                  </TouchableOpacity>
                )}

                {/* Mercado Pago Option */}
                {paymentMethods &&
                  paymentMethods.mercado_pago_estado === 1 && (
                    <TouchableOpacity
                      style={styles.paymentOption}
                      onPress={() => selectPaymentMethod("mercadopago")}
                    >
                      <View style={styles.paymentIconContainer}>
                        <Ionicons
                          name="card-outline"
                          size={24}
                          color="#1C1C1E"
                        />
                      </View>
                      <Text style={styles.paymentMethodLabel}>
                        Mercado Pago
                      </Text>
                      <View
                        style={
                          selectedPaymentMethod === "mercadopago"
                            ? styles.radioButtonSelected
                            : styles.radioButtonEmpty
                        }
                      >
                        {selectedPaymentMethod === "mercadopago" && (
                          <View style={styles.radioButtonInner} />
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
              </View>
            )}

          </View>
          {/* Extra space at bottom */}
          <View style={styles.bottomSpace} />
        </ScrollView>

        {/* Bottom Total and Pay Button */}
        <View style={styles.bottomContainer}>
          <Text style={styles.totalAmount}>
            {"$"}{finalTotal.toLocaleString()}
          </Text>
          <View style={styles.payButtonContainer}>
            <TouchableOpacity
              style={[
                styles.payButton,
                (isCreatingOrder || !selectedPaymentMethod) &&
                styles.payButtonDisabled,
              ]}
              onPress={handlePayment}
              disabled={isCreatingOrder || !selectedPaymentMethod}
            >
              {isCreatingOrder ? (
                <ActivityIndicator size="small" color="#333" />
              ) : (
                <Text style={styles.payButtonText}>Pedir ahora</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Ionicons
                name="checkmark-circle"
                size={80}
                color="#fa6205"
                style={styles.successIcon}
              />
              <Text style={styles.modalTitle}>Pago exitoso</Text>
              <Text style={styles.modalMessage}>
                A continuación te asignaremos alguien para llevarte tu pedido
                en pocos minutos.
              </Text>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
              >
                <Text style={styles.continueButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal para pagos pendientes con Mercado Pago */}
        <Modal
          visible={showPendingPaymentModal}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Ionicons
                name="hourglass-outline"
                size={80}
                color="#fa6205"
                style={styles.successIcon}
              />
              <Text style={styles.modalTitle}>Pedido Creado</Text>
              <Text style={styles.modalMessage}>
                Tu pedido #{pendingOrderId} ha sido creado. Serás redirigido a
                Mercado Pago para completar el pago. Una vez finalizado, tu
                pedido será procesado y confirmado.
              </Text>
              <Text style={[styles.modalMessage, { marginTop: 10 }]}>
                Redirigiendo a la página de pago...
              </Text>
              <ActivityIndicator
                size="large"
                color="#fa6205"
                style={{ marginTop: 15 }}
              />

              {/* Botón para cerrar manualmente si es necesario */}
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  { marginTop: 20, backgroundColor: "#333" },
                ]}
                onPress={() => {
                  setShowPendingPaymentModal(false);
                  setPaymentInProgress(false);
                }}
              >
                <Text style={[styles.continueButtonText, { color: "#1C1C1E" }]}>
                  Cerrar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal para QR y carga de evidencia */}
        <Modal
          visible={showQrEvidenceModal}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View
              style={[styles.modalContainer, styles.qrEvidenceModalContainer]}
            >
              <Text style={styles.modalTitle}>¡Listo! Pedido enviado</Text>
              <Text style={styles.modalMessage}>
                Hemos enviado tu pedido #{qrOrderId} al comercio. Una vez lo acepten, empezarán a prepararlo y te avisaremos.
              </Text>

              {/* QR image */}
              {/* {qrImageUrl && (
                <View style={styles.qrEvidenceImageContainer}>
                  <Image
                    source={{ uri: qrImageUrl }}
                    style={styles.qrEvidenceImage}
                    resizeMode="contain"
                  />
                </View>
              )} */}

              {/* Upload section */}
              {/* <View style={styles.evidenceUploadSection}>
                  <Text style={styles.evidenceLabel}>
                    {evidenceImage
                      ? "Evidencia seleccionada"
                      : "Subir evidencia de pago"}
                  </Text>

                  <TouchableOpacity
                    style={styles.evidenceButton}
                    onPress={pickImage}
                    disabled={isSubmittingEvidence || evidenceUploaded}
                  >
                    {evidenceImage ? (
                      <Image
                        source={{ uri: evidenceImage }}
                        style={styles.evidenceThumbnail}
                      />
                    ) : (
                      <View style={styles.evidencePlaceholder}>
                        <Ionicons
                          name="cloud-upload-outline"
                          size={32}
                          color="#fa6205"
                        />
                        <Text style={styles.evidencePlaceholderText}>
                          Seleccionar imagen
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View> */}

              {/* Submit button */}
              {/* <TouchableOpacity
                  style={[
                    styles.continueButton,
                    (!evidenceImage ||
                      isSubmittingEvidence ||
                      evidenceUploaded) &&
                      styles.disabledButton,
                  ]}
                  onPress={uploadEvidencia}
                  disabled={
                    !evidenceImage || isSubmittingEvidence || evidenceUploaded
                  }
                >
                  {isSubmittingEvidence ? (
<ActivityIndicator size="small" color="#FFF" />
                  ) : evidenceUploaded ? (
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#333"
                        style={{ marginRight: 5 }}
                      />
                      <Text style={styles.continueButtonText}>
                        ¡Evidencia enviada!
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.continueButtonText}>
                      Enviar Evidencia
                    </Text>
                  )}
                </TouchableOpacity> */}

              {/* Opción para cancelar/cerrar */}
              <TouchableOpacity
                style={[styles.cancelButton]}
                onPress={() => {
                  onPaymentComplete(); // Limpia parámetros o estado
                  setShowQrEvidenceModal(false);
                  navigation.navigate("Pedidos", { newOrderId: qrOrderId });
                }}
              >
                <Text style={styles.cancelButtonText}>
                  Continuar
                </Text>
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
  safeContainer: {
    flex: 1,
  },
  suggestionsPanelMain: {
    backgroundColor: "#222222",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333333",
    zIndex: 1500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 10,
    marginTop: 5,
    maxHeight: 200,
  },

  container: {
    flex: 1,
  },
  fullLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
  },
  // --- INLINE MAP STYLES ---
  inlineMapCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  inlineMapSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    margin: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  inlineMapSearchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    color: '#1C1C1E',
    fontFamily: "MontserratRegular",
  },
  inlineSearchResults: {
    backgroundColor: "#FFF",
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 10,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 5,
  },
  inlineSearchResultsScroll: {
    maxHeight: 160,
  },
  inlineSearchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  inlineSearchResultText: {
    fontSize: 13,
    fontFamily: "MontserratRegular",
    color: "#333",
    flex: 1,
  },
  inlineMapWrapper: {
    height: 240,
    position: "relative",
  },
  inlineMap: {
    width: "100%",
    height: "100%",
  },
  inlineCenterPin: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -16,
    marginTop: -32,
    alignItems: "center",
    zIndex: 5,
  },
  inlineCenterPinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fa6205",
    marginTop: -2,
  },
  inlineLocateBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#FFF",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 36,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 10,
  },
  inlineLocateLabel: {
    fontSize: 12,
    fontFamily: "MontserratSemiBold",
    color: "#fa6205",
    marginLeft: 4,
  },
  inlineAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  inlineAddressText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "MontserratRegular",
    color: "#555",
    marginLeft: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === "android" ? 50 : 14,
    backgroundColor: "#fa6205",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "MontserratBold",
    color: "#FFF",
  },
  backButton: {
    padding: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: 20,
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
    fontFamily: "MontserratRegular",
  },
  productList: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
  },

  productInfo: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontFamily: "MontserratRegular",
    fontSize: 14,
  },
  productQuantity: {
    fontFamily: "MontserratBold",
    fontSize: 12,
  },
  productPrice: {
    fontFamily: "MontserratBold",
    fontSize: 14,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 15,
    zIndex: 10,
  },
  locationIconContainer: {
    marginRight: 15,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 16,
    fontFamily: "MontserratBold",
  },
  addressValue: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1E',
    fontFamily: 'MontserratRegular',
    paddingVertical: 6,
  },

  suggestionsOverlayContainer: {
    position: "absolute",
    backgroundColor: "#222222",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333333",
    zIndex: 1500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 10,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  suggestionText: {
    flex: 1,
    color: "#1C1C1E",
    fontFamily: "MontserratRegular",
    fontSize: 14,
  },
  suggestionIcon: {
    marginRight: 10,
  },
  loadingIndicator: {
    padding: 15,
  },
  deliveryInfoContainer: {
    marginTop: 15,
    backgroundColor: "rgba(1,1,1,0.1)",
    borderRadius: 10,
    padding: 15,
  },
  deliveryInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  deliveryInfoLabel: {
    fontFamily: "MontserratRegular",
    fontSize: 14,
  },
  deliveryInfoValue: {
    fontFamily: "MontserratBold",
    fontSize: 14,
  },
  priceContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 18,
    fontFamily: "MontserratBold",
  },
  priceValue: {
    fontSize: 18,
    fontFamily: "MontserratBold",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: "MontserratRegular",
    marginTop: 10,
  },
  paymentMethodsContainer: {
    borderWidth: 1,
    borderColor: "#fa6205",
    borderStyle: "dashed",
    borderRadius: 20,
    overflow: "hidden",
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  paymentMethodLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: "MontserratRegular",
  },
  radioButtonSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fa6205",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fa6205",
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "white",
  },
  radioButtonEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fa6205",
  },
  qrImageContainer: {
    marginTop: 15,
    alignItems: "center",
    padding: 20,
    backgroundColor: "#222222",
    borderRadius: 15,
  },
  qrImage: {
    width: 200,
    height: 200,
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 10,
  },
  qrInstructions: {
    color: "#1C1C1E",
    fontFamily: "MontserratRegular",
    textAlign: "center",
    marginTop: 10,
  },
  bottomSpace: {
    height: 80,
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#F0F0F0",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  totalAmount: {
    fontSize: 24,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
  },
  payButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  payButton: {
    backgroundColor: "#fa6205",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  payButtonDisabled: {
    backgroundColor: "#fa6205",
    opacity: 0.7,
  },
  payButtonText: {
    fontSize: 18,
    fontFamily: "MontserratBold",
    color: "#FFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 30,
    width: "85%",
    alignItems: "center",
  },
  successIcon: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
    marginBottom: 15,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: "MontserratRegular",
    color: "#1C1C1E",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 24,
  },
  continueButton: {
    backgroundColor: "#fa6205",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: "80%",
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: "MontserratBold",
    color: "#FFF",
  },
  qrEvidenceModalContainer: {
    width: "90%",
    maxHeight: "90%",
  },
  qrEvidenceImageContainer: {
    width: "100%",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
    marginVertical: 15,
    alignItems: "center",
  },
  qrEvidenceImage: {
    width: 200,
    height: 200,
  },
  evidenceUploadSection: {
    width: "100%",
    marginVertical: 15,
  },
  evidenceLabel: {
    color: "#1C1C1E",
    fontFamily: "MontserratBold",
    fontSize: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  evidenceButton: {
    borderWidth: 2,
    borderColor: "#fa6205",
    borderStyle: "dashed",
    borderRadius: 10,
    height: 140,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    overflow: "hidden",
  },
  evidencePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  evidencePlaceholderText: {
    color: "#fa6205",
    fontFamily: "MontserratRegular",
    marginTop: 10,
  },
  evidenceThumbnail: {
    width: "100%",
    height: "100%",
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: "#999",
  },
  cancelButton: {
    marginTop: 15,
    padding: 10,
  },
  cancelButtonText: {
    color: "#fa6205",
    fontFamily: "MontserratRegular",
    fontSize: 16,
    textAlign: "center",
  },
  productItemContainer: {
    marginBottom: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
    padding: 12,
  },
  productBasePrice: {
    color: "#999",
    fontFamily: "MontserratRegular",
    fontSize: 12,
    marginTop: 2,
  },
  adicionalesContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#DDD",
  },
  adicionalesTitle: {
    color: "#000",
    fontFamily: "MontserratBold",
    fontSize: 12,
    marginBottom: 5,
  },
  adicionalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
    paddingHorizontal: 5,
  },
  adicionalText: {
    color: "#ccc",
    fontFamily: "MontserratRegular",
    fontSize: 11,
    flex: 1,
    marginRight: 5,
  },
  adicionalQuantity: {
    color: "#1C1C1E",
    fontFamily: "MontserratBold",
    fontSize: 11,
    minWidth: 25,
    textAlign: "center",
  },
  adicionalPrice: {
    color: "#000",
    fontFamily: "MontserratBold",
    fontSize: 11,
    minWidth: 60,
    textAlign: "right",
  },
  adicionalesTotal: {
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#555",
    alignItems: "flex-end",
  },
  adicionalesTotalText: {
    color: "#000",
    fontFamily: "MontserratBold",
    fontSize: 12,
  },

  // Actualizar el estilo existente
  productItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start", // Cambiar de "center" a "flex-start"
    paddingVertical: 0, // Remover padding vertical
  },
  mensajeAyuda: {
    fontSize: 12,
  },
  mensajeAyudaSecundaria: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  mensajeAyudaSecundaria2: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 217, 100, 0.3)', // Fondo sutil
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 2,
  },
  actionButtonText: {
    fontFamily: 'MontserratRegular',
    fontSize: 13,
    marginLeft: 8,
    color: '#FFF',
  },
  addressCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
  },
  addressInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  mapSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fa6205',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  mapSelectBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'MontserratBold',
    marginLeft: 8,
  },
});

export default PaymentScreen;
