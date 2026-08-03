import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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
          <TouchableOpacity onPress={onClose}><Feather name="chevron-down" size={28} color="#1c1c1e" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Chat del pedido</Text>
          <TouchableOpacity onPress={loadMessages}><Feather name="refresh-cw" size={20} color="#888" /></TouchableOpacity>
        </View>

        <View style={styles.messages}>
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
          <View ref={scrollViewRef} />
        </View>

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
              {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Feather name="send" size={18} color={(newMessage.trim() || chatImage) ? "#FFF" : "#aaa"} />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFF", zIndex: 100, paddingTop: 0 },
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 50, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", backgroundColor: "#FFF" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1c1c1e" },
  messages: { flex: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  empty: { textAlign: "center", color: "#a1a1aa", fontSize: 13, marginTop: 40 },
  bubbleWrap: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12 },
  bubbleWrapMine: { justifyContent: "flex-end" },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f4f4f5", justifyContent: "center", alignItems: "center", marginRight: 8 },
  avatarMine: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#fa6205", justifyContent: "center", alignItems: "center", marginLeft: 8 },
  bubble: { maxWidth: "72%", borderRadius: 18, padding: 12, paddingBottom: 6 },
  bubbleTheirs: { backgroundColor: "#f4f4f5", borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: "#fa6205", borderBottomRightRadius: 4 },
  bubbleUser: { fontSize: 11, fontWeight: "700", color: "#888", marginBottom: 4 },
  bubbleText: { fontSize: 15, color: "#1c1c1e", lineHeight: 20 },
  bubbleTextMine: { color: "#FFF" },
  bubbleImage: { width: 120, height: 120, borderRadius: 10, marginTop: 6 },
  bubbleTime: { fontSize: 10, color: "#a1a1aa", marginTop: 4, textAlign: "right" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.7)" },
  inputBar: { borderTopWidth: 1, borderTopColor: "#f0f0f0", backgroundColor: "#FFF", paddingHorizontal: 14, paddingVertical: 10, paddingBottom: Platform.OS === "ios" ? 24 : 10 },
  imagePreview: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  inputRow: { flexDirection: "row", alignItems: "flex-end" },
  attachBtn: { padding: 8 },
  input: { flex: 1, backgroundColor: "#f4f4f5", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100, fontSize: 15 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#e4e4e7", justifyContent: "center", alignItems: "center", marginLeft: 8 },
  sendBtnActive: { backgroundColor: "#fa6205" },
});
