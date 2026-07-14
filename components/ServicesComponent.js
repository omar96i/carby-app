import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../constants/url";
import { useNavigation } from "@react-navigation/native";

const ServicesComponent = () => {
  const navigation = useNavigation();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const response = await fetch(BASE_URL + "services", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        const data = await response.json();
        setServices(data.services || []);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleServicePress = async (serviceId) => {
    try {
      await AsyncStorage.setItem("selectedServiceId", serviceId.toString());
      navigation.navigate("StepUno");
    } catch (error) {
      console.error("Error saving selected service ID:", error);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#fa6205" style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      {services.length > 0 ? (
        <View style={styles.gridContainer}>
          {services.map((item, index) => {
            const imageUrl = item.icono ? `https://yebo.elmeroflow.com/storage/${item.icono}` : null;
            return (
              <TouchableOpacity key={index} style={styles.card2} onPress={() => handleServicePress(item.id)}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.icon2} />
                ) : (
                  <Image source={require("../assets/images/burgerU.png")} style={styles.icon2} />
                )}
                <Text style={styles.cardText2}>{item.nombre_servicio}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={styles.noDataText}>No hay servicios disponibles</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff"
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    
  },
  card2: {
    width: "30%",
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00000090",
    shadowOpacity: 15,
    shadowOffset: { width: 10, height: 30 },
    shadowRadius: 8,
    elevation: 10,
    padding: 10,
    marginVertical: 10
  },
  icon2: {
    width: 50,
    height: 50,
    marginBottom: 5,
    borderRadius: 5
  },
  cardText2: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center"
  },
  noDataText: {
    fontSize: 16,
    color: "gray",
    textAlign: "center",
    marginTop: 20
  }
});

export default ServicesComponent;