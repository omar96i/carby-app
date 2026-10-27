import { useEffect, useState } from "react";
import { BASE_URL } from "../constants/url";

let cache = null;
let pendiente = null;

const cargar = () => {
  if (!pendiente) {
    pendiente = fetch(`${BASE_URL}vehicle-types`, { method: "GET", headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const lista = data?.status && Array.isArray(data.vehicle_types) ? data.vehicle_types : [];
        cache = Object.fromEntries(lista.map((t) => [String(t.id), t]));
        return cache;
      })
      .catch(() => {
        pendiente = null;
        return {};
      });
  }
  return pendiente;
};

export default function useTiposVehiculo() {
  const [tipos, setTipos] = useState(cache || {});
  useEffect(() => {
    if (cache) return;
    let vivo = true;
    cargar().then((t) => { if (vivo) setTipos(t || {}); });
    return () => { vivo = false; };
  }, []);
  return tipos;
}
