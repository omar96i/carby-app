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
  Alert,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import Fontisto from "react-native-vector-icons/Fontisto";
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
          {item.establishmentCount === 1 ? "Tienda" : "Tiendas"}
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
        const locationString = `${address.street || ""} ${address.city || ""
          }, ${address.region || ""}`;
        return locationString.trim() || "Ubicación seleccionada";
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
            Alert.alert(
              "Permiso denegado",
              "Necesitamos permisos de ubicación para mostrar categorías cercanas."
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
          "https://back.yariders.com/api/global-categorias/get/obtener/no-auth";

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
        Alert.alert(
          "Error",
          "No pudimos obtener tu ubicación. Intenta de nuevo más tarde."
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
        Alert.alert("Error", "No se ha seleccionado una ubicación");
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
          Alert.alert(
            "Ubicación actualizada",
            "Tu ubicación ha sido actualizada y enviada correctamente."
          );
        }
      }

      if (isMountedRef.current) {
        setLocationModalVisible(false);
      }
    } catch (error) {
      console.error("Error al guardar ubicación:", error);
      if (isMountedRef.current) {
        Alert.alert(
          "Error",
          "No pudimos guardar tu ubicación. Intenta de nuevo más tarde."
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
            <ActivityIndicator size="small" color="#2B2B2B" />
          ) : (
            <Ionicons
              name="location-outline"
              size={25}
              color="#2B2B2B"
              style={styles.icon}
            />
          )}
        </TouchableOpacity>
        <Text style={styles.locationText}>{locationAddress}</Text>
        <Image
          source={
            profileImageUrl
              ? { uri: profileImageUrl }
              : userData?.foto_perfil
                ? { uri: getImageUrl(userData.foto_perfil) }
                : require("../assets/images/fotoperfil.jpg")
          }
          style={styles.avatar}
          onLoadEnd={() => setIsHeaderLoaded(true)}
          defaultSource={require("../assets/images/fotoperfil.jpg")}
        />
      </View>

      {!fontsLoaded || loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9BFE03" />
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
              <Image
                source={require("../assets/images/yar.png")}
                style={styles.logo}
                onLoadEnd={() => setAreCategoriesLoaded(true)}
              />
            </View>

            <View style={styles.mainButtons}>
              {/* --- Botón 1 --- */}
              <TouchableOpacity style={[styles.buttonBase, styles.buttonSide]} onPress={() => navigation.navigate('CajaMisterioScreen')}>
                <Image
                  source={require("../assets/images/boton-icono-misterio.jpeg")}
                  style={styles.buttonImg}
                />
              </TouchableOpacity>

              {/* --- Botón 2 --- */}
              <TouchableOpacity style={[styles.buttonBase, styles.buttonCenter]} onPress={handleBannerPress}>
                <Image
                  source={require("../assets/images/nuevo-icono.jpeg")}
                  style={styles.buttonImg2}
                />
              </TouchableOpacity>

              {/* --- Botón 3 --- */}
              <TouchableOpacity style={[styles.buttonBase, styles.buttonSide]} onPress={() => navigation.navigate('BoleteriaScreen')}>
                <Image
                  source={require("../assets/images/icono-fondo-azul.jpeg")}
                  style={styles.buttonImg}
                />
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
                    <Ionicons name="close" size={24} color="#fff" />
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
                        <Ionicons name="car" size={40} color="#9BFE03" />
                        <Text style={styles.transportTitle}>Taxi</Text>
                        <Text style={styles.transportDesc}>
                          Servicio de transporte en automóvil para tus
                          recorridos personales.
                        </Text>
                      </View>

                      <View style={styles.transportCard}>
                        <Ionicons name="bicycle" size={40} color="#9BFE03" />
                        <Text style={styles.transportTitle}>Moto</Text>
                        <Text style={styles.transportDesc}>
                          Desplazamiento rápido en motocicleta para tus envíos o
                          recorridos.
                        </Text>
                      </View>

                      <View style={styles.transportCard}>
                        <Fontisto name="motorcycle" size={40} color="#9BFE03" />
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
                          color="#9BFE03"
                        />
                        <Text style={styles.featureText}>
                          Solicita tu transporte desde cualquier ubicación
                        </Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#9BFE03"
                        />
                        <Text style={styles.featureText}>
                          Envía documentos y paquetes pequeños de forma segura
                        </Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#9BFE03"
                        />
                        <Text style={styles.featureText}>
                          Seguimiento en tiempo real de tu pedido
                        </Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#9BFE03"
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
            <AdCarousel></AdCarousel>
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
            <Text style={styles.modalTitle}>Selecciona tu ubicación</Text>

            {loadingCoordinates ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#9BFE03" />
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
                        <ActivityIndicator size="small" color="#2B2B2B" />
                      ) : (
                        <Ionicons name="locate" size={24} color="#2B2B2B" />
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.locationInfoContainer}>
                  <Ionicons name="location" size={24} color="#9BFE03" />
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
                      <ActivityIndicator size="small" color="#2B2B2B" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#242424",
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
    backgroundColor: "#2c2c2c",
    padding: 30,
    borderWidth: 2,
    borderColor: "#444",
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
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
    marginBottom: 2,
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bannerSubtitle: {
    color: "#9BFE03",
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
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#9BFE03",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#242424",
    fontFamily: "Montserrat_600SemiBold",
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
    backgroundColor: "#333",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxHeight: height * 0.85,
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
    color: "#9BFE03",
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
    backgroundColor: "#444",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginBottom: 10,
    width: "100%",
  },
  transportTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    color: "#fff",
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
    color: "#fff",
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
    backgroundColor: "#9BFE03",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  registerButtonText: {
    color: "#242424",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
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
    backgroundColor: "#242424",
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
    backgroundColor: "#9BFE03",
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
    color: "#2B2B2B",
    fontFamily: "Montserrat_400Regular",
    flex: 1,
    marginLeft: 5,
    marginRight: 5,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 40,
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
    color: "#fff",
  },
  boldText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 20,
    color: "#fff",
  },
  logo: {
    width: "60%",
    height: 60,
    resizeMode: "contain",
  },
  mainButtons: {
    width: '100%',
    marginVertical: 5,
    marginBottom: 10,
    flexDirection: 'row', // <-- Clave: alinea los elementos en una fila
    justifyContent: 'space-between', // <-- Clave: distribuye el espacio entre los botones
  },
  mainButtons: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between', // Mantenemos el espacio entre ellos
    alignItems: 'center', // Ayuda a alinear si tienen diferentes alturas
    marginBottom: 10,
    marginTop: 10
  },
  // ESTILO BASE PARA TODOS LOS BOTONES
  buttonBase: {
    height: 110, // Altura base para los botones pequeños
    borderRadius: 15,
    overflow: 'hidden',
  },
  // ESTILO PARA LOS BOTONES DE LOS LADOS
  buttonSide: {
    width: '24%', // <-- Ancho para los botones laterales
    height: 120,
  },
  // ESTILO PARA EL BOTÓN DEL CENTRO
  buttonCenter: {
    width: '50%', // <-- Ancho mayor para el botón central
    height: 120,  // <-- Opcional: una altura mayor para que destaque más
  },
  // ESTILO PARA TODAS LAS IMÁGENES
  buttonImg: {
    width: '100%',
    height: 120,
  },
  buttonImg2: {
    width: '100%',
    height: 120,
    resizeMode: 'contain'
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
    color: "#9BFE03",
  },
  sectionTitleDos: {
    fontSize: 14,
    fontFamily: "Montserrat_regular",
    color: "#9BFE03",
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
    color: "#ffff",
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
    backgroundColor: "#333",
    borderRadius: 15,
    padding: 20,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: height * 0.8,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Montserrat_700Bold",
    color: "#9BFE03",
    marginBottom: 15,
    textAlign: "center",
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
    backgroundColor: "#9BFE03",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
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
  locationInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    width: "100%",
    backgroundColor: "#444",
    padding: 12,
    borderRadius: 10,
  },
  locationAddressModal: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#FFFFFF",
    marginLeft: 10,
    flex: 1,
  },
  modalButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 15,
  },
  cancelButton: {
    backgroundColor: "#444",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginRight: 10,
    flex: 1,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#9BFE03",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#2B2B2B",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
  },
  loadingText: {
    color: "#FFFFFF",
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    marginTop: 10,
  },
  carouselContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  carouselItem: {
    backgroundColor: "#2c2c2c",
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
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    marginTop: 5,
    textAlign: "center",
  },
  carouselSubtitle: {
    color: "#9BFE03",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
  },
  paymentPolicyModalContent: {
    backgroundColor: "#333",
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
    color: "#fff",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 25,
  },
  paymentPolicyButton: {
    backgroundColor: "#FFA726",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: "center",
    minWidth: 120,
  },
  paymentPolicyButtonText: {
    color: "#242424",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
  },
  boleteriaFloatingButton: {
    // El contenedor ahora es solo para la posición y la sombra.
    // No necesita color de fondo.
    position: 'absolute',
    bottom: 140, // Un poco más de espacio desde abajo
    right: 10,  // Un poco más de espacio desde la derecha
    width: 70,  // Un tamaño un poco más grande para mayor impacto
    height: 70,
    borderRadius: 35, // Para que la sombra sea circular
    zIndex: 100,

    // --- SOMBRA PROFUNDA PARA RESALTAR ---
    shadowColor: '#000', // Sombra negra para máximo contraste
    shadowOffset: {
      width: 0,
      height: 8, // Una sombra más larga hacia abajo
    },
    shadowOpacity: 0.3, // Una opacidad notable
    shadowRadius: 10,   // Un desenfoque suave y amplio
    elevation: 15,      // Sombra fuerte para Android
  },
  boleteriaIcon: {
    // La imagen debe llenar completamente su contenedor
    width: '100%',
    height: '100%',
    resizeMode: "contain",
    borderRadius: 12
    // El borderRadius de la imagen en sí debe manejarse en el asset si es necesario
  }
});
