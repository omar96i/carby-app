import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../../constants/url";

export const useDriverLocation = (conductorId) => {
  const [driverLocation, setDriverLocation] = useState(null);

  useEffect(() => {
    if (!conductorId) return;

    let intervalId;

    const fetchDriverLocation = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const response = await fetch(`${BASE_URL}ubicacion-conductor/${conductorId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await response.json();
        if (json.status && json.data) {
          const { latitud, longitud } = json.data;
          setDriverLocation({
            latitude: parseFloat(latitud),
            longitude: parseFloat(longitud),
          });
        }
      } catch (e) {
        console.log("Error fetching driver location (silent):", e);
      }
    };

    fetchDriverLocation();
    intervalId = setInterval(fetchDriverLocation, 5000);

    return () => clearInterval(intervalId);
  }, [conductorId]);

  return driverLocation;
};
