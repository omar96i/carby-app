import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import logger from "../../utils/logger";

export default function useServicios() {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchServicios = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const ud = JSON.parse(await AsyncStorage.getItem("userData") || "{}");
      const userId = ud.id;
      if (!userId) return;
      const res = await fetch(`${BASE_URL}user-servicio/by-user/${userId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      let arr = [];
      if (data && Array.isArray(data.data)) arr = data.data;
      else if (Array.isArray(data)) arr = data;
      setServicios(arr);
    } catch (e) {
      logger.error("SERVICIOS", "fetch", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const createServicio = useCallback(async (form) => {
    const token = await AsyncStorage.getItem("userToken");
    const ud = JSON.parse(await AsyncStorage.getItem("userData") || "{}");
    const fd = new FormData();
    fd.append("nombre", form.nombre);
    fd.append("precio", String(form.precio));
    fd.append("tiempo", form.extra || "30");
    fd.append("descripcion", form.extra || "");
    fd.append("categoria_id", String(form.categoria_id));
    fd.append("user_id", String(ud.id));
    if (form.foto) {
      fd.append("foto", { uri: form.foto, type: "image/jpeg", name: `servicio_${Date.now()}.jpg` });
    }

    logger.request("POST", `${BASE_URL}user-servicio`, { nombre: form.nombre, precio: form.precio, categoria_id: form.categoria_id });
    const res = await fetch(`${BASE_URL}user-servicio`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      body: fd,
    });
    const text = await res.text();
    logger.response("SERVICIO_CREATE", res.status, text.slice(0, 300));
    if (!res.ok) throw new Error(`Error ${res.status}`);
    await fetchServicios();
  }, [fetchServicios]);

  const deleteServicio = useCallback(async (id) => {
    const token = await AsyncStorage.getItem("userToken");
    logger.request("DELETE", `${BASE_URL}user-servicio/${id}`);
    await fetch(`${BASE_URL}user-servicio/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    await fetchServicios();
  }, [fetchServicios]);

  return { servicios, loading, fetchServicios, createServicio, deleteServicio };
}
