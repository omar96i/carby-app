import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAlturaTecladoAndroid } from "../../hooks/useAlturaTecladoAndroid";

export const C = { brand: "#fa6205", brandEdge: "#C94E00", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", edge: "#E4E4E7", iconBg: "#FFF0E5", placeholder: "#A1A1AA" };

const LOGO = require("../../assets/images/carby-logo-blanco.png");

export { useAlturaTecladoAndroid };

export function RegistroScreen({ children }) {
  const tecladoAndroid = useAlturaTecladoAndroid();
  if (Platform.OS === "android") {
    return <View style={[s.screen, { paddingBottom: tecladoAndroid }]}>{children}</View>;
  }
  return (
    <View style={s.screen}>
      <KeyboardAvoidingView style={s.screen} behavior="padding">
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

export function RegistroHeader({ step, totalSteps, onBack, title, subtitle, stepLabels }) {
  const insets = useSafeAreaInsets();
  const [tecladoAbierto, setTecladoAbierto] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setTecladoAbierto(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setTecladoAbierto(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <StatusBar style="light" />
      <Image source={LOGO} style={[s.marca, { top: insets.top - 30 }]} />
      <View style={s.headerRow}>
        <TouchableOpacity onPress={onBack} style={s.back} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.surface} />
        </TouchableOpacity>
        {!!totalSteps && <View style={s.chips}>
          {Array.from({ length: totalSteps }).map((_, i) => {
            const n = i + 1;
            const on = n === step;
            return (
              <View key={n} style={[stepLabels ? s.chip : s.chipNum, on && s.chipOn, n < step && s.chipDone]}>
                <Text style={[s.chipText, on && s.chipTextOn]}>{stepLabels ? `${n} · ${stepLabels[i]}` : n}</Text>
              </View>
            );
          })}
        </View>}
      </View>
      {!tecladoAbierto && !!title && <Text style={s.heroTitle}>{title}</Text>}
      {!tecladoAbierto && !!subtitle && <Text style={s.heroSub}>{subtitle}</Text>}
    </View>
  );
}

export function RegistroCard({ children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.card, { marginBottom: insets.bottom + 16 }]}>
      <Image source={LOGO} style={s.cardMarca} />
      {children}
    </View>
  );
}

export function CampoTexto({ icon, onFocus, onBlur, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[s.field, focused && s.fieldOn]}>
      <View style={[s.iconTile, focused && s.iconTileOn]}>
        <MaterialCommunityIcons name={icon} size={18} color={focused ? C.surface : C.brand} />
      </View>
      <TextInput
        style={s.input}
        placeholderTextColor={C.placeholder}
        onFocus={(e) => { setFocused(true); onFocus && onFocus(e); }}
        onBlur={(e) => { setFocused(false); onBlur && onBlur(e); }}
        {...props}
      />
    </View>
  );
}

