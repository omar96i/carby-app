import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5" };

export default function SeccionCreator({ categorias, onCreate, onEdit, onDelete }) {
  const [name, setName] = useState("");

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
  };

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Ionicons name="pricetags" size={18} color={COLORS.brand} />
        <Text style={s.title}>1. Crea tus Secciones</Text>
      </View>
      <Text style={s.sub}>Ej: Hamburguesas, Bebidas, Promociones...</Text>
      <View style={s.row}>
        <TextInput
          style={s.input}
          placeholder="Nombre del catálogo..."
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity style={[s.addBtn, !name.trim() && s.addBtnDisabled]} onPress={handleAdd} disabled={!name.trim()}>
          <Text style={s.addText}>Añadir</Text>
        </TouchableOpacity>
      </View>
      <View style={s.chips}>
        {categorias.map((cat) => (
          <TouchableOpacity key={cat.id} style={s.chip} onLongPress={() => onEdit?.(cat)} activeOpacity={0.7}>
            <Text style={s.chipText} numberOfLines={1}>{cat.nombre}</Text>
             <TouchableOpacity onPress={() => onDelete(cat)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={12} color={COLORS.brand} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: "#F0F0F0" },
  header: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  title: { fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink },
  sub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: COLORS.muted, marginLeft: 24, marginBottom: 12 },
  row: { flexDirection: "row", gap: 8 },
  input: { flex: 1, backgroundColor: COLORS.bg, padding: 12, borderRadius: 12, fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: COLORS.ink },
  addBtn: { backgroundColor: COLORS.ink, paddingHorizontal: 16, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  addBtnDisabled: { opacity: 0.4 },
  addText: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FDEEE2", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: "#FDD0A5" },
  chipText: { fontSize: 11, fontFamily: "Montserrat_700Bold", color: COLORS.brand, maxWidth: 120 },
});
