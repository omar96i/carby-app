import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatCurrency, formatPaymentMethod, getVehicleIcon } from "../utils";

const C = { brand: "#fa6205", ink: "#1C1C1E", muted: "#71717A", bg: "#F4F4F5", edge: "#E4E4E7", green: "#10B981", placeholder: "#A1A1AA" };

const VEHICULO_LABEL = { "rider.taxi": "Particular", "rider.moto": "Moto", "rider.mototaxi": "Mototaxi" };

const Star = ({ filled, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.starBtn} activeOpacity={0.7}>
    <Ionicons name={filled ? "star" : "star-outline"} size={30} color={filled ? "#F59E0B" : "#D4D4D8"} />
  </TouchableOpacity>
);

export const FinishedSheet = ({ tripData, clientName, onDone, loading, showRating = true, pickupAddress, destinationAddress }) => {
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);
  const earning = tripData?.costo || 0;

  const handleDone = () => {
    onDone(showRating ? { rating, message } : {});
  };

  const esDelivery = !!tripData?.pedido;
  const tipoConductor = tripData?.conductor?.tipo_usuario;
  const vehiculoLabel = esDelivery ? "Delivery" : VEHICULO_LABEL[tipoConductor] || null;
  const vehiculoIcon = esDelivery ? "package-variant-closed" : getVehicleIcon(tipoConductor);
  const metodoPago = tripData?.metodo_pago ? formatPaymentMethod(tripData.metodo_pago) : null;
  const nombreCliente = (clientName || "").trim();
  const iniciales = nombreCliente.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Feather name="check" size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Arrendamiento finalizado</Text>
            <Text style={styles.subtitle}>El PIN fue verificado y el pago quedó confirmado.</Text>
          </View>
        </View>

        <View style={styles.earningCard}>
          <View style={styles.earningTop}>
            <Text style={styles.earningLabel}>Ganancia del viaje</Text>
            {!!tripData?.id && (
              <View style={styles.idChip}>
                <Text style={styles.idChipText}>#{tripData.id}</Text>
              </View>
            )}
          </View>
          <Text style={styles.earningValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>
            {formatCurrency(earning)}
          </Text>
          {(!!metodoPago || !!vehiculoLabel) && (
            <View style={styles.chips}>
              {!!metodoPago && (
                <View style={styles.chip}>
                  <Ionicons name="wallet-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.chipText} numberOfLines={1}>{metodoPago}</Text>
                </View>
              )}
              {!!vehiculoLabel && (
                <View style={styles.chip}>
                  <MaterialCommunityIcons name={vehiculoIcon} size={15} color="#FFFFFF" />
                  <Text style={styles.chipText} numberOfLines={1}>{vehiculoLabel}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {(!!pickupAddress || !!destinationAddress) && (
          <View style={styles.routeCard}>
            {!!pickupAddress && (
              <View style={styles.routeRow}>
                <View style={styles.routeDotCol}>
                  <View style={[styles.routeDot, { backgroundColor: C.green }]} />
                  {!!destinationAddress && <View style={styles.routeRail} />}
                </View>
                <View style={{ flex: 1, paddingBottom: destinationAddress ? 10 : 0 }}>
                  <Text style={styles.routeLabel}>Recogida</Text>
                  <Text style={styles.routeText} numberOfLines={1}>{pickupAddress}</Text>
                </View>
              </View>
            )}
            {!!destinationAddress && (
              <View style={styles.routeRow}>
                <View style={styles.routeDotCol}>
                  <View style={[styles.routeDot, styles.routeDotEnd]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeLabel}>Destino</Text>
                  <Text style={styles.routeText} numberOfLines={1}>{destinationAddress}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {showRating && (
          <View style={styles.rateCard}>
            <View style={styles.rateHead}>
              {!!iniciales && (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{iniciales}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.rateLabel}>Califica al pasajero</Text>
                {!!nombreCliente && <Text style={styles.rateSub} numberOfLines={1}>{nombreCliente}</Text>}
              </View>
            </View>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} filled={n <= rating} onPress={() => setRating(n)} />
              ))}
            </View>

            <TextInput
              style={styles.messageInput}
              placeholder="Comentario opcional..."
              placeholderTextColor={C.placeholder}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
              editable={!loading}
            />
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPad + 8 }]}>
        <TouchableOpacity style={[styles.doneBtn, loading && styles.doneBtnDisabled]} onPress={handleDone} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="search" size={18} color="#FFFFFF" />
              <Text style={styles.doneText}>Buscar nuevo arrendamiento</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "78%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 20,
  },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: C.edge, alignSelf: "center", marginTop: 10, marginBottom: 8 },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: 20 },

  hero: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.green, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, lineHeight: 23, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  subtitle: { fontSize: 12.5, lineHeight: 17, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 3 },

  earningCard: { backgroundColor: C.ink, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, marginTop: 14 },
  earningTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  earningLabel: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "rgba(255,255,255,0.6)" },
  idChip: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  idChipText: { fontSize: 11.5, fontFamily: "Montserrat_700Bold", color: "rgba(255,255,255,0.75)" },
  earningValue: { fontSize: 34, fontFamily: "Montserrat_800ExtraBold", color: "#34D399", marginTop: 4 },
  chips: { flexDirection: "row", gap: 8, marginTop: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.1)", flexShrink: 1 },
  chipText: { fontSize: 12, fontFamily: "Montserrat_700Bold", color: "#FFFFFF", flexShrink: 1 },

  routeCard: { backgroundColor: C.bg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12, marginTop: 10 },
  routeRow: { flexDirection: "row", gap: 12 },
  routeDotCol: { width: 12, alignItems: "center", paddingTop: 4 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeDotEnd: { borderRadius: 2, backgroundColor: C.brand },
  routeRail: { flex: 1, width: 2, backgroundColor: C.edge, marginTop: 4 },
  routeLabel: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: C.muted },
  routeText: { fontSize: 13, lineHeight: 17, fontFamily: "Montserrat_700Bold", color: C.ink, marginTop: 2 },

  rateCard: { borderRadius: 20, borderWidth: 1, borderColor: C.edge, padding: 14, marginTop: 10 },
  rateHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFF0E5", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: C.brand },
  rateLabel: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: C.ink },
  rateSub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 2 },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 6 },
  starBtn: { padding: 4 },
  messageInput: {
    minHeight: 52,
    maxHeight: 120,
    borderRadius: 16,
    backgroundColor: C.bg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: C.ink,
    textAlignVertical: "top",
    marginTop: 8,
  },

  footer: { paddingHorizontal: 20, paddingTop: 12 },
  doneBtn: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: C.brand,
    borderRadius: 27,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  doneBtnDisabled: { backgroundColor: "#D4D4D8", shadowOpacity: 0, elevation: 0 },
  doneText: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#FFFFFF" },
});
