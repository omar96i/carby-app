import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Montserrat_600SemiBold,
  Montserrat_800ExtraBold,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import AlertaModal from "../../components/ErrorModal";
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
    Montserrat_600SemiBold,
    Montserrat_800ExtraBold,
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
  const [descuento, setDescuento] = useState("");
  const [activoDescuento, setActivoDescuento] = useState(false);

  useFocusEffect(useCallback(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
    return () => navigation.getParent()?.setOptions({ tabBarStyle: { backgroundColor: '#FFF', height: 56, borderTopWidth: 1, borderTopColor: '#F0F0F0', display: 'flex' } });
  }, [navigation]));

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ title: "", message: "", type: "info", onConfirm: null });
  const showAlert = (title, message, type, onConfirm) => {
    setAlertData({ title, message, type: type || (title === "Éxito" ? "success" : "error"), onConfirm });
    setAlertVisible(true);
  };

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
        showAlert("Permiso requerido", "Se necesita permiso para acceder a la galería");
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
        showAlert("Error", "No se encontró el token de autenticación");
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
        setDescuento(data.descuento ? data.descuento.toString() : "");
        setActivoDescuento(data.activo_descuento === 1 || data.activo_descuento === true);

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
        showAlert("Error", data.message || "No se pudo obtener la información del producto");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error al cargar producto:", error);
      showAlert("Error", "Ocurrió un error al cargar los datos del producto");
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
      showAlert("Error", "Todos los campos son obligatorios");
      return;
    }

    try {
      setLoadingAdicional(true);
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        showAlert("Error", "No se encontró el token de autenticación");
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

        showAlert("Éxito", editingAdicional ? "Adicional actualizado correctamente" : "Adicional creado correctamente", "success");
        closeAdicionalModal();
        await fetchAdicionales(); // Recargar la lista con la nueva ruta
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log("Error del servidor:", errorData);
        showAlert("Error", errorData.message || "No se pudo guardar el adicional");
      }
    } catch (error) {
      console.error("Error al guardar adicional:", error);
      showAlert("Error", "Ocurrió un error al guardar el adicional");
    } finally {
      setLoadingAdicional(false);
    }
  };

  // Función para eliminar adicional - RUTA CORREGIDA
  const eliminarAdicional = (adicional) => {
    showAlert("Confirmar eliminación", `¿Estás seguro de que quieres eliminar "${adicional.nombre}"?`, "confirm", async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          showAlert("Error", "No se encontró el token de autenticación");
          return;
        }
        const response = await fetch(`${BASE_URL}producto-adicionales/${adicional.id}`, {
          method: "DELETE",
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          showAlert("Éxito", "Adicional eliminado correctamente", "success");
          loadAdicionales();
        } else {
          const errorData = await response.json().catch(() => ({}));
          showAlert("Error", errorData.message || "No se pudo eliminar el adicional");
        }
      } catch (error) {
        console.error("Error al eliminar adicional:", error);
        showAlert("Error", "Ocurrió un error al eliminar el adicional");
      }
    }, "Eliminar");
  };

  if (!fontsLoaded || isLoadingProduct) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fa6205" />
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
      showAlert("Error", "Nombre, precio y descripción son obligatorios");
      return;
    }

    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        showAlert("Error", "No se encontró el token de autenticación");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("nombre", nombre);
      formData.append("precio", precio);
      formData.append("descripcion", descripcion);
      formData.append("categoria_id", categoria_id);
      if (descuento) formData.append("descuento", descuento);
      formData.append("activo_descuento", activoDescuento ? "1" : "0");

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
        showAlert("Éxito", "Producto actualizado correctamente", "success", () => navigation.goBack());
        navigation.goBack();
      } else {
        console.log(response.json().catch())
        const errorData = await response.json().catch(() => ({}));
        showAlert("Error", errorData.message || "No se pudo actualizar el producto");
      }
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      showAlert("Error", "Ocurrió un error al actualizar el producto");
    } finally {
      setLoading(false);
    }
  }; // Renderizar item de adicional - CORREGIDO para usar 'file' en lugar de 'foto'
  const renderAdicionalItem = ({ item }) => (
    <View style={styles.adicionalItem}>
      {item.file ? (
        <Image source={{ uri: item.file.startsWith("http") ? item.file : `${BASE_URL.toString().replace("/api", "")}/storage/${item.file}` }} style={styles.adicionalImage} />
      ) : (
        <View style={styles.adicionalImagePlaceholder}>
          <Ionicons name="image-outline" size={20} color="#CCC" />
        </View>
      )}
      <View style={styles.adicionalInfo}>
        <Text style={styles.adicionalNombre}>{item.nombre}</Text>
        <Text style={styles.adicionalDescripcion} numberOfLines={2}>{item.descripcion}</Text>
        <Text style={styles.adicionalPrecio}>$ {Number(item.precio).toLocaleString("es-CO")}</Text>
      </View>
      <TouchableOpacity style={styles.adicionalEditBtn} onPress={() => openAdicionalModal(item)}>
        <Ionicons name="pencil" size={14} color="#999" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.adicionalDeleteBtn} onPress={() => eliminarAdicional(item)}>
        <Ionicons name="trash-outline" size={14} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
    <View style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Editar Producto</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Product Image */}
        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
          {foto ? (
            <Image source={{ uri: foto.uri }} style={styles.imagePreview} />
          ) : originalImageUrl ? (
            <Image source={{ uri: originalImageUrl }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={40} color="#CCC" />
              <Text style={styles.imagePlaceholderText}>Toca para cambiar imagen</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>Nombre del producto</Text>
          <TextInput style={styles.input} placeholder="Ingresa el nombre" placeholderTextColor="#999" value={nombre} onChangeText={setNombre} />

          <Text style={styles.inputLabel}>Precio</Text>
          <TextInput style={styles.input} placeholder="Ingresa el precio" placeholderTextColor="#999" keyboardType="numeric" value={precio} onChangeText={setPrecio} />

          <Text style={styles.inputLabel}>Descripción</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Ingresa la descripción" placeholderTextColor="#999" multiline numberOfLines={4} value={descripcion} onChangeText={setDescripcion} />

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Descuento ($)</Text>
              <TextInput style={styles.input} placeholder="0" placeholderTextColor="#999" keyboardType="numeric" value={descuento} onChangeText={setDescuento} />
            </View>
            <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: 14 }}>
              <TouchableOpacity style={[styles.toggleBtn, activoDescuento && { backgroundColor: "#fa6205" }]} onPress={() => setActivoDescuento(!activoDescuento)}>
                <Text style={[styles.toggleText, activoDescuento && { color: "#FFF", fontFamily: "Montserrat_700Bold" }]}>
                  {activoDescuento ? "DTO Activo" : "Activar DTO"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity style={styles.myButton} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.buttonText}>Guardar Cambios</Text>}
        </TouchableOpacity>

        {/* Adicionales */}
        <View style={styles.adicionalesSection}>
          <View style={styles.adicionalesHeader}>
            <Text style={styles.adicionalesTitle}>Adicionales del Producto</Text>
            <TouchableOpacity style={styles.addAdicionalButton} onPress={() => openAdicionalModal()}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.addAdicionalText}>Agregar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.adicionalHelperText}>Adicional o para elegir</Text>

          {loadingAdicionales ? (
            <ActivityIndicator size="small" color="#fa6205" style={{ padding: 20 }} />
          ) : adicionales.length > 0 ? (
            <FlatList data={adicionales} renderItem={renderAdicionalItem} keyExtractor={(item) => item.id.toString()} scrollEnabled={false} />
          ) : (
            <Text style={styles.noAdicionalesText}>No hay adicionales creados. ¡Agrega el primero!</Text>
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
                <Ionicons name="close" size={24} color="#1C1C1E" />
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
                    <Ionicons name="camera" size={40} color="#fa6205" />
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
<ActivityIndicator size="small" color="#FFF" />
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

      <AlertaModal
        visible={alertVisible}
        tipo={alertData.type}
        mensaje={alertData.message}
        onCerrar={() => {
          setAlertVisible(false);
          if (alertData.onConfirm) alertData.onConfirm();
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F4F5" },
  loadingContainer: { flex: 1, backgroundColor: "#F4F4F5", justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#1C1C1E", marginTop: 10, fontSize: 16, fontFamily: "Montserrat_400Regular" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#1C1C1E", paddingHorizontal: 16, paddingTop: 50, paddingBottom: 20,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  headerText: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  imagePicker: { marginHorizontal: 16, marginTop: 20, height: 180, borderRadius: 16, overflow: "hidden", backgroundColor: "#E8E8ED" },
  imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#DDD", borderStyle: "dashed", borderRadius: 16, gap: 6 },
  imagePlaceholderText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#BBB" },
  formContainer: { padding: 16 },
  inputLabel: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: "#1C1C1E", marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: "#FFF", borderRadius: 14, borderWidth: 1, borderColor: "#E8E8ED", padding: 14, fontSize: 14, fontFamily: "Montserrat_400Regular", color: "#1C1C1E" },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  myButton: {
    backgroundColor: "#fa6205", marginHorizontal: 16, paddingVertical: 16, borderRadius: 20, alignItems: "center",
    shadowColor: "#fa6205", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, marginTop: 20,
  },
  buttonText: { color: "#FFF", fontSize: 16, fontFamily: "Montserrat_800ExtraBold" },

  adicionalesSection: { padding: 16, marginTop: 8 },
  adicionalesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  adicionalesTitle: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E" },
  addAdicionalButton: { backgroundColor: "#fa6205", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6 },
  addAdicionalText: { color: "#FFF", fontFamily: "Montserrat_700Bold", fontSize: 13 },
  adicionalHelperText: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: "#999", marginBottom: 14 },
  noAdicionalesText: { color: "#999", textAlign: "center", padding: 20, fontFamily: "Montserrat_400Regular" },
  adicionalItem: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: "#F0F0F0", gap: 10,
  },
  adicionalImage: { width: 52, height: 52, borderRadius: 12, backgroundColor: "#F4F4F5" },
  adicionalImagePlaceholder: { width: 52, height: 52, borderRadius: 12, backgroundColor: "#F4F4F5", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#E0E0E0", borderStyle: "dashed" },
  adicionalInfo: { flex: 1 },
  adicionalNombre: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: "#1C1C1E", marginBottom: 2 },
  adicionalDescripcion: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: "#71717A", marginBottom: 2 },
  adicionalPrecio: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: "#fa6205" },
  adicionalEditBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F4F4F5", justifyContent: "center", alignItems: "center" },
  adicionalDeleteBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#FEF2F2", justifyContent: "center", alignItems: "center" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "85%", paddingTop: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 8, position: "relative" },
  closeButton: { position: "absolute", right: 16, top: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: "#F4F4F5", justifyContent: "center", alignItems: "center", zIndex: 1 },
  modalTitle: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E" },
  modalScrollView: { paddingHorizontal: 20, paddingBottom: 30 },
  modalImagePicker: { width: "100%", height: 130, marginBottom: 16, borderRadius: 14, overflow: "hidden", backgroundColor: "#F4F4F5" },
  modalImage: { width: "100%", height: "100%", borderRadius: 14 },
  modalPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#DDD", borderStyle: "dashed", borderRadius: 14, gap: 4 },
  modalPlaceholderText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#BBB" },
  modalForm: { paddingVertical: 8 },
  modalInputLabel: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: "#1C1C1E", marginBottom: 6, marginTop: 12 },
  modalInput: { backgroundColor: "#F4F4F5", borderRadius: 14, padding: 12, fontSize: 14, fontFamily: "Montserrat_400Regular", color: "#1C1C1E" },
  modalTextArea: { minHeight: 80, textAlignVertical: "top" },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 20, paddingBottom: 30 },
  modalCancelButton: { flex: 1, backgroundColor: "#F4F4F5", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  modalCancelText: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#71717A" },
  modalSaveButton: { flex: 1, backgroundColor: "#fa6205", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  modalSaveText: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  modalHelperText: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: "#999", marginTop: 6, marginBottom: 4 },
  toggleBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#F4F4F5", alignItems: "center" },
  toggleText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#71717A" },
});

export default EditarProducto;
