import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import IconMC from "react-native-vector-icons/AntDesign";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GOOGLE_MAPS_API_KEY } from "../constants/Keys";
import { BASE_URL } from "../constants/Keys";
import axios from 'axios';

const LocationSection = ({ precioKilometro, setDistance, setTotalPrice }) => {
  const [addressA, setAddressA] = useState("");
  const [addressB, setAddressB] = useState("");
  const [suggestionsA, setSuggestionsA] = useState([]);
  const [suggestionsB, setSuggestionsB] = useState([]);
  const [location, setLocation] = useState(null);
  const [coordinatesA, setCoordinatesA] = useState(null);
  const [coordinatesB, setCoordinatesB] = useState(null);
  const [distance, setLocalDistance] = useState("0");
  const [precioPorK, setPrecioPorK] = useState(1000); // Valor predeterminado inicial
  const [apiStatus, setApiStatus] = useState(null);
  const [displayedDistance, setDisplayedDistance] = useState("0");
  const [displayedValorKm, setDisplayedValorKm] = useState("1000"); // Valor predeterminado inicial
  const [displayedSubtotal, setDisplayedSubtotal] = useState("0");
  const [displayedTotal, setDisplayedTotal] = useState("0");

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location.coords);
    })();
  }, []);

  useEffect(() => {
    const fetchPrecioPorK = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        
        // Verifica si el token existe
        if (!token) {
          console.error("No hay token de autenticación");
          setApiStatus("Error: No hay token de autenticación");
          // Mantener valor predeterminado
          return;
        }
        
        console.log("Intentando obtener precio por kilómetro de:", `${BASE_URL}prices/1`);
        
        // Añadir timeout para evitar que la petición se quede colgada
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
        
        try {
          const response = await fetch(`${BASE_URL}prices/1`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          const valorKm = data.data.precio_por_k;
          
          if (!valorKm || isNaN(valorKm)) {
            throw new Error("Valor por kilómetro inválido");
          }
          
          setPrecioPorK(valorKm);
          setDisplayedValorKm(valorKm.toString());
          console.log("Precio por kilómetro cargado:", valorKm);
        } catch (fetchError) {
          console.error("Error en fetch:", fetchError);
          // Mantener los valores predeterminados
          throw fetchError;
        }
      } catch (error) {
        console.error("Error fetching precio_por_k:", error);
        
        // Usar un valor predeterminado en caso de error (ya establecido en el state inicial)
        console.log("Usando precio por kilómetro predeterminado:", precioPorK);
        
        // Mostrar el estado del API
        setApiStatus(`Error al cargar precio por km: ${error.message}. Usando valor predeterminado.`);
      }
    };

    fetchPrecioPorK();
  }, []);

  const fetchSuggestions = async (input, setSuggestions) => {
    if (input.length > 2) {
      let locationQuery = "";
      if (location) {
        locationQuery = `&location=${location.latitude},${location.longitude}&radius=50000`; // 50 km radius
      }
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}${locationQuery}&components=country:CO`
        );
        const data = await response.json();
        setSuggestions(data.predictions);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const getCoordinates = async (address, setCoordinates) => {
    if (address) {
      try {
        console.log("Getting coordinates for:", address);
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}&region=co`
        );
        const data = await response.json();
        if (data.results.length > 0) {
          const location = data.results[0].geometry.location;
          console.log("Coordinates found:", location);
          setCoordinates(location);
          return location;
        } else {
          console.warn("No coordinates found for address:", address);
          return null;
        }
      } catch (error) {
        console.error("Error getting coordinates:", error);
        return null;
      }
    }
    return null;
  };

  const calculateStraightLineDistance = (coordsA, coordsB) => {
    if (!coordsA || !coordsB) return "0";
    
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(coordsB.lat - coordsA.lat);
    const dLon = deg2rad(coordsB.lng - coordsA.lng);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(coordsA.lat)) * Math.cos(deg2rad(coordsB.lat)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    
    // Multiply by a factor to approximate road distance
    // Road distance is typically 20-30% longer than straight line distance
    const estimatedRoadDistance = distance * 1.3;
    
    console.log(`Straight-line distance: ${distance.toFixed(2)} km`);
    console.log(`Estimated road distance: ${estimatedRoadDistance.toFixed(2)} km`);
    
    return estimatedRoadDistance.toFixed(2);
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Función actualizada para usar la Routes API de Google
  const getDistanceByRoutesAPI = async (coordsA, coordsB) => {
    try {
      if (!coordsA || !coordsB) {
        console.warn("Invalid coordinates provided for distance calculation");
        return null;
      }

      console.log(`Calculating road distance between: ${JSON.stringify(coordsA)} and ${JSON.stringify(coordsB)}`);
      
      // Usamos la Routes API para calcular la distancia
      const url = `https://routes.googleapis.com/directions/v2:computeRoutes`;
      
      console.log("Routes API Request URL:", url);
      
      // Preparamos el cuerpo de la solicitud para la API Routes
      const requestBody = {
        origin: {
          location: {
            latLng: {
              latitude: coordsA.lat,
              longitude: coordsA.lng
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: coordsB.lat,
              longitude: coordsB.lng
            }
          }
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
        languageCode: "es-CO",
        units: "METRIC"
      };
      
      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration'
        }
      });
      
      console.log("Routes API Response:", JSON.stringify(response.data));
      
      if (response.data && response.data.routes && response.data.routes.length > 0) {
        const distanceInMeters = response.data.routes[0].distanceMeters;
        const distanceInKilometers = distanceInMeters / 1000;
        
        setApiStatus("Routes API funcionando correctamente");
        console.log(`Routes API road distance: ${distanceInKilometers.toFixed(2)} km`);
        
        return distanceInKilometers.toFixed(2);
      } else {
        console.warn("Routes API error: No routes found");
        return null;
      }
    } catch (error) {
      console.warn("Error with Routes API:", error.message);
      // Si hay un error detallado, lo mostramos
      if (error.response) {
        console.warn("Error response data:", JSON.stringify(error.response.data));
      }
      return null;
    }
  };

  // Mantener la función legacy de Directions API como respaldo
  const getDistanceByDirections = async (coordsA, coordsB) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${coordsA.lat},${coordsA.lng}&destination=${coordsB.lat},${coordsB.lng}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
      
      console.log("Directions API Request URL:", url);
      const response = await axios.get(url);
      
      if (response.data.status === "OK" && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const distanceInMeters = route.legs[0].distance.value;
        const distanceText = route.legs[0].distance.text;
        const distanceInKilometers = distanceInMeters / 1000;
        
        setApiStatus("Directions API funcionando correctamente");
        console.log(`Directions API road distance: ${distanceText} (${distanceInKilometers.toFixed(2)} km)`);
        
        return distanceInKilometers.toFixed(2);
      } else {
        console.warn("Directions API error:", response.data.status);
        return null;
      }
    } catch (error) {
      console.warn("Error with Directions API:", error.message);
      return null;
    }
  };

  const calculateDistanceByAddress = async (addressA, addressB) => {
    try {
      if (!addressA || !addressB) {
        console.warn("Invalid addresses provided.");
        setLocalDistance("0");
        setDistance("0");
        setDisplayedDistance("0");
        return;
      }

      console.log(`Calculating distance between: '${addressA}' and '${addressB}'`);

      // Primero obtenemos las coordenadas
      let coordsA = await getCoordinates(addressA, setCoordinatesA);
      let coordsB = await getCoordinates(addressB, setCoordinatesB);

      if (!coordsA || !coordsB) {
        console.warn("Could not get precise coordinates for one or both addresses");
        setLocalDistance("0");
        setDistance("0");
        setDisplayedDistance("0");
        return;
      }

      // Primero intentamos con la API Routes (la más moderna)
      let distanceResult = await getDistanceByRoutesAPI(coordsA, coordsB);
      
      // Si falla, probamos con la API de Directions (legacy)
      if (!distanceResult) {
        console.log("Routes API failed, trying with Directions API");
        distanceResult = await getDistanceByDirections(coordsA, coordsB);
      }
      
      // Si ambas APIs fallan, calculamos una estimación
      if (!distanceResult) {
        setApiStatus("APIs de Google no disponibles. Usando estimación.");
        distanceResult = calculateStraightLineDistance(coordsA, coordsB);
      }

      console.log("Setting final distance:", distanceResult);
      setLocalDistance(distanceResult);
      setDistance(distanceResult);
      setDisplayedDistance(distanceResult);
      
    } catch (error) {
      console.error("Error in calculateDistanceByAddress:", error);
      setLocalDistance("0");
      setDistance("0");
      setDisplayedDistance("0");
    }
  };

  useEffect(() => {
    if (distance) {
      // Asegurarnos de tener valores válidos para el cálculo
      const distanceValue = parseFloat(distance) || 0;
      const precioKmValue = parseFloat(precioPorK) || 1000; // Valor predeterminado si no hay valor
      const precioBaseValue = parseFloat(precioKilometro) || 0;
      
      // Calculamos el subtotal (distancia * precio por kilómetro)
      const subtotal = distanceValue * precioKmValue;
      setDisplayedSubtotal(subtotal.toFixed(2));
      
      // Calculamos el total (subtotal + precio base del servicio)
      const total = subtotal + precioBaseValue;
      
      console.log("Cálculo del precio total:");
      console.log(`Distancia: ${distanceValue} km`);
      console.log(`Precio por km: $${precioKmValue}`);
      console.log(`Subtotal (distancia * precio por km): $${subtotal.toFixed(2)}`);
      console.log(`Precio base del servicio: $${precioBaseValue}`);
      console.log(`Total: $${total.toFixed(2)}`);
      
      setTotalPrice(total.toFixed(2));
      setDisplayedTotal(total.toFixed(2));
      
      if (addressA && addressB) {
        saveData(addressA, coordinatesA, addressB, coordinatesB, total.toFixed(2));
      }
    }
  }, [distance, precioPorK, precioKilometro]);

  const saveData = async (addressA, coordinatesA, addressB, coordinatesB, totalPrice) => {
    try {
      await AsyncStorage.setItem("addressA", addressA || "");
      await AsyncStorage.setItem("coordinatesA", coordinatesA ? JSON.stringify(coordinatesA) : "{}");
      await AsyncStorage.setItem("addressB", addressB || "");
      await AsyncStorage.setItem("coordinatesB", coordinatesB ? JSON.stringify(coordinatesB) : "{}");
      await AsyncStorage.setItem("totalPrice", totalPrice ? totalPrice.toString() : "0");
      await AsyncStorage.setItem("distance", distance ? distance.toString() : "0");
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  const handleAddressAChange = (text) => {
    setAddressA(text);
    fetchSuggestions(text, setSuggestionsA);
  };

  const handleAddressBChange = (text) => {
    setAddressB(text);
    fetchSuggestions(text, setSuggestionsB);
  };

  const handleSuggestionASelect = async (item) => {
    setAddressA(item.description);
    setSuggestionsA([]);
    if (addressB) {
      calculateDistanceByAddress(item.description, addressB);
    }
  };

  const handleSuggestionBSelect = async (item) => {
    setAddressB(item.description);
    setSuggestionsB([]);
    if (addressA) {
      calculateDistanceByAddress(addressA, item.description);
    }
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Seleccionar ubicación</Text>
      <View style={styles.locationBox}>
        <View style={styles.locationItem}>
          <View style={styles.locationRow}>
            <Icon name="map-marker" size={22} color="#fa6205" />
            <Text style={styles.pointTitle}> Punto A</Text>
            <TouchableOpacity style={styles.addButton}>
              <IconMC name="pluscircleo" size={22} color="#000" />
            </TouchableOpacity>
          </View>
          <Text style={styles.pointSubtitle}>Donde inicia tu mandado</Text>
          <TextInput
            style={styles.pointAddress}
            value={addressA}
            onChangeText={handleAddressAChange}
            onBlur={() => {
              if (addressA && addressB) {
                calculateDistanceByAddress(addressA, addressB);
              }
            }}
            placeholder="Aqui ingresar direccion A"
            multiline={true}
          />
          <FlatList
            data={suggestionsA}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSuggestionASelect(item)}
              >
                <Text style={styles.suggestion}>{item.description}</Text>
              </TouchableOpacity>
            )}
          />

          {/* Línea de puntos entre Punto A y Punto B */}
          <View style={styles.dottedLineContainer}>
            <LinearGradient
              colors={["rgba(0, 153, 0, 0.3)", "rgba(0, 153, 0, 1)"]}
              style={styles.gradientOverlay}
            />
            <View style={styles.dottedLine} />
          </View>
        </View>

        <View style={styles.locationItem}>
          <View style={styles.locationRow}>
            <Icon name="map-marker" size={22} color="#fa6205" />
            <Text style={styles.pointTitle}> Punto B</Text>
            <TouchableOpacity style={styles.addButton}>
              <IconMC name="pluscircleo" size={22} color="#000" />
            </TouchableOpacity>
          </View>
          <Text style={styles.pointSubtitle}>Donde termina tu mandado</Text>
          <TextInput
            style={styles.pointAddress}
            value={addressB}
            onChangeText={handleAddressBChange}
            onBlur={() => {
              if (addressA && addressB) {
                calculateDistanceByAddress(addressA, addressB);
              }
            }}
            placeholder="Aqui ingresar direccion B"
            multiline={true}
          />
          <FlatList
            data={suggestionsB}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSuggestionBSelect(item)}
              >
                <Text style={styles.suggestion}>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      {/* Sección de información de distancia y precio 
      <View style={styles.pricingContainer}>
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>Distancia calculada:</Text>
          <Text style={styles.pricingValue}>{displayedDistance} km</Text>
        </View>
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>Valor por kilómetro:</Text>
          <Text style={styles.pricingValue}>${displayedValorKm}</Text>
        </View>
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>Subtotal distancia:</Text>
          <Text style={styles.pricingValue}>${displayedSubtotal}</Text>
        </View>
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>Precio base del servicio:</Text>
          <Text style={styles.pricingValue}>${precioKilometro || "0"}</Text>
        </View>
        <View style={[styles.pricingRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>TOTAL:</Text>
          <Text style={styles.totalValue}>${displayedTotal}</Text>
        </View>
      </View>*/}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
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
    minHeight: 40,
    textAlignVertical: 'top',
  },
  addButton: {
    marginLeft: "auto",
    padding: 5,
    borderRadius: 5,
  },
  dottedLineContainer: {
    position: "absolute",
    left: 6,
    top: 40,
    height: 50,
    width: 2,
    overflow: "hidden",
  },
  dottedLine: {
    height: "100%",
    top: 0,
    borderLeftWidth: 2,
    borderStyle: "dashed",
    borderColor: "#fde2cc",
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  suggestion: {
    padding: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  pricingContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  pricingLabel: {
    fontSize: 16,
    color: "#DDD",
  },
  pricingValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fa6205",
  },
  totalRow: {
    marginTop: 10,
    borderBottomWidth: 0,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fa6205",
  },
});

export default LocationSection;