import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const claveDe = (item) => `${item.es_carrera ? "carrera" : "pedido"}-${item.id}`;

export default function useHistorialOculto() {
  const [ocultos, setOcultos] = useState(() => new Set());
  const [storageKey, setStorageKey] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const userId = await AsyncStorage.getItem("userId");
        const key = `historial_oculto_${userId || "anon"}`;
        setStorageKey(key);
        const raw = await AsyncStorage.getItem(key);
        const lista = raw ? JSON.parse(raw) : [];
        setOcultos(new Set(Array.isArray(lista) ? lista : []));
      } catch {
        setOcultos(new Set());
      }
    })();
  }, []);

  const estaOculto = useCallback((item) => ocultos.has(claveDe(item)), [ocultos]);

  const ocultar = useCallback(async (item) => {
    const nuevo = new Set(ocultos);
    nuevo.add(claveDe(item));
    setOcultos(nuevo);
    if (storageKey) await AsyncStorage.setItem(storageKey, JSON.stringify([...nuevo]));
  }, [ocultos, storageKey]);

  const mostrar = useCallback(async (item) => {
    const nuevo = new Set(ocultos);
    nuevo.delete(claveDe(item));
    setOcultos(nuevo);
    if (storageKey) await AsyncStorage.setItem(storageKey, JSON.stringify([...nuevo]));
  }, [ocultos, storageKey]);

  return { ocultos, estaOculto, ocultar, mostrar };
}
