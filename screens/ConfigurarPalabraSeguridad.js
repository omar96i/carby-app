import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../constants/url";
import AlertaModal from "../components/ErrorModal";
import { useAlturaTecladoAndroid } from "../hooks/useAlturaTecladoAndroid";

export default function ConfigurarPalabraSeguridad() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const tecladoAndroid = useAlturaTecladoAndroid();
  const [word, setWord] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [alert, setAlert] = useState({ visible: false, message: "", type: "info" });
  const [foco, setFoco] = useState(null);

  const request = async (path, options = {}) => {
    const token = await AsyncStorage.getItem("userToken");
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "No se pudo completar la operación");
    return data;
  };

  useEffect(() => { request("user-security-word").then((data) => setConfigured(Boolean(data.configured))).catch(() => {}); }, []);

  const save = async () => {
    if (word.trim().length < 2) return setAlert({ visible: true, message: "Usa una palabra o frase de al menos 2 caracteres.", type: "error" });
    if (word.trim() !== confirmation.trim()) return setAlert({ visible: true, message: "Las palabras no coinciden.", type: "error" });
    setLoading(true);
    try {
      await request("user-security-word", { method: "POST", body: JSON.stringify({ word: word.trim(), locale: "es-CO" }) });
      setConfigured(true); setWord(""); setConfirmation("");
      setAlert({ visible: true, message: "Palabra de seguridad configurada.", type: "success" });
    } catch (error) { setAlert({ visible: true, message: error.message, type: "error" }); }
    finally { setLoading(false); }
  };

  const remove = async () => {
    setLoading(true);
    try { await request("user-security-word", { method: "DELETE" }); setConfigured(false); setAlert({ visible: true, message: "Palabra eliminada.", type: "success" }); }
    catch (error) { setAlert({ visible: true, message: error.message, type: "error" }); }
    finally { setLoading(false); }
  };

  const tecladoAbierto = tecladoAndroid > 0;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding" enabled={Platform.OS === "ios"}>
      <StatusBar style="light" />
      <ScrollView
        style={{ marginBottom: tecladoAndroid }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { paddingTop: insets.top + 6 }, tecladoAbierto && styles.heroTeclado]}>
          <Image source={require("../assets/images/carby-logo-blanco.png")} style={[styles.heroMarca, { top: insets.top - 40 }]} />
          <View style={styles.headerBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color={C.surface} />
            </TouchableOpacity>
            <Text style={styles.title}>Palabra de seguridad</Text>
            <View style={styles.backBtnEspacio} />
          </View>

          {!tecladoAbierto && (
            <View style={styles.heroBody}>
              <View style={styles.icon}>
                <Feather name="shield" size={24} color={C.brand} />
              </View>
              <Text style={styles.heading}>Configura una palabra de ayuda</Text>
              <Text style={styles.description}>Durante un arrendamiento podrás activar la protección. Si el sistema escucha esta palabra, detendrá la grabación y enviará una alerta con tu ubicación.</Text>
            </View>
          )}
        </View>

        <View style={[styles.sheet, { paddingBottom: (tecladoAbierto ? 0 : insets.bottom) + 16 }]}>
          <View style={[styles.statusPill, configured && styles.statusPillOn]}>
            <View style={[styles.statusDot, configured && styles.statusDotOn]} />
            <Text style={[styles.status, configured && styles.statusOn]}>
              {configured ? "Palabra configurada" : "No tienes una palabra configurada"}
            </Text>
          </View>

          <Text style={styles.label}>Palabra o frase</Text>
          <View style={[styles.inputRow, foco === "word" && styles.inputFocus]}>
            <View style={[styles.iconTile, foco === "word" && styles.iconTileFocus]}>
              <Feather name="key" size={17} color={foco === "word" ? C.surface : C.brand} />
            </View>
            <TextInput
              value={word}
              onChangeText={setWord}
              secureTextEntry={!visible}
              autoCapitalize="none"
              style={styles.input}
              placeholder="Ej. necesito ayuda"
              placeholderTextColor={C.placeholder}
              onFocus={() => setFoco("word")}
              onBlur={() => setFoco(null)}
            />
            <TouchableOpacity onPress={() => setVisible((value) => !value)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name={visible ? "eye-off" : "eye"} size={19} color={C.muted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirmar</Text>
          <View style={[styles.inputRow, foco === "confirmation" && styles.inputFocus]}>
            <View style={[styles.iconTile, foco === "confirmation" && styles.iconTileFocus]}>
              <Feather name="check" size={17} color={foco === "confirmation" ? C.surface : C.brand} />
            </View>
            <TextInput
              value={confirmation}
              onChangeText={setConfirmation}
              secureTextEntry={!visible}
              autoCapitalize="none"
              style={styles.input}
              placeholder="Repite la palabra o frase"
              placeholderTextColor={C.placeholder}
              onFocus={() => setFoco("confirmation")}
              onBlur={() => setFoco(null)}
            />
          </View>

          <View style={styles.acciones}>
            <TouchableOpacity disabled={loading} style={[styles.primary, loading && styles.primaryDisabled]} onPress={save} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color={C.surface} /> : <Text style={styles.primaryText}>{configured ? "Cambiar palabra" : "Guardar palabra"}</Text>}
            </TouchableOpacity>
            {configured && (
              <TouchableOpacity disabled={loading} style={styles.danger} onPress={remove} activeOpacity={0.8}>
                <Feather name="trash-2" size={16} color="#EF4444" />
                <Text style={styles.dangerText}>Eliminar palabra configurada</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
      <AlertaModal visible={alert.visible} mensaje={alert.message} tipo={alert.type} onCerrar={() => setAlert((value) => ({ ...value, visible: false }))} />
    </KeyboardAvoidingView>
  );
}

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", edge: "#E4E4E7", iconBg: "#FFF0E5", green: "#10B981", placeholder: "#A1A1AA" };
const BOTON_ELEVADO = { shadowColor: "#fa6205", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },
  scroll: { flexGrow: 1, backgroundColor: C.surface },

  hero: { backgroundColor: C.brand, paddingHorizontal: 16, paddingBottom: 60, overflow: "hidden" },
  heroTeclado: { paddingBottom: 48 },
  heroMarca: { position: "absolute", right: -120, width: 320, height: 320, opacity: 0.14, resizeMode: "contain" },
  headerBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  backBtnEspacio: { width: 38 },
  title: { color: C.surface, fontSize: 17, fontFamily: "Montserrat_800ExtraBold" },
  heroBody: { marginTop: 22, paddingHorizontal: 4 },
  icon: { width: 52, height: 52, borderRadius: 18, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  heading: { fontSize: 22, lineHeight: 27, fontFamily: "Montserrat_800ExtraBold", color: C.surface, marginBottom: 8 },
  description: { color: "rgba(255,255,255,0.88)", fontSize: 13.5, lineHeight: 20, fontFamily: "Montserrat_400Regular" },

  sheet: { flex: 1, backgroundColor: C.surface, borderTopLeftRadius: 36, borderTopRightRadius: 36, marginTop: -36, paddingHorizontal: 20, paddingTop: 24 },
  statusPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: C.bg, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, marginBottom: 20 },
  statusPillOn: { backgroundColor: "#ECFDF5" },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.placeholder },
  statusDotOn: { backgroundColor: C.green },
  status: { color: C.muted, fontSize: 12.5, fontFamily: "Montserrat_700Bold" },
  statusOn: { color: C.green },

  label: { color: C.ink, fontSize: 14, fontFamily: "Montserrat_700Bold", marginBottom: 8, marginLeft: 4 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 999, borderWidth: 1.5, borderColor: C.edge, height: 60, paddingLeft: 9, paddingRight: 20, marginBottom: 18 },
  inputFocus: { borderColor: C.brand },
  iconTile: { width: 40, height: 40, borderRadius: 999, backgroundColor: C.iconBg, alignItems: "center", justifyContent: "center", marginRight: 12 },
  iconTileFocus: { backgroundColor: C.brand },
  input: { flex: 1, height: 52, fontSize: 15, fontFamily: "Montserrat_400Regular", color: C.ink },

  acciones: { marginTop: "auto", paddingTop: 12 },
  primary: { backgroundColor: C.brand, borderRadius: 999, alignItems: "center", justifyContent: "center", height: 58, ...BOTON_ELEVADO },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { color: C.surface, fontSize: 16, fontFamily: "Montserrat_700Bold" },
  danger: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, marginTop: 6 },
  dangerText: { color: "#EF4444", fontSize: 14, fontFamily: "Montserrat_700Bold" },
});
