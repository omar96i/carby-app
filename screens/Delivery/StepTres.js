import { useNavigation } from "@react-navigation/native";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ScrollView, Alert } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/FontAwesome";
import IconMC from "react-native-vector-icons/AntDesign";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_500Medium } from "@expo-google-fonts/inter";
import React, { useState, useEffect } from "react";
import Modal from "react-native-modal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator } from "react-native";
import styles from '../Delivery/Style';
import { BASE_URL } from "../../constants/url"; // Asegúrate de tener la URL base definida

export default function StepTres() {
  const [addressA, setAddressA] = useState("");
  const [coordinatesA, setCoordinatesA] = useState(null);
  const [addressB, setAddressB] = useState("");
  const [coordinatesB, setCoordinatesB] = useState(null);
  const [totalPrice, setTotalPrice] = useState(null);
  const [receiverName, setReceiverName] = useState("");
  const [phone, setPhone] = useState("");
  const [observations, setObservations] = useState("");
  const [isModalVisible, setModalVisible] = useState(false);
  const [metodoPago, setMetodoPago] = useState("");
  const [serviceName, setServiceName] = useState(""); // Nuevo estado para el nombre del servicio
  const [serviceId, setServiceId] = useState("");
  const [distance, setDistance] = useState("");
  const navigation = useNavigation();

  useEffect(() => {
    const getData = async () => {
      try {
        const addressA = await AsyncStorage.getItem("addressA");
        const coordinatesA = await AsyncStorage.getItem("coordinatesA");
        const addressB = await AsyncStorage.getItem("addressB");
        const coordinatesB = await AsyncStorage.getItem("coordinatesB");
        const totalPrice = await AsyncStorage.getItem("totalPrice");
        const receiverName = await AsyncStorage.getItem("receiverName");
        const phone = await AsyncStorage.getItem("phone");
        const observations = await AsyncStorage.getItem("observations");
        const serviceName = await AsyncStorage.getItem("serviceName"); // Recuperar el nombre del servicio
        const serviceId = await AsyncStorage.getItem("serviceId"); // Recuperar el ID del servicio
        const distance = await AsyncStorage.getItem("distance");
        console.log("Recovered serviceId:", serviceId); // Debugging line
  
        if (addressA !== null) setAddressA(addressA);
        if (coordinatesA !== null) setCoordinatesA(JSON.parse(coordinatesA));
        if (addressB !== null) setAddressB(addressB);
        if (coordinatesB !== null) setCoordinatesB(JSON.parse(coordinatesB));
        if (totalPrice !== null) setTotalPrice(totalPrice);
        if (receiverName !== null) setReceiverName(receiverName);
        if (phone !== null) setPhone(phone);
        if (observations !== null) setObservations(observations);
        if (serviceName !== null) setServiceName(serviceName); // Establecer el nombre del servicio
        if (serviceId !== null) setServiceId(serviceId); // Establecer el ID del servicio
        if (distance !== null) setDistance(distance);
      
      } catch (error) {
        console.error("Error retrieving data:", error);
      }
    };
  
    getData();
  }, []);



// ...existing code...
const sendTripData = async () => {
  try {
    const userId = await AsyncStorage.getItem("userId");
    const token = await AsyncStorage.getItem("userToken");

    const tripData = {
      usuario_id: userId,
      conductor_id: null,
      price_id: 1,
      pago_por: metodoPago,
      distancia: distance,
      informacion_adicional: JSON.stringify({
        'nombre': receiverName,
        'phone': phone,
        'observaciones': observations,
        'addresA': addressA,
        'addresB': addressB,
        'categoria': serviceName,
      }),
      punto_recogida: JSON.stringify(coordinatesA),
      destino: JSON.stringify(coordinatesB),
      costo: totalPrice,
      estado: "pendiente",
      estado_transferencia: "pendiente",
      estado_epayco: metodoPago === "epayco" ? "pendiente" : "no_aplica",
      estado_desembolso: "pendiente", // Added missing required field
      service_id: serviceId,
      comision: calculateCommission(),
      estado_comision: "pendiente"
    };

    console.log("Sending trip data:", tripData);

    const response = await fetch(`${BASE_URL}trips`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(tripData)
    });

    const data = await response.json();
    console.log("Response data full object:", JSON.stringify(data));
    
    if (!response.ok) {
      // Show specific error from API if available
      if (data.errors) {
        const errorMessages = Object.entries(data.errors)
          .map(([key, msgs]) => `${key}: ${msgs.join(', ')}`)
          .join('\n');
        Alert.alert("Error", `Problema al crear el viaje:\n${errorMessages}`);
      } else {
        Alert.alert("Error", data.message || "Hubo un problema al crear el viaje.");
      }
      return;
    }
    
    // Extract tripId from various possible locations in the response
    const tripId = data.id || (data.trip && data.trip.id) || (data.data && data.data.id);
    console.log("Extracted trip ID:", tripId);
    
    if (!tripId) {
      console.error("No trip ID found in API response");
      Alert.alert("Error", "No se pudo obtener el ID del viaje");
      return;
    }
    
    // Store the tripId in AsyncStorage as a fallback retrieval method
    await AsyncStorage.setItem("currentTripId", tripId.toString());
    console.log("Trip ID stored in AsyncStorage:", tripId);

    // Also save the service details that will need to be shown in StepCuatro
    await AsyncStorage.setItem("serviceName", serviceName);
    await AsyncStorage.setItem("addressA", addressA);
    await AsyncStorage.setItem("addressB", addressB);
    await AsyncStorage.setItem("totalPrice", totalPrice.toString());
    
    if (metodoPago === "epayco") {
      // Navigate to WebView with the epayco URL
      navigation.navigate("WebViewScreen", {
        url: `https://yebo.elmeroflow.com/trip/epayco/${tripId}/${userId}`,
        title: "Pago con ePayco"
      });
    } else {
      // For cash payments, continue with the original flow
      Alert.alert("Éxito", "El viaje ha sido creado exitosamente.");
      
      // Navigate with explicit tripId parameter
      navigation.navigate("StepCuatro", { 
        tripId: tripId,
        // Pass other relevant data as well for immediate access
        serviceName: serviceName,
        addressA: addressA,
        addressB: addressB,
        totalPrice: totalPrice
      });
    }
    console.log("Navigating with tripId:", tripId);
  } catch (error) {
    console.error("Error sending trip data:", error);
    Alert.alert("Error", "Hubo un problema al crear el viaje.");
  }
};

