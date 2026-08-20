import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getVehicleIcon } from "../utils";

export const RideMap = ({
  pickup,
  destination,
  driverLocation,
  passengerLocation,
  driverType,
  route,
  mapRef,
  state,
}) => {
  const localMapRef = useRef(null);
  const map = mapRef || localMapRef;
  const passengerPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(passengerPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(passengerPulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!map.current) return;
    const markers = [];
    if (driverLocation) markers.push(driverLocation);
    if ((state === "to_pickup" || state === "arrived") && passengerLocation) {
      markers.push(passengerLocation);
    }
    if (pickup) markers.push(pickup);
    if (state === "to_destination" && destination) markers.push(destination);
    if (markers.length < 2) return;

    map.current.fitToCoordinates(markers, {
      edgePadding: { top: 140, right: 60, bottom: 220, left: 60 },
      animated: true,
    });
  }, [pickup, destination, driverLocation, passengerLocation, state]);

  return (
    <MapView
      ref={map}
      provider={PROVIDER_GOOGLE}
      style={StyleSheet.absoluteFillObject}
      initialRegion={{
        latitude: pickup?.latitude || 4.60971,
        longitude: pickup?.longitude || -74.08175,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      showsUserLocation={false}
      showsMyLocationButton={false}
    >
      {pickup && (
        <Marker coordinate={pickup} anchor={{ x: 0.5, y: 0.5 }}>
          <Svg width={32} height={32} viewBox="0 0 30 30">
            <Circle cx="15" cy="15" r="14" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
            <Path
              d="M15 9.5 C16.6 9.5 17.7 10.6 17.7 12 C17.7 13.4 16.6 14.5 15 14.5 C13.4 14.5 12.3 13.4 12.3 12 C12.3 10.6 13.4 9.5 15 9.5 Z M15 15.2 C17.6 15.2 20 16.6 20 20 L10 20 C10 16.6 12.4 15.2 15 15.2 Z"
              fill="#FFFFFF"
            />
          </Svg>
        </Marker>
      )}

      {destination && state === "to_destination" && (
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

      {passengerLocation && (state === "to_pickup" || state === "arrived") && (
        <Marker coordinate={passengerLocation} anchor={{ x: 0.5, y: 0.5 }} zIndex={10}>
          <Animated.View
            style={[
              styles.passengerPulse,
              {
                transform: [
                  {
                    scale: passengerPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.6],
                    }),
                  },
                ],
                opacity: passengerPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 0],
                }),
              },
            ]}
          />
          <View style={styles.passengerMarker}>
            <MaterialCommunityIcons name="account" size={16} color="#FFF" />
          </View>
        </Marker>
      )}

      {driverLocation && (
        <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }} zIndex={10}>
          <View style={styles.driverMarker}>
            <MaterialCommunityIcons name={getVehicleIcon(driverType)} size={16} color="#FFF" />
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
  passengerPulse: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
  },
  passengerMarker: {
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
