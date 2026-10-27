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

const Paso = ({ n, done, last, children }) => (
  <View style={s.stepRow}>
    <View style={s.stepRail}>
      <View style={[s.stepNum, done && s.stepNumDone]}>
        {done ? <Ionicons name="checkmark" size={14} color="#FFF" /> : <Text style={s.stepNumText}>{n}</Text>}
      </View>
      {!last && <View style={s.stepLine} />}
    </View>
    <View style={[s.stepBody, !last && s.stepBodySpaced]}>{children}</View>
  </View>
);

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

  const qrListo = !!qrImageUrl && !qrError;

  return (
    <View style={s.card}>
      <View style={s.head}>
        <View style={s.headIcon}>
          <Ionicons name="qr-code" size={20} color={C.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Pago con QR</Text>
          <Text style={s.sub}>Total a pagar: <Text style={s.total}>${Number(total || 0).toLocaleString("es-CO")}</Text></Text>
        </View>
      </View>

      {showNotice && (
        <View style={s.notice}>
          <Ionicons name="time" size={16} color="#D97706" />
          <Text style={s.noticeText}>
            Puedes reservar ahora y pagar después, pero sube el comprobante antes de tu cita para que el comercio la tome como válida.
          </Text>
        </View>
      )}

      <Paso n={1} done={qrListo}>
        <Text style={s.stepTitle}>Escanea el QR para pagar</Text>
        {qrListo ? (
          <TouchableOpacity style={s.qrFrame} onPress={() => setViewerUri(qrImageUrl)} activeOpacity={0.85}>
            <Image
              source={{ uri: qrImageUrl }}
              style={s.qr}
              resizeMode="contain"
              onError={() => setQrError(true)}
            />
            <View style={s.tapHintRow}>
              <Ionicons name="expand" size={12} color={C.muted} />
              <Text style={s.tapHint}>Toca la imagen para ampliarla</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <Text style={s.stepHint}>
            {qrError
              ? "No pudimos cargar la imagen del QR. Igual puedes reservar y subir el comprobante después."
              : "El comercio aún no publica su QR."}
          </Text>
        )}
      </Paso>

      <Paso n={2}>
        <Text style={s.stepTitle}>Paga desde tu app</Text>
        <Text style={s.stepHint}>Nequi, Bancolombia u otra app que lea QR. Guarda el pantallazo del pago.</Text>
      </Paso>

      <Paso n={3} done={!!comprobante} last>
        <Text style={s.stepTitle}>
          Sube el comprobante{comprobante ? "" : " (opcional ahora)"}
        </Text>
        {comprobante ? (
          <>
            <TouchableOpacity style={s.filePrev} onPress={() => setViewerUri(comprobante.uri)} activeOpacity={0.85}>
              <Image source={{ uri: comprobante.uri }} style={s.fileBig} resizeMode="cover" />
              <View style={s.fileZoom}>
                <Ionicons name="expand" size={12} color="#FFF" />
                <Text style={s.fileZoomText}>Toca para ampliar</Text>
              </View>
            </TouchableOpacity>
            <View style={s.fileRow}>
              <View style={s.fileOk}>
                <Ionicons name="checkmark-circle" size={16} color={C.green} />
                <Text style={s.fileName} numberOfLines={1}>Comprobante listo · se enviará con tu reserva</Text>
              </View>
              <TouchableOpacity style={s.fileDel} onPress={onRemoveComprobante} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={17} color="#EF4444" />
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
      </Paso>

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
  card: { backgroundColor: C.bg, borderRadius: 24, padding: 16 },
  head: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  headIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  sub: { fontSize: 12.5, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 2 },
  total: { fontFamily: "Montserrat_800ExtraBold", color: C.brand },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: C.surface, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 18 },
  noticeText: { flex: 1, fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: "#92400E", lineHeight: 17 },

  stepRow: { flexDirection: "row", gap: 12 },
  stepRail: { alignItems: "center", width: 28 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.ink, justifyContent: "center", alignItems: "center" },
  stepNumDone: { backgroundColor: C.green },
  stepNumText: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: C.surface },
  stepLine: { flex: 1, width: 2, borderRadius: 1, backgroundColor: "#D4D4D8", marginVertical: 4 },
  stepBody: { flex: 1, paddingTop: 4 },
  stepBodySpaced: { paddingBottom: 18 },
  stepTitle: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: C.ink, marginBottom: 6 },
  stepHint: { fontSize: 12.5, fontFamily: "Montserrat_400Regular", color: C.muted, lineHeight: 18 },

  qrFrame: { backgroundColor: C.surface, borderRadius: 22, padding: 14, alignItems: "center", marginTop: 4 },
  qr: { width: "100%", maxWidth: 240, aspectRatio: 1 },
  tapHintRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  tapHint: { fontSize: 11.5, fontFamily: "Montserrat_600SemiBold", color: C.muted },

  upBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.ink, borderRadius: 999, height: 50, marginTop: 6 },
  upText: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: "#FFF" },
  filePrev: { borderRadius: 18, overflow: "hidden", backgroundColor: C.surface, marginTop: 4 },
  fileBig: { width: "100%", height: 170 },
  fileZoom: { position: "absolute", bottom: 8, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  fileZoomText: { fontSize: 11, fontFamily: "Montserrat_700Bold", color: "#FFF" },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  fileOk: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ECFDF5", borderRadius: 999, paddingVertical: 9, paddingHorizontal: 12 },
  fileName: { flex: 1, fontSize: 11.5, fontFamily: "Montserrat_700Bold", color: "#047857" },
  fileDel: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FEF2F2", justifyContent: "center", alignItems: "center" },
});
