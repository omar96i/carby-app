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
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { BASE_URL } from "../../constants/url";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import MapView, { Marker } from "react-native-maps";
import Modal from "react-native-modal";
import * as Location from "expo-location";
import { GOOGLE_MAPS_API_KEY } from "../../constants/Keys";
import AlertaModal from "../../components/ErrorModal";
import FavoriteHeart from "../../components/FavoriteHeart";
import QrPaymentCard, { qrFileForUpload } from "../../components/Delivery/QrPaymentCard";

const toLocalDateStr = (d) => {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const ServicioDetalle = ({ route, navigation }) => {
  const { servicio, establishmentId, establishmentName } = route.params || {};
  const insets = useSafeAreaInsets();
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

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({});

  const showAlert = (title, message, type, onConfirm, primaryLabel) => {
    setAlertData({ title, message, type: type || (title === "Éxito" ? "success" : "error"), onConfirm: onConfirm || null, primaryLabel: primaryLabel || null });
    setAlertVisible(true);
  };

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
          // (el backend puede devolver 1, "1", true o "true" según driver/cast)
          const qrOn =
            data.data.qr_estado === 1 ||
            data.data.qr_estado === "1" ||
            data.data.qr_estado === true ||
            data.data.qr_estado === "true";
          if (qrOn) {
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
  const precioOriginal = parseFloat(servicio.precio) || 0;
  const descuento = servicio.activo_descuento ? parseFloat(servicio.descuento) || 0 : 0;
  const priceBase = precioOriginal - descuento;
  const pctDescuento = precioOriginal > 0 ? Math.round((descuento / precioOriginal) * 100) : 0;
  const adicionalesPrice = selectedAdicionales.reduce(
    (sum, a) => sum + (parseFloat(a.precio) || 0) * a.quantity,
    0
  );
  const totalPrice = quantity * priceBase + adicionalesPrice;

  // Quantity controls for main service
  const increaseQuantity = () => setQuantity((q) => q + 1);
  const decreaseQuantity = () => setQuantity((q) => (q > 1 ? q - 1 : 1));

  // Función para enviar reserva
  const handleReserva = async () => {
    if (!selectedProfile) {
      showAlert("Error", "Selecciona un perfil");
      return;
    }

    if (!fecha) {
      showAlert("Error", "Selecciona una fecha");
      return;
    }

    if (!horaInicio || horariosDisponibles.length === 0) {
      showAlert("Error", "Selecciona una hora disponible");
      return;
    }

    // Validar que la hora seleccionada esté en los horarios disponibles
    const horaSeleccionadaStr = horaInicio.toTimeString().slice(0, 5);
    const horaValida = horariosDisponibles.some(
      h => h.toTimeString().slice(0, 5) === horaSeleccionadaStr
    );

    if (!horaValida) {
      showAlert("Error", "La hora seleccionada no está disponible. Por favor selecciona otra hora.");
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
      formData.append("datos_generales", JSON.stringify({}));

      if (
        metodoPago === "qr" &&
        availablePaymentMethods.includes("qr")
      ) {
        const file = qrFileForUpload(archivoEvidencia);
        if (file) formData.append("archivo_evidencia", file);
      }
      
      // Calcular hora de fin basada en hora de inicio + duración total
      // (servicio x cantidad + adicionales con tiempo) - 1 minuto
      const duracionBase = parseInt(servicio.tiempo) || 30;
      const duracionAdicionales = (selectedAdicionales || []).reduce(
        (sum, a) => sum + ((parseInt(a.tiempo) || 0) * (a.quantity || 1)),
        0
      );
      const duracionMinutos = duracionBase * (quantity || 1) + duracionAdicionales;
      const horaFinCalculada = new Date(horaInicio);
      horaFinCalculada.setMinutes(horaFinCalculada.getMinutes() + duracionMinutos - 1);
      
      formData.append("hora_inicio", horaInicio.toTimeString().slice(0, 5));
      formData.append("hora_fin", horaFinCalculada.toTimeString().slice(0, 5));
      formData.append("fecha", toLocalDateStr(fecha));
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
      console.log("  - fecha:", toLocalDateStr(fecha));
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

        showAlert("Reserva realizada", "Tu reserva fue registrada correctamente con todos los servicios y adicionales", "success", () => navigation.goBack(), "OK");
      } else {
        const data = await response.json().catch(() => ({}));
        console.error("RESERVATION CREATION FAILED:", data);
        showAlert("Error", data.message || "No se pudo registrar la reserva");
      }
    } catch (e) {
      console.error("GENERAL ERROR in handleReserva:", e);
      showAlert("Error", "No se pudo registrar la reserva");
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
      console.log("🔄 REFRESHING AGENDA due to date change:", toLocalDateStr(fecha));
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

  // Efecto para recalcular horarios si cambia fecha/disponibilidad/agenda
  // o la duración total (cantidad del servicio + adicionales con tiempo)
  useEffect(() => {
    if (fecha && disponibilidadPerfil && agendaPerfil) {
      calcularHorariosDisponibles(fecha);
    } else {
      setHorariosDisponibles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, disponibilidadPerfil, agendaPerfil, quantity, selectedAdicionales]);

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
    const duracionBase = parseInt(servicio.tiempo) || 30;
    const duracionAdicionales = (selectedAdicionales || []).reduce(
      (sum, a) => sum + ((parseInt(a.tiempo) || 0) * (a.quantity || 1)),
      0
    );
    const duracionTotal = duracionBase * (quantity || 1) + duracionAdicionales;
    const intervaloServicio = duracionTotal > 0 ? duracionTotal : 30;
    const fechaStr = toLocalDateStr(fechaSeleccionada);

    // Si la fecha elegida es hoy, ocultar los horarios ya pasados:
    // solo mostrar desde la hora actual + margen de anticipación
    const MARGEN_MINUTOS = 15;
    const ahora = new Date();
    const esHoy = ahora.toDateString() === fechaSeleccionada.toDateString();
    const corteHoyMinutos = esHoy
      ? ahora.getHours() * 60 + ahora.getMinutes() + MARGEN_MINUTOS
      : -Infinity;

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

        // Generar intervalos para esta franja (si es hoy, desde la hora actual)
        const desdeMinutos = Math.max(inicioMinutos, corteHoyMinutos);
        for (
          let minutos = desdeMinutos;
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
                const fechaReserva = toLocalDateStr(new Date(reservaFecha));
                fechaCoincide = fechaReserva === fechaStr;
              }
            }

            if (!fechaCoincide) return false;

            // Verificar si hay conflicto de horario (las canceladas/completadas
            // liberan el hueco; solo bloquean las activas)
            const ESTADOS_LIBRES = ["cancelado", "completado"];
            if (!reserva.estado || ESTADOS_LIBRES.includes(reserva.estado)) return false;

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
  const duracionCita = () => {
    const durBase = parseInt(servicio.tiempo) || 30;
    const durAdic = (selectedAdicionales || []).reduce(
      (s, a) => s + ((parseInt(a.tiempo) || 0) * (a.quantity || 1)),
      0
    );
    return durBase * (quantity || 1) + durAdic;
  };

  const pasoPerfil = !!selectedProfile;
  const pasoHora = !!fecha && horariosDisponibles.some(
    (h) => h.toTimeString().slice(0, 5) === horaInicio.toTimeString().slice(0, 5)
  );
  const pasoPago = !!metodoPago;

  const TituloPaso = ({ n, done, children }) => (
    <View style={r.stepTitleRow}>
      <View style={[r.stepNumCircle, done && r.stepNumDone]}>
        {done ? (
          <Ionicons name="checkmark" size={15} color="#FFF" />
        ) : (
          <Text style={r.stepNumText}>{n}</Text>
        )}
      </View>
      <Text style={r.stepTitle}>{children}</Text>
    </View>
  );

  return (
    <View style={r.screen}>
      <StatusBar style="light" />
      <ScrollView
        style={r.flex}
        contentContainerStyle={{ paddingBottom: 120 + Math.max(insets.bottom, 12) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={r.hero}>
          <Image
            source={
              servicio.foto && getImageUrl(servicio.foto)
                ? { uri: getImageUrl(servicio.foto) }
                : require("../../assets/images/imagen.jpg")
            }
            style={r.heroImg}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0)", "rgba(255,255,255,0)", "#FFF"]}
            locations={[0, 0.35, 0.7, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={[r.heroNav, { top: insets.top + 8 }]}>
            <TouchableOpacity style={r.circleBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={21} color="#1C1C1E" />
            </TouchableOpacity>
            {servicio?.id && (
              <View style={r.circleBtn}>
                <FavoriteHeart kind="servicio" productId={servicio.id} size={20} />
              </View>
            )}
          </View>
        </View>

        <View style={r.body}>
          <Text style={r.title}>{servicio.nombre}</Text>
          <View style={r.metaRow}>
            <View style={r.metaPill}>
              <Ionicons name="time" size={13} color="#fa6205" />
              <Text style={r.metaText}>Duración estimada: {servicio.tiempo || "-"} Min</Text>
            </View>
            {descuento > 0 && (
              <View style={r.discountBadge}>
                <Text style={r.discountText}>-{pctDescuento}%</Text>
              </View>
            )}
          </View>
          {servicio.descripcion && !/^\s*\d+\s*$/.test(String(servicio.descripcion)) ? (
            <Text style={r.desc}>{servicio.descripcion}</Text>
          ) : null}

          <View style={r.priceRow}>
            <View style={r.flex}>
              <Text style={r.price}>$ {priceBase.toLocaleString()}</Text>
              {descuento > 0 && (
                <Text style={r.originalPrice}>$ {precioOriginal.toLocaleString()}</Text>
              )}
            </View>
            <View style={r.stepper}>
              <TouchableOpacity
                onPress={decreaseQuantity}
                style={[r.stepBtn, quantity <= 1 && r.stepBtnOff]}
                activeOpacity={0.8}
              >
                <Ionicons name="remove" size={18} color={quantity > 1 ? "#1C1C1E" : "#A1A1AA"} />
              </TouchableOpacity>
              <Text style={r.stepNum}>{quantity}</Text>
              <TouchableOpacity onPress={increaseQuantity} style={[r.stepBtn, r.stepBtnPlus]} activeOpacity={0.8}>
                <Ionicons name="add" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Adicionales */}
          {loadingAdicionales ? (
            <ActivityIndicator color="#fa6205" style={{ marginVertical: 20 }} />
          ) : adicionales.length > 0 ? (
            <View style={r.section}>
              <Text style={r.sectionTitle}>Adicionales</Text>
              <View style={r.list}>
                {adicionales.map((adicional) => {
                  const isSelected = selectedAdicionales.find((a) => a.id === adicional.id);
                  return (
                    <View key={adicional.id} style={[r.addOn, isSelected && r.addOnOn]}>
                      <TouchableOpacity
                        style={r.addOnMain}
                        onPress={() => handleToggleAdicional(adicional)}
                        activeOpacity={0.8}
                      >
                        <View style={[r.check, isSelected && r.checkOn]}>
                          {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                        </View>
                        <View style={r.addOnTextos}>
                          <Text style={r.addOnName} numberOfLines={2}>{adicional.nombre}</Text>
                          {!!adicional.descripcion && (
                            <Text style={r.addOnDesc} numberOfLines={3}>{adicional.descripcion}</Text>
                          )}
                        </View>
                        <Text style={r.addOnPrice}>$ {adicional.precio || "0"}</Text>
                      </TouchableOpacity>
                      {isSelected ? (
                        <View style={r.miniStepper}>
                          <TouchableOpacity onPress={() => updateAdicionalQuantity(adicional.id, -1)} style={r.miniBtn} activeOpacity={0.8}>
                            <Ionicons name="remove" size={14} color="#1C1C1E" />
                          </TouchableOpacity>
                          <Text style={r.miniNum}>{isSelected.quantity}</Text>
                          <TouchableOpacity onPress={() => updateAdicionalQuantity(adicional.id, 1)} style={[r.miniBtn, r.miniBtnPlus]} activeOpacity={0.8}>
                            <Ionicons name="add" size={14} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={r.section}>
            <TituloPaso n={1} done={pasoPerfil}>Selecciona un perfil</TituloPaso>
            {profiles.length === 0 ? (
              <View style={r.empty}>
                <Ionicons name="people-outline" size={18} color="#A1A1AA" />
                <Text style={r.emptyText}>No tienes perfiles registrados</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={r.hRow}>
                {profiles.map((perfil) => {
                  const isSelectedProfile = selectedProfile?.id === perfil.id;
                  return (
                    <TouchableOpacity
                      key={perfil.id}
                      style={[r.profile, isSelectedProfile && r.profileOn]}
                      onPress={() => handleSelectProfile(perfil)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={
                          perfil.file && getImageUrl(perfil.file)
                            ? { uri: getImageUrl(perfil.file) }
                            : require("../../assets/images/fotoperfil.jpg")
                        }
                        style={r.profileImg}
                        resizeMode="cover"
                      />
                      <Text style={[r.profileName, isSelectedProfile && r.profileNameOn]} numberOfLines={2}>
                        {perfil.nombre}
                      </Text>
                      {isSelectedProfile && (
                        <View style={r.profileCheck}>
                          <Ionicons name="checkmark" size={13} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Fecha y hora */}
          <View style={r.section}>
            <TituloPaso n={2} done={pasoHora}>Selecciona fecha y hora</TituloPaso>
            {selectedProfile ? (
              <View>
                {(() => {
                  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
                  return (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={r.hRow}>
                      {fechasDisponibles.map((fechaDisponible, idx) => {
                        const isSelected = fecha && fecha.toDateString() === fechaDisponible.toDateString();
                        const diaSemana = fechaDisponible.getDay();
                        const diaSemanaJS = fechaDisponible.getDay();
                        const diaSemanaAPI = diaSemanaJS === 0 ? 6 : diaSemanaJS - 1;
                        const tieneDisponibilidad = disponibilidadPerfil?.some((d) => d.dia_semana === diaSemanaAPI);
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[r.date, isSelected && r.dateOn, !tieneDisponibilidad && r.dateOff]}
                            onPress={() => {
                              setFecha(fechaDisponible);
                              setHorariosDisponibles([]);
                              setHoraInicio(new Date());
                              setHoraFin(new Date());
                            }}
                            disabled={!tieneDisponibilidad}
                            activeOpacity={0.8}
                          >
                            <Text style={[r.dateDay, isSelected && r.dateTextOn]}>{diasSemana[diaSemana]}</Text>
                            {tieneDisponibilidad ? (
                              <Text style={[r.dateNum, isSelected && r.dateTextOn]}>
                                {fechaDisponible.getDate()}/{fechaDisponible.getMonth() + 1}
                              </Text>
                            ) : (
                              <Text style={r.dateNo}>No disp.</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  );
                })()}

                {fecha ? (
                  <>
                    <Text style={r.horasLabel}>{`Horarios disponibles (${duracionCita()} min por cita):`}</Text>
                    {loadingAgenda ? (
                      <ActivityIndicator color="#fa6205" style={{ marginVertical: 10 }} />
                    ) : horariosDisponibles.length > 0 ? (
                      <View style={r.timeGrid}>
                        {horariosDisponibles.map((horario, idx) => {
                          const isSelected = horaInicio.toTimeString().slice(0, 5) === horario.toTimeString().slice(0, 5);
                          return (
                            <TouchableOpacity
                              key={idx}
                              style={[r.time, isSelected && r.timeOn]}
                              onPress={() => {
                                setHoraInicio(horario);
                                const durBase = parseInt(servicio.tiempo) || 30;
                                const durAdic = (selectedAdicionales || []).reduce(
                                  (sum, a) => sum + ((parseInt(a.tiempo) || 0) * (a.quantity || 1)),
                                  0
                                );
                                const duracionMinutos = durBase * (quantity || 1) + durAdic;
                                const nuevaHoraFin = new Date(horario);
                                nuevaHoraFin.setMinutes(nuevaHoraFin.getMinutes() + duracionMinutos - 1);
                                setHoraFin(nuevaHoraFin);
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={[r.timeText, isSelected && r.timeTextOn]}>
                                {horario.toTimeString().slice(0, 5)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={r.warn}>
                        <Ionicons name="alert-circle" size={16} color="#DC2626" />
                        <Text style={r.warnText}>
                          {new Date().toDateString() === fecha.toDateString()
                            ? "Ya no hay horarios disponibles por hoy. Elige otra fecha."
                            : "No hay horarios disponibles para la fecha seleccionada"}
                        </Text>
                      </View>
                    )}
                  </>
                ) : null}
              </View>
            ) : (
              <View style={r.empty}>
                <Ionicons name="calendar-outline" size={18} color="#A1A1AA" />
                <Text style={r.emptyText}>Selecciona un perfil para ver fechas y horarios disponibles</Text>
              </View>
            )}
          </View>

          {/* Método de pago */}
          <View style={r.section}>
            <TituloPaso n={3} done={pasoPago}>Método de pago</TituloPaso>
            {loadingPaymentMethods ? (
              <ActivityIndicator color="#fa6205" style={{ marginVertical: 10 }} />
            ) : (
              <View>
                <View style={r.payRow}>
                  <TouchableOpacity
                    onPress={() => setMetodoPago("efectivo")}
                    style={[r.pay, metodoPago === "efectivo" && r.payOn]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="cash-outline" size={18} color={metodoPago === "efectivo" ? "#FFF" : "#1C1C1E"} />
                    <Text style={[r.payText, metodoPago === "efectivo" && r.payTextOn]}>Efectivo</Text>
                  </TouchableOpacity>
                  {availablePaymentMethods.includes("qr") && (
                    <TouchableOpacity
                      onPress={() => setMetodoPago("qr")}
                      style={[r.pay, metodoPago === "qr" && r.payOn]}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="qr-code-outline" size={17} color={metodoPago === "qr" ? "#FFF" : "#1C1C1E"} />
                      <Text style={[r.payText, metodoPago === "qr" && r.payTextOn]}>QR</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {!availablePaymentMethods.includes("qr") && (
                  <View style={r.info}>
                    <Ionicons name="information-circle" size={16} color="#71717A" />
                    <Text style={r.infoText}>Solo se acepta pago en efectivo en este establecimiento</Text>
                  </View>
                )}
              </View>
            )}

            {metodoPago === "qr" && availablePaymentMethods.includes("qr") && (
              <View style={{ marginTop: 12 }}>
                <QrPaymentCard
                  qrEnabled
                  qrImageUrl={qrImageUrl}
                  total={totalPrice}
                  comprobante={archivoEvidencia}
                  onComprobante={setArchivoEvidencia}
                  onRemoveComprobante={() => setArchivoEvidencia(null)}
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={[r.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
        <View style={r.totalCol}>
          <Text style={r.totalLabel}>Total</Text>
          <Text style={r.totalValue}>$ {totalPrice.toLocaleString()}</Text>
          {selectedAdicionales.length > 0 && (
            <Text style={r.totalSub} numberOfLines={1}>
              Incluye adicionales: +$ {adicionalesPrice.toLocaleString()}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[r.reservar, loading && r.reservarOff]}
          onPress={handleReserva}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={r.reservarText}>{loading ? "Reservando..." : "Reservar"}</Text>
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
              <Ionicons name="close" size={24} color="#1C1C1E" />
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
                    color="#fa6205"
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
                          color="#fa6205"
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
              loadingIndicatorColor="#fa6205"
              loadingBackgroundColor="#222"
              onPress={(e) => {
                const now = new Date().getTime();
                const DOUBLE_PRESS_DELAY = 300;
                if (lastMapPress && now - lastMapPress < DOUBLE_PRESS_DELAY) {
                  setSelectedLocation(e.nativeEvent.coordinate);
                  showAlert("Ubicación seleccionada", "Punto marcado correctamente en el mapa");
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
              style={styles.centerLocationButton}
              onPress={centerMapOnUserLocation}
            >
              <Ionicons name="locate" size={28} color="#fa6205" />
            </TouchableOpacity>
            {/* Botón para seleccionar ubicación central */}
            <TouchableOpacity
              style={styles.selectCenterButton}
              onPress={() => {
                setSelectedLocation({
                  latitude: mapRegion.latitude,
                  longitude: mapRegion.longitude,
                });
                showAlert("Ubicación seleccionada", "Punto marcado correctamente en el mapa");
              }}
            >
              <Ionicons name="flag" size={28} color="#fa6205" />
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

      <AlertaModal
        visible={alertVisible}
        mensaje={alertData.message}
        onCerrar={() => setAlertVisible(false)}
        titulo={alertData.title}
        tipo={alertData.type}
        onPrimary={alertData.onConfirm}
        primaryLabel={alertData.primaryLabel || "Entendido"}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
  },
  backButton: {
    marginBottom: 10,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  card: {
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  favPos: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
  },
  sectionTitle: {
    color: "#fa6205",
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 10,
  },
  sectionLabel: {
    color: "#fa6205",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 14,
  },
  serviceImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#F5F5F5",
  },
  serviceTitle: {
    fontSize: 22,
    color: "#1C1C1E",
    fontFamily: "Montserrat_700Bold",
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 15,
    color: "#999",
    textDecorationLine: "line-through",
    marginBottom: 2,
    fontFamily: "Montserrat_400Regular",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  price: {
    fontSize: 18,
    color: "#fa6205",
    fontFamily: "Montserrat_700Bold",
  },
  discountBadge: {
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  serviceDesc: {
    fontSize: 15,
    color: "#ccc",
    marginBottom: 4,
    fontFamily: "Montserrat_400Regular",
  },
  serviceMeta: {
    fontSize: 14,
    color: "#aaa",
    fontFamily: "Montserrat_400Regular",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityBtnMinus: {
    borderColor: "#E0E0E0",
  },
  quantityBtnMinusActive: {
    borderColor: "#FF5A00",
  },
  quantityBtnPlus: {
    backgroundColor: "#FF5A00",
    borderColor: "#FF5A00",
  },
  quantityNumber: {
    fontSize: 20,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
    marginHorizontal: 24,
    minWidth: 24,
    textAlign: "center",
  },
  addOnItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 0,
    borderColor: "transparent",
  },
  addOnSelected: {
    backgroundColor: "#F2F2F7",
    borderWidth: 2,
    borderColor: "#fa6205",
  },
  addOnName: {
    color: "#1C1C1E",
    fontSize: 16,
    flex: 1,
    fontFamily: "Montserrat_400Regular",
  },
  addOnPrice: {
    color: "#fa6205",
    fontSize: 16,
    marginLeft: 10,
    fontFamily: "Montserrat_700Bold",
  },
  addOnQtyBtn: {
    borderRadius: 8,
    padding: 6,
    marginHorizontal: 4,
    minWidth: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  addOnQtyBtnMinus: {
    backgroundColor: "#ff4d4d",
  },
  addOnQtyBtnPlus: {
    backgroundColor: "#fa6205",
  },
  addOnQtyText: {
    color: "#F5F5F5",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalLabel: {
    color: "#1C1C1E",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  totalValue: {
    color: "#fa6205",
    fontSize: 20,
    fontFamily: "Montserrat_700Bold",
  },
  addOnTotal: {
    color: "#aaa",
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    marginTop: 2,
    textAlign: "right",
  },
  profileCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 140,
    maxWidth: 140,
    alignItems: "center",
    borderWidth: 0,
    borderColor: "transparent",
  },
  profileSelected: {
    backgroundColor: "#fa6205",
    borderWidth: 2,
    borderColor: "#fa6205",
  },
  profileName: {
    color: "#1C1C1E",
    fontWeight: "bold",
    fontSize: 13,
    textAlign: "center",
    fontFamily: "Montserrat_700Bold",
  },
  datePill: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    minWidth: 70,
    alignItems: "center",
  },
  datePillSelected: {
    backgroundColor: "#fa6205",
  },
  datePillDisabled: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  datePillDay: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1C1C1E",
  },
  datePillNumber: {
    fontSize: 11,
    color: "#1C1C1E",
  },
  datePillTextSelected: {
    color: "#FFF",
  },
  datePillTextDisabled: {
    color: "#9CA3AF",
  },
  datePillUnavailable: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginTop: 2,
  },
  noDatesBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  noDatesText: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "Montserrat_600SemiBold",
  },
  timePill: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    minWidth: 60,
    alignItems: "center",
  },
  timePillSelected: {
    backgroundColor: "#fa6205",
  },
  paymentPill: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    flex: 1,
    alignItems: "center",
  },
  paymentPillSelected: {
    backgroundColor: "#fa6205",
  },
  emptyState: {
    backgroundColor: "#F2F2F7",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  emptyStateText: {
    color: "#aaa",
    textAlign: "center",
    fontFamily: "Montserrat_400Regular",
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 18,
    backgroundColor: "#F5F5F5",
  },
  title: {
    fontSize: 24,
    color: "#1C1C1E",
    fontFamily: "Montserrat_700Bold",
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    color: "#fa6205",
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
    color: "#fa6205",
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 10,
  },
  adicionalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  adicionalItemSelected: {
    borderColor: "#fa6205",
    borderWidth: 2,
  },
  adicionalName: {
    color: "#1C1C1E",
    fontSize: 16,
    flex: 1,
    fontFamily: "Montserrat_400Regular",
  },
  adicionalPrice: {
    color: "#fa6205",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  addButton: {
    backgroundColor: "#fa6205",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
  },
  addButtonText: {
    color: "#FFF",
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
    backgroundColor: "#fa6205",
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
    color: "#1C1C1E",
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
    backgroundColor: "#fa6205",
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
    color: "#1C1C1E",
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
    color: "#fa6205",
    fontSize: 18,
    fontWeight: "bold",
  },
  mapSearchContainer: {
    backgroundColor: "#F2F2F7",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  mapSearchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  mapSearchIcon: {
    marginRight: 8,
  },
  mapSearchInput: {
    flex: 1,
    color: "#1C1C1E",
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
    backgroundColor: "#F5F5F5",
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
    color: "#1C1C1E",
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
    color: "#1C1C1E",
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
    backgroundColor: "#fa6205",
  },
  mapButtonContainer: {
    marginTop: 12,
    alignItems: "center",
  },
  mapButton: {
    backgroundColor: "#fa6205",
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
    color: "#F5F5F5",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Montserrat_700Bold",
  },
});

const RC = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", edge: "#E4E4E7", iconBg: "#FFF0E5", green: "#10B981", placeholder: "#A1A1AA" };
const BOTON_ELEVADO = { shadowColor: "#fa6205", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 };

const HORA_COLS = 4;
const HORA_GAP = 8;
const HORA_W = Math.floor((Dimensions.get("window").width - 40 - HORA_GAP * (HORA_COLS - 1)) / HORA_COLS);

const r = StyleSheet.create({
  screen: { flex: 1, backgroundColor: RC.surface },
  flex: { flex: 1 },

  hero: { width: "100%", height: 270, backgroundColor: RC.bg },
  heroImg: { width: "100%", height: "100%" },
  heroNav: { position: "absolute", left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" },
  circleBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: RC.surface, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },

  body: { paddingHorizontal: 20, marginTop: -18 },
  title: { fontSize: 24, lineHeight: 29, fontFamily: "Montserrat_800ExtraBold", color: RC.ink },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 10 },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: RC.iconBg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  metaText: { fontSize: 12.5, fontFamily: "Montserrat_700Bold", color: RC.brand },
  discountBadge: { backgroundColor: RC.brand, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  discountText: { fontSize: 12, fontFamily: "Montserrat_800ExtraBold", color: RC.surface },
  desc: { fontSize: 14, lineHeight: 20, fontFamily: "Montserrat_400Regular", color: RC.muted, marginTop: 12 },

  priceRow: { flexDirection: "row", alignItems: "center", marginTop: 16, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: RC.bg, borderRadius: 22 },
  price: { fontSize: 24, fontFamily: "Montserrat_800ExtraBold", color: RC.brand },
  originalPrice: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: RC.placeholder, textDecorationLine: "line-through", marginTop: 1 },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: RC.surface, borderRadius: 999, padding: 4 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: RC.bg, alignItems: "center", justifyContent: "center" },
  stepBtnOff: { opacity: 0.6 },
  stepBtnPlus: { backgroundColor: RC.brand },
  stepNum: { minWidth: 34, textAlign: "center", fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: RC.ink },

  section: { marginTop: 26 },
  stepTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  stepNumCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: RC.ink, alignItems: "center", justifyContent: "center" },
  stepNumDone: { backgroundColor: RC.green },
  stepNumText: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: RC.surface },
  stepTitle: { flex: 1, fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: RC.ink },
  sectionTitle: { fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: RC.ink, marginBottom: 12 },
  list: { gap: 8 },
  hRow: { gap: 10, paddingRight: 4 },

  addOn: { flexDirection: "row", alignItems: "center", backgroundColor: RC.bg, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 },
  addOnOn: { backgroundColor: RC.iconBg },
  addOnMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#D4D4D8", alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: RC.brand, borderColor: RC.brand },
  addOnTextos: { flex: 1 },
  addOnName: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: RC.ink },
  addOnDesc: { fontSize: 12, lineHeight: 16, fontFamily: "Montserrat_400Regular", color: RC.muted, marginTop: 2 },
  addOnPrice: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: RC.brand },
  miniStepper: { flexDirection: "row", alignItems: "center", backgroundColor: RC.surface, borderRadius: 999, padding: 3, marginLeft: 10 },
  miniBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: RC.bg, alignItems: "center", justifyContent: "center" },
  miniBtnPlus: { backgroundColor: RC.brand },
  miniNum: { minWidth: 24, textAlign: "center", fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: RC.ink },

  profile: { width: 108, alignItems: "center", backgroundColor: RC.bg, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 8 },
  profileOn: { backgroundColor: RC.ink },
  profileImg: { width: 56, height: 56, borderRadius: 28, marginBottom: 8, backgroundColor: RC.edge },
  profileName: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: RC.ink, textAlign: "center" },
  profileNameOn: { color: RC.surface },
  profileCheck: { position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: RC.brand, alignItems: "center", justifyContent: "center" },

  empty: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: RC.bg, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16 },
  emptySpaced: { marginTop: 14 },
  emptyText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: "Montserrat_600SemiBold", color: RC.muted },
  warn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 },
  warnText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: "Montserrat_600SemiBold", color: "#DC2626" },
  info: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: RC.bg, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, marginTop: 10 },
  infoText: { flex: 1, fontSize: 12.5, lineHeight: 17, fontFamily: "Montserrat_600SemiBold", color: RC.muted },

  date: { width: 66, height: 72, alignItems: "center", justifyContent: "center", backgroundColor: RC.bg, borderRadius: 20, gap: 3 },
  dateOn: { backgroundColor: RC.brand },
  dateOff: { opacity: 0.45 },
  dateDay: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: RC.muted },
  dateNum: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: RC.ink },
  dateNo: { fontSize: 10.5, fontFamily: "Montserrat_600SemiBold", color: RC.placeholder },
  dateTextOn: { color: RC.surface },
  horasLabel: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: RC.muted, marginTop: 16, marginBottom: 10 },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: HORA_GAP },
  time: { width: HORA_W, height: 44, borderRadius: 999, backgroundColor: RC.bg, alignItems: "center", justifyContent: "center" },
  timeOn: { backgroundColor: RC.brand },
  timeText: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: RC.ink },
  timeTextOn: { color: RC.surface },

  payRow: { flexDirection: "row", gap: 10 },
  pay: { flex: 1, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 999, backgroundColor: RC.bg },
  payOn: { backgroundColor: RC.ink },
  payText: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: RC.ink },
  payTextOn: { color: RC.surface },

  bottomBar: {
    position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: RC.surface, paddingHorizontal: 20, paddingTop: 12, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    shadowColor: "#000", shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 16,
  },
  totalCol: { flex: 1 },
  totalLabel: { fontSize: 12.5, fontFamily: "Montserrat_600SemiBold", color: RC.muted },
  totalValue: { fontSize: 22, fontFamily: "Montserrat_800ExtraBold", color: RC.ink },
  totalSub: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: RC.brand, marginTop: 1 },
  reservar: { height: 56, minWidth: 160, paddingHorizontal: 28, borderRadius: 999, backgroundColor: RC.brand, alignItems: "center", justifyContent: "center", ...BOTON_ELEVADO },
  reservarOff: { opacity: 0.6 },
  reservarText: { fontSize: 17, fontFamily: "Montserrat_700Bold", color: RC.surface },
});

export default ServicioDetalle;
