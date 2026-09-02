import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { RouteSummary } from "./RouteSummary";
import { formatCurrency, getImageUrl } from "../utils";
import SafetyProtection from "../../../../components/SafetyProtection";

const { height: SCREEN_H } = Dimensions.get("window");
const COLLAPSED_H = 90;
const EXPANDED_H = SCREEN_H * 0.5;

export const DriverSheet = ({
  state,
  tripData,
  parsedInfo,
  routeDistance,
  routeDuration,
  shareLive,
  onToggleShare,
  onShowPin,
  onShowChat,
  onCall,
  onCancel,
  hasNewMessages,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  const heightAnim = useRef(new Animated.Value(COLLAPSED_H)).current;
  const compactOpacity = useRef(new Animated.Value(1)).current;
  const expandedOpacity = useRef(new Animated.Value(0)).current;

  const conductor = tripData?.conductor;
  const rating = conductor?.puntuacion || "4.8";
  const trips = conductor?.conductor_carreras_count ?? conductor?.viajes_realizados ?? 0;
  const imageUrl = getImageUrl(conductor?.foto_documento_file);
  const pin = tripData?.pin || "----";
  const cost = tripData?.costo;
  const paymentLabel = tripData?.metodo_pago === "efectivo" ? "Efectivo" : "Nequi/\nBancolombia";

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heightAnim, {
        toValue: expanded ? EXPANDED_H : COLLAPSED_H,
        useNativeDriver: false,
        friction: 9,
        tension: 60,
      }),
      Animated.timing(compactOpacity, {
        toValue: expanded ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(expandedOpacity, {
        toValue: expanded ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [expanded]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderRelease: (_, gesture) => {
        const wasTap = Math.abs(gesture.dy) < 10 && Math.abs(gesture.dx) < 10;
        if (wasTap) {
          setExpanded(!expanded);
          return;
        }
        if (expanded) {
          if (gesture.dy > 30 || (gesture.vy || 0) > 0.3) setExpanded(false);
          else setExpanded(true);
        } else {
          if (gesture.dy < -30 || (gesture.vy || 0) < -0.3) setExpanded(true);
          else setExpanded(false);
        }
      },
    })
  ).current;

  const handleCall = () => {
    const phone = conductor?.numero_telefono;
    if (phone) Linking.openURL(`tel:${phone}`);
    if (onCall) onCall();
  };

  return (
    <Animated.View style={[styles.sheet, { height: heightAnim }]}>
      <View style={[styles.header, { height: expanded ? 36 : COLLAPSED_H }]} {...panResponder.panHandlers}>
        <View style={styles.handle} />
        <View style={styles.collapsedRowWrapper}>
          <Animated.View style={[styles.collapsedRow, { opacity: compactOpacity }]}>
          <Image
            source={imageUrl ? { uri: imageUrl } : require("../../../../assets/images/nuevo-icono.jpeg")}
            style={styles.collapsedAvatar}
            resizeMode="cover"
          />
          <View style={styles.collapsedTextBox}>
            <Text style={styles.collapsedName} numberOfLines={1}>
              {conductor?.nombre_completo || "Conductor"}
            </Text>
            <Text style={styles.collapsedPlate}>{conductor?.placa || "---"}</Text>
          </View>
          <Feather name="chevron-up" size={20} color="#64748B" />
        </Animated.View>
        </View>
      </View>

      <Animated.View
        style={[styles.expandedContent, { top: expanded ? 36 : COLLAPSED_H, opacity: expandedOpacity }]}
        pointerEvents={expanded ? "auto" : "none"}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Driver card */}
          <View style={styles.driverCard}>
            <TouchableOpacity style={styles.avatarWrap} onPress={() => setPhotoModalVisible(true)} activeOpacity={0.85}>
              <Image
                source={imageUrl ? { uri: imageUrl } : require("../../../../assets/images/nuevo-icono.jpeg")}
                style={styles.avatar}
                resizeMode="cover"
              />
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{rating}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName} numberOfLines={1}>
                {conductor?.nombre_completo || "Asignando..."}
              </Text>
              <Text style={styles.driverCar} numberOfLines={1}>
                {conductor?.marca_vehiculo || ""} {conductor?.color || ""}
              </Text>
              <Text style={styles.driverTrips}>{trips} viajes</Text>
            </View>
            <View style={styles.plateBox}>
              <Text style={styles.plateText}>{conductor?.placa || "---"}</Text>
              <Text style={styles.plateLabel}>Placa</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall} activeOpacity={0.8}>
              <Feather name="phone" size={18} color="#10B981" />
              <Text style={styles.actionText}>Llamar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={onShowChat} activeOpacity={0.8}>
              <View style={styles.actionIconWrap}>
                <Feather name="message-circle" size={18} color="#3B82F6" />
                {hasNewMessages && <View style={styles.badge} />}
              </View>
              <Text style={styles.actionText}>Chat</Text>
            </TouchableOpacity>
          </View>

          {/* Share live */}
          <TouchableOpacity
            style={[styles.shareBtn, shareLive && styles.shareBtnActive]}
            onPress={onToggleShare}
            activeOpacity={0.8}
          >
            <View style={[styles.shareIcon, shareLive && styles.shareIconActive]}>
              <Feather name="radio" size={18} color={shareLive ? "#FFFFFF" : "#64748B"} />
            </View>
            <View style={styles.shareTextBox}>
              <Text style={styles.shareTitle}>Compartir ubicación en vivo</Text>
              <Text style={styles.shareSub}>
                {shareLive
                  ? "Tu conductor ve tu posición en tiempo real"
                  : "Actívalo para mayor seguridad"}
              </Text>
            </View>
            <View style={[styles.toggle, shareLive && styles.toggleActive]}>
              <View style={[styles.toggleKnob, shareLive && styles.toggleKnobActive]} />
            </View>
          </TouchableOpacity>

          {/* PIN + Payment */}
          <View style={styles.detailsRow}>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>PIN del viaje</Text>
              <View style={styles.pinRow}>
                {pin.split("").map((d, i) => (
                  <View key={i} style={styles.pinDigit}>
                    <Text style={styles.pinDigitText}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Pago</Text>
              <View style={styles.paymentRow}>
                <View style={styles.paymentIcon}>
                  <Feather name="dollar-sign" size={20} color="#10B981" />
                </View>
                <View>
                  <Text style={styles.paymentLabel}>{paymentLabel}</Text>
                  <Text style={styles.paymentValue}>{formatCurrency(cost)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Route directions */}
          <View style={styles.routeSection}>
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionLabel}>Recorrido</Text>
            <RouteSummary
              origin={parsedInfo?.addresA}
              destination={parsedInfo?.addresB}
              distance={tripData?.distancia || routeDistance}
              duration={tripData?.duracion_estimada || routeDuration}
            />
          </View>

          {state === "ontrip" && (
            <View style={styles.pinAlert}>
              <Text style={styles.pinAlertText}>
                Al llegar, comparte el PIN <Text style={styles.pinAlertBold}>{pin}</Text> con tu conductor para finalizar.
              </Text>
            </View>
          )}

          {/* Safety */}
          {state !== "searching" && state !== "finished" && tripData?.id && (
            <View style={styles.safetyBox}>
              <SafetyProtection carreraId={tripData.id} role="usuario" />
            </View>
          )}

          {/* Cancelar viaje */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
            <Feather name="x-circle" size={18} color="#FF4757" />
            <Text style={styles.cancelBtnText}>Cancelar viaje</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      <Modal visible={photoModalVisible} transparent animationType="fade" onRequestClose={() => setPhotoModalVisible(false)}>
        <TouchableOpacity style={styles.photoModalBackdrop} activeOpacity={1} onPress={() => setPhotoModalVisible(false)}>
          <View style={styles.photoModalHeader}>
            <Text style={styles.photoModalName} numberOfLines={1}>
              {conductor?.nombre_completo || "Conductor"}
            </Text>
            <TouchableOpacity style={styles.photoModalClose} onPress={() => setPhotoModalVisible(false)} activeOpacity={0.8}>
              <Feather name="x" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Image
            source={imageUrl ? { uri: imageUrl } : require("../../../../assets/images/nuevo-icono.jpeg")}
            style={styles.photoModalImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 20,
    overflow: "hidden",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 16,
    zIndex: 10,
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 6,
  },
  collapsedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  collapsedRowWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  collapsedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
    borderWidth: 2,
    borderColor: "#FF5500",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  collapsedTextBox: {
    flex: 1,
  },
  collapsedName: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    lineHeight: 18,
  },
  collapsedPlate: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#64748B",
    marginTop: 4,
  },
  expandedContent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E2E8F0",
    borderWidth: 2,
    borderColor: "#FF5500",
  },
  ratingBadge: {
    position: "absolute",
    bottom: -4,
    alignSelf: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCD34D",
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  ratingText: {
    fontSize: 10,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#B45309",
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  driverCar: {
    fontSize: 12,
    fontFamily: "Montserrat",
    color: "#64748B",
    marginTop: 2,
  },
  driverTrips: {
    fontSize: 11,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#10B981",
    marginTop: 2,
  },
  plateBox: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  plateText: {
    fontSize: 13,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  plateLabel: {
    fontSize: 8,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#94A3B8",
    textTransform: "uppercase",
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionText: {
    fontSize: 13,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  actionIconWrap: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF5500",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  shareBtnActive: {
    borderColor: "rgba(16,185,129,0.4)",
    backgroundColor: "#ECFDF5",
  },
  shareIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  shareIconActive: {
    backgroundColor: "#10B981",
  },
  shareTextBox: {
    flex: 1,
    marginLeft: 12,
  },
  shareTitle: {
    fontSize: 13,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  shareSub: {
    fontSize: 11,
    fontFamily: "Montserrat",
    color: "#64748B",
    marginTop: 2,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    padding: 2,
  },
  toggleActive: {
    backgroundColor: "#10B981",
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    marginLeft: 20,
  },
  detailsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  detailBox: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  detailLabel: {
    fontSize: 10,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pinRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  pinDigit: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
  },
  pinDigitText: {
    fontSize: 18,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  paymentLabel: {
    fontSize: 11,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    lineHeight: 13,
  },
  paymentValue: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
    marginTop: 3,
  },
  routeSection: {
    marginTop: 6,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  pinAlert: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: "#FFF7ED",
    padding: 12,
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  pinAlertText: {
    fontSize: 12,
    fontFamily: "Montserrat",
    color: "#0F172A",
    textAlign: "center",
  },
  pinAlertBold: {
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
  },
  safetyBox: {
    marginTop: 12,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,71,87,0.35)",
    backgroundColor: "#FFF1F2",
    paddingVertical: 12,
    shadowColor: "#FF4757",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF4757",
  },
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoModalHeader: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  photoModalName: {
    flex: 1,
    fontSize: 16,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FFFFFF",
    marginRight: 12,
  },
  photoModalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoModalImage: {
    width: "90%",
    height: "70%",
  },
});
