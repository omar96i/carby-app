import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Switch,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_600SemiBold,
  Montserrat_800ExtraBold,
} from "@expo-google-fonts/montserrat";
import DateTimePicker from "@react-native-community/datetimepicker";
import useHorarios from "../../hooks/comercio/useHorarios";
import AlertaModal from "../../components/ErrorModal";

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", green: "#10B981" };

const DIAS = [
  { key: "lunes", label: "Lunes", icon: "briefcase-outline" },
  { key: "martes", label: "Martes", icon: "briefcase-outline" },
  { key: "miercoles", label: "Miércoles", icon: "briefcase-outline" },
  { key: "jueves", label: "Jueves", icon: "briefcase-outline" },
  { key: "viernes", label: "Viernes", icon: "briefcase-outline" },
  { key: "sabado", label: "Sábado", icon: "sunny-outline" },
  { key: "domingo", label: "Domingo", icon: "sunny-outline" },
];

function parseTime(t) {
  const [h, m] = (t || "08:00").split(":");
  const d = new Date();
  d.setFullYear(1970, 0, 1);
  d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  return d;
}

function formatTime(d) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function HorariosScreen() {
  const nav = useNavigation();
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_600SemiBold,
    Montserrat_800ExtraBold,
  });

  const { horarios, setHorarios, loading, saving, fetchHorarios, saveHorarios } = useHorarios();
  const [picker, setPicker] = useState(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info" });

  const showAlert = (message, type = "info") => {
    setAlertData({ message, type });
    setAlertVisible(true);
  };

  useEffect(() => {
    fetchHorarios();
  }, []);

  const toggleActive = (dia) => {
    setHorarios((prev) => prev.map((h) => (h.dia === dia ? { ...h, activo: !h.activo } : h)));
  };

  const updateTime = (dia, field, value) => {
    const key = field === "apertura" ? "hora_apertura" : "hora_cierre";
    setHorarios((prev) => prev.map((h) => (h.dia === dia ? { ...h, [key]: value } : h)));
  };

  const openPicker = (dia, field) => {
    const h = horarios.find((x) => x.dia === dia);
    const value = field === "apertura" ? h.hora_apertura : h.hora_cierre;
    setPickerDate(parseTime(value));
    setPicker({ dia, field });
  };

  const confirmPicker = () => {
    if (!picker) return;
    updateTime(picker.dia, picker.field, formatTime(pickerDate));
    setPicker(null);
  };

  const handleSave = async () => {
    const ok = await saveHorarios(horarios);
    showAlert(ok ? "Horarios guardados correctamente" : "No se pudieron guardar los horarios", ok ? "success" : "error");
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={hs.safe}>
        <ActivityIndicator size="large" color={C.brand} />
      </SafeAreaView>
    );
  }

  const diasActivos = horarios.filter((h) => h.activo).length;

  return (
    <SafeAreaView style={hs.safe}>
      <View style={hs.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={hs.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <View style={hs.headerText}>
          <Text style={hs.title}>Horarios de atención</Text>
          <Text style={hs.headerSub}>{diasActivos} {diasActivos === 1 ? "día activo" : "días activos"}</Text>
        </View>
        <View style={hs.headerIconCircle}>
          <Ionicons name="calendar-outline" size={22} color={C.brand} />
        </View>
      </View>

      {loading ? (
        <View style={hs.center}>
          <ActivityIndicator size="large" color={C.brand} />
        </View>
      ) : (
        <View style={hs.container}>
          <ScrollView style={hs.scroll} contentContainerStyle={hs.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={hs.infoCard}>
            <View style={hs.infoIconCircle}>
              <Ionicons name="information-circle-outline" size={28} color={C.brand} />
            </View>
            <Text style={hs.infoText}>
              Activa los días que atiendes y ajusta el rango de horas. Los clientes solo podrán pedir cuando estés abierto.
            </Text>
          </View>

          {DIAS.map((d) => {
            const h = horarios.find((x) => x.dia === d.key) || {};
            const activo = !!h.activo;
            return (
              <View key={d.key} style={[hs.dayCard, activo && hs.dayCardActive]}>
                <View style={hs.dayRow}>
                  <View style={[hs.dayIconCircle, activo ? hs.dayIconCircleActive : hs.dayIconCircleInactive]}>
                    <Ionicons name={d.icon} size={18} color={activo ? "#FFF" : C.muted} />
                  </View>

                  <View style={hs.dayInfo}>
                    <Text style={hs.dayName}>{d.label}</Text>
                    <View style={[hs.badge, activo ? hs.badgeOpen : hs.badgeClosed]}>
                      <Ionicons name={activo ? "checkmark-circle" : "close-circle"} size={12} color={activo ? C.green : "#EF4444"} />
                      <Text style={[hs.badgeText, activo ? hs.badgeTextOpen : hs.badgeTextClosed]}>
                        {activo ? "Abierto" : "Cerrado"}
                      </Text>
                    </View>
                  </View>

                  <Switch
                    value={activo}
                    onValueChange={() => toggleActive(d.key)}
                    trackColor={{ false: "#E4E4E7", true: "#FED7AA" }}
                    thumbColor={activo ? C.brand : "#FFF"}
                  />
                </View>

                {activo && (
                  <View style={hs.timesBox}>
                    <Ionicons name="time-outline" size={18} color={C.muted} />
                    <TouchableOpacity style={hs.timeChip} onPress={() => openPicker(d.key, "apertura")} activeOpacity={0.7}>
                      <Text style={hs.timeLabel}>Apertura</Text>
                      <Text style={hs.timeValue}>{h.hora_apertura}</Text>
                    </TouchableOpacity>
                    <Ionicons name="arrow-forward" size={16} color={C.muted} />
                    <TouchableOpacity style={hs.timeChip} onPress={() => openPicker(d.key, "cierre")} activeOpacity={0.7}>
                      <Text style={hs.timeLabel}>Cierre</Text>
                      <Text style={hs.timeValue}>{h.hora_cierre}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          </ScrollView>

          <View style={hs.footer}>
            <TouchableOpacity style={hs.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <View style={hs.saveBtnInner}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                  <Text style={hs.saveBtnText}>Guardar horarios</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {Platform.OS === "ios" ? (
        <Modal visible={picker !== null} transparent animationType="slide">
          <View style={hs.modalBg}>
            <View style={hs.pickerSheet}>
              <View style={hs.sheetHandle} />
              <View style={hs.sheetHeader}>
                <TouchableOpacity onPress={() => setPicker(null)}>
                  <Text style={hs.sheetAction}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={hs.sheetTitle}>{picker && picker.field === "apertura" ? "Hora de apertura" : "Hora de cierre"}</Text>
                <TouchableOpacity onPress={confirmPicker}>
                  <Text style={[hs.sheetAction, hs.sheetActionPrimary]}>Listo</Text>
                </TouchableOpacity>
              </View>
              <Text style={hs.sheetHint}>Selecciona la hora y presiona Listo</Text>
              <DateTimePicker
                value={pickerDate}
                mode="time"
                is24Hour={true}
                display="spinner"
                minuteInterval={1}
                onChange={(event, selectedDate) => {
                  if (selectedDate) setPickerDate(selectedDate);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        picker !== null && (
          <DateTimePicker
            value={pickerDate}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(event, selectedDate) => {
              if (event.type === "set" && selectedDate && picker) {
                updateTime(picker.dia, picker.field, formatTime(selectedDate));
              }
              setPicker(null);
            }}
          />
        )
      )}

      <AlertaModal visible={alertVisible} mensaje={alertData.message} tipo={alertData.type} onCerrar={() => setAlertVisible(false)} />
    </SafeAreaView>
  );
}

const hs = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 38,
    paddingBottom: 18,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center", borderRadius: 14, backgroundColor: C.bg },
  headerText: { flex: 1, marginHorizontal: 12 },
  title: { fontSize: 20, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  headerSub: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: C.muted, marginTop: 2 },
  headerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFF0E5",
    justifyContent: "center",
    alignItems: "center",
  },
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 20, paddingBottom: 8 },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  infoIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFF0E5",
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Montserrat_400Regular", color: C.muted, lineHeight: 19 },
  dayCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dayCardActive: {
    borderColor: "#FED7AA",
    shadowOpacity: 0.06,
  },
  dayRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dayIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  dayIconCircleActive: { backgroundColor: C.brand },
  dayIconCircleInactive: { backgroundColor: C.bg },
  dayInfo: { flex: 1 },
  dayName: { fontSize: 16, fontFamily: "Montserrat_700Bold", color: C.ink, textTransform: "capitalize" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  badgeOpen: { backgroundColor: "#ECFDF5" },
  badgeClosed: { backgroundColor: "#FEF2F2" },
  badgeText: { fontSize: 11, fontFamily: "Montserrat_700Bold" },
  badgeTextOpen: { color: C.green },
  badgeTextClosed: { color: "#EF4444" },
  timesBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F4F4F5",
  },
  timeChip: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  timeLabel: { fontSize: 10, fontFamily: "Montserrat_600SemiBold", color: C.muted, textTransform: "uppercase", marginBottom: 2 },
  timeValue: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  saveBtn: {
    backgroundColor: C.brand,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: C.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  saveBtnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  saveBtnText: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  modalBg: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  pickerSheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: "#E0E0E0", alignSelf: "center", marginTop: 12, marginBottom: 8 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 },
  sheetTitle: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: C.ink, textAlign: "center", flex: 1, marginHorizontal: 8 },
  sheetAction: { fontSize: 15, fontFamily: "Montserrat_600SemiBold", color: C.muted, minWidth: 64 },
  sheetActionPrimary: { color: C.brand, textAlign: "right" },
  sheetHint: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: C.muted, textAlign: "center", marginBottom: 8 },
});
