import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Modal,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_600SemiBold,
  Montserrat_800ExtraBold,
} from "@expo-google-fonts/montserrat";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { BASE_URL } from "../../constants/url";
import DateTimePicker from "@react-native-community/datetimepicker";
import AlertaModal from "../../components/ErrorModal";

const PERFIL_INFO_TITULO = "¿Qué es un perfil?";
const PERFIL_INFO_TEXTO =
  "Un perfil es la persona o recurso que presta tus servicios: tú mismo, un barbero, una manicurista… o incluso un objeto en alquiler como una lancha o una cabaña. Cada perfil tiene sus propios horarios de atención, y los clientes solo pueden reservar tus servicios dentro de esos horarios. Ejemplo: crea el perfil “Carlos – Barbero”, asígnale Lun–Vie 8am–6pm, y tus cortes quedarán disponibles solo en ese rango.";

const DIAS = [
  { label: "Lunes", short: "Lu", value: 0 },
  { label: "Martes", short: "Ma", value: 1 },
  { label: "Miércoles", short: "Mi", value: 2 },
  { label: "Jueves", short: "Ju", value: 3 },
  { label: "Viernes", short: "Vi", value: 4 },
  { label: "Sábado", short: "Sá", value: 5 },
  { label: "Domingo", short: "Do", value: 6 },
];

function imgUrl(file) {
  if (!file) return null;
  if (file.startsWith("http")) return file;
  const base = BASE_URL.toString().replace(/\/api\/?$/, "").replace(/\/$/, "");
  return `${base}/storage/${String(file).replace(/^storage[\\/]/, "")}`;
}

function timeToDate(hhmm, fallbackH, fallbackM) {
  const d = new Date();
  d.setFullYear(1970, 0, 1);
  if (typeof hhmm === "string" && hhmm.includes(":")) {
    const [h, m] = hhmm.split(":");
    d.setHours(parseInt(h, 10) || fallbackH, parseInt(m, 10) || 0, 0, 0);
  } else {
    d.setHours(fallbackH, fallbackM, 0, 0);
  }
  return d;
}

