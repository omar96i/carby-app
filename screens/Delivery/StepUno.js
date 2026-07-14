import React, { useEffect, useState, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
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
  Animated
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
import MapView, { Marker } from "react-native-maps";
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
  const [vehicleType, setVehicleType] = useState(null); // "moto", "mototaxi", or "taxi"
  const [serviceCategory, setServiceCategory] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
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
  /////
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: -12.046374,
    longitude: -77.042793,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
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

  const confirmSelectedLocation = async () => {
    if (selectedLocation) {
      const address = await getAddressFromCoordinates(
        selectedLocation.latitude,
        selectedLocation.longitude
      );

      if (isLocationPickup) {
        setPickupAddress(address);
      } else {
        setDeliveryAddress(address);
      }

      setMapModalVisible(false);
      setSelectedLocation(null);
    } else {
      Alert.alert("Error", "Por favor selecciona una ubicación en el mapa");
    }
  };


  // Modifica la función openLocationPicker para usar ubicación precargada
  const openLocationPicker = async (isPickup) => {
    // Mostrar modal inmediatamente, sin esperar por geocodificación
    setIsLocationPickup(isPickup);
    setMapModalVisible(true);

    // Usar ubicación precargada si está disponible (acceso instantáneo)
    if (userLocationRef.current) {
      setMapRegion({
        latitude: userLocationRef.current.latitude,
        longitude: userLocationRef.current.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      // Caso de respaldo: usar coordenadas predeterminadas
      setMapRegion({
        latitude: -12.046374,
        longitude: -77.042793,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Intentar obtener ubicación en segundo plano
      setTimeout(() => {
        Location.requestForegroundPermissionsAsync().then(({ status }) => {
          if (status === "granted") {
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            })
              .then((location) => {
                setMapRegion({
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                });
              })
              .catch((error) => {
                console.log(
                  "Error obteniendo ubicación en segundo plano:",
                  error
                );
              });
          }
        });
      }, 100);
    }
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
        costo: parseFloat(totalPrice),
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
          const finalPrice = parseFloat(calculatedPrice.toFixed(2));
          setTotalPrice(finalPrice.toFixed(2));

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

          const finalPrice = parseFloat(estimatedPrice.toFixed(2));
          setTotalPrice(finalPrice.toFixed(2));

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

  const selectPickupAddress = (item) => {
    setPickupAddress(item.description);
    setShowPickupSuggestions(false);
  };

  const selectDeliveryAddress = (item) => {
    setDeliveryAddress(item.description);
    setShowDeliverySuggestions(false);
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
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <Text style={styles.title}>Solicita tu transporte</Text>

          {/* Paso 1: Selección de tipo de vehículo (siempre visible) */}
          <Text style={styles.sectionTitle}>Seleccione el tipo de vehículo</Text>
          <View style={styles.vehicleOptions}>
            {userRole === "comercio" ? (
              // Mostrar solo moto
              <TouchableOpacity
                style={[
                  styles.vehicleButton,
                  vehicleType === "moto" && styles.vehicleButtonSelected,
                ]}
                onPress={() => handleVehicleSelect("moto")}
              >
                <Text style={[ // <-- CAMBIO AQUÍ
                  styles.vehicleButtonText,
                  vehicleType === "moto" && styles.selectedVehicleButtonText,
                ]}>
                  <MaterialCommunityIcons
                    name="motorbike"
                    size={24}
                    color={vehicleType === "moto" ? "#000" : "#fa6205"} // <-- CAMBIO AQUÍ
                  />
                  {' Moto'}
                </Text>
                {/* Este ícono parece estar fuera de lugar, pero lo mantengo por si tiene un propósito */}
                <MaterialCommunityIcons name="chevron-down" size={20} color={vehicleType === "moto" ? "#000" : "#333"} />
              </TouchableOpacity>
            ) : (
              // Mostrar las 3 opciones
              <>
                <TouchableOpacity
                  style={[
                    styles.vehicleButton,
                    vehicleType === "taxi" && styles.vehicleButtonSelected,
                  ]}
                  onPress={() => handleVehicleSelect("taxi")}
                >
                  <Text style={[ // <-- CAMBIO AQUÍ
                    styles.vehicleButtonText,
                    vehicleType === "taxi" && styles.selectedVehicleButtonText,
                  ]}>
                    <MaterialCommunityIcons
                      name="taxi"
                      size={24}
                      color={vehicleType === "taxi" ? "#000" : "#fa6205"} // <-- CAMBIO AQUÍ
                    />
                    {' Taxi'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.vehicleButton,
                    vehicleType === "moto" && styles.vehicleButtonSelected,
                  ]}
                  onPress={() => handleVehicleSelect("moto")}
                >
                  <Text style={[ // <-- CAMBIO AQUÍ
                    styles.vehicleButtonText,
                    vehicleType === "moto" && styles.selectedVehicleButtonText,
                  ]}>
                    <MaterialCommunityIcons
                      name="motorbike"
                      size={24}
                      color={vehicleType === "moto" ? "#000" : "#fa6205"} // <-- CAMBIO AQUÍ
                    />
                    {' Moto'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.vehicleButton,
                    vehicleType === "mototaxi" && styles.vehicleButtonSelected,
                  ]}
                  onPress={() => handleVehicleSelect("mototaxi")}
                >
                  <Text style={[ // <-- CAMBIO AQUÍ
                    styles.vehicleButtonText,
                    vehicleType === "mototaxi" && styles.selectedVehicleButtonText,
                  ]}>
                    <MaterialCommunityIcons
                      name="rickshaw"
                      size={24}
                      color={vehicleType === "mototaxi" ? "#000" : "#fa6205"} // <-- CAMBIO AQUÍ
                    />
                    {' Mototaxi'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {!vehicleType && (
            <Animated.View style={[
              styles.promptCard,
              { transform: [{ scale: pulseAnimation }] } // Aplicamos la animación aquí
            ]}>
              <MaterialCommunityIcons
                name="hand-pointing-up"
                size={28}
                color="#1C1C1E"
                style={styles.promptIcon}
              />
              <Text style={styles.promptText}>
                ¡Elige tu vehículo para empezar!
              </Text>
            </Animated.View>
          )}

          {/* Paso 2: Mostrar servicios disponibles SOLO si se seleccionó un tipo de vehículo */}
          {vehicleType && (
            <View>
              <Text style={styles.sectionTitle}>Servicios disponibles</Text>
              {isLoadingServices ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#fa6205" />
                  <Text style={styles.loadingText}>Cargando servicios...</Text>
                </View>
              ) : availableServices.length > 0 ? (
                <View style={styles.servicesContainer}>
                  {availableServices.map((service) => (
                    <TouchableOpacity
                      key={service.id}
                      style={[
                        styles.serviceButton,
                        selectedServiceId === service.id.toString() &&
                        styles.serviceButtonSelected,
                      ]}
                      onPress={() => handleServiceSelect(service)}
                    >
                      {service.icono ? (
                        typeof service.icono === "string" ? (
                          service.icono.startsWith("http") ? (
                            // Si la URL es completa
                            <Image
                              source={{ uri: service.icono }}
                              style={styles.serviceIcon}
                              resizeMode="contain"
                              onError={(e) =>
                                console.log(
                                  "Error cargando imagen:",
                                  e.nativeEvent.error
                                )
                              }
                            />
                          ) : (
                            // Si es una ruta relativa, usar la ruta de storage
                            <Image
                              source={{
                                uri: `${BASE_URL.toString().replace("/api", "")}storage/${service.icono}`,
                              }}
                              style={styles.serviceIcon}
                              resizeMode="contain"
                              onError={(e) =>
                                console.log(
                                  "Error cargando imagen storage:",
                                  e.nativeEvent.error,
                                  `${BASE_URL.toString().replace("/api", "")}storage/${service.icono}`
                                )
                              }
                            />
                          )
                        ) : (
                          // Si por alguna razón no es un string
                          <MaterialCommunityIcons
                            name="package-variant"
                            size={30}
                            color="#000"
                            style={styles.serviceIconDefault}
                          />
                        )
                      ) : (
                        // Si no hay icono
                        <MaterialCommunityIcons
                          name="package-variant"
                          size={30}
                          color="#000"
                          style={styles.serviceIconDefault}
                        />
                      )}
                      <Text style={[
                        styles.serviceButtonText,
                        selectedServiceId === service.id.toString() && styles.selectedServiceButtonText
                      ]}>
                        {service.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.noServicesText}>
                  No hay servicios disponibles para este tipo de vehículo
                </Text>
              )}
            </View>
          )}
          <Modal
            isVisible={mapModalVisible}
            backdropOpacity={0.7}
            style={styles.mapModal}
            onBackdropPress={() => setMapModalVisible(false)}
          >
            <View style={styles.mapModalContent}>
              <View style={styles.mapModalHeader}>
                <Text style={styles.mapModalTitle}>
                  {isLocationPickup
                    ? "Selecciona punto de recogida"
                    : "Selecciona punto de destino"}
                </Text>
                <TouchableOpacity onPress={() => setMapModalVisible(false)}>
                  <IconMC name="close" size={24} color="#1C1C1E" />
                </TouchableOpacity>
              </View>

              {/* Buscador de direcciones */}
              <View style={styles.mapSearchContainer}>
                <View style={styles.mapSearchInputContainer}>
                  <Ionicons
                    name="search"
                    size={20}
                    color="#fa6205"
                    style={styles.mapSearchIcon}
                  />
                  <TextInput
                    style={styles.mapSearchInput}
                    placeholder="Buscar dirección..."
                    placeholderTextColor="rgba(161,161,161,0.8)"
                    value={mapSearchQuery}
                    onChangeText={searchMapLocation}
                  />
                  {mapSearchQuery.length > 0 && (
                    <TouchableOpacity
                      style={styles.mapSearchClearButton}
                      onPress={() => {
                        setMapSearchQuery("");
                        setMapSearchResults([]);
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Resultados de búsqueda */}
                {mapSearchResults.map((result) => (
                  <TouchableOpacity
                    key={`${result.recent ? "recent-" : "api-"}${result.place_id}`}
                    style={styles.mapSearchResultItem}
                    onPress={() =>
                      selectMapLocation(result.place_id, result.description)
                    }
                  >
                    <Ionicons
                      name={result.recent ? "time" : "location"}
                      size={18}
                      color={result.recent ? "#FF9500" : "#fa6205"}
                      style={styles.mapSearchResultIcon}
                    />
                    <Text style={styles.mapSearchResultText} numberOfLines={2}>
                      {result.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  region={mapRegion}
                  liteMode={false}
                  showsUserLocation={false}
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
                  loadingBackgroundColor="#222"
                  onRegionChangeComplete={(region) => {
                    if (ignoreNextRegionChange) {
                      setIgnoreNextRegionChange(false); // Consumimos el "ignorar"
                    } else {
                      setMapRegion(region); // Solo actualiza si no fue un setMapRegion manual
                    }
                  }}
                  onPress={(e) => {
                    const now = new Date().getTime();
                    const DOUBLE_PRESS_DELAY = 300;

                    if (lastMapPress && now - lastMapPress < DOUBLE_PRESS_DELAY) {
                      setSelectedLocation(e.nativeEvent.coordinate);

                      Alert.alert(
                        "Ubicación seleccionada",
                        "Punto marcado correctamente en el mapa"
                      );

                      setLastMapPress(0);
                    } else {
                      setLastMapPress(now);
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

                {/* Botón para centrar en mi ubicación */}
                <TouchableOpacity
                  id="centerLocationBtn"
                  style={styles.centerLocationButton}
                  onPress={centerMapOnUserLocation}
                >
                  <Ionicons name="locate" size={28} color="#fa6205" />
                </TouchableOpacity>

                {/* Botón para seleccionar ubicación central */}
                <TouchableOpacity
                  style={styles.selectCenterButton}
                  onPress={() => {
                    // Seleccionar el centro actual del mapa
                    setSelectedLocation({
                      latitude: mapRegion.latitude,
                      longitude: mapRegion.longitude,
                    });

                    // Mostrar confirmación visual
                    Alert.alert(
                      "Ubicación seleccionada",
                      "Punto marcado correctamente en el mapa"
                    );
                  }}
                >
                  <Ionicons name="flag" size={28} color="#fa6205" />
                </TouchableOpacity>

                <View style={styles.mapPinOverlay}>
                  <Text style={styles.mapInstructions}>
                    Mueve el mapa y presiona el botón
                    <Ionicons name="flag" size={16} color="#fa6205" /> para
                    seleccionar la ubicación
                  </Text>
                </View>

                {/* Indicador central opcional */}
                <View style={styles.centerMarker}>
                  <View style={styles.centerMarkerInner} />
                </View>
              </View>

              <View style={styles.mapButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.mapButton,
                    !selectedLocation && styles.mapButtonDisabled,
                  ]}
                  onPress={confirmSelectedLocation}
                  disabled={!selectedLocation}
                >
                  <Text style={styles.mapButtonText}>Confirmar ubicación</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          {/* Paso 3: Mostrar ubicaciones SOLO si se seleccionó un servicio */}
          {selectedServiceId ? (
            <View>
              <Text style={styles.sectionTitle}>Ingreso de ubicaciones</Text>
              {/* Dirección de recogida */}
              <View style={styles.addressContainer}>

                <View style={styles.addressInputContainer}>
                  <Text style={styles.addressLabel}>
                    Ingresa dirección de recogida
                  </Text>
                  <Text style={styles.mensajeAyuda}>
                    Ingresa al menos 4 caracteres para ver sugerencias.
                  </Text>
                  <View style={styles.locationInputRow}>
                    <TextInput
                      style={[styles.addressValue, { flex: 1 }]}
                      placeholder="Buscar dirección..."
                      placeholderTextColor="rgba(161, 161, 161, 1)"
                      value={pickupAddress}
                      onChangeText={(text) => searchPickupAddress(text)}
                    />
                  </View>
                  <Text style={styles.mensajeAyudaSecundaria2}>
                    {pickupAddress ?? ''}
                  </Text>
                  {locationError && (
                    <Text style={styles.locationErrorText}>
                      {locationError}
                    </Text>
                  )}
                  {showPickupSuggestions && (
                    <View style={styles.suggestionsContainer}>
                      {isSearchingPickup ? (
                        <ActivityIndicator
                          size="small"
                          color="#000000ff"
                          style={styles.loadingIndicator}
                        />
                      ) : (
                        pickupSuggestions.map((item) => (
                          <TouchableOpacity
                            key={item.place_id}
                            onPress={() => selectPickupAddress(item)}
                            style={styles.suggestionItem}
                          >
                            <Ionicons
                              name="location"
                              size={16}
                              color="#000"
                              style={styles.suggestionIcon}
                            />
                            <Text style={styles.suggestionText}>
                              {item.description}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                  {/* --- NUEVO CONTENEDOR DE BOTONES --- */}
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => openLocationPicker(true)}>
                      <Ionicons name="map-outline" size={18} color="#000" />
                      <Text style={styles.actionButtonText}>Seleccionar en mapa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => getCurrentLocation("pickup")}
                      disabled={isLoadingCurrentLocation}
                    >
                      {isLoadingCurrentLocation ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <Ionicons name="locate-outline" size={18} color="#000" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              {/* Dirección de entrega */}
              <View style={styles.addressContainer}>
                <View style={styles.addressInputContainer}>
                  <Text style={styles.addressLabel}>
                    Ingresa dirección de llegada
                  </Text>
                  <Text style={styles.mensajeAyuda}>
                    Ingresa al menos 4 caracteres para ver sugerencias.
                  </Text>
                  <View style={styles.locationInputRow}>
                    <TextInput
                      style={[styles.addressValue, { flex: 1 }]}
                      placeholder="Buscar dirección..."
                      placeholderTextColor="rgba(161, 161, 161, 1)"
                      value={deliveryAddress}
                      onChangeText={(text) => searchDeliveryAddress(text)}
                    />
                  </View>
                  <Text style={styles.mensajeAyudaSecundaria2}>
                    {deliveryAddress ?? ''}
                  </Text>
                  {showDeliverySuggestions && (
                    <View style={styles.suggestionsContainer}>
                      {isSearchingDelivery ? (
                        <ActivityIndicator
                          size="small"
                          color="#000"
                          style={styles.loadingIndicator}
                        />
                      ) : (
                        deliverySuggestions.map((item) => (
                          <TouchableOpacity
                            key={item.place_id}
                            onPress={() => selectDeliveryAddress(item)}
                            style={styles.suggestionItem}
                          >
                            <Ionicons
                              name="location"
                              size={16}
                              color="#000"
                              style={styles.suggestionIcon}
                            />
                            <Text style={styles.suggestionText}>
                              {item.description}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                  {/* --- NUEVO CONTENEDOR DE BOTONES --- */}
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => openLocationPicker(false)}>
                      <Ionicons name="map-outline" size={18} color="#000" />
                      <Text style={styles.actionButtonText}>Seleccionar en mapa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        const tempAddr = deliveryAddress;
                        setDeliveryAddress(pickupAddress);
                        setPickupAddress(tempAddr);
                      }}
                      disabled={isLoadingCurrentLocation}
                    >
                      {isLoadingCurrentLocation ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <Ionicons name="swap-vertical" size={18} color="#000" />
                      )}
                    </TouchableOpacity>
                  </View>

                </View>
              </View>
              {/* Observaciones */}
              <View style={styles.observationsContainer}>
                <Text style={styles.addressLabel}>Observaciones</Text>
                <TextInput
                  style={styles.observationsInput}
                  placeholder="Escribe alguna indicación adicional..."
                  placeholderTextColor={"#000"}
                  value={observations}
                  onChangeText={setObservations}
                  multiline
                />
              </View>
              {/* Paso 4: Mostrar método de pago SOLO cuando hay un servicio seleccionado */}
              <Text style={styles.sectionTitle}>Metodo de pago</Text>
              <View style={styles.paymentContainer}>
                {/* Opción de efectivo - Solo mostrar si el usuario puede pagar en efectivo */}
                {!loadingUserSettings &&
                  userPaymentSettings &&
                  userPaymentSettings.puede_pagar_efectivo && (
                    <TouchableOpacity
                      style={styles.paymentOption}
                      onPress={() => handlePaymentMethodSelect("efectivo")}
                    >
                      <View style={styles.paymentIconContainer}>
                        <MaterialCommunityIcons
                          name="cash"
                          size={24}
                          color="#1C1C1E"
                        />
                      </View>
                      <Text style={styles.paymentText}>Efectivo</Text>
                      <View
                        style={[
                          styles.radioButton,
                          paymentMethod === "efectivo" &&
                          styles.radioButtonSelected,
                        ]}
                      >
                        {paymentMethod === "efectivo" && (
                          <MaterialCommunityIcons
                            name="check"
                            size={20}
                            color="#fa6205"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                <TouchableOpacity
                  style={styles.paymentOption}
                  onPress={() => handlePaymentMethodSelect("tarjeta")}
                >
                  <View style={styles.paymentIconContainer}>
                    <MaterialCommunityIcons
                      name="credit-card"
                      size={24}
                      color="#1C1C1E"
                    />
                  </View>
                  <Text style={styles.paymentText}>{textoPago}</Text>
                  <View
                    style={[
                      styles.radioButton,
                      paymentMethod === "tarjeta" && styles.radioButtonSelected,
                    ]}
                  />
                </TouchableOpacity>
                {/* Mostrar indicador de carga mientras se consulta la configuración del usuario */}
                {loadingUserSettings && (
                  <View style={styles.loadingPaymentContainer}>
                    <ActivityIndicator size="small" color="#fa6205" />
                    <Text style={styles.loadingPaymentText}>
                      Cargando métodos de pago...
                    </Text>
                  </View>
                )}
                {/* Mostrar mensaje si no se ha seleccionado método de pago */}
                {!loadingUserSettings && !paymentMethod && (
                  <View style={styles.paymentInfoContainer}>
                    <MaterialCommunityIcons
                      name="alert-circle-outline"
                      size={20}
                      color="#FF9500"
                    />
                    <Text style={styles.paymentInfoText}>
                      Selecciona un método de pago para continuar
                    </Text>
                  </View>
                )}
              </View>
              {/* Paso 5: Total y botón de pago SOLO cuando hay un servicio seleccionado */}
              <View style={styles.footer}>
                <View style={styles.priceContainer}>
                  {isCalculatingPrice ? (
                    <View style={styles.calculatingContainer}>
                      <ActivityIndicator size="large" color="#fa6205" />
                      <Text style={styles.calculatingText}>
                        Calculando precio...
                      </Text>
                    </View>
                  ) : priceError ? (
                    <Text style={styles.priceError}>{priceError}</Text>
                  ) : totalPrice ? (
                    <View>
                      <Text style={styles.totalPrice}>$ {totalPrice}</Text>
                      {distanceInKm && (
                        <View>
                          <Text style={styles.distanceText}>
                            {distanceInKm.toFixed(2)} km •
                            {tariffType === "dia"
                              ? "Tarifa día"
                              : tariffType === "noche"
                                ? "Tarifa noche"
                                : "Tarifa festivo"}
                          </Text>
                          {(vehicleType === "taxi" ||
                            vehicleType === "mototaxi") && (
                              <Text style={styles.distanceText}>
                                Tarifa referencial y negociable
                              </Text>
                            )}
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.totalPricePrompt}></Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[
                    styles.payButton,
                    (!totalPrice ||
                      isCalculatingPrice ||
                      isCreatingRide ||
                      !paymentMethod ||
                      !pickupAddress.trim() ||
                      !deliveryAddress.trim()) &&
                    styles.payButtonDisabled,
                  ]}
                  onPress={handleContinue}
                  disabled={
                    !totalPrice ||
                    isCalculatingPrice ||
                    isCreatingRide ||
                    !paymentMethod ||
                    !pickupAddress.trim() ||
                    !deliveryAddress.trim()
                  }
                >
                  {isCreatingRide ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.payButtonText}>Solicitar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : vehicleType ? (
            <View style={styles.serviceRequiredContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={50}
                color="#FF9500"
                style={styles.alertIcon}
              />
              <Text style={styles.serviceRequiredText}>
                Por favor selecciona un servicio para continuar
              </Text>
            </View>
          ) : null}
        </View>

        {/* Modales y cargadores - siempre disponibles independientemente del estado */}
        <Modal
          isVisible={paymentPolicyModalVisible}
          backdropOpacity={0.7}
          onBackdropPress={() => setPaymentPolicyModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={{ position: "absolute", top: 10, right: 10 }}
              onPress={() => setPaymentPolicyModalVisible(false)}
            >
              <IconMC name="close" size={24} color="black" />
            </TouchableOpacity>

            <MaterialCommunityIcons
              name="information"
              size={50}
              color="#FF9500"
              style={{ marginBottom: 15 }}
            />

            <Text style={styles.paymentPolicyTitle}>Información importante</Text>
            <Text style={styles.paymentPolicyText}>
              Estimado usuario, por políticas de seguridad para cuentas nuevas, el pago debe realizarse por Nequi o Bancolombia antes de iniciar el servicio. Una vez complete 5 servicios o delivery, podrá pagar al finalizar. Agradecemos su comprensión.
            </Text>

            <TouchableOpacity
              style={styles.paymentPolicyButton}
              onPress={() => setPaymentPolicyModalVisible(false)}
            >
              <Text style={styles.paymentPolicyButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        <Modal
          isVisible={isModalVisible}
          backdropOpacity={0.5}
          onBackdropPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={{ position: "absolute", top: 10, right: 10 }}
              onPress={() => setModalVisible(false)}
            >
              <IconMC name="close" size={24} color="black" />
            </TouchableOpacity>

            <Text style={styles.title5}>Solicitud enviada con éxito</Text>
            <Text style={styles.subtitle5}>
              Tu solicitud ha sido enviada.{"\n"}
              Se te asignará un conductor{"\n"}
              cuando alguien acepte{"\n"}
              tu servicio en breve.{"\n"}
            </Text>

            <TouchableOpacity
              style={styles.button5}
              onPress={async () => {
                setModalVisible(false);
                const carreraId = await AsyncStorage.getItem("carreraId");
                navigation.navigate("Pedidos", { carreraId });
              }}
            >
              <Text style={styles.buttonText5}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        <Modal
          isVisible={isErrorModalVisible}
          backdropOpacity={0.5}
          onBackdropPress={() => setErrorModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={{ position: "absolute", top: 10, right: 10 }}
              onPress={() => setErrorModalVisible(false)}
            >
              <IconMC name="close" size={24} color="black" />
            </TouchableOpacity>

            <Text style={styles.title6}>El Pago no se ha aprobado</Text>
            <Text style={styles.subtitle6}>
              Intenta nuevamente para{"\n"}
              relizar el pago{"\n"}
            </Text>

            <TouchableOpacity
              style={styles.button5}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={styles.buttonText5}>Intentar nuevamente</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </ScrollView>

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
    backgroundColor: "#F2F2F7", // Añadido para un fondo de tema oscuro consistente
  },
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 40,
    marginBottom: 20,
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
  },
  sectionTitle: {
    fontSize: 18,
    marginTop: 5,
    marginBottom: 5,
    fontFamily: "MontserratRegular",
    color: "#444",
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
    borderColor: "#FF9500", // Mantenemos el naranja para alertas
    borderRadius: 15,
    padding: 20,
    marginVertical: 20,
    alignItems: "center",
    borderStyle: "dashed",
    backgroundColor: "rgba(255, 149, 0, 0.1)",
  },
  serviceRequiredText: {
    textAlign: "center",
    marginTop: 10,
    fontFamily: "MontserratRegular",
    fontSize: 16,
    color: "#FFD38A", // Tono claro de naranja para el texto
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
    marginBottom: 20,
    color: "#1C1C1E",
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
    borderColor: "#fa6205", // Nuevo verde
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
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
    fontSize: 16,
    marginBottom: 5,
    fontWeight: "900",
    fontFamily: "MontserratRegular",
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
    borderWidth: 1,
    borderColor: "#fa6205", // Nuevo verde
    borderRadius: 15,
    backgroundColor: "#FFF",
    padding: 15,
    marginBottom: 15,
    borderStyle: "dashed",
  },
  observationsText: {
    fontFamily: "MontserratRegular",
  },
  paymentContainer: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#fa6205",
    borderRadius: 15,
    padding: 15,
    marginBottom: 25,
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
    marginBottom: 15,
  },
  paymentIconContainer: {
    backgroundColor: "#DDD",
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  paymentText: {
    flex: 1,
    fontFamily: "MontserratRegular",
    color: "#1C1C1E",
    fontSize: 16,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fa6205", // Nuevo verde
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#fa6205", // Relleno verde
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  priceContainer: {
    flex: 1,
  },
  totalPrice: {
    fontSize: 32,
    fontWeight: "bold",
    fontFamily: "MontserratBold",
    color: "#1C1C1E",
  },
  payButton: {
    backgroundColor: "#fa6205",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 120,
  },
  payButtonText: {
    color: "#000",
    fontSize: 18,
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
  loadingIndicator: {
    padding: 15,
  },
  suggestionIcon: {
    marginRight: 10,
  },
  observationsInput: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
    minHeight: 60,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    color: '#1C1C1E',
    textAlignVertical: "top",
    fontFamily: "MontserratLight",
    padding: 10,
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
    fontSize: 16,
    fontFamily: "MontserratRegular",
    color: "#1C1C1E",
  },
  distanceText: {
    fontSize: 14,
    fontFamily: "MontserratRegular",
    marginTop: 5,
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