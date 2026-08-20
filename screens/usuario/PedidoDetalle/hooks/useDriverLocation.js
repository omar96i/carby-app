import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../../constants/url";

export const useDriverLocation = (driverId, enabled) => {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    if (!enabled || !driverId) return;

    const fetchLocation = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const response = await fetch(`${BASE_URL}carreras/ubicacion/${driverId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => ({}));
        if (data.status && data.data) {
          setLocation({
            latitude: parseFloat(data.data.latitud),
            longitude: parseFloat(data.data.longitud),
          });
        }
      } catch (e) {
        console.error("Error obteniendo ubicación del conductor:", e);
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 10000);
    return () => clearInterval(interval);
  }, [driverId, enabled]);

  return location;
};
