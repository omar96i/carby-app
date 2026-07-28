import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import logger from "../../utils/logger";

function parseJSON(maybe) {
  if (!maybe) return {};
  if (typeof maybe === "object") return maybe;
  try { return JSON.parse(maybe); } catch (e) { return {}; }
}

function normalizeCarrera(c) {
  const recogida = parseJSON(c.punto_recogida);
  const destino = parseJSON(c.destino);
  const info = parseJSON(c.informacion_adicional);
  const pedido = c.pedido || null;

  return {
    id: c.id,
    es_carrera: true,
    es_conductor: true,
    estado: c.estado,
    costo: parseFloat(c.costo || 0),
    costo_total: parseFloat(c.costo || 0),
    distancia: parseFloat(c.distancia || 0),
    pin: c.pin || null,
    created_at: c.created_at,
    metodo_pago: c.metodo_pago || info.metododepago || "efectivo",
    // Pickup/dest addresses
    start_lugar: info.origen || "",
    end_lugar: info.destino || "",
    origen: info.origen || "",
    destino: info.destino || "",
    // Coordinates for map
    routeCoords: {
      originLat: parseFloat(recogida.lat) || 0,
      originLng: parseFloat(recogida.lng) || 0,
      destLat: parseFloat(destino.lat) || 0,
      destLng: parseFloat(destino.lng) || 0,
    },
    punto_recogida: recogida,
    destino_coords: destino,
    // Passenger
    usuario: c.usuario
      ? {
          nombre_completo: c.usuario.nombre_completo || "Cliente",
          telefono: c.usuario.numero_telefono || "",
          ubicacion: c.usuario.ubicacion || null,
        }
      : null,
    // Connductor (self)
    conductor: c.conductor
      ? {
          name: c.conductor.nombre_completo || "",
          phone: c.conductor.numero_telefono || "",
        }
      : null,
    // Nested pedido (if delivery)
    pedido: pedido
      ? {
          id: pedido.id,
          estado: pedido.estado,
          costo_total: pedido.costo_total || 0,
          comercio: pedido.comercio
            ? { establecimiento_nombre: pedido.comercio.establecimiento_nombre || "Comercio" }
            : null,
          items: (pedido.items || []).map((item) => ({
            cantidad: item.cantidad || 0,
            producto: item.producto || {},
            adicionales: (item.adicionals || item.adicionales || []).map((ad) => ({
              cantidad: ad.cantidad || 0,
              producto_adicional: ad.producto_adicional || {},
              precio: ad.producto_adicional?.precio || 0,
              nombre: ad.producto_adicional?.nombre || "",
            })),
            pedido_list_adicionals: (item.adicionals || item.adicionales || []).map((ad) => ({
              cantidad: ad.cantidad || 0,
              producto_adicional: ad.producto_adicional || {},
              precio: ad.producto_adicional?.precio || 0,
              nombre: ad.producto_adicional?.nombre || "",
            })),
          })),
          conductor: pedido.conductor || null,
        }
      : null,
    // For TripCard compatibility
    comercio: pedido?.comercio || null,
    pedido_lists: pedido ? (pedido.items || []).map((item) => ({
      cantidad: item.cantidad || 0,
      producto: item.producto || {},
      adicionales: (item.adicionals || item.adicionales || []).map((ad) => ({
        cantidad: ad.cantidad || 0,
        producto_adicional: ad.producto_adicional || {},
        precio: ad.producto_adicional?.precio || 0,
        nombre: ad.producto_adicional?.nombre || "",
      })),
      pedido_list_adicionals: (item.adicionals || item.adicionales || []).map((ad) => ({
        cantidad: ad.cantidad || 0,
        producto_adicional: ad.producto_adicional || {},
        precio: ad.producto_adicional?.precio || 0,
        nombre: ad.producto_adicional?.nombre || "",
      })),
    })) : undefined,
  };
}

export default function usePedidos() {
  const [carreras, setCarreras] = useState([]);
  const [filteredCarreras, setFilteredCarreras] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [countActivas, setCountActivas] = useState(0);
  const [countHistorial, setCountHistorial] = useState(0);

  async function fetchPedidos(tab) {
    setIsLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const urlActivas = `${BASE_URL}conductor/mis-activos`;
      const urlHistorial = `${BASE_URL}conductor/mi-historial`;

      logger.request("GET", urlActivas);
      logger.request("GET", urlHistorial);

      const [resActivas, resHistorial] = await Promise.all([
        fetch(urlActivas, { method: "GET", headers }),
        fetch(urlHistorial, { method: "GET", headers }),
      ]);

      const dataActivas = resActivas.ok ? await resActivas.json() : [];
      const dataHistorial = resHistorial.ok ? await resHistorial.json() : [];

      const activosArr = (Array.isArray(dataActivas) ? dataActivas : []).map(normalizeCarrera);
      const historialArr = (Array.isArray(dataHistorial) ? dataHistorial : []).map(normalizeCarrera);

      setCountActivas(activosArr.length);
      setCountHistorial(historialArr.length);

      const items = tab === "activas" ? activosArr : historialArr;

      logger.response("CONDUCTOR ACTIVOS", resActivas.status, `${activosArr.length} carreras`);
      logger.response("CONDUCTOR HISTORIAL", resHistorial.status, `${historialArr.length} carreras`);

      items.forEach((item, i) => {
        logger.response(`ITEM_${i + 1}`, "-", {
          id: item.id,
          estado: item.estado,
          costo: item.costo,
          pin: item.pin,
          tiene_pedido: !!item.pedido,
        });
      });

      setCarreras(items);
      setFilteredCarreras(items);
    } catch (err) {
      logger.error("FETCH", "Error conductor", err);
      setError(err.message || "Error al cargar");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh(tab) {
    setRefreshing(true);
    fetchPedidos(tab);
  }

  return {
    carreras,
    filteredCarreras,
    isLoading,
    error,
    refreshing,
    countActivas,
    countHistorial,
    fetchPedidos,
    onRefresh,
    setFilteredCarreras,
  };
}