// ...existing code...
const handlePayment = () => {
  if (!metodoPago) {
    Alert.alert("Error", "Por favor seleccione un método de pago");
    return;
  }
  sendTripData();
};
// ...existing code...

  const handleContinue = () => {
    setModalVisible(false);
    sendTripData();
  };
  const calculateCommission = () => {
    if (!totalPrice) return 0;
    const commissionAmount = parseFloat(totalPrice) * 0.10;
    return commissionAmount.toFixed(2);
  };
  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Inter_500Medium,
  });

  return (
    <ScrollView style={styles.safeContainer}>
      <View style={styles.container}>
        {/* Botón Atrás */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>

        {/* Indicador de pasos con iconos */}
        <View style={styles.stepsContainer}>
          <View style={styles.stepItem}>
            <IconMC name="checkcircle" size={50} color="#197200" style={{ marginTop: 15 }} />

            {/* Linea de progreso*/}
            <View
              style={{
                width: "76%", // Hace que la línea ocupe todo el ancho
                height: 2, // Define el grosor de la línea
                backgroundColor: "green",
                position: "absolute",
                top: 38, // Ajusta la posición verticalmente
                left: 76, // Mueve la línea hacia la derecha
              }}
            />

            <Text style={styles.step}>Paso 1{"\n"}Detalles básicos</Text>
          </View>

          <View style={styles.stepDivider} />

          <View style={styles.stepItem}>
            <IconMC name="checkcircle" size={50} color="#197200" style={{ marginTop: 15 }} />

            {/* Linea de progreso*/}
            <View
              style={{
                width: "102%", // Hace que la línea ocupe todo el ancho
                height: 2, // Define el grosor de la línea
                backgroundColor: "green",
                position: "absolute",
                top: 38, // Ajusta la posición verticalmente
                left: 64, // Mueve la línea hacia la derecha
              }}
            />
            <Text style={styles.step}>Paso 2{"\n"}Información</Text>
          </View>

          <View style={styles.stepDivider} />

          <View style={styles.stepItem}>
            <IconMC name="checkcircleo" size={24} color="#333" style={{ marginTop: 15 }} />
            <Text style={styles.step}>Paso 3{"\n"}Confirmación</Text>
          </View>
        </View>

        {/* Sección de ubicación */}
        <Text style={styles.sectionTitle1}>Ubicación Creada</Text>

        <View style={styles.locationBox}>
          <View style={styles.locationItem}>
            <View style={styles.locationRow}>
              <Icon name="map-marker" size={22} color="#009900" />
              <Text style={styles.pointTitle}> Punto A</Text>
             
            </View>
            <Text style={styles.pointSubtitle}>Donde inicia tu mandado</Text>
            <Text style={styles.pointAddress}>{addressA}</Text>

            {/* Línea de puntos entre Punto A y Punto B */}
            <View style={styles.dottedLineContainer}>
              {/* Degradado inicial */}
              <LinearGradient
                colors={["rgba(0, 153, 0, 0.3)", "rgba(0, 153, 0, 1)"]} // De transparente a verde
                style={styles.gradientOverlay}
              />
              {/* Línea principal */}
              <View style={styles.dottedLine} />
            </View>
          </View>

          <View style={styles.locationItem}>
            <View style={styles.locationRow}>
              <Icon name="map-marker" size={22} color="#009900" />
              <Text style={styles.pointTitle}> Punto B</Text>
            
            </View>
            <Text style={styles.pointSubtitle}>Donde termina tu mandado</Text>
            <Text style={styles.pointAddress}>{addressB}</Text>
          </View>
        </View>

      
        <View style={styles.container}>
          <Text style={styles.sectionTitle2}>Detalles del mandado</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Categoría</Text>
              <Text style={styles.value}>{serviceName} </Text> 
            </View>
           
            <View style={styles.row}>
              <Text style={styles.label}>Valor</Text>
              <Text style={styles.value}>${parseFloat(totalPrice).toLocaleString()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Nombre quien recibe</Text>
              <Text style={styles.value}>{receiverName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Teléfono</Text>
              <Text style={styles.value}>{phone}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Observaciones</Text>
              <Text style={styles.value}>{observations}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle3}>Método de pago</Text>

          <View style={styles.paymentContainer}>
            <TouchableOpacity
              style={styles.paymentOption}
              onPress={() => setMetodoPago("efectivo")}
            >
              <FontAwesome name="money" size={24} color="#333" />
              <Text style={styles.paymentText}>Efectivo</Text>
              <FontAwesome
                name={metodoPago === "efectivo" ? "check-circle" : "circle-o"}
                size={24}
                color="green"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.paymentOption}
              onPress={() => setMetodoPago("epayco")}
            >
              <FontAwesome name="credit-card" size={24} color="#333" />
              <Text style={styles.paymentText}>Pagar con epayco</Text>
              <FontAwesome
                name={metodoPago === "epayco" ? "check-circle" : "circle-o"}
                size={24}
                color="green"
              />
            </TouchableOpacity>
          </View>

          {/* Precio y botón continuar alineados */}
          <View style={styles.footer}>
            <View>
              <Text style={styles.price}>Valor del mandado:</Text>
              <Text style={styles.priceValue}>${parseFloat(totalPrice).toLocaleString()}</Text>
            
            </View>


            <TouchableOpacity style={styles.continueButton} onPress={handlePayment}>
              <Text style={styles.continueText}>Pagar</Text>
            </TouchableOpacity>

            {/* Modal  CONTINUAR   */}
            <Modal isVisible={isModalVisible} backdropOpacity={0.5}>
              <View style={styles.modalContent}>
                <TouchableOpacity style={{ position: "absolute", top: 5, right: 5 }} onPress={() => setModalVisible(false)}>
                  <IconMC name="close" size={24} color="black" />
                </TouchableOpacity>

                <Text style={styles.title}>El pago de tu mandado ha sido aprobado</Text>
                <Text style={styles.subtitle}>
                  A continuación te asignaremos alguien para realizar tu mandado.
                </Text>
                <TouchableOpacity style={styles.button} onPress={handleContinue}>
                  <Text style={styles.buttonText}>Continuar</Text>
                </TouchableOpacity>
              </View>
            </Modal>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}