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
  const [shopLocation, setShopLocation] = useState(null);
  const [shopAddress, setShopAddress] = useState("");
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
      const [userRes, catRes, locRes] = await Promise.all([
        fetch(`${BASE_URL}usuario/${userId}`, { headers }),
        fetch(`${BASE_URL}global-categorias/get/obtener`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ latitud: 4.60971, longitud: -74.08175 }),
        }).catch(() => ({ ok: false })),
        fetch(`${BASE_URL}localizacion/${userId}`, { headers })
          .then(async (r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      if (locRes && locRes.status && locRes.data) {
        const loc = locRes.data;
        setShopLocation({ latitude: parseFloat(loc.latitud), longitude: parseFloat(loc.longitud) });
        if (loc.direccion) setShopAddress(loc.direccion);
      }

      if (userRes.ok) {
        const d = (await userRes.json()).data || {};
        setUserData((prev) => ({ ...(prev || {}), ...d }));
        const loc = d.user_location || d.userLocation || null;
        if (loc && loc.latitud && loc.longitud) {
          setShopLocation({ latitude: parseFloat(loc.latitud), longitude: parseFloat(loc.longitud) });
          if (loc.direccion) setShopAddress(loc.direccion);
        }
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

  const saveShopLocation = useCallback(async (payload) => {
    try {
      const uid = userData?.id;
      if (!uid) throw new Error("Sin usuario");
      const coords = payload?.latitude != null
        ? payload
        : await getCurrentLocation();
      if (coords.latitude == null || coords.longitude == null) throw new Error("Sin coordenadas");
      const token = await AsyncStorage.getItem("userToken");
      const body = {
        user_id: uid,
        latitud: coords.latitude,
        longitud: coords.longitude,
        estado: "activo",
      };
      if (payload?.direccion) body.direccion = payload.direccion;
      if (payload?.referencia) body.referencia = payload.referencia;
      const res = await fetch(`${BASE_URL}localizacion`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || (data && data.status === false)) {
        throw new Error(data?.message || `Error ${res.status}`);
      }
      const saved = data?.data || {};
      setShopLocation({ latitude: parseFloat(saved.latitud ?? coords.latitude), longitude: parseFloat(saved.longitud ?? coords.longitude) });
      if (saved.direccion || payload?.direccion) setShopAddress(saved.direccion || payload.direccion);
      setCurrentLocation({ latitude: coords.latitude, longitude: coords.longitude });
      return data?.data || true;
    } catch (e) {
      logger.error("LOCATION", "save", e);
      throw e;
    }
  }, [userData, getCurrentLocation]);

  return {
    userData, establishmentName, profileImageUrl, shopActive, averageRating, ratings,
    paymentType, tipoCategoria, currentLocation, shopLocation, shopAddress, loading,
    fetchShopInfo, toggleTienda, getCurrentLocation, saveShopLocation,
    setShopActive, setCurrentLocation,
  };
}
