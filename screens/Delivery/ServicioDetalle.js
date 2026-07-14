import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../../constants/url";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import MapView, { Marker } from "react-native-maps";
import Modal from "react-native-modal";
import * as Location from "expo-location";
import { GOOGLE_MAPS_API_KEY } from "../../constants/Keys";

const GOOGLE_PLACES_API_KEY = GOOGLE_MAPS_API_KEY;
const DEFAULT_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };

const ServicioDetalle = ({ route, navigation }) => {
  const { servicio, establishmentId, establishmentName } = route.params || {};
  console.log("DEBUG servicio:", servicio);
  const [selectedAdicionales, setSelectedAdicionales] = useState([]); // [{...adicional, quantity: 1}]
  const [adicionales, setAdicionales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAdicionales, setLoadingAdicionales] = useState(true);
  const [quantity, setQuantity] = useState(1); // Main service quantity
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [tipoReserva, setTipoReserva] = useState("local");
  const [direccion, setDireccion] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");  const [fecha, setFecha] = useState(null); // Cambiado: inicializar en null para forzar selección
  const [horaInicio, setHoraInicio] = useState(new Date());
  const [horaFin, setHoraFin] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showHoraInicioPicker, setShowHoraInicioPicker] = useState(false);
  const [showHoraFinPicker, setShowHoraFinPicker] = useState(false);
  const [archivoEvidencia, setArchivoEvidencia] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [tempLocation, setTempLocation] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isLoadingCurrentLocation, setIsLoadingCurrentLocation] =
    useState(false);
  const [locationError, setLocationError] = useState(""); // Nuevos estados para disponibilidad y agenda
  const [disponibilidadPerfil, setDisponibilidadPerfil] = useState([]);
  const [agendaPerfil, setAgendaPerfil] = useState([]);
  const [loadingDisponibilidad, setLoadingDisponibilidad] = useState(false);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [fechasDisponibles, setFechasDisponibles] = useState([]);
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);

  // Estados para métodos de pago del establecimiento
  const [paymentMethods, setPaymentMethods] = useState(null);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([
    "efectivo",
  ]); // Por defecto solo efectivo
  // Buscar sugerencias de dirección (Google Places API)
  const searchPickupAddress = async (text) => {
    setPickupAddress(text);
    setShowPickupSuggestions(true);
    setIsSearchingPickup(true);
    setLocationError("");

    if (!text || text.length < 3) {
      setPickupSuggestions([]);
      setIsSearchingPickup(false);
      return;
    }

    try {
      // Usando un proxy o servicio que funcione desde React Native
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text
        )}&key=${GOOGLE_PLACES_API_KEY}&language=es&components=country:pe`
      );

      const data = await response.json();

      if (data.status === "OK" && data.predictions) {
        setPickupSuggestions(data.predictions);
      } else {
        console.log("Places API response:", data);
        setPickupSuggestions([]);
        if (data.error_message) {
          setLocationError(`Error: ${data.error_message}`);
        }
      }
    } catch (e) {
      console.error("Error searching addresses:", e);
      setPickupSuggestions([]);
      setLocationError("Error buscando direcciones");
    } finally {
      setIsSearchingPickup(false);
    }
  };
  // Seleccionar sugerencia de dirección
  const selectPickupAddress = async (item) => {
    setShowPickupSuggestions(false);
    setPickupAddress(item.description);
    setIsSearchingPickup(true);
    setLocationError("");

    try {
      // Obtener lat/lng de la sugerencia
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.place_id}&key=${GOOGLE_PLACES_API_KEY}`;
      const response = await fetch(detailsUrl);
      const data = await response.json();

      if (data.status === "OK" && data.result?.geometry?.location) {
        const loc = data.result.geometry.location;
        setLatitud(loc.lat.toString());
        setLongitud(loc.lng.toString());
        setDireccion(item.description);
        console.log("Selected location:", {
          lat: loc.lat,
          lng: loc.lng,
          address: item.description,
        });
      } else {
        console.log("Place details error:", data);
        setLocationError("No se pudo obtener los detalles de la ubicación");
      }
    } catch (e) {
      console.error("Error getting place details:", e);
      setLocationError("No se pudo obtener la ubicación");
    } finally {
      setIsSearchingPickup(false);
    }
  };
  // Obtener ubicación actual
  const getCurrentLocationAddress = async () => {
    setIsLoadingCurrentLocation(true);
    setLocationError("");

    try {
      // Solicitar permisos de ubicación
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Permisos de ubicación denegados");
        return;
      }

      // Obtener ubicación actual
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      setLatitud(latitude.toString());
      setLongitud(longitude.toString());

      // Reverse geocoding para dirección
      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}&language=es`;
        const response = await fetch(geocodeUrl);
        const data = await response.json();

        if (data.status === "OK" && data.results.length > 0) {
          const address = data.results[0].formatted_address;
          setDireccion(address);
          setPickupAddress(address);
          console.log("Current location address:", address);
        } else {
          const fallbackAddress = `Lat: ${latitude.toFixed(
            6
          )}, Lng: ${longitude.toFixed(6)}`;
          setDireccion(fallbackAddress);
          setPickupAddress(fallbackAddress);
          console.log("Using fallback address:", fallbackAddress);
        }
      } catch (geocodeError) {
        console.error("Geocoding error:", geocodeError);
        const fallbackAddress = `Lat: ${latitude.toFixed(
          6
        )}, Lng: ${longitude.toFixed(6)}`;
        setDireccion(fallbackAddress);
        setPickupAddress(fallbackAddress);
      }
    } catch (e) {
      console.error("Location error:", e);
      setLocationError("No se pudo obtener la ubicación actual");
    } finally {
      setIsLoadingCurrentLocation(false);
    }
  };

  useEffect(() => {
    const fetchAdicionales = async () => {
      if (!servicio?.id) {
        setAdicionales([]);
        setLoadingAdicionales(false);
        return;
      }
      try {
        setLoadingAdicionales(true);
        const token = await AsyncStorage.getItem("userToken");
        const response = await fetch(
          `${BASE_URL}user-servicio-adicional/by-servicio/${servicio.id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) throw new Error("No se pudo obtener adicionales");
        const data = await response.json();
        setAdicionales(Array.isArray(data.data) ? data.data : []);
      } catch (error) {
        setAdicionales([]);
      } finally {
        setLoadingAdicionales(false);
      }
    };
    fetchAdicionales();
  }, [servicio?.id]);
  // Obtener perfiles del comercio (establishmentId)
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token || !establishmentId) return;

        console.log(
          "🔍 FETCHING PROFILES for establishment ID:",
          establishmentId
        );
        const response = await fetch(
          `${BASE_URL}user-perfil/by-user/${establishmentId}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await response.json();
        console.log("👤 PROFILES RESPONSE:", data);

        if (data.success && Array.isArray(data.data)) {
          setProfiles(data.data);
          console.log("👤 PROFILES SET:", data.data.length, "profiles found");
        } else {
          setProfiles([]);
          console.log("👤 NO PROFILES DATA or invalid format");
        }
      } catch (e) {
        console.error("👤 ERROR fetching profiles:", e);
        setProfiles([]);
      }
    };
    fetchProfiles();
  }, [establishmentId]);

  // Cargar métodos de pago del establecimiento
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      if (!establishmentId) {
        setLoadingPaymentMethods(false);
        return;
      }

      try {
        setLoadingPaymentMethods(true);
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          setLoadingPaymentMethods(false);
          return;
        }

        console.log(
          "🏦 FETCHING PAYMENT METHODS for establishment ID:",
          establishmentId
        );
        const response = await fetch(
          `${BASE_URL}user-tipo-pago/getByUser/${establishmentId}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Error HTTP! Estado: ${response.status}`);
        }

        const data = await response.json();
        console.log("🏦 PAYMENT METHODS RESPONSE:", data);

        if (data.status && data.data) {
          setPaymentMethods(data.data);

          // Determinar métodos de pago disponibles
          const methods = ["efectivo"]; // Siempre disponible efectivo

          // Si QR está habilitado, agregarlo a los métodos disponibles
          if (data.data.qr_estado === 1) {
            methods.push("qr");

            // Si tiene archivo QR, establecer la URL de la imagen
            if (data.data.qr_file) {
              const qrUrl = getImageUrl(data.data.qr_file);
              setQrImageUrl(qrUrl);
              console.log("🏦 QR IMAGE URL:", qrUrl);
            }
          }

          setAvailablePaymentMethods(methods);
          console.log("🏦 AVAILABLE PAYMENT METHODS:", methods);

          // Si el método actual no está disponible, cambiar a efectivo
          if (!methods.includes(metodoPago)) {
            setMetodoPago("efectivo");
          }
        } else {
          console.log("🏦 NO PAYMENT METHODS DATA - Using only cash");
          setAvailablePaymentMethods(["efectivo"]);
          setMetodoPago("efectivo");
        }
      } catch (error) {
        console.error("🏦 ERROR obteniendo métodos de pago:", error);
        // En caso de error, solo permitir efectivo
        setAvailablePaymentMethods(["efectivo"]);
        setMetodoPago("efectivo");
      } finally {
        setLoadingPaymentMethods(false);
      }
    };

    fetchPaymentMethods();
  }, [establishmentId]);

  const getImageUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith("http")) return photoPath;
    return `${BASE_URL.toString().replace("/api", "")}/storage/${photoPath}`;
  };

  // Toggle add-on selection and manage quantity
  const handleToggleAdicional = (adicional) => {
    setSelectedAdicionales((prev) => {
      const idx = prev.findIndex((a) => a.id === adicional.id);
      if (idx >= 0) {
        // Remove if already selected
        return prev.filter((a) => a.id !== adicional.id);
      } else {
        // Add with quantity 1
        return [...prev, { ...adicional, quantity: 1 }];
      }
    });
  };

  // Update add-on quantity
  const updateAdicionalQuantity = (adicionalId, change) => {
    setSelectedAdicionales((prev) =>
      prev.map((item) => {
        if (item.id === adicionalId) {
          const newQuantity = Math.max(1, item.quantity + change);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  // Calculate prices
  const priceBase = parseFloat(servicio.precio) || 0;
  const adicionalesPrice = selectedAdicionales.reduce(
    (sum, a) => sum + (parseFloat(a.precio) || 0) * a.quantity,
    0
  );
  const totalPrice = quantity * priceBase + adicionalesPrice;

  // Quantity controls for main service
  const increaseQuantity = () => setQuantity((q) => q + 1);
  const decreaseQuantity = () => setQuantity((q) => (q > 1 ? q - 1 : 1));

  // Función para seleccionar archivo de evidencia
  const pickEvidencia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setArchivoEvidencia(result.assets[0]);
    }
  };  // Función para enviar reserva
  const handleReserva = async () => {
    if (!selectedProfile) {
      Alert.alert("Error", "Selecciona un perfil");
      return;
    }

    if (!fecha) {
      Alert.alert("Error", "Selecciona una fecha");
      return;
    }

    if (!horaInicio || horariosDisponibles.length === 0) {
      Alert.alert("Error", "Selecciona una hora disponible");
      return;
    }

    // Validar que la hora seleccionada esté en los horarios disponibles
    const horaSeleccionadaStr = horaInicio.toTimeString().slice(0, 5);
    const horaValida = horariosDisponibles.some(
      h => h.toTimeString().slice(0, 5) === horaSeleccionadaStr
    );

    if (!horaValida) {
      Alert.alert("Error", "La hora seleccionada no está disponible. Por favor selecciona otra hora.");
      return;
    }

    // Validar dirección solo si es domicilio
    if (tipoReserva === "domicilio" && (!direccion || !latitud || !longitud)) {
      Alert.alert(
        "Error",
        "Completa la dirección y coordenadas para el servicio a domicilio"
      );
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");
      if (!token || !userData) throw new Error("No autenticado");
      const userId = JSON.parse(userData).id;      const formData = new FormData();
      formData.append("user_perfil_id", selectedProfile.id);
      formData.append("user_id", userId); // usuario logueado
      formData.append("estado", "pendiente");
      formData.append("metodo_pago", metodoPago);
      formData.append("costo_total", totalPrice);

      // Solo enviar datos de ubicación si es domicilio
      if (tipoReserva === "domicilio") {
        formData.append(
          "datos_generales",
          JSON.stringify({ direccion, latitud, longitud })
        );
      } else {
        // Para reservas en local, enviar datos básicos o vacíos
        formData.append("datos_generales", JSON.stringify({}));
      }

      if (
        archivoEvidencia &&
        metodoPago === "qr" &&
        availablePaymentMethods.includes("qr")
      ) {
        formData.append("archivo_evidencia", {
          uri: archivoEvidencia.uri,
          name: `evidencia_${Date.now()}.jpg`,
          type: "image/jpeg",
        });      }
      
      // Calcular hora de fin basada en hora de inicio + duración del servicio - 1 minuto
      const duracionMinutos = parseInt(servicio.tiempo) || 30;
      const horaFinCalculada = new Date(horaInicio);
      horaFinCalculada.setMinutes(horaFinCalculada.getMinutes() + duracionMinutos - 1);
      
      formData.append("hora_inicio", horaInicio.toTimeString().slice(0, 5));
      formData.append("hora_fin", horaFinCalculada.toTimeString().slice(0, 5));
      formData.append("fecha", fecha.toISOString().slice(0, 10));
      formData.append("tipo_reserva", tipoReserva);      // Log de datos de la reserva principal
      console.log("🚀 CREATING RESERVATION - Form data summary:");
      console.log("  - user_perfil_id:", selectedProfile.id);
      console.log("  - user_id (usuario logueado):", userId);
      console.log("  - estado: pendiente");
      console.log("  - metodo_pago:", metodoPago);
      console.log("  - costo_total:", totalPrice);
      console.log("  - hora_inicio:", horaInicio.toTimeString().slice(0, 5));
      console.log("  - hora_fin (calculada):", horaFinCalculada.toTimeString().slice(0, 5));
      console.log("  - duracion_servicio (minutos):", duracionMinutos);
      console.log("  - costo_total:", totalPrice);
      console.log("  - hora_inicio:", horaInicio.toTimeString().slice(0, 5));
      console.log("  - hora_fin:", horaFin.toTimeString().slice(0, 5));
      console.log("  - fecha:", fecha.toISOString().slice(0, 10));
      console.log("  - tipo_reserva:", tipoReserva);

      // POST reserva
      const response = await fetch(`${BASE_URL}reservas`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (response.ok) {
        const reservaData = await response.json();
        console.log("✅ RESERVATION CREATED - Full response:", reservaData);

        // Extraer el ID de la reserva desde diferentes posibles estructuras de respuesta
        const reservaId =
          reservaData.id ||
          reservaData.data?.id ||
          reservaData.reserva?.id ||
          reservaData.reserva;

        console.log("📋 RESERVATION ID extraction attempts:");
        console.log("  - reservaData.id:", reservaData.id);
        console.log("  - reservaData.data?.id:", reservaData.data?.id);
        console.log("  - reservaData.reserva?.id:", reservaData.reserva?.id);
        console.log("  - reservaData.reserva:", typeof reservaData.reserva);
        console.log("📋 FINAL RESERVATION ID extracted:", reservaId);
        if (reservaId) {
          console.log(
            "🎯 STARTING ITEM CREATION PROCESS for reservation ID:",
            reservaId
          );

          // 1. Agregar el servicio principal como item de reserva
          const mainServiceData = {
            reserva_id: reservaId,
            user_servicio_id: servicio.id,
            cantidad: quantity,
          };
          console.log(
            "📝 MAIN SERVICE - Data being sent to reserva-items endpoint:",
            mainServiceData
          );

          const mainServiceResponse = await fetch(`${BASE_URL}reserva-items`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(mainServiceData),
          });
          console.log(
            "📝 MAIN SERVICE - Response status:",
            mainServiceResponse.status
          );
          if (mainServiceResponse.ok) {
            const mainServiceResult = await mainServiceResponse.json();
            console.log("📝 MAIN SERVICE - Response data:", mainServiceResult);

            // Extraer el ID del item principal de reserva
            const mainReservaItemId =
              mainServiceResult.id ||
              mainServiceResult.data?.id ||
              mainServiceResult.reserva_item?.id ||
              mainServiceResult.item?.id;

            console.log("📋 MAIN ITEM ID extraction attempts:");
            console.log("  - mainServiceResult.id:", mainServiceResult.id);
            console.log(
              "  - mainServiceResult.data?.id:",
              mainServiceResult.data?.id
            );
            console.log(
              "  - mainServiceResult.reserva_item?.id:",
              mainServiceResult.reserva_item?.id
            );
            console.log(
              "  - mainServiceResult.item?.id:",
              mainServiceResult.item?.id
            );
            console.log(
              "📋 FINAL MAIN RESERVA_ITEM_ID extracted:",
              mainReservaItemId
            );

            if (mainReservaItemId) {
              console.log("=".repeat(50));
              console.log("🔄 STARTING ADDITIONAL ITEMS LINKING PROCESS");
              console.log("🔄 Using main reserva_item_id:", mainReservaItemId);
              console.log("=".repeat(50));

              // 2. Relacionar TODOS los adicionales con el item principal usando reserva-items-adicionales
              console.log(
                "📋 ADDITIONAL ITEMS - Total selected adicionales:",
                selectedAdicionales.length
              );
              if (selectedAdicionales.length > 0) {
                console.log(
                  "📋 ADDITIONAL ITEMS - Selected items details:",
                  selectedAdicionales.map((item) => ({
                    id: item.id,
                    nombre: item.nombre,
                    precio: item.precio,
                    quantity: item.quantity,
                  }))
                );

                for (const [
                  index,
                  adicional,
                ] of selectedAdicionales.entries()) {
                  console.log(
                    `\n🔹 LINKING ADDITIONAL ITEM ${index + 1}/${
                      selectedAdicionales.length
                    }`
                  );
                  console.log("🔹 Additional item details:", {
                    id: adicional.id,
                    nombre: adicional.nombre,
                    precio: adicional.precio,
                    quantity: adicional.quantity,
                  });

                  try {
                    // Crear la relación del adicional con el item principal
                    const adicionalItemData = {
                      reserva_item_id: mainReservaItemId,
                      user_servicio_adicional_id: adicional.id,
                      cantidad: adicional.quantity,
                    };

                    console.log(
                      "🔸 ADDITIONAL ITEM RELATION - Data being sent to reserva-items-adicionales endpoint:",
                      adicionalItemData
                    );

                    const adicionalResponse = await fetch(
                      `${BASE_URL}reserva-items-adicionales`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Accept: "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(adicionalItemData),
                      }
                    );

                    console.log(
                      "🔸 ADDITIONAL ITEM RELATION - Response status:",
                      adicionalResponse.status
                    );
                    if (adicionalResponse.ok) {
                      const adicionalResult = await adicionalResponse.json();
                      console.log(
                        "🔸 ADDITIONAL ITEM RELATION - Response data:",
                        adicionalResult
                      );
                      console.log(
                        "✅ ADDITIONAL ITEM RELATION - Successfully linked to main item"
                      );
                    } else {
                      const errorData = await adicionalResponse
                        .json()
                        .catch(() => ({}));
                      console.error(
                        "🔸 ADDITIONAL ITEM RELATION - Error response:",
                        errorData
                      );
                      console.error(
                        "🔸 ADDITIONAL ITEM RELATION - Error status text:",
                        adicionalResponse.statusText
                      );
                    }
                  } catch (adicionalError) {
                    console.error(
                      "💥 ERROR linking additional item:",
                      adicionalError
                    );
                    console.error("💥 Additional item that failed:", adicional);
                    // Continuar con el siguiente adicional aunque falle uno
                  }
                }
              } else {
                console.log("📋 No additional items to link");
              }

              console.log("🏁 FINISHED LINKING ALL ADDITIONAL ITEMS");
              console.log("=".repeat(50));
            } else {
              console.error(
                "❌ NO MAIN RESERVA_ITEM_ID found - Cannot link additional items"
              );
              console.error("❌ Full mainServiceResult:", mainServiceResult);
            }
          } else {
            const errorData = await mainServiceResponse
              .json()
              .catch(() => ({}));
            console.error("❌ MAIN SERVICE - Error response:", errorData);
            console.error(
              "❌ MAIN SERVICE - Error status text:",
              mainServiceResponse.statusText
            );
            console.error(
              "❌ Cannot proceed with additional items - main service creation failed"
            );
          }
          console.log("🏁 FINISHED LINKING ALL ADDITIONAL ITEMS");
          console.log("=".repeat(50));
        } else {
          console.error("❌ NO RESERVATION ID - Cannot create items");
        } // Refrescar agenda después de crear la reserva exitosamente
        console.log(
          "🔄 REFRESHING AGENDA after successful reservation creation"
        );
        await fetchAgendaPerfil(selectedProfile.id);

        Alert.alert(
          "Reserva realizada",
          "Tu reserva fue registrada correctamente con todos los servicios y adicionales",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
        console.log("🎉 SUCCESS ALERT SHOWN - Process completed");
      } else {
        const data = await response.json().catch(() => ({}));
        console.error("❌ RESERVATION CREATION FAILED:", data);
        Alert.alert("Error", data.message || "No se pudo registrar la reserva");
      }
    } catch (e) {
      console.error("💥 GENERAL ERROR in handleReserva:", e);
      Alert.alert("Error", "No se pudo registrar la reserva");
    } finally {
      setLoading(false);
    }
  };
  // --- ESTADOS Y FUNCIONES PARA EL NUEVO MODAL DE MAPA ---
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: latitud ? parseFloat(latitud) : -12.0464,
    longitude: longitud ? parseFloat(longitud) : -77.0428,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [lastMapPress, setLastMapPress] = useState(0);

  const searchMapLocation = async (text) => {
    setMapSearchQuery(text);
    setIsSearchingMap(true);
    if (!text || text.length < 3) {
      setMapSearchResults([]);
      setIsSearchingMap(false);
      return;
    }
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        text
      )}&key=${GOOGLE_PLACES_API_KEY}&language=es&components=country:pe`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === "OK" && data.predictions) {
        setMapSearchResults(data.predictions);
      } else {
        setMapSearchResults([]);
      }
    } catch (e) {
      setMapSearchResults([]);
    } finally {
      setIsSearchingMap(false);
    }
  };

  const selectMapLocation = async (place_id) => {
    setIsSearchingMap(true);
    try {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&key=${GOOGLE_PLACES_API_KEY}`;
      const response = await fetch(detailsUrl);
      const data = await response.json();
      if (data.status === "OK" && data.result?.geometry?.location) {
        const loc = data.result.geometry.location;
        setMapRegion({
          latitude: loc.lat,
          longitude: loc.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setSelectedLocation({ latitude: loc.lat, longitude: loc.lng });
        setMapSearchQuery(data.result.formatted_address || "");
        setMapSearchResults([]);
      }
    } catch {}
    setIsSearchingMap(false);
  };

  const centerMapOnUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch {}
  };

  const confirmSelectedLocation = async () => {
    if (selectedLocation) {
      setLatitud(selectedLocation.latitude.toString());
      setLongitud(selectedLocation.longitude.toString());
      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${selectedLocation.latitude},${selectedLocation.longitude}&key=${GOOGLE_PLACES_API_KEY}&language=es`;
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        if (data.status === "OK" && data.results.length > 0) {
          setDireccion(data.results[0].formatted_address);
          setPickupAddress(data.results[0].formatted_address);
        } else {
          setDireccion(
            `Lat: ${selectedLocation.latitude.toFixed(
              6
            )}, Lng: ${selectedLocation.longitude.toFixed(6)}`
          );
          setPickupAddress(
            `Lat: ${selectedLocation.latitude.toFixed(
              6
            )}, Lng: ${selectedLocation.longitude.toFixed(6)}`
          );
        }
      } catch {}
    }
    setMapModalVisible(false);
  };

  const openMapModal = async () => {
    setMapRegion({
      latitude: latitud ? parseFloat(latitud) : -12.0464,
      longitude: longitud ? parseFloat(longitud) : -77.0428,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    setSelectedLocation(
      latitud && longitud
        ? { latitude: parseFloat(latitud), longitude: parseFloat(longitud) }
        : null
    );
    setMapModalVisible(true);
  };

  // Consultar disponibilidad del perfil
  const fetchDisponibilidadPerfil = async (perfilId) => {
    if (!perfilId) return;
    setLoadingDisponibilidad(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await fetch(
        `${BASE_URL}user-perfil-disponibilidad/${perfilId}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      let data = await response.json();
      // Asegurar que siempre sea un array
      let arr = [];
      if (Array.isArray(data)) arr = data;
      else if (data && Array.isArray(data.data)) arr = data.data;
      else if (
        data &&
        typeof data === "object" &&
        data.data &&
        Array.isArray(data.data)
      )
        arr = data.data;
      setDisponibilidadPerfil(arr);
      console.log("Disponibilidad del perfil (debug):", arr, data);
    } catch (error) {
      console.error("Error al consultar disponibilidad:", error);
      setDisponibilidadPerfil([]);
    } finally {
      setLoadingDisponibilidad(false);
    }
  };  // Consultar agenda del perfil
  const fetchAgendaPerfil = async (perfilId) => {
    if (!perfilId) return;
    setLoadingAgenda(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      console.log("🗓️ FETCHING AGENDA for profile ID:", perfilId);
      
      // Agregar timestamp para evitar caché
      const timestamp = new Date().getTime();
      const response = await fetch(`${BASE_URL}reservas/perfil/${perfilId}?t=${timestamp}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache", // Evitar caché
        },
      });
      let data = await response.json();
      console.log("🗓️ AGENDA API RESPONSE:", data);

      let arr = [];
      if (Array.isArray(data)) arr = data;
      else if (data && Array.isArray(data.data)) arr = data.data;
      else if (
        data &&
        typeof data === "object" &&
        data.data &&
        Array.isArray(data.data)
      )
        arr = data.data;

      setAgendaPerfil(arr);
      console.log("🗓️ AGENDA SET - Total reservations:", arr.length);
      console.log("🗓️ AGENDA DETAILS:", arr);
    } catch (error) {
      console.error("🗓️ ERROR fetching agenda:", error);
      setAgendaPerfil([]);
    } finally {
      setLoadingAgenda(false);
    }
  };// Efecto para cargar disponibilidad y agenda al seleccionar un perfil
  useEffect(() => {
    if (selectedProfile) {
      fetchDisponibilidadPerfil(selectedProfile.id);
      fetchAgendaPerfil(selectedProfile.id);
    } else {
      setDisponibilidadPerfil([]);
      setAgendaPerfil([]);
      setFechasDisponibles([]); // Limpiar fechas disponibles si no hay perfil
      setHorariosDisponibles([]); // Limpiar horarios disponibles si no hay perfil
    }
  }, [selectedProfile]);

  // Efecto adicional para refrescar agenda cuando cambia la fecha seleccionada
  useEffect(() => {
    if (selectedProfile && fecha) {
      console.log("🔄 REFRESHING AGENDA due to date change:", fecha.toISOString().slice(0, 10));
      fetchAgendaPerfil(selectedProfile.id);
    }
  }, [selectedProfile, fecha]);
  // Inicializar fechas disponibles al cargar el componente
  useEffect(() => {
    generateAvailableDates();
  }, []);

  // Efecto para limpiar estado al enfocar la pantalla
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log("🔄 SCREEN FOCUSED - Refreshing data");
      // Refrescar datos cuando la pantalla se enfoca
      if (selectedProfile) {
        fetchDisponibilidadPerfil(selectedProfile.id);
        fetchAgendaPerfil(selectedProfile.id);
      }
    });

    return unsubscribe;
  }, [navigation, selectedProfile]);

  // Efecto para limpiar estado al salir de la pantalla
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      console.log("🧹 CLEANING UP STATE before leaving screen");
      // Limpiar estados al salir
      setSelectedProfile(null);
      setFecha(null);
      setHoraInicio(new Date());
      setHoraFin(new Date());
      setHorariosDisponibles([]);
      setDisponibilidadPerfil([]);
      setAgendaPerfil([]);
    });

    return unsubscribe;
  }, [navigation]);
  // Generar fechas disponibles (próximos 7 días)
  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }

    setFechasDisponibles(dates);
  };
  // Al seleccionar un perfil, resetea la fecha y genera fechas disponibles
  const handleSelectProfile = (perfil) => {
    setSelectedProfile(perfil);
    setFecha(null); // Esperar a que el usuario seleccione fecha
    setHoraInicio(new Date()); // Resetear hora
    setHoraFin(new Date()); // Resetear hora
    setHorariosDisponibles([]); // Limpiar horarios disponibles
    generateAvailableDates(); // Generar fechas de los próximos 7 días
  };

  // Cambia el useEffect para que calcule horarios solo si fecha no es null
  useEffect(() => {
    if (fecha && disponibilidadPerfil && agendaPerfil) {
      calcularHorariosDisponibles(fecha);
    } else {
      setHorariosDisponibles([]);
    }
  }, [fecha, disponibilidadPerfil, agendaPerfil]);

  // Calcular horarios disponibles según disponibilidad del perfil y agenda
  const calcularHorariosDisponibles = (fechaSeleccionada) => {
    if (
      !disponibilidadPerfil ||
      !fechaSeleccionada ||
      !Array.isArray(disponibilidadPerfil)
    ) {
      setHorariosDisponibles([]);
      return;
    }

    // Convertir el día de JavaScript (0=domingo) al formato del API (0=lunes)
    const diaSemanaJS = fechaSeleccionada.getDay(); // 0 = domingo, 1 = lunes, etc.
    const diaSemanaAPI = diaSemanaJS === 0 ? 6 : diaSemanaJS - 1; // 0=lunes, 1=martes, ..., 6=domingo

    // Buscar todas las disponibilidades para este día de la semana
    const disponibilidadesDia = disponibilidadPerfil.filter(
      (d) => d.dia_semana === diaSemanaAPI
    );

    if (disponibilidadesDia.length === 0) {
      setHorariosDisponibles([]);
      return;
    }

    const intervalos = [];
    const intervaloServicio = parseInt(servicio.tiempo) || 30;
    const fechaStr = fechaSeleccionada.toISOString().split("T")[0];

    // Procesar cada franja de disponibilidad para este día
    disponibilidadesDia.forEach((disponibilidad) => {
      const horaInicio = disponibilidad.hora_inicio;
      const horaFin = disponibilidad.hora_fin;

      if (horaInicio && horaFin) {
        // Convertir "HH:MM:SS" a minutos
        const [horaInicioHour, horaInicioMin] = horaInicio
          .split(":")
          .map(Number);
        const [horaFinHour, horaFinMin] = horaFin.split(":").map(Number);

        const inicioMinutos = horaInicioHour * 60 + horaInicioMin;
        const finMinutos = horaFinHour * 60 + horaFinMin;

        // Generar intervalos para esta franja
        for (
          let minutos = inicioMinutos;
          minutos <= finMinutos - intervaloServicio;
          minutos += intervaloServicio
        ) {
          const hora = Math.floor(minutos / 60);
          const mins = minutos % 60;
          const horaFormateada = `${hora.toString().padStart(2, "0")}:${mins
            .toString()
            .padStart(2, "0")}`;          // Verificar si hay conflicto con reservas existentes
          const tieneConflicto = agendaPerfil.some((reserva) => {
            // Verificar diferentes formatos de fecha posibles
            const reservaFecha = reserva.fecha;
            let fechaCoincide = false;

            if (reservaFecha) {
              // Si la fecha viene como YYYY-MM-DD
              if (reservaFecha === fechaStr) {
                fechaCoincide = true;
              }
              // Si la fecha viene como timestamp, convertir
              else if (
                reservaFecha.includes("T") ||
                reservaFecha.includes(" ")
              ) {
                const fechaReserva = new Date(reservaFecha)
                  .toISOString()
                  .split("T")[0];
                fechaCoincide = fechaReserva === fechaStr;
              }
            }

            if (!fechaCoincide) return false;

            // Verificar si hay conflicto de horario (considerando solo pendientes y aceptadas)
            const estadosOcupados = ["pendiente", "aceptado", "en_progreso"];
            if (!estadosOcupados.includes(reserva.estado)) return false;

            // Obtener hora de inicio y fin de la reserva existente
            const reservaHoraInicio = reserva.hora_inicio?.slice(0, 5) || reserva.hora_inicio;
            const reservaHoraFin = reserva.hora_fin?.slice(0, 5) || reserva.hora_fin;

            if (!reservaHoraInicio || !reservaHoraFin) return false;

            // Convertir horas a minutos para facilitar comparación
            const [resInicioH, resInicioM] = reservaHoraInicio.split(':').map(Number);
            const [resFinH, resFinM] = reservaHoraFin.split(':').map(Number);
            const reservaInicioMinutos = resInicioH * 60 + resInicioM;
            const reservaFinMinutos = resFinH * 60 + resFinM;

            // Calcular cuándo terminaría el nuevo servicio (hora_inicio + duración - 1 minuto)
            const nuevaHoraFinMinutos = minutos + intervaloServicio - 1;

            // Hay conflicto si:
            // 1. El nuevo servicio inicia dentro del rango de una reserva existente
            // 2. El nuevo servicio termina dentro del rango de una reserva existente
            // 3. El nuevo servicio engloba completamente una reserva existente
            const conflictoInicio = minutos >= reservaInicioMinutos && minutos < reservaFinMinutos;
            const conflictoFin = nuevaHoraFinMinutos > reservaInicioMinutos && nuevaHoraFinMinutos <= reservaFinMinutos;
            const engloba = minutos <= reservaInicioMinutos && nuevaHoraFinMinutos >= reservaFinMinutos;

            return conflictoInicio || conflictoFin || engloba;
          });

          // Solo agregar si no hay conflicto y no está ya en la lista
          if (!tieneConflicto) {
            const fechaHora = new Date(fechaSeleccionada);
            fechaHora.setHours(hora, mins, 0, 0);
            intervalos.push(fechaHora);
          }
        }
      }
    });

    // Ordenar los intervalos por hora
    intervalos.sort((a, b) => a.getTime() - b.getTime());
    setHorariosDisponibles(intervalos);
  };

  // --- REEMPLAZO DEL MODAL DE MAPA EN EL RENDER ---
  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={28} color="white" />
      </TouchableOpacity>
      {/* Vista del Servicio principal */}
      <View
        style={{
          backgroundColor: "#232323",
          borderRadius: 14,
          padding: 16,
          marginBottom: 18,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Image
          source={
            servicio.foto && getImageUrl(servicio.foto)
              ? { uri: getImageUrl(servicio.foto) }
              : require("../../assets/images/imagen.jpg")
          }
          style={{
            width: "100%",
            height: 180,
            borderRadius: 12,
            marginBottom: 12,
            backgroundColor: "#232323",
          }}
          resizeMode="cover"
        />
        <Text
          style={{
            fontSize: 22,
            color: "#fff",
            fontWeight: "bold",
            marginBottom: 4,
          }}
        >
          {servicio.nombre}
        </Text>
        <Text
          style={{
            fontSize: 18,
            color: "#9BFE03",
            fontWeight: "bold",
            marginBottom: 4,
          }}
        >
          S/{servicio.precio || "0"}
        </Text>
        <Text style={{ fontSize: 15, color: "#ccc", marginBottom: 4 }}>
          {servicio.descripcion}
        </Text>
        <Text style={{ fontSize: 14, color: "#aaa", marginBottom: 8 }}>
          Duración estimada: {servicio.tiempo || "-"} Min
        </Text>
        {/* Quantity Controls for main service */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginVertical: 8,
          }}
        >
          <TouchableOpacity
            onPress={decreaseQuantity}
            style={{
              backgroundColor: "#ff4d4d",
              borderRadius: 8,
              padding: 8,
              marginHorizontal: 8,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}>
              -
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "bold",
              minWidth: 32,
              textAlign: "center",
            }}
          >
            {quantity}
          </Text>
          <TouchableOpacity
            onPress={increaseQuantity}
            style={{
              backgroundColor: "#4dff4d",
              borderRadius: 8,
              padding: 8,
              marginHorizontal: 8,
            }}
          >
            <Text
              style={{ color: "#232323", fontSize: 20, fontWeight: "bold" }}
            >
              +
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Adicionales */}
      {loadingAdicionales ? (
        <ActivityIndicator color="#9BFE03" style={{ marginVertical: 20 }} />
      ) : adicionales.length > 0 ? (
        <View
          style={{
            backgroundColor: "#232323",
            borderRadius: 14,
            padding: 14,
            marginBottom: 18,
          }}
        >
          <Text
            style={{
              color: "#9BFE03",
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 10,
            }}
          >
            Adicionales
          </Text>
          {adicionales.map((adicional) => {
            const isSelected = selectedAdicionales.find(
              (a) => a.id === adicional.id
            );
            return (
              <View
                key={adicional.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isSelected ? "#1c1c1c" : "transparent",
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 8,
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: isSelected ? "#9BFE03" : "transparent",
                }}
              >
                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  onPress={() => handleToggleAdicional(adicional)}
                >
                  <Text style={{ color: "#fff", fontSize: 16 }}>
                    {adicional.nombre}
                  </Text>
                  <Text
                    style={{ color: "#9BFE03", fontSize: 16, marginLeft: 10 }}
                  >
                    S/{adicional.precio || "0"}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#9BFE03"
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </TouchableOpacity>
                {/* Quantity controls for add-on if selected */}
                {isSelected ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginLeft: 10,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => updateAdicionalQuantity(adicional.id, -1)}
                      style={{
                        backgroundColor: "#ff4d4d",
                        borderRadius: 8,
                        padding: 6,
                        marginHorizontal: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 16,
                          fontWeight: "bold",
                        }}
                      >
                        -
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 16,
                        minWidth: 24,
                        textAlign: "center",
                      }}
                    >
                      {isSelected.quantity}
                    </Text>
                    <TouchableOpacity
                      onPress={() => updateAdicionalQuantity(adicional.id, 1)}
                      style={{
                        backgroundColor: "#4dff4d",
                        borderRadius: 8,
                        padding: 6,
                        marginHorizontal: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: "#232323",
                          fontSize: 16,
                          fontWeight: "bold",
                        }}
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
      {/* Total price */}
      <View
        style={{
          backgroundColor: "#232323",
          borderRadius: 10,
          padding: 12,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "#9BFE03", fontSize: 20, fontWeight: "bold" }}>
          Total: S/{totalPrice.toLocaleString()}
        </Text>
        {selectedAdicionales.length > 0 && (
          <Text style={{ color: "#aaa", fontSize: 13, marginTop: 2 }}>
            Incluye adicionales: +S/{adicionalesPrice.toLocaleString()}
          </Text>
        )}
      </View>
      {/* Captura de datos de reserva */}
      <View
        style={{
          backgroundColor: "#232323",
          borderRadius: 14,
          padding: 16,
          marginBottom: 18,
        }}
      >
       
        {/* Selección de perfil - PRIMERO */}
        <Text
          style={{
            color: "#fff",
            fontSize: 16,
            fontWeight: "bold",
            marginBottom: 12,
          }}
        >
          Selecciona un perfil:
        </Text>
        {profiles.length === 0 ? (
          <View
            style={{
              backgroundColor: "#1c1c1c",
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#aaa", textAlign: "center" }}>
              No tienes perfiles registrados
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12 }}
          >
            {profiles.map((perfil) => (
              <TouchableOpacity
                key={perfil.id}
                style={{
                  backgroundColor:
                    selectedProfile?.id === perfil.id ? "#9BFE03" : "#1c1c1c",
                  borderRadius: 12,
                  padding: 12,
                  marginRight: 12,
                  minWidth: 140,
                  maxWidth: 140,
                  alignItems: "center",
                  borderWidth: selectedProfile?.id === perfil.id ? 2 : 0,
                  borderColor:
                    selectedProfile?.id === perfil.id
                      ? "#9BFE03"
                      : "transparent",
                }}
                onPress={() => handleSelectProfile(perfil)}
              >
               
                <Image
                  source={
                    perfil.file && getImageUrl(perfil.file)
                      ? { uri: getImageUrl(perfil.file) }
                      : require("../../assets/images/fotoperfil.jpg")
                  }
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    marginBottom: 8,
                    backgroundColor: "#232323",
                  }}
                  resizeMode="cover"
                />
                <Text
                  style={{
                    color:
                      selectedProfile?.id === perfil.id ? "#232323" : "#fff",
                    fontWeight: "bold",
                    fontSize: 13,
                    textAlign: "center",
                    numberOfLines: 2,
                  }}
                >
                  {perfil.nombre}
                </Text>
                {selectedProfile?.id === perfil.id && (
                  <View
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: "#232323",
                      borderRadius: 10,
                      padding: 2,
                    }}
                  >
                    <Ionicons name="checkmark" size={16} color="#9BFE03" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {/* Mostrar disponibilidad del perfil
        
         {selectedProfile && (
          <View style={{ marginBottom: 12 }}>
            {loadingDisponibilidad ? (
              <ActivityIndicator
                color="#9BFE03"
                style={{ marginVertical: 10 }}
              />
            ) : disponibilidadPerfil && disponibilidadPerfil.length > 0 ? (
              <View>
                <Text
                  style={{
                    color: "#9BFE03",
                    fontSize: 14,
                    fontWeight: "bold",
                    marginBottom: 4,
                  }}
                >
                  Disponibilidad del perfil:
                </Text>
                {disponibilidadPerfil && Array.isArray(disponibilidadPerfil) ? (
                  disponibilidadPerfil.map((dia, idx) => {
                    const nombresDias = [
                      "Lunes",
                      "Martes",
                      "Miércoles",
                      "Jueves",
                      "Viernes",
                      "Sábado",
                      "Domingo",
                    ];
                    const nombreDia =
                      nombresDias[dia.dia_semana] || `Día ${dia.dia_semana}`;

                    return (
                      <Text
                        key={idx}
                        style={{ color: "#aaa", fontSize: 12, marginBottom: 2 }}
                      >
                        {nombreDia}: {dia.hora_inicio} - {dia.hora_fin}
                      </Text>
                    );
                  })
                ) : (
                  <Text style={{ color: "#ff6b6b", fontSize: 12 }}>
                    No hay datos de disponibilidad
                  </Text>
                )}
              </View>
            ) : (
              <Text style={{ color: "#ff6b6b", fontSize: 14 }}>
                No se pudo cargar la disponibilidad del perfil
              </Text>
            )}
          </View>
        )}*/}
        {/* Fecha y hora - SOLO SI HAY PERFIL SELECCIONADO */}
        {selectedProfile ? (
          <View>
            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: "bold",
                marginBottom: 6,
              }}
            >
              Selecciona fecha y hora
            </Text>
            {/* Selector de fecha con semana disponible */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
            >
              {fechasDisponibles.map((fechaDisponible, idx) => {
                const isSelected =
                  fecha &&
                  fecha.toDateString() === fechaDisponible.toDateString();
                const diaSemana = fechaDisponible.getDay();
                const diasSemana = [
                  "Dom",
                  "Lun",
                  "Mar",
                  "Mié",
                  "Jue",
                  "Vie",
                  "Sáb",
                ]; // Verificar si el perfil tiene disponibilidad este día
                const diaSemanaJS = fechaDisponible.getDay(); // 0 = domingo, 1 = lunes, etc.
                const diaSemanaAPI = diaSemanaJS === 0 ? 6 : diaSemanaJS - 1; // 0=lunes, 1=martes, ..., 6=domingo

                const tieneDisponibilidad = disponibilidadPerfil?.some(
                  (d) => d.dia_semana === diaSemanaAPI
                );

                return (
                  <TouchableOpacity
                    key={idx}
                    style={{
                      backgroundColor: isSelected
                        ? "#9BFE03"
                        : tieneDisponibilidad
                        ? "#fff"
                        : "#666",
                      borderRadius: 8,
                      padding: 8,
                      marginRight: 8,
                      minWidth: 70,
                      alignItems: "center",
                      opacity: tieneDisponibilidad ? 1 : 0.5,
                    }}                    onPress={() => {
                      setFecha(fechaDisponible);
                      setHorariosDisponibles([]); // Limpiar horarios al cambiar fecha
                      setHoraInicio(new Date()); // Resetear hora seleccionada
                      setHoraFin(new Date()); // Resetear hora fin
                    }}
                    disabled={!tieneDisponibilidad}
                  >
                    <Text
                      style={{
                        color: isSelected
                          ? "#232323"
                          : tieneDisponibilidad
                          ? "#232323"
                          : "#aaa",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      {diasSemana[diaSemana]}
                    </Text>
                    <Text
                      style={{
                        color: isSelected
                          ? "#232323"
                          : tieneDisponibilidad
                          ? "#232323"
                          : "#aaa",
                        fontSize: 11,
                      }}
                    >
                      {fechaDisponible.getDate()}/
                      {fechaDisponible.getMonth() + 1}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {/* Selector de hora basado en disponibilidad */}
            {fecha ? (
              <>
                <Text style={{ color: "#fff", fontSize: 13, marginBottom: 6 }}>
                  Horarios disponibles:
                </Text>
                {loadingAgenda ? (
                  <ActivityIndicator
                    color="#9BFE03"
                    style={{ marginVertical: 10 }}
                  />
                ) : horariosDisponibles.length > 0 ? (
                  <View style={{ marginBottom: 12 }}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      {horariosDisponibles.map((horario, idx) => {
                        const isSelected =
                          horaInicio.toTimeString().slice(0, 5) ===
                          horario.toTimeString().slice(0, 5);
                        return (                          <TouchableOpacity
                            key={idx}
                            style={{
                              backgroundColor: isSelected ? "#9BFE03" : "#fff",
                              borderRadius: 8,
                              padding: 8,
                              marginRight: 8,
                              minWidth: 60,
                              alignItems: "center",
                            }}
                            onPress={() => {
                              setHoraInicio(horario);
                              // Calcular hora de fin basada en la duración del servicio
                              const duracionMinutos = parseInt(servicio.tiempo) || 30;
                              const nuevaHoraFin = new Date(horario);
                              nuevaHoraFin.setMinutes(nuevaHoraFin.getMinutes() + duracionMinutos - 1);
                              setHoraFin(nuevaHoraFin);
                            }}
                          >
                            <Text
                              style={{
                                color: isSelected ? "#232323" : "#232323",
                                fontSize: 14,
                                fontWeight: "bold",
                              }}
                            >
                              {horario.toTimeString().slice(0, 5)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : (
                  <Text
                    style={{ color: "#ff6b6b", fontSize: 14, marginBottom: 12 }}
                  >
                    No hay horarios disponibles para la fecha seleccionada
                  </Text>
                )}
              </>
            ) : null}
          </View>
        ) : (
          <View
            style={{
              backgroundColor: "#333",
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#aaa", textAlign: "center" }}>
              Selecciona un perfil para ver fechas y horarios disponibles
            </Text>
          </View>
        )}
        {/* Tipo de reserva */}
        <Text
          style={{
            color: "#fff",
            fontSize: 16,
            fontWeight: "bold",
            marginBottom: 6,
          }}
        >
          Tipo de reserva
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setTipoReserva("local")}
            style={{
              backgroundColor: tipoReserva === "local" ? "#9BFE03" : "#fff",
              borderRadius: 8,
              padding: 8,
              flex: 1,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: tipoReserva === "local" ? "#232323" : "#232323",
                fontWeight: "bold",
              }}
            >
              Local
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTipoReserva("domicilio")}
            style={{
              backgroundColor: tipoReserva === "domicilio" ? "#9BFE03" : "#fff",
              borderRadius: 8,
              padding: 8,
              flex: 1,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: tipoReserva === "domicilio" ? "#232323" : "#232323",
                fontWeight: "bold",
              }}
            >
              Domicilio
            </Text>
          </TouchableOpacity>
        </View>
        {/* Dirección y buscador/mapa solo si es domicilio */}
        {tipoReserva === "domicilio" && (
          <View>
            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: "bold",
                marginBottom: 6,
              }}
            >
              Dirección
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <TouchableOpacity
                onPress={openMapModal}
                style={{ marginRight: 8 }}
              >
                <Ionicons name="location" size={24} color="#4CD964" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", marginBottom: 4, fontSize: 13 }}>
                  Buscar dirección o usa el mapa
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TextInput
                    style={{
                      backgroundColor: "#232323",
                      color: "#fff",
                      borderRadius: 8,
                      padding: 8,
                      flex: 1,
                      borderWidth: 1,
                      borderColor: "#444",
                    }}
                    placeholder="Buscar dirección..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={pickupAddress}
                    onChangeText={searchPickupAddress}
                    onFocus={() => setShowPickupSuggestions(true)}
                  />
                  <TouchableOpacity
                    style={{ marginLeft: 8 }}
                    onPress={getCurrentLocationAddress}
                    disabled={isLoadingCurrentLocation}
                  >
                    {isLoadingCurrentLocation ? (
                      <ActivityIndicator size="small" color="#4CD964" />
                    ) : (
                      <Ionicons name="locate" size={20} color="#4CD964" />
                    )}
                  </TouchableOpacity>
                </View>
                {locationError ? (
                  <Text style={{ color: "#ff6b6b", marginTop: 4 }}>
                    {locationError}
                  </Text>
                ) : null}
                {showPickupSuggestions && (
                  <View
                    style={{
                      backgroundColor: "#232323",
                      borderRadius: 8,
                      marginTop: 4,
                      maxHeight: 120,
                    }}
                  >
                    {isSearchingPickup ? (
                      <ActivityIndicator
                        size="small"
                        color="#4CD964"
                        style={{ margin: 8 }}
                      />
                    ) : (
                      pickupSuggestions.map((item) => (
                        <TouchableOpacity
                          key={item.place_id}
                          onPress={() => selectPickupAddress(item)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            padding: 8,
                          }}
                        >
                          <Ionicons
                            name="location"
                            size={16}
                            color="#4CD964"
                            style={{ marginRight: 8 }}
                          />
                          <Text style={{ color: "#fff" }}>
                            {item.description}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
        {/* Método de pago */}
        <Text
          style={{
            color: "#fff",
            fontSize: 16,
            fontWeight: "bold",
            marginBottom: 6,
          }}
        >
          Método de pago
        </Text>
        {loadingPaymentMethods ? (
          <ActivityIndicator color="#9BFE03" style={{ marginVertical: 10 }} />
        ) : (
          <View>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {/* Efectivo - siempre disponible */}
              <TouchableOpacity
                onPress={() => setMetodoPago("efectivo")}
                style={{
                  backgroundColor:
                    metodoPago === "efectivo" ? "#9BFE03" : "#fff",
                  borderRadius: 8,
                  padding: 8,
                  flex: availablePaymentMethods.length === 1 ? 1 : 1,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: metodoPago === "efectivo" ? "#232323" : "#232323",
                    fontWeight: "bold",
                  }}
                >
                  Efectivo
                </Text>
              </TouchableOpacity>

              {/* QR - solo si está disponible */}
              {availablePaymentMethods.includes("qr") && (
                <TouchableOpacity
                  onPress={() => setMetodoPago("qr")}
                  style={{
                    backgroundColor: metodoPago === "qr" ? "#9BFE03" : "#fff",
                    borderRadius: 8,
                    padding: 8,
                    flex: 1,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: metodoPago === "qr" ? "#232323" : "#232323",
                      fontWeight: "bold",
                    }}
                  >
                    QR
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Mostrar información adicional según el método seleccionado */}
            {metodoPago === "qr" &&
              availablePaymentMethods.includes("qr") &&
              qrImageUrl && (
                <View
                  style={{
                    backgroundColor: "#1c1c1c",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 12,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#9BFE03",
                      fontWeight: "bold",
                      marginBottom: 8,
                    }}
                  >
                    Código QR del establecimiento
                  </Text>
                  <Image
                    source={{ uri: qrImageUrl }}
                    style={{
                      width: 150,
                      height: 150,
                      borderRadius: 8,
                      backgroundColor: "#fff",
                    }}
                    resizeMode="contain"
                  />
                  <Text
                    style={{
                      color: "#aaa",
                      fontSize: 12,
                      marginTop: 8,
                      textAlign: "center",
                    }}
                  >
                    Escanea este código QR para realizar el pago
                  </Text>
                </View>
              )}

            {!availablePaymentMethods.includes("qr") && (
              <View
                style={{
                  backgroundColor: "#333",
                  borderRadius: 8,
                  padding: 8,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{ color: "#aaa", fontSize: 12, textAlign: "center" }}
                >
                  Solo se acepta pago en efectivo en este establecimiento
                </Text>
              </View>
            )}
          </View>
        )}
        {/* Archivo evidencia si QR está seleccionado y disponible */}
        {metodoPago === "qr" && availablePaymentMethods.includes("qr") && (
          <TouchableOpacity
            onPress={pickEvidencia}
            style={{
              backgroundColor: "#fff",
              borderRadius: 8,
              padding: 8,
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#232323" }}>
              {archivoEvidencia
                ? "Evidencia de pago seleccionada"
                : "Seleccionar comprobante de pago QR"}
            </Text>
          </TouchableOpacity>
        )}
        {/* Botón reservar */}
        <TouchableOpacity
          style={[styles.addButton, { marginTop: 10 }]}
          onPress={handleReserva}
          disabled={loading}
        >
          <Text style={styles.addButtonText}>
            {loading ? "Reservando..." : "Reservar"}
          </Text>
        </TouchableOpacity>
      </View>
      {/* MODAL DE MAPA AVANZADO */}
      <Modal
        isVisible={mapModalVisible}
        backdropOpacity={0.7}
        style={styles.mapModal}
        onBackdropPress={() => setMapModalVisible(false)}
      >
        <View style={styles.mapModalContent}>
          <View style={styles.mapModalHeader}>
            <Text style={styles.mapModalTitle}>
              Selecciona punto de destino
            </Text>
            <TouchableOpacity onPress={() => setMapModalVisible(false)}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          {/* Buscador de direcciones */}
          <View style={styles.mapSearchContainer}>
            <View style={styles.mapSearchInputContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#4CD964"
                style={styles.mapSearchIcon}
              />
              <TextInput
                style={styles.mapSearchInput}
                placeholder="Buscar dirección..."
                placeholderTextColor="rgba(255,255,255,0.5)"
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
            {mapSearchResults.length > 0 && (
              <View style={styles.mapSearchResultsContainer}>
                {isSearchingMap ? (
                  <ActivityIndicator
                    size="small"
                    color="#4CD964"
                    style={{ padding: 10 }}
                  />
                ) : (
                  <ScrollView style={styles.mapSearchResultsScroll}>
                    {mapSearchResults.map((result) => (
                      <TouchableOpacity
                        key={result.place_id}
                        style={styles.mapSearchResultItem}
                        onPress={() => selectMapLocation(result.place_id)}
                      >
                        <Ionicons
                          name="location"
                          size={18}
                          color="#4CD964"
                          style={styles.mapSearchResultIcon}
                        />
                        <Text
                          style={styles.mapSearchResultText}
                          numberOfLines={2}
                        >
                          {result.description}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
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
              loadingIndicatorColor="#4CD964"
              loadingBackgroundColor="#222"
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
                  pinColor="#4CD964"
                />
              )}
            </MapView>
            {/* Botón para centrar en mi ubicación */}
            <TouchableOpacity
              style={styles.centerLocationButton}
              onPress={centerMapOnUserLocation}
            >
              <Ionicons name="locate" size={28} color="#4CD964" />
            </TouchableOpacity>
            {/* Botón para seleccionar ubicación central */}
            <TouchableOpacity
              style={styles.selectCenterButton}
              onPress={() => {
                setSelectedLocation({
                  latitude: mapRegion.latitude,
                  longitude: mapRegion.longitude,
                });
                Alert.alert(
                  "Ubicación seleccionada",
                  "Punto marcado correctamente en el mapa"
                );
              }}
            >
              <Ionicons name="flag" size={28} color="#4CD964" />
            </TouchableOpacity>

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1c1c1c",
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1c1c1c",
  },
  backButton: {
    marginBottom: 10,
    marginTop: 30,
    alignSelf: "flex-start",
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 18,
    backgroundColor: "#232323",
  },
  title: {
    fontSize: 24,
    color: "#fff",
    fontFamily: "Montserrat_700Bold",
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    color: "#9BFE03",
    fontFamily: "Montserrat_700Bold",
    marginBottom: 8,
  },
  desc: {
    fontSize: 16,
    color: "#ccc",
    fontFamily: "Montserrat_400Regular",
    marginBottom: 8,
  },
  time: {
    fontSize: 15,
    color: "#aaa",
    fontFamily: "Montserrat_400Regular",
    marginBottom: 18,
  },
  adicionalesSection: {
    marginBottom: 20,
  },
  adicionalesTitle: {
    color: "#9BFE03",
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 10,
  },
  adicionalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#232323",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  adicionalItemSelected: {
    borderColor: "#9BFE03",
    borderWidth: 2,
  },
  adicionalName: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
    fontFamily: "Montserrat_400Regular",
  },
  adicionalPrice: {
    color: "#9BFE03",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  addButton: {
    backgroundColor: "#9BFE03",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
  },
  addButtonText: {
    color: "#232323",
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    borderRadius: 10,
    overflow: "hidden",
    alignSelf: "center",
  },
  decreaseButton: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff4d4d",
    paddingVertical: 10,
  },
  increaseButton: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4dff4d",
    paddingVertical: 10,
  },
  quantityDisplay: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  controlText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    fontFamily: "Montserrat_700Bold",
  },
  quantity: {
    fontSize: 18,
    fontWeight: "bold",
    color: "black",
    fontFamily: "Montserrat_700Bold",
  },
  adicionalQuantityControls: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    borderRadius: 6,
    overflow: "hidden",
  },
  adicionalDecreaseButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff4d4d",
  },
  adicionalIncreaseButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4dff4d",
  },
  adicionalQuantityDisplay: {
    width: 32,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  adicionalControlText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
    fontFamily: "Montserrat_700Bold",
  },
  adicionalQuantity: {
    fontSize: 14,
    fontWeight: "bold",
    color: "black",
    fontFamily: "Montserrat_700Bold",
  },
  priceBreakdown: {
    flex: 1,
    alignItems: "center",
    marginBottom: 10,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "black",
    fontFamily: "Montserrat_700Bold",
  },
  adicionalesTotal: {
    fontSize: 12,
    color: "#666",
    fontFamily: "Montserrat_400Regular",
    marginTop: 2,
  },
  // --- ESTILOS PARA EL MODAL DE MAPA ---
  mapModal: {
    margin: 0,
    justifyContent: "flex-end",
    marginBottom: 0,
  },
  mapModalContent: {
    flex: 1,
    backgroundColor: "#222",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 0,
  },
  mapModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mapModalTitle: {
    color: "#9BFE03",
    fontSize: 18,
    fontWeight: "bold",
  },
  mapSearchContainer: {
    backgroundColor: "#1c1c1c",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  mapSearchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#232323",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  mapSearchIcon: {
    marginRight: 8,
  },
  mapSearchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },
  mapSearchClearButton: {
    marginLeft: 8,
  },
  mapSearchResultsContainer: {
    maxHeight: 150,
    marginTop: 8,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#232323",
  },
  mapSearchResultsScroll: {
    maxHeight: 150,
  },
  mapSearchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  mapSearchResultIcon: {
    marginRight: 8,
  },
  mapSearchResultText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },
  mapContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  centerLocationButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#222",
    borderRadius: 30,
    padding: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  selectCenterButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    backgroundColor: "#222",
    borderRadius: 30,
    padding: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  mapPinOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: "center",
    width: "100%",
    padding: 16,
    pointerEvents: "none",
  },
  mapInstructions: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Montserrat_400Regular",
  },
  centerMarker: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(76, 217, 100, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  centerMarkerInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4CD964",
  },
  mapButtonContainer: {
    marginTop: 12,
    alignItems: "center",
  },
  mapButton: {
    backgroundColor: "#9BFE03",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  mapButtonDisabled: {
    backgroundColor: "#666",
  },
  mapButtonText: {
    color: "#232323",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Montserrat_700Bold",
  },
});

export default ServicioDetalle;
