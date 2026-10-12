import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import { updateFavCache } from "../../components/FavoriteHeart";

export default function useFavoritos() {
  const [recientes, setRecientes] = useState([]);
  const [favoritos, setFavoritos] = useState([]);
  const [recientesServ, setRecientesServ] = useState([]);
  const [favoritosServ, setFavoritosServ] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const authHeaders = async () => {
    const token = await AsyncStorage.getItem("userToken");
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const parseList = (json) => {
    const data = json?.data ?? json ?? [];
    return Array.isArray(data) ? data : [];
  };

  const fetchRecientes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}productos/ultimos-pedidos?limit=20`, {
        headers: await authHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      setRecientes(res.ok ? parseList(json) : []);
    } catch {
      if (!silent) setRecientes([]);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchFavoritos = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`${BASE_URL}productos/favoritos`, {
        headers: await authHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) setFavoritos(parseList(json));
    } catch {
      if (!silent) setFavoritos([]);
    }
  }, []);

  const toggleFavorito = useCallback(
    async (productoId, current) => {
      setRecientes((prev) =>
        prev.map((p) => (p.id === productoId ? { ...p, es_favorito: !current } : p))
      );
      updateFavCache(productoId, !current);
      try {
        const res = await fetch(`${BASE_URL}productos/${productoId}/favorito`, {
          method: "POST",
          headers: await authHeaders(),
        });
        const json = await res.json().catch(() => ({}));
        const next = !!json?.favorito;
        setRecientes((prev) =>
          prev.map((p) => (p.id === productoId ? { ...p, es_favorito: next } : p))
        );
        updateFavCache(productoId, next);
        fetchFavoritos(true);
        return next;
      } catch {
        setRecientes((prev) =>
          prev.map((p) => (p.id === productoId ? { ...p, es_favorito: current } : p))
        );
        updateFavCache(productoId, current);
        return current;
      }
    },
    [fetchFavoritos]
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchRecientes(true), fetchFavoritos(true), fetchRecientesServicios(true), fetchFavoritosServicios(true)]);
    setRefreshing(false);
  }, [fetchRecientes, fetchFavoritos, fetchRecientesServicios, fetchFavoritosServicios]);

  const fetchRecientesServicios = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`${BASE_URL}servicios/ultimos?limit=20`, {
        headers: await authHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) setRecientesServ(parseList(json));
    } catch {
      if (!silent) setRecientesServ([]);
    }
  }, []);

  const fetchFavoritosServicios = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`${BASE_URL}servicios/favoritos`, {
        headers: await authHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) setFavoritosServ(parseList(json));
    } catch {
      if (!silent) setFavoritosServ([]);
    }
  }, []);

  const toggleServicioFav = useCallback(
    async (servicioId, current) => {
      setRecientesServ((prev) =>
        prev.map((p) => (p.id === servicioId ? { ...p, es_favorito: !current } : p))
      );
      updateFavCache(servicioId, !current, "servicio");
      try {
        const res = await fetch(`${BASE_URL}servicios/${servicioId}/favorito`, {
          method: "POST",
          headers: await authHeaders(),
        });
        const json = await res.json().catch(() => ({}));
        const next = !!json?.favorito;
        setRecientesServ((prev) =>
          prev.map((p) => (p.id === servicioId ? { ...p, es_favorito: next } : p))
        );
        updateFavCache(servicioId, next, "servicio");
        fetchFavoritosServicios(true);
        return next;
      } catch {
        setRecientesServ((prev) =>
          prev.map((p) => (p.id === servicioId ? { ...p, es_favorito: current } : p))
        );
        updateFavCache(servicioId, current, "servicio");
        return current;
      }
    },
    [fetchFavoritosServicios]
  );

  return {
    recientes,
    favoritos,
    recientesServ,
    favoritosServ,
    loading,
    refreshing,
    fetchRecientes,
    fetchFavoritos,
    fetchRecientesServicios,
    fetchFavoritosServicios,
    toggleFavorito,
    toggleServicioFav,
    refresh,
  };
}
