import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Platform,
  Dimensions,
  Alert,
  Image,
  FlatList,
  Linking,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_600SemiBold,
  Montserrat_500Medium,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import AlertaModal from "../../components/ErrorModal";
import * as ImagePicker from "expo-image-picker";

const { width } = Dimensions.get("window");

// Colores para los paquetes
const packageColors = [
  "#4AA3DF",
  "#fa6205",
  "#9B59B6",
  "#E67E22",
  "#F39C12",
  "#fa6205",
];

const Wallet = () => {
  const [packages, setPackages] = useState([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentImage, setPaymentImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalAvailableSales, setTotalAvailableSales] = useState(0);
  const [totalPermittedSales, setTotalPermittedSales] = useState(0);
  const [completedSales, setCompletedSales] = useState(0);
  const [totalConsumed, setTotalConsumed] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [completedReservations, setCompletedReservations] = useState(0);
  const [freeSubscriptionModal, setFreeSubscriptionModal] = useState(false);
  const [hasClaimedFree, setHasClaimedFree] = useState(false);
  const [loadingFreeClaim, setLoadingFreeClaim] = useState(false);
  const [userType, setUserType] = useState("");
  const [freePackageAvailable, setFreePackageAvailable] = useState(null);
  const [loadingFreePackageCheck, setLoadingFreePackageCheck] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ title: "", message: "", type: "info", onConfirm: null });
  const showAlert = (title, message, type, onConfirm) => {
    setAlertData({ title, message, type: type || (title === "Éxito" ? "success" : "error"), onConfirm });
    setAlertVisible(true);
  };

  const totaldia = totalPermittedSales - totalConsumed;
  const navigation = useNavigation();

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_600SemiBold,
    Montserrat_500Medium,
  });

  // Solicitar permisos al inicio
  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Se requieren permisos",
            "Necesitamos permisos para acceder a tu galería de fotos"
          );
        }
      }
    })();
  }, []);

  // Cargar suscripciones y datos activos al montar el componente
  useEffect(() => {
    fetchSubscriptions();
    fetchActiveSubscriptions();
    fetchUserStoreStatus(); // Agregar esta línea
    getUserTypeAndCheckFreePackage(); // Cambiar esta función
  }, []);

  // Función para obtener suscripciones activas
  const fetchActiveSubscriptions = async () => {
    try {
      setLoadingSubscriptions(true);

      // Obtener token
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      // Realizar la petición a la API para obtener suscripciones activas
      const response = await fetch(`${BASE_URL}user-suscripcion`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error en la petición: ${response.status}`);
      }

      const result = await response.json();
      console.log("Suscripciones activas:", result);

      if (result.status && Array.isArray(result.data)) {
        setActiveSubscriptions(result.data);

        // Calcular total de ventas disponibles basado en suscripciones aprobadas
        const availableSales = result.data
          .filter((sub) => sub.estado === "aprobado")
          .reduce((total, sub) => {
            return total + (sub.suscripcion?.cantidad || 0);
          }, 0);

        setTotalAvailableSales(availableSales);
      }
    } catch (error) {
      console.error("Error al obtener suscripciones activas:", error);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoadingPackages(true);

      // Obtener token
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      // Intentar obtener el tipo de usuario de múltiples fuentes
      let tipoUsuario = await AsyncStorage.getItem("tipoUsuario");

      // Si no hay tipo de usuario en AsyncStorage, intentar obtenerlo del perfil
      if (!tipoUsuario) {
        console.log(
          "Tipo de usuario no encontrado en AsyncStorage, intentando obtener del perfil"
        );

        // Obtener datos del usuario actual
        const userResponse = await fetch(`${BASE_URL}usuario/perfil`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData && userData.data && userData.data.tipo_usuario) {
            tipoUsuario = userData.data.tipo_usuario;
            console.log("Tipo de usuario obtenido del perfil:", tipoUsuario);

            // Guardar para futuras referencias
            await AsyncStorage.setItem("tipoUsuario", tipoUsuario);
          }
        }
      }

      // Si aún no tenemos tipo de usuario, usar uno por defecto
      if (!tipoUsuario) {
        // Intentamos averiguar el tipo de usuario por la pantalla actual
        const currentRoute =
          navigation.getState().routes[navigation.getState().index];

        if (currentRoute && currentRoute.name.includes("Delivery")) {
          tipoUsuario = "delivery";
        } else if (currentRoute && currentRoute.name.includes("Aliado")) {
          tipoUsuario = "comercio";
        } else {
          tipoUsuario = "comercio"; // Valor por defecto
        }

        console.log("Usando tipo de usuario por defecto:", tipoUsuario);

        // Guardar para futuras referencias
        await AsyncStorage.setItem("tipoUsuario", tipoUsuario);
      }

      console.log("Tipo de usuario utilizado:", tipoUsuario);

      // Realizar la petición a la API
      const response = await fetch(`${BASE_URL}suscripcion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tipo_usuario: tipoUsuario,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en la petición: ${response.status}`);
      }

      const data = await response.json();
      console.log("Respuesta de la API:", data);

      if (data && Array.isArray(data)) {
        // Mapear los datos para asignar colores a cada paquete
        const formattedPackages = data.map((pkg, index) => ({
          id: pkg.id,
          title: pkg.nombre,
          sales: pkg.cantidad,
          price: pkg.precio,
          color: packageColors[index % packageColors.length],
          description: `Paquete que incluye ${pkg.cantidad} ventas para tu negocio.`,
        }));

        setPackages(formattedPackages);
      } else {
        throw new Error("Formato de respuesta no válido");
      }
    } catch (error) {
      console.error("Error al obtener suscripciones:", error);
      Alert.alert(
        "Error",
        "No se pudieron cargar los paquetes disponibles. Por favor, intenta de nuevo más tarde."
      );
      // Establecer paquetes por defecto para no mostrar una pantalla vacía
      setPackages([
        {
          id: 1,
          title: "Paquete Básico",
          sales: 10,
          price: 5000,
          color: "#4AA3DF",
          description:
            "Ideal para comenzar. Incluye 10 ventas para tu negocio.",
        },
      ]);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    setModalVisible(true);
    setPaymentComplete(false);
    setPaymentImage(null);
    setUploadProgress(0);
  };

  // Función para seleccionar imagen de la galería
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPaymentImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error al seleccionar imagen:", error);
      Alert.alert(
        "Error",
        "No se pudo seleccionar la imagen. Intente nuevamente."
      );
    }
  };

  // Función para tomar foto con la cámara
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Se requieren permisos",
          "Necesitamos permisos para acceder a tu cámara"
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPaymentImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error al tomar foto:", error);
      showAlert("Error", "No se pudo tomar la foto. Intente nuevamente.");
    }
  };

  // Función para obtener la URL de imagen
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${BASE_URL.toString().replace("/api", "")}/storage/${path}`;
  };

  // Nueva función para manejar el pago por link
  const handlePaymentLink = async () => {
    if (!selectedPackage) {
      showAlert("Error", "No se ha seleccionado ningún paquete");
      return;
    }

    setLoading(true);

    try {
      // Get user token and user ID
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      // First we need to create the subscription in the system
      const response = await fetch(`${BASE_URL}user-suscripcion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          suscripcion_id: selectedPackage.id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error("Error al crear la suscripción");
      }

      // Parse response as JSON
      const contentType = response.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
        console.log("Respuesta del servidor:", data);
      } else {
        // Handle non-JSON response
        const textResponse = await response.text();
        console.log("Respuesta no-JSON del servidor:", textResponse);
        data = { status: response.ok };
      }

      // Get the user_suscripcion_id from the response or make a separate call to get it
      let userSuscripcionId;
      if (data && (data.id || (data.data && data.data.id))) {
        userSuscripcionId = data.id || data.data.id;
      } else {
        // If we don't have the ID, fetch the most recent subscription
        const subscriptionsResponse = await fetch(
          `${BASE_URL}user-suscripcion`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (subscriptionsResponse.ok) {
          const subscriptionsData = await subscriptionsResponse.json();
          if (
            subscriptionsData.status &&
            Array.isArray(subscriptionsData.data) &&
            subscriptionsData.data.length > 0
          ) {
            // Use the most recent subscription
            userSuscripcionId = subscriptionsData.data[0].id;
          }
        }
      }

      // Get user ID
      const userId = await AsyncStorage.getItem("userId");

      if (!userId || !userSuscripcionId) {
        throw new Error(
          "No se pudo obtener la información necesaria para procesar el pago"
        );
      }

      // Create the payment URL
      const paymentUrl = `https://back.carbycol.com/proceso-pago/pago-suscripcion?user_id=${userId}&user_suscripcion_id=${userSuscripcionId}&amount=${selectedPackage.price}`;
      console.log("URL de pago:", paymentUrl);

      // Open the payment URL
      const supported = await Linking.canOpenURL(paymentUrl);

      if (supported) {
        await Linking.openURL(paymentUrl);

        // Show success message after returning from payment
        setTimeout(() => {
          setPaymentComplete(true);
          setLoading(false);
          // Refresh subscriptions after payment
          fetchActiveSubscriptions();
        }, 500);
      } else {
        throw new Error(`No se puede abrir la URL: ${paymentUrl}`);
      }
    } catch (error) {
      console.error("Error en proceso de pago:", error);
      showAlert("Error", "No se pudo procesar el pago. Intente nuevamente.");
      setLoading(false);
    }
  };

  // Función para enviar la suscripción con el comprobante
  const submitPaymentProof = async () => {
    if (!paymentImage) {
      showAlert("Error", "Por favor cargue un comprobante de pago");
      return;
    }

    if (!selectedPackage) {
      showAlert("Error", "No se ha seleccionado ningún paquete");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      // Crear FormData para enviar la imagen
      const formData = new FormData();
      const filename = paymentImage.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image";

      formData.append("suscripcion_id", selectedPackage.id.toString());
      formData.append("archivo", {
        uri:
          Platform.OS === "android"
            ? paymentImage
            : paymentImage.replace("file://", ""),
        name: filename,
        type,
      });

      console.log("Enviando datos:", formData);

      // Simulación de progreso de carga
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 0.1;
          return newProgress > 0.9 ? 0.9 : newProgress;
        });
      }, 300);

      const response = await fetch(`${BASE_URL}user-suscripcion`, {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);

      const data = await response.json();
      console.log("Respuesta del servidor:", data);

      if (response.ok) {
        setUploadProgress(1);
        setTimeout(() => {
          setPaymentComplete(true);
          setLoading(false);
          // Actualizar suscripciones activas después de enviar una nueva
          fetchActiveSubscriptions();
        }, 500);
      } else {
        throw new Error(
          data.message || "Error al enviar el comprobante de pago"
        );
      }
    } catch (error) {
      console.error("Error enviando comprobante:", error);
      Alert.alert(
        "Error",
        "No se pudo enviar el comprobante de pago. Intente nuevamente."
      );
      setLoading(false);
    }
  };
  // Agregar en las funciones principales, después de los estados

  const fetchUserStoreStatus = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      const userId = await AsyncStorage.getItem("userId");

      if (!token || !userId) {
        throw new Error("No se encontró token o ID de usuario");
      }

      // Consultar el nuevo endpoint para obtener datos del comercio
      const response = await fetch(`${BASE_URL}activo/comercio/${userId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("Datos de estado del comercio:", data);
      if (data.success) {
        // Almacenar todos los valores devueltos por la API
        const totalAllowed = data.total_permitido || 0;
        const totalConsumed = data.total_consumido || 0;
        const completedOrders = data.completados_pedidos || 0;
        const completedReservations = data.completados_reservas || 0;
        const available = totalAllowed - totalConsumed;

        // Actualizar todos los estados
        setTotalPermittedSales(totalAllowed);
        setTotalConsumed(totalConsumed);
        setCompletedOrders(completedOrders);
        setCompletedReservations(completedReservations);
        setTotalAvailableSales(available);
        setCompletedSales(totalConsumed); // Para mantener compatibilidad

        // Guardar en AsyncStorage para persistencia
        await AsyncStorage.setItem("availableSales", available.toString());
        await AsyncStorage.setItem(
          "totalPermittedSales",
          totalAllowed.toString()
        );
        await AsyncStorage.setItem("totalConsumed", totalConsumed.toString());
        await AsyncStorage.setItem(
          "completedOrders",
          completedOrders.toString()
        );
        await AsyncStorage.setItem(
          "completedReservations",
          completedReservations.toString()
        );

        console.log(
          `Ventas: ${available} disponibles (${totalAllowed} totales - ${totalConsumed} consumidas)`
        );
      } else {
        throw new Error("Respuesta de API no válida");
      }
    } catch (error) {
      console.error("Error obteniendo datos del comercio:", error);
      // En caso de error, intentar usar valores guardados previamente
      const savedSales = await AsyncStorage.getItem("availableSales");
      const savedTotal = await AsyncStorage.getItem("totalPermittedSales");
      const savedConsumed = await AsyncStorage.getItem("totalConsumed");
      const savedOrders = await AsyncStorage.getItem("completedOrders");
      const savedReservations = await AsyncStorage.getItem(
        "completedReservations"
      );

      setTotalAvailableSales(savedSales ? parseInt(savedSales) : 0);
      setTotalPermittedSales(savedTotal ? parseInt(savedTotal) : 0);
      setTotalConsumed(savedConsumed ? parseInt(savedConsumed) : 0);
      setCompletedOrders(savedOrders ? parseInt(savedOrders) : 0);
      setCompletedReservations(
        savedReservations ? parseInt(savedReservations) : 0
      );
      setCompletedSales(savedConsumed ? parseInt(savedConsumed) : 0);
    } finally {
      setLoading(false);
    }
  };
  const closeModal = () => {
    setModalVisible(false);
    setLoading(false);
    setPaymentComplete(false);
    setPaymentImage(null);
    setUploadProgress(0);
  };

  // Helper para formatear precio
  const formatPrice = (price) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Helper para formatear fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  // Helper para obtener color de estado
  const getStatusColor = (status) => {
    switch (status) {
      case "aprobado":
        return "#fa6205";
      case "pendiente":
        return "#F39C12";
      case "rechazado":
        return "#E74C3C";
      default:
        return "#95A5A6";
    }
  };

  // Helper para formatear estado
  const formatStatus = (status) => {
    switch (status) {
      case "aprobado":
        return "Aprobado";
      case "pendiente":
        return "Pendiente";
      case "rechazado":
        return "Rechazado";
      default:
        return "Desconocido";
    }
  };

  // Función para obtener el tipo de usuario y verificar paquete gratuito
  const getUserTypeAndCheckFreePackage = async () => {
    try {
      console.log("=== DEBUG getUserTypeAndCheckFreePackage ===");
      const token = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");
      
      console.log("Token encontrado:", !!token);
      console.log("UserData encontrado:", !!userData);
      
      if (!token || !userData) {
        console.log("No se encontró token o datos de usuario");
        return;
      }

      const userInfo = JSON.parse(userData);
      console.log("UserInfo parseado:", userInfo);
      
      const tipoUsuario = userInfo?.tipo_usuario;
      console.log("Tipo usuario extraído:", tipoUsuario);
      
      if (!tipoUsuario) {
        console.log("No se encontró tipo_usuario en los datos");
        return;
      }

      setUserType(tipoUsuario);
      console.log("=== END DEBUG getUserTypeAndCheckFreePackage ===");

    } catch (error) {
      console.error("Error obteniendo datos de usuario:", error);
      setUserType("comercio"); // Valor por defecto
    }
  };

  // Función para reclamar suscripción gratuita
  const claimFreeSubscription = async () => {
    if (!freePackageAvailable) {
      showAlert("Error", "No hay paquete gratuito disponible");
      return;
    }

    setLoadingFreeClaim(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      // Usar la API suscripcion/store para activar el paquete
      const response = await fetch(`${BASE_URL}suscripcion/store`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          suscripcion_id: freePackageAvailable.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Error al activar suscripción gratuita"
        );
      }

      const data = await response.json();
      console.log("Suscripción gratuita activada:", data);

      // Marcar como reclamada
      setHasClaimedFree(true);
      setFreePackageAvailable(null);

      // Actualizar datos
      fetchActiveSubscriptions();
      fetchUserStoreStatus();

      Alert.alert(
        "¡Felicitaciones!",
        "Has activado tu suscripción gratuita de bienvenida exitosamente. Ya puedes comenzar a vender.",
        [{ text: "¡Genial!", onPress: () => setFreeSubscriptionModal(false) }]
      );
    } catch (error) {
      console.error("Error activando suscripción gratuita:", error);
      Alert.alert(
        "Error",
        error.message ||
          "No se pudo activar la suscripción gratuita. Intenta nuevamente."
      );
    } finally {
      setLoadingFreeClaim(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fa6205" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Mi Billetera</Text>
      </View>

      {/* Loading indicator para verificación de paquete gratuito */}
      {loadingFreePackageCheck && (
        <View style={styles.loadingFreePackageContainer}>
          <ActivityIndicator size="small" color="#fa6205" />
          <Text style={styles.loadingFreePackageText}>Verificando paquete gratuito...</Text>
        </View>
      )}

      {/* Botón de suscripción gratuita */}
      {(() => {
        console.log("=== DEBUG RENDER BUTTON ===");
        console.log("Render check - freePackageAvailable:", freePackageAvailable);
        console.log("Render check - hasClaimedFree:", hasClaimedFree);
        console.log("Render check - userType:", userType);
        console.log("Render check - loadingFreePackageCheck:", loadingFreePackageCheck);
        console.log("Botón de regalo visible:", freePackageAvailable && !hasClaimedFree);
        console.log("=== END DEBUG RENDER BUTTON ===");
        return freePackageAvailable && !hasClaimedFree;
      })() && (
        <TouchableOpacity
          style={styles.freeSubscriptionButton}
          onPress={() => setFreeSubscriptionModal(true)}
        >
          <View style={styles.freeSubscriptionContent}>
            <FontAwesome5
              name="gift"
              size={20}
              color="#FFF"
              style={styles.giftIcon}
            />
            <View style={styles.freeSubscriptionTextContainer}>
              <Text style={styles.freeSubscriptionTitle}>
                🎁 ¡Regalo de Bienvenida!
              </Text>
              <Text style={styles.freeSubscriptionSubtitle}>
                {freePackageAvailable?.nombre || "Paquete gratuito disponible"}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </View>
        </TouchableOpacity>
      )}
      {/* Main Content */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Ventas Disponibles</Text>
          <Text style={styles.balanceAmount}>{totaldia} Ventas</Text>
          <Text style={styles.balanceSubtitle}>
            Has completado {completedSales} de {totalPermittedSales} ventas
            permitidas
          </Text>
        </View>

        {/* Suscripciones Activas */}
        <Text style={styles.sectionTitle}>Mis Suscripciones</Text>

        {loadingSubscriptions ? (
          <View style={styles.loadingSubscriptionsContainer}>
            <ActivityIndicator size="large" color="#fa6205" />
            <Text style={styles.loadingSubscriptionsText}>
              Cargando suscripciones...
            </Text>
          </View>
        ) : activeSubscriptions.length > 0 ? (
          activeSubscriptions.map((subscription, index) => (
            <View
              key={subscription.id}
              style={[
                styles.subscriptionCard,
                {
                  borderLeftColor: getStatusColor(subscription.estado),
                  marginBottom:
                    index === activeSubscriptions.length - 1 ? 25 : 15,
                },
              ]}
            >
              <View style={styles.subscriptionHeader}>
                <Text style={styles.subscriptionName}>
                  {subscription.suscripcion?.nombre || "Suscripción"}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(subscription.estado) },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {formatStatus(subscription.estado)}
                  </Text>
                </View>
              </View>

              <View style={styles.subscriptionDetails}>
                <View style={styles.detailItem}>
                  <FontAwesome5
                    name="shopping-cart"
                    size={14}
                    color="#fa6205"
                    style={styles.detailIcon}
                  />
                  <Text style={styles.detailText}>
                    {subscription.suscripcion?.cantidad || 0} Ventas
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <FontAwesome5
                    name="money-bill-wave"
                    size={14}
                    color="#fa6205"
                    style={styles.detailIcon}
                  />
                  <Text style={styles.detailText}>
                    $  {formatPrice(subscription.suscripcion?.precio || 0)}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <FontAwesome5
                    name="calendar-alt"
                    size={14}
                    color="#fa6205"
                    style={styles.detailIcon}
                  />
                  <Text style={styles.detailText}>
                    {formatDate(subscription.created_at)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noSubscriptionsContainer}>
            <FontAwesome5 name="exclamation-circle" size={50} color="#ccc" />
            <Text style={styles.noSubscriptionsText}>
              No tienes suscripciones activas
            </Text>
            <Text style={styles.noSubscriptionsSubText}>
              Adquiere un paquete para comenzar a vender
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Paquetes Disponibles</Text>

        {loadingPackages ? (
          <View style={styles.loadingPackagesContainer}>
            <ActivityIndicator size="large" color="#fa6205" />
            <Text style={styles.loadingPackagesText}>Cargando paquetes...</Text>
          </View>
        ) : packages.length > 0 ? (
          packages.map((pkg) => (
            <TouchableOpacity
              key={pkg.id}
              style={[styles.packageCard, { borderLeftColor: pkg.color }]}
              onPress={() => handlePackageSelect(pkg)}
            >
              <View style={styles.packageHeader}>
                <Text style={styles.packageTitle}>{pkg.title}</Text>
              </View>

              {/* Precio con fondo adaptativo */}
              <View style={styles.priceContainer}>
                <View
                  style={[styles.priceBadge, { backgroundColor: pkg.color }]}
                >
                  <Text style={styles.priceText}>
                    $  {formatPrice(pkg.price)}
                  </Text>
                </View>
              </View>

              <Text style={styles.salesText}>{pkg.sales} Ventas</Text>
              <Text style={styles.packageDescription}>{pkg.description}</Text>

              <View style={styles.buyButtonContainer}>
                <TouchableOpacity
                  style={[styles.buyButton, { backgroundColor: pkg.color }]}
                  onPress={() => handlePackageSelect(pkg)}
                >
                  <Text style={styles.buyButtonText}>Comprar Ahora</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noPackagesContainer}>
            <Text style={styles.noPackagesText}>
              No hay paquetes disponibles en este momento.
            </Text>
          </View>
        )}

        <Text style={styles.infoText}>
          Los paquetes adquiridos se verán reflejados inmediatamente en tu
          cuenta.
        </Text>
        
      
     
      </ScrollView>
      {/* Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Procesar Pago</Text>

            {selectedPackage && (
              <View style={styles.packageSummary}>
                <Text style={styles.packageSummaryTitle}>
                  {selectedPackage.title}
                </Text>
                <Text style={styles.packageSummaryPrice}>
                  $  {formatPrice(selectedPackage.price)}
                </Text>
                <Text style={styles.packageSummarySales}>
                  {selectedPackage.sales} Ventas
                </Text>
              </View>
            )}

            {!loading && !paymentComplete && (
              <View style={styles.paymentOptions}>
                <Text style={styles.paymentTitle}>Realizar pago</Text>

                <Text style={styles.instructionsText}>
                  Serás redirigido a nuestra plataforma de pagos para completar
                  la transacción de forma segura.
                </Text>

                <TouchableOpacity
                  style={styles.payNowButton}
                  onPress={handlePaymentLink}
                >
                  <Text style={styles.payNowButtonText}>Pagar Ahora</Text>
                  <MaterialIcons
                    name="arrow-forward"
                    size={20}
                    color="#1C1C1E"
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>
              </View>
            )}

            {loading && (
              <View style={styles.loadingPayment}>
                <ActivityIndicator size="large" color="#fa6205" />
                <Text style={styles.loadingText}>Procesando pago...</Text>
              </View>
            )}

            {paymentComplete && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={80} color="#fa6205" />
                <Text style={styles.successText}>¡Pago Iniciado!</Text>
                <Text style={styles.successSubtext}>
                  Tu suscripción será activada una vez que completes el pago en
                  la plataforma.
                </Text>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={closeModal}
                >
                  <Text style={styles.doneButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
      {/* Modal de Suscripción Gratuita */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={freeSubscriptionModal}
        onRequestClose={() => setFreeSubscriptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.freeModalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setFreeSubscriptionModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>

            <View style={styles.giftContainer}>
              <View style={styles.giftIconContainer}>
                <FontAwesome5 name="gift" size={60} color="#fa6205" />
              </View>
              <Text style={styles.freeModalTitle}>
                 ¡Regalo de Bienvenida!
              </Text>
              <Text style={styles.freeModalSubtitle}>
                Como nuevo comercio, tienes derecho a una suscripción gratuita
                para comenzar a vender
              </Text>
            </View>

            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>Lo que obtienes:</Text>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#fa6205" />
                <Text style={styles.benefitText}>
                  {freePackageAvailable?.nombre || "Paquete gratuito"}
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#fa6205" />
                <Text style={styles.benefitText}>
                  {freePackageAvailable?.cantidad || 0} ventas incluidas
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#fa6205" />
                <Text style={styles.benefitText}>
                  Comienza a vender inmediatamente
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#fa6205" />
                <Text style={styles.benefitText}>
                  Solo disponible una vez por comercio
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#fa6205" />
                <Text style={styles.benefitText}>
                  Personalizado para tu tipo: {userType}
                </Text>
              </View>
            </View>

            <View style={styles.importantNote}>
              <Ionicons name="information-circle" size={20} color="#F39C12" />
              <Text style={styles.importantNoteText}>
                ¡Importante! Esta oferta solo está disponible una vez por
                comercio.
              </Text>
            </View>

            {!loadingFreeClaim ? (
              <TouchableOpacity
                style={styles.claimButton}
                onPress={claimFreeSubscription}
              >
                <FontAwesome5
                  name="gift"
                  size={16}
                  color="#1C1C1E"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.claimButtonText}>Reclamar Mi Regalo</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.loadingClaimContainer}>
                <ActivityIndicator size="large" color="#fa6205" />
                <Text style={styles.loadingClaimText}>
                  Procesando tu regalo...
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <AlertaModal
        visible={alertVisible}
        tipo={alertData.type}
        mensaje={alertData.message}
        onCerrar={() => {
          setAlertVisible(false);
          if (alertData.onConfirm) alertData.onConfirm();
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? 40 : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fa6205",
    padding: 15,
    paddingTop: Platform.OS === "android" ? 45 : 15,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_700Bold",
    color: "#FFF",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  balanceCard: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  balanceTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: "#fa6205",
    marginBottom: 8,
  },
  balanceAmount: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 32,
    color: "#1C1C1E",
    marginBottom: 8,
  },
  balanceSubtitle: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
  // Nuevos estilos para la organización de datos
  statsContainer: {
    width: "100%",
    marginTop: 15,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: "#fa6205",
    marginBottom: 5,
  },
  statValue: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 20,
    color: "#1C1C1E",
  },
  detailsContainer: {
    backgroundColor: "rgba(155, 254, 3, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginTop: 5,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  detailLabel: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: "#888",
    flex: 1,
  },
  detailValue: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    color: "#fa6205",
  },
  sectionTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 20,
    color: "#1C1C1E",
    marginBottom: 15,
  },
  // Nuevos estilos para las suscripciones activas
  loadingSubscriptionsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    marginBottom: 20,
  },
  loadingSubscriptionsText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    color: "#888",
    marginTop: 10,
  },
  noSubscriptionsContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 25,
    marginBottom: 25,
    alignItems: "center",
  },
  noSubscriptionsText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginTop: 15,
    marginBottom: 5,
  },
  noSubscriptionsSubText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  subscriptionCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderLeftWidth: 5,
  },
  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  subscriptionName: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: "#1C1C1E",
    width: "70%",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    color: "#FFF",
  },
  subscriptionDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 14,
    color: "#888",
  },
  viewReceiptButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  viewReceiptText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: "#555",
    marginLeft: 5,
  },
  // Estilos existentes para paquetes
  loadingPackagesContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    marginBottom: 20,
  },
  loadingPackagesText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    color: "#888",
    marginTop: 10,
  },
  noPackagesContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  noPackagesText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    color: "#888",
    textAlign: "center",
  },
  packageCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 5,
  },
  // Actualizar estos estilos en el objeto styles

  packageHeader: {
    width: "100%",
    marginBottom: 10,
  },
  packageTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    color: "#1C1C1E",
  },
  priceContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  priceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start", // Esto hará que el contenedor se ajuste al tamaño del texto
  },
  priceText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    color: "#1C1C1E",
  },
  salesText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 24,
    color: "#fa6205",
    marginBottom: 8,
  },
  packageDescription: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#888",
    marginBottom: 15,
  },
  buyButtonContainer: {
    alignItems: "flex-end",
  },
  buyButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buyButtonText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 14,
    color: "#1C1C1E",
  },
  infoText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 15,
    marginBottom: 15,
  },
  refreshButton: {
    flexDirection: "row",
    backgroundColor: "#fa6205",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: "center",
    alignItems: "center",
    marginBottom: 30,
    marginTop: 20,
  },
  refreshButtonText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#FFF",
    marginLeft: 8,
  },
  // Estilos para el botón de suscripción gratuita
  freeSubscriptionButton: {
    backgroundColor: "#fa6205",
    borderRadius: 15,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  freeSubscriptionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  giftIcon: {
    marginRight: 12,
  },
  freeSubscriptionTextContainer: {
    flex: 1,
  },
  freeSubscriptionTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    color: "#FFF",
    marginBottom: 2,
  },
  freeSubscriptionSubtitle: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    color: "#FFF",
    opacity: 0.9,
  },
  // Estilos para el modal de suscripción gratuita
  freeModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    width: width * 0.9,
    maxHeight: "80%",
    elevation: 5,
  },
  giftContainer: {
    alignItems: "center",
    marginBottom: 25,
    marginTop: 10,
  },
  giftIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(155, 254, 3, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  freeModalTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 24,
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  freeModalSubtitle: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  benefitsContainer: {
    marginBottom: 20,
  },
  benefitsTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 18,
    color: "#333",
    marginBottom: 15,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  benefitText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 15,
    color: "#666",
    marginLeft: 10,
    flex: 1,
  },
  importantNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(243, 156, 18, 0.1)",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  importantNoteText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 14,
    color: "#E67E22",
    marginLeft: 8,
    flex: 1,
  },
  claimButton: {
    backgroundColor: "#fa6205",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  claimButtonText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    color: "#333",
  },
  loadingClaimContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingClaimText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 16,
    color: "#666",
    marginTop: 10,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxHeight: "80%",
    elevation: 5,
  },
  closeButton: {
    position: "absolute",
    right: 15,
    top: 15,
    zIndex: 1,
  },
  modalTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 22,
    color: "#333",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  packageSummary: {
    alignItems: "center",
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
  },
  packageSummaryTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    color: "#333",
    marginBottom: 5,
  },
  packageSummaryPrice: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 24,
    color: "#fa6205",
    marginBottom: 5,
  },
  packageSummarySales: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: "#666",
  },
  paymentOptions: {
    alignItems: "center",
  },
  paymentTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: "#333",
    marginBottom: 15,
  },
  imagePreviewContainer: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 10,
    marginBottom: 20,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f0f0f0",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 15,
  },
  uploadOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 20,
  },
  uploadOptionButton: {
    alignItems: "center",
    justifyContent: "center",
    width: width * 0.25,
    height: width * 0.25,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
    marginHorizontal: 10,
  },
  uploadOptionText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#333",
    marginTop: 8,
  },
  instructionsText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  submitButton: {
    backgroundColor: "#fa6205",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: "#cccccc",
  },
  submitButtonText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: "#333",
  },
  loadingPayment: {
    alignItems: "center",
    justifyContent: "center",
    height: 250,
  },
  loadingText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: "#333",
    marginTop: 15,
    marginBottom: 15,
  },
  progressBarContainer: {
    width: "80%",
    height: 10,
    backgroundColor: "#e0e0e0",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#fa6205",
  },
  progressText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  successText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 24,
    color: "#fa6205",
    marginTop: 10,
    marginBottom: 5,
  },
  successSubtext: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  doneButton: {
    backgroundColor: "#fa6205",
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
  },
  doneButtonText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: "#1C1C1E",
  },
  // Nuevos estilos para el botón de pago
  payNowButton: {
    backgroundColor: "#fa6205",
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  payNowButtonText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: "#1C1C1E",
  },
  loadingFreePackageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F0F0",
    marginHorizontal: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  loadingFreePackageText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 14,
    color: "#666",
    marginLeft: 10,
  },
});

export default Wallet;
