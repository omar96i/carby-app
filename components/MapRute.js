import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions, Image, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Importar la API key desde el archivo Keys
import { GOOGLE_MAPS_API_KEY } from '../constants/Keys';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const MapRute = ({ puntoA, puntoB, coordenadasA, coordenadasB, tipo }) => {
  const [region, setRegion] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [motorcyclePosition, setMotorcyclePosition] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [distancia, setDistancia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Nuevos estados para persistencia
  const [animationStarted, setAnimationStarted] = useState(false);
  const [routeStartTime, setRouteStartTime] = useState(null);
  const [routeTotalDuration, setRouteTotalDuration] = useState(null);
  
  const mapRef = useRef(null);
  const timerRef = useRef(null);
  const progressRef = useRef(0);

  // Clave única para almacenamiento en AsyncStorage
  const getStorageKey = () => {
    if (coordenadasA && coordenadasB) {
      return `route_${coordenadasA.lat}_${coordenadasA.lng}_${coordenadasB.lat}_${coordenadasB.lng}`;
    }
    return null;
  };

  // Guardar información de ruta para persistencia
  const saveRouteInfo = async (data) => {
    try {
      const key = getStorageKey();
      if (key) {
        await AsyncStorage.setItem(key, JSON.stringify(data));
        console.log('Datos de ruta guardados');
      }
    } catch (e) {
      console.error('Error guardando datos de ruta:', e);
    }
  };

  // Cargar información de ruta guardada
  const loadRouteInfo = async () => {
    try {
      const key = getStorageKey();
      if (key) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          return JSON.parse(data);
        }
      }
    } catch (e) {
      console.error('Error cargando datos de ruta:', e);
    }
    return null;
  };

  // Configurar la región inicial cuando se obtienen las coordenadas
  useEffect(() => {
    const initializeMap = async () => {
      if (coordenadasA && coordenadasB && 
          typeof coordenadasA.lat === 'number' && 
          typeof coordenadasA.lng === 'number' &&
          typeof coordenadasB.lat === 'number' && 
          typeof coordenadasB.lng === 'number') {
        
        // Calcular el centro entre los dos puntos
        const midLat = (coordenadasA.lat + coordenadasB.lat) / 2;
        const midLng = (coordenadasA.lng + coordenadasB.lng) / 2;
        
        // Calcular un delta apropiado que muestre ambos puntos
        const latDelta = Math.abs(coordenadasA.lat - coordenadasB.lat) * 1.5;
        const lngDelta = Math.abs(coordenadasA.lng - coordenadasB.lng) * 1.5;
        
        setRegion({
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: Math.max(latDelta, 0.01),
          longitudeDelta: Math.max(lngDelta, 0.01),
        });
        
        // Verificar si ya hay datos de ruta guardados
        const savedRouteInfo = await loadRouteInfo();
        
        if (savedRouteInfo && 
            savedRouteInfo.routeCoordinates && 
            savedRouteInfo.routeStartTime && 
            savedRouteInfo.routeTotalDuration) {
          
          console.log('Cargando ruta guardada');
          
          // Restaurar datos guardados
          setRouteCoordinates(savedRouteInfo.routeCoordinates);
          setEstimatedTime(savedRouteInfo.estimatedTime);
          setDistancia(savedRouteInfo.distancia);
          setRouteStartTime(new Date(savedRouteInfo.routeStartTime));
          setRouteTotalDuration(savedRouteInfo.routeTotalDuration);
          setAnimationStarted(true);
          
          // Calcular posición actual basada en tiempo transcurrido
          calculateCurrentPosition(
            savedRouteInfo.routeCoordinates,
            new Date(savedRouteInfo.routeStartTime),
            savedRouteInfo.routeTotalDuration
          );
          
          setLoading(false);
        } else {
          // Si no hay datos guardados, iniciar normalmente
          setMotorcyclePosition({
            latitude: coordenadasA.lat,
            longitude: coordenadasA.lng,
          });
          
          // Obtener nueva ruta
          fetchRoute(coordenadasA, coordenadasB);
        }
      } else {
        setError('Coordenadas inválidas o incompletas');
        setLoading(false);
      }
    };

    initializeMap();
  }, [coordenadasA, coordenadasB]);

  // Calcular posición actual de la moto basada en tiempo transcurrido
  const calculateCurrentPosition = (coordinates, startTime, totalDuration) => {
    if (!coordinates || coordinates.length < 2 || !startTime || !totalDuration) {
      return;
    }
    
    // Calcular tiempo transcurrido desde inicio
    const now = new Date();
    const elapsedMs = now - startTime;
    
    // Calcular progreso (0 a 1)
    let progress = Math.min(elapsedMs / totalDuration, 1);
    progressRef.current = progress;
    
    console.log(`Progreso basado en tiempo: ${Math.round(progress * 100)}%`);
    
    // Si la ruta ya se completó
    if (progress >= 1) {
      setMotorcyclePosition({
        latitude: coordinates[coordinates.length - 1].latitude,
        longitude: coordinates[coordinates.length - 1].longitude
      });
      return;
    }
    
    // Calcular posición actual en ruta
    const index = Math.floor(progress * (coordinates.length - 1));
    const nextIndex = Math.min(index + 1, coordinates.length - 1);
    
    const remainingFraction = progress * (coordinates.length - 1) - index;
    
    // Interpolación lineal entre puntos
    const currentPosition = {
      latitude: coordinates[index].latitude + (coordinates[nextIndex].latitude - coordinates[index].latitude) * remainingFraction,
      longitude: coordinates[index].longitude + (coordinates[nextIndex].longitude - coordinates[index].longitude) * remainingFraction
    };
    
    setMotorcyclePosition(currentPosition);
    
    // Si aún no ha llegado, continuar la animación desde este punto
    if (progress < 1 && !timerRef.current) {
      continueAnimation(coordinates, progress, totalDuration);
    }
  };

  // Continuar animación desde un punto específico
  const continueAnimation = (coordinates, currentProgress, totalDuration) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Calcular tiempo restante
    const remainingDuration = totalDuration * (1 - currentProgress);
    const updateInterval = 100;
    const incrementPerStep = updateInterval / remainingDuration;
    
    console.log(`Continuando animación: ${Math.round((1 - currentProgress) * 100)}% restante`);
    
    timerRef.current = setInterval(() => {
      progressRef.current += incrementPerStep;
      
      if (progressRef.current >= 1) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        return;
      }
      
      // Calcular posición actual en ruta
      const index = Math.floor(progressRef.current * (coordinates.length - 1));
      const nextIndex = Math.min(index + 1, coordinates.length - 1);
      
      const remainingFraction = progressRef.current * (coordinates.length - 1) - index;
      
      // Interpolación lineal entre puntos
      const currentPosition = {
        latitude: coordinates[index].latitude + (coordinates[nextIndex].latitude - coordinates[index].latitude) * remainingFraction,
        longitude: coordinates[index].longitude + (coordinates[nextIndex].longitude - coordinates[index].longitude) * remainingFraction
      };
      
      setMotorcyclePosition(currentPosition);
    }, updateInterval);
  };

  // Función para obtener la ruta entre dos puntos usando la API de Directions de Google
  const fetchRoute = async (start, end) => {
    try {
      // Usar la API key que ya has habilitado con Directions API
      const API_KEY_TEMPORAL = 'AIzaSyA5Q7U5qVt_NbzZ5z5vBJv7ECTsGZ9-chM';
      
      const origin = `${start.lat},${start.lng}`;
      const destination = `${end.lat},${end.lng}`;
      
      console.log(`Solicitando ruta desde ${origin} hasta ${destination}`);
      
      // Añadir parámetro alternatives=true para obtener rutas alternativas si están disponibles
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&alternatives=true&key=${API_KEY_TEMPORAL}`
      );
      
      const json = await response.json();
      console.log('Respuesta API status:', json.status);
      
      if (json.status !== 'OK') {
        console.log('Error de API:', json.status, json.error_message);
        useSimpleRoute(start, end);
        return;
      }
      
      // Verificar que tenemos rutas y extraer la polyline
      if (!json.routes || json.routes.length === 0) {
        console.log('No hay rutas disponibles');
        useSimpleRoute(start, end);
        return;
      }
      
      // Decodificar la polyline para obtener las coordenadas de la ruta
      const points = json.routes[0].overview_polyline.points;
      const decodedPoints = decodePolyline(points);
      
      console.log(`Puntos en la ruta decodificada: ${decodedPoints.length}`);
      
      // Si tenemos al menos 2 puntos, usamos la ruta
      if (decodedPoints.length >= 2) {
        setRouteCoordinates(decodedPoints);
        
        // Obtener tiempo estimado y distancia
        const route = json.routes[0].legs[0];
        setEstimatedTime(route.duration.text);
        setDistancia(route.distance.text);
        
        // Iniciar la animación de la moto
        startMotorcycleAnimation(decodedPoints, route.duration.text);
      } else {
        console.log('Muy pocos puntos en la ruta');
        useSimpleRoute(start, end);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error obteniendo la ruta:', err);
      useSimpleRoute(start, end);
    }
  };

  // Función de respaldo para crear una ruta lineal simple
  const useSimpleRoute = (start, end) => {
    // Crear una ruta lineal directa entre los puntos A y B
    const simplePath = [
      { latitude: start.lat, longitude: start.lng },
      { latitude: end.lat, longitude: end.lng }
    ];
    
    setRouteCoordinates(simplePath);
    
    // Calcular distancia aproximada en km
    const distance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
    const distanciaText = `${distance.toFixed(1)} km`;
    setDistancia(distanciaText);
    
    // Estimar tiempo (velocidad aproximada: 30 km/h)
    const timeInMinutes = Math.round((distance / 30) * 60);
    const estimatedTimeText = `${timeInMinutes} min`;
    setEstimatedTime(estimatedTimeText);
    
    // Iniciar la animación de la moto
    startMotorcycleAnimation(simplePath, estimatedTimeText);
    
    setLoading(false);
  };
  
  // Función para calcular distancia entre coordenadas (fórmula Haversine)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c;
    return distance;
  };

  // Función para decodificar la polyline de Google Maps
  const decodePolyline = (encoded) => {
    const points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5
      });
    }
    
    return points;
  };

  // Función para animar la moto a lo largo de la ruta
  const startMotorcycleAnimation = (coordinates, timeEstimation) => {
    // Si ya se inició la animación, no iniciar de nuevo
    if (animationStarted) {
      return;
    }
    
    // Limpiar cualquier timer anterior
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    progressRef.current = 0;
    
    // Convertir el tiempo estimado a minutos para cálculos
    let durationMinutes = 10; // Valor predeterminado de 10 minutos
    
    if (timeEstimation) {
      // Parsear el tiempo estimado (ej: "15 mins" o "1 hora 20 mins")
      const timeString = timeEstimation.toLowerCase();
      
      // Extraer horas si existen
      const hoursMatch = timeString.match(/(\d+)\s*hora/);
      const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
      
      // Extraer minutos
      const minutesMatch = timeString.match(/(\d+)\s*min/);
      const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
      
      // Convertir a minutos totales
      durationMinutes = (hours * 60) + minutes;
      if (durationMinutes === 0) durationMinutes = 10; // Si falló el parseo, usar 10 min
    }
    
    // Tiempo deseado para la animación (doble del tiempo estimado, en ms)
    const animationDuration = durationMinutes * 2 * 60 * 1000;
    
    // Guardar tiempo de inicio y duración para persistencia
    const startTime = new Date();
    setRouteStartTime(startTime);
    setRouteTotalDuration(animationDuration);
    setAnimationStarted(true);
    
    // Guardar datos para persistencia
    saveRouteInfo({
      routeCoordinates: coordinates,
      estimatedTime: timeEstimation || estimatedTime,
      distancia: distancia,
      routeStartTime: startTime.toISOString(),
      routeTotalDuration: animationDuration
    });
    
    // La frecuencia de actualización (cada 100ms)
    const updateInterval = 100;
    
    // Calcular incremento para cada paso
    const incrementPerStep = updateInterval / animationDuration;
    
    console.log(`Animando moto: tiempo estimado ${durationMinutes} min, duración animación ${animationDuration/1000} seg`);
    
    // Actualizar la posición de la moto
    timerRef.current = setInterval(() => {
      progressRef.current += incrementPerStep;
      
      if (progressRef.current >= 1) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        return;
      }
      
      // Calcular la posición actual en la ruta
      const index = Math.floor(progressRef.current * (coordinates.length - 1));
      const nextIndex = Math.min(index + 1, coordinates.length - 1);
      
      const remainingFraction = progressRef.current * (coordinates.length - 1) - index;
      
      // Interpolación lineal entre dos puntos
      const currentPosition = {
        latitude: coordinates[index].latitude + (coordinates[nextIndex].latitude - coordinates[index].latitude) * remainingFraction,
        longitude: coordinates[index].longitude + (coordinates[nextIndex].longitude - coordinates[index].longitude) * remainingFraction
      };
      
      setMotorcyclePosition(currentPosition);
    }, updateInterval);
  };

  // Limpiar el timer cuando el componente se desmonta
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Función para hacer zoom in
  const zoomIn = () => {
    if (mapRef.current && region) {
      const newRegion = {
        ...region,
        latitudeDelta: region.latitudeDelta / 2,
        longitudeDelta: region.longitudeDelta / 2,
      };
      mapRef.current.animateToRegion(newRegion, 300);
      setRegion(newRegion);
    }
  };

  // Función para hacer zoom out
  const zoomOut = () => {
    if (mapRef.current && region) {
      const newRegion = {
        ...region,
        latitudeDelta: region.latitudeDelta * 2,
        longitudeDelta: region.longitudeDelta * 2,
      };
      mapRef.current.animateToRegion(newRegion, 300);
      setRegion(newRegion);
    }
  };

  // Función para centrar el mapa en ambos puntos
  const centerMap = () => {
    if (mapRef.current && coordenadasA && coordenadasB) {
      const midLat = (coordenadasA.lat + coordenadasB.lat) / 2;
      const midLng = (coordenadasA.lng + coordenadasB.lng) / 2;
      
      // Calcular un delta apropiado que muestre ambos puntos
      const latDelta = Math.abs(coordenadasA.lat - coordenadasB.lat) * 1.5;
      const lngDelta = Math.abs(coordenadasA.lng - coordenadasB.lng) * 1.5;
      
      const newRegion = {
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: Math.max(latDelta, 0.01),
        longitudeDelta: Math.max(lngDelta, 0.01),
      };
      
      mapRef.current.animateToRegion(newRegion, 300);
      setRegion(newRegion);
    }
  };

  if (loading && !error) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
      >
        {/* Marcador del punto A */}
        {coordenadasA && (
          <Marker
            coordinate={{
              latitude: coordenadasA.lat,
              longitude: coordenadasA.lng
            }}
            title="Punto A"
            description={puntoA}
            pinColor="#4285F4" // Color azul de Google
          />
        )}
        
        {/* Marcador del punto B */}
        {coordenadasB && (
          <Marker
            coordinate={{
              latitude: coordenadasB.lat,
              longitude: coordenadasB.lng
            }}
            title="Punto B"
            description={puntoB}
            pinColor="#EA4335" // Color rojo de Google
          />
        )}
        
        {/* Dibujar la ruta */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={4}
            strokeColor="#1E88E5"
          />
        )}
        
        {/* Marcador de la moto */}
        {motorcyclePosition && (
          <Marker
            coordinate={motorcyclePosition}
            title="En camino"
            description={`Tiempo estimado: ${estimatedTime || 'Calculando...'}`}
          >
            <Image
              source={require('../assets/images/rider.png')} // Asegúrate de tener esta imagen
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </Marker>
        )}
      </MapView>
      
      {/* Controles de zoom */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomButton} onPress={zoomIn}>
          <FontAwesome name="plus" size={20} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={zoomOut}>
          <FontAwesome name="minus" size={20} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={centerMap}>
          <FontAwesome name="crosshairs" size={16} color="#333" />
        </TouchableOpacity>
      </View>
      
      {/* Información de tiempo y distancia */}
      {estimatedTime && distancia && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Información del trayecto</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tiempo estimado:</Text>
            <Text style={styles.infoValue}>{estimatedTime}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Distancia:</Text>
            <Text style={styles.infoValue}>{distancia}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default MapRute;

const styles = StyleSheet.create({
  container: {
    height: 300,
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 140,
    fontSize: 16,
    color: '#888',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 140,
    fontSize: 16,
    color: 'red',
  },
  infoCard: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 8,
  },
  infoTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  infoLabel: {
    fontWeight: '500',
  },
  infoValue: {
    color: '#1E7D22',
    fontWeight: '600',
  },
  zoomControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  zoomButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
});