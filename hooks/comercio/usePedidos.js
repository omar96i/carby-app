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
    usuario: p.user || p.usuario || null,
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
    archivo_evidencia: p.archivo_evidencia || null,
  };
}

export default function usePedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [filteredPedidos, setFilteredPedidos] = useState([]);
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

      const urlActivas = `${BASE_URL}comercio/mis-activos`;
      const urlHistorial = `${BASE_URL}comercio/mi-historial`;

      logger.request("GET", urlActivas);
      logger.request("GET", urlHistorial);

      const [resActivas, resHistorial] = await Promise.all([
        fetch(urlActivas, { method: "GET", headers }),
        fetch(urlHistorial, { method: "GET", headers }),
      ]);

      const dataActivas = resActivas.ok ? await resActivas.json() : { pedidos: [], carreras: [] };
      const dataHistorial = resHistorial.ok ? await resHistorial.json() : { pedidos: [], carreras: [] };

      const allActivos = (dataActivas.pedidos || []).map(normalizePedido);
      const allHistorial = (dataHistorial.pedidos || []).map(normalizePedido);

      setCountActivas(allActivos.length);
      setCountHistorial(allHistorial.length);

      const items = tab === "activas" ? allActivos : allHistorial;

      logger.response("COMERCIO ACTIVOS", resActivas.status, `${allActivos.length} pedidos`);
      logger.response("COMERCIO HISTORIAL", resHistorial.status, `${allHistorial.length} pedidos`);
      logger.summary(tab === "activas" ? "ACTIVOS" : "HISTORIAL", `mostrando: ${items.length}`);

      items.forEach((item, i) => {
        logger.response(`ITEM_${i + 1}`, "-", {
          id: item.id,
          estado: item.estado,
          costo_total: item.costo_total,
          metodo_pago: item.metodo_pago,
          tiene_carrera: !!item.carrera,
        });
      });

      setPedidos(items);
      setFilteredPedidos(items);
    } catch (err) {
      logger.error("FETCH", "Error fetching comercio pedidos", err);
      setError(err.message || "Error al cargar pedidos");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  async function aceptarPedido(id) {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) throw new Error("No se encontró token");
    const url = `${BASE_URL}pedidos/update/aux/${id}`;
    logger.request("POST", url, { estado: "aceptado", estado_pago: "pendiente" });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ estado: "aceptado", estado_pago: "pendiente" }),
    });
    if (!res.ok) throw new Error("Error al aceptar el pedido");
    return res.json();
  }

  async function crearCarrera(pedido) {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) throw new Error("No se encontró token");

    const userDataStr = await AsyncStorage.getItem("userData");
    const userData = userDataStr ? JSON.parse(userDataStr) : {};
    const userId = userData.id || pedido.usuario?.id || pedido.user_id || null;

    const rc = pedido.routeCoords || {};
    const startLugar = pedido.start_lugar || pedido.origen || "";
    const endLugar = pedido.end_lugar || pedido.destino || "";

    logger.summary("CREAR_CARRERA", `pedido: ${pedido.id}, user: ${userId}, coords: ${rc.originLat},${rc.originLng} -> ${rc.destLat},${rc.destLng}`);

    const payload = {
      usuario_id: userId,
      conductor_id: null,
      pedido_id: pedido.id,
      punto_recogida: JSON.stringify({ lat: rc.originLat || 0, lng: rc.originLng || 0 }),
      destino: JSON.stringify({ lat: rc.destLat || 0, lng: rc.destLng || 0 }),
      costo: "0.00",
      distancia: 0,
      estado: "pendiente",
      informacion_adicional: JSON.stringify({
        origen: startLugar,
        destino: endLugar,
      }),
    };

    logger.request("POST", `${BASE_URL}carreras`, payload);

    const res = await fetch(`${BASE_URL}carreras`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    logger.response("CREAR_CARRERA", res.status, text.slice(0, 300));

    if (!res.ok) throw new Error(`Error ${res.status}: ${text}`);

    // Actualizar pedido a completado
    const updateRes = await fetch(`${BASE_URL}pedidos/update/aux/${pedido.id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ estado: "completado", estado_pago: "pagado" }),
    });

    logger.response("UPDATE_PEDIDO", updateRes.status, `pedido ${pedido.id} → completado`);

    return JSON.parse(text);
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
    countActivas,
    countHistorial,
    fetchPedidos,
    onRefresh,
    setFilteredPedidos,
    aceptarPedido,
    crearCarrera,
  };
}
