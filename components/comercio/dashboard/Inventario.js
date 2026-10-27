import React, { useState, useMemo, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Switch, ScrollView, Modal, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../../../constants/url";

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", edge: "#E4E4E7", iconBg: "#FFF0E5", green: "#10B981", placeholder: "#A1A1AA" };
const TODO = "__todo__";

function formatCOP(v) { if (v == null) return "$0"; return "$" + Number(v).toLocaleString("es-CO"); }
function getImageUrl(path) { if (!path) return null; if (path.startsWith("http")) return path; return `${BASE_URL.toString().replace("/api", "")}/storage/${path}`; }

function InventarioItem({ item, onDelete, onToggle, onEdit, onAdiciones }) {
  const isActive = item.activo === undefined ? true : item.activo !== 0;
  const esServicio = item.tipo === "servicio";
  const conDescuento = item.activo_descuento && item.descuento > 0;

  return (
    <View style={[si.card, !isActive && si.cardOff]}>
      <TouchableOpacity style={si.top} onPress={() => onEdit(item)} activeOpacity={0.8}>
        {item.file || item.foto ? (
          <Image source={{ uri: getImageUrl(item.file || item.foto) }} style={[si.img, !isActive && { opacity: 0.45 }]} />
        ) : (
          <View style={si.imgPlaceholder}>
            <Ionicons name={esServicio ? "cut-outline" : "fast-food-outline"} size={22} color={C.placeholder} />
          </View>
        )}
        <View style={si.info}>
          <Text style={[si.name, !isActive && { color: C.muted }]} numberOfLines={2}>{item.nombre}</Text>
          {conDescuento ? (
            <View style={si.priceRow}>
              <Text style={si.priceDiscount}>{formatCOP(item.precio - item.descuento)}</Text>
              <Text style={si.priceOld}>{formatCOP(item.precio)}</Text>
            </View>
          ) : (
            <Text style={si.price}>{formatCOP(item.precio)}</Text>
          )}
          {esServicio && !!item.tiempo && <Text style={si.meta}>Servicio · {item.tiempo}</Text>}
          {!esServicio && (
            <View style={si.estadoRow}>
              <View style={[si.estadoDot, { backgroundColor: isActive ? C.green : C.placeholder }]} />
              <Text style={[si.estadoText, { color: isActive ? C.green : C.muted }]}>{isActive ? "Disponible" : "Pausado"}</Text>
            </View>
          )}
        </View>
        {!esServicio && (
          <Switch
            value={isActive}
            onValueChange={() => onToggle(item)}
            trackColor={{ false: C.edge, true: C.green }}
            thumbColor="#FFF"
          />
        )}
      </TouchableOpacity>

      <View style={si.actions}>
        <TouchableOpacity style={si.actionBtn} onPress={() => onEdit(item)} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={16} color={C.ink} />
          <Text style={si.actionText}>Editar</Text>
        </TouchableOpacity>
        {!esServicio && !!onAdiciones && (
          <TouchableOpacity style={si.actionBtn} onPress={() => onAdiciones(item)} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={16} color={C.brand} />
            <Text style={[si.actionText, { color: C.brand }]}>Adiciones</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={si.actionBtn} onPress={() => onDelete(item)} activeOpacity={0.7}>
          <Ionicons name="eye-off-outline" size={16} color={C.muted} />
          <Text style={[si.actionText, { color: C.muted }]}>Ocultar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const si = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: C.edge },
  cardOff: { backgroundColor: "#FAFAFA" },
  top: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  img: { width: 64, height: 64, borderRadius: 16, backgroundColor: C.bg },
  imgPlaceholder: { width: 64, height: 64, borderRadius: 16, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },
  info: { flex: 1 },
  name: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: C.ink, lineHeight: 18 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  price: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: C.brand, marginTop: 4 },
  priceOld: { fontSize: 11.5, fontFamily: "Montserrat_400Regular", color: C.placeholder, textDecorationLine: "line-through" },
  priceDiscount: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: C.green },
  meta: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: C.muted, marginTop: 3 },
  actions: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.edge },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, height: 32, paddingHorizontal: 10, borderRadius: 16 },
  actionText: { fontSize: 12, fontFamily: "Montserrat_700Bold", color: C.ink },
  estadoRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  estadoDot: { width: 6, height: 6, borderRadius: 3 },
  estadoText: { fontSize: 11, fontFamily: "Montserrat_700Bold" },
});

