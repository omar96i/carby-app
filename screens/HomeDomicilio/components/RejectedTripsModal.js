import React from "react";
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatPrice, parseCoords, parseInfo, formatPaymentMethod } from "../utils";

export default function RejectedTripsModal({ visible, onClose, trips, onRestore }) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalFullOverlay}>
        <View style={styles.rejectedListContainer}>
          <View style={styles.rejectedHeader}>
            <Text style={styles.rejectedTitle}>Descartadas Disponibles</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color="#1C1C1E" />
            </TouchableOpacity>
          </View>
          {trips.length === 0 ? (
            <Text style={styles.emptyListText}>No hay arrendamientos descartados disponibles.</Text>
          ) : (
            <FlatList
              data={trips}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                console.log("[RejectedTripsModal] ITEM ->", JSON.stringify(item, null, 2));
                const pickup = parseCoords(item.punto_recogida);
                const dest = parseCoords(item.destino);
                const info = parseInfo(item.informacion_adicional);
                const serviceName = item.service?.nombre || item.tipo_servicio || "Delivery";
                const observaciones = info?.observaciones || item.observaciones || null;
                const metodoPago = formatPaymentMethod(item.metodo_pago || info?.metodo_pago || info?.metododepago);

                const pickupAddress = pickup?.direccion || info?.origen || item.punto_recogida_direccion || "Sin dirección de recogida";
                const destAddress = dest?.direccion || info?.destino || item.destino_direccion || "Sin dirección de entrega";

                return (
                  <View style={styles.rejectedItem}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.rejectedTopRow}>
                        <Text style={styles.rejectedService}>{serviceName}</Text>
                        <Text style={styles.rejectedPrice}>{formatPrice(item.costo)}</Text>
                      </View>

                      <View style={styles.paymentRow}>
                        <Ionicons name="wallet-outline" size={14} color="#fa6205" />
                        <Text style={styles.paymentText}>{metodoPago}</Text>
                      </View>

                      <View style={styles.pointBlock}>
                        <View style={styles.pointRow}>
                          <View style={[styles.dot, { backgroundColor: "#fa6205" }]} />
                          <View>
                            <Text style={styles.pointLabel}>Recoger</Text>
                            <Text style={styles.pointText} numberOfLines={2}>
                              {pickupAddress}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.dottedLine} />

                        <View style={styles.pointRow}>
                          <View style={[styles.dot, { backgroundColor: "#FF4757" }]} />
                          <View>
                            <Text style={styles.pointLabel}>Entregar</Text>
                            <Text style={styles.pointText} numberOfLines={2}>
                              {destAddress}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {observaciones ? (
                        <View style={styles.obsBox}>
                          <Ionicons name="chatbubble-ellipses-outline" size={14} color="#fa6205" />
                          <Text style={styles.obsText} numberOfLines={2}>{observaciones}</Text>
                        </View>
                      ) : null}
                    </View>

                    <TouchableOpacity style={styles.recoverBtn} onPress={() => onRestore(item.id)}>
                      <MaterialCommunityIcons name="restore" size={24} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalFullOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  rejectedListContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: "80%",
  },
  rejectedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  rejectedTitle: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
  },
  emptyListText: {
    color: "#777",
    textAlign: "center",
    marginTop: 20,
    fontFamily: "Montserrat_500Medium",
  },
  rejectedItem: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  rejectedTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rejectedService: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
  },
  rejectedPrice: {
    color: "#fa6205",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  paymentText: {
    color: "#444",
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    marginLeft: 6,
  },
  pointBlock: {
    marginBottom: 10,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
    marginTop: 4,
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
    fontSize: 12,
    marginTop: 2,
    maxWidth: 220,
  },
  dottedLine: {
    width: 2,
    height: 20,
    borderLeftWidth: 2,
    borderLeftColor: "#E2E8F0",
    borderStyle: "dashed",
    marginLeft: 4,
    marginVertical: 4,
  },
  obsBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(250, 98, 5, 0.2)",
  },
  obsText: {
    flex: 1,
    color: "#92400E",
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    marginLeft: 8,
  },
  recoverBtn: {
    backgroundColor: "#fa6205",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
});
