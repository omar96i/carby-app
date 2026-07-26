import { useState, useEffect, useRef, memo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import Fontisto from "react-native-vector-icons/Fontisto";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_300Light,
  Montserrat_600SemiBold,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import { BASE_URL } from "../constants/url";
import AdCarousel from "../components/AdCarousel";
import FloatingActionMenu from '../components/FloatingActionMenu';
import AlertaModal from "../components/ErrorModal";

const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Componente de estrellas memorizado
const StarRating = memo(({ rating }) => {
  const numRating = Number(rating) || 0;

  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= numRating ? "star" : "star-outline"}
          size={18}
          color={star <= numRating ? "#FFD700" : "#6b6b6b"}
          style={styles.starIcon}
        />
      ))}
    </View>
  );
});

// Componente de categoría memorizado
const CategoryItem = memo(({ item, onPress }) => (
  <View style={styles.card}>
    <TouchableOpacity onPress={onPress}>
      {item.image ? (
        typeof item.image === "string" ? (
          <Image
            source={{ uri: item.image }}
            style={styles.cardImage}
            progressiveRenderingEnabled={true}
            fadeDuration={300}
            defaultSource={require("../assets/images/imagen.jpg")}
          />
        ) : (
          <Image
            source={item.image}
            style={styles.cardImage}
            progressiveRenderingEnabled={true}
            fadeDuration={300}
            defaultSource={require("../assets/images/imagen.jpg")}
          />
        )
      ) : (
        <Image
          source={require("../assets/images/imagen.jpg")}
          style={styles.cardImage}
          progressiveRenderingEnabled={true}
          fadeDuration={300}
        />
      )}
      <Text style={styles.cardTitle}>{item.title}</Text>
      {item.establishmentCount > 0 && (
        <Text style={styles.cardSubtitle}>
          {item.establishmentCount}
          {item.establishmentCount === 1 ? " Tienda" : " Tiendas"}
        </Text>
      )}
    </TouchableOpacity>
  </View>
));

