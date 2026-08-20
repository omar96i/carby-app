import { BASE_URL } from "../../../constants/url";

export const STORAGE_BASE = BASE_URL.toString().replace("/api", "");

export const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json", "User-Agent": "YaRidersApp" } }
    );
    if (!response.ok) throw new Error("Error en geocodificación");
    const data = await response.json();
    return data.display_name
      ? data.display_name.length > 60
        ? data.display_name.substring(0, 60) + "..."
        : data.display_name
      : `${lat}, ${lng}`;
  } catch (error) {
    return `${lat}, ${lng}`;
  }
};

export const decodePolyline = (encoded) => {
  const points = [];
  let index = 0,
    lat = 0,
    lng = 0;
  while (index < encoded.length) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
};

export const parseCoords = (value) => {
  if (!value) return null;
  try {
    const p = typeof value === "string" ? JSON.parse(value) : value;
    if (Array.isArray(p) && p.length >= 2) {
      return { latitude: parseFloat(p[0]), longitude: parseFloat(p[1]) };
    }
    if (p && typeof p.lat !== "undefined" && typeof p.lng !== "undefined") {
      return { latitude: parseFloat(p.lat), longitude: parseFloat(p.lng) };
    }
    if (p && typeof p.latitude !== "undefined" && typeof p.longitude !== "undefined") {
      return { latitude: parseFloat(p.latitude), longitude: parseFloat(p.longitude) };
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const formatDistance = (value) => {
  if (value === null || value === undefined || value === "") return "0 km";
  const num = typeof value === "string" ? parseFloat(value.replace(/\./g, "").replace(",", ".")) : parseFloat(value);
  if (isNaN(num)) return "0 km";
  if (num < 1) return `${Math.round(num * 1000)} m`;
  return `${num.toFixed(1)} km`;
};

export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "$0";
  const num = typeof value === "string" ? parseFloat(value.replace(/\./g, "").replace(",", ".")) : parseFloat(value);
  if (isNaN(num)) return "$0";
  return "$" + Math.round(num).toLocaleString("es-CO");
};

export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${STORAGE_BASE}storage/${path}`;
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

export const getRideState = (estado, conductor) => {
  if (!estado) return "searching";
  const e = estado.toLowerCase();
  if (e === "completado" || e === "finalizado") return "finished";
  if (e === "cancelado") return "canceled";
  if (e === "en_viaje" || e === "en camino" || e === "activo" || e === "iniciado") return "ontrip";
  if (e === "llegado" || e === "arrived") return "arrived";
  if (conductor && conductor.id) return "onway";
  return "searching";
};

export const STATES = [
  { key: "searching", label: "Buscando" },
  { key: "onway", label: "En camino" },
  { key: "arrived", label: "Llegó" },
  { key: "ontrip", label: "En viaje" },
  { key: "finished", label: "Fin" },
];

export const HEADER_TEXT = {
  searching: { title: "Buscando conductor", sub: "Conectando con conductores cercanos...", tone: "#FF5500" },
  onway: { title: "Conductor en camino", sub: "Llega en unos minutos · mantente atento", tone: "#FF5500" },
  arrived: { title: "Tu conductor llegó", sub: "Te espera en el punto de recogida", tone: "#10B981" },
  ontrip: { title: "En viaje a tu destino", sub: "", tone: "#FF5500" },
  finished: { title: "Viaje finalizado", sub: "¡Gracias por viajar con CarBy!", tone: "#10B981" },
};
