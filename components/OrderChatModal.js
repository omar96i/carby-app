import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Feather, Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../constants/url";

const { height } = Dimensions.get("window");

export default function OrderChatModal({ visible, pedidoId, userInfo, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatImage, setChatImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef(null);
  const intervalRef = useRef(null);

  const loadMessages = async () => {
    if (!pedidoId) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await fetch(`${BASE_URL}pedido-chat/messages/${pedidoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const messages = (data.data || data.messages || [])
          .filter((msg) => msg != null && typeof msg === "object")
          .map((msg) => ({
            ...msg,
            currentUserId: userInfo?.id || 0,
          }));
        setMessages(messages);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
      }
    } catch (error) { /* noop */ }
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !chatImage) return;
    setSending(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      let requestBody;
      let headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

      if (chatImage) {
        const formData = new FormData();
        formData.append("pedido_id", String(pedidoId));
        formData.append("usuario_id", String(userInfo.id));
        const rawMessage = { type: "text", content: newMessage.trim() };
        formData.append("message", `"${JSON.stringify(rawMessage).replace(/"/g, '\\"')}"`);
        formData.append("image", {
          uri: Platform.OS === "ios" ? chatImage.replace("file://", "") : chatImage,
          name: chatImage.split("/").pop() || "chat.jpg",
          type: "image/jpeg",
        });
        requestBody = formData;
      } else {
        headers["Content-Type"] = "application/json";
        requestBody = JSON.stringify({
          pedido_id: parseInt(pedidoId, 10),
          usuario_id: parseInt(userInfo.id, 10),
          message: `"${JSON.stringify({ type: "text", content: newMessage.trim() }).replace(/"/g, '\\"')}"`,
        });
      }

      await fetch(`${BASE_URL}pedido-chat/send`, { method: "POST", headers, body: requestBody });
      setNewMessage("");
      setChatImage(null);
      loadMessages();
    } catch (error) { /* noop */ }
    finally { setSending(false); }
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
      intervalRef.current = setInterval(loadMessages, 10000);
    }
    return () => clearInterval(intervalRef.current);
  }, [visible, pedidoId]);

  if (!visible) return null;

  const formatTime = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Feather name="chevron-down" size={28} color="#FFF" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Chat del pedido</Text>
          <TouchableOpacity onPress={loadMessages}><Feather name="refresh-cw" size={20} color="rgba(255,255,255,0.7)" /></TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
        >
          {loading && <ActivityIndicator size="small" color="#fa6205" style={{ paddingTop: 20 }} />}
          {!loading && !messages.length && <Text style={styles.empty}>No hay mensajes todavía. Envía el primer mensaje.</Text>}
          {messages.map((msg, index) => {
            const isMine = String(msg.currentUserId) === String(msg.usuario_id || msg.user_id);
            const showAvatar = index === 0 || messages[index - 1]?.usuario_id !== msg.usuario_id;
            return (
              <View key={index} style={[styles.bubbleWrap, isMine && styles.bubbleWrapMine]}>
                {!isMine && showAvatar && <View style={styles.avatar}><Feather name="user" size={16} color="#888" /></View>}
                {!isMine && !showAvatar && <View style={{ width: 36 }} />}
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <View style={[styles.tail, isMine ? styles.tailMine : styles.tailTheirs]} />
                  {!isMine && showAvatar && <Text style={styles.bubbleUser}>{msg.nombre_completo || "Usuario"}</Text>}
                  {msg.content && <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{msg.content}</Text>}
                  {msg.image_url && <Image source={{ uri: msg.image_url }} style={styles.bubbleImage} resizeMode="cover" />}
                  <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>{formatTime(msg.created_at)}</Text>
                </View>
                {isMine && showAvatar && <View style={styles.avatarMine}><Ionicons name="person" size={16} color="#FFF" /></View>}
                {isMine && !showAvatar && <View style={{ width: 36 }} />}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.inputBar}>
          {chatImage && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: chatImage }} style={{ width: 40, height: 40, borderRadius: 6 }} />
              <TouchableOpacity onPress={() => setChatImage(null)} style={{ marginLeft: 8 }}><Feather name="x" size={16} color="#888" /></TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={pickImage} style={styles.attachBtn}><Feather name="image" size={22} color="#888" /></TouchableOpacity>
            <TextInput value={newMessage} onChangeText={setNewMessage} placeholder="Escribe un mensaje..." style={styles.input} multiline />
            <TouchableOpacity disabled={sending || (!newMessage.trim() && !chatImage)} onPress={sendMessage} style={[styles.sendBtn, (newMessage.trim() || chatImage) && styles.sendBtnActive]}>
              {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Feather name="send" size={17} color={(newMessage.trim() || chatImage) ? "#FFF" : "#aaa"} />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFF", zIndex: 100 },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 22,
    backgroundColor: "#1C1C1E",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTitle: { fontSize: 19, fontWeight: "700", color: "#FFF", letterSpacing: 0.3 },
  messages: { flex: 1, backgroundColor: "#FFF" },
  messagesContent: { paddingHorizontal: 14, paddingBottom: 6, paddingTop: 14 },
  empty: { textAlign: "center", color: "#a1a1aa", fontSize: 14, marginTop: 40 },
  bubbleWrap: { flexDirection: "row", alignItems: "flex-end", marginBottom: 14 },
  bubbleWrapMine: { justifyContent: "flex-end" },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#E8E8ED", justifyContent: "center", alignItems: "center", marginRight: 8 },
  avatarMine: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#1C1C1E", justifyContent: "center", alignItems: "center", marginLeft: 8 },
  bubble: { maxWidth: "75%", padding: 14, paddingBottom: 8, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "visible" },
  bubbleTheirs: { backgroundColor: "#ECECEC", borderBottomLeftRadius: 4, borderBottomRightRadius: 24 },
  bubbleMine: { backgroundColor: "#1C1C1E", borderBottomLeftRadius: 24, borderBottomRightRadius: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  bubbleUser: { fontSize: 12, fontWeight: "700", color: "#71717a", marginBottom: 4 },
  bubbleText: { fontSize: 16, color: "#1C1C1E", lineHeight: 22 },
  bubbleTextMine: { color: "#FFF" },
  bubbleImage: { width: 120, height: 120, borderRadius: 10, marginTop: 6 },
  bubbleTime: { fontSize: 11, color: "#a1a1aa", marginTop: 4, textAlign: "right" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.7)" },
  tail: { position: "absolute", bottom: -5, width: 12, height: 12, transform: [{ rotate: "45deg" }] },
  tailTheirs: { left: -4, backgroundColor: "#ECECEC" },
  tailMine: { right: -4, backgroundColor: "#1C1C1E" },
  inputBar: { borderTopWidth: 1, borderTopColor: "#E5E5EA", backgroundColor: "#FFF", paddingHorizontal: 14, paddingVertical: 10, paddingBottom: Platform.OS === "ios" ? 24 : 10 },
  imagePreview: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  attachBtn: { padding: 6, backgroundColor: "#FFF0E5", borderRadius: 20, width: 38, height: 38, justifyContent: "center", alignItems: "center" },
  input: { flex: 1, backgroundColor: "#ECECEC", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 15, color: "#1C1C1E" },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#e4e4e7", justifyContent: "center", alignItems: "center" },
  sendBtnActive: { backgroundColor: "#1C1C1E" },
});
