import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  FlatList,
  Dimensions,
  Platform,
  StatusBar
} from "react-native";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_600SemiBold,
  Montserrat_300Light,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import Ionicons from "react-native-vector-icons/Ionicons";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { BASE_URL } from "../../constants/url";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.55;

const Shop = () => {
  const route = useRoute();
  const navigation = useNavigation();
  
  const {
    establishmentId,
    establishmentName,
    subcategories: initialSubcategories,
    userId,
    promedio_puntuacion_restaurante,
    isSede = false,
    sedeId = null,
    sedeLocation = null,
    imagenSede = null // Recibimos la ruta relativa (ej: "sedes-iconos/foto.png")
  } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [fetchedSubcategories, setFetchedSubcategories] = useState([]);
  const [fetchedServicios, setFetchedServicios] = useState([]);
  const [error, setError] = useState(null);
  
  const [establishmentDisplayName] = useState(establishmentName);
  const [rating, setRating] = useState(promedio_puntuacion_restaurante);
  const [comercioPedidos, setComercioPedidos] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(false);

  // Estados para modales
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
  });

  // Función para construir la URL completa
  const getImageUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith("http")) return photoPath;
    // Construimos la URL completa agregando el dominio y 'storage'
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
        
        // Foto del perfil del dueño (Usuario Padre)
        if (userData.foto_documento_file) {
          // Usamos getImageUrl para consistencia
          setProfilePhoto(getImageUrl(userData.foto_documento_file));
        }
        
        if (userData.comercio_pedidos) {
            const pedidosConCalificacion = userData.comercio_pedidos.filter((pedido) => pedido.puntuacion_restaurante !== null);
            setComercioPedidos(pedidosConCalificacion);
        }
      }
    } catch (error) { console.error("🔴 Error fetching ratings:", error); } finally { setLoadingRatings(false); }
  };

  const fetchCategoriesAndProducts = async () => {
    try {
      if (!userId) { setLoading(false); setError("No userId"); return; }
      const token = await AsyncStorage.getItem("userToken");
      if (!token) { setLoading(false); setError("No token"); return; }
      
      const response = await fetch(`${BASE_URL}usuario/get-categorias/${userId}`, {
        method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error(`Error ${response.status}`);
      const responseData = await response.json();
      
      if (responseData?.data?.categorias) {
        setFetchedSubcategories(responseData.data.categorias);
      } else { setFetchedSubcategories([]); }
    } catch (error) { console.error("🔴 Error", error); setError("Error al cargar"); } finally { setLoading(false); }
  };

  const fetchServicios = async () => {
    try {
      if (!userId) return;
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;
      const response = await fetch(`${BASE_URL}user-servicio/by-user/${userId}`, {
        method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setFetchedServicios(data.data || []);
    } catch (error) { console.error("Error servicios", error); setFetchedServicios([]); }
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
      fetchedServicios.forEach(servicio => {
        const catId = servicio.category_id || servicio.categoria_id;
        if (!catId) return;
        if (!serviciosPorCategoria[catId]) serviciosPorCategoria[catId] = [];
        serviciosPorCategoria[catId].push(servicio);
      });
      base = base.map(cat => {
        const catId = cat.id || cat.category_id || cat.categoria_id;
        return { ...cat, servicios: serviciosPorCategoria[catId] || cat.servicios || [] };
      });
    }

    base = base.map(cat => {
      const filteredProducts = (cat.productos || []).filter(prod => {
        const prodSedeId = prod.user_sede_id; 
        const targetSedeId = sedeId;

        if (isSede) {
          return prodSedeId != null && String(prodSedeId) === String(targetSedeId);
        } else {
          return !prodSedeId; 
        }
      });

      const filteredServices = (cat.servicios || []).filter(serv => {
        const servSedeId = serv.user_sede_id;
        const targetSedeId = sedeId;

        if (isSede) {
          return servSedeId != null && String(servSedeId) === String(targetSedeId);
        } else {
          return !servSedeId;
        }
      });

      return { ...cat, productos: filteredProducts, servicios: filteredServices };
    });

    return base;
  }, [fetchedSubcategories, initialSubcategories, fetchedServicios, isSede, sedeId]);

  if (!fontsLoaded || loading) {
    return ( <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#fa6205" /></View> );
  }

  const addToCart = async (product) => {
    try {
      const quantity = 1;
      const pricePerUnit = product?.precio ? parseFloat(product.precio) : 0;
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
    } catch (error) { console.error("Error cart:", error); Alert.alert("Error", "No se pudo agregar"); }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const StarRating = ({ rating, onPress }) => {
    const totalStars = 5;
    const hasRating = rating !== null && rating !== undefined;
    return (
      <TouchableOpacity style={styles.ratingBadge} onPress={onPress}>
        <FontAwesome name="star" size={14} color="#000" style={{marginRight: 4}} />
        <Text style={styles.ratingBadgeText}>
          {hasRating ? parseFloat(rating).toFixed(1) : "N/A"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
      
      <ScrollView stickyHeaderIndices={[0]} showsVerticalScrollIndicator={false}>
        
        <View style={{zIndex: 10}}> 
           <View style={styles.topNav}>
                <TouchableOpacity style={styles.backButtonCircle} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
                </TouchableOpacity>
            </View>
        </View>

        {/* 1. Hero Content */}
        <View style={styles.heroContainer}>
            <View style={styles.heroContent}>
                <View style={styles.heroHeaderRow}>
                    <View style={styles.avatarContainer}>
                          {/* CORRECCIÓN AQUI: Usamos getImageUrl para procesar la ruta relativa de imagenSede */}
                          <Image
                            source={{ 
                                uri: isSede && imagenSede 
                                    ? getImageUrl(imagenSede) 
                                    : profilePhoto 
                            }}
                            style={styles.heroAvatar}
                            defaultSource={require("../../assets/images/imagen.jpg")}
                        />
                    </View>
                    <View style={styles.heroInfo}>
                        <Text style={styles.heroTitle} numberOfLines={2}>
                          {establishmentDisplayName || "Comercio"}
                        </Text>
                        
                        {isSede && sedeLocation && (
                          <Text style={styles.heroSubtitle}>
                            <Ionicons name="location-outline" size={12} color="#fa6205" /> {sedeLocation}
                          </Text>
                        )}

                        <View style={styles.heroMetaRow}>
                            <StarRating rating={rating} onPress={() => setRatingsModalVisible(true)} />
                            <View style={styles.deliveryBadge}>
                                <Ionicons name="time-outline" size={14} color="#ccc" style={{marginRight: 4}} />
                                <Text style={styles.deliveryText}>20-30 min</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </View>

        {/* 2. Contenido (Productos y Servicios) */}
        <View style={styles.contentContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchCategoriesAndProducts}>
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          {subcategories &&
            subcategories
              .filter(
                (category) =>
                  (category.productos && category.productos.length > 0) ||
                  (category.servicios && category.servicios.length > 0)
              )
              .map((category) => (
                <View key={category.id.toString()} style={styles.section}>
                  <Text style={styles.sectionTitle}>{category.nombre}</Text>

                  {/* Productos */}
                  {category.productos && category.productos.length > 0 && (
                    <FlatList
                      data={category.productos.filter((p) => !!p.activo)}
                      keyExtractor={(item) => item.id.toString()}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.cardsScrollContent}
                      decelerationRate="fast"
                      snapToInterval={CARD_WIDTH + 15}
                      renderItem={({ item: product }) => (
                        <TouchableOpacity
                          activeOpacity={0.9}
                          style={styles.cardContainer}
                          onPress={() => navigation.navigate("Producto", { product, establishmentId, establishmentName: establishmentDisplayName })}
                        >
                          <View style={styles.cardImageWrapper}>
                            <Image
                              source={product.foto && getImageUrl(product.foto) ? { uri: getImageUrl(product.foto) } : require("../../assets/images/imagen.jpg")}
                              style={styles.cardImage}
                              resizeMode="cover"
                            />
                             <TouchableOpacity style={styles.fabAddButton} onPress={() => addToCart(product)}>
                                <Ionicons name="add" size={24} color="#000" />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.cardBody}>
                            <View style={styles.priceRow}>
                                <Text style={styles.cardPrice}>
                                    {"$"}
                                    {product.precio || "0"}
                                </Text>
                            </View>
                            <Text style={styles.cardTitle} numberOfLines={2}>{product.nombre}</Text>
                            <Text style={styles.cardDescription} numberOfLines={2}>
                                {product.descripcion || "Sin descripción disponible"}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                  )}

                  {/* Servicios */}
                  {category.servicios && category.servicios.length > 0 && (
                    <>
                       <Text style={styles.subSectionTitle}>Servicios</Text>
                       <FlatList
                        data={category.servicios}
                        keyExtractor={(item) => item.id.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.cardsScrollContent}
                        renderItem={({ item: servicio }) => (
                            <TouchableOpacity
                            activeOpacity={0.9}
                            style={styles.cardContainer}
                            onPress={() => navigation.navigate("ServicioDetalle", { servicio, establishmentId, establishmentName: establishmentDisplayName })}
                            >
                            <View style={styles.cardImageWrapper}>
                                <Image
                                source={servicio.foto && getImageUrl(servicio.foto) ? { uri: getImageUrl(servicio.foto) } : require("../../assets/images/imagen.jpg")}
                                style={styles.cardImage}
                                resizeMode="cover"
                                />
                                <View style={styles.serviceBadge}>
                                    <Ionicons name="eye" size={16} color="#000" />
                                </View>
                            </View>

                            <View style={styles.cardBody}>
                                <Text style={styles.cardPrice}>
                                    {"$"}
                                    {servicio.precio || "0"}
                                </Text>
                                <Text style={styles.cardTitle} numberOfLines={2}>{servicio.nombre}</Text>
                                <Text style={styles.cardDescription}>Servicio disponible</Text>
                            </View>
                            </TouchableOpacity>
                        )}
                        />
                    </>
                  )}
                </View>
              ))}
            
             {(!subcategories || subcategories.filter(c => c.productos?.length > 0 || c.servicios?.length > 0).length === 0) && (
                <View style={styles.emptyContainer}>
                    <Ionicons name="fast-food-outline" size={60} color="#333" />
                    <Text style={styles.emptyText}>
                      {isSede ? "No hay productos en esta sede." : "No hay productos en el área general."}
                    </Text>
                </View>
            )}

            <View style={{height: 100}} /> 
        </View>
      </ScrollView>

      {/* --- MODALES --- */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={40} color="#000" />
            </View>
            <Text style={styles.modalTitle}>¡Agregado!</Text>
            <Text style={styles.modalText}>{addedQuantity} {addedProductName} se añadió a tu pedido.</Text>
            <View style={styles.modalActions}>
                <TouchableOpacity style={styles.btnSecondary} onPress={() => setModalVisible(false)}>
                    <Text style={styles.btnSecondaryText}>Seguir pidiendo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={() => { setModalVisible(false); navigation.navigate("Carrito"); }}>
                    <Text style={styles.btnPrimaryText}>Ir al carrito</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={ratingsModalVisible} onRequestClose={() => setRatingsModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.ratingsModalContent}>
                <View style={styles.ratingHeader}>
                    <Text style={styles.ratingTitle}>Opiniones</Text>
                    <TouchableOpacity onPress={() => setRatingsModalVisible(false)}>
                        <Ionicons name="close-circle" size={30} color="#666" />
                    </TouchableOpacity>
                </View>
                {loadingRatings ? <ActivityIndicator size="large" color="#fa6205" /> : (
                    <FlatList 
                        data={comercioPedidos}
                        keyExtractor={(item) => item.id.toString()}
                        ListHeaderComponent={() => (
                            <View style={styles.scoreBigContainer}>
                                <Text style={styles.scoreBig}>{rating ? parseFloat(rating).toFixed(1) : "-"}</Text>
                                <View style={{flexDirection:'row'}}>{[...Array(5)].map((_,i)=><FontAwesome key={i} name="star" size={16} color={i<Math.round(rating)?"#FFD700":"#ccc"} />)}</View>
                                <Text style={{color:'#888', marginTop:5}}>Promedio general</Text>
                            </View>
                        )}
                        renderItem={({item}) => (
                            <View style={styles.reviewItem}>
                                <View style={styles.reviewHeader}>
                                    <Text style={styles.reviewUser}>{item.user?.nombre_completo || "Anónimo"}</Text>
                                    <Text style={styles.reviewDate}>{formatDate(item.created_at)}</Text>
                                </View>
                                <View style={{flexDirection:'row', marginBottom:5}}>{[...Array(5)].map((_,i)=><FontAwesome key={i} name="star" size={12} color={i<item.puntuacion_restaurante?"#FFD700":"#DDD"} />)}</View>
                                {item.comentario_restaurante && <Text style={styles.reviewText}>"{item.comentario_restaurante}"</Text>}
                            </View>
                        )}
                        ListEmptyComponent={<Text style={{textAlign:'center', color:'#888', marginTop:20}}>No hay comentarios aún.</Text>}
                    />
                )}
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
  heroContainer: {
    paddingBottom: 20,
    backgroundColor: '#F2F2F7',
    marginTop: -50,
    paddingTop: 50
  },
  topNav: {
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    marginBottom: 10,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    paddingHorizontal: 20,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#fa6205',
  },
  heroInfo: {
    flex: 1,
    marginLeft: 15,
  },
  heroTitle: {
    color: '#1C1C1E',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
    lineHeight: 26,
    marginBottom: 4,
  },
  heroSubtitle: {
    color: '#ddd',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    marginBottom: 8,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fa6205',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  ratingBadgeText: {
    color: '#000',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    color: '#ccc',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
  },
  contentContainer: {
    paddingTop: 10,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    color: '#1C1C1E',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
    marginLeft: 15,
    marginBottom: 15,
  },
  subSectionTitle: {
    color: '#fa6205',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    marginLeft: 15,
    marginTop: 10,
    marginBottom: 10,
  },
  cardsScrollContent: {
    paddingLeft: 15,
    paddingRight: 5,
  },
  cardContainer: {
    width: CARD_WIDTH,
    backgroundColor: '#ECECEC',
    borderRadius: 16,
    marginRight: 15,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  cardImageWrapper: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  fabAddButton: {
    position: 'absolute',
    bottom: -18,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fa6205',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 10,
  },
  serviceBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 6,
    borderRadius: 20,
  },
  cardBody: {
    paddingTop: 20,
    paddingHorizontal: 12,
    paddingBottom: 15,
  },
  priceRow: {
    marginBottom: 4,
  },
  cardPrice: {
    color: '#fa6205',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
  cardTitle: {
    color: '#1C1C1E',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 18,
    minHeight: 36,
  },
  cardDescription: {
    color: '#999',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    lineHeight: 14,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, opacity: 0.5 },
  emptyText: { color: '#1C1C1E', fontFamily: 'Montserrat_400Regular', marginTop: 10 },
  errorContainer: { alignItems: 'center', margin: 20 },
  errorText: { color: '#ff6b6b', fontFamily: 'Montserrat_400Regular' },
  retryButton: { backgroundColor: '#fa6205', padding: 8, borderRadius: 5, marginTop: 10 },
  retryButtonText: { fontFamily: 'Montserrat_700Bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#ECECEC', borderRadius: 20, padding: 25, alignItems: 'center' },
  successIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fa6205', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  modalTitle: { color: '#1C1C1E', fontFamily: 'Montserrat_700Bold', fontSize: 20, marginBottom: 10 },
  modalText: { color: '#ccc', fontFamily: 'Montserrat_400Regular', textAlign: 'center', marginBottom: 20 },
  modalActions: { width: '100%' },
  btnPrimary: { backgroundColor: '#fa6205', padding: 15, borderRadius: 30, alignItems: 'center', marginBottom: 10 },
  btnPrimaryText: { fontFamily: 'Montserrat_700Bold', color: '#000' },
  btnSecondary: { padding: 10, alignItems: 'center', marginBottom: 5 },
  btnSecondaryText: { fontFamily: 'Montserrat_600SemiBold', color: '#1C1C1E' },
  ratingsModalContent: { width: '100%', height: '70%', marginTop: 'auto', backgroundColor: '#222', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20 },
  ratingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  ratingTitle: { color: '#1C1C1E', fontSize: 20, fontFamily: 'Montserrat_700Bold' },
  scoreBigContainer: { alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#333', marginBottom: 15 },
  scoreBig: { color: '#1C1C1E', fontSize: 48, fontFamily: 'Montserrat_700Bold' },
  reviewItem: { marginBottom: 15, backgroundColor: '#ECECEC', padding: 15, borderRadius: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  reviewUser: { color: '#1C1C1E', fontFamily: 'Montserrat_700Bold' },
  reviewDate: { color: '#666', fontSize: 12 },
  reviewText: { color: '#ccc', fontStyle: 'italic', marginTop: 5 },
});

export default Shop;