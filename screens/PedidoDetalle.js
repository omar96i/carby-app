import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_300Light,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../constants/url";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import { useNotification } from "../context/NotificationContext";



const { width, height } = Dimensions.get("window");

const PedidoDetalle = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { pedidoId, pedidoData } = route.params || {};
  const [qrImageUrl, setQrImageUrl] = useState(null);
  // Estados principales
  const [pedido, setPedido] = useState(pedidoData || null);
  const [loading, setLoading] = useState(false); // Cambiar la lógica inicial
  const [tipoUsuario, setTipoUsuario] = useState("usuario");

  // Estados para evidencia
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceImage, setEvidenceImage] = useState(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceUploaded, setEvidenceUploaded] = useState(false);

  // Estados para chat
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatImage, setChatImage] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const chatScrollViewRef = useRef(null);



  const { expoPushToken, notification } = useNotification();


  useEffect(() => {
    if (notification) {
      loadChatMessages()
    }
  }, [notification]);


  // Cargar fuentes
  const [fontsLoaded] = useFonts({
    MontserratRegular: Montserrat_400Regular,
    MontserratBold: Montserrat_700Bold,
    MontserratLight: Montserrat_300Light,
  });

  // Estados adicionales
  const [fontTimeout, setFontTimeout] = useState(false);

  // Timeout para fuentes - evitar que se quede cargando indefinidamente
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!fontsLoaded) {
        console.log(
          "PedidoDetalle - Timeout de fuentes, continuando sin fuentes"
        );
        setFontTimeout(true);
      }
    }, 3000); // 3 segundos de timeout

    return () => clearTimeout(timeout);
  }, [fontsLoaded]);

  // Cargar tipo de usuario y datos del pedido
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log("PedidoDetalle - Iniciando carga de datos:", {
          pedidoData: !!pedidoData,
          pedidoId,
        });

        // Si ya tenemos los datos del pedido, usarlos inmediatamente
        if (pedidoData) {
          console.log("PedidoDetalle - Usando datos pasados por navegación");
          console.log(
            "PedidoDetalle - Estructura de pedidoData:",
            JSON.stringify(pedidoData, null, 2)
          );
          setPedido(pedidoData);
          // NO establecer loading aquí, ya que los datos están disponibles
        }

        // Si no tenemos datos pero tenemos un ID, activar loading y hacer fetch
        if (!pedidoData && pedidoId) {
          console.log(
            "PedidoDetalle - Cargando datos desde API para pedidoId:",
            pedidoId
          );
          setLoading(true);
          await fetchPedidoDetails();
        }

        // Cargar datos del usuario de forma paralela
        const userData = await AsyncStorage.getItem("userData");
        const userInfo = userData ? JSON.parse(userData) : null;
        setTipoUsuario(userInfo?.tipo_usuario || "usuario");

        console.log("PedidoDetalle - Datos cargados exitosamente");
      } catch (error) {
        console.error("Error loading initial data:", error);
        setLoading(false);
      }
    };

    loadInitialData();
  }, [pedidoId, pedidoData]);

  useEffect(() => {
    const loadEssentialData = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          setLoadingPaymentMethods(false);
          return;
        }
        // Cargar solo métodos de pago primero (lo más importante)
        const paymentResponse = await fetch(`${BASE_URL}user-tipo-pago/getByUser/${pedido.comercio.id}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          if (paymentData.status && paymentData.data) {
            if (paymentData.data.qr_estado === 1 && paymentData.data.qr_file) {
              setQrImageUrl(getImageUrl(paymentData.data.qr_file));
            }
          }
        }
      } catch (error) {
        console.error("Error cargando métodos de pago:", error);
      }
    };

    loadEssentialData();
  }, [pedido.comercio.id]);

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${BASE_URL.toString().replace("/api", "")}/storage/${path}`;
  };


  // Obtener detalles del pedido
  const fetchPedidoDetails = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");

      if (!token || !pedidoId) {
        throw new Error("Token o ID de pedido no disponible");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

      const response = await fetch(`${BASE_URL}pedidos/${pedidoId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(
        "PedidoDetalle - Datos fetched desde API:",
        JSON.stringify(data, null, 2)
      );
      setPedido(data.pedido || data);
    } catch (error) {
      if (error.name === "AbortError") {
        console.error("Request timeout:", error);
        Alert.alert(
          "Error",
          "La solicitud tardó demasiado tiempo. Verifica tu conexión a internet."
        );
      } else {
        console.error("Error fetching pedido details:", error);
        Alert.alert("Error", "No se pudieron cargar los detalles del pedido");
      }
    } finally {
      setLoading(false);
    }
  };

  // Cargar mensajes del chat
  const loadChatMessages = async () => {
    try {
      setLoadingChat(true);
      const token = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");

      if (!token || !pedidoId || !userData) {
        console.log("loadChatMessages - Faltan datos:", {
          hasToken: !!token,
          hasPedidoId: !!pedidoId,
          hasUserData: !!userData
        });
        return;
      }

      const userInfo = JSON.parse(userData);
      const currentUserId = userInfo.id;

      console.log("=== CARGANDO MENSAJES EL PUTO CHAT===");
      console.log("URL:", `${BASE_URL}pedido-chat/messages/${pedidoId}`);
      console.log("pedidoId:", pedidoId);
      console.log("currentUserId:", currentUserId);

      const response = await fetch(`${BASE_URL}pedido-chat/messages/${pedidoId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("=== RESPUESTA CARGA MENSAJES ===");
      console.log("Status:", response.status);
      console.log("StatusText:", response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log("Datos recibidos:", data);

        // Los mensajes están en data.data, no directamente en data
        const messages = data.data || data.messages || data || [];
        console.log("Mensajes procesados:", messages.length, "mensajes");

        // Filtrar mensajes null/undefined y agregar información del usuario actual
        const validMessages = messages.filter(msg => msg != null && typeof msg === 'object');
        const messagesWithUserInfo = validMessages.map((msg) => ({
          ...msg,
          currentUserId: currentUserId,
        }));

        console.log('PedidoDetalle - Mensajes procesados con currentUserId:', {
          currentUserId,
          totalMessages: messagesWithUserInfo.length,
          validMessages: validMessages.length,
          originalMessages: messages.length,
          sampleMessage: messagesWithUserInfo[0] || null
        });

        setChatMessages(messagesWithUserInfo);

        // Scroll al final después de cargar mensajes
        setTimeout(() => {
          chatScrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        const errorText = await response.text();
        console.error("Error cargando mensajes:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error loading chat messages:", error);
    } finally {
      setLoadingChat(false);
    }
  };

  // Seleccionar imagen de evidencia
  const pickEvidenceImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permisos requeridos",
          "Necesitamos acceso a tu galería para cargar la evidencia de pago."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const manipResult = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1000 } }],
          { format: SaveFormat.JPEG, compress: 0.7 }
        );
        setEvidenceImage(manipResult.uri);
      }
    } catch (error) {
      console.error("Error selecting evidence image:", error);
      Alert.alert("Error", "No se pudo seleccionar la imagen.");
    }
  };

  // Subir evidencia de pago
  const uploadEvidence = async () => {
    if (!evidenceImage) {
      Alert.alert(
        "Error",
        "Por favor selecciona una imagen como evidencia de pago."
      );
      return;
    }

    setUploadingEvidence(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("No se encontró token de autenticación");

      const formData = new FormData();
      const filename = evidenceImage.split("/").pop();

      formData.append("archivo_evidencia", {
        uri:
          Platform.OS === "ios"
            ? evidenceImage.replace("file://", "")
            : evidenceImage,
        name: filename || "evidence.jpg",
        type: "image/jpeg",
      });

      const response = await fetch(`${BASE_URL}pedidos/${pedidoId}/evidencia`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      setEvidenceUploaded(true);
      Alert.alert("Éxito", "La evidencia de pago fue cargada correctamente");

      setTimeout(() => {
        setShowEvidenceModal(false);
        setEvidenceImage(null);
      }, 1500);
    } catch (error) {
      console.error("Error uploading evidence:", error);
      Alert.alert("Error", "No se pudo cargar la evidencia: " + error.message);
    } finally {
      setUploadingEvidence(false);
    }
  };

  // Seleccionar imagen para chat
  const pickChatImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permisos requeridos", "Necesitamos acceso a tu galería.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const manipResult = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 800 } }],
          { format: SaveFormat.JPEG, compress: 0.7 }
        );
        setChatImage(manipResult.uri);
      }
    } catch (error) {
      console.error("Error selecting chat image:", error);
      Alert.alert("Error", "No se pudo seleccionar la imagen.");
    }
  };

  const pasosRestaurante = [
    { key: 'pendiente', label: 'Pendiente de aceptación', icon: 'clock-o' },
    { key: 'aceptado', label: 'Preparando pedido', icon: 'fire' },
    { key: 'completado', label: 'Pedido listo para recoger', icon: 'check-circle' },
  ];


  const pasosConductor = [
    { key: 'pendiente', label: 'Buscando conductor', icon: 'search' },
    { key: 'aceptado', label: 'En reparto', icon: 'motorcycle' },
    { key: 'completado', label: 'Pedido entregado', icon: 'check-circle' },
  ];

  const cancelarPedido = async (pedidoId, carreraId = null) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("No se encontró token de autenticación");
      console.log("pedido_id" + pedidoId);
      console.log("carrera_id" + carreraId);
      // Cancelar el pedido
      const responsePedido = await fetch(`${BASE_URL}pedidos/update/aux/${pedidoId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ estado: 'cancelado' }),
      });

      if (!responsePedido.ok) {
        const errorText = await responsePedido.text();
        throw new Error(`Error al cancelar el pedido: ${errorText}`);
      }

      // Si existe la carrera, también cancelarla
      if (carreraId) {
        const responseCarrera = await fetch(`${BASE_URL}carreras/${carreraId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ estado: 'cancelado' }),
        });

        if (!responseCarrera.ok) {
          const errorText = await responseCarrera.text();
          throw new Error(`Error al cancelar la carrera: ${errorText}`);
        }
      }
      navigation.goBack()
      Alert.alert("Éxito", "El pedido ha sido cancelado correctamente.");
      // Si quieres actualizar la vista, puedes llamar a alguna función aquí (como refetch o navigation)
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo cancelar el pedido. Intenta nuevamente.");
    }
  };


  // Enviar mensaje del chat
  const sendChatMessage = async () => {
    if (!newMessage.trim() && !chatImage) {
      Alert.alert(
        "Error",
        "Por favor escribe un mensaje o selecciona una imagen."
      );
      return;
    }

    setSendingMessage(true);

    try {
      console.log("=== INICIANDO ENVÍO DE MENSAJE ===");
      console.log("BASE_URL configurada:", BASE_URL);
      console.log("Timestamp:", new Date().toISOString());

      const token = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");

      console.log("Token existe:", !!token);
      console.log("UserData existe:", !!userData);

      if (!token || !userData) {
        throw new Error("No se encontró información de autenticación");
      }

      const userInfo = JSON.parse(userData);

      console.log("=== DATOS DEL CONTEXTO ===");
      console.log("pedidoId:", pedidoId);
      console.log("pedidoId type:", typeof pedidoId);
      console.log("usuario_id:", userInfo.id);
      console.log("usuario_id type:", typeof userInfo.id);
      console.log("message content:", newMessage.trim());
      console.log("message length:", newMessage.trim().length);
      console.log("tiene imagen:", !!chatImage);
      console.log("Platform OS:", Platform.OS);

      // Validaciones previas
      if (!pedidoId) {
        throw new Error("ID del pedido no disponible");
      }

      if (!userInfo.id) {
        throw new Error("ID del usuario no disponible");
      }

      if (!BASE_URL) {
        throw new Error("URL base del servidor no configurada");
      }

      if (!token.trim()) {
        throw new Error("Token de autenticación vacío");
      }

      console.log("=== VALIDACIONES PASADAS ===");
      console.log("=== CONSTRUYENDO REQUEST ===");
      console.log("URL:", `${BASE_URL}pedido-chat/send`);

      // Crear el mensaje como objeto y luego convertirlo a string JSON
      const messageObject = {
        type: "text",
        content: newMessage.trim(),
      };

      const messageJsonString = JSON.stringify(messageObject);
      console.log("message object:", messageObject);
      console.log("message JSON string:", messageJsonString);

      // Preparar headers
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      let requestBody;

      if (chatImage) {
        // Si hay imagen, usar FormData
        const formData = new FormData();
        formData.append("pedido_id", pedidoId.toString());
        formData.append("usuario_id", userInfo.id.toString());

        // Formatear el mensaje como en ChatUsuario.js que funciona
        const rawMessage = {
          type: "text",
          content: newMessage.trim(),
        };
        const escapedJson = JSON.stringify(rawMessage).replace(/"/g, '\\"');
        const formattedMessage = `"${escapedJson}"`;
        formData.append("message", formattedMessage);

        const filename = chatImage.split("/").pop();
        const imageObj = {
          uri:
            Platform.OS === "ios"
              ? chatImage.replace("file://", "")
              : chatImage,
          name: filename || "chat_image.jpg",
          type: "image/jpeg",
        };
        formData.append("image", imageObj);

        requestBody = formData;
        // NO establecer Content-Type para FormData
        console.log("=== ENVIANDO CON FORMDATA ===");
        console.log("pedido_id:", pedidoId.toString());
        console.log("usuario_id:", userInfo.id.toString());
        console.log("raw message object:", rawMessage);
        console.log("escaped JSON:", escapedJson);
        console.log("formatted message:", formattedMessage);
        console.log("image filename:", filename);
        console.log("image uri:", imageObj.uri);
        console.log("image name:", imageObj.name);
        console.log("image type:", imageObj.type);
      } else {
        // Si no hay imagen, enviar como JSON puro pero con el mismo formato de message
        headers["Content-Type"] = "application/json";

        // Usar el mismo formato que funciona en ChatUsuario.js
        const rawMessage = {
          type: "text",
          content: newMessage.trim(),
        };
        const escapedJson = JSON.stringify(rawMessage).replace(/"/g, '\\"');
        const formattedMessage = `"${escapedJson}"`;

        const bodyObject = {
          pedido_id: parseInt(pedidoId),
          usuario_id: parseInt(userInfo.id),
          message: formattedMessage, // Usar el mismo formato que funciona
        };

        requestBody = JSON.stringify(bodyObject);
      }

      // Crear un timeout para la petición
      const fetchWithTimeout = (url, options, timeoutMs = 30000) => {
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Request timeout - El servidor tardó demasiado en responder"
                  )
                ),
              timeoutMs
            )
          ),
        ]);
      };

      const response = await fetchWithTimeout(
        `${BASE_URL}pedido-chat/send`,
        {
          method: "POST",
          headers: headers,
          body: requestBody,
        },
        30000
      );

      const responseText = await response.text();
      console.log("Response body (raw):", responseText);

      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}: ${response.statusText}`;
        let errorDetails = responseText;

        try {
          const errorData = JSON.parse(responseText);

          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.errors) {
            // Si hay múltiples errores de validación
            const firstError = Object.values(errorData.errors)[0];
            if (Array.isArray(firstError)) {
              errorMessage = firstError[0];
            } else {
              errorMessage = firstError;
            }
          }

          errorDetails = JSON.stringify(errorData, null, 2);
        } catch (parseError) {
          console.log("No se pudo parsear el error como JSON:", parseError);
        }

        throw new Error(errorMessage);
      }

      // Parsear respuesta exitosa
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log("Datos de respuesta parseados:", responseData);
      } catch (parseError) {
        console.error("Error parseando JSON de respuesta:", parseError);
        // Si no es JSON válido pero el status es OK, asumir éxito
        responseData = { success: true };
      }

      console.log("Mensaje enviado exitosamente");

      // Limpiar formulario
      setNewMessage("");
      setChatImage(null);

      // Recargar mensajes
      await loadChatMessages();
    } catch (error) {
      console.error("=== ERROR ENVIANDO MENSAJE ===");
      console.error("Error completo:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      // Log del error en formato más detallado
      if (error.cause) {
        console.error("Error cause:", error.cause);
      }

      let errorMessage = "No se pudo enviar el mensaje";
      let errorDetails = "";

      // Si es un error de red
      if (
        error.message.includes("Network request failed") ||
        error.message.includes("fetch")
      ) {
        errorMessage =
          "Error de conexión. Revisa tu internet e inténtalo de nuevo.";
        errorDetails = "Error de red o conexión";
      }
      // Si es error de timeout
      else if (error.message.includes("timeout")) {
        errorMessage =
          "El servidor tardó demasiado en responder. Inténtalo de nuevo.";
        errorDetails = "Timeout del servidor";
      }
      // Errores HTTP específicos
      else if (error.message.includes("500")) {
        errorMessage =
          "Error interno del servidor. Inténtalo de nuevo en unos minutos.";
        errorDetails = "Error 500 - Servidor";
      } else if (error.message.includes("422")) {
        errorMessage = "Los datos enviados no son válidos. Revisa el mensaje.";
        errorDetails = "Error 422 - Validación";
      } else if (error.message.includes("400")) {
        errorMessage = "Solicitud inválida. Revisa los datos enviados.";
        errorDetails = "Error 400 - Bad Request";
      } else if (error.message.includes("401")) {
        errorMessage = "No estás autorizado. Inicia sesión nuevamente.";
        errorDetails = "Error 401 - No autorizado";
      } else if (error.message.includes("403")) {
        errorMessage = "Sin permisos para realizar esta acción.";
        errorDetails = "Error 403 - Prohibido";
      } else if (error.message.includes("404")) {
        errorMessage =
          "El recurso no fue encontrado. Verifica la URL del servidor.";
        errorDetails = "Error 404 - No encontrado";
      }
      // Si el error tiene un mensaje específico del servidor
      else if (
        error.message &&
        error.message !== "No se pudo enviar el mensaje"
      ) {
        errorMessage = error.message;
        errorDetails = "Error del servidor";
      }

      console.error("Error message final:", errorMessage);
      console.error("Error details:", errorDetails);

      // Mostrar error más informativo al usuario
      let userMessage = errorMessage;
      if (__DEV__) {
        userMessage += `\n\nDetalles técnicos: ${errorDetails}\nError completo: ${error.message}`;
      }

      Alert.alert("Error al enviar mensaje", userMessage);
    } finally {
      setSendingMessage(false);
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Renderizar producto con memoización
  const renderProduct = React.useCallback(
    (producto, index) => {
      // Extraer adicionales del producto desde múltiples fuentes
      let adicionales = [];
      try {
        // Primero intentar desde el campo 'adicionales'
        if (producto.adicionales) {
          adicionales =
            typeof producto.adicionales === "string"
              ? JSON.parse(producto.adicionales)
              : Array.isArray(producto.adicionales)
                ? producto.adicionales
                : [];
        }

        // Si no hay adicionales, intentar desde 'pedido_list_adicionals' del producto
        if (adicionales.length === 0 && producto.pedido_list_adicionals) {
          const adicionalesFromList =
            typeof producto.pedido_list_adicionals === "string"
              ? JSON.parse(producto.pedido_list_adicionals)
              : Array.isArray(producto.pedido_list_adicionals)
                ? producto.pedido_list_adicionals
                : [];

          // Filtrar adicionales que pertenecen a este producto
          adicionales = adicionalesFromList.filter(
            (adicional) =>
              adicional.producto_id === producto.producto_id ||
              adicional.producto_id === producto.id ||
              adicional.pedido_list_id === producto.id
          );
        }

        // Si aún no hay adicionales, buscar en los adicionales globales del pedido
        if (adicionales.length === 0 && pedido?.pedido_list_adicionals) {
          const adicionalesGlobales =
            typeof pedido.pedido_list_adicionals === "string"
              ? JSON.parse(pedido.pedido_list_adicionals)
              : Array.isArray(pedido.pedido_list_adicionals)
                ? pedido.pedido_list_adicionals
                : [];

          // Filtrar adicionales que pertenecen a este producto específico
          adicionales = adicionalesGlobales.filter(
            (adicional) =>
              adicional.producto_id === producto.producto_id ||
              adicional.producto_id === producto.id ||
              adicional.pedido_list_id === producto.id
          );
        }
      } catch (error) {
        console.error("Error parsing adicionales:", error);
        adicionales = [];
      }

      // Log para debugging
      if (adicionales.length > 0) {
        console.log(
          `Producto ${index} tiene ${adicionales.length} adicionales:`,
          adicionales
        );
      }

      // Calcular precio total del producto incluyendo adicionales
      const precioBase = parseFloat(
        producto.producto?.precio || producto.precio_unitario || 0
      );
      const precioAdicionales = adicionales.reduce((total, adicional) => {
        // El precio puede estar en adicional.precio o adicional.producto_adicional.precio
        const precio = parseFloat(
          adicional.producto_adicional?.precio || adicional.precio || 0
        );
        const cantidad = parseInt(adicional.cantidad || 1);
        return total + precio * cantidad;
      }, 0);
      const precioTotal = (precioBase + precioAdicionales) * producto.cantidad;

      return (
        <View key={`producto-${index}`} style={styles.productItem}>
          <View style={styles.productQuantity}>
            <Text style={styles.productQuantityText}>{producto.cantidad}</Text>
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {producto.producto?.nombre ||
                producto.producto_nombre ||
                "Producto"}
            </Text>
            {(producto.producto?.variante || producto.variante) && (
              <Text style={styles.productVariant}>
                {producto.producto?.variante || producto.variante}
              </Text>
            )}

            {/* Mostrar adicionales si existen */}
            {adicionales.length > 0 && (
              <View style={styles.additionalsContainer}>
                <Text style={styles.additionalsTitle}>Adicionales:</Text>
                {adicionales.map((adicional, addIndex) => (
                  <View
                    key={`adicional-${index}-${addIndex}`}
                    style={styles.additionalItem}
                  >
                    <Text style={styles.additionalName}>
                      •{" "}
                      {adicional.producto_adicional?.nombre || adicional.nombre}
                      {adicional.cantidad > 1 && (
                        <Text style={styles.additionalQuantity}>
                          {" "}
                          x{adicional.cantidad}
                        </Text>
                      )}
                    </Text>
                    <Text style={styles.additionalPrice}>
                      +S/
                      {(
                        parseFloat(
                          adicional.producto_adicional?.precio ||
                          adicional.precio ||
                          0
                        ) * parseInt(adicional.cantidad || 1)
                      ).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={styles.productPriceContainer}>
            <Text style={styles.productPrice}>S/{precioTotal.toFixed(2)}</Text>
            {adicionales.length > 0 && (
              <Text style={styles.productBasePrice}>
                Base: S/{(precioBase * producto.cantidad).toFixed(2)}
              </Text>
            )}
          </View>
        </View>
      );
    },
    [pedido]
  );

  const obtenerTextoEstadoPedidos = (estado) => {
    console.log("aqui es el estado del item: " + estado);
    const estados = {
      pendiente: 'En proceso de aceptación',
      aceptado: 'Tu pedido esta en proceso',
      completado: 'Completado',
      entregado: 'Entregado',
      cancelado: 'Cancelado'
    };
    return estados[estado] || 'Pendiente';
  };

  // Renderizar mensaje del chat
  const renderChatMessage = (message, index) => {
    // Validación de seguridad - verificar que el mensaje existe
    if (!message) {
      console.error('PedidoDetalle - renderChatMessage: mensaje es null/undefined');
      return null;
    }

    // Validar que los IDs existan antes de compararlos
    const messageUserId = message.usuario_id || message.user_id;
    const currentUserId = message.currentUserId;

    // Log para debugging
    console.log('PedidoDetalle - renderChatMessage:', {
      index,
      messageUserId,
      currentUserId,
      message_usuario_id: message.usuario_id,
      message_user_id: message.user_id,
      message_currentUserId: message.currentUserId
    });

    // Solo comparar si ambos valores existen
    const isMyMessage = messageUserId && currentUserId &&
      messageUserId.toString() === currentUserId.toString();

    // Extraer el contenido del mensaje
    let messageContent = "";
    try {
      // Intentar parsear el mensaje como JSON
      if (message.message && typeof message.message === "string") {
        const parsedMessage = JSON.parse(message.message);
        messageContent =
          parsedMessage.content || parsedMessage.text || message.message;
      } else {
        messageContent = message.message || "";
      }
    } catch (error) {
      // Si no es JSON válido, usar el mensaje tal como está
      console.log("Error parseando mensaje:", error);
      messageContent = message.message || "";
    }

    console.log("Renderizando mensaje:", {
      id: message.id,
      usuario_id: message.usuario_id,
      currentUserId: message.currentUserId,
      isMyMessage,
      rawMessage: message.message,
      parsedContent: messageContent
    });

    return (
      <View
        key={index}
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage,
        ]}
      >
        {!isMyMessage && (
          <Text style={styles.senderName}>
            {message.usuario?.nombre_completo ||
              message.usuario?.name ||
              "Comercio"}
          </Text>
        )}
        <Text
          style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText,
          ]}
        >
          {messageContent}
        </Text>
        {message.image_url && (
          <Image
            source={{ uri: message.image_url }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        )}
        <Text
          style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
          ]}
        >
          {formatDate(message.created_at)}
        </Text>
      </View>
    );
  };

  // Extraer datos del pedido de forma optimizada
  const pedidoInfo = React.useMemo(() => {
    if (!pedido) {
      console.log("PedidoDetalle - pedidoInfo: pedido es null/undefined");
      return null;
    }

    console.log("PedidoDetalle - Procesando datos del pedido:", pedido);

    let destino = "Dirección no disponible";
    let origen = "Dirección no disponible";

    try {
      if (pedido.datos_generales) {
        const datosGenerales =
          typeof pedido.datos_generales === "string"
            ? JSON.parse(pedido.datos_generales)
            : pedido.datos_generales;
        destino = datosGenerales.end_lugar || "Dirección no disponible";
        origen = datosGenerales.start_lugar || "Dirección no disponible";
      }
    } catch (error) {
      console.error("Error parsing pedido data:", error);
    }

    const productos = pedido.pedido_lists || [];
    const cantidadProductos = productos.reduce(
      (total, prod) => total + (prod.cantidad || 0),
      0
    );

    // Log para ver los adicionales disponibles en el pedido
    if (pedido.pedido_list_adicionals) {
      console.log(
        "PedidoDetalle - Adicionales encontrados en pedido:",
        pedido.pedido_list_adicionals
      );
    }

    const result = {
      destino,
      origen,
      productos,
      cantidadProductos,
    };

    console.log("PedidoDetalle - pedidoInfo creado:", result);
    return result;
  }, [pedido]);

  // Función para obtener el nombre de fuente con fallback
  const getFontFamily = (fontType) => {
    if (!fontsLoaded && !fontTimeout) return "System";

    switch (fontType) {
      case "regular":
        return fontsLoaded ? "MontserratRegular" : "System";
      case "bold":
        return fontsLoaded ? "MontserratBold" : "System";
      case "light":
        return fontsLoaded ? "MontserratLight" : "System";
      default:
        return "System";
    }
  };

  // Mostrar loading solo si estamos realmente cargando datos
  if (loading || (!fontsLoaded && !fontTimeout)) {
    console.log("PedidoDetalle - Mostrando loading:", {
      fontsLoaded,
      fontTimeout,
      loading,
    });
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a7ff00" />
          <Text
            style={[
              styles.loadingText,
              { fontFamily: getFontFamily("regular") },
            ]}
          >
            {loading ? "Cargando detalles..." : "Cargando fuentes..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!pedido || !pedidoInfo) {
    console.log("PedidoDetalle - No hay pedido o pedidoInfo:", {
      pedido: !!pedido,
      pedidoInfo: !!pedidoInfo,
      fontsLoaded,
      fontTimeout,
      loading,
    });
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text
            style={[styles.errorText, { fontFamily: getFontFamily("regular") }]}
          >
            No se encontraron detalles del pedido
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text
              style={[
                styles.backButtonText,
                { fontFamily: getFontFamily("bold") },
              ]}
            >
              Volver
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  console.log("PedidoDetalle - Renderizando componente principal:", {
    fontsLoaded,
    fontTimeout,
    loading,
    hasPedido: !!pedido,
    hasPedidoInfo: !!pedidoInfo,
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBackButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pedido #{pedido.id}</Text>

      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Estado y precio */}
        <View style={styles.statusSection}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              S/{parseFloat(pedido.costo_total || 0).toLocaleString()}
            </Text>
            <Text style={styles.statusBadge}>
              {obtenerTextoEstadoPedidos(pedido.estado)}
            </Text>
          </View>
          <Text style={styles.orderDate}>
            Pedido realizado el {formatDate(pedido.created_at)}
          </Text>
        </View>
        <View style={styles.pasosContainer}>
          {pasosRestaurante.map((paso, index) => {
            const currentIndex = pasosRestaurante.findIndex(p => p.key === pedido.estado);
            const isActive = paso.key === pedido.estado;
            const isCompleted = currentIndex > index;

            return (
              <View key={paso.key} style={styles.paso}>
                <FontAwesome
                  name={paso.icon}
                  size={20}
                  color={isCompleted || isActive ? '#a7ff00' : '#ccc'}
                />
                <Text
                  style={[
                    styles.pasoTexto,
                    isActive && styles.pasoTextoActivo,
                    isCompleted && styles.pasoTextoCompletado,
                  ]}
                >
                  {paso.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* PASOS CONDUCTOR */}
        <View style={styles.pasosContainer}>
          {!pedido.carrera ? (
            <>
              {pasosConductor.map(paso => (
                <View key={paso.key} style={styles.paso}>
                  <FontAwesome name={paso.icon} size={20} color="#ccc" />
                  <Text style={[styles.pasoTexto, { color: '#ccc' }]}>{paso.label}</Text>
                </View>
              ))}
            </>
          ) : (
            pasosConductor.map((paso, index) => {
              const currentIndex = pasosConductor.findIndex(p => p.key === pedido.carrera.estado);
              const isActive = paso.key === pedido.carrera.estado;
              const isCompleted = currentIndex > index;

              return (
                <View key={paso.key} style={styles.paso}>
                  <FontAwesome
                    name={paso.icon}
                    size={20}
                    color={isCompleted || isActive ? '#a7ff00' : '#ccc'}
                  />
                  <Text
                    style={[
                      styles.pasoTexto,
                      isActive && styles.pasoTextoActivo,
                      isCompleted && styles.pasoTextoCompletado,
                    ]}
                  >
                    {paso.label}
                  </Text>
                </View>
              );
            })
          )}
        </View>


        {/* Información del establecimiento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Establecimiento</Text>
          <Text style={styles.establishmentName}>
            {pedido.comercio?.establecimiento_nombre ||
              "Comercio no disponible"}
          </Text>
          <TouchableOpacity
            style={[
              styles.headerActionButton,
              {
                backgroundColor: '#9BFE03',
                paddingVertical: 12,
                marginTop: 10,
                borderRadius: 6,
                alignItems: 'center',
                justifyContent: 'center',
                width: '50%',
                marginLeft: 0, // puedes ajustar según contexto
              },
            ]}
            onPress={() => {
              setShowChatModal(true);
              loadChatMessages();
            }}
          >
            <Text style={{ color: '#000', fontWeight: 'bold', textAlign: 'center' }}>
              Chat con el comercio
            </Text>
          </TouchableOpacity>
        </View>

        {/* Productos */}
        {pedidoInfo.productos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Productos ({pedidoInfo.cantidadProductos}{" "}
              {pedidoInfo.cantidadProductos === 1 ? "artículo" : "artículos"})
            </Text>
            <View style={styles.productsContainer}>
              {pedidoInfo.productos.map((producto, index) =>
                renderProduct(producto, index)
              )}
            </View>
          </View>
        )}

        {/* Ubicaciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicaciones</Text>

          <View style={styles.locationRow}>
            <FontAwesome name="circle-o" size={16} color="#999" />
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Origen</Text>
              <Text style={styles.locationText}>{pedidoInfo.origen}</Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <FontAwesome name="map-marker" size={16} color="#197200" />
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Destino</Text>
              <Text style={styles.locationText}>{pedidoInfo.destino}</Text>
            </View>
          </View>
        </View>

        {/* Información de pago */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de pago</Text>
          <View style={styles.paymentInfo}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Método de pago:</Text>
              <Text style={styles.paymentValue}>
                {pedido.metodo_pago === "mercadopago"
                  ? "Mercado Pago"
                  : pedido.metodo_pago === "qr"
                    ? "Código QR"
                    : "Efectivo"}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Estado del pago:</Text>
              <Text style={styles.paymentValue}>
                {pedido.estado_pago || "Pendiente"}
              </Text>
            </View>
          </View>
        </View>

        {/* Acciones disponibles */}
        <View style={styles.actionsSection}>

          {/* Botón de evidencia de pago para método QR */}
          {pedido.metodo_pago === "qr" &&
            pedido.estado_pago !== "completado" && pedido.estado !== "pendiente" && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  if (pedido.estado === "pendiente") {
                    Alert.alert(
                      "Pedido pendiente",
                      "El restaurante aún no ha aceptado tu pedido. No puedes subir un comprobante de pago hasta que sea aceptado."
                    );
                    return;
                  }
                  setShowEvidenceModal(true);
                }}
              >
                <MaterialIcons name="file-upload" size={24} color="white" />
                <Text style={styles.actionButtonText}>
                  Cargar evidencia de pago
                </Text>
              </TouchableOpacity>
            )}

          {pedido.estado !== 'completado' &&
            pedido.estado !== 'cancelado' &&
            (!pedido.carrera || (
              pedido.carrera.estado !== 'completado' &&
              pedido.carrera.estado !== 'cancelado'
            )) && (
              <TouchableOpacity
                style={styles.cancelButtonOutline}
                onPress={() => {
                  Alert.alert(
                    "Confirmar cancelación",
                    "¿Estás seguro de que quieres cancelar este pedido?",
                    [
                      { text: "No", style: "cancel" },
                      {
                        text: "Sí",
                        onPress: () => cancelarPedido(pedido.id, pedido.carrera?.id),
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.textCancel2}>
                  Cancelar pedido
                </Text>
              </TouchableOpacity>
            )}
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Modal de evidencia de pago */}
      <Modal
        visible={showEvidenceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEvidenceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalTitle}>Cargar evidencia de pago</Text>
              <Text style={styles.modalDescription}>
                Sube una captura de pantalla o foto del comprobante de pago.
              </Text>

              {/* Sección QR */}
              <View style={{ marginTop: 20 }}>
                <Text style={styles.sectionTitle}>Imagen de pago (QR)</Text>
                {qrImageUrl && (
                  <View style={styles.qrEvidenceImageContainer}>
                    <Image
                      source={{ uri: qrImageUrl }}
                      style={styles.qrEvidenceImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
              </View>

              {/* Separador visual */}
              <View style={{ height: 1, backgroundColor: '#ccc', marginVertical: 20 }} />

              {/* Sección para subir evidencia */}
              <View>
                <Text style={styles.sectionTitle}>Evidencia del pago</Text>
                <View style={styles.evidenceSection}>
                  {evidenceImage ? (
                    <View style={styles.selectedImageContainer}>
                      <Image
                        source={{ uri: evidenceImage }}
                        style={styles.selectedImage}
                      />
                      <TouchableOpacity
                        style={styles.changeImageButton}
                        onPress={pickEvidenceImage}
                      >
                        <Text style={styles.changeImageText}>Cambiar imagen</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.selectImageButton}
                      onPress={pickEvidenceImage}
                    >
                      <MaterialIcons name="add-a-photo" size={48} color="#a7ff00" />
                      <Text style={styles.selectImageText}>Seleccionar imagen</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Botones fuera del Scroll */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEvidenceModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  (!evidenceImage || uploadingEvidence || evidenceUploaded) &&
                  styles.disabledButton,
                ]}
                onPress={uploadEvidence}
                disabled={!evidenceImage || uploadingEvidence || evidenceUploaded}
              >
                {uploadingEvidence ? (
                  <ActivityIndicator size="small" color="black" />
                ) : evidenceUploaded ? (
                  <View style={styles.uploadedIndicator}>
                    <Ionicons name="checkmark-circle" size={20} color="black" />
                    <Text style={styles.uploadButtonText}>¡Enviado!</Text>
                  </View>
                ) : (
                  <Text style={styles.uploadButtonText}>Subir evidencia</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de chat */}
      <Modal
        visible={showChatModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowChatModal(false)}
      >
        <SafeAreaView style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <TouchableOpacity
              onPress={() => setShowChatModal(false)}
              style={styles.chatBackButton}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.chatTitle}>Chat del pedido #{pedido.id}</Text>
          </View>

          <ScrollView
            ref={chatScrollViewRef}
            style={styles.chatMessages}
            contentContainerStyle={styles.chatMessagesContent}
            onContentSizeChange={() =>
              chatScrollViewRef.current?.scrollToEnd({ animated: true })
            }
          >
            {loadingChat ? (
              <ActivityIndicator
                size="large"
                color="#a7ff00"
                style={styles.chatLoading}
              />
            ) : chatMessages.length === 0 ? (
              <Text style={styles.noChatMessages}>
                No hay mensajes aún. ¡Inicia la conversación!
              </Text>
            ) : (
              chatMessages.filter(message => message != null).map((message, index) =>
                renderChatMessage(message, index)
              ).filter(Boolean)
            )}
          </ScrollView>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.chatInputContainer}
          >
            {chatImage && (
              <View style={styles.selectedChatImageContainer}>
                <Image
                  source={{ uri: chatImage }}
                  style={styles.selectedChatImage}
                />
                <TouchableOpacity
                  style={styles.removeChatImageButton}
                  onPress={() => setChatImage(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#ff4444" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.chatInputRow}>
              <TouchableOpacity
                style={styles.chatImageButton}
                onPress={pickChatImage}
              >
                <Ionicons name="camera" size={24} color="#a7ff00" />
              </TouchableOpacity>

              <TextInput
                style={styles.chatInput}
                placeholder="Escribe un mensaje..."
                placeholderTextColor="#999"
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={500}
              />

              <TouchableOpacity
                style={[
                  styles.chatSendButton,
                  sendingMessage && styles.disabledButton,
                ]}
                onPress={sendChatMessage}
                disabled={sendingMessage}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="black" />
                ) : (
                  <Ionicons name="send" size={20} color="black" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 16,
    fontFamily: "MontserratRegular",
    marginTop: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "white",
    fontSize: 18,
    fontFamily: "MontserratRegular",
    textAlign: "center",
    marginBottom: 20,
  },
  header: {
    backgroundColor: "#a7ff00",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 45,
  },
  headerBackButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "MontserratBold",
    color: "black",
    flex: 1,
    textAlign: "center",
  },
  headerActions: {
    flexDirection: "row",
  },
  headerActionButton: {
    padding: 5,
    marginLeft: 10,
  },
  scrollContainer: {
    flex: 1,
  },
  statusSection: {
    backgroundColor: "#2a2a2a",
    padding: 20,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  price: {
    color: "#a7ff00",
    fontSize: 24,
    fontFamily: "MontserratBold",
  },
  statusBadge: {
    backgroundColor: "#a7ff00",
    color: "black",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    fontSize: 14,
    fontFamily: "MontserratBold",
  },
  orderDate: {
    color: "#ccc",
    fontSize: 14,
    fontFamily: "MontserratRegular",
  },
  section: {
    backgroundColor: "#2a2a2a",
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#a7ff00",
    fontSize: 18,
    fontFamily: "MontserratBold",
    marginBottom: 15,
  },
  establishmentName: {
    color: "white",
    fontSize: 16,
    fontFamily: "MontserratRegular",
  },
  productsContainer: {
    marginTop: 10,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  productQuantity: {
    backgroundColor: "#a7ff00",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    marginTop: 3,
  },
  productQuantityText: {
    color: "black",
    fontSize: 14,
    fontFamily: "MontserratBold",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: "white",
    fontSize: 16,
    fontFamily: "MontserratRegular",
  },
  productVariant: {
    color: "#ccc",
    fontSize: 14,
    fontFamily: "MontserratRegular",
    marginTop: 2,
  },
  additionalsContainer: {
    marginTop: 8,
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 10,
  },
  additionalsTitle: {
    color: "#a7ff00",
    fontSize: 13,
    fontFamily: "MontserratBold",
    marginBottom: 5,
  },
  additionalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  additionalName: {
    color: "#ddd",
    fontSize: 13,
    fontFamily: "MontserratRegular",
    flex: 1,
  },
  additionalQuantity: {
    color: "#a7ff00",
    fontFamily: "MontserratBold",
  },
  additionalPrice: {
    color: "#a7ff00",
    fontSize: 12,
    fontFamily: "MontserratBold",
    marginLeft: 10,
  },
  productPriceContainer: {
    alignItems: "flex-end",
  },
  productPrice: {
    color: "#a7ff00",
    fontSize: 16,
    fontFamily: "MontserratBold",
  },
  productBasePrice: {
    color: "#999",
    fontSize: 12,
    fontFamily: "MontserratRegular",
    marginTop: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  locationDetails: {
    marginLeft: 15,
    flex: 1,
  },
  locationLabel: {
    color: "#a7ff00",
    fontSize: 14,
    fontFamily: "MontserratBold",
    marginBottom: 5,
  },
  locationText: {
    color: "white",
    fontSize: 16,
    fontFamily: "MontserratRegular",
    lineHeight: 22,
  },
  paymentInfo: {
    marginTop: 10,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  paymentLabel: {
    color: "#ccc",
    fontSize: 14,
    fontFamily: "MontserratRegular",
  },
  paymentValue: {
    color: "white",
    fontSize: 14,
    fontFamily: "MontserratBold",
  },
  actionsSection: {
    padding: 20,
  },
  actionButton: {
    backgroundColor: "#a7ff00",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonText: {
    color: "black",
    fontSize: 16,
    fontFamily: "MontserratBold",
    marginLeft: 10,
  },
  bottomSpace: {
    height: 50,
  },
  backButton: {
    backgroundColor: "#a7ff00",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  backButtonText: {
    color: "black",
    fontSize: 16,
    fontFamily: "MontserratBold",
  },
  // Estilos del modal de evidencia
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#2a2a2a",
    borderRadius: 15,
    padding: 25,
    width: width * 0.9,
    maxHeight: height * 0.8,
  },
  modalTitle: {
    color: "#a7ff00",
    fontSize: 20,
    fontFamily: "MontserratBold",
    textAlign: "center",
    marginBottom: 15,
  },
  modalDescription: {
    color: "white",
    fontSize: 16,
    fontFamily: "MontserratRegular",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22,
  },
  evidenceSection: {
    alignItems: "center",
    marginBottom: 25,
  },
  selectImageButton: {
    backgroundColor: "#3a3a3a",
    borderRadius: 10,
    padding: 40,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#a7ff00",
    borderStyle: "dashed",
  },
  selectImageText: {
    color: "#a7ff00",
    fontSize: 16,
    fontFamily: "MontserratBold",
    marginTop: 10,
  },
  selectedImageContainer: {
    alignItems: "center",
  },
  selectedImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 15,
  },
  changeImageButton: {
    backgroundColor: "#a7ff00",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changeImageText: {
    color: "black",
    fontSize: 14,
    fontFamily: "MontserratBold",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    backgroundColor: "#444",
    flex: 1,
    marginRight: 10,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 16,
    fontFamily: "MontserratBold",
  },
  uploadButton: {
    backgroundColor: "#a7ff00",
    flex: 1,
    marginLeft: 10,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  uploadButtonText: {
    color: "black",
    fontSize: 16,
    fontFamily: "MontserratBold",
  },
  disabledButton: {
    opacity: 0.5,
  },
  uploadedIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Estilos del chat
  chatContainer: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  chatHeader: {
    backgroundColor: "#a7ff00",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 45,
  },
  chatBackButton: {
    padding: 5,
    marginRight: 15,
  },
  chatTitle: {
    color: "black",
    fontSize: 18,
    fontFamily: "MontserratBold",
    flex: 1,
  },
  chatMessages: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  chatMessagesContent: {
    padding: 20,
  },
  chatLoading: {
    marginTop: 50,
  },
  noChatMessages: {
    color: "#ccc",
    fontSize: 16,
    fontFamily: "MontserratRegular",
    textAlign: "center",
    marginTop: 50,
  },
  messageContainer: {
    maxWidth: "80%",
    marginBottom: 15,
    padding: 12,
    borderRadius: 15,
  },
  myMessage: {
    backgroundColor: "#a7ff00",
    alignSelf: "flex-end",
  },
  otherMessage: {
    backgroundColor: "#2a2a2a",
    alignSelf: "flex-start",
  },
  senderName: {
    fontSize: 12,
    fontFamily: "MontserratBold",
    color: "#a7ff00",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    fontFamily: "MontserratRegular",
    lineHeight: 20,
  },
  myMessageText: {
    color: "black",
  },
  otherMessageText: {
    color: "white",
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginTop: 8,
  },
  messageTime: {
    fontSize: 12,
    fontFamily: "MontserratRegular",
    marginTop: 5,
  },
  myMessageTime: {
    color: "rgba(0,0,0,0.7)",
  },
  otherMessageTime: {
    color: "rgba(255,255,255,0.7)",
  },
  chatInputContainer: {
    backgroundColor: "#2a2a2a",
    padding: 15,
  },
  selectedChatImageContainer: {
    position: "relative",
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  selectedChatImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removeChatImageButton: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "white",
    borderRadius: 12,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  chatImageButton: {
    padding: 10,
    marginRight: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#3a3a3a",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: "white",
    fontSize: 16,
    fontFamily: "MontserratRegular",
    maxHeight: 100,
  },
  chatSendButton: {
    backgroundColor: "#a7ff00",
    borderRadius: 20,
    padding: 10,
    marginLeft: 10,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  pasosContainer: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  paso: {
    alignItems: 'center',
    flex: 1,
  },
  pasoTexto: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  pasoTextoActivo: {
    color: '#a7ff00',
    fontWeight: 'bold',
  },
  pasoTextoCompletado: {
    color: '#a7ff00',
  },
  avisoCarreraNoAsignada: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
  },
  cancelButtonOutline: {
    paddingVertical: 10,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e74c3c',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  textCancel2: {
    color: '#e74c3c'
  },
  qrEvidenceImageContainer: {
    width: "100%",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
    marginVertical: 15,
    alignItems: "center",
  },
  qrEvidenceImage: {
    width: 200,
    height: 200,
  },
});

export default PedidoDetalle;
