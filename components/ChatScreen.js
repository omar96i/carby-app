import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image, Alert, ActivityIndicator } from "react-native";
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "../constants/url";
import * as ImagePicker from "expo-image-picker";
import { useNotification } from "../context/NotificationContext";


const ChatScreen = ({ tripId }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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
        Alert.alert("Error", "No se encontró la información de autenticación");
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
        Alert.alert("Error", "No se pudo enviar el mensaje");
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
      Alert.alert("Error", "Ocurrió un error al enviar el mensaje");
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
        Alert.alert("Error", "No se encontró la información de autenticación");
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
        Alert.alert("Error", "No se pudo enviar la imagen");
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
      Alert.alert("Error", "Ocurrió un error al enviar la imagen");
    } finally {
      setIsLoading(false);
    }
  };
  const handlePickImageAndSend = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a tu galería para enviar imágenes');
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
              ? `${BASE_URL.toString().replace("/api/", "")}/storage/${messageContent.content}`
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
          <ActivityIndicator size="large" color="#1E7D22" />
          <Text style={styles.loadingText}>Cargando mensajes anteriores...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyChat}>
          <Text style={styles.emptyChatText}>No hay mensajes aún</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item, index) => `${item.id || index}`}
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
              {/* Mostrar texto del mensaje si existe */}
              {item.text && (
                <Text style={[
                  styles.messageText,
                  item.isMyMessage ? styles.myMessageText : styles.otherMessageText
                ]}>
                  {item.text}
                </Text>
              )}
              {/* Mostrar imagen si existe */}
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
          <FontAwesome name="camera" size={24} color="black" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          value={inputText}
          onChangeText={setInputText}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={isLoading || !inputText.trim()}
        >
          <FontAwesome
            name={isLoading ? "circle-o-notch" : "paper-plane"}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#F5F5F5",
    marginBottom: 70,
    borderRadius: 20,
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
    padding: 20,
    alignItems: "center",
  },
  emptyChatText: {
    color: "#999",
    fontSize: 14,
  },
  messageContainer: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    maxWidth: '85%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end', // Mensajes del usuario a la derecha
    backgroundColor: "#4CAF50", // Verde para mensajes del usuario
  },
  otherMessageContainer: {
    alignSelf: 'flex-start', // Mensajes del rider a la izquierda
    backgroundColor: "white", // Blanco para mensajes del rider
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  userName: {
    fontWeight: "bold",
    fontSize: 16,
  },
  myUserName: {
    color: "white", // Texto blanco para mensajes del usuario (sobre fondo verde)
  },
  otherUserName: {
    color: "#333", // Texto oscuro para mensajes del rider (sobre fondo blanco)
  },
  time: {
    fontWeight: "normal",
    fontSize: 12,
    color: "gray",
  },
  myTime: {
    color: "rgba(255,255,255,0.8)", // Tiempo en blanco semi-transparente para mensajes del usuario
  },
  otherTime: {
    color: "gray", // Tiempo gris para mensajes del rider
  },
  statusSending: {
    fontWeight: "normal",
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },
  statusError: {
    fontWeight: "normal",
    fontSize: 12,
    color: "red",
    fontStyle: "italic",
  },
  messageText: {
    fontSize: 14,
    marginTop: 5,
  },
  myMessageText: {
    color: "white", // Texto blanco para mensajes del usuario
  },
  otherMessageText: {
    color: "#333", // Texto oscuro para mensajes del rider
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
  },
  sendButton: {
    backgroundColor: "green",
    padding: 10,
    borderRadius: 30,
    marginLeft: 5,
  },
  sendButtonDisabled: {
    backgroundColor: "#aaa",
  },
  iconButton: {
    padding: 5,
  }
});

export default ChatScreen;