import { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../../constants/url";

export function usePedido(pedidoId, initialData = null) {
  const [pedido, setPedido] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [driverMessageCount, setDriverMessageCount] = useState(0);
  const previousStatusRef = useRef((initialData?.estado || "").toLowerCase());
  const previousCarreraStatusRef = useRef((initialData?.carrera?.estado || "").toLowerCase());

  const fetchPedido = useCallback(async () => {
    if (!pedidoId) return;
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("No hay token");

      const response = await fetch(`${BASE_URL}pedidos/${pedidoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Error ${response.status}`);

      const data = await response.json();
      const newPedido = data.pedido || data;
      setPedido(newPedido);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [pedidoId]);

  useEffect(() => {
    if (!pedidoId) return;
    if (!initialData) {
      setLoading(true);
      fetchPedido().finally(() => setLoading(false));
    }

    const interval = setInterval(async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const response = await fetch(`${BASE_URL}pedidos/${pedidoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        const newPedido = data.pedido || data;
        if (!newPedido) return;
        setPedido(newPedido);
      } catch (e) { /* noop */ }
    }, 10000);

    return () => clearInterval(interval);
  }, [pedidoId, initialData, fetchPedido]);

  const cancelar = useCallback(async () => {
    if (!pedidoId) throw new Error("No hay pedido");
    const token = await AsyncStorage.getItem("userToken");

    // Cancelar pedido
    await fetch(`${BASE_URL}pedidos/update/aux/${pedidoId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "cancelado" }),
    });

    // Cancelar carrera asociada si existe
    const carreraId = pedido?.carrera?.id;
    if (carreraId) {
      await fetch(`${BASE_URL}carreras/${carreraId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "cancelado" }),
      });
    }

    await fetchPedido();
  }, [pedidoId, pedido, fetchPedido]);

  // Polling silencioso de mensajes con el repartidor (carrera-chat de la carrera del pedido)
  const carreraId = pedido?.carrera?.id;
  useEffect(() => {
    if (!carreraId) {
      setDriverMessageCount(0);
      return;
    }
    let alive = true;
    const poll = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const response = await fetch(`${BASE_URL}carrera-chat/${carreraId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        const list = data?.data || [];
        if (alive) setDriverMessageCount(list.length);
      } catch (e) { /* noop */ }
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [carreraId]);

  return { pedido, loading, error, refetch: fetchPedido, cancelar, driverMessageCount, previousStatusRef, previousCarreraStatusRef };
}
