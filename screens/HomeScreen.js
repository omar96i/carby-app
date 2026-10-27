import { useState, useEffect, useRef, memo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
import FocusAwareStatusBar from "../components/FocusAwareStatusBar";

const hamburguesaImg = require("../assets/images/hamburguesa-restaurantes.jpg");
const serviciosImg = require("../assets/images/servicios-herramientas.jpg");
const viajeImg = require("../assets/images/carro-pedir-viaje.jpg");

const saludoPorHora = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
};

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
    image: serviciosImg,
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

const QuickCategory = memo(({ item, onPress, grande = false }) => (
  <TouchableOpacity style={grande ? styles.accesoGrande : styles.accesoChico} onPress={onPress} activeOpacity={0.85}>
    {grande ? (
      <>
        <View style={styles.accesoGrandeCirculo}>
          {item.image ? (
            <Image source={item.image} style={styles.accesoGrandeImg} />
          ) : (
            <Ionicons name={item.icon} size={56} color="#FFF" />
          )}
        </View>
        <View style={styles.accesoGrandeTexto}>
          <Text style={styles.accesoTitulo}>{item.title}</Text>
          <Text style={styles.accesoSub}>{item.subtitle}</Text>
        </View>
        <View style={styles.accesoFlecha}>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </View>
      </>
    ) : (
      <>
        {item.image ? (
          <View style={styles.accesoChicoCirculo}>
            <Image source={item.image} style={styles.accesoChicoImg} />
          </View>
        ) : (
          <Ionicons name={item.icon} size={22} color="#9DB4FF" />
        )}
        <View>
          <Text style={styles.accesoTitulo}>{item.title}</Text>
          <Text style={styles.accesoSub}>{item.subtitle}</Text>
        </View>
      </>
    )}
  </TouchableOpacity>
));

