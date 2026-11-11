import { cotizarPico } from "./pico";
import { cotizarCurva } from "./curva";
import modeloPico from "../../assets/tarifas/modelo-pico.json";
import modeloCurva from "../../assets/tarifas/modelo-curva.json";

export const FORMULA_PRINCIPAL = "PICO";

const fold = (x) =>
  String(x || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function detectarRama(service) {
  if (!service) return "actual";
  const t = fold(service.nombre || "");
  if (t.includes("envio") || t.includes("encomienda") || t.includes("paquete") || t.includes("mensajeria")) return "envios";
  if (t.includes("mototaxi") || t.includes("moto taxi")) return "actual";
  if (t.includes("moto")) return "moto";
  if (t.includes("auto") || t.includes("particular") || t.includes("carro") || t.includes("taxi")) return "carro";
  return "actual";
}

export function hayRuta({ pickupAddress, deliveryAddress, pickupCoord, deliveryCoord, distanceInKm }) {
  return Boolean(
    pickupAddress &&
      pickupAddress.trim() !== "" &&
      deliveryAddress &&
      deliveryAddress.trim() !== "" &&
      pickupCoord &&
      deliveryCoord &&
      distanceInKm &&
      distanceInKm > 0
  );
}

const redondeo100 = (x) => Math.max(0, Math.round(x / 100) * 100);

export function cotizarServicio({
  service,
  km,
  minCon,
  minSin,
  o,
  d,
  lluvia = false,
  ts = Date.now(),
  formula = FORMULA_PRINCIPAL,
  envioVehiculo = "moto",
} = {}) {
  if (!service || !km || km <= 0) return null;
  const rama = detectarRama(service);
  if (rama === "actual") {
    const tarifa = service.tarifa_vigente || null;
    const base = parseFloat(service.precio_base_efectivo ?? tarifa?.precio_base ?? service.precio_base) || 0;
    const perKm = parseFloat(service.precio_km_efectivo ?? tarifa?.precio_km ?? service.precio_km) || 0;
    const additional = parseFloat(service.precio_adicional_efectivo ?? tarifa?.precio_adicional ?? service.precio_adicional) || 0;
    const precio = Math.round(Math.max(base + Math.max(0, km) * perKm + additional, 5));
    return { precio, rama, detalle: { formula: "BASE", base, perKm, additional } };
  }
  const vehiculo = rama === "envios" ? (envioVehiculo === "carro" ? "carro" : "moto") : rama;
  const viaje = {
    km,
    min: minCon && minCon > 0 ? minCon : minSin && minSin > 0 ? minSin : Math.round(km * 2.5),
    trafico: minCon && minSin && minSin > 0 ? Math.min(Math.max(minCon / minSin, 0.6), 2.5) : 1,
    ts,
    o,
    d,
    lluvia: Boolean(lluvia),
  };
  const modelo = formula === "CURVA" ? modeloCurva : modeloPico;
  const cotizar = formula === "CURVA" ? cotizarCurva : cotizarPico;
  const r = cotizar({ modelo, viaje, vehiculo });
  if (rama === "envios") {
    const tarifa = service.tarifa_vigente || null;
    const additional = parseFloat(service.precio_adicional_efectivo ?? tarifa?.precio_adicional ?? service.precio_adicional) || 0;
    const precio = Math.max(redondeo100(r.precio + additional), r.precio);
    return { precio, rama, detalle: { ...r.detalle, formula, envioVehiculo: vehiculo, adicional: additional } };
  }
  return { precio: r.precio, rama, detalle: { ...r.detalle, formula } };
}
