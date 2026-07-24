import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AlertaModal from "../../components/ErrorModal";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform
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
  // Collapsible bottom sheet
  const [isSheetExpanded, setIsSheetExpanded] = useState(true);
  const sheetAnimation = useRef(new Animated.Value(1)).current;
  const toggleSheet = useCallback(() => {
    const toValue = isSheetExpanded ? 0 : 1;
    Animated.timing(sheetAnimation, { toValue, duration: 250, useNativeDriver: false }).start();
    setIsSheetExpanded(!isSheetExpanded);
  }, [isSheetExpanded, sheetAnimation]);
  /////
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
  // Optimiza la función centerMapOnUserLocation para respuesta inmediata
  // Versión corregida de centerMapOnUserLocation para React Native
  const centerMapOnUserLocation = async () => {
    try {
      Alert.alert("Ubicándote...", "", [{ text: "OK", style: "cancel" }], {
        cancelable: true,
      });

      Location.requestForegroundPermissionsAsync().then(({ status }) => {
        if (status !== "granted") {
          Alert.alert("Permiso denegado", "No se pudo acceder a tu ubicación.");
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
                Alert.alert("Error", "No se pudo obtener tu ubicación actual.");
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
      Alert.alert(
        "Error",
        "No se pudo crear la carrera. Por favor, intenta nuevamente."
      );
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
        Alert.alert(
          "Problema con la API",
          "Hay un problema con el acceso a los servicios de mapas. Contacta al soporte técnico."
        );
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
    setPickupAddress(item.description);
    setShowPickupSuggestions(false);
    const coords = await geocodePlaceId(item.place_id);
    if (coords) setPickupCoord(coords);
  };

  const selectDeliveryAddress = async (item) => {
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
      Alert.alert(
        "Direcciones requeridas",
        "Por favor ingresa tanto la dirección de recogida como la dirección de destino."
      );
      return;
    }

    // Validar que se haya seleccionado un método de pago
    if (!paymentMethod) {
      Alert.alert(
        "Método de pago requerido",
        "Por favor selecciona un método de pago antes de continuar."
      );
      return;
    }

    // Validar que haya un precio calculado
    if (!totalPrice) {
      Alert.alert(
        "Error de cálculo",
        "No se ha podido calcular el precio del servicio. Por favor verifica las direcciones ingresadas."
      );
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
      Alert.alert(
        "Método no disponible",
        "El pago en efectivo no está disponible para tu cuenta. Por favor selecciona otro método de pago."
      );
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

  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Crea un bucle de animación infinito
    Animated.loop(
      Animated.sequence([
        // Aumenta el tamaño a 1.05
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 700,
          useNativeDriver: true,
        }),
        // Vuelve al tamaño original
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Luego, actualiza los modales para darles contenido real
  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* MAPA - siempre visible como fondo */}
      <View style={styles.mapHero}>
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
          {pickupCoord && <Marker coordinate={pickupCoord} pinColor="#fa6205" title="Recogida" />}
          {deliveryCoord && <Marker coordinate={deliveryCoord} pinColor="#FF4757" title="Destino" />}
          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#fa6205" />
          )}
        </MapView>

        {/* Pills editables de recogida/destino */}
        <View style={styles.mapOverlay}>
          <View style={styles.mapPillGroup}>
            <View style={styles.mapSearchPill}>
              <Ionicons name="location" size={18} color="#fa6205" />
              <TextInput
                style={styles.mapSearchInputInline}
                placeholder="¿Dónde te recogemos?"
                placeholderTextColor="#999"
                value={pickupAddress}
                onChangeText={(text) => searchPickupAddress(text)}
                onFocus={() => setShowPickupSuggestions(true)}
              />
              <TouchableOpacity onPress={() => openLocationPicker(true)} style={styles.mapPinBtn}>
                <Ionicons name="map-outline" size={20} color="#fa6205" />
              </TouchableOpacity>
            </View>
            {showPickupSuggestions && pickupSuggestions.length > 0 && (
              <View style={styles.suggestionsDropdown}>
                {pickupSuggestions.map((item) => (
                  <TouchableOpacity key={item.place_id} onPress={() => selectPickupAddress(item)} style={styles.suggestionItem}>
                    <Text style={styles.suggestionText}>{item.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.mapPillGroup}>
            <View style={styles.mapSearchPill}>
              <Ionicons name="flag" size={18} color="#FF4757" />
              <TextInput
                style={styles.mapSearchInputInline}
                placeholder="¿A dónde vas?"
                placeholderTextColor="#999"
                value={deliveryAddress}
                onChangeText={(text) => searchDeliveryAddress(text)}
                onFocus={() => setShowDeliverySuggestions(true)}
              />
              <TouchableOpacity onPress={() => openLocationPicker(false)} style={styles.mapPinBtn}>
                <Ionicons name="map-outline" size={20} color="#FF4757" />
              </TouchableOpacity>
            </View>
            {showDeliverySuggestions && deliverySuggestions.length > 0 && (
              <View style={styles.suggestionsDropdown}>
                {deliverySuggestions.map((item) => (
                  <TouchableOpacity key={item.place_id} onPress={() => selectDeliveryAddress(item)} style={styles.suggestionItem}>
                    <Text style={styles.suggestionText}>{item.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
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

            <View style={styles.pinActions}>
              <TouchableOpacity style={styles.pinCancelBtn} onPress={cancelPinMode}>
                <Text style={styles.pinCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pinConfirmBtn} onPress={confirmPinLocation}>
                <Text style={styles.pinConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>

            {/* Botón centrar ubicación */}
            <TouchableOpacity style={styles.centerLocationButton} onPress={() => {
              if (userLocationRef.current && mapRef.current) {
                mapRef.current.animateToRegion({
                  ...userLocationRef.current,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }, 500);
              }
            }}>
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#1C1C1E" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* BOTTOM SHEET */}
      <Animated.View style={[styles.bottomSheet, { maxHeight: sheetAnimation.interpolate({ inputRange: [0, 1], outputRange: [140, 450] }) }]}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={22} color="#1C1C1E" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sheetHeaderCenter} onPress={toggleSheet} activeOpacity={0.7}>
            <View style={styles.dragHandle} />
            <Text style={styles.title}>Solicita tu transporte</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleSheet} style={styles.chevronBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={isSheetExpanded ? "chevron-down" : "chevron-up"} size={18} color="#888" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.bottomSheetContent} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {/* Vehicle pills - siempre visibles */}
          <View style={styles.vehiclePills}>
            {userRole !== "comercio" && (
              <TouchableOpacity
                style={[styles.pill, vehicleType === "taxi" && styles.pillActive]}
                onPress={() => handleVehicleSelect("taxi")}
              >
                <MaterialCommunityIcons name="car" size={18} color={vehicleType === "taxi" ? "#FFF" : "#1C1C1E"} />
                <Text style={[styles.pillText, vehicleType === "taxi" && styles.pillTextActive]}>Particular</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.pill, vehicleType === "moto" && styles.pillActive]}
              onPress={() => handleVehicleSelect("moto")}
            >
              <MaterialCommunityIcons name="motorbike" size={18} color={vehicleType === "moto" ? "#FFF" : "#1C1C1E"} />
              <Text style={[styles.pillText, vehicleType === "moto" && styles.pillTextActive]}>Delivery</Text>
            </TouchableOpacity>
          </View>

          {/* Contenido expandible */}
          <Animated.View style={{ opacity: sheetAnimation, maxHeight: sheetAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, 2000] }), overflow: "hidden" }}>

            {/* Services */}
            {vehicleType && (
              <View>
                {isLoadingServices ? (
                  <ActivityIndicator size="small" color="#fa6205" style={{ marginVertical: 10 }} />
                ) : availableServices.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll} nestedScrollEnabled>
                    {availableServices.map((service) => (
                      <TouchableOpacity
                        key={service.id}
                        style={[styles.serviceCard, selectedServiceId === service.id.toString() && styles.serviceCardActive]}
                        onPress={() => handleServiceSelect(service)}
                      >
                        {service.icono ? (
                          <Image source={{ uri: service.icono.startsWith("http") ? service.icono : `${BASE_URL.toString().replace("/api", "")}storage/${service.icono}` }} style={styles.serviceCardIcon} />
                        ) : (
                          <MaterialCommunityIcons name="package-variant" size={24} color="#1C1C1E" />
                        )}
                        <Text style={[styles.serviceCardText, selectedServiceId === service.id.toString() && styles.serviceCardTextActive]}>{service.nombre}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.noServicesText}>No hay servicios disponibles</Text>
                )}
              </View>
            )}

            {/* Address + Payment + Price - solo si hay servicio seleccionado */}
            {selectedServiceId ? (
              <>
                {/* Observaciones */}
                <View style={styles.observationsContainer}>
                  <Text style={styles.addressLabel}>Observaciones</Text>
                  <TextInput style={styles.observationsInput} placeholder="Indicaciones adicionales..." placeholderTextColor="#999" value={observations} onChangeText={setObservations} multiline />
                </View>

                {/* Payment */}
                <Text style={styles.sectionTitle}>Método de pago</Text>
                <View style={styles.paymentContainer}>
                  {!loadingUserSettings && userPaymentSettings && userPaymentSettings.puede_pagar_efectivo && (
                    <TouchableOpacity style={styles.paymentOption} onPress={() => handlePaymentMethodSelect("efectivo")}>
                      <View style={styles.paymentIconContainer}><MaterialCommunityIcons name="cash" size={20} color="#1C1C1E" /></View>
                      <Text style={styles.paymentText}>Efectivo</Text>
                      <View style={[styles.radioButton, paymentMethod === "efectivo" && styles.radioButtonSelected]}>{paymentMethod === "efectivo" && <MaterialCommunityIcons name="check" size={16} color="#FFF" />}</View>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.paymentOption} onPress={() => handlePaymentMethodSelect("tarjeta")}>
                    <View style={styles.paymentIconContainer}><MaterialCommunityIcons name="credit-card" size={20} color="#1C1C1E" /></View>
                    <Text style={styles.paymentText}>{textoPago}</Text>
                    <View style={[styles.radioButton, paymentMethod === "tarjeta" && styles.radioButtonSelected]}>{paymentMethod === "tarjeta" && <MaterialCommunityIcons name="check" size={16} color="#FFF" />}</View>
                  </TouchableOpacity>
                  {!loadingUserSettings && !paymentMethod && (
                    <Text style={styles.paymentInfoText}>Selecciona un método de pago para continuar</Text>
                  )}
                </View>

                {/* Price + Solicitar */}
                <View style={styles.footer}>
                  <View style={styles.priceContainer}>
                    {isCalculatingPrice ? (
                      <ActivityIndicator size="small" color="#fa6205" />
                    ) : totalPrice ? (
                      <>
                        <Text style={styles.totalPrice}>$ {totalPrice}</Text>
                        {distanceInKm ? <Text style={styles.distanceText}>{distanceInKm.toFixed(2)} km</Text> : null}
                      </>
                    ) : (
                      <Text style={styles.totalPricePrompt}>Ingresa las direcciones</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.payButton, (!totalPrice || isCalculatingPrice || isCreatingRide || !paymentMethod || !pickupAddress.trim() || !deliveryAddress.trim()) && styles.payButtonDisabled]}
                    onPress={handleContinue}
                    disabled={!totalPrice || isCalculatingPrice || isCreatingRide || !paymentMethod || !pickupAddress.trim() || !deliveryAddress.trim()}
                  >
                    {isCreatingRide ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.payButtonText}>Solicitar</Text>}
                  </TouchableOpacity>
                </View>
              </>
            ) : vehicleType ? (
              <View style={styles.serviceRequiredContainer}>
                <Ionicons name="alert-circle-outline" size={24} color="#FF9500" />
                <Text style={styles.serviceRequiredText}>Selecciona un servicio para continuar</Text>
              </View>
            ) : null}

          </Animated.View>
        </ScrollView>
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
    backgroundColor: "#F2F2F7",
    paddingTop: Platform.OS === "android" ? 40 : 0,
  },
  // NUEVOS ESTILOS MAPA + BOTTOM SHEET
  mapHero: {
    flex: 1,
    minHeight: 200,
  },
  mapFull: {
    ...StyleSheet.absoluteFillObject,
  },
  mapBackBtn: {
    position: "absolute",
    top: 10,
    left: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  mapOverlay: {
    position: "absolute",
    top: 10,
    left: 15,
    right: 15,
    gap: 8,
  },
  mapSearchPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  mapSearchText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
  },
  bottomSheet: {
    backgroundColor: "#F2F2F7",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 2,
  },
  backBtn: {
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  chevronBtn: {
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  sheetHeaderCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CCC",
    alignSelf: "center",
    position: "absolute",
    top: 6,
    left: "50%",
    marginLeft: -18,
  },
  bottomSheetContent: {
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  vehiclePills: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#DDD",
  },
  pillActive: {
    backgroundColor: "#fa6205",
    borderColor: "#fa6205",
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  pillText: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
  },
  pillTextActive: {
    color: "#FFF",
  },
  servicesScroll: {
    marginBottom: 8,
    maxHeight: 90,
  },
  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#DDD",
    minWidth: 72,
  },
  serviceCardActive: {
    backgroundColor: "#fa6205",
    borderColor: "#fa6205",
  },
  serviceCardIcon: {
    width: 28,
    height: 28,
    marginBottom: 4,
    resizeMode: "contain",
  },
  serviceCardText: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: "#1C1C1E",
    textAlign: "center",
  },
  serviceCardTextActive: {
    color: "#FFF",
  },
  mapBtn: {
    padding: 8,
  },
  // ESTILOS EXISTENTES
  scrollView: {
    // El fondo se hereda de safeContainer
  },
  container: {
    flex: 1,
    padding: 20,
  },

  ///
  // Estilos del mapa y búsqueda
  mapSearchContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#DDD", // Borde claro sobre fondo oscuro
  },
  mapSearchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  mapSearchIcon: {
    marginRight: 5,
  },
  mapSearchInput: {
    flex: 1,
    marginTop: 5,
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    height: 50,
    color: "#1C1C1E",
    backgroundColor: '#FFFFFF',
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 10,
    fontFamily: "MontserratBold",
  },
  mapSearchClearButton: {
    padding: 5,
  },
  mapSearchResultsContainer: {
    backgroundColor: "#FFFFFF", // Fondo blanco para los resultados
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#DDDDDD",
  },
  mapSearchResultsScroll: {
    maxHeight: 200,
  },
  mapSearchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#DDDDDD",
  },
  mapSearchResultIcon: {
    marginRight: 10,
  },
  mapSearchResultText: {
    fontSize: 14,
    fontFamily: "MontserratRegular",
    flex: 1,
    color: "#000000", // Texto negro sobre fondo blanco
  },
  // Estilos del modal del mapa
  mapModal: {
    margin: 0,
    justifyContent: "flex-end",
  },
  mapModalContent: {
    backgroundColor: "#F2F2F7", // Fondo oscuro para el modal
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "100%",
    width: "100%",
  },
  mapModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#DDD",
  },
  mapModalTitle: {
    fontSize: 18,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapPinOverlay: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  mapInstructions: {
    backgroundColor: "rgba(230, 230, 230, 0.9)", // Fondo claro para las instrucciones
    padding: 8,
    color: "#000000", // Texto negro
    marginHorizontal: 5,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "MontserratRegular",
  },
  mapButtonContainer: {
    padding: 15,
    backgroundColor: "#F2F2F7", // Para que coincida con el fondo del modal
  },
  mapButton: {
    backgroundColor: "#fa6205", // Nuevo verde
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
  },
  mapButtonDisabled: {
    backgroundColor: "#555",
    opacity: 0.7,
  },
  mapButtonText: {
    color: "#000", // Texto negro para buen contraste con el nuevo verde
    fontSize: 16,
    fontFamily: "MontserratBold",
  },
  selectCenterButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    backgroundColor: "#ECECEC", // Botón oscuro
    borderRadius: 30,
    padding: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  centerMarker: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
    borderRadius: 10,
    backgroundColor: "rgba(250, 98, 5, 0.5)", // Nuevo verde con transparencia
    borderWidth: 2,
    borderColor: "#fa6205", // Nuevo verde
    justifyContent: "center",
    alignItems: "center",
  },
  centerMarkerInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fa6205", // Nuevo verde
  },
  mapSearchResultsContainerInline: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#DDDDDD",
  },
  mapSearchResultsScrollInline: {
    maxHeight: 200,
  },
  fullLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  centerLocationButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#ECECEC",
    borderRadius: 30,
    padding: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  // Pin mode manual
  pinCenterOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  pinCenterContent: {
    alignItems: "center",
    marginTop: -19,
  },
  pinHintText: {
    fontSize: 11,
    fontFamily: "MontserratRegular",
    color: "#000",
    backgroundColor: "rgba(255,255,255,0.8)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
    overflow: "hidden",
  },
  pinActions: {
    position: "absolute",
    bottom: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 10,
    zIndex: 5,
  },
  pinCancelBtn: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  pinCancelText: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    color: "#666",
  },
  pinConfirmBtn: {
    flex: 2,
    backgroundColor: "#fa6205",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  pinConfirmText: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    color: "#000",
  },
  mapSearchInputInline: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#1C1C1E",
    paddingVertical: 2,
  },
  mapPinBtn: {
    padding: 4,
  },
  mapPillGroup: {
    marginBottom: 0,
  },
  suggestionsDropdown: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    marginTop: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 8,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 4,
    fontFamily: "MontserratRegular",
    color: "#666",
  },
  vehicleOptions: {
    marginBottom: 20,
  },
  vehicleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#fa6205",
    marginTop: 10,
    paddingVertical: 12,
    justifyContent: "center",
  },
  selectedTextVehicle: {

  },
  vehicleButtonSelected: {
    backgroundColor: "#fa6205",
  },
  mototaxiButton: {
    backgroundColor: "#fa6205",
  },
  taxiButton: {
    backgroundColor: "#fa6205",
  },
  vehicleButtonText: {
    color: "#1C1C1E", // Texto negro para contraste
    fontFamily: "MontserratBold",
    width: "100%",
    textAlign: 'center',
  },
  selectedVehicleButtonText: {
    color: "#1C1C1E"
  },
  serviceRequiredContainer: {
    borderWidth: 1,
    borderColor: "#FF9500",
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    alignItems: "center",
    borderStyle: "dashed",
    backgroundColor: "rgba(255, 149, 0, 0.1)",
  },
  serviceRequiredText: {
    textAlign: "center",
    marginTop: 6,
    fontFamily: "MontserratRegular",
    fontSize: 13,
    color: "#FF9500",
  },
  alertIcon: {
    marginBottom: 10,
  },
  // Estilos para servicios
  servicesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  serviceButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#fa6205",
    marginBottom: 10,
    width: "48%",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 90,
  },
  serviceButtonSelected: {
    backgroundColor: "#fa6205", // Nuevo verde para el seleccionado
    borderWidth: 1,
    borderColor: "#fa6205",
  },
  serviceButtonText: {
    color: "#1C1C1E",
    textAlign: "center",
    fontFamily: "MontserratRegular",
  },
  selectedServiceButtonText: {
    color: "#1C1C1E",
    textAlign: "center",
    fontFamily: "MontserratRegular",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontFamily: "MontserratRegular",
    color: "#1C1C1E",
  },
  noServicesText: {
    textAlign: "center",
    fontFamily: "MontserratRegular",
    marginBottom: 8,
    color: "#999",
    fontSize: 12,
  },
  servicePriceText: {
    color: "#888", // Gris claro
    fontSize: 14,
    fontFamily: "MontserratRegular",
    marginTop: 2,
  },
  categoryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    flexWrap: "wrap",
  },
  categoryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#fa6205",
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  mandadoButton: { backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#fa6205" },
  pagosButton: { backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#fa6205" },
  paquetesButton: { backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#fa6205", flex: 1, marginRight: 10, },
  personasButton: { backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#fa6205", flex: 1, },
  categoryButtonSelected: {
    backgroundColor: "#fa6205",
    borderWidth: 1,
    borderColor: "#fa6205",
  },
  categoryButtonText: {
    color: "#1C1C1E", // Texto blanco, cambiar a negro en el seleccionado
    textAlign: "center",
    fontFamily: "MontserratRegular",
  },
  addressContainer: {
    flexDirection: "row",
    borderWidth: 1,
    backgroundColor: "#FFF",
    borderColor: "#fa6205",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderStyle: "dashed",
  },
  iconContainer: {
    marginRight: 10,
    justifyContent: "center",
  },
  addressInputContainer: {
    flex: 1,
    position: "relative",
  },
  addressLabel: {
    fontSize: 14,
    marginBottom: 0,
    fontFamily: "Montserrat_600SemiBold",
    color: "#1C1C1E",
  },
  locationInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  currentLocationButtonTopRight: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 20,
  },
  locationErrorText: {
    color: "#FF3B30", // Mantenemos el rojo para errores
    fontSize: 12,
    marginTop: 4,
    fontFamily: "MontserratRegular",
  },
  observationsContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD",
    padding: 12,
    marginBottom: 10,
  },
  observationsText: {
    fontFamily: "MontserratRegular",
  },
  paymentContainer: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#fa6205",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderStyle: "dashed",
  },
  serviceIcon: {
    width: 40,
    height: 40,
    marginBottom: 6,
    alignSelf: "center",
    backgroundColor: "transparent",
  },
  serviceIconDefault: {
    alignSelf: "center",
    marginBottom: 6,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  paymentIconContainer: {
    backgroundColor: "#DDD",
    borderRadius: 7,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  paymentText: {
    flex: 1,
    fontFamily: "MontserratRegular",
    color: "#1C1C1E",
    fontSize: 13,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fa6205",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    backgroundColor: "#fa6205",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  priceContainer: {
    flex: 1,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
  },
  payButton: {
    backgroundColor: "#fa6205",
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 130,
  },
  payButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "500",
    fontFamily: "MontserratBold",
  },
  modalContent: {
    backgroundColor: "#FFFFFF", // Fondo oscuro para modal
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title5: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1C1C1E",
    textAlign: "center",
    fontFamily: "MontserratBold",
  },
  subtitle5: {
    fontSize: 16,
    color: "#777",
    marginBottom: 25,
    textAlign: "center",
    fontFamily: "MontserratRegular",
  },
  title6: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#FF3B30", // Rojo de error
    textAlign: "center",
    fontFamily: "MontserratBold",
  },
  subtitle6: {
    fontSize: 16,
    color: "#777",
    marginBottom: 25,
    textAlign: "center",
    fontFamily: "MontserratRegular",
  },
  button5: {
    backgroundColor: "#fa6205",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  buttonText5: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "MontserratBold",
  },
  suggestionsContainer: {
    backgroundColor: "#FFFFFF", // Fondo claro para sugerencias
    borderRadius: 10,
    marginTop: 5,
    maxHeight: 150,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DDDDDD",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#DDDDDD",
  },
  suggestionText: {
    color: "#000000", // Texto oscuro
    fontSize: 14,
    fontFamily: "MontserratRegular",
  },
  addressValue: {
    marginTop: 5,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 40,
    color: "#1C1C1E",
    backgroundColor: '#FFFFFF',
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 9,
    fontFamily: "MontserratBold",
  },
  loadingIndicator: {
    padding: 15,
  },
  suggestionIcon: {
    marginRight: 10,
  },
  observationsInput: {
    width: "100%",
    fontSize: 14,
    lineHeight: 20,
    minHeight: 50,
    maxHeight: 80,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    color: '#1C1C1E',
    textAlignVertical: "top",
    fontFamily: "MontserratRegular",
    padding: 10,
    marginTop: 6,
  },
  calculatingContainer: {
    alignItems: "center",
  },
  calculatingText: {
    marginTop: 5,
    fontFamily: "MontserratRegular",
    color: "#1C1C1E",
  },
  priceError: {
    color: "#FF3B30",
    fontSize: 16,
    fontFamily: "MontserratRegular",
  },
  totalPricePrompt: {
    fontSize: 13,
    fontFamily: "MontserratRegular",
    color: "#999",
  },
  distanceText: {
    fontSize: 12,
    fontFamily: "MontserratRegular",
    marginTop: 2,
    color: "#777",
  },
  basePriceText: {
    fontSize: 14,
    fontFamily: "MontserratRegular",
    marginTop: 2,
    color: "#777",
  },
  payButtonDisabled: {
    backgroundColor: "#555",
    opacity: 0.7,
  },
  loadingPaymentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
  },
  loadingPaymentText: {
    marginLeft: 10,
    fontFamily: "MontserratRegular",
    color: "#1C1C1E",
  },
  paymentInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 149, 0, 0.1)",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF9500",
    marginTop: 10,
  },
  paymentInfoText: {
    color: "#FF9500",
    marginLeft: 8,
    fontFamily: "MontserratRegular",
    fontSize: 14,
  },
  globalLoadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  globalLoadingContent: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  globalLoadingText: {
    marginTop: 10,
    fontFamily: "MontserratRegular",
    color: "#000000",
  },
  paymentPolicyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#1C1C1E",
    textAlign: "center",
    fontFamily: "MontserratBold",
  },
  paymentPolicyText: {
    fontSize: 16,
    color: "#777",
    marginBottom: 25,
    textAlign: "center",
    lineHeight: 24,
    fontFamily: "MontserratRegular",
  },
  paymentPolicyButton: {
    backgroundColor: "#fa6205",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  paymentPolicyButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "MontserratBold",
  },
  mensajeAyuda: {
    fontSize: 12,
    color: "#666",
  },
  mensajeAyudaSecundaria: {
    fontSize: 12,
    fontStyle: 'italic',
    color: "#999999",
  },
  mensajeAyudaSecundaria2: {
    fontSize: 14,
    fontStyle: 'italic',
    color: "#999999",
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fa6205', // Nuevo verde
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 2,
  },
  actionButtonText: {
    fontFamily: 'MontserratRegular',
    fontSize: 13,
    marginLeft: 8,
    color: '#000',
  },

  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF', // Un gris oscuro para que contraste con el fondo
    borderRadius: 15,
    // Sombra sutil para dar profundidad
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  promptIcon: {
    marginRight: 12,
  },
  promptText: {
    color: '#1C1C1E', // Texto blanco brillante para máxima legibilidad
    fontFamily: 'MontserratBold',
    fontSize: 15,
  },
});