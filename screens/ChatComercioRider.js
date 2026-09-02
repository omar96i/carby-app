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
  Image,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants/url';
import { useNotification } from "../context/NotificationContext";
import AlertaModal from "../components/ErrorModal";

export default function ChatComercioRider({ pedidoId, conductorId, carreraId, conductorNombre, comercioId, tipo, onClose, modalMode = false }) {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  const flatListRef = useRef(null);
  const { notification } = useNotification();

  useEffect(() => {
    if (notification) cargarMensajes();
  }, [notification]);

  useEffect(() => {
    obtenerInfoUsuario();
    cargarMensajes();
  }, []);

  const obtenerInfoUsuario = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserInfo(user);
      }
    } catch (error) {
      console.error('Error obteniendo info usuario:', error);
    }
  };

  const cargarMensajes = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showAlert('No se encontró token de autenticación', "error");
        return;
      }
      const endpoint = `${BASE_URL}carrera-pedido-chat/messages/${pedidoId}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const messages = data.data || data.mensajes || data || [];
        setMensajes(messages);
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    } finally {
      setCargando(false);
    }
  };

  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim()) return;

    if (!carreraId || !pedidoId || !comercioId || !conductorId) {
      showAlert('Faltan datos necesarios para enviar el mensaje', "error");
      return;
    }

    setEnviando(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showAlert('No se encontró token de autenticación', "error");
        return;
      }

      const messageObject = { type: "text", content: nuevoMensaje.trim() };
      const escapedJson = JSON.stringify(messageObject).replace(/"/g, '\\"');
      const formattedMessage = `"${escapedJson}"`;

      const requestBody = {
        carrera_id: parseInt(carreraId),
        pedido_id: parseInt(pedidoId),
        negocio_id: parseInt(comercioId),
        message: formattedMessage,
      };

      const nuevoMensajeLocal = {
        id: `temp-${Date.now()}`,
        remitente_id: comercioId,
        destinatario_id: conductorId,
        mensaje: nuevoMensaje.trim(),
        remitente: userInfo,
        estado: 'sending',
        timestamp: new Date().toISOString(),
      };

      setMensajes(prev => [...prev, nuevoMensajeLocal]);
      setNuevoMensaje('');

      const response = await fetch(`${BASE_URL}carrera-pedido-chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = `Error HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
          if (errorData.errors) {
            const firstError = Object.values(errorData.errors)[0];
            errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
          }
        } catch (e) {}
        setMensajes(prev =>
          prev.map(msg =>
            msg.id === nuevoMensajeLocal.id ? { ...msg, estado: 'error' } : msg
          )
        );
        showAlert(errorMessage, "error");
        return;
      }

      setMensajes(prev =>
        prev.map(msg =>
          msg.id === nuevoMensajeLocal.id ? { ...msg, estado: 'sent' } : msg
        )
      );

      setTimeout(() => cargarMensajes(), 800);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      showAlert("No se pudo enviar el mensaje", "error");
    } finally {
      setEnviando(false);
    }
  };

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
    if (!result.cancelled) {
      const image = result.assets ? result.assets[0] : result;
      enviarImagen(image);
    }
  };

  const enviarImagen = async (image) => {
    if (!carreraId || !pedidoId || !comercioId) {
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

      const messageObject = { type: "image", content: "Imagen enviada" };
      const escapedJson = JSON.stringify(messageObject).replace(/"/g, '\\"');

      const formData = new FormData();
      formData.append("carrera_id", String(carreraId));
      formData.append("pedido_id", String(pedidoId));
      formData.append("negocio_id", String(comercioId));
      formData.append("message", `"${escapedJson}"`);
      formData.append("image", {
        uri: image.uri,
        name: "photo.jpg",
        type: "image/jpeg",
      });

      const nuevoMensajeLocal = {
        id: `temp-${Date.now()}`,
        remitente_id: comercioId,
        destinatario_id: conductorId,
        mensaje: 'Imagen',
        image: image.uri,
        remitente: userInfo,
        estado: 'sending',
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
          msg.id === nuevoMensajeLocal.id ? { ...msg, estado: 'sent' } : msg
        )
      );
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
      } catch (e) {}
    }
    return null;
  };

  const renderMensaje = ({ item }) => {
    const esMio = item.remitente_id === comercioId || item.negocio_id === comercioId;
    const contenido = extraerContenido(item);
    const imageUri = extraerImagen(item);

    return (
      <View style={[s.messageWrapper, esMio ? s.myMessageWrapper : s.otherMessageWrapper]}>
        <View style={[s.bubble, esMio ? s.myBubble : s.otherBubble]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={s.messageImage} />
          ) : (
            <Text style={[s.messageText, esMio ? s.myMessageText : s.otherMessageText]}>
              {typeof contenido === 'string' ? contenido : ''}
            </Text>
          )}
          <View style={s.metaRow}>
            <Text style={[s.time, esMio ? s.myTime : s.otherTime]}>
              {new Date(item.timestamp || item.created_at || Date.now()).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {item.estado === 'sending' && <Text style={s.statusSending}>enviando</Text>}
            {item.estado === 'error' && <Text style={s.statusError}>error</Text>}
            {esMio && item.estado !== 'sending' && item.estado !== 'error' && (
              <Feather name="check" size={10} color="rgba(255,255,255,0.75)" />
            )}
          </View>
        </View>
      </View>
    );
  };

  const quickReplies = ['Pedido listo', 'Estamos preparando el pedido', 'Gracias por tu servicio'];

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {!modalMode && (
          <View style={s.header}>
            <View style={s.headerIcon}>
              <Feather name="message-circle" size={18} color="#FFFFFF" />
            </View>
            <View style={s.headerCenter}>
              <Text style={s.headerTitle} numberOfLines={1}>
                {conductorNombre || 'Conductor'}
              </Text>
              <Text style={s.headerSub}>Chat del pedido</Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Feather name="x" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <View style={s.chatContainer}>
            {cargando ? (
              <View style={s.loadingContainer}>
                <ActivityIndicator size="large" color="#FF5500" />
                <Text style={s.loadingText}>Cargando mensajes anteriores...</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                style={s.messagesList}
                inverted
                data={[...mensajes].reverse()}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={renderMensaje}
                onRefresh={cargarMensajes}
                refreshing={cargando}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={s.messagesContent}
              />
            )}
          </View>

          {/* Quick replies */}
          <View style={s.quickReplies}>
            {quickReplies.map((q) => (
              <TouchableOpacity key={q} style={s.quickReply} onPress={() => setNuevoMensaje(q)} activeOpacity={0.8}>
                <Text style={s.quickReplyText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.inputContainer}>
            <TouchableOpacity style={s.iconButton} onPress={handlePickImageAndSend} activeOpacity={0.8}>
              <Feather name="camera" size={22} color="#64748B" />
            </TouchableOpacity>
            <TextInput
              style={s.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#94A3B8"
              value={nuevoMensaje}
              onChangeText={setNuevoMensaje}
              editable={!enviando}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[s.sendButton, (!nuevoMensaje.trim() || enviando) && s.sendButtonDisabled]}
              onPress={enviarMensaje}
              disabled={enviando || !nuevoMensaje.trim()}
              activeOpacity={0.8}
            >
              {enviando ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="send" size={18} color="#FFFFFF" />
              )}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5500',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 14 : 14,
    paddingBottom: 14,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    fontWeight: 'bold',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
    marginTop: 2,
  },
  chatContainer: { flex: 1 },
  messagesList: { flex: 1 },
  messagesContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
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
  myMessageWrapper: { alignSelf: 'flex-end' },
  otherMessageWrapper: { alignSelf: 'flex-start' },
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
  myMessageText: { color: '#FFFFFF' },
  otherMessageText: { color: '#0F172A' },
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
  myTime: { color: 'rgba(255,255,255,0.75)' },
  otherTime: { color: '#94A3B8' },
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
  quickReplies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
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
  sendButtonDisabled: { backgroundColor: '#CBD5E1' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    marginBottom: Platform.OS === 'ios' ? 0 : -2,
  },
});
