import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../constants/url";

const ACTIVE_STATES = ["pendiente", "aceptado", "activo", "iniciado", "en_camino", "en_viaje", "llegado"];

export const fetchActiveCarrera = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return null;

    const response = await fetch(`${BASE_URL}carreras/usuario`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const carreras = Array.isArray(data) ? data : data?.data || [];

    const activa = carreras.find((c) => {
      const estado = (c.estado || "").toLowerCase();
      const esCarreraIndependiente = !c.pedido_id && !c.pedido?.id;
      return ACTIVE_STATES.includes(estado) && esCarreraIndependiente;
    });

    return activa || null;
  } catch (error) {
    console.error("Error verificando carrera activa:", error);
    return null;
  }
};
