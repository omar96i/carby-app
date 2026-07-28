import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import logger from "../../utils/logger";

export default function useReservas() {
  const [reservas, setReservas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [perfiles, setPerfiles] = useState([]);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(null);

  async function fetchPerfiles() {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");
      const userId = userData ? JSON.parse(userData).id : null;
      if (!userId || !token) return;

      const res = await fetch(`${BASE_URL}user-perfil/by-user/${userId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      const data = await res.json();
      const arr = (data.data && Array.isArray(data.data)) ? data.data : [];
      const lista = arr.map((p) => ({ id: p.id, nombre: p.nombre || "Perfil" }));
      setPerfiles(lista);
      logger.summary("PERFILES", `${lista.length} perfiles`);
      return lista;
    } catch (e) {
      logger.error("PERFILES", "Error", e);
      return [];
    }
  }

  async function fetchReservas(perfilId) {
    if (!perfilId) return;
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;

      const url = `${BASE_URL}reservas/perfil/${perfilId}`;
      logger.request("GET", url);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];

      const formateadas = arr.map((r) => ({
        ...r,
        costo_total: r.costo_total || 0,
        cliente_nombre: r.user_perfil?.user?.nombre_completo || "Cliente",
        cliente_telefono: r.user_perfil?.user?.numero_telefono || "",
        servicio_nombre: r.user_perfil?.nombre || perfilSeleccionado || "Perfil",
        servicio_descripcion: r.user_perfil?.descripcion || "",
        fecha_formateada: new Date(r.fecha).toLocaleDateString("es-ES", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        }),
        hora_inicio_formateada: r.hora_inicio?.slice(0, 5) || "",
        hora_fin_formateada: r.hora_fin?.slice(0, 5) || "",
      }));

      logger.response("RESERVAS", res.status, `${formateadas.length} items`);
      setReservas(formateadas);
    } catch (e) {
      logger.error("RESERVAS", "Error", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function aceptarReserva(id) {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) throw new Error("No se encontró token");
    const url = `${BASE_URL}reservas/${id}`;
    logger.request("POST", url, { estado: "completado" });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ estado: "completado" }),
    });
    if (!res.ok) throw new Error("Error al confirmar reserva");
    return res.json();
  }

  return {
    reservas,
    isLoading,
    perfiles,
    perfilSeleccionado,
    setPerfilSeleccionado,
    fetchPerfiles,
    fetchReservas,
    aceptarReserva,
  };
}
