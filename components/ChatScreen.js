import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image, ActivityIndicator, Platform } from "react-native";
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "../constants/url";
import * as ImagePicker from "expo-image-picker";
import { useNotification } from "../context/NotificationContext";
import AlertaModal from "../components/ErrorModal";


const ChatScreen = ({ tripId }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  useEffect(() => {
    console.log("ChatScreen received tripId:", tripId);
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

      // 🔥 Escapar doblemente el JSON como string plano
      const rawMessage = {
        type: "text",
        content: inputText
      };
      const escapedJson = JSON.stringify(rawMessage).replace(/"/g, '\\"');
      formData.append("message", `"${escapedJson}"`);

      // Mensaje local
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

      // Enviar mensaje vacío o de tipo imagen si tu backend lo requiere
      const message = {
        type: "image",
        content: "Imagen enviada"
      };
      const escapedJson = JSON.stringify(message).replace(/"/g, '\\"');
      formData.append("message", `"${escapedJson}"`);

      // Agregar archivo
      formData.append("image", {
        uri: image.uri,
        name: "photo.jpg",
        type: "image/jpeg"
      });

      // Mensaje local
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
      sendImage(result.assets ? result.assets[0] : result); // Compatibilidad con nuevas versiones
    }
  };


  // Function to fetch previous messages
  const fetchPreviousMessages = async () => {
    if (!tripId) return;

    setIsLoadingHistory(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      const userId = await AsyncStorage.getItem("userId");
      const userData = await AsyncStorage.getItem("userData");

      if (!token || !userId) {
        console.error("Authentication token not found");
        return;
      }

      // Obtener información del usuario actual para identificar mensajes
      let currentUserId = userId; // Usar userId como respaldo

      // Intentar obtener de userData si está disponible
      if (userData) {
        try {
          const userInfo = JSON.parse(userData);
          currentUserId = userInfo.id || userId;
        } catch (e) {
          console.error("Error parsing userData:", e);
        }
      }

      console.log('ChatScreen - fetchPreviousMessages:', {
        tripId,
        userId,
        currentUserId,
        currentUserIdType: typeof currentUserId,
        hasToken: !!token,
        hasUserData: !!userData
      });

      console.log(`Fetching chat messages for trip: ${tripId}`);
      console.log(`${BASE_URL}carrera-chat/${tripId}/messages`)
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
      console.log("Chat history received:", data);      // Transform API response to match our message format
      if (data.data && Array.isArray(data.data)) {
        const formattedMessages = data.data.map(msg => {
          // Parse the message JSON if needed
          let messageContent;
          try {
            messageContent = JSON.parse(msg.message);
          } catch (e) {
            messageContent = { content: msg.message, type: 'text' };
          }

          // Determinar si el mensaje es del usuario actual o del rider
          let isFromCurrentUser = false;
          let isFromRider = false;

          // Opción 1: Comparar con usuario_id del mensaje
          if (msg.usuario_id && currentUserId &&
            msg.usuario_id.toString() === currentUserId.toString()) {
            isFromCurrentUser = true;
          }
          // Opción 2: Si el conductor_id coincide con el usuario actual
          else if (msg.conductor_id && currentUserId &&
            msg.conductor_id.toString() === currentUserId.toString()) {
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
            sender = "Usuario";
            isMyMessage = false;
          }

          console.log('ChatScreen - Procesando mensaje:', {
            messageId: msg.id,
            usuario_id: msg.usuario_id,
            conductor_id: msg.conductor_id,
            currentUserId: currentUserId,
            currentUserIdType: typeof currentUserId,
            isFromCurrentUser,
            isFromRider,
            sender,
            isMyMessage
          });

          return {
            id: msg.id.toString(),
            user: sender,
            text: messageContent.type === "text" ? messageContent.content : "",
            image: messageContent.type === "file"
              ? `${BASE_URL.toString().replace("/api", "")}storage/${messageContent.content}`
              : null,
            time: new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            status: "sent",
            isMyMessage: isMyMessage
          };
        });

        console.log('ChatScreen - Mensajes procesados:', {
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


  return (
    <View style={styles.container}>
      {isLoadingHistory ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa6205" />
          <Text style={styles.loadingText}>Cargando mensajes anteriores...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyChat}>
          <FontAwesome name="commenting-o" size={40} color="#CCC" />
          <Text style={styles.emptyChatText}>No hay mensajes aún</Text>
          <Text style={{ color: '#aaa', fontSize: 13, marginTop: 4 }}>Envía un mensaje para iniciar</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item, index) => `${item.id || index}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          renderItem={({ item }) => (
            <View style={[
              styles.messageContainer,
              item.isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
            ]}>
              <View style={styles.messageHeader}>
                <Text style={[
                  styles.userName,
                  item.isMyMessage ? styles.myUserName : styles.otherUserName
                ]}>
                  {item.user}
                </Text>
                <Text style={[
                  styles.time,
                  item.isMyMessage ? styles.myTime : styles.otherTime
                ]}>
                  {item.time}
                </Text>
                {item.status === "sending" && <Text style={styles.statusSending}>enviando...</Text>}
                {item.status === "error" && <Text style={styles.statusError}>error</Text>}
              </View>
              {item.text && (
                <Text style={[
                  styles.messageText,
                  item.isMyMessage ? styles.myMessageText : styles.otherMessageText
                ]}>
                  {item.text}
                </Text>
              )}
              {item.image && (
                <Image
                  source={{ uri: item.image }}
                  style={styles.messageImage}
                  resizeMode="contain"
                />
              )}
            </View>
          )}
          onRefresh={fetchPreviousMessages}
          refreshing={isLoadingHistory}
        />
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.iconButton} onPress={handlePickImageAndSend}>
          <FontAwesome name="camera" size={20} color="#fa6205" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          editable={!isLoading}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (isLoading || !inputText.trim()) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={isLoading || !inputText.trim()}
        >
          <FontAwesome
            name={isLoading ? "circle-o-notch" : "paper-plane"}
            size={18}
            color="white"
          />
        </TouchableOpacity>
      </View>
      <AlertaModal
        visible={alertVisible}
        mensaje={alertData.message}
        tipo={alertData.type}
        onCerrar={() => setAlertVisible(false)}
        onPrimary={alertData.onPrimary}
        primaryLabel={alertData.primaryLabel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: "#F5F0E8",
  },
  messageImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  tripIdText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
  },
  emptyChat: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyChatText: {
    color: "#999",
    fontSize: 14,
  },
  messageContainer: {
    padding: 12,
    paddingBottom: 8,
    borderRadius: 20,
    marginVertical: 4,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
    backgroundColor: "#fa6205",
    borderBottomRightRadius: 4,
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    backgroundColor: "#FFF",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 12,
    fontFamily: 'MontserratBold',
  },
  myUserName: {
    color: "rgba(255,255,255,0.9)",
  },
  otherUserName: {
    color: "#fa6205",
  },
  time: {
    fontSize: 11,
    color: "gray",
    marginLeft: 8,
  },
  myTime: {
    color: "rgba(255,255,255,0.6)",
  },
  otherTime: {
    color: "#bbb",
  },
  statusSending: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    fontStyle: "italic",
    marginLeft: 4,
  },
  statusError: {
    fontSize: 11,
    color: "#FF4757",
    fontStyle: "italic",
    marginLeft: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'MontserratRegular',
  },
  myMessageText: {
    color: "#FFF",
  },
  otherMessageText: {
    color: "#1C1C1E",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
    borderTopWidth: 1,
    borderTopColor: "#EAE5DC",
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F0E8",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 80,
    color: "#1C1C1E",
    marginHorizontal: 8,
  },
  sendButton: {
    backgroundColor: "#fa6205",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#C9C2B5",
    shadowOpacity: 0,
    elevation: 0,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF0E5",
    justifyContent: "center",
    alignItems: "center",
  }
});

export default ChatScreen;