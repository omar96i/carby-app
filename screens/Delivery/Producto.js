import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
  StatusBar,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_600SemiBold,
  Montserrat_300Light,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { useNavigation, useRoute } from "@react-navigation/native";
import { BASE_URL } from "../../constants/url";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");
const IMG_HEIGHT = height * 0.4;

const Producto = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { product } = route.params || {};
  const [modalVisible, setModalVisible] = useState(false);
  const [addedQuantity, setAddedQuantity] = useState(0);
  const [addedProductName, setAddedProductName] = useState("");
  const [adicionales, setAdicionales] = useState([]);
  const [selectedAdicionales, setSelectedAdicionales] = useState([]);

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_600SemiBold,
    Montserrat_300Light,
  });

  // --- LÓGICA DE NEGOCIO (Mantenida intacta) ---
  const [quantity, setQuantity] = useState(1);
  const pricePerUnit = product?.precio ? parseFloat(product.precio) : 0;

  const adicionalesPrice = selectedAdicionales.reduce(
    (total, adicional) => total + parseFloat(adicional.precio) * adicional.quantity, 0
  );
  const totalPrice = quantity * pricePerUnit + quantity * adicionalesPrice;

  const increaseQuantity = () => setQuantity(quantity + 1);
  const decreaseQuantity = () => { if (quantity > 1) setQuantity(quantity - 1); };

  const getImageUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith("http")) return photoPath;
    return `${BASE_URL.toString().replace("/api", "")}/storage/${photoPath}`;
  };

  const fetchAdicionales = async () => {
    try {
      if (!product?.id) return;
      const userToken = await AsyncStorage.getItem("userToken");
      if (!userToken) return;

      const response = await fetch(`${BASE_URL}producto-adicionales/producto/${product.id}`, {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${userToken}`, "Content-Type": "application/json" },
      });

      if (!response.ok) { setAdicionales([]); return; }
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) { setAdicionales([]); return; }

      const data = await response.json();
      let adicionalesData = [];
      if (Array.isArray(data)) adicionalesData = data;
      else if (data.data && Array.isArray(data.data)) adicionalesData = data.data;
      else if (data.success && Array.isArray(data.data)) adicionalesData = data.data;

      setAdicionales(adicionalesData);
    } catch (error) { setAdicionales([]); }
  };

  const toggleAdicional = (adicional) => {
    const existingIndex = selectedAdicionales.findIndex((item) => item.id === adicional.id);
    if (existingIndex >= 0) {
      setSelectedAdicionales((prev) => prev.filter((item) => item.id !== adicional.id));
    } else {
      setSelectedAdicionales((prev) => [...prev, { ...adicional, quantity: 1 }]);
    }
  };

  const updateAdicionalQuantity = (adicionalId, change) => {
    setSelectedAdicionales((prev) =>
      prev.map((item) => {
        if (item.id === adicionalId) {
          const newQuantity = Math.max(1, item.quantity + change);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  useEffect(() => {
    if (product?.id) fetchAdicionales();
  }, [product?.id]);

  const addToCart = async () => {
    try {
      const cartItem = {
        product: {
          ...product,
          imageUrl: product?.foto ? getImageUrl(product.foto) : null,
          establishmentId: product.user_id,
        },
        quantity: quantity,
        adicionales: selectedAdicionales,
        totalPrice: totalPrice,
        timestamp: new Date().getTime(),
      };
      const existingCartJSON = await AsyncStorage.getItem("cart");
      let cart = existingCartJSON ? JSON.parse(existingCartJSON) : [];

      const existingProductIndex = cart.findIndex(
        (item) => item.product.id === product.id && JSON.stringify(item.adicionales) === JSON.stringify(selectedAdicionales)
      );

      if (existingProductIndex >= 0) {
        cart[existingProductIndex].quantity += quantity;
        cart[existingProductIndex].totalPrice = cart[existingProductIndex].quantity * (pricePerUnit + adicionalesPrice);
      } else {
        cart.push(cartItem);
      }
      await AsyncStorage.setItem("cart", JSON.stringify(cart));
      setAddedQuantity(quantity);
      setAddedProductName(product.nombre || "Producto");
      setModalVisible(true);
    } catch (error) { Alert.alert("Error", "No se pudo agregar al carrito"); }
  };

  if (!fontsLoaded) return null;

  // --- RENDERIZADO UI ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 100}}>
        
        {/* Imagen Header Inmersiva */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: product?.foto ? getImageUrl(product.foto) : "https://via.placeholder.com/400",
            }}
            style={styles.productImage}
            resizeMode="cover"
            defaultSource={require("../../assets/images/imagen.jpg")}
          />
          {/* Overlay gradiente para el botón de atrás */}
          <View style={styles.headerOverlay}>
             <TouchableOpacity style={styles.backButtonCircle} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
             </TouchableOpacity>
          </View>
        </View>

        {/* Contenido Principal (Sheet Effect) */}
        <View style={styles.contentSheet}>
            
            {/* Header del Producto */}
            <View style={styles.mainInfoContainer}>
                <View style={{flex: 1}}>
                    <Text style={styles.productName}>{product?.nombre || "Producto"}</Text>
                    <Text style={styles.description}>
                        {product?.descripcion || "Sin descripción disponible"}
                    </Text>
                </View>
                <View style={styles.priceTag}>
                    <Text style={styles.priceTagText}>S/{pricePerUnit.toLocaleString()}</Text>
                </View>
            </View>

            {/* Separador */}
            <View style={styles.divider} />

            {/* Selector de Cantidad Principal */}
             <View style={styles.mainQuantityRow}>
                <Text style={styles.sectionTitle}>Cantidad</Text>
                <View style={styles.quantityPill}>
                    <TouchableOpacity onPress={decreaseQuantity} style={styles.qtyBtn}>
                        <Ionicons name="remove" size={22} color={quantity > 1 ? "#fff" : "#555"} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{quantity}</Text>
                    <TouchableOpacity onPress={increaseQuantity} style={styles.qtyBtn}>
                        <Ionicons name="add" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

             {/* Adicionales Section */}
             {adicionales.length > 0 && (
                <View style={styles.adicionalesSection}>
                    <Text style={styles.sectionTitle}>Adicionales / Extras</Text>
                    <Text style={styles.sectionSubtitle}>Selecciona tus acompañamientos</Text>
                    
                    {adicionales.map((adicional) => {
                        const isSelected = selectedAdicionales.find((item) => item.id === adicional.id);
                        return (
                            <TouchableOpacity 
                                key={adicional.id} 
                                style={[styles.adicionalCard, isSelected && styles.adicionalCardSelected]}
                                onPress={() => toggleAdicional(adicional)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.adicionalLeft}>
                                     {/* Checkbox Circular */}
                                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                        {isSelected && <Ionicons name="checkmark" size={14} color="#000" />}
                                    </View>

                                    {adicional.file ? (
                                        <Image source={{ uri: getImageUrl(adicional.file) }} style={styles.adicionalImage} />
                                    ) : null}

                                    <View style={{marginLeft: 10, flex:1}}>
                                        <Text style={styles.adicionalName}>{adicional.nombre}</Text>
                                        <Text style={styles.adicionalPrice}>+S/{parseFloat(adicional.precio).toLocaleString()}</Text>
                                    </View>
                                </View>

                                {/* Controles de cantidad solo si está seleccionado */}
                                {isSelected && (
                                    <View style={styles.adicionalQtyWrapper}>
                                        <TouchableOpacity 
                                            onPress={(e) => { e.stopPropagation(); updateAdicionalQuantity(adicional.id, -1); }}
                                            style={styles.miniQtyBtn}
                                        >
                                            <Ionicons name="remove" size={16} color="#000" />
                                        </TouchableOpacity>
                                        <Text style={styles.miniQtyText}>{isSelected.quantity}</Text>
                                        <TouchableOpacity 
                                            onPress={(e) => { e.stopPropagation(); updateAdicionalQuantity(adicional.id, 1); }}
                                            style={styles.miniQtyBtn}
                                        >
                                            <Ionicons name="add" size={16} color="#000" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
      </ScrollView>

      {/* Footer Flotante */}
      <View style={styles.footerContainer}>
         <View style={styles.footerContent}>
            <View>
                <Text style={styles.footerLabel}>Total a pagar</Text>
                <Text style={styles.footerTotal}>S/{totalPrice.toLocaleString()}</Text>
                {selectedAdicionales.length > 0 && (
                    <Text style={styles.footerSubtext}>Incl. extras</Text>
                )}
            </View>
            <TouchableOpacity style={styles.addToCartBtn} onPress={addToCart}>
                <Text style={styles.addToCartText}>Agregar {quantity > 1 ? `(${quantity})` : ''}</Text>
                <View style={styles.cartIconCircle}>
                    <Ionicons name="cart" size={18} color="#A3FF00" />
                </View>
            </TouchableOpacity>
         </View>
      </View>

      {/* Modal Success */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={40} color="#000" />
            </View>
            <Text style={styles.modalTitle}>¡Listo!</Text>
            <Text style={styles.modalText}>{addedQuantity} {addedProductName} añadido.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => { setModalVisible(false); navigation.goBack(); }}>
                <Text style={styles.btnSecondaryText}>Seguir comprando</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => { setModalVisible(false); navigation.navigate("Carrito"); }}>
                <Text style={styles.btnPrimaryText}>Ir al carrito</Text>
              </TouchableOpacity>
            </View>
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
  
  // --- HEADER & IMAGEN ---
  imageContainer: {
    height: IMG_HEIGHT,
    width: "100%",
    position: 'relative',
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  headerOverlay: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 40 : 50,
    left: 20,
    zIndex: 10,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  // --- CONTENT SHEET ---
  contentSheet: {
    marginTop: -30, // Pull up over image
    backgroundColor: '#1c1c1c',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 25,
    minHeight: height * 0.65,
  },
  mainInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productName: {
    fontSize: 24,
    color: '#fff',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 8,
    lineHeight: 28,
  },
  description: {
    color: '#aaa',
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 20,
  },
  priceTag: {
    backgroundColor: 'rgba(164, 255, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(164, 255, 0, 0.3)',
    marginLeft: 10,
  },
  priceTagText: {
    color: '#A3FF00',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 20,
  },

  // --- CANTIDAD PRINCIPAL ---
  mainQuantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#fff',
    fontFamily: 'Montserrat_700Bold',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 15,
  },
  quantityPill: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 25,
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 5,
    width: 140,
    justifyContent: 'space-between',
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
  },

  // --- ADICIONALES ---
  adicionalesSection: {
    marginTop: 10,
  },
  adicionalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#252525',
    marginBottom: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  adicionalCardSelected: {
    borderColor: '#A3FF00',
    backgroundColor: 'rgba(164, 255, 0, 0.05)',
  },
  adicionalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxSelected: {
    backgroundColor: '#A3FF00',
    borderColor: '#A3FF00',
  },
  adicionalImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#333',
  },
  adicionalName: {
    color: '#fff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  adicionalPrice: {
    color: '#A3FF00',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
  },
  adicionalQtyWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A3FF00',
    borderRadius: 15,
    paddingHorizontal: 2,
    paddingVertical: 2,
    marginLeft: 10,
  },
  miniQtyBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniQtyText: {
    color: '#000',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    marginHorizontal: 5,
  },

  // --- FOOTER ---
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#252525',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 20,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    color: '#aaa',
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  footerTotal: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Montserrat_700Bold',
  },
  footerSubtext: {
    color: '#A3FF00',
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
  },
  addToCartBtn: {
    backgroundColor: '#A3FF00',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    shadowColor: "#A3FF00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addToCartText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    marginRight: 10,
  },
  cartIconCircle: {
    backgroundColor: '#000',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- MODAL ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '80%', backgroundColor: '#2a2a2a', borderRadius: 20, padding: 25, alignItems: 'center' },
  successIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#A3FF00', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  modalTitle: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontSize: 20, marginBottom: 10 },
  modalText: { color: '#ccc', fontFamily: 'Montserrat_400Regular', textAlign: 'center', marginBottom: 20 },
  modalActions: { width: '100%' },
  btnPrimary: { backgroundColor: '#A3FF00', padding: 15, borderRadius: 30, alignItems: 'center', marginBottom: 10 },
  btnPrimaryText: { fontFamily: 'Montserrat_700Bold', color: '#000' },
  btnSecondary: { padding: 10, alignItems: 'center', marginBottom: 5 },
  btnSecondaryText: { fontFamily: 'Montserrat_600SemiBold', color: '#fff' },
});

export default Producto;