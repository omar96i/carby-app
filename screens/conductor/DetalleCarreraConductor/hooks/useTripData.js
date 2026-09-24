import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../../constants/url";

export const useTripData = (tripId, pause = false) => {
  const [tripData, setTripData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTripData = useCallback(async () => {
    if (!tripId) {
      setIsLoading(false);
      setError("ID de viaje no válido");
      return;
    }
    setError(null);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("No se encontró sesión");

      const response = await fetch(`${BASE_URL}carreras/${tripId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Error obteniendo viaje");
      const responseData = await response.json();
      const data = responseData.data || responseData;
      setTripData(data);
    } catch (err) {
      setError(err.message || "Error cargando viaje");
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTripData();
  }, [fetchTripData]);

  useEffect(() => {
    if (!tripId) return;
    const interval = setInterval(() => {
      if (pause) return;
      fetchTripData();
    }, 5000);
    return () => clearInterval(interval);
  }, [tripId, fetchTripData, pause]);

  return { tripData, isLoading, error, refetch: fetchTripData };
};
