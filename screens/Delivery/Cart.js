import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import FocusAwareStatusBar from "../../components/FocusAwareStatusBar";
import { AntDesign, Feather, Ionicons } from "@expo/vector-icons";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_600SemiBold,
  Montserrat_300Light,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import AlertaModal from "../../components/ErrorModal";

const { width } = Dimensions.get("window");

const Cart = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState("");
  const [establishmentId, setEstablishmentId] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [storePhoto, setStorePhoto] = useState(null);
  const storeLoaded = useRef(false);
  const [isUserDemo, setIsUserDemo] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  // Load the fonts
  const [fontsLoaded] = useFonts({
    MontserratRegular: Montserrat_400Regular,
    MontserratBold: Montserrat_700Bold,
    MontserratSemiBold: Montserrat_600SemiBold,
    MontserratLight: Montserrat_300Light,
  });

  // --- LÓGICA (Mantenida igual) ---
  const { totalPrice, totalQuantity } = useMemo(() => {
    const total = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const quantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    return { totalPrice: total, totalQuantity: quantity };
  }, [cartItems]);

  useEffect(() => {
    const loadCartData = async () => {
      try {
        const cartData = await AsyncStorage.getItem("cart");
        if (cartData) {
          const parsedCart = JSON.parse(cartData);
          setCartItems(parsedCart);

          if (parsedCart.length > 0) {
            const firstItem = parsedCart[0];
            let estId = null;
            let estName = firstItem.product.establishmentName || "Restaurante";

            if (firstItem.product.user) {
              estName = firstItem.product.user.establecimiento_nombre || firstItem.product.establishmentName || "Restaurante";
              estId = firstItem.product.user.id || firstItem.product.user.establecimiento_id;
            }
            if (!estId) {
              estId = firstItem.product.establecimiento_id || firstItem.product.user_id;
            }
            setRestaurantName(estName);
            setEstablishmentId(estId);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error("Error loading cart data:", error);
        setLoading(false);
      }
    };
    loadCartData();
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const parsedUserData = JSON.parse(userData);
          if (parsedUserData.username === "user_demo" || parsedUserData.email === "demo@yariders.com") {
            setIsUserDemo(true);
          }
        }
      } catch (error) {}
    };
    loadUserData();
  }, []);

  useEffect(() => {
    if (!establishmentId || storeLoaded.current) return;
    storeLoaded.current = true;
    const loadStore = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return;
        const response = await fetch(`${BASE_URL}usuario/${establishmentId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        const u = data?.data;
        if (!u) return;
        if (u.foto_documento_file) {
          const path = u.foto_documento_file;
          setStorePhoto(path.startsWith("http") ? path : `${BASE_URL.toString().replace("/api", "")}/storage/${path}`);
        }
        if (u.establecimiento_nombre) setRestaurantName(u.establecimiento_nombre);
      } catch (error) {}
    };
    loadStore();
  }, [establishmentId]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        const refreshCartItems = async () => {
          try {
            const cartData = await AsyncStorage.getItem("cart");
            if (cartData) setCartItems(JSON.parse(cartData));
          } catch (error) {}
        };
        refreshCartItems();
      }
    }, [loading])
  );

  const clearCart = useCallback(async () => {
    try {
      await AsyncStorage.removeItem("cart");
      setCartItems([]);
    } catch (error) {}
  }, []);

  const increaseQuantity = useCallback(async (id) => {
    try {
      const updatedCart = cartItems.map((item) => {
        if (item.product.id === id) {
          const newQuantity = item.quantity + 1;
          const unitPrice = item.totalPrice / item.quantity;
          return { ...item, quantity: newQuantity, totalPrice: newQuantity * unitPrice };
        }
        return item;
      });
      await Promise.all([AsyncStorage.setItem("cart", JSON.stringify(updatedCart)), setCartItems(updatedCart)]);
    } catch (error) {}
  }, [cartItems]);

  const decreaseQuantity = useCallback(async (id) => {
    try {
      const updatedCart = cartItems.map((item) => {
        if (item.product.id === id) {
          const newQuantity = Math.max(1, item.quantity - 1);
          const unitPrice = item.totalPrice / item.quantity;
          return { ...item, quantity: newQuantity, totalPrice: newQuantity * unitPrice };
        }
        return item;
      });
      await Promise.all([AsyncStorage.setItem("cart", JSON.stringify(updatedCart)), setCartItems(updatedCart)]);
    } catch (error) {}
  }, [cartItems]);

  const removeItem = useCallback(async (id) => {
    try {
      const updatedCart = cartItems.filter((item) => item.product.id !== id);
      await Promise.all([AsyncStorage.setItem("cart", JSON.stringify(updatedCart)), setCartItems(updatedCart)]);
    } catch (error) {}
  }, [cartItems]);

  const irAPagar = async () => {
    if (isUserDemo) { setIsModalVisible(true); return; }
    const establecimiento_id_aux = cartItems[0].product.establishmentId;
    const products = cartItems.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      itemTotal: item.totalPrice,
      productName: item.product.nombre,
      productImage: item.product.imageUrl || null,
      basePrice: parseFloat(item.product.precio),
      adicionales: item.adicionales || [],
      adicionalesTotal: item.adicionales ? item.adicionales.reduce((t, a) => t + parseFloat(a.precio) * a.quantity, 0) : 0,
    }));

    try {
      await AsyncStorage.setItem("tempCart", JSON.stringify({
        products,
        totalAmount: totalPrice,
        totalQuantity,
        establishmentId: establecimiento_id_aux,
        establishmentName: restaurantName,
      }));
      navigation.navigate("PaymentScreen", {
        products,
        totalAmount: totalPrice,
        totalQuantity,
        establishmentId: establecimiento_id_aux,
        establishmentName: restaurantName,
        onPaymentComplete: clearCart,
      });
    } catch (error) { showAlert("No se pudo procesar", "error"); }
  };

  const agregarMas = () => {
    const estId = cartItems[0]?.product?.establishmentId || establishmentId;
    if (!estId) return navigation.goBack();
    navigation.navigate("Shop", { establishmentId: estId, userId: estId, establishmentName: restaurantName });
  };

  const tabBarSpace = Math.max(insets.bottom, 8) + 8 + 76;

  // --- ITEM COMPONENT (Rediseñado) ---
  const CartItem = React.memo(({ item, onIncrease, onDecrease, onRemove }) => (
    <View style={styles.itemCard}>
      {/* Imagen */}
      <Image
        source={{ uri: item.product.imageUrl || "https://via.placeholder.com/100" }}
        style={styles.itemImage}
        defaultSource={require("../../assets/images/imagen.jpg")}
      />
      
      {/* Info Central */}
      <View style={styles.itemInfo}>
        <View style={styles.itemHeaderRow}>
            <Text style={styles.itemName} numberOfLines={1}>{item.product.nombre}</Text>
            <TouchableOpacity onPress={() => onRemove(item.product.id)} style={styles.trashBtn}>
                <Ionicons name="trash-outline" size={16} color={C.danger} />
            </TouchableOpacity>
        </View>
        
        <Text style={styles.itemBasePrice}>
          {"$"}{parseFloat(item.product.precio).toLocaleString()}
        </Text>

        {/* Lista de Adicionales */}
        {item.adicionales && item.adicionales.length > 0 && (
          <View style={styles.adicionalesContainer}>
            {item.adicionales.map((adicional) => (
              <Text key={adicional.id} style={styles.adicionalText} numberOfLines={1}>
                + {adicional.nombre} (x{adicional.quantity})
              </Text>
            ))}
          </View>
        )}

        {/* Footer del Item: Cantidad y Precio Total */}
        <View style={styles.itemFooter}>
            <View style={styles.quantityPill}>
                <TouchableOpacity onPress={() => onDecrease(item.product.id)} style={styles.qtyBtn}>
                    <AntDesign name="minus" size={13} color={C.ink} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity onPress={() => onIncrease(item.product.id)} style={styles.qtyBtn}>
                    <AntDesign name="plus" size={13} color={C.ink} />
                </TouchableOpacity>
            </View>
            <Text style={styles.itemTotalPrice}>
                {"$"}{item.totalPrice.toLocaleString()}
            </Text>
        </View>
      </View>
    </View>
  ));

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.brand} />
      </View>
    );
  }

  // --- RENDERIZADO UI PRINCIPAL ---
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tu Pedido</Text>
        {restaurantName ? (
          <Text style={styles.headerSubtitle} numberOfLines={1}>{restaurantName}</Text>
        ) : null}
      </View>

      {/* Contenido */}
      {cartItems.length > 0 ? (
        <>
          <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarSpace + 100 }]} showsVerticalScrollIndicator={false}>
            {restaurantName ? (
              <View style={styles.storeCard}>
                {storePhoto ? (
                  <Image source={{ uri: storePhoto }} style={styles.storeAvatar} />
                ) : (
                  <View style={styles.storeAvatar}>
                    <Text style={styles.storeAvatarText}>{restaurantName.trim().charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.storeName} numberOfLines={1}>{restaurantName}</Text>
                  <Text style={styles.storeMeta} numberOfLines={1}>
                    {totalQuantity} {totalQuantity === 1 ? "artículo" : "artículos"} · {new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                  </Text>
                </View>
                <TouchableOpacity onPress={agregarMas} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.storeAdd}>+ Agregar más</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Lista de Items */}
            <View style={styles.itemsList}>
              {cartItems.map((item) => (
                <CartItem
                  key={`${item.product.id}-${item.timestamp}`}
                  item={item}
                  onIncrease={increaseQuantity}
                  onDecrease={decreaseQuantity}
                  onRemove={removeItem}
                />
              ))}
            </View>

            {/* Resumen tipo tiquete */}
            <View style={styles.summaryContainer}>
                <View style={styles.ticketHeader}>
                    <Ionicons name="receipt-outline" size={18} color={C.brand} />
                    <Text style={styles.summaryTitle}>Resumen</Text>
                </View>
                <View style={styles.dashedDivider} />
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>
                        {"$"}{totalPrice.toLocaleString()}
                    </Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Envío</Text>
                    <Text style={styles.summaryValue}>Por calcular</Text>
                </View>
                <View style={styles.dashedDivider} />
                <View style={styles.summaryRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                        {"$"}{totalPrice.toLocaleString()}
                    </Text>
                </View>
            </View>

          </ScrollView>

          <View style={[styles.payBar, { bottom: tabBarSpace + 22 }]} pointerEvents="box-none">
            <TouchableOpacity style={styles.payButton} activeOpacity={0.85} onPress={irAPagar}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.payButtonIconCircle}>
                  <Text style={styles.payButtonCount}>{totalQuantity}</Text>
                </View>
                <Text style={styles.payButtonText}>Ir a pagar</Text>
              </View>
              <Text style={styles.payButtonTotal}>
                {"$"}{totalPrice.toLocaleString()}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* Empty State */
        <View style={[styles.emptyCartContainer, { paddingBottom: 104 + insets.bottom }]}>
          <View style={styles.emptyIconCircle}>
            <Feather name="shopping-cart" size={44} color={C.brand} />
          </View>
          <Text style={styles.emptyCartTitle}>Tu carrito está vacío</Text>
          <Text style={styles.emptyCartSubtitle}>¡Agrega deliciosos platillos para comenzar!</Text>
          <TouchableOpacity
            style={styles.continueShoppingButton}
            onPress={() => navigation.navigate("Home", { screen: "CategoriaVertical", params: { tipo: "productos" } })}
          >
            <Text style={styles.continueShoppingText}>Explorar Restaurantes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Registro (Mismo estilo anterior, adaptado levemente) */}
      <Modal animationType="fade" transparent={true} visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="person-add-outline" size={36} color={C.brand} style={{marginBottom: 10}} />
            <Text style={styles.modalTitle}>Registro requerido</Text>
            <Text style={styles.modalText}>Regístrate para completar tu pedido.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.registerButton]} onPress={() => { setIsModalVisible(false); navigation.navigate("Register"); }}>
                <Text style={styles.registerButtonText}>Registrarme</Text>
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
    </SafeAreaView>
  );
};

const C = { brand: "#fa6205", brandEdge: "#C94E00", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", edge: "#E4E4E7", iconBg: "#FFF0E5", danger: "#EF4444", dangerBg: "#FEECEC", placeholder: "#A1A1AA" };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  payBar: { position: "absolute", left: 16, right: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },

  header: {
    alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18,
    backgroundColor: C.ink, borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  headerTitle: { color: C.surface, fontSize: 19, fontFamily: "Montserrat_800ExtraBold" },
  storeCard: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10, backgroundColor: C.surface, borderRadius: 22, padding: 10 },
  storeAvatar: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.brand, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  storeAvatarText: { color: C.surface, fontSize: 18, fontFamily: "Montserrat_800ExtraBold" },
  storeName: { color: C.ink, fontSize: 14, fontFamily: "Montserrat_700Bold" },
  storeMeta: { color: C.muted, fontSize: 11.5, fontFamily: "Montserrat_400Regular", marginTop: 1 },
  storeAdd: { color: C.brand, fontSize: 12.5, fontFamily: "Montserrat_800ExtraBold" },
  headerSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Montserrat_400Regular", marginTop: 2 },

  // --- CONTENIDO ---
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  itemsList: { marginBottom: 4 },

  // --- CARD ITEM ---
  itemCard: { flexDirection: "row", backgroundColor: C.surface, borderRadius: 22, padding: 10, marginBottom: 10 },
  itemImage: { width: 84, height: 84, borderRadius: 16, backgroundColor: C.bg },
  itemInfo: { flex: 1, marginLeft: 12, justifyContent: "space-between" },
  itemHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  itemName: { color: C.ink, fontSize: 15, fontFamily: "Montserrat_700Bold", flex: 1 },
  trashBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.dangerBg, alignItems: "center", justifyContent: "center" },
  itemBasePrice: { color: C.muted, fontSize: 12, fontFamily: "Montserrat_400Regular", marginTop: 1 },

  // Adicionales
  adicionalesContainer: { marginTop: 6, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: C.iconBg },
  adicionalText: { color: C.muted, fontSize: 11.5, fontFamily: "Montserrat_400Regular", marginBottom: 2 },

  // Item Footer
  itemFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  quantityPill: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 999, alignItems: "center", padding: 3 },
  qtyBtn: { width: 28, height: 28, justifyContent: "center", alignItems: "center", borderRadius: 14, backgroundColor: C.surface },
  qtyBtnAdd: { backgroundColor: C.brand },
  qtyText: { color: C.ink, fontFamily: "Montserrat_800ExtraBold", fontSize: 14, marginHorizontal: 12 },
  itemTotalPrice: { color: C.brand, fontSize: 16, fontFamily: "Montserrat_800ExtraBold" },

  summaryContainer: { backgroundColor: C.surface, borderRadius: 22, padding: 18, marginTop: 4, marginBottom: 16 },
  ticketHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryTitle: { color: C.ink, fontSize: 16, fontFamily: "Montserrat_800ExtraBold" },
  ticketSub: { color: C.ink, fontSize: 13, fontFamily: "Montserrat_600SemiBold", marginTop: 8 },
  ticketDate: { color: C.muted, fontSize: 12, fontFamily: "Montserrat_400Regular", marginTop: 2 },
  dashedDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.edge, marginVertical: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  summaryLabel: { color: C.muted, fontFamily: "Montserrat_400Regular", fontSize: 14 },
  summaryValue: { color: C.ink, fontFamily: "Montserrat_600SemiBold", fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.edge, marginVertical: 10 },
  totalLabel: { color: C.ink, fontFamily: "Montserrat_800ExtraBold", fontSize: 17 },
  totalValue: { color: C.brand, fontFamily: "Montserrat_800ExtraBold", fontSize: 20 },

  footerContainer: { position: "absolute", bottom: 0, left: 0, right: 0 },
  payButton: {
    backgroundColor: C.brand, borderRadius: 999, height: 58, paddingHorizontal: 20, marginBottom: 4,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    shadowColor: C.brand, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
  },
  payButtonIconCircle: { backgroundColor: C.surface, width: 26, height: 26, borderRadius: 13, justifyContent: "center", alignItems: "center", marginRight: 10 },
  payButtonCount: { color: C.brand, fontSize: 12, fontFamily: "Montserrat_800ExtraBold" },
  payButtonText: { color: C.surface, fontSize: 16, fontFamily: "Montserrat_700Bold" },
  payButtonTotal: { color: C.surface, fontSize: 16, fontFamily: "Montserrat_700Bold" },

  // --- EMPTY STATE ---
  emptyCartContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30 },
  emptyIconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.iconBg, justifyContent: "center", alignItems: "center", marginBottom: 18 },
  emptyCartTitle: { color: C.ink, fontSize: 20, fontFamily: "Montserrat_800ExtraBold", marginBottom: 8 },
  emptyCartSubtitle: { color: C.muted, fontSize: 14, fontFamily: "Montserrat_400Regular", textAlign: "center", marginBottom: 26 },
  continueShoppingButton: {
    backgroundColor: C.brand, paddingHorizontal: 28, height: 54, justifyContent: "center", borderRadius: 999, shadowColor: "#fa6205", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  continueShoppingText: { color: C.surface, fontSize: 15, fontFamily: "Montserrat_700Bold" },

  // --- MODAL ---
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: C.surface, borderRadius: 28, padding: 24, alignItems: "center", width: "85%" },
  modalTitle: { color: C.ink, fontSize: 20, fontFamily: "Montserrat_800ExtraBold", marginBottom: 6 },
  modalText: { color: C.muted, fontSize: 14, fontFamily: "Montserrat_400Regular", textAlign: "center", marginBottom: 20 },
  modalButtons: { flexDirection: "row", width: "100%", gap: 10 },
  modalButton: { height: 50, borderRadius: 999, flex: 1, alignItems: "center", justifyContent: "center" },
  cancelButton: { backgroundColor: C.bg },
  registerButton: { backgroundColor: C.brand, shadowColor: "#fa6205", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  cancelButtonText: { color: C.ink, fontFamily: "Montserrat_700Bold" },
  registerButtonText: { color: C.surface, fontFamily: "Montserrat_700Bold" },
});

export default Cart;