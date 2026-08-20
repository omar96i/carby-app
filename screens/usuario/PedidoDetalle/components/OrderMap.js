import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export const OrderMap = ({
  mapRef,
  restaurant,
  destination,
  userLocation,
  driverLocation,
  route,
}) => {
  const localMapRef = useRef(null);
  const map = mapRef || localMapRef;
  const driverPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(driverPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(driverPulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!map.current) return;
    const markers = [];
    if (restaurant) markers.push(restaurant);
    if (destination) markers.push(destination);
    if (userLocation) markers.push(userLocation);
    if (driverLocation) markers.push(driverLocation);
    if (markers.length < 2) return;

    map.current.fitToCoordinates(markers, {
      edgePadding: { top: 160, right: 50, bottom: 260, left: 50 },
      animated: true,
    });
  }, [restaurant, destination, userLocation, driverLocation]);

  const initialRegion = restaurant || destination || { latitude: 4.60971, longitude: -74.08175 };

  return (
    <MapView
      ref={map}
      provider={PROVIDER_GOOGLE}
      style={StyleSheet.absoluteFillObject}
      initialRegion={{
        latitude: initialRegion.latitude,
        longitude: initialRegion.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      showsUserLocation={false}
      showsMyLocationButton={false}
    >
      {restaurant && (
        <Marker coordinate={restaurant} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.storeMarker}>
            <MaterialCommunityIcons name="store" size={16} color="#FFFFFF" />
          </View>
        </Marker>
      )}

      {destination && (
        <Marker coordinate={destination} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.destMarkerBox}>
            <Svg width={30} height={30} viewBox="0 0 30 30">
              <Path
                d="M15 2 C21 2 26 7 26 13 C26 17 21 22 15 30 C9 22 4 17 4 13 C4 7 9 2 15 2 Z"
                fill="#FF5500"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <SvgText x="15" y="17" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontFamily="MontserratBold">
                B
              </SvgText>
            </Svg>
            <View style={styles.destMarkerShadow} />
          </View>
        </Marker>
      )}

      {userLocation && (
        <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }} zIndex={10}>
          <View style={styles.userMarker}>
            <MaterialCommunityIcons name="account" size={16} color="#FFF" />
          </View>
        </Marker>
      )}

      {driverLocation && (
        <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }} zIndex={10}>
          <Animated.View
            style={[
              styles.driverPulse,
              {
                transform: [
                  {
                    scale: driverPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.6],
                    }),
                  },
                ],
                opacity: driverPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 0],
                }),
              },
            ]}
          />
          <View style={styles.driverMarker}>
            <MaterialCommunityIcons name="motorbike" size={16} color="#FFF" />
          </View>
        </Marker>
      )}

      {route && route.length > 0 && (
        <>
          <Polyline coordinates={route} strokeWidth={6} strokeColor="rgba(255,85,0,0.15)" />
          <Polyline coordinates={route} strokeWidth={3} strokeColor="#FF5500" />
        </>
      )}
    </MapView>
  );
};

const styles = StyleSheet.create({
  storeMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#10B981",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  destMarkerBox: {
    width: 38,
    height: 42,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  destMarkerShadow: {
    width: 10,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,85,0,0.35)",
    marginTop: 2,
  },
  userMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#3B82F6",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  driverPulse: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FF5500",
  },
  driverMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FF5500",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
});
