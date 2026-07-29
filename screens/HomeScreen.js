import { useState, useEffect, useRef, memo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_300Light,
  Montserrat_600SemiBold,
  Montserrat_800ExtraBold,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import { BASE_URL } from "../constants/url";
import AdCarousel from "../components/AdCarousel";
import NearbyBanners from "../components/NearbyBanners";
import NearbyDiscounts from "../components/NearbyDiscounts";
import NearbyCheapest from "../components/NearbyCheapest";
import NearbyBestSellers from "../components/NearbyBestSellers";
import FloatingActionMenu from '../components/FloatingActionMenu';
import AlertaModal from "../components/ErrorModal";

const hamburguesaImg = require("../assets/images/hamburguesa-icono.png");

const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Categorías rápidas estilo Rappi (sin usar las categorías del backend)
const QUICK_CATEGORIES = [
  {
    id: "restaurantes",
    title: "Restaurantes",
    subtitle: "Solo restaurantes",
    image: hamburguesaImg,
    color: "#FFF5EC",
    route: "CategoriaVertical",
    params: { tipo: "productos" },
  },
  {
    id: "servicios",
    title: "Servicios",
    subtitle: "Citas y reservas",
    icon: "cut-outline",
    color: "#EDF2FF",
    iconColor: "#4361EE",
    route: "CategoriaVertical",
    params: { tipo: "servicios" },
  },
];

const StarRating = memo(({ rating, size = 12, color = "#FFD700" }) => {
  const numRating = Number(rating) || 0;
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= numRating ? "star" : "star-outline"}
          size={size}
          color={star <= numRating ? color : "#555"}
        />
      ))}
    </View>
  );
});

