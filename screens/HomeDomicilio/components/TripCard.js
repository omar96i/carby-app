import React from "react";
import { View, Text, TouchableOpacity, Animated, Image, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import OrderDetails from "./OrderDetails";
import { formatPrice, parseInfo, parseCoords, getServiceIconUrl, formatPaymentMethod, getUserPhotoUrl } from "../utils";

export default function TripCard({
  trip,
  nextTrip,
  queueCount,
  distanceFromMe,
  userRating,
  timerAnim,
  onReject,
  onAccept,
}) {
  const info = parseInfo(trip.informacion_adicional);
  const pickup = parseCoords(trip.punto_recogida);
  const dest = parseCoords(trip.destino);
  const service = trip.service;
  const usuario = trip.usuario;
  const pedido = trip.pedido;
  const metodoPago = formatPaymentMethod(trip.metodo_pago || info.metodo_pago || info.metododepago);
  const observaciones = info.observaciones || trip.observaciones || null;

  console.log("[TripCard] RAW informacion_adicional:", trip.informacion_adicional);
  console.log("[TripCard] PARSED info:", JSON.stringify(info));
  console.log("[TripCard] trip.id:", trip.id, "observaciones:", observaciones, "metodoPago:", metodoPago);

  const widthInterpolate = timerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View>
      {queueCount > 0 && <View style={styles.stackCardEffect1} />}
      {queueCount > 1 && <View style={styles.stackCardEffect2} />}

      <View style={styles.tripCard}>
        {queueCount > 0 && (
          <View style={styles.queueBar}>
            <MaterialCommunityIcons name="layers-triple-outline" size={14} color="#fa6205" />
            <Text style={styles.queueText}>
              {queueCount === 1 ? "1 carrera más en espera" : `${queueCount} carreras más en espera`}
              {nextTrip && <Text style={styles.queueNextPrice}> • Sig: {formatPrice(nextTrip.costo)}</Text>}
            </Text>
          </View>
        )}

        {/* Header: servicio + precio */}
        <View style={styles.tripHeader}>
          <View style={styles.serviceRow}>
            {service?.icono ? (
              <Image source={{ uri: getServiceIconUrl(service.icono) }} style={styles.serviceIcon} />
            ) : (
              <View style={styles.serviceIconFallback}>
                <Ionicons name="bicycle" size={18} color="#fa6205" />
              </View>
            )}
            <View>
              <Text style={styles.serviceName}>{service?.nombre || trip.tipo_servicio || "Delivery"}</Text>
              <View style={styles.paymentBadge}>
                <Ionicons name="wallet-outline" size={10} color="#FFF" />
                <Text style={styles.paymentBadgeText}>{metodoPago}</Text>
              </View>
              <View style={styles.distanceBadge}>
                <Ionicons name="navigate" size={10} color="#FFF" />
                <Text style={styles.distanceBadgeText}>
                  {distanceFromMe ? `${distanceFromMe} km para llegar` : "..."}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.tripPrice}>{formatPrice(trip.costo)}</Text>
        </View>

        {/* Cliente */}
        <View style={styles.customerBox}>
          {(() => {
            const photoUrl = getUserPhotoUrl(usuario);
            console.log("[TripCard] USER PHOTO ->", photoUrl, "usuario keys:", usuario ? Object.keys(usuario).join(",") : "null");
            return photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.customerPhoto} />
            ) : (
              <View style={styles.customerPhotoFallback}>
                <Text style={styles.customerInitial}>
                  {usuario?.nombre_completo?.charAt(0) || "U"}
                </Text>
              </View>
            );
          })()}
          <View style={styles.customerInfo}>
            <Text style={styles.customerName} numberOfLines={1}>
              {usuario?.nombre_completo || "Usuario"}
            </Text>
            {usuario?.numero_telefono && (
              <Text style={styles.customerPhone}>{usuario.numero_telefono}</Text>
            )}
          </View>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.ratingText}>{userRating ? parseFloat(userRating).toFixed(1) : "5.0"}</Text>
          </View>
        </View>

        {/* Puntos A -> B */}
        <View style={styles.pointsContainer}>
          <View style={styles.pointRow}>
            <View style={[styles.dot, { backgroundColor: "#fa6205" }]} />
            <Text style={styles.pointLabel}>Recoger</Text>
          </View>
          <Text style={styles.pointText} numberOfLines={2}>
            {pickup?.direccion || info.origen || "Recogida"}
          </Text>

          <View style={styles.line} />

          <View style={styles.pointRow}>
            <View style={[styles.dot, { backgroundColor: "#DC2626" }]} />
            <Text style={styles.pointLabel}>Entregar</Text>
          </View>
          <Text style={styles.pointText} numberOfLines={2}>
            {dest?.direccion || info.destino || "Entrega"}
          </Text>
        </View>

        {/* Observaciones */}
        {observaciones ? (
          <View style={styles.obsBox}>
            <View style={styles.obsIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#DC2626" />
            </View>
            <View style={styles.obsContent}>
              <Text style={styles.obsLabel}>Observación</Text>
              <Text style={styles.obsText}>{observaciones}</Text>
            </View>
          </View>
        ) : null}

        {/* Pedido */}
        <OrderDetails pedido={pedido} />

        {/* Acciones */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => onReject(trip.id)}>
            <Ionicons name="close" size={28} color="#DC2626" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.acceptBtnContainer} onPress={() => onAccept(trip.id)} activeOpacity={0.8}>
            <Animated.View style={[styles.acceptBtnProgress, { width: widthInterpolate }]} />
            <Text style={styles.acceptText}>ACEPTAR CARRERA</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tripCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#DDD",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 10,
  },
  stackCardEffect1: {
    position: "absolute",
    top: 8,
    left: 10,
    right: 10,
    height: "100%",
    backgroundColor: "#ECECEC",
    borderRadius: 24,
    zIndex: 5,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  stackCardEffect2: {
    position: "absolute",
    top: 16,
    left: 20,
    right: 20,
    height: "100%",
    backgroundColor: "#F0F0F0",
    borderRadius: 24,
    zIndex: 1,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  queueBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(250, 98, 5, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(250, 98, 5, 0.3)",
  },
  queueText: {
    color: "#444",
    fontSize: 11,
    fontFamily: "Montserrat_500Medium",
    marginLeft: 6,
  },
  queueNextPrice: {
    color: "#fa6205",
    fontFamily: "Montserrat_700Bold",
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  serviceIcon: {
    width: 40,
    height: 40,
    resizeMode: "contain",
    marginRight: 10,
  },
  serviceIconFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(250, 98, 5, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  serviceName: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
  },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  paymentBadgeText: {
    color: "#FFF",
    fontFamily: "Montserrat_700Bold",
    fontSize: 10,
    marginLeft: 4,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fa6205",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  distanceBadgeText: {
    color: "#FFF",
    fontFamily: "Montserrat_700Bold",
    fontSize: 10,
    marginLeft: 4,
  },
  tripPrice: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_700Bold",
    fontSize: 24,
  },
  customerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
  },
  customerPhoto: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E2E8F0",
  },
  customerPhotoFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fa6205",
    justifyContent: "center",
    alignItems: "center",
  },
  customerInitial: {
    color: "#FFF",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
  },
  customerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  customerName: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
  },
  customerPhone: {
    color: "#666",
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  ratingText: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
    marginLeft: 4,
  },
  pointsContainer: {
    marginBottom: 14,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  pointLabel: {
    color: "#888",
    fontFamily: "Montserrat_700Bold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pointText: {
    color: "#444",
    fontFamily: "Montserrat_500Medium",
    fontSize: 13,
    marginLeft: 18,
    marginTop: 2,
    marginBottom: 6,
  },
  line: {
    width: 2,
    height: 16,
    backgroundColor: "#ECECEC",
    marginLeft: 4,
    marginVertical: 2,
  },
  obsBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  obsIcon: {
    marginBottom: 8,
  },
  obsContent: {
    flex: 1,
  },
  obsLabel: {
    color: "#DC2626",
    fontFamily: "Montserrat_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  obsText: {
    color: "#374151",
    fontFamily: "Montserrat_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rejectBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#DC2626",
    marginRight: 15,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnContainer: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ECECEC",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#fa6205",
  },
  acceptBtnProgress: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#fa6205",
  },
  acceptText: {
    color: "#FFF",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    zIndex: 10,
  },
});
