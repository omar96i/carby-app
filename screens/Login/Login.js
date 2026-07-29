import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  ActionSheetIOS,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Modal
} from "react-native";
import { FontAwesome, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Font from 'expo-font';
import AsyncStorage from "@react-native-async-storage/async-storage";
// Mantenemos BASE_URL para referencias por defecto, pero usaremos URLS dinámicas
import { BASE_URL } from "../../constants/url";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import { useNotification } from "../../context/NotificationContext";
import { useAlert } from "../../context/AlertContext";

const API_URL = "https://back.carbycol.com/api/";

export default function LoginScreen() {
  const navigation = useNavigation();
  const { expoPushToken } = useNotification();
  const { showAlert } = useAlert();

  // --- ESTADOS DE UI ---
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // --- ESTADOS FORMULARIO LOGIN ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- ESTADOS MULTI-PAÍS ---
  const [urlContexto, setUrlContexto] = useState(API_URL); // Url para correcciones

  // --- ESTADOS RECUPERACIÓN CONTRASEÑA ---
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");

  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetEmailStorage, setResetEmailStorage] = useState("");

  const [modalVisible, setModalVisible] = useState(false); // Modal Corrección
  const [camposObservados, setCamposObservados] = useState([]);
  const [textoObservacion, setTextoObservacion] = useState("");
  const [estadoId, setEstadoId] = useState("");
  const [archivos, setArchivos] = useState({});
  const [camposTexto, setCamposTexto] = useState([]);
  const [camposArchivos, setCamposArchivos] = useState([]);
  const [inputsTexto, setInputsTexto] = useState({});
  const [inputsFecha, setInputsFecha] = useState({ año: '', mes: '', dia: '' });
  const [categorias, setCategorias] = useState([]);

  // Refs
  const scrollViewRef = useRef(null);
  const passwordRef = useRef(null);

  // --- CARGA INICIAL ---
  useEffect(() => {
    async function loadResources() {
      try {
        await Font.loadAsync({
          'Montserrat-Regular': require('../../assets/fonts/Montserrat-Regular.ttf'),
          'Montserrat-Bold': require('../../assets/fonts/Montserrat-Bold.ttf'),
        });
        setFontsLoaded(true);
        fetchCategorias();
      } catch (error) {
        console.error('Error loading resources', error);
        setFontsLoaded(true);
      }
    }
    loadResources();
    checkLoginStatus();
  }, [checkLoginStatus]);

  // Teclado
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardVisible(true);
      setTimeout(() => {
        if (scrollViewRef.current) {
          const scrollOffset = Math.min(150, e.endCoordinates.height * 0.3);
          scrollViewRef.current.scrollTo({ y: scrollOffset, animated: true });
        }
      }, 150);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const fetchCategorias = async () => {
    try {
      // Intentamos cargar categorías del base por defecto (o podríamos probar ambas)
      const response = await fetch(BASE_URL + "global-categorias/get/obtener", {
        method: "GET", headers: { Accept: "application/json" },
      });
      const data = await response.json();
      if (data?.data && Array.isArray(data.data)) setCategorias(data.data);
    } catch (error) { console.error("Error categorias", error); }
  };

  const checkLoginStatus = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const tipoUsuario = await AsyncStorage.getItem("tipo_usuario");
      if (token && tipoUsuario) {
        console.log("✅ Check Login: Autenticado.");
        redirectUser(tipoUsuario);
      }
    } catch (error) { console.error("Error checking login:", error); }
  }, [navigation]);

  const redirectUser = (tipo) => {
    if (tipo === "usuario") navigation.reset({ index: 0, routes: [{ name: "BottomTabNavigatorUsuario" }] });
    else if (tipo === "comercio") navigation.reset({ index: 0, routes: [{ name: "BottomTabNavigatorAliado" }] });
    else navigation.reset({ index: 0, routes: [{ name: "BottomTabNavigatorDelivery" }] });
  };

  // ==========================================
  // LÓGICA DE LOGIN PRINCIPAL (MULTI-PAÍS)
  // ==========================================

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email.trim() || !password.trim()) {
      return showAlert({ title: "Error", message: "Por favor, ingresa tu email y contraseña.", type: "error" });
    }
    if (isLoading) return;
    setIsLoading(true);

    const preferencia = await AsyncStorage.getItem("preferencia_rol") || "usuario";

    const loginBody = JSON.stringify({
      email: email.trim(),
      password: password.trim(),
      tipo_usuario: preferencia,
    });

    try {
      const res = await fetch(`${API_URL}login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: loginBody,
      });
      const data = await res.json();

      if (res.status === 200 && data.token) {
        console.log("🚀 Ingreso exitoso como", preferencia);
        await finalizarLogin(data);
        return;
      }

      // Si falló por validación de rol, reintentar como usuario
      const isRoleError = data.razon === "estado_inexistente" || data.razon === "estado_no_activo";
      if (isRoleError && preferencia !== "usuario") {
        console.log("⚠️ Rol no aprobado, reintentando como usuario...");
        const retryRes = await fetch(`${API_URL}login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password: password.trim(), tipo_usuario: "usuario" }),
        });
        const retryData = await retryRes.json();
        if (retryRes.status === 200 && retryData.token) {
          await finalizarLogin(retryData);
          return;
        }
        setIsLoading(false);
        manejarErrorNegocio(retryData, API_URL);
        return;
      }

      setIsLoading(false);
      manejarErrorNegocio(data, API_URL);
    } catch (error) {
      console.error("Error handleLogin:", error);
      setIsLoading(false);
      showAlert({ title: "Error", message: "Ocurrió un error inesperado. Intenta nuevamente.", type: "error" });
    }
  };

  const finalizarLogin = async (data) => {
    setIsLoading(true);
    try {
      await Promise.all([
        AsyncStorage.setItem("userToken", data.token),
        AsyncStorage.setItem("userId", data.user.id.toString()),
        AsyncStorage.setItem("userData", JSON.stringify(data.user)),
        AsyncStorage.setItem("tipo_usuario", data.user.tipo_usuario),
        AsyncStorage.setItem("pais_seleccionado", "CO")
      ]);

      // Registrar Token Push
      if (expoPushToken) {
        await fetch(`${API_URL}notification-token/assign-user`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: data.user.id, token: expoPushToken })
        }).catch(e => console.log("Push error", e));
      }

      setTimeout(() => {
        setIsLoading(false);
        redirectUser(data.user.tipo_usuario);
      }, 500);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      showAlert({ title: "Error", message: "No se pudo guardar la sesión.", type: "error" });
    }
  };

  const manejarErrorNegocio = (data) => {
    const estado = data.user_role_estado?.estado;
    let mensaje = data.message || "Acceso denegado.";

    if (data.razon === "estado_inexistente") {
      mensaje = "Faltan documentos por subir.";
    } else if (data.razon === "estado_no_activo") {
      switch (estado) {
        case "pendiente":
          mensaje = "Tu cuenta está en revisión. Te notificaremos.";
          break;
        case "rechazado":
          mensaje = "Tu solicitud fue rechazada. Contacta soporte.";
          break;
        case "pendiente_correccion":
          procesarCorreccion(data);
          return;
      }
      asignarTokenFallo(data.user_id);
    }
    showAlert({ title: "Acceso denegado", message: mensaje, type: "error" });
  };

  const asignarTokenFallo = async (userId) => {
    if (!expoPushToken) return;
    try {
      await fetch(`${API_URL}notification-token/assign-user`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, token: expoPushToken }),
      });
    } catch (e) { }
  };

  // ==========================================
  // LÓGICA DE RECUPERACIÓN (MULTI-PAÍS)
  // ==========================================

  const solicitarResetPassword = async () => {
    if (!forgotEmail.trim()) { setForgotMessage("Ingresa tu correo."); return; }
    setForgotLoading(true);
    setForgotMessage("");

    try {
      const body = JSON.stringify({ email: forgotEmail.trim() });
      const res = await fetch(`${API_URL}auth/request-reset-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (res.ok) {
        setForgotMessage("✔ Si el correo existe, recibirás un código.");
        setResetEmailStorage(forgotEmail.trim());
        setTimeout(() => {
          setForgotModalVisible(false);
          setResetModalVisible(true);
        }, 2000);
      } else {
        setForgotMessage("No se encontró el correo o hubo un error.");
      }
    } catch (e) {
      setForgotMessage("Error de conexión.");
    } finally {
      setForgotLoading(false);
    }
  };

  const confirmarResetPassword = async () => {
    if (!resetEmailStorage || !resetToken.trim() || !newPassword.trim()) {
      return setResetMessage("Completa todos los campos.");
    }
    if (newPassword !== confirmPassword) return setResetMessage("Las contraseñas no coinciden.");

    setResetLoading(true);
    setResetMessage("");

    try {
      const body = JSON.stringify({
        email: resetEmailStorage,
        token: resetToken.trim(),
        password: newPassword,
        password_confirmation: confirmPassword
      });

      const res = await fetch(`${API_URL}auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (res.ok) {
        setResetMessage("✔ Contraseña actualizada.");
        setTimeout(() => {
          setResetModalVisible(false);
          setEmail(resetEmailStorage);
          setPassword("");
          setResetMessage("");
        }, 2000);
      } else {
        setResetMessage("Código inválido o expirado.");
      }
    } catch (e) {
      setResetMessage("Error de conexión.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleOpenResetModal = () => {
    setForgotModalVisible(false);
    setResetModalVisible(true);
    if (forgotEmail) setResetEmailStorage(forgotEmail);
  };

  // ==========================================
  // LÓGICA DE CORRECCIONES Y DEMO
  // ==========================================

  const procesarCorreccion = (data) => {
    const observacion = JSON.parse(data.user_role_estado?.observacion);
    if (observacion) {
      const labels = Object.keys(labelsCampos);
      const campos = observacion.campos || [];
      setCamposTexto(campos.filter(c => !labels.includes(c)));
      setCamposArchivos(campos.filter(c => labels.includes(c)));
      setInputsTexto({});
      setTextoObservacion(observacion.observacion || "");
      setEstadoId(data.user_role_estado.id);
      setModalVisible(true);
    } else {
        showAlert({ title: "Atención", message: "Tu cuenta requiere correcciones.", type: "info" });
    }
  };

  const enviarCorrecciones = async () => {
    const faltanArchivos = camposArchivos.some((campo) => !archivos[campo]?.uri);
    const faltanTextos = camposTexto.some((campo) => {
      if (campo === "fecha_nacimiento") return !(inputsFecha.año && inputsFecha.mes && inputsFecha.dia);
      return !inputsTexto[campo];
    });

    if (faltanArchivos || faltanTextos) return showAlert({ title: "Campos requeridos", message: "Debes completar todo.", type: "error" });

    try {
      setIsLoading(true);
      const formData = new FormData();

      camposArchivos.forEach((campo) => {
        const f = archivos[campo];
        if (f?.uri) formData.append(campo, { uri: f.uri, name: f.name, type: getMimeType(f.name) });
      });
      camposTexto.forEach((c) => {
        if (c === "fecha_nacimiento") formData.append(c, `${inputsFecha.año}-${inputsFecha.mes}-${inputsFecha.dia}`);
        else if (inputsTexto[c]) formData.append(c, inputsTexto[c]);
      });

      // Usamos urlContexto (seteada en manejarErrorNegocio)
      const response = await fetch(`${urlContexto}user/update/archivos/${estadoId}`, {
        method: "POST", headers: { Accept: "application/json" }, body: formData
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.message || "Error");

      showAlert({ title: "Enviado", message: "Tus correcciones están en revisión.", type: "success" });
      setModalVisible(false);
      setEstadoId(''); setArchivos({}); setInputsTexto({}); setCamposObservados([]);

    } catch (error) {
      showAlert({ title: "Error", message: error.message || "No se pudo enviar.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // --- HELPERS ---
  const getMimeType = (f) => f.endsWith('png') ? 'image/png' : f.endsWith('pdf') ? 'application/pdf' : 'image/jpeg';

  const handleOpenPickerIOS = (label, options, onChange) => {
    const labels = options.map((opt) => opt.label);
    ActionSheetIOS.showActionSheetWithOptions(
      { title: label, options: [...labels, "Cancelar"], cancelButtonIndex: labels.length },
      (buttonIndex) => {
        if (buttonIndex !== labels.length) {
          const val = options[buttonIndex].value;
          if (!val.includes("separator")) onChange(val);
        }
      }
    );
  };

  const renderPicker = (value, label, placeholder, options, onChange, enabled = true, isError = false) => {
    const displayText = options.find((opt) => opt.value == value)?.label || placeholder;
    const validOptions = options.filter((opt) => !opt.isSeparator);

    if (Platform.OS === "ios") {
      return (
        <View style={{ marginBottom: 16 }}>
          <TouchableOpacity
            style={{
              borderWidth: 1, borderColor: isError ? '#f44336' : '#ccc', borderRadius: 6,
              backgroundColor: enabled ? '#fff' : '#f0f0f0', paddingVertical: 12, paddingHorizontal: 12,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}
            disabled={!enabled}
            onPress={() => { if (enabled) handleOpenPickerIOS(label, validOptions, onChange); }}
          >
            <Text style={{ flex: 1, color: value ? '#000' : '#999' }}>{displayText}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#666" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
          {isError && <Text style={{ marginTop: 4, color: '#f44336', fontSize: 12 }}>{isError}</Text>}
        </View>
      );
    }
    return (
      <View style={{ marginBottom: 16 }}>
        <View style={{ borderWidth: 1, borderColor: isError ? '#f44336' : '#ccc', borderRadius: 6, backgroundColor: enabled ? '#fff' : '#f0f0f0', height: 40, justifyContent: 'center' }}>
          <Picker selectedValue={value} onValueChange={(v) => { if (v && !v.includes("separator")) onChange(v); }} enabled={enabled} style={{ width: '100%', height: 100, color: '#000' }}>
            <Picker.Item label={placeholder} value="" color="#999" />
            {options.map((opt, i) => <Picker.Item key={opt.value || i} label={opt.label} value={opt.value} color={opt.isSeparator ? '#666' : '#000'} enabled={!opt.isSeparator} />)}
          </Picker>
        </View>
        {isError && <Text style={{ marginTop: 4, color: '#f44336', fontSize: 12 }}>{isError}</Text>}
      </View>
    );
  };

  const labelsCampos = { tipo_ruc: "Tipo de RUC / NIT", dni: "Documento de Identidad", certificado_inspeccion: "Certificado inspección", soat: "SOAT", antecedente_penales: "Antecedentes penales", licencia_conduccion: "Licencia de conducción", tarjeta_circulacion: "Tarjeta de circulación", tarjeta_identificacion: "Tarjeta identificación", revision_tecnica: "Revisión técnica", b2b: "Licencia BIIB / Conducción", licencia_categoria: "Licencia Categoría", permiso_municipal: "Permiso municipal", tarjeta_propiedad: "Tarjeta de propiedad", };
  const labelsCampos2 = { nombre_completo: "Nombre completo", numero_documento: "Número de documento", numero_telefono: "Número de teléfono", email: "Correo electrónico", fecha_nacimiento: "Fecha de nacimiento", placa: "Placa", marca_vehiculo: "Marca", color: "Color", linea: "Línea", establecimiento_nombre: "Nombre establecimiento", persona_natural: "Persona natural", global_categoria_id: 'Categoría' };
  const fechaInputStyle = { backgroundColor: "#fff", height: 40, borderRadius: 5, padding: 5, fontSize: 14, color: "#333", width: "30%", textAlign: 'center', fontFamily: "Montserrat-Regular" };

  // --- RENDER ---

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#F2F2F7', justifyContent: 'center' }}><ActivityIndicator color="#fa6205" size="large" /></View>;

  return (
    <KeyboardAvoidingView style={styles.keyboardAvoidingContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <Image source={require("../../assets/images/nuevo-icono.jpeg")} style={styles.logo} />
            <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>

            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputContainer}>
              <FontAwesome name="user-o" size={20} color="#333" style={styles.icon} />
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            </View>

            <Text style={styles.inputLabel}>Contraseña</Text>
            <View style={styles.inputContainer}>
              <FontAwesome name="lock" size={20} color="#333" style={styles.icon} />
              <TextInput
                ref={passwordRef} style={styles.input} placeholder="Contraseña" placeholderTextColor="#999" secureTextEntry={!passwordVisible}
                value={password} onChangeText={setPassword} onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
                <FontAwesome name={passwordVisible ? "eye-slash" : "eye"} size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.button, isLoading && styles.disabledButton]} onPress={handleLogin} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.buttonText}>INGRESAR</Text>}
            </TouchableOpacity>

            <View style={styles.forgotPasswordContainer}>
              <TouchableOpacity onPress={() => setForgotModalVisible(true)}>
                <Text style={{ color: "#fa6205", fontFamily: "Montserrat-Bold" }}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: "center", marginTop: 12 }}>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={{ color: "#1C1C1E", fontFamily: "Montserrat_600SemiBold", fontSize: 14 }}>
                  ¿No tienes cuenta? <Text style={{ color: "#fa6205", fontFamily: "Montserrat_800ExtraBold" }}>Regístrate</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* MODAL CORRECCIONES */}
            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
              <View style={styles.modalOverlay}>
                <View style={{ backgroundColor: "#FFFFFF", borderRadius: 10, padding: 20, width: "90%", maxHeight: "90%" }}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 10, color: '#1C1C1E' }}>Información adicional requerida</Text>
                    <Text style={{ color: '#1C1C1E', marginBottom: 15 }}>{textoObservacion}</Text>
                    {camposArchivos.map((campo) => (
                      <View key={campo} style={{ marginBottom: 20 }}>
                        <Text style={{ marginBottom: 5, color: '#1C1C1E' }}>{labelsCampos[campo] || campo.toUpperCase()}</Text>
                        <TouchableOpacity style={{ backgroundColor: "#007bff", padding: 12, borderRadius: 50, width: 50, height: 50, alignItems: "center", justifyContent: "center" }}
                          onPress={async () => {
                            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                            if (!perm.granted) return showAlert({ title: "Permiso", message: "Requerimos acceso a galería.", type: "info" });
                            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
                            if (!result.canceled) {
                              const f = result.assets[0];
                              setArchivos(prev => ({ ...prev, [campo]: { uri: f.uri, name: f.fileName || "img.jpg", type: f.type || "image/jpeg" } }));
                            }
                          }}
                        >
                          <FontAwesome name="camera" size={20} color="#1C1C1E" />
                        </TouchableOpacity>
                        {archivos[campo]?.uri && <Image source={{ uri: archivos[campo].uri }} style={{ width: 100, height: 100, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: '#ccc' }} />}
                      </View>
                    ))}
                    {camposTexto.map((campo) => (
                      <View key={campo} style={{ marginBottom: 20 }}>
                        <Text style={{ marginBottom: 5, color: '#1C1C1E' }}>{labelsCampos2[campo] || campo.toUpperCase()}</Text>
                        {campo === "fecha_nacimiento" ? (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <TextInput placeholder="AAAA" placeholderTextColor="#999" keyboardType="numeric" maxLength={4} style={fechaInputStyle} value={inputsFecha.año} onChangeText={(t) => setInputsFecha(p => ({ ...p, año: t }))} />
                            <TextInput placeholder="MM" placeholderTextColor="#999" keyboardType="numeric" maxLength={2} style={fechaInputStyle} value={inputsFecha.mes} onChangeText={(t) => setInputsFecha(p => ({ ...p, mes: t }))} />
                            <TextInput placeholder="DD" placeholderTextColor="#999" keyboardType="numeric" maxLength={2} style={fechaInputStyle} value={inputsFecha.dia} onChangeText={(t) => setInputsFecha(p => ({ ...p, dia: t }))} />
                          </View>
                        ) : campo === "global_categoria_id" ? (
                          renderPicker(inputsTexto[campo], "Seleccione categoría", "Seleccione categoría", categorias.map(c => ({ label: c.nombre, value: String(c.id) })), (v) => setInputsTexto(p => ({ ...p, [campo]: v })))
                        ) : (
                          <TextInput value={inputsTexto[campo] || ''} onChangeText={(t) => setInputsTexto(p => ({ ...p, [campo]: t }))} placeholder="Ingresa la corrección..." placeholderTextColor="#999" style={{ backgroundColor: "#fff", padding: 10, borderRadius: 6, borderWidth: 1, borderColor: "#ccc", color: "#000" }} multiline />
                        )}
                      </View>
                    ))}
                  </ScrollView>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20, gap: 10 }}>
                    <TouchableOpacity style={{ flex: 1, backgroundColor: "#e0e0e0", paddingVertical: 10, borderRadius: 6 }} onPress={() => setModalVisible(false)}><Text style={{ color: "#333", textAlign: "center" }}>Cancelar</Text></TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, backgroundColor: isLoading ? "#ccc" : "#fa6205", paddingVertical: 10, borderRadius: 6 }} onPress={isLoading ? null : enviarCorrecciones} disabled={isLoading}><Text style={{ textAlign: "center" }}>{isLoading ? "Enviando..." : "Enviar"}</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* MODAL RECUPERAR CONTRASEÑA */}
            <Modal animationType="fade" transparent={true} visible={forgotModalVisible} onRequestClose={() => setForgotModalVisible(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                  <View style={styles.modalIconContainer}>
                    <MaterialCommunityIcons name="email-lock" size={50} color="#fa6205" />
                  </View>

                  <Text style={styles.modalTitle}>Recuperar Contraseña</Text>
                  <Text style={styles.modalText}>
                    Ingresa tu correo electrónico y te enviaremos un código de verificación.
                  </Text>

                  <TextInput
                    style={styles.modalInput}
                    placeholder="ejemplo@correo.com"
                    placeholderTextColor="#888"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />

                  {forgotMessage ? (
                    <View style={{ backgroundColor: forgotMessage.startsWith("✔") ? 'rgba(250, 98, 5, 0.1)' : 'rgba(255, 111, 0, 0.1)', padding: 10, borderRadius: 8, marginBottom: 15, width: '100%' }}>
                      <Text style={{ color: forgotMessage.startsWith("✔") ? "#fa6205" : "#FF6F00", textAlign: "center", fontFamily: "Montserrat-Bold", fontSize: 13 }}>
                        {forgotMessage}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.modalButtonsContainer}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setForgotModalVisible(false)}>
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.confirmButton} onPress={solicitarResetPassword}>
                      {forgotLoading ? <ActivityIndicator color="#F2F2F7" size="small" /> : <Text style={styles.confirmButtonText}>Enviar Código</Text>}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={handleOpenResetModal} style={{ marginTop: 20, padding: 10 }}>
                    <Text style={{ color: '#1C1C1E', textAlign: 'center', fontSize: 14 }}>
                      ¿Ya tienes un código? <Text style={{ color: "#fa6205", fontFamily: "Montserrat-Bold" }}>Ingrésalo aquí</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* MODAL CAMBIAR CONTRASEÑA */}
            <Modal animationType="fade" transparent={true} visible={resetModalVisible} onRequestClose={() => setResetModalVisible(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                  <Text style={styles.modalTitle}>Establecer Nueva Contraseña</Text>
                  <Text style={styles.modalText}>Ingresa el código recibido y tu nueva clave.</Text>

                  {!resetEmailStorage && (
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Correo electrónico"
                      placeholderTextColor="#888"
                      value={resetEmailStorage}
                      onChangeText={setResetEmailStorage}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  )}

                  <TextInput
                    style={styles.modalInput}
                    placeholder="Código de 6 dígitos"
                    placeholderTextColor="#888"
                    value={resetToken}
                    onChangeText={setResetToken}
                    keyboardType="number-pad"
                    maxLength={6}
                  />

                  <TextInput
                    style={styles.modalInput}
                    placeholder="Nueva contraseña"
                    placeholderTextColor="#888"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />

                  <TextInput
                    style={styles.modalInput}
                    placeholder="Confirmar contraseña"
                    placeholderTextColor="#888"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />

                  {resetMessage ? (
                    <View style={{ backgroundColor: resetMessage.startsWith("✔") ? 'rgba(250, 98, 5, 0.1)' : 'rgba(255, 111, 0, 0.1)', padding: 10, borderRadius: 8, marginBottom: 15, width: '100%' }}>
                      <Text style={{ color: resetMessage.startsWith("✔") ? "#fa6205" : "#FF6F00", textAlign: "center", fontFamily: "Montserrat-Bold", fontSize: 13 }}>
                        {resetMessage}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.modalButtonsContainer}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setResetModalVisible(false)}>
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.confirmButton} onPress={confirmarResetPassword}>
                      {resetLoading ? <ActivityIndicator color="#F2F2F7" size="small" /> : <Text style={styles.confirmButtonText}>Actualizar</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {keyboardVisible && <View style={styles.extraSpace} />}
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingContainer: { flex: 1, backgroundColor: "#F2F2F7" },
  scrollContainer: { flexGrow: 1, justifyContent: "center", paddingVertical: 20 },
  container: { flex: 1, backgroundColor: "#F2F2F7", justifyContent: "center", alignItems: "center", paddingHorizontal: 20, minHeight: 550 },
  logo: { width: 100, height: 100, resizeMode: "contain", borderRadius: 20, marginBottom: 10 },

  // --- INPUTS LOGIN PRINCIPAL ---
  inputLabel: { alignSelf: "flex-start", fontSize: 14, fontFamily: "Montserrat-Regular", color: "#444", marginBottom: 8, marginLeft: 4 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    width: "100%",
    height: 55,
    backgroundColor: "#FFFFFF" // Fondo oscuro para inputs principales
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#1C1C1E',
    fontFamily: "Montserrat-Regular"
  },
  icon: { marginRight: 15, color: "#999" }, // Iconos gris claro

  // --- BOTONES ---
  button: { backgroundColor: "#fa6205", paddingVertical: 12, borderRadius: 12, marginTop: 10, width: "100%", alignItems: "center", height: 55, justifyContent: "center" },
  disabledButton: { opacity: 0.6 },
  buttonText: { color: "#F2F2F7", fontFamily: "Montserrat-Bold", fontSize: 16 },
  forgotPasswordContainer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },

  // --- HEADER ---
  subtitle: { textAlign: "center", marginBottom: 25, fontSize: 16, marginTop: 5, color: "#555", fontFamily: "Montserrat-Regular" },
  backButton: { position: 'absolute', top: 60, left: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  backButtonText: { color: '#1C1C1E', fontSize: 16, marginLeft: 8, fontFamily: "Montserrat-Bold" },

  // --- MODALES (ESTILOS MEJORADOS) ---
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContainer: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 25, width: "100%", maxWidth: 380, alignItems: "center", borderWidth: 1, borderColor: "#DDD" },
  modalIconContainer: { marginBottom: 15, backgroundColor: 'rgba(250, 98, 5, 0.1)', padding: 15, borderRadius: 50 },
  modalTitle: { fontSize: 20, fontFamily: "Montserrat-Bold", color: '#1C1C1E', marginBottom: 10, textAlign: "center" },
  modalText: { fontSize: 14, fontFamily: "Montserrat-Regular", color: "#CCC", marginBottom: 20, textAlign: "center", lineHeight: 20 },

  // ESTILO DE INPUT DENTRO DEL MODAL
  modalInput: {
    backgroundColor: "#F2F2F7", // Fondo más oscuro que el modal
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 12,
    color: '#1C1C1E', // Texto Blanco
    width: "100%",
    height: 50,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    fontFamily: "Montserrat-Regular"
  },

  modalButtonsContainer: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 10, gap: 12 },
  cancelButton: { backgroundColor: "#DDD", paddingVertical: 14, borderRadius: 12, flex: 1, alignItems: "center" },
  cancelButtonText: { color: '#1C1C1E', fontFamily: "Montserrat-Bold", fontSize: 15 },
  confirmButton: { backgroundColor: "#fa6205", paddingVertical: 14, borderRadius: 12, flex: 1, alignItems: "center" },
  confirmButtonText: { color: "#F2F2F7", fontFamily: "Montserrat-Bold", fontSize: 15 },

  extraSpace: { height: 30 },
});