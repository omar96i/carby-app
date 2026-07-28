import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import logger from "../../utils/logger";

function parseJSON(maybe) {
  if (!maybe) return {};
  if (typeof maybe === "object") return maybe;
  try { return JSON.parse(maybe); } catch (e) { return {}; }
}

function normalizePedido(p) {
  const dg = parseJSON(p.datos_generales);
  const conductorFromCarrera = p.carrera?.conductor || null;

  return {
    id: p.id,
    es_carrera: false,
    estado: p.estado,
    costo_total: p.costo_total || 0,
    metodo_pago: p.metodo_pago || "efectivo",
    created_at: p.created_at,
    comercio: p.comercio || null,
    pedido_lists: (p.items || []).map((item) => ({
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
    start_lugar: dg.start_lugar || "Establecimiento",
    end_lugar: dg.end_lugar || "",
    origen: dg.start_lugar || "",
    destino: dg.end_lugar || "",
    routeCoords: {
      originLat: parseFloat(dg.start_latitud) || 0,
      originLng: parseFloat(dg.start_longitud) || 0,
      destLat: parseFloat(dg.end_latitud) || 0,
      destLng: parseFloat(dg.end_longitud) || 0,
    },
    tipo_viaje: p.tipo_viaje || null,
    carrera: p.carrera || null,
    conductor: conductorFromCarrera
      ? {
          name: conductorFromCarrera.nombre_completo || "Conductor",
          photo: conductorFromCarrera.foto || null,
          rating: conductorFromCarrera.puntuacion || null,
          vehicle: conductorFromCarrera.tipo_vehiculo || "",
          plate: conductorFromCarrera.placa || "",
          phone: conductorFromCarrera.numero_telefono || "",
          eta: conductorFromCarrera.eta || null,
        }
      : null,
    puntuacion_restaurante: p.puntuacion_restaurante || null,
    comentario_restaurante: p.comentario_restaurante || null,
  };
}

function normalizeCarrera(c) {
  const info = parseJSON(c.informacion_adicional);
  const conductor = c.conductor || {};

  return {
    id: c.id,
    es_carrera: true,
    es_conductor: false,
    estado: c.estado,
    costo_total: parseFloat(c.costo || 0),
    metodo_pago: c.metodo_pago || info.metododepago || "efectivo",
    created_at: c.created_at,
    start_lugar: info.origen || "",
    end_lugar: info.destino || "",
    origen: info.origen || "",
    destino: info.destino || "",
    observaciones: info.observaciones || "",
    tipo_viaje: c.tipo_viaje || "Estándar",
    conductor: {
      name: conductor.nombre_completo || "Conductor",
      photo: conductor.foto || null,
      rating: conductor.puntuacion || null,
      vehicle: conductor.tipo_vehiculo || "",
      plate: conductor.placa || "",
      phone: conductor.numero_telefono || "",
      eta: conductor.eta || null,
    },
    usuario: c.usuario ? { nombre_completo: c.usuario.nombre_completo || "" } : null,
    pedido_lists: undefined,
    comercio: null,
    punto_recogida: c.punto_recogida || null,
    destino_coords: c.destino || null,
    distancia: c.distancia || null,
    pin: c.pin || null,
  };
}

export default function usePedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [filteredPedidos, setFilteredPedidos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mostrarCarrerasUsuario, setMostrarCarrerasUsuario] = useState(false);
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

      const urlActivas = `${BASE_URL}mis-activos`;
      const urlHistorial = `${BASE_URL}mi-historial`;

      logger.request("GET", urlActivas);
      logger.request("GET", urlHistorial);

      const [resActivas, resHistorial] = await Promise.all([
        fetch(urlActivas, { method: "GET", headers }),
        fetch(urlHistorial, { method: "GET", headers }),
      ]);

      const dataActivas = resActivas.ok ? await resActivas.json() : { pedidos: [], carreras: [] };
      const dataHistorial = resHistorial.ok ? await resHistorial.json() : { pedidos: [], carreras: [] };

      const activosPedidos = (dataActivas.pedidos || []).map(normalizePedido);
      const activosCarreras = (dataActivas.carreras || []).map(normalizeCarrera);
      const historialPedidos = (dataHistorial.pedidos || []).map(normalizePedido);
      const historialCarreras = (dataHistorial.carreras || []).map(normalizeCarrera);

      const allActivos = [...activosPedidos, ...activosCarreras];
      const allHistorial = [...historialPedidos, ...historialCarreras];

      setCountActivas(allActivos.length);
      setCountHistorial(allHistorial.length);

      const items = tab === "activas" ? allActivos : allHistorial;

      logger.response("ACTIVOS", resActivas.status, `pedidos: ${activosPedidos.length} | carreras: ${activosCarreras.length}`);
      logger.response("HISTORIAL", resHistorial.status, `pedidos: ${historialPedidos.length} | carreras: ${historialCarreras.length}`);
      logger.summary(tab === "activas" ? "ACTIVOS" : "HISTORIAL", `mostrando: ${items.length} (activas: ${allActivos.length}, historial: ${allHistorial.length})`);

      items.forEach((item, i) => {
        logger.response(`ITEM_${i + 1}`, "-", {
          id: item.id,
          es_carrera: item.es_carrera,
          estado: item.estado,
          costo_total: item.costo_total,
          metodo_pago: item.metodo_pago,
        });
      });

      setPedidos(items);
      setFilteredPedidos(items);
      setMostrarCarrerasUsuario((tab === "activas" ? activosCarreras : historialCarreras).length > 0);
    } catch (err) {
      logger.error("FETCH", "Error fetching pedidos", err);
      setError(err.message || "Error al cargar pedidos");
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
    pedidos,
    filteredPedidos,
    isLoading,
    error,
    refreshing,
    mostrarCarrerasUsuario,
    countActivas,
    countHistorial,
    fetchPedidos,
    onRefresh,
    setFilteredPedidos,
  };
}
