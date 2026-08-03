import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import logger from "../../utils/logger";

export default function useCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCategorias = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await fetch(`${BASE_URL}categorias`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      let arr = [];
      if (data && data.categorias && Array.isArray(data.categorias)) arr = data.categorias;
      else if (Array.isArray(data)) arr = data;
      else if (data && Array.isArray(data.data)) arr = data.data;
      setCategorias(arr);
      logger.summary("CATEGORIAS", `${arr.length} categorias`);
    } catch (e) {
      logger.error("CATEGORIAS", "fetch", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategoria = useCallback(async (nombre) => {
    const token = await AsyncStorage.getItem("userToken");
    const res = await fetch(`${BASE_URL}categorias`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ nombre }),
    });
    if (!res.ok) throw new Error("Error al crear categoría");
    await fetchCategorias();
  }, [fetchCategorias]);

  const updateCategoria = useCallback(async (id, nombre) => {
    const token = await AsyncStorage.getItem("userToken");
    const res = await fetch(`${BASE_URL}categorias/${id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ nombre }),
    });
    if (!res.ok) throw new Error("Error al actualizar categoría");
    setCategorias(prev => prev.map(c => c.id === id ? { ...c, nombre } : c));
  }, []);

  const deleteCategoria = useCallback(async (id) => {
    const token = await AsyncStorage.getItem("userToken");
    const res = await fetch(`${BASE_URL}categorias/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) throw new Error("Error al eliminar categoría");
    setCategorias(prev => prev.filter(c => c.id !== id));
  }, []);

  return { categorias, loading, fetchCategorias, createCategoria, updateCategoria, deleteCategoria };
}
