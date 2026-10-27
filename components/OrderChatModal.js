import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
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
import LogoComercio from "./LogoComercio";
import { StatusBar } from "expo-status-bar";
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

const OrderChatModal = forwardRef(function OrderChatModal({ visible, pedidoId, userInfo, onClose, peerName = "Comercio", peerRole = "Soporte del pedido", peerAvatar = null, senderRole = "usuario", statusTitle = "", statusSub = "", statusTone = "#3B82F6", peerComercioId = null }, ref) {
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
        <StatusBar style="light" />
        <View style={[styles.headerWrap, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Feather name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.avatarWrap}>
            <LogoComercio comercio={peerAvatar ? { foto: peerAvatar } : null} comercioId={peerComercioId} size={46} />
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>{peerName}</Text>
              <Feather name="check-circle" size={12} color="#fa6205" />
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
        </View>

        {!!statusTitle && (
          <View style={styles.statusStrip}>
            <View style={[styles.statusHalo, { backgroundColor: (statusTone || "#fa6205") + "33" }]}>
              <View style={[styles.statusDot, { backgroundColor: statusTone }]} />
            </View>
            <View style={styles.statusStripTextBox}>
              <Text style={styles.statusStripTitle} numberOfLines={1}>
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
        </View>

        {/* Messages */}
        {loading && messages.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#fa6205" />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles" size={30} color="#fa6205" />
            </View>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.quickRepliesScroll}
          contentContainerStyle={styles.quickReplies}
        >
          {quickReplies.map((q) => (
            <TouchableOpacity key={q.text} style={styles.quickReply} onPress={() => sendMessage(q.text)} activeOpacity={0.8}>
              <Feather name={q.icon} size={12} color="#fa6205" />
              <Text style={styles.quickReplyText}>{q.text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

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
                <Feather name="x" size={14} color="#71717A" />
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
    backgroundColor: "#F4F4F5",
  },
  headerWrap: {
    backgroundColor: "#1C1C1E",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 14,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  avatarWrap: {
    position: "relative",
  },
  avatarBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFF0E5",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#2C2C2E",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2.5,
    borderColor: "#1C1C1E",
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
    fontSize: 16,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#FFFFFF",
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
    color: "rgba(255,255,255,0.6)",
  },
  orderBadge: {
    backgroundColor: "rgba(250,98,5,0.2)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  orderBadgeText: {
    fontSize: 10,
    fontFamily: "Montserrat_700Bold",
    color: "#fa6205",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 12,
    borderRadius: 20,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 8,
  },
  statusHalo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
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
    fontFamily: "Montserrat_800ExtraBold",
    color: "#FFFFFF",
  },
  statusStripText: {
    fontSize: 11.5,
    fontFamily: "Montserrat_400Regular",
    color: "rgba(255,255,255,0.6)",
    marginTop: 1,
  },
  statusStripAction: {
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
    color: "#FFFFFF",
    backgroundColor: "#fa6205",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    overflow: "hidden",
  },
  dayRow: {
    alignItems: "center",
    marginVertical: 8,
  },
  dayLabel: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: "#71717A",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
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
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF0E5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyText: {
    textAlign: "center",
    maxWidth: 240,
    color: "#A1A1AA",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Montserrat_600SemiBold",
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
    backgroundColor: "#FFF0E5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  otherAvatarText: {
    fontSize: 10,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#fa6205",
  },
  otherCol: {
    flex: 1,
  },
  otherName: {
    fontSize: 10,
    fontFamily: "Montserrat_400Regular",
    color: "#A1A1AA",
    marginLeft: 4,
    marginBottom: 2,
  },
  bubble: {
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  myBubble: {
    backgroundColor: "#fa6205",
    borderBottomRightRadius: 8,
  },
  otherBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 8,
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
    color: "#1C1C1E",
  },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: 16,
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
    color: "#A1A1AA",
  },
  statusSending: {
    fontSize: 10,
    color: "#A1A1AA",
    fontFamily: "Montserrat_400Regular",
  },
  statusError: {
    fontSize: 10,
    color: "#FF4757",
    fontFamily: "Montserrat_400Regular",
  },
  quickRepliesScroll: {
    flexGrow: 0,
    backgroundColor: "#F4F4F5",
  },
  quickReplies: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickReply: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickReplyText: {
    fontSize: 12.5,
    fontFamily: "Montserrat_600SemiBold",
    color: "#1C1C1E",
  },
  imagePreview: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  imagePreviewThumb: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  removeImageBtn: {
    marginLeft: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F4F4F5",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default OrderChatModal;
