import { BASE_URL } from "../../../constants/url";

export const STORAGE_BASE = BASE_URL.toString().replace("/api", "");

export const parseCoords = (value) => {
  if (!value) return null;
  try {
    const p = typeof value === "string" ? JSON.parse(value) : value;
    if (typeof p.lat !== "undefined" && typeof p.lng !== "undefined") {
      return { latitude: parseFloat(p.lat), longitude: parseFloat(p.lng) };
    }
    if (typeof p.latitude !== "undefined" && typeof p.longitude !== "undefined") {
      return { latitude: parseFloat(p.latitude), longitude: parseFloat(p.longitude) };
    }
    if (Array.isArray(p) && p.length >= 2) {
      return { latitude: parseFloat(p[0]), longitude: parseFloat(p[1]) };
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${STORAGE_BASE}storage/${path}`;
};

export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "$0";
  const num = typeof value === "string" ? parseFloat(value.replace(/\./g, "").replace(",", ".")) : parseFloat(value);
  if (isNaN(num)) return "$0";
  return "$" + Math.round(num).toLocaleString("es-CO");
};

export const getTripState = (estado) => {
  if (!estado) return "to_pickup";
  const e = estado.toLowerCase();
  if (["completado", "finalizado"].includes(e)) return "finished";
  if (["activo", "iniciado", "en_viaje"].includes(e)) return "to_destination";
  if (e === "llegado") return "arrived";
  return "to_pickup";
};

export const formatPaymentMethod = (metodo) => {
  if (!metodo) return "Efectivo";
  const m = String(metodo).toLowerCase().trim();
  if (m === "nequi" || m.includes("nequi")) return "Nequi";
  if (m === "bancolombia" || m.includes("bancolombia")) return "Bancolombia";
  if (m === "efectivo" || m.includes("efectivo")) return "Efectivo";
  if (m.includes("mercadopago") || m.includes("mercado")) return "Mercado Pago";
  if (m.includes("transferencia")) return "Transferencia";
  if (m === "qr") return "QR";
  if (m === "tarjeta" || m.includes("tarjeta")) return "Tarjeta";
  return metodo.length > 14 ? metodo.slice(0, 12) + "…" : metodo;
};

export const getVehicleIcon = (tipoUsuario) => {
  switch (tipoUsuario) {
    case "rider.taxi":
      return "car-side";
    case "rider.moto":
      return "motorbike";
    case "rider.mototaxi":
      return "rickshaw";
    default:
      return "motorbike";
  }
};

export const HEADER_TEXT = {
  to_pickup: { title: "En camino a recoger", sub: "Dirígete al punto de recogida", tone: "#FF5500" },
  arrived: { title: "Llegaste al punto de recogida", sub: "Avisa al pasajero que ya estás aquí", tone: "#10B981" },
  to_destination: { title: "En viaje al destino", sub: "Lleva al pasajero a su destino", tone: "#FF5500" },
  finished: { title: "Carrera finalizada", sub: "Pago confirmado con PIN", tone: "#10B981" },
};
