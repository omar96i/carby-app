import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../../constants/url";

export const useDriverPing = (enabled) => {
  const intervalRef = useRef(null);

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
        if (status !== "granted") return;

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const token = await AsyncStorage.getItem("userToken");
        if (!token) return;

        await fetch(`${BASE_URL}carreras/ubicacion`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
            estado: "activo",
          }),
        });
      } catch (e) {
        console.error("Error enviando ping del conductor:", e);
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
};
