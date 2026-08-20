import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../../constants/url";

export const useUserPing = (enabled) => {
  const intervalRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const sendLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setPermissionDenied(true);
          return;
        }
        setPermissionDenied(false);

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocation(coords);

        const token = await AsyncStorage.getItem("userToken");
        if (!token) return;

        await fetch(`${BASE_URL}carreras/ubicacion`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            latitud: coords.latitude,
            longitud: coords.longitude,
            estado: "activo",
          }),
        });
      } catch (e) {
        console.error("Error enviando ubicación del usuario:", e);
      }
    };

    sendLocation();
    intervalRef.current = setInterval(sendLocation, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled]);

  return { location, permissionDenied };
};
