import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import logger from "../../utils/logger";

export default function useProductos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await fetch(`${BASE_URL}productos`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      let arr = [];
      if (Array.isArray(data)) arr = data;
      else if (data && data.productos && Array.isArray(data.productos)) arr = data.productos;
      else if (data && Array.isArray(data.data)) arr = data.data;
      setProductos(arr);
    } catch (e) {
      logger.error("PRODUCTOS", "fetch", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProducto = useCallback(async (form) => {
    const token = await AsyncStorage.getItem("userToken");
    const fd = new FormData();
    fd.append("nombre", form.nombre);
    fd.append("precio", String(form.precio));
    if (form.descripcion) fd.append("descripcion", form.descripcion);
    fd.append("categoria_id", String(form.categoria_id));
    if (form.descuento) fd.append("descuento", String(form.descuento));
    if (form.activo_descuento) fd.append("activo_descuento", "1");
    if (form.foto) {
      fd.append("foto", { uri: form.foto, type: "image/jpeg", name: `producto_${Date.now()}.jpg` });
    }
    logger.request("POST", `${BASE_URL}productos`, { nombre: form.nombre, precio: form.precio, categoria_id: form.categoria_id });
    const res = await fetch(`${BASE_URL}productos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      body: fd,
    });
    const text = await res.text();
    logger.response("PRODUCTO_CREATE", res.status, text.slice(0, 300));
    if (!res.ok) {
      let msg = `Error ${res.status}`;
      try {
        const j = JSON.parse(text);
        msg = j.message || j.msg || msg;
        if (j.rango_permitido) {
          const r = j.rango_permitido;
          msg += ` (rango: $${Number(r.min).toLocaleString("es-CO")} – $${Number(r.max).toLocaleString("es-CO")})`;
        }
        if (j.errors) msg += ": " + Object.values(j.errors).flat().join(" ");
      } catch {}
      throw new Error(msg);
    }
    await fetchProductos();
  }, [fetchProductos]);

  const toggleProducto = useCallback(async (producto) => {
    const token = await AsyncStorage.getItem("userToken");
    const id = producto.id;
    const isActive = producto.activo === undefined ? true : producto.activo !== 0;
    const accion = isActive ? "desactivar" : "activar";
    const url = `${BASE_URL}productos/${accion}/${id}`;
    logger.request("GET", url);
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    logger.response("TOGGLE", res.status, `producto ${id} → ${accion}`);
    await fetchProductos();
  }, [fetchProductos]);

  const deleteProducto = useCallback(async (id) => {
    const token = await AsyncStorage.getItem("userToken");
    logger.request("DELETE", `${BASE_URL}productos/${id}`);
    const res = await fetch(`${BASE_URL}productos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let msg = `Error ${res.status}`;
      try {
        const j = JSON.parse(text);
        msg = j.message || msg;
        if (j.counts) msg += ` (${j.counts.productos || 0} productos, ${j.counts.servicios || 0} servicios)`;
      } catch {}
      throw new Error(msg);
    }
    await fetchProductos();
  }, [fetchProductos]);

  return { productos, loading, fetchProductos, createProducto, toggleProducto, deleteProducto };
}
