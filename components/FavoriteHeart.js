import React, { useState, useEffect, useRef } from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../constants/url";

const ENDPOINTS = { producto: "productos", servicio: "servicios" };

const caches = { producto: null, servicio: null };
const pending = { producto: null, servicio: null };
const listeners = new Set();

function bumpFav() {
  listeners.forEach((l) => l());
}

export function subscribeFav(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getFavVersion() {
  return 0;
}

async function getFavIds(kind = "producto") {
  if (caches[kind]) return caches[kind];
  if (!pending[kind]) {
    pending[kind] = (async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return new Set();
        const res = await fetch(`${BASE_URL}${ENDPOINTS[kind]}/favoritos`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        const list = Array.isArray(json?.data) ? json.data : [];
        return new Set(list.map((p) => p.id));
      } catch {
        return new Set();
      }
    })();
  }
  caches[kind] = await pending[kind];
  pending[kind] = null;
  bumpFav();
  return caches[kind];
}

export function updateFavCache(id, value, kind = "producto") {
  if (!caches[kind]) return;
  if (value) caches[kind].add(id);
  else caches[kind].delete(id);
  bumpFav();
}

async function toggleFavoritoApi(id, kind = "producto") {
  const token = await AsyncStorage.getItem("userToken");
  if (!token) return null;
  const res = await fetch(`${BASE_URL}${ENDPOINTS[kind]}/${id}/favorito`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  return res.ok ? !!json?.favorito : null;
}

/**
 * Corazón de favorito autocontenido: lee estado inicial del caché
 * (una sola petición por sesión y tipo) y hace toggle optimista.
 */
export default function FavoriteHeart({ productId, kind = "producto", initial = null, size = 18, style }) {
  const [fav, setFav] = useState(initial === true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const sync = () => {
      if (caches[kind] && mounted.current) setFav(caches[kind].has(productId));
    };
    const unsub = subscribeFav(sync);
    if (initial !== null) {
      setFav(initial === true);
    } else {
      getFavIds(kind).then((ids) => {
        if (mounted.current) setFav(ids.has(productId));
      });
    }
    return () => {
      mounted.current = false;
      unsub();
    };
  }, [productId, kind]);

  const onPress = async () => {
    const prev = fav;
    setFav(!prev);
    updateFavCache(productId, !prev, kind);
    const next = await toggleFavoritoApi(productId, kind);
    if (next === null) {
      setFav(prev);
      updateFavCache(productId, prev, kind);
    } else if (next !== !prev) {
      setFav(next);
      updateFavCache(productId, next, kind);
    }
  };

  return (
    <TouchableOpacity
      style={[s.btn, style]}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Ionicons name={fav ? "heart" : "heart-outline"} size={size} color={fav ? "#E11D48" : "#64748B"} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
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
});
