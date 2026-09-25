import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import FullscreenImageViewer from "../usuario/pedidos/FullscreenImageViewer";

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", green: "#10B981" };

async function compressImage(uri) {
  try {
    const r = await manipulateAsync(uri, [{ resize: { width: 1000 } }], { format: SaveFormat.JPEG, compress: 0.7 });
    return r.uri;
  } catch {
    return uri;
  }
}

export function validateQrReady({ qrEnabled, qrImageUrl }) {
  if (!qrEnabled) return { ok: false, reason: "Este establecimiento solo acepta pago en efectivo." };
  if (!qrImageUrl) return { ok: true, warn: "El comercio aún no publica su QR. Podrás pagar y subir el comprobante después." };
  return { ok: true };
}

export default function QrPaymentCard({
  qrEnabled,
  qrImageUrl,
  total,
  comprobante,
  onComprobante,
  onRemoveComprobante,
  showNotice = true,
}) {
  const [picking, setPicking] = useState(false);
  const [viewerUri, setViewerUri] = useState(null);
  const [qrError, setQrError] = useState(false);

  const pickComprobante = async () => {
    setPicking(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso requerido", "Acepta el acceso a tu galería para subir el comprobante.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.length) return;
      const uri = await compressImage(result.assets[0].uri);
      onComprobante?.({ uri, name: `comprobante_${Date.now()}.jpg`, type: "image/jpeg" });
    } catch {
      Alert.alert("Error", "No se pudo seleccionar la imagen.");
    } finally {
      setPicking(false);
    }
  };

  return (
    <View style={s.card}>
      <View style={s.head}>
        <View style={s.headIcon}>
          <Ionicons name="qr-code-outline" size={20} color={C.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Pago con QR</Text>
          <Text style={s.sub}>Total a pagar: <Text style={s.total}>${Number(total || 0).toLocaleString("es-CO")}</Text></Text>
        </View>
      </View>

      {showNotice && (
        <View style={s.notice}>
          <Ionicons name="time-outline" size={15} color="#B45309" />
          <Text style={s.noticeText}>
            Puedes reservar ahora y pagar después, pero sube el comprobante antes de tu cita para que el comercio la tome como válida.
          </Text>
        </View>
      )}

      <View style={s.steps}>
        <View style={s.stepRow}>
          <View style={[s.stepNum, qrImageUrl && !qrError && s.stepNumDone]}>
            <Text style={[s.stepNumText, qrImageUrl && !qrError && { color: "#FFF" }]}>1</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.stepTitle}>Escanea el QR para pagar</Text>
            {qrImageUrl && !qrError ? (
              <>
                <TouchableOpacity onPress={() => setViewerUri(qrImageUrl)} activeOpacity={0.8}>
                  <Image
                    source={{ uri: qrImageUrl }}
                    style={s.qr}
                    resizeMode="contain"
                    onError={() => setQrError(true)}
                  />
                </TouchableOpacity>
                <Text style={s.tapHint}>Toca la imagen para ampliarla</Text>
              </>
            ) : (
              <Text style={s.stepHint}>
                {qrError
                  ? "No pudimos cargar la imagen del QR. Igual puedes reservar y subir el comprobante después."
                  : "El comercio aún no publica su QR."}
              </Text>
            )}
          </View>
        </View>

        <View style={s.stepRow}>
          <View style={s.stepNum}><Text style={s.stepNumText}>2</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.stepTitle}>Paga desde tu app</Text>
            <Text style={s.stepHint}>Nequi, Bancolombia u otra app que lea QR. Guarda el pantallazo del pago.</Text>
          </View>
        </View>

        <View style={s.stepRow}>
          <View style={[s.stepNum, comprobante && s.stepNumDone]}>
            <Text style={[s.stepNumText, comprobante && { color: "#FFF" }]}>{comprobante ? "✓" : "3"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.stepTitle}>Sube el comprobante {comprobante ? "✓" : "(opcional ahora)"}</Text>
            {comprobante ? (
              <>
                <TouchableOpacity style={s.filePrev} onPress={() => setViewerUri(comprobante.uri)} activeOpacity={0.8}>
                  <Image source={{ uri: comprobante.uri }} style={s.fileBig} resizeMode="cover" />
                  <View style={s.fileZoom}>
                    <Ionicons name="expand-outline" size={14} color="#FFF" />
                    <Text style={s.fileZoomText}>Toca para ampliar</Text>
                  </View>
                </TouchableOpacity>
                <View style={s.fileRow}>
                  <View style={s.fileOk}>
                    <Ionicons name="checkmark-circle" size={15} color={C.green} />
                    <Text style={s.fileName} numberOfLines={1}>Comprobante listo · se enviará con tu reserva</Text>
                  </View>
                  <TouchableOpacity style={s.fileDel} onPress={onRemoveComprobante} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity style={s.upBtn} onPress={pickComprobante} disabled={picking} activeOpacity={0.8}>
                {picking
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />}
                <Text style={s.upText}>{picking ? "Abriendo galería…" : "Subir comprobante"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <FullscreenImageViewer uri={viewerUri} onClose={() => setViewerUri(null)} />
    </View>
  );
}

export function qrFileForUpload(comprobante) {
  if (!comprobante?.uri) return null;
  return {
    uri: Platform.OS === "ios" ? comprobante.uri.replace("file://", "") : comprobante.uri,
    name: comprobante.name || `comprobante_${Date.now()}.jpg`,
    type: comprobante.type || "image/jpeg",
  };
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#F0F0F0", marginTop: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  headIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFF0E5", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  sub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 2 },
  total: { fontFamily: "Montserrat_800ExtraBold", color: C.brand },
  notice: { flexDirection: "row", gap: 8, backgroundColor: "#FFFBEB", borderRadius: 12, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: "#FDE68A" },
  noticeText: { flex: 1, fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: "#92400E", lineHeight: 15 },
  steps: { gap: 14 },
  stepRow: { flexDirection: "row", gap: 10 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", marginTop: 1 },
  stepNumDone: { backgroundColor: C.green },
  stepNumText: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  stepTitle: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: C.ink, marginBottom: 6 },
  stepHint: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: C.muted, lineHeight: 15 },
  qr: { width: "100%", aspectRatio: 1, maxWidth: 260, borderRadius: 12, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#EEE" },
  tapHint: { fontSize: 10, fontFamily: "Montserrat_600SemiBold", color: C.muted, marginTop: 4 },
  upBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.ink, borderRadius: 14, paddingVertical: 13, marginTop: 4 },
  upText: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  filePrev: { borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#A7F3D0", backgroundColor: "#ECFDF5" },
  fileBig: { width: "100%", height: 170 },
  fileZoom: { position: "absolute", bottom: 8, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  fileZoomText: { fontSize: 10, fontFamily: "Montserrat_700Bold", color: "#FFF" },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  fileOk: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ECFDF5", borderRadius: 12, padding: 9, borderWidth: 1, borderColor: "#A7F3D0" },
  fileName: { flex: 1, fontSize: 11, fontFamily: "Montserrat_700Bold", color: "#047857" },
  fileDel: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FEF2F2", justifyContent: "center", alignItems: "center" },
});
