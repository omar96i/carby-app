import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5" };

export default function ItemCreator({ categorias, onCreate, showServicios = true }) {
  const [mode, setMode] = useState("producto");
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [extra, setExtra] = useState("");
  const [foto, setFoto] = useState(null);
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id || null);
  const [loading, setLoading] = useState(false);
  const [descuento, setDescuento] = useState("");
  const [activoDescuento, setActivoDescuento] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setFoto(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!nombre || !precio || !categoriaId) return;
    setLoading(true);
    try {
      await onCreate({
        nombre: nombre.trim(),
        precio: parseInt(precio.replace(/\D/g, "")) || 0,
        extra: extra.trim(),
        categoria_id: categoriaId,
        tipo: mode,
        foto: foto,
        descuento: descuento ? parseInt(descuento.replace(/\D/g, "")) || 0 : 0,
        activo_descuento: activoDescuento && descuento ? true : false,
      });
      setNombre("");
      setPrecio("");
      setExtra("");
      setFoto(null);
      setDescuento("");
      setActivoDescuento(false);
    } catch (e) {
      // error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.card}>
      <Text style={s.title}>2. Añadir Producto/Servicio</Text>

      <View style={s.toggle}>
        <TouchableOpacity style={[s.toggleBtn, mode === "producto" && s.toggleActive, !showServicios && { flex: 1 }]} onPress={() => setMode("producto")}>
          <Text style={[s.toggleText, mode === "producto" && s.toggleTextActive]}>Producto</Text>
        </TouchableOpacity>
        {showServicios && (
          <TouchableOpacity style={[s.toggleBtn, mode === "servicio" && s.toggleActive]} onPress={() => setMode("servicio")}>
            <Text style={[s.toggleText, mode === "servicio" && s.toggleTextActive]}>Servicio</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Foto picker */}
      <TouchableOpacity style={s.fotoBox} onPress={pickImage}>
        {foto ? (
          <Image source={{ uri: foto }} style={s.fotoImg} />
        ) : (
          <View style={s.fotoPlaceholder}>
            <Ionicons name="camera-outline" size={28} color="#CCC" />
            <Text style={s.fotoHint}>Añadir foto</Text>
          </View>
        )}
        {foto && (
          <TouchableOpacity style={s.fotoRemove} onPress={() => setFoto(null)}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      <TextInput style={s.input} placeholder={mode === "producto" ? "Ej. Hamburguesa Doble" : "Ej. Corte Fade"} placeholderTextColor="#999" value={nombre} onChangeText={setNombre} />
      <TextInput style={s.input} placeholder="Precio ($)" placeholderTextColor="#999" keyboardType="numeric" value={precio} onChangeText={setPrecio} />
      <TextInput style={s.input} placeholder={mode === "producto" ? "Ej. Con papas, 300gr..." : "Ej. 45 min"} placeholderTextColor="#999" value={extra} onChangeText={setExtra} />

      <View style={s.discountRow}>
        <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} placeholder="Descuento ($)" placeholderTextColor="#999" keyboardType="numeric" value={descuento} onChangeText={setDescuento} />
        <View style={s.discountToggle}>
          <Switch value={activoDescuento} onValueChange={setActivoDescuento} trackColor={{ false: "#DDD", true: C.brand }} thumbColor="#FFF" style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} />
          <Text style={s.discountLabel}>Activar</Text>
        </View>
      </View>

      <View style={s.selectWrapper}>
        <Text style={s.selectLabel}>Sección</Text>
        <View style={s.selectRow}>
          {categorias.map((cat) => (
            <TouchableOpacity key={cat.id} style={[s.selectChip, categoriaId === cat.id && s.selectChipActive]} onPress={() => setCategoriaId(cat.id)}>
              <Text style={[s.selectChipText, categoriaId === cat.id && s.selectChipTextActive]}>{cat.nombre}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={[s.submit, (!nombre || !precio || loading) && s.submitDisabled]} onPress={handleSubmit} disabled={!nombre || !precio || loading}>
        {loading ? (
          <ActivityIndicator size="small" color={C.brand} />
        ) : (
          <>
            <Ionicons name="add-circle" size={20} color={C.brand} />
            <Text style={s.submitText}>Guardar</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: "#F0F0F0" },
  title: { fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: C.ink, marginBottom: 14 },
  toggle: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 14, padding: 4, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: "center" },
  toggleActive: { backgroundColor: C.surface, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  toggleText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: C.muted },
  toggleTextActive: { color: C.brand, fontFamily: "Montserrat_800ExtraBold" },
  fotoBox: { width: "100%", height: 140, borderRadius: 16, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", marginBottom: 12, overflow: "hidden", borderWidth: 2, borderColor: "#E5E5E5", borderStyle: "dashed" },
  fotoImg: { width: "100%", height: "100%", borderRadius: 14 },
  fotoPlaceholder: { alignItems: "center", gap: 4 },
  fotoHint: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: "#BBB" },
  fotoRemove: { position: "absolute", top: 6, right: 6, backgroundColor: "#FFF", borderRadius: 12 },
  input: { backgroundColor: C.bg, padding: 12, borderRadius: 12, fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: C.ink, marginBottom: 10 },
  selectWrapper: { marginBottom: 10 },
  selectLabel: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: C.muted, marginBottom: 6 },
  selectRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  selectChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: C.bg },
  selectChipActive: { backgroundColor: C.brand },
  selectChipText: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: C.muted },
  selectChipTextActive: { color: "#FFF", fontFamily: "Montserrat_700Bold" },
  submit: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#FDEEE2", paddingVertical: 12, borderRadius: 12, marginTop: 6 },
  submitDisabled: { opacity: 0.4 },
  submitText: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: C.brand },
  discountRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  discountToggle: { flexDirection: "row", alignItems: "center", gap: 4 },
  discountLabel: { fontSize: 10, fontFamily: "Montserrat_600SemiBold", color: C.muted },
});
