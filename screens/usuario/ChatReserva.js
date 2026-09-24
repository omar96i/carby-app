import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Image,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../../constants/url';
import { useNotification } from "../../context/NotificationContext";
import AlertaModal from "../../components/ErrorModal";
import FullscreenImageViewer from "../../components/usuario/pedidos/FullscreenImageViewer";
import { chatLog } from "../../utils/chatDebug";

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL.toString().replace("/api", "")}/storage/${path}`;
};

export default function ChatReserva({ reservaId: propReservaId, perfilNombre: propPerfilNombre, perfilFoto: propPerfilFoto, userPerfilId: propUserPerfilId, chatTitle: propChatTitle, chatAvatar: propChatAvatar, quickReplies: propQuickReplies, onClose, modalMode = false }) {
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = route?.params || {};

  const reservaId = propReservaId ?? routeParams.reservaId;
  const perfilNombre = propPerfilNombre ?? routeParams.perfilNombre;
  const perfilFoto = propPerfilFoto ?? routeParams.perfilFoto;
  const senderPerfilId = propUserPerfilId ?? routeParams.userPerfilId ?? routeParams.user_perfil_id ?? null;
  const isPerfilMode = senderPerfilId != null;
  const chatTitle = propChatTitle ?? routeParams.chatTitle ?? perfilNombre;
  const chatAvatar = propChatAvatar ?? routeParams.chatAvatar ?? perfilFoto;

  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const { notification } = useNotification();

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      chatLog("ChatReserva", "keyboardHide-blur");
      inputRef.current?.blur();
    });
    return () => sub.remove();
  }, []);

  const cargarMensajes = useCallback(async (mostrarCargando = true) => {
    if (!reservaId) return;
    try {
      if (mostrarCargando) setCargando(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        if (mostrarCargando) showAlert('No se encontró token de autenticación', "error");
        return;
      }
      const response = await fetch(`${BASE_URL}reserva-chat/messages/${reservaId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMensajes(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando mensajes de reserva:', error);
    } finally {
      setCargando(false);
    }
  }, [reservaId]);

  useEffect(() => {
    chatLog("ChatReserva", "mount", { reservaId });
    if (notification?.request?.content?.data?.tipo === "chat_reserva") {
      cargarMensajes(false);
    }
  }, [notification, cargarMensajes]);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        try {
          const userData = await AsyncStorage.getItem('userData');
          if (userData) {
            const user = JSON.parse(userData);
            setCurrentUserId(user.id);
          } else {
            const userId = await AsyncStorage.getItem('userId');
            if (userId) setCurrentUserId(Number(userId) || userId);
          }
        } catch (e) {}
      };
      init();
      cargarMensajes();
      const intervalId = setInterval(() => cargarMensajes(false), 10000);
      return () => clearInterval(intervalId);
    }, [cargarMensajes])
  );

  if (!reservaId) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingContainer}>
          <Text style={s.loadingText}>No se encontró la reserva</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => onClose ? onClose() : navigation.goBack()}>
            <Text style={s.retryText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const resolveSenderId = async () => {
    if (isPerfilMode) return senderPerfilId;
    if (currentUserId) return currentUserId;
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const senderId = storedUserData ? JSON.parse(storedUserData)?.id : await AsyncStorage.getItem('userId');
      if (senderId) setCurrentUserId(senderId);
      return senderId;
    } catch (e) {
      return null;
    }
  };

  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim()) return;

    const senderId = await resolveSenderId();
    if (!senderId) {
      showAlert('No se encontró tu información de usuario', "error");
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

      const requestBody = isPerfilMode
        ? {
            reserva_id: parseInt(reservaId),
            user_perfil_id: parseInt(senderId),
            message: formattedMessage,
          }
        : {
            reserva_id: parseInt(reservaId),
            usuario_id: parseInt(senderId),
            message: formattedMessage,
          };

      const nuevoMensajeLocal = {
        id: `temp-${Date.now()}`,
        reserva_id: reservaId,
        usuario_id: isPerfilMode ? null : senderId,
        user_perfil_id: isPerfilMode ? senderId : null,
        message: formattedMessage,
        created_at: new Date().toISOString(),
        estado: 'sending',
      };

      setMensajes(prev => [...prev, nuevoMensajeLocal]);
      setNuevoMensaje('');

      const response = await fetch(`${BASE_URL}reserva-chat/send`, {
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

      setTimeout(() => cargarMensajes(false), 800);
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
    if (!result.canceled && !result.cancelled) {
      const image = result.assets ? result.assets[0] : result;
      enviarImagen(image);
    }
  };

  const enviarImagen = async (image) => {
    const senderId = await resolveSenderId();
    if (!senderId) {
      showAlert('No se encontró tu información de usuario', "error");
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
      formData.append("reserva_id", String(reservaId));
      if (isPerfilMode) {
        formData.append("user_perfil_id", String(senderId));
      } else {
        formData.append("usuario_id", String(senderId));
      }
      formData.append("message", `"${escapedJson}"`);
      formData.append("image", {
        uri: image.uri,
        name: "photo.jpg",
        type: "image/jpeg",
      });

      const nuevoMensajeLocal = {
        id: `temp-${Date.now()}`,
        reserva_id: reservaId,
        usuario_id: isPerfilMode ? null : senderId,
        user_perfil_id: isPerfilMode ? senderId : null,
        message: `"${escapedJson}"`,
        image: image.uri,
        created_at: new Date().toISOString(),
        estado: 'sending',
      };

      setMensajes(prev => [...prev, nuevoMensajeLocal]);

      const response = await fetch(`${BASE_URL}reserva-chat/send`, {
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

      setTimeout(() => cargarMensajes(false), 800);
    } catch (error) {
      console.error('Error enviando imagen:', error);
      showAlert("No se pudo enviar la imagen", "error");
    } finally {
      setEnviando(false);
    }
  };

  const extraerContenido = (item) => {
    if (item.image && item.id?.toString().startsWith('temp-')) return item.mensaje || 'Imagen';
    if (item.message && typeof item.message === 'string') {
      try {
        const parsed = JSON.parse(item.message);
        if (parsed.content) return parsed.content;
      } catch (e) {
        try {
          const cleaned = item.message.replace(/^"|"$/g, '').replace(/\\"/g, '"');
          const parsed = JSON.parse(cleaned);
          if (parsed.content) return parsed.content;
        } catch (e2) {
          return item.message || '';
        }
      }
    }
    return '';
  };

  const extraerImagen = (item) => {
    if (item.image) return item.image;
    if (item.message && typeof item.message === 'string') {
      const tryParse = (raw) => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.type === 'file' || parsed.type === 'image') {
            return getImageUrl(parsed.content);
          }
        } catch (e) {}
        return null;
      };
      return tryParse(item.message)
        ?? tryParse(item.message.replace(/^"|"$/g, '').replace(/\\"/g, '"'));
    }
    return null;
  };

  const renderMensaje = ({ item }) => {
    const esMio = isPerfilMode
      ? (item.user_perfil_id != null
        && String(item.user_perfil_id) === String(senderPerfilId))
      : (item.usuario_id != null
        && currentUserId != null
        && String(item.usuario_id) === String(currentUserId));
    const contenido = extraerContenido(item);
    const imageUri = extraerImagen(item);

    return (
      <View style={[s.messageWrapper, esMio ? s.myMessageWrapper : s.otherMessageWrapper]}>
        <View style={[s.bubble, esMio ? s.myBubble : s.otherBubble]}>
          {imageUri ? (
            <TouchableOpacity onPress={() => setFullscreenImage(imageUri)} activeOpacity={0.85}>
              <Image source={{ uri: imageUri }} style={s.messageImage} />
            </TouchableOpacity>
          ) : (
            <Text style={[s.messageText, esMio ? s.myMessageText : s.otherMessageText]}>
              {typeof contenido === 'string' ? contenido : ''}
            </Text>
          )}
          <View style={s.metaRow}>
            <Text style={[s.time, esMio ? s.myTime : s.otherTime]}>
              {new Date(item.created_at || Date.now()).toLocaleTimeString('es-ES', {
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

  const quickReplies = propQuickReplies ?? (isPerfilMode
    ? ['Hola, tu reserva fue aceptada', 'Te esperamos a la hora acordada', 'Gracias por preferirnos']
    : ['Hola, ¿puedo ir antes al servicio?', '¿El servicio es a domicilio o en el local?', 'Gracias']);

  const avatarUri = getImageUrl(chatAvatar);

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {!modalMode && (
          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} onPress={() => onClose ? onClose() : navigation.goBack()} activeOpacity={0.7}>
              <Feather name="arrow-left" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.headerAvatar} />
            ) : (
              <View style={s.headerIcon}>
                <Feather name="message-circle" size={18} color="#FFFFFF" />
              </View>
            )}
            <View style={s.headerCenter}>
              <Text style={s.headerTitle} numberOfLines={1}>
                {chatTitle || 'Perfil'}
              </Text>
              <Text style={s.headerSub}>Reserva #{reservaId}</Text>
            </View>
            {modalMode || onClose ? (
              <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Feather name="x" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
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
                onRefresh={() => cargarMensajes()}
                refreshing={cargando}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={s.messagesContent}
                ListEmptyComponent={
                  <View style={s.emptyContainer}>
                    <Feather name="message-circle" size={44} color="#CBD5E1" />
                    <Text style={s.emptyText}>No hay mensajes aún</Text>
                    <Text style={s.emptySubtext}>Escríbele al perfil para coordinar tu reserva</Text>
                  </View>
                }
              />
            )}
          </View>

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
              ref={inputRef}
              style={s.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#94A3B8"
              value={nuevoMensaje}
              onChangeText={(t) => {
                chatLog("ChatReserva", "change", { len: t.length });
                setNuevoMensaje(t);
              }}
              onFocus={() => chatLog("ChatReserva", "focus", { len: nuevoMensaje.length })}
              onBlur={() => chatLog("ChatReserva", "blur", { len: nuevoMensaje.length })}
              onSelectionChange={(e) => chatLog("ChatReserva", "selection", e.nativeEvent.selection)}
              onPressIn={() => chatLog("ChatReserva", "pressIn")}
              onTouchStart={() => chatLog("ChatReserva", "touchStart")}
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
        <FullscreenImageViewer uri={fullscreenImage} onClose={() => setFullscreenImage(null)} />
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
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
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
    marginTop: 2,
  },
  chatContainer: { flex: 1 },
  messagesList: { flex: 1 },
  messagesContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexGrow: 1,
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
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#FF5500',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: { color: '#FFF' },
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
  },
  myTime: { color: 'rgba(255,255,255,0.75)' },
  otherTime: { color: '#94A3B8' },
  statusSending: {
    fontSize: 10,
    color: '#94A3B8',
  },
  statusError: {
    fontSize: 10,
    color: '#FF4757',
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
