import { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { BASE_URL } from "../../../constants/url";
import { COLORS } from "./helpers";
import FullscreenImageViewer from "./FullscreenImageViewer";

async function pickAndCompress() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permiso requerido", "Acepta el acceso a tu galería para subir el comprobante.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.9,
  });
  if (result.canceled || !result.assets?.length) return null;
  try {
    const r = await manipulateAsync(result.assets[0].uri, [{ resize: { width: 1000 } }], { format: SaveFormat.JPEG, compress: 0.7 });
    return { uri: r.uri, name: `comprobante_${Date.now()}.jpg`, type: "image/jpeg" };
  } catch {
    const a = result.assets[0];
    return { uri: a.uri, name: `comprobante_${Date.now()}.jpg`, type: "image/jpeg" };
  }
}

export function evidenciaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL.toString().replace(/\/api\/?$/, "").replace(/\/$/, "")}/storage/${path}`;
}

export default function ReservaQrEvidencia({ reserva, onUploaded, variant = "user" }) {
  const [modal, setModal] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [viewerUri, setViewerUri] = useState(null);

  const evidencia = evidenciaUrl(reserva?.archivo_evidencia);
  const isQr = String(reserva?.metodo_pago || "").toLowerCase() === "qr";
  if (!isQr) return null;
  if (["cancelado"].includes(reserva?.estado)) return null;

  const upload = async () => {
    if (!file) {
      Alert.alert("Falta el comprobante", "Selecciona la imagen del pago primero.");
      return;
    }
    setUploading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const fd = new FormData();
      fd.append("archivo_evidencia", {
        uri: Platform.OS === "ios" ? file.uri.replace("file://", "") : file.uri,
        name: file.name,
        type: file.type,
      });
      const res = await fetch(`${BASE_URL}reservas/${reserva.id}/evidencia`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.errors?.archivo_evidencia?.[0] || `Error ${res.status}`);
      onUploaded?.(data.reserva || { ...reserva, archivo_evidencia: true });
      setModal(false);
      setFile(null);
      Alert.alert("Listo", "Comprobante enviado. El comercio lo revisará antes de tu cita.");
    } catch (e) {
      Alert.alert("No se pudo subir", e.message || "Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {evidencia ? (
        <TouchableOpacity style={s.viewRow} onPress={() => setViewerUri(evidencia)} activeOpacity={0.8}>
          <Image source={{ uri: evidencia }} style={s.viewThumb} />
          <View style={{ flex: 1 }}>
            <Text style={s.viewTitle}>Comprobante QR ✓</Text>
            <Text style={s.viewSub}>
              {variant === "comercio" ? "Toca para revisar el pago del cliente" : "Toca para verlo · ya lo tiene el comercio"}
            </Text>
          </View>
          <Ionicons name="expand-outline" size={16} color={COLORS.muted} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={s.btn} onPress={() => setModal(true)} activeOpacity={0.8}>
          <Ionicons name="cloud-upload-outline" size={16} color={COLORS.brand} />
          <Text style={s.btnText}>Subir comprobante QR</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        {variant === "user" && (
        <View style={s.bg}>
          <View style={s.card}>
            <View style={s.grabber} />
            <Text style={s.title}>Comprobante de pago</Text>
            <Text style={s.sub}>
              Reserva #{reserva.id} · Paga con el QR del comercio y sube el pantallazo antes de tu cita para que la tome como válida.
            </Text>

            {file ? (
              <TouchableOpacity style={s.prev} onPress={() => setViewerUri(file.uri)} activeOpacity={0.8}>
                <Image source={{ uri: file.uri }} style={s.thumb} />
                <Text style={s.prevText} numberOfLines={1}>Comprobante listo · toca para ampliar</Text>
                <TouchableOpacity onPress={() => setFile(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={s.pick}
                onPress={async () => { const f = await pickAndCompress(); if (f) setFile(f); }}
                activeOpacity={0.8}
              >
                <Ionicons name="image-outline" size={22} color={COLORS.brand} />
                <Text style={s.pickText}>Elegir imagen de la galería</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[s.send, (!file || uploading) && { opacity: 0.5 }]} onPress={upload} disabled={!file || uploading}>
              {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.sendText}>Enviar comprobante</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setModal(false); setFile(null); }} style={s.later}>
              <Text style={s.laterText}>Ahora no</Text>
            </TouchableOpacity>
          </View>
        </View>
        )}
      </Modal>

      <FullscreenImageViewer uri={viewerUri} onClose={() => setViewerUri(null)} />
    </>
  );
}

const s = StyleSheet.create({
  btn: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 10, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, gap: 6, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FDBA74" },
  btnText: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: COLORS.brand },
  viewRow: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 12, backgroundColor: "#ECFDF5", borderRadius: 14, padding: 10, borderWidth: 1, borderColor: "#A7F3D0" },
  viewThumb: { width: 46, height: 46, borderRadius: 10, backgroundColor: "#FFF" },
  viewTitle: { fontSize: 12, fontFamily: "Montserrat_800ExtraBold", color: "#047857" },
  viewSub: { fontSize: 10, fontFamily: "Montserrat_400Regular", color: COLORS.muted, marginTop: 1 },
  bg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  card: { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 28 },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 14 },
  title: { fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink, textAlign: "center" },
  sub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: COLORS.muted, textAlign: "center", marginTop: 6, marginBottom: 14, lineHeight: 17 },
  pick: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 2, borderColor: "#E4E4E7", borderStyle: "dashed", borderRadius: 14, paddingVertical: 18, marginBottom: 12 },
  pickText: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: COLORS.brand },
  prev: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ECFDF5", borderRadius: 12, padding: 8, marginBottom: 12, borderWidth: 1, borderColor: "#A7F3D0" },
  thumb: { width: 44, height: 44, borderRadius: 8 },
  prevText: { flex: 1, fontSize: 12, fontFamily: "Montserrat_700Bold", color: "#047857" },
  send: { backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  sendText: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  later: { alignItems: "center", paddingVertical: 10 },
  laterText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: COLORS.muted },
});
