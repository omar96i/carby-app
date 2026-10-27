import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { getCartBusiness, clearCart } from "../../utils/cartBusiness";
import FavoriteHeart from "../../components/FavoriteHeart";
import { BASE_URL } from "../../constants/url";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const PRODUCT_CARD_WIDTH = (width - 48) / 2;

const TABS = [
  { id: "menu", label: "Menú" },
  { id: "descuentos", label: "Descuentos" },
];

const Shop = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
    }, [navigation])
  );

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ title: "", message: "", type: "info", onConfirm: null, primaryLabel: "" });
  const showAlert = (title, message, type, onConfirm, primaryLabel) => {
    setAlertData({ title, message, type: type || (title === "Éxito" ? "success" : "error"), onConfirm, primaryLabel: primaryLabel || "Aceptar" });
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
  const [tiendaActiva, setTiendaActiva] = useState(null);
  const [distanciaTienda, setDistanciaTienda] = useState(null);
  const [comercioPedidos, setComercioPedidos] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(false);

  const [ratingsModalVisible, setRatingsModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [addedProductName, setAddedProductName] = useState("");
  const [addedQuantity, setAddedQuantity] = useState(1);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [pastHero, setPastHero] = useState(false);
  const tabsY = useRef(0);
  const [activeCat, setActiveCat] = useState(null);
  const scrollRef = useRef(null);
  const chipsRef = useRef(null);
  const tabsH = useRef(0);
  const contentY = useRef(0);
  const sectionYs = useRef({});
  const chipXs = useRef({});
  const bloqueoChip = useRef(0);

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
        if (userData.tienda_estado !== undefined && userData.tienda_estado !== null) {
          setTiendaActiva(userData.tienda_estado === "activo" || userData.tienda_estado === 1 || userData.tienda_estado === true);
        }
        const loc = userData.user_location || userData.userLocation || null;
        if (loc && loc.latitud && loc.longitud) {
          try {
            const guardada = await AsyncStorage.getItem("userLocation");
            const yo = guardada ? JSON.parse(guardada) : null;
            if (yo?.latitude && yo?.longitude) {
              const rad = (g) => (g * Math.PI) / 180;
              const lat2 = parseFloat(loc.latitud);
              const lng2 = parseFloat(loc.longitud);
              const dLat = rad(lat2 - yo.latitude);
              const dLng = rad(lng2 - yo.longitude);
              const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(yo.latitude)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
              const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              setDistanciaTienda(km < 1 ? `A ${Math.round(km * 1000)} m` : `A ${km.toFixed(1)} km`);
            }
          } catch (e) {}
        }
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

  const addToCart = async (product, confirmed = false) => {
    try {
      if (!confirmed) {
        const { establishmentId: biz, establishmentName: name } = await getCartBusiness();
        if (biz && String(biz) !== String(establishmentId)) {
          showAlert(
            "Carrito de otro negocio",
            `Tu carrito es de ${name || "otro negocio"}. ¿Vaciarlo y agregar este producto?`,
            "confirm",
            async () => { await clearCart(); addToCart(product, true); },
            "Sí, vaciar"
          );
          return;
        }
      }
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
              <Ionicons name="image-outline" size={28} color={C.placeholder} />
            </View>
          )}
          {pctDescuento > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>-{pctDescuento}%</Text>
            </View>
          )}
          <View style={styles.heartPos}>
            <FavoriteHeart productId={product.id} size={16} />
          </View>
        </View>
        <View style={styles.productBody}>
          <Text style={styles.productName} numberOfLines={2}>{product.nombre}</Text>
          <View style={styles.priceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productPrice}>{formatPrice(precioFinal)}</Text>
              {descuento > 0 && <Text style={styles.productOriginalPrice}>{formatPrice(precioOriginal)}</Text>}
            </View>
            <View style={styles.addCircle}>
              <Ionicons name="add" size={18} color={C.surface} />
            </View>
          </View>
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
              <Ionicons name="image-outline" size={28} color={C.placeholder} />
            </View>
          )}
          {pctDescuento > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>-{pctDescuento}%</Text>
            </View>
          )}
          <View style={styles.heartPos}>
            <FavoriteHeart kind="servicio" productId={servicio.id} size={16} />
          </View>
        </View>
        <View style={styles.productBody}>
          <Text style={styles.productName} numberOfLines={2}>{servicio.nombre}</Text>
          <Text style={styles.serviceLabel}>Servicio</Text>
          <View style={styles.priceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productPrice}>{formatPrice(precioFinal)}</Text>
              {descuento > 0 && <Text style={styles.productOriginalPrice}>{formatPrice(precioOriginal)}</Text>}
            </View>
            <View style={styles.addCircle}>
              <Ionicons name="add" size={18} color={C.surface} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (category) => {
    const productos = category.productos || [];
    const servicios = category.servicios || [];
    return (
      <View
        key={category.id.toString()}
        style={styles.section}
        onLayout={(e) => { sectionYs.current[category.id] = e.nativeEvent.layout.y; }}
      >
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
        <ActivityIndicator size="large" color={C.brand} />
      </View>
    );
  }

  const heroImage = isSede && imagenSede ? getImageUrl(imagenSede) : profilePhoto;
  const onScrollTienda = (e) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const y = contentOffset.y;
    const fijas = tabsY.current > 0 && y >= tabsY.current - 1;
    if (fijas !== pastHero) setPastHero(fijas);

    if (Date.now() < bloqueoChip.current || filteredSections.length === 0) return;
    let actual = filteredSections[0].id;
    const alFinal = y + layoutMeasurement.height >= contentSize.height - 2;
    filteredSections.forEach((cat) => {
      const sy = sectionYs.current[cat.id];
      if (sy !== undefined && contentY.current + sy - tabsH.current - 2 <= y) actual = cat.id;
    });
    if (alFinal) actual = filteredSections[filteredSections.length - 1].id;
    if (actual !== activeCat) marcarCategoria(actual);
  };

  const marcarCategoria = (id) => {
    setActiveCat(id);
    const x = chipXs.current[id];
    if (x !== undefined) chipsRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
  };

  const irACategoria = (id) => {
    const sy = sectionYs.current[id];
    if (sy === undefined) return;
    bloqueoChip.current = Date.now() + 700;
    marcarCategoria(id);
    scrollRef.current?.scrollTo({ y: contentY.current + sy - tabsH.current, animated: true });
  };

  const catSeleccionada = filteredSections.some((c) => c.id === activeCat) ? activeCat : filteredSections[0]?.id;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={pastHero ? "dark-content" : "light-content"} translucent backgroundColor="transparent" />

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} stickyHeaderIndices={[2]} onScroll={onScrollTienda} scrollEventThrottle={32} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        {/* Hero */}
        <View style={styles.heroWrap}>
          <Image
            source={heroImage ? { uri: heroImage } : require("../../assets/images/imagen.jpg")}
            style={styles.heroImage}
          />
          <LinearGradient colors={["rgba(0,0,0,0.25)", "rgba(0,0,0,0)", "rgba(255,255,255,0)", C.surface]} locations={[0, 0.35, 0.6, 1]} style={styles.heroOverlay} pointerEvents="none" />
          <View style={[styles.heroNav, { top: insets.top + 8 }]}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="close" size={22} color={C.ink} />
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
            <Text style={styles.storeName} numberOfLines={2}>{establishmentDisplayName || "Comercio"}</Text>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name="location" size={16} color={tiendaActiva === false ? C.muted : C.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>{distanciaTienda || "Cerca de ti"}</Text>
                <Text style={[styles.statValue, { color: tiendaActiva === false ? C.muted : C.green }]}>
                  {tiendaActiva === false ? "Cerrado" : "¡Abierto!"}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.statItem} onPress={() => setRatingsModalVisible(true)} activeOpacity={0.8}>
              <View style={styles.statIcon}>
                <Ionicons name="star" size={16} color="#EAB308" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Calificación</Text>
                <Text style={styles.statValue}>{rating ? parseFloat(rating).toFixed(1) : "0.0"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.placeholder} />
            </TouchableOpacity>
          </View>

          {maxDiscount > 0 && (
            <View style={styles.promoBanner}>
              <View style={styles.promoIcon}>
                <Ionicons name="pricetag" size={18} color={C.surface} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.promoTitle}>Hasta {maxDiscount}% OFF imperdible</Text>
                <Text style={styles.promoDesc}>Disfruta este descuento en tu pedido y recíbelo en minutos.</Text>
              </View>
            </View>
          )}
        </View>

        <View
          style={[styles.tabsWrap, { paddingTop: insets.top + 10, marginTop: -insets.top }, pastHero && styles.tabsWrapFijas]}
          onLayout={(e) => { tabsY.current = e.nativeEvent.layout.y; tabsH.current = e.nativeEvent.layout.height; }}
          pointerEvents="box-none"
        >
          <View style={styles.tabsTrack}>
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
                </TouchableOpacity>
              );
            })}
          </View>

          {!error && filteredSections.length > 0 && (
            <ScrollView
              ref={chipsRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsContent}
            >
              {filteredSections.map((cat) => {
                const activa = catSeleccionada === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id.toString()}
                    style={[styles.chip, activa && styles.chipActiva]}
                    onPress={() => irACategoria(cat.id)}
                    onLayout={(e) => { chipXs.current[cat.id] = e.nativeEvent.layout.x; }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, activa && styles.chipTextActiva]}>{cat.nombre}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Content */}
        <View style={styles.content} onLayout={(e) => { contentY.current = e.nativeEvent.layout.y; }}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchCategoriesAndProducts}>
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : filteredSections.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name={activeTab === "descuentos" ? "pricetag-outline" : "fast-food-outline"} size={26} color={C.brand} />
              </View>
              <Text style={styles.emptyText}>No hay productos en esta sección.</Text>
            </View>
          ) : (
            <>
              {activeTab === "descuentos" && (
                <View style={styles.sectionIntro}>
                  <View style={styles.sectionIntroIcon}>
                    <Ionicons name="pricetag" size={16} color={C.surface} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionIntroTitle}>Descuentos</Text>
                    <Text style={styles.sectionIntroSubtitle}>Las mejores opciones para ti</Text>
                  </View>
                </View>
              )}
              {filteredSections.map(renderSection)}
            </>
          )}
          <View style={{ height: Math.max(insets.bottom, 12) + 28 }} />
        </View>
      </ScrollView>

      {/* Modals */}
      <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={36} color={C.surface} />
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
                <Ionicons name="close-circle" size={30} color={C.placeholder} />
              </TouchableOpacity>
            </View>
            {loadingRatings ? (
              <ActivityIndicator size="large" color={C.brand} />
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
        onCerrar={() => setAlertVisible(false)}
        onPrimary={alertData.onConfirm}
        primaryLabel={alertData.primaryLabel}
      />
    </View>
  );
};

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", edge: "#E4E4E7", iconBg: "#FFF0E5", green: "#10B981", placeholder: "#A1A1AA" };
const BOTON_ELEVADO = { shadowColor: "#fa6205", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.surface },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.surface },

  heroWrap: { width: "100%", height: 200, position: "relative", backgroundColor: C.bg },
  heroImage: { width: "100%", height: "100%", resizeMode: "cover" },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroNav: { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16 },
  heroNavRight: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: C.surface, justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },

  infoHeader: { paddingHorizontal: 16, marginTop: -40, paddingBottom: 14 },
  logoRow: { flexDirection: "row", alignItems: "flex-end", gap: 12, marginBottom: 14 },
  logoImg: {
    width: 72, height: 72, borderRadius: 20, borderWidth: 3, borderColor: C.surface, backgroundColor: C.bg,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  storeName: { flex: 1, fontSize: 21, lineHeight: 25, fontFamily: "Montserrat_800ExtraBold", color: C.ink, paddingBottom: 4 },

  statsCard: { flexDirection: "row", gap: 10 },
  statItem: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.bg,
    borderRadius: 18, paddingVertical: 10, paddingHorizontal: 10,
  },
  statIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  statDivider: { width: 0 },
  statLabel: { fontSize: 11.5, fontFamily: "Montserrat_600SemiBold", color: C.muted },
  statRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statValue: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: C.ink, marginTop: 1 },
  nearYouBadge: { flexDirection: "row", alignItems: "center", gap: 8 },
  nearYouText: { flex: 1, fontSize: 14, fontFamily: "Montserrat_700Bold", color: C.green },

  promoBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.iconBg, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 10, marginTop: 10 },
  promoIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },
  promoTitle: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: C.ink, marginBottom: 1 },
  promoDesc: { fontSize: 12, lineHeight: 17, fontFamily: "Montserrat_400Regular", color: C.muted },

  tabsWrap: { backgroundColor: "transparent", paddingBottom: 12, paddingHorizontal: 16 },
  tabsWrapFijas: { backgroundColor: C.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.edge },
  tabsTrack: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 999, padding: 4 },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 999 },
  tabItemActive: {
    backgroundColor: C.surface,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  tabText: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: C.muted },
  tabTextActive: { color: C.ink, fontFamily: "Montserrat_800ExtraBold" },
  tabIndicator: { height: 0 },
  chipsScroll: { marginTop: 10, marginHorizontal: -16 },
  chipsContent: { paddingHorizontal: 16, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: C.bg },
  chipActiva: { backgroundColor: C.ink },
  chipText: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: C.muted },
  chipTextActiva: { color: C.surface },

  content: { paddingHorizontal: 16, paddingTop: 4, backgroundColor: C.surface, flexGrow: 1 },
  sectionIntro: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  sectionIntroIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },
  sectionIntroTitle: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  sectionIntroSubtitle: { fontSize: 12.5, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 1 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: C.ink, marginBottom: 12 },
  productsGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 14 },

  productCard: {
    width: PRODUCT_CARD_WIDTH, backgroundColor: C.surface, borderRadius: 22, padding: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 3,
  },
  productImgWrap: {
    width: PRODUCT_CARD_WIDTH - 12, height: PRODUCT_CARD_WIDTH - 12, borderRadius: 18, overflow: "hidden",
    backgroundColor: C.bg, position: "relative",
  },
  productImg: { width: "100%", height: "100%" },
  productPlaceholder: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
  discountBadge: { position: "absolute", top: 8, left: 8, backgroundColor: C.brand, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  discountBadgeText: { fontSize: 11, fontFamily: "Montserrat_800ExtraBold", color: C.surface },
  heartPos: { position: "absolute", top: 8, right: 8, zIndex: 2 },
  productBody: { paddingHorizontal: 6, paddingTop: 10, paddingBottom: 4 },
  productName: { fontSize: 13.5, fontFamily: "Montserrat_700Bold", color: C.ink, lineHeight: 18, minHeight: 36 },
  priceRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  productPrice: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: C.brand },
  productOriginalPrice: { fontSize: 11.5, fontFamily: "Montserrat_400Regular", color: C.placeholder, textDecorationLine: "line-through" },
  addCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.brand, alignItems: "center", justifyContent: "center", ...BOTON_ELEVADO, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  serviceLabel: { fontSize: 11, fontFamily: "Montserrat_700Bold", color: C.brand, marginTop: 2 },

  emptyWrap: { alignItems: "center", gap: 12, paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.iconBg, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: C.muted },
  errorContainer: { alignItems: "center", margin: 20 },
  errorText: { color: "#EF4444", fontFamily: "Montserrat_400Regular" },
  retryButton: { backgroundColor: C.brand, paddingHorizontal: 22, height: 46, justifyContent: "center", borderRadius: 999, marginTop: 12, ...BOTON_ELEVADO },
  retryButtonText: { color: C.surface, fontFamily: "Montserrat_700Bold" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "84%", backgroundColor: C.surface, borderRadius: 28, padding: 24, alignItems: "center" },
  successIconCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: C.brand, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  modalTitle: { color: C.ink, fontFamily: "Montserrat_800ExtraBold", fontSize: 20, marginBottom: 6 },
  modalText: { color: C.muted, fontFamily: "Montserrat_400Regular", textAlign: "center", marginBottom: 20 },
  modalActions: { width: "100%", gap: 10 },
  btnPrimary: { backgroundColor: C.brand, height: 52, borderRadius: 999, alignItems: "center", justifyContent: "center", ...BOTON_ELEVADO },
  btnPrimaryText: { fontFamily: "Montserrat_700Bold", color: C.surface, fontSize: 15 },
  btnSecondary: { height: 50, borderRadius: 999, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  btnSecondaryText: { fontFamily: "Montserrat_700Bold", color: C.ink, fontSize: 15 },
  ratingsModalContent: { width: "100%", height: "70%", marginTop: "auto", backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  ratingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  ratingTitle: { color: C.ink, fontSize: 20, fontFamily: "Montserrat_800ExtraBold" },
  scoreBigContainer: { alignItems: "center", paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.edge, marginBottom: 14 },
  scoreBig: { color: C.ink, fontSize: 46, fontFamily: "Montserrat_800ExtraBold" },
  reviewItem: { marginBottom: 12, backgroundColor: C.bg, padding: 14, borderRadius: 18 },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  reviewUser: { color: C.ink, fontFamily: "Montserrat_700Bold" },
  reviewDate: { color: C.muted, fontSize: 12, fontFamily: "Montserrat_400Regular" },
  reviewText: { color: C.muted, fontStyle: "italic", marginTop: 5, fontFamily: "Montserrat_400Regular" },
});

export default Shop;
