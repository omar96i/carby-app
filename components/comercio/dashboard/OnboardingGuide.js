import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5" };

function buildSteps(isServicios) {
  const base = [
    {
      key: "ubicacion",
      icon: "location",
      title: "1. Ubicación de mi negocio",
      desc: "Busca tu dirección o toca el mapa para marcar dónde está tu negocio. Los clientes te encontrarán más fácil.",
      cta: "Seleccionar en el mapa",
    },
    {
      key: "horarios",
      icon: "time",
      title: "2. Horario de apertura",
      desc: "Activa los días que atiendes y define apertura y cierre. Solo recibirás pedidos cuando estés abierto.",
      cta: "Ver cómo funciona",
    },
  ];
  if (isServicios) {
    return [
      ...base,
      {
        key: "perfil",
        icon: "person-circle",
        title: "3. Crea tu perfil comercial",
        desc: "Crea tu perfil con foto y descripción. Después configura el horario de cada perfil para que te reserven.",
        cta: "Crear mi perfil",
      },
      {
        key: "seccion",
        icon: "pricetags",
        title: "4. Crea una categoría o sección",
        desc: "Ej: Cortes, Barba, Faciales… Las secciones ordenan tu catálogo.",
        cta: "Crear mi primera sección",
      },
      {
        key: "producto",
        icon: "cut",
        title: "5. Crea tus servicios",
        desc: "Añade cada servicio con precio, duración y foto. Quedará visible al instante.",
        cta: "Crear mi primer servicio",
      },
    ];
  }
  return [
    ...base,
    {
      key: "seccion",
      icon: "pricetags",
      title: "3. Crea tus categorías o secciones",
      desc: "Ej: Hamburguesas, Bebidas, Promociones… Las secciones ordenan tu menú.",
      cta: "Crear mi primera sección",
    },
    {
      key: "producto",
      icon: "cube",
      title: "4. Crea tus productos",
      desc: "Añade cada producto con precio, foto y descuento si quieres. Quedará visible al instante.",
      cta: "Crear mi primer producto",
    },
  ];
}

export default function OnboardingGuide({ visible, isServicios, onClose, onAction, doneMap = {}, startAt = null }) {
  const steps = buildSteps(isServicios);
  const [index, setIndex] = useState(0);
  const userNav = useRef(false);

  useEffect(() => {
    if (visible) {
      userNav.current = false;
      if (startAt) {
        const i = steps.findIndex((s) => s.key === startAt);
        setIndex(i >= 0 ? i : 0);
      } else {
        const i = steps.findIndex((s) => !doneMap[s.key]);
        setIndex(i >= 0 ? i : 0);
      }
    }
  }, [visible, isServicios, startAt]);

  useEffect(() => {
    if (!visible || userNav.current) return;
    const i = steps.findIndex((s) => !doneMap[s.key]);
    if (i >= 0 && i !== index) setIndex(i);
  }, [JSON.stringify(doneMap), visible]);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  const goNext = () => {
    userNav.current = true;
    if (isLast) onClose?.();
    else setIndex((i) => i + 1);
  };
  const goBack = () => {
    userNav.current = true;
    setIndex((i) => Math.max(0, i - 1));
  };

  const handleAction = () => {
    onAction?.(step.key);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.bg}>
        <View style={s.card}>
          <View style={s.grabber} />
          <View style={s.topRow}>
            <View style={s.progressRow}>
              {steps.map((st, i) => (
                <View
                  key={i}
                  style={[
                    s.dot,
                    i === index && s.dotActive,
                    doneMap[st.key] && i !== index && s.dotDone,
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={18} color={C.muted} />
            </TouchableOpacity>
          </View>

          <View style={s.iconCircle}>
            <Ionicons name={step.icon} size={34} color={C.brand} />
          </View>
          <Text style={s.stepCount}>
            {doneMap[step.key] ? "Paso completado ✓" : `Paso ${index + 1} de ${steps.length} · Te falta este`}
          </Text>
          <Text style={s.title}>{step.title}</Text>
          <Text style={s.desc}>{step.desc}</Text>

          <TouchableOpacity style={s.primary} onPress={handleAction} activeOpacity={0.85}>
            <Text style={s.primaryText}>{step.cta}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>

          <View style={s.navRow}>
            {index > 0 ? (
              <TouchableOpacity onPress={goBack} style={s.navBtn}>
                <Ionicons name="chevron-back" size={16} color={C.muted} />
                <Text style={s.navText}>Atrás</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onClose}>
                <Text style={s.later}>Ver más tarde</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={goNext} style={s.navBtn}>
              <Text style={s.nextText}>{isLast ? "Empezar" : "Siguiente"}</Text>
              {!isLast && <Ionicons name="chevron-forward" size={16} color={C.brand} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  card: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 30 },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 14 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  progressRow: { flexDirection: "row", gap: 6 },
  dot: { width: 24, height: 6, borderRadius: 3, backgroundColor: "#E4E4E7" },
  dotActive: { backgroundColor: C.brand, width: 32 },
  dotDone: { backgroundColor: "#FDBA74" },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },
  iconCircle: { width: 72, height: 72, borderRadius: 22, backgroundColor: "#FFF0E5", justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 12 },
  stepCount: { textAlign: "center", fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: C.brand, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  title: { textAlign: "center", fontSize: 19, fontFamily: "Montserrat_800ExtraBold", color: C.ink, marginBottom: 8 },
  desc: { textAlign: "center", fontSize: 13, fontFamily: "Montserrat_400Regular", color: C.muted, lineHeight: 19, marginBottom: 18, paddingHorizontal: 8 },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.brand, borderRadius: 16, paddingVertical: 15 },
  primaryText: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  navBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 6, paddingHorizontal: 4 },
  navText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: C.muted },
  nextText: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: C.brand },
  later: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: C.muted, paddingVertical: 6 },
});
