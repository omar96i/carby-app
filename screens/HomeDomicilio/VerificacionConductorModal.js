import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  getEstadoVerificacion,
  iniciarVerificacion,
  confirmarVerificacion,
} from "../../services/verificacionConductor";

export default function VerificacionConductorModal({ visible, onVerified }) {
  const insets = useSafeAreaInsets();
  const [paso, setPaso] = useState("info");
  const [esRegistroInicial, setEsRegistroInicial] = useState(true);
  const [enrollUrl, setEnrollUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    if (visible) {
      consultarTipo();
    } else {
      limpiar();
    }
    return limpiar;
  }, [visible]);

  const limpiar = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const consultarTipo = async () => {
    setPaso("info");
    setEnrollUrl(null);
    setError("");
    try {
      const estado = await getEstadoVerificacion();
      setEsRegistroInicial(estado.es_registro_inicial !== false);
      if (!estado.requiere_verificacion) {
        onVerified?.();
      }
    } catch (e) {
      setEsRegistroInicial(true);
    }
  };

  const comenzar = async () => {
    setLoading(true);
    setError("");
    try {
      let estado;
      try {
        estado = await getEstadoVerificacion();
      } catch (e) {
        estado = await iniciarVerificacion();
      }
      setEsRegistroInicial(estado.es_registro_inicial !== false);
      if (!estado.requiere_verificacion) {
        setPaso("exito");
        return;
      }
      const url = estado.enroll_url || (await iniciarVerificacion()).enroll_url;
      setEnrollUrl(url);
      setPaso("webview");
      pollRef.current = setInterval(verificar, 10000);
    } catch (e) {
      setError(e.message || "No se pudo iniciar la verificación.");
    } finally {
      setLoading(false);
    }
  };

  const verificar = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const { ok } = await confirmarVerificacion();
      if (ok) {
        limpiar();
        setPaso("exito");
      }
    } catch (e) {
    } finally {
      setChecking(false);
    }
  };

  const cerrarExito = () => {
    setPaso("info");
    setEnrollUrl(null);
    onVerified?.();
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={() => {}}>
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="shield-check" size={28} color="#fa6205" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {esRegistroInicial ? "Registro de identidad" : "Verificación de identidad"}
            </Text>
            <Text style={styles.subtitle}>
              {esRegistroInicial ? "Un paso para cuidar a todos" : "Confirmemos que sigues siendo tú"}
            </Text>
          </View>
        </View>

        {paso === "info" && (
          <View style={styles.center}>
            <View style={styles.bigIcon}>
              <MaterialCommunityIcons
                name={esRegistroInicial ? "account-plus-outline" : "refresh-circle"}
                size={64}
                color="#fa6205"
              />
            </View>
            <Text style={styles.infoTitle}>
              {esRegistroInicial
                ? "Completa tu registro de identidad"
                : "Es momento de verificarte de nuevo"}
            </Text>
            <Text style={styles.infoText}>
              {esRegistroInicial
                ? "Para proteger a nuestros clientes y a ti como conductor, necesitamos registrar tu identidad antes de que puedas activarte y recibir arrendamientos. Es un proceso único y solo toma un minuto."
                : "Para seguir cuidando la seguridad de nuestros clientes, necesitamos confirmar que sigues siendo tú antes de que puedas activarte y recibir arrendamientos. Es rápido y solo toma un minuto."}
            </Text>
            <View style={styles.bullets}>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.bulletText}>
                  {esRegistroInicial
                    ? "Registro único, solo toma un minuto"
                    : "Reverificación rápida, solo toma un minuto"}
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.bulletText}>Tus datos están protegidos</Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.bulletText}>Genera más confianza en tus clientes</Text>
              </View>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.primaryBtn, styles.fullBtn]}
              onPress={comenzar}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {esRegistroInicial ? "Registrarme ahora" : "Verificarme de nuevo"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {paso === "webview" && enrollUrl && (
          <>
            <WebView source={{ uri: enrollUrl }} style={styles.webview} startInLoadingState />
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
              <Text style={styles.hint}>
                {checking
                  ? "Comprobando tu verificación…"
                  : "Completa el proceso en la pantalla y luego pulsa el botón."}
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={verificar}
                disabled={checking}
                activeOpacity={0.85}
              >
                {checking ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Ya me verifiqué</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {paso === "exito" && (
          <View style={styles.center}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={56} color="#FFF" />
            </View>
            <Text style={styles.infoTitle}>¡Gracias por tu verificación!</Text>
            <Text style={styles.infoText}>
              Ahora ya podrás hacer uso de la plataforma normalmente. Periódicamente se te
              solicitará hacer una reverificación para la seguridad de nuestros clientes.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, styles.fullBtn]}
              onPress={cerrarExito}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(250, 98, 5, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: { flex: 1 },
  title: { color: "#1C1C1E", fontSize: 18, fontFamily: "Montserrat_700Bold" },
  subtitle: { color: "#64748B", fontSize: 13, fontFamily: "Montserrat_400Regular", marginTop: 4 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 14 },
  bigIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(250, 98, 5, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  infoTitle: {
    color: "#1C1C1E",
    fontSize: 22,
    fontFamily: "Montserrat_700Bold",
    textAlign: "center",
    lineHeight: 28,
  },
  infoText: {
    color: "#64748B",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  bullets: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 4,
  },
  bulletRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bulletText: { color: "#334155", fontSize: 13, fontFamily: "Montserrat_600SemiBold", flex: 1 },
  hint: { color: "#64748B", fontSize: 13, fontFamily: "Montserrat_400Regular", textAlign: "center" },
  error: { color: "#EF4444", fontSize: 14, fontFamily: "Montserrat_600SemiBold", textAlign: "center" },
  webview: { flex: 1 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fa6205",
    paddingVertical: 16,
    borderRadius: 18,
  },
  fullBtn: { width: "100%", marginTop: 8 },
  primaryBtnText: { color: "#FFF", fontSize: 16, fontFamily: "Montserrat_700Bold" },
  successCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
});
