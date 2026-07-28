import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import logger from "../../utils/logger";

export default function useReservas() {
  const [reservas, setReservas] = useState([]);
  const [filteredReservas, setFilteredReservas] = useState([]);
  const [isLoadingReservas, setIsLoadingReservas] = useState(false);

  const filtrarReservas = useCallback((lista, mode = "activas") => {
    if (!Array.isArray(lista)) return [];
    const finalStates = ["completado", "cancelado"];
    if (mode === "activas") {
      return lista.filter((r) => !finalStates.includes(r.estado));
    }
    return lista.filter((r) => finalStates.includes(r.estado));
  }, []);

  const fetchReservas = useCallback(async () => {
    setIsLoadingReservas(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const userId = (await AsyncStorage.getItem("userId"));
      if (!userId) return;
      const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const endpoint = `${BASE_URL}reservas/usuario/${userId}`;
      logger.request("GET", endpoint);
      const response = await fetch(endpoint, { method: "GET", headers });
      const data = await response.json();
      const reservasArray = Array.isArray(data) ? data : [];

      logger.response("RESERVAS", response.status, reservasArray.length + " items");

      // Log key fields per item
      reservasArray.forEach((r, i) => {
        logger.response(`RESERVA_${i + 1}`, "-", {
          id: r.id,
          estado: r.estado,
          costo_total: r.costo_total,
          metodo_pago: r.metodo_pago,
          fecha: r.fecha,
          hora_inicio: r.hora_inicio,
          hora_fin: r.hora_fin,
          tipo_reserva: r.tipo_reserva,
          perfil: r.user_perfil?.nombre || null,
        });
      });

      const formateadas = reservasArray.map((reserva) => ({
        ...reserva,
        costo_total: reserva.costo_total || 0,
        cliente_nombre: reserva.user_perfil?.user?.nombre_completo || "Cliente",
        cliente_telefono: reserva.user_perfil?.user?.numero_telefono || "",
        servicio_nombre: reserva.user_perfil?.nombre || "Servicio",
        servicio_descripcion: reserva.user_perfil?.descripcion || "",
        servicio_imagen: reserva.user_perfil?.file || null,
        fecha_formateada: new Date(reserva.fecha).toLocaleDateString("es-ES", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        }),
        hora_inicio_formateada: reserva.hora_inicio?.slice(0, 5) || "",
        hora_fin_formateada: reserva.hora_fin?.slice(0, 5) || "",
      }));

      setReservas(formateadas);
    } catch (error) {
      console.error("Error al obtener reservas:", error);
    } finally {
      setIsLoadingReservas(false);
    }
  }, []);

  return {
    reservas,
    filteredReservas,
    isLoadingReservas,
    fetchReservas,
    setFilteredReservas,
    filtrarReservas,
  };
}
