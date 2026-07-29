import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import logger from "../../utils/logger";

export default function useBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await fetch(`${BASE_URL}banners`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setBanners(arr);
    } catch (e) {
      logger.error("BANNERS", "fetch", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadBanner = useCallback(async (foto) => {
    const token = await AsyncStorage.getItem("userToken");
    const fd = new FormData();
    fd.append("file", { uri: foto, type: "image/jpeg", name: `banner_${Date.now()}.jpg` });
    const res = await fetch(`${BASE_URL}banners`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      body: fd,
    });
    if (!res.ok) throw new Error("Error al subir banner");
    await fetchBanners();
  }, [fetchBanners]);

  const toggleBanner = useCallback(async (banner) => {
    const token = await AsyncStorage.getItem("userToken");
    const endpoint = banner.activo ? "desactivar" : "activar";
    await fetch(`${BASE_URL}banners/${banner.id}/${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    await fetchBanners();
  }, [fetchBanners]);

  const deleteBanner = useCallback(async (id) => {
    const token = await AsyncStorage.getItem("userToken");
    await fetch(`${BASE_URL}banners/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    await fetchBanners();
  }, [fetchBanners]);

  return { banners, loading, fetchBanners, uploadBanner, toggleBanner, deleteBanner };
}
