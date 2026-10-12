import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../../constants/url';
import { useNotification } from "../../context/NotificationContext";
import AlertaModal from "../../components/ErrorModal";
import FullscreenImageViewer from "../../components/usuario/pedidos/FullscreenImageViewer";
import ChatInput from "../../components/ChatInput";

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

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL.toString().replace("/api", "")}/storage/${path}`;
};

export default function ChatReserva({ reservaId: propReservaId, perfilNombre: propPerfilNombre, perfilFoto: propPerfilFoto, userPerfilId: propUserPerfilId, chatTitle: propChatTitle, chatAvatar: propChatAvatar, peerName: propPeerName, peerAvatar: propPeerAvatar, showHeader = false, quickReplies: propQuickReplies, onClose, modalMode = false }) {
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
  const peerName = propPeerName ?? chatTitle;
  const peerAvatar = getImageUrl(propPeerAvatar ?? chatAvatar);

  const peerInitials = useMemo(() => {
    const parts = String(peerName || "?").trim().split(/\s+/);
    return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
  }, [peerName]);

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
  const [chatImage, setChatImage] = useState(null);
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

  const enviarMensaje = async (textOverride) => {
    const texto = textOverride || nuevoMensaje;
    if (!texto.trim()) return;

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

      const messageObject = { type: "text", content: texto.trim() };
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

  const handlePickImage = async () => {
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
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    setChatImage(asset.uri);
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

  // Renderizar un mensaje individual (memoizado: no se recrea al escribir)
  const renderMensaje = useCallback(({ item }) => {
    if (item.type === "divider") {
      return (
        <View style={s.dayRow}>
          <Text style={s.dayLabel}>{item.label}</Text>
        </View>
      );
    }
    const esMio = isPerfilMode
      ? (item.user_perfil_id != null
        && String(item.user_perfil_id) === String(senderPerfilId))
      : (item.usuario_id != null
        && currentUserId != null
        && String(item.usuario_id) === String(currentUserId));
    const contenido = extraerContenido(item);
    const imageUri = extraerImagen(item);

    if (esMio) {
      return (
        <View style={[s.messageWrapper, s.myMessageWrapper]}>
          <View style={[s.bubble, s.myBubble]}>
            {imageUri ? (
              <TouchableOpacity onPress={() => setFullscreenImage(imageUri)} activeOpacity={0.85}>
                <Image source={{ uri: imageUri }} style={s.messageImage} />
              </TouchableOpacity>
            ) : (
              <Text style={[s.messageText, s.myMessageText]}>
                {typeof contenido === 'string' ? contenido : ''}
              </Text>
            )}
            <View style={[s.metaRow, s.myMeta]}>
              <Text style={[s.time, s.myTime]}>
                {new Date(item.created_at || Date.now()).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              {item.estado === 'sending' && <Text style={s.statusSending}>enviando</Text>}
              {item.estado === 'error' && <Text style={s.statusError}>error</Text>}
              {item.estado !== 'sending' && item.estado !== 'error' && (
                <Feather name="check" size={10} color="rgba(255,255,255,0.75)" />
              )}
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={[s.messageWrapper, s.otherMessageWrapper]}>
        {!!peerName && (
          <View style={s.otherAvatar}>
            <Text style={s.otherAvatarText}>{peerInitials}</Text>
          </View>
        )}
        <View style={s.otherCol}>
          {!!peerName && (
            <Text style={s.otherName} numberOfLines={1}>{peerName}</Text>
          )}
          <View style={[s.bubble, s.otherBubble]}>
            {imageUri ? (
              <TouchableOpacity onPress={() => setFullscreenImage(imageUri)} activeOpacity={0.85}>
                <Image source={{ uri: imageUri }} style={s.messageImage} />
              </TouchableOpacity>
            ) : (
              <Text style={[s.messageText, s.otherMessageText]}>
                {typeof contenido === 'string' ? contenido : ''}
              </Text>
            )}
            <View style={[s.metaRow, s.otherMeta]}>
              <Text style={[s.time, s.otherTime]}>
                {new Date(item.created_at || Date.now()).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              {item.estado === 'sending' && <Text style={s.statusSending}>enviando</Text>}
              {item.estado === 'error' && <Text style={s.statusError}>error</Text>}
            </View>
          </View>
        </View>
      </View>
    );
  }, [isPerfilMode, senderPerfilId, currentUserId, peerName, peerInitials]);

  const feed = useMemo(() => {
    const out = [];
    let lastDay = "";
    mensajes.forEach((m) => {
      const dk = m.created_at ? new Date(m.created_at).toDateString() : "";
      if (dk && dk !== lastDay) {
        lastDay = dk;
        out.push({ type: "divider", id: `div-${dk}`, label: dayLabel(m.created_at) });
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

  const quickTexts = propQuickReplies ?? (isPerfilMode
    ? ['Hola, tu reserva fue aceptada', 'Te esperamos a la hora acordada', 'Gracias por preferirnos']
    : ['Hola, ¿puedo ir antes al servicio?', '¿El servicio es a domicilio o en el local?', 'Gracias']);
  const quickIcons = isPerfilMode ? ['check', 'clock', 'thumbs-up'] : ['clock', 'map-pin', 'thumbs-up'];
  const quickReplies = quickTexts.map((text, i) => ({ text, icon: quickIcons[i % quickIcons.length] }));

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

        {showHeader && (
          <View style={[s.chatHeader, { paddingTop: Math.max(insets.top, 8) }]}>
            <View style={s.avatarWrap}>
              {peerAvatar ? (
                <Image source={{ uri: peerAvatar }} style={s.avatarImage} />
              ) : (
                <View style={s.avatarBox}>
                  <Text style={s.avatarInitial}>{peerInitials}</Text>
                </View>
              )}
              <View style={s.onlineDot} />
            </View>
            <View style={s.headerText}>
              <View style={s.nameRow}>
                <Text style={s.headerTitleLight} numberOfLines={1}>{peerName || "Chat"}</Text>
                {!!peerName && <Feather name="check-circle" size={12} color="#FF5500" />}
              </View>
              <View style={s.subRow}>
                <Text style={s.headerSubLight} numberOfLines={1}>Chat de reserva</Text>
                {!!reservaId && (
                  <View style={s.orderBadge}>
                    <Text style={s.orderBadgeText}>#{reservaId}</Text>
                  </View>
                )}
              </View>
            </View>
            {!!onClose && (
              <TouchableOpacity style={s.closeBtnLight} onPress={onClose} activeOpacity={0.8}>
                <Feather name="x" size={20} color="#0F172A" />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={[s.contentFlex, showHeader && { paddingBottom: insets.bottom + manualOffset }]}>
          <View style={s.chatContainer}>
            {cargando ? (
              <View style={s.loadingContainer}>
                <ActivityIndicator size="large" color="#FF5500" />
                <Text style={s.loadingText}>Cargando mensajes anteriores...</Text>
              </View>
            ) : (
              <>
              <FlatList
                ref={flatListRef}
                style={s.messagesList}
                inverted
                data={invertedFeed}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={renderMensaje}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={s.messagesContent}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={11}
                maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                ListEmptyComponent={
                  <View style={s.emptyContainer}>
                    <Feather name="message-circle" size={44} color="#CBD5E1" />
                    <Text style={s.emptyText}>No hay mensajes aún</Text>
                    <Text style={s.emptySubtext}>Escríbele al perfil para coordinar tu reserva</Text>
                  </View>
                }
              />
              </>
            )}
          </View>

          <View style={s.quickReplies}>
            {quickReplies.map((q) => (
              <TouchableOpacity key={q.text} style={s.quickReply} onPress={() => enviarMensaje(q.text)} activeOpacity={0.8}>
                <Feather name={q.icon} size={12} color="#FF5500" />
                <Text style={s.quickReplyText}>{q.text}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ChatInput
            tag="ChatReserva"
            value={nuevoMensaje}
            onChangeText={setNuevoMensaje}
            onSend={handleSend}
            sending={enviando}
            onPickImage={handlePickImage}
            extraSendEnabled={!!chatImage}
            preview={chatImage && (
              <View style={s.imagePreview}>
                <Image source={{ uri: chatImage }} style={s.imagePreviewThumb} />
                <TouchableOpacity onPress={() => setChatImage(null)} style={s.removeImageBtn}>
                  <Feather name="x" size={14} color="#64748B" />
                </TouchableOpacity>
              </View>
            )}
          />
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
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
  closeBtnLight: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
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
    color: "#94A3B8",
    marginLeft: 4,
    marginBottom: 2,
  },
  dayRow: {
    alignItems: "center",
    marginVertical: 8,
  },
  dayLabel: {
    fontSize: 11,
    color: "#94A3B8",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
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
  },
  myMessageText: { color: '#FFFFFF' },
  otherMessageText: { color: '#0F172A' },
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
    color: '#334155',
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
