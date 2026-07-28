import { useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GOOGLE_MAPS_API_KEY } from "../../constants/Keys";

const GEO_CACHE_PREFIX = "geo_";

export default function useGeocodingBatch() {
  const cacheRef = useRef({});

  const obtenerDireccionDesdeCoords = useCallback(async (coordsString) => {
    if (!coordsString) return "Dirección no disponible";
    const parts = String(coordsString).split(",");
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return coordsString;

    const cacheKey = `${GEO_CACHE_PREFIX}${lat.toFixed(5)}_${lng.toFixed(5)}`;

    if (cacheRef.current[cacheKey]) return cacheRef.current[cacheKey];

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        cacheRef.current[cacheKey] = cached;
        return cached;
      }
    } catch (e) {}

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === "OK" && data.results.length > 0) {
        const filtered = data.results.find((r) => {
          const isPlus = r.types.includes("plus_code");
          const isFormatted = /^[A-Z0-9]{4}\+/.test(r.formatted_address);
          return !isPlus && !isFormatted;
        });
        const address = filtered?.formatted_address || data.results[0].formatted_address || "Dirección no disponible";
        cacheRef.current[cacheKey] = address;
        try { await AsyncStorage.setItem(cacheKey, address); } catch (e) {}
        return address;
      }
      return "Dirección no disponible";
    } catch (e) {
      return "Dirección no disponible";
    }
  }, []);

  const procesarTodasLasDirecciones = useCallback(async (items, setter) => {
    if (!items?.length) return items;
    let changed = false;
    const updated = await Promise.all(items.map(async (item) => {
      if (!item.es_carrera || !item.datos_generales) return item;
      try {
        const dg = typeof item.datos_generales === "string" ? JSON.parse(item.datos_generales) : item.datos_generales;
        let modified = false;
        if (dg.start_lugar && !isNaN(parseFloat(String(dg.start_lugar).split(",")[0]))) {
          dg.start_lugar = await obtenerDireccionDesdeCoords(dg.start_lugar);
          modified = true;
        }
        if (dg.end_lugar && !isNaN(parseFloat(String(dg.end_lugar).split(",")[0]))) {
          dg.end_lugar = await obtenerDireccionDesdeCoords(dg.end_lugar);
          modified = true;
        }
        if (modified) {
          changed = true;
          return { ...item, datosGeneralesParsed: dg };
        }
        return item;
      } catch (e) {
        return item;
      }
    }));
    return updated;
  }, [obtenerDireccionDesdeCoords]);

  return { obtenerDireccionDesdeCoords, procesarTodasLasDirecciones };
}
