import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AlertaModal from "../../components/ErrorModal";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions,
  Keyboard
} from "react-native";
import Icon1 from "react-native-vector-icons/Entypo";
import IconMC from "react-native-vector-icons/AntDesign";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_300Light,
} from "@expo-google-fonts/montserrat";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import LocationSection from "../../components/LocationSection";
import Modal from "react-native-modal";
import { GOOGLE_MAPS_API_KEY } from "../../constants/Keys";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useNotification } from "../../context/NotificationContext";

export default function SelectLocationScreen() {
  const mapRef = useRef(null);
  const navigation = useNavigation();
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [serviceDetails, setServiceDetails] = useState({
    nombre_servicio: "",
    precio_kilometro: 0,
  });
  const [distance, setDistance] = useState(null);
  const [totalPrice, setTotalPrice] = useState("");
  const totalPriceRaw = useRef(0);
  const [vehicleType, setVehicleType] = useState(null); // "moto", "mototaxi", or "taxi"
  const [serviceCategory, setServiceCategory] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pickupCoord, setPickupCoord] = useState(null);
  const [deliveryCoord, setDeliveryCoord] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [observations, setObservations] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isErrorModalVisible, setErrorModalVisible] = useState(false);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [deliverySuggestions, setDeliverySuggestions] = useState([]);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDelivery, setIsSearchingDelivery] = useState(false);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDeliverySuggestions, setShowDeliverySuggestions] = useState(false);
  // Estados para el cálculo de precios
  const [prices, setPrices] = useState([]);
  const [distanceInKm, setDistanceInKm] = useState(null);
  const [pricePerKm, setPricePerKm] = useState(null);
  const [basePrice, setBasePrice] = useState(0); // Nuevo estado para el precio base
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [priceError, setPriceError] = useState(null);
  const [tariffType, setTariffType] = useState("dia"); // día, noche, festivo
  // Estado para configuración de usuario
  const [userPaymentSettings, setUserPaymentSettings] = useState(null);
  const [loadingUserSettings, setLoadingUserSettings] = useState(true);

  // Nuevo estado para los servicios disponibles
  const [availableServices, setAvailableServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingCurrentLocation, setIsLoadingCurrentLocation] =
    useState(false);
  const [locationError, setLocationError] = useState(null);
  const { expoPushToken, notification } = useNotification();

  // Estado para la creación de la carrera
  const [isCreatingRide, setIsCreatingRide] = useState(false);
  // Altura del mapa
  const screenH = Dimensions.get("window").height;
  const [mapHeight, setMapHeight] = useState(screenH * 0.35);
  useEffect(() => {
    if (pinMode) return;
    const inputActive = showPickupSuggestions || showDeliverySuggestions;
    if (inputActive) {
      setMapHeight(screenH * 0.10);
    } else if (totalPrice) {
      setMapHeight(screenH * 0.28);
    } else {
      setMapHeight(screenH * 0.35);
    }
  }, [pinMode, showPickupSuggestions, showDeliverySuggestions, totalPrice]);
  // Auto-scroll del sheet cuando aparecen sugerencias
  useEffect(() => {
    if ((showPickupSuggestions || showDeliverySuggestions) && sheetScrollRef.current) {
      setTimeout(() => {
        sheetScrollRef.current?.scrollTo({ y: 120, animated: true });
      }, 100);
    }
  }, [showPickupSuggestions, showDeliverySuggestions]);

  // Alerta modal unificada
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "error", onPrimary: null, primaryLabel: null });
  const showAlert = (message, type = "error", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };
  // Retroceder o salir de la pantalla
  function goBack() {
    navigation.goBack();
  }
  // Reiniciar toda la selección
  function resetAll() {
    setVehicleType(null);
    setSelectedServiceId(null);
    setServiceDetails({ nombre_servicio: "", precio_kilometro: 0 });
    setPaymentMethod(null);
    setObservations("");
    setModalVisible(false);
    setPickupAddress("");
    setDeliveryAddress("");
    setPickupCoord(null);
    setDeliveryCoord(null);
    setRouteCoords([]);
    setTotalPrice("");
  }
  const [mapRegion, setMapRegion] = useState({
    latitude: -12.046374,
    longitude: -77.042793,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [isLocationPickup, setIsLocationPickup] = useState(true);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [isSearchingMap, setIsSearchingMap] = useState(false);

  const [userLocation, setUserLocation] = useState(null);
  const userLocationRef = useRef(null);

  const [ignoreNextRegionChange, setIgnoreNextRegionChange] = useState(false);

  const [userRole, setUserRole] = useState('usuario');

  // Dropdown del selector de método de pago (paso service)
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);

  // Nuevo estado para el modal de política de pago
  const [paymentPolicyModalVisible, setPaymentPolicyModalVisible] = useState(false);

  const isColombia = true;
  const textoPago = "Pagar con Nequi o Bancolombia";

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const tipo = await AsyncStorage.getItem('tipo_usuario');
        if (tipo) {
          setUserRole(tipo);
        }
      } catch (error) {
        console.error('Error al obtener tipo_usuario:', error);
      }
    };

    getUserRole();
  }, []);

  // Ocultar la barra de tabs inferior cuando esta pantalla está enfocada
  useFocusEffect(
    useCallback(() => {
      const tabNav = navigation.getParent();
      if (tabNav) {
        tabNav.setOptions({ tabBarStyle: { display: "none" } });
      }
      return () => {
        navigation.getParent()?.setOptions({
          tabBarStyle: { backgroundColor: '#FFF', height: 56, borderTopWidth: 1, borderTopColor: '#F0F0F0', display: 'flex' },
        });
      };
    }, [navigation])
  );

  useEffect(() => {
    // Precargar la ubicación del usuario en segundo plano
    const precacheUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          // Guardar tanto en estado como en referencia (la referencia es más rápida de acceder)
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          userLocationRef.current = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
        }
      } catch (error) {
        console.log("Error precargando ubicación:", error);
      }
    };

    precacheUserLocation();
    getCurrentLocation();
  }, []);

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

  // Centrar mapa y asignar recogida automáticamente a la ubicación del usuario
  useEffect(() => {
    if (userLocation) {
      setMapRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setIgnoreNextRegionChange(true);
      getAddressFromCoordinates(userLocation.latitude, userLocation.longitude).then((addr) => {
        if (addr && !pickupAddress) {
          setPickupAddress(addr);
          setPickupCoord({ latitude: userLocation.latitude, longitude: userLocation.longitude });
        }
      });
    }
  }, [userLocation]);

  // Ajustar mapa para mostrar ambos pines
  const fitMapBetween = useCallback((p1, p2) => {
    const midLat = (p1.latitude + p2.latitude) / 2;
    const midLng = (p1.longitude + p2.longitude) / 2;
    const latDelta = Math.max(Math.abs(p1.latitude - p2.latitude) * 1.6, 0.01);
    const lngDelta = Math.max(Math.abs(p1.longitude - p2.longitude) * 1.6, 0.01);
    setIgnoreNextRegionChange(true);
    const doFit = () => {
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        }, 800);
      } else {
        setTimeout(doFit, 200);
      }
    };
    doFit();
  }, []);

  // Ajustar mapa cuando cambian las coordenadas
  useEffect(() => {
    if (pickupCoord && deliveryCoord) {
      const timer = setTimeout(() => fitMapBetween(pickupCoord, deliveryCoord), 400);
      return () => clearTimeout(timer);
    } else if (pickupCoord && mapRef.current) {
      setIgnoreNextRegionChange(true);
      mapRef.current.animateToRegion({
        ...pickupCoord,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    } else if (deliveryCoord && mapRef.current) {
      setIgnoreNextRegionChange(true);
      mapRef.current.animateToRegion({
        ...deliveryCoord,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  }, [pickupCoord, deliveryCoord, fitMapBetween]);

  // Obtener ruta entre pickup y delivery para dibujar polyline
  const fetchRoute = async (origin, destination) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.routes && data.routes.length > 0) {
        const points = data.routes[0].overview_polyline.points;
        const decoded = decodePolyline(points);
        setRouteCoords(decoded);
      }
    } catch (e) {
      console.error("Error fetching route:", e);
    }
  };

  useEffect(() => {
    if (pickupCoord && deliveryCoord) {
      fetchRoute(pickupCoord, deliveryCoord);
    } else {
      setRouteCoords([]);
    }
  }, [pickupCoord, deliveryCoord]);

  const decodePolyline = (encoded) => {
    const points = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);
      shift = 0; result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lng += (result & 1) ? ~(result >> 1) : (result >> 1);
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  };

  const searchMapLocation = async (query, userLat, userLng) => {
    setMapSearchQuery(query);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.length > 3) {
      setIsSearchingMap(true);

      searchTimeout.current = setTimeout(async () => {
        try {
          // 1. LÓGICA DINÁMICA DE PAÍS
          // Convertimos la URL a string y revisamos si es la de Colombia
          const currentUrlStr = BASE_URL.toString();
          const countryCode = "co";
          console.log(countryCode)
          console.log(`🔎 Buscando en Google Maps para región: ${countryCode.toUpperCase()}`);

          const encodedQuery = encodeURIComponent(query);
          const lat = userLat ?? userLocationRef.current?.latitude;
          const lng = userLng ?? userLocationRef.current?.longitude;
          const locationBias = lat && lng ? `&locationbias=point:${lat},${lng}` : "";

          // 2. INYECTAMOS EL COUNTRY CODE EN LA URL
          const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedQuery}&components=country:${countryCode}${locationBias}&key=${GOOGLE_MAPS_API_KEY}`;

          const response = await fetch(url);
          const data = await response.json();

          if (data.predictions) {
            // Solo mostrar resultados de búsqueda (NO los recientes aquí)
            setMapSearchResults(data.predictions);
          }
        } catch (error) {
          console.error("Error buscando ubicaciones en el mapa:", error);
        } finally {
          setIsSearchingMap(false);
        }
      }, 300);
    } else {
      // Si el input está vacío, volver a mostrar los recientes
      const recents = await getRecentLocations();
      const recentsWithFlag = recents.map((r) => ({ ...r, recent: true }));
      setMapSearchResults(recentsWithFlag);
    }
  };

  // Añadir esta variable de referencia al inicio del componente
  const searchTimeout = useRef(null);
  const sheetScrollRef = useRef(null);
  // Optimiza la función centerMapOnUserLocation para respuesta inmediata
  // Versión corregida de centerMapOnUserLocation para React Native
  const centerMapOnUserLocation = async () => {
    try {
      Location.requestForegroundPermissionsAsync().then(({ status }) => {
        if (status !== "granted") {
          showAlert("Permiso denegado: no se pudo acceder a tu ubicación.");
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
                showAlert("No se pudo obtener tu ubicación actual.");
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


  // Geocodifica un place_id de Google Places a coordenadas
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

  // Añade esta función para seleccionar una ubicación desde los resultados de búsqueda

  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        // Buscar la primera dirección que no empiece con un Plus Code
        const validResult = data.results.find(result => {
          const address = result.formatted_address;
          return !/^[\w\d]+\+\w+/.test(address);  // Excluir Plus Codes tipo "r67G+32 Pereira"
        });

        if (validResult) {
          return validResult.formatted_address;
        }

        return "Dirección no disponible"; // Si todos son Plus Codes
      }

      return "Dirección no encontrada";
    } catch (error) {
      console.error("Error obteniendo dirección:", error);
      return "Error al obtener la dirección";
    }
  };


  // Modo pin: cuando el usuario quiere seleccionar manualmente en el mapa
  const [pinMode, setPinMode] = useState(false);

  // Modifica la función openLocationPicker para activar el modo pin en el mapa principal
  const openLocationPicker = async (isPickup) => {
    setIsLocationPickup(isPickup);
    setPinMode(true);
    setMapSearchResults([]);
    setMapSearchQuery("");
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...mapRegion,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 500);
    }
  };

  // Confirmar la ubicación central del mapa en modo pin
  const confirmPinLocation = async () => {
    const { latitude, longitude } = mapRegion;
    const address = await getAddressFromCoordinates(latitude, longitude);
    if (isLocationPickup) {
      setPickupAddress(address);
      setPickupCoord({ latitude, longitude });
    } else {
      setDeliveryAddress(address);
      setDeliveryCoord({ latitude, longitude });
    }
    setPinMode(false);
  };

  const cancelPinMode = () => {
    setPinMode(false);
  };
  const [fontsLoaded] = useFonts({
    MontserratRegular: Montserrat_400Regular,
    MontserratBold: Montserrat_700Bold,
    MontserratLight: Montserrat_300Light,
  });

  // Función mejorada para obtener coordenadas desde una dirección
  const getCoordinatesFromAddressForAPI = async (address) => {
    if (!address || address.trim() === "") {
      console.log("Dirección vacía, no se pueden obtener coordenadas");
      return { lat: 0, lng: 0 };
    }

    try {
      console.log(`Obteniendo coordenadas para: ${address}`);

      // Intentar con Google Maps Geocoding API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();
      console.log(`Respuesta de Geocoding para ${address}:`, data.status);

      if (data.status === "OK" && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        console.log(`Coordenadas obtenidas: ${location.lat}, ${location.lng}`);
        return {
          lat: location.lat,
          lng: location.lng,
        };
      }

      // Si Google falla, usar coordenadas de respaldo basadas en la región
      console.log(
        "No se pudieron obtener coordenadas con Google. Usando coordenadas de respaldo."
      );

      // Coordenadas predeterminadas (en este caso para Perú - Lima)
      // Puedes ajustar estas coordenadas según la región principal de tu aplicación
      return { lat: -12.046374, lng: -77.042793 };
    } catch (error) {
      console.error("Error obteniendo coordenadas:", error);

      // Devolver coordenadas de respaldo en caso de error
      return { lat: -12.046374, lng: -77.042793 };
    }
  };

  // Función para crear la carrera en el backend
  const crearCarrera = async () => {
    try {
      setIsCreatingRide(true);

      // Obtener el ID del usuario desde AsyncStorage
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        throw new Error("No se encontró ID de usuario");
      }

      // Obtener coordenadas para las direcciones
      const puntoRecogidaCoords = await getCoordinatesFromAddressForAPI(
        pickupAddress
      );
      const destinoCoords = await getCoordinatesFromAddressForAPI(
        deliveryAddress
      ); // Preparar datos para la carrera
      const carreraData = {
        usuario_id: parseInt(userId),
        conductor_id: null, // Inicialmente null, se asignará después
        service_id: selectedServiceId ? parseInt(selectedServiceId) : null,
        pedido_id: null, // No tenemos pedido asociado en este flujo
        informacion_adicional: JSON.stringify({
          observaciones: observations || "",
          origen: pickupAddress || "",
          destino: deliveryAddress || "",
          metododepago:
            paymentMethod === "tarjeta" ? "Nequi o Bancolombia" : "Efectivo",
        }),
        punto_recogida: JSON.stringify(puntoRecogidaCoords),
        destino: JSON.stringify(destinoCoords),
        costo: totalPriceRaw.current,
        distancia: distanceInKm,
        estado: "pendiente",
        metodo_pago: paymentMethod === "tarjeta" ? "Nequi o Bancolombia" : "Efectivo",
      };

      console.log("Datos de carrera a enviar:", carreraData);

      // Obtener token de autenticación
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      // Enviar datos al API
      const response = await fetch(`${BASE_URL}carreras`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(carreraData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al crear la carrera");
      }

      console.log("Carrera creada exitosamente:", data);

      // Guardar el ID de la carrera para usarlo más adelante
      if (data && data.carrera && data.carrera.id) {
        await AsyncStorage.setItem("carreraId", data.carrera.id.toString());
      }

      // Mostrar modal de éxito
      setModalVisible(true);

      return data;
    } catch (error) {
      console.error("Error al crear carrera:", error);
      setErrorModalVisible(true);
      setErrorModalVisible(true);
      return null;
    } finally {
      setIsCreatingRide(false);
    }
  };

  // Función para obtener servicios según el tipo de vehículo
  const fetchServicesByVehicleType = async (type) => {
    try {
      setIsLoadingServices(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        console.error("No se encontró token de autenticación");
        return;
      }

      const role = `rider.${type}`;
      console.log(`Consultando servicios para: ${role}`);

      const response = await fetch(`${BASE_URL}services/all/${role}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Servicios para ${role}:`, data);

      // Cambiado de data.data a data.services para corresponder con la estructura de respuesta real
      if (data && data.services) {
        console.log("Procesando servicios:", data.services.length);
        setAvailableServices(data.services);

        // Mostrar modal de política de pago si el usuario no puede pagar en efectivo
        // if (userPaymentSettings && !userPaymentSettings.puede_pagar_efectivo) {
        //   setPaymentPolicyModalVisible(true);
        // }
      } else {
        console.log("No se encontraron servicios en la respuesta");
        setAvailableServices([]);
      }
    } catch (error) {
      console.error(`Error al obtener servicios para ${type}:`, error);
      setAvailableServices([]);
    } finally {
      setIsLoadingServices(false);
    }
  };

  const getCurrentLocation = async (locationType = "pickup") => {
    setIsLoadingCurrentLocation(true);
    setLocationError(null);

    try {
      // Solicitar permiso de ubicación
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationError("Se requiere permiso para acceder a la ubicación");
        return;
      }

      // Obtener la ubicación actual
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Convertir coordenadas a dirección

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();
      if (data.status === "OK" && data.results.length > 0) {
        const filteredResult = data.results.find(result => {
          const isPlusCode = result.types.includes("plus_code");
          const isFormattedPlusCode = /^[A-Z0-9]{4}\+/.test(result.formatted_address);
          return !isPlusCode && !isFormattedPlusCode;
        });

        if (filteredResult) {
          const address = filteredResult.formatted_address;
          if (locationType === "pickup") {
            setPickupAddress(address);
          } else {
            setDeliveryAddress(address);
          }
        } else {
          setLocationError("No se pudo convertir la ubicación en dirección legible");
        }
      } else {
        setLocationError("No se pudo convertir la ubicación en dirección");
      }
    } catch (error) {
      console.error("Error obteniendo ubicación:", error);
      setLocationError("Error al obtener la ubicación");
    } finally {
      setIsLoadingCurrentLocation(false);
    }
  };

  // Función para obtener los precios desde la API
  const fetchPrices = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        console.error("No se encontró token de autenticación");
        return null;
      }

      const response = await fetch(`${BASE_URL}precios/activos`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Precios obtenidos:", data);
      return data.data; // Devolver el array de objetos de precio
    } catch (error) {
      console.error("Error al obtener precios:", error);
      return null;
    }
  };

  // Función para determinar el tipo de tarifa según la hora actual
  // Function to check if a date is a Peruvian holiday
  const isPeruvianHoliday = (date) => {
    // Get the date in format MMDD for easy comparison
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const day = date.getDate();
    const year = date.getFullYear();

    // Format as "MM-DD"
    const mmdd = `${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`;

    // Lista de feriados colombianos (formato MM-DD)
    const peruvianHolidays = [
      "01-01", // Año Nuevo
      "04-06", // Jueves Santo (esto varía cada año)
      "04-07", // Viernes Santo (esto varía cada año)
      "05-01", // Día del Trabajo
      "06-29", // San Pedro y San Pablo
      "07-28", // Día de la Independencia
      "07-29", // Fiestas Patrias
      "08-30", // Santa Rosa de Lima
      "10-08", // Combate de Angamos
      "11-01", // Todos los Santos
      "12-08", // Inmaculada Concepción
      "12-25", // Navidad
    ];

    // Añade aquí más lógica para feriados que cambian de fecha cada año

    return peruvianHolidays.includes(mmdd);
  };

  // Función actualizada para determinar el tipo de tarifa
  const determineTariffType = () => {
    const now = new Date();
    const hour = now.getHours();

    // Verificar si es un feriado peruano
    if (isPeruvianHoliday(now)) {
      return "festivo";
    }

    // Verificar si es de noche (entre 8 PM y 6 AM)
    if (hour >= 20 || hour < 6) {
      return "noche";
    }

    // Por defecto es tarifa de día
    return "dia";
  };

  // Función modificada para obtener el precio por km y el precio base
  const getPricingData = (prices, vehicleType, tariffType) => {
    if (!prices || !vehicleType || !tariffType) {
      return { pricePerKm: null, basePrice: 0 };
    }

    const rolRider = `rider.${vehicleType}`;

    const relevantPrice = prices.find(
      (price) =>
        price.rol_rider === rolRider &&
        price.tipo_tarifa === tariffType &&
        price.estado === "activo"
    );

    if (!relevantPrice) {
      return { pricePerKm: null, basePrice: 0 };
    }

    return {
      pricePerKm: parseFloat(relevantPrice.precio),
      basePrice: relevantPrice.precio_base
        ? parseFloat(relevantPrice.precio_base)
        : 0,
    };
  };

  // Función auxiliar para convertir grados a radianes
  const toRad = (value) => {
    return (value * Math.PI) / 180;
  };

  // Función mejorada para calcular distancia usando la fórmula Haversine
  const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    // Verificar que las coordenadas son números válidos
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      console.log(
        "Coordenadas inválidas para cálculo Haversine, usando valor predeterminado"
      );
      return 3.0; // Valor predeterminado en caso de coordenadas inválidas
    }

    const R = 6371; // Radio de la Tierra en km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Añadir un factor de corrección para simular rutas reales (1.2 = 20% más largo que línea recta)
    return distance * 1.2;
  };

  // Función para obtener coordenadas desde una dirección usando Geocoding API
  const getCoordinatesFromAddress = async (address) => {
    if (!address || address.trim() === "") {
      console.log("Dirección vacía, no se pueden obtener coordenadas");
      return null;
    }

    try {
      console.log("Obteniendo coordenadas para:", address);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();
      console.log("Respuesta de Geocoding:", data.status);

      if (data.status === "OK" && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        console.log("Coordenadas obtenidas:", location);
        return {
          lat: location.lat,
          lng: location.lng,
        };
      }

      // Si no se encontraron resultados, devolver coordenadas por defecto
      console.log(
        "No se encontraron coordenadas, usando coordenadas por defecto"
      );
      return { lat: -12.046374, lng: -77.042793 };
    } catch (error) {
      console.error("Error obteniendo coordenadas:", error);
      return { lat: -12.046374, lng: -77.042793 };
    }
  };

  // Función mejorada para calcular la distancia entre dos ubicaciones
  const calculateDistance = async (origin, destination) => {
    if (
      !origin ||
      !destination ||
      origin.trim() === "" ||
      destination.trim() === ""
    ) {
      console.log("Origen o destino no válidos para calcular distancia");
      return 3.0; // Distancia predeterminada como fallback
    }

    try {
      console.log(`Calculando distancia entre: ${origin} y ${destination}`);
      const originEncoded = encodeURIComponent(origin);
      const destinationEncoded = encodeURIComponent(destination);

      // Primer intento: Usar Distance Matrix API
      try {
        console.log("Llamando a Distance Matrix API...");
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originEncoded}&destinations=${destinationEncoded}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`
        );

        const data = await response.json();
        console.log("Respuesta de Distance Matrix:", data.status);

        if (data.status === "OK" && data.rows[0].elements[0].status === "OK") {
          const distanceInMeters = data.rows[0].elements[0].distance.value;
          const distanceInKm = distanceInMeters / 1000;
          console.log(`Distancia calculada por API: ${distanceInKm} km`);
          return distanceInKm;
        } else {
          console.log(
            "Distance Matrix API no pudo calcular la distancia, usando método alternativo"
          );
          throw new Error("API no disponible, usando cálculo alternativo");
        }
      } catch (distanceMatrixError) {
        console.log(
          "Error con Distance Matrix, usando método alternativo:",
          distanceMatrixError
        );

        // Segundo intento: Geocoding + Haversine
        try {
          console.log("Obteniendo coordenadas para cálculo alternativo...");
          const originCoords = await getCoordinatesFromAddress(origin);
          const destCoords = await getCoordinatesFromAddress(destination);

          if (originCoords && destCoords) {
            const distance = calculateHaversineDistance(
              originCoords.lat,
              originCoords.lng,
              destCoords.lat,
              destCoords.lng
            );
            console.log(`Distancia calculada por Haversine: ${distance} km`);
            return distance;
          } else {
            throw new Error("No se pudieron obtener coordenadas");
          }
        } catch (geocodingError) {
          console.log(
            "Error obteniendo coordenadas para Haversine:",
            geocodingError
          );
          throw new Error("No se pudo calcular la distancia por ningún método");
        }
      }
    } catch (error) {
      console.error("Error calculando distancia:", error);

      // Como último recurso, retornar una distancia estimada
      console.log("Usando distancia estimada como último recurso");

      // Hacer la estimación un poco aleatoria para simular distintas distancias
      const baseDistance = 3.0; // Distancia base en km
      const randomVariation = Math.random() * 4; // Variación aleatoria de 0-4 km
      const estimatedDistance = baseDistance + randomVariation;
      console.log(`Distancia estimada final: ${estimatedDistance} km`);

      return estimatedDistance;
    }
  };

  // Añadir una función auxiliar para verificar la validez de la API key
  const verifyApiKey = async () => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.status === "REQUEST_DENIED") {
        console.error(
          "Google Maps API Key inválida o con restricciones:",
          data.error_message
        );
        showAlert("Hay un problema con el acceso a los servicios de mapas. Contacta al soporte técnico.");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error verificando API key:", error);
      return false;
    }
  };

  // Función mejorada para calcular el precio total
  const calculateTotalPrice = async () => {
    if (pickupAddress && deliveryAddress && pricePerKm !== null) {
      setIsCalculatingPrice(true);
      setPriceError(null);

      try {
        console.log(
          "Calculando precio para:",
          vehicleType,
          "tarifa:",
          tariffType
        );

        // Intentar obtener distancia con reintentos
        let distance = null;
        let attempts = 0;
        const maxAttempts = 2;

        while (distance === null && attempts < maxAttempts) {
          attempts++;
          try {
            distance = await calculateDistance(pickupAddress, deliveryAddress);
          } catch (distanceError) {
            console.log(`Intento ${attempts} fallido:`, distanceError);

            if (attempts >= maxAttempts) {
              // Usar un valor predeterminado después de agotar intentos
              distance = 5.0;
              console.log(
                `Usando distancia predeterminada después de ${maxAttempts} intentos: ${distance}km`
              );
            }
          }
        }

        if (distance !== null && distance > 0) {
          setDistanceInKm(distance);

          // Obtener el precio del servicio seleccionado (si existe)
          const servicePrice = selectedServiceId
            ? (() => {
              const selectedService = availableServices.find(
                (s) => s.id.toString() === selectedServiceId
              );
              return selectedService ? parseFloat(selectedService.precio) || 0 : 0;
            })()
            : 0;

          // Calcular precio total (precio base + distancia * precio por km + precio servicio)
          let calculatedPrice =
            basePrice + distance * pricePerKm + servicePrice;
          // Aplicar tarifa mínima si es necesario
          const MINIMUM_FARE = 5.0; // Tarifa mínima en Pesos
          calculatedPrice = Math.max(calculatedPrice, MINIMUM_FARE);

          // Redondear a 2 decimales
          const finalPrice = parseFloat(calculatedPrice.toFixed(0));
          totalPriceRaw.current = finalPrice;
          const formattedPrice = finalPrice.toLocaleString("es-CO");
          setTotalPrice(formattedPrice);

          console.log(
            `Precio calculado: $ ${finalPrice} (Base: $ ${basePrice} + ${distance.toFixed(
              2
            )} km x ${pricePerKm} $ km + Servicio: $ ${servicePrice})`
          );

          // También guardar la distancia para uso posterior
          await AsyncStorage.setItem("distance", distance.toString());
        } else {
          // Nunca debería llegar aquí con los cambios realizados
          console.error("Distancia inválida:", distance);
          setPriceError(
            "No se pudo calcular la distancia entre las ubicaciones."
          );
          setTotalPrice("");
        }
      } catch (error) {
        console.error("Error calculando precio total:", error);
        setPriceError(
          "Ocurrió un error al calcular el precio. Intenta de nuevo."
        );

        // Siempre calcular un precio aproximado para no bloquear al usuario
        try {
          // Usamos una distancia estimada si falló el cálculo
          const estimatedDistance = 5.0; // Valor estimado en km
          setDistanceInKm(estimatedDistance);

          // Obtener el precio del servicio seleccionado (si existe)
          const servicePrice = selectedServiceId
            ? parseFloat(serviceDetails.precio_kilometro) || 0
            : 0;

          let estimatedPrice =
            basePrice + estimatedDistance * pricePerKm + servicePrice;
          estimatedPrice = Math.max(estimatedPrice, 5.0); // Tarifa mínima

          const finalPrice = parseFloat(estimatedPrice.toFixed(0));
          totalPriceRaw.current = finalPrice;
          const formattedPrice = finalPrice.toLocaleString("es-CO");
          setTotalPrice(formattedPrice);

          console.log(
            `Usando precio estimado: $ ${finalPrice} (Base: $ ${basePrice} + distancia estimada de ${estimatedDistance} km + Servicio: $ ${servicePrice})`
          );
        } catch (fallbackError) {
          console.error(
            "Error al intentar calcular precio estimado:",
            fallbackError
          );
          setTotalPrice("");
        }
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
        // 1. LÓGICA DINÁMICA DE PAÍS
        // Verificamos si la URL actual pertenece a Colombia
        const currentUrlStr = BASE_URL.toString();
        const countryCode = "co";


        // (Opcional) Log para verificar qué país está buscando
        console.log(`📍 Buscando dirección en: ${countryCode.toUpperCase()}`);

        const encodedQuery = encodeURIComponent(text.trim());

        const locationBias = `&location=${lat},${lng}&radius=50000`;


        // 2. INYECTAMOS EL CÓDIGO DE PAÍS DINÁMICO
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedQuery}&components=country:${countryCode}${locationBias}&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        const predictions = data.predictions || [];

        // Filtro para eliminar Plus Codes y descripciones vacías
        const filtered = predictions.filter(item => {
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
        // 1. LÓGICA DINÁMICA DE PAÍS
        // Verificamos si la URL actual es de Colombia
        const currentUrlStr = BASE_URL.toString();
        const countryCode = "co";

        // console.log(`🚚 Buscando entrega en: ${countryCode.toUpperCase()}`);

        const encodedQuery = encodeURIComponent(text.trim());

        // Agrega locationBias si lo necesitas más adelante
        const locationBias = "";

        // 2. INYECTAMOS EL CÓDIGO DE PAÍS
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedQuery}&components=country:${countryCode}${locationBias}&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        const predictions = data.predictions || [];

        const filtered = predictions.filter(item => {
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
    if (coords) setDeliveryCoord(coords);
  };
  // Cargar precios al montar el componente
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Cargar precios
        const priceData = await fetchPrices();
        if (priceData) {
          setPrices(priceData);
        }

        // Cargar configuración de usuario
        await fetchUserPaymentSettings();

        setTariffType(determineTariffType());

        // Verificar API key
        verifyApiKey();

        // Actualizar el tipo de tarifa cada minuto
        const intervalId = setInterval(() => {
          setTariffType(determineTariffType());
        }, 60000); // 60000 ms = 1 minuto

        return () => clearInterval(intervalId);
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
      }
    };

    loadInitialData();
  }, []);

  // Función para obtener configuración de usuario
  const fetchUserPaymentSettings = async () => {
    try {
      setLoadingUserSettings(true);
      const token = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");

      if (!token || !userData) {
        console.log("No se encontró token o datos de usuario");
        return;
      }

      const userId = JSON.parse(userData).id;

      const response = await fetch(`${BASE_URL}usuario/${userId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error HTTP! Estado: ${response.status}`);
      }

      const data = await response.json();

      if (data.status && data.data) {
        setUserPaymentSettings(data.data);
        console.log("Configuración de usuario cargada:", data.data);
      }
    } catch (error) {
      console.error("Error obteniendo configuración de usuario:", error);
    } finally {
      setLoadingUserSettings(false);
    }
  };

  // Actualizar el precio por km y el precio base cuando cambia el tipo de vehículo o tarifa
  useEffect(() => {
    if (prices.length > 0 && vehicleType) {
      const { pricePerKm, basePrice } = getPricingData(
        prices,
        vehicleType,
        tariffType
      );
      console.log(
        `Precio por km para ${vehicleType} en horario ${tariffType}: ${pricePerKm}`
      );
      console.log(
        `Precio base para ${vehicleType} en horario ${tariffType}: ${basePrice}`
      );
      setPricePerKm(pricePerKm);
      setBasePrice(basePrice);
    }
  }, [prices, vehicleType, tariffType]);
  // Calcular precio cuando se ingresan ambas direcciones y hay un precio por km disponible
  useEffect(() => {
    if (pickupAddress && deliveryAddress && pricePerKm !== null) {
      calculateTotalPrice();
    } else {
      setTotalPrice("");
    }
  }, [pickupAddress, deliveryAddress, pricePerKm, basePrice]);

  useEffect(() => {
    const getSelectedServiceId = async () => {
      try {
        const serviceId = await AsyncStorage.getItem("selectedServiceId");
        if (serviceId) {
          setSelectedServiceId(serviceId);
          fetchServiceDetails(serviceId);
        }
      } catch (error) {
        console.error("Error retrieving selected service ID:", error);
      }
    };

    const fetchServiceDetails = async (serviceId) => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          console.error("No se encontró token de autenticación");
          return;
        }

        const response = await fetch(`${BASE_URL}services/${serviceId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();
        if (data && data.service) {
          setServiceDetails(data.service);

          // Solo guardar valores que no sean null o undefined
          if (data.service.nombre_servicio) {
            await AsyncStorage.setItem(
              "serviceName",
              data.service.nombre_servicio
            );
          }

          await AsyncStorage.setItem("serviceId", serviceId);
        } else {
          console.log(
            "No se encontraron detalles del servicio en la respuesta:",
            data
          );
        }
      } catch (error) {
        console.error("Error fetching service details:", error);
      }
    };

    getSelectedServiceId();
  }, []);

  useEffect(() => {
    const saveDistance = async () => {
      try {
        if (distance !== null) {
          await AsyncStorage.setItem("distance", distance.toString());
        }
      } catch (error) {
        console.error("Error saving distance:", error);
      }
    };

    saveDistance();
  }, [distance]); // Función modificada para llamar a la API cuando se hace clic en "Pagar"
  const handleContinue = async () => {
    // Validar que se hayan ingresado ambas direcciones
    if (!pickupAddress.trim() || !deliveryAddress.trim()) {
      showAlert("Por favor ingresa tanto la dirección de recogida como la dirección de destino.");
      return;
    }

    // Validar que se haya seleccionado un método de pago
    if (!paymentMethod) {
      showAlert("Por favor selecciona un método de pago antes de continuar.");
      return;
    }

    // Validar que haya un precio calculado
    if (!totalPrice) {
      showAlert("No se ha podido calcular el precio del servicio. Por favor verifica las direcciones ingresadas.");
      return;
    }

    try {
      // Crear la carrera en el backend
      await crearCarrera();
      // El modal de éxito se muestra dentro de crearCarrera() si todo sale bien
    } catch (error) {
      console.error("Error en el proceso:", error);
      setErrorModalVisible(true);
    }
  };

  const handleVehicleSelect = (type) => {
    console.log(`Seleccionando vehículo: ${type}`);
    setVehicleType(type);
    // Clear category if switching to a different vehicle type
    setServiceCategory(null);
    // Reset selectedServiceId
    setSelectedServiceId(null);
    setServiceDetails({ nombre_servicio: "", precio_kilometro: 0 });

    // Selection bounce animation
    const idx = type === "taxi" ? 0 : 1;
    if (providerCardAnims[idx]) {
      Animated.sequence([
        Animated.spring(providerCardAnims[idx], { toValue: 0.92, useNativeDriver: true, friction: 8 }),
        Animated.spring(providerCardAnims[idx], { toValue: 1, useNativeDriver: true, friction: 4, tension: 120 }),
      ]).start();
    }

    // Fetch services for the selected vehicle type
    fetchServicesByVehicleType(type);
  };

  const handleServiceSelect = (service) => {
    console.log(`Datos completos del servicio:`, service);

    if (service.icono) {
      console.log(`Icono del servicio: ${service.icono}`);
      console.log(`URL completa: ${BASE_URL}${service.icono}`);
    } else {
      console.log(`El servicio no tiene icono`);
    }

    setSelectedServiceId(service.id.toString());
    console.log("servicio", service.id.toString())
    setServiceDetails({
      nombre_servicio: service.nombre || "",
      precio_kilometro: service.precio || 0,
    });

    // Selection bounce animation
    const idx = availableServices.findIndex(s => s.id.toString() === service.id.toString());
    if (idx >= 0 && serviceCardAnims[idx]) {
      Animated.sequence([
        Animated.spring(serviceCardAnims[idx], { toValue: 0.92, useNativeDriver: true, friction: 8 }),
        Animated.spring(serviceCardAnims[idx], { toValue: 1, useNativeDriver: true, friction: 4, tension: 120 }),
      ]).start();
    }

    // Store service info in AsyncStorage con verificaciones
    AsyncStorage.setItem("selectedServiceId", service.id.toString());

    if (service.nombre) {
      AsyncStorage.setItem("serviceName", service.nombre);
    }

  };

  useEffect(() => {
    if (pickupAddress && deliveryAddress && pricePerKm !== null && selectedServiceId) {
      calculateTotalPrice();
    }
  }, [selectedServiceId]);

  const handleServiceCategorySelect = (category) => {
    setServiceCategory(category);
  };
  const handlePaymentMethodSelect = (method) => {
    // Si el usuario no puede pagar en efectivo y selecciona efectivo, no permitir
    if (
      method === "efectivo" &&
      userPaymentSettings &&
      !userPaymentSettings.puede_pagar_efectivo
    ) {
      showAlert("El pago en efectivo no está disponible para tu cuenta. Por favor selecciona otro método de pago.");
      return;
    }

    setPaymentMethod(method);
  };
  // Primero, asegúrate de limpiar cualquier dato previo en AsyncStorage al inicio

  // Modifica el primer useEffect (donde cargas los precios) para limpiar los datos previos
  useEffect(() => {
    const loadPrices = async () => {
      // Limpiar estados guardados de sesiones anteriores
      await AsyncStorage.removeItem("selectedServiceId");
      await AsyncStorage.removeItem("serviceName");

      // Restablecer estados locales
      setSelectedServiceId(null);
      setVehicleType(null);
      setServiceDetails({ nombre_servicio: "", precio_kilometro: 0 });

      // Continuar cargando los precios normalmente
      const priceData = await fetchPrices();
      if (priceData) {
        setPrices(priceData);
      }

      // Cargar configuración de usuario
      await fetchUserPaymentSettings();
    };

    loadPrices();
    setTariffType(determineTariffType());

    // Verificar API key
    verifyApiKey();

    // Actualizar el tipo de tarifa cada minuto
    const intervalId = setInterval(() => {
      setTariffType(determineTariffType());
    }, 60000); // 60000 ms = 1 minuto

    return () => clearInterval(intervalId);
  }, []);

  // --- ANIMACIONES ---
  const sheetEntryAnim = useRef(new Animated.Value(1)).current;
  const providerCardAnims = useRef([0, 1].map(() => new Animated.Value(0))).current;
  const serviceCardAnims = useRef([]);
  const priceAnim = useRef(new Animated.Value(1)).current;
  const priceFadeAnim = useRef(new Animated.Value(0)).current;
  const [priceHighlight, setPriceHighlight] = useState(false);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(sheetEntryAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.stagger(120, providerCardAnims.map(anim =>
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 })
    )).start();
  }, []);

  useEffect(() => {
    if (vehicleType && availableServices.length > 0) {
      const anims = availableServices.map((_, i) => {
        if (!serviceCardAnims[i]) serviceCardAnims[i] = new Animated.Value(0);
        return serviceCardAnims[i];
      });
      Animated.stagger(80, anims.map(anim =>
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 })
      )).start();
    }
  }, [vehicleType, availableServices.length]);

  const isButtonActive = selectedServiceId && paymentMethod && totalPrice && !isCalculatingPrice && !isCreatingRide;

  useEffect(() => {
    if (isButtonActive) {
      Animated.timing(priceFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.delay(4500),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      shimmerAnim.setValue(0);
    }
  }, [isButtonActive]);

  useEffect(() => {
    if (totalPrice) {
      Animated.sequence([
        Animated.timing(priceAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
        Animated.spring(priceAnim, { toValue: 1, useNativeDriver: true, friction: 3, tension: 120 }),
      ]).start();
      setPriceHighlight(true);
      const timer = setTimeout(() => setPriceHighlight(false), 400);
      return () => clearTimeout(timer);
    }
  }, [totalPrice]);

  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const shimmerInterpolation = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 360],
  });

  // Render principal
  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* MAPA */}
      <View style={[styles.mapHero, pinMode ? { flex: 1 } : { height: mapHeight }]}>
        <MapView
          ref={mapRef}
          style={styles.mapFull}
          region={mapRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          loadingIndicatorColor="#fa6205"
          onRegionChangeComplete={(region) => {
            if (!ignoreNextRegionChange) setMapRegion(region);
            else setIgnoreNextRegionChange(false);
          }}
        >
          {pickupCoord && (
            <Marker coordinate={pickupCoord} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.markerPickup}>
                <View style={styles.markerPickupInner} />
              </View>
            </Marker>
          )}
          {deliveryCoord && (
            <Marker coordinate={deliveryCoord} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.markerDest}>
                <View style={styles.markerDestGlow} />
                <View style={styles.markerDestInner} />
              </View>
            </Marker>
          )}
          {routeCoords.length > 0 && (
            <>
              <Polyline coordinates={routeCoords} strokeWidth={6} strokeColor="rgba(250,98,5,0.15)" />
              <Polyline coordinates={routeCoords} strokeWidth={3} strokeColor="#fa6205" />
            </>
          )}
        </MapView>

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBackBtn} onPress={goBack}>
            <Ionicons name="arrow-back" size={20} color="#1C1C1E" />
          </TouchableOpacity>
          <View style={styles.brandPill}>
            <View style={styles.brandDot} />
            <Text style={styles.brandText}>CarBy</Text>
          </View>
        </View>

        {/* Pin mode overlay */}
        {pinMode && (
          <>
            <View style={styles.pinCenterOverlay} pointerEvents="none">
              <View style={styles.pinCenterContent}>
                <Ionicons name="location" size={38} color="#fa6205" />
                <Text style={styles.pinHintText}>Mueve el mapa para ajustar el pin</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.centerLocationButton}
              onPress={() => {
                if (userLocationRef.current && mapRef.current) {
                  mapRef.current.animateToRegion({
                    ...userLocationRef.current,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }, 500);
                }
              }}
            >
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#1C1C1E" />
            </TouchableOpacity>
          </>
        )}

      </View>

      {/* BOTTOM SHEET */}
      <Animated.View style={[styles.sheet, pinMode && styles.sheetPin, !pinMode && { transform: [{ translateY: sheetEntryAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 600] }) }] }]}>
        <View style={styles.dragHandle} />

        {pinMode ? (
          <View style={styles.pinActionBar}>
            <TouchableOpacity style={styles.pinBtnCancel} onPress={cancelPinMode}>
              <Text style={styles.pinBtnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={confirmPinLocation}>
              <Ionicons name="checkmark" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Confirmar ubicación</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <>
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          ref={sheetScrollRef}
        >
          {/* TRIP CARD */}
          <View>
            <Text style={styles.displayTitle}>Solicita tu transporte</Text>
            <Text style={styles.displaySubtitle}>Completa los datos para tu pedido.</Text>

            <View style={styles.tripCard}>
              <View style={styles.tripConnector} />
              <View style={styles.tripField}>
                <View style={styles.tripDotOuter} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripFieldLabel}>Recogida</Text>
                  <TextInput
                    style={styles.tripFieldInput}
                    placeholder="¿Dónde te recogemos?"
                    placeholderTextColor="#999"
                    value={pickupAddress}
                    onChangeText={(text) => searchPickupAddress(text)}
                    onFocus={() => setShowPickupSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPickupSuggestions(false), 200)}
                  />
                </View>
                <TouchableOpacity onPress={() => openLocationPicker(true)} style={styles.tripMapBtn}>
                  <Ionicons name="map-outline" size={18} color="#1C1C1E" />
                </TouchableOpacity>
              </View>
              {showPickupSuggestions && pickupSuggestions.length > 0 && (
                <View style={styles.tripSuggestions}>
                  {pickupSuggestions.map((item) => (
                    <TouchableOpacity key={item.place_id} onPress={() => selectPickupAddress(item)} style={styles.tripSuggestionItem}>
                      <Ionicons name="location-outline" size={16} color="#888" style={{ marginRight: 8 }} />
                      <Text style={styles.suggestionText} numberOfLines={2}>{item.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.tripField}>
                <View style={[styles.tripDotOuter, styles.tripDotDest]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tripFieldLabel, styles.tripFieldLabelDest]}>Destino final</Text>
                  <TextInput
                    style={styles.tripFieldInput}
                    placeholder="¿A dónde vas?"
                    placeholderTextColor="#999"
                    value={deliveryAddress}
                    onChangeText={(text) => searchDeliveryAddress(text)}
                    onFocus={() => setShowDeliverySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowDeliverySuggestions(false), 200)}
                  />
                </View>
                <TouchableOpacity onPress={() => openLocationPicker(false)} style={styles.tripMapBtn}>
                  <Ionicons name="map-outline" size={18} color="#fa6205" />
                </TouchableOpacity>
              </View>
              {showDeliverySuggestions && deliverySuggestions.length > 0 && (
                <View style={styles.tripSuggestions}>
                  {deliverySuggestions.map((item) => (
                    <TouchableOpacity key={item.place_id} onPress={() => selectDeliveryAddress(item)} style={styles.tripSuggestionItem}>
                      <Ionicons name="location-outline" size={16} color="#888" style={{ marginRight: 8 }} />
                      <Text style={styles.suggestionText} numberOfLines={2}>{item.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <Text style={styles.tripHelpText}>Toca el ícono del mapa para elegir el punto exacto.</Text>
          </View>

          {/* PROVIDER (ride-option style) */}
          <View style={styles.sectionSpacer}>
            <Text style={styles.sectionTitle}>Elige tu tipo de vehículo</Text>
            <View style={styles.providerList}>
              {userRole !== "comercio" && (
                <Animated.View style={{ transform: [{ scale: providerCardAnims[0] }], opacity: providerCardAnims[0] }}>
                  <TouchableOpacity
                    style={[styles.providerCard, vehicleType === "taxi" && styles.providerCardActive]}
                    onPress={() => handleVehicleSelect("taxi")}
                    activeOpacity={0.9}
                  >
                    <View style={[styles.providerIconBox, vehicleType === "taxi" && styles.providerIconBoxActive]}>
                      <MaterialCommunityIcons
                        name="car"
                        size={26}
                        color={vehicleType === "taxi" ? "#fa6205" : "#1C1C1E"}
                      />
                    </View>
                    <View style={styles.providerInfo}>
                      <View style={styles.providerNameRow}>
                        <Text style={styles.providerName}>Particular</Text>
                        <View style={styles.providerPassengerBadge}>
                          <Ionicons name="people" size={10} color="#1C1C1E" />
                          <Text style={styles.providerPassengerText}>4</Text>
                        </View>
                      </View>
                      <Text style={styles.providerTagline}>Transporte de personas</Text>
                    </View>
                    <View style={styles.providerPriceCol}>
                      {vehicleType === "taxi" && (
                        <View style={styles.providerCheckBadge}>
                          <Text style={styles.providerCheckText}>Elegido</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              )}
              <Animated.View style={{ transform: [{ scale: providerCardAnims[1] }], opacity: providerCardAnims[1] }}>
                <TouchableOpacity
                  style={[styles.providerCard, vehicleType === "moto" && styles.providerCardActive]}
                  onPress={() => handleVehicleSelect("moto")}
                  activeOpacity={0.9}
                >
                  <View style={[styles.providerIconBox, vehicleType === "moto" && styles.providerIconBoxActive]}>
                    <MaterialCommunityIcons
                      name="motorbike"
                      size={26}
                      color={vehicleType === "moto" ? "#fa6205" : "#1C1C1E"}
                    />
                  </View>
                  <View style={styles.providerInfo}>
                    <View style={styles.providerNameRow}>
                      <Text style={styles.providerName}>Delivery</Text>
                      <View style={styles.providerPassengerBadge}>
                        <Ionicons name="person" size={10} color="#1C1C1E" />
                        <Text style={styles.providerPassengerText}>1</Text>
                      </View>
                    </View>
                    <Text style={styles.providerTagline}>Mensajería y envío de paquetes</Text>
                  </View>
                    <View style={styles.providerPriceCol}>
                      {vehicleType === "moto" && (
                        <View style={styles.providerCheckBadge}>
                          <Text style={styles.providerCheckText}>Elegido</Text>
                        </View>
                      )}
                    </View>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

          {/* SERVICE */}
          {vehicleType && (
          <View style={{ marginTop: 16 }}>
            <View style={styles.serviceCards}>
              {isLoadingServices ? (
                <ActivityIndicator size="small" color="#fa6205" style={{ marginVertical: 16 }} />
              ) : availableServices.length > 0 ? (
                availableServices.map((service, i) => {
                  const selected = selectedServiceId === service.id.toString();
                  const cardAnim = serviceCardAnims[i] || new Animated.Value(1);
                  if (!serviceCardAnims[i]) serviceCardAnims[i] = cardAnim;
                  return (
                    <Animated.View key={service.id} style={{ transform: [{ scale: cardAnim }], opacity: cardAnim }}>
                    <TouchableOpacity
                      style={[styles.serviceCard, selected && styles.serviceCardActive]}
                      onPress={() => handleServiceSelect(service)}
                    >
                      <View style={[styles.serviceCardIcon, selected ? styles.serviceCardIconActive : null]}>
                        {service.icono ? (
                          <Image source={{ uri: service.icono.startsWith("http") ? service.icono : `${BASE_URL.toString().replace("/api", "")}storage/${service.icono}` }} style={styles.serviceCardImg} />
                        ) : (
                          <MaterialCommunityIcons name="package-variant-closed" size={20} color={selected ? "#FFF" : "#fa6205"} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceCardName}>{service.nombre}</Text>
                        <Text style={styles.serviceCardDetail}>Precio/km: ${(service.precio || 0).toLocaleString()}</Text>
                      </View>
                      {selected && <Ionicons name="checkmark-circle" size={22} color="#fa6205" />}
                    </TouchableOpacity>
                    </Animated.View>
                  );
                })
              ) : (
                <Text style={styles.noServicesText}>No hay servicios disponibles</Text>
              )}
            </View>

            {/* Observaciones */}
            <Text style={styles.sectionLabel}>OBSERVACIONES</Text>
            <TextInput
              style={styles.observationsInput}
              placeholder="Indicaciones adicionales..."
              placeholderTextColor="#999"
              value={observations}
              onChangeText={setObservations}
              multiline
            />

          </View>
          )}
        </ScrollView>

        {/* FOOTER ACTION BAR */}
        <View style={styles.footerBar}>
          {selectedServiceId && (
          <View style={styles.biddingArea}>
            <View style={styles.biddingHeader}>
              <Text style={styles.biddingLabel}>Tu oferta de precio</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={styles.biddingSuggested}>Sugerido:</Text>
                <Text style={[styles.biddingSuggestedValue, priceHighlight && { color: "#fa6205" }]}>$ {totalPrice}</Text>
              </View>
            </View>
            <View style={styles.biddingControls}>
              <TouchableOpacity style={styles.biddingBtn} activeOpacity={0.7}>
                <Ionicons name="remove" size={20} color="#1C1C1E" />
              </TouchableOpacity>
              <View style={styles.biddingPriceRow}>
                <Text style={styles.biddingDollarSign}>$</Text>
                <Animated.Text style={[styles.biddingPrice, { transform: [{ scale: priceAnim }] }, priceHighlight && { color: "#fa6205" }]}>
                  {totalPrice}
                </Animated.Text>
              </View>
              <TouchableOpacity style={[styles.biddingBtn, styles.biddingBtnPlus]} activeOpacity={0.7}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          )}

          {selectedServiceId && (
          <TouchableOpacity style={styles.footerPaymentSelector} onPress={() => setShowPaymentDropdown(true)} activeOpacity={0.7}>
            <View style={styles.footerPaymentIcon}>
              <MaterialCommunityIcons
                name={paymentMethod === "efectivo" ? "cash" : "credit-card"}
                size={18}
                color={paymentMethod ? "#fa6205" : "#888"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.footerPaymentLabel, !paymentMethod && { color: "#888" }]}>
                {paymentMethod === "efectivo" ? "Efectivo" : paymentMethod === "tarjeta" ? textoPago : "Método de pago"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#888" />
          </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { overflow: "hidden" }, (!selectedServiceId || !paymentMethod || !totalPrice || isCalculatingPrice || isCreatingRide) && styles.primaryBtnDisabled]}
            disabled={!selectedServiceId || !paymentMethod || !totalPrice || isCalculatingPrice || isCreatingRide}
            onPress={handleContinue}
          >
            {isCreatingRide ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Animated.View style={{ flexDirection: "row", alignItems: "center", transform: [{ scale: isButtonActive ? pulseAnimation : 1 }] }}>
                <Text style={styles.primaryBtnText}>
                  {totalPrice ? `Ofrecer $ ${totalPrice}` : "Solicitar transporte"}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
              </Animated.View>
            )}
                {isButtonActive && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: 120,
                zIndex: 1,
                transform: [{ translateX: shimmerInterpolation }, { skewX: "-20deg" }],
              }}
            >
              <LinearGradient
                colors={["transparent", "rgba(255,255,255,0.35)", "transparent"]}
                locations={[0, 0.5, 1]}
                style={{ flex: 1 }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </Animated.View>
            )}
          </TouchableOpacity>
        </View>
        </>
        )}
      </Animated.View>

      {/* Modal éxito */}
      <AlertaModal
        visible={isModalVisible}
        tipo="success"
        mensaje="Tu solicitud ha sido enviada. Un conductor la tomará pronto."
        onCerrar={() => { setModalVisible(false); navigation.goBack(); }}
        onPrimary={() => {
          setModalVisible(false);
          navigation.goBack();
          setTimeout(() => navigation.getParent()?.navigate("Pedidos"), 200);
        }}
        primaryLabel="Ver mis viajes"
      />

      {/* Modal error */}
      <AlertaModal
        visible={isErrorModalVisible}
        mensaje="No se pudo crear la carrera. Intenta de nuevo."
        onCerrar={() => setErrorModalVisible(false)}
      />

      {/* Modal alertas (reemplazo de Alert.alert) */}
      <AlertaModal
        visible={alertVisible}
        tipo={alertData.type}
        mensaje={alertData.message}
        onCerrar={() => setAlertVisible(false)}
        onPrimary={alertData.onPrimary}
        primaryLabel={alertData.primaryLabel}
      />

      {/* Payment Modal */}
      <Modal
        isVisible={showPaymentDropdown}
        onBackdropPress={() => setShowPaymentDropdown(false)}
        style={styles.paymentModal}
        backdropOpacity={0.4}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        animationInTiming={400}
        animationOutTiming={300}
        useNativeDriverForBackdrop
      >
        <View style={styles.paymentModalSheet}>
          <View style={styles.paymentModalHandle} />
          <Text style={styles.paymentModalTitle}>Método de pago</Text>
          <View style={styles.paymentModalOptions}>
            {!loadingUserSettings && userPaymentSettings && userPaymentSettings.puede_pagar_efectivo && (
              <TouchableOpacity
                style={[styles.paymentModalOption, paymentMethod === "efectivo" && styles.paymentModalOptionActive]}
                onPress={() => { handlePaymentMethodSelect("efectivo"); setShowPaymentDropdown(false); }}
              >
                <MaterialCommunityIcons name="cash" size={20} color="#1C1C1E" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.paymentModalOptionText}>Efectivo</Text>
                  <Text style={styles.paymentModalOptionSub}>Paga al recibir</Text>
                </View>
                {paymentMethod === "efectivo" && (
                  <Ionicons name="checkmark-circle" size={22} color="#fa6205" />
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.paymentModalOption, paymentMethod === "tarjeta" && styles.paymentModalOptionActive]}
              onPress={() => { handlePaymentMethodSelect("tarjeta"); setShowPaymentDropdown(false); }}
            >
              <MaterialCommunityIcons name="credit-card" size={20} color="#1C1C1E" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.paymentModalOptionText}>{textoPago}</Text>
                <Text style={styles.paymentModalOptionSub}>Pago digital</Text>
              </View>
              {paymentMethod === "tarjeta" && (
                <Ionicons name="checkmark-circle" size={22} color="#fa6205" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isCreatingRide && (
        <View style={styles.globalLoadingContainer}>
          <View style={styles.globalLoadingContent}>
            <ActivityIndicator size="large" color="#fa6205" />
            <Text style={styles.globalLoadingText}>Creando servicio...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F5F0E8",
    paddingTop: Platform.OS === "android" ? 40 : 0,
  },
  // --- MAPA ---
  markerPickup: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerPickupInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1C1C1E",
  },
  markerDest: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  markerDestGlow: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(250,98,5,0.25)",
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  markerDestInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#fa6205",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  mapHero: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#E5E0D8",
  },
  mapFull: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: "absolute",
    top: Platform.OS === "android" ? 36 : 4,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 20,
  },
  topBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fa6205",
    marginRight: 6,
  },
  brandText: {
    fontSize: 11,
    fontFamily: "MontserratSemiBold",
    color: "#1C1C1E",
    letterSpacing: 1,
  },

  // --- Sugerencias ---
  suggestionsDropdown: {
    marginTop: 6,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 4,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: "#F0EDE8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F2EC",
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: "MontserratRegular",
    color: "#444",
    flex: 1,
  },

  // --- Pin mode ---
  pinCenterOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 30,
  },
  pinCenterContent: {
    alignItems: "center",
    marginTop: -40,
  },
  pinHintText: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: "MontserratRegular",
    color: "#1C1C1E",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: "hidden",
  },
  pinActions: {
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
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  pinCancelText: {
    fontSize: 15,
    fontFamily: "MontserratSemiBold",
    color: "#1C1C1E",
  },
  pinConfirmBtn: {
    flex: 1,
    backgroundColor: "#fa6205",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
  },
  pinConfirmText: {
    fontSize: 15,
    fontFamily: "MontserratSemiBold",
    color: "#FFF",
  },
  centerLocationButton: {
    position: "absolute",
    bottom: 80,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 30,
  },

  // --- BOTTOM SHEET ---
  sheet: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  sheetPin: {
    flex: 0,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  pinActionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 12,
  },
  pinBtnCancel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#EAE5DC",
    backgroundColor: "#FFFFFF",
  },
  pinBtnCancelText: {
    fontSize: 16,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E0D8",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 100,
  },

  // --- Tipografía display ---
  displayTitle: {
    fontSize: 32,
    fontFamily: "MontserratBold",
    fontStyle: "italic",
    color: "#1C1C1E",
    lineHeight: 36,
  },
  displayTitleSmall: {
    fontSize: 26,
    fontFamily: "MontserratBold",
    fontStyle: "italic",
    color: "#1C1C1E",
    lineHeight: 30,
  },
  displaySubtitle: {
    fontSize: 13,
    fontFamily: "MontserratRegular",
    color: "#888888",
    marginTop: 6,
    marginBottom: 20,
  },
  servicePretitle: {
    fontSize: 11,
    fontFamily: "MontserratSemiBold",
    color: "#fa6205",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "MontserratSemiBold",
    color: "#888888",
    letterSpacing: 1.5,
    marginTop: 18,
    marginBottom: 8,
  },

  // --- Trip step (route-selector style) ---
  tripCard: {
    position: "relative",
    backgroundColor: "#FAFAFA",
    borderRadius: 20,
    padding: 16,
    paddingLeft: 20,
  },
  tripConnector: {
    position: "absolute",
    left: 26,
    top: 36,
    width: 2,
    height: 36,
    backgroundColor: "#C9C2B5",
    borderRadius: 1,
  },
  tripField: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    paddingLeft: 28,
  },
  tripDotOuter: {
    position: "absolute",
    left: 0,
    top: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: "#1C1C1E",
    backgroundColor: "#FAFAFA",
  },
  tripDotDest: {
    borderColor: "#fa6205",
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  tripFieldLabel: {
    fontSize: 9,
    fontFamily: "MontserratBold",
    color: "#888888",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  tripFieldLabelDest: {
    color: "#fa6205",
  },
  tripFieldInput: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
    padding: 0,
    marginTop: 2,
  },
  tripMapBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    shadowColor: "#C9C2B5",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  tripSuggestions: {
    marginTop: 8,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 4,
    maxWidth: "100%",
    borderWidth: 1,
    borderColor: "#F0EDE8",
  },
  tripSuggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F2EC",
  },
  tripHelpText: {
    fontSize: 12,
    fontFamily: "MontserratRegular",
    color: "#888888",
    marginTop: 16,
  },

  // --- Provider step (ride-option style) ---
  providerList: {
    marginTop: 8,
  },
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245,240,232,0.4)",
    borderRadius: 24,
    padding: 12,
    paddingRight: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  providerCardActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#fa6205",
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  providerIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    backgroundColor: "#FFFFFF",
    shadowColor: "#C9C2B5",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  providerIconBoxActive: {
    backgroundColor: "#FFF0E5",
    shadowOpacity: 0.3,
  },
  providerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  providerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  providerName: {
    fontSize: 18,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
  },
  providerPassengerBadge: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  providerPassengerText: {
    fontSize: 10,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
  },
  providerTagline: {
    fontSize: 12,
    fontFamily: "MontserratBold",
    color: "#888888",
    marginTop: 4,
  },
  providerPriceCol: {
    flexDirection: "column",
    alignItems: "flex-end",
    marginLeft: 8,
  },
  providerPrice: {
    fontSize: 22,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
    letterSpacing: -0.5,
  },
  providerCheckBadge: {
    backgroundColor: "#fa6205",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  providerCheckText: {
    fontSize: 9,
    fontFamily: "MontserratBold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionSpacer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
    marginBottom: 12,
  },

  // --- Service step ---
  routeSummaryCard: {
    position: "relative",
    backgroundColor: "rgba(245,240,232,0.6)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAE5DC",
    marginTop: 4,
    marginBottom: 16,
  },
  routeSummaryConnector: {
    position: "absolute",
    left: 27,
    top: 38,
    width: 0,
    height: 22,
    borderLeftWidth: 2,
    borderStyle: "dashed",
    borderColor: "#C9C2B5",
  },
  routeSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  tripDotOuterSmall: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: "#fa6205",
    backgroundColor: "#FFF",
    marginRight: 12,
  },
  routeSummaryLabel: {
    fontSize: 10,
    fontFamily: "MontserratSemiBold",
    color: "#888888",
    letterSpacing: 1.3,
  },
  routeSummaryValue: {
    fontSize: 13,
    fontFamily: "MontserratRegular",
    color: "#1C1C1E",
    marginTop: 2,
  },

  serviceCards: {
    marginTop: 0,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245,240,232,0.4)",
    borderRadius: 18,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EAE5DC",
  },
  serviceCardActive: {
    borderColor: "#fa6205",
    backgroundColor: "rgba(255,240,229,0.6)",
  },
  serviceCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF0E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  serviceCardIconActive: {
    backgroundColor: "#fa6205",
  },
  serviceCardImg: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
  serviceCardName: {
    fontSize: 16,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
  },
  serviceCardDetail: {
    fontSize: 12,
    fontFamily: "MontserratRegular",
    color: "#888888",
    marginTop: 2,
  },
  noServicesText: {
    fontSize: 14,
    fontFamily: "MontserratRegular",
    color: "#888888",
    textAlign: "center",
    paddingVertical: 16,
  },

  // --- Observaciones ---
  observationsInput: {
    backgroundColor: "rgba(245,240,232,0.6)",
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    fontFamily: "MontserratRegular",
    color: "#1C1C1E",
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#EAE5DC",
  },

  // --- Payment selector (dropdown) ---
  paymentSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245,240,232,0.5)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#EAE5DC",
  },
  paymentSelectorIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF0E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  paymentSelectorName: {
    fontSize: 14,
    fontFamily: "MontserratSemiBold",
    color: "#1C1C1E",
  },
  paymentSelectorDetail: {
    fontSize: 12,
    fontFamily: "MontserratRegular",
    color: "#888888",
    marginTop: 1,
  },
  paymentDropdown: {
    marginTop: 8,
    backgroundColor: "rgba(245,240,232,0.5)",
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: "#EAE5DC",
  },
  paymentDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  paymentDropdownItemActive: {
    backgroundColor: "#FFF0E5",
  },
  paymentDropdownText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "MontserratSemiBold",
    color: "#1C1C1E",
    marginLeft: 10,
  },

  // --- Price summary ---
  priceSummary: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 20,
    marginBottom: 4,
  },
  priceSummaryTotal: {
    fontSize: 28,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
  },
  priceSummaryDistance: {
    fontSize: 14,
    fontFamily: "MontserratRegular",
    color: "#888888",
    marginLeft: 10,
  },
  priceSummaryPrompt: {
    fontSize: 14,
    fontFamily: "MontserratRegular",
    color: "#888888",
  },

  // --- Confirmed ---
  confirmedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0E5",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 16,
  },
  confirmedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fa6205",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  confirmedText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "MontserratSemiBold",
    color: "#1C1C1E",
  },
  confirmedPrice: {
    fontSize: 16,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
  },

  // --- Footer action bar ---
  footerBar: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EAE5DC",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fa6205",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: "#C9C2B5",
    shadowOpacity: 0,
    elevation: 0,
  },
  biddingArea: {
    backgroundColor: "#F5F5F7",
    borderWidth: 1,
    borderColor: "#E8E8ED",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  biddingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  biddingLabel: {
    fontSize: 13,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
  },
  biddingSuggested: {
    fontSize: 9,
    fontFamily: "MontserratBold",
    color: "#888888",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  biddingSuggestedValue: {
    fontSize: 10,
    fontFamily: "MontserratBold",
    color: "#fa6205",
  },
  biddingControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  biddingBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E8ED",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  biddingBtnMinus: {},
  biddingBtnPlus: {
    backgroundColor: "#1C1C1E",
    borderColor: "#1C1C1E",
  },
  biddingPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  biddingDollarSign: {
    fontSize: 16,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
  },
  biddingPrice: {
    fontSize: 28,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
    letterSpacing: -0.5,
  },
  footerPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginBottom: 10,
  },
  footerPriceTotal: {
    fontSize: 26,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
  },
  footerPriceDistance: {
    fontSize: 14,
    fontFamily: "MontserratRegular",
    color: "#888888",
    marginLeft: 8,
  },
  footerPricePrompt: {
    fontSize: 14,
    fontFamily: "MontserratRegular",
    color: "#888888",
  },
  footerPaymentSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderWidth: 1,
    borderColor: "#E8E8ED",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  footerPaymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  footerPaymentLabel: {
    fontSize: 14,
    fontFamily: "MontserratSemiBold",
    color: "#1C1C1E",
  },
  paymentModal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  paymentModalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 8,
  },
  paymentModalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E0E0E0",
    alignSelf: "center",
    marginBottom: 20,
  },
  paymentModalTitle: {
    fontSize: 22,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  paymentModalOptions: {
    gap: 10,
  },
  paymentModalOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  paymentModalOptionActive: {
    borderColor: "#fa6205",
    backgroundColor: "#FFFFFF",
  },
  paymentModalOptionText: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
  },
  paymentModalOptionSub: {
    fontSize: 12,
    fontFamily: "MontserratRegular",
    color: "#888888",
    marginTop: 2,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "MontserratBold",
    color: "#FFFFFF",
  },

  // --- Loading global ---
  globalLoadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  globalLoadingContent: {
    backgroundColor: "#FFF",
    paddingHorizontal: 28,
    paddingVertical: 22,
    borderRadius: 16,
    alignItems: "center",
  },
  globalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "MontserratSemiBold",
    color: "#1C1C1E",
  },
});