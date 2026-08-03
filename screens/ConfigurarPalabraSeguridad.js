import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { BASE_URL } from "../constants/url";
import AlertaModal from "../components/ErrorModal";

export default function ConfigurarPalabraSeguridad() {
  const navigation = useNavigation();
  const [word, setWord] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [alert, setAlert] = useState({ visible: false, message: "", type: "info" });

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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Feather name="arrow-left" size={24} color="#FFF" /></TouchableOpacity><Text style={styles.title}>Palabra de seguridad</Text><View style={{ width: 24 }} /></View>
      <View style={styles.content}>
        <View style={styles.icon}><Feather name="shield" size={34} color="#fa6205" /></View>
        <Text style={styles.heading}>Configura una palabra de ayuda</Text>
        <Text style={styles.description}>Durante una carrera podrás activar la protección. Si el sistema escucha esta palabra, detendrá la grabación y enviará una alerta con tu ubicación.</Text>
        <Text style={styles.label}>Palabra o frase</Text>
        <View style={styles.inputRow}><TextInput value={word} onChangeText={setWord} secureTextEntry={!visible} autoCapitalize="none" style={styles.input} placeholder="Ej. necesito ayuda" /><TouchableOpacity onPress={() => setVisible((value) => !value)}><Feather name={visible ? "eye-off" : "eye"} size={20} color="#888" /></TouchableOpacity></View>
        <Text style={styles.label}>Confirmar</Text>
        <TextInput value={confirmation} onChangeText={setConfirmation} secureTextEntry={!visible} autoCapitalize="none" style={styles.inputBox} placeholder="Repite la palabra o frase" />
        <TouchableOpacity disabled={loading} style={styles.primary} onPress={save}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>{configured ? "Cambiar palabra" : "Guardar palabra"}</Text>}</TouchableOpacity>
        {configured && <TouchableOpacity disabled={loading} style={styles.danger} onPress={remove}><Text style={styles.dangerText}>Eliminar palabra configurada</Text></TouchableOpacity>}
        <Text style={styles.status}>{configured ? "Palabra configurada" : "No tienes una palabra configurada"}</Text>
      </View>
      <AlertaModal visible={alert.visible} mensaje={alert.message} tipo={alert.type} onCerrar={() => setAlert((value) => ({ ...value, visible: false }))} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F4F5" }, header: { backgroundColor: "#1C1C1E", paddingTop: 45, paddingHorizontal: 20, paddingBottom: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, title: { color: "#FFF", fontSize: 18, fontWeight: "700" }, content: { padding: 22 }, icon: { width: 70, height: 70, borderRadius: 22, backgroundColor: "#FDEEE2", alignItems: "center", justifyContent: "center", marginBottom: 18 }, heading: { fontSize: 22, fontWeight: "700", color: "#1C1C1E", marginBottom: 8 }, description: { color: "#71717A", lineHeight: 21, marginBottom: 26 }, label: { color: "#1C1C1E", fontWeight: "700", marginBottom: 8, marginTop: 12 }, inputRow: { backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E5E5E5" }, input: { flex: 1, paddingVertical: 14 }, inputBox: { backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: "#E5E5E5" }, primary: { backgroundColor: "#fa6205", borderRadius: 12, alignItems: "center", paddingVertical: 15, marginTop: 26 }, primaryText: { color: "#FFF", fontWeight: "700" }, danger: { alignItems: "center", paddingVertical: 15 }, dangerText: { color: "#E53935", fontWeight: "700" }, status: { textAlign: "center", color: "#888", marginTop: 8 },
});
