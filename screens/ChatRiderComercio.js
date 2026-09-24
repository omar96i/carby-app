import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Image
} from 'react-native';
import { useFonts, Montserrat_400Regular, Montserrat_700Bold, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { BASE_URL } from "../constants/url";
import { useNotification } from "../context/NotificationContext";
import AlertaModal from "../components/ErrorModal";
import FullscreenImageViewer from "../components/usuario/pedidos/FullscreenImageViewer";
import { chatLog } from "../utils/chatDebug";

export default function ChatRiderComercio({
  route,
  pedidoId: propPedidoId,
  carreraId: propCarreraId,
  comercioId: propComercioId,
  comercioNombre: propComercioNombre,
  riderId: propRiderId,
  tipo: propTipo,
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

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };
  const flatListRef = useRef(null);

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
  const inputRef = useRef(null);
  useEffect(() => {
    chatLog("ChatRiderComercio", "mount", { pedidoId, carreraId });
  }, []);
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      chatLog("ChatRiderComercio", "keyboardHide-blur");
      inputRef.current?.blur();
    });
    return () => sub.remove();
  }, []);
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

  // Función para enviar un mensaje
  const enviarMensaje = async () => {
    if (!mensaje.trim()) return;

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
        content: mensaje.trim(),
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
        mensaje: mensaje.trim(),
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
  const quickReplies = ['Ya llegué al comercio', '¿Pedido listo?', 'Voy en camino'];

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
    if (!result.canceled && !result.cancelled) {
      const image = result.assets ? result.assets[0] : result;
      enviarImagen(image);
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

  const extraerContenido = (item) => {
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
  };

  const extraerImagen = (item) => {
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
  };

  // Renderizar un mensaje individual
  const renderMensaje = ({ item }) => {
    const esDelRider = item.remitente_id === currentUserId || item.conductor_id === currentUserId;
    const contenido = extraerContenido(item);
    const imageUri = extraerImagen(item);

    console.log('🔍 Analizando mensaje:', {
      messageId: item.id,
      remitente_id: item.remitente_id,
      conductor_id: item.conductor_id,
      currentUserId: currentUserId,
      esDelRider,
      contenido,
      imageUri,
    });

    return (
      <View style={[styles.messageWrapper, esDelRider ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
        <View style={[styles.bubble, esDelRider ? styles.myBubble : styles.otherBubble]}>
          {imageUri ? (
            <TouchableOpacity onPress={() => setFullscreenImage(imageUri)} activeOpacity={0.85}>
              <Image source={{ uri: imageUri }} style={styles.messageImage} />
            </TouchableOpacity>
          ) : (
            <Text style={[styles.messageText, esDelRider ? styles.myMessageText : styles.otherMessageText]}>
              {typeof contenido === 'string' ? contenido : ''}
            </Text>
          )}
          <View style={styles.metaRow}>
            <Text style={[styles.time, esDelRider ? styles.myTime : styles.otherTime]}>
              {new Date(item.timestamp || item.created_at || Date.now()).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {item.estado === 'enviando' && <Text style={styles.statusSending}>enviando</Text>}
            {item.estado === 'error' && <Text style={styles.statusError}>error</Text>}
            {esDelRider && item.estado !== 'enviando' && item.estado !== 'error' && (
              <FontAwesome name="check" size={10} color="rgba(255,255,255,0.7)" />
            )}
          </View>
        </View>
      </View>
    );
  };

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

      {/* Contenido del chat */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={{ flex: 1 }}>
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
                data={[...mensajes].reverse()}
                renderItem={renderMensaje}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                contentContainerStyle={styles.mensajesList}
                keyboardShouldPersistTaps="handled"
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
              <TouchableOpacity key={q} style={styles.quickReply} onPress={() => setMensaje(q)} activeOpacity={0.8}>
                <Text style={styles.quickReplyText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input para escribir mensajes */}
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.iconBtn} onPress={handlePickImageAndSend} activeOpacity={0.8}>
              <FontAwesome name="camera" size={20} color="#64748B" />
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#999"
              value={mensaje}
              onChangeText={(t) => {
                chatLog("ChatRiderComercio", "change", { len: t.length });
                setMensaje(t);
              }}
              onFocus={() => chatLog("ChatRiderComercio", "focus", { len: mensaje.length })}
              onBlur={() => chatLog("ChatRiderComercio", "blur", { len: mensaje.length })}
              onSelectionChange={(e) => chatLog("ChatRiderComercio", "selection", e.nativeEvent.selection)}
              onPressIn={() => chatLog("ChatRiderComercio", "pressIn")}
              onTouchStart={() => chatLog("ChatRiderComercio", "touchStart")}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!mensaje.trim() || enviando) && styles.sendButtonDisabled
              ]}
              onPress={enviarMensaje}
              disabled={!mensaje.trim() || enviando}
            >
              {enviando ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <FontAwesome name="send" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
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
    backgroundColor: '#f8f8f8',
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
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myBubble: {
    backgroundColor: '#FF5500',
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 6,
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
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    color: '#0F172A',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF5500',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 0 : -2,
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
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  quickReplies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  quickReply: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  quickReplyText: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: '#0F172A',
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
