import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Keyboard, Dimensions, useWindowDimensions, Platform } from "react-native";
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { BASE_URL } from "../constants/url";
import { useNotification } from "../context/NotificationContext";
import AlertaModal from "../components/ErrorModal";
import FullscreenImageViewer from "../components/usuario/pedidos/FullscreenImageViewer";
import ChatInput from "./ChatInput";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const ChatUsuario = ({
  tripId,
  showHeader = false,
  peerName = "",
  peerRole = "",
  peerAvatar = null,
  headerId = null,
  statusTitle = "",
  statusSub = "",
  statusTone = "#3B82F6",
  onClose = null,
}) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [chatImage, setChatImage] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  useEffect(() => {
    if (tripId) {
      fetchPreviousMessages();
    }
  }, [tripId]);

  const { expoPushToken, notification } = useNotification();


  useEffect(() => {
    if (notification) {
      fetchPreviousMessages(false)
    }
  }, [notification]);

  // Función para obtener mensajes anteriores
  const fetchPreviousMessages = useCallback(async (mostrarCargando = true) => {
    if (!tripId) return;

    if (mostrarCargando) setIsLoadingHistory(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");

      if (!token) {
        console.error("Authentication token not found");
        return;
      }

      // Obtener información del usuario actual
      let currentUserId = null;

      // Primero intentar obtener de userData (formato completo)
      if (userData) {
        try {
          const userInfo = JSON.parse(userData);
          currentUserId = userInfo.id;
        } catch (e) {
          console.error("Error parsing userData:", e);
        }
      }

      // Si no se pudo obtener de userData, intentar con userId directamente
      if (!currentUserId) {
        try {
          const userId = await AsyncStorage.getItem("userId");
          if (userId) {
            currentUserId = userId;
          }
        } catch (e) {
          console.error("Error getting userId:", e);
        }
      }

      console.log('ChatUsuario - fetchPreviousMessages:', {
        tripId,
        currentUserId,
        currentUserIdType: typeof currentUserId,
        hasToken: !!token,
        hasUserData: !!userData
      });

      const response = await fetch(`${BASE_URL}carrera-chat/${tripId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`Error fetching messages: ${response.status}`);
        return;
      }

      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        const formattedMessages = data.data.map(msg => {
          let messageContent;
          try {
            messageContent = JSON.parse(msg.message);
          } catch (e) {
            messageContent = { content: msg.message, type: 'text' };
          }

          // Determinar si el mensaje es del usuario actual o del rider
          // Verificar múltiples formas de identificar al usuario actual
          let isFromCurrentUser = false;
          let isFromRider = false;

          // Opción 1: Comparar con usuario_id del mensaje
          if (msg.usuario_id && currentUserId &&
            msg.usuario_id.toString() === currentUserId.toString()) {
            isFromCurrentUser = true;
          }
          // Opción 2: Si no hay usuario_id, pero hay conductor_id, podría ser del rider
          // PERO necesitamos verificar si el conductor_id es del usuario actual
          else if (msg.conductor_id && currentUserId &&
            msg.conductor_id.toString() === currentUserId.toString()) {
            // Si el conductor_id coincide con el usuario actual, entonces es del usuario
            isFromCurrentUser = true;
          }
          // Opción 3: Si hay conductor_id pero no coincide con el usuario actual, es del rider
          else if (msg.conductor_id && !msg.usuario_id) {
            isFromRider = true;
          }

          let sender = "Desconocido";
          let isMyMessage = false;

          if (isFromCurrentUser) {
            sender = "Tú";
            isMyMessage = true;
          } else if (isFromRider) {
            sender = "Rider";
            isMyMessage = false;
          }

          console.log('ChatUsuario - Procesando mensaje:', {
            messageId: msg.id,
            usuario_id: msg.usuario_id,
            conductor_id: msg.conductor_id,
            currentUserId: currentUserId,
            currentUserIdType: typeof currentUserId,
            isFromCurrentUser,
            isFromRider,
            sender,
            isMyMessage,
            rawMessage: msg
          });

          return {
            id: msg.id.toString(),
            user: sender,
            text: messageContent.type === "text" ? messageContent.content : "",
            image: messageContent.type === "file" ? `https://back.carbycol.com/storage/${messageContent.content}` : null,
            time: new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            ts: msg.created_at || null,
            status: "sent",
            isMyMessage: isMyMessage
          };
        });

        console.log('ChatUsuario - Mensajes procesados:', {
          totalMessages: formattedMessages.length,
          myMessages: formattedMessages.filter(m => m.isMyMessage).length,
          otherMessages: formattedMessages.filter(m => !m.isMyMessage).length,
          sampleMessages: formattedMessages.slice(0, 3).map(m => ({
            id: m.id,
            user: m.user,
            isMyMessage: m.isMyMessage
          }))
        });

        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      if (mostrarCargando) setIsLoadingHistory(false);
    }
  }, [tripId]);

  // Enviar texto e imagen (igual que OrderChatModal): la imagen
  // se previsualiza primero y se envía junto al mensaje.
  const sendMessage = async (textOverride) => {
    const text = textOverride || inputText;
    if (!text.trim() && !chatImage) return;

    setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      const userId = await AsyncStorage.getItem("userId");

      if (!token || !userId) {
        showAlert("No se encontró la información de autenticación", "error");
        return;
      }

      const formData = new FormData();
      formData.append("carrera_id", tripId.toString());
      formData.append("conductor_id", userId.toString());

      if (chatImage) {
        const imageMessage = { type: "file", content: "chat" };
        formData.append("message", `"${JSON.stringify(imageMessage).replace(/"/g, '\\"')}"`);
        formData.append("image", {
          uri: chatImage,
          name: chatImage.split("/").pop() || "photo.jpg",
          type: "image/jpeg",
        });
      } else {
        const rawMessage = { type: "text", content: text.trim() };
        const escapedJson = JSON.stringify(rawMessage).replace(/"/g, '\\"');
        formData.append("message", `"${escapedJson}"`);
      }

      const localMessage = {
        id: `temp-${Date.now()}`,
        user: "Tú",
        text: chatImage ? "[Imagen]" : text.trim(),
        image: chatImage,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ts: new Date().toISOString(),
        status: "sending",
        isMyMessage: true
      };
      setMessages(prev => [...prev, localMessage]);
      setInputText("");
      setChatImage(null);

      const response = await fetch(`${BASE_URL}carrera-chat/send`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Error sending message:", data);
        showAlert("No se pudo enviar el mensaje", "error");
        setMessages(prev =>
          prev.map(msg =>
            msg.id === localMessage.id ? { ...msg, status: "error" } : msg
          )
        );
        return;
      }

      setMessages(prev =>
        prev.map(msg =>
          msg.id === localMessage.id ? { ...msg, status: "sent", id: data.id || msg.id } : msg
        )
      );

    } catch (error) {
      console.error("Error in sendMessage:", error);
      showAlert("Ocurrió un error al enviar el mensaje", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Seleccionar imagen (solo previsualiza, el envío va con el mensaje)
  const pickImage = async () => {
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

  // Renderizar mensajes (memoizado: no se recrea al escribir)
  const renderMessage = useCallback(({ item }) => {
    if (item.type === "divider") {
      return (
        <View style={styles.dayRow}>
          <Text style={styles.dayLabel}>{item.label}</Text>
        </View>
      );
    }
    if (item.isMyMessage) {
      return (
        <View style={[styles.messageWrapper, styles.myMessageWrapper]}>
          <View style={[styles.bubble, styles.myBubble]}>
            {item.image ? (
              <TouchableOpacity onPress={() => setFullscreenImage(item.image)} activeOpacity={0.85}>
                <Image source={{ uri: item.image }} style={styles.messageImage} />
              </TouchableOpacity>
            ) : (
              <Text style={[styles.messageText, styles.myMessageText]}>
                {typeof item.text === 'string' ? item.text : ''}
              </Text>
            )}
            <View style={[styles.metaRow, styles.myMeta]}>
              <Text style={[styles.time, styles.myTime]}>
                {typeof item.time === 'string' ? item.time : ''}
              </Text>
              {item.status === "sending" && <Text style={styles.statusSending}>enviando</Text>}
              {item.status === "error" && <Text style={styles.statusError}>error</Text>}
              {item.status !== "sending" && item.status !== "error" && (
                <Feather name="check" size={10} color="rgba(255,255,255,0.7)" />
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
            {item.image ? (
              <TouchableOpacity onPress={() => setFullscreenImage(item.image)} activeOpacity={0.85}>
                <Image source={{ uri: item.image }} style={styles.messageImage} />
              </TouchableOpacity>
            ) : (
              <Text style={[styles.messageText, styles.otherMessageText]}>
                {typeof item.text === 'string' ? item.text : ''}
              </Text>
            )}
            <View style={[styles.metaRow, styles.otherMeta]}>
              <Text style={[styles.time, styles.otherTime]}>
                {typeof item.time === 'string' ? item.time : ''}
              </Text>
              {item.status === "sending" && <Text style={styles.statusSending}>enviando</Text>}
              {item.status === "error" && <Text style={styles.statusError}>error</Text>}
            </View>
          </View>
        </View>
      </View>
    );
  }, [peerName, peerInitials]);

  const feed = useMemo(() => {
    const out = [];
    let lastDay = "";
    messages.forEach((m) => {
      const dk = m.ts ? new Date(m.ts).toDateString() : "";
      if (dk && dk !== lastDay) {
        lastDay = dk;
        out.push({ type: "divider", id: `div-${dk}`, label: dayLabel(m.ts) });
      }
      out.push(m);
    });
    return out;
  }, [messages]);

  const invertedFeed = useMemo(() => [...feed].reverse(), [feed]);

  const flatListRef = useRef(null);

  // Auto-scroll al último mensaje (lista invertida: offset 0 = abajo)
  useEffect(() => {
    if (invertedFeed.length && flatListRef.current) {
      const t = setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: false }), 100);
      return () => clearTimeout(t);
    }
  }, [invertedFeed.length]);
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
  const insets = useSafeAreaInsets();

  const peerInitials = useMemo(() => {
    const parts = String(peerName || "?").trim().split(/\s+/);
    return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
  }, [peerName]);

  const quickReplies = [
    { text: 'Ya voy en camino', icon: 'map-pin' },
    { text: 'Estoy afuera', icon: 'thumbs-up' },
    { text: 'Ya viene?', icon: 'help-circle' },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingBottom: manualOffset }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.contentFlex, showHeader && { paddingBottom: insets.bottom }]}>
        {showHeader && (
          <>
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
                  <Text style={styles.headerTitle} numberOfLines={1}>{peerName || "Chat"}</Text>
                  {!!peerName && <Feather name="check-circle" size={12} color="#FF5500" />}
                </View>
                {!!peerRole && (
                  <View style={styles.subRow}>
                    <Text style={styles.headerSub} numberOfLines={1}>{peerRole}</Text>
                    {!!tripId && (
                      <View style={styles.orderBadge}>
                        <Text style={styles.orderBadgeText}>#{tripId}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              {!!onClose && (
                <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                  <Feather name="x" size={20} color="#0F172A" />
                </TouchableOpacity>
              )}
            </View>
            {!!statusTitle && (
              <View style={styles.statusStrip}>
                <View style={[styles.statusDot, { backgroundColor: statusTone }]} />
                <View style={styles.statusStripTextBox}>
                  <Text style={[styles.statusStripTitle, { color: statusTone }]} numberOfLines={1}>
                    {statusTitle}
                  </Text>
                  {!!statusSub && (
                    <Text style={styles.statusStripText} numberOfLines={1}>{statusSub}</Text>
                  )}
                </View>
                {!!onClose && (
                  <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                    <Text style={styles.statusStripAction}>Ver mapa</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
        <View style={styles.chatContainer}>
          {isLoadingHistory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF5500" />
              <Text style={styles.loadingText}>Cargando mensajes anteriores...</Text>
            </View>
          ) : (
              <>
              <FlatList
                ref={flatListRef}
                style={styles.messagesList}
                inverted
                data={invertedFeed}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderMessage}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.messagesContent}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={11}
                maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              />
              </>
          )}
        </View>

        {/* Quick replies */}
        <View style={styles.quickReplies}>
          {quickReplies.map((q) => (
            <TouchableOpacity key={q.text} style={styles.quickReply} onPress={() => sendMessage(q.text)} activeOpacity={0.8}>
              <Feather name={q.icon} size={12} color="#FF5500" />
              <Text style={styles.quickReplyText}>{q.text}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ChatInput
          tag="ChatUsuario"
          value={inputText}
          onChangeText={setInputText}
          onSend={sendMessage}
          sending={isLoading}
          onPickImage={pickImage}
          extraSendEnabled={!!chatImage}
          preview={chatImage && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: chatImage }} style={styles.imagePreviewThumb} />
              <TouchableOpacity onPress={() => setChatImage(null)} style={styles.removeImageBtn}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
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
    fontFamily: "Montserrat_700Bold",
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
  headerTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
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
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#FF5500",
  },
  imagePreview: {
    flexDirection: "row",
    alignItems: "center",
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
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  statusStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusStripTextBox: {
    flex: 1,
  },
  statusStripTitle: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
  },
  statusStripText: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: "#92400E",
    marginTop: 1,
  },
  statusStripAction: {
    fontSize: 11,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#FF5500",
  },
  dayRow: {
    alignItems: "center",
    marginVertical: 8,
  },
  dayLabel: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: "#94A3B8",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
  },
  chatContainer: {
    flex: 1
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
    resizeMode: 'cover',
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
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
  },
  emptyChat: {
    padding: 20,
    alignItems: "center",
  },
  emptyChatText: {
    color: "#94A3B8",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
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
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#64748B",
  },
  otherCol: {
    flex: 1,
  },
  otherName: {
    fontSize: 10,
    fontFamily: "Montserrat_400Regular",
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
    backgroundColor: "#FF5500",
    borderTopRightRadius: 6,
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  otherBubble: {
    backgroundColor: "#FFFFFF",
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
    fontFamily: "Montserrat_400Regular",
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  otherMessageText: {
    color: "#0F172A",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
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
    fontFamily: "Montserrat_400Regular",
  },
  myTime: {
    color: "rgba(255,255,255,0.75)",
  },
  otherTime: {
    color: "#94A3B8",
  },
  statusSending: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: "Montserrat_400Regular",
  },
  statusError: {
    fontSize: 10,
    color: "#FF4757",
    fontFamily: "Montserrat_400Regular",
  },
  quickReplies: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F8FAFC",
  },
  quickReply: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickReplyText: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#334155",
  },
});

export default ChatUsuario;