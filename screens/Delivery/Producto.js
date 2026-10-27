import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  StatusBar,
  Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_600SemiBold,
  Montserrat_300Light,
  Montserrat_800ExtraBold,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { BASE_URL } from "../../constants/url";
import LogoComercio from "../../components/LogoComercio";
import AlertaModal from "../../components/ErrorModal";
import { getCartBusiness, clearCart } from "../../utils/cartBusiness";
import FavoriteHeart from "../../components/FavoriteHeart";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");
const IMG_HEIGHT = height * 0.4;

const Producto = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { product, establishmentName } = route.params || {};

  useFocusEffect(useCallback(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
    return () => navigation.getParent()?.setOptions({ tabBarStyle: { backgroundColor: '#FFF', height: 56, borderTopWidth: 1, borderTopColor: '#F0F0F0', display: 'flex' } });
  }, [navigation]));

  const [modalVisible, setModalVisible] = useState(false);
  const [addedQuantity, setAddedQuantity] = useState(0);
  const [addedProductName, setAddedProductName] = useState("");
  const [adicionales, setAdicionales] = useState([]);
  const [selectedAdicionales, setSelectedAdicionales] = useState([]);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_600SemiBold,
    Montserrat_300Light,
    Montserrat_800ExtraBold,
  });

  // --- LÓGICA DE NEGOCIO ---
  const [quantity, setQuantity] = useState(1);
  const precioOriginal = product?.precio ? parseFloat(product.precio) : 0;
  const descuento = product?.activo_descuento ? parseFloat(product.descuento) || 0 : 0;
  const pricePerUnit = precioOriginal - descuento;
  const pctDescuento = precioOriginal > 0 ? Math.round((descuento / precioOriginal) * 100) : 0;

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

  const addToCart = async (confirmed = false) => {
    try {
      if (!confirmed) {
        const { establishmentId: biz, establishmentName: name } = await getCartBusiness();
        if (biz && product?.user_id && String(biz) !== String(product.user_id)) {
          showAlert(
            `Tu carrito es de ${name || establishmentName || "otro negocio"}. ¿Vaciarlo y agregar este producto?`,
            "confirm",
            async () => { await clearCart(); addToCart(true); },
            "Sí, vaciar"
          );
          return;
        }
      }
      const cartItem = {
        product: {
          ...product,
          imageUrl: product?.foto ? getImageUrl(product.foto) : null,
          establishmentId: product.user_id,
          establishmentName: establishmentName || product?.establishmentName,
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
    } catch (error) { showAlert("No se pudo agregar al carrito", "error"); }
  };

  if (!fontsLoaded) return null;

  // --- RENDERIZADO UI ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>

        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: product?.foto ? getImageUrl(product.foto) : "https://via.placeholder.com/400",
            }}
            style={styles.productImage}
            resizeMode="cover"
            defaultSource={require("../../assets/images/imagen.jpg")}
          />
          <LinearGradient colors={["rgba(255,255,255,0)", C.surface]} style={styles.imageFade} pointerEvents="none" />
          <View style={[styles.headerOverlay, { top: insets.top + 8 }]}>
             <TouchableOpacity style={styles.backButtonCircle} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={22} color={C.ink} />
             </TouchableOpacity>
             {product?.id && <FavoriteHeart productId={product.id} size={20} style={styles.backButtonCircle} />}
          </View>
        </View>

        <View style={styles.contentSheet}>
            {(!!establishmentName || descuento > 0) && (
              <View style={styles.tagsRow}>
                {!!establishmentName && (
                  <View style={styles.tag}>
                    <LogoComercio comercioId={product?.user_id} size={18} iconName="storefront-outline" />
                    <Text style={styles.tagText} numberOfLines={1}>{establishmentName}</Text>
                  </View>
                )}
                {descuento > 0 && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>-{pctDescuento}%</Text>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.productName}>{product?.nombre || "Producto"}</Text>
            <View style={styles.priceRow}>
                <Text style={styles.priceText}>$ {pricePerUnit.toLocaleString()}</Text>
                {descuento > 0 && (
                  <Text style={styles.priceOriginal}>$ {precioOriginal.toLocaleString()}</Text>
                )}
            </View>
            <Text style={styles.description}>
                {product?.descripcion || "Sin descripción disponible"}
            </Text>

             {adicionales.length > 0 && (
                <View style={styles.adicionalesSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Adicionales / Extras</Text>
                        <Text style={styles.sectionSubtitle}>Selecciona tus acompañamientos</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adicionalesRow}>
                    {adicionales.map((adicional) => {
                        const isSelected = selectedAdicionales.find((item) => item.id === adicional.id);
                        return (
                            <TouchableOpacity
                                key={adicional.id}
                                style={[styles.adicionalCard, isSelected && styles.adicionalCardSelected]}
                                onPress={() => toggleAdicional(adicional)}
                                activeOpacity={0.85}
                            >
                                {adicional.file ? (
                                    <Image source={{ uri: getImageUrl(adicional.file) }} style={styles.adicionalImage} resizeMode="contain" />
                                ) : (
                                    <View style={[styles.adicionalImage, styles.adicionalImageEmpty]}>
                                        <Ionicons name="fast-food-outline" size={26} color={C.brand} />
                                    </View>
                                )}
                                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                    <Ionicons name={isSelected ? "checkmark" : "add"} size={16} color={isSelected ? C.surface : C.brand} />
                                </View>
                                <Text style={styles.adicionalName} numberOfLines={2}>{adicional.nombre}</Text>
                                {!!adicional.descripcion && (
                                    <Text style={styles.adicionalDesc} numberOfLines={3}>{adicional.descripcion}</Text>
                                )}
                                <Text style={styles.adicionalPrice}>+$ {parseFloat(adicional.precio).toLocaleString()}</Text>

                                {/* Controles de cantidad solo si está seleccionado */}
                                {isSelected && (
                                    <View style={styles.adicionalQtyWrapper}>
                                        <TouchableOpacity
                                            onPress={(e) => { e.stopPropagation(); updateAdicionalQuantity(adicional.id, -1); }}
                                            style={styles.miniQtyBtn}
                                        >
                                            <Ionicons name="remove" size={16} color={C.surface} />
                                        </TouchableOpacity>
                                        <Text style={styles.miniQtyText}>{isSelected.quantity}</Text>
                                        <TouchableOpacity
                                            onPress={(e) => { e.stopPropagation(); updateAdicionalQuantity(adicional.id, 1); }}
                                            style={styles.miniQtyBtn}
                                        >
                                            <Ionicons name="add" size={16} color={C.surface} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                    </ScrollView>
                </View>
            )}
        </View>
      </ScrollView>

      <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
         <View style={styles.footerContent}>
            <View style={styles.quantityPill}>
                <TouchableOpacity onPress={decreaseQuantity} style={styles.qtyBtn}>
                    <Ionicons name="remove" size={20} color={quantity > 1 ? C.ink : C.placeholder} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{quantity}</Text>
                <TouchableOpacity onPress={increaseQuantity} style={styles.qtyBtn}>
                    <Ionicons name="add" size={20} color={C.ink} />
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.addToCartBtn} onPress={() => addToCart()} activeOpacity={0.85}>
                <Text style={styles.addToCartText}>Agregar</Text>
                <Text style={styles.addToCartTotal}>$ {totalPrice.toLocaleString()}</Text>
            </TouchableOpacity>
         </View>
      </View>

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={36} color={C.surface} />
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
      <AlertaModal
        visible={alertVisible}
        mensaje={alertData.message}
        tipo={alertData.type}
        onCerrar={() => setAlertVisible(false)}
        onPrimary={alertData.onPrimary}
        primaryLabel={alertData.primaryLabel}
      />
    </View>
  );
};

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", edge: "#E4E4E7", iconBg: "#FFF0E5", tint: "#FFF8F3", placeholder: "#A1A1AA" };
const BOTON_ELEVADO = { shadowColor: "#fa6205", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.surface },

  imageContainer: { height: IMG_HEIGHT, width: "100%", backgroundColor: C.bg },
  productImage: { width: "100%", height: "100%" },
  imageFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 120 },
  headerOverlay: { position: "absolute", left: 16, right: 16, zIndex: 10, flexDirection: "row", justifyContent: "space-between" },
  backButtonCircle: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: C.surface, justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },

  contentSheet: { marginTop: -36, paddingHorizontal: 20 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.iconBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, maxWidth: "70%" },
  tagText: { color: C.brand, fontSize: 11.5, fontFamily: "Montserrat_700Bold" },
  productName: { fontSize: 25, color: C.ink, fontFamily: "Montserrat_800ExtraBold", lineHeight: 30 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 6 },
  priceText: { color: C.brand, fontFamily: "Montserrat_800ExtraBold", fontSize: 23 },
  priceOriginal: { color: C.placeholder, fontFamily: "Montserrat_400Regular", fontSize: 14, textDecorationLine: "line-through" },
  description: { color: C.muted, fontSize: 14, fontFamily: "Montserrat_400Regular", lineHeight: 20, marginTop: 10 },

  adicionalesSection: { marginTop: 22 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 17, color: C.ink, fontFamily: "Montserrat_800ExtraBold" },
  sectionSubtitle: { fontSize: 13, color: C.muted, fontFamily: "Montserrat_400Regular", marginTop: 2 },
  adicionalesRow: { gap: 10, paddingRight: 20 },
  adicionalCard: { width: 148, backgroundColor: C.surface, borderRadius: 20, padding: 8, borderWidth: 1.5, borderColor: C.edge },
  adicionalCardSelected: { borderColor: C.brand, backgroundColor: C.tint },
  adicionalImage: { width: "100%", height: 104, borderRadius: 14, backgroundColor: C.bg, marginBottom: 8 },
  adicionalImageEmpty: { alignItems: "center", justifyContent: "center", backgroundColor: C.iconBg },
  checkbox: {
    position: "absolute", top: 14, right: 14, width: 28, height: 28, borderRadius: 14, backgroundColor: C.surface,
    justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  checkboxSelected: { backgroundColor: C.brand },
  adicionalName: { color: C.ink, fontFamily: "Montserrat_700Bold", fontSize: 12.5, lineHeight: 16, paddingHorizontal: 2 },
  adicionalDesc: { color: C.muted, fontFamily: "Montserrat_400Regular", fontSize: 11.5, lineHeight: 15, marginTop: 2, paddingHorizontal: 2 },
  adicionalPrice: { color: C.brand, fontFamily: "Montserrat_800ExtraBold", fontSize: 12.5, marginTop: 3, paddingHorizontal: 2 },
  adicionalQtyWrapper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.brand, borderRadius: 999, padding: 2, marginTop: 8 },
  miniQtyBtn: { width: 28, height: 28, justifyContent: "center", alignItems: "center" },
  miniQtyText: { color: C.surface, fontFamily: "Montserrat_800ExtraBold", fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContainer: { width: "84%", backgroundColor: C.surface, borderRadius: 28, padding: 24, alignItems: "center" },
  successIconCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: C.brand, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  modalTitle: { color: C.ink, fontFamily: "Montserrat_800ExtraBold", fontSize: 20, marginBottom: 6 },
  modalText: { color: C.muted, fontFamily: "Montserrat_400Regular", textAlign: "center", marginBottom: 20 },
  modalActions: { width: "100%", gap: 10 },
  btnPrimary: { backgroundColor: C.brand, height: 52, borderRadius: 999, alignItems: "center", justifyContent: "center", ...BOTON_ELEVADO },
  btnPrimaryText: { fontFamily: "Montserrat_700Bold", color: C.surface, fontSize: 15 },
  btnSecondary: { height: 50, borderRadius: 999, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  btnSecondaryText: { fontFamily: "Montserrat_700Bold", color: C.ink, fontSize: 15 },

  footerContainer: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.surface, paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.edge,
  },
  footerContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  quantityPill: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 999, alignItems: "center", padding: 4 },
  qtyBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.surface, justifyContent: "center", alignItems: "center" },
  qtyText: { color: C.ink, fontFamily: "Montserrat_800ExtraBold", fontSize: 16, width: 30, textAlign: "center" },
  addToCartBtn: {
    flex: 1, height: 54, backgroundColor: C.brand, borderRadius: 999, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 20, ...BOTON_ELEVADO,
  },
  addToCartText: { color: C.surface, fontSize: 16, fontFamily: "Montserrat_700Bold" },
  addToCartTotal: { color: C.surface, fontSize: 16, fontFamily: "Montserrat_700Bold" },
});

export default Producto;
