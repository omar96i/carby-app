import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ActivityIndicator, ScrollView, Image, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5" };
const API_URL = "https://back.carbycol.com/api/";

const ROLES = [
  { key: "usuario", label: "Usuario", desc: "Pide comida o transporte", icon: "person" },
  { key: "comercio", label: "Comercio", desc: "Administra tu negocio", icon: "storefront" },
  { key: "rider.moto", label: "Delivery", desc: "Envíos y mensajería", icon: "bicycle" },
  { key: "rider.taxi", label: "Particular", desc: "Transporte de pasajeros", icon: "car" },
];

const DOC_LABELS = {
  tipo_ruc: "Tipo de RUC / NIT", dni: "Documento de Identidad",
  certificado_inspeccion: "Certificado inspección", soat: "SOAT",
  antecedente_penales: "Antecedentes penales", licencia_conduccion: "Licencia de conducción",
  tarjeta_circulacion: "Tarjeta de circulación", tarjeta_identificacion: "Tarjeta identificación",
  revision_tecnica: "Revisión técnica", b2b: "Licencia BIIB / Conducción",
  licencia_categoria: "Licencia Categoría", permiso_municipal: "Permiso municipal",
  tarjeta_propiedad: "Tarjeta de propiedad",
};

const TEXT_LABELS = {
  nombre_completo: "Nombre completo", numero_documento: "Número de documento",
  numero_telefono: "Número de teléfono", email: "Correo electrónico",
  fecha_nacimiento: "Fecha de nacimiento", placa: "Placa",
  marca_vehiculo: "Marca", color: "Color", linea: "Línea",
  establecimiento_nombre: "Nombre establecimiento", persona_natural: "Persona natural",
  global_categoria_id: "Categoría",
};

function getMimeType(f) { return f.endsWith('png') ? 'image/png' : f.endsWith('pdf') ? 'application/pdf' : 'image/jpeg'; }