export default function Inventario({ categorias, productos, onDelete, onToggle, onEdit, onAdiciones, onCreateSeccion, onEditSeccion, onDeleteSeccion, onNuevoProducto, abrirSeccion = 0 }) {
  const [seccion, setSeccion] = useState(TODO);
  const [modalSeccion, setModalSeccion] = useState(false);

  useEffect(() => {
    if (abrirSeccion > 0) setModalSeccion(true);
  }, [abrirSeccion]);
  const [nombreSeccion, setNombreSeccion] = useState("");
  const [creando, setCreando] = useState(false);

  const itemsDe = (catId) => productos.filter((p) => String(p.categoria_id) === String(catId));
  const seccionActual = categorias.find((c) => String(c.id) === String(seccion));
  const vista = seccionActual ? seccionActual.id : TODO;
  const disponibles = useMemo(() => productos.filter((p) => p.tipo === "servicio" || p.activo === undefined || p.activo !== 0).length, [productos]);

  const crearSeccion = async () => {
    const n = nombreSeccion.trim();
    if (!n) return;
    setCreando(true);
    await onCreateSeccion?.(n);
    setCreando(false);
    setNombreSeccion("");
    setModalSeccion(false);
  };

  const listaItems = (items) => items.map((item) => (
    <InventarioItem key={`${item.tipo}-${item.id}`} item={item} onDelete={onDelete} onToggle={onToggle} onEdit={onEdit} onAdiciones={onAdiciones} />
  ));

  return (
    <View>
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Mi menú</Text>
          <Text style={s.sub}>
            {productos.length} {productos.length === 1 ? "producto" : "productos"} · {disponibles} disponibles · {categorias.length} {categorias.length === 1 ? "sección" : "secciones"}
          </Text>
        </View>
        <TouchableOpacity style={s.addSeccion} onPress={() => setModalSeccion(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color={C.ink} />
          <Text style={s.addSeccionText}>Sección</Text>
        </TouchableOpacity>
      </View>

      {!categorias || !categorias.length ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Ionicons name="restaurant-outline" size={26} color={C.brand} />
          </View>
          <Text style={s.emptyTitle}>Arma tu menú</Text>
          <Text style={s.emptySub}>Primero crea una sección (ej. Hamburguesas, Bebidas) y luego agrega tus productos.</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => setModalSeccion(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={s.emptyBtnText}>Crear primera sección</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs} style={s.tabsWrap}>
            {[{ id: TODO, nombre: "Todo", count: productos.length }, ...categorias.map((c) => ({ id: c.id, nombre: c.nombre, count: itemsDe(c.id).length }))].map((t) => {
              const activa = String(vista) === String(t.id);
              return (
                <TouchableOpacity key={String(t.id)} style={[s.tab, activa && s.tabActive]} onPress={() => setSeccion(t.id)} activeOpacity={0.8}>
                  <Text style={[s.tabText, activa && s.tabTextActive]} numberOfLines={1}>{t.nombre}</Text>
                  <View style={[s.tabCount, activa && s.tabCountActive]}>
                    <Text style={[s.tabCountText, activa && { color: "#FFF" }]}>{t.count}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {seccionActual ? (
            <>
              <View style={s.seccionBar}>
                <Text style={s.seccionNombre} numberOfLines={1}>{seccionActual.nombre}</Text>
                <TouchableOpacity style={s.seccionBtn} onPress={() => onEditSeccion?.(seccionActual)} activeOpacity={0.7}>
                  <Ionicons name="create-outline" size={15} color={C.ink} />
                  <Text style={s.seccionBtnText}>Renombrar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.seccionBtn} onPress={() => onDeleteSeccion?.(seccionActual)} activeOpacity={0.7}>
                  <Ionicons name="eye-off-outline" size={15} color={C.muted} />
                  <Text style={[s.seccionBtnText, { color: C.muted }]}>Ocultar</Text>
                </TouchableOpacity>
              </View>
              {itemsDe(seccionActual.id).length === 0 ? (
                <Text style={s.noItems}>Aún no hay nada en "{seccionActual.nombre}".</Text>
              ) : (
                listaItems(itemsDe(seccionActual.id))
              )}
              <TouchableOpacity style={s.addHere} onPress={() => onNuevoProducto?.(seccionActual.id)} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={18} color={C.brand} />
                <Text style={s.addHereText}>Agregar a "{seccionActual.nombre}"</Text>
              </TouchableOpacity>
            </>
          ) : (
            categorias.map((cat) => {
              const items = itemsDe(cat.id);
              return (
                <View key={cat.id} style={s.group}>
                  <TouchableOpacity style={s.groupHeader} onPress={() => setSeccion(cat.id)} activeOpacity={0.7}>
                    <Text style={s.groupName} numberOfLines={1}>{cat.nombre}</Text>
                    <Text style={s.groupCount}>{items.length}</Text>
                    <View style={{ flex: 1 }} />
                    <Ionicons name="chevron-forward" size={16} color={C.placeholder} />
                  </TouchableOpacity>
                  {items.length === 0 ? (
                    <TouchableOpacity style={s.addHere} onPress={() => onNuevoProducto?.(cat.id)} activeOpacity={0.8}>
                      <Ionicons name="add-circle-outline" size={18} color={C.brand} />
                      <Text style={s.addHereText}>Agregar el primero</Text>
                    </TouchableOpacity>
                  ) : (
                    listaItems(items)
                  )}
                </View>
              );
            })
          )}
        </>
      )}

      <Modal visible={modalSeccion} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setModalSeccion(false)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={s.modalIcon}>
              <Ionicons name="albums-outline" size={24} color={C.brand} />
            </View>
            <Text style={s.modalTitle}>Nueva sección</Text>
            <Text style={s.modalSub}>Agrupa tus productos. Ej: Hamburguesas, Bebidas, Promociones.</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Nombre de la sección"
              placeholderTextColor={C.placeholder}
              value={nombreSeccion}
              onChangeText={setNombreSeccion}
              onSubmitEditing={crearSeccion}
              autoFocus
            />
            <TouchableOpacity style={[s.modalPrimary, !nombreSeccion.trim() && { opacity: 0.4 }]} onPress={crearSeccion} disabled={!nombreSeccion.trim() || creando} activeOpacity={0.85}>
              {creando ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.modalPrimaryText}>Crear sección</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalSeccion(false)} style={{ marginTop: 6 }}>
              <Text style={s.modalLater}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 20, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  sub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 2 },
  addSeccion: { flexDirection: "row", alignItems: "center", gap: 4, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.edge },
  addSeccionText: { fontSize: 12.5, fontFamily: "Montserrat_700Bold", color: C.ink },

  tabsWrap: { marginHorizontal: -16, marginBottom: 12 },
  tabs: { gap: 8, paddingHorizontal: 16 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingLeft: 16, paddingRight: 8, borderRadius: 19, backgroundColor: C.surface, borderWidth: 1, borderColor: C.edge },
  tabActive: { backgroundColor: C.ink, borderColor: C.ink },
  tabText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: C.muted, maxWidth: 140 },
  tabTextActive: { color: "#FFF", fontFamily: "Montserrat_700Bold" },
  tabCount: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  tabCountActive: { backgroundColor: "rgba(255,255,255,0.18)" },
  tabCountText: { fontSize: 11, fontFamily: "Montserrat_700Bold", color: C.muted },

  seccionBar: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10 },
  seccionNombre: { flex: 1, fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  seccionBtn: { flexDirection: "row", alignItems: "center", gap: 4, height: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: C.surface },
  seccionBtnText: { fontSize: 12, fontFamily: "Montserrat_700Bold", color: C.ink },

  group: { marginBottom: 8 },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, marginBottom: 2 },
  groupName: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: C.ink, maxWidth: "70%" },
  groupCount: { fontSize: 11, fontFamily: "Montserrat_700Bold", color: C.muted, backgroundColor: C.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
  noItems: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: C.muted, paddingVertical: 10, textAlign: "center" },
  addHere: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 48, borderRadius: 18, borderWidth: 1.5, borderColor: "#FDD0A5", borderStyle: "dashed", marginBottom: 10 },
  addHereText: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: C.brand },

  empty: { backgroundColor: C.surface, borderRadius: 24, padding: 24, alignItems: "center", borderWidth: 1, borderColor: C.edge },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.iconBg, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  emptySub: { fontSize: 12.5, lineHeight: 18, fontFamily: "Montserrat_400Regular", color: C.muted, textAlign: "center", marginTop: 6, marginBottom: 16 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 46, paddingHorizontal: 20, borderRadius: 23, backgroundColor: C.brand },
  emptyBtnText: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: "#FFF" },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { backgroundColor: C.surface, borderRadius: 28, padding: 24, width: "92%", alignItems: "center" },
  modalIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.iconBg, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  modalSub: { fontSize: 12.5, lineHeight: 18, fontFamily: "Montserrat_400Regular", color: C.muted, textAlign: "center", marginTop: 6, marginBottom: 16 },
  modalInput: { width: "100%", height: 50, backgroundColor: C.bg, paddingHorizontal: 16, borderRadius: 16, fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: C.ink, marginBottom: 14 },
  modalPrimary: { width: "100%", height: 50, borderRadius: 25, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },
  modalPrimaryText: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#FFF" },
  modalLater: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: C.muted, paddingVertical: 8 },
});
