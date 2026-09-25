import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import logger from "../../utils/logger";

const FALLBACK = {
  steps: { ubicacion: false, horarios: false, secciones: false, catalogo: false },
  missing: ["ubicacion", "horarios", "secciones", "catalogo"],
  complete: false,
  progress: { done: 0, total: 4 },
  counts: {},
  ubicacion: null,
  tipo_categoria: null,
  is_servicios: false,
};

export default function useOnboardingStatus() {
  const [status, setStatus] = useState(FALLBACK);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async (local = {}) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await fetch(`${BASE_URL}comercio/setup-status`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.status && data.data) {
        const merged = { ...FALLBACK, ...data.data };
        if (local.categoriasCount > 0) merged.steps = { ...merged.steps, secciones: true };
        if (local.itemsCount > 0) merged.steps = { ...merged.steps, catalogo: true };
        const keys = Object.keys(merged.steps);
        merged.missing = keys.filter((k) => !merged.steps[k]);
        merged.complete = merged.missing.length === 0;
        merged.progress = { done: keys.length - merged.missing.length, total: keys.length };
        setStatus(merged);
        return merged;
      }
      return null;
    } catch (e) {
      logger.error("SETUP_STATUS", "fetch", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, loading, fetchStatus };
}
