import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "../constants/url";
import AlertaModal from "../components/ErrorModal";

const ActiveRequestCard = ({ tripData, onAccept, onReject, disabled }) => {
  const navigation = useNavigation();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  // Log para ver toda la data que llega
  console.log("📋 Datos completos de tripData:", JSON.stringify(tripData, null, 2));
  console.log("💰 metododepago específico:", tripData?.metododepago);

  // Extract data from tripData or use default values if not provided
  const {
    id = 0,
    service_id = 2,
    punto_recogida = "{}",
    destino = "{}",
    costo = 0,
    metododepago,
    distancia = 0,
    distancia_conductor_simulada = 0,
    usuario = {},
    informacion_adicional = "{}",
    // Nuevos campos para direcciones geocodificadas
    pickupAddress,
    destinationAddress,
    addressesLoading = false,
    formattedPrice
  } = tripData || {};

  // Function to update trip status via API (for Accept only)
  // Function to update trip status via API
  const updateTripStatus = async (tripId, newStatus) => {
    try {
      // Get driver ID and authentication token from AsyncStorage
      const userData = await AsyncStorage.getItem('userData');
      const userDataObj = userData ? JSON.parse(userData) : {};
      const driverId = userDataObj.id || userDataObj.data?.id;
      const token = await AsyncStorage.getItem("userToken");

      if (!driverId && newStatus === "aceptado") {
        showAlert("No se pudo identificar al conductor", "error");
        return false;
      }

      if (!token) {
        showAlert("No se encontró el token de autenticación", "error");
        return false;
      }

      // Preparar los datos de solicitud según el estado
      const requestData = {
        estado: newStatus
      };

      // Si se acepta el viaje, incluir el ID del conductor
      if (newStatus === "aceptado") {
        requestData.conductor_id = parseInt(driverId);
      }

      console.log(`Actualizando carrera ${tripId} a estado: ${newStatus}`, requestData);

      // Usar la ruta correcta para actualizar carreras
      const response = await fetch(`${BASE_URL}carreras/${tripId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Error en respuesta del servidor: ${response.status}`, errorData);
        throw new Error(`Error al actualizar la carrera: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("Respuesta de actualización:", responseData);

      // Mostrar mensaje de éxito
      showAlert("Has aceptado exitosamente esta carrera.", "success");

      return true;
    } catch (error) {
      console.error("Error al actualizar el estado de la carrera:", error);
      showAlert("No se pudo actualizar el estado de la carrera", "error");
      return false;
    }
  };

  // Function to locally reject a trip without updating server status
  const locallyRejectTrip = async (serviceId) => {
    try {
      // Get current list of rejected services
      const rejectedServicesJson = await AsyncStorage.getItem('rejectedServices');
      let rejectedServices = [];

      if (rejectedServicesJson) {
        rejectedServices = JSON.parse(rejectedServicesJson);
      }

      // Add current service to rejected list if not already there
      if (!rejectedServices.includes(serviceId)) {
        rejectedServices.push(serviceId);
      }

      // Save updated list back to AsyncStorage
      await AsyncStorage.setItem('rejectedServices', JSON.stringify(rejectedServices));
      console.log(`Servicio ${serviceId} rechazado localmente. No se mostrará de nuevo.`);

      return true;
    } catch (error) {
      console.error("Error al rechazar localmente el servicio:", error);
      return false;
    }
  };

  // Función para verificar si el conductor tiene una carrera activa
  const checkActiveRide = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        console.error("No se encontró token de autenticación");
        return false;
      }

      console.log("Verificando si tiene carrera activa antes de aceptar...");

      // VERIFICACIÓN 1: Endpoint principal de carreras activas
      const response = await fetch(`${BASE_URL}carreras/conductor/activa`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log("Respuesta de carrera activa:", responseData);

        // Si hay una carrera activa que no esté completada o cancelada
        const hasActiveRide = responseData &&
          responseData.status === true &&
          responseData.data &&
          responseData.data.estado !== "completado" &&
          responseData.data.estado !== "cancelado";

        if (hasActiveRide) {
          console.log("¿Tiene carrera activa desde endpoint principal?", true);
          return true;
        }
      }

      // VERIFICACIÓN 2: Consultar específicamente las carreras del conductor desde pedidos
      console.log("Verificando carreras del conductor desde pedidos...");
      const pedidosResponse = await fetch(`${BASE_URL}carreras/conductor`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (pedidosResponse.ok) {
        const pedidosData = await pedidosResponse.json();
        console.log("Respuesta de carreras del conductor:", pedidosData);

        // Verificar si hay carreras en estado "aceptado" o otros estados activos
        if (pedidosData && Array.isArray(pedidosData)) {
          const carrerasActivas = pedidosData.filter(carrera =>
            carrera.estado === "aceptado" ||
            carrera.estado === "en_curso" ||
            carrera.estado === "iniciado" ||
            carrera.estado === "en_camino" ||
            (carrera.estado !== "completado" &&
              carrera.estado !== "cancelado" &&
              carrera.estado !== "pendiente")
          );

          if (carrerasActivas.length > 0) {
            console.log(`Encontradas ${carrerasActivas.length} carreras activas del conductor:`, carrerasActivas);
            return true;
          }
        }
      }

      // VERIFICACIÓN 3: Verificación adicional desde endpoint de pedidos genérico
      console.log("Verificación adicional desde pedidos...");
      const generalPedidosResponse = await fetch(`${BASE_URL}pedidos`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (generalPedidosResponse.ok) {
        const generalData = await generalPedidosResponse.json();
        console.log("Respuesta de pedidos generales:", generalData);

        // Verificar si hay carreras en estado "aceptado"
        if (generalData && Array.isArray(generalData)) {
          const carrerasAceptadas = generalData.filter(item =>
            item.es_carrera &&
            (item.estado === "aceptado" ||
              item.estado === "en_curso" ||
              item.estado === "iniciado")
          );

          if (carrerasAceptadas.length > 0) {
            console.log(`Encontradas ${carrerasAceptadas.length} carreras aceptadas en pedidos generales:`, carrerasAceptadas);
            return true;
          }
        }
      }

      console.log("No hay carreras activas encontradas en ninguna verificación");
      return false;

    } catch (error) {
      console.error("Error verificando carrera activa:", error);
      return false;
    }
  };

  // Handle trip acceptance
  const handleAccept = async () => {
    // Verificar si está deshabilitado por tener una carrera activa
    if (disabled) {
      showAlert("Ya tienes una carrera activa. Completa o cancela tu carrera actual antes de aceptar una nueva.", "info");
      return;
    }

    // Verificación adicional en tiempo real
    const hasActiveRide = await checkActiveRide();
    if (hasActiveRide) {
      showAlert("Ya tienes una carrera activa. Completa o cancela tu carrera actual antes de aceptar una nueva.", "info");
      return;
    }

    // Mostrar indicador de espera
    showAlert("Espera mientras procesamos tu solicitud...", "info");

    const success = await updateTripStatus(id, "aceptado");

    if (success) {
      // Call the original onAccept if provided
      if (onAccept) onAccept(id);

      // Navigate to trip details screen - Usar carreraId para mantener consistencia
      navigation.navigate("StepTrece", { carreraId: id });
    }
  };

  // Handle trip rejection (locally only)
  const handleReject = async () => {
    const success = await locallyRejectTrip(service_id);

    if (success) {
      // Call the original onReject if provided
      if (onReject) onReject(id);

      // Show confirmation
      showAlert("Este viaje no se mostrará nuevamente", "info");
    }
  };

  // Parse informacion_adicional to extract addresA and addresB (note: single "s")
  const getAddressFromAdditionalInfo = () => {
    try {
      // Add debug logging to see what we're receiving
      console.log("Raw informacion_adicional:", informacion_adicional);

      let additionalInfo = {};

      // Special case: if informacion_adicional is exactly "data", treat it as an empty object
      if (informacion_adicional === "data") {
        console.log("Detected 'data' string - treating as empty info");
        return {
          addressA: "Dirección A no disponible",
          addressB: "Dirección B no disponible",
          nombre: "",
          phone: "",
          observaciones: ""
        };
      }

      // Continue with existing logic for other cases
      if (typeof informacion_adicional === 'string') {
        if (informacion_adicional.trim().startsWith('{') && informacion_adicional.trim().endsWith('}')) {
          try {
            additionalInfo = JSON.parse(informacion_adicional);
          } catch (parseError) {
            console.warn("Failed to parse informacion_adicional JSON:", parseError.message);
            additionalInfo = {};
          }
        } else {
          console.warn("informacion_adicional is not in JSON format:", informacion_adicional);
          additionalInfo = { rawValue: informacion_adicional };
        }
      } else if (informacion_adicional && typeof informacion_adicional === 'object') {
        additionalInfo = informacion_adicional;
      }
      return {
        addressA: additionalInfo.addresA || additionalInfo.addressA || additionalInfo.origen || "Dirección A no disponible",
        addressB: additionalInfo.addresB || additionalInfo.addressB || additionalInfo.destino || "Dirección B no disponible",
        nombre: additionalInfo.nombre || "",
        phone: additionalInfo.phone || "",
        observaciones: additionalInfo.observaciones || "",
        metododepago: additionalInfo.metododepago || null
      };
    } catch (e) {
      console.error("Error handling informacion_adicional:", e);
      return {
        addressA: "Error en dirección A",
        addressB: "Error en dirección B",
        nombre: "",
        phone: "",
        observaciones: ""
      };
    }
  };  // Get the addresses and payment method
  const { addressA, addressB, nombre, phone, observaciones, metododepago: metodoDepagoFromInfo } = getAddressFromAdditionalInfo();

  // Use payment method from informacion_adicional or fallback to direct field
  const metodoDepagoFinal = metodoDepagoFromInfo || metododepago;

  // Determine service category based on service_id
  const getServiceCategory = (serviceId) => {
    switch (serviceId) {
      case 1: return "Transporte";
      case 2: return "Entrega de paquete";
      case 3: return "Mandado";
      default: return "Servicio";
    }
  };

  // Format currency with Colombian Peso symbol
  const formatCurrency = (amount) => {
    // Si ya tenemos un precio formateado, usarlo directamente
    if (formattedPrice) return formattedPrice;

    // 1. Detectar país
    const isColombia = true;

    // 2. Definir variables según el país
    const symbol = "$";
    const locale = "es-CO";
    const decimals = 0; // Colombia 0 decimales, Perú 2 decimales

    // 3. Formatear y retornar
    // Usamos Number() para asegurar que amount sea numérico
    return `${symbol} ${Number(amount).toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}`;
  };

  // Format distance in kilometers
  const formatDistance = (dist) => {
    return `${dist.toFixed(1)} km`;
  };

  // Extract address from coordinates (fallback method if addresses not available)
  const getAddressFromCoordinates = (coordStr) => {
    try {
      const coords = JSON.parse(coordStr);
      return `(${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
    } catch (e) {
      return "Dirección no disponible";
    }
  };

  // Obtener las direcciones en orden de prioridad:
  // 1. Direcciones geocodificadas
  // 2. Direcciones desde información adicional
  // 3. Representación de coordenadas
  const getOriginAddress = () => {
    if (addressesLoading) return "Cargando dirección...";
    if (pickupAddress) return pickupAddress;
    if (addressA !== "Dirección A no disponible") return addressA;
    return getAddressFromCoordinates(punto_recogida);
  };

  const getDestinationAddress = () => {
    if (addressesLoading) return "Cargando dirección...";
    if (destinationAddress) return destinationAddress;
    if (addressB !== "Dirección B no disponible") return addressB;
    return getAddressFromCoordinates(destino);
  };

  return (
    <View style={styles.cardContainer}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Categoría</Text>
          <Text style={styles.value}>{getServiceCategory(service_id)}</Text>
        </View>

        {/* Direcciones con indicador de carga */}
        <View style={styles.row}>
          <Text style={styles.label}>Origen</Text>
          {addressesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#fa6205" />
              <Text style={styles.loadingText}>Obteniendo dirección...</Text>
            </View>
          ) : (
            <Text style={styles.value} numberOfLines={2} ellipsizeMode="tail">
              {getOriginAddress()}
            </Text>
          )}
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Destino</Text>
          {addressesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#fa6205" />
              <Text style={styles.loadingText}>Obteniendo dirección...</Text>
            </View>
          ) : (
            <Text style={styles.value} numberOfLines={2} ellipsizeMode="tail">
              {getDestinationAddress()}
            </Text>
          )}
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Cliente</Text>
          <Text style={styles.value}>
            {nombre || usuario?.nombre_completo || "Usuario"}
          </Text>
        </View>

        {phone ? (
          <View style={styles.row}>
            <Text style={styles.label}>Teléfono</Text>
            <Text style={styles.value}>{phone}</Text>
          </View>
        ) : null}

        <View style={styles.row}>
          <Text style={styles.label}>Distancia de recogida</Text>
          <Text style={styles.value}>{formatDistance(distancia_conductor_simulada)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Distancia del servicio</Text>
          <Text style={styles.value}>{formatDistance(distancia)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Valor</Text>
          <Text style={styles.value}>{formatCurrency(costo)}</Text>
        </View>
        {metodoDepagoFinal && (
          <View style={styles.row}>
            <Text style={styles.label}>Paga con</Text>
            <Text style={styles.value}>
              {(() => {
                let textoMostrar = metodoDepagoFinal;
                const isColombia = true;
                if (isColombia && textoMostrar && textoMostrar.trim() === "Nequi o Bancolombia") {
                  textoMostrar = "Nequi o Bancolombia";
                }
                return textoMostrar.toUpperCase();
              })()}
            </Text>
          </View>
        )}


        {observaciones ? (
          <View style={styles.observacionesContainer}>
            <Text style={styles.observacionesLabel}>Observaciones:</Text>
            <Text style={styles.observacionesText}>{observaciones}</Text>
          </View>
        ) : null}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            onPress={handleReject}
          >
            <Text style={styles.buttonText}>Declinar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              disabled ? styles.disabledButton : styles.acceptButton
            ]}
            onPress={handleAccept}
            disabled={disabled}
          >
            <Text style={[
              styles.buttonText,
              disabled && styles.disabledButtonText
            ]}>
              {disabled ? "No disponible" : "Aceptar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <AlertaModal
        visible={alertVisible}
        mensaje={alertData.message}
        tipo={alertData.type}
        onCerrar={() => setAlertVisible(false)}
        onPrimary={alertData.onPrimary}
        primaryLabel={alertData.primaryLabel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 15,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    borderWidth: 1.5,
    borderColor: "#888",
    borderStyle: "dotted",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
    flex: 0.35,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    flex: 0.65,
    textAlign: 'right',
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 0.65,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#fa6205',
    marginLeft: 5,
  },
  observacionesContainer: {
    marginVertical: 8,
    paddingHorizontal: 5,
    paddingVertical: 5,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  observacionesLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
    marginBottom: 3,
  },
  observacionesText: {
    fontSize: 14,
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingHorizontal: 5,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: "#fa6205",
  },
  rejectButton: {
    backgroundColor: "#E53935",
  },
  disabledButton: {
    backgroundColor: "#999",
  },
  buttonText: {
    color: '#1C1C1E',
    fontSize: 15,
    fontWeight: "bold",
  },
  disabledButtonText: {
    color: "#666",
  },
});

export default ActiveRequestCard;