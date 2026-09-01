import { useState, useEffect } from "react";
import { GOOGLE_MAPS_API_KEY } from "../../../../constants/Keys";
import { decodePolyline } from "../utils";

export const useRoute = (origin, destination) => {
  const [routeCoords, setRouteCoords] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    if (!origin || !destination) {
      setRouteCoords([]);
      setDistance(null);
      setDuration(null);
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
          const leg = data.routes[0].legs?.[0];
          if (leg) {
            setDistance(leg.distance?.value != null ? leg.distance.value / 1000 : null);
            setDuration(leg.duration?.value != null ? Math.round(leg.duration.value / 60) : null);
          }
        }
      } catch (e) {
        console.error("Error fetching route:", e);
      }
    };

    fetchRoute();
  }, [origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude]);

  return { coords: routeCoords, distance, duration };
};
