import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Keyboard, Platform } from "react-native";
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { BASE_URL } from "../constants/url";
import { useNotification } from "../context/NotificationContext";
import AlertaModal from "../components/ErrorModal";

const ChatUsuario = ({ tripId }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      console.log("entre")
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      console.log("entre false")
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (tripId) {
      fetchPreviousMessages();
    }
  }, [tripId]);

  const { expoPushToken, notification } = useNotification();


  useEffect(() => {
    if (notification) {
      fetchPreviousMessages()
    }
  }, [notification]);

  // Función para obtener mensajes anteriores
  const fetchPreviousMessages = async () => {
    if (!tripId) return;

    setIsLoadingHistory(true);

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
      setIsLoadingHistory(false);
    }
  };

  // Función para enviar mensajes de texto
  const sendMessage = async () => {
    if (!inputText.trim()) return;

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

      const rawMessage = {
        type: "text",
        content: inputText
      };
      const escapedJson = JSON.stringify(rawMessage).replace(/"/g, '\\"');
      formData.append("message", `"${escapedJson}"`);

      const localMessage = {
        id: `temp-${Date.now()}`,
        user: "Tú",
        text: inputText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "sending",
        isMyMessage: true
      };
      setMessages(prev => [...prev, localMessage]);
      setInputText("");

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

  // Función para enviar imágenes
  const sendImage = async (image) => {
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

      const message = {
        type: "image",
        content: "Imagen enviada"
      };
      const escapedJson = JSON.stringify(message).replace(/"/g, '\\"');
      formData.append("message", `"${escapedJson}"`);

      formData.append("image", {
        uri: image.uri,
        name: "photo.jpg",
        type: "image/jpeg"
      });

      const localMessage = {
        id: `temp-${Date.now()}`,
        user: "Tú",
        text: "[Imagen]",
        image: image.uri,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "sending",
        isMyMessage: true
      };
      setMessages(prev => [...prev, localMessage]);

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
        console.error("Error sending image:", data);
        showAlert("No se pudo enviar la imagen", "error");
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
      console.error("Error in sendImage:", error);
      showAlert("Ocurrió un error al enviar la imagen", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Función para seleccionar y enviar imágenes
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
      sendImage(result.assets ? result.assets[0] : result);
    }
  };

  // Renderizar mensajes
  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageWrapper,
      item.isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper
    ]}>
      <View style={[
        styles.bubble,
        item.isMyMessage ? styles.myBubble : styles.otherBubble
      ]}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.messageImage} />
        ) : (
          <Text style={[
            styles.messageText,
            item.isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {typeof item.text === 'string' ? item.text : ''}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Text style={[styles.time, item.isMyMessage ? styles.myTime : styles.otherTime]}>
            {typeof item.time === 'string' ? item.time : ''}
          </Text>
          {item.status === "sending" && <Text style={styles.statusSending}>enviando</Text>}
          {item.status === "error" && <Text style={styles.statusError}>error</Text>}
          {item.isMyMessage && item.status !== "sending" && item.status !== "error" && (
            <Feather name="check" size={10} color="rgba(255,255,255,0.7)" />
          )}
        </View>
      </View>
    </View>
  )

  const flatListRef = useRef(null);

  const quickReplies = ['Ya voy en camino', 'Estoy afuera', 'Ya viene?'];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.chatContainer}>
          {isLoadingHistory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF5500" />
              <Text style={styles.loadingText}>Cargando mensajes anteriores...</Text>
            </View>
          ) : (
              <FlatList
                ref={flatListRef}
                style={styles.messagesList}
                inverted
                data={[...messages].reverse()}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderMessage}
                onRefresh={fetchPreviousMessages}
                refreshing={isLoadingHistory}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.messagesContent}
              />
          )}
        </View>

        {/* Quick replies */}
        <View style={styles.quickReplies}>
          {quickReplies.map((q) => (
            <TouchableOpacity key={q} style={styles.quickReply} onPress={() => { setInputText(q); }} activeOpacity={0.8}>
              <Text style={styles.quickReplyText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.iconButton} onPress={handlePickImageAndSend}>
            <Feather name="camera" size={22} color="#64748B" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            editable={!isLoading}
            multiline={true}
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={isLoading || !inputText.trim()}
            activeOpacity={0.8}
          >
            {isLoading ? (
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF"
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
    fontFamily: "Montserrat",
    fontSize: 13,
  },
  emptyChat: {
    padding: 20,
    alignItems: "center",
  },
  emptyChatText: {
    color: "#94A3B8",
    fontSize: 14,
    fontFamily: "Montserrat",
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
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 40,
    alignItems: "center",
  },
  quickReply: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    justifyContent: "center",
  },
  quickReplyText: {
    fontSize: 11,
    fontFamily: "Montserrat",
    color: "#0F172A",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
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
    marginBottom: Platform.OS === 'ios' ? 0 : -2,
  },
  sendButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    marginBottom: Platform.OS === 'ios' ? 0 : -2,
  }
});

export default ChatUsuario;