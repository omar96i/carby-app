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

export const CARRERA_ESTADOS = {
  pendiente: { label: "Buscando conductor", interno: "to_pickup" },
  aceptado: { label: "Conductor aceptó el arrendamiento", interno: "to_pickup" },
  llegado: { label: "Conductor llegó donde el usuario", interno: "arrived" },
  activo: { label: "En camino al lugar de llegada", interno: "to_destination" },
  completado: { label: "Arrendamiento completado", interno: "finished" },
  cancelado: { label: "Arrendamiento cancelado", interno: "canceled" },
};

export const getTripState = (estado) => {
  if (!estado) return "to_pickup";
  const e = estado.toLowerCase();
  if (e === "pendiente") return "to_pickup";
  if (e === "aceptado") return "to_pickup";
  if (e === "llegado") return "arrived";
  if (e === "activo") return "to_destination";
  if (e === "completado") return "finished";
  if (e === "cancelado") return "canceled";
  if (e === "finalizado") return "finished";
  if (["iniciado", "en_viaje"].includes(e)) return "to_destination";
  if (["en_camino", "en_curso"].includes(e)) return "to_pickup";
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

export const PEDIDO_ESTADOS = {
  aceptado: { label: "Pedido aceptado", interno: "accepted" },
  en_comercio: { label: "Llegó al comercio", interno: "at_store" },
  recogido: { label: "Pedido recogido · en camino al usuario", interno: "to_customer" },
  completado: { label: "Pedido entregado", interno: "finished" },
  cancelado: { label: "Pedido cancelado", interno: "canceled" },
};

export const getPedidoState = (estado) => {
  if (!estado) return "accepted";
  const e = estado.toLowerCase();
  if (e === "aceptado") return "accepted";
  if (e === "en_comercio") return "at_store";
  if (e === "recogido") return "to_customer";
  if (e === "completado") return "finished";
  if (e === "cancelado") return "canceled";
  if (e === "pendiente") return "accepted";
  return "accepted";
};

export const HEADER_TEXT = {
  to_pickup: { title: "Conductor aceptó · en camino a recoger", sub: "Dirígete al punto de recogida", tone: "#FF5500" },
  arrived: { title: "Llegaste donde el usuario", sub: "Avisa al pasajero que ya estás aquí", tone: "#10B981" },
  to_destination: { title: "En camino al lugar de llegada", sub: "Lleva al pasajero a su destino", tone: "#FF5500" },
  finished: { title: "Arrendamiento completado", sub: "Pago confirmado con PIN", tone: "#10B981" },
  canceled: { title: "Arrendamiento cancelado", sub: "Este servicio fue cancelado", tone: "#FF4757" },
  accepted: { title: "Pedido aceptado", sub: "Dirígete al comercio a recogerlo", tone: "#FF5500" },
  at_store: { title: "Llegaste al comercio", sub: "Recoge el pedido y confirma", tone: "#10B981" },
  to_customer: { title: "Pedido recogido · en camino al usuario", sub: "Entrégalo y confirma con PIN", tone: "#FF5500" },
};
