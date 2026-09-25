import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", green: "#10B981" };

const SAMPLE = [
  { dia: "Lunes a Viernes", horas: "8:00 AM – 8:00 PM", on: true },
  { dia: "Sábado", horas: "9:00 AM – 6:00 PM", on: true },
  { dia: "Domingo", horas: "Cerrado", on: false },
];

export default function HorariosIntroModal({ visible, onClose, onGoHorarios }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.bg}>
        <View style={s.card}>
          <View style={s.grabber} />
          <View style={s.iconCircle}>
            <Ionicons name="time" size={32} color={C.brand} />
          </View>
          <Text style={s.title}>Tus horarios de apertura</Text>
          <Text style={s.sub}>Así administras tus horarios: activa cada día y define apertura y cierre. Solo recibes pedidos cuando estás abierto.</Text>

          <View style={s.preview}>
            {SAMPLE.map((r) => (
              <View key={r.dia} style={s.row}>
                <View style={[s.dot, r.on ? s.dotOn : s.dotOff]} />
                <Text style={s.day}>{r.dia}</Text>
                <Text style={[s.hours, !r.on && s.hoursOff]}>{r.horas}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.primary} onPress={onGoHorarios} activeOpacity={0.85}>
            <Ionicons name="calendar-outline" size={18} color="#FFF" />
            <Text style={s.primaryText}>Configurar mis horarios</Text>
          </TouchableOpacity>
          <Text style={s.hint}>Cuando quieras cambiar tus horarios, entra a “Mis horarios de atención”.</Text>
          <TouchableOpacity onPress={onClose} style={s.later}>
            <Text style={s.laterText}>Ahora no</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  card: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 28 },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 14 },
  iconCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#FFF0E5", justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 12 },
  title: { fontSize: 19, fontFamily: "Montserrat_800ExtraBold", color: C.ink, textAlign: "center", marginBottom: 6 },
  sub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: C.muted, textAlign: "center", lineHeight: 17, marginBottom: 14 },
  preview: { backgroundColor: C.bg, borderRadius: 16, padding: 12, marginBottom: 14, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotOn: { backgroundColor: C.green },
  dotOff: { backgroundColor: "#EF4444" },
  day: { flex: 1, fontSize: 12, fontFamily: "Montserrat_700Bold", color: C.ink },
  hours: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: C.muted },
  hoursOff: { color: "#EF4444" },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.brand, paddingVertical: 15, borderRadius: 16 },
  primaryText: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  hint: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: C.muted, textAlign: "center", marginTop: 10, lineHeight: 15 },
  later: { alignItems: "center", paddingVertical: 10 },
  laterText: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: C.muted },
});
