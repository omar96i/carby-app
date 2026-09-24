import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Dimensions,
} from "react-native";
import FullscreenImageViewer from "./usuario/pedidos/FullscreenImageViewer";
import { chatLog } from "../utils/chatDebug";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Feather, Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../constants/url";
import { useNotification } from "../context/NotificationContext";

const { height: SCREEN_H } = Dimensions.get("window");

const getChatImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (path.startsWith("file://") || path.startsWith("content://")) return path;
  return `${BASE_URL.toString().replace(/\/api\/?$/, "").replace(/\/$/, "")}/storage/${path}`;
};

const OrderChatModal = forwardRef(function OrderChatModal({ visible, pedidoId, userInfo, onClose, peerName = "Comercio", peerRole = "Soporte del pedido", peerAvatar = null, senderRole = "usuario" }, ref) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatImage, setChatImage] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const intervalRef = useRef(null);

  const currentUserId = userInfo?.id;
  const isComercio = senderRole === "comercio";
  const { notification } = useNotification();

  const parseMessageContent = (raw) => {
    if (!raw) return { type: "text", content: "" };
    if (typeof raw === "object") return raw;
    const cleanedOnce = String(raw).replace(/^"|"$/g, "").replace(/\\"/g, '"');
    try {
      return JSON.parse(cleanedOnce);
    } catch (e) {
      try {
        return JSON.parse(JSON.parse(String(raw)));
      } catch (e2) {
        return { type: "text", content: raw };
      }
    }
  };

  const loadMessages = useCallback(async (mostrarCargando = true) => {
    if (!pedidoId) return;
    if (mostrarCargando) setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await fetch(`${BASE_URL}pedido-chat/messages/${pedidoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      const list = (data.data || data.messages || [])
        .filter((msg) => msg != null && typeof msg === "object")
        .map((msg) => {
          const parsed = parseMessageContent(msg.message);
          const isMine = isComercio ? msg.negocio_id != null : msg.usuario_id != null;
          const imageUri = parsed.type === "file" || parsed.type === "image"
            ? (msg.image_url || getChatImageUrl(parsed.content))
            : (msg.image_url || null);
          return {
            id: msg.id?.toString() || `msg-${Math.random()}`,
            text: parsed.type === "text" ? parsed.content : "",
            image: imageUri,
            time: msg.created_at ? new Date(msg.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "",
            isMine,
            status: "sent",
          };
        });
      setMessages(list);
    } catch (error) {
      console.error("Error cargando mensajes:", error);
    } finally {
      if (mostrarCargando) setLoading(false);
    }
  }, [pedidoId, isComercio]);

  const sendMessage = async (textOverride) => {
    const text = textOverride || newMessage;
    if (!text.trim() && !chatImage) return;
    setSending(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      let requestBody;
      let headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
      const rawMessage = { type: chatImage ? "image" : "text", content: text.trim() };
      const escapedMessage = `"${JSON.stringify(rawMessage).replace(/"/g, '\\"')}"`;

      if (chatImage) {
        const formData = new FormData();
        formData.append("pedido_id", String(pedidoId));
        formData.append(isComercio ? "negocio_id" : "usuario_id", String(currentUserId));
        const imageMessage = { type: "file", content: "chat" };
        formData.append("message", `"${JSON.stringify(imageMessage).replace(/"/g, '\\"')}"`);
        formData.append("image", {
          uri: chatImage,
          name: chatImage.split("/").pop() || "chat.jpg",
          type: "image/jpeg",
        });
        requestBody = formData;
      } else {
        headers["Content-Type"] = "application/json";
        requestBody = JSON.stringify({
          pedido_id: parseInt(pedidoId, 10),
          ...(isComercio
            ? { negocio_id: parseInt(currentUserId, 10) }
            : { usuario_id: parseInt(currentUserId, 10) }),
          message: escapedMessage,
        });
      }

      const localMsg = {
        id: `temp-${Date.now()}`,
        text: text.trim(),
        image: chatImage,
        time: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
        isMine: true,
        status: "sending",
      };
      setMessages((prev) => [...prev, localMsg]);
      setNewMessage("");
      setChatImage(null);

      await fetch(`${BASE_URL}pedido-chat/send`, { method: "POST", headers, body: requestBody });
      setMessages((prev) => prev.map((m) => (m.id === localMsg.id ? { ...m, status: "sent" } : m)));
      loadMessages();
    } catch (error) {
      console.error("Error enviando mensaje:", error);
    } finally {
      setSending(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) setChatImage(result.assets[0].uri);
  };

  useEffect(() => {
    if (visible && pedidoId) {
      loadMessages();
      intervalRef.current = setInterval(() => loadMessages(false), 10000);
    }
    return () => clearInterval(intervalRef.current);
  }, [visible, pedidoId, loadMessages]);

  useEffect(() => {
    if (visible && notification?.request?.content?.data?.tipo === "chat") {
      loadMessages(false);
    }
  }, [notification, visible, loadMessages]);

  useEffect(() => {
    if (messages.length && flatListRef.current) {
      setTimeout(() => flatListRef.current.scrollToEnd({ animated: false }), 100);
    }
  }, [messages.length]);

  useImperativeHandle(ref, () => ({ reload: () => loadMessages() }), [loadMessages]);

  useEffect(() => {
    chatLog("OrderChatModal", "mount", { pedidoId, senderRole });
  }, []);

  const inputRef = useRef(null);
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      chatLog("OrderChatModal", "keyboardHide-blur");
      inputRef.current?.blur();
    });
    return () => sub.remove();
  }, []);

  const quickReplies = senderRole === "comercio"
    ? ["Pedido confirmado", "Estamos preparando tu pedido", "Tu pedido ya está listo"]
    : ["¿Cuánto tarda?", "Llego en 5 min", "Gracias"];

  if (!visible) return null;

  const renderMessage = ({ item }) => (
    <View style={[styles.messageWrapper, item.isMine ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
      <View style={[styles.bubble, item.isMine ? styles.myBubble : styles.otherBubble]}>
        {item.image ? (
          <TouchableOpacity onPress={() => setFullscreenImage(item.image)} activeOpacity={0.85}>
            <Image source={{ uri: item.image }} style={styles.messageImage} resizeMode="cover" />
          </TouchableOpacity>
        ) : (
          <Text style={[styles.messageText, item.isMine ? styles.myMessageText : styles.otherMessageText]}>{item.text}</Text>
        )}
        <View style={styles.metaRow}>
          <Text style={[styles.time, item.isMine ? styles.myTime : styles.otherTime]}>{item.time}</Text>
          {item.status === "sending" && <Text style={styles.statusSending}>enviando</Text>}
          {item.status === "error" && <Text style={styles.statusError}>error</Text>}
          {item.isMine && item.status !== "sending" && item.status !== "error" && (
            <Feather name="check" size={10} color="rgba(255,255,255,0.7)" />
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.panel}>
        {/* Header */}
        <View style={styles.header}>
          {peerAvatar ? (
            <Image source={{ uri: peerAvatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarBox}>
              <Ionicons name="storefront" size={22} color="#FF5500" />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>{peerName}</Text>
            <Text style={styles.headerSub}>{peerRole}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Feather name="x" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        {loading && messages.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#FF5500" />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No hay mensajes todavía. Envía el primer mensaje.</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Quick replies */}
        <View style={styles.quickReplies}>
          {quickReplies.map((q) => (
            <TouchableOpacity key={q} style={styles.quickReply} onPress={() => sendMessage(q)} activeOpacity={0.8}>
              <Text style={styles.quickReplyText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input */}
        <View style={styles.inputContainer}>
          {chatImage && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: chatImage }} style={styles.imagePreviewThumb} />
              <TouchableOpacity onPress={() => setChatImage(null)} style={styles.removeImageBtn}>
                <Feather name="x" size={14} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.iconButton} onPress={pickImage} activeOpacity={0.8}>
              <Feather name="image" size={22} color="#64748B" />
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#94A3B8"
              value={newMessage}
              onChangeText={(t) => {
                chatLog("OrderChatModal", "change", { len: t.length, senderRole });
                setNewMessage(t);
              }}
              onFocus={() => chatLog("OrderChatModal", "focus", { len: newMessage.length })}
              onBlur={() => chatLog("OrderChatModal", "blur", { len: newMessage.length })}
              onSelectionChange={(e) => chatLog("OrderChatModal", "selection", e.nativeEvent.selection)}
              onPressIn={() => chatLog("OrderChatModal", "pressIn")}
              onTouchStart={() => chatLog("OrderChatModal", "touchStart")}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() && !chatImage) && styles.sendButtonDisabled]}
              onPress={() => sendMessage()}
              disabled={sending || (!newMessage.trim() && !chatImage)}
              activeOpacity={0.8}
            >
              {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Feather name="send" size={18} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      <FullscreenImageViewer uri={fullscreenImage} onClose={() => setFullscreenImage(null)} />
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.35)",
  },
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "80%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FF5500",
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 14,
    fontFamily: "Montserrat",
  },
  messagesContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  messageWrapper: {
    maxWidth: "78%",
    marginVertical: 4,
  },
  myMessageWrapper: {
    alignSelf: "flex-end",
  },
  otherMessageWrapper: {
    alignSelf: "flex-start",
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myBubble: {
    backgroundColor: "#FF5500",
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: "#F1F5F9",
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "Montserrat",
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  otherMessageText: {
    color: "#0F172A",
  },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  time: {
    fontSize: 10,
    fontFamily: "Montserrat",
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
    fontFamily: "Montserrat",
  },
  statusError: {
    fontSize: 10,
    color: "#FF4757",
    fontFamily: "Montserrat",
  },
  quickReplies: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  quickReply: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickReplyText: {
    fontSize: 11,
    fontFamily: "Montserrat",
    color: "#0F172A",
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
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
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Montserrat",
    color: "#0F172A",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FF5500",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
});

export default OrderChatModal;
