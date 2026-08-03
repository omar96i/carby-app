import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Location from "expo-location";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { BASE_URL } from "../constants/url";

const CHUNK_SECONDS = 4;

export default function SafetyProtection({ carreraId, role }) {
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [phase, setPhase] = useState("idle");
  const sessionRef = useRef(null);
  const runningRef = useRef(false);
  const sequenceRef = useRef(0);
  const locationQueueRef = useRef([]);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!session || phase === "idle") return undefined;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.18, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [session?.id, phase, pulse]);

  const api = async (path, options = {}) => {
    const token = await AsyncStorage.getItem("userToken");
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn("[SafetyProtection] respuesta API con error", { path, status: response.status, data });
      throw new Error(data.message || `Error HTTP ${response.status}`);
    }
    return data;
  };

  const sendLocations = async () => {
    const current = sessionRef.current;
    if (!current || !locationQueueRef.current.length) return;
    const points = locationQueueRef.current.splice(0);
    try {
      await api(`safety-sessions/${current.id}/locations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locations: points }) });
      console.log("[SafetyProtection] ubicación enviada", { sessionId: current.id, points: points.length });
    } catch (locationError) {
      console.warn("[SafetyProtection] error enviando ubicación", locationError.message);
      locationQueueRef.current.unshift(...points);
    }
  };

  useEffect(() => () => {
    runningRef.current = false;
    setPhase("idle");
    const current = sessionRef.current;
    if (current) {
      console.log("[SafetyProtection] desmontando componente, cerrando sesión", current.id);
      api(`safety-sessions/${current.id}/stop`, { method: "POST" }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    let interval;
    const collect = async () => {
      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        locationQueueRef.current.push({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          sequence: sequenceRef.current++,
          recorded_at: new Date(position.timestamp || Date.now()).toISOString(),
        });
        await sendLocations();
      } catch (locationError) { console.warn("[SafetyProtection] error leyendo ubicación", locationError.message); }
    };
    collect();
    interval = setInterval(collect, 2000);
    return () => clearInterval(interval);
  }, [session?.id]);

  const uploadChunk = async (uri) => {
    const current = sessionRef.current;
    if (!current || !uri) return false;
    const form = new FormData();
    const extension = Platform.OS === "android" ? "3gp" : "m4a";
    const mimeType = Platform.OS === "android" ? "audio/3gpp" : "audio/mp4";
    form.append("audio", { uri, name: `safety-${Date.now()}.${extension}`, type: mimeType });
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
    if (position) {
      form.append("latitude", String(position.coords.latitude));
      form.append("longitude", String(position.coords.longitude));
    }
    const token = await AsyncStorage.getItem("userToken");
    console.log("[SafetyProtection] subiendo fragmento", { sessionId: current.id, uri });
    const response = await fetch(`${BASE_URL}safety-sessions/${current.id}/audio`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
    const data = await response.json().catch(() => ({}));
    console.log("[SafetyProtection] respuesta de transcripción", { sessionId: current.id, status: response.status, ok: response.ok, detected: data.detected, confidence: data.confidence, message: data.message });
    setLastResult(data);
    if (!response.ok) throw new Error(data.message || "No se pudo analizar el audio");
    if (data.detected) {
      setSession((value) => ({ ...value, status: "alerted" }));
      setPhase("alerted");
      runningRef.current = false;
      console.warn("[SafetyProtection] palabra detectada, grabación detenida", current.id);
    } else {
      setPhase("listening");
    }
    return Boolean(data.detected);
  };

  const recordChunks = async () => {
    while (runningRef.current) {
      await recorder.prepareToRecordAsync();
      // The native SDK 53 build exposes only record() without options.
      recorder.record();
      console.log("[SafetyProtection] grabando fragmento", { sessionId: sessionRef.current?.id, seconds: CHUNK_SECONDS });
      await new Promise((resolve) => setTimeout(resolve, CHUNK_SECONDS * 1000 + 300));
      if (!runningRef.current && !recorder.uri) break;
      if (recorder.isRecording) await recorder.stop();
      console.log("[SafetyProtection] fragmento detenido", { sessionId: sessionRef.current?.id, uri: recorder.uri });
      setPhase("processing");
      const detected = await uploadChunk(recorder.uri);
      if (detected) break;
    }
  };

  const start = async () => {
    setError(""); setLoading(true);
    try {
      const microphone = await AudioModule.requestRecordingPermissionsAsync();
      const location = await Location.requestForegroundPermissionsAsync();
      console.log("[SafetyProtection] permisos", { microphone: microphone.status, location: location.status });
      if (!microphone.granted || !location.granted) throw new Error("Necesitas permitir micrófono y ubicación para activar la protección.");
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: false });
      const created = await api("safety-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ carrera_id: carreraId, role }) });
      sessionRef.current = created;
      setSession(created);
      setPhase("listening");
      console.log("[SafetyProtection] sesión creada", created);
      runningRef.current = true;
      setLoading(false);
      recordChunks().catch((error) => { console.error("[SafetyProtection] error en ciclo de audio", error); runningRef.current = false; setPhase("error"); setError(error.message); });
    } catch (error) { console.error("[SafetyProtection] error iniciando protección", error); setPhase("error"); setError(error.message); setLoading(false); }
  };

  const stop = async () => {
    runningRef.current = false;
    console.log("[SafetyProtection] detención manual");
    try { if (recorder.isRecording) await recorder.stop(); } catch {}
    const current = sessionRef.current;
    if (current) { await api(`safety-sessions/${current.id}/stop`, { method: "POST" }).catch(() => {}); }
    sessionRef.current = null; setSession(null); setLastResult(null); setPhase("idle"); locationQueueRef.current = [];
  };

  if (!carreraId) return null;
  const alerted = phase === "alerted" || session?.status === "alerted";
  const processing = phase === "processing";
  const statusLabel = alerted ? "Alerta enviada" : processing ? "Analizando audio" : session ? "Protección activa" : "Protección de seguridad";
  const statusMessage = alerted
    ? "Se está enviando tu ubicación a nuestras centrales para hacer seguimiento."
    : processing
      ? "Procesando el fragmento de audio de forma segura."
      : session
        ? "Escuchando tu palabra configurada y enviando ubicación cada 2 segundos."
        : "Actívala manualmente durante esta carrera.";
  return (
    <View style={[styles.card, alerted && styles.alertCard]}>
      <View style={styles.header}>
        <Animated.View style={[styles.statusIcon, { transform: [{ scale: pulse }] }]}><Feather name={alerted ? "alert-triangle" : processing ? "loader" : "shield"} size={23} color={alerted ? "#D82D2D" : "#fa6205"} /></Animated.View>
        <View style={styles.copy}><Text style={styles.title}>{statusLabel}</Text><Text style={styles.subtitle}>{statusMessage}</Text>{session && lastResult && <Text style={styles.analysis}>Último análisis: {lastResult.detected ? "palabra detectada" : "no detectada"} · confianza {Math.round((lastResult.confidence || 0) * 100)}%</Text>}</View>
      </View>
      {session && <View style={styles.indicators}><View style={styles.indicator}><View style={[styles.dot, phase === "processing" ? styles.dotProcessing : styles.dotActive]} /><Text style={styles.indicatorText}>{processing ? "Audio en análisis" : alerted ? "Audio detenido" : "Escucha activa"}</Text></View><View style={styles.indicator}><View style={[styles.dot, alerted ? styles.dotAlert : styles.dotActive]} /><Text style={styles.indicatorText}>{alerted ? "Ubicación prioritaria" : "Ubicación cada 2 s"}</Text></View></View>}
      {!session ? <TouchableOpacity disabled={loading} style={styles.button} onPress={start}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Activar protección</Text>}</TouchableOpacity> : <TouchableOpacity style={[styles.button, alerted && styles.alertButton]} onPress={stop}><Text style={styles.buttonText}>{alerted ? "Finalizar seguimiento" : "Detener protección"}</Text></TouchableOpacity>}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFF", borderRadius: 16, padding: 15, marginBottom: 18, borderWidth: 1, borderColor: "#F0F0F0" }, alertCard: { backgroundColor: "#FFF5F5", borderColor: "#F3A3A3" },
  header: { flexDirection: "row", alignItems: "center" }, statusIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: "#FDEEE2", justifyContent: "center", alignItems: "center" }, copy: { flex: 1, marginLeft: 12 }, title: { color: "#1C1C1E", fontWeight: "700", fontSize: 15 }, subtitle: { color: "#666", fontSize: 12, marginTop: 4, lineHeight: 18 }, analysis: { color: "#555", fontSize: 11, marginTop: 5 }, indicators: { flexDirection: "row", gap: 8, marginTop: 14 }, indicator: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#F7F7F8", borderRadius: 9, paddingVertical: 8, paddingHorizontal: 9 }, dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 }, dotActive: { backgroundColor: "#22A06B" }, dotProcessing: { backgroundColor: "#E59B16" }, dotAlert: { backgroundColor: "#D82D2D" }, indicatorText: { color: "#555", fontSize: 10, flex: 1 }, button: { backgroundColor: "#fa6205", borderRadius: 10, alignItems: "center", paddingVertical: 12, marginTop: 14 }, alertButton: { backgroundColor: "#D82D2D" }, buttonText: { color: "#FFF", fontWeight: "700" }, error: { color: "#D82D2D", fontSize: 12, marginTop: 8 },
});
