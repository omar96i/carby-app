import React from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import useTiposVehiculo from "../hooks/useTiposVehiculo";

const sinTildes = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function iconoDeCategoria(nombre) {
  const n = sinTildes(nombre);
  if (!n) return null;
  if (n.includes("grua")) return "tow-truck";
  if (n.includes("mototaxi") || n.includes("moto taxi")) return "rickshaw";
  if (n.includes("moto")) return "motorbike";
  if (n.includes("deluxe") || n.includes("lujo") || n.includes("premium") || n.includes("vip")) return "car-sports";
  if (n.includes("taxi")) return "taxi";
  if (n.includes("envio") || n.includes("delivery") || n.includes("domicilio") || n.includes("paquete")) return "package-variant-closed";
  if (n.includes("camion") || n.includes("carga") || n.includes("acarreo")) return "truck";
  if (n.includes("bici")) return "bicycle";
  if (n.includes("particular") || n.includes("carro") || n.includes("auto") || n.includes("camioneta")) return "car-side";
  return null;
}

const ICONO_CONDUCTOR = { "rider.moto": "motorbike", "rider.taxi": "car-side", "rider.mototaxi": "rickshaw" };

export function nombreCategoriaViaje(item, tiposPorId) {
  return item?.categoria_nombre || tiposPorId?.[String(item?.vehicle_type_id)]?.nombre || null;
}

export default function IconoVehiculo({ item, tipoConductor, size = 22, color = "#fa6205", fallback = "car-sport" }) {
  const tipos = useTiposVehiculo();
  const icono = iconoDeCategoria(nombreCategoriaViaje(item, tipos)) || ICONO_CONDUCTOR[tipoConductor] || null;
  if (icono) return <MaterialCommunityIcons name={icono} size={size + 2} color={color} />;
  return <Ionicons name={fallback} size={size} color={color} />;
}
