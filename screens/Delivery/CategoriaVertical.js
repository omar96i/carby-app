import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_600SemiBold,
  Montserrat_800ExtraBold,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";

import { BASE_URL } from "../../constants/url";

const { width } = Dimensions.get("window");
const ITEM_IMG_SIZE = 120;

export default function CategoriaVertical() {
  const route = useRoute();
  const tipo = (route.params?.tipo || "productos").toLowerCase().trim();
  const esServicios = tipo === "servicios";

  const [categorias, setCategorias] = useState([]);
  const [comercios, setComercios] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
    }, [navigation])
  );

  const [refreshing, setRefreshing] = useState(false);
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const startBounce = () => {
    bounceAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -12, duration: 400, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopBounce = () => {
    bounceAnim.setValue(0);
    bounceAnim.stopAnimation();
  };

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_600SemiBold,
    Montserrat_800ExtraBold,
  });

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${BASE_URL.toString().replace("/api", "")}/storage/${path}`;
  };

  const getStoredLocation = async () => {
    try {
      const saved = await AsyncStorage.getItem("userLocation");
      if (saved) {
        const parsed = JSON.parse(saved);
        setLocation(parsed);
        return parsed;
      }
    } catch (error) {
      console.error("Error leyendo ubicación:", error);
    }
    return null;
  };

  const fetchCategorias = async (loc) => {
    try {
      const endpoint = esServicios ? "servicios/categorias" : "comercios/categorias";
      const url = `${BASE_URL}${endpoint}?lat=${loc.latitude}&lng=${loc.longitude}&radio=20`;
      const response = await fetch(url, {
        headers: { Accept: "application/json", "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.status && Array.isArray(data.data)) {
        setCategorias(data.data);
      }
    } catch (error) {
      console.error("Error categorías:", error);
    }
  };

  const fetchComercios = async (loc, categoriaId) => {
    try {
      const endpoint = esServicios ? "servicios/home" : "comercios/home";
      let url = `${BASE_URL}${endpoint}?lat=${loc.latitude}&lng=${loc.longitude}&radio=20`;
      if (categoriaId) url += `&global_categoria_id=${categoriaId}`;

      const response = await fetch(url, {
        headers: { Accept: "application/json", "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.status && Array.isArray(data.data)) {
        setComercios(data.data);
      }
    } catch (error) {
      console.error("Error comercios:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    const loc = await getStoredLocation();
    if (loc) {
      await Promise.all([fetchCategorias(loc), fetchComercios(loc)]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onSelectCategoria = async (cat) => {
    const nueva = categoriaSeleccionada?.id === cat.id ? null : cat;
    setCategoriaSeleccionada(nueva);
    if (location) {
      setRefreshing(true);
      startBounce();
      await fetchComercios(location, nueva?.id);
      stopBounce();
      setRefreshing(false);
    }
  };

  const navigateToShop = (comercio) => {
    navigation.navigate("Shop", {
      establishmentId: comercio.id,
      userId: comercio.id,
      establishmentName: comercio.establecimiento_nombre,
    });
  };

  const navigateToService = (servicio, comercio) => {
    navigation.navigate("ServicioDetalle", {
      servicio,
      establishmentId: comercio.id,
      establishmentName: comercio.establecimiento_nombre,
    });
  };

  const formatPrice = (price) => {
    return `$${Number(price).toLocaleString("es-CO")}`;
  };

  const renderCategoriaItem = (cat) => {
    const seleccionada = categoriaSeleccionada?.id === cat.id;
    return (
      <TouchableOpacity
        key={cat.id}
        style={[styles.catItem, seleccionada && styles.catItemSelected]}
        activeOpacity={0.85}
        onPress={() => onSelectCategoria(cat)}
      >
        <View style={[styles.catIconWrap, seleccionada && styles.catIconWrapSelected]}>
          {cat.icono ? (
            <Image source={{ uri: getImageUrl(cat.icono) }} style={styles.catIcon} />
          ) : (
            <Ionicons name={esServicios ? "cut-outline" : "restaurant-outline"} size={28} color="#FF5A00" />
          )}
        </View>
        <Text style={[styles.catName, seleccionada && styles.catNameSelected]}>
          {cat.nombre}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = (item, comercio) => {
    const imageUrl = item.foto ? getImageUrl(item.foto) : null;
    const precioOriginal = Number(item.precio) || 0;
    const descuento = item.activo_descuento ? Number(item.descuento) || 0 : 0;
    const precioFinal = precioOriginal - descuento;

    const esServicio = esServicios;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.itemCard}
        activeOpacity={0.9}
        onPress={() =>
          esServicio ? navigateToService(item, comercio) : navigateToShop(comercio)
        }
      >
        <View style={styles.itemImgWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.itemImg} />
          ) : (
            <View style={styles.itemPlaceholder}>
              <Ionicons name={esServicio ? "cut-outline" : "image-outline"} size={28} color="#CCC" />
            </View>
          )}
        </View>
        <Text style={styles.itemName} numberOfLines={1}>{item.nombre}</Text>
        <Text style={styles.itemPrice}>{formatPrice(precioFinal)}</Text>
        {descuento > 0 && (
          <Text style={styles.itemOriginalPrice}>{formatPrice(precioOriginal)}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderComercio = (comercio) => {
    const items = esServicios ? (comercio.servicios || []) : (comercio.productos || []);
    if (items.length === 0) return null;

    return (
      <View key={comercio.id} style={styles.comercioSection}>
        <View style={styles.comercioHeader}>
          <Text style={styles.comercioName} numberOfLines={1}>{comercio.establecimiento_nombre}</Text>
          <TouchableOpacity
            style={styles.verMasBtn}
            activeOpacity={0.8}
            onPress={() => navigateToShop(comercio)}
          >
            <Text style={styles.verMasText}>Ver más</Text>
            <Ionicons name="chevron-forward" size={16} color="#FF5A00" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.itemsRow}>
            {items.map((item) => renderItem(item, comercio))}
          </View>
        </ScrollView>
      </View>
    );
  };

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5A00" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {esServicios ? "Servicios" : "Restaurantes"}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.categoriasScroll}>
          {categorias.map(renderCategoriaItem)}
        </View>

        <View style={styles.content}>
          {refreshing ? (
            <View style={styles.refreshingWrap}>
              <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
                <Ionicons name="cube" size={42} color="#FF5A00" />
              </Animated.View>
              <Text style={styles.refreshingText}>Buscando...</Text>
            </View>
          ) : comercios.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name={esServicios ? "cut-outline" : "restaurant-outline"} size={48} color="#CCC" />
              <Text style={styles.emptyText}>
                No hay {esServicios ? "servicios" : "negocios"} disponibles
              </Text>
            </View>
          ) : (
            comercios.map(renderComercio)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
  },
  categoriasScroll: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  catItem: {
    alignItems: "center",
    width: 80,
    marginBottom: 8,
  },
  catItemSelected: {
    opacity: 1,
  },
  catIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF5EC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  catIconWrapSelected: {
    backgroundColor: "#FFEDE5",
    borderColor: "#FF5A00",
  },
  catIcon: {
    width: 38,
    height: 38,
    resizeMode: "contain",
  },
  catName: {
    fontSize: 12,
    fontFamily: "Montserrat_600SemiBold",
    color: "#666",
    textAlign: "center",
  },
  catNameSelected: {
    color: "#FF5A00",
    fontFamily: "Montserrat_700Bold",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  comercioSection: {
    marginBottom: 24,
  },
  comercioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  comercioName: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
  },
  verMasBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  verMasText: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FF5A00",
  },
  itemsRow: {
    flexDirection: "row",
    gap: 10,
  },
  itemCard: {
    width: ITEM_IMG_SIZE,
  },
  itemImgWrap: {
    width: ITEM_IMG_SIZE,
    height: ITEM_IMG_SIZE,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F2F2F2",
    marginBottom: 8,
  },
  itemImg: {
    width: "100%",
    height: "100%",
  },
  itemPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  itemName: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    color: "#1C1C1E",
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#FF5A00",
  },
  itemOriginalPrice: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: "#BBB",
    textDecorationLine: "line-through",
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
  refreshingWrap: {
    alignItems: "center",
    paddingVertical: 50,
    gap: 16,
  },
  refreshingText: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#999",
  },
});
