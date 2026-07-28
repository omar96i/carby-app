import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { BASE_URL } from "../../constants/url";
import logger from "../../utils/logger";

function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL.toString().replace("/api", "")}/storage/${path}`;
}

export default function useShopInfo() {
  const [userData, setUserData] = useState(null);
  const [establishmentName, setEstablishmentName] = useState("Mi Tienda");
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [shopActive, setShopActive] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [ratings, setRatings] = useState([]);
  const [paymentType, setPaymentType] = useState(null);
  const [tipoCategoria, setTipoCategoria] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchShopInfo = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const stored = await AsyncStorage.getItem("userData");
      if (!stored) return;
      const ud = JSON.parse(stored);
      const userId = ud.id;
      setUserData(ud);

      const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
      const [userRes, catRes] = await Promise.all([
        fetch(`${BASE_URL}usuario/${userId}`, { headers }),
        fetch(`${BASE_URL}global-categorias/get/obtener`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ latitud: 4.60971, longitud: -74.08175 }),
        }).catch(() => ({ ok: false })),
      ]);

      if (userRes.ok) {
        const d = (await userRes.json()).data || {};
        setEstablishmentName(d.establecimiento_nombre || ud.establecimiento_nombre || ud.nombre_completo || "Mi Tienda");
        setShopActive(d.tienda_estado === "activo" || d.tienda_estado === 1 || d.tienda_estado === true);
        setAverageRating(parseFloat(d.promedio_puntuacion_restaurante) || 0);
        setRatings((d.comercio_pedidos || []).filter((p) => p.puntuacion_restaurante != null));
        setPaymentType(d.user_tipo_pago || null);

        const img = d.foto_document_file || d.foto_documento_file || d.foto_perfil;
        if (img) setProfileImageUrl(getImageUrl(img));

        const gCatId = d.global_categoria_id;
        if (catRes.ok) {
          const catData = await catRes.json();
          const cats = Array.isArray(catData?.data) ? catData.data : [];
          const match = cats.find((c) => String(c.id) === String(gCatId));
          if (match) setTipoCategoria(match.tipo_categoria || null);
        }
      }
    } catch (e) {
      logger.error("SHOP_INFO", "fetch", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleTienda = useCallback(async () => {
    const uid = userData?.id;
    if (!uid) return;
    const token = await AsyncStorage.getItem("userToken");
    const action = shopActive ? "desactivar-tienda" : "activar-tienda";
    const res = await fetch(`${BASE_URL}usuario/${action}/${uid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setShopActive(!shopActive);
    }
  }, [shopActive, userData]);

  const getCurrentLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") throw new Error("Permiso denegado");
    const loc = await Location.getCurrentPositionAsync({});
    setCurrentLocation(loc.coords);
    return loc.coords;
  }, []);

  const saveShopLocation = useCallback(async () => {
    try {
      const uid = userData?.id;
      const coords = await getCurrentLocation();
      const token = await AsyncStorage.getItem("userToken");
      await fetch(`${BASE_URL}localizacion`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ user_id: uid, latitud: coords.latitude, longitud: coords.longitude, estado: "activo" }),
      });
      return true;
    } catch (e) {
      logger.error("LOCATION", "save", e);
      throw e;
    }
  }, [userData, getCurrentLocation]);

  return {
    userData, establishmentName, profileImageUrl, shopActive, averageRating, ratings,
    paymentType, tipoCategoria, currentLocation, loading,
    fetchShopInfo, toggleTienda, getCurrentLocation, saveShopLocation,
    setShopActive, setCurrentLocation,
  };
}