function fmtHora(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function resumenHorarios(horarios) {
  if (!horarios?.length) return null;
  const porDia = {};
  horarios.forEach((h) => {
    const k = h.dia_semana;
    porDia[k] = porDia[k] || [];
    porDia[k].push(`${String(h.hora_inicio).slice(0, 5)}–${String(h.hora_fin).slice(0, 5)}`);
  });
  const dias = Object.keys(porDia).sort((a, b) => a - b).map((k) => DIAS[k]?.short).filter(Boolean);
  if (dias.length >= 5 && dias.length <= 7) return `${dias.length} días · ${porDia[Object.keys(porDia)[0]][0]}`;
  return `${dias.join(" ")} · ${porDia[Object.keys(porDia)[0]][0]}`;
}

export default function CrearPerfil() {
  const navigation = useNavigation();
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_600SemiBold,
    Montserrat_800ExtraBold,
  });

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Crear
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [foto, setFoto] = useState(null);
  const [creating, setCreating] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);

  // Editar
  const [editVisible, setEditVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editFoto, setEditFoto] = useState(null);
  const [editFotoOriginal, setEditFotoOriginal] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // Ocultar
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Horarios
  const [horarioVisible, setHorarioVisible] = useState(false);
  const [horarioPerfil, setHorarioPerfil] = useState(null);
  const [horarios, setHorarios] = useState([]);
  const [horariosLoading, setHorariosLoading] = useState(false);
  const [formMode, setFormMode] = useState("list");
  const [dia, setDia] = useState(null);
  const [horaInicio, setHoraInicio] = useState(() => timeToDate(null, 8, 0));
  const [horaFin, setHoraFin] = useState(() => timeToDate(null, 17, 0));
  const [showInicio, setShowInicio] = useState(false);
  const [showFin, setShowFin] = useState(false);
  const [horarioSaving, setHorarioSaving] = useState(false);
  const [editHorarioId, setEditHorarioId] = useState(null);
  const [deleteHorarioId, setDeleteHorarioId] = useState(null);
  const sheetScroll = useRef(null);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({});
  const showAlert = (title, message, type, onConfirm, primaryLabel) => {
    setAlertData({ title, message, type: type || (title === "Éxito" ? "success" : "error"), onConfirm: onConfirm || null, primaryLabel: primaryLabel || null });
    setAlertVisible(true);
  };

  const authHeaders = async (json = false) => {
    const token = await AsyncStorage.getItem("userToken");
    const h = { Accept: "application/json", Authorization: `Bearer ${token}` };
    if (json) h["Content-Type"] = "application/json";
    return h;
  };

  const fetchProfiles = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      if (!userData) return;
      const { id } = JSON.parse(userData);
      const res = await fetch(`${BASE_URL}user-perfil/by-user/${id}`, { headers: await authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.data || []);
      } else if (res.status === 404) {
        setProfiles([]);
      }
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useFocusEffect(useCallback(() => {
    fetchProfiles();
  }, [fetchProfiles]));

  const pickImage = async (setter) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert("Permisos requeridos", "Se necesitan permisos para acceder a la galería.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) setter(result.assets[0]);
  };

  const createProfile = async () => {
    if (!nombre.trim()) {
      showAlert("Error", "Ponle un nombre a tu perfil. Ej: “Carlos – Barbero” o “Lancha X”.");
      return;
    }
    if (!foto) {
      showAlert("Error", "La foto del perfil es obligatoria. Toca el recuadro para elegir una imagen.");
      return;
    }
    setCreating(true);
    try {
      const userData = await AsyncStorage.getItem("userData");
      const { id } = JSON.parse(userData);
      const fd = new FormData();
      fd.append("user_id", String(id));
      fd.append("nombre", nombre.trim());
      if (descripcion.trim()) fd.append("descripcion", descripcion.trim());
      fd.append("file", { uri: foto.uri, type: "image/jpeg", name: `profile_${Date.now()}.jpg` });
      const res = await fetch(`${BASE_URL}user-perfil`, {
        method: "POST",
        headers: await authHeaders(),
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const nuevo = data.data;
        setNombre("");
        setDescripcion("");
        setFoto(null);
        await fetchProfiles();
        showAlert(
          "Perfil creado",
          "Ahora asígnale sus horarios de atención para que los clientes puedan reservar en esos rangos.",
          "success",
          nuevo ? () => openHorario(nuevo) : null,
          nuevo ? "Asignar horarios" : null
        );
      } else {
        const msg = data.errors ? Object.values(data.errors).flat().join("\n") : data.message || "No se pudo crear el perfil";
        showAlert("Error", msg);
      }
    } catch {
      showAlert("Error", "Ocurrió un error al crear el perfil. Inténtalo de nuevo.");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (p) => {
    setEditing(p);
    setEditNombre(p.nombre || "");
    setEditDescripcion(p.descripcion || "");
    setEditFoto(null);
    setEditFotoOriginal(imgUrl(p.file));
    setEditVisible(true);
  };

  const saveEdit = async () => {
    if (!editNombre.trim()) {
      showAlert("Error", "El nombre no puede quedar vacío");
      return;
    }
    setEditSaving(true);
    try {
      const fd = new FormData();
      fd.append("nombre", editNombre.trim());
      if (editDescripcion.trim()) fd.append("descripcion", editDescripcion.trim());
      if (editFoto) fd.append("file", { uri: editFoto.uri, type: "image/jpeg", name: `profile_${Date.now()}.jpg` });
      const res = await fetch(`${BASE_URL}user-perfil/${editing.id}`, {
        method: "POST",
        headers: await authHeaders(),
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEditVisible(false);
        setEditing(null);
        await fetchProfiles();
        showAlert("Éxito", "Perfil actualizado correctamente", "success");
      } else {
        showAlert("Error", data.message || "No se pudo actualizar el perfil");
      }
    } catch {
      showAlert("Error", "Ocurrió un error al editar el perfil");
    } finally {
      setEditSaving(false);
    }
  };

  const confirmHide = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${BASE_URL}user-perfil/${deleteTarget.id}`, {
        method: "DELETE",
        headers: await authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDeleteTarget(null);
        await fetchProfiles();
        showAlert("Éxito", "Perfil ocultado. El historial de reservas no se afecta.", "success");
      } else {
        setDeleteTarget(null);
        showAlert("Error", data.message || "No se pudo ocultar el perfil");
      }
    } catch {
      setDeleteTarget(null);
      showAlert("Error", "Ocurrió un error al ocultar el perfil");
    }
  };

  const fetchHorarios = async (perfilId) => {
    setHorariosLoading(true);
    try {
      const res = await fetch(`${BASE_URL}user-perfil-disponibilidad/${perfilId}`, { headers: await authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHorarios(data.data || []);
      } else {
        setHorarios([]);
      }
    } catch {
      setHorarios([]);
    } finally {
      setHorariosLoading(false);
    }
  };

  const resetHorarioForm = () => {
    setDia(null);
    setHoraInicio(timeToDate(null, 8, 0));
    setHoraFin(timeToDate(null, 17, 0));
    setShowInicio(false);
    setShowFin(false);
    setEditHorarioId(null);
  };

  const openHorario = async (perfil) => {
    setHorarioPerfil(perfil);
    resetHorarioForm();
    setFormMode("list");
    setHorarioVisible(true);
    await fetchHorarios(perfil.id);
  };

  const openNewHorario = () => {
    resetHorarioForm();
    setFormMode("form");
    setTimeout(() => sheetScroll.current?.scrollToEnd({ animated: true }), 100);
  };

  const startEditHorario = (h) => {
    setDia(h.dia_semana);
    setHoraInicio(timeToDate(h.hora_inicio, 8, 0));
    setHoraFin(timeToDate(h.hora_fin, 17, 0));
    setEditHorarioId(h.id);
    setFormMode("form");
    setTimeout(() => sheetScroll.current?.scrollToEnd({ animated: true }), 100);
  };

  const cancelHorarioForm = () => {
    resetHorarioForm();
    setFormMode("list");
  };

  const saveHorario = async () => {
    if (dia == null) {
      showAlert("Error", "Paso 1: elige el día de la semana primero.");
      return;
    }
    if (fmtHora(horaFin) <= fmtHora(horaInicio)) {
      showAlert("Error", "Paso 2: la hora de cierre debe ser mayor que la de apertura. Ej: 08:00 – 17:00.");
      return;
    }
    const duplicado = horarios.some(
      (h) => h.dia_semana === dia && h.id !== editHorarioId
    );
    if (duplicado) {
      showAlert(
        "Día ya asignado",
        `${DIAS[dia]?.label} ya tiene un rango (${String(horarios.find((h) => h.dia_semana === dia)?.hora_inicio).slice(0, 5)} – ${String(horarios.find((h) => h.dia_semana === dia)?.hora_fin).slice(0, 5)}). Edítalo o quítalo en vez de crear otro.`
      );
      return;
    }
    setHorarioSaving(true);
    try {
      const payload = {
        dia_semana: dia,
        hora_inicio: fmtHora(horaInicio),
        hora_fin: fmtHora(horaFin),
      };
      let res;
      const isEdit = !!editHorarioId;
      if (isEdit) {
        res = await fetch(`${BASE_URL}user-perfil-disponibilidad/${editHorarioId}`, {
          method: "POST",
          headers: await authHeaders(true),
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${BASE_URL}user-perfil-disponibilidad`, {
          method: "POST",
          headers: await authHeaders(true),
          body: JSON.stringify({ user_perfil_id: horarioPerfil.id, ...payload }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        cancelHorarioForm();
        await fetchHorarios(horarioPerfil.id);
        await fetchProfiles();
        showAlert("Éxito", isEdit ? "Horario actualizado" : "Horario agregado. Los clientes ya pueden reservar en ese rango.", "success");
      } else {
        const msg = data.errors ? Object.values(data.errors).flat().join("\n") : data.message || "No se pudo guardar el horario";
        showAlert("Error", msg);
      }
    } catch {
      showAlert("Error", "Ocurrió un error al guardar el horario");
    } finally {
      setHorarioSaving(false);
    }
  };

  const confirmDeleteHorario = async () => {
    if (!deleteHorarioId) return;
    try {
      const res = await fetch(`${BASE_URL}user-perfil-disponibilidad/${deleteHorarioId}`, {
        method: "DELETE",
        headers: await authHeaders(),
      });
      if (res.ok) {
        setDeleteHorarioId(null);
        if (editHorarioId === deleteHorarioId) cancelHorarioForm();
        await fetchHorarios(horarioPerfil.id);
        await fetchProfiles();
      } else {
        setDeleteHorarioId(null);
        showAlert("Error", "No se pudo quitar el horario");
      }
    } catch {
      setDeleteHorarioId(null);
      showAlert("Error", "Ocurrió un error al quitar el horario");
    }
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#fa6205" />
        <Text style={s.loadingText}>Cargando perfiles...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mis perfiles</Text>
        <TouchableOpacity style={s.back} onPress={() => setInfoVisible(true)}>
          <Ionicons name="help-circle-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfiles(); }} colors={["#fa6205"]} />}
      >
        <TouchableOpacity style={s.infoCard} onPress={() => setInfoVisible(true)} activeOpacity={0.85}>
          <View style={s.infoIcon}>
            <Ionicons name="people-outline" size={20} color="#fa6205" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.infoTitle}>{PERFIL_INFO_TITULO}</Text>
            <Text style={s.infoText} numberOfLines={2}>
              Persona o recurso que presta tus servicios, con sus propios horarios de reserva. Toca para ver ejemplos.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#BBB" />
        </TouchableOpacity>

        <View style={s.createCard}>
          <Text style={s.cardTitle}>Crear perfil</Text>
          <Text style={s.cardHint}>Ej: “Carlos – Barbero”, “Ana – Manicurista” o “Lancha X”.</Text>
          <Text style={s.label}>Nombre *</Text>
          <TextInput
            style={s.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej: Carlos – Barbero"
            placeholderTextColor="#999"
            maxLength={60}
          />
          <Text style={s.label}>Descripción (opcional)</Text>
          <TextInput
            style={[s.input, { minHeight: 60, textAlignVertical: "top" }]}
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="Qué hace este perfil… (opcional)"
            placeholderTextColor="#999"
            multiline
            maxLength={500}
          />
          <Text style={s.label}>Foto * (obligatoria)</Text>
          <TouchableOpacity style={s.fotoBox} onPress={() => pickImage(setFoto)}>
            {foto ? (
              <Image source={{ uri: foto.uri }} style={s.fotoImg} />
            ) : (
              <View style={s.fotoEmpty}>
                <Ionicons name="camera-outline" size={26} color="#CCC" />
                <Text style={s.fotoHint}>Toca para añadir foto</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[s.primaryBtn, (!nombre.trim() || !foto || creating) && s.btnDisabled]} onPress={createProfile} disabled={!nombre.trim() || !foto || creating}>
            {creating ? <ActivityIndicator size="small" color="#FFF" /> : (<><Ionicons name="add" size={20} color="#FFF" /><Text style={s.primaryText}>Crear perfil</Text></>)}
          </TouchableOpacity>
          <Text style={s.afterCreate}>Al crearlo te pediremos sus horarios de atención.</Text>
        </View>

        <Text style={s.listTitle}>Tus perfiles ({profiles.length})</Text>
        {profiles.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="person-outline" size={48} color="#DDD" />
            <Text style={s.emptyTitle}>Aún no tienes perfiles</Text>
            <Text style={s.emptySub}>Crea el primero arriba: es quien atenderá las reservas de tus servicios.</Text>
          </View>
        ) : profiles.map((p) => {
          const resumen = resumenHorarios(p.user_perfil_disponibilidads);
          const sinHorario = (p.user_perfil_disponibilidads_count ?? p.user_perfil_disponibilidads?.length ?? 0) === 0;
          return (
            <View key={p.id} style={[s.perfilCard, sinHorario && s.perfilSinHorario]}>
              {imgUrl(p.file) ? (
                <Image source={{ uri: imgUrl(p.file) }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarEmpty]}>
                  <Ionicons name="person-outline" size={22} color="#CCC" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.perfilNombre} numberOfLines={1}>{p.nombre}</Text>
                {p.descripcion ? <Text style={s.perfilDesc} numberOfLines={2}>{p.descripcion}</Text> : null}
                {sinHorario ? (
                  <View style={s.warnRow}>
                    <Ionicons name="alert-circle-outline" size={13} color="#B45309" />
                    <Text style={s.warnText}>Sin horarios: no recibe reservas aún</Text>
                  </View>
                ) : (
                  <View style={s.okRow}>
                    <Ionicons name="time-outline" size={13} color="#10B981" />
                    <Text style={s.okText}>{resumen}</Text>
                  </View>
                )}
              </View>
              <View style={s.perfilActions}>
                <TouchableOpacity
                  style={[s.horarioBtn, sinHorario && s.horarioBtnAlert]}
                  onPress={() => openHorario(p)}
                >
                  <Ionicons name="time-outline" size={14} color="#FFF" />
                  <Text style={s.horarioBtnText}>{sinHorario ? "Asignar horario" : "Horarios"}</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                  <TouchableOpacity style={s.iconBtn} onPress={() => openEdit(p)}>
                    <Ionicons name="pencil" size={15} color="#71717A" />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.iconBtn} onPress={() => setDeleteTarget(p)}>
                    <Ionicons name="eye-off-outline" size={15} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={[s.infoIcon, { marginBottom: 12 }]}>
              <Ionicons name="people-outline" size={24} color="#fa6205" />
            </View>
            <Text style={s.modalTitle}>{PERFIL_INFO_TITULO}</Text>
            <ScrollView style={{ maxHeight: 300, alignSelf: "stretch" }}>
              <Text style={s.modalText}>{PERFIL_INFO_TEXTO}</Text>
            </ScrollView>
            <TouchableOpacity style={[s.primaryBtn, { alignSelf: "stretch" }]} onPress={() => setInfoVisible(false)}>
              <Text style={s.primaryText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Editar perfil</Text>
            <TouchableOpacity style={s.fotoBox} onPress={() => pickImage(setEditFoto)}>
              {editFoto ? (
                <Image source={{ uri: editFoto.uri }} style={s.fotoImg} />
              ) : editFotoOriginal ? (
                <Image source={{ uri: editFotoOriginal }} style={s.fotoImg} />
              ) : (
                <View style={s.fotoEmpty}>
                  <Ionicons name="camera-outline" size={26} color="#CCC" />
                  <Text style={s.fotoHint}>Toca para añadir foto</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={s.label}>Nombre *</Text>
            <TextInput style={s.input} value={editNombre} onChangeText={setEditNombre} maxLength={60} />
            <Text style={s.label}>Descripción (opcional)</Text>
            <TextInput style={[s.input, { minHeight: 60, textAlignVertical: "top" }]} value={editDescripcion} onChangeText={setEditDescripcion} multiline maxLength={500} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={[s.primaryBtn, { flex: 1, backgroundColor: "#F4F4F5" }]} onPress={() => setEditVisible(false)}>
                <Text style={[s.primaryText, { color: "#71717A" }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} onPress={saveEdit} disabled={editSaving}>
                {editSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.primaryText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Ionicons name="eye-off-outline" size={40} color="#fa6205" style={{ marginBottom: 12 }} />
            <Text style={s.modalTitle}>Ocultar perfil</Text>
            <Text style={s.modalText}>
              “{deleteTarget?.nombre}” se ocultará y no recibirá nuevas reservas, pero su historial se conserva.{"\n"}Si tiene reservas en curso no se podrá ocultar.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={[s.primaryBtn, { flex: 1, backgroundColor: "#FEE" }]} onPress={() => setDeleteTarget(null)}>
                <Text style={[s.primaryText, { color: "#EF4444" }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} onPress={confirmHide}>
                <Text style={s.primaryText}>Ocultar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={horarioVisible} transparent animationType="slide" onRequestClose={() => setHorarioVisible(false)}>
        <View style={s.sheetBg}>
          <View style={s.sheet}>
            <View style={s.grabber} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <TouchableOpacity onPress={() => (formMode === "form" ? cancelHorarioForm() : setHorarioVisible(false))} style={s.iconBtn}>
                <Ionicons name="arrow-back" size={18} color="#1C1C1E" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>
                  {formMode === "form" ? (editHorarioId ? "Editar horario" : "Nuevo horario") : `Horarios de ${horarioPerfil?.nombre}`}
                </Text>
                <Text style={s.sheetStep}>
                  {formMode === "form" ? (editHorarioId ? "Paso 2 de 2 · ajusta y guarda" : "Paso 2 de 2 · elige día y horas") : "Paso 1 de 2 · revisa sus rangos"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setHorarioVisible(false)} style={s.iconBtn}>
                <Ionicons name="close" size={18} color="#999" />
              </TouchableOpacity>
            </View>
            <Text style={s.cardHint}>
              {formMode === "form"
                ? "Los clientes solo podrán reservar dentro de este rango."
                : "Estos son los rangos donde este perfil recibe reservas."}
            </Text>

            <ScrollView ref={sheetScroll} showsVerticalScrollIndicator={false} style={{ marginTop: 4 }}>
              {formMode === "list" ? (
                <>
                  {horariosLoading ? (
                    <ActivityIndicator size="small" color="#fa6205" style={{ marginVertical: 16 }} />
                  ) : horarios.length === 0 ? (
                    <View style={s.horarioEmpty}>
                      <Ionicons name="calendar-outline" size={36} color="#B45309" />
                      <Text style={s.horarioEmptyTitle}>Sin horarios todavía</Text>
                      <Text style={s.horarioEmptySub}>
                        {horarioPerfil?.nombre} no recibe reservas aún.{"\n"}Toca el botón de abajo para crear su primer rango de atención.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={s.countRow}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={s.countText}>
                          {horarios.length} {horarios.length === 1 ? "día con atención" : "días con atención"} · recibe reservas en esos rangos
                        </Text>
                      </View>
                      {[...horarios].sort((a, b) => a.dia_semana - b.dia_semana).map((h) => (
                        <View key={h.id} style={s.horarioRow}>
                          <View style={s.horarioDayBadge}>
                            <Text style={s.horarioDayBadgeText}>{DIAS[h.dia_semana]?.short}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.horarioDia}>{DIAS[h.dia_semana]?.label}</Text>
                            <Text style={s.horarioHoras}>{String(h.hora_inicio).slice(0, 5)} – {String(h.hora_fin).slice(0, 5)}</Text>
                          </View>
                          <TouchableOpacity style={s.iconBtn} onPress={() => startEditHorario(h)}>
                            <Ionicons name="pencil" size={15} color="#71717A" />
                          </TouchableOpacity>
                          <TouchableOpacity style={[s.iconBtn, { backgroundColor: "#FEF2F2" }]} onPress={() => setDeleteHorarioId(h.id)}>
                            <Ionicons name="trash-outline" size={15} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}
                  <TouchableOpacity style={[s.primaryBtn, { alignSelf: "stretch" }]} onPress={openNewHorario}>
                    <Ionicons name="add" size={20} color="#FFF" />
                    <Text style={s.primaryText}>{horarios.length === 0 ? "Crear primer horario" : "Agregar otro día"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.ghostBtn} onPress={() => setHorarioVisible(false)}>
                    <Text style={s.ghostText}>Listo, cerrar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={s.editBanner}>
                    <Ionicons name={editHorarioId ? "pencil" : "add-circle"} size={16} color="#fa6205" />
                    <Text style={s.editBannerText}>
                      {editHorarioId
                        ? `Editando el rango del ${DIAS[horarios.find((h) => h.id === editHorarioId)?.dia_semana]?.label || "día"}. Cambia lo necesario y guarda.`
                        : "Creando un rango nuevo. Completa los 2 pasos y guarda."}
                    </Text>
                  </View>
                  <Text style={s.formSection}>Paso 1 · ¿Qué día atiende?</Text>
                  <View style={s.dayGrid}>
                    {DIAS.map((d) => {
                      const ocupado = horarios.some((h) => h.dia_semana === d.value && h.id !== editHorarioId);
                      const active = dia === d.value;
                      return (
                        <TouchableOpacity
                          key={d.value}
                          style={[s.dayCard, active && s.dayCardActive, ocupado && !active && s.dayCardBusy]}
                          onPress={() => setDia(d.value)}
                        >
                          <Text style={[s.dayCardText, active && s.dayCardTextActive]}>{d.short}</Text>
                          <Text style={[s.dayCardSub, active && s.dayCardSubActive]}>
                            {active ? "Elegido" : ocupado ? "Ocupado" : d.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={s.formSection}>Paso 2 · ¿De qué horas a qué horas?</Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.miniLabel}>Abre a las</Text>
                      <TouchableOpacity style={[s.timeBtn, showInicio && s.timeBtnActive]} onPress={() => { setShowInicio(true); setShowFin(false); }}>
                        <Ionicons name="sunny-outline" size={16} color="#fa6205" />
                        <Text style={s.timeText}>{fmtHora(horaInicio)}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ justifyContent: "center", paddingTop: 22 }}>
                      <Ionicons name="arrow-forward" size={16} color="#BBB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.miniLabel}>Cierra a las</Text>
                      <TouchableOpacity style={[s.timeBtn, showFin && s.timeBtnActive]} onPress={() => { setShowFin(true); setShowInicio(false); }}>
                        <Ionicons name="moon-outline" size={16} color="#fa6205" />
                        <Text style={s.timeText}>{fmtHora(horaFin)}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {showInicio && (
                    <DateTimePicker
                      value={horaInicio} mode="time" is24Hour display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(e, d) => {
                        if (Platform.OS === "android") setShowInicio(false);
                        if (d) setHoraInicio(new Date(d));
                        if (Platform.OS === "ios" && e.type === "dismissed") setShowInicio(false);
                      }}
                    />
                  )}
                  {showFin && (
                    <DateTimePicker
                      value={horaFin} mode="time" is24Hour display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(e, d) => {
                        if (Platform.OS === "android") setShowFin(false);
                        if (d) setHoraFin(new Date(d));
                        if (Platform.OS === "ios" && e.type === "dismissed") setShowFin(false);
                      }}
                    />
                  )}
                  <View style={s.previewBox}>
                    <Ionicons name="calendar-check-outline" size={16} color="#10B981" />
                    <Text style={s.previewText}>
                      {dia == null
                        ? "Elige primero el día arriba…"
                        : `${DIAS[dia]?.label} · ${fmtHora(horaInicio)} – ${fmtHora(horaFin)}`}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                    <TouchableOpacity style={[s.primaryBtn, { flex: 1, backgroundColor: "#F4F4F5", marginTop: 0 }]} onPress={cancelHorarioForm}>
                      <Text style={[s.primaryText, { color: "#71717A" }]}>Volver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.primaryBtn, { flex: 2, marginTop: 0 }, (dia == null || horarioSaving) && s.btnDisabled]} onPress={saveHorario} disabled={dia == null || horarioSaving}>
                      {horarioSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.primaryText}>{editHorarioId ? "Guardar cambios" : "Guardar horario"}</Text>}
                    </TouchableOpacity>
                  </View>
                </>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteHorarioId} transparent animationType="fade" onRequestClose={() => setDeleteHorarioId(null)}>
        <View style={s.modalBg}>
          <View style={[s.modalCard, { alignItems: "center" }]}>
            <Ionicons name="trash-outline" size={40} color="#EF4444" style={{ marginBottom: 12 }} />
            <Text style={s.modalTitle}>Quitar este horario</Text>
            <Text style={[s.modalText, { textAlign: "center" }]}>
              {(() => {
                const h = horarios.find((x) => x.id === deleteHorarioId);
                if (!h) return "¿Quitar este rango?";
                return `${DIAS[h.dia_semana]?.label} · ${String(h.hora_inicio).slice(0, 5)} – ${String(h.hora_fin).slice(0, 5)}\nLos clientes ya no podrán reservar en ese rango.`;
              })()}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
              <TouchableOpacity style={[s.primaryBtn, { flex: 1, backgroundColor: "#F4F4F5", marginTop: 14 }]} onPress={() => setDeleteHorarioId(null)}>
                <Text style={[s.primaryText, { color: "#71717A" }]}>Conservar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.primaryBtn, { flex: 1, backgroundColor: "#EF4444", marginTop: 14 }]} onPress={confirmDeleteHorario}>
                <Text style={s.primaryText}>Sí, quitar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AlertaModal visible={alertVisible} mensaje={alertData.message} tipo={alertData.type} onCerrar={() => setAlertVisible(false)} onPrimary={alertData.onPrimary} primaryLabel={alertData.primaryLabel} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F4F5" },
  loading: { flex: 1, backgroundColor: "#F4F4F5", justifyContent: "center", alignItems: "center", gap: 8 },
  loadingText: { fontFamily: "Montserrat_400Regular", color: "#71717A", fontSize: 13 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#1C1C1E", paddingHorizontal: 16, paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  infoCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FDBA74", borderRadius: 16, padding: 12, marginBottom: 14 },
  infoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFF0E5", justifyContent: "center", alignItems: "center" },
  infoTitle: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E" },
  infoText: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: "#71717A", marginTop: 2 },
  createCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: "#F0F0F0" },
  cardTitle: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E" },
  cardHint: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: "#71717A", marginTop: 2, marginBottom: 12 },
  label: { fontSize: 12, fontFamily: "Montserrat_700Bold", color: "#1C1C1E", marginBottom: 6, marginTop: 10 },
  miniLabel: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: "#71717A", marginBottom: 6 },
  input: { backgroundColor: "#F4F4F5", borderRadius: 12, padding: 12, fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#1C1C1E", borderWidth: 1, borderColor: "#E8E8ED" },
  fotoBox: { borderRadius: 14, overflow: "hidden", backgroundColor: "#F4F4F5", borderWidth: 2, borderColor: "#E5E5E5", borderStyle: "dashed", height: 120, justifyContent: "center", alignItems: "center" },
  fotoImg: { width: "100%", height: "100%" },
  fotoEmpty: { alignItems: "center", gap: 4 },
  fotoHint: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: "#BBB" },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#fa6205", borderRadius: 14, paddingVertical: 14, marginTop: 14 },
  primaryText: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  btnDisabled: { opacity: 0.4 },
  afterCreate: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: "#999", textAlign: "center", marginTop: 8 },
  listTitle: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E", marginBottom: 10 },
  empty: { backgroundColor: "#FFF", borderWidth: 2, borderColor: "#E5E5E5", borderStyle: "dashed", borderRadius: 20, padding: 32, alignItems: "center" },
  emptyTitle: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#1C1C1E", marginTop: 10 },
  emptySub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: "#999", marginTop: 4, textAlign: "center" },
  perfilCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF", borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#F0F0F0" },
  perfilSinHorario: { borderColor: "#FDBA74" },
  avatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#F4F4F5" },
  avatarEmpty: { justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#E5E5E5", borderStyle: "dashed" },
  perfilNombre: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: "#1C1C1E" },
  perfilDesc: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: "#999", marginTop: 1 },
  warnRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, backgroundColor: "#FFFBEB", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start" },
  warnText: { fontSize: 10, fontFamily: "Montserrat_700Bold", color: "#B45309" },
  okRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  okText: { fontSize: 10, fontFamily: "Montserrat_600SemiBold", color: "#10B981" },
  perfilActions: { alignItems: "flex-end" },
  horarioBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fa6205", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  horarioBtnAlert: { backgroundColor: "#B45309" },
  horarioBtnText: { fontSize: 11, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F4F4F5", justifyContent: "center", alignItems: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 20, width: "90%", maxHeight: "85%", alignItems: "center" },
  modalTitle: { fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E", marginBottom: 8, textAlign: "center" },
  modalText: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: "#555", lineHeight: 20, textAlign: "center", marginBottom: 8 },
  sheetBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 30, maxHeight: "90%" },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 12 },
  horarioEmpty: { alignItems: "center", backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 16, padding: 18, marginTop: 8 },
  horarioEmptyTitle: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: "#92400E", marginTop: 8 },
  horarioEmptySub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: "#B45309", marginTop: 4, textAlign: "center", lineHeight: 18 },
  horarioRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F9F9F9", borderRadius: 14, padding: 12, marginBottom: 6 },
  horarioRowActive: { borderWidth: 1.5, borderColor: "#fa6205" },
  horarioDayBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#fa6205", justifyContent: "center", alignItems: "center" },
  horarioDayBadgeText: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  sheetTitle: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E" },
  sheetStep: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: "#fa6205", marginTop: 2 },
  countRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, marginBottom: 8 },
  countText: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: "#10B981" },
  ghostBtn: { alignSelf: "stretch", paddingVertical: 12, alignItems: "center", marginTop: 6 },
  ghostText: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: "#71717A" },
  editBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FDBA74", borderRadius: 12, padding: 10, marginTop: 8 },
  editBannerText: { flex: 1, fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: "#92400E", lineHeight: 16 },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  dayCard: { width: "22%", borderRadius: 12, backgroundColor: "#F4F4F5", paddingVertical: 10, alignItems: "center", borderWidth: 1.5, borderColor: "transparent" },
  dayCardActive: { backgroundColor: "#fa6205", borderColor: "#fa6205" },
  dayCardBusy: { borderColor: "#FDBA74", backgroundColor: "#FFFBEB" },
  dayCardText: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E" },
  dayCardTextActive: { color: "#FFF" },
  dayCardSub: { fontSize: 9, fontFamily: "Montserrat_600SemiBold", color: "#999", marginTop: 2 },
  dayCardSubActive: { color: "#FFF" },
  timeBtnActive: { borderWidth: 1.5, borderColor: "#fa6205" },
  previewBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ECFDF5", borderRadius: 12, padding: 12, marginTop: 12 },
  previewText: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: "#065F46" },
  horarioDia: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: "#1C1C1E" },
  horarioHoras: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: "#71717A", marginTop: 2 },
  formSection: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E", marginTop: 14, marginBottom: 4 },
  dayRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#F4F4F5" },
  dayChipActive: { backgroundColor: "#fa6205" },
  dayText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#71717A" },
  dayTextActive: { color: "#FFF", fontFamily: "Montserrat_700Bold" },
  timeBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F4F4F5", borderRadius: 12, padding: 12 },
  timeText: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: "#1C1C1E" },
});
