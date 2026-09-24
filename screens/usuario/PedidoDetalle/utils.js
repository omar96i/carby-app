import { BASE_URL } from "../../../constants/url";

export const STORAGE_BASE = BASE_URL.toString().replace("/api", "");

export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${STORAGE_BASE}/storage/${path}`;
};

export const formatCurrency = (value) => {
  if (value == null || value === "") return "$0";
  const num = typeof value === "string" ? parseFloat(value.replace(/\./g, "").replace(",", ".")) : parseFloat(value);
  if (isNaN(num)) return "$0";
  return "$" + Math.round(num).toLocaleString("es-CO");
};

export const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
};

export const ORDER_STEPS = [
  { key: "pendiente", label: "Pendiente", desc: "Esperando que el comercio acepte" },
  { key: "aceptado", label: "Aceptado", desc: "El comercio aceptó tu pedido" },
  { key: "confirmado", label: "Confirmado", desc: "Pedido confirmado" },
  { key: "preparado", label: "Preparado", desc: "El comercio prepara tu pedido" },
  { key: "completado", label: "Listo", desc: "Pedido listo · buscando repartidor" },
  { key: "en_comercio", label: "En comercio", desc: "El repartidor llegó al comercio" },
  { key: "recogido", label: "En camino", desc: "Tu pedido va en camino" },
  { key: "entregado", label: "Entregado", desc: "Pedido entregado" },
];

export const getCurrentStepKey = (pedido) => {
  if (!pedido) return "pendiente";
  const estado = (pedido.estado || "").toLowerCase();
  const carreraEstado = (pedido.carrera?.estado || "").toLowerCase();

  if (estado === "cancelado") return "cancelado";
  if (estado === "entregado" || carreraEstado === "completado") return "entregado";
  if (carreraEstado === "recogido") return "recogido";
  if (carreraEstado === "en_comercio") return "en_comercio";
  if (carreraEstado === "aceptado" || carreraEstado === "en_camino" || carreraEstado === "activo") return "completado";
  if (estado === "completado") return "completado";
  if (estado === "preparado") return "preparado";
  if (estado === "confirmado") return "confirmado";
  if (estado === "aceptado") return "aceptado";
  return "pendiente";
};

export const getStepLabel = (key) => {
  const step = ORDER_STEPS.find((s) => s.key === key);
  return step ? step.label : key;
};

export const getStepDesc = (key) => {
  const step = ORDER_STEPS.find((s) => s.key === key);
  return step ? step.desc : "";
};

export const HEADER_TEXT = {
  pendiente: { title: "Pedido pendiente", sub: "Esperando que el comercio acepte", tone: "#F59E0B" },
  aceptado: { title: "Pedido aceptado", sub: "El comercio preparará tu orden", tone: "#FF5500" },
  confirmado: { title: "Pedido confirmado", sub: "El comercio lo está preparando", tone: "#FF5500" },
  preparado: { title: "Pedido en preparación", sub: "La cocina está trabajando", tone: "#FF5500" },
  completado: { title: "Listo para reparto", sub: "Buscando repartidor cercano", tone: "#3B82F6" },
  en_comercio: { title: "Repartidor en el comercio", sub: "Están recogiendo tu pedido", tone: "#3B82F6" },
  recogido: { title: "Pedido en camino", sub: "Tu repartidor va hacia ti", tone: "#10B981" },
  entregado: { title: "Entregado", sub: "Pedido entregado correctamente", tone: "#10B981" },
  cancelado: { title: "Pedido cancelado", sub: "Este pedido fue cancelado", tone: "#EF4444" },
};

export const metodoPagoLabel = (metodo) => {
  if (!metodo) return "Efectivo";
  const m = String(metodo).toLowerCase();
  if (m.includes("nequi") || m.includes("bancolombia")) return "Nequi";
  if (m.includes("mercadopago") || m.includes("mercado")) return "Mercado Pago";
  if (m.includes("transferencia")) return "Transferencia";
  if (m === "qr") return "QR";
  if (m === "tarjeta") return "Tarjeta";
  if (m === "efectivo") return "Efectivo";
  return metodo.length > 12 ? `${metodo.slice(0, 10)}…` : metodo;
};

export const parseJSON = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch (e) { return {}; }
};

export const calculateProductsTotal = (pedidoLists) => {
  if (!pedidoLists || !Array.isArray(pedidoLists)) return 0;
  return pedidoLists.reduce((total, prod) => {
    const precioBase = parseFloat(prod.producto?.precio || prod.precio_unitario || prod.precio || 0);
    const cantidad = parseInt(prod.cantidad || 1);

    const adicionales = prod.adicionales || prod.pedido_list_adicionals || [];
    const precioAdicionales = adicionales.reduce((acc, ad) => {
      const p = parseFloat(ad.producto_adicional?.precio || ad.precio || 0);
      return acc + p * parseInt(ad.cantidad || 1);
    }, 0);

    return total + (precioBase + precioAdicionales) * cantidad;
  }, 0);
};

export const calculateDeliveryCost = (pedido) => parseFloat(pedido?.costo_envio || 0);

export const calculateDiscount = (pedido) => {
  const productsTotal = calculateProductsTotal(pedido?.pedido_lists);
  const costoTotal = parseFloat(pedido?.costo_total || 0);
  return Math.max(0, productsTotal - costoTotal);
};

export const getOrderCoords = (pedido) => {
  const datos = parseJSON(pedido?.datos_generales);
  const start = {
    latitude: parseFloat(datos?.start_latitud || 0),
    longitude: parseFloat(datos?.start_longitud || 0),
  };
  const end = {
    latitude: parseFloat(datos?.end_latitud || 0),
    longitude: parseFloat(datos?.end_longitud || 0),
  };
  if (!start.latitude || !start.longitude) return null;
  return { start, end, startAddress: datos?.start_lugar || "", endAddress: datos?.end_lugar || "" };
};

export const getValidCoords = (coords) => {
  if (!coords) return null;
  const lat = parseFloat(coords.latitude || coords.lat || 0);
  const lng = parseFloat(coords.longitude || coords.lng || coords.longitud || 0);
  if (!lat || !lng) return null;
  return { latitude: lat, longitude: lng };
};
