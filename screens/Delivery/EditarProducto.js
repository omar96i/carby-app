import React, { useState, useEffect } from "react";
import { Entypo, FontAwesome } from "@expo/vector-icons";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_300Light,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";

const EditarProducto = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { productId } = route.params || {};

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_300Light,
  });

  // Product form state
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [foto, setFoto] = useState(null);
  const [categoria_id, setCategoriaId] = useState(null);
  const [categoria_nombre, setCategoriaNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [originalImageUrl, setOriginalImageUrl] = useState(null);

  // Estados para adicionales
  const [adicionales, setAdicionales] = useState([]);
  const [loadingAdicionales, setLoadingAdicionales] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAdicional, setEditingAdicional] = useState(null);

  // Estados para formulario de adicional
  const [adicionalNombre, setAdicionalNombre] = useState("");
  const [adicionalDescripcion, setAdicionalDescripcion] = useState("");
  const [adicionalPrecio, setAdicionalPrecio] = useState("");
  const [adicionalFoto, setAdicionalFoto] = useState(null);
  const [loadingAdicional, setLoadingAdicional] = useState(false);

  // Request camera permission on component mount and load product data
  useEffect(() => {
    (async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permiso requerido",
          "Se necesita permiso para acceder a la galería"
        );
      }

      // Cargar datos del producto
      await fetchProductData();
      await fetchAdicionales();
    })();
  }, []);

  const fetchProductData = async () => {
    try {
      setIsLoadingProduct(true);
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        Alert.alert("Error", "No se encontró el token de autenticación");
        setIsLoadingProduct(false);
        return;
      }

      const response = await fetch(`${BASE_URL}productos/${productId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data) {
        // Poblar el formulario con los datos del producto
        setNombre(data.nombre || "");
        setPrecio(data.precio ? data.precio.toString() : "");
        setDescripcion(data.descripcion || "");
        setCategoriaId(data.categoria_id);

        // Si el producto tiene categoría, guardar su nombre
        if (data.categoria) {
          setCategoriaNombre(data.categoria.nombre);
        }

        // Guardar la URL de la imagen original
        if (data.foto) {
          const imageUrl = data.foto.startsWith("http")
            ? data.foto
            : `${BASE_URL.toString().replace("/api", "")}/storage/${data.foto}`;
          setOriginalImageUrl(imageUrl);
        }
      } else {
        Alert.alert(
          "Error",
          data.message || "No se pudo obtener la información del producto"
        );
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error al cargar producto:", error);
      Alert.alert("Error", "Ocurrió un error al cargar los datos del producto");
      navigation.goBack();
    } finally {
      setIsLoadingProduct(false);
    }
  };

  // Función para obtener adicionales del producto - RUTA CORREGIDA
  const fetchAdicionales = async () => {
    try {
      setLoadingAdicionales(true);
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        console.log("No se encontró token para cargar adicionales");
        setLoadingAdicionales(false);
        return;
      }

      // RUTA CORREGIDA: producto-adicionales/producto/{producto_id}
      const response = await fetch(
        `${BASE_URL}producto-adicionales/producto/${productId}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Adicionales cargados:", data);

        // Ajustar según la estructura de respuesta de tu API
        if (data.success && data.data) {
          setAdicionales(data.data);
        } else if (Array.isArray(data)) {
          setAdicionales(data);
        } else if (data.adicionales) {
          setAdicionales(data.adicionales);
        } else if (data.data && Array.isArray(data.data)) {
          setAdicionales(data.data);
        } else {
          setAdicionales([]);
          console.log(
            "No se encontraron adicionales o estructura de respuesta no reconocida"
          );
        }
      } else {
        console.log("Error al cargar adicionales. Status:", response.status);
        const errorText = await response.text();
        console.log("Error response:", errorText);
        setAdicionales([]);
      }
    } catch (error) {
      console.error("Error al cargar adicionales:", error);
      setAdicionales([]);
    } finally {
      setLoadingAdicionales(false);
    }
  };

  // Función para abrir modal de crear/editar adicional
  const openAdicionalModal = (adicional = null) => {
    if (adicional) {
      setEditingAdicional(adicional);
      setAdicionalNombre(adicional.nombre || "");
      setAdicionalDescripcion(adicional.descripcion || "");
      setAdicionalPrecio(adicional.precio ? adicional.precio.toString() : "");
      setAdicionalFoto(null);
    } else {
      setEditingAdicional(null);
      setAdicionalNombre("");
      setAdicionalDescripcion("");
      setAdicionalPrecio("");
      setAdicionalFoto(null);
    }
    setModalVisible(true);
  };

  // Función para cerrar modal
  const closeAdicionalModal = () => {
    setModalVisible(false);
    setEditingAdicional(null);
    setAdicionalNombre("");
    setAdicionalDescripcion("");
    setAdicionalPrecio("");
    setAdicionalFoto(null);
  };

  // Función para seleccionar imagen del adicional
  const pickAdicionalImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setAdicionalFoto(result.assets[0]);
    }
  };

  // Función para crear o editar adicional
  const handleAdicionalSubmit = async () => {
    if (!adicionalNombre || !adicionalDescripcion || !adicionalPrecio) {
      Alert.alert("Error", "Todos los campos son obligatorios");
      return;
    }

    try {
      setLoadingAdicional(true);
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        Alert.alert("Error", "No se encontró el token de autenticación");
        return;
      }

      const formData = new FormData();
      formData.append("producto_id", productId.toString());
      formData.append("nombre", adicionalNombre);
      formData.append("descripcion", adicionalDescripcion);
      formData.append("precio", adicionalPrecio);

      // Si se seleccionó una imagen, adjuntarla
      if (adicionalFoto) {
        const fileExtension = adicionalFoto.uri.split(".").pop();
        const fileName = `adicional_${Date.now()}.${fileExtension}`;

        formData.append("file", {
          uri: adicionalFoto.uri,
          name: fileName,
          type: `image/${fileExtension}`,
        });
      }

      // Determinar la URL según si es crear o editar
      const url = editingAdicional
        ? `${BASE_URL}producto-adicionales/${editingAdicional.id}` // Para editar
        : `${BASE_URL}producto-adicionales`; // Para crear

      console.log("Enviando adicional a:", url);
      console.log("Datos del formulario:", {
        producto_id: productId,
        nombre: adicionalNombre,
        descripcion: adicionalDescripcion,
        precio: adicionalPrecio,
        tieneImagen: !!adicionalFoto,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log("Respuesta del servidor:", responseData);

        Alert.alert(
          "Éxito",
          editingAdicional
            ? "Adicional actualizado correctamente"
            : "Adicional creado correctamente"
        );
        closeAdicionalModal();
        await fetchAdicionales(); // Recargar la lista con la nueva ruta
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log("Error del servidor:", errorData);
        Alert.alert(
          "Error",
          errorData.message || "No se pudo guardar el adicional"
        );
      }
    } catch (error) {
      console.error("Error al guardar adicional:", error);
      Alert.alert("Error", "Ocurrió un error al guardar el adicional");
    } finally {
      setLoadingAdicional(false);
    }
  };

  // Función para eliminar adicional - RUTA CORREGIDA
  const eliminarAdicional = (adicional) => {
    Alert.alert(
      "Confirmar eliminación",
      `¿Estás seguro de que quieres eliminar "${adicional.nombre}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("userToken");

              if (!token) {
                Alert.alert(
                  "Error",
                  "No se encontró el token de autenticación"
                );
                return;
              }

              // RUTA CORREGIDA: DELETE producto-adicionales/{id}
              const response = await fetch(
                `${BASE_URL}producto-adicionales/${adicional.id}`,
                {
                  method: "DELETE",
                  headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (response.ok) {
                Alert.alert("Éxito", "Adicional eliminado correctamente");
                await fetchAdicionales(); // Recargar la lista
              } else {
                const errorData = await response.json().catch(() => ({}));
                console.log("Error al eliminar adicional:", errorData);
                Alert.alert(
                  "Error",
                  errorData.message || "No se pudo eliminar el adicional"
                );
              }
            } catch (error) {
              console.error("Error al eliminar adicional:", error);
              Alert.alert("Error", "Ocurrió un error al eliminar el adicional");
            }
          },
        },
      ]
    );
  };

  if (!fontsLoaded || isLoadingProduct) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9BFE03" />
        <Text style={styles.loadingText}>Cargando producto...</Text>
      </View>
    );
  }

  // Image picker function
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setFoto(result.assets[0]);
    }
  };

  // Form submission for updating the product
  const handleSubmit = async () => {
    if (!nombre || !precio || !descripcion) {
      Alert.alert("Error", "Nombre, precio y descripción son obligatorios");
      return;
    }

    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        Alert.alert("Error", "No se encontró el token de autenticación");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("nombre", nombre);
      formData.append("precio", precio);
      formData.append("descripcion", descripcion);
      formData.append("categoria_id", categoria_id);

      // Si se seleccionó una nueva imagen, adjuntarla
      if (foto) {
        const fileExtension = foto.uri.split(".").pop();
        const fileName = `product_${Date.now()}.${fileExtension}`;

        formData.append("foto", {
          uri: foto.uri,
          name: fileName,
          type: `image/${fileExtension}`,
        });
      }

      const response = await fetch(`${BASE_URL}productos/${productId}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        Alert.alert("Éxito", "Producto actualizado correctamente");
        navigation.goBack();
      } else {
        console.log(response.json().catch())
        const errorData = await response.json().catch(() => ({}));
        Alert.alert(
          "Error",
          errorData.message || "No se pudo actualizar el producto"
        );
      }
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      Alert.alert("Error", "Ocurrió un error al actualizar el producto");
    } finally {
      setLoading(false);
    }
  }; // Renderizar item de adicional - CORREGIDO para usar 'file' en lugar de 'foto'
  const renderAdicionalItem = ({ item }) => (
    <View style={styles.adicionalItem}>
      <View style={styles.adicionalInfo}>
        {item.file ? (
          <Image
            source={{
              uri: item.file.startsWith("http")
                ? item.file
                : `${BASE_URL.toString().replace("/api", "")}/storage/${item.file}`,
            }}
            style={styles.adicionalImage}
            onError={(error) =>
              console.log("Error cargando imagen adicional:", error)
            }
          />
        ) : (
          // Placeholder cuando no hay imagen
          <View style={styles.adicionalImagePlaceholder}>
            <Ionicons name="image-outline" size={24} color="#666" />
          </View>
        )}
        <View style={styles.adicionalTexts}>
          <Text style={styles.adicionalNombre}>{item.nombre}</Text>
          <Text style={styles.adicionalDescripcion} numberOfLines={2}>
            {item.descripcion}
          </Text>
          <Text style={styles.adicionalPrecio}>${item.precio}</Text>
        </View>
      </View>
      <View style={styles.adicionalActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openAdicionalModal(item)}
        >
          <Ionicons name="pencil" size={20} color="#9BFE03" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => eliminarAdicional(item)}
        >
          <Ionicons name="trash" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerText}>
            Editar Producto - {categoria_nombre}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Product Image Picker */}
        <TouchableOpacity
          onPress={pickImage}
          style={styles.imagePickerContainer}
        >
          {foto ? (
            <Image source={{ uri: foto.uri }} style={styles.productImage} />
          ) : originalImageUrl ? (
            <Image
              source={{ uri: originalImageUrl }}
              style={styles.productImage}
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <Ionicons name="camera" size={50} color="#9BFE03" />
              <Text style={styles.placeholderText}>
                Toca para seleccionar imagen
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Product Form */}
        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>Nombre del producto</Text>
          <TextInput
            style={styles.input}
            placeholder="Ingresa el nombre"
            placeholderTextColor="#7d7d7d"
            value={nombre}
            onChangeText={setNombre}
          />

          <Text style={styles.inputLabel}>Precio</Text>
          <TextInput
            style={styles.input}
            placeholder="Ingresa el precio"
            placeholderTextColor="#7d7d7d"
            keyboardType="numeric"
            value={precio}
            onChangeText={setPrecio}
          />

          <Text style={styles.inputLabel}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ingresa la descripción"
            placeholderTextColor="#7d7d7d"
            multiline
            numberOfLines={4}
            value={descripcion}
            onChangeText={setDescripcion}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.myButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.buttonText}>Guardar Cambios</Text>
          )}
        </TouchableOpacity>

        {/* Sección de Adicionales */}
        <View style={styles.adicionalesSection}>
          <View style={styles.adicionalesHeader}>
            <Text style={styles.adicionalesTitle}>
              Adicionales del Producto
            </Text>
            <TouchableOpacity
              style={styles.addAdicionalButton}
              onPress={() => openAdicionalModal()}
            >
              <Ionicons name="add" size={24} color="#000" />
              <Text style={styles.addAdicionalText}>Agregar</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.modalHelperText, {marginTop: -15}]}>
            Adicional o para elegir
          </Text>

          {loadingAdicionales ? (
            <View style={styles.loadingAdicionales}>
              <ActivityIndicator size="small" color="#9BFE03" />
              <Text style={styles.loadingAdicionalesText}>
                Cargando adicionales...
              </Text>
            </View>
          ) : adicionales.length > 0 ? (
            <FlatList
              data={adicionales}
              renderItem={renderAdicionalItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noAdicionalesText}>
              No hay adicionales creados. ¡Agrega el primero!
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Modal para crear/editar adicional */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeAdicionalModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAdicional ? "Editar Adicional" : "Crear Adicional"}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeAdicionalModal}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* Image Picker para adicional */}
              <TouchableOpacity
                onPress={pickAdicionalImage}
                style={styles.modalImagePicker}
              >
                {adicionalFoto ? (
                  <Image
                    source={{ uri: adicionalFoto.uri }}
                    style={styles.modalImage}
                  />
                ) : editingAdicional && editingAdicional.file ? (
                  <Image
                    source={{
                      uri: editingAdicional.file.startsWith("http")
                        ? editingAdicional.file
                        : `${BASE_URL.toString().replace("/api", "")}/storage/${editingAdicional.file
                        }`,
                    }}
                    style={styles.modalImage}
                  />
                ) : (
                  <View style={styles.modalPlaceholder}>
                    <Ionicons name="camera" size={40} color="#9BFE03" />
                    <Text style={styles.modalPlaceholderText}>
                      Seleccionar imagen
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Formulario del adicional */}
              <View style={styles.modalForm}>
                <Text style={styles.modalInputLabel}>Nombre</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Nombre del adicional"
                  placeholderTextColor="#7d7d7d"
                  value={adicionalNombre}
                  onChangeText={setAdicionalNombre}
                />

                <Text style={styles.modalInputLabel}>Descripción</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Descripción del adicional"
                  placeholderTextColor="#7d7d7d"
                  multiline
                  numberOfLines={3}
                  value={adicionalDescripcion}
                  onChangeText={setAdicionalDescripcion}
                />

                <Text style={styles.modalInputLabel}>Precio</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Precio del adicional"
                  placeholderTextColor="#7d7d7d"
                  keyboardType="numeric"
                  value={adicionalPrecio}
                  onChangeText={setAdicionalPrecio}
                />

              </View>
              <Text style={styles.modalHelperText}>
                Si deseas que el adicional sea gratis, asigna el valor 0.
              </Text>
              {/* Botones del modal */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={closeAdicionalModal}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={handleAdicionalSubmit}
                  disabled={loadingAdicional}
                >
                  {loadingAdicional ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.modalSaveText}>
                      {editingAdicional ? "Actualizar" : "Crear"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1c1c1c",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#1c1c1c",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#a4ff00",
    padding: 15,
    marginTop: 60,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
    fontFamily: "Montserrat_700Bold",
  },
  imagePickerContainer: {
    width: "100%",
    height: 250,
    marginVertical: 20,
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#9BFE03",
  },
  placeholderText: {
    marginTop: 10,
    color: "#fff",
    fontFamily: "Montserrat_400Regular",
  },
  formContainer: {
    padding: 15,
  },
  inputLabel: {
    fontSize: 16,
    color: "white",
    fontFamily: "Montserrat_700Bold",
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "white",
    fontFamily: "Montserrat_400Regular",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  myButton: {
    backgroundColor: "#39FF14",
    paddingVertical: 10,
    paddingHorizontal: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginVertical: 20,
    marginBottom: 30,
  },
  buttonText: {
    color: "#000",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "Montserrat_700Bold",
  },
  // Estilos para la sección de adicionales
  adicionalesSection: {
    padding: 15,
    marginTop: 20,
  },
  adicionalesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  adicionalesTitle: {
    fontSize: 18,
    color: "#9BFE03",
    fontFamily: "Montserrat_700Bold",
  },
  addAdicionalButton: {
    backgroundColor: "#9BFE03",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addAdicionalText: {
    color: "#000",
    fontFamily: "Montserrat_700Bold",
    marginLeft: 5,
  },
  loadingAdicionales: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingAdicionalesText: {
    color: "#fff",
    marginLeft: 10,
    fontFamily: "Montserrat_400Regular",
  },
  noAdicionalesText: {
    color: "#7d7d7d",
    textAlign: "center",
    padding: 20,
    fontFamily: "Montserrat_400Regular",
    fontStyle: "italic",
  },
  adicionalItem: {
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  adicionalInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  adicionalImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  // NUEVO estilo para placeholder de imagen
  adicionalImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#555",
    borderStyle: "dashed",
  },
  adicionalTexts: {
    flex: 1,
  },
  adicionalNombre: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 2,
  },
  // MODIFICAR para limitar líneas de descripción
  adicionalDescripcion: {
    color: "#ccc",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    marginBottom: 2,
    lineHeight: 18,
  },
  adicionalPrecio: {
    color: "#9BFE03",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  adicionalActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    backgroundColor: "#333",
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: "#333",
    padding: 8,
    borderRadius: 20,
  },
  // Estilos para el modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#2a2a2a",
    borderRadius: 15,
    width: "90%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  modalTitle: {
    color: "#9BFE03",
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
  },
  closeButton: {
    padding: 5,
  },
  modalScrollView: {
    padding: 20,
  },
  modalImagePicker: {
    width: "100%",
    height: 150,
    marginBottom: 20,
  },
  modalImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  modalPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#9BFE03",
  },
  modalPlaceholderText: {
    color: "#9BFE03",
    marginTop: 10,
    fontFamily: "Montserrat_400Regular",
  },
  modalInputLabel: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 8,
    marginTop: 15,
  },
  modalInput: {
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#fff",
    fontFamily: "Montserrat_400Regular",
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingBottom: 40
  },
  modalCancelButton: {
    backgroundColor: "#666",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.45,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#fff",
    fontFamily: "Montserrat_700Bold",
  },
  modalSaveButton: {
    backgroundColor: "#9BFE03",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.45,
    alignItems: "center",
  },
  modalSaveText: {
    color: "#000",
    fontFamily: "Montserrat_700Bold",
  },
  modalHelperText: {
    fontSize: 13,
    color: '#7d7d7d', // Un color gris suave, similar al placeholder
    marginTop: 5,      // Un pequeño espacio después del input de precio
    marginBottom: 10,  // Espacio antes de que empiecen los botones
    textAlign: 'left', // O 'center' si prefieres
    // Si tus inputs tienen un padding/margin horizontal, 
    // puedes agregarlo aquí también para que se alinee.
    // Ejemplo: paddingHorizontal: 10 
  }
});

export default EditarProducto;
