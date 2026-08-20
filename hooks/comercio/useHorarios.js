import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import logger from "../../utils/logger";

const DIAS = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
];

const emptyDay = (d) => ({ dia: d.key, hora_apertura: "08:00", hora_cierre: "20:00", activo: false });
const emptyHorarios = () => DIAS.map(emptyDay);

export default function useHorarios() {
  const [horarios, setHorarios] = useState(emptyHorarios());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchHorarios = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await fetch(`${BASE_URL}comercio/horarios`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      if (data && data.status && Array.isArray(data.data) && data.data.length > 0) {
        const map = new Map(data.data.map((h) => [h.dia, h]));
        setHorarios(DIAS.map((d) => map.get(d.key) || emptyDay(d)));
      }
    } catch (e) {
      logger.error("HORARIOS", "fetch", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveHorarios = useCallback(async (lista) => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const body = {
        horarios: lista.map(({ dia, hora_apertura, hora_cierre, activo }) => ({
          dia,
          hora_apertura,
          hora_cierre,
          activo,
        })),
      };
      const res = await fetch(`${BASE_URL}comercio/horarios`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return data && data.status === true;
    } catch (e) {
      logger.error("HORARIOS", "save", e);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { horarios, setHorarios, loading, saving, fetchHorarios, saveHorarios };
}
