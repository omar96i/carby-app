import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Platform,
  Dimensions,
  Alert,
  Linking,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_600SemiBold,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";

const { width } = Dimensions.get("window");

// Colores para los paquetes
const packageColors = [
  "#FF7043",
  "#42A5F5",
  "#7E57C2",
  "#26A69A",
  "#FFA726",
  "#EC407A",
];

const WalletRider = () => {
  const [packages, setPackages] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [availableDeliveries, setAvailableDeliveries] = useState(0);
  const [carriersUsed, setCarriersUsed] = useState(0);
  const [totalPermittedDeliveries, setTotalPermittedDeliveries] = useState(0);
  const [completedDeliveries, setCompletedDeliveries] = useState(0);
  const [freeSubscriptionModal, setFreeSubscriptionModal] = useState(false);
  const [hasClaimedFree, setHasClaimedFree] = useState(false);
  const [loadingFreeClaim, setLoadingFreeClaim] = useState(false);
  const [riderType, setRiderType] = useState("");
  const [freePackageAvailable, setFreePackageAvailable] = useState(null);
  const [loadingFreePackageCheck, setLoadingFreePackageCheck] = useState(false);

  const navigation = useNavigation();
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_600SemiBold,
  });

  // Cargar suscripciones desde la API al montar el componente
  useEffect(() => {
    console.log("WalletRider useEffect ejecutándose...");
    fetchSubscriptions();
    getUserTypeAndCheckFreePackage(); // Cambiar esta función
  }, []);


  useEffect(() => {
    console.log("Desde el useEffect")
    getAvailableDeliveries()
  }, []);

  const getAvailableDeliveries = async () => {
    console.log("entro aqui muchas veces")
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      const userId = await AsyncStorage.getItem("userId");

      if (!token || !userId) {
        throw new Error("No se encontró token o ID de usuario");
      }

      // Usar el nuevo endpoint para obtener datos de entregas
      const response = await fetch(`${BASE_URL}activo/conductor/${userId}`, {
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

      if (data.success) {
        // Establecer los valores devueltos por la API
        const totalAllowed = data.total_permitido || 0;
        const completed = data.completados || 0;
        const available = totalAllowed - completed;

        setTotalPermittedDeliveries(totalAllowed);
        setCompletedDeliveries(completed);
        setAvailableDeliveries(available);
        setCarriersUsed(completed); // Para mantener compatibilidad con el código existente

        // Guardar en AsyncStorage para persistencia
        await AsyncStorage.setItem("availableDeliveries", available.toString());
        await AsyncStorage.setItem(
          "totalPermittedDeliveries",
          totalAllowed.toString()
        );
        await AsyncStorage.setItem("completedDeliveries", completed.toString());
      } else {
        throw new Error("Respuesta de API no válida");
      }
    } catch (error) {
      console.error("Error obteniendo datos de entregas:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener suscripciones activas
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [loadingActiveSubscriptions, setLoadingActiveSubscriptions] =
    useState(false);

  useEffect(() => {
    fetchActiveSubscriptions2()
  }, []);

  const fetchActiveSubscriptions2 = async () => {
    try {
      setLoadingActiveSubscriptions(true);

      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      // URL para obtener todas las suscripciones del usuario
      const response = await fetch(`${BASE_URL}user-suscripcion`, {
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

      if (data && Array.isArray(data.data)) {
        setActiveSubscriptions(data.data);
        getAvailableDeliveries();
      } else {
        setActiveSubscriptions([]);
      }
    } catch (error) {
      console.error("Error obteniendo suscripciones:", error);
    } finally {
      setLoadingActiveSubscriptions(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoadingPackages(true);

      // Obtener el token de autenticación
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      // Obtener el tipo de usuario desde AsyncStorage
      const userData = await AsyncStorage.getItem("userData");
      const userInfo = userData ? JSON.parse(userData) : null;
      const tipoUsuario = userInfo?.tipo_usuario || "rider";

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

      // Verificar primero la respuesta antes de intentar parsear como JSON
      const textResponse = await response.text();
      console.log(
        "Respuesta bruta del servidor:",
        textResponse.substring(0, 150) + "..."
      );

      if (!response.ok) {
        throw new Error(
          `Error en la petición: ${response.status
          }. Respuesta: ${textResponse.substring(0, 100)}`
        );
      }

      // Intentar parsear la respuesta como JSON
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error("Error al parsear JSON:", parseError);
        console.log(
          "Respuesta que causó el error:",
          textResponse.substring(0, 250)
        );
        throw new Error("La respuesta del servidor no es un JSON válido");
      }

      if (data && Array.isArray(data)) {
        // Mapear los datos para adaptarlos al formato esperado por el componente
        const formattedPackages = data.map((pkg, index) => ({
          id: pkg.id,
          title: pkg.nombre,
          deliveries: pkg.cantidad,
          price: pkg.precio,
          color: packageColors[index % packageColors.length],
          description: `Paquete que incluye ${pkg.cantidad} entregas para tus servicios.`,
        }));

        setPackages(formattedPackages);
      } else {
        throw new Error(
          "Formato de respuesta no válido. Esperaba un array pero recibí: " +
          (typeof data === "object"
            ? JSON.stringify(data).substring(0, 100)
            : typeof data)
        );
      }
    } catch (error) {
      console.error("Error al obtener suscripciones:", error);
      Alert.alert(
        "Error",
        "No se pudieron cargar los paquetes disponibles. Intenta de nuevo más tarde."
      );
      // Establecer paquetes por defecto para no mostrar una pantalla vacía
      setPackages([
        {
          id: 1,
          title: "Paquete Inicial",
          deliveries: 20,
          price: 5000,
          color: "#FF7043",
          description:
            "Ideal para conductores que inician. Incluye 20 entregas.",
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
    setPaymentStatus("pending");
  };

  // Función para pagar con Mercado Pago
  // Update your state variables at the top of the component

  // Update the payWithMercadoPago function
  const payWithMercadoPago = async () => {
    if (!selectedPackage) {
      Alert.alert("Error", "No se ha seleccionado ningún paquete");
      return;
    }

    try {
      // Set loading state only when starting the payment process
      setLoading(true);

      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      // Obtain user data
      const userData = await AsyncStorage.getItem("userData");
      const userInfo = userData ? JSON.parse(userData) : null;
      const userId = userInfo?.id;

      if (!userId) {
        throw new Error("No se pudo obtener el ID de usuario");
      }

      // Create subscription in API before redirecting to payment
      console.log("Creando suscripción...");
      const createSubscriptionResponse = await fetch(
        `${BASE_URL}user-suscripcion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            suscripcion_id: selectedPackage.id,
          }),
        }
      );

      if (!createSubscriptionResponse.ok) {
        const errorData = await createSubscriptionResponse.text();
        console.error("Error al crear suscripción:", errorData);
        throw new Error("No se pudo crear la suscripción");
      }

      const subscriptionData = await createSubscriptionResponse.json();
      console.log("Suscripción creada:", subscriptionData);

      // Store the specific subscription ID
      const currentSubscriptionId = subscriptionData.suscripcion.id;
      const domainRoot = BASE_URL.toString().replace("/api/", "");
      // URL for Mercado Pago payment
      const paymentUrl = `${domainRoot}/proceso-pago/pago-suscripcion?user_id=${userId}&user_suscripcion_id=${currentSubscriptionId}&amount=${selectedPackage.price}`;

      // Turn off loading before showing alert
      setLoading(false);

      // Check if we can open the URL
      const canOpen = await Linking.canOpenURL(paymentUrl);
      if (!canOpen) {
        throw new Error("No se puede abrir la URL de pago");
      }

      // Show alert message before opening browser
      Alert.alert(
        "Redirección a Mercado Pago",
        "Serás redirigido al sitio de Mercado Pago para completar tu pago. Vuelve a la aplicación cuando hayas finalizado.",
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Continuar",
            onPress: async () => {
              // Set processing state to true to show "procesando" indicator
              setPaymentProcessing(true);

              // Open the URL in browser
              await Linking.openURL(paymentUrl);

              // Set a timeout to show the payment complete message after 20 seconds
              setTimeout(() => {
                setPaymentProcessing(false);
                setPaymentComplete(true);
              }, 20000); // 20 seconds
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error al iniciar pago con Mercado Pago:", error);
      Alert.alert(
        "Error",
        "No se pudo iniciar el pago con Mercado Pago. Intente nuevamente."
      );
      setLoading(false);
      setPaymentProcessing(false);
    }
  };

  // Update closeModal function to reset all states
  const closeModal = () => {
    setModalVisible(false);
    setLoading(false);
    setPaymentComplete(false);
    setPaymentProcessing(false);
    setPaymentStatus("pending");
  };

  // Función para obtener el tipo de usuario y verificar paquete gratuito
  const getUserTypeAndCheckFreePackage = async () => {
    try {
      console.log("=== DEBUG getUserTypeAndCheckFreePackage RIDER ===");
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

      setRiderType(tipoUsuario);
      console.log("Tipo de usuario establecido:", tipoUsuario);

      console.log("=== END DEBUG getUserTypeAndCheckFreePackage RIDER ===");

    } catch (error) {
      console.error("Error obteniendo datos de usuario:", error);
      setRiderType("rider.moto"); // Valor por defecto
    }
  };

  // Función para verificar si hay paquete gratuito disponible
  const checkFreePackageAvailability = async (tipoUsuario, token) => {
    try {
      setLoadingFreePackageCheck(true);

      const response = await fetch(`${BASE_URL}suscripcion/getFree`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tipo_usuario: tipoUsuario,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("Respuesta de getFree:", data);
      console.log("Respuesta de getFree - estructura completa:", JSON.stringify(data, null, 2));

      // Revisar diferentes estructuras de respuesta posibles
      let packageData = null;

      if (data && data.status === true && data.suscripcion) {
        // Estructura: { status: true, suscripcion: {...} }
        packageData = data.suscripcion;
        console.log("Estructura tipo 1 detectada - suscripcion:", packageData);
      } else if (data && data.data) {
        // Estructura: { data: {...} }
        packageData = data.data;
        console.log("Estructura tipo 2 detectada - data:", packageData);
      } else if (data && data.suscripcion) {
        // Estructura: { suscripcion: {...} }
        packageData = data.suscripcion;
        console.log("Estructura tipo 3 detectada - suscripcion directa:", packageData);
      }

      if (packageData) {
        setFreePackageAvailable(packageData);
        setHasClaimedFree(false); // Mostrar el botón
        console.log("Paquete gratuito disponible:", packageData);
      } else {
        setFreePackageAvailable(null);
        setHasClaimedFree(true); // No mostrar el botón
        console.log("No hay paquete gratuito disponible - data:", data);
      }

    } catch (error) {
      console.error("Error verificando paquete gratuito:", error);
      setFreePackageAvailable(null);
      setHasClaimedFree(true); // En caso de error, no mostrar el botón
    } finally {
      setLoadingFreePackageCheck(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9BFE03" />
      </View>
    );
  }
  const getStatusColor = (status) => {
    switch (status) {
      case "activo":
        return "#9BFE03"; // verde
      case "pendiente":
        return "#FFA726"; // naranja
      case "rechazado":
        return "#F44336"; // rojo
      case "aprobado":
        return "#2ECC71"; // verde oscuro
      default:
        return "#999"; // gris por defecto
    }
  };

  const formatStatus = (status) => {
    switch (status) {
      case "activo":
        return "Activa";
      case "pendiente":
        return "Pendiente";
      case "rechazado":
        return "Rechazada";
      case "aprobado":
        return "Aprobada";
      default:
        return status || "Desconocido";
    }
  };
  const formatPrice = (price) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={25} color="#2B2B2B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billetera de Rider</Text>
        <View style={styles.placeholder}></View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Estado de Entregas</Text>
          <Text style={styles.balanceAmount}>
            {availableDeliveries} Disponibles
          </Text>

          {/* Stats Container */}
          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total Permitido</Text>
                <Text style={styles.statValue}>{totalPermittedDeliveries}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total Completado</Text>
                <Text style={styles.statValue}>{completedDeliveries}</Text>
              </View>
            </View>
          </View>

          {/* Details Container */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Entregas Completadas:</Text>
              <Text style={styles.detailValue}>{completedDeliveries}</Text>
            </View>
          </View>
        </View>
        {/* Sección para mostrar suscripciones activas */}
        {activeSubscriptions.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Mis Suscripciones</Text>
            <View style={styles.activeSubscriptionsContainer}>
              {activeSubscriptions.map((sub, index) => (
                <View
                  key={index}
                  style={[
                    styles.activeSubscriptionCard,
                    { borderLeftColor: getStatusColor(sub.estado) },
                  ]}
                >
                  <Text style={styles.activeSubscriptionName}>
                    {sub.suscripcion?.nombre || "Paquete"}
                  </Text>
                  <View style={styles.activeSubscriptionDetails}>
                    <Text style={styles.activeSubscriptionInfo}>
                      Entregas: {sub.suscripcion?.cantidad || 0}
                    </Text>
                    <Text style={styles.activeSubscriptionInfo}>
                      Estado: {formatStatus(sub.estado)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => {
            fetchActiveSubscriptions2();
            getUserTypeAndCheckFreePackage(); // Agregar esta línea
          }}
        >
          <Ionicons name="sync" size={16} color="#fff" />
          <Text style={styles.refreshButtonText}>Consultar suscripciones</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Paquetes Disponibles</Text>
        {loadingPackages ? (
          <View style={styles.loadingPackagesContainer}>
            <ActivityIndicator size="large" color="#9BFE03" />
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
                <View
                  style={[styles.priceBadge, { backgroundColor: pkg.color }]}
                >
                  <Text style={styles.priceText}>
                    {BASE_URL.toString().includes("co.yariders") ? "$" : "S/"} {formatPrice(pkg.price)}
                  </Text>
                </View>
              </View>

              <Text style={styles.deliveriesText}>
                {pkg.deliveries} Entregas
              </Text>
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
          Los paquetes de entregas se activan inmediatamente en tu cuenta. Cada
          entrega te permitirá aceptar y completar un pedido.
        </Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchSubscriptions}
        >
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={styles.refreshButtonText}>Actualizar paquetes</Text>
        </TouchableOpacity>




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

            {selectedPackage && !paymentProcessing && !paymentComplete && (
              <View style={styles.packageSummary}>
                <Text style={styles.packageSummaryTitle}>
                  {selectedPackage.title}
                </Text>
                <Text style={styles.packageSummaryPrice}>
                  S/ {formatPrice(selectedPackage.price)}
                </Text>
                <Text style={styles.packageSummarySales}>
                  {selectedPackage.deliveries} Entregas
                </Text>
              </View>
            )}

            {!paymentProcessing && !paymentComplete && (
              <View style={styles.paymentOptions}>
                <View style={styles.mercadoPagoContainer}>
                  <Text style={styles.mercadoPagoTitle}>
                    Pagar con Mercado Pago
                  </Text>

                  <Text style={styles.instructionsText}>
                    Serás redirigido a Mercado Pago para completar tu pago de
                    forma segura.
                  </Text>

                  <TouchableOpacity
                    style={styles.mercadoPagoButton}
                    onPress={payWithMercadoPago}
                  >
                    <Text style={styles.mercadoPagoButtonText}>
                      Pagar con Mercado Pago
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Show processing indicator */}
            {paymentProcessing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color="#009ee3" />
                <Text style={styles.processingText}>Procesando tu pago...</Text>
                <Text style={styles.processingSubtext}>
                  Por favor espera mientras verificamos tu pago con Mercado Pago
                </Text>
              </View>
            )}

            {/* Show success message after timeout */}
            {paymentComplete && (
              <View style={styles.successContainer}>
                <Ionicons name="time-outline" size={80} color="#FFA726" />
                <Text style={styles.successText}>¡Pago en Proceso!</Text>
                <Text style={styles.successSubtext}>
                  Tu pago con Mercado Pago será procesado en los próximos
                  minutos. Las entregas estarán disponibles una vez que se
                  confirme el pago.
                </Text>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => {
                    closeModal();
                    // Refresh subscriptions when closing
                    fetchActiveSubscriptions2();
                  }}
                >
                  <Text style={styles.doneButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Suscripción Gratuita para Riders */}
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
                <Ionicons name="gift" size={60} color="#9BFE03" />
              </View>
              <Text style={styles.freeModalTitle}>
                🎁 ¡Regalo de Bienvenida!
              </Text>
              <Text style={styles.freeModalSubtitle}>
                Como nuevo rider, tienes derecho a una suscripción gratuita para
                comenzar a realizar entregas
              </Text>
            </View>

            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>Lo que obtienes:</Text>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
                <Text style={styles.benefitText}>
                  {freePackageAvailable?.nombre || "Paquete gratuito"}
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
                <Text style={styles.benefitText}>
                  {freePackageAvailable?.cantidad || 0} entregas incluidas
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
                <Text style={styles.benefitText}>
                  Comienza a hacer entregas inmediatamente
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
                <Text style={styles.benefitText}>
                  Solo disponible una vez por rider
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
                <Text style={styles.benefitText}>
                  Personalizado para tu tipo: {riderType}
                </Text>
              </View>
            </View>

            <View style={styles.importantNote}>
              <Ionicons name="information-circle" size={20} color="#F39C12" />
              <Text style={styles.importantNoteText}>
                ¡Importante! Esta oferta solo está disponible una vez por rider.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#242424",
    paddingTop: Platform.OS === "android" ? 40 : 0,
  },
  processingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  processingText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 20,
    color: "#009ee3",
    marginTop: 20,
    marginBottom: 10,
  },
  processingSubtext: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#242424",
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#9BFE03",
    padding: 15,
    marginTop: 30,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Montserrat_700Bold",
    color: "#2B2B2B",
  },
  placeholder: {
    width: 35,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  balanceCard: {
    backgroundColor: "#333",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  balanceTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: "#9BFE03",
    marginBottom: 8,
  },
  balanceAmount: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 32,
    color: "white",
    marginBottom: 16,
  },
  balanceSubtitle: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
  },
  // New styles for organized layout
  statsContainer: {
    width: "100%",
    marginBottom: 16,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  statLabel: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: "#9BFE03",
    marginBottom: 4,
    textAlign: "center",
  },
  statValue: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    color: "white",
    textAlign: "center",
  },
  detailsContainer: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#444",
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  detailLabel: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#ccc",
  },
  detailValue: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 14,
    color: "#9BFE03",
  },
  sectionTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 20,
    color: "white",
    marginBottom: 15,
  },
  loadingPackagesContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    marginBottom: 20,
  },
  loadingPackagesText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    color: "#ccc",
    marginTop: 10,
  },
  noPackagesContainer: {
    backgroundColor: "#333",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  noPackagesText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    color: "#ccc",
    textAlign: "center",
  },
  packageCard: {
    backgroundColor: "#333",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 5,
  },
  packageHeader: {
    width: "100%",
    marginBottom: 10,
  },
  packageTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    color: "white",
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
    color: "white",
  },
  deliveriesText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 24,
    color: "#9BFE03",
    marginBottom: 8,
  },
  packageDescription: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#ccc",
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
    color: "white",
  },
  infoText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 15,
    marginBottom: 15,
  },
  refreshButton: {
    flexDirection: "row",
    backgroundColor: "#444",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  refreshButtonText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#fff",
    marginLeft: 8,
  },
  // Estilos para el botón de suscripción gratuita para riders
  freeSubscriptionButton: {
    backgroundColor: "#FF6B6B", // Color llamativo para riders
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
    color: "#fff",
    marginBottom: 2,
  },
  freeSubscriptionSubtitle: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    color: "#fff",
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
    backgroundColor: "#9BFE03",
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
    color: "#2ECC71",
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
  // Estilos para Mercado Pago
  mercadoPagoContainer: {
    alignItems: "center",
    width: "100%",
    paddingVertical: 20,
  },
  mercadoPagoTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 18,
    color: "#333",
    marginBottom: 15,
  },
  mercadoPagoButton: {
    backgroundColor: "#009ee3", // Color de Mercado Pago
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  mercadoPagoButtonText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: "white",
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
  instructionsText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  successText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 24,
    color: "#2ECC71",
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
    backgroundColor: "#2ECC71",
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
  },
  doneButtonText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: "white",
  },
  // Estilos para suscripciones activas
  activeSubscriptionsContainer: {
    marginBottom: 20,
  },
  activeSubscriptionCard: {
    backgroundColor: "#333",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: "#9BFE03",
  },
  activeSubscriptionName: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    color: "white",
    marginBottom: 8,
  },
  activeSubscriptionDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  activeSubscriptionInfo: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#ccc",
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

export default WalletRider;
