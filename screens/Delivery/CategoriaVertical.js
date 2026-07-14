import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_300Light,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Location from "expo-location";

import { BASE_URL } from "../../constants/url";

const { width } = Dimensions.get("window");
const cardWidth = (width - 40) / 2; // 40 = total padding + margin

export default function CategoriaVertical() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();
  const tipo = (route.params?.tipo || '').toLowerCase().trim();

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_300Light,
  });

  // Get image URL helper function
  const getImageUrl = (photoPath) => {
    if (!photoPath) return null;

    if (photoPath.startsWith("http")) return photoPath;

    // CORRECCIÓN AQUÍ: Agregamos .toString()
    // Esto fuerza a obtener el texto "https://..." antes de intentar reemplazar
    return `${BASE_URL.toString().replace("/api/", "")}/storage/${photoPath}`;
  };

  // Function to capture, save and return user location
  const captureAndSaveLocation = async () => {
    try {
      // First check for permissions
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Necesitamos permisos de ubicación para mostrar categorías cercanas.",
          [{ text: "OK" }]
        );
        return null;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Save to state for immediate use
      setLocation(currentLocation.coords);

      // Save to AsyncStorage for persistence
      await AsyncStorage.setItem(
        "userLocation",
        JSON.stringify({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          timestamp: new Date().toISOString(),
        })
      );

      console.log(
        "Location saved:",
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );

      return currentLocation.coords;
    } catch (error) {
      console.error("Error capturando ubicación:", error);
      Alert.alert(
        "Error de ubicación",
        "No pudimos obtener tu ubicación. Se usarán coordenadas predeterminadas."
      );
      return null;
    }
  };

  // Function to get location from various sources
  const getStoredLocation = async () => {
    // First check if we have it in state
    if (location) {
      return location;
    }

    // Then try to get from AsyncStorage
    try {
      const savedLocation = await AsyncStorage.getItem("userLocation");
      if (savedLocation) {
        const parsedLocation = JSON.parse(savedLocation);

        // Check if location is recent (less than 30 minutes old)
        const savedTime = new Date(parsedLocation.timestamp).getTime();
        const currentTime = new Date().getTime();
        const thirtyMinutesInMs = 30 * 60 * 1000;

        if (currentTime - savedTime < thirtyMinutesInMs) {
          setLocation(parsedLocation);
          return parsedLocation;
        } else {
          console.log("Stored location is too old, getting a fresh one");
        }
      }
    } catch (error) {
      console.error("Error getting stored location:", error);
    }

    // If we get here, we need a fresh location
    return await captureAndSaveLocation();
  };


  // Fetch categories from API
  const fetchCategories = async (userLocation) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const isDemo = await AsyncStorage.getItem("user_demo") === "true";

      // Try to get location from parameter first
      let locationToUse = userLocation;

      // If not provided, try to get from stored sources
      if (!locationToUse) {
        locationToUse = await getStoredLocation();
      }

      // Prepare location data for API request
      const locationData = {
        latitud: locationToUse?.latitude || 4.8124573,
        longitud: locationToUse?.longitude || -75.7772694,
      };

      console.log("User is demo:", isDemo);

      // For demo users or if no token is available, use the no-auth endpoint directly
      if (isDemo || !token) {
        return fetchCategoriesNoAuth(locationData);
      }

      // Only authenticated users reach this point
      const url = `${BASE_URL}global-categorias/get/obtener`;

      console.log("Sending authenticated request to:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(locationData),
      });

      if (!response.ok) {
        console.error("API response status:", response.status);
        const errorText = await response.text();
        console.error("API error response:", errorText);

        // If unauthorized, try the non-auth endpoint
        if (response.status === 401) {
          console.log("Authentication failed, falling back to no-auth endpoint");
          return fetchCategoriesNoAuth(locationData);
        }

        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log(
        "Categories response:",
        responseData.status,
        responseData.data?.length || 0
      );

      // Verify we have valid data in the response
      if (responseData.status && Array.isArray(responseData.data)) {
        // Map global categories to the format required by the UI
        const formattedCategories = responseData.data.map((globalCategory) => {
          return {
            id: globalCategory.id.toString(),
            title: globalCategory.nombre,
            image: globalCategory.icono
              ? getImageUrl(globalCategory.icono)
              : require("../../assets/images/yar.png"),
            establishmentCount: globalCategory.users.length + globalCategory.user_sedes.length,
            establishments: globalCategory.users || [],
            establishmentsSedes: globalCategory.user_sedes,
            tipo_categoria: (globalCategory.tipo_categoria || '').toLowerCase().trim(), 
          };
        });

        setCategories(formattedCategories);
      }
    } catch (error) {
      console.error("Error al obtener categorías:", error);
      try {
        const locationData = {
          latitud: userLocation?.latitude || 4.8124573,
          longitud: userLocation?.longitude || -75.7772694,
        };
        await fetchCategoriesNoAuth(locationData);
      } catch (fallbackError) {
        console.error("Final fallback attempt also failed:", fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Additional function to fetch categories without auth as fallback
  const fetchCategoriesNoAuth = async (locationData) => {
    try {
      const url = `${BASE_URL}global-categorias/get/obtener/no-auth`;
      console.log("Falling back to no-auth endpoint:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(locationData),
      });

      if (!response.ok) {
        console.error("Fallback API response status:", response.status);
        const errorText = await response.text();
        console.error("Fallback API error response:", errorText);
        throw new Error(`HTTP error in fallback! Status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log(
        "Fallback categories response:",
        responseData.status,
        responseData.data?.length || 0
      );

      // Verify we have valid data in the response
      if (responseData.status && Array.isArray(responseData.data)) {
        // Map global categories to the format required by the UI
        const formattedCategories = responseData.data.map((globalCategory) => {
          return {
            id: globalCategory.id.toString(),
            title: globalCategory.nombre,
            image: globalCategory.icono
              ? getImageUrl(globalCategory.icono)
              : require("../../assets/images/yar.png"),
            establishmentCount: globalCategory.users?.length || 0,
            establishments: globalCategory.users || [],
            tipo_categoria: (globalCategory.tipo_categoria || '').toLowerCase().trim(), // <-- fix: include tipo_categoria
          };
        });

        setCategories(formattedCategories);
      }
    } catch (error) {
      console.error("Error al obtener categorías (fallback):", error);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        // Get location from stored sources first
        const userLocation = await getStoredLocation();
        await fetchCategories(userLocation);
      } catch (error) {
        console.error("Error en la inicialización:", error);
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Return loading indicator if fonts are not loaded or data is loading
  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A3FF00" />
      </View>
    );
  }

  // Filter categories by tipo_categoria if tipo param is provided
  const filteredCategories = tipo
    ? categories.filter(cat => (cat.tipo_categoria || '').toLowerCase().trim() === tipo)
    : categories;

  // Render each category item
  const renderCategoryItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8} 
        onPress={() =>
          navigation.navigate("Categorias", {
            categoryId: item.id,
            categoryName: item.title,
            establishments: item.establishments,
            establishmentsSedes : item.establishmentsSedes
          })
        }
      >
        <View style={styles.imageContainer}>
          {item.image ? (
            typeof item.image === "string" ? (
              <Image source={{ uri: item.image }} style={styles.cardImage} />
            ) : (
              <Image source={item.image} style={styles.cardImage} />
            )
          ) : (
            <Image
              source={require("../../assets/images/yar.png")}
              style={styles.cardImage}
            />
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.establishmentCount > 0 && (
            <Text style={styles.cardSubtitle}>
              {item.establishmentCount}{" "}
              {item.establishmentCount === 1 ? "Tienda" : "Tiendas"}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={25} color="#2B2B2B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categorías</Text>
        <View style={styles.placeholder}></View>
      </View>

      {/* Main Content */}
      <View style={styles.container}>
        {filteredCategories.length > 0 ? (
          <FlatList
            data={filteredCategories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContainer}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={60} color="#666" />
            <Text style={styles.noDataText}>No hay categorías disponibles</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#242424",
    paddingTop: Platform.OS === "android" ? 10 : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#242424",
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#9BFE03",
    padding: 15,
    marginTop: 30,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Montserrat_700Bold",
    color: "#2B2B2B",
  },
  placeholder: {
    width: 35, // Same width as back button for balanced header
  },
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#121212",
  },
  gridContainer: {
    paddingHorizontal: 5,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#1A1A1A", // Fondo de tarjeta mucho más oscuro
    borderRadius: 16, // Bordes un poco más redondeados para modernidad
    margin: 6,
    width: cardWidth,
    overflow: "hidden",

    // Sutil borde para definir la tarjeta en modo oscuro
    borderWidth: 1,
    borderColor: "#333333",

    // Sombras más sutiles pero oscuras
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  imageContainer: {
    width: "100%",
    height: 110, // Un poco más compacto
    overflow: "hidden",
    backgroundColor: "#252525", // Fondo oscuro placeholder detrás de la imagen
    justifyContent: "center",
    alignItems: "center",
  },
  cardImage: {
    width: "80%", // Reduje un poco para que la imagen "respire" dentro del contenedor
    height: "80%",
    resizeMode: "contain",
    // IMPORTANTE: Quitamos el backgroundColor claro (#ECFFE6)
  },
  cardContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#1A1A1A", // Asegura coincidencia con la tarjeta
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    color: "#FFFFFF", // Blanco puro para máximo contraste
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold", // Un poco más de peso
    color: "#9BFE03", // Tu color de acento se ve genial sobre el negro
    textTransform: "uppercase", // Le da un toque más "tech"
    opacity: 0.9,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noDataText: {
    color: "#aaa",
    textAlign: "center",
    padding: 20,
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
  },
});
