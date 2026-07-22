import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Keyboard, Platform, TouchableWithoutFeedback } from "react-native";
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { BASE_URL } from "../constants/url";
import { useNotification } from "../context/NotificationContext";

const ChatUsuario = ({ tripId }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

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
        Alert.alert("Error", "No se encontró la información de autenticación");
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

  // Función para enviar imágenes
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

  // Función para seleccionar y enviar imágenes
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
      sendImage(result.assets ? result.assets[0] : result);
    }
  };

  // Renderizar mensajes
  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
    ]}>
      <View style={styles.userContainer}>
        <Text style={[
          styles.userName,
          item.isMyMessage ? styles.myUserName : styles.otherUserName
        ]}>
          {typeof item.user === 'string' ? item.user : ''}
        </Text>
        <View style={styles.messageMetadata}>
          <Text style={styles.time}>{typeof item.time === 'string' ? item.time : ''}</Text>
          {item.status === "sending" && <Text style={styles.statusSending}> • enviando...</Text>}
          {item.status === "error" && <Text style={styles.statusError}> • error</Text>}
        </View>
      </View>
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
    </View>
  )

  const flatListRef = useRef(null);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} // ajusta según el header de tu navegación
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <View style={styles.chatContainer}>
            {isLoadingHistory ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fa6205" />
                <Text style={styles.loadingText}>Cargando mensajes anteriores...</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderMessage}
                onRefresh={fetchPreviousMessages}
                refreshing={isLoadingHistory}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingVertical: 10 }}
              />
            )}
          </View>

          <View style={[styles.inputContainer, { marginBottom: keyboardVisible ? 200 : 10 }]}>
            <TouchableOpacity style={styles.iconButton} onPress={handlePickImageAndSend}>
              <FontAwesome name="camera" size={24} color="black" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje..."
              value={inputText}
              onChangeText={setInputText}
              editable={!isLoading}
              multiline={true}
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={isLoading || !inputText.trim()}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <FontAwesome name="paper-plane" size={24} color="#000" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5"
  },
  chatContainer: {
    flex: 1,
    padding: 10,
  },
  messagesList: {
    flex: 1,
    marginBottom: 10,
  },
  messageMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 5,
    resizeMode: 'contain',
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
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end', // Mensajes del usuario a la derecha
    backgroundColor: "#fa6205", // Verde para mensajes del usuario
  },
  otherMessageContainer: {
    alignSelf: 'flex-start', // Mensajes del rider a la izquierda
    backgroundColor: "white", // Blanco para mensajes del rider
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  userName: {
    fontWeight: "bold",
    fontSize: 16,
  },
  myUserName: {
    color: "black", // Texto negro para mensajes del usuario (sobre fondo verde)
  },
  otherUserName: {
    color: "#333", // Texto oscuro para mensajes del rider (sobre fondo blanco)
  },
  time: {
    fontWeight: "normal",
    fontSize: 12,
    color: "gray",
    marginLeft: 5,
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
    color: "black", // Texto negro para mensajes del usuario
  },
  otherMessageText: {
    color: "#333", // Texto oscuro para mensajes del rider
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "white",
    borderRadius: 25,
    paddingHorizontal: 10,
    paddingVertical: 8,
    margin: 10,
    marginBottom: Platform.OS === 'ios' ? 10 : 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#fa6205",
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

export default ChatUsuario;