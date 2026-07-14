import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_300Light,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../../constants/url";

export default function CategoriesScreen() {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  
  // Estados para validación de suscripciones
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  // Cargar categorías existentes al montar el componente
  useEffect(() => {
    fetchCategories();
    checkActiveSubscriptions(); // Verificar suscripciones al cargar el componente
  }, []);
    const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_300Light,
  });
  
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9DFD05" />
        <Text style={styles.loadingText}>Cargando fuentes...</Text>
      </View>
    );
  }
  
  // Función para verificar si el usuario tiene suscripciones activas
  const checkActiveSubscriptions = async () => {
    try {
      setCheckingSubscription(true);
      const token = await AsyncStorage.getItem("userToken");
      
      if (!token) {
        console.error("No se encontró token de autenticación");
        return false;
      }

      console.log("Verificando suscripciones activas...");
      
      // Solicitar suscripciones del usuario (GET)
      const response = await fetch(`${BASE_URL}user-suscripcion`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error(`Error en API (${response.status})`);
        return false;
      }

      const responseData = await response.json();
      console.log("Respuesta de suscripciones:", responseData);
      
      // Verificar si hay suscripciones con estado "aprobado"
      const hasApprovedSubscription = responseData && 
                                   responseData.status === true &&
                                   Array.isArray(responseData.data) && 
                                   responseData.data.some(sub => sub.estado === "aprobado");
      
      console.log("¿Tiene suscripción aprobada?", hasApprovedSubscription);
      setHasActiveSubscription(hasApprovedSubscription);
      return hasApprovedSubscription;
    } catch (error) {
      console.error("Error verificando suscripciones:", error);
      return false;
    } finally {
      setCheckingSubscription(false);
    }
  };

  // Función para ir a la pantalla de suscripciones (wallet)
  const goToWallet = () => {
    setSubscriptionModalVisible(false);
    navigation.navigate("WalletRider");
  };

  // Función para mostrar modal de creación de categoría
  const handleCreateCategoryPress = async () => {
    setCheckingSubscription(true);
    const hasSubscription = await checkActiveSubscriptions();
    setCheckingSubscription(false);
    
    if (hasSubscription) {
      // Si tiene suscripción activa, mostrar el modal para crear categoría
      setModalVisible(true);
    } else {
      // Si no tiene suscripción activa, mostrar modal de suscripción
      setSubscriptionModalVisible(true);
    }
  };
  
  // Función para obtener categorías existentes
  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "No se encontró token de autenticación");
        return;
      }

      const response = await fetch(`${BASE_URL}categorias`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.status && data.categorias) {
        setCategories(data.categorias);
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error);
      Alert.alert("Error", "No se pudieron cargar las categorías");
    }
  };

  // Función para crear nueva categoría
  const createCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert("Error", "El nombre de la categoría no puede estar vacío");
      return;
    }

    setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "No se encontró token de autenticación");
        setIsLoading(false);
        return;
      }

      console.log("Enviando petición para crear categoría:", categoryName);
      const response = await fetch(`${BASE_URL}categorias`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: categoryName.trim(),
        }),
      });

      const data = await response.json();
      console.log("Respuesta:", data);

      if (data.status && data.categoria) {
        Alert.alert(
          "Éxito",
          "Categoría creada satisfactoriamente",
          [
            {
              text: "OK",
              onPress: () => {
                setModalVisible(false);
                setCategoryName("");
                fetchCategories(); // Refrescar la lista de categorías
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Creación exitosa", 
          data.message || "Categoría registrada correctamente",
          [
            {
              text: "OK",
              onPress: () => {
                setModalVisible(false);
                setCategoryName("");
                fetchCategories(); // Refrescar la lista de categorías
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error al crear categoría:", error);
      Alert.alert("Error", "No se pudo crear la categoría");
    } finally {
      setIsLoading(false);
    }
  };

  // Renderizar item de categoría
  const renderCategoryItem = ({ item }) => (
    <View style={styles.categoryItem}>
      <Text style={styles.categoryName}>{item.nombre}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Lista de categorías 
         {categories.length > 0 ? (
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
        />
      ) : (
        <Text style={styles.emptyText}></Text>
      )}*/}
   

      {/* Botón para crear nueva categoría */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreateCategoryPress}
        disabled={checkingSubscription}
      >
        {checkingSubscription ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <FontAwesome name="plus" size={20} color="#000" />
            <Text style={styles.createButtonText}>Crear Categoría</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Modal para crear categoría */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Nueva Categoría</Text>

            <Text style={styles.inputLabel}>Nombre de la categoría</Text>
            <TextInput
              style={styles.input}
              placeholder="Escribe el nombre"
              value={categoryName}
              onChangeText={setCategoryName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={() => {
                  setModalVisible(false);
                  setCategoryName("");
                }}
              >
                <Text style={styles.buttonCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonCreate]}
                onPress={createCategory}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.buttonCreateText}>Crear</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal para suscripciones */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={subscriptionModalVisible}
        onRequestClose={() => setSubscriptionModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Suscripción Requerida</Text>
            
            <View style={styles.subscriptionIconContainer}>
              <Ionicons name="warning-outline" size={60} color="#9DFD05" />
            </View>
            
            <Text style={styles.subscriptionModalText}>
              Para poder crear categorías, necesitas activar un plan de suscripción.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={() => setSubscriptionModalVisible(false)}
              >
                <Text style={styles.buttonCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonCreate]}
                onPress={goToWallet}
              >
                <Text style={styles.buttonCreateText}>Ver Planes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#242424",
    
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    fontFamily: "Montserrat_700Bold",
    marginTop: 10,
    textAlign: "center",
  },
  list: {
    flex: 1,
    marginBottom: 20,
  },
  categoryItem: {
    backgroundColor: "#333",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  categoryName: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },
  emptyText: {
    color: "#ccc",
    textAlign: "center",
    marginTop: 30,
    fontFamily: "Montserrat_400Regular",
  },
  createButton: {
    backgroundColor: "#9DFD05",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    marginVertical: 5,
  },
  createButtonText: {
    color: "#000",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    marginLeft: 10,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalView: {
    width: "85%",
    backgroundColor: "#333",
    borderRadius: 15,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_700Bold",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 8,
    fontFamily: "Montserrat_400Regular",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    fontFamily: "Montserrat_400Regular",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: "48%",
    alignItems: "center",
  },
  buttonCancel: {
    backgroundColor: "#666",
  },
  buttonCreate: {
    backgroundColor: "#9DFD05",
  },
  buttonCancelText: {
    color: "#fff",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
  },
  buttonCreateText: {
    color: "#000",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
  },
  // Nuevos estilos para el modal de suscripción
  subscriptionIconContainer: {
    alignItems: "center",
    marginVertical: 15,
  },
  subscriptionModalText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#242424",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },
});