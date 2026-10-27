import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFonts, Montserrat_400Regular, Montserrat_700Bold, Montserrat_600SemiBold, Montserrat_800ExtraBold } from "@expo-google-fonts/montserrat";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AlertaModal from "../../components/ErrorModal";
import ScreenHeader from "../../components/ScreenHeader";
import LogoComercio from "../../components/LogoComercio";
import { BASE_URL } from "../../constants/url";
import useFavoritos from "../../hooks/usuario/useFavoritos";
import { getCartBusiness, clearCart } from "../../utils/cartBusiness";

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL.toString().replace(/\/api\/?$/, "").replace(/\/$/, "")}/storage/${path}`;
};

const formatPrice = (v) => `$${Number(v || 0).toLocaleString("es-CO")}`;

export default function Favoritos() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    favoritos, favoritosServ,
    loading, refreshing,
    fetchFavoritos, fetchFavoritosServicios,
    toggleFavorito, toggleServicioFav, refresh,
  } = useFavoritos();

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_600SemiBold,
    Montserrat_800ExtraBold,
  });

  const [tabTipo, setTabTipo] = useState("productos");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ mensaje: "", tipo: "info", onPrimary: null, primaryLabel: "", titulo: "Atención" });
  const pendingAdd = useRef(null);

  const showAlert = (mensaje, tipo = "info", onPrimary = null, primaryLabel = "", titulo = "Atención") => {
    setAlertData({ mensaje, tipo, onPrimary, primaryLabel, titulo });
    setAlertVisible(true);
  };

  useEffect(() => {
    fetchFavoritos();
    fetchFavoritosServicios();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFavoritos(true);
      fetchFavoritosServicios(true);
    }, [fetchFavoritos, fetchFavoritosServicios])
  );

  const doAdd = async (item) => {
    try {
      const precioOriginal = Number(item.precio) || 0;
      const descuento = item.activo_descuento ? Number(item.descuento) || 0 : 0;
      const pricePerUnit = Math.max(precioOriginal - descuento, 0);
      const cartItem = {
        product: {
          id: item.id,
          nombre: item.nombre,
          precio: item.precio,
          descuento: item.descuento,
          activo_descuento: item.activo_descuento,
          foto: item.foto,
          user_id: item.comercio?.id,
          imageUrl: getImageUrl(item.foto),
          establishmentId: item.comercio?.id,
          establishmentName: item.comercio?.establecimiento_nombre,
        },
        quantity: 1,
        totalPrice: pricePerUnit,
        timestamp: new Date().getTime(),
      };
      const raw = await AsyncStorage.getItem("cart");
      const cart = raw ? JSON.parse(raw) : [];
      const idx = cart.findIndex((c) => c.product?.id === item.id);
      if (idx >= 0) {
        cart[idx].quantity += 1;
        cart[idx].totalPrice = cart[idx].quantity * pricePerUnit;
      } else {
        cart.push(cartItem);
      }
      await AsyncStorage.setItem("cart", JSON.stringify(cart));
      showAlert(`${item.nombre} agregado al carrito`, "success", () => {
        setAlertVisible(false);
        navigation.navigate("Carrito");
      }, "Ver carrito", "Agregado");
    } catch {
      showAlert("No se pudo agregar al carrito", "error");
    }
  };

  const handleAdd = async (item) => {
    const { establishmentId: biz, establishmentName: name } = await getCartBusiness();
    const myBiz = item.comercio?.id;
    if (biz && myBiz && String(biz) !== String(myBiz)) {
      pendingAdd.current = item;
      showAlert(
        `Tu carrito es de ${name || "otro negocio"}. ¿Vaciarlo y agregar este producto?`,
        "confirm",
        async () => {
          await clearCart();
          const it = pendingAdd.current;
          pendingAdd.current = null;
          if (it) doAdd(it);
        },
        "Sí, vaciar",
        "Carrito de otro negocio"
      );
      return;
    }
    doAdd(item);
  };

  const handleReservar = (item) => {
    navigation.navigate("ServicioDetalle", {
      servicio: item,
      establishmentId: item.user_id,
      establishmentName: item.perfil?.nombre || "Servicio",
    });
  };

  const renderCard = (item, inFavs, kind) => {
    const isServ = kind === "servicios";
    const disponible = isServ
      ? !!item.disponible_servicio && !!item.tiene_horario
      : !!item.comercio_abierto && !!item.disponible_producto;
    const fav = inFavs || !!item.es_favorito;
    const img = getImageUrl(item.foto);
    const precioOriginal = Number(item.precio) || 0;
    const dto = item.activo_descuento ? Number(item.descuento) || 0 : 0;
    const pct = precioOriginal > 0 && dto > 0 ? Math.round((dto / precioOriginal) * 100) : 0;
    const storeName = isServ ? item.perfil?.nombre || "Servicio" : item.comercio?.establecimiento_nombre || "Negocio";
    const meta = "En tus favoritos";
    const closedLabel = isServ
      ? (!item.disponible_servicio ? "No disponible" : "Sin horario")
      : "Cerrado";
    const onToggle = () => (isServ ? toggleServicioFav(item.id, fav) : toggleFavorito(item.id, fav));
    return (
      <View style={[s.card, !disponible && s.cardOff]}>
        <View style={s.imgWrap}>
          {img ? (
            <Image source={{ uri: img }} style={s.img} resizeMode="cover" />
          ) : (
            <View style={s.imgFallback}>
              <Ionicons name={isServ ? "cut-outline" : "fast-food-outline"} size={30} color="#CBD5E1" />
            </View>
          )}
          {pct > 0 && disponible && (
            <View style={s.pctBadge}>
              <Ionicons name="flame" size={11} color="#FF5500" />
              <Text style={s.pctText}>-{pct}%</Text>
            </View>
          )}
          <TouchableOpacity style={s.heartFloat} onPress={onToggle} activeOpacity={0.7}>
            <Ionicons name={fav ? "heart" : "heart-outline"} size={18} color={fav ? "#E11D48" : "#64748B"} />
          </TouchableOpacity>
          {!disponible && (
            <View style={s.closedVeil}>
              <View style={s.closedPill}>
                <Text style={s.closedPillText}>{closedLabel}</Text>
              </View>
            </View>
          )}
        </View>

        <Text style={s.price}>{formatPrice(precioOriginal - dto)}</Text>
        {dto > 0 && <Text style={s.oldPrice}>{formatPrice(precioOriginal)}</Text>}
        <Text style={s.name} numberOfLines={2}>{item.nombre}</Text>

        <View style={s.storeRow}>
          <LogoComercio
            comercio={isServ ? item.perfil?.user : item.comercio}
            comercioId={isServ ? (item.perfil?.user_id ?? item.user_id) : item.comercio?.id}
            size={18}
          />
          <Text style={s.storeName} numberOfLines={1}>{storeName}</Text>
        </View>
        <Text style={s.meta} numberOfLines={1}>{meta}</Text>

        {isServ ? (
          <TouchableOpacity
            style={[s.addBtn, !disponible && s.addBtnOff]}
            onPress={() => handleReservar(item)}
            disabled={!disponible}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
            <Text style={s.addText}>Reservar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.addBtn, !disponible && s.addBtnOff]}
            onPress={() => handleAdd(item)}
            disabled={!disponible}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={s.addText}>Agregar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderItem = ({ item }) => renderCard(item, true, tabTipo);

  const isServTab = tabTipo === "servicios";
  const favs = isServTab ? favoritosServ : favoritos;

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator size="large" color="#FF5500" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <ScreenHeader title="Favoritos" showBackButton />

      <View style={s.tipoWrap}>
        <View style={s.tipoBar}>
          {[
            { key: "productos", label: "Productos" },
            { key: "servicios", label: "Servicios" },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[s.tipoTab, tabTipo === t.key && s.tipoTabActive]}
              onPress={() => setTabTipo(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.tipoLabel, tabTipo === t.key ? s.tipoLabelActive : s.tipoLabelInactive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#FF5500" />
        </View>
      ) : (
        <FlatList
          data={favs}
          renderItem={renderItem}
          keyExtractor={(item) => `${tabTipo}-${item.id}`}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={[s.list, { paddingBottom: 104 + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={["#FF5500"]} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="heart-outline" size={48} color="#CBD5E1" />
              <Text style={s.emptyText}>Toca el corazón en productos y servicios para guardarlos aquí</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <AlertaModal
        visible={alertVisible}
        mensaje={alertData.mensaje}
        tipo={alertData.tipo}
        titulo={alertData.titulo}
        onCerrar={() => setAlertVisible(false)}
        onPrimary={alertData.onPrimary}
        primaryLabel={alertData.primaryLabel}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  tipoWrap: { paddingHorizontal: 16, paddingBottom: 8, marginTop: 14 },
  tipoBar: { flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 12, padding: 3 },
  tipoTab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 9 },
  tipoTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tipoLabel: { fontSize: 12, fontFamily: "Montserrat_800ExtraBold" },
  tipoLabelActive: { color: "#0F172A" },
  tipoLabelInactive: { color: "#64748B" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  row: { gap: 12 },
  card: {
    flex: 1,
    marginBottom: 16,
    paddingBottom: 4,
  },
  cardOff: { opacity: 0.85 },
  imgWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F2F2F2",
    marginBottom: 10,
  },
  img: { width: "100%", height: "100%" },
  imgFallback: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E8E8E8",
  },
  pctBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  pctText: { fontSize: 11, fontFamily: "Montserrat_700Bold", color: "#FF5500" },
  heartFloat: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  closedVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  closedPill: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  closedPillText: { fontSize: 11, fontFamily: "Montserrat_800ExtraBold", color: "#FFFFFF" },
  price: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E" },
  oldPrice: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#BBB",
    textDecorationLine: "line-through",
  },
  name: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    color: "#1C1C1E",
    lineHeight: 17,
    marginTop: 2,
    minHeight: 34,
  },
  storeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  storeLogo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FF5A00",
    justifyContent: "center",
    alignItems: "center",
  },
  storeLogoText: { color: "#FFF", fontSize: 9, fontFamily: "Montserrat_700Bold" },
  storeName: { flex: 1, fontSize: 11, fontFamily: "Montserrat_400Regular", color: "#888" },
  meta: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: "#94A3B8", marginTop: 3 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5500",
    borderRadius: 12,
    paddingVertical: 9,
    marginTop: 8,
    gap: 2,
  },
  addBtnOff: { backgroundColor: "#CBD5E1" },
  addText: { fontSize: 12, fontFamily: "Montserrat_700Bold", color: "#FFFFFF" },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40 },
  emptyText: { textAlign: "center", fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#94A3B8", marginTop: 12 },
});