const FavoritosRow = memo(({ onPress }) => {
  const [cats, setCats] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return;
        const res = await fetch(`${BASE_URL}productos/ultimos-pedidos?limit=20`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        const list = Array.isArray(json?.data) ? json.data : [];
        const seen = new Map();
        list.forEach((p) => {
          const c = p?.categoria;
          if (c?.id && !seen.has(c.id)) seen.set(c.id, c);
        });
        if (alive) setCats([...seen.values()].slice(0, 3));
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  const catImg = (icono) => {
    if (!icono) return null;
    if (String(icono).startsWith("http")) return icono;
    return `${BASE_URL.toString().replace(/\/api\/?$/, "").replace(/\/$/, "")}/storage/${icono}`;
  };

  return (
    <TouchableOpacity style={styles.favRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.favRowIcon}>
        <Ionicons name="heart" size={16} color="#FB7185" />
      </View>
      <View style={styles.favRowText}>
        <Text style={styles.favRowTitle}>Mis favoritos</Text>
        <Text style={styles.favRowSub}>Tus frecuentes</Text>
      </View>
      {cats.map((c, i) => (
        <View key={c.id} style={[styles.favCat, i > 0 && { marginLeft: -12 }]}>
          {catImg(c.icono) ? (
            <Image source={{ uri: catImg(c.icono) }} style={styles.favCatImg} />
          ) : (
            <View style={[styles.favCatImg, styles.favCatFallback]}>
              <Text style={styles.favCatInitial}>{(c.nombre?.[0] || "?").toUpperCase()}</Text>
            </View>
          )}
        </View>
      ))}
      <View style={styles.favFlecha}>
        <Ionicons name="chevron-forward" size={15} color="#FFF" />
      </View>
    </TouchableOpacity>
  );
});

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
  const insets = useSafeAreaInsets();
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
        const nombre = (address.name || "").trim();
        const calle = (address.street || "").trim();
        const esNumero = /^#|^\d/.test(nombre) || (!!address.streetNumber && nombre === address.streetNumber);
        if (calle && nombre && esNumero) {
          parts.push(`${calle} # ${nombre.replace(/^#\s*/, "")}`);
        } else {
          if (nombre) parts.push(nombre);
          if (calle && !nombre.includes(calle)) parts.push(calle);
        }
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
      setLocationModalVisible(true);
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

        setLoadingCoordinates(false);

        const address = await getAddressFromCoordinates(
          coords.latitude,
          coords.longitude
        );
        if (isMountedRef.current) {
          setLocationAddress(address);
        }
      }
    } catch (error) {
      console.error("Error al obtener ubicación:", error);
      if (isMountedRef.current) {
        setLocationModalVisible(false);
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
    isMountedRef.current = true;

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
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      {!fontsLoaded || loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5A00" />
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}>
          <View style={styles.headerBar}>
            <View style={styles.headerBarTop}>
              <TouchableOpacity
                style={styles.headerLocationWrap}
                onPress={handleLocationUpdate}
                disabled={updatingLocation}
                activeOpacity={0.8}
              >
                <View style={styles.locationPin}>
                  <Ionicons name="location" size={17} color="#FFF" />
                </View>
                <View style={styles.locationTextWrap}>
                  <Text style={styles.locationLabel}>Tu ubicación</Text>
                  <Text style={styles.locationAddress} numberOfLines={1}>
                    {locationAddress}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerProfileWrap}
                onPress={() => navigation.navigate("Perfil")}
                activeOpacity={0.8}
              >
                <View style={styles.headerAvatarRing}>
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
                </View>
                <StarRating rating={userRating} size={9} color="#FFD700" />
              </TouchableOpacity>
            </View>

            <View style={styles.saludoWrap}>
              {userData?.nombre_completo ? (
                <>
                  <Text style={styles.saludo}>{saludoPorHora()},</Text>
                  <Text style={styles.saludoNombre} numberOfLines={1}>
                    {userData.nombre_completo.split(" ")[0]}
                  </Text>
                </>
              ) : (
                <Text style={styles.saludoNombre}>{saludoPorHora()}</Text>
              )}
            </View>

            <View style={styles.accesos}>
              <QuickCategory
                item={QUICK_CATEGORIES[0]}
                grande
                onPress={() => navigation.navigate(QUICK_CATEGORIES[0].route, QUICK_CATEGORIES[0].params)}
              />
              <View style={styles.accesosCol}>
                <QuickCategory
                  item={QUICK_CATEGORIES[1]}
                  onPress={() => navigation.navigate(QUICK_CATEGORIES[1].route, QUICK_CATEGORIES[1].params)}
                />
                <TouchableOpacity
                  style={[styles.accesoChico, styles.accesoViaje]}
                  onPress={() => navigation.navigate("Transporte")}
                  activeOpacity={0.85}
                >
                  <View style={[styles.accesoChicoCirculo, styles.accesoViajeCirculo]}>
                    <Image source={viajeImg} style={styles.accesoChicoImg} />
                  </View>
                  <View style={styles.accesoViajeFila}>
                    <Text style={styles.accesoTitulo}>Pedir viaje</Text>
                    <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.85)" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <FavoritosRow onPress={() => navigation.navigate("Favoritos", {})} />
          </View>

          <View style={styles.container}>

            {/* Carrusel de promociones */}
            <AdCarousel />

            <NearbyBanners location={location} />

            {/* Descuentos cercanos */}
            <NearbyDiscounts location={location} />

            {/* Los mas vendidos */}
            <NearbyBestSellers location={location} />

            {/* Los mas baratos */}
            <NearbyCheapest location={location} />

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
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalGrabber} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona tu ubicación</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)} style={styles.modalCloseBtn} activeOpacity={0.8}>
                <Ionicons name="close" size={20} color="#1C1C1E" />
              </TouchableOpacity>
            </View>

            {loadingCoordinates ? (
              <View style={styles.modalLoading}>
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
                      showsMyLocationButton={false}
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
                      activeOpacity={0.8}
                    >
                      {loadingCoordinates ? (
                        <ActivityIndicator size="small" color="#fa6205" />
                      ) : (
                        <Ionicons name="locate" size={22} color="#fa6205" />
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.locationInfoContainer}>
                  <View style={styles.locationInfoIcon}>
                    <Ionicons name="location" size={18} color="#fa6205" />
                  </View>
                  <Text style={styles.locationAddressModal} numberOfLines={2}>
                    {locationAddress}
                  </Text>
                </View>

                <View style={styles.modalButtonsContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setLocationModalVisible(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={confirmAndSaveLocation}
                    disabled={updatingLocation}
                    activeOpacity={0.8}
                  >
                    {updatingLocation ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.saveButtonText} numberOfLines={1}>
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

  scroll: {
    flex: 1,
    backgroundColor: "#F4F4F5",
  },
  headerBar: {
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerBarTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerLocationWrap: {
    flex: 1,
    minWidth: 0,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2C2C2E",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 6,
    paddingRight: 14,
  },
  locationPin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fa6205",
    justifyContent: "center",
    alignItems: "center",
  },
  locationTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  locationLabel: {
    fontSize: 10.5,
    fontFamily: "Montserrat_600SemiBold",
    color: "rgba(255,255,255,0.55)",
  },
  locationAddress: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    color: "#FFF",
  },
  headerProfileWrap: {
    alignItems: "center",
    gap: 4,
  },
  headerAvatarRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#fa6205",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#2C2C2E",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  headerAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  headerAvatarText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Montserrat_800ExtraBold",
  },
  saludoWrap: {
    marginTop: 20,
  },
  saludo: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    color: "rgba(255,255,255,0.6)",
  },
  saludoNombre: {
    fontSize: 25,
    lineHeight: 30,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#FFF",
    letterSpacing: -0.5,
  },

  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
  },

  accesos: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  accesosCol: {
    flex: 1,
    gap: 10,
  },
  accesoGrande: {
    flex: 1,
    height: 214,
    borderRadius: 26,
    backgroundColor: "#2C2C2E",
    overflow: "hidden",
  },
  accesoGrandeCirculo: {
    position: "absolute",
    right: -26,
    bottom: -26,
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 4,
    borderColor: "#3A3A3C",
    backgroundColor: "#3A3A3C",
    overflow: "hidden",
  },
  accesoGrandeImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  accesoGrandeTexto: {
    position: "absolute",
    left: 16,
    top: 16,
    right: 16,
  },
  accesoFlecha: {
    position: "absolute",
    left: 16,
    bottom: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fa6205",
    alignItems: "center",
    justifyContent: "center",
  },
  accesoChico: {
    height: 102,
    borderRadius: 24,
    backgroundColor: "#2C2C2E",
    padding: 14,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  accesoViaje: {
    backgroundColor: "#fa6205",
  },
  accesoChicoCirculo: {
    position: "absolute",
    right: -10,
    top: -10,
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: "#3A3A3C",
    backgroundColor: "#3A3A3C",
    overflow: "hidden",
  },
  accesoViajeCirculo: {
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "#fa6205",
  },
  accesoChicoImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  accesoViajeFila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accesoTitulo: {
    fontSize: 15,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#FFF",
  },
  accesoSub: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },

  favRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C2C2E",
    borderRadius: 27,
    height: 54,
    paddingLeft: 10,
    paddingRight: 8,
    marginTop: 10,
    gap: 10,
  },
  favRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(251,113,133,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  favRowText: { flex: 1 },
  favRowTitle: {
    fontSize: 13.5,
    fontFamily: "Montserrat_700Bold",
    color: "#FFF",
  },
  favRowSub: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: "rgba(255,255,255,0.55)",
  },
  favCat: {
    alignItems: "center",
  },
  favCatImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#2C2C2E",
  },
  favCatFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  favCatInitial: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    color: "#FF5500",
  },
  favFlecha: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#3A3A3C",
    alignItems: "center",
    justifyContent: "center",
  },

  // Modal con mapa
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    width: "100%",
    maxHeight: height * 0.9,
  },
  modalGrabber: {
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E4E4E7",
    alignSelf: "center",
    marginBottom: 14,
  },
  modalLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F4F5",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 19,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#1C1C1E",
  },
  mapContainer: {
    width: "100%",
    height: Math.min(width * 0.82, 340),
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
    backgroundColor: "#F4F4F5",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  centerMapButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#FFF",
    width: 42,
    height: 42,
    borderRadius: 21,
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
    gap: 12,
    width: "100%",
    backgroundColor: "#F4F4F5",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  locationInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  locationAddressModal: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "Montserrat_600SemiBold",
    color: "#1C1C1E",
  },
  modalButtonsContainer: {
    flexDirection: "row",
    width: "100%",
    marginTop: 16,
    gap: 10,
  },
  cancelButton: {
    height: 54,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
  },
  saveButton: {
    flex: 1,
    height: 54,
    borderRadius: 999,
    backgroundColor: "#fa6205",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  saveButtonText: {
    color: "#FFF",
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
  },
});
