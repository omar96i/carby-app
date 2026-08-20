import { useState, useEffect } from "react";
import { GOOGLE_MAPS_API_KEY } from "../../../../constants/Keys";
import { decodePolyline } from "../utils";

export const useRoute = (origin, destination) => {
  const [routeCoords, setRouteCoords] = useState([]);

  useEffect(() => {
    if (!origin || !destination) {
      setRouteCoords([]);
      return;
    }

    const fetchRoute = async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.routes && data.routes.length > 0) {
          const points = data.routes[0].overview_polyline.points;
          setRouteCoords(decodePolyline(points));
        }
      } catch (e) {
        console.error("Error fetching route:", e);
      }
    };

    fetchRoute();
  }, [origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude]);

  return routeCoords;
};
