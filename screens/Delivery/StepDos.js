import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/FontAwesome";
import IconMC from "react-native-vector-icons/AntDesign";
import { LinearGradient } from "expo-linear-gradient";

export default function StepDos() {
  const [addressA, setAddressA] = useState("");
  const [coordinatesA, setCoordinatesA] = useState(null);
  const [addressB, setAddressB] = useState("");
  const [coordinatesB, setCoordinatesB] = useState(null);
  const [totalPrice, setTotalPrice] = useState(null);
  const [receiverName, setReceiverName] = useState("");
  const [phone, setPhone] = useState("");
  const [observations, setObservations] = useState("");
  const navigation = useNavigation();

  useEffect(() => {
    const getData = async () => {
      try {
        const addressA = await AsyncStorage.getItem("addressA");
        const coordinatesA = await AsyncStorage.getItem("coordinatesA");
        const addressB = await AsyncStorage.getItem("addressB");
        const coordinatesB = await AsyncStorage.getItem("coordinatesB");
        const totalPrice = await AsyncStorage.getItem("totalPrice");

        if (addressA !== null) setAddressA(addressA);
        if (coordinatesA !== null) setCoordinatesA(JSON.parse(coordinatesA));
        if (addressB !== null) setAddressB(addressB);
        if (coordinatesB !== null) setCoordinatesB(JSON.parse(coordinatesB));
        if (totalPrice !== null) setTotalPrice(totalPrice);
      } catch (error) {
        console.error("Error retrieving data:", error);
      }
    };

    getData();
  }, []);

  const handleContinue = async () => {
    try {
      await AsyncStorage.setItem("receiverName", receiverName);
      await AsyncStorage.setItem("phone", phone);
      await AsyncStorage.setItem("observations", observations);
      navigation.navigate("StepTres");
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };
console.log("data", handleContinue);
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
                width: "60%", // Hace que la línea ocupe todo el ancho
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
            <IconMC name="pluscircleo" size={24} color="#333" style={{ marginTop: 15 }} />
            <Text style={styles.step}>Paso 2{"\n"}Información</Text>
          </View>

          <View style={styles.stepDivider} />

          <View style={styles.stepItem}>
            <IconMC name="checkcircleo" size={24} color="#333" style={{ marginTop: 15 }} />
            <Text style={styles.step}>Paso 3{"\n"}Confirmación</Text>
          </View>
        </View>

        {/* Sección de ubicación */}
        <Text style={styles.sectionTitle}>Seleccionar ubicación</Text>

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

          {/* Detalles de tu mandado */}
        </View>
        <Text style={styles.title}>Danos detalles de tu mandado</Text>

        <View style={styles.dashedContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nombre quien recibe"
            value={receiverName}
            onChangeText={setReceiverName}
          />
          <TextInput
            style={styles.input}
            placeholder="Teléfono"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            style={[styles.input2, { height: 80 }]}
            placeholder="Observaciones del mandado deja tus detalles aqui"
            multiline
            value={observations}
            onChangeText={setObservations}
          />
        </View>

        {/* Precio y botón continuar alineados */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.price}>Valor del mandado:</Text>
         
               <Text style={styles.priceValue}>${parseFloat(totalPrice).toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  priceValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#197200",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 375,
    height: 48,
    marginTop: 30,
    alignSelf: "flex-start",
  },
  stepsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 10,
  },
  stepItem: {
    alignItems: "center",
    flexDirection: "column",
    marginHorizontal: 15, // Separa los pasos
  },
  step: {
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#000", // Texto en negro
    marginBottom: -5,
    marginTop: 13, // Espacio entre el icono y el texto
    lineHeight: 22,
  },
  stepDivider: {
    height: 20,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 50,
    marginTop: -5,
  },
  locationBox: {
    marginTop: -25,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#999",
    borderRadius: 20,
    padding: 15,
    marginBottom: 30,
    minHeight: 120,
  },
  locationItem: {
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pointTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 5,
  },
  pointSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#777",
    paddingLeft: 25,
  },
  pointAddress: {
    fontFamily: "Inter_400Regular",
    color: "#000000",
    fontSize: 18,
    paddingLeft: 25,
  },
  addButton: {
    marginLeft: "auto",
    padding: 5,
    borderRadius: 5,
  },
  dottedLineContainer: {
    position: "absolute",
    left: 6, // Ajusta según necesidad
    top: 40,
    height: 50, // Aumentar la longitud de la línea
    width: 2, // Mantiene la línea delgada
    overflow: "hidden", // Evita que el degradado se desborde
  },
  dottedLine: {
    height: "100%",
    top: 0, // Reduce este valor para subir la línea
    borderLeftWidth: 2,
    borderStyle: "dashed",
    borderColor: "#B2D8B2",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -20,
  },
  price: {
    marginTop: 40,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#777",
  },
  priceValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#197200",
  },
  continueButton: {
    backgroundColor: "#197200",
    padding: 15,
    borderRadius: 50,
    alignItems: "center",
    width: 140, // Ajusta el ancho
    height: 50, // Ajusta la altura
    marginTop: 40,
  },
  continueText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  dashedContainer: {
    marginTop: 0,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#999",
    borderRadius: 20,
    padding: 15,
    marginBottom: 30,
    minHeight: 120,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: -5,
    color: "#888",
  },
  input: {
    backgroundColor: "#E3E7DD",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  input2: {
    backgroundColor: "#E3E7DD",
    padding: 10,
    borderRadius: 8,
    marginBottom: 0,
    textAlignVertical: "top",
  },
});