export default function RoleSwitcher({ userData: ud, onSwitchSuccess }) {
  const currentRole = ud?.tipo_usuario || "usuario";
  const [pwdModal, setPwdModal] = useState(false);
  const [targetRole, setTargetRole] = useState(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Correcciones states
  const [corrModal, setCorrModal] = useState(false);
  const [corrData, setCorrData] = useState(null);
  const [textObs, setTextObs] = useState("");
  const [estadoId, setEstadoId] = useState("");
  const [archivos, setArchivos] = useState({});
  const [camposTexto, setCamposTexto] = useState([]);
  const [camposArchivos, setCamposArchivos] = useState([]);
  const [inputsTexto, setInputsTexto] = useState({});
  const [inputsFecha, setInputsFecha] = useState({ año: '', mes: '', dia: '' });

  const resetCorr = () => {
    setCorrModal(false);
    setArchivos({});
    setInputsTexto({});
    setInputsFecha({ año: '', mes: '', dia: '' });
    setCamposTexto([]);
    setCamposArchivos([]);
    setLoading(false);
  };

  const handleTap = async (role) => {
    if (role === currentRole) return;
    setTargetRole(role);
    setPassword("");
    setErrorMsg("");
    setPwdModal(true);
  };

  const confirmSwitch = async () => {
    if (!password.trim()) return;
    setLoading(true);
    setErrorMsg("");
    try {
      let email = ud?.email || ud?.data?.email || "";
      if (!email) {
        const stored = await AsyncStorage.getItem("userData");
        if (stored) { const p = JSON.parse(stored); email = p.email || p.data?.email || ""; }
      }

      const res = await fetch(`${API_URL}login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: password.trim(), tipo_usuario: targetRole }),
      });
      const data = await res.json();

      if (res.status === 200 && data.token) {
        await Promise.all([
          AsyncStorage.setItem("userToken", data.token),
          AsyncStorage.setItem("userData", JSON.stringify(data.user)),
          AsyncStorage.setItem("tipo_usuario", data.user.tipo_usuario),
          AsyncStorage.setItem("userId", String(data.user.id)),
          AsyncStorage.setItem("preferencia_rol", targetRole),
        ]);
        setPwdModal(false);
        onSwitchSuccess?.(targetRole);
      } else {
        handleRoleError(data, res.status);
      }
    } catch (e) {
      setErrorMsg("Error de conexión. Intenta nuevamente.");
      setLoading(false);
    }
  };

  const handleRoleError = (data, status) => {
    if (data.razon === "estado_no_activo" && data.user_role_estado?.estado === "pendiente_correccion") {
      try {
        const obs = JSON.parse(data.user_role_estado?.observacion || "{}");
        if (obs && obs.campos) {
          const docKeys = Object.keys(DOC_LABELS);
          setCamposArchivos(obs.campos.filter((c) => docKeys.includes(c)));
          setCamposTexto(obs.campos.filter((c) => !docKeys.includes(c)));
          setTextObs(obs.observacion || "Completa los campos solicitados.");
          setEstadoId(data.user_role_estado.id);
          setArchivos({});
          setInputsTexto({});
          setInputsFecha({ año: '', mes: '', dia: '' });
          setPwdModal(false);
          setCorrModal(true);
          setLoading(false);
          return;
        }
      } catch (e) {}
    }
    const label = ROLES.find((r) => r.key === targetRole)?.label || targetRole;
    if (data.razon === "estado_no_activo") {
      setErrorMsg("Tu rol de " + label + " requiere correcciones. Actualiza tus documentos para activarlo.");
    } else if (data.razon === "estado_inexistente") {
      setErrorMsg("No estás registrado como " + label + ". Regístrate primero.");
    } else if (status === 401) {
      setErrorMsg("Contraseña incorrecta");
    } else {
      setErrorMsg(data.message || "No tienes acceso como " + label);
    }
    setPassword("");
    setLoading(false);
  };

  const pickDoc = async (campo) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) {
      const f = result.assets[0];
      setArchivos((prev) => ({ ...prev, [campo]: { uri: f.uri, name: f.fileName || "img.jpg", type: f.type || "image/jpeg" } }));
    }
  };

  const enviarCorrecciones = async () => {
    const faltaArchivo = camposArchivos.some((c) => !archivos[c]?.uri);
    const faltaTexto = camposTexto.some((c) => {
      if (c === "fecha_nacimiento") return !(inputsFecha.año && inputsFecha.mes && inputsFecha.dia);
      return !inputsTexto[c];
    });
    if (faltaArchivo || faltaTexto) { setErrorMsg("Completa todos los campos"); return; }

    setLoading(true);
    try {
      const fd = new FormData();
      camposArchivos.forEach((c) => {
        const f = archivos[c];
        if (f?.uri) fd.append(c, { uri: f.uri, name: f.name, type: getMimeType(f.name) });
      });
      camposTexto.forEach((c) => {
        if (c === "fecha_nacimiento") fd.append(c, `${inputsFecha.año}-${inputsFecha.mes}-${inputsFecha.dia}`);
        else if (inputsTexto[c]) fd.append(c, inputsTexto[c]);
      });

      const res = await fetch(`${API_URL}user/update/archivos/${estadoId}`, {
        method: "POST", headers: { Accept: "application/json" }, body: fd,
      });
      if (res.ok) {
        resetCorr();
        setErrorMsg("");
      } else {
        setErrorMsg("Error al enviar. Intenta nuevamente.");
        setLoading(false);
      }
    } catch (e) {
      setErrorMsg("Error de conexión");
      setLoading(false);
    }
  };

  return (
    <View style={s.wrapper}>
      <Text style={s.hint}>Seleccionado actualmente</Text>
      <View style={s.grid}>
        {ROLES.map((r) => {
          const isActive = r.key === currentRole;
          return (
            <TouchableOpacity key={r.key} style={isActive ? s.tileActiveShrink : s.tileInactiveShrink} onPress={() => handleTap(r.key)} activeOpacity={0.7}>
              {isActive && <View style={s.check}><Ionicons name="checkmark-circle" size={14} color={C.surface} /></View>}
              <View style={[s.tileIcon, isActive && s.tileIconActive]}><Ionicons name={r.icon} size={16} color={isActive ? C.surface : C.ink} /></View>
              <Text style={[s.tileLabel, isActive && s.tileLabelActive]}>{r.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Password Modal */}
      <Modal visible={pwdModal} transparent animationType="fade">
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Ionicons name="lock-closed" size={32} color={C.brand} style={{ marginBottom: 10 }} />
            <Text style={s.modalTitle}>Confirmar cambio de rol</Text>
            <Text style={s.modalSub}>Ingresa tu contraseña para ingresar como {ROLES.find(r => r.key === targetRole)?.label}</Text>
            <TextInput style={s.input} placeholder="Contraseña" placeholderTextColor="#999" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={confirmSwitch} />
            {errorMsg ? <Text style={s.error}>{errorMsg}</Text> : null}
            <TouchableOpacity style={[s.btn, (!password || loading) && s.btnDisabled]} onPress={confirmSwitch} disabled={!password || loading}>
              {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.btnText}>Ingresar</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setPwdModal(false); setLoading(false); }} style={{ marginTop: 10 }}><Text style={s.cancelText}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Correcciones Modal */}
      <Modal visible={corrModal} transparent animationType="slide">
        <View style={s.corrBg}>
          <View style={s.corrCard}>
            <Text style={s.corrTitle}>Información adicional requerida</Text>
            <Text style={s.corrSub}>{textObs}</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {camposArchivos.map((campo) => (
                <View key={campo} style={s.field}>
                  <Text style={s.fieldLabel}>{DOC_LABELS[campo] || campo.toUpperCase()}</Text>
                  <TouchableOpacity style={s.docBtn} onPress={() => pickDoc(campo)}>
                    <Ionicons name="camera" size={22} color={C.brand} />
                  </TouchableOpacity>
                  {archivos[campo]?.uri && <Image source={{ uri: archivos[campo].uri }} style={s.docPreview} />}
                </View>
              ))}
              {camposTexto.map((campo) => (
                <View key={campo} style={s.field}>
                  <Text style={s.fieldLabel}>{TEXT_LABELS[campo] || campo.toUpperCase()}</Text>
                  {campo === "fecha_nacimiento" ? (
                    <View style={s.dateRow}>
                      <TextInput placeholder="AAAA" placeholderTextColor="#999" keyboardType="numeric" maxLength={4} style={s.dateInput} value={inputsFecha.año} onChangeText={(t) => setInputsFecha(p => ({ ...p, año: t }))} />
                      <TextInput placeholder="MM" placeholderTextColor="#999" keyboardType="numeric" maxLength={2} style={s.dateInput} value={inputsFecha.mes} onChangeText={(t) => setInputsFecha(p => ({ ...p, mes: t }))} />
                      <TextInput placeholder="DD" placeholderTextColor="#999" keyboardType="numeric" maxLength={2} style={s.dateInput} value={inputsFecha.dia} onChangeText={(t) => setInputsFecha(p => ({ ...p, dia: t }))} />
                    </View>
                  ) : (
                    <TextInput style={s.textInput} placeholder="Ingresa la corrección..." placeholderTextColor="#999" value={inputsTexto[campo] || ''} onChangeText={(t) => setInputsTexto(p => ({ ...p, [campo]: t }))} />
                  )}
                </View>
              ))}
            </ScrollView>
            {errorMsg ? <Text style={s.error}>{errorMsg}</Text> : null}
            <View style={s.corrBtns}>
              <TouchableOpacity style={s.corrCancel} onPress={resetCorr}><Text style={s.corrCancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[s.corrSave, loading && s.btnDisabled]} onPress={enviarCorrecciones} disabled={loading}>
                {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.corrSaveText}>Enviar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginTop: 12, marginBottom: 12, backgroundColor: C.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#F0F0F0" },
  hint: { fontSize: 10, fontFamily: "Montserrat_600SemiBold", color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  grid: { flexDirection: "row", gap: 6 },
  tile: { alignItems: "center", gap: 6, paddingVertical: 4 },
  tileActiveShrink: { flex: 1, backgroundColor: C.brand, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, alignItems: "center", gap: 4 },
  tileInactiveShrink: { flex: 1, backgroundColor: C.bg, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, alignItems: "center", gap: 4 },
  tileIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#E8E8ED", justifyContent: "center", alignItems: "center" },
  tileIconActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  tileLabel: { fontSize: 9, fontFamily: "Montserrat_600SemiBold", color: C.ink, textAlign: "center" },
  tileLabelActive: { color: C.surface, fontFamily: "Montserrat_800ExtraBold" },
  check: { position: "absolute", top: 2, right: 2, zIndex: 1 },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { backgroundColor: C.surface, borderRadius: 24, padding: 24, width: "100%", alignItems: "center" },
  modalTitle: { fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: C.ink, marginBottom: 4 },
  modalSub: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: C.muted, textAlign: "center", marginBottom: 16, lineHeight: 18 },
  input: { width: "100%", backgroundColor: C.bg, borderRadius: 14, padding: 14, fontSize: 15, fontFamily: "Montserrat_600SemiBold", color: C.ink, marginBottom: 14 },
  btn: { backgroundColor: C.brand, paddingVertical: 14, borderRadius: 14, width: "100%", alignItems: "center" },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  cancelText: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: C.muted },
  error: { color: "#EF4444", fontSize: 12, fontFamily: "Montserrat_600SemiBold", marginTop: 8, marginBottom: 4, textAlign: "center" },

  corrBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  corrCard: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: "85%" },
  corrTitle: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: C.ink, marginBottom: 8 },
  corrSub: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: C.muted, marginBottom: 16, lineHeight: 18 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: C.ink, marginBottom: 8 },
  docBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },
  docPreview: { width: 80, height: 80, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: "#E0E0E0" },
  textInput: { backgroundColor: C.bg, borderRadius: 14, padding: 12, fontSize: 14, fontFamily: "Montserrat_400Regular", color: C.ink },
  dateRow: { flexDirection: "row", gap: 8 },
  dateInput: { flex: 1, backgroundColor: C.bg, borderRadius: 14, padding: 12, fontSize: 14, fontFamily: "Montserrat_400Regular", color: C.ink, textAlign: "center" },
  corrBtns: { flexDirection: "row", gap: 10, marginTop: 20 },
  corrCancel: { flex: 1, backgroundColor: C.bg, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  corrCancelText: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: C.muted },
  corrSave: { flex: 1, backgroundColor: C.brand, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  corrSaveText: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
});