export default function HomeScreen() {
  // Estados principales
  const [userData, setUserData] = useState(null);
  const [userId, setUserId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [locationAddress, setLocationAddress] = useState(
    "Obteniendo ubicación..."
  );
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [error, setError] = useState(null);
  // Estado para el componente (mantenemos solo isMountedRef para evitar errores)

  // Estados para el modal y mapa
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loadingCoordinates, setLoadingCoordinates] = useState(false);
  const [markerCoordinates, setMarkerCoordinates] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);

  // Estados para carga progresiva
  const [isHeaderLoaded, setIsHeaderLoaded] = useState(false);
  const [areCategoriesLoaded, setAreCategoriesLoaded] = useState(false);

  // Estados para demo
  const [isDemoModalVisible, setIsDemoModalVisible] = useState(false);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [userRating, setUserRating] = useState(null);
  // Nuevo estado para el modal de políticas de pago
  const [showPaymentPolicyModal, setShowPaymentPolicyModal] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  const navigation = useNavigation();
  const locationUpdateTimerRef = useRef(null);
  const mapRef = useRef(null);
  const isMountedRef = useRef(true);

  // Cargar fuentes
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_300Light,
    Montserrat_600SemiBold,
  });

  // Función para manejar errores críticos
  const handleCriticalError = useCallback((error, context) => {
    console.error(`Error crítico en ${context}:`, error);
    if (isMountedRef.current) {
      setError(`Error en ${context}: ${error.message}`);
      setLoading(false);
    }
  }, []);

  // Agrega esta función para manejar el clic en el banner
  const handleBannerPress = () => {
    if (isDemoUser) {
      setIsDemoModalVisible(true);
    } else {
      navigation.navigate("StepUno");
    }
  };
  // Función para obtener URL de imagen
  const getImageUrl = useCallback((photoPath) => {
    if (!photoPath) return null;

    // Si la ruta ya es una URL completa, la devolvemos tal cual
    if (photoPath.startsWith("http")) return photoPath;

    // Si no, formamos la URL completa
    return `${BASE_URL.toString().replace("/api", "")}/storage/${photoPath}`;
  }, []);
  // Función para obtener publicidades

  // Función para obtener dirección desde coordenadas
  const getAddressFromCoordinates = useCallback(async (latitude, longitude) => {
    try {
      if (!isMountedRef.current) return "Ubicación seleccionada";

      const geoCodeResult = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (!isMountedRef.current) return "Ubicación seleccionada";

      if (geoCodeResult && geoCodeResult.length > 0) {
        const address = geoCodeResult[0];
        const parts = [];
        if (address.name) parts.push(address.name);
        if (address.street) parts.push(address.street);
        if (address.district) parts.push(address.district);
        if (address.city) parts.push(address.city);
        if (address.region) parts.push(address.region);
        const locationString = parts.join(", ");
        return locationString || "Ubicación seleccionada";
      }
      return "Ubicación seleccionada";
    } catch (error) {
      console.error("Error obteniendo dirección:", error);
      return "Ubicación seleccionada";
    }
  }, []);

  // Función para enviar la ubicación a la API
  const sendLocationToApi = useCallback(
    async (coords) => {
      // Para usuarios demo, no enviar ubicación a la API
      if (isDemoUser || !isMountedRef.current) {
        console.log(
          "Usuario demo o componente desmontado: omitiendo envío de ubicación a API"
        );
        return;
      }

      try {
        if (!userId) {
          console.log("No se encontró ID de usuario para enviar ubicación");
          return;
        }

        const token = await AsyncStorage.getItem("userToken");
        if (!token || !isMountedRef.current) {
          console.log("No se encontró token de autenticación");
          return;
        }

        const locationData = {
          user_id: userId,
          latitud: parseFloat(coords.latitude),
          longitud: parseFloat(coords.longitude),
          estado: "activo",
        };

        console.log("Enviando ubicación a API:", locationData);

        const response = await fetch(`${BASE_URL}localizacion`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(locationData),
        });

        if (!response.ok || !isMountedRef.current) {
          const errorText = await response.text();
          console.log("Error al enviar ubicación:", errorText);
          return;
        }

        console.log("Ubicación enviada correctamente");
      } catch (error) {
        console.error("Error al enviar ubicación a la API:", error);
      }
    },
    [userId, isDemoUser]
  );

  // Función optimizada para capturar ubicación
  const captureAndSaveLocation = useCallback(
    async (sendToApi = false) => {
      try {
        if (!isMountedRef.current) return null;

        setUpdatingLocation(true);

        // Verificar primero si hay una ubicación guardada reciente
        const savedLocationString = await AsyncStorage.getItem("userLocation");

        if (savedLocationString && isMountedRef.current) {
          const savedLocation = JSON.parse(savedLocationString);
          const savedTime = new Date(savedLocation.timestamp).getTime();
          const currentTime = new Date().getTime();
          // Usar ubicación guardada si tiene menos de 30 minutos
          if (currentTime - savedTime < 30 * 60 * 1000) {
            const coords = {
              latitude: savedLocation.latitude,
              longitude: savedLocation.longitude,
            };

            if (isMountedRef.current) {
              setLocation(coords);

              // Actualizar dirección en segundo plano
              getAddressFromCoordinates(coords.latitude, coords.longitude)
                .then((address) => {
                  if (isMountedRef.current) setLocationAddress(address);
                })
                .catch((err) =>
                  console.error("Error obteniendo dirección:", err)
                );

              if (sendToApi && userId) {
                // Enviar a API en segundo plano
                sendLocationToApi(coords).catch((err) =>
                  console.error("Error enviando ubicación a API:", err)
                );
              }

              setUpdatingLocation(false);
            }
            return coords;
          }
        }

        if (!isMountedRef.current) return null;

        // Si no hay ubicación reciente o es muy antigua, obtener una nueva
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted" || !isMountedRef.current) {
          if (isMountedRef.current) {
            showAlert(
              "Necesitamos permisos de ubicación para mostrar categorías cercanas.",
              "info"
            );
            setUpdatingLocation(false);
          }
          return null;
        }

        // Usar opciones de baja precisión para mejorar velocidad
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });

        if (!isMountedRef.current) return null;

        const coords = currentLocation.coords;
        setLocation(coords);

        // Guardar en AsyncStorage
        await AsyncStorage.setItem(
          "userLocation",
          JSON.stringify({
            latitude: coords.latitude,
            longitude: coords.longitude,
            timestamp: new Date().toISOString(),
          })
        );

        // Obtener dirección en segundo plano
        getAddressFromCoordinates(coords.latitude, coords.longitude)
          .then((address) => {
            if (isMountedRef.current) setLocationAddress(address);
          })
          .catch((err) => console.error("Error obteniendo dirección:", err));

        // Enviar a API en segundo plano si se solicita
        if (sendToApi && userId && isMountedRef.current) {
          sendLocationToApi(coords).catch((err) =>
            console.error("Error enviando ubicación a API:", err)
          );
        }

        if (isMountedRef.current) {
          setUpdatingLocation(false);
        }
        return coords;
      } catch (error) {
        console.error("Error capturando ubicación:", error);
        if (isMountedRef.current) {
          setUpdatingLocation(false);
        }
        return null;
      }
    },
    [userId, getAddressFromCoordinates, sendLocationToApi]
  );

  // Función para obtener ubicación almacenada
  const getStoredLocation = useCallback(async () => {
    // Primero verificar si está en el estado
    if (location && isMountedRef.current) {
      return location;
    }

    try {
      const savedLocation = await AsyncStorage.getItem("userLocation");
      if (savedLocation && isMountedRef.current) {
        const parsedLocation = JSON.parse(savedLocation);

        // Verificar si la ubicación es reciente (menos de 30 minutos)
        const savedTime = new Date(parsedLocation.timestamp).getTime();
        const currentTime = new Date().getTime();
        const thirtyMinutesInMs = 30 * 60 * 1000;

        if (
          currentTime - savedTime < thirtyMinutesInMs &&
          isMountedRef.current
        ) {
          setLocation({
            latitude: parsedLocation.latitude,
            longitude: parsedLocation.longitude,
          });
          return {
            latitude: parsedLocation.latitude,
            longitude: parsedLocation.longitude,
          };
        }
      }
    } catch (error) {
      console.error("Error obteniendo ubicación almacenada:", error);
    }

    // Si llegamos aquí, necesitamos una ubicación nueva
    return await captureAndSaveLocation();
  }, [location, captureAndSaveLocation]);

  // Mejora la función checkIfDemoUser para que sea más robusta
  const checkIfDemoUser = useCallback(async () => {
    try {
      const isDemo = await AsyncStorage.getItem("is_demo");
      console.log("🔍 Valor de is_demo en AsyncStorage:", isDemo);

      const isDemoValue = isDemo === "true";

      if (isMountedRef.current) {
        setIsDemoUser(isDemoValue); // Actualiza el estado

        // Configurar calificación predeterminada para usuarios demo
        if (isDemoValue) {
          console.log("⭐ Configurando 4 estrellas para usuario demo");
          setUserRating(4);

          // Para usuarios demo, también podemos preconfigurar algunos datos
          setUserData({
            nombre_completo: "Usuario Demo",
            id: "demo_user",
          });
        }
      }

      return isDemoValue; // Importante: devuelve el valor directamente
    } catch (error) {
      console.error("❌ Error verificando usuario demo:", error);
      if (isMountedRef.current) {
        setIsDemoUser(false);
      }
      return false;
    }
  }, []);

  // Función para obtener calificación del usuario
  const fetchUserRating = useCallback(async () => {
    // No obtener calificación para usuarios demo, ya que se asignó en checkIfDemoUser
    if (isDemoUser || !isMountedRef.current) {
      return;
    }

    // Mantener la funcionalidad original para usuarios normales
    if (userId) {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token || !isMountedRef.current) return;

        const response = await fetch(`${BASE_URL}usuario/${userId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok || !isMountedRef.current) return;

        const data = await response.json();
        const rating = data?.data?.promedio_puntuacion_usuario || null;

        // Verificar si puede pagar en efectivo
        const puedePagarEfectivo = data?.data?.puede_pagar_efectivo;

        if (isMountedRef.current) {
          setUserRating(rating);

          // Mostrar modal si no puede pagar en efectivo
          if (puedePagarEfectivo === false) {
            setShowPaymentPolicyModal(true);
          }
        }
      } catch (error) {
        console.error("Error obteniendo calificación:", error);
      }
    }
  }, [userId, isDemoUser]);

  // Función para obtener imagen de perfil del usuario
  const fetchUserProfileImage = useCallback(async () => {
    if (userId && isMountedRef.current) {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token || !isMountedRef.current) return;

        const response = await fetch(`${BASE_URL}usuario/${userId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok || !isMountedRef.current) return;

        const data = await response.json();

        // Buscar imagen en varios campos posibles
        const profileImage =
          data?.data?.foto_document_file ||
          data?.data?.foto_documento_file ||
          data?.data?.foto_perfil;

        if (profileImage && isMountedRef.current) {
          const url = getImageUrl(profileImage);
          setProfileImageUrl(url);
        }
      } catch (error) {
        console.error("Error obteniendo imagen de perfil:", error);
      }
    }
  }, [userId, getImageUrl]);

  // Función para obtener categorías
  const fetchCategories = useCallback(
    async (userLocation) => {
      try {
        if (!isMountedRef.current) return;

        const token = await AsyncStorage.getItem("userToken");
        if (!token || !isMountedRef.current) {
          if (isMountedRef.current) setLoading(false);
          return;
        }

        // Usar ubicación proporcionada o buscar una almacenada
        let locationToUse = userLocation;
        if (!locationToUse) {
          locationToUse = await getStoredLocation();
        }

        if (!locationToUse || !isMountedRef.current) {
          if (isMountedRef.current) setLoading(false);
          return;
        }

        // Preparar datos para la API
        const locationData = {
          latitud: locationToUse?.latitude,
          longitud: locationToUse?.longitude,
        };

        // Preparar URL de la API
        const url = `${BASE_URL}global-categorias/get/obtener`;


        const response = await fetch(url, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(locationData),
        });


        if (!response.ok || !isMountedRef.current) {
          const errorText = await response.text();
          console.log("Error al obtener categorías:", errorText);
          return;
        }

        const responseData = await response.json();

        if (
          Array.isArray(responseData.data)
        ) {
          console.log("entre")
          const formattedCategories = responseData.data
            .filter((globalCategory) => (globalCategory.users?.length || 0) > 0 || (globalCategory.user_sedes?.length || 0) > 0)
            .map((globalCategory) => {
              return {
                id: globalCategory.id.toString(),
                title: globalCategory.nombre,
                image: globalCategory.icono
                  ? getImageUrl(globalCategory.icono)
                  : require("../assets/images/imagen.jpg"),
                establishmentCount: globalCategory.users.length + globalCategory.user_sedes.length,
                establishments: globalCategory.users,
                establishmentsSedes: globalCategory.user_sedes,
                tipo_categoria: (globalCategory.tipo_categoria || "").toLowerCase().trim(),
              };
            });


          setCategories(formattedCategories);
        }
      } catch (error) {
        console.error("Error obteniendo categorías:", error);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [getStoredLocation, getImageUrl]
  );

  // Función para obtener categorías para usuario demo
  const fetchCategoriesForDemoUser = useCallback(
    async (userLocation) => {
      console.log("🔄 Iniciando fetchCategoriesForDemoUser");
      try {
        if (!isMountedRef.current) return;

        setLoading(true);

        // Usar ubicación proporcionada o buscar una almacenada
        let locationToUse = userLocation;
        if (!locationToUse) {
          locationToUse = await getStoredLocation();
        }

        if (!isMountedRef.current) return;

        // Siempre tener coordenadas predeterminadas para modo demo
        const locationData = {
          latitud: parseFloat(locationToUse?.latitude || 6.557394),
          longitud: parseFloat(locationToUse?.longitude || -73.132768),
        };

        // URL para modo demo
        const apiUrl =
          "https://back.carbycol.com/api/global-categorias/get/obtener/no-auth";

        console.log("🔗 Llamando a API demo:", apiUrl);

        let responseOk = false;
        let responseData = null;

        try {
          // Establecer un tiempo límite para la solicitud
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 5000)
          );

          const fetchPromise = fetch(apiUrl, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(locationData),
          });

          // Usar el que termine primero (la solicitud o el timeout)
          const response = await Promise.race([fetchPromise, timeoutPromise]);

          console.log("✅ Respuesta de API status:", response.status);

          responseOk = response.ok;
          if (responseOk && isMountedRef.current) {
            responseData = await response.json();
            console.log(
              "📦 Categorías obtenidas para usuario demo:",
              responseData?.data?.length || 0,
              "categorías"
            );
          }
        } catch (apiError) {
          console.error("❌ Error en llamada a API:", apiError);
          // No hacer throw, simplemente continuar con datos de fallback
        }

        // VERIFICAR ANTES DE ACTUALIZAR ESTADO
        if (isMountedRef.current) {
          // Si la respuesta fue exitosa y contiene datos, usarla
          if (
            responseOk &&
            responseData &&
            responseData.data &&
            responseData.data.length > 0
          ) {
            const formattedCategories = responseData.data.map(
              (globalCategory) => {
                return {
                  id: globalCategory.id?.toString() || Math.random().toString(),
                  title: globalCategory.nombre || "Categoría",
                  image: globalCategory.icono
                    ? getImageUrl(globalCategory.icono)
                    : require("../assets/images/imagen.jpg"),
                  establishmentCount: globalCategory.users?.length || 0,
                  establishments: globalCategory.users || [],
                  tipo_categoria: (globalCategory.tipo_categoria || "")
                    .toLowerCase()
                    .trim(), // <-- fix: include tipo_categoria
                };
              }
            );

            setCategories(formattedCategories);
          } else {
            // Usar categorías predefinidas para demo
            console.log("ℹ️ Usando categorías de respaldo para demo");
            const demoCategories = [
              {
                id: "1",
                title: "Restaurantes",
                image: require("../assets/images/imagen.jpg"),
                establishmentCount: 5,
                establishments: [],
              },
              {
                id: "2",
                title: "Supermercados",
                image: require("../assets/images/imagen.jpg"),
                establishmentCount: 3,
                establishments: [],
              },
              {
                id: "3",
                title: "Farmacias",
                image: require("../assets/images/imagen.jpg"),
                establishmentCount: 2,
                establishments: [],
              },
              {
                id: "4",
                title: "Tiendas",
                image: require("../assets/images/imagen.jpg"),
                establishmentCount: 4,
                establishments: [],
              },
            ];

            setCategories(demoCategories);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ Error general en fetchCategoriesForDemoUser:", error);

        // Siempre mostrar categorías de fallback en modo demo
        if (isMountedRef.current) {
          setCategories([
            {
              id: "1",
              title: "Restaurantes",
              image: require("../assets/images/imagen.jpg"),
              establishmentCount: 5,
              establishments: [],
            },
            {
              id: "2",
              title: "Supermercados",
              image: require("../assets/images/imagen.jpg"),
              establishmentCount: 3,
              establishments: [],
            },
            {
              id: "3",
              title: "Farmacias",
              image: require("../assets/images/imagen.jpg"),
              establishmentCount: 2,
              establishments: [],
            },
          ]);
          setLoading(false);
        }
      }
    },
    [getStoredLocation, getImageUrl]
  );

  // Función para actualizar ubicación con mapa
  const handleLocationUpdate = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;

      setLoadingCoordinates(true);
      const coords = await captureAndSaveLocation(false);

      if (coords && isMountedRef.current) {
        setCurrentLocation(coords);
        setMarkerCoordinates(coords);

        setMapRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });

        const address = await getAddressFromCoordinates(
          coords.latitude,
          coords.longitude
        );
        if (isMountedRef.current) {
          setLocationAddress(address);
        }
      }

      if (isMountedRef.current) {
        setLocationModalVisible(true);
      }
    } catch (error) {
      console.error("Error al obtener ubicación:", error);
      if (isMountedRef.current) {
        showAlert(
          "No pudimos obtener tu ubicación. Intenta de nuevo más tarde.",
          "error"
        );
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingCoordinates(false);
      }
    }
  }, [captureAndSaveLocation, getAddressFromCoordinates]);

  // Función para manejar arrastre de marcador
  const handleMarkerDrag = useCallback(
    async (e) => {
      if (!isMountedRef.current) return;

      const newCoords = e.nativeEvent.coordinate;
      setMarkerCoordinates(newCoords);

      const address = await getAddressFromCoordinates(
        newCoords.latitude,
        newCoords.longitude
      );
      if (isMountedRef.current) {
        setLocationAddress(address);
      }
    },
    [getAddressFromCoordinates]
  );

  // Función para centrar el mapa
  const centerMapOnCurrentLocation = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;

      setLoadingCoordinates(true);
      const coords = await captureAndSaveLocation(false);

      if (coords && mapRef.current && isMountedRef.current) {
        setMarkerCoordinates(coords);

        mapRef.current.animateToRegion(
          {
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          },
          1000
        );

        const address = await getAddressFromCoordinates(
          coords.latitude,
          coords.longitude
        );
        if (isMountedRef.current) {
          setLocationAddress(address);
        }
      }
    } catch (error) {
      console.error("Error centrando mapa:", error);
    } finally {
      if (isMountedRef.current) {
        setLoadingCoordinates(false);
      }
    }
  }, [captureAndSaveLocation, getAddressFromCoordinates]);

  // Función para confirmar ubicación
  const confirmAndSaveLocation = useCallback(async () => {
    try {
      if (!markerCoordinates || !isMountedRef.current) {
        showAlert("No se ha seleccionado una ubicación", "error");
        return;
      }

      setUpdatingLocation(true);

      if (userId && isMountedRef.current) {
        await AsyncStorage.setItem(
          "userLocation",
          JSON.stringify({
            latitude: markerCoordinates.latitude,
            longitude: markerCoordinates.longitude,
            timestamp: new Date().toISOString(),
          })
        );

        setLocation(markerCoordinates);
        setCurrentLocation(markerCoordinates);

        // Ejecutar en paralelo para optimizar
        await Promise.all([
          sendLocationToApi(markerCoordinates),
          fetchCategories(markerCoordinates),
        ]);

        if (isMountedRef.current) {
          showAlert(
            "Tu ubicación ha sido actualizada y enviada correctamente.",
            "success"
          );
        }
      }

      if (isMountedRef.current) {
        setLocationModalVisible(false);
      }
    } catch (error) {
      console.error("Error al guardar ubicación:", error);
      if (isMountedRef.current) {
        showAlert(
          "No pudimos guardar tu ubicación. Intenta de nuevo más tarde.",
          "error"
        );
      }
    } finally {
      if (isMountedRef.current) {
        setUpdatingLocation(false);
      }
    }
  }, [markerCoordinates, userId, sendLocationToApi, fetchCategories]);

  // Renderizado de items de categoría
  const renderCategoryItem = useCallback(
    ({ item }) => (
      <CategoryItem
        item={item}
        onPress={() =>
          navigation.navigate("Categorias", {
            categoryId: item.id,
            categoryName: item.title,
            establishments: item.establishments,
            establishmentsSedes: item.establishmentsSedes
          })
        }
      />
    ),
    [navigation]
  );

  // INICIALIZACIÓN PRINCIPAL
  useEffect(() => {
    const initialize = async () => {
      try {
        if (!isMountedRef.current) return;

        // 1. Primero verificamos si es usuario demo y guardamos el resultado
        const isUserDemo = await checkIfDemoUser();
        console.log("✅ Determinación de usuario demo:", isUserDemo);

        if (!isMountedRef.current) return;

        // 2. Obtener datos del usuario (para ambos tipos de usuario)
        const [storedUserData, storedUserId] = await Promise.all([
          AsyncStorage.getItem("userData"),
          AsyncStorage.getItem("userId"),
        ]);

        if (!isMountedRef.current) return;

        // 3. Procesar datos de usuario (solo si no es usuario demo)
        let parsedUserData = null;
        let userIdToUse = null;

        if (!isUserDemo && storedUserData) {
          parsedUserData = JSON.parse(storedUserData);
          setUserData(parsedUserData);

          if (parsedUserData && parsedUserData.id) {
            setUserId(parsedUserData.id);
            userIdToUse = parsedUserData.id;
          }
        } else if (!isUserDemo && storedUserId) {
          userIdToUse = storedUserId;
          setUserId(userIdToUse);
        }

        if (!isMountedRef.current) return;

        // 4. Obtener ubicación del usuario (sin bloquear la UI)
        const userLocation = await captureAndSaveLocation(
          isUserDemo ? false : !!userIdToUse
        );

        if (!isMountedRef.current) return;

        // 5. Cargar datos según tipo de usuario
        if (isUserDemo) {
          console.log("👤 Cargando datos para usuario DEMO");
          // Usar endpoint sin autenticación para usuario demo
          await fetchCategoriesForDemoUser(userLocation);
        } else {
          console.log("👤 Cargando datos para usuario NORMAL");
          // Verificar token para usuarios normales
          const token = await AsyncStorage.getItem("userToken");

          if (!token || !isMountedRef.current) {
            console.log("⚠️ No se encontró token, redirigiendo a login");
            // Manejar ausencia de token para usuario normal
            if (isMountedRef.current) setLoading(false);
            return;
          }

          // Para usuarios normales usar el flujo estándar con token
          Promise.all([
            fetchCategories(userLocation),
            userIdToUse ? fetchUserProfileImage() : Promise.resolve(),
            userIdToUse ? fetchUserRating() : Promise.resolve(),
          ]).catch((error) => {
            console.error("❌ Error en la carga de datos:", error);
          });
        } // 6. Eliminado código de publicidades para simplificar

        // 8. Finalizar la carga
        if (isMountedRef.current) {
          setLoading(false);
          setIsHeaderLoaded(true);
        }
      } catch (error) {
        console.error("❌ Error en la inicialización:", error);
        handleCriticalError(error, "inicialización");
      }
    };

    initialize();

    // CLEANUP
    return () => {
      // Marcar componente como unmounted
      isMountedRef.current = false;

      // Limpiar timers
      if (locationUpdateTimerRef.current) {
        clearTimeout(locationUpdateTimerRef.current);
        locationUpdateTimerRef.current = null;
      }
      // Eliminado código de carousel
    };
  }, []);

  // Efecto para cambio de userId
  useEffect(() => {
    if (userId && isMountedRef.current) {
      Promise.all([fetchUserRating(), fetchUserProfileImage()]).catch(
        (error) => {
          console.error("Error obteniendo datos de usuario:", error);
        }
      );
    }
  }, [userId, fetchUserRating, fetchUserProfileImage]);

  // Manejo de errores en render
  if (error) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ha ocurrido un error</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              // Reiniciar la carga
            }}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Filtrar categorías por tipo (soportar espacios y mayúsculas)
  const categoriasProductos = categories.filter(
    (cat) => (cat.tipo_categoria || "").toLowerCase().trim() === "productos"
  );
  const categoriasServicios = categories.filter(
    (cat) => (cat.tipo_categoria || "").toLowerCase().trim() === "servicios"
  );

  // Renderizado principal
  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header siempre visible para respuesta inmediata */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={handleLocationUpdate}
          disabled={updatingLocation}
          style={styles.locationButton}
        >
          {updatingLocation ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons
              name="location-outline"
              size={25}
              color="#FFF"
              style={styles.icon}
            />
          )}
        </TouchableOpacity>
        <Text style={styles.locationText} numberOfLines={2}>{locationAddress}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Perfil")} style={styles.avatar}>
          {profileImageUrl ? (
            <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {userData?.nombre_completo
                ?.split(" ")
                .slice(0, 2)
                .map(w => w[0])
                .join("")
                .toUpperCase() || "U"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {!fontsLoaded || loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa6205" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Contenido principal */}
          <View style={styles.container}>
            {/* Greeting and Logo */}
            <View style={styles.header}>
              <View style={styles.textContainer}>
                <Text style={styles.greeting}>Hola,</Text>
                <Text style={styles.boldText}>
                  {userData?.nombre_completo || "Usuario"}
                </Text>
                <StarRating rating={userRating} />
              </View>
            </View>

            <View style={styles.heroSection}>
              <TouchableOpacity style={styles.transportButton} onPress={handleBannerPress} activeOpacity={0.85}>
                <View style={styles.transportIconWrap}>
                  <MaterialCommunityIcons name="motorbike" size={38} color="#FFF" />
                </View>
                <View style={styles.transportTextContainer}>
                  <Text style={styles.transportTitle}>Pide tu transporte</Text>
                  <Text style={styles.transportSubtitle}>Delivery, particular y más</Text>
                </View>
                <View style={styles.transportArrow}>
                  <MaterialCommunityIcons name="arrow-right" size={28} color="#FFF" />
                </View>
              </TouchableOpacity>
            </View>

            <Modal
              animationType="fade"
              transparent={true}
              visible={isDemoModalVisible}
              onRequestClose={() => setIsDemoModalVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.demoModalContent}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setIsDemoModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#1C1C1E" />
                  </TouchableOpacity>

                  <ScrollView
                    style={styles.modalScrollView}
                    contentContainerStyle={styles.modalScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <Image
                      source={require("../assets/images/yar.png")}
                      style={styles.demoModalLogo}
                    />

                    <Text style={styles.demoModalTitle}>
                      Servicio de Transporte YaRiders
                    </Text>

                    <View style={styles.transportTypeContainer}>
                      <View style={styles.transportCard}>
                        <Ionicons name="car" size={40} color="#fa6205" />
                        <Text style={styles.transportTitle}>Taxi</Text>
                        <Text style={styles.transportDesc}>
                          Servicio de transporte en automóvil para tus
                          recorridos personales.
                        </Text>
                      </View>

                      <View style={styles.transportCard}>
                        <Ionicons name="bicycle" size={40} color="#fa6205" />
                        <Text style={styles.transportTitle}>Moto</Text>
                        <Text style={styles.transportDesc}>
                          Desplazamiento rápido en motocicleta para tus envíos o
                          recorridos.
                        </Text>
                      </View>

                      <View style={styles.transportCard}>
                        <Fontisto name="motorcycle" size={40} color="#fa6205" />
                        <Text style={styles.transportTitle}>Mototaxi</Text>
                        <Text style={styles.transportDesc}>
                          Servicio económico ideal para distancias cortas en
                          zonas urbanas.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.featuresList}>
                      <View style={styles.featureItem}>
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#fa6205"
                        />
                        <Text style={styles.featureText}>
                          Solicita tu transporte desde cualquier ubicación
                        </Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#fa6205"
                        />
                        <Text style={styles.featureText}>
                          Envía documentos y paquetes pequeños de forma segura
                        </Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#fa6205"
                        />
                        <Text style={styles.featureText}>
                          Seguimiento en tiempo real de tu pedido
                        </Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#fa6205"
                        />
                        <Text style={styles.featureText}>
                          Conductores verificados y confiables
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.demoMessage}>
                      Para utilizar esta funcionalidad, es necesario registrarse
                      como usuario en la aplicación.
                    </Text>

                    <TouchableOpacity
                      style={styles.registerButton}
                      onPress={() => {
                        setIsDemoModalVisible(false);
                        navigation.navigate("Register");
                      }}
                    >
                      <Text style={styles.registerButtonText}>
                        REGISTRARME AHORA
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </View>
            </Modal>
            <AdCarousel />
            {/* Categories Section */}
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Categorías de Productos</Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("CategoriaVertical", {
                      tipo: "productos",
                    })
                  }
                >
                  <Text style={styles.sectionTitleDos}>Ver todas</Text>
                </TouchableOpacity>
              </View>
              {categoriasProductos.length > 0 ? (
                <FlatList
                  data={categoriasProductos}
                  renderItem={renderCategoryItem}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  initialNumToRender={3}
                  maxToRenderPerBatch={2}
                  windowSize={3}
                  removeClippedSubviews={true}
                  getItemLayout={(data, index) => ({
                    length: 160,
                    offset: 160 * index,
                    index,
                  })}
                />
              ) : (
                <Text style={styles.noDataText}>
                  No hay categorías de productos
                </Text>
              )}
            </View>
            <View style={{ marginTop: 18 }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Categorías de Servicios</Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("CategoriaVertical", {
                      tipo: "servicios",
                    })
                  }
                >
                  <Text style={styles.sectionTitleDos}>Ver todas</Text>
                </TouchableOpacity>
              </View>
              {categoriasServicios.length > 0 ? (
                <FlatList
                  data={categoriasServicios}
                  renderItem={renderCategoryItem}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  initialNumToRender={3}
                  maxToRenderPerBatch={2}
                  windowSize={3}
                  removeClippedSubviews={true}
                  getItemLayout={(data, index) => ({
                    length: 160,
                    offset: 160 * index,
                    index,
                  })}
                />
              ) : (
                <Text style={styles.noDataText}>
                  No hay categorías de servicios
                </Text>
               )}
              </View>
            </View>
         </ScrollView>
      )}

      {/* Modal con el mapa para seleccionar ubicación */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={locationModalVisible}
        onRequestClose={() => {
          setLocationModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona tu ubicación</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#999" />
              </TouchableOpacity>
            </View>

            {loadingCoordinates ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fa6205" />
                <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
              </View>
            ) : (
              <View>
                {/* Mapa para seleccionar ubicación */}
                {mapRegion && (
                  <View style={styles.mapContainer}>
                    <MapView
                      ref={mapRef}
                      style={styles.map}
                      provider={PROVIDER_GOOGLE}
                      initialRegion={mapRegion}
                      showsUserLocation={true}
                    >
                      {markerCoordinates && (
                        <Marker
                          coordinate={markerCoordinates}
                          draggable
                          onDragEnd={handleMarkerDrag}
                          title="Mi ubicación"
                        />
                      )}
                    </MapView>

                    {/* Botón para centrar mapa en mi ubicación */}
                    <TouchableOpacity
                      style={styles.centerMapButton}
                      onPress={centerMapOnCurrentLocation}
                      disabled={loadingCoordinates}
                    >
                      {loadingCoordinates ? (
                        <ActivityIndicator size="small" color="#333333" />
                      ) : (
                        <Ionicons name="locate" size={24} color="#333333" />
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.locationInfoContainer}>
                  <Ionicons name="location" size={24} color="#fa6205" />
                  <Text style={styles.locationAddressModal}>
                    {locationAddress}
                  </Text>
                </View>

                <View style={styles.modalButtonsContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setLocationModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={confirmAndSaveLocation}
                    disabled={updatingLocation}
                  >
                    {updatingLocation ? (
                      <ActivityIndicator size="small" color="#333333" />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        Guardar ubicación
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
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
  safeContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  bannerNoImage: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
    backgroundColor: "#F0F0F0",
    padding: 30,
    borderWidth: 2,
    borderColor: "#DDD",
    borderStyle: "dashed",
  },
  bannerOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },
  bannerHandIcon: {
    marginBottom: 18,
    transform: [{ rotate: "-15deg" }],
    // Puedes animar este icono con una librería como react-native-animatable si quieres
  },
  bannerTitle: {
    color: '#1C1C1E',
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
    marginBottom: 2,
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bannerSubtitle: {
    color: "#fa6205",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    textAlign: "center",
    marginTop: 12,
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 10,
    textAlign: "center",
  },
  errorDetail: {
    color: '#1C1C1E',
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#fa6205",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
  },
  modalScrollView: {
    width: "100%",
    maxHeight: "100%",
  },
  modalScrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 20,
  },
  demoModalContent: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 25,
    width: "90%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 5,
  },
  demoModalLogo: {
    width: 150,
    height: 60,
    resizeMode: "contain",
    marginTop: 15,
    marginBottom: 15,
  },
  demoModalTitle: {
    fontSize: 22,
    fontFamily: "Montserrat_700Bold",
    color: "#fa6205",
    marginBottom: 20,
    textAlign: "center",
  },
  transportTypeContainer: {
    width: "100%",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  transportCard: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginBottom: 10,
    width: "100%",
  },
  transportTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    color: '#1C1C1E',
    marginTop: 10,
    marginBottom: 5,
  },
  transportDesc: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#ccc",
    textAlign: "center",
  },
  featuresList: {
    width: "100%",
    marginTop: 10,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: '#1C1C1E',
    marginLeft: 10,
    flex: 1,
  },
  demoMessage: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFA726",
    textAlign: "center",
    marginVertical: 15,
  },
  registerButton: {
    backgroundColor: "#fa6205",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  registerButtonText: {
    color: "#FFF",
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
  },
  starContainer: {
    flexDirection: "row",
    marginTop: 5,
  },
  starIcon: {
    marginRight: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  noDataText: {
    color: "#aaa",
    textAlign: "center",
    padding: 20,
    fontFamily: "Montserrat_400Regular",
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fa6205",
    padding: 15,
    marginTop: 30,
  },
  locationButton: {
    padding: 5,
    width: 35,
    height: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  locationText: {
    fontSize: 16,
    color: "#FFF",
    fontFamily: "Montserrat_400Regular",
    flex: 1,
    marginLeft: 5,
    marginRight: 5,
    lineHeight: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1C1C1E",
    justifyContent: "center",
    alignItems: "center",
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
  },
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
  },
  textContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontFamily: "Montserrat_400Regular",
    color: '#1C1C1E',
  },
  boldText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 20,
    color: '#1C1C1E',
  },
  logo: {
    width: "60%",
    height: 60,
    resizeMode: "contain",
    borderRadius: 16,
  },
  heroSection: {
    marginHorizontal: 0,
    marginBottom: 4,
    marginTop: 20,
  },
  transportButton: {
    backgroundColor: '#fa6205',
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#fa6205',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  transportIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transportTextContainer: {
    flex: 1,
  },
  transportTitle: {
    color: '#FFF',
    fontSize: 17,
    fontFamily: 'Montserrat_700Bold',
  },
  transportSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 3,
  },
  transportArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    color: "#fa6205",
  },
  sectionTitleDos: {
    fontSize: 14,
    fontFamily: "Montserrat_regular",
    color: "#fa6205",
  },
  card: {
    borderRadius: 10,
    marginRight: 10,
    padding: 10,
    alignItems: "center",
    width: 160,
  },
  cardImage: {
    width: 150,
    height: 130,
    borderRadius: 10,
    marginBottom: 10,
    resizeMode: "contain",
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
    color: "#1C1C1E",
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#666",
    textAlign: "center",
  },
  // Estilos para el modal con mapa
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    width: "95%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    maxHeight: height * 0.85,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
    marginBottom: 0,
  },
  mapContainer: {
    width: "100%",
    aspectRatio: 1, // Hace que el alto sea igual al ancho (cuadrado)
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 15,
    position: "relative",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  centerMapButton: {
    position: "absolute",
    bottom: 15,
    right: 15,
    backgroundColor: "#FFF",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  locationInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    width: "100%",
    backgroundColor: "#F5F0E8",
    padding: 14,
    borderRadius: 12,
  },
  locationAddressModal: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#1C1C1E",
    marginLeft: 10,
    flex: 1,
  },
  modalButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
    gap: 10,
  },
  cancelButton: {
    backgroundColor: "#FFF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
  },
  cancelButtonText: {
    color: "#666",
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: "#fa6205",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    alignItems: "center",
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: "#FFF",
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
  },
  loadingText: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    marginTop: 10,
  },
  carouselContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  carouselItem: {
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    height: 120,
  },
  carouselImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    resizeMode: "cover",
  },
  carouselTitle: {
    color: '#1C1C1E',
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    marginTop: 5,
    textAlign: "center",
  },
  carouselSubtitle: {
    color: "#fa6205",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
  },
  paymentPolicyModalContent: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 25,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  paymentPolicyContainer: {
    alignItems: "center",
    paddingTop: 20,
  },
  paymentPolicyIcon: {
    marginBottom: 20,
  },
  paymentPolicyTitle: {
    fontSize: 22,
    fontFamily: "Montserrat_700Bold",
    color: "#FFA726",
    marginBottom: 20,
    textAlign: "center",
  },
  paymentPolicyMessage: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: '#1C1C1E',
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 25,
  },
  paymentPolicyButton: {
    backgroundColor: "#fa6205",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: "center",
    minWidth: 120,
  },
  paymentPolicyButtonText: {
    color: "#FFF",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
  },
});
