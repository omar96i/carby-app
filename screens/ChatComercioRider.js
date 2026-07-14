import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants/url';
import { useNotification } from "../context/NotificationContext";

export default function ChatComercioRider({ route, navigation }) {
  const { pedidoId, conductorId, carreraId, conductorNombre, comercioId, tipo } = route.params;
  console.log('ChatComercioRider params:', route.params);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const flatListRef = useRef(null);


  const { expoPushToken, notification } = useNotification();


  useEffect(() => {
    if (notification) {
      cargarMensajes()
    }
  }, [notification]);


  useEffect(() => {
    obtenerInfoUsuario();
    cargarMensajes();

    // Configurar navegación
    navigation.setOptions({
      title: `Chat - ${conductorNombre}`,
      headerStyle: {
        backgroundColor: '#25D366',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    });
  }, []);

  const obtenerInfoUsuario = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserInfo(user);
        console.log('ℹ️ Info usuario cargada:', user);
      } else {
        console.log('⚠️ No se encontró userData en AsyncStorage');
      }
    } catch (error) {
      console.error('❌ Error obteniendo info usuario:', error);
    }
  };

  const cargarMensajes = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'No se encontró token de autenticación');
        return;
      }

      // Endpoint para obtener mensajes del chat usando pedidoId
      const endpoint = `${BASE_URL}carrera-pedido-chat/messages/${pedidoId}`;

      console.log('Cargando mensajes desde:', endpoint);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Datos de mensajes recibidos:', data);
        // Los mensajes pueden estar en data.data, data.mensajes, o directamente en data
        const messages = data.data || data.mensajes || data || [];
        setMensajes(messages);
        console.log('Mensajes cargados:', messages.length);
      } else {
        console.log('No hay mensajes previos o error al cargar');
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    } finally {
      setCargando(false);
    }
  };

  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim()) return;

    // Validar que tengamos todos los parámetros necesarios
    if (!carreraId || !pedidoId || !comercioId || !conductorId) {
      console.error('❌ Faltan parámetros obligatorios:');
      console.log('carreraId:', carreraId);
      console.log('pedidoId:', pedidoId);
      console.log('comercioId:', comercioId);
      console.log('conductorId:', conductorId);
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
        content: nuevoMensaje.trim(),
      };

      // Usar el mismo formato que funciona en PedidoDetalle.js
      const escapedJson = JSON.stringify(messageObject).replace(/"/g, '\\"');
      const formattedMessage = `"${escapedJson}"`;

      console.log('messageObject:', messageObject);
      console.log('escapedJson:', escapedJson);
      console.log('formattedMessage:', formattedMessage);

      // Preparar el cuerpo de la solicitud con la nueva estructura
      const requestBody = {
        carrera_id: parseInt(carreraId), // Asegurar que sea número
        pedido_id: parseInt(pedidoId),   // Asegurar que sea número
        negocio_id: parseInt(comercioId), // Asegurar que sea número
        //conductor_id: parseInt(conductorId), // Asegurar que sea número
        message: formattedMessage, // Usar el formato que funciona
      };

      // Console logs para debugging
      console.log('=== ENVIANDO MENSAJE DE CHAT ===');
      console.log('URL:', `${BASE_URL}carrera-pedido-chat/send`);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      console.log('Token existe:', !!token);
      console.log('carreraId:', carreraId);
      console.log('conductorId:', conductorId);
      console.log('pedidoId:', pedidoId);
      console.log('comercioId:', comercioId);
      console.log('Request body completo:', requestBody);

      // Agregar mensaje localmente primero
      const nuevoMensajeLocal = {
        id: Date.now(),
        remitente_id: comercioId,
        destinatario_id: conductorId,
        mensaje: nuevoMensaje.trim(),
        remitente: userInfo,
        estado: 'enviando',
        timestamp: new Date().toISOString(),
      };

      setMensajes(prev => [...prev, nuevoMensajeLocal]);
      setNuevoMensaje('');

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
      // Console log para ver la respuesta del servidor
      console.log('=== RESPUESTA DEL SERVIDOR ===');
      console.log('Status:', response.status);
      console.log('Status text:', response.statusText);
      console.log('Response body:', responseText);

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

      let responseData;

      try {
        // Intentar parsear la respuesta como JSON
        responseData = JSON.parse(responseText);
        console.log('Parsed response data:', responseData);
      } catch (e) {
        console.error('Error parsing response:', e);
        // Si no es JSON válido pero la respuesta es OK, asumir éxito
        responseData = { success: true };
      }

      console.log('✅ Mensaje enviado exitosamente');
      // Actualizar mensaje local con datos del servidor si los hay
      setMensajes(prev =>
        prev.map(msg =>
          msg.id === nuevoMensajeLocal.id
            ? { ...nuevoMensajeLocal, estado: 'enviado', ...responseData.data }
            : msg
        )
      );

      // Limpiar input
      setNuevoMensaje('');

      // Recargar mensajes para asegurar sincronización
      setTimeout(() => {
        cargarMensajes();
      }, 1000);
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      console.error('Error completo:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);

      // Marcar mensaje local como error si no se marcó antes
      setMensajes(prev =>
        prev.map(msg =>
          msg.id === nuevoMensajeLocal.id
            ? { ...msg, estado: 'error' }
            : msg
        )
      );

      let errorMessage = "No se pudo enviar el mensaje";

      // Si es un error de red
      if (error.message.includes('Network request failed') ||
        error.message.includes('Failed to fetch')) {
        errorMessage = "Error de conexión. Verifica tu internet.";
      } else if (error.message.includes('timeout')) {
        errorMessage = "La solicitud tardó demasiado. Inténtalo de nuevo.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      console.log('🔄 Finalizando envío de mensaje');
      setEnviando(false);
    }
  };

  const renderMensaje = ({ item }) => {
    const esMio = item.remitente_id === comercioId || item.negocio_id === comercioId;

    // Extraer el contenido del mensaje de acuerdo con la estructura
    let contenido = item.mensaje;

    // Si el mensaje viene en formato JSON string, intentar parsearlo
    if (item.message && typeof item.message === 'string') {
      try {
        // Intentar parsear directamente
        const parsedMessage = JSON.parse(item.message);
        if (parsedMessage.content) {
          contenido = parsedMessage.content;
        }
      } catch (e) {
        // Si falla, puede ser porque está doblemente escapado
        try {
          // Eliminar comillas externas y escapados
          const cleanedString = item.message.replace(/^"|"$/g, '').replace(/\\"/g, '"');
          const parsedMessage = JSON.parse(cleanedString);
          if (parsedMessage.content) {
            contenido = parsedMessage.content;
          }
        } catch (e2) {
          console.error('Error parsing message:', e2);
          // Usar el mensaje tal cual si no se puede parsear
          contenido = item.message || item.mensaje || 'Mensaje no disponible';
        }
      }
    }

    return (
      <View style={[
        styles.mensajeContainer,
        esMio ? styles.mensajeMio : styles.mensajeOtro
      ]}>
        <View style={[
          styles.burbujaMensaje,
          esMio ? styles.burbujaMia : styles.burbujaOtra
        ]}>
          <Text style={[
            styles.textoMensaje,
            esMio ? styles.textoMio : styles.textoOtro
          ]}>
            {contenido}
          </Text>
          <Text style={[
            styles.horaMensaje,
            esMio ? styles.horaMia : styles.horaOtra
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header con botón de volver */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.botonVolver}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.infoPedido}>
            <Text style={styles.textoPedido}>Pedido #{pedidoId}</Text>
            <Text style={styles.textoRider}>{conductorNombre}</Text>
          </View>

          <View style={styles.espaciador} />
        </View>

        {/* Lista de mensajes */}
        <FlatList
          ref={flatListRef}
          data={mensajes}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderMensaje}
          style={styles.listaMensajes}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          onLayout={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.sinMensajes}>
              <FontAwesome name="comments" size={50} color="#ccc" />
              <Text style={styles.textoSinMensajes}>
                {cargando ? 'Cargando mensajes...' : 'Inicia la conversación con el rider'}
              </Text>
            </View>
          }
        />

        {/* Input para escribir mensaje */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={nuevoMensaje}
            onChangeText={setNuevoMensaje}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.botonEnviar, (!nuevoMensaje.trim() || enviando) && styles.botonDeshabilitado]}
            onPress={enviarMensaje}
            disabled={!nuevoMensaje.trim() || enviando}
          >
            <FontAwesome
              name={enviando ? "clock-o" : "send"}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 40,
    paddingHorizontal: 15,

  },
  botonVolver: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoPedido: {
    flex: 1,
    alignItems: 'center',
  },
  espaciador: {
    width: 40,
  },
  textoPedido: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  textoRider: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  listaMensajes: {
    flex: 1,
    padding: 10,
  },
  sinMensajes: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  textoSinMensajes: {
    marginTop: 15,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  mensajeContainer: {
    marginVertical: 2,
    maxWidth: '80%',
  },
  mensajeMio: {
    alignSelf: 'flex-end',
  },
  mensajeOtro: {
    alignSelf: 'flex-start',
  },
  burbujaMensaje: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '100%',
  },
  burbujaMia: {
    backgroundColor: '#25D366',
  },
  burbujaOtra: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textoMensaje: {
    fontSize: 16,
    lineHeight: 20,
  },
  textoMio: {
    color: '#fff',
  },
  textoOtro: {
    color: '#333',
  },
  horaMensaje: {
    fontSize: 12,
    marginTop: 4,
  },
  horaMia: {
    color: 'rgba(255,255,255,0.7)',
    alignSelf: 'flex-end',
  },
  horaOtra: {
    color: '#999',
    alignSelf: 'flex-end',
  },
  estadoIcon: {
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  botonEnviar: {
    backgroundColor: '#25D366',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonDeshabilitado: {
    backgroundColor: '#ccc',
  },
});
