import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
import FavoriteHeart from "../../components/FavoriteHeart";
import LogoComercio from "../../components/LogoComercio";
import FocusAwareStatusBar from "../../components/FocusAwareStatusBar";

const { width } = Dimensions.get("window");
const CARD_PRODUCTO = 150;
const CARD_SERVICIO = 200;

const C = {
  brand: "#fa6205",
  ink: "#1C1C1E",
  ink2: "#2C2C2E",
  muted: "#71717A",
  bg: "#F4F4F5",
  edge: "#E4E4E7",
  surface: "#FFFFFF",
};

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
  const insets = useSafeAreaInsets();

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
        style={styles.catItem}
        activeOpacity={0.85}
        onPress={() => onSelectCategoria(cat)}
      >
        <View style={[styles.catIconWrap, seleccionada && styles.catIconWrapSelected]}>
          {cat.icono ? (
            <Image source={{ uri: getImageUrl(cat.icono) }} style={styles.catIcon} />
          ) : (
            <Ionicons name={esServicios ? "cut-outline" : "restaurant-outline"} size={26} color={C.brand} />
          )}
        </View>
        <Text style={[styles.catName, seleccionada && styles.catNameSelected]} numberOfLines={2}>
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
    const abrir = () => (esServicio ? navigateToService(item, comercio) : navigateToShop(comercio));

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.itemCard, { width: esServicio ? CARD_SERVICIO : CARD_PRODUCTO }]}
        activeOpacity={0.9}
        onPress={abrir}
      >
        <View style={[styles.itemImgWrap, { height: esServicio ? 128 : 136 }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.itemImg} />
          ) : (
            <View style={styles.itemPlaceholder}>
              <Ionicons name={esServicio ? "cut-outline" : "image-outline"} size={28} color="#A1A1AA" />
            </View>
          )}
          <View style={styles.heartPos}>
            <FavoriteHeart kind={esServicio ? "servicio" : "producto"} productId={item.id} size={15} style={styles.heartBtn} />
          </View>
          {esServicio && !!Number(item.tiempo) && (
            <View style={styles.duracion}>
              <Ionicons name="time-outline" size={12} color="#FFFFFF" />
              <Text style={styles.duracionTexto}>{Number(item.tiempo)} min</Text>
            </View>
          )}
        </View>
        <Text style={styles.itemName} numberOfLines={2}>{item.nombre}</Text>
        <View style={styles.itemPie}>
          <View style={styles.itemPrecios}>
            <Text style={styles.itemPrice} numberOfLines={1}>{formatPrice(precioFinal)}</Text>
            {descuento > 0 && (
              <Text style={styles.itemOriginalPrice} numberOfLines={1}>{formatPrice(precioOriginal)}</Text>
            )}
          </View>
          {esServicio && (
            <TouchableOpacity style={styles.reservarBtn} activeOpacity={0.85} onPress={abrir}>
              <Text style={styles.reservarTexto}>Reservar</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderComercio = (comercio) => {
    const items = esServicios ? (comercio.servicios || []) : (comercio.productos || []);
    if (items.length === 0) return null;

    return (
      <View key={comercio.id} style={styles.comercioSection}>
        <View style={styles.comercioHeader}>
          <LogoComercio comercio={comercio} comercioId={comercio.id} size={42} />
          <Text style={styles.comercioName} numberOfLines={1}>{comercio.establecimiento_nombre}</Text>
          <TouchableOpacity
            style={styles.verMasBtn}
            activeOpacity={0.8}
            onPress={() => navigateToShop(comercio)}
          >
            <Text style={styles.verMasText}>Ver más</Text>
            <Ionicons name="chevron-forward" size={14} color={C.brand} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.itemsRow}>
          {items.map((item) => renderItem(item, comercio))}
        </ScrollView>
      </View>
    );
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <FocusAwareStatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 24 }}
      >
        <View style={styles.header}>
          <View style={styles.headerFila}>
            <TouchableOpacity
              style={styles.volverBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
              accessibilityLabel="Volver"
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            {!!location && (
              <View style={styles.cercaPill}>
                <Ionicons name="location" size={13} color={C.brand} />
                <Text style={styles.cercaTexto}>Cerca de tu ubicación</Text>
              </View>
            )}
          </View>
          <Text style={styles.titulo}>{esServicios ? "Servicios" : "Restaurantes"}</Text>
          {esServicios && <Text style={styles.subtitulo}>Citas y reservas</Text>}

          {categorias.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriasScroll}
              contentContainerStyle={styles.categoriasScrollContent}
            >
              {categorias.map(renderCategoriaItem)}
            </ScrollView>
          )}
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.refreshingWrap}>
              <ActivityIndicator size="large" color={C.brand} />
            </View>
          ) : refreshing ? (
            <View style={styles.refreshingWrap}>
              <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
                <Ionicons name="cube" size={42} color={C.brand} />
              </Animated.View>
              <Text style={styles.refreshingText}>Buscando...</Text>
            </View>
          ) : comercios.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name={esServicios ? "cut-outline" : "restaurant-outline"} size={34} color={C.brand} />
              </View>
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
  },
  scroll: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: C.ink,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  volverBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.ink2,
    alignItems: "center",
    justifyContent: "center",
  },
  cercaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: C.ink2,
  },
  cercaTexto: {
    fontSize: 11.5,
    fontFamily: "Montserrat_700Bold",
    color: "rgba(255,255,255,0.8)",
  },
  titulo: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#FFFFFF",
    letterSpacing: -0.6,
    marginTop: 18,
  },
  subtitulo: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  categoriasScroll: {
    flexGrow: 0,
    marginTop: 18,
    marginHorizontal: -20,
  },
  categoriasScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  catItem: {
    alignItems: "center",
    width: 74,
  },
  catIconWrap: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: C.ink2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 7,
    borderWidth: 2,
    borderColor: "transparent",
  },
  catIconWrapSelected: {
    borderColor: C.brand,
  },
  catIcon: {
    width: 44,
    height: 44,
    resizeMode: "contain",
  },
  catName: {
    fontSize: 11.5,
    lineHeight: 14,
    fontFamily: "Montserrat_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  catNameSelected: {
    color: C.brand,
  },
  content: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  comercioSection: {
    marginTop: 22,
  },
  comercioHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  comercioName: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Montserrat_800ExtraBold",
    color: C.ink,
  },
  verMasBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: C.surface,
  },
  verMasText: {
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
    color: C.brand,
  },
  itemsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
  },
  itemCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 6,
  },
  itemImgWrap: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: C.edge,
  },
  heartPos: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
  },
  heartBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  duracion: {
    position: "absolute",
    left: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(28,28,30,0.85)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  duracionTexto: {
    fontSize: 11,
    fontFamily: "Montserrat_700Bold",
    color: "#FFFFFF",
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
    lineHeight: 17,
    minHeight: 34,
    fontFamily: "Montserrat_700Bold",
    color: C.ink,
    marginTop: 9,
    marginHorizontal: 6,
  },
  itemPie: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 6,
    marginHorizontal: 6,
    marginBottom: 4,
  },
  itemPrecios: {
    flexShrink: 1,
  },
  itemPrice: {
    fontSize: 15,
    fontFamily: "Montserrat_800ExtraBold",
    color: C.brand,
  },
  itemOriginalPrice: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: "#A1A1AA",
    textDecorationLine: "line-through",
  },
  reservarBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  reservarTexto: {
    fontSize: 11.5,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#FFFFFF",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF0E5",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: C.muted,
  },
  refreshingWrap: {
    alignItems: "center",
    paddingVertical: 50,
    gap: 16,
  },
  refreshingText: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: C.muted,
  },
});
