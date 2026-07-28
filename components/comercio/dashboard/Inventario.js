import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../../../constants/url";

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5" };

function formatCOP(v) { if (v == null) return "$0"; return "$" + Number(v).toLocaleString("es-CO"); }
function getImageUrl(path) { if (!path) return null; if (path.startsWith("http")) return path; return `${BASE_URL.toString().replace("/api", "")}/storage/${path}`; }

function InventarioItem({ item, onDelete, onToggle, onEdit }) {
  const isActive = item.activo === undefined ? true : item.activo !== 0;

  return (
    <View style={si.card}>
      {item.file || item.foto ? (
        <Image source={{ uri: getImageUrl(item.file || item.foto) }} style={si.img} />
      ) : (
        <View style={si.imgPlaceholder}>
          <Ionicons name={item.tipo === "servicio" ? "cut" : "cube-outline"} size={22} color="#CCC" />
        </View>
      )}
      <View style={si.info}>
        <Text style={si.name} numberOfLines={1}>{item.nombre}</Text>
        <Text style={si.price}>{formatCOP(item.precio)}</Text>
      </View>
      <Switch
        value={isActive}
        onValueChange={() => onToggle(item)}
        trackColor={{ false: "#DDD", true: C.brand }}
        thumbColor="#FFF"
        style={si.switch}
      />
      <TouchableOpacity style={si.actionBtn} onPress={() => onEdit(item)}>
        <Ionicons name="pencil" size={16} color={C.muted} />
      </TouchableOpacity>
      <TouchableOpacity style={si.actionBtn} onPress={() => onDelete(item)}>
        <Ionicons name="trash-outline" size={16} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
}

const si = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 16, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: "#F0F0F0", gap: 10 },
  img: { width: 48, height: 48, borderRadius: 12, backgroundColor: C.bg },
  imgPlaceholder: { width: 48, height: 48, borderRadius: 12, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },
  info: { flex: 1, overflow: "hidden" },
  name: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: C.ink, marginBottom: 2 },
  price: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: C.brand },
  switch: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  actionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },
});

export default function Inventario({ categorias, productos, onDelete, onToggle, onEdit }) {
  const [collapsed, setCollapsed] = useState({});

  const toggle = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  if (!categorias || !categorias.length) {
    return (
      <View style={s.empty}>
        <Ionicons name="cube-outline" size={40} color="#DDD" />
        <Text style={s.emptyTitle}>Aún no ofreces nada</Text>
        <Text style={s.emptySub}>Crea una sección y añade productos.</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={s.title}>Tu Inventario</Text>
      {categorias.map((cat) => {
        const items = productos.filter(p => String(p.categoria_id) === String(cat.id));
        const isOpen = !collapsed[cat.id];

        return (
          <View key={cat.id} style={s.group}>
            <TouchableOpacity style={s.groupHeader} onPress={() => toggle(cat.id)}>
              <View style={s.groupLabel}>
                <Ionicons name="pricetag" size={14} color={C.muted} />
                <Text style={s.groupName}>{cat.nombre}</Text>
                <Text style={s.groupCount}>{items.length}</Text>
              </View>
              <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={C.muted} />
            </TouchableOpacity>
            {isOpen && (
              items.length === 0 ? (
                <Text style={s.noItems}>Sin productos aún</Text>
              ) : (
                <FlatList
                  key={`inv-${cat.id}`}
                  data={items}
                  renderItem={({ item }) => <InventarioItem item={item} onDelete={onDelete} onToggle={onToggle} onEdit={onEdit} />}
                  keyExtractor={it => String(it.id)}
                  scrollEnabled={false}
                />
              )
            )}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: C.ink, marginBottom: 12 },
  empty: { backgroundColor: "rgba(255,255,255,0.5)", borderWidth: 2, borderColor: "#E5E5E5", borderStyle: "dashed", borderRadius: 24, padding: 40, alignItems: "center", marginTop: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Montserrat_700Bold", color: C.muted, marginTop: 8 },
  emptySub: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: "#AAA", marginTop: 4 },
  group: { marginBottom: 14 },
  groupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#EEE", marginBottom: 8 },
  groupLabel: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  groupName: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  groupCount: { fontSize: 11, fontFamily: "Montserrat_700Bold", color: C.muted, backgroundColor: C.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  noItems: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: "#BBB", paddingVertical: 8, textAlign: "center" },
});