export function CampoSelector({ icon, value, placeholder, onPress, disabled, active, trailingIcon = "chevron-down" }) {
  return (
    <TouchableOpacity
      style={[s.field, active && s.fieldOn, disabled && { opacity: 0.5 }]}
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
    >
      <View style={[s.iconTile, active && s.iconTileOn]}>
        <MaterialCommunityIcons name={icon} size={18} color={active ? C.surface : C.brand} />
      </View>
      <Text style={[s.inputText, !value && { color: C.placeholder }]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <MaterialCommunityIcons name={trailingIcon} size={22} color={C.muted} />
    </TouchableOpacity>
  );
}

export const registroStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.brand },
  scrollContent: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 24, paddingBottom: 20 },
  title: { fontSize: 26, lineHeight: 32, fontFamily: "Montserrat_800ExtraBold", color: C.ink, marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 20, fontFamily: "Montserrat_400Regular", color: C.muted, marginBottom: 22 },
  label: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: C.ink, marginBottom: 8, marginLeft: 6 },
  buttonPrimary: {
    backgroundColor: C.brand, borderRadius: 999,
    height: 58, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", flexDirection: "row",
    shadowColor: C.brand, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
  },
  buttonTextPrimary: { color: C.surface, fontFamily: "Montserrat_700Bold", fontSize: 16, letterSpacing: 0.3 },
  buttonSecondary: { height: 58, paddingHorizontal: 18, borderRadius: 999, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", marginRight: 10 },
  buttonTextSecondary: { color: C.ink, fontFamily: "Montserrat_700Bold", fontSize: 15 },

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalContent: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "60%", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 24 },
  grabber: { width: 40, height: 5, borderRadius: 999, backgroundColor: C.edge, alignSelf: "center", marginBottom: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 8, paddingBottom: 10 },
  modalTitle: { color: C.ink, fontSize: 18, fontFamily: "Montserrat_800ExtraBold", marginBottom: 8 },
  modalCloseText: { color: C.brand, fontSize: 15, fontFamily: "Montserrat_700Bold" },
  modalItem: { paddingHorizontal: 14, minHeight: 54, borderRadius: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalItemSelected: { backgroundColor: C.iconBg },
  modalItemText: { color: C.ink, fontSize: 15, fontFamily: "Montserrat_400Regular", flex: 1 },
  modalItemTextSelected: { fontFamily: "Montserrat_700Bold" },

  dateModalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  dateModalContent: { width: "90%", backgroundColor: C.surface, borderRadius: 28, padding: 22, alignItems: "center" },
  datePickerContainer: { backgroundColor: C.surface, borderRadius: 16, padding: 10, width: "100%", alignItems: "center", marginBottom: 18 },
  loadingOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  loadingContainer: { backgroundColor: C.surface, padding: 28, borderRadius: 28, alignItems: "center", width: "80%" },
  loadingText: { color: C.ink, fontSize: 18, fontFamily: "Montserrat_800ExtraBold", marginTop: 20, marginBottom: 5 },
  loadingSubText: { color: C.muted, fontSize: 14, fontFamily: "Montserrat_400Regular" },

  docGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  docSquare: { width: "48%", aspectRatio: 1, backgroundColor: C.bg, borderRadius: 22, marginBottom: 14, borderStyle: "dashed", borderWidth: 1.5, borderColor: "#D4D4D8", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  docSquareDone: { borderStyle: "solid", borderWidth: 2, borderColor: C.brand, backgroundColor: C.surface },
  docPlaceholder: { alignItems: "center", padding: 12 },
  docIcon: { width: 52, height: 52, borderRadius: 999, backgroundColor: C.iconBg, alignItems: "center", justifyContent: "center" },
  docLabel: { color: C.ink, fontSize: 12, lineHeight: 16, fontFamily: "Montserrat_600SemiBold", marginTop: 10, textAlign: "center" },
  docImagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  checkBadge: { position: "absolute", top: 10, right: 10, backgroundColor: C.brand, borderRadius: 999, padding: 4, zIndex: 2 },
});

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.brand },
  header: { paddingHorizontal: 22, paddingBottom: 16, overflow: "hidden" },
  marca: { position: "absolute", right: -90, width: 280, height: 280, opacity: 0.13, resizeMode: "contain" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 40, height: 40, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", gap: 4, backgroundColor: "rgba(0,0,0,0.12)", padding: 4, borderRadius: 999 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  chipNum: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  chipOn: { backgroundColor: C.surface },
  chipDone: { backgroundColor: "rgba(255,255,255,0.25)" },
  chipText: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontFamily: "Montserrat_700Bold" },
  chipTextOn: { color: C.brand, fontFamily: "Montserrat_800ExtraBold" },
  heroTitle: { color: C.surface, fontSize: 26, lineHeight: 30, fontFamily: "Montserrat_800ExtraBold", marginTop: 16 },
  heroSub: { color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20, fontFamily: "Montserrat_400Regular", marginTop: 6 },
  card: {
    flex: 1, marginHorizontal: 16, backgroundColor: C.surface, borderRadius: 30, overflow: "hidden",
    shadowColor: "#6E2800", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 10,
  },
  cardMarca: { position: "absolute", alignSelf: "center", bottom: "16%", width: 230, height: 230, resizeMode: "contain", tintColor: C.iconBg },
  field: { backgroundColor: C.surface, borderRadius: 999, borderWidth: 1.5, borderColor: C.edge, paddingLeft: 8, paddingRight: 18, height: 58, marginBottom: 18, flexDirection: "row", alignItems: "center" },
  fieldOn: { borderColor: C.brand },
  iconTile: { width: 40, height: 40, borderRadius: 999, backgroundColor: C.iconBg, alignItems: "center", justifyContent: "center", marginRight: 12 },
  iconTileOn: { backgroundColor: C.brand },
  input: { flex: 1, height: 54, fontSize: 15, fontFamily: "Montserrat_400Regular", color: C.ink },
  inputText: { flex: 1, fontSize: 15, fontFamily: "Montserrat_400Regular", color: C.ink },
});