const QuickCategory = memo(({ item, onPress }) => (
  <TouchableOpacity
    style={[styles.quickCatCard, { backgroundColor: item.color }]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View style={styles.quickCatIconWrap}>
      {item.image ? (
        <Image source={item.image} style={styles.quickCatImg} />
      ) : (
        <Ionicons name={item.icon} size={32} color={item.iconColor} />
      )}
    </View>
    <Text style={styles.quickCatTitle}>{item.title}</Text>
    <Text style={styles.quickCatSubtitle}>{item.subtitle}</Text>
  </TouchableOpacity>
));

export default function HomeScreen() {
  // Estados principales
  const [userData, setUserData] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [locationAddress, setLocationAddress] = useState(
    "Obteniendo ubicación..."
  );
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [error, setError] = useState(null);

  // Estados para el modal y mapa
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loadingCoordinates, setLoadingCoordinates] = useState(false);
  const [markerCoordinates, setMarkerCoordinates] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);

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
    Montserrat_800ExtraBold,
  });

  // Función para manejar errores críticos
  const handleCriticalError = useCallback((error, context) => {
    console.error(`Error crítico en ${context}:`, error);
    if (isMountedRef.current) {
      setError(`Error en ${context}: ${error.message}`);
      setLoading(false);
    }
  }, []);

  // Función para obtener URL de imagen
  const getImageUrl = useCallback((photoPath) => {
    if (!photoPath) return null;

    // Si la ruta ya es una URL completa, la devolvemos tal cual
    if (photoPath.startsWith("http")) return photoPath;

    // Si no, formamos la URL completa
    return `${BASE_URL.toString().replace("/api", "")}/storage/${photoPath}`;
  }, []);

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

        await sendLocationToApi(markerCoordinates);

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
  }, [markerCoordinates, userId, sendLocationToApi]);

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
        } else {
          console.log("👤 Cargando datos para usuario NORMAL");
          // Verificar token para usuarios normales
          const token = await AsyncStorage.getItem("userToken");

          if (!token || !isMountedRef.current) {
            console.log("⚠️ No se encontró token, redirigiendo a login");
            if (isMountedRef.current) setLoading(false);
            return;
          }

          // Para usuarios normales usar el flujo estándar con token
          Promise.all([
            userIdToUse ? fetchUserProfileImage() : Promise.resolve(),
            userIdToUse ? fetchUserRating() : Promise.resolve(),
          ]).catch((error) => {
            console.error("❌ Error en la carga de datos:", error);
          });
        }

        // Finalizar la carga
        if (isMountedRef.current) {
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ Error en la inicialización:", error);
        handleCriticalError(error, "inicialización");
      }
    };

    initialize();

    // CLEANUP
    return () => {
      isMountedRef.current = false;

      if (locationUpdateTimerRef.current) {
        clearTimeout(locationUpdateTimerRef.current);
        locationUpdateTimerRef.current = null;
      }
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

  useFocusEffect(useCallback(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: {
        backgroundColor: "#FFF",
        height: 64,
        borderTopWidth: 0,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        display: "flex",
      },
    });
  }, [navigation]));

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
            }}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Renderizado principal
  return (
    <SafeAreaView style={styles.safeContainer}>

      {!fontsLoaded || loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5A00" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerBar}>
            <View style={styles.headerBarTop}>
              <TouchableOpacity
                style={styles.headerLocationWrap}
                onPress={handleLocationUpdate}
                disabled={updatingLocation}
                activeOpacity={0.8}
              >
                <View style={styles.locationPin}>
                  <Ionicons name="location" size={16} color="#FF5A00" />
                </View>
                <View style={styles.locationTextWrap}>
                  <Text style={styles.locationLabel}>Tu ubicación</Text>
                  <Text style={styles.locationAddress} numberOfLines={1}>
                    {locationAddress}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerProfileWrap}
                onPress={() => navigation.navigate("Perfil")}
                activeOpacity={0.8}
              >
                <View style={styles.headerAvatar}>
                  {profileImageUrl ? (
                    <Image
                      source={{ uri: profileImageUrl }}
                      style={styles.headerAvatarImg}
                    />
                  ) : (
                    <Text style={styles.headerAvatarText}>
                      {userData?.nombre_completo
                        ?.split(" ")
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase() || "U"}
                    </Text>
                  )}
                </View>
                <StarRating rating={userRating} size={10} color="#FFD700" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.container}>

            {/* Carrusel de promociones */}
            <AdCarousel />

            {/* Grid de categorías rápidas */}
            <View style={styles.quickCatGrid}>
              {QUICK_CATEGORIES.map((item) => (
                <QuickCategory
                  key={item.id}
                  item={item}
                  onPress={() => navigation.navigate(item.route, item.params)}
                />
              ))}
            </View>

            {/* Banners de tiendas cercanas */}
            <NearbyBanners location={location} />

            {/* Descuentos cercanos */}
            <NearbyDiscounts location={location} />

            {/* Los mas baratos */}
            <NearbyCheapest location={location} />

            {/* Los mas vendidos */}
            <NearbyBestSellers location={location} />

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
                <ActivityIndicator size="large" color="#FF5A00" />
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
                  <Ionicons name="location" size={24} color="#FF5A00" />
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
    backgroundColor: "#FF5A00",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    marginTop: 10,
  },

  // Header
  headerBar: {
    backgroundColor: "#111111",
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    justifyContent: "center",
  },
  headerBarTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  headerLocationWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locationPin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,90,0,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  locationTextWrap: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: "#999",
    marginBottom: 1,
  },
  locationAddress: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFF",
  },
  headerProfileWrap: {
    alignItems: "center",
    gap: 6,
  },
  headerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FF5A00",
  },
  headerAvatarImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  headerAvatarText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },

  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
  },

  // Grid de categorías rápidas
  quickCatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  quickCatCard: {
    width: (width - 52) / 2,
    borderRadius: 24,
    padding: 16,
    paddingTop: 20,
    marginBottom: 12,
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  quickCatIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  quickCatImg: {
    width: 56,
    height: 56,
    resizeMode: "contain",
  },
  quickCatTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
  },
  quickCatSubtitle: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: "#666",
    marginTop: 2,
  },

  // Modal con mapa
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
    aspectRatio: 1,
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
    backgroundColor: "#FF5A00",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    alignItems: "center",
    shadowColor: "#FF5A00",
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
});
