import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Switch, Modal, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAlturaTecladoAndroid } from "../../../hooks/useAlturaTecladoAndroid";

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", edge: "#E4E4E7", iconBg: "#FFF0E5", green: "#10B981", red: "#EF4444", placeholder: "#A1A1AA" };
const BOTON_ELEVADO = { shadowColor: C.brand, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 };
const DURACIONES = ["15 min", "30 min", "45 min", "60 min", "90 min"];

const soloDigitos = (v) => String(v || "").replace(/\D/g, "");
const formatMiles = (digitos) => (digitos ? Number(digitos).toLocaleString("es-CO") : "");
const formatCOP = (v) => "$" + Number(v || 0).toLocaleString("es-CO");

export default function ItemCreator({ visible, onClose, categorias, onCreate, onCreateSeccion, showServicios = true, rangoPrecios = {}, initialCategoriaId = null }) {
  const insets = useSafeAreaInsets();
  const alturaTeclado = useAlturaTecladoAndroid();
  const [mode, setMode] = useState("producto");
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tiempo, setTiempo] = useState("");
  const [foto, setFoto] = useState(null);
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id || null);
  const [loading, setLoading] = useState(false);
  const [descuento, setDescuento] = useState("");
  const [activoDescuento, setActivoDescuento] = useState(false);
  const [nuevaSeccion, setNuevaSeccion] = useState(null);
  const [creandoSeccion, setCreandoSeccion] = useState(false);
  const seccionPendiente = useRef(null);
  const [adiciones, setAdiciones] = useState([]);
  const [formAd, setFormAd] = useState(null);

  const agregarAdicion = () => {
    const nombreAd = (formAd?.nombre || "").trim();
    const descAd = (formAd?.descripcion || "").trim();
    const precioAd = parseInt(soloDigitos(formAd?.precio)) || 0;
    if (!nombreAd || !descAd || !formAd?.precio) return;
    setAdiciones((prev) => [...prev, { nombre: nombreAd, descripcion: descAd, precio: precioAd, foto: formAd?.foto || null }]);
    setFormAd(null);
  };

  useEffect(() => {
    if (!categoriaId && categorias?.length) setCategoriaId(categorias[0].id);
  }, [categorias]);

  useEffect(() => {
    if (visible && initialCategoriaId) setCategoriaId(initialCategoriaId);
  }, [visible, initialCategoriaId]);

  useEffect(() => {
    if (!seccionPendiente.current) return;
    const nueva = categorias.find((c) => String(c.nombre).trim().toLowerCase() === seccionPendiente.current);
    if (nueva) {
      setCategoriaId(nueva.id);
      seccionPendiente.current = null;
    }
  }, [categorias]);

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

  const pickAdicionFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.7 });
    if (!result.canceled && result.assets[0]) setFormAd((f) => ({ ...f, foto: result.assets[0].uri }));
  };

  const crearSeccion = async () => {
    const n = (nuevaSeccion || "").trim();
    if (!n || !onCreateSeccion) return;
    setCreandoSeccion(true);
    seccionPendiente.current = n.toLowerCase();
    await onCreateSeccion(n);
    setCreandoSeccion(false);
    setNuevaSeccion(null);
  };

  const precioNum = parseInt(soloDigitos(precio)) || 0;
  const descuentoNum = parseInt(soloDigitos(descuento)) || 0;
  const conDescuento = activoDescuento && descuentoNum > 0;
  const precioFinal = Math.max(0, precioNum - (conDescuento ? descuentoNum : 0));
  const fueraDeRango = precioNum > 0 && rangoPrecios?.min != null && rangoPrecios?.max != null
    && (precioNum < Number(rangoPrecios.min) || precioNum > Number(rangoPrecios.max));
  const esServicio = mode === "servicio";
  const seccionNombre = categorias.find((c) => c.id === categoriaId)?.nombre;

  const faltan = [
    !categoriaId || !categorias?.length ? "sección" : null,
    !nombre.trim() ? "nombre" : null,
    !precio ? "precio" : null,
    esServicio && !tiempo.trim() ? "duración" : null,
  ].filter(Boolean);
  const listo = faltan.length === 0 && !loading;

  const limpiar = () => {
    setNombre("");
    setPrecio("");
    setDescripcion("");
    setTiempo("");
    setFoto(null);
    setDescuento("");
    setActivoDescuento(false);
    setNuevaSeccion(null);
    setAdiciones([]);
    setFormAd(null);
  };

  const handleSubmit = async () => {
    if (!nombre.trim() || !precio || !categoriaId) return;
    if (mode === "servicio" && !tiempo.trim()) return;
    if (!categorias?.length) return;
    setLoading(true);
    try {
      const ok = await onCreate({
        nombre: nombre.trim(),
        precio: parseInt(precio.replace(/\D/g, "")) || 0,
        descripcion: descripcion.trim() || undefined,
        tiempo: mode === "servicio" ? tiempo.trim() : undefined,
        categoria_id: categoriaId,
        tipo: mode,
        foto: foto,
        descuento: descuento ? parseInt(descuento.replace(/\D/g, "")) || 0 : 0,
        activo_descuento: activoDescuento && descuento ? true : false,
        adicionales: mode === "producto" ? adiciones : undefined,
      });
      if (ok !== false) limpiar();
    } catch (e) {
      // error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={[s.root, { paddingTop: insets.top, marginBottom: alturaTeclado }]}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerBtn} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{esServicio ? "Nuevo servicio" : "Nuevo producto"}</Text>
          <View style={s.headerBtn} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {showServicios && (
            <View style={s.toggle}>
              {["producto", "servicio"].map((m) => (
                <TouchableOpacity key={m} style={[s.toggleBtn, mode === m && s.toggleActive]} onPress={() => setMode(m)} activeOpacity={0.8}>
                  <Ionicons name={m === "producto" ? "fast-food-outline" : "cut-outline"} size={16} color={mode === m ? C.brand : C.muted} />
                  <Text style={[s.toggleText, mode === m && s.toggleTextActive]}>{m === "producto" ? "Producto" : "Servicio"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={[s.fotoBox, foto && s.fotoBoxLlena]} onPress={pickImage} activeOpacity={0.85}>
            {foto ? (
              <>
                <Image source={{ uri: foto }} style={s.fotoImg} />
                <View style={s.fotoCambiar}>
                  <Ionicons name="camera" size={14} color="#FFF" />
                  <Text style={s.fotoCambiarText}>Cambiar</Text>
                </View>
                <TouchableOpacity style={s.fotoRemove} onPress={() => setFoto(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={16} color={C.ink} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={s.fotoPlaceholder}>
                <View style={s.fotoIcon}>
                  <Ionicons name="camera" size={24} color={C.brand} />
                </View>
                <Text style={s.fotoHint}>Añadir foto</Text>
                <Text style={s.fotoSub}>Se recorta en formato cuadrado</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={s.label}>Sección <Text style={s.req}>*</Text></Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
            {categorias.map((cat) => {
              const activa = categoriaId === cat.id;
              return (
                <TouchableOpacity key={cat.id} style={[s.chip, activa && s.chipActive]} onPress={() => setCategoriaId(cat.id)} activeOpacity={0.8}>
                  {activa && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  <Text style={[s.chipText, activa && s.chipTextActive]}>{cat.nombre}</Text>
                </TouchableOpacity>
              );
            })}
            {!!onCreateSeccion && nuevaSeccion === null && (
              <TouchableOpacity style={s.chipNueva} onPress={() => setNuevaSeccion("")} activeOpacity={0.8}>
                <Ionicons name="add" size={16} color={C.brand} />
                <Text style={s.chipNuevaText}>Nueva sección</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          {nuevaSeccion !== null && (
            <View style={s.nuevaRow}>
              <TextInput
                style={[s.input, s.nuevaInput]}
                placeholder="Ej. Bebidas, Combos..."
                placeholderTextColor={C.placeholder}
                value={nuevaSeccion}
                onChangeText={setNuevaSeccion}
                onSubmitEditing={crearSeccion}
                autoFocus
              />
              <TouchableOpacity style={[s.nuevaBtn, !nuevaSeccion.trim() && { opacity: 0.4 }]} onPress={crearSeccion} disabled={!nuevaSeccion.trim() || creandoSeccion} activeOpacity={0.8}>
                {creandoSeccion ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.nuevaBtnText}>Crear</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.nuevaCerrar} onPress={() => setNuevaSeccion(null)}>
                <Ionicons name="close" size={18} color={C.muted} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={s.label}>Nombre <Text style={s.req}>*</Text></Text>
          <TextInput style={s.input} placeholder={esServicio ? "Ej. Corte Fade" : "Ej. Hamburguesa Doble"} placeholderTextColor={C.placeholder} value={nombre} onChangeText={setNombre} />

          <Text style={s.label}>Precio <Text style={s.req}>*</Text></Text>
          <View style={[s.input, s.precioBox, fueraDeRango && s.inputError]}>
            <Text style={s.precioSigno}>$</Text>
            <TextInput
              style={s.precioInput}
              placeholder="0"
              placeholderTextColor={C.placeholder}
              keyboardType="numeric"
              value={formatMiles(soloDigitos(precio))}
              onChangeText={(v) => setPrecio(soloDigitos(v))}
            />
          </View>
          {rangoPrecios?.min != null && rangoPrecios?.max != null ? (
            <View style={s.rangeRow}>
              <Ionicons name={fueraDeRango ? "alert-circle" : "pricetag-outline"} size={13} color={fueraDeRango ? C.red : C.muted} />
              <Text style={[s.rangeText, fueraDeRango && { color: C.red }]}>
                Rango permitido: {formatCOP(rangoPrecios.min)} – {formatCOP(rangoPrecios.max)}
              </Text>
            </View>
          ) : null}

          {esServicio && (
            <>
              <Text style={s.label}>Duración <Text style={s.req}>*</Text></Text>
              <View style={s.duraciones}>
                {DURACIONES.map((d) => (
                  <TouchableOpacity key={d} style={[s.durChip, tiempo === d && s.chipActive]} onPress={() => setTiempo(d)} activeOpacity={0.8}>
                    <Text style={[s.chipText, tiempo === d && s.chipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={s.input} placeholder="Otra duración (ej. 2 horas)" placeholderTextColor={C.placeholder} value={tiempo} onChangeText={setTiempo} />
            </>
          )}

          <Text style={s.label}>Descripción <Text style={s.opcional}>(opcional)</Text></Text>
          <TextInput
            style={[s.input, s.inputMulti]}
            placeholder={esServicio ? "¿Qué incluye el servicio?" : "Ingredientes, tamaño, acompañantes..."}
            placeholderTextColor={C.placeholder}
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            textAlignVertical="top"
          />

          {!esServicio && (
            <View style={s.adCard}>
              <View style={s.descTop}>
                <View style={s.descIcon}>
                  <Ionicons name="add-circle" size={18} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.descTitle}>Adiciones <Text style={s.opcional}>(opcional)</Text></Text>
                  <Text style={s.descSub}>Extras que el cliente puede sumar: queso, tocineta, salsas...</Text>
                </View>
              </View>

              {adiciones.map((ad, i) => (
                <View key={`${ad.nombre}-${i}`} style={s.adRow}>
                  {ad.foto ? (
                    <Image source={{ uri: ad.foto }} style={s.adThumb} />
                  ) : (
                    <View style={[s.adThumb, s.adThumbVacia]}>
                      <Ionicons name="image-outline" size={16} color={C.placeholder} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.adNombre} numberOfLines={1}>{ad.nombre}</Text>
                    <Text style={s.adDesc} numberOfLines={1}>{ad.descripcion}</Text>
                  </View>
                  <Text style={s.adPrecio}>+{formatCOP(ad.precio)}</Text>
                  <TouchableOpacity onPress={() => setAdiciones((prev) => prev.filter((_, j) => j !== i))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={20} color={C.placeholder} />
                  </TouchableOpacity>
                </View>
              ))}

              {formAd ? (
                <View style={s.adForm}>
                  <View style={s.adFormTop}>
                    <TouchableOpacity style={[s.adFoto, formAd.foto && s.adFotoLlena]} onPress={pickAdicionFoto} activeOpacity={0.8}>
                      {formAd.foto ? (
                        <>
                          <Image source={{ uri: formAd.foto }} style={s.adFotoImg} />
                          <View style={s.adFotoCambiar}>
                            <Ionicons name="camera" size={12} color="#FFF" />
                          </View>
                        </>
                      ) : (
                        <>
                          <Ionicons name="camera" size={20} color={C.brand} />
                          <Text style={s.adFotoText}>Foto</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <View style={{ flex: 1, gap: 8 }}>
                      <TextInput
                        style={[s.input, s.adInput]}
                        placeholder="Nombre (ej. Queso extra)"
                        placeholderTextColor={C.placeholder}
                        value={formAd.nombre}
                        onChangeText={(v) => setFormAd((f) => ({ ...f, nombre: v }))}
                        autoFocus
                      />
                      <View style={[s.input, s.precioBox, s.adInput]}>
                        <Text style={s.precioSigno}>+ $</Text>
                        <TextInput
                          style={s.precioInput}
                          placeholder="Precio"
                          placeholderTextColor={C.placeholder}
                          keyboardType="numeric"
                          value={formatMiles(soloDigitos(formAd.precio))}
                          onChangeText={(v) => setFormAd((f) => ({ ...f, precio: soloDigitos(v) }))}
                        />
                      </View>
                    </View>
                  </View>
                  <TextInput
                    style={[s.input, s.adInput]}
                    placeholder="Descripción corta (ej. Tajada de queso)"
                    placeholderTextColor={C.placeholder}
                    value={formAd.descripcion}
                    onChangeText={(v) => setFormAd((f) => ({ ...f, descripcion: v }))}
                  />
                  <View style={s.adBtns}>
                    <TouchableOpacity style={s.adCancel} onPress={() => setFormAd(null)} activeOpacity={0.8}>
                      <Text style={s.adCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.adOk, !(formAd.nombre?.trim() && formAd.precio && formAd.descripcion?.trim()) && { opacity: 0.4 }]}
                      onPress={agregarAdicion}
                      disabled={!(formAd.nombre?.trim() && formAd.precio && formAd.descripcion?.trim())}
                      activeOpacity={0.85}
                    >
                      <Text style={s.adOkText}>Agregar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={s.adAdd} onPress={() => setFormAd({ nombre: "", precio: "", descripcion: "", foto: null })} activeOpacity={0.8}>
                  <Ionicons name="add" size={18} color={C.brand} />
                  <Text style={s.adAddText}>{adiciones.length ? "Agregar otra adición" : "Agregar adición"}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={s.descCard}>
            <View style={s.descTop}>
              <View style={s.descIcon}>
                <Ionicons name="pricetags" size={16} color={C.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.descTitle}>Poner en descuento</Text>
                <Text style={s.descSub}>Aparece en "Descuentos" de tu tienda</Text>
              </View>
              <Switch value={activoDescuento} onValueChange={setActivoDescuento} trackColor={{ false: C.edge, true: C.brand }} thumbColor="#FFF" />
            </View>
            {activoDescuento && (
              <View style={s.descBody}>
                <View style={[s.input, s.precioBox, { marginBottom: 0, backgroundColor: C.surface }]}>
                  <Text style={s.precioSigno}>− $</Text>
                  <TextInput
                    style={s.precioInput}
                    placeholder="Cuánto descuentas"
                    placeholderTextColor={C.placeholder}
                    keyboardType="numeric"
                    value={formatMiles(soloDigitos(descuento))}
                    onChangeText={(v) => setDescuento(soloDigitos(v))}
                  />
                </View>
                {precioNum > 0 && descuentoNum > 0 && (
                  <Text style={s.descResultado}>
                    El cliente paga <Text style={s.descFinal}>{formatCOP(precioFinal)}</Text> en vez de {formatCOP(precioNum)}
                  </Text>
                )}
              </View>
            )}
          </View>

          <Text style={[s.label, { marginTop: 22 }]}>Así lo verá tu cliente</Text>
          <View style={s.preview}>
            <View style={s.previewCard}>
              <View style={s.previewImgWrap}>
                {foto ? (
                  <Image source={{ uri: foto }} style={s.previewImg} />
                ) : (
                  <View style={s.previewPlaceholder}>
                    <Ionicons name={esServicio ? "cut-outline" : "fast-food-outline"} size={30} color={C.placeholder} />
                  </View>
                )}
                {conDescuento && precioNum > 0 && (
                  <View style={s.previewBadge}>
                    <Text style={s.previewBadgeText}>-{Math.round((descuentoNum / precioNum) * 100)}%</Text>
                  </View>
                )}
              </View>
              <View style={s.previewBody}>
                <Text style={s.previewName} numberOfLines={2}>{nombre.trim() || (esServicio ? "Nombre del servicio" : "Nombre del producto")}</Text>
                {esServicio && <Text style={s.previewTag}>Servicio{tiempo ? ` · ${tiempo}` : ""}</Text>}
                <View style={s.previewPriceRow}>
                  <View style={{ flex: 1 }}>
                    {conDescuento && precioNum > 0 && <Text style={s.previewOld}>{formatCOP(precioNum)}</Text>}
                    <Text style={s.previewPrice}>{formatCOP(precioFinal)}</Text>
                  </View>
                  <View style={s.previewAdd}>
                    <Ionicons name="add" size={20} color="#FFF" />
                  </View>
                </View>
              </View>
            </View>
            <View style={s.previewInfo}>
              <View style={s.previewInfoRow}>
                <Ionicons name="albums-outline" size={15} color={C.muted} />
                <Text style={s.previewInfoText} numberOfLines={1}>{seccionNombre ? `En "${seccionNombre}"` : "Sin sección"}</Text>
              </View>
              <View style={s.previewInfoRow}>
                <Ionicons name={foto ? "image" : "image-outline"} size={15} color={foto ? C.green : C.muted} />
                <Text style={s.previewInfoText}>{foto ? "Con foto" : "Sin foto"}</Text>
              </View>
              {!esServicio && adiciones.length > 0 && (
                <View style={s.previewInfoRow}>
                  <Ionicons name="add-circle" size={15} color={C.brand} />
                  <Text style={s.previewInfoText}>{adiciones.length} {adiciones.length === 1 ? "adición" : "adiciones"}</Text>
                </View>
              )}
              {!!descripcion.trim() && (
                <Text style={s.previewDesc} numberOfLines={4}>{descripcion.trim()}</Text>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: (alturaTeclado ? 0 : insets.bottom) + 12 }]}>
          {faltan.length > 0 && (
            <Text style={s.faltan}>Completa: {faltan.join(", ")}</Text>
          )}
          <TouchableOpacity style={[s.submit, !listo && s.submitDisabled]} onPress={handleSubmit} disabled={!listo} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={s.submitText}>{esServicio ? "Publicar servicio" : "Publicar producto"}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },

  toggle: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 16, padding: 4, marginBottom: 16, marginTop: 4 },
  toggleBtn: { flex: 1, flexDirection: "row", gap: 6, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  toggleActive: { backgroundColor: C.surface, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  toggleText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: C.muted },
  toggleTextActive: { color: C.ink, fontFamily: "Montserrat_700Bold" },

  fotoBox: { width: "100%", height: 180, borderRadius: 22, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", overflow: "hidden", borderWidth: 1.5, borderColor: C.edge, borderStyle: "dashed", marginTop: 4 },
  fotoBoxLlena: { borderStyle: "solid", borderWidth: 0 },
  fotoImg: { width: "100%", height: "100%" },
  fotoPlaceholder: { alignItems: "center" },
  fotoIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.iconBg, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  fotoHint: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: C.ink },
  fotoSub: { fontSize: 11.5, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 3 },
  fotoCambiar: { position: "absolute", bottom: 10, left: 10, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.6)", height: 30, paddingHorizontal: 12, borderRadius: 15 },
  fotoCambiarText: { fontSize: 12, fontFamily: "Montserrat_700Bold", color: "#FFF" },
  fotoRemove: { position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },

  label: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: C.ink, marginTop: 18, marginBottom: 8 },
  req: { color: C.brand },
  opcional: { fontFamily: "Montserrat_400Regular", color: C.muted },

  chips: { gap: 8, paddingRight: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, height: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: C.bg },
  chipActive: { backgroundColor: C.ink },
  chipText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: C.muted },
  chipTextActive: { color: "#FFF", fontFamily: "Montserrat_700Bold" },
  chipNueva: { flexDirection: "row", alignItems: "center", gap: 4, height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1.5, borderColor: C.brand, borderStyle: "dashed" },
  chipNuevaText: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: C.brand },
  nuevaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  nuevaInput: { flex: 1, marginBottom: 0 },
  nuevaBtn: { height: 48, paddingHorizontal: 18, borderRadius: 16, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },
  nuevaBtnText: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: "#FFF" },
  nuevaCerrar: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  input: { backgroundColor: C.bg, height: 50, paddingHorizontal: 16, borderRadius: 16, fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: C.ink, marginBottom: 0 },
  inputMulti: { height: 96, paddingTop: 14, paddingBottom: 14 },
  inputError: { borderWidth: 1.5, borderColor: C.red },
  precioBox: { flexDirection: "row", alignItems: "center" },
  precioSigno: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: C.muted, marginRight: 6 },
  precioInput: { flex: 1, height: "100%", fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: C.ink, padding: 0 },
  rangeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, marginLeft: 2 },
  rangeText: { fontSize: 11.5, fontFamily: "Montserrat_600SemiBold", color: C.muted },

  duraciones: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  durChip: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },

  descCard: { backgroundColor: C.bg, borderRadius: 20, padding: 14, marginTop: 20 },
  descTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  descIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.iconBg, alignItems: "center", justifyContent: "center" },
  descTitle: { fontSize: 13.5, fontFamily: "Montserrat_700Bold", color: C.ink },
  descSub: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 2 },
  descBody: { marginTop: 12 },
  descResultado: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 10, marginLeft: 2 },
  descFinal: { fontFamily: "Montserrat_800ExtraBold", color: C.green },

  adCard: { backgroundColor: C.bg, borderRadius: 20, padding: 14, marginTop: 20 },
  adRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10 },
  adNombre: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: C.ink },
  adDesc: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 1 },
  adPrecio: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: C.brand },
  adForm: { marginTop: 12, gap: 8 },
  adFormTop: { flexDirection: "row", gap: 10 },
  adFoto: { width: 108, height: 108, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1.5, borderColor: "#FDD0A5", borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  adFotoLlena: { borderWidth: 0 },
  adFotoImg: { width: "100%", height: "100%" },
  adFotoText: { fontSize: 11.5, fontFamily: "Montserrat_700Bold", color: C.brand, marginTop: 4 },
  adFotoCambiar: { position: "absolute", bottom: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  adThumb: { width: 40, height: 40, borderRadius: 10 },
  adThumbVacia: { backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  adInput: { backgroundColor: C.surface, marginBottom: 0 },
  adBtns: { flexDirection: "row", gap: 8, marginTop: 2 },
  adCancel: { flex: 1, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  adCancelText: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: C.muted },
  adOk: { flex: 1, height: 44, borderRadius: 22, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" },
  adOkText: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: "#FFF" },
  adAdd: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44, borderRadius: 16, borderWidth: 1.5, borderColor: "#FDD0A5", borderStyle: "dashed", marginTop: 12 },
  adAddText: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: C.brand },

  preview: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  previewCard: { width: 156, backgroundColor: C.surface, borderRadius: 22, padding: 6, borderWidth: 1, borderColor: C.edge },
  previewImgWrap: { width: 142, height: 142, borderRadius: 18, overflow: "hidden", backgroundColor: C.bg },
  previewImg: { width: "100%", height: "100%" },
  previewPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  previewBadge: { position: "absolute", top: 8, left: 8, backgroundColor: C.brand, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  previewBadgeText: { fontSize: 11, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  previewBody: { paddingHorizontal: 6, paddingTop: 10, paddingBottom: 4 },
  previewName: { fontSize: 13.5, fontFamily: "Montserrat_700Bold", color: C.ink, lineHeight: 18, minHeight: 36 },
  previewTag: { fontSize: 11, fontFamily: "Montserrat_700Bold", color: C.brand, marginTop: 2 },
  previewPriceRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  previewOld: { fontSize: 11.5, fontFamily: "Montserrat_400Regular", color: C.placeholder, textDecorationLine: "line-through" },
  previewPrice: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: C.brand },
  previewAdd: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },
  previewInfo: { flex: 1, gap: 8, paddingTop: 6 },
  previewInfoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  previewInfoText: { flex: 1, fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: C.muted },
  previewDesc: { fontSize: 11.5, lineHeight: 16, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 2 },

  footer: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: C.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.edge },
  faltan: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: C.muted, textAlign: "center", marginBottom: 8 },
  submit: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 54, borderRadius: 27, backgroundColor: C.brand, ...BOTON_ELEVADO },
  submitDisabled: { backgroundColor: "#D4D4D8", shadowOpacity: 0, elevation: 0 },
  submitText: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#FFF" },
});
