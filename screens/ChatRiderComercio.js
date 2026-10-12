import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Keyboard,
  Dimensions,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
  Image
} from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts, Montserrat_400Regular, Montserrat_700Bold, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';
import { FontAwesome, Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { BASE_URL } from "../constants/url";
import { useNotification } from "../context/NotificationContext";
import AlertaModal from "../components/ErrorModal";
import FullscreenImageViewer from "../components/usuario/pedidos/FullscreenImageViewer";
import ChatInput from "../components/ChatInput";

const dayLabel = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Hoy";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
};

export default function ChatRiderComercio({
  route,
  pedidoId: propPedidoId,
  carreraId: propCarreraId,
  comercioId: propComercioId,
  comercioNombre: propComercioNombre,
  riderId: propRiderId,
  tipo: propTipo,
  peerName: propPeerName,
  peerAvatar: propPeerAvatar,
  showHeader = false,
  onClose,
  modalMode = false,
}) {
  const navigation = useNavigation();
  const routeParams = route?.params || {};

  const pedidoId = propPedidoId ?? routeParams.pedidoId;
  const carreraId = propCarreraId ?? routeParams.carreraId;
  const comercioId = propComercioId ?? routeParams.comercioId;
  const comercioNombre = propComercioNombre ?? routeParams.comercioNombre;
  const riderId = propRiderId ?? routeParams.riderId;
  const tipo = propTipo ?? routeParams.tipo;
  const peerName = propPeerName ?? comercioNombre;
  const peerAvatar = propPeerAvatar ?? null;

  const peerInitials = useMemo(() => {
    const parts = String(peerName || "?").trim().split(/\s+/);
    return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
  }, [peerName]);

  console.log("🚀 ChatRiderComercio iniciado con params:", { routeParams, propPedidoId, propCarreraId, propComercioId, propComercioNombre, propRiderId, propTipo });
  console.log("📋 Parámetros extraídos:", { pedidoId, carreraId, comercioId, comercioNombre, riderId, tipo });

  // Validar que existe pedidoId antes de renderizar el chat
  if (!pedidoId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-triangle" size={50} color="#ff4757" />
          <Text style={styles.errorText}>Error: No se encontró información del pedido</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Estado para el chat
  const [mensaje, setMensaje] = useState('');
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [comercioInfo, setComercioInfo] = useState(null);
  const [pedidoInfo, setPedidoInfo] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });
  const [chatImage, setChatImage] = useState(null);

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();
  const windowHeight = useWindowDimensions().height;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => setKeyboardHeight(e.endCoordinates?.height || 0));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Offset manual solo en Android sin resize (Expo Go). En iOS lo maneja el KAV interno.
  const windowShrunk = Dimensions.get("screen").height - windowHeight > 50;
  const manualOffset = Platform.OS === "android" && !windowShrunk ? keyboardHeight : 0;

  const { notification } = useNotification();


  useEffect(() => {
    if (notification) {
      cargarMensajes()
    }
  }, [notification]);

  // Cargar fuentes
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_600SemiBold
  });

  // Efecto para cargar la información inicial y configurar el intervalo de actualización
  useFocusEffect(
    useCallback(() => {
      // Obtener el ID del usuario actual
      const getCurrentUserId = async () => {
        try {
          const userData = await AsyncStorage.getItem('userData');
          if (userData) {
            const userInfo = JSON.parse(userData);
            setCurrentUserId(userInfo.id);
          }
        } catch (error) {
          console.error('Error getting current user ID:', error);
        }
      };
      getCurrentUserId();

      // Cargar información del pedido y del comercio
      cargarInfoPedido();

      // Cargar mensajes
      cargarMensajes();

      // Configurar actualización periódica de mensajes (cada 10 segundos)
      const intervalId = setInterval(() => {
        cargarMensajes(false); // Pasar false para no mostrar indicador de carga
      }, 10000);

      // Limpiar intervalo al desmontar
      return () => clearInterval(intervalId);
    }, [pedidoId, carreraId, comercioId])
  );

  // Función para cargar la información del pedido
  const cargarInfoPedido = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        setError('No se encontró token de autenticación');
        return;
      }

      // Cargar información del pedido
      const responsePedido = await fetch(`${BASE_URL}pedidos/${pedidoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!responsePedido.ok) {
        throw new Error('Error al cargar información del pedido');
      }

      const pedidoData = await responsePedido.json();
      setPedidoInfo(pedidoData);

      // Si el pedido tiene información del comercio, guardarla (solo si no la tenemos ya)
      if (pedidoData.comercio && !comercioInfo) {
        setComercioInfo(pedidoData.comercio);
      }

    } catch (error) {
      console.error('Error al cargar datos del pedido:', error);
      setError('Error al cargar información del pedido');
    }
  };

  // Función para cargar mensajes
  const cargarMensajes = useCallback(async (mostrarCargando = true) => {
    try {
      if (mostrarCargando) {
        setCargando(true);
      }

      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        if (mostrarCargando) setError('No se encontró token de autenticación');
        setCargando(false);
        return;
      }

      // Endpoint para cargar los mensajes
      const endpoint = `${BASE_URL}carrera-pedido-chat/messages/${pedidoId}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status !== 404) {
          throw new Error(`Error al cargar mensajes: ${response.status}`);
        }
        setMensajes((prev) => (prev.length === 0 ? prev : []));
        return;
      }

      const data = await response.json();

      // Los mensajes pueden estar en data.data, data.mensajes, o directamente en data
      const messages = data.data || data.mensajes || data || [];
      setMensajes(Array.isArray(messages) ? messages : []);
      console.log('Mensajes cargados:', Array.isArray(messages) ? messages.length : 0);

    } catch (error) {
      console.error('Error al cargar mensajes:', error);
      if (mostrarCargando) setError('Error al cargar mensajes');
    } finally {
      setCargando(false);
    }
  }, [pedidoId]);

  // Función para enviar un mensaje (acepta texto directo para quick replies)
  const enviarMensaje = async (textOverride) => {
    const texto = textOverride || mensaje;
    if (!texto.trim()) return;

    // El backend solo exige pedido_id, carrera_id y (conductor_id o negocio_id).
    // Cuando el conductor escribe al comercio no hace falta comercioId.
    if (!carreraId || !pedidoId) {
      console.error('❌ Faltan parámetros obligatorios:');
      console.log('carreraId:', carreraId);
      console.log('pedidoId:', pedidoId);
      showAlert('Faltan datos necesarios para enviar el mensaje', "error");
      return;
    }

    // Asegurar ID del conductor remitente
    let senderId = riderId || currentUserId;
    if (!senderId) {
      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        const storedUserInfo = storedUserData ? JSON.parse(storedUserData) : null;
        senderId = storedUserInfo?.id;
        if (senderId) setCurrentUserId(senderId);
      } catch (e) {}
    }

    if (!senderId) {
      showAlert('No se encontró la información del conductor', "error");
      return;
    }

    setEnviando(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showAlert('No se encontró token de autenticación', "error");
        return;
      }

      // Crear el mensaje como objeto y luego convertirlo a string JSON
      const messageObject = {
        type: "text",
        content: texto.trim(),
      };

      // Usar el mismo formato que funciona en PedidoDetalle.js
      const escapedJson = JSON.stringify(messageObject).replace(/"/g, '\\"');
      const formattedMessage = `"${escapedJson}"`;

      console.log('messageObject:', messageObject);
      console.log('escapedJson:', escapedJson);
      console.log('formattedMessage:', formattedMessage);

      // Preparar el cuerpo de la solicitud con la nueva estructura
      const requestBody = {
        carrera_id: parseInt(carreraId),
        pedido_id: parseInt(pedidoId),
        conductor_id: parseInt(senderId), // El rider actual es quien envía
        message: formattedMessage,
      };

      // Console logs para debugging
      console.log('=== ENVIANDO MENSAJE DE CHAT RIDER ===');
      console.log('URL:', `${BASE_URL}carrera-pedido-chat/send`);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      console.log('Token existe:', !!token);
      console.log('Request body completo:', requestBody);

      // Agregar mensaje localmente primero
      const userData = await AsyncStorage.getItem('userData');
      const userInfo = userData ? JSON.parse(userData) : null;

      const nuevoMensajeLocal = {
        id: Date.now(),
        remitente_id: userInfo?.id,
        destinatario_id: comercioId, // El comercio es el destinatario
        mensaje: texto.trim(),
        remitente: userInfo,
        estado: 'enviando',
        timestamp: new Date().toISOString(),
      };

      setMensajes(prev => [...prev, nuevoMensajeLocal]);
      setMensaje('');

      // Enviar a la API usando la nueva ruta y estructura
      const response = await fetch(`${BASE_URL}carrera-pedido-chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log('=== RESPUESTA DEL SERVIDOR ===');
      console.log('Status:', response.status);
      console.log('Response body:', responseText);

      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorData = JSON.parse(responseText);
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.log("No se pudo parsear el error como JSON:", parseError);
        }

        // Marcar mensaje local como error
        setMensajes(prev =>
          prev.map(msg =>
            msg.id === nuevoMensajeLocal.id
              ? { ...msg, estado: 'error' }
              : msg
          )
        );

        showAlert(errorMessage, "error");
        return;
      }

      console.log('✅ Mensaje enviado exitosamente');

      // Actualizar mensaje local
      setMensajes(prev =>
        prev.map(msg =>
          msg.id === nuevoMensajeLocal.id
            ? { ...msg, estado: 'enviado' }
            : msg
        )
      );

      // Recargar mensajes para asegurar sincronización (silencioso para no bloquear la vista)
      setTimeout(() => {
        cargarMensajes(false);
      }, 1000);

    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);

      let errorMessage = "No se pudo enviar el mensaje";
      if (error.message.includes('Network request failed')) {
        errorMessage = "Error de conexión. Verifica tu internet.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      showAlert(errorMessage, "error");
    } finally {
      setEnviando(false);
    }
  };

  // Formatear la fecha para mostrarla en el chat
  const formatearFecha = (fechaString) => {
    const fecha = new Date(fechaString);
    return fecha.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Respuestas rápidas para el rider hablando con el comercio
  const quickReplies = [
    { text: 'Ya llegué al comercio', icon: 'check' },
    { text: '¿Pedido listo?', icon: 'question-circle' },
    { text: 'Voy en camino', icon: 'location-arrow' },
  ];

  const handlePickImageAndSend = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Se necesita acceso a tu galería para enviar imágenes', "info");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (result.canceled || result.cancelled) return;
    const image = result.assets?.[0];
    if (!image?.uri) return;
    setChatImage(image.uri);
  };

  const handleSend = () => {
    if (chatImage) {
      const uri = chatImage;
      setChatImage(null);
      enviarImagen({ uri });
    } else {
      enviarMensaje();
    }
  };

  const enviarImagen = async (image) => {
    let senderId = riderId || currentUserId;
    if (!senderId) {
      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        senderId = storedUserData ? JSON.parse(storedUserData)?.id : null;
        if (senderId) setCurrentUserId(senderId);
      } catch (e) {}
    }
    if (!carreraId || !pedidoId || !senderId) {
      showAlert('Faltan datos necesarios para enviar la imagen', "error");
      return;
    }
    setEnviando(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showAlert('No se encontró token de autenticación', "error");
        return;
      }

      const messageObject = { type: "file", content: "chat" };
      const escapedJson = JSON.stringify(messageObject).replace(/"/g, '\\"');

      const formData = new FormData();
      formData.append("carrera_id", String(carreraId));
      formData.append("pedido_id", String(pedidoId));
      formData.append("conductor_id", String(senderId));
      formData.append("message", `"${escapedJson}"`);
      formData.append("image", {
        uri: image.uri,
        name: "photo.jpg",
        type: "image/jpeg",
      });

      const nuevoMensajeLocal = {
        id: Date.now(),
        remitente_id: senderId,
        destinatario_id: comercioId,
        mensaje: 'Imagen',
        image: image.uri,
        estado: 'enviando',
        timestamp: new Date().toISOString(),
      };

      setMensajes(prev => [...prev, nuevoMensajeLocal]);

      const response = await fetch(`${BASE_URL}carrera-pedido-chat/send`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        setMensajes(prev =>
          prev.map(msg =>
            msg.id === nuevoMensajeLocal.id ? { ...msg, estado: 'error' } : msg
          )
        );
        showAlert("No se pudo enviar la imagen", "error");
        return;
      }

      setMensajes(prev =>
        prev.map(msg =>
          msg.id === nuevoMensajeLocal.id ? { ...msg, estado: 'enviado' } : msg
        )
      );

      setTimeout(() => cargarMensajes(false), 800);
    } catch (error) {
      console.error('Error enviando imagen:', error);
      showAlert("No se pudo enviar la imagen", "error");
    } finally {
      setEnviando(false);
    }
  };

  const extraerContenido = useCallback((item) => {
    let contenido = item.mensaje;
    if (item.message && typeof item.message === 'string') {
      try {
        const parsed = JSON.parse(item.message);
        if (parsed.content) contenido = parsed.content;
      } catch (e) {
        try {
          const cleaned = item.message.replace(/^"|"$/g, '').replace(/\\"/g, '"');
          const parsed = JSON.parse(cleaned);
          if (parsed.content) contenido = parsed.content;
        } catch (e2) {
          contenido = item.message || item.mensaje || '';
        }
      }
    }
    return contenido;
  }, []);

  const extraerImagen = useCallback((item) => {
    if (item.image) return item.image;
    if (item.message && typeof item.message === 'string') {
      try {
        const parsed = JSON.parse(item.message);
        if (parsed.type === 'file' || parsed.type === 'image') {
          return `https://back.carbycol.com/storage/${parsed.content}`;
        }
      } catch (e) {
        try {
          const cleaned = item.message.replace(/^"|"$/g, '').replace(/\\"/g, '"');
          const parsed = JSON.parse(cleaned);
          if (parsed.type === 'file' || parsed.type === 'image') {
            return `https://back.carbycol.com/storage/${parsed.content}`;
          }
        } catch (e2) {}
      }
    }
    return null;
  }, []);

  // Renderizar un mensaje individual (memoizado: no se recrea al escribir)
  const renderMensaje = useCallback(({ item }) => {
    if (item.type === "divider") {
      return (
        <View style={styles.dayRow}>
          <Text style={styles.dayLabel}>{item.label}</Text>
        </View>
      );
    }
    const esDelRider = item.remitente_id === currentUserId || item.conductor_id === currentUserId;
    const contenido = extraerContenido(item);
    const imageUri = extraerImagen(item);

    if (esDelRider) {
      return (
        <View style={[styles.messageWrapper, styles.myMessageWrapper]}>
          <View style={[styles.bubble, styles.myBubble]}>
            {imageUri ? (
              <TouchableOpacity onPress={() => setFullscreenImage(imageUri)} activeOpacity={0.85}>
                <Image source={{ uri: imageUri }} style={styles.messageImage} />
              </TouchableOpacity>
            ) : (
              <Text style={[styles.messageText, styles.myMessageText]}>
                {typeof contenido === 'string' ? contenido : ''}
              </Text>
            )}
            <View style={[styles.metaRow, styles.myMeta]}>
              <Text style={[styles.time, styles.myTime]}>
                {new Date(item.timestamp || item.created_at || Date.now()).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              {item.estado === 'enviando' && <Text style={styles.statusSending}>enviando</Text>}
              {item.estado === 'error' && <Text style={styles.statusError}>error</Text>}
              {item.estado !== 'enviando' && item.estado !== 'error' && (
                <FontAwesome name="check" size={10} color="rgba(255,255,255,0.7)" />
              )}
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.messageWrapper, styles.otherMessageWrapper]}>
        {!!peerName && (
          <View style={styles.otherAvatar}>
            <Text style={styles.otherAvatarText}>{peerInitials}</Text>
          </View>
        )}
        <View style={styles.otherCol}>
          {!!peerName && (
            <Text style={styles.otherName} numberOfLines={1}>{peerName}</Text>
          )}
          <View style={[styles.bubble, styles.otherBubble]}>
            {imageUri ? (
              <TouchableOpacity onPress={() => setFullscreenImage(imageUri)} activeOpacity={0.85}>
                <Image source={{ uri: imageUri }} style={styles.messageImage} />
              </TouchableOpacity>
            ) : (
              <Text style={[styles.messageText, styles.otherMessageText]}>
                {typeof contenido === 'string' ? contenido : ''}
              </Text>
            )}
            <View style={[styles.metaRow, styles.otherMeta]}>
              <Text style={[styles.time, styles.otherTime]}>
                {new Date(item.timestamp || item.created_at || Date.now()).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              {item.estado === 'enviando' && <Text style={styles.statusSending}>enviando</Text>}
              {item.estado === 'error' && <Text style={styles.statusError}>error</Text>}
            </View>
          </View>
        </View>
      </View>
    );
  }, [currentUserId, extraerContenido, extraerImagen, peerName, peerInitials]);

  const feed = useMemo(() => {
    const out = [];
    let lastDay = "";
    mensajes.forEach((m) => {
      const iso = m.timestamp || m.created_at;
      const dk = iso ? new Date(iso).toDateString() : "";
      if (dk && dk !== lastDay) {
        lastDay = dk;
        out.push({ type: "divider", id: `div-${dk}`, label: dayLabel(iso) });
      }
      out.push(m);
    });
    return out;
  }, [mensajes]);

  const invertedFeed = useMemo(() => [...feed].reverse(), [feed]);

  // Auto-scroll al último mensaje (lista invertida: offset 0 = abajo)
  useEffect(() => {
    if (invertedFeed.length && flatListRef.current) {
      const t = setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: false }), 100);
      return () => clearTimeout(t);
    }
  }, [invertedFeed.length]);

  // Si las fuentes no están cargadas, mostrar un loader
  if (!fontsLoaded) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF5500" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!modalMode && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => onClose ? onClose() : navigation.goBack()}
          >
            <FontAwesome name="arrow-left" size={20} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              Chat con {comercioNombre || comercioInfo?.establecimiento_nombre || 'Comercio'}
            </Text>
            <Text style={styles.headerSubtitle}>
              Pedido #{pedidoId} {carreraId ? `- Arrendamiento #${carreraId}` : ''}
            </Text>
          </View>
        </View>
      )}

      {showHeader && (
        <View style={[styles.chatHeader, { paddingTop: Math.max(insets.top, 8) }]}>
          <View style={styles.avatarWrap}>
            {peerAvatar ? (
              <Image source={{ uri: peerAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarBox}>
                <Text style={styles.avatarInitial}>{peerInitials}</Text>
              </View>
            )}
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={styles.headerTitleLight} numberOfLines={1}>{peerName || "Comercio"}</Text>
              {!!peerName && <FontAwesome name="check-circle" size={12} color="#FF5500" />}
            </View>
            <View style={styles.subRow}>
              <Text style={styles.headerSubLight} numberOfLines={1}>Chat del pedido</Text>
              {!!pedidoId && (
                <View style={styles.orderBadge}>
                  <Text style={styles.orderBadgeText}>#{pedidoId}</Text>
                </View>
              )}
            </View>
          </View>
          {!!onClose && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Feather name="x" size={20} color="#0F172A" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Contenido del chat */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.contentFlex, showHeader && { paddingBottom: insets.bottom + manualOffset }]}>
          {cargando && mensajes.length === 0 ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#FF5500" />
              <Text style={styles.loaderText}>Cargando conversación...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => cargarMensajes()}
              >
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.chatListWrap}>
              <FlatList
                ref={flatListRef}
                inverted
                data={invertedFeed}
                renderItem={renderMensaje}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                contentContainerStyle={styles.mensajesList}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={11}
                maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <FontAwesome name="comments-o" size={50} color="#ccc" />
                    <Text style={styles.emptyText}>No hay mensajes aún</Text>
                    <Text style={styles.emptySubtext}>Envía un mensaje para comenzar la conversación</Text>
                  </View>
                }
              />
            </View>
          )}

          <View style={styles.quickReplies}>
            {quickReplies.map((q) => (
              <TouchableOpacity key={q.text} style={styles.quickReply} onPress={() => enviarMensaje(q.text)} activeOpacity={0.8}>
                <FontAwesome name={q.icon} size={12} color="#FF5500" />
                <Text style={styles.quickReplyText}>{q.text}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input para escribir mensajes */}
          <ChatInput
            tag="ChatRiderComercio"
            value={mensaje}
            onChangeText={setMensaje}
            onSend={handleSend}
            sending={enviando}
            onPickImage={handlePickImageAndSend}
            extraSendEnabled={!!chatImage}
            preview={chatImage && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: chatImage }} style={styles.imagePreviewThumb} />
                <TouchableOpacity onPress={() => setChatImage(null)} style={styles.removeImageBtn}>
                  <FontAwesome name="close" size={14} color="#64748B" />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </KeyboardAvoidingView>
      <AlertaModal
        visible={alertVisible}
        mensaje={alertData.message}
        tipo={alertData.type}
        onCerrar={() => setAlertVisible(false)}
        onPrimary={alertData.onPrimary}
        primaryLabel={alertData.primaryLabel}
      />
      <FullscreenImageViewer uri={fullscreenImage} onClose={() => setFullscreenImage(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  dayRow: {
    alignItems: "center",
    marginVertical: 8,
  },
  dayLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: "#94A3B8",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    color: '#666',
    fontFamily: 'Montserrat_400Regular',
  },
  header: {
    backgroundColor: '#FF5500',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight + 10 : 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  backButton: {
    padding: 10,
  },
  headerInfo: {
    marginLeft: 10,
    flex: 1,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  headerSubtitle: {
    color: '#FF5500',
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  chatContainer: {
    flex: 1,
  },
  contentFlex: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  avatarWrap: {
    position: "relative",
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    color: "#FF5500",
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitleLight: {
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    color: "#0F172A",
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  headerSubLight: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: "#64748B",
  },
  orderBadge: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  orderBadgeText: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    color: "#FF5500",
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  chatListWrap: {
    flex: 1,
  },
  mensajesList: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  messageWrapper: {
    maxWidth: '78%',
    marginVertical: 4,
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    maxWidth: "88%",
  },
  otherAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  otherAvatarText: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    color: "#64748B",
  },
  otherCol: {
    flex: 1,
  },
  otherName: {
    fontSize: 10,
    fontFamily: 'Montserrat_400Regular',
    color: "#94A3B8",
    marginLeft: 4,
    marginBottom: 2,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myBubble: {
    backgroundColor: '#FF5500',
    borderTopRightRadius: 6,
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderTopLeftRadius: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Montserrat_400Regular',
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  myMeta: {
    justifyContent: "flex-end",
  },
  otherMeta: {
    justifyContent: "flex-start",
  },
  time: {
    fontSize: 10,
    fontFamily: 'Montserrat_400Regular',
  },
  myTime: {
    color: 'rgba(255,255,255,0.75)',
  },
  otherTime: {
    color: '#94A3B8',
  },
  statusSending: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'Montserrat_400Regular',
  },
  statusError: {
    fontSize: 10,
    color: '#FF4757',
    fontFamily: 'Montserrat_400Regular',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 0 : -2,
  },
  imagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  imagePreviewThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  removeImageBtn: {
    marginLeft: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickReplies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  quickReply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  quickReplyText: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: '#334155',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    height: 300,
  },
  emptyText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  emptySubtext: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#ff4757',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#FF5500',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#FFF',
  }
});
