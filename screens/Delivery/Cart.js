import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  Platform
} from "react-native";
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

const { width } = Dimensions.get("window");

const Cart = () => {
  const navigation = useNavigation();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState("");
  const [establishmentId, setEstablishmentId] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUserDemo, setIsUserDemo] = useState(false);

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
            let estName = "Restaurante";

            if (firstItem.product.user) {
              estName = firstItem.product.user.establecimiento_nombre || "Restaurante";
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
          const basePrice = parseFloat(item.product.precio);
          const adicionalesPrice = item.adicionales ? item.adicionales.reduce((t, a) => t + parseFloat(a.precio) * a.quantity, 0) : 0;
          return { ...item, quantity: newQuantity, totalPrice: newQuantity * (basePrice + adicionalesPrice) };
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
          const basePrice = parseFloat(item.product.precio);
          const adicionalesPrice = item.adicionales ? item.adicionales.reduce((t, a) => t + parseFloat(a.precio) * a.quantity, 0) : 0;
          return { ...item, quantity: newQuantity, totalPrice: newQuantity * (basePrice + adicionalesPrice) };
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
                <Ionicons name="trash-outline" size={18} color="#ff5a52" />
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
                    <AntDesign name="minus" size={14} color="#1C1C1E" />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity onPress={() => onIncrease(item.product.id)} style={styles.qtyBtn}>
                    <AntDesign name="plus" size={14} color="#000" />
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
        <ActivityIndicator size="large" color="#fa6205" />
      </View>
    );
  }

  // --- RENDERIZADO UI PRINCIPAL ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <View style={{flex:1, alignItems:'center'}}>
            <Text style={styles.headerTitle}>Tu Pedido</Text>
            {restaurantName ? (
                <Text style={styles.headerSubtitle} numberOfLines={1}>{restaurantName}</Text>
            ) : null}
        </View>
        <View style={{width: 24}} /> 
      </View>

      {/* Contenido */}
      {cartItems.length > 0 ? (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

            {/* Resumen de Costos */}
            <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Resumen</Text>
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
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                        {"$"}{totalPrice.toLocaleString()}
                    </Text>
                </View>
            </View>
            
            <View style={{height: 100}} /> 
          </ScrollView>

          {/* Footer Flotante */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={styles.payButton}
              activeOpacity={0.8}
              onPress={async () => {
                if (isUserDemo) { setIsModalVisible(true); return; }
                const establecimiento_id_aux = cartItems[0].product.establishmentId;
                const products = cartItems.map((item) => ({
                  productId: item.product.id,
                  quantity: item.quantity,
                  itemTotal: item.totalPrice,
                  productName: item.product.nombre,
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
                } catch (error) { Alert.alert("Error", "No se pudo procesar"); }
              }}
            >
              <View style={{flexDirection:'row', alignItems:'center'}}>
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
        <View style={styles.emptyCartContainer}>
          <View style={styles.emptyIconCircle}>
            <Feather name="shopping-cart" size={50} color="#666" />
          </View>
          <Text style={styles.emptyCartTitle}>Tu carrito está vacío</Text>
          <Text style={styles.emptyCartSubtitle}>¡Agrega deliciosos platillos para comenzar!</Text>
          <TouchableOpacity
            style={styles.continueShoppingButton}
            onPress={() => navigation.navigate("HomeScreen")}
          >
            <Text style={styles.continueShoppingText}>Explorar Restaurantes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Registro (Mismo estilo anterior, adaptado levemente) */}
      <Modal animationType="fade" transparent={true} visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="person-add-outline" size={40} color="#fa6205" style={{marginBottom: 10}} />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
  },
  
  // --- HEADER ---
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 15,
    backgroundColor: "#F2F2F7",
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: "#1C1C1E",
    fontSize: 18,
    fontFamily: "MontserratBold",
  },
  headerSubtitle: {
    color: "#fa6205",
    fontSize: 12,
    fontFamily: "MontserratRegular",
    marginTop: 2,
  },

  // --- CONTENIDO ---
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  itemsList: {
    marginBottom: 20,
  },
  
  // --- CARD ITEM ---
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#ECECEC",
    borderRadius: 16,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#ECECEC",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between'
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    color: "#1C1C1E",
    fontSize: 15,
    fontFamily: "MontserratBold",
    flex: 1,
    marginRight: 5,
  },
  trashBtn: {
    padding: 2,
  },
  itemBasePrice: {
    color: "#888",
    fontSize: 12,
    fontFamily: "MontserratRegular",
    marginTop: 2,
  },
  
  // Adicionales
  adicionalesContainer: {
    marginTop: 6,
    paddingLeft: 4,
    borderLeftWidth: 2,
    borderLeftColor: "#DDD",
  },
  adicionalText: {
    color: "#666",
    fontSize: 11,
    fontFamily: "MontserratRegular",
    marginBottom: 2,
  },

  // Item Footer
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  quantityPill: {
    flexDirection: 'row',
    backgroundColor: '#D8D8D8',
    borderRadius: 20,
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#CCCCCC',
  },
  qtyBtnAdd: {
    backgroundColor: '#fa6205',
  },
  qtyText: {
    color: '#1C1C1E',
    fontFamily: 'MontserratBold',
    fontSize: 14,
    marginHorizontal: 10,
  },
  itemTotalPrice: {
    color: "#fa6205",
    fontSize: 16,
    fontFamily: "MontserratBold",
  },

  // --- SUMMARY SECTION ---
  summaryContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    color: "#1C1C1E",
    fontSize: 16,
    fontFamily: "MontserratBold",
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    color: "#aaa",
    fontFamily: "MontserratRegular",
    fontSize: 14,
  },
  summaryValue: {
    color: "#1C1C1E",
    fontFamily: "MontserratRegular",
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#DDD",
    marginVertical: 10,
  },
  totalLabel: {
    color: "#1C1C1E",
    fontFamily: "MontserratBold",
    fontSize: 18,
  },
  totalValue: {
    color: "#fa6205",
    fontFamily: "MontserratBold",
    fontSize: 18,
  },

  // --- FOOTER FLOTANTE ---
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
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
  payButton: {
    backgroundColor: "#fa6205",
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  payButtonIconCircle: {
    backgroundColor: '#000',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  payButtonCount: {
    color: '#fa6205',
    fontSize: 12,
    fontFamily: 'MontserratBold',
  },
  payButtonText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "MontserratBold",
  },
  payButtonTotal: {
    color: "#000",
    fontSize: 16,
    fontFamily: "MontserratBold",
  },

  // --- EMPTY STATE ---
  emptyCartContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ECECEC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyCartTitle: {
    color: "#1C1C1E",
    fontSize: 22,
    fontFamily: "MontserratBold",
    marginBottom: 10,
  },
  emptyCartSubtitle: {
    color: "#888",
    fontSize: 14,
    fontFamily: "MontserratRegular",
    textAlign: 'center',
    marginBottom: 30,
  },
  continueShoppingButton: {
    backgroundColor: "#fa6205",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
  },
  continueShoppingText: {
    color: "black",
    fontSize: 16,
    fontFamily: "MontserratBold",
  },

  // --- MODAL ---
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalContent: {
    backgroundColor: "#ECECEC",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: "85%",
  },
  modalTitle: {
    color: "#1C1C1E",
    fontSize: 20,
    fontFamily: "MontserratBold",
    marginBottom: 10,
  },
  modalText: {
    color: "#666",
    fontSize: 14,
    fontFamily: "MontserratRegular",
    textAlign: "center",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    width: "100%",
    justifyContent: 'space-between'
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#D8D8D8",
  },
  registerButton: {
    backgroundColor: "#fa6205",
  },
  cancelButtonText: {
    color: "#1C1C1E",
    fontFamily: "MontserratSemiBold",
  },
  registerButtonText: {
    color: "#000",
    fontFamily: "MontserratBold",
  },
});

export default Cart;