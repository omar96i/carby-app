import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  StyleSheet,
  Image,
  ScrollView,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Dimensions,
  ActivityIndicator
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAlert } from "../../context/AlertContext";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useFonts, Montserrat_400Regular, Montserrat_700Bold } from "@expo-google-fonts/montserrat";
import * as ImagePicker from "expo-image-picker";
import SelectorFecha from "../../components/registro/SelectorFecha";
import { RegistroScreen, RegistroHeader, RegistroCard, CampoTexto, CampoSelector, registroStyles, C } from "../../components/registro/RegistroUI";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- IMPORTACIÓN DE DATOS GEOGRÁFICOS ---
import peruData from "../../BaseColombia/colombia.json"; 
import colombiaData from "../../BaseColombia/colombia_departamentos.json"; 

const { width } = Dimensions.get("window");

// 1. CONFIGURACIÓN POR PAÍS (solo info visual, misma API)
const API_URL = "https://back.carbycol.com/api/";
const COUNTRY_INFO = {
  PE: { label: "Perú 🇵🇪", currency: "PEN", phonePlaceholder: "Ej. 912 345 678" },
  CO: { label: "Colombia 🇨🇴", currency: "COP", phonePlaceholder: "Ej. 300 123 4567" }
};

export default function RegisterRiderScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const scrollRef = useRef(null);

  // --- ESTADOS ---
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  const [isLoading, setIsLoading] = useState(false);

  // --- NUEVO ESTADO: PAÍS ---
  const [pais, setPais] = useState("CO"); // 'PE' o 'CO'

  const [formData, setFormData] = useState({
    tipo_usuario: "rider.moto",
    nombre_completo: "",
    numero_documento: "",
    numero_telefono: "",
    email: "",
    direccion_residencia: "",
    password: "",
    repeatPassword: "",
    codigo_referido_padre: "",
    placa: "",
    marca_vehiculo: "",
    linea: "",
    color: "",
    distrito: "",
    pais: "" 
  });

  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [qrImage, setQrImage] = useState(null);

  const [departamentos, setDepartamentos] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [images, setImages] = useState({});
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [selectedVehicleTypeIds, setSelectedVehicleTypeIds] = useState([]);

  // UI States
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [pickerOptions, setPickerOptions] = useState([]);
  const [pickerTarget, setPickerTarget] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
  });

  // --- HANDLERS ---
  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- EFECTOS: CARGA DE DATOS ---
  useEffect(() => {
    const loadVehicleTypes = async () => {
      try {
        const res = await fetch(`${API_URL}vehicle-types`, { headers: { Accept: "application/json" } });
        const data = await res.json();
        if (data?.status && Array.isArray(data.vehicle_types)) {
          setVehicleTypes(data.vehicle_types.filter((t) => t.activo !== false));
        }
      } catch (e) {
        console.error("Error cargando tipos de vehículo:", e);
      }
    };
    loadVehicleTypes();
  }, []);

  const toggleVehicleType = (id) => {
    setSelectedVehicleTypeIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };
  useEffect(() => {
    if (!pais) {
        setDepartamentos([]);
        setCiudades([]);
        setDistritos([]);
        return;
    }

    // Cargar departamentos según el JSON correspondiente
    if (pais === 'PE') {
        const lista = peruData.map((item) => item.departamento);
        setDepartamentos(lista.map(d => ({ label: d, value: d })));
        setTipoDocumento("DNI"); // Default Perú
    } else if (pais === 'CO') {
        const lista = colombiaData.map((item) => item.departamento);
        setDepartamentos(lista.map(d => ({ label: d, value: d })));
        setTipoDocumento("CC"); // Default Colombia
    }

    // Resetear ubicación al cambiar país
    setDepartamento("");
    setCiudad("");
    setDistritos([]);
    handleInputChange("pais", pais);

  }, [pais]);

  // --- LÓGICA DE DOCUMENTOS (ADAPTADA) ---
  const camposPorCategoria = {
    Particular: [
      { id: "tarjeta_propiedad", label: "Tarjeta de propiedad", required: true },
      { id: "certificado_inspeccion", label: "Certif. inspección técnica", required: true },
      { id: "soat", label: "SOAT", required: true },
      { id: "antecedente_penales", label: "Antecedentes penales", required: true },
      { id: "licencia_conduccion", label: "Licencia conducción", required: true },
      { id: "tarjeta_circulacion", label: "Tarjeta Única circulación", required: true },
    ],
    Delivery: [
      { id: "tarjeta_identificacion", label: "Tarjeta identificación", required: true },
      { id: "soat", label: "SOAT", required: true },
      { id: "b2b", label: pais === 'CO' ? "Licencia de Conducción" : "Licencia BIIB", required: true },
      { id: "file_dni", label: pais === 'CO' ? "Cédula (CC) / Ext." : "DNI / Carnet", required: true },
      { id: "tarjeta_propiedad", label: "Tarjeta de propiedad", required: true },
    ],
  };

  const getFilteredDocs = () => {
    let categoryKey = "Particular";
    if (formData.tipo_usuario === "rider.moto") categoryKey = "Delivery";

    const fields = camposPorCategoria[categoryKey] || [];

    return fields.filter(field => {
      // --- LÓGICA DE PERÚ (INTACTA) ---
      if (pais === 'PE' && formData.tipo_usuario === "rider.moto") {
        if (departamento === "Lima") {
          // Ocultar dni y tarjeta de propiedad en Lima
          return field.id !== "file_dni" && field.id !== "tarjeta_propiedad";
        } else {
          // Mostrar SOLO dni y tarjeta de propiedad fuera de Lima (según tu lógica original)
          return field.id === "file_dni" || field.id === "tarjeta_propiedad";
        }
      }
      
      // --- LÓGICA DE COLOMBIA (MOSTRAR TODO) ---
      // En Colombia no hay excepción de Lima, así que se muestran todos los docs definidos en la lista.
      return true;
    });
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [step]);

  if (!fontsLoaded) return null;

  // --- HELPER: OPCIONES DE DOCUMENTO SEGÚN PAÍS ---
  const getDocumentOptions = () => {
    if (pais === 'CO') {
        return [
            { label: 'Cédula (CC)', value: 'CC' },
            { label: 'Cédula Extranjería (CE)', value: 'CE' },
            { label: 'Pasaporte', value: 'PAS' },
            { label: 'Permiso Especial (PEP)', value: 'PEP' }
        ];
    }
    // Default: PERÚ
    return [
        { label: "DNI", value: "DNI" },
        { label: "Carnet de Extranjería (CE)", value: "CE" },
        { label: "Pasaporte", value: "PAS" },
        { label: "Permiso Temporal (PTP)", value: "PTP" },
    ];
  };

  const handleDepartamentoChange = (val) => {
    setDepartamento(val);
    setCiudad("");
    setDistritos([]);
    handleInputChange("distrito", "");

    if (pais === 'PE') {
        const selectedData = peruData.find(d => d.departamento === val);
        setCiudades(selectedData ? selectedData.ciudades.map(c => ({ label: c.ciudad, value: c.ciudad })) : []);
    } else if (pais === 'CO') {
        const selectedData = colombiaData.find(d => d.departamento === val);
        if (selectedData && selectedData.ciudades) {
            setCiudades(selectedData.ciudades.map(c => ({ label: c, value: c })));
        } else {
            setCiudades([]);
        }
    }
  };

  const handleCiudadChange = (val) => {
    setCiudad(val);
    
    if (pais === 'PE') {
        const deptoData = peruData.find(d => d.departamento === departamento);
        const cityData = deptoData?.ciudades.find(c => c.ciudad === val);
        setDistritos(cityData?.distritos ? cityData.distritos.map(d => ({ label: d, value: d })) : []);
    } else {
        setDistritos([]);
    }
  };

  const handlePickQr = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9], 
      quality: 0.7,
    });

    if (!result.canceled) {
      setQrImage(result.assets[0]);
    }
  };

  const handleImagePick = async (fieldId) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return showAlert({ title: 'Permiso denegado', message: 'Necesitamos acceso a la galería.', type: 'error' });

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        aspect: [4, 3],
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const fileName = asset.uri.split('/').pop();
        const type = fileName.endsWith('png') ? 'image/png' : 'image/jpeg';
        setImages(prev => ({ ...prev, [fieldId]: { uri: asset.uri, name: fileName, type, fileName } }));
      }
    } catch (e) { console.error(e); }
  };

  // --- VALIDACIÓN ---
  const validateStep = () => {
    const { nombre_completo, numero_documento, numero_telefono, email, password, repeatPassword, placa, marca_vehiculo, linea, color, direccion_residencia } = formData;

    if (step === 1) {
        if(!pais) {
            showAlert({ title: "Selección requerida", message: "Por favor selecciona el país donde vas a trabajar.", type: "error" });
            return false;
        }
        return true;
    }

    if (step === 2) {
      if (!nombre_completo || !numero_documento || !numero_telefono || !email || !tipoDocumento || !fechaNacimiento) {
        showAlert({ title: "Faltan datos", message: "Completa todos los campos personales.", type: "error" });
        return false;
      }
      if (nombre_completo.length < 3) {
        showAlert({ title: "Nombre inválido", message: "El nombre debe tener al menos 3 caracteres.", type: "error" });
        return false;
      }
      if (numero_documento.length < 5) {
        showAlert({ title: "Documento inválido", message: "El número de documento debe tener al menos 5 dígitos.", type: "error" });
        return false;
      }
      if (numero_telefono.length < 7) {
        showAlert({ title: "Teléfono inválido", message: "El número de teléfono no es válido.", type: "error" });
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showAlert({ title: "Email inválido", message: "Ingresa un correo electrónico válido.", type: "error" });
        return false;
      }
    }
    if (step === 3) {
      if (!departamento || !ciudad || !direccion_residencia) {
        showAlert({ title: "Faltan datos", message: "Completa la ubicación.", type: "error" });
        return false;
      }
      if (!password || password.length < 9) {
        showAlert({ title: "Contraseña inválida", message: "Mínimo 9 caracteres.", type: "error" });
        return false;
      }
      if (password !== repeatPassword) {
        showAlert({ title: "Error", message: "Las contraseñas no coinciden.", type: "error" });
        return false;
      }
    }
    if (step === 4) {
      if (!placa || !marca_vehiculo || !linea || !color) {
        showAlert({ title: "Faltan datos", message: "Completa los datos del vehículo.", type: "error" });
        return false;
      }
      if (placa.length < 5) {
        showAlert({ title: "Placa inválida", message: "La placa debe tener al menos 5 caracteres.", type: "error" });
        return false;
      }
      if (vehicleTypes.length > 0 && selectedVehicleTypeIds.length === 0) {
        showAlert({ title: "Tipo de vehículo", message: "Elige al menos un tipo de vehículo al que puedes prestar servicio.", type: "error" });
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep() && step < totalSteps) setStep(step + 1);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };


  const handleSubmit = async () => {
    const docsRequeridos = getFilteredDocs();
    const faltantes = docsRequeridos.filter(f => f.required && !images[f.id]);

    if (faltantes.length > 0) {
      showAlert({ title: "Documentación Incompleta", message: "Por favor sube todas las fotos requeridas.", type: "error" });
      return;
    }

    // VALIDAR URL
    if(!pais || !COUNTRY_INFO[pais]) {
        showAlert({ title: "Error", message: "Configuración de país no válida.", type: "error" });
        return;
    }
    
    const currentBaseUrl = API_URL;
    setIsLoading(true);

    try {
      const dataToSend = new FormData();
      Object.keys(formData).forEach(key => dataToSend.append(key, formData[key]));
      
      // Datos adicionales
      dataToSend.append("pais", pais);
      dataToSend.append("tipo_documento", tipoDocumento);
      dataToSend.append("fecha_nacimiento", fechaNacimiento);
      dataToSend.append("departamento", departamento);
      dataToSend.append("ciudad", ciudad);
      dataToSend.append("distrito", formData.distrito);
      selectedVehicleTypeIds.forEach((id) => dataToSend.append("vehicle_type_ids[]", String(id)));

      Object.keys(images).forEach(key => {
        if (images[key]) {
          dataToSend.append(key, {
            uri: images[key].uri,
            name: images[key].name,
            type: images[key].type
          });
        }
      });

      if (qrImage && qrImage.uri) {
        dataToSend.append("qr_image", {
          uri: qrImage.uri,
          name: qrImage.fileName || qrImage.name || "qr_code.jpg",
          type: qrImage.mimeType || qrImage.type || "image/jpeg"
        });
      }
      
      console.log("Enviando a:", `${currentBaseUrl}usuario/crear`);

      const response = await fetch(`${currentBaseUrl}usuario/crear`, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data", "Accept": "application/json" },
        body: dataToSend
      });

      const textResponse = await response.text();
      console.log("=== RESPUESTA CRUDA DEL SERVIDOR (Domiciliario) ===");
      console.log("Status:", response.status);
      console.log("Headers:", JSON.stringify(response.headers, null, 2));
      console.log("Body:", textResponse.substring(0, 500));
      console.log("==================================================");

      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error("JSON parse error:", parseError.message);
        console.error("Respuesta no es JSON. Body completo:", textResponse);
        throw new Error(`El servidor respondió con HTML/error (status ${response.status})`);
      }
      setIsLoading(false);

      if (response.ok || data?.message?.toLowerCase().includes("creado correctamente")) {
        showAlert({ title: "Registro Exitoso", message: `Tu solicitud ha sido enviada a ${COUNTRY_INFO[pais].label}.`, type: "success", confirmText: "Ir al Login", onConfirm: () => navigation.navigate("Login") });
      } else {
        let msg = data.message || "Error desconocido";
        if (data.errors) msg = Object.values(data.errors).flat().join("\n");
        showAlert({ title: "Error", message: msg, type: "error" });
      }

    } catch (error) {
      setIsLoading(false);
      showAlert({ title: "Error", message: "No se pudo conectar con el servidor.", type: "error" });
      console.error(error);
    }
  };

  // --- HELPERS UI ---
  const openPicker = (target, options, title) => {
    setPickerTarget(target);
    setPickerOptions(options);
    setModalTitle(title);
    setShowPickerModal(true);
  };

  const handlePickerSelect = (item) => {
    const val = item.value;
    if (pickerTarget === 'pais') setPais(val);
    if (pickerTarget === 'tipoDocumento') setTipoDocumento(val);
    if (pickerTarget === 'departamento') handleDepartamentoChange(val);
    if (pickerTarget === 'ciudad') handleCiudadChange(val);
    if (pickerTarget === 'distrito') handleInputChange('distrito', val);
    setShowPickerModal(false);
  };

  const TITULOS = { 1: "¿Cómo vas a trabajar?", 2: "Datos Personales", 3: "Ubicación y Seguridad", 4: "Datos del Vehículo", 5: "Documentación" };
  const SUBTITULOS = { 1: "Selecciona la categoría que mejor se adapte.", 5: "Toca el cuadro para subir la foto." };

  return (
    <RegistroScreen>
      <View style={styles.container}>

        <RegistroHeader step={step} totalSteps={totalSteps} onBack={() => navigation.goBack()} title={TITULOS[step]} subtitle={SUBTITULOS[step]} />

        <RegistroCard>
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* PASO 1: PAÍS Y ROL */}
          {step === 1 && (
             <View>
               
               {/* SELECTOR DE PAÍS - Oculto, siempre Colombia */}
               

              <View style={styles.cardsList}>
                {[
                  { id: 'rider.moto', label: 'Delivery', desc: 'Envíos y mensajería', icon: 'motorbike' },
                  { id: 'rider.taxi', label: 'Particular', desc: 'Transporte de pasajeros', icon: 'taxi' }
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.cardRow, formData.tipo_usuario === item.id && styles.cardRowActive]}
                    onPress={() => handleInputChange('tipo_usuario', item.id)}
                  >
                    <View style={[styles.iconContainer, formData.tipo_usuario === item.id && styles.iconContainerActive]}>
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={30}
                        color={formData.tipo_usuario === item.id ? C.surface : C.brand}
                      />
                    </View>
                    <View style={styles.cardTexts}>
                      <Text style={[styles.cardTitle, formData.tipo_usuario === item.id && styles.cardTitleActive]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.cardDesc, formData.tipo_usuario === item.id && styles.cardDescActive]}>
                        {item.desc}
                      </Text>
                    </View>
                    <View style={[styles.radioOuter, formData.tipo_usuario === item.id && styles.radioOuterActive]}>
                      {formData.tipo_usuario === item.id && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* PASO 2: DATOS PERSONALES */}
          {step === 2 && (
            <View>

              <Text style={styles.label}>Tipo de documento</Text>
              <CampoSelector
                icon="card-account-details"
                value={getDocumentOptions().find((o) => o.value === tipoDocumento)?.label || tipoDocumento}
                placeholder="Selecciona..."
                active={showPickerModal && pickerTarget === 'tipoDocumento'}
                onPress={() => openPicker('tipoDocumento', getDocumentOptions(), "Selecciona Documento")}
              />

              <Text style={styles.label}>Número de documento</Text>
              <CampoTexto icon="numeric" placeholder="Ej. 123456789" keyboardType="numeric" value={formData.numero_documento} onChangeText={(v) => handleInputChange('numero_documento', v)} maxLength={10} />

              <Text style={styles.label}>Nombre completo</Text>
              <CampoTexto icon="account" placeholder="Ej. Juan Pérez" value={formData.nombre_completo} onChangeText={(v) => handleInputChange('nombre_completo', v)} maxLength={50} />

              <Text style={styles.label}>Fecha de nacimiento</Text>
              <CampoSelector
                icon="cake-variant"
                value={fechaNacimiento}
                placeholder="Seleccionar fecha"
                trailingIcon="calendar-month"
                active={showDateModal}
                onPress={() => setShowDateModal(true)}
              />

              <Text style={styles.label}>Teléfono</Text>
              <CampoTexto
                icon="phone"
                placeholder={pais ? COUNTRY_INFO[pais].phonePlaceholder : "Celular"}
                keyboardType="phone-pad" 
                value={formData.numero_telefono} 
                onChangeText={(v) => handleInputChange('numero_telefono', v)} 
                maxLength={10}
              />

              <Text style={styles.label}>Correo electrónico</Text>
              <CampoTexto icon="email" placeholder="ejemplo@email.com" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(v) => handleInputChange('email', v)} maxLength={50} />
            </View>
          )}

          {/* PASO 3: UBICACIÓN */}
          {step === 3 && (
            <View>

              <Text style={styles.label}>Departamento</Text>
              <CampoSelector
                icon="map"
                value={departamento}
                placeholder="Selecciona..."
                active={showPickerModal && pickerTarget === 'departamento'}
                onPress={() => openPicker('departamento', departamentos, "Selecciona Departamento")}
              />

              <Text style={styles.label}>Ciudad/Provincia</Text>
              <CampoSelector
                icon="city-variant"
                value={ciudad}
                placeholder="Selecciona..."
                disabled={!departamento}
                active={showPickerModal && pickerTarget === 'ciudad'}
                onPress={() => openPicker('ciudad', ciudades, "Selecciona Ciudad")}
              />

              {/* DISTRITO: SOLO SI HAY DATOS (PERÚ) */}
              {distritos.length > 0 && (
                <>
                  <Text style={styles.label}>Distrito</Text>
                  <CampoSelector
                    icon="map-marker-radius"
                    value={formData.distrito}
                    placeholder="Selecciona..."
                    active={showPickerModal && pickerTarget === 'distrito'}
                    onPress={() => openPicker('distrito', distritos, "Selecciona Distrito")}
                  />
                </>
              )}

              <Text style={styles.label}>Dirección de residencia</Text>
              <CampoTexto icon="home-map-marker" placeholder="Dirección completa" value={formData.direccion_residencia} onChangeText={(v) => handleInputChange('direccion_residencia', v)} maxLength={80} />

              <View style={{ marginTop: 10 }}>
                <Text style={styles.label}>Código de Referido (Opcional)</Text>
                <CampoTexto icon="ticket-percent" placeholder="Si tienes uno, ingrésalo" value={formData.codigo_referido_padre} onChangeText={(v) => handleInputChange('codigo_referido_padre', v)} maxLength={20} />
              </View>

              <Text style={[styles.title, { marginTop: 10, fontSize: 20 }]}>Seguridad</Text>
              <Text style={styles.label}>Contraseña</Text>
              <CampoTexto icon="lock" placeholder="Mínimo 9 caracteres" secureTextEntry value={formData.password} onChangeText={(v) => handleInputChange('password', v)} maxLength={30} />
              <Text style={styles.label}>Repetir Contraseña</Text>
              <CampoTexto icon="lock-check" placeholder="Confirma tu contraseña" secureTextEntry value={formData.repeatPassword} onChangeText={(v) => handleInputChange('repeatPassword', v)} maxLength={30} />
            </View>
          )}

          {/* PASO 4: VEHÍCULO */}
          {step === 4 && (
            <View>
              {vehicleTypes.length > 0 && (
                <>
                  <Text style={styles.label}>Tipos a los que puedes prestar servicio</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                    {vehicleTypes.map((vt) => {
                      const active = selectedVehicleTypeIds.includes(vt.id);
                      return (
                        <TouchableOpacity
                          key={vt.id}
                          onPress={() => toggleVehicleType(vt.id)}
                          style={{
                            paddingVertical: 11,
                            paddingHorizontal: 16,
                            borderRadius: 999,
                            borderWidth: 1.5,
                            borderColor: active ? C.brand : C.edge,
                            backgroundColor: active ? C.brand : C.surface,
                          }}
                        >
                          <Text style={{ color: active ? C.surface : C.ink, fontFamily: 'Montserrat_700Bold', fontSize: 13 }}>
                            {vt.nombre}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
              <Text style={styles.label}>Placa</Text>
              <CampoTexto icon="card-text-outline" placeholder="ABC-123" maxLength={7} autoCapitalize="characters" value={formData.placa} onChangeText={(v) => handleInputChange('placa', v.toUpperCase())} />
              <Text style={styles.label}>Marca</Text>
              <CampoTexto icon="car" placeholder="Ej. Chevrolet" value={formData.marca_vehiculo} onChangeText={(v) => handleInputChange('marca_vehiculo', v)} maxLength={30} />
              <Text style={styles.label}>Línea / Modelo</Text>
              <CampoTexto icon="car-side" placeholder="Ej. Spark GT" value={formData.linea} onChangeText={(v) => handleInputChange('linea', v)} maxLength={30} />
              <Text style={styles.label}>Color</Text>
              <CampoTexto icon="palette" placeholder="Ej. Negro" value={formData.color} onChangeText={(v) => handleInputChange('color', v)} maxLength={20} />
            </View>
          )}

          {/* PASO 5: DOCUMENTACIÓN */}
          {step === 5 && (
            <View>
              {/* --- SECCIÓN 1: DOCUMENTACIÓN --- */}
              <View style={styles.docGrid}>
                {getFilteredDocs().map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={[styles.docSquare, images[doc.id] ? styles.docSquareDone : null]}
                    onPress={() => handleImagePick(doc.id)}
                  >
                    {images[doc.id] ? (
                      <Image source={{ uri: images[doc.id].uri }} style={styles.docImagePreview} />
                    ) : (
                      <View style={styles.docPlaceholder}>
                        <View style={styles.docIcon}><MaterialCommunityIcons name="camera-plus" size={24} color={C.brand} /></View>
                        <Text style={styles.docLabel}>
                          {doc.label} {doc.required ? '*' : ''}
                        </Text>
                      </View>
                    )}
                    {images[doc.id] && (
                      <View style={styles.checkBadge}>
                        <MaterialCommunityIcons name="check" size={14} color={C.surface} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* --- SECCIÓN 2: MÉTODO DE PAGO (QR Code) --- */}
              <View style={{ marginTop: 25 }}>
                <Text style={styles.title}>Método de Pago</Text>
                <Text style={styles.subtitle}>
                  Sube tu código QR (Nequi) para pagos.
                </Text>

                <TouchableOpacity
                  style={[
                    styles.docSquare,
                    { width: '100%', aspectRatio: 16 / 9 },
                    qrImage ? styles.docSquareDone : null
                  ]}
                  onPress={handlePickQr}
                >
                  {qrImage ? (
                    <Image source={{ uri: qrImage.uri }} style={styles.docImagePreview} />
                  ) : (
                    <View style={styles.docPlaceholder}>
                      <View style={styles.docIcon}><MaterialCommunityIcons name="qrcode-scan" size={24} color={C.brand} /></View>
                      <Text style={styles.docLabel}>Subir Imagen del QR</Text>
                    </View>
                  )}

                  {qrImage && (
                    <View style={styles.checkBadge}>
                      <MaterialCommunityIcons name="check" size={14} color={C.surface} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

            </View>
          )}

          {/* BOTONES DE NAVEGACIÓN */}
          <View style={styles.navButtons}>
            {step > 1 && (
              <TouchableOpacity style={styles.buttonSecondary} onPress={handlePrevStep}>
                <Text style={styles.buttonTextSecondary}>Atrás</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.buttonPrimary, { flex: 1 }]} activeOpacity={0.8} onPress={step === totalSteps ? handleSubmit : handleNextStep}>
              <Text style={styles.buttonTextPrimary}>{step === totalSteps ? "Finalizar Registro" : "Siguiente"}</Text>
              {step < totalSteps && <MaterialCommunityIcons name="arrow-right" size={20} color={C.surface} style={{ marginLeft: 8 }} />}
            </TouchableOpacity>
          </View>
        </ScrollView>
        </RegistroCard>

        {/* MODAL DE LOADING */}
        <Modal transparent={true} visible={isLoading} animationType="fade">
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={C.brand} />
              <Text style={styles.loadingText}>Procesando registro...</Text>
              <Text style={styles.loadingSubText}>Servidor: {pais === 'CO' ? 'Colombia' : 'Perú'}</Text>
            </View>
          </View>
        </Modal>

        {/* MODALES OTROS */}
        <Modal animationType="slide" transparent visible={showPickerModal} onRequestClose={() => setShowPickerModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.grabber} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{modalTitle}</Text>
                <TouchableOpacity onPress={() => setShowPickerModal(false)}><Text style={styles.modalCloseText}>Cerrar</Text></TouchableOpacity>
              </View>
              <FlatList data={pickerOptions} keyExtractor={(item, index) => index.toString()} renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} activeOpacity={0.8} onPress={() => handlePickerSelect(item)}>
                  <Text style={styles.modalItemText}>{item.label}</Text>
                  {/* Check de seleccionado */}
                  {((pickerTarget === 'pais' && pais === item.value) || (pickerTarget === 'departamento' && departamento === item.value)) && 
                    <MaterialCommunityIcons name="check-circle" size={22} color={C.brand} />
                  }
                </TouchableOpacity>
              )} />
            </View>
          </View>
        </Modal>

        <Modal animationType="fade" transparent visible={showDateModal} onRequestClose={() => setShowDateModal(false)}>
          <View style={styles.dateModalOverlay}>
            <View style={styles.dateModalContent}>
              <Text style={styles.modalTitle}>Fecha de Nacimiento</Text>
              <View style={styles.datePickerContainer}>
                <SelectorFecha fechaNacimiento={fechaNacimiento} setFechaNacimiento={setFechaNacimiento} />
              </View>
              <TouchableOpacity style={styles.buttonPrimary} onPress={() => setShowDateModal(false)}>
                <Text style={styles.buttonTextPrimary}>Confirmar Fecha</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    </RegistroScreen>
  );
}

const styles = {
  ...registroStyles,
  ...StyleSheet.create({
    container: { flex: 1 },

    // --- TARJETAS (LISTA) ---
    cardsList: { marginTop: 4, gap: 12 },
    cardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 24, padding: 16, borderWidth: 1.5, borderColor: C.edge },
    cardRowActive: { backgroundColor: C.iconBg, borderColor: C.brand },
    iconContainer: { width: 52, height: 52, borderRadius: 999, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    iconContainerActive: { backgroundColor: C.brand },
    cardTitle: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
    cardTitleActive: { color: C.ink },
    cardDesc: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 2 },
    cardDescActive: { color: C.ink },
    radioOuter: { width: 24, height: 24, borderRadius: 999, borderWidth: 2, borderColor: C.edge, alignItems: 'center', justifyContent: 'center' },
    radioOuterActive: { borderColor: C.brand, backgroundColor: C.brand },
    radioInner: { width: 10, height: 10, borderRadius: 999, backgroundColor: C.surface },
    cardTexts: { flex: 1, marginLeft: 0 },

    // Botones
    navButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 16 },
  }),
};
