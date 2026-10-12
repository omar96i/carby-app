import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ChatInput from "./ChatInput";
import FullscreenImageViewer from "./usuario/pedidos/FullscreenImageViewer";
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

const OrderChatModal = forwardRef(function OrderChatModal({ visible, pedidoId, userInfo, onClose, peerName = "Comercio", peerRole = "Soporte del pedido", peerAvatar = null, senderRole = "usuario", statusTitle = "", statusSub = "", statusTone = "#3B82F6" }, ref) {
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

  const peerInitials = React.useMemo(() => {
    const parts = String(peerName || "C").trim().split(/\s+/);
    return ((parts[0]?.[0] || "C") + (parts[1]?.[0] || "")).toUpperCase();
  }, [peerName]);

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
            ts: msg.created_at || null,
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
        ts: new Date().toISOString(),
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

  const quickReplies = senderRole === "comercio"
    ? [
        { text: "Pedido confirmado", icon: "check" },
        { text: "Estamos preparando tu pedido", icon: "clock" },
        { text: "Tu pedido ya está listo", icon: "shopping-bag" },
      ]
    : [
        { text: "¿Cuánto tarda?", icon: "clock" },
        { text: "Llego en 5 min", icon: "map-pin" },
        { text: "Gracias", icon: "thumbs-up" },
      ];

  const feed = React.useMemo(() => {
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

  const renderMessage = useCallback(({ item }) => {
    if (item.type === "divider") {
      return (
        <View style={styles.dayRow}>
          <Text style={styles.dayLabel}>{item.label}</Text>
        </View>
      );
    }
    if (item.isMine) {
      return (
        <View style={[styles.messageWrapper, styles.myMessageWrapper]}>
          <View style={[styles.bubble, styles.myBubble]}>
            {item.image ? (
              <TouchableOpacity onPress={() => setFullscreenImage(item.image)} activeOpacity={0.85}>
                <Image source={{ uri: item.image }} style={styles.messageImage} resizeMode="cover" />
              </TouchableOpacity>
            ) : (
              <Text style={[styles.messageText, styles.myMessageText]}>{item.text}</Text>
            )}
            <View style={[styles.metaRow, styles.myMeta]}>
              <Text style={[styles.time, styles.myTime]}>{item.time}</Text>
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
        <View style={styles.otherAvatar}>
          <Text style={styles.otherAvatarText}>{peerInitials}</Text>
        </View>
        <View style={styles.otherCol}>
          <Text style={styles.otherName} numberOfLines={1}>{peerName}</Text>
          <View style={[styles.bubble, styles.otherBubble]}>
            {item.image ? (
              <TouchableOpacity onPress={() => setFullscreenImage(item.image)} activeOpacity={0.85}>
                <Image source={{ uri: item.image }} style={styles.messageImage} resizeMode="cover" />
              </TouchableOpacity>
            ) : (
              <Text style={[styles.messageText, styles.otherMessageText]}>{item.text}</Text>
            )}
            <View style={[styles.metaRow, styles.otherMeta]}>
              <Text style={[styles.time, styles.otherTime]}>{item.time}</Text>
              {item.status === "sending" && <Text style={styles.statusSending}>enviando</Text>}
              {item.status === "error" && <Text style={styles.statusError}>error</Text>}
            </View>
          </View>
        </View>
      </View>
    );
  }, [peerInitials, peerName]);

  if (!visible) return null;

  return (
    <View style={[styles.full, { paddingBottom: manualOffset + insets.bottom }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
          <View style={styles.avatarWrap}>
            {peerAvatar ? (
              <Image source={{ uri: peerAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarBox}>
                <Ionicons name="storefront" size={22} color="#FF5500" />
              </View>
            )}
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>{peerName}</Text>
              <Feather name="check-circle" size={12} color="#FF5500" />
            </View>
            <View style={styles.subRow}>
              <Text style={styles.headerSub} numberOfLines={1}>{peerRole}</Text>
              {!!pedidoId && (
                <View style={styles.orderBadge}>
                  <Text style={styles.orderBadgeText}>#{pedidoId}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Feather name="x" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Franja de estado del pedido (igual que el TopBar) */}
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
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.statusStripAction}>Ver mapa</Text>
            </TouchableOpacity>
          </View>
        )}

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
          <View style={styles.flex}>
          <FlatList
            ref={flatListRef}
            style={styles.flex}
            data={feed}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            scrollEnabled
            nestedScrollEnabled
            removeClippedSubviews={false}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={11}
          />
          </View>
        )}

        {/* Quick replies */}
        <View style={styles.quickReplies}>
          {quickReplies.map((q) => (
            <TouchableOpacity key={q.text} style={styles.quickReply} onPress={() => sendMessage(q.text)} activeOpacity={0.8}>
              <Feather name={q.icon} size={12} color="#FF5500" />
              <Text style={styles.quickReplyText}>{q.text}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input */}
        <ChatInput
          tag="OrderChatModal"
          value={newMessage}
          onChangeText={setNewMessage}
          onSend={() => sendMessage()}
          sending={sending}
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
      </KeyboardAvoidingView>
      <FullscreenImageViewer uri={fullscreenImage} onClose={() => setFullscreenImage(null)} />
    </View>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  full: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
    backgroundColor: "#F8FAFC",
  },
  header: {
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
    fontFamily: "MontserratBold",
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
    fontFamily: "Montserrat",
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
    fontFamily: "MontserratBold",
    fontWeight: "bold",
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
    fontFamily: "MontserratBold",
    fontWeight: "bold",
  },
  statusStripText: {
    fontSize: 11,
    fontFamily: "Montserrat",
    color: "#92400E",
    marginTop: 1,
  },
  statusStripAction: {
    fontSize: 11,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
  },
  dayRow: {
    alignItems: "center",
    marginVertical: 8,
  },
  dayLabel: {
    fontSize: 11,
    fontFamily: "Montserrat",
    color: "#94A3B8",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
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
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#64748B",
  },
  otherCol: {
    flex: 1,
  },
  otherName: {
    fontSize: 10,
    fontFamily: "Montserrat",
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
    paddingVertical: 6,
    backgroundColor: "#F8FAFC",
  },
  quickReply: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    fontFamily: "Montserrat",
    color: "#334155",
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
});

export default OrderChatModal;
