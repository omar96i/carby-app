import { BASE_URL } from "../../constants/url";

export const formatPrice = (price) => {
  return `$ ${parseFloat(price || 0).toLocaleString("es-CO")}`;
};

export const parseInfo = (info) => {
  if (!info) return {};
  if (typeof info === "string") {
    try {
      return JSON.parse(info);
    } catch (e) {
      return {};
    }
  }
  return info;
};

export const parseCoords = (coords) => {
  if (!coords) return null;
  if (typeof coords === "string") {
    try {
      return JSON.parse(coords);
    } catch (e) {
      return null;
    }
  }
  return coords;
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};

export const getServiceIconUrl = (icono) => {
  if (!icono) return null;
  return icono.startsWith("http")
    ? icono
    : `${BASE_URL.toString().replace("/api", "")}storage/${icono}`;
};

export const getUserPhotoUrl = (usuario) => {
  if (!usuario) return null;
  const raw = usuario.foto_documento_file || usuario.foto;
  if (!raw) return null;
  if (String(raw).startsWith("http")) return raw;
  return `${BASE_URL.toString().replace("/api", "")}storage/${raw}`;
};

export const getCommerceImageUrl = (comercio) => {
  if (!comercio) return null;
  const raw = comercio.foto_documento_file;
  if (!raw) return null;
  if (String(raw).startsWith("http")) return raw;
  return `${BASE_URL.toString().replace("/api", "")}storage/${raw}`;
};

const buildStorageUrl = (raw) => {
  if (!raw) return null;
  if (String(raw).startsWith("http")) return raw;
  return `${BASE_URL.toString().replace("/api", "")}storage/${raw}`;
};

export const getProductImageUrl = (producto) => buildStorageUrl(producto?.foto);

export const getAdicionalImageUrl = (adicional) => buildStorageUrl(adicional?.file);

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
