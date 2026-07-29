import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { BASE_URL } from "../../../constants/url";

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", green: "#10B981" };

function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL.toString().replace("/api", "")}/storage/${path}`;
}

export default function BannerManager({ banners, loading, onUpload, onToggle, onDelete }) {
  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      onUpload(result.assets[0].uri);
    }
  };

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Ionicons name="megaphone" size={18} color={C.brand} />
        <Text style={s.title}>Banners de Publicidad</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={C.brand} style={{ padding: 20 }} />
      ) : banners.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="image-outline" size={32} color="#DDD" />
          <Text style={s.emptyText}>Sube banners para promocionar tu negocio</Text>
          <Text style={s.emptySub}>Aparecerán en la pantalla principal de los clientes</Text>
        </View>
      ) : null}

      {banners.map((b) => (
        <View key={b.id} style={s.bannerItem}>
          <Image source={{ uri: getImageUrl(b.file) }} style={s.bannerImg} />
          <View style={s.bannerInfo}>
            <View style={s.bannerStatus}>
              <View style={[s.dot, { backgroundColor: b.activo ? C.green : "#EF4444" }]} />
              <Text style={[s.statusText, b.activo ? s.statusOn : s.statusOff]}>{b.activo ? "Activo" : "Inactivo"}</Text>
            </View>
            <View style={s.bannerActions}>
              <TouchableOpacity style={[s.btn, b.activo ? s.btnOff : s.btnOn]} onPress={() => onToggle(b)}>
                <Ionicons name={b.activo ? "eye-off-outline" : "eye-outline"} size={14} color={b.activo ? C.muted : C.surface} />
                <Text style={[s.btnText, b.activo ? { color: C.muted } : { color: C.surface }]}>{b.activo ? "Ocultar" : "Mostrar"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnDelete} onPress={() => onDelete(b.id)}>
                <Ionicons name="trash-outline" size={14} color="#EF4444" />
                <Text style={s.btnDeleteText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}

      {banners.length === 0 ? (
        <TouchableOpacity style={s.uploadArea} onPress={pickAndUpload}>
          <Ionicons name="cloud-upload-outline" size={22} color={C.brand} />
          <Text style={s.uploadText}>Subir banner de publicidad</Text>
        </TouchableOpacity>
      ) : (
        <Text style={s.limitText}>Ya tienes un banner. Elimínalo para subir uno nuevo.</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#F0F0F0" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  title: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  empty: { alignItems: "center", paddingVertical: 16, gap: 4 },
  emptyText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#BBB" },
  emptySub: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: "#DDD" },

  bannerItem: { marginBottom: 10, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#F0F0F0" },
  bannerImg: { width: "100%", height: 140, resizeMode: "cover" },
  bannerInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.bg },
  bannerStatus: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: "Montserrat_600SemiBold" },
  statusOn: { color: C.green },
  statusOff: { color: "#EF4444" },
  bannerActions: { flexDirection: "row", gap: 6 },
  btn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  btnOn: { backgroundColor: C.green },
  btnOff: { backgroundColor: "#E0E0E0" },
  btnDelete: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#FEF2F2" },
  btnText: { fontSize: 11, fontFamily: "Montserrat_600SemiBold" },
  btnDeleteText: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: "#EF4444" },

  uploadArea: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 2, borderColor: "#E0E0E0", borderStyle: "dashed", borderRadius: 14, paddingVertical: 14, marginTop: 4 },
  uploadText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: C.brand },
  limitText: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: "#BBB", textAlign: "center", marginTop: 4 },
});
