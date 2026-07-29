import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_600SemiBold,
  Montserrat_300Light,
  Montserrat_800ExtraBold,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import Ionicons from "react-native-vector-icons/Ionicons";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import AlertaModal from "../../components/ErrorModal";
import { BASE_URL } from "../../constants/url";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const PRODUCT_CARD_WIDTH = (width - 48) / 2;

const TABS = [
  { id: "menu", label: "Menú" },
  { id: "descuentos", label: "Descuentos" },
];

const Shop = () => {
  const route = useRoute();
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
    }, [navigation])
  );

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ title: "", message: "", type: "info", onConfirm: null });
  const showAlert = (title, message, type, onConfirm) => {
    setAlertData({ title, message, type: type || (title === "Éxito" ? "success" : "error"), onConfirm });
    setAlertVisible(true);
  };

  const {
    establishmentId,
    establishmentName,
    subcategories: initialSubcategories,
    userId,
    promedio_puntuacion_restaurante,
    isSede = false,
    sedeId = null,
    sedeLocation = null,
    imagenSede = null,
  } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [fetchedSubcategories, setFetchedSubcategories] = useState([]);
  const [fetchedServicios, setFetchedServicios] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("menu");

  const [establishmentDisplayName] = useState(establishmentName);
  const [rating, setRating] = useState(promedio_puntuacion_restaurante);
  const [comercioPedidos, setComercioPedidos] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(false);

  const [ratingsModalVisible, setRatingsModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [addedProductName, setAddedProductName] = useState("");
  const [addedQuantity, setAddedQuantity] = useState(1);
  const [profilePhoto, setProfilePhoto] = useState(null);

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_600SemiBold,
    Montserrat_300Light,
    Montserrat_800ExtraBold,
  });

  const getImageUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith("http")) return photoPath;
    return `${BASE_URL.toString().replace("/api", "")}/storage/${photoPath}`;
  };

  const fetchComercioRatings = async () => {
    if (!establishmentId) return;
    setLoadingRatings(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("Token no encontrado");
      const response = await fetch(`${BASE_URL}usuario/${establishmentId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Error ${response.status}`);
      const data = await response.json();
      if (data && data.data) {
        const userData = data.data;
        if (userData.promedio_puntuacion_restaurante !== undefined) setRating(userData.promedio_puntuacion_restaurante);
        if (userData.foto_documento_file) setProfilePhoto(getImageUrl(userData.foto_documento_file));
        if (userData.comercio_pedidos) {
          const pedidosConCalificacion = userData.comercio_pedidos.filter((pedido) => pedido.puntuacion_restaurante !== null);
          setComercioPedidos(pedidosConCalificacion);
        }
      }
    } catch (error) {
      console.error("🔴 Error fetching ratings:", error);
    } finally {
      setLoadingRatings(false);
    }
  };

  const fetchCategoriesAndProducts = async () => {
    try {
      if (!userId) { setLoading(false); setError("No userId"); return; }
      const token = await AsyncStorage.getItem("userToken");
      if (!token) { setLoading(false); setError("No token"); return; }
      const response = await fetch(`${BASE_URL}usuario/get-categorias/${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Error ${response.status}`);
      const responseData = await response.json();
      if (responseData?.data?.categorias) {
        setFetchedSubcategories(responseData.data.categorias);
      } else {
        setFetchedSubcategories([]);
      }
    } catch (error) {
      console.error("🔴 Error", error);
      setError("Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  const fetchServicios = async () => {
    try {
      if (!userId) return;
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;
      const response = await fetch(`${BASE_URL}user-servicio/by-user/${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setFetchedServicios(data.data || []);
    } catch (error) {
      console.error("Error servicios", error);
      setFetchedServicios([]);
    }
  };

  useEffect(() => {
    fetchCategoriesAndProducts();
    fetchComercioRatings();
    fetchServicios();
  }, [userId]);

  const subcategories = useMemo(() => {
    let base = fetchedSubcategories.length > 0 ? [...fetchedSubcategories] : initialSubcategories || [];

    if (fetchedServicios.length > 0) {
      const serviciosPorCategoria = {};
      fetchedServicios.forEach((servicio) => {
        const catId = servicio.category_id || servicio.categoria_id;
        if (!catId) return;
        if (!serviciosPorCategoria[catId]) serviciosPorCategoria[catId] = [];
        serviciosPorCategoria[catId].push(servicio);
      });
      base = base.map((cat) => {
        const catId = cat.id || cat.category_id || cat.categoria_id;
        return { ...cat, servicios: serviciosPorCategoria[catId] || cat.servicios || [] };
      });
    }

    base = base.map((cat) => {
      const filteredProducts = (cat.productos || []).filter((prod) => {
        const prodSedeId = prod.user_sede_id;
        if (isSede) return prodSedeId != null && String(prodSedeId) === String(sedeId);
        return !prodSedeId;
      });

      const filteredServices = (cat.servicios || []).filter((serv) => {
        const servSedeId = serv.user_sede_id;
        if (isSede) return servSedeId != null && String(servSedeId) === String(sedeId);
        return !servSedeId;
      });

      return { ...cat, productos: filteredProducts, servicios: filteredServices };
    });

    return base;
  }, [fetchedSubcategories, initialSubcategories, fetchedServicios, isSede, sedeId]);

  const allDiscountableItems = useMemo(() => {
    const list = [];
    subcategories.forEach((cat) => {
      (cat.productos || []).filter((p) => !!p.activo).forEach((p) => {
        list.push(p);
      });
      (cat.servicios || []).forEach((s) => {
        list.push(s);
      });
    });
    return list;
  }, [subcategories]);

  const filteredSections = useMemo(() => {
    let cats = subcategories.filter((cat) => (cat.productos?.length > 0) || (cat.servicios?.length > 0));

    if (activeTab === "descuentos") {
      cats = cats
        .map((cat) => ({
          ...cat,
          productos: cat.productos.filter((p) => p.activo_descuento && Number(p.descuento) > 0),
          servicios: (cat.servicios || []).filter((s) => s.activo_descuento && Number(s.descuento) > 0),
        }))
        .filter((cat) => cat.productos.length > 0 || cat.servicios.length > 0);
    }

    return cats;
  }, [subcategories, activeTab]);

  const maxDiscount = useMemo(() => {
    return allDiscountableItems.reduce((max, item) => {
      if (!item.activo_descuento) return max;
      const pct = Number(item.precio) > 0 ? Math.round((Number(item.descuento) / Number(item.precio)) * 100) : 0;
      return Math.max(max, pct);
    }, 0);
  }, [allDiscountableItems]);

  const formatPrice = (price) => {
    return `$${Number(price).toLocaleString("es-CO")}`;
  };

  const addToCart = async (product) => {
    try {
      const quantity = 1;
      const precioOriginal = Number(product.precio) || 0;
      const descuento = product.activo_descuento ? Number(product.descuento) || 0 : 0;
      const pricePerUnit = precioOriginal - descuento;
      const totalPrice = quantity * pricePerUnit;
      const cartItem = {
        product: {
          ...product,
          imageUrl: product?.foto ? getImageUrl(product.foto) : null,
          establishmentId: establishmentId,
          establishmentName: establishmentDisplayName,
        },
        quantity: quantity,
        totalPrice: totalPrice,
        timestamp: new Date().getTime(),
      };
      const existingCartJSON = await AsyncStorage.getItem("cart");
      let cart = existingCartJSON ? JSON.parse(existingCartJSON) : [];
      const existingProductIndex = cart.findIndex((item) => item.product.id === product.id);
      if (existingProductIndex >= 0) {
        cart[existingProductIndex].quantity += quantity;
        cart[existingProductIndex].totalPrice = cart[existingProductIndex].quantity * pricePerUnit;
      } else {
        cart.push(cartItem);
      }
      await AsyncStorage.setItem("cart", JSON.stringify(cart));
      setAddedQuantity(quantity);
      setAddedProductName(product.nombre || "Producto");
      setModalVisible(true);
    } catch (error) {
      console.error("Error cart:", error);
      showAlert("Error", "No se pudo agregar");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const goToProduct = (product) => {
    navigation.navigate("Producto", { product, establishmentId, establishmentName: establishmentDisplayName });
  };

  const goToService = (servicio) => {
    navigation.navigate("ServicioDetalle", { servicio, establishmentId, establishmentName: establishmentDisplayName });
  };

  const renderProductCard = (product) => {
    const precioOriginal = Number(product.precio) || 0;
    const descuento = product.activo_descuento ? Number(product.descuento) || 0 : 0;
    const precioFinal = precioOriginal - descuento;
    const pctDescuento = precioOriginal > 0 ? Math.round((descuento / precioOriginal) * 100) : 0;
    const imageUrl = product.foto ? getImageUrl(product.foto) : null;

    return (
      <TouchableOpacity
        key={product.id}
        style={styles.productCard}
        activeOpacity={0.9}
        onPress={() => goToProduct(product)}
      >
        <View style={styles.productImgWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImg} />
          ) : (
            <View style={styles.productPlaceholder}>
              <Ionicons name="image-outline" size={28} color="#CCC" />
            </View>
          )}
          {pctDescuento > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>-{pctDescuento}%</Text>
            </View>
          )}
        </View>
        <View style={styles.productBody}>
          <Text style={styles.productPrice}>{formatPrice(precioFinal)}</Text>
          {descuento > 0 && <Text style={styles.productOriginalPrice}>{formatPrice(precioOriginal)}</Text>}
          <Text style={styles.productName} numberOfLines={2}>{product.nombre}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderServiceCard = (servicio) => {
    const imageUrl = servicio.foto ? getImageUrl(servicio.foto) : null;
    const precioOriginal = Number(servicio.precio) || 0;
    const descuento = servicio.activo_descuento ? Number(servicio.descuento) || 0 : 0;
    const precioFinal = precioOriginal - descuento;
    const pctDescuento = precioOriginal > 0 ? Math.round((descuento / precioOriginal) * 100) : 0;

    return (
      <TouchableOpacity
        key={servicio.id}
        style={styles.productCard}
        activeOpacity={0.9}
        onPress={() => goToService(servicio)}
      >
        <View style={styles.productImgWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImg} />
          ) : (
            <View style={styles.productPlaceholder}>
              <Ionicons name="image-outline" size={28} color="#CCC" />
            </View>
          )}
          {pctDescuento > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>-{pctDescuento}%</Text>
            </View>
          )}
        </View>
        <View style={styles.productBody}>
          <Text style={styles.productPrice}>{formatPrice(precioFinal)}</Text>
          {descuento > 0 && <Text style={styles.productOriginalPrice}>{formatPrice(precioOriginal)}</Text>}
          <Text style={styles.productName} numberOfLines={2}>{servicio.nombre}</Text>
          <Text style={styles.serviceLabel}>Servicio</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (category) => {
    const productos = category.productos || [];
    const servicios = category.servicios || [];
    return (
      <View key={category.id.toString()} style={styles.section}>
        <Text style={styles.sectionTitle}>{category.nombre}</Text>
        <View style={styles.productsGrid}>
          {productos.map(renderProductCard)}
          {servicios.map(renderServiceCard)}
        </View>
      </View>
    );
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5A00" />
      </View>
    );
  }

  const heroImage = isSede && imagenSede ? getImageUrl(imagenSede) : profilePhoto;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[2]}>
        {/* Hero */}
        <View style={styles.heroWrap}>
          <Image
            source={heroImage ? { uri: heroImage } : require("../../assets/images/imagen.jpg")}
            style={styles.heroImage}
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroNav}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={22} color="#1C1C1E" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info header */}
        <View style={styles.infoHeader}>
          <View style={styles.logoRow}>
            <Image
              source={heroImage ? { uri: heroImage } : require("../../assets/images/imagen.jpg")}
              style={styles.logoImg}
            />
            <Text style={styles.storeName}>{establishmentDisplayName || "Comercio"}</Text>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Cerca de ti</Text>
              <View style={styles.statRow}>
                <Ionicons name="location" size={14} color="#00A650" />
                <Text style={[styles.statValue, { color: "#00A650" }]}>¡Abierto!</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => setRatingsModalVisible(true)}>
              <Text style={styles.statLabel}>Calificación</Text>
              <View style={styles.statRow}>
                <FontAwesome name="star" size={12} color="#FFD700" />
                <Text style={styles.statValue}>{rating ? parseFloat(rating).toFixed(1) : "0.0"}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {maxDiscount > 0 && (
            <View style={styles.promoBanner}>
              <Text style={styles.promoTitle}>Hasta {maxDiscount}% OFF imperdible</Text>
              <Text style={styles.promoDesc}>Disfruta este descuento en tu pedido y recíbelo en minutos.</Text>
            </View>
          )}
        </View>

        {/* Sticky tabs */}
        <View style={styles.tabsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabItem, active && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                  {active && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchCategoriesAndProducts}>
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : filteredSections.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="fast-food-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No hay productos en esta sección.</Text>
            </View>
          ) : (
            <>
              {activeTab === "descuentos" && (
                <Text style={styles.sectionIntroTitle}>Descuentos</Text>
              )}
              {activeTab !== "menu" && (
                <Text style={styles.sectionIntroSubtitle}>Las mejores opciones para ti</Text>
              )}
              {filteredSections.map(renderSection)}
            </>
          )}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Modals */}
      <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={40} color="#FFF" />
            </View>
            <Text style={styles.modalTitle}>¡Agregado!</Text>
            <Text style={styles.modalText}>{addedQuantity} {addedProductName} se añadió a tu pedido.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnSecondaryText}>Seguir pidiendo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate("Carrito");
                }}
              >
                <Text style={styles.btnPrimaryText}>Ir al carrito</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={ratingsModalVisible} onRequestClose={() => setRatingsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.ratingsModalContent}>
            <View style={styles.ratingHeader}>
              <Text style={styles.ratingTitle}>Opiniones</Text>
              <TouchableOpacity onPress={() => setRatingsModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color="#666" />
              </TouchableOpacity>
            </View>
            {loadingRatings ? (
              <ActivityIndicator size="large" color="#FF5A00" />
            ) : (
              <FlatList
                data={comercioPedidos}
                keyExtractor={(item) => item.id.toString()}
                ListHeaderComponent={() => (
                  <View style={styles.scoreBigContainer}>
                    <Text style={styles.scoreBig}>{rating ? parseFloat(rating).toFixed(1) : "-"}</Text>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {[...Array(5)].map((_, i) => (
                        <FontAwesome key={i} name="star" size={16} color={i < Math.round(rating) ? "#FFD700" : "#ccc"} />
                      ))}
                    </View>
                    <Text style={{ color: "#888", marginTop: 5 }}>Promedio general</Text>
                  </View>
                )}
                renderItem={({ item }) => (
                  <View style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewUser}>{item.user?.nombre_completo || "Anónimo"}</Text>
                      <Text style={styles.reviewDate}>{formatDate(item.created_at)}</Text>
                    </View>
                    <View style={{ flexDirection: "row", marginBottom: 5, gap: 3 }}>
                      {[...Array(5)].map((_, i) => (
                        <FontAwesome key={i} name="star" size={12} color={i < item.puntuacion_restaurante ? "#FFD700" : "#DDD"} />
                      ))}
                    </View>
                    {item.comentario_restaurante && <Text style={styles.reviewText}>"{item.comentario_restaurante}"</Text>}
                  </View>
                )}
                ListEmptyComponent={<Text style={{ textAlign: "center", color: "#888", marginTop: 20 }}>No hay comentarios aún.</Text>}
              />
            )}
          </View>
        </View>
      </Modal>

      <AlertaModal
        visible={alertVisible}
        tipo={alertData.type}
        mensaje={alertData.message}
        onCerrar={() => {
          setAlertVisible(false);
          if (alertData.onConfirm) alertData.onConfirm();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  heroWrap: {
    width: "100%",
    height: 220,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  heroNav: {
    position: "absolute",
    top: Platform.OS === "android" ? 44 : 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  heroNavRight: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  logoImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#FFF",
    backgroundColor: "#F2F2F2",
  },
  storeName: {
    fontSize: 22,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
    flex: 1,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E0E0E0",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Montserrat_600SemiBold",
    color: "#999",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
  },
  nearYouBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8F8F1",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  nearYouText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    color: "#00A650",
  },
  promoBanner: {
    backgroundColor: "#FFF8E1",
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
  },
  promoTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  promoDesc: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#666",
  },
  tabsWrap: {
    backgroundColor: "#FFF",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 20,
  },
  tabItem: {
    paddingVertical: 8,
    position: "relative",
  },
  tabItemActive: {},
  tabText: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    color: "#999",
  },
  tabTextActive: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_700Bold",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: "#1C1C1E",
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionIntroTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
    marginBottom: 2,
  },
  sectionIntroSubtitle: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#888",
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
    marginBottom: 12,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    marginBottom: 6,
  },
  productImgWrap: {
    width: PRODUCT_CARD_WIDTH,
    height: PRODUCT_CARD_WIDTH,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F2F2F2",
    marginBottom: 8,
    position: "relative",
  },
  productImg: {
    width: "100%",
    height: "100%",
  },
  productPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#FFD700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  discountBadgeText: {
    fontSize: 11,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#1C1C1E",
  },
  productBody: {
    paddingHorizontal: 2,
  },
  productPrice: {
    fontSize: 16,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#1C1C1E",
    marginBottom: 1,
  },
  productOriginalPrice: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#BBB",
    textDecorationLine: "line-through",
    marginBottom: 2,
  },
  productName: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    color: "#1C1C1E",
    lineHeight: 17,
  },
  serviceLabel: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FF5A00",
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#999",
  },
  errorContainer: { alignItems: "center", margin: 20 },
  errorText: { color: "#ff6b6b", fontFamily: "Montserrat_400Regular" },
  retryButton: { backgroundColor: "#FF5A00", padding: 10, borderRadius: 8, marginTop: 10 },
  retryButtonText: { color: "#FFF", fontFamily: "Montserrat_700Bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "80%", backgroundColor: "#FFF", borderRadius: 20, padding: 25, alignItems: "center" },
  successIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#FF5A00", justifyContent: "center", alignItems: "center", marginBottom: 15 },
  modalTitle: { color: "#1C1C1E", fontFamily: "Montserrat_700Bold", fontSize: 20, marginBottom: 10 },
  modalText: { color: "#666", fontFamily: "Montserrat_400Regular", textAlign: "center", marginBottom: 20 },
  modalActions: { width: "100%" },
  btnPrimary: { backgroundColor: "#FF5A00", padding: 15, borderRadius: 30, alignItems: "center", marginBottom: 10 },
  btnPrimaryText: { fontFamily: "Montserrat_700Bold", color: "#FFF" },
  btnSecondary: { padding: 10, alignItems: "center", marginBottom: 5 },
  btnSecondaryText: { fontFamily: "Montserrat_600SemiBold", color: "#666" },
  ratingsModalContent: { width: "100%", height: "70%", marginTop: "auto", backgroundColor: "#FFF", borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20 },
  ratingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  ratingTitle: { color: "#1C1C1E", fontSize: 20, fontFamily: "Montserrat_700Bold" },
  scoreBigContainer: { alignItems: "center", paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: "#E0E0E0", marginBottom: 15 },
  scoreBig: { color: "#1C1C1E", fontSize: 48, fontFamily: "Montserrat_700Bold" },
  reviewItem: { marginBottom: 15, backgroundColor: "#ECECEC", padding: 15, borderRadius: 10 },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  reviewUser: { color: "#1C1C1E", fontFamily: "Montserrat_700Bold" },
  reviewDate: { color: "#666", fontSize: 12 },
  reviewText: { color: "#555", fontStyle: "italic", marginTop: 5 },
});

export default Shop;
