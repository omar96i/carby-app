import { useState, useEffect, useRef } from "react";
import { BASE_URL } from "../../../../constants/url";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const usePassengerLocation = (userId, enabled) => {
  const [location, setLocation] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!enabled || !userId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const fetchLocation = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return;

        const response = await fetch(`${BASE_URL}carreras/ubicacion/${userId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });

        if (!response.ok) return;
        const data = await response.json();
        if (data?.status && data.data) {
          setLocation({
            latitude: parseFloat(data.data.latitud),
            longitude: parseFloat(data.data.longitud),
          });
        }
      } catch (e) {
        console.error("Error obteniendo ubicación del pasajero:", e);
      }
    };

    fetchLocation();
    intervalRef.current = setInterval(fetchLocation, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [userId, enabled]);

  return location;
};
