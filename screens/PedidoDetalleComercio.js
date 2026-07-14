import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons, FontAwesome, MaterialIcons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_600SemiBold,
  Montserrat_500Medium,
  Montserrat_300Light,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../constants/url";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useNotification } from "../context/NotificationContext";

const { width } = Dimensions.get("window");

const PedidoDetalleComercio = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { pedidoId, pedidoData } = route.params || {};

  // --- LÓGICA DE ESTADOS (INTACTA) ---
  const [pedido, setPedido] = useState(pedidoData || null);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // Estados para chat
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatImage, setChatImage] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const chatScrollViewRef = useRef(null);

  // Estados para acciones del pedido
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Cargar fuentes
  const [fontsLoaded] = useFonts({
    MontserratRegular: Montserrat_400Regular,
    MontserratBold: Montserrat_700Bold,
    MontserratSemiBold: Montserrat_600SemiBold,
    MontserratMedium: Montserrat_500Medium,
    MontserratLight: Montserrat_300Light,
  });

  const [fontTimeout, setFontTimeout] = useState(false);
  const { expoPushToken, notification } = useNotification();

  useEffect(() => {
    if (notification) {
      loadChatMessages()
    }
  }, [notification]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!fontsLoaded) {
        setFontTimeout(true);
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [fontsLoaded]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        const userInfoData = userData ? JSON.parse(userData) : null;
        setUserInfo(userInfoData);

        if (pedidoData) {
          setPedido(pedidoData);
        } else if (pedidoId) {
          setLoading(true);
          await fetchPedidoDetails();
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        setLoading(false);
      }
    };
    loadInitialData();
  }, [pedidoId, pedidoData]);

  const fetchPedidoDetails = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token || !pedidoId) throw new Error("Token o ID no disponible");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${BASE_URL}pedidos/${pedidoId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Error ${response.status}`);
      const data = await response.json();
      setPedido(data.pedido || data);
    } catch (error) {
        console.error(error);
        Alert.alert("Error", "No se pudieron cargar los detalles.");
    } finally {
      setLoading(false);
    }
  };

  const loadChatMessages = async () => {
    try {
      setLoadingChat(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token || !pedidoId || !userInfo) return;

      const response = await fetch(`${BASE_URL}pedido-chat/messages/${pedidoId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const messages = data.data || data.messages || data || [];
        const messagesWithUserInfo = messages.map((msg) => ({
          ...msg,
          currentNegocioId: userInfo.id,
        }));
        setChatMessages(messagesWithUserInfo);
        setTimeout(() => {
          chatScrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error("Error loading chat:", error);
    } finally {
      setLoadingChat(false);
    }
  };

  const pickChatImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permisos requeridos", "Necesitamos acceso a tu galería.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const manipResult = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 800 } }],
          { format: SaveFormat.JPEG, compress: 0.7 }
        );
        setChatImage(manipResult.uri);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo seleccionar la imagen.");
    }
  };

  const sendChatMessage = async () => {
    if (!newMessage.trim() && !chatImage) {
      Alert.alert("Error", "Escribe un mensaje o selecciona imagen.");
      return;
    }
    setSendingMessage(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token || !userInfo) throw new Error("Auth error");

      const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
      let requestBody;

      if (chatImage) {
        const formData = new FormData();
        formData.append("pedido_id", pedidoId.toString());
        formData.append("negocio_id", userInfo.id.toString());
        
        const rawMessage = { type: "text", content: newMessage.trim() };
        const escapedJson = JSON.stringify(rawMessage).replace(/"/g, '\\"');
        formData.append("message", `"${escapedJson}"`);

        const filename = chatImage.split("/").pop();
        formData.append("image", {
          uri: Platform.OS === "ios" ? chatImage.replace("file://", "") : chatImage,
          name: filename || "image.jpg",
          type: "image/jpeg",
        });
        requestBody = formData;
      } else {
        headers["Content-Type"] = "application/json";
        const rawMessage = { type: "text", content: newMessage.trim() };
        const escapedJson = JSON.stringify(rawMessage).replace(/"/g, '\\"');
        requestBody = JSON.stringify({
          pedido_id: parseInt(pedidoId),
          negocio_id: parseInt(userInfo.id),
          message: `"${escapedJson}"`,
        });
      }

      const response = await fetch(`${BASE_URL}pedido-chat/send`, {
        method: "POST",
        headers: headers,
        body: requestBody,
      });

      if (!response.ok) throw new Error("Error envío");

      setNewMessage("");
      setChatImage(null);
      await loadChatMessages();
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar el mensaje");
    } finally {
      setSendingMessage(false);
    }
  };

  const updatePedidoStatus = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("No token");

      const response = await fetch(`${BASE_URL}pedidos/${pedidoId}/status`, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estado: newStatus }),
      });

      if (!response.ok) throw new Error("Error status");

      setPedido((prev) => ({ ...prev, estado: newStatus }));
      Alert.alert("Éxito", `Estado actualizado a: ${newStatus}`);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el estado");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const cancelarPedido = async (pedidoId, carreraId = null) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("No token");

      const responsePedido = await fetch(`${BASE_URL}pedidos/update/aux/${pedidoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ estado: 'cancelado' }),
      });

      if (!responsePedido.ok) throw new Error("Error cancel pedido");

      if (carreraId) {
        await fetch(`${BASE_URL}carreras/${carreraId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ estado: 'cancelado' }),
        });
      }
      navigation.goBack();
      Alert.alert("Éxito", "Pedido cancelado correctamente.");
    } catch (error) {
      Alert.alert("Error", "No se pudo cancelar el pedido.");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // --- ARRAYS DE PASOS (RESTAURADOS) ---
  const pasosRestaurante = [
    { key: 'pendiente', label: 'Pendiente', icon: 'clock-o' },
    { key: 'aceptado', label: 'Preparando', icon: 'fire' },
    { key: 'completado', label: 'Listo', icon: 'check-circle' },
  ];

  const pasosConductor = [
    { key: 'pendiente', label: 'Buscando', icon: 'search' },
    { key: 'aceptado', label: 'En camino', icon: 'motorcycle' },
    { key: 'completado', label: 'Entregado', icon: 'check-circle' },
  ];

  // --- CÁLCULO PAGO AL CONDUCTOR ---
  const calculateDriverPay = () => {
    if (!pedido || !pedido.pedido_lists) return 0;
    const totalProductos = pedido.pedido_lists.reduce((total, prod) => {
        const precioBase = parseFloat(prod.producto?.precio || prod.precio_unitario || 0);
        let adicionales = [];
        try {
             if (prod.adicionales) {
                adicionales = typeof prod.adicionales === "string" ? JSON.parse(prod.adicionales) : (Array.isArray(prod.adicionales) ? prod.adicionales : []);
             }
             if (adicionales.length === 0 && prod.pedido_list_adicionals) {
                 const list = typeof prod.pedido_list_adicionals === "string" ? JSON.parse(prod.pedido_list_adicionals) : (Array.isArray(prod.pedido_list_adicionals) ? prod.pedido_list_adicionals : []);
                 adicionales = list.filter(ad => ad.producto_id === prod.producto_id || ad.producto_id === prod.id || ad.pedido_list_id === prod.id);
             }
             if (adicionales.length === 0 && pedido.pedido_list_adicionals) {
                 const list = typeof pedido.pedido_list_adicionals === "string" ? JSON.parse(pedido.pedido_list_adicionals) : (Array.isArray(pedido.pedido_list_adicionals) ? pedido.pedido_list_adicionals : []);
                 adicionales = list.filter(ad => ad.producto_id === prod.producto_id || ad.producto_id === prod.id || ad.pedido_list_id === prod.id);
             }
        } catch (e) { adicionales = []; }

        const precioAdicionales = adicionales.reduce((acc, ad) => {
             const p = parseFloat(ad.producto_adicional?.precio || ad.precio || 0);
             return acc + (p * parseInt(ad.cantidad || 1));
        }, 0);
        return total + ((precioBase + precioAdicionales) * parseInt(prod.cantidad || 1));
    }, 0);

    const costoTotal = parseFloat(pedido.costo_total || 0);
    const pagoDriver = costoTotal - totalProductos;
    return Math.max(0, pagoDriver);
  };

  // --- RENDERIZADO DEL CHAT ---
  const renderChatMessage = (message, index) => {
    const isMyMessage = message.negocio_id && message.negocio_id.toString() === message.currentNegocioId?.toString();
    let messageContent = "";
    try {
      if (message.message && typeof message.message === "string") {
        const parsed = JSON.parse(message.message);
        messageContent = parsed.content || parsed.text || message.message;
      } else {
        messageContent = message.message || "";
      }
    } catch { messageContent = message.message || ""; }

    return (
      <View key={index} style={[styles.msgContainer, isMyMessage ? styles.msgMy : styles.msgOther]}>
        {!isMyMessage && (
          <Text style={styles.msgSender}>{message.usuario?.nombre_completo || "Cliente"}</Text>
        )}
        <Text style={[styles.msgText, isMyMessage ? styles.msgTextMy : styles.msgTextOther]}>{messageContent}</Text>
        {message.image_url && <Image source={{ uri: message.image_url }} style={styles.msgImage} resizeMode="cover" />}
        <Text style={[styles.msgTime, isMyMessage ? styles.msgTimeMy : styles.msgTimeOther]}>{formatDate(message.created_at)}</Text>
      </View>
    );
  };

  if (loading || (!fontsLoaded && !fontTimeout)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#A0FF00" />
          <Text style={styles.loadingText}>Cargando pedido...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!pedido) return null;
  const pagoConductor = calculateDriverPay();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pedido #{pedido.id}</Text>
        <View style={{width: 32}} /> 
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{paddingBottom: 40}}>
        
        {/* STATUS & PRICE CARD */}
        <View style={styles.card}>
            <View style={styles.statusRow}>
                <View>
                    <Text style={styles.label}>Estado Actual</Text>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{pedido.estado.toUpperCase()}</Text>
                    </View>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                    <Text style={styles.label}>Total Pedido</Text>
                    <Text style={styles.totalPrice}>S/{parseFloat(pedido.costo_total).toLocaleString()}</Text>
                </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.dateRow}>
                <Feather name="calendar" size={14} color="#888" />
                <Text style={styles.dateText}> {formatDate(pedido.created_at)}</Text>
            </View>
        </View>

        {/* --- PAGO AL CONDUCTOR --- */}
        <View style={styles.driverPayCard}>
            <View style={styles.driverPayRow}>
                <MaterialCommunityIcons name="cash-fast" size={24} color="#121212" />
                <Text style={styles.driverPayLabel}>Pago por servicio de delivery:</Text>
            </View>
            <Text style={styles.driverPayValue}>
                S/{pagoConductor.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
        </View>

        {/* --- SECCIÓN DE SEGUIMIENTO (RESTAURADA) --- */}
        {/* PASOS RESTAURANTE */}
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Estado del Pedido (Restaurante)</Text>
            <View style={styles.pasosContainer}>
                {pasosRestaurante.map((paso, index) => {
                    const currentIndex = pasosRestaurante.findIndex(p => p.key === pedido.estado);
                    const isActive = paso.key === pedido.estado;
                    const isCompleted = currentIndex > index;
                    return (
                        <View key={paso.key} style={styles.paso}>
                            <FontAwesome
                                name={paso.icon}
                                size={22}
                                color={isCompleted || isActive ? '#A0FF00' : '#444'}
                            />
                            <Text style={[
                                styles.pasoTexto,
                                isActive && styles.pasoTextoActivo,
                                isCompleted && styles.pasoTextoCompletado,
                            ]}>
                                {paso.label}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>

        {/* PASOS CONDUCTOR */}
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Estado del Delivery (Conductor)</Text>
            <View style={styles.pasosContainer}>
                {!pedido.carrera ? (
                    // Caso: No hay carrera asignada
                    pasosConductor.map(paso => (
                        <View key={paso.key} style={styles.paso}>
                            <FontAwesome name={paso.icon} size={22} color="#444" />
                            <Text style={[styles.pasoTexto, { color: '#555' }]}>{paso.label}</Text>
                        </View>
                    ))
                ) : (
                    // Caso: Sí hay carrera
                    pasosConductor.map((paso, index) => {
                        const currentIndex = pasosConductor.findIndex(p => p.key === pedido.carrera.estado);
                        const isActive = paso.key === pedido.carrera.estado;
                        const isCompleted = currentIndex > index;
                        return (
                            <View key={paso.key} style={styles.paso}>
                                <FontAwesome
                                    name={paso.icon}
                                    size={22}
                                    color={isCompleted || isActive ? '#A0FF00' : '#444'}
                                />
                                <Text style={[
                                    styles.pasoTexto,
                                    isActive && styles.pasoTextoActivo,
                                    isCompleted && styles.pasoTextoCompletado,
                                ]}>
                                    {paso.label}
                                </Text>
                            </View>
                        );
                    })
                )}
            </View>
        </View>

        {/* CLIENTE */}
        <View style={styles.card}>
            <View style={styles.rowBetween}>
                <View style={{flex: 1}}>
                    <Text style={styles.cardTitle}>Cliente</Text>
                    <Text style={styles.clientName}>{pedido.user?.nombre_completo || "Cliente Anónimo"}</Text>
                    {pedido.user?.telefono && (
                         <View style={styles.phoneRow}>
                             <Feather name="phone" size={14} color="#CCC" />
                             <Text style={styles.clientPhone}> {pedido.user.telefono}</Text>
                         </View>
                    )}
                </View>
                <TouchableOpacity 
                    style={styles.chatBtn}
                    onPress={() => { setShowChatModal(true); loadChatMessages(); }}
                >
                    <Feather name="message-circle" size={24} color="#121212" />
                </TouchableOpacity>
            </View>
        </View>

        {/* PRODUCTOS */}
        {pedido.pedido_lists && pedido.pedido_lists.length > 0 && (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Productos ({pedido.pedido_lists.length})</Text>
                {pedido.pedido_lists.map((producto, index) => {
                    // (Lógica reutilizada de precio y adicionales)
                    let adicionales = [];
                    try {
                        if (producto.adicionales) adicionales = typeof producto.adicionales === "string" ? JSON.parse(producto.adicionales) : (Array.isArray(producto.adicionales) ? producto.adicionales : []);
                        if (adicionales.length === 0 && producto.pedido_list_adicionals) {
                            const list = typeof producto.pedido_list_adicionals === "string" ? JSON.parse(producto.pedido_list_adicionals) : (Array.isArray(producto.pedido_list_adicionals) ? producto.pedido_list_adicionals : []);
                            adicionales = list.filter(ad => ad.producto_id === producto.producto_id || ad.producto_id === producto.id || ad.pedido_list_id === producto.id);
                        }
                        if (adicionales.length === 0 && pedido.pedido_list_adicionals) {
                            const list = typeof pedido.pedido_list_adicionals === "string" ? JSON.parse(pedido.pedido_list_adicionals) : (Array.isArray(pedido.pedido_list_adicionals) ? pedido.pedido_list_adicionals : []);
                            adicionales = list.filter(ad => ad.producto_id === producto.producto_id || ad.producto_id === producto.id || ad.pedido_list_id === producto.id);
                        }
                    } catch (e) { adicionales = []; }

                    const precioBase = parseFloat(producto.producto?.precio || producto.precio_unitario || 0);
                    const precioAdicionales = adicionales.reduce((acc, ad) => acc + (parseFloat(ad.producto_adicional?.precio || ad.precio || 0) * parseInt(ad.cantidad || 1)), 0);
                    const precioTotalItem = (precioBase + precioAdicionales) * producto.cantidad;

                    return (
                        <View key={index} style={styles.productRow}>
                            <View style={styles.qtyBox}>
                                <Text style={styles.qtyText}>{producto.cantidad}x</Text>
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.prodName}>{producto.producto?.nombre || producto.producto_nombre || "Item"}</Text>
                                {(producto.producto?.variante || producto.variante) && (
                                    <Text style={styles.variantText}>{producto.producto?.variante || producto.variante}</Text>
                                )}
                                {adicionales.map((ad, i) => (
                                    <Text key={i} style={styles.addText}>+ {ad.producto_adicional?.nombre || ad.nombre} (x{ad.cantidad || 1})</Text>
                                ))}
                            </View>
                            <Text style={styles.prodPrice}>S/{precioTotalItem.toFixed(2)}</Text>
                        </View>
                    );
                })}
            </View>
        )}

        {/* PAGO */}
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Método de Pago</Text>
            <View style={styles.rowBetween}>
                <Text style={styles.payLabel}>Tipo</Text>
                <Text style={styles.payValue}>
                    {pedido.metodo_pago === "mercadopago" ? "Mercado Pago" : pedido.metodo_pago === "qr" ? "QR" : "Efectivo"}
                </Text>
            </View>
            <View style={styles.rowBetween}>
                <Text style={styles.payLabel}>Estado</Text>
                <Text style={[styles.payValue, {color: pedido.estado_pago === 'pagado' ? '#A0FF00' : '#FF4757'}]}>
                    {pedido.estado_pago || "Pendiente"}
                </Text>
            </View>
        </View>

        {/* ACCIONES DEL COMERCIO */}
        <View style={styles.actionsContainer}>
            {pedido.estado === "pendiente" && (
                <TouchableOpacity style={[styles.mainBtn, {backgroundColor: '#4CAF50'}]} onPress={() => updatePedidoStatus("confirmado")} disabled={updatingStatus}>
                     {updatingStatus ? <ActivityIndicator color="#FFF"/> : <Text style={styles.mainBtnText}>Aceptar Pedido</Text>}
                </TouchableOpacity>
            )}
            {pedido.estado === "confirmado" && (
                <TouchableOpacity style={[styles.mainBtn, {backgroundColor: '#A0FF00'}]} onPress={() => updatePedidoStatus("preparado")} disabled={updatingStatus}>
                     {updatingStatus ? <ActivityIndicator color="#000"/> : <Text style={[styles.mainBtnText, {color: '#000'}]}>Marcar Preparado</Text>}
                </TouchableOpacity>
            )}
            {pedido.estado === "preparado" && (
                <TouchableOpacity style={[styles.mainBtn, {backgroundColor: '#2196F3'}]} onPress={() => updatePedidoStatus("entregado")} disabled={updatingStatus}>
                     {updatingStatus ? <ActivityIndicator color="#FFF"/> : <Text style={styles.mainBtnText}>Marcar Entregado</Text>}
                </TouchableOpacity>
            )}

            {/* BOTÓN CANCELAR */}
            {pedido.estado !== 'completado' && pedido.estado !== 'cancelado' && pedido.estado !== 'entregado' && (
                <TouchableOpacity 
                    style={styles.cancelBtn} 
                    onPress={() => Alert.alert("Cancelar", "¿Seguro que deseas cancelar?", [{ text: "No" }, { text: "Sí", onPress: () => cancelarPedido(pedido.id, pedido.carrera?.id) }])}
                >
                    <Text style={styles.cancelText}>Cancelar Pedido</Text>
                </TouchableOpacity>
            )}
        </View>

      </ScrollView>

      {/* MODAL CHAT */}
      <Modal visible={showChatModal} animationType="slide" onRequestClose={() => setShowChatModal(false)}>
         <SafeAreaView style={styles.chatContainer}>
            <View style={styles.chatHeader}>
                <TouchableOpacity onPress={() => setShowChatModal(false)}><Ionicons name="close" size={28} color="#FFF"/></TouchableOpacity>
                <Text style={styles.chatHeaderTitle}>Chat Pedido #{pedido.id}</Text>
                <View style={{width: 28}} />
            </View>
            
            <ScrollView 
                ref={chatScrollViewRef} 
                style={styles.msgList} 
                contentContainerStyle={{padding: 20}}
                onContentSizeChange={() => chatScrollViewRef.current?.scrollToEnd({animated: true})}
            >
                 {loadingChat ? <ActivityIndicator color="#A0FF00" /> : chatMessages.length === 0 ? <Text style={styles.emptyChat}>Inicia la conversación...</Text> : chatMessages.map(renderChatMessage)}
            </ScrollView>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inputArea}>
                {chatImage && (
                    <View style={styles.imgPreviewBox}>
                        <Image source={{ uri: chatImage }} style={styles.imgPreview} />
                        <TouchableOpacity style={styles.delImgBtn} onPress={() => setChatImage(null)}><Ionicons name="close" size={16} color="#FFF"/></TouchableOpacity>
                    </View>
                )}
                <View style={styles.inputRow}>
                    <TouchableOpacity onPress={pickChatImage} style={styles.attachBtn}><Ionicons name="camera" size={24} color="#A0FF00"/></TouchableOpacity>
                    <TextInput 
                        style={styles.textInput} 
                        placeholder="Escribe aquí..." 
                        placeholderTextColor="#777" 
                        value={newMessage} 
                        onChangeText={setNewMessage} 
                        multiline 
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={sendChatMessage} disabled={sendingMessage}>
                        {sendingMessage ? <ActivityIndicator size="small" color="#000"/> : <Ionicons name="send" size={20} color="#000" />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
         </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#121212" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#A0FF00", marginTop: 10, fontFamily: "MontserratMedium" },
  
  // HEADER
  header: { 
      flexDirection: "row", 
      alignItems: "center", 
      justifyContent: "space-between", 
      paddingHorizontal: 20, 
      paddingVertical: 15, 
      paddingTop: 30,
      borderBottomWidth: 1, 
      borderBottomColor: "#252525" 
  },
  headerTitle: { color: "#FFF", fontSize: 18, fontFamily: "MontserratBold" },
  backBtn: { padding: 5 },

  scroll: { flex: 1, paddingHorizontal: 20 },

  // CARDS GENERICS
  card: {
      backgroundColor: "#1E1E1E",
      borderRadius: 16,
      padding: 16,
      marginTop: 20,
      borderWidth: 1,
      borderColor: "#2C2C2C"
  },
  cardTitle: { color: "#FFF", fontFamily: "MontserratBold", fontSize: 16, marginBottom: 12 },
  
  // STATUS CARD SPECIFIC
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: "#888", fontSize: 12, fontFamily: "MontserratMedium", marginBottom: 4 },
  statusBadge: { backgroundColor: "rgba(160, 255, 0, 0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: "#A0FF00", fontFamily: "MontserratBold", fontSize: 12 },
  totalPrice: { color: "#FFF", fontFamily: "MontserratBold", fontSize: 20 },
  divider: { height: 1, backgroundColor: "#2C2C2C", marginVertical: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateText: { color: "#888", fontSize: 12, fontFamily: "MontserratRegular" },

  // DRIVER PAY CARD
  driverPayCard: {
      backgroundColor: "#A0FF00", 
      borderRadius: 12,
      padding: 16,
      marginTop: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      elevation: 5
  },
  driverPayRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverPayLabel: { color: "#121212", fontFamily: "MontserratBold", fontSize: 14 },
  driverPayValue: { color: "#121212", fontFamily: "MontserratBold", fontSize: 18 },

  // PASOS (TRACKING)
  pasosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderRadius: 8,
  },
  paso: {
    alignItems: 'center',
    flex: 1,
  },
  pasoTexto: {
    fontSize: 10,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
    fontFamily: "MontserratMedium"
  },
  pasoTextoActivo: {
    color: '#A0FF00',
    fontFamily: "MontserratBold"
  },
  pasoTextoCompletado: {
    color: '#A0FF00',
    fontFamily: "MontserratSemiBold"
  },

  // CLIENT
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  clientName: { color: "#FFF", fontSize: 15, fontFamily: "MontserratSemiBold" },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  clientPhone: { color: "#CCC", fontSize: 13, fontFamily: "MontserratRegular" },
  chatBtn: { backgroundColor: "#A0FF00", width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  // PRODUCTS
  productRow: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#252525", paddingBottom: 10 },
  qtyBox: { backgroundColor: "#252525", width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  qtyText: { color: "#A0FF00", fontFamily: "MontserratBold", fontSize: 12 },
  prodName: { color: "#FFF", fontFamily: "MontserratMedium", fontSize: 14 },
  variantText: { color: "#888", fontSize: 12 },
  addText: { color: "#AAA", fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  prodPrice: { color: "#A0FF00", fontFamily: "MontserratBold", fontSize: 14, marginLeft: 5 },

  // PAY INFO
  payLabel: { color: "#888", fontFamily: "MontserratMedium", fontSize: 13 },
  payValue: { color: "#FFF", fontFamily: "MontserratSemiBold", fontSize: 13 },

  // ACTIONS
  actionsContainer: { marginTop: 30 },
  mainBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  mainBtnText: { color: "#FFF", fontFamily: "MontserratBold", fontSize: 16 },
  cancelBtn: { paddingVertical: 14, borderWidth: 1, borderColor: "#FF4757", borderRadius: 12, alignItems: 'center' },
  cancelText: { color: "#FF4757", fontFamily: "MontserratSemiBold", fontSize: 14 },

  // CHAT STYLES
  chatContainer: { flex: 1, backgroundColor: "#121212" },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: "#333" },
  chatHeaderTitle: { color: "#FFF", fontFamily: "MontserratBold", fontSize: 16 },
  msgList: { flex: 1 },
  emptyChat: { color: "#555", textAlign: 'center', marginTop: 50, fontFamily: "MontserratMedium" },
  
  msgContainer: { maxWidth: '75%', borderRadius: 12, padding: 10, marginBottom: 10 },
  msgMy: { backgroundColor: "#A0FF00", alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  msgOther: { backgroundColor: "#252525", alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  msgSender: { color: "#A0FF00", fontSize: 10, fontFamily: "MontserratBold", marginBottom: 2 },
  msgText: { fontSize: 14, fontFamily: "MontserratRegular" },
  msgTextMy: { color: "#000" },
  msgTextOther: { color: "#FFF" },
  msgTime: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  msgTimeMy: { color: "rgba(0,0,0,0.6)" },
  msgTimeOther: { color: "#777" },
  msgImage: { width: 150, height: 150, borderRadius: 8, marginTop: 5 },

  inputArea: { backgroundColor: "#1E1E1E", padding: 10, borderTopWidth: 1, borderTopColor: "#333" },
  imgPreviewBox: { flexDirection: 'row', marginBottom: 10 },
  imgPreview: { width: 60, height: 60, borderRadius: 8 },
  delImgBtn: { position: 'absolute', top: -5, left: 50, backgroundColor: 'red', borderRadius: 10, padding: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  attachBtn: { padding: 8 },
  textInput: { flex: 1, backgroundColor: "#2C2C2C", color: "#FFF", borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginHorizontal: 8, maxHeight: 80 },
  sendBtn: { backgroundColor: "#A0FF00", width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});

export default PedidoDetalleComercio;