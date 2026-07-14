import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Dimensions,
  ActivityIndicator
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useFonts, Montserrat_400Regular, Montserrat_700Bold } from "@expo-google-fonts/montserrat";
import * as ImagePicker from "expo-image-picker";
import DatePickerComponent from "../../components/DatePickerComponent";

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
    Taxi: [
      { id: "tarjeta_propiedad", label: "Tarjeta de propiedad", required: true },
      { id: "certificado_inspeccion", label: "Certif. inspección técnica", required: true },
      { id: "soat", label: "SOAT", required: true },
      { id: "antecedente_penales", label: "Antecedentes penales", required: true },
      { id: "licencia_conduccion", label: "Licencia conducción", required: true },
      { id: "tarjeta_circulacion", label: "Tarjeta Única circulación", required: true },
    ],
    Moto: [
      { id: "tarjeta_identificacion", label: "Tarjeta identificación", required: true },
      { id: "soat", label: "SOAT", required: true },
      // Etiqueta dinámica: BIIB (PE) vs Licencia Conducción (CO)
      { id: "b2b", label: pais === 'CO' ? "Licencia de Conducción" : "Licencia BIIB", required: true },
      // Etiqueta dinámica: DNI (PE) vs Cédula (CO)
      { id: "file_dni", label: pais === 'CO' ? "Cédula (CC) / Ext." : "DNI / Carnet", required: true },
      { id: "tarjeta_propiedad", label: "Tarjeta de propiedad", required: true },
    ],
    Mototaxis: [
      { id: "soat", label: "SOAT", required: true },
      { id: "licencia_categoria", label: pais === 'CO' ? "Licencia de Conducción" : "Licencia BIIC", required: true },
      { id: "permiso_municipal", label: "Permiso municipal", required: true },
      { id: "file_dni", label: pais === 'CO' ? "Cédula (CC) / Ext." : "DNI / Carnet", required: true },
      { id: "tarjeta_propiedad", label: "Tarjeta de propiedad", required: true },
    ],
  };

  const getFilteredDocs = () => {
    let categoryKey = "Taxi";
    if (formData.tipo_usuario === "rider.moto") categoryKey = "Moto";
    if (formData.tipo_usuario === "rider.mototaxi") categoryKey = "Mototaxis";

    const fields = camposPorCategoria[categoryKey] || [];

    return fields.filter(field => {
      // --- LÓGICA DE PERÚ (INTACTA) ---
      if (pais === 'PE' && (formData.tipo_usuario === "rider.moto" || formData.tipo_usuario === "rider.mototaxi")) {
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
      if (status !== 'granted') return Alert.alert('Permiso denegado', 'Necesitamos acceso a la galería.');

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
            Alert.alert("Selección requerida", "Por favor selecciona el país donde vas a trabajar.");
            return false;
        }
        return true;
    }

    if (step === 2) {
      if (!nombre_completo || !numero_documento || !numero_telefono || !email || !tipoDocumento || !fechaNacimiento) {
        Alert.alert("Faltan datos", "Completa todos los campos personales.");
        return false;
      }
    }
    if (step === 3) {
      if (!departamento || !ciudad || !direccion_residencia) {
        Alert.alert("Faltan datos", "Completa la ubicación.");
        return false;
      }
      if (!password || password.length < 9) {
        Alert.alert("Contraseña inválida", "Mínimo 9 caracteres.");
        return false;
      }
      if (password !== repeatPassword) {
        Alert.alert("Error", "Las contraseñas no coinciden.");
        return false;
      }
    }
    if (step === 4) {
      if (!placa || !marca_vehiculo || !linea || !color) {
        Alert.alert("Faltan datos", "Completa los datos del vehículo.");
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
      Alert.alert("Documentación Incompleta", "Por favor sube todas las fotos requeridas.");
      return;
    }

    // VALIDAR URL
    if(!pais || !COUNTRY_INFO[pais]) {
        Alert.alert("Error", "Configuración de país no válida.");
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
        Alert.alert("¡Registro Exitoso!", `Tu solicitud ha sido enviada a ${COUNTRY_INFO[pais].label}.`, [
          { text: "OK", onPress: () => navigation.navigate("Login") }
        ]);
      } else {
        let msg = data.message || "Error desconocido";
        if (data.errors) msg = Object.values(data.errors).flat().join("\n");
        Alert.alert("Error", msg);
      }

    } catch (error) {
      setIsLoading(false);
      Alert.alert("Error", "No se pudo conectar con el servidor.");
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F2F2F7" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>

        {/* HEADER */}
        <View style={styles.headerArea}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonHeader}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1C1C1E" />
          </TouchableOpacity>
          <Image source={require("../../assets/images/nuevo-icono.jpeg")} style={styles.logoSmall} />
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${(step / totalSteps) * 100}%` }]} />
          </View>
          <Text style={styles.stepText}>Paso {step} de {totalSteps}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* PASO 1: PAÍS Y ROL */}
          {step === 1 && (
            <View>
              <Text style={styles.title}>¿Cómo vas a trabajar?</Text>
              
              {/* SELECTOR DE PAÍS */}
              <View style={{ width: '100%', marginBottom: 15 }}>
                <Text style={styles.label}>País de Operación *</Text>
                <TouchableOpacity 
                    style={styles.inputDark} 
                    onPress={() => openPicker('pais', [
                        {label: 'Perú 🇵🇪', value: 'PE'},
                        {label: 'Colombia 🇨🇴', value: 'CO'}
                    ], "Selecciona País")}
                >
                    <Text style={[styles.inputText, !pais && { color: '#777' }]}>
                        {pais ? COUNTRY_INFO[pais].label : "Selecciona..."}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#fa6205" />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>Selecciona la categoría que mejor se adapte.</Text>

              <View style={styles.cardsList}>
                {[
                  { id: 'rider.moto', label: 'Motocicleta', desc: 'Delivery / Envíos', icon: 'motorbike' },
                  { id: 'rider.mototaxi', label: 'Mototaxi', desc: 'Pasajeros y Delivery', icon: 'rickshaw' },
                  { id: 'rider.taxi', label: 'Taxi', desc: 'Movilidad', icon: 'taxi' }
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
                        color={formData.tipo_usuario === item.id ? '#F2F2F7' : '#FFF'}
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
              <Text style={styles.title}>Datos Personales</Text>

              <Text style={styles.label}>Tipo de documento</Text>
              <TouchableOpacity style={styles.inputDark} onPress={() => openPicker('tipoDocumento', getDocumentOptions(), "Selecciona Documento")}>
                <Text style={[styles.inputText, !tipoDocumento && { color: '#777' }]}>{tipoDocumento || "Selecciona..."}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#fa6205" />
              </TouchableOpacity>

              <Text style={styles.label}>Número de documento</Text>
              <TextInput style={styles.inputDark} placeholder="Ej. 123456789" placeholderTextColor="#777" keyboardType="numeric" value={formData.numero_documento} onChangeText={(v) => handleInputChange('numero_documento', v)} />

              <Text style={styles.label}>Nombre completo</Text>
              <TextInput style={styles.inputDark} placeholder="Ej. Juan Pérez" placeholderTextColor="#777" value={formData.nombre_completo} onChangeText={(v) => handleInputChange('nombre_completo', v)} />

              <Text style={styles.label}>Fecha de nacimiento</Text>
              <TouchableOpacity style={styles.inputDark} onPress={() => setShowDateModal(true)}>
                <Text style={[styles.inputText, !fechaNacimiento && { color: '#777' }]}>
                  {fechaNacimiento || "Seleccionar fecha"}
                </Text>
                <MaterialCommunityIcons name="calendar-month" size={22} color="#fa6205" />
              </TouchableOpacity>

              <Text style={styles.label}>Teléfono</Text>
              <TextInput 
                style={styles.inputDark} 
                placeholder={pais ? COUNTRY_INFO[pais].phonePlaceholder : "Celular"} 
                placeholderTextColor="#777" 
                keyboardType="phone-pad" 
                value={formData.numero_telefono} 
                onChangeText={(v) => handleInputChange('numero_telefono', v)} 
              />

              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput style={styles.inputDark} placeholder="ejemplo@email.com" placeholderTextColor="#777" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(v) => handleInputChange('email', v)} />
            </View>
          )}

          {/* PASO 3: UBICACIÓN */}
          {step === 3 && (
            <View>
              <Text style={styles.title}>Ubicación y Seguridad</Text>

              <Text style={styles.label}>Departamento</Text>
              <TouchableOpacity style={styles.inputDark} onPress={() => openPicker('departamento', departamentos, "Selecciona Departamento")}>
                <Text style={[styles.inputText, !departamento && { color: '#777' }]}>{departamento || "Selecciona..."}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#fa6205" />
              </TouchableOpacity>

              <Text style={styles.label}>Ciudad/Provincia</Text>
              <TouchableOpacity style={[styles.inputDark, !departamento && { opacity: 0.5 }]} disabled={!departamento} onPress={() => openPicker('ciudad', ciudades, "Selecciona Ciudad")}>
                <Text style={[styles.inputText, !ciudad && { color: '#777' }]}>{ciudad || "Selecciona..."}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#fa6205" />
              </TouchableOpacity>

              {/* DISTRITO: SOLO SI HAY DATOS (PERÚ) */}
              {distritos.length > 0 && (
                <>
                  <Text style={styles.label}>Distrito</Text>
                  <TouchableOpacity style={styles.inputDark} onPress={() => openPicker('distrito', distritos, "Selecciona Distrito")}>
                    <Text style={[styles.inputText, !formData.distrito && { color: '#777' }]}>{formData.distrito || "Selecciona..."}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#fa6205" />
                  </TouchableOpacity>
                </>
              )}

              <Text style={styles.label}>Dirección de residencia</Text>
              <TextInput style={styles.inputDark} placeholder="Dirección completa" placeholderTextColor="#777" value={formData.direccion_residencia} onChangeText={(v) => handleInputChange('direccion_residencia', v)} />

              <View style={{ marginTop: 10 }}>
                <Text style={styles.label}>Código de Referido (Opcional)</Text>
                <TextInput style={styles.inputDark} placeholder="Si tienes uno, ingrésalo" placeholderTextColor="#777" value={formData.codigo_referido_padre} onChangeText={(v) => handleInputChange('codigo_referido_padre', v)} />
              </View>

              <Text style={[styles.title, { marginTop: 10, fontSize: 20 }]}>Seguridad</Text>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput style={styles.inputDark} placeholder="Mínimo 9 caracteres" placeholderTextColor="#777" secureTextEntry value={formData.password} onChangeText={(v) => handleInputChange('password', v)} />
              <Text style={styles.label}>Repetir Contraseña</Text>
              <TextInput style={styles.inputDark} placeholder="Confirma tu contraseña" placeholderTextColor="#777" secureTextEntry value={formData.repeatPassword} onChangeText={(v) => handleInputChange('repeatPassword', v)} />
            </View>
          )}

          {/* PASO 4: VEHÍCULO */}
          {step === 4 && (
            <View>
              <Text style={styles.title}>Datos del Vehículo</Text>
              <Text style={styles.label}>Placa</Text>
              <TextInput style={styles.inputDark} placeholder="ABC-123" placeholderTextColor="#777" autoCapitalize="characters" value={formData.placa} onChangeText={(v) => handleInputChange('placa', v.toUpperCase())} />
              <Text style={styles.label}>Marca</Text>
              <TextInput style={styles.inputDark} placeholder="Ej. Chevrolet" placeholderTextColor="#777" value={formData.marca_vehiculo} onChangeText={(v) => handleInputChange('marca_vehiculo', v)} />
              <Text style={styles.label}>Línea / Modelo</Text>
              <TextInput style={styles.inputDark} placeholder="Ej. Spark GT" placeholderTextColor="#777" value={formData.linea} onChangeText={(v) => handleInputChange('linea', v)} />
              <Text style={styles.label}>Color</Text>
              <TextInput style={styles.inputDark} placeholder="Ej. Negro" placeholderTextColor="#777" value={formData.color} onChangeText={(v) => handleInputChange('color', v)} />
            </View>
          )}

          {/* PASO 5: DOCUMENTACIÓN */}
          {step === 5 && (
            <View>
              {/* --- SECCIÓN 1: DOCUMENTACIÓN --- */}
              <Text style={styles.title}>Documentación</Text>
              <Text style={styles.subtitle}>
                Toca el cuadro para subir la foto.
              </Text>

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
                        <MaterialCommunityIcons name="plus" size={35} color="#fa6205" />
                        <Text style={styles.docLabel}>
                          {doc.label} {doc.required ? '*' : ''}
                        </Text>
                      </View>
                    )}
                    {images[doc.id] && (
                      <View style={styles.checkBadge}>
                        <MaterialCommunityIcons name="check" size={14} color="#000" />
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
                      <MaterialCommunityIcons name="qrcode-scan" size={40} color="#fa6205" />
                      <Text style={styles.docLabel}>Subir Imagen del QR</Text>
                    </View>
                  )}

                  {qrImage && (
                    <View style={styles.checkBadge}>
                      <MaterialCommunityIcons name="check" size={14} color="#000" />
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
            <TouchableOpacity style={[styles.buttonPrimary, step > 1 && { flex: 1 }]} onPress={step === totalSteps ? handleSubmit : handleNextStep}>
              <Text style={styles.buttonTextPrimary}>{step === totalSteps ? "Finalizar Registro" : "Siguiente"}</Text>
              {step < totalSteps && <MaterialCommunityIcons name="arrow-right" size={20} color="#F2F2F7" style={{ marginLeft: 8 }} />}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* MODAL DE LOADING */}
        <Modal transparent={true} visible={isLoading} animationType="fade">
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fa6205" />
              <Text style={styles.loadingText}>Procesando registro...</Text>
              <Text style={styles.loadingSubText}>Servidor: {pais === 'CO' ? 'Colombia' : 'Perú'}</Text>
            </View>
          </View>
        </Modal>

        {/* MODALES OTROS */}
        <Modal animationType="slide" transparent visible={showPickerModal} onRequestClose={() => setShowPickerModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{modalTitle}</Text>
                <TouchableOpacity onPress={() => setShowPickerModal(false)}><Text style={styles.modalCloseText}>Cerrar</Text></TouchableOpacity>
              </View>
              <FlatList data={pickerOptions} keyExtractor={(item, index) => index.toString()} renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => handlePickerSelect(item)}>
                  <Text style={styles.modalItemText}>{item.label}</Text>
                  {/* Check de seleccionado */}
                  {((pickerTarget === 'pais' && pais === item.value) || (pickerTarget === 'departamento' && departamento === item.value)) && 
                    <MaterialCommunityIcons name="check" size={20} color="#fa6205" />
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
                <DatePickerComponent fechaNacimiento={fechaNacimiento} setFechaNacimiento={setFechaNacimiento} />
              </View>
              <TouchableOpacity style={styles.buttonPrimary} onPress={() => setShowDateModal(false)}>
                <Text style={styles.buttonTextPrimary}>Confirmar Fecha</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 50 },
  headerArea: { paddingTop: 60, paddingHorizontal: 24, marginBottom: 20 },
  backButtonHeader: { marginBottom: 15, alignSelf: 'flex-start' },
  logoSmall: { width: 80, height: 80, resizeMode: "contain", alignSelf: "center", marginBottom: 20, borderRadius: 16 },

  // Progreso
  progressBarContainer: { height: 4, backgroundColor: "#333", borderRadius: 2, marginBottom: 8, width: '100%' },
  progressBarFill: { height: "100%", backgroundColor: "#fa6205", borderRadius: 2 },
  stepText: { color: "#777", fontSize: 12, fontFamily: "Montserrat_400Regular", textAlign: "right" },

  // Textos
  title: { fontSize: 26, fontFamily: "Montserrat_700Bold", color: '#1C1C1E', marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: "Montserrat_400Regular", color: "#A0A0A0", marginBottom: 25 },
  label: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: "#DDD", marginBottom: 8, marginLeft: 4 },

  // --- TARJETAS (LISTA) ---
  cardsList: { marginTop: 10, gap: 15 },
  cardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#444' },
  cardRowActive: { backgroundColor: '#fa6205', borderColor: '#fa6205' },
  iconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#3A3A3C', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  iconContainerActive: { backgroundColor: '#FFF' },
  cardTexts: { flex: 1 },
  cardTitle: { fontSize: 16, fontFamily: "Montserrat_700Bold", color: '#1C1C1E' },
  cardTitleActive: { color: "#F2F2F7" },
  cardDesc: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: "#AAA", marginTop: 2 },
  cardDescActive: { color: "#333" },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#666', alignItems: 'center', justifyContent: 'center' },
  radioOuterActive: { borderColor: '#F2F2F7' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#F2F2F7' },

  // Inputs Dark
  inputDark: { backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#DDD", paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: "Montserrat_400Regular", color: '#1C1C1E', marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputText: { fontSize: 16, fontFamily: "Montserrat_400Regular", color: '#1C1C1E' },

  // Grid Documentos
  docGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  docSquare: { width: '48%', aspectRatio: 1, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#666', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  docSquareDone: { borderStyle: 'solid', borderWidth: 2, borderColor: '#fa6205' },
  docPlaceholder: { alignItems: 'center', padding: 10 },
  docLabel: { color: '#999', fontSize: 12, fontFamily: 'Montserrat_400Regular', marginTop: 10, textAlign: 'center' },
  docImagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  checkBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fa6205', borderRadius: 10, padding: 4, zIndex: 2 },

  // Botones
  navButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  buttonPrimary: { backgroundColor: "#fa6205", borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, alignItems: "center", justifyContent: 'center', flexDirection: 'row' },
  buttonTextPrimary: { color: "#F2F2F7", fontFamily: "Montserrat_700Bold", fontSize: 16 },
  buttonSecondary: { paddingVertical: 15, paddingHorizontal: 20, alignItems: "center", marginRight: 10 },
  buttonTextSecondary: { color: '#1C1C1E', fontFamily: "Montserrat_700Bold", fontSize: 15 },

  // Modales
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#444' },
  modalTitle: { color: '#1C1C1E', fontSize: 18, fontFamily: "Montserrat_700Bold", marginBottom: 10 },
  modalCloseText: { color: '#fa6205', fontSize: 16, fontFamily: "Montserrat_700Bold" },
  modalItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#333', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { color: '#1C1C1E', fontSize: 16, fontFamily: "Montserrat_400Regular" },

  // Modal Fecha
  dateModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  dateModalContent: { width: '90%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, alignItems: 'center' },
  datePickerContainer: { backgroundColor: '#FFF', borderRadius: 10, padding: 10, width: '100%', alignItems: 'center', marginBottom: 20 },

  // ESTILOS PARA LOADING
  loadingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { backgroundColor: '#FFFFFF', padding: 25, borderRadius: 20, alignItems: 'center', width: '80%' },
  loadingText: { color: '#1C1C1E', fontSize: 18, fontFamily: "Montserrat_700Bold", marginTop: 20, marginBottom: 5 },
  loadingSubText: { color: '#AAA', fontSize: 14, fontFamily: "Montserrat_400Regular" }
});