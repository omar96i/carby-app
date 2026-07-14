import React, { useState, useEffect, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Alert,
} from "react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapComponent from "../../components/MapComponent";
import ToggleSwitch from "../../components/ToggleSwitch";
import ActiveRequestCard from "../../components/ActiveRequestCard";

export default function VistaDos() {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [tripsData, setTripsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);

  // Handle data received from the ToggleSwitch component
  const handleDataReceived = (data) => {
    console.log("Trips data received in HomeDelivery:", data);

    // Debug: Check the data structure
    if (Array.isArray(data)) {
      console.log(`Received ${data.length} trips`);
      if (data.length > 0) {
        console.log("First trip sample:", JSON.stringify(data[0]));
      }
    } else {
      console.warn("Data is not an array:", typeof data);
    }

    setTripsData(data);
    setLoading(false);
  };

  useEffect(() => {
    const fetchStoredUserData = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem("userData");
        if (storedUserData) {
          setUserData(JSON.parse(storedUserData));
        }
      } catch (error) {
        console.error("Error obteniendo datos del usuario:", error);
      }
    };

    fetchStoredUserData();
  }, []);

  // Set loading when toggle is activated
  const handleToggleChange = (value) => {
    setIsEnabled(value);
    if (value) {
      setLoading(true);
      console.log("Toggle activated, loading trips...");
      fetchNearbyTrips();
    } else {
      setTripsData([]);
      console.log("Toggle deactivated, cleared trips data");
    }
  };

  // Function to fetch nearby trips data
  const fetchNearbyTrips = async () => {
    try {
      console.log("📡 API Request: Fetching trips");

      let lat = 4.809557;
      let lng = -75.7536209;

      const location = await Location.getCurrentPositionAsync({});
      if (location) {
        lat = location.coords.latitude;
        lng = location.coords.longitude;
      }

      // Log request parameters
      const requestParams = {
        lat: lat,
        lng: lng,
        success: true,
      };
      console.log("Request params:", JSON.stringify(requestParams));

      // Retrieve the token from AsyncStorage
      const userToken = await AsyncStorage.getItem("userToken");
      console.log("Retrieved token:", userToken);

      const response = await fetch(
        "https://yebo.elmeroflow.com/api/trips/near",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${userToken}`, // Include the token in the Authorization header
          },
          body: JSON.stringify(requestParams),
        }
      );

      console.log(`📥 API Status: ${response.status} ${response.statusText}`);

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}):`, errorText);
        if (handleDataReceived) handleDataReceived([]);
        return;
      }

      // Parse response as JSON
      const responseData = await response.json();
      console.log("📦 API Response:", JSON.stringify(responseData));

      // Debug: Check response structure
      console.log(
        "Response has success:",
        responseData.hasOwnProperty("success")
      );
      console.log("Response has data:", responseData.hasOwnProperty("data"));

      // Retrieve rejected services from AsyncStorage
      const rejectedServicesJson = await AsyncStorage.getItem(
        "rejectedServices"
      );
      const rejectedServices = rejectedServicesJson
        ? JSON.parse(rejectedServicesJson)
        : [];

      // Filter out rejected services and those not pending
      const filteredData = responseData.data.filter(
        (trip) =>
          trip.estado === "pendiente" &&
          !rejectedServices.includes(trip.service_id)
      );

      // Pass filtered data array from response to parent component
      if (handleDataReceived) {
        if (responseData.success && Array.isArray(filteredData)) {
          console.log(`✅ Found ${filteredData.length} trips`);
          handleDataReceived(filteredData);

          // Show test notification if trips were found
          if (filteredData.length > 0) {
            Alert.alert(
              "Viajes Encontrados",
              `Se encontraron ${filteredData.length} viajes disponibles.`,
              [{ text: "OK" }]
            );
          }
        } else {
          console.log("❌ No valid trips data in response");
          handleDataReceived([]);
        }
      }
    } catch (error) {
      console.error("⚠️ Error fetching nearby trips:", error);
      // Pass empty array on error
      if (handleDataReceived) {
        handleDataReceived([]);
      }
    }
  };

  let [fontsLoaded] = useFonts({
    Inter_Regular: Inter_400Regular,
    Inter_Bold: Inter_700Bold,
  });

  if (!fontsLoaded) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  // Handle accepting a request
  const handleAcceptRequest = (tripId) => {
    console.log("Request accepted for trip:", tripId);

    // Show confirmation before navigating
    Alert.alert(
      "Viaje Aceptado",
      "Estás aceptando este viaje. ¿Deseas continuar?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Continuar",
          onPress: () => navigation.navigate("StepTrece", { tripId }),
        },
      ]
    );
  };

  // Handle rejecting a request
  const handleRejectRequest = (tripId) => {
    console.log("Request rejected for trip:", tripId);
    // Remove the trip from the list
    setTripsData(tripsData.filter((trip) => trip.id !== tripId));
  };

  // Parse coordinates from JSON string with error handling
  const parseCoordinates = (jsonString) => {
    try {
      // Handle both string and object formats
      if (typeof jsonString === "string") {
        return JSON.parse(jsonString);
      } else if (typeof jsonString === "object") {
        return jsonString;
      }
      return { lat: 0, lng: 0 };
    } catch (error) {
      console.error("Error parsing coordinates:", error, "Value:", jsonString);
      return { lat: 0, lng: 0 };
    }
  };

  // Function to handle scroll event
  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    if (isCloseToBottom && !loading && isEnabled) {
      setLoading(true);
      console.log("Reached end of list, loading more trips...");
      // Fetch more trips
      fetchNearbyTrips();
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={400}
        >
          {/* Encabezado */}
          <View style={styles.header}>
            <View style={styles.textContainer}>
              <Text style={styles.greeting}>
                Hola,
                <Text style={styles.boldText}>
                  {userData?.nombre_completo || "Usuario"}
                </Text>
              </Text>
              <Text style={styles.subtext}>
                Estamos listos para hacer mandados
              </Text>
            </View>
            <Image
              source={require("../../assets/images/yar.png")}
              style={styles.logo}
            />
          </View>

          {/* Mapa */}
          <MapComponent />

          {/* Toggle Switch Component */}
          <ToggleSwitch
            isOn={isEnabled}
            setIsOn={handleToggleChange}
            title="Activate para poder los 
YaRiders disponibles"
            onDataReceived={handleDataReceived}
          />

          <Text style={styles.subtext2}>
                Solicitudes de mandados activos
              </Text>

          {/* Trips Data Display */}
          {isEnabled && (
            <View style={styles.tripsSection}>
              <Text style={styles.tripsSectionTitle}>
                {tripsData && tripsData.length > 0
                  ? "Viajes Disponibles"
                  : "No hay viajes disponibles"}
              </Text>

              {loading ? (
                <ActivityIndicator
                  size="large"
                  color="#1E7D22"
                  style={styles.loader}
                />
              ) : tripsData && tripsData.length > 0 ? (
                tripsData.map((trip, index) => {
                  // Parse coordinates for the ActiveRequestCard
                  const pickupLocation = parseCoordinates(trip.punto_recogida);
                  const destination = parseCoordinates(trip.destino);

                  return (
                    <ActiveRequestCard
                      key={`trip-${trip.id || index}`}
                      tripData={{
                        ...trip,
                        pickupLocation,
                        destination,
                      }}
                      onAccept={() => handleAcceptRequest(trip.id)}
                      onReject={() => handleRejectRequest(trip.id)}
                    />
                  );
                })
              ) : (
                <View style={styles.noTripsContainer}>
                  <Text style={styles.noTripsText}>
                    Esperando solicitudes de viaje...
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#222",
    paddingTop: Platform.OS === "android" ? 80 : 80,
  },
  container: {
    flex: 1,
    backgroundColor: "#222",
    paddingHorizontal: 15,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  textContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontFamily: "Inter_400Regular",
    marginBottom: -5,
    color: "#fff",
  },
  boldText: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  subtext: {
    fontSize: 16,
    color: "#fff",
    fontFamily: "Inter_400Regular",
    
  },
  subtext2: {
    fontSize: 16,
    color: "#fff",
    fontFamily: "Inter_400Regular",
    marginLeft: 10,
    marginBottom: 20,
    marginTop : 10,
  },
  logo: {
    width: 150,
    height: 120,
    resizeMode: "contain",
    marginLeft: 10,
  },
  tripsSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  tripsSectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 20,
    marginLeft: 10,
  },
  noTripsContainer: {
    padding: 20,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    alignItems: "center",
  },
  noTripsText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#000",
  },
  loader: {
    marginVertical: 20,
  },
});
