import React, { useEffect, useState } from "react";
import { View, Image, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../constants/url";


const cacheLogos = new Map();
const pendientes = new Map();

const CLAVE_CACHE = "logos_comercio_cache";
const VIGENCIA_MS = 24 * 60 * 60 * 1000;
const ESPERA_INICIAL_MS = 1500;
const MAX_A_LA_VEZ = 3;
const arranque = Date.now();
let enCurso = 0;
const cola = [];
let guardarTimer = null;

const cacheListo = (async () => {
  try {
    const guardado = JSON.parse((await AsyncStorage.getItem(CLAVE_CACHE)) || "{}");
    const ahora = Date.now();
    Object.entries(guardado).forEach(([id, v]) => {
      if (v && ahora - v.t < VIGENCIA_MS && !cacheLogos.has(id)) cacheLogos.set(id, v.u);
    });
  } catch (e) {}
})();

const guardarCache = () => {
  clearTimeout(guardarTimer);
  guardarTimer = setTimeout(() => {
    const t = Date.now();
    const obj = {};
    cacheLogos.forEach((u, id) => { obj[id] = { u, t }; });
    AsyncStorage.setItem(CLAVE_CACHE, JSON.stringify(obj)).catch(() => {});
  }, 800);
};

const siguiente = () => {
  while (enCurso < MAX_A_LA_VEZ && cola.length) {
    const tarea = cola.shift();
    enCurso++;
    tarea().finally(() => {
      enCurso--;
      siguiente();
    });
  }
};

const enCola = (tarea) =>
  new Promise((resolve) => {
    const iniciar = () => {
      cola.push(() => tarea().then(resolve));
      siguiente();
    };
    const falta = ESPERA_INICIAL_MS - (Date.now() - arranque);
    if (falta > 0) setTimeout(iniciar, falta);
    else iniciar();
  });

const urlDe = (path) => {
  if (!path) return null;
  return String(path).startsWith("http") ? path : `${BASE_URL.toString().replace("/api", "")}/storage/${path}`;
};

export const fotoDeComercio = (comercio) =>
  urlDe(
    comercio?.foto_documento_file ||
      comercio?.logo ||
      comercio?.imagen ||
      comercio?.foto ||
      comercio?.foto_perfil ||
      comercio?.fotografia_perfil ||
      comercio?.imagen_url ||
      comercio?.logo_url ||
      comercio?.foto_url ||
      null
  );

const pedirLogo = (id) => {
  const clave = String(id);
  if (cacheLogos.has(clave)) return Promise.resolve(cacheLogos.get(clave));
  if (pendientes.has(clave)) return pendientes.get(clave);
  const p = (async () => {
    await cacheListo;
    if (cacheLogos.has(clave)) return cacheLogos.get(clave);
    return enCola(async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return null;
        const res = await fetch(`${BASE_URL}usuario/${id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return null;
        const data = await res.json();
        const url = urlDe(data?.data?.foto_documento_file || data?.data?.fotografia_perfil || null);
        cacheLogos.set(clave, url);
        guardarCache();
        return url;
      } catch (e) {
        return null;
      }
    });
  })().finally(() => pendientes.delete(clave));
  pendientes.set(clave, p);
  return p;
};

export default function LogoComercio({
  comercio,
  comercioId,
  size = 46,
  radius,
  style,
  iconName = "storefront",
  iconColor = "#fa6205",
  fallbackBg = "#FFF0E5",
}) {
  const directa = fotoDeComercio(comercio);
  const id = comercioId || comercio?.id || comercio?.user_id || null;
  const [url, setUrl] = useState(directa || (id && cacheLogos.get(String(id))) || null);

  useEffect(() => {
    let vivo = true;
    if (directa) {
      setUrl(directa);
      return;
    }
    if (!id) return;
    pedirLogo(id).then((u) => {
      if (vivo && u) setUrl(u);
    });
    return () => {
      vivo = false;
    };
  }, [directa, id]);

  const r = radius ?? size / 2;
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[{ width: size, height: size, borderRadius: r, backgroundColor: "#F4F4F5" }, style]}
        resizeMode="cover"
        onError={() => setUrl(null)}
      />
    );
  }
  return (
    <View style={[s.vacio, { width: size, height: size, borderRadius: r, backgroundColor: fallbackBg }, style]}>
      <Ionicons name={iconName} size={Math.round(size * 0.45)} color={iconColor} />
    </View>
  );
}

const s = StyleSheet.create({
  vacio: { alignItems: "center", justifyContent: "center" },
});
