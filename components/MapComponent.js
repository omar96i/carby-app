import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Text, Alert, Linking, Platform, TouchableOpacity } from "react-native";
import MapView, { PROVIDER_GOOGLE, Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import { isDevice } from 'expo-device';
import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "../constants/url";

const MapComponent = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accuracy, setAccuracy] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const mapRef = useRef(null);
  const [userId, setUserId] = useState(null);
  const locationSendIntervalRef = useRef(null);

  // Obtener el ID del usuario al cargar el componente
  useEffect(() => {
    const getUserId = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsedData = JSON.parse(userData);
          setUserId(parsedData.id || parsedData.data?.id);
        }
      } catch (error) {
        console.error("Error obteniendo userData:", error);
      }
    };
    
    getUserId();
  }, []);

  // Función para enviar la ubicación al servidor
  const sendLocationToServer = async (lat, lng) => {
    if (!userId || !lat || !lng) {
      console.warn("No se puede enviar ubicación: falta userId o coordenadas");
      return false;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.warn("No se encontró token de autenticación");
        return false;
      }

      // Preparar datos para la API
      const locationData = {
        user_id: userId,
        latitud: lat,
        longitud: lng,
        estado: "activo"
      };

      console.log("Enviando ubicación al servidor:", locationData);

      // Realizar la petición al API
      const response = await fetch(`${BASE_URL}localizacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(locationData)
      });

      // Verificar respuesta
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error al enviar ubicación (${response.status}):`, errorText);
        return false;
      }

      const result = await response.json();
      console.log("Ubicación actualizada correctamente:", result);
      return true;
    } catch (error) {
      console.error("Error enviando ubicación al servidor:", error);
      return false;
    }
  };

  // Validate coordinates to prevent crashes
  const areValidCoordinates = (coords) => {
    return coords && 
           !isNaN(coords.latitude) && 
           !isNaN(coords.longitude) && 
           isFinite(coords.latitude) && 
           isFinite(coords.longitude) &&
           coords.latitude >= -90 && 
           coords.latitude <= 90 && 
           coords.longitude >= -180 && 
           coords.longitude <= 180;
  };

  const getCurrentLocation = async (checkMounted = true) => {
    try {
      // Don't continue if component is unmounted and check is enabled
      if (checkMounted && !isMounted) return false;

      // For physical devices, check GPS services
      if (isDevice) {
        const isGPSEnabled = await Location.hasServicesEnabledAsync();
        if (!isGPSEnabled) {
          if (!checkMounted || isMounted) {
            Alert.alert(
              "GPS Desactivado",
              "Por favor, activa el GPS para obtener tu ubicación actual.",
              [{ text: "Abrir configuración", onPress: () => Linking.openSettings() }]
            );
            setError("Los servicios de ubicación están desactivados.");
            setLoading(false);
          }
          return false;
        }
      }

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!checkMounted || isMounted) {
          Alert.alert(
            "Permiso Requerido", 
            "Esta app necesita acceso a tu ubicación para funcionar correctamente.",
            [{ text: "Abrir configuración", onPress: () => Linking.openSettings() }]
          );
          setError("Permiso de ubicación denegado.");
          setLoading(false);
        }
        return false;
      }

      // Try to get current location with more balanced settings
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000
      });

      if (!checkMounted || isMounted) {
        // Validate coordinates
        if (!areValidCoordinates(locationResult.coords)) {
          console.warn("Invalid coordinates received:", locationResult.coords);
          setError("Coordenadas de ubicación inválidas.");
          setLoading(false);
          return false;
        }

        const newLocation = {
          latitude: locationResult.coords.latitude,
          longitude: locationResult.coords.longitude,
        };
        
        setLocation(newLocation);
        setAccuracy(locationResult.coords.accuracy || 30);
        
        // Enviar ubicación al servidor si tenemos userId
        if (userId) {
          await sendLocationToServer(newLocation.latitude, newLocation.longitude);
        }
        
        // Center the map if ready
        if (mapRef.current && mapReady) {
          try {
            mapRef.current.animateToRegion({
              ...newLocation,
              latitudeDelta: 0.0025,
              longitudeDelta: 0.0025,
            }, 500);
          } catch (animationError) {
            console.warn("Error animating map:", animationError);
            // Continue without animation
          }
        }
        
        return true;
      }
    } catch (locationError) {
      console.warn("Error obtaining location:", locationError);
      
      if (!checkMounted || isMounted) {
        setError("No se pudo obtener tu ubicación actual. Verifica que el GPS esté activado.");
        setLoading(false);
      }
    }
    return false;
  };

  useEffect(() => {
    setIsMounted(true);
    let locationSubscription = null;

    const setupLocationServices = async () => {
      try {
        // Get initial location
        await getCurrentLocation(true);
        
        if (isDevice && isMounted) {
          // Setup location tracking with more balanced settings
          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              distanceInterval: 10,
              timeInterval: 5000,
            },
            (newLocation) => {
              if (isMounted) {
                // Validate coordinates
                if (!areValidCoordinates(newLocation.coords)) {
                  console.warn("Invalid coordinates in location update:", newLocation.coords);
                  return;
                }

                const updatedLocation = {
                  latitude: newLocation.coords.latitude,
                  longitude: newLocation.coords.longitude,
                };
                
                setLocation(updatedLocation);
                setAccuracy(newLocation.coords.accuracy || 30);
                
                // Enviar ubicación al servidor si tenemos userId
                if (userId) {
                  sendLocationToServer(updatedLocation.latitude, updatedLocation.longitude);
                }
                
                // Update map position if ready
                if (mapRef.current && mapReady && isMounted) {
                  try {
                    mapRef.current.animateToRegion({
                      ...updatedLocation,
                      latitudeDelta: 0.0025,
                      longitudeDelta: 0.0025,
                    }, 500);
                  } catch (animError) {
                    console.warn("Error animating map:", animError);
                    // Continue without animation
                  }
                }
              }
            }
          );
        }
        
        // Configurar un intervalo para enviar la ubicación periódicamente
        // incluso si no cambia (cada 30 segundos)
        locationSendIntervalRef.current = setInterval(() => {
          if (location && userId) {
            sendLocationToServer(location.latitude, location.longitude);
          }
        }, 30000); // 30 segundos
      } catch (error) {
        console.error("Error setting up location services:", error);
        if (isMounted) {
          setError("Ocurrió un problema al configurar los servicios de ubicación.");
          setLoading(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    setupLocationServices();

    return () => {
      setIsMounted(false);
      if (locationSubscription) {
        try {
          locationSubscription.remove();
        } catch (error) {
          console.warn("Error removing location subscription:", error);
        }
      }
      
      // Limpiar el intervalo al desmontar el componente
      if (locationSendIntervalRef.current) {
        clearInterval(locationSendIntervalRef.current);
      }
    };
  }, [userId]);

  const handleRefreshLocation = () => {
    setLoading(true);
    setError(null);
    getCurrentLocation(true).then(success => {
      if (isMounted) {
        if (!success) {
          Alert.alert("Error", "No se pudo actualizar tu ubicación. Verifica que el GPS esté activado.");
        }
        setLoading(false);
      }
    }).catch(err => {
      console.error("Error in refresh location:", err);
      if (isMounted) {
        setError("Error al actualizar ubicación");
        setLoading(false);
      }
    });
  };

  const handleMapReady = () => {
    if (isMounted) {
      setMapReady(true);
      
      // Center on location if available when map is ready
      if (location && mapRef.current) {
        try {
          mapRef.current.animateToRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.0025,
            longitudeDelta: 0.0025,
          }, 500);
        } catch (err) {
          console.warn("Error in map ready animation:", err);
        }
      }
    }
  };

  const renderMap = () => {
    // Only show map when we have a valid location
    if (!location) {
      return (
        <View style={[styles.map, styles.centerContent]}>
          <ActivityIndicator size="large" color="#fa6205" />
          <Text style={styles.loadingText}>Obteniendo tu ubicación...</Text>
        </View>
      );
    }
    
    // Verify we have valid coordinates
    if (!areValidCoordinates(location)) {
      return (
        <View style={[styles.map, styles.centerContent]}>
          <Text style={styles.errorText}>Coordenadas inválidas detectadas</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRefreshLocation}
          >
            <Text style={styles.retryText}>Intentar nuevamente</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    try {
      return (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={true}
            showsMyLocationButton={true}
            followsUserLocation={true}
            onMapReady={handleMapReady}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.0025,
              longitudeDelta: 0.0025
            }}
          >
            {/* Precision circle */}
            {location && (
              <Circle
                center={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                radius={accuracy}
                fillColor="rgba(0, 150, 255, 0.2)"
                strokeColor="rgba(0, 150, 255, 0.5)"
                strokeWidth={1}
              />
            )}
            
            {/* Custom marker */}
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="Tu ubicación"
              description="Aquí estás ahora"
              pinColor="#0066ff"
            />
          </MapView>
          
          {/* Refresh button */}
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefreshLocation}
          >
            <FontAwesome name="refresh" size={20} color="#1C1C1E" />
          </TouchableOpacity>
        </>
      );
    } catch (mapError) {
      console.error("Error rendering map:", mapError);
      return (
        <View style={[styles.map, styles.centerContent]}>
          <Text style={styles.errorText}>Error al cargar el mapa</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRefreshLocation}
          >
            <Text style={styles.retryText}>Intentar nuevamente</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.mapContainer, styles.centerContent]}>
        <ActivityIndicator size="large" color="#fa6205" />
        <Text style={styles.loadingText}>Obteniendo tu ubicación...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.mapContainer, styles.centerContent]}>
        <FontAwesome name="map-marker" size={50} color="red" style={{marginBottom: 15}} />
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.helpText}>
          Asegúrate de que los servicios de ubicación estén activados y que hayas concedido permisos a la aplicación.
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRefreshLocation}
        >
          <Text style={styles.retryText}>Intentar nuevamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      {renderMap()}
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
    height: 300,
    width: "100%"
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  helpText: {
    color: "#555",
    textAlign: "center",
    margin: 10,
    fontSize: 14,
  },
  loadingText: {
    marginTop: 10,
    color: "#fa6205",
    fontSize: 16
  },
  retryButton: {
    backgroundColor: "#fa6205",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 15
  },
  retryText: {
    color: "#1C1C1E",
    fontSize: 16
  },
  refreshButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#fa6205',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  }
});

export default MapComponent;