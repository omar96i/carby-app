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
  Platform,
  ActivityIndicator,
  Image,
  Alert
} from 'react-native';
import { useFonts, Montserrat_400Regular, Montserrat_700Bold, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { BASE_URL } from "../constants/url";
import { useNotification } from "../context/NotificationContext";

export default function ChatRiderComercio({ route }) {
  const { pedidoId, carreraId, comercioId, comercioNombre, riderId, tipo } = route.params;
  const navigation = useNavigation();

  console.log("🚀 ChatRiderComercio iniciado con params:", route.params);
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
  const flatListRef = useRef(null);

  const { expoPushToken, notification } = useNotification();


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
  const cargarMensajes = async (mostrarCargando = true) => {
    try {
      if (mostrarCargando) {
        setCargando(true);
      }

      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        setError('No se encontró token de autenticación');
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
        throw new Error(`Error al cargar mensajes: ${response.status}`);
      }

      const data = await response.json();

      // Los mensajes pueden estar en data.data, data.mensajes, o directamente en data
      const messages = data.data || data.mensajes || data || [];
      setMensajes(messages);
      console.log('Mensajes cargados:', messages.length);

    } catch (error) {
      console.error('Error al cargar mensajes:', error);
      setError('Error al cargar mensajes');
    } finally {
      setCargando(false);
    }
  };

  // Función para enviar un mensaje
  const enviarMensaje = async () => {
    if (!mensaje.trim()) return;

    // Validar que tengamos todos los parámetros necesarios
    if (!carreraId || !pedidoId || !comercioId) {
      console.error('❌ Faltan parámetros obligatorios:');
      console.log('carreraId:', carreraId);
      console.log('pedidoId:', pedidoId);
      console.log('comercioId:', comercioId);
      Alert.alert('Error', 'Faltan datos necesarios para enviar el mensaje');
      return;
    }

    setEnviando(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'No se encontró token de autenticación');
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
        conductor_id: parseInt(riderId), // El rider actual es quien envía
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

        Alert.alert('Error', errorMessage);
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

      // Recargar mensajes para asegurar sincronización
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

      Alert.alert('Error', errorMessage);
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

  // Renderizar un mensaje individual
  const renderMensaje = ({ item }) => {
    // Determinar si el mensaje es del rider (usuario actual) o del comercio
    // Los mensajes del rider van a la derecha, los del comercio a la izquierda
    // Verificamos tanto remitente_id como conductor_id para mayor compatibilidad
    const esDelRider = item.remitente_id === currentUserId || item.conductor_id === currentUserId;

    console.log('🔍 Analizando mensaje:', {
      messageId: item.id,
      remitente_id: item.remitente_id,
      conductor_id: item.conductor_id,
      currentUserId: currentUserId,
      esDelRider: esDelRider,
      contenido: item.mensaje || item.message
    });

    // Extraer el contenido del mensaje de acuerdo con la estructura
    let contenido = item.mensaje;

    // Si el mensaje viene en formato JSON string, intentar parsearlo
    if (item.message && typeof item.message === 'string') {
      try {
        const parsedMessage = JSON.parse(item.message);
        if (parsedMessage.content) {
          contenido = parsedMessage.content;
        }
      } catch (e) {
        try {
          const cleanedString = item.message.replace(/^"|"$/g, '').replace(/\\"/g, '"');
          const parsedMessage = JSON.parse(cleanedString);
          if (parsedMessage.content) {
            contenido = parsedMessage.content;
          }
        } catch (e2) {
          console.error('Error parsing message:', e2);
          contenido = item.message || item.mensaje || 'Mensaje no disponible';
        }
      }
    }

    return (
      <View style={[
        styles.mensajeContainer,
        esDelRider ? styles.mensajeEnviado : styles.mensajeRecibido
      ]}>
        <View style={[
          styles.burbujaMensaje,
          esDelRider ? styles.burbujaEnviada : styles.burbujaRecibida
        ]}>
          <Text style={[
            styles.mensajeTexto,
            esDelRider ? styles.mensajeTextoEnviado : styles.mensajeTextoRecibido
          ]}>
            {contenido}
          </Text>
          <Text style={[
            styles.mensajeHora,
            esDelRider ? styles.mensajeHoraEnviada : styles.mensajeHoraRecibida
          ]}>
            {new Date(item.timestamp || item.created_at || Date.now()).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
        {item.estado === 'enviando' && (
          <FontAwesome name="clock-o" size={12} color="#999" style={styles.estadoIcon} />
        )}
        {item.estado === 'error' && (
          <FontAwesome name="exclamation-circle" size={12} color="#ff4444" style={styles.estadoIcon} />
        )}
      </View>
    );
  };

  // Si las fuentes no están cargadas, mostrar un loader
  if (!fontsLoaded) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#fa6205" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header del chat */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            Chat con {comercioNombre || comercioInfo?.establecimiento_nombre || 'Comercio'}
          </Text>
          <Text style={styles.headerSubtitle}>
            Pedido #{pedidoId} {carreraId ? `- Carrera #${carreraId}` : ''}
          </Text>
        </View>
      </View>

      {/* Contenido del chat */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {cargando && mensajes.length === 0 ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#fa6205" />
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
          <FlatList
            ref={flatListRef}
            data={mensajes}
            renderItem={renderMensaje}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.mensajesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FontAwesome name="comments-o" size={50} color="#ccc" />
                <Text style={styles.emptyText}>No hay mensajes aún</Text>
                <Text style={styles.emptySubtext}>Envía un mensaje para comenzar la conversación</Text>
              </View>
            }
          />
        )}

        {/* Input para escribir mensajes */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#999"
            value={mensaje}
            onChangeText={setMensaje}
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
      </KeyboardAvoidingView>
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
    backgroundColor: '#fa6205',
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
    color: '#fa6205',
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  chatContainer: {
    flex: 1,
  },
  mensajesList: {
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  mensajeContainer: {
    marginBottom: 10,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  mensajeEnviado: {
    alignSelf: 'flex-end', // Mensajes del rider a la derecha
  },
  mensajeRecibido: {
    alignSelf: 'flex-start', // Mensajes del comercio a la izquierda
  },
  burbujaMensaje: {
    borderRadius: 12,
    padding: 10,
    minWidth: 100,
  },
  burbujaEnviada: {
    backgroundColor: '#fa6205', // Verde para mensajes del rider
  },
  burbujaRecibida: {
    backgroundColor: '#fff', // Blanco para mensajes del comercio
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mensajeTexto: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  mensajeTextoEnviado: {
    color: '#FFF',
  },
  mensajeTextoRecibido: {
    color: '#333',
  },
  mensajeHora: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  mensajeHoraEnviada: {
    color: 'rgba(255,255,255,0.7)',
  },
  mensajeHoraRecibida: {
    color: '#777',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#fa6205',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  estadoIcon: {
    marginTop: 2,
    alignSelf: 'flex-end',
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
    backgroundColor: '#fa6205',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#FFF',
  }
});
