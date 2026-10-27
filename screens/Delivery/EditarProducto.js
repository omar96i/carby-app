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
  Switch,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../components/ScreenHeader";
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
import { useAlturaTecladoAndroid } from "../../hooks/useAlturaTecladoAndroid";

const EditarProducto = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { productId, verAdiciones } = route.params || {};
  const scrollRef = useRef(null);
  const yaBajo = useRef(false);
  const alturaTeclado = useAlturaTecladoAndroid();

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
  const [rangoPrecios, setRangoPrecios] = useState({ min: null, max: null });

  useFocusEffect(useCallback(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
    return () => navigation.getParent()?.setOptions({ tabBarStyle: { backgroundColor: '#FFF', height: 56, borderTopWidth: 1, borderTopColor: '#F0F0F0', display: 'flex' } });
  }, [navigation]));

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ title: "", message: "", type: "info", onConfirm: null });
  const showAlert = (title, message, type, onConfirm, primaryLabel) => {
    setAlertData({ title, message, type: type || (title === "Éxito" ? "success" : "error"), onConfirm, primaryLabel });
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
      try {
        const token2 = await AsyncStorage.getItem("userToken");
        const r = await fetch(`${BASE_URL}comercio/setup-status`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token2}` },
        });
        const d = await r.json().catch(() => null);
        if (d?.data?.rango_precios) setRangoPrecios(d.data.rango_precios);
      } catch {}
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
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]) {
        setAdicionalFoto(result.assets[0]);
      }
    } catch (error) {
      console.error("Error al elegir la foto del adicional:", error);
      showAlert("Error", "No se pudo abrir la galería. Intenta de nuevo.");
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
          await fetchAdicionales();
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
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]) {
        setFoto(result.assets[0]);
      }
    } catch (error) {
      console.error("Error al elegir la foto del producto:", error);
      showAlert("Error", "No se pudo abrir la galería. Intenta de nuevo.");
    }
  };

  // Form submission for updating the product
  const handleSubmit = async () => {
    if (!nombre || !precio) {
      showAlert("Error", "Nombre y precio son obligatorios (la descripción es opcional)");
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
      if (descripcion?.trim()) formData.append("descripcion", descripcion.trim());
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
    <View style={ep.adRow}>
      {item.file ? (
        <Image source={{ uri: item.file.startsWith("http") ? item.file : `${BASE_URL.toString().replace("/api", "")}/storage/${item.file}` }} style={ep.adThumb} />
      ) : (
        <View style={[ep.adThumb, ep.adThumbVacia]}>
          <Ionicons name="image-outline" size={18} color="#A1A1AA" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={ep.adNombre} numberOfLines={1}>{item.nombre}</Text>
        {!!item.descripcion && <Text style={ep.adDesc} numberOfLines={2}>{item.descripcion}</Text>}
        <Text style={ep.adPrecio}>+$ {Number(item.precio).toLocaleString("es-CO")}</Text>
      </View>
      <TouchableOpacity style={ep.adBtn} onPress={() => openAdicionalModal(item)} activeOpacity={0.7}>
        <Ionicons name="create-outline" size={17} color="#1C1C1E" />
      </TouchableOpacity>
      <TouchableOpacity style={[ep.adBtn, ep.adBtnRojo]} onPress={() => eliminarAdicional(item)} activeOpacity={0.7}>
        <Ionicons name="trash-outline" size={16} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  const imagenActual = foto ? foto.uri : originalImageUrl;
  const precioNum = parseFloat(String(precio || "").replace(/[^\d.]/g, "")) || 0;
  const descuentoNum = parseFloat(String(descuento || "").replace(/[^\d.]/g, "")) || 0;
  const precioFinal = Math.max(0, precioNum - descuentoNum);

  return (
    <>
    <SafeAreaView style={ep.screen} edges={['top', 'left', 'right']}>
      <View style={[ep.root, { marginBottom: alturaTeclado }]}>
        <View style={ep.topBar}>
          <TouchableOpacity style={ep.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={ep.topTitle}>Editar producto</Text>
          <View style={ep.backBtnEspacio} />
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={ep.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={pickImage} style={ep.foto} activeOpacity={0.85}>
            {imagenActual ? (
              <>
                <Image source={{ uri: imagenActual }} style={ep.fotoImg} />
                <View style={ep.fotoChip}>
                  <Ionicons name="camera" size={14} color="#FFF" />
                  <Text style={ep.fotoChipText}>Cambiar foto</Text>
                </View>
              </>
            ) : (
              <View style={ep.fotoVacia}>
                <View style={ep.fotoIcon}>
                  <Ionicons name="camera" size={24} color="#fa6205" />
                </View>
                <Text style={ep.fotoVaciaText}>Toca para cambiar imagen</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={ep.card}>
            <Text style={ep.cardTitulo}>Información</Text>
            <Text style={ep.label}>Nombre del producto</Text>
            <TextInput style={ep.input} placeholder="Ingresa el nombre" placeholderTextColor="#A1A1AA" value={nombre} onChangeText={setNombre} />

            <Text style={ep.label}>Precio</Text>
            <View style={ep.precioBox}>
              <Text style={ep.precioSigno}>$</Text>
              <TextInput style={ep.precioInput} placeholder="Ingresa el precio" placeholderTextColor="#A1A1AA" keyboardType="numeric" value={precio} onChangeText={setPrecio} />
            </View>
            {rangoPrecios?.min != null && rangoPrecios?.max != null ? (
              <View style={ep.rangeRow}>
                <Ionicons name="pricetag-outline" size={13} color="#71717A" />
                <Text style={ep.rangeText}>
                  Rango permitido: $ {Number(rangoPrecios.min).toLocaleString("es-CO")} – $ {Number(rangoPrecios.max).toLocaleString("es-CO")}
                </Text>
              </View>
            ) : null}

            <Text style={ep.label}>Descripción <Text style={ep.opcional}>(opcional)</Text></Text>
            <TextInput style={[ep.input, ep.inputMulti]} placeholder="Ingresa la descripción (opcional)" placeholderTextColor="#A1A1AA" multiline numberOfLines={4} value={descripcion} onChangeText={setDescripcion} />
          </View>

          <View style={ep.card}>
            <View style={ep.descTop}>
              <View style={[ep.descIcon, activoDescuento && ep.descIconOn]}>
                <Ionicons name="pricetags" size={17} color={activoDescuento ? "#FFF" : "#fa6205"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ep.cardTitulo}>Descuento</Text>
                <Text style={ep.descSub}>{activoDescuento ? "DTO Activo" : "Activar DTO"}</Text>
              </View>
              <Switch value={activoDescuento} onValueChange={setActivoDescuento} trackColor={{ false: "#E4E4E7", true: "#fa6205" }} thumbColor="#FFF" />
            </View>
            <Text style={ep.label}>Descuento ($)</Text>
            <View style={ep.precioBox}>
              <Text style={ep.precioSigno}>− $</Text>
              <TextInput style={ep.precioInput} placeholder="0" placeholderTextColor="#A1A1AA" keyboardType="numeric" value={descuento} onChangeText={setDescuento} />
            </View>
            {activoDescuento && precioNum > 0 && descuentoNum > 0 && (
              <Text style={ep.descResultado}>
                El cliente paga <Text style={ep.descFinal}>$ {Math.round(precioFinal).toLocaleString("es-CO")}</Text> en vez de $ {Math.round(precioNum).toLocaleString("es-CO")}
              </Text>
            )}
          </View>

          {/* Adicionales */}
          <View
            style={ep.card}
            onLayout={(e) => {
              if (verAdiciones && !yaBajo.current) {
                yaBajo.current = true;
                const y = e.nativeEvent.layout.y;
                setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true }), 250);
              }
            }}
          >
            <View style={ep.adHead}>
              <View style={{ flex: 1 }}>
                <Text style={ep.cardTitulo}>Adicionales del producto</Text>
                <Text style={ep.descSub}>Adicional o para elegir</Text>
              </View>
              <TouchableOpacity style={ep.adAgregar} onPress={() => openAdicionalModal()} activeOpacity={0.85}>
                <Ionicons name="add" size={17} color="#FFF" />
                <Text style={ep.adAgregarText}>Agregar</Text>
              </TouchableOpacity>
            </View>

            {loadingAdicionales ? (
              <ActivityIndicator size="small" color="#fa6205" style={{ padding: 20 }} />
            ) : adicionales.length > 0 ? (
              <FlatList data={adicionales} renderItem={renderAdicionalItem} keyExtractor={(item) => item.id.toString()} scrollEnabled={false} />
            ) : (
              <TouchableOpacity style={ep.adVacio} onPress={() => openAdicionalModal()} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={24} color="#fa6205" />
                <Text style={ep.adVacioText}>No hay adicionales creados. ¡Agrega el primero!</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <View style={[ep.footer, { paddingBottom: (alturaTeclado ? 0 : insets.bottom) + 12 }]}>
          <TouchableOpacity style={[ep.guardar, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={ep.guardarText}>Guardar Cambios</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal para crear/editar adicional */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={closeAdicionalModal} statusBarTranslucent>
        <View style={ep.sheetBg}>
          <View style={{ flex: 1 }} />
          <View style={[ep.sheet, { marginBottom: alturaTeclado, paddingBottom: (alturaTeclado ? 0 : insets.bottom) + 16 }]}>
            <View style={ep.grabber} />
            <View style={ep.sheetHead}>
              <Text style={ep.sheetTitle}>{editingAdicional ? "Editar Adicional" : "Crear Adicional"}</Text>
              <TouchableOpacity style={ep.sheetClose} onPress={closeAdicionalModal}>
                <Ionicons name="close" size={20} color="#1C1C1E" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={ep.sheetTop}>
                <TouchableOpacity onPress={pickAdicionalImage} style={[ep.sheetFoto, (adicionalFoto || editingAdicional?.file) && ep.sheetFotoLlena]} activeOpacity={0.8}>
                  {adicionalFoto ? (
                    <Image source={{ uri: adicionalFoto.uri }} style={ep.fotoImg} />
                  ) : editingAdicional && editingAdicional.file ? (
                    <Image
                      source={{ uri: editingAdicional.file.startsWith("http") ? editingAdicional.file : `${BASE_URL.toString().replace("/api", "")}/storage/${editingAdicional.file}` }}
                      style={ep.fotoImg}
                    />
                  ) : (
                    <>
                      <Ionicons name="camera" size={22} color="#fa6205" />
                      <Text style={ep.sheetFotoText}>Seleccionar imagen</Text>
                    </>
                  )}
                </TouchableOpacity>
                <View style={{ flex: 1, gap: 8 }}>
                  <TextInput style={ep.input} placeholder="Nombre del adicional" placeholderTextColor="#A1A1AA" value={adicionalNombre} onChangeText={setAdicionalNombre} />
                  <View style={ep.precioBox}>
                    <Text style={ep.precioSigno}>+ $</Text>
                    <TextInput style={ep.precioInput} placeholder="Precio del adicional" placeholderTextColor="#A1A1AA" keyboardType="numeric" value={adicionalPrecio} onChangeText={setAdicionalPrecio} />
                  </View>
                </View>
              </View>

              <Text style={ep.label}>Descripción</Text>
              <TextInput
                style={[ep.input, { height: 80, paddingTop: 12, textAlignVertical: "top" }]}
                placeholder="Descripción del adicional"
                placeholderTextColor="#A1A1AA"
                multiline
                numberOfLines={3}
                value={adicionalDescripcion}
                onChangeText={setAdicionalDescripcion}
              />
              <Text style={ep.sheetHelper}>Si deseas que el adicional sea gratis, asigna el valor 0.</Text>

              <View style={ep.sheetBtns}>
                <TouchableOpacity style={ep.sheetCancel} onPress={closeAdicionalModal} activeOpacity={0.8}>
                  <Text style={ep.sheetCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={ep.sheetOk} onPress={handleAdicionalSubmit} disabled={loadingAdicional} activeOpacity={0.85}>
                  {loadingAdicional ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={ep.sheetOkText}>{editingAdicional ? "Actualizar" : "Crear"}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>

      <AlertaModal
        visible={alertVisible}
        tipo={alertData.type}
        mensaje={alertData.message}
        titulo={alertData.type === "confirm" ? alertData.title : undefined}
        onPrimary={alertData.type === "confirm" && alertData.onConfirm ? () => {
          setAlertVisible(false);
          alertData.onConfirm();
        } : undefined}
        primaryLabel={alertData.primaryLabel || "Confirmar"}
        onCerrar={() => {
          setAlertVisible(false);
          if (alertData.type !== "confirm" && alertData.onConfirm) alertData.onConfirm();
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F4F5" },
  loadingContainer: { flex: 1, backgroundColor: "#F4F4F5", justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#1C1C1E", marginTop: 10, fontSize: 16, fontFamily: "Montserrat_400Regular" },
  imagePicker: { marginHorizontal: 16, marginTop: 20, height: 180, borderRadius: 16, overflow: "hidden", backgroundColor: "#E8E8ED" },
  imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#DDD", borderStyle: "dashed", borderRadius: 16, gap: 6 },
  imagePlaceholderText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#BBB" },
  formContainer: { padding: 16 },
  inputLabel: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: "#1C1C1E", marginBottom: 6, marginTop: 14 },
  rangeText: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: "#fa6205", marginTop: 4 },
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


const ep = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F5" },
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  backBtnEspacio: { width: 40 },
  topTitle: { fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E" },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },

  foto: { height: 210, borderRadius: 24, overflow: "hidden", backgroundColor: "#FFF", marginTop: 4 },
  fotoImg: { width: "100%", height: "100%" },
  fotoVacia: { flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#E4E4E7", borderStyle: "dashed", borderRadius: 24 },
  fotoIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#FFF0E5", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  fotoVaciaText: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: "#1C1C1E" },
  fotoChip: { position: "absolute", left: 12, bottom: 12, flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.6)" },
  fotoChipText: { fontSize: 12, fontFamily: "Montserrat_700Bold", color: "#FFF" },

  card: { backgroundColor: "#FFF", borderRadius: 24, padding: 16, marginTop: 14 },
  cardTitulo: { fontSize: 15.5, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E" },
  label: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: "#1C1C1E", marginTop: 14, marginBottom: 8 },
  opcional: { fontFamily: "Montserrat_400Regular", color: "#71717A" },
  input: { backgroundColor: "#F4F4F5", height: 50, borderRadius: 16, paddingHorizontal: 16, fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: "#1C1C1E" },
  inputMulti: { height: 100, paddingTop: 14, paddingBottom: 14, textAlignVertical: "top" },
  precioBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F4F4F5", height: 50, borderRadius: 16, paddingHorizontal: 16 },
  precioSigno: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: "#71717A", marginRight: 6 },
  precioInput: { flex: 1, height: "100%", fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E", padding: 0 },
  rangeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, marginLeft: 2 },
  rangeText: { fontSize: 11.5, fontFamily: "Montserrat_600SemiBold", color: "#71717A" },

  descTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  descIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFF0E5", alignItems: "center", justifyContent: "center" },
  descIconOn: { backgroundColor: "#fa6205" },
  descSub: { fontSize: 11.5, fontFamily: "Montserrat_400Regular", color: "#71717A", marginTop: 2 },
  descResultado: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: "#71717A", marginTop: 10, marginLeft: 2 },
  descFinal: { fontFamily: "Montserrat_800ExtraBold", color: "#10B981" },

  adHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  adAgregar: { flexDirection: "row", alignItems: "center", gap: 4, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: "#fa6205" },
  adAgregarText: { fontSize: 12.5, fontFamily: "Montserrat_700Bold", color: "#FFF" },
  adRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F4F4F5", borderRadius: 18, padding: 10, marginTop: 10 },
  adThumb: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#FFF" },
  adThumbVacia: { alignItems: "center", justifyContent: "center" },
  adNombre: { fontSize: 13.5, fontFamily: "Montserrat_700Bold", color: "#1C1C1E" },
  adDesc: { fontSize: 11.5, fontFamily: "Montserrat_400Regular", color: "#71717A", marginTop: 1 },
  adPrecio: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: "#fa6205", marginTop: 3 },
  adMeta: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: "#71717A" },
  adBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  adBtnRojo: { backgroundColor: "#FEF2F2" },
  adVacio: { alignItems: "center", paddingVertical: 18, marginTop: 10, borderRadius: 18, borderWidth: 1.5, borderColor: "#FDD0A5", borderStyle: "dashed" },
  adVacioText: { fontSize: 12.5, fontFamily: "Montserrat_600SemiBold", color: "#71717A", marginTop: 6, textAlign: "center", paddingHorizontal: 16 },

  footer: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: "#F4F4F5" },
  guardar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 54, borderRadius: 27, backgroundColor: "#fa6205",
    shadowColor: "#fa6205", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  guardarText: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#FFF" },

  sheetBg: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, maxHeight: "88%" },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: "#E4E4E7", alignSelf: "center", marginBottom: 12 },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E" },
  sheetClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F4F4F5", alignItems: "center", justifyContent: "center" },
  sheetTop: { flexDirection: "row", gap: 10 },
  sheetFoto: { width: 108, height: 108, borderRadius: 18, backgroundColor: "#FFFAF5", borderWidth: 1.5, borderColor: "#FDD0A5", borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  sheetFotoLlena: { borderWidth: 0 },
  sheetFotoText: { fontSize: 11.5, fontFamily: "Montserrat_700Bold", color: "#fa6205", marginTop: 4, textAlign: "center", paddingHorizontal: 8 },
  sheetHelper: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: "#71717A", marginTop: 10 },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 18 },
  sheetCancel: { flex: 1, height: 50, borderRadius: 25, backgroundColor: "#F4F4F5", alignItems: "center", justifyContent: "center" },
  sheetCancelText: { fontSize: 14.5, fontFamily: "Montserrat_700Bold", color: "#1C1C1E" },
  sheetOk: { flex: 1, height: 50, borderRadius: 25, backgroundColor: "#fa6205", alignItems: "center", justifyContent: "center" },
  sheetOkText: { fontSize: 14.5, fontFamily: "Montserrat_700Bold", color: "#FFF" },
});

export default EditarProducto;
