/**
 * Helpers compartidos — diseño + formatos + mapeos
 */

// ── Tokens de diseño ──────────────────────────────
export const COLORS = {
  brand: "#fa6205",
  brandSoft: "#FDEEE2",
  ink: "#1C1C1E",
  surface: "#FFFFFF",
  bg: "#F4F4F5",
  zinc50: "#FAFAFA",
  zinc100: "#F4F4F5",
  zinc200: "#E4E4E7",
  zinc400: "#A1A1AA",
  zinc500: "#71717A",
  zinc600: "#52525B",
  muted: "#71717A",
  amber50: "#FFFBEB",
  amber500: "#F59E0B",
  amber700: "#B45309",
  emerald50: "#ECFDF5",
  emerald500: "#10B981",
  emerald700: "#047857",
  red50: "#FEF2F2",
  red500: "#EF4444",
  red600: "#DC2626",
  indigo50: "#EEF2FF",
  indigo500: "#6366F1",
  indigo700: "#4338CA",
};

export const RADIUS = {
  card: 26,
  sheetTop: 32,
  section: 16,
  button: 20,
  pill: 999,
  iconTile: 16,
};

export const SHADOWS = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 4,
  },
  sheet: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -30 },
    shadowOpacity: 0.06,
    shadowRadius: 60,
    elevation: 2,
  },
  ctaDark: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 10,
  },
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};

// ── Formatos ──────────────────────────────────────
export function formatCOP(value) {
  if (value == null) return "$0";
  return "$" + Number(value).toLocaleString("es-CO");
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

export function formatDateShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Estado → estilo ───────────────────────────────
export const STATUS_STYLES = {
  pendiente:   { bg: "#FFFBEB", text: "#B45309", dot: "#F59E0B", pulse: true },
  aceptado:    { bg: "#FDEEE2", text: "#fa6205", dot: "#fa6205", pulse: true },
  activo:      { bg: "#ECFDF5", text: "#047857", dot: "#10B981", pulse: true },
  completado:  { bg: "#F4F4F5", text: "#52525B", dot: "#A1A1AA", pulse: false },
  entregado:   { bg: "#F4F4F5", text: "#52525B", dot: "#A1A1AA", pulse: false },
  cancelado:   { bg: "#FEF2F2", text: "#DC2626", dot: "#EF4444", pulse: false },
  confirmado:  { bg: "#FDEEE2", text: "#fa6205", dot: "#fa6205", pulse: false },
  programado:  { bg: "#EEF2FF", text: "#4338CA", dot: "#6366F1", pulse: false },
};

export const STATUS_LABELS = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  activo: "En curso",
  completado: "Completado",
  entregado: "Entregado",
  cancelado: "Cancelado",
  confirmado: "Confirmado",
  programado: "Programado",
};

export const PEDIDO_LABELS = {
  pendiente: "Esperando confirmación",
  aceptado: "Confirmado",
  completado: "Listo para reparto",
  cancelado: "Cancelado",
  en_reparto: "En reparto",
};

export const CARRERA_LABELS = {
  pendiente: "Buscando conductor",
  aceptado: "Conductor asignado",
  activo: "En curso",
  completado: "Completado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function obtenerLabelEstado(estado, tipo) {
  if (tipo === "carrera") return CARRERA_LABELS[estado] || estado || "Pendiente";
  if (tipo === "pedido") return PEDIDO_LABELS[estado] || estado || "Pendiente";
  return STATUS_LABELS[estado] || estado || "Pendiente";
}

// ── Método de pago → label ────────────────────────
export function metodoPagoLabel(metodo) {
  switch (metodo) {
    case "mercadopago": return "MERCADO PAGO";
    case "qr": return "QR";
    default: return "EFECTIVO";
  }
}

// ── Vehículo → icono ──────────────────────────────
export const VEHICULOS = {
  Moto: { icon: "motorcycle", set: "material-community" },
  Taxi: { icon: "car", set: "material-community" },
  Envíos: { icon: "package-variant-closed", set: "material-community" },
  Mototaxi: { icon: "motorbike", set: "material-community" },
  Particular: { icon: "car-sports", set: "material-community" },
};
