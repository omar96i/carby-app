import React, { useState, useEffect } from "react";
import { Entypo, FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  Dimensions,
  TextInput, // Added for category edit
  FlatList
} from "react-native";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_300Light,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import CategoriesScreen from "../Categories/CategoriesScreen";
import { BASE_URL } from "../../constants/url";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import { AntDesign } from "@expo/vector-icons";

const renderScrollHintFooter = () => (
  <View style={styles.scrollHintFooter}>
    <Ionicons name="arrow-forward-circle-outline" size={30} color="#7d7d7d" />
    <Text style={styles.scrollHintText}>Desliza</Text>
  </View>
);

const ShopDos = () => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [establishmentName, setEstablishmentName] = useState("Mi Tienda");
  const [activeProducts, setActiveProducts] = useState({});
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [mapLocation, setMapLocation] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  // New state for category edit/delete
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [ratings, setRatings] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingsModalVisible, setRatingsModalVisible] = useState(false);
  const [isLoadingRatings, setIsLoadingRatings] = useState(false);
  // Nuevo estado para servicios
  const [services, setServices] = useState([]);

  // Estados para validación de métodos de pago
  const [paymentMethodModalVisible, setPaymentMethodModalVisible] =
    useState(false);
  const [userPaymentType, setUserPaymentType] = useState(null);

  const toggleTienda = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "No se encontró información de autenticación");
        return;
      }
      const activar = !userData.tienda_estado;
      const endpoint = activar
        ? `${BASE_URL}usuario/activar-tienda/${userData.id}`
        : `${BASE_URL}usuario/desactivar-tienda/${userData.id}`;

      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) throw new Error("Error al actualizar el estado");

      const data = await res.json();

      // Actualizar estado local del usuario
      setUserData((prev) => ({
        ...prev,
        tienda_estado: data.tienda_estado,
      }));
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo actualizar el estado de la tienda");
    } finally {
      setLoading(false);
    }
  };

  // Estados para categoría global
  const [globalCategory, setGlobalCategory] = useState(null);
  const [isLoadingGlobalCategory, setIsLoadingGlobalCategory] = useState(false);

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_300Light,
  });

  // Aseguramos que la URL base tenga el formato correcto
  const getApiUrl = (endpoint) => {
    // Aseguramos que hay una barra al final de BASE_URL y quitamos la barra inicial del endpoint si existe
    const baseUrl = BASE_URL.toString().endsWith("/") ? BASE_URL : `${BASE_URL}/`;
    const cleanEndpoint = endpoint.startsWith("/")
      ? endpoint.substring(1)
      : endpoint;
    return `${baseUrl}${cleanEndpoint}`;
  };

  // Función para obtener URL completa de imagen
  const getImageUrl = (photoPath) => {
    if (!photoPath) return null;

    // Si la ruta ya es una URL completa, la devolvemos tal cual
    if (photoPath.startsWith("http")) return photoPath;

    // Si no, formamos la URL completa
    return `${BASE_URL.toString().replace("/api", "")}/storage/${photoPath}`;
  };

  // Functions for category edit/delete
  const showEditCategoryModal = (category) => {
    setSelectedCategory(category);
    setNewCategoryName(category.nombre);
    setEditModalVisible(true);
  };

  const showDeleteCategoryModal = (category) => {
    setSelectedCategory(category);
    setDeleteModalVisible(true);
  };

  const handleEditCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert("Error", "El nombre de la categoría no puede estar vacío");
      return;
    }

    setIsProcessing(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "No se encontró token de autenticación");
        return;
      }

      const response = await fetch(
        getApiUrl(`categorias/${selectedCategory.id}`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nombre: newCategoryName,
          }),
        }
      );

      if (response.ok) {
        // Update local state with the new category name
        setCategories(
          categories.map((cat) =>
            cat.id === selectedCategory.id
              ? { ...cat, nombre: newCategoryName }
              : cat
          )
        );
        Alert.alert("Éxito", "Categoría actualizada correctamente");
        setEditModalVisible(false);
      } else {
        const errorData = await response.json();
        Alert.alert(
          "Error",
          errorData.message || "No se pudo actualizar la categoría"
        );
      }
    } catch (error) {
      console.error("Error al actualizar categoría:", error);
      Alert.alert("Error", "Ocurrió un problema al actualizar la categoría");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCategory = async () => {
    setIsProcessing(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "No se encontró token de autenticación");
        return;
      }

      const response = await fetch(
        getApiUrl(`categorias/${selectedCategory.id}`),
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        // Remove the deleted category from the local state
        setCategories(
          categories.filter((cat) => cat.id !== selectedCategory.id)
        );
        Alert.alert("Éxito", "Categoría eliminada correctamente");
        setDeleteModalVisible(false);
      } else {
        const errorData = await response.json();
        Alert.alert(
          "Error",
          errorData.message || "No se pudo eliminar la categoría"
        );
      }
    } catch (error) {
      console.error("Error al eliminar categoría:", error);
      Alert.alert("Error", "Ocurrió un problema al eliminar la categoría");
    } finally {
      setIsProcessing(false);
    }
  };
  // Función para obtener la categoría global
  const fetchGlobalCategory = async (globalCategoriaId) => {
    if (!globalCategoriaId) return;

    setIsLoadingGlobalCategory(true);
    try {
      const response = await fetch(getApiUrl("global-categorias/get/obtener"), {
        method: "GET",
        headers: {
          Accept: "application/json",
          // Sin token como especificaste
        },
      });

      const data = await response.json();
      console.log("Categorías globales obtenidas:", data);

      if (data && data.status === true && Array.isArray(data.data)) {
        // Buscar la categoría específica por ID
        const foundCategory = data.data.find(
          (category) => category.id === globalCategoriaId
        );

        if (foundCategory) {
          setGlobalCategory(foundCategory);
          console.log("Categoría global encontrada:", foundCategory);
          console.log("Tipo de categoría:", foundCategory.tipo_categoria);
        } else {
          console.log(
            "No se encontró la categoría global con ID:",
            globalCategoriaId
          );
        }
      } else {
        console.log(
          "Formato de respuesta de categorías globales no esperado:",
          data
        );
      }
    } catch (error) {
      console.error("Error al cargar categoría global:", error);
    } finally {
      setIsLoadingGlobalCategory(false);
    }
  };

  const fetchUserDetails = async () => {
    setIsLoadingRatings(true);
    try {
      // Obtener el token y el userId de AsyncStorage
      const token = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");

      // Intentar obtener la imagen de perfil directamente desde AsyncStorage
      const storedProfileImage = await AsyncStorage.getItem("userProfileImage");
      if (storedProfileImage) {
        setProfileImageUrl(storedProfileImage);
      }

      if (!token || !userData) {
        Alert.alert("Error", "No se encontró información de autenticación");
        return;
      }

      const parsedUserData = JSON.parse(userData);
      const userId = parsedUserData.id;

      // Consultar la API para obtener los detalles actualizados del usuario
      const response = await fetch(`${BASE_URL}usuario/${userId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      console.log("Datos del usuario obtenidos:", data);

      // Verificar si el campo establecimiento_nombre existe y actualizarlo
      if (
        data.status === true &&
        data.data &&
        data.data.establecimiento_nombre
      ) {
        setEstablishmentName(data.data.establecimiento_nombre);
        console.log(
          "Nombre del establecimiento actualizado:",
          data.data.establecimiento_nombre
        );
      } else {
        console.log(
          "No se encontró el nombre del establecimiento en la respuesta"
        );
      }

      // Verificar y obtener la categoría global
      if (data.status === true && data.data && data.data.global_categoria_id) {
        console.log(
          "Global categoria ID encontrado:",
          data.data.global_categoria_id
        );
        await fetchGlobalCategory(data.data.global_categoria_id);
      } else {
        console.log("No se encontró global_categoria_id en la respuesta");
        // Si no hay global_categoria_id, asumimos que es una categoría de servicios por defecto
        setGlobalCategory({ tipo_categoria: "servicios" });
      }

      // Verificar métodos de pago del usuario
      if (data.status === true && data.data) {
        const paymentType = data.data.user_tipo_pago;
        setUserPaymentType(paymentType);

        // Mostrar modal si no hay métodos de pago configurados
        if (!paymentType || paymentType === null) {
          setPaymentMethodModalVisible(true);
        }
      }

      // Extraer el promedio de calificación si existe
      if (
        data.status === true &&
        data.data &&
        data.data.promedio_puntuacion_restaurante
      ) {
        setAverageRating(
          parseFloat(data.data.promedio_puntuacion_restaurante) || 0
        );
      }

      // Extraer las calificaciones individuales si existen
      if (data.status === true && data.data && data.data.comercio_pedidos) {
        // Filtrar solo los pedidos que tienen calificación
        const ratedOrders = data.data.comercio_pedidos.filter(
          (pedido) => pedido.puntuacion_restaurante !== null
        );

        // Ordenar por fecha más reciente
        ratedOrders.sort(
          (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
        );

        // Guardar en el estado
        setRatings(ratedOrders);
      }

      // Buscar y establecer la imagen de perfil si no se encontró en AsyncStorage
      if (!profileImageUrl && data.data) {
        const profileImage =
          data.data.fotografia_perfil ||
          data.data.foto_document_file ||
          data.data.foto_documento_file;

        if (profileImage) {
          const url = getImageUrl(profileImage);
          setProfileImageUrl(url);
          // Guardar URL para futuras referencias
          await AsyncStorage.setItem("userProfileImage", url);
        }
      }

      // También actualizamos el userData completo para tenerlo disponible
      setUserData(data.data);
    } catch (error) {
      console.error("Error obteniendo detalles del usuario:", error);
    } finally {
      setIsLoadingRatings(false);
    }
  };
  ///
  const renderStars = (rating, size = 16) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <AntDesign
            key={star}
            name={rating >= star ? "star" : "staro"}
            size={size}
            color={rating >= star ? "#FFD700" : "#aaa"}
            style={styles.starIcon}
          />
        ))}
      </View>
    );
  };

  // Función para formatear la fecha

  // Toggle product activation status
  const toggleProductStatus = async (productId, currentStatus) => {
    try {
      console.log(currentStatus + " - " + productId)
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "No se encontró información de autenticación");
        return;
      }
      const url = currentStatus
        ? `${BASE_URL}productos/desactivar/${productId}`
        : `${BASE_URL}productos/activar/${productId}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.status) {
        refreshCategories()
      } else {
        Alert.alert("Error", "No se pudo cambiar el estado del producto.");
      }
    } catch (error) {
      console.error("Error al cambiar estado del producto:", error);
      Alert.alert("Error", "Ocurrió un error inesperado.");
    }
  };

  // Función para obtener las categorías desde la API
  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "No se encontró token de autenticación");
        setIsLoading(false);
        return;
      }

      const response = await fetch(getApiUrl("categorias"), {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("Categorías obtenidas:", data);

      if (data && data.categorias && Array.isArray(data.categorias)) {
        setCategories(data.categorias);
      } else {
        console.log("Formato de respuesta no esperado:", data);
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para obtener los productos desde la API
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "No se encontró token de autenticación");
        setIsLoadingProducts(false);
        return;
      }

      const response = await fetch(getApiUrl("productos"), {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("Productos obtenidos:", data);

      // Manejar la respuesta según su estructura
      if (data && Array.isArray(data) && data.length > 0) {
        // Si la respuesta es directamente un array
        setProducts(data);

        // Initialize active status for products
        const initialActiveStatus = {};
        data.forEach((product) => {
          initialActiveStatus[product.id] =
            product.activo !== undefined ? Boolean(product.activo) : true;
        });
        setActiveProducts(initialActiveStatus);

        // Extraer el nombre del establecimiento del primer producto
        if (data[0].user && data[0].user.establecimiento_nombre) {
          setEstablishmentName(data[0].user.establecimiento_nombre);
        }
      } else if (
        data &&
        data.productos &&
        Array.isArray(data.productos) &&
        data.productos.length > 0
      ) {
        // Si la respuesta está dentro de un objeto con clave "productos"
        setProducts(data.productos);

        // Initialize active status for products
        const initialActiveStatus = {};
        data.productos.forEach((product) => {
          initialActiveStatus[product.id] =
            product.activo !== undefined ? Boolean(product.activo) : true;
        });
        setActiveProducts(initialActiveStatus);

        // Extraer el nombre del establecimiento del primer producto
        if (
          data.productos[0].user &&
          data.productos[0].user.establecimiento_nombre
        ) {
          setEstablishmentName(data.productos[0].user.establecimiento_nombre);
        }
      } else {
        console.log("Formato de respuesta de productos no esperado:", data);
      }
    } catch (error) {
      console.error("Error al cargar productos:", error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Obtener servicios del usuario
  const fetchServices = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");
      if (!token || !userData) return;
      const userId = JSON.parse(userData).id;
      const response = await fetch(
        getApiUrl(`user-servicio/by-user/${userId}`),
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data && Array.isArray(data.data)) setServices(data.data);
      else setServices([]);
    } catch (error) {
      setServices([]);
    }
  };

  // Función para obtener la ubicación actual
  const getCurrentLocation = async () => {
    try {
      setIsLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Necesitamos permiso para acceder a tu ubicación para guardar la ubicación de tu tienda."
        );
        setIsLocationLoading(false);
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setIsLocationLoading(false);
      return location.coords;
    } catch (error) {
      console.error("Error obteniendo ubicación:", error);
      Alert.alert(
        "Error",
        "No pudimos obtener tu ubicación. Por favor, intenta de nuevo."
      );
      setIsLocationLoading(false);
      return null;
    }
  };

  // Función para mostrar modal con ubicación
  const showLocationModal = async () => {
    try {
      setModalVisible(true);
      setMapLoading(true);

      const location = await getCurrentLocation();
      if (location) {
        setMapLocation({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      }
    } catch (error) {
      console.error("Error al obtener ubicación para el mapa:", error);
      Alert.alert("Error", "No pudimos obtener tu ubicación actual");
    } finally {
      setMapLoading(false);
    }
  };

  const handleBannerPress = () => {

    navigation.navigate("StepUno");

  };
  // Function to save shop location
  const saveShopLocation = async () => {
    try {
      setIsLocationLoading(true);

      // Get user ID from storage
      const userData = await AsyncStorage.getItem("userData");
      if (!userData) {
        Alert.alert("Error", "No se encontraron datos de usuario.");
        setIsLocationLoading(false);
        return;
      }

      const user = JSON.parse(userData);
      const userId = user.id;

      // Get current location if not already available
      const coords = currentLocation || (await getCurrentLocation());
      if (!coords) {
        setIsLocationLoading(false);
        return;
      }

      // Get token for API call
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "No se encontró token de autenticación.");
        setIsLocationLoading(false);
        return;
      }

      // Make API call to save location
      const response = await fetch(`${BASE_URL}localizacion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          latitud: coords.latitude,
          longitud: coords.longitude,
          estado: "activo",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Éxito", "Ubicación de la tienda guardada correctamente.");
      } else {
        Alert.alert(
          "Error",
          data.message || "No se pudo guardar la ubicación."
        );
      }
    } catch (error) {
      console.error("Error guardando ubicación:", error);
      Alert.alert("Error", "Ocurrió un problema al guardar la ubicación.");
    } finally {
      setIsLocationLoading(false);
    }
  };

  // Función para guardar ubicación desde el modal
  const saveLocationFromModal = async () => {
    try {
      await saveShopLocation();
      setModalVisible(false);
    } catch (error) {
      console.error("Error al guardar ubicación desde el modal:", error);
    }
  };

  // Función para eliminar un producto
  const handleDeleteProduct = async (productId) => {
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro que deseas eliminar este producto?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingProductId(productId);
              const token = await AsyncStorage.getItem("userToken");
              if (!token) {
                Alert.alert("Error", "No se encontró token de autenticación");
                setDeletingProductId(null);
                return;
              }

              const response = await fetch(
                getApiUrl(`productos/${productId}`),
                {
                  method: "DELETE",
                  headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (response.ok) {
                setProducts(products.filter((p) => p.id !== productId));
                Alert.alert("Éxito", "Producto eliminado correctamente");
              } else {
                const errorText = await response.text();
                let errorMsg = "No se pudo eliminar el producto";

                try {
                  // Intentar parsear respuesta como JSON
                  const errorData = JSON.parse(errorText);
                  errorMsg = errorData.message || errorMsg;
                } catch (e) {
                  console.error("Error al parsear respuesta:", errorText);
                }

                Alert.alert("Error", errorMsg);
              }
            } catch (error) {
              console.error("Error al eliminar producto:", error);
              Alert.alert("Error", "Ocurrió un error al eliminar el producto");
            } finally {
              setDeletingProductId(null);
            }
          },
        },
      ]
    );
  };

  // Modifica el useEffect existente para incluir nuestra nueva función
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
    fetchUserDetails(); // Llamar a nuestra nueva función
    fetchCategories();
    fetchProducts();
    fetchServices();
  }, []);

  // Modifica el useEffect de navegación para incluir también nuestra nueva función
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchUserDetails(); // Obtener datos actualizados del usuario
      fetchCategories();
      fetchProducts();
      fetchServices();
    });

    return unsubscribe;
  }, [navigation]);

  const refreshCategories = () => {
    fetchCategories();
    fetchProducts();
    Alert.alert("Actualizando", "Actualizando categorías y productos...");
  };

  // Actualizar datos al regresar a esta pantalla
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchCategories();
      fetchProducts();
    });

    return unsubscribe;
  }, [navigation]);

  // Función para filtrar productos por categoría
  const getProductsByCategory = (categoryId) => {
    return products.filter((product) => product.categoria_id === categoryId);
  };

  // Función para filtrar servicios por categoría
  const getServicesByCategory = (categoryId) => {
    return services.filter((service) => service.categoria_id === categoryId);
  };
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fa6205" />
        <Text style={styles.loadingText}>Cargando fuentes...</Text>
      </View>
    );
  }
  return (
    <ScrollView style={styles.container}>

      {/* Modal de validación de métodos de pago */}
      <Modal
        transparent={true}
        visible={paymentMethodModalVisible}
        onRequestClose={() => { }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.paymentModalContent}>
            <View style={styles.paymentModalHeader}>
              <Ionicons name="card-outline" size={50} color="#fa6205" />
              <Text style={styles.paymentModalTitle}>
                Configura tus métodos de pago
              </Text>
            </View>

            <Text style={styles.paymentModalMessage}>
              Por favor, es importante que configures tus métodos de pago para
              que tus clientes puedan realizar pedidos.
            </Text>

            <View style={styles.paymentModalButtons}>
              <TouchableOpacity
                style={styles.configurePaymentButton}
                onPress={() => navigation.navigate("Perfil")}
              >
                <Text style={styles.configurePaymentButtonText}>
                  Configurar métodos de pago
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.laterButton}
                onPress={() => setPaymentMethodModalVisible(false)}
              >
                <Text style={styles.laterButtonText}>Más tarde</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de ubicación */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={ratingsModalVisible}
        onRequestClose={() => setRatingsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.ratingsModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mis Calificaciones</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setRatingsModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingsSummary}>
              <Text style={styles.averageRatingNumber}>
                {averageRating.toFixed(1)}
              </Text>
              {renderStars(averageRating, 24)}
              <Text style={styles.totalRatingsText}>
                {ratings.length}
                {ratings.length === 1 ? "calificación" : "calificaciones"} en
                total
              </Text>
            </View>

            <ScrollView style={styles.ratingsListContainer}>
              {isLoadingRatings ? (
                <View style={styles.loadingRatingsContainer}>
                  <ActivityIndicator size="large" color="#fa6205" />
                  <Text style={styles.loadingText}>
                    Cargando calificaciones...
                  </Text>
                </View>
              ) : ratings.length > 0 ? (
                ratings.map((rating, index) => (
                  <View
                    key={`rating-${rating.id}-${index}`}
                    style={styles.ratingItem}
                  >
                    <View style={styles.ratingHeader}>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>
                          {rating.user?.nombre_completo || "Cliente"}
                        </Text>
                      </View>
                      <View style={styles.ratingValue}>
                        {renderStars(rating.puntuacion_restaurante)}
                      </View>
                    </View>
                    {rating.comentario_restaurante && (
                      <Text style={styles.ratingComment}>
                        "{rating.comentario_restaurante}"
                      </Text>
                    )}
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderInfoText}>
                        Pedido #{rating.id} • $ 
                        {parseFloat(rating.costo_total).toFixed(2)} •
                        {rating.metodo_pago}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noRatingsContainer}>
                  <Ionicons name="star-outline" size={50} color="#fa6205" />
                  <Text style={styles.noRatingsText}>
                    Aún no tienes calificaciones
                  </Text>
                  <Text style={styles.noRatingsSubText}>
                    Cuando tus clientes califiquen tus servicios, aparecerán
                    aquí
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tu ubicación actual</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {mapLoading ? (
              <View style={styles.mapLoadingContainer}>
                <ActivityIndicator size="large" color="#fa6205" />
                <Text style={styles.mapLoadingText}>
                  Obteniendo ubicación...
                </Text>
              </View>
            ) : (
              <View>
                {mapLocation ? (
                  <View style={styles.mapContainer}>
                    <MapView
                      style={styles.map}
                      region={mapLocation}
                      showsUserLocation={true}
                    >
                      <Marker
                        coordinate={{
                          latitude: mapLocation.latitude,
                          longitude: mapLocation.longitude,
                        }}
                        title={establishmentName}
                        description="Tu ubicación actual"
                      />
                    </MapView>

                    <View style={styles.locationInfoContainer}>
                      <Text style={styles.locationInfoTitle}>Coordenadas:</Text>
                      <Text style={styles.locationInfoText}>
                        Latitud: {mapLocation.latitude.toFixed(6)}
                      </Text>
                      <Text style={styles.locationInfoText}>
                        Longitud: {mapLocation.longitude.toFixed(6)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noLocationContainer}>
                    <Ionicons name="location-off" size={50} color="#fa6205" />
                    <Text style={styles.noLocationText}>
                      No se pudo obtener la ubicación
                    </Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.saveLocationModalButton}
              onPress={saveLocationFromModal}
              disabled={!mapLocation || isLocationLoading}
            >
              {isLocationLoading ? (
                <ActivityIndicator size="small" color="#1C1C1E" />
              ) : (
                <Text style={styles.saveLocationModalButtonText}>
                  Guardar esta ubicación
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Modal para editar categoría */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Categoría</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nombre de la categoría</Text>
              <TextInput
                style={styles.textInput}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="Nombre de la categoría"
                placeholderTextColor="#999"
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleEditCategory}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#1C1C1E" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Modal para confirmar eliminación de categoría */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Eliminar Categoría</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.deleteWarningText}>
              ¿Estás seguro que deseas eliminar la categoría "
              {selectedCategory?.nombre}"?
            </Text>
            <Text style={styles.deleteWarningSubtext}>
              Esta acción eliminará la categoría y podría afectar a los
              productos asociados.
            </Text>

            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDeleteModalVisible(false)}
                disabled={isProcessing}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleDeleteCategory}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#1C1C1E" />
                ) : (
                  <Text style={styles.deleteButtonText}>Eliminar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={showLocationModal}>
          <Ionicons
            name="location-outline"
            size={25}
            color="#333333"
            style={styles.icon}
          />
        </TouchableOpacity>
        <View style={styles.establishmentInfo}>
          <Text style={styles.locationTextUno}>{establishmentName}</Text>
          {globalCategory && (
            <Text style={styles.categoryTypeText}>
              {globalCategory.tipo_categoria === "productos"
                ? "🛒 Productos"
                : "🔧 Servicios"}
            </Text>
          )}
        </View>
        <Image
          source={{ uri: profileImageUrl }}
          style={styles.avatar}
          onError={() => console.log("Error al cargar la imagen de perfil")}
        />
      </View>
      <TouchableOpacity
        style={styles.ratingsSection}
        onPress={() => setRatingsModalVisible(true)}
      >
        <View style={styles.ratingSummary}>
          <Text style={styles.ratingTitle}>Mi calificación</Text>
          <View style={styles.ratingDetails}>
            <Text style={styles.ratingNumber}>{averageRating.toFixed(1)}</Text>
            {renderStars(averageRating)}
          </View>
        </View>
        <View style={styles.viewAllRatings}>
          <Text style={styles.viewAllRatingsText}>Ver todas</Text>
          <Ionicons name="chevron-forward" size={20} color="#fa6205" />
        </View>
      </TouchableOpacity>
      {userData && (
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backgroundColor: "#F0F0F0",
            borderRadius: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            marginBottom: 5,
            marginHorizontal: 10
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1C1C1E", marginBottom: 8 }}>
            {userData.tienda_estado ? "Tu negocio está activo" : "Tu negocio está inactivo"}
          </Text>

          <Switch
            trackColor={{
              false: "#ccc",
              true: "#fa6205",
            }}
            thumbColor={!!userData.tienda_estado ? "#ffffff" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleTienda}
            value={!!userData.tienda_estado}
            disabled={loading}
          />

          <Text style={{ fontSize: 12, color: "#1C1C1E", marginTop: 8 }}>
            Toca el interruptor para {userData.tienda_estado ? "desactivar" : "activar"} tu tienda
          </Text>
        </View>
      )}

      <View style={styles.mainButtons}>
        <View style={styles.mainButton}>
          <TouchableOpacity onPress={handleBannerPress}>
            <Image
              source={require("../../assets/images/banner_comercio.png")}
              style={styles.mainButtonImg}
              progressiveRenderingEnabled={true}
              fadeDuration={300}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshCategories}
        >
          <Ionicons name="refresh" size={20} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveLocationButton}
          onPress={saveShopLocation}
          disabled={isLocationLoading}
        >
          {isLocationLoading ? (
            <ActivityIndicator size="small" color="#1C1C1E" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="location" size={20} color="#1C1C1E" />
              <Text style={styles.saveLocationText}>Guardar ubicación</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      {/* Botón Crear Perfil - Solo mostrar para categorías de servicios */}
      {globalCategory && globalCategory.tipo_categoria === "servicios" && (
        <View style={styles.createProfileContainer}>
          <TouchableOpacity
            style={styles.createProfileButton}
            onPress={() => navigation.navigate("CrearPerfil")}
          >
            <Ionicons name="person-add" size={20} color="#000" />
            <Text style={styles.createProfileText}>Crear Perfil</Text>
          </TouchableOpacity>
        </View>
      )}
      <CategoriesScreen />
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa6205" />
          <Text style={styles.loadingText}>Cargando categorías...</Text>
        </View>
      ) : (
        <View>
          {categories.length > 0 ? (
            categories.map((category) => {
              const categoryProducts = getProductsByCategory(category.id);
              const categoryServices = getServicesByCategory(category.id);

              return (
                <View key={category.id} style={styles.section}>
                  <View>
                    <Text style={styles.sectionTitle}>{category.nombre}</Text>
                    <View
                      style={{
                        flexDirection: "row",
                        marginTop: 5,
                        marginBottom: 20,
                      }}
                    >
                      <View style={{ flexDirection: "row", width: "30%" }}>
                        <TouchableOpacity
                          style={styles.categoryActionButton}
                          onPress={() => showEditCategoryModal(category)}
                        >
                          <Ionicons name="pencil" size={16} color="#fa6205" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.categoryActionButton,
                            styles.deleteActionButton,
                          ]}
                          onPress={() => showDeleteCategoryModal(category)}
                        >
                          <Ionicons name="trash" size={16} color="#ff4d4d" />
                        </TouchableOpacity>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          width: "70%",
                          justifyContent: "flex-end",
                        }}
                      >
                        <TouchableOpacity
                          style={styles.createProductButton}
                          onPress={() =>
                            navigation.navigate("ProductoDos", {
                              categoria_id: category.id,
                              categoria_nombre: category.nombre,
                            })
                          }
                        >
                          <Text style={styles.createProductButtonText}>
                            Producto
                          </Text>
                          <FontAwesome
                            name="plus"
                            size={16}
                            color="#000"
                            style={{ marginLeft: 5 }}
                          />
                        </TouchableOpacity>
                        {/* Botón Servicio - Solo mostrar para categorías de servicios */}
                        {globalCategory &&
                          globalCategory.tipo_categoria === "servicios" && (
                            <TouchableOpacity
                              style={[
                                styles.createProductButton,
                                { marginLeft: 10 },
                              ]}
                              onPress={() =>
                                navigation.navigate("ServiciosProducto", {
                                  categoria_id: category.id,
                                  categoria_nombre: category.nombre,
                                })
                              }
                            >
                              <Text style={styles.createProductButtonText}>
                                Servicio
                              </Text>
                              <FontAwesome
                                name="plus"
                                size={16}
                                color="#000"
                                style={{ marginLeft: 5 }}
                              />
                            </TouchableOpacity>
                          )}
                      </View>
                    </View>
                  </View>
                  {/* Servicios en la misma categoría - Solo mostrar para categorías de servicios */}
                  {globalCategory &&
                    globalCategory.tipo_categoria === "servicios" &&
                    categoryServices.length > 0 && (
                      <View style={styles.servicesSection}>
                        <FlatList
                          data={categoryServices}
                          keyExtractor={(item) => item.id.toString()}
                          horizontal
                          showsHorizontalScrollIndicator={true}
                          contentContainerStyle={styles.horizontalScroll}
                          renderItem={({ item: service }) => (
                            <View style={styles.item}>
                              {service.foto ? (
                                <Image
                                  source={{ uri: getImageUrl(service.foto) }}
                                  style={styles.itemImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={[styles.itemImage, styles.noImagePlaceholder]}>
                                  <Ionicons name="image-outline" size={30} color="#555" />
                                </View>
                              )}
                              <Text style={styles.itemName}>{service.nombre}</Text>
                              <Text style={styles.itemPrice}>{"$"}{service.precio}</Text>

                              <View style={styles.itemActions}>
                                <TouchableOpacity
                                  style={styles.editButton}
                                  onPress={() =>
                                    navigation.navigate("EditarServicio", { serviceId: service.id })
                                  }
                                >
                                  <Ionicons name="pencil" size={16} color="#fa6205" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.deleteButton}
                                  onPress={() => handleDeleteProduct(service.id)}
                                  disabled={deletingProductId === service.id}
                                >
                                  {deletingProductId === service.id ? (
                                    <ActivityIndicator size="small" color="#ff4d4d" />
                                  ) : (
                                    <Ionicons name="trash" size={16} color="#ff4d4d" />
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                          initialNumToRender={3}
                          maxToRenderPerBatch={3}
                          windowSize={3}
                        />
                        <View style={styles.scrollHelpContainer}>

                          {/* 2. El texto va primero */}
                          <Text style={styles.scrollHelpText}>
                            Desliza para ver más servicios
                          </Text>

                          {/* 3. El ícono va después (como hermano, no hijo) */}
                          <Ionicons
                            name="arrow-forward"
                            size={14}
                            color="#7d7d7d"
                            style={styles.scrollHelpIcon} // Le daremos un margen
                          />
                        </View>
                      </View>
                    )}
                  <View style={styles.servicesSection}>
                    {isLoadingProducts ? (
                      <View style={styles.loadingProductContainer}>
                        <ActivityIndicator size="small" color="#fa6205" />
                        <Text style={styles.loadingProductText}>Cargando...</Text>
                      </View>
                    ) : categoryProducts.length > 0 ? (
                      <>
                        <FlatList
                          data={categoryProducts}
                          keyExtractor={(item) => item.id.toString()}
                          horizontal
                          showsHorizontalScrollIndicator={true}
                          contentContainerStyle={{ paddingRight: 10 }}
                          renderItem={({ item: product }) => (
                            <View style={styles.item}>
                              {product.foto ? (
                                <Image
                                  source={{ uri: getImageUrl(product.foto) }}
                                  style={styles.itemImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={[styles.itemImage, styles.noImagePlaceholder]}>
                                  <Ionicons name="image-outline" size={30} color="#555" />
                                </View>
                              )}
                              <Text style={styles.itemName}>{product.nombre}</Text>
                              <Text style={styles.itemPrice}>{"$"}{product.precio}</Text>
                              <View style={styles.itemActions}>
                                <TouchableOpacity
                                  style={styles.editButton}
                                  onPress={() =>
                                    navigation.navigate("EditarProducto", {
                                      productId: product.id,
                                    })
                                  }
                                >
                                  <Ionicons name="pencil" size={16} color="#fa6205" />
                                </TouchableOpacity>

                                <View style={styles.switchContainer}>
                                  <Switch
                                    trackColor={{
                                      false: "#767577",
                                      true: "#fa6205",
                                    }}
                                    thumbColor={!!product.activo ? "#ffffff" : "#f4f3f4"} // <- importante
                                    ios_backgroundColor="#3e3e3e"
                                    onValueChange={() =>
                                      toggleProductStatus(product.id, !!product.activo) // <- importante
                                    }
                                    value={!!product.activo} // <- aquí está el truco
                                  />
                                </View>

                                <TouchableOpacity
                                  style={styles.deleteButton}
                                  onPress={() => handleDeleteProduct(product.id)}
                                  disabled={deletingProductId === product.id}
                                >
                                  {deletingProductId === product.id ? (
                                    <ActivityIndicator size="small" color="#ff4d4d" />
                                  ) : (
                                    <Ionicons name="trash" size={16} color="#ff4d4d" />
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                          initialNumToRender={3}
                          maxToRenderPerBatch={3}
                          windowSize={3}
                        />

                        <View style={styles.scrollHelpContainer}>

                          {/* 2. El texto va primero */}
                          <Text style={styles.scrollHelpText}>
                            Desliza para ver más productos
                          </Text>

                          {/* 3. El ícono va después (como hermano, no hijo) */}
                          <Ionicons
                            name="arrow-forward"
                            size={14}
                            color="#7d7d7d"
                            style={styles.scrollHelpIcon} // Le daremos un margen
                          />
                        </View>
                      </>

                    ) : (
                      <View style={styles.noProductsContainer}>
                        <Text style={styles.noProductsText}>
                          No hay productos en esta categoría
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.noCategoriesContainer}>
              <Text style={styles.noCategoriesText}>
                No hay categorías disponibles
              </Text>
              <Text style={styles.noCategoriesSubText}>
                Crea una categoría para comenzar a añadir productos
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    height: 200,
  },
  loadingGlobalContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    padding: 10,
    margin: 10,
    borderRadius: 8,
  },
  loadingGlobalText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#666",
    fontFamily: "Montserrat_400Regular",
  },
  ratingsSection: {
    backgroundColor: "#F0F0F0",
    borderRadius: 15,
    padding: 15,
    margin: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingSummary: {
    flex: 1,
  },
  ratingTitle: {
    color: "#1C1C1E",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 5,
  },
  ratingDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingNumber: {
    color: "#fa6205",
    fontSize: 24,
    fontFamily: "Montserrat_700Bold",
    marginRight: 10,
  },
  starsContainer: {
    flexDirection: "row",
  },
  starIcon: {
    marginRight: 2,
  },
  viewAllRatings: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllRatingsText: {
    color: "#fa6205",
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
  },
  // Estilos para el modal de calificaciones
  ratingsModalContent: {
    backgroundColor: "#F0F0F0",
    borderRadius: 15,
    padding: 20,
    width: "100%",
    maxHeight: "90%",
  },

  // Estilos para el modal de métodos de pago
  paymentModalContent: {
    backgroundColor: "#F0F0F0",
    borderRadius: 15,
    padding: 25,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  paymentModalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  paymentModalTitle: {
    color: "#fa6205",
    fontSize: 20,
    fontFamily: "Montserrat_700Bold",
    textAlign: "center",
    marginTop: 15,
  },
  paymentModalMessage: {
    color: "#1C1C1E",
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 25,
  },
  paymentModalButtons: {
    width: "100%",
    gap: 15,
  },
  configurePaymentButton: {
    backgroundColor: "#fa6205",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
  },
  configurePaymentButtonText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  laterButton: {
    backgroundColor: "transparent",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fa6205",
  },
  laterButtonText: {
    color: "#fa6205",
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },

  // Continúan estilos existentes...
  ratingsSummary: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#383838",
    borderRadius: 10,
  },
  averageRatingNumber: {
    color: "#1C1C1E",
    fontSize: 42,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 10,
  },
  totalRatingsText: {
    color: "#aaa",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    marginTop: 10,
  },
  ratingsListContainer: {
    maxHeight: 400,
  },
  ratingItem: {
    backgroundColor: "#383838",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  ratingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: "#1C1C1E",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  ratingDate: {
    color: "#aaa",
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
  ratingValue: {
    flexShrink: 0,
  },
  ratingComment: {
    color: "#eee",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    fontStyle: "italic",
    marginBottom: 10,
  },
  orderInfo: {
    borderTopWidth: 1,
    borderTopColor: "#555",
    paddingTop: 10,
  },
  orderInfoText: {
    color: "#aaa",
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
  noRatingsContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  noRatingsText: {
    color: "#1C1C1E",
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    marginTop: 15,
    textAlign: "center",
  },
  noRatingsSubText: {
    color: "#aaa",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
    marginTop: 5,
  },
  loadingRatingsContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  // Category edit/delete styles
  categoryActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryActionButton: {
    backgroundColor: "#ECECEC",
    padding: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#fa6205",
    marginRight: 10,
  },
  deleteActionButton: {
    borderColor: "#ff4d4d",
  },
  inputContainer: {
    marginVertical: 15,
  },
  inputLabel: {
    color: "#fa6205",
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#ECECEC",
    borderRadius: 8,
    padding: 12,
    color: "#1C1C1E",
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  saveButton: {
    backgroundColor: "#fa6205",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 15,
  },
  saveButtonText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: "#ECECEC",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    width: "48%",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  cancelButtonText: {
    color: "#1C1C1E",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  deleteButton: {
    backgroundColor: "#ff4d4d",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    width: "48%",
  },
  deleteButtonText: {
    color: "#1C1C1E",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  deleteWarningText: {
    color: "#1C1C1E",
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
    marginTop: 10,
  },
  deleteWarningSubtext: {
    color: "#ff4d4d",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
    marginTop: 10,
  },
  // Estilos para los botones de acción
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginTop: 10,
  },
  refreshButton: {
    backgroundColor: "#fa6205",
    padding: 12,
    borderRadius: '100%',
    width: "12%",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  saveLocationButton: {
    backgroundColor: "#fa6205",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 25,
    width: "70%",
    elevation: 3,
  },
  saveLocationText: {
    color: "#000",
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
    marginLeft: 8,
  },

  // Estilos para el botón Crear Perfil
  createProfileContainer: {
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  createProfileButton: {
    backgroundColor: "#fa6205",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  createProfileText: {
    color: "#000",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    marginLeft: 8,
  },

  // Estilos para el modal
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)", // Fondo semitransparente
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#F0F0F0",
    borderRadius: 15,
    padding: 20,
    width: "100%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    color: "#fa6205",
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
  },
  closeButton: {
    backgroundColor: "#fa6205",
    borderRadius: 20,
    padding: 5,
  },
  mapContainer: {
    width: "100%",
    height: 300,
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 15,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  locationInfoContainer: {
    backgroundColor: "#F2F2F7",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  locationInfoTitle: {
    color: "#fa6205",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 5,
  },
  locationInfoText: {
    color: "#1C1C1E",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    marginBottom: 3,
  },
  saveLocationModalButton: {
    backgroundColor: "#fa6205",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 15,
  },
  saveLocationModalButtonText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  mapLoadingContainer: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  mapLoadingText: {
    color: "#1C1C1E",
    marginTop: 10,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },
  noLocationContainer: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  noLocationText: {
    color: "#1C1C1E",
    marginTop: 15,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
  },

  // Estilos existentes
  loadingText: {
    color: "#1C1C1E",
    marginTop: 10,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  categoryHeaderDos: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    width: 60,
  },
  createProductButton: {
    backgroundColor: "#fa6205",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  createProductButtonText: {
    color: "#000",
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
  },
  noProductsContainer: {
    backgroundColor: "#F0F0F0",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    height: 100,
    marginRight: 10,
  },
  noProductsText: {
    color: "#aaa",
    textAlign: "center",
    fontFamily: "Montserrat_400Regular",
  },
  noCategoriesContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  noCategoriesText: {
    color: "#1C1C1E",
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 10,
    textAlign: "center",
  },
  noCategoriesSubText: {
    color: "#aaa",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fa6205",
    padding: 15,
    marginTop: 60,
  },
  establishmentInfo: {
    flex: 1,
    alignItems: "center",
  },
  categoryTypeText: {
    fontSize: 12,
    color: "#333333",
    fontFamily: "Montserrat_400Regular",
    marginTop: 2,
    opacity: 0.8,
  },
  locationText: {
    fontSize: 25,
    color: "#333333",
    fontFamily: "Montserrat_400Regular",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 40,
  },
  itemContentContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 5,
  },
  itemTextContainer: {
    width: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fa6205",
    padding: 10,
    marginTop: 60,
  },
  headerText: {
    color: "#000",
    fontSize: 18,
    fontFamily: "Montserrat_400Regular",
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  section: {
    padding: 10,
  },
  sectionTitle: {
    color: "#1C1C1E",
    fontSize: 18,
    marginBottom: 10,
    fontFamily: "Montserrat_700Bold",
  },
  locationTextUno: {
    color: "#333333",
    fontSize: 20,
    fontFamily: "Montserrat_400Regular",
  },
  itemsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  horizontalScroll: {
    flexDirection: "row",
  },
  item: {
    width: 180,
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  itemImage: {
    width: 160,
    height: 100,
    borderRadius: 10,
  },
  itemPrice: {
    color: "#fa6205",
    fontSize: 16,
    marginTop: 5,
    fontFamily: "Montserrat_700Bold",
  },
  itemName: {
    color: "#1C1C1E",
    fontSize: 14,
    marginTop: 5,
    fontFamily: "Montserrat_400Regular",
  },
  addButton: {
    backgroundColor: "#fa6205",
    borderRadius: 5,
    padding: 5,
    marginTop: 5,
  },
  addButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Montserrat_700Bold",
  },
  myButton: {
    backgroundColor: "#fa6205",
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginVertical: 10,
  },
  buttonText: {
    color: "#000",
    fontSize: 20,
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 8,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#fa6205",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    position: "relative",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pencilIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -4 }, { translateY: -3 }],
  },
  loadingProductContainer: {
    backgroundColor: "#F0F0F0",
    padding: 15,
    borderRadius: 10,
    width: 150,
    alignItems: "center",
    justifyContent: "center",
    height: 100,
    marginRight: 10,
  },
  loadingProductText: {
    color: "#aaa",
    marginTop: 8,
    fontFamily: "Montserrat_400Regular",
  },
  noImagePlaceholder: {
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  itemActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
    alignItems: "center",
  },
  editButton: {
    backgroundColor: "#ECECEC",
    padding: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#fa6205",
  },
  deleteButton: {
    backgroundColor: "#ECECEC",
    padding: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ff4d4d",
  },
  switchContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 5,
  },
  servicesSection: {
    marginBottom: 20,
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    padding: 5,
  },
  servicesSectionTitle: {
    color: "#1C1C1E",
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 10,
  },
  serviceItem: {
    backgroundColor: "#383838",
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
    alignItems: "center",
    width: 120,
  },
  serviceItemName: {
    color: "#1C1C1E",
    fontSize: 14,
    marginTop: 5,
    fontFamily: "Montserrat_400Regular",
  },
  serviceItemPrice: {
    color: "#fa6205",
    fontSize: 16,
    marginTop: 5,
    fontFamily: "Montserrat_700Bold",
  },
  serviceItemActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
    alignItems: "center",
  },
  mainButtons: {
    width: "95%",
    marginHorizontal: 10
  },
  mainButton: {
    width: "100%",
    height: 130,
    borderRadius: 15,
    position: "relative",
    overflow: "hidden",
  },
  mainButtonImg: {
    width: "100%",
    height: 130,
  },
  scrollHelpContainer: {
    flexDirection: 'row',     // Los alinea uno al lado del otro
    alignItems: 'center',      // ESTA ES LA MAGIA: Centra verticalmente
    justifyContent: 'center',  // Centra todo el bloque en la pantalla
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },

  // 2. Estilo para el texto (sin estilos de layout)
  scrollHelpText: {
    fontSize: 13,
    color: '#7d7d7d',
  },

  // 3. Estilo para el ícono (para darle espacio)
  scrollHelpIcon: {
    marginLeft: 5, // Un pequeño espacio entre el texto y la flecha
  }
});

export default ShopDos;
