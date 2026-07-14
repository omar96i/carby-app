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
  ActivityIndicator,
  Dimensions
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold } from "@expo-google-fonts/montserrat";
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

export default function RegisterStoreScreen() {
  const navigation = useNavigation();

  // --- ESTADOS DE UI Y NAVEGACIÓN ---
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false); // Modal Referido

  // Estados para Modales Personalizados (Pickers y Fecha)
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [pickerOptions, setPickerOptions] = useState([]);
  const [pickerTarget, setPickerTarget] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  // --- ESTADO: PAÍS ---
  const [pais, setPais] = useState("CO"); // 'PE' o 'CO'

  // --- ESTADOS DE DATOS ---
  const [departamentos, setDepartamentos] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [images, setImages] = useState({});
  const [codigoReferido, setCodigoReferido] = useState("");
  const [errors, setErrors] = useState({});
  const [qrImage, setQrImage] = useState(null);

  const [formData, setFormData] = useState({
    numero_documento: "",
    nombre_completo: "",
    email: "",
    password: "",
    repeatPassword: "",
    tipo_documento: "DNI",
    fecha_nacimiento: "",
    numero_telefono: "",
    departamento: "",
    ciudad: "",
    tipo_usuario: "comercio",
    establecimiento_nombre: "",
    persona_natural: "",
    global_categoria_id: "",
    distrito: "",
    direccion: "",
    pais: "" 
  });

  // --- TUS 2 DOCUMENTOS OBLIGATORIOS (AHORA DINÁMICOS) ---
  const imageFields = [
    { 
        id: "tipo_ruc", 
        // Si es Colombia pide RUT/NIT, si es Perú pide RUC
        label: pais === 'CO' ? "Adjuntar RUT / NIT" : "Tipo de RUC 10/15/20", 
        required: true 
    },
    { 
        id: "dni", 
        // Si es Colombia pide Cédula, si es Perú pide DNI
        label: pais === 'CO' ? "Adjuntar Cédula (CC) / Ext." : "Adjuntar DNI / Carnet Ext.", 
        required: true 
    },
  ];

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  // --- EFECTOS: CARGA DE DATOS Y CONFIGURACIÓN ---
  useEffect(() => {
    if (!pais) {
        setDepartamentos([]);
        setCategorias([]);
        setCiudades([]);
        setDistritos([]);
        return;
    }

    // 1. Cargar Geografía
    if (pais === 'PE') {
        const lista = peruData.map((item) => item.departamento);
        setDepartamentos(lista.map(d => ({ label: d, value: d })));
        // Resetear tipo de doc por defecto a DNI
        handleInputChange("tipo_documento", "DNI");
    } else if (pais === 'CO') {
        const lista = colombiaData.map((item) => item.departamento);
        setDepartamentos(lista.map(d => ({ label: d, value: d })));
        // Resetear tipo de doc por defecto a CC
        handleInputChange("tipo_documento", "CC");
    }

    // 2. Cargar Categorías
    const currentUrl = API_URL;
    fetchCategorias(currentUrl);

    // 3. Actualizar formData y limpiar ubicación
    handleInputChange("pais", pais);
    handleInputChange("departamento", "");
    handleInputChange("ciudad", "");
    handleInputChange("distrito", "");

  }, [pais]);

  const fetchCategorias = async (baseUrl) => {
    try {
      const response = await fetch(baseUrl + "global-categorias/get/obtener", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (response.ok) {
        const responseData = await response.json();
        if (responseData && responseData.data && Array.isArray(responseData.data)) {
          const cats = responseData.data.map(c => ({
            label: c.nombre,
            value: String(c.id),
            isSeparator: false
          }));
          setCategorias(cats);
        }
      }
    } catch (error) {
      console.error("Error cargando categorías:", error);
    }
  };

  if (!fontsLoaded) return null;

  // --- HANDLERS ---
  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // --- HELPER: OPCIONES DE DOCUMENTO SEGÚN PAÍS ---
  const getDocumentOptions = () => {
    if (pais === 'CO') {
        return [
            { label: 'Cédula (CC)', value: 'CC' }, // <--- AÑADIDO CC
            { label: 'NIT / RUT', value: 'NIT' },
            { label: 'Carnet Ext.', value: 'CE' },
            { label: 'Pasaporte', value: 'PAS' }
        ];
    }
    // Default: PERÚ
    return [
        { label: 'DNI', value: 'DNI' },
        { label: 'RUC', value: 'NIT' }, 
        { label: 'Carnet Ext.', value: 'CE' },
        { label: 'Pasaporte', value: 'PAS' }
    ];
  };

  // --- LÓGICA DEPARTAMENTOS ---
  const handleDepartamentoChange = (val) => {
    handleInputChange("departamento", val);
    handleInputChange("ciudad", "");
    handleInputChange("distrito", "");
    setDistritos([]);

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
    handleInputChange("ciudad", val);
    handleInputChange("distrito", "");

    if (pais === 'PE') {
        if (val && formData.departamento) {
            const deptoSeleccionado = peruData.find(d => d.departamento === formData.departamento);
            if (deptoSeleccionado) {
                const ciudadSeleccionada = deptoSeleccionado.ciudades.find(c => c.ciudad === val);
                if (ciudadSeleccionada && ciudadSeleccionada.distritos) {
                    setDistritos(ciudadSeleccionada.distritos.map(d => ({ label: d, value: d })));
                } else {
                    setDistritos([]);
                }
            }
        }
    } else {
        setDistritos([]); 
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
        if (errors[fieldId]) setErrors(prev => ({ ...prev, [fieldId]: null }));
      }
    } catch (e) { console.error(e); }
  };

  const handlePickQr = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setQrImage(result.assets[0]);
    }
  };

  // --- VALIDACIÓN POR PASOS ---
  const validateStep = () => {
    const d = formData;
    if (step === 1) {
        if(!pais) {
            Alert.alert("Selección requerida", "Por favor selecciona el país donde operará tu negocio.");
            return false;
        }
        return true;
    }

    if (step === 2) { // Datos Negocio
      if (!d.establecimiento_nombre || !d.global_categoria_id) {
        Alert.alert("Faltan datos", "Completa el nombre del establecimiento y la categoría.");
        return false;
      }
    }
    if (step === 3) { // Ubicación
      if (!d.departamento || !d.ciudad || !d.direccion) {
        Alert.alert("Faltan datos", "Completa la ubicación.");
        return false;
      }
    }
    if (step === 4) { // Contacto y Representante
      if (!d.persona_natural || !d.tipo_documento || !d.numero_documento || !d.numero_telefono || !d.email || !d.fecha_nacimiento) {
        Alert.alert("Faltan datos", "Completa los datos del representante legal.");
        return false;
      }
      if (!d.password || d.password.length < 9) {
        Alert.alert("Contraseña", "Mínimo 9 caracteres.");
        return false;
      }
      if (d.password !== d.repeatPassword) {
        Alert.alert("Error", "Las contraseñas no coinciden.");
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => { if (validateStep() && step < totalSteps) setStep(step + 1); };
  const handlePrevStep = () => { if (step > 1) setStep(step - 1); };

  // --- PROCESO FINAL ---
  const handlePreRegister = () => {
    let validImages = true;
    imageFields.forEach(f => {
      if (f.required && !images[f.id]) validImages = false;
    });

    if (!validImages) {
      Alert.alert("Documentación", "Por favor sube las 2 fotos requeridas.");
      return;
    }
    setModalVisible(true);
  };

  const finalizarRegistro = async () => {
    setModalVisible(false);
    
    if(!pais || !COUNTRY_INFO[pais]) {
        Alert.alert("Error", "Configuración de país no válida.");
        return;
    }
    
    const currentBaseUrl = API_URL;
    setIsLoading(true);

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => formDataToSend.append(key, value || ""));
      formDataToSend.append("codigo_referido_padre", codigoReferido || "");
      formDataToSend.append("pais", pais);

      Object.entries(images).forEach(([key, file]) => {
        if (file && file.uri) {
          formDataToSend.append(key, { uri: file.uri, name: file.name, type: file.type });
        }
      });

      if (qrImage && qrImage.uri) {
        formDataToSend.append("qr_image", {
          uri: qrImage.uri,
          name: qrImage.fileName || qrImage.name || "qr_code.jpg",
          type: qrImage.mimeType || qrImage.type || "image/jpeg"
        });
      }
      
      console.log("Enviando a:", currentBaseUrl + "usuario/crear");

      const response = await fetch(currentBaseUrl + "usuario/crear", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "multipart/form-data" },
        body: formDataToSend,
      });

      const textResponse = await response.text();
      console.log("=== RESPUESTA CRUDA DEL SERVIDOR (Comercio) ===");
      console.log("Status:", response.status);
      console.log("Headers:", JSON.stringify(response.headers, null, 2));
      console.log("Body:", textResponse.substring(0, 500));
      console.log("================================================");

      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error("JSON parse error:", parseError.message);
        console.error("Respuesta no es JSON. Body completo:", textResponse);
        throw new Error(`El servidor respondió con HTML/error (status ${response.status})`);
      }
      setIsLoading(false);

      if (response.ok || data?.message?.toLowerCase().includes("creado")) {
        Alert.alert("¡Registro Exitoso!", `Tu cuenta ha sido creada en ${COUNTRY_INFO[pais].label}.`, [
          { text: "OK", onPress: () => navigation.navigate("Login") }
        ]);
      } else {
        let msg = data.message || "Error desconocido";

        if (data.errors) msg = Object.values(data.errors).flat().join("\n");
        console.log(data.errors)
        Alert.alert("Error", msg);
      }

    } catch (error) {
      setIsLoading(false);
      Alert.alert("Error", "Problema de conexión.");
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
    if (pickerTarget === 'categoria') handleInputChange("global_categoria_id", val);
    if (pickerTarget === 'tipoDocumento') handleInputChange("tipo_documento", val);
    if (pickerTarget === 'departamento') handleDepartamentoChange(val);
    if (pickerTarget === 'ciudad') handleCiudadChange(val);
    if (pickerTarget === 'distrito') handleInputChange("distrito", val);
    setShowPickerModal(false);
  };

  const getCategoryLabel = () => {
    const cat = categorias.find(c => String(c.value) === String(formData.global_categoria_id));
    return cat ? cat.label : "";
  };

  // --- VISTAS DE PASOS ---

  // Paso 1: Aviso Importante + SELECTOR DE PAÍS
  const renderStep1 = () => (
    <View style={styles.warningContainer}>
      <MaterialCommunityIcons name="storefront-outline" size={80} color="#fa6205" style={{ marginBottom: 20 }} />
      <Text style={styles.warningTitle}>Registro de Comercio</Text>
      
      <View style={{ width: '100%', marginBottom: 20 }}>
        <Text style={styles.label}>Selecciona tu País *</Text>
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

      <Text style={styles.warningSub}>Para activar tu tienda necesitamos:</Text>
      <View style={styles.bulletPoints}>
        {["Foto de tu DNI/RUC (ambos lados)", "Datos del Negocio", "Fotos de tus productos o carta", "Precios actualizados", "Foto o QR de Pago (Nequi / Bancolombia)"].map((item, index) => (
          <View key={index} style={styles.bulletItem}>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fa6205" />
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color="#1C1C1E" />
        <Text style={styles.infoText}>
          "Si quieres que te facilitemos tu registro de productos, puedes contactarnos enviándonos unas fotos de tu carta y nuestro equipo te apoyará."
        </Text>
      </View>
    </View>
  );

  // Paso 2: Datos Negocio
  const renderStep2 = () => (
    <View>
      <Text style={styles.title}>Datos del Negocio</Text>

      <Text style={styles.label}>Nombre del negocio *</Text>
      <TextInput style={styles.inputDark} placeholder="Ej. Bodega Don Pepe" placeholderTextColor="#777" value={formData.establecimiento_nombre} onChangeText={(v) => handleInputChange('establecimiento_nombre', v)} />

      <Text style={styles.label}>Categoría *</Text>
      <TouchableOpacity style={styles.inputDark} onPress={() => openPicker('categoria', categorias, "Selecciona Categoría")}>
        <Text style={[styles.inputText, !formData.global_categoria_id && { color: '#777' }]}>
          {getCategoryLabel() || "Selecciona..."}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#fa6205" />
      </TouchableOpacity>
      {categorias.length === 0 && <Text style={{color:'#d9534f', fontSize:12, marginTop:-15, marginBottom:15}}>Cargando categorías de {pais ? COUNTRY_INFO[pais].label : '...'}...</Text>}
    </View>
  );

  // Paso 3: Ubicación (Adaptado al país)
  const renderStep3 = () => (
    <View>
      <Text style={styles.title}>Ubicación ({pais ? COUNTRY_INFO[pais].label : ''})</Text>

      <Text style={styles.label}>Departamento *</Text>
      <TouchableOpacity style={styles.inputDark} onPress={() => openPicker('departamento', departamentos, "Selecciona Departamento")}>
        <Text style={[styles.inputText, !formData.departamento && { color: '#777' }]}>{formData.departamento || "Selecciona..."}</Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#fa6205" />
      </TouchableOpacity>

      <Text style={styles.label}>Provincia/Ciudad *</Text>
      <TouchableOpacity style={[styles.inputDark, !formData.departamento && { opacity: 0.5 }]} disabled={!formData.departamento} onPress={() => openPicker('ciudad', ciudades, "Selecciona Ciudad")}>
        <Text style={[styles.inputText, !formData.ciudad && { color: '#777' }]}>{formData.ciudad || "Selecciona..."}</Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#fa6205" />
      </TouchableOpacity>

      {distritos.length > 0 && (
        <>
            <Text style={styles.label}>Distrito</Text>
            <TouchableOpacity 
                style={styles.inputDark} 
                onPress={() => openPicker('distrito', distritos, "Selecciona Distrito")}
            >
                <Text style={[styles.inputText, !formData.distrito && { color: '#777' }]}>{formData.distrito || "Selecciona..."}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#fa6205" />
            </TouchableOpacity>
        </>
      )}

      <Text style={styles.label}>Dirección Exacta *</Text>
      <TextInput style={styles.inputDark} placeholder="Av. Principal 123" placeholderTextColor="#777" value={formData.direccion} onChangeText={(v) => handleInputChange('direccion', v)} />
    </View>
  );

  // Paso 4: Representante y Seguridad
  const renderStep4 = () => (
    <View>
      <Text style={styles.title}>Contacto y Seguridad</Text>

      <Text style={styles.label}>Representante Legal *</Text>
      <TextInput style={styles.inputDark} placeholder="Nombre completo" placeholderTextColor="#777" value={formData.persona_natural} onChangeText={(v) => {
        setFormData(prev => ({
          ...prev,
          persona_natural: v,
          nombre_completo: v
        }));
      }} />

      <Text style={styles.label}>Tipo de Documento *</Text>
      {/* --- AQUI USAMOS LA FUNCIÓN DINÁMICA DE OPCIONES --- */}
      <TouchableOpacity style={styles.inputDark} onPress={() => openPicker('tipoDocumento', getDocumentOptions(), "Tipo de Documento")}>
        <Text style={styles.inputText}>{formData.tipo_documento || "Selecciona..."}</Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#fa6205" />
      </TouchableOpacity>

      <Text style={styles.label}>Número de Documento *</Text>
      <TextInput style={styles.inputDark} placeholder="Número" placeholderTextColor="#777" keyboardType="numeric" value={formData.numero_documento} onChangeText={(v) => handleInputChange('numero_documento', v)} />

      <Text style={styles.label}>Fecha de Nacimiento *</Text>
      <TouchableOpacity style={styles.inputDark} onPress={() => setShowDateModal(true)}>
        <Text style={[styles.inputText, !formData.fecha_nacimiento && { color: '#777' }]}>
          {formData.fecha_nacimiento || "Seleccionar fecha"}
        </Text>
        <MaterialCommunityIcons name="calendar-month" size={22} color="#fa6205" />
      </TouchableOpacity>

      <Text style={styles.label}>Teléfono de Contacto *</Text>
      <TextInput 
        style={styles.inputDark} 
        placeholder={pais ? COUNTRY_INFO[pais].phonePlaceholder : "Celular"} 
        placeholderTextColor="#777" 
        keyboardType="phone-pad" 
        value={formData.numero_telefono} 
        onChangeText={(v) => handleInputChange('numero_telefono', v)} 
      />

      <Text style={styles.label}>Correo Electrónico *</Text>
      <TextInput style={styles.inputDark} placeholder="email@tienda.com" placeholderTextColor="#777" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(v) => handleInputChange('email', v)} />

      <View style={{ height: 1, backgroundColor: '#333', marginVertical: 15 }} />

      <Text style={styles.label}>Contraseña *</Text>
      <TextInput style={styles.inputDark} placeholder="Mínimo 9 caracteres" placeholderTextColor="#777" secureTextEntry value={formData.password} onChangeText={(v) => handleInputChange('password', v)} />

      <Text style={styles.label}>Repetir Contraseña *</Text>
      <TextInput style={styles.inputDark} placeholder="Confirma contraseña" placeholderTextColor="#777" secureTextEntry value={formData.repeatPassword} onChangeText={(v) => handleInputChange('repeatPassword', v)} />
    </View>
  );

  // Paso 5: Documentación
  const renderStep5 = () => (
    <View>
      <Text style={styles.title}>Documentación</Text>
      <Text style={styles.subtitle}>Sube las fotos obligatorias.</Text>

      <View style={styles.docGrid}>
        {imageFields.map((doc) => (
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
                <Text style={styles.docLabel}>{doc.label}</Text>
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

      {/* --- PARTE 2: MÉTODO DE PAGO --- */}
      <View style={{ marginTop: 25, marginBottom: 10 }}>
        <Text style={styles.title}>Método de Pago</Text>
        <Text style={styles.subtitle}>Adjunta tu QR para recibir pagos (Nequi / Bancolombia).</Text>

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
  );

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

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}

          {/* BOTONES DE NAVEGACIÓN */}
          <View style={styles.navButtons}>
            {step > 1 && (
              <TouchableOpacity style={styles.buttonSecondary} onPress={handlePrevStep}>
                <Text style={styles.buttonTextSecondary}>Atrás</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.buttonPrimary, step > 1 && { flex: 1 }]}
              onPress={step === totalSteps ? handlePreRegister : handleNextStep}
            >
              <Text style={styles.buttonTextPrimary}>
                {step === 1 ? "Comenzar Registro" : step === totalSteps ? "Finalizar" : "Siguiente"}
              </Text>
              {step < totalSteps && <MaterialCommunityIcons name="arrow-right" size={20} color="#F2F2F7" style={{ marginLeft: 8 }} />}
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* MODALES */}
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
                  {/* Icono check si es el seleccionado */}
                  {((pickerTarget === 'pais' && pais === item.value) || (pickerTarget === 'departamento' && formData.departamento === item.value)) && 
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
                <DatePickerComponent fechaNacimiento={formData.fecha_nacimiento} setFechaNacimiento={(val) => handleInputChange("fecha_nacimiento", val)} />
              </View>
              <TouchableOpacity style={styles.buttonPrimary} onPress={() => setShowDateModal(false)}>
                <Text style={styles.buttonTextPrimary}>Confirmar Fecha</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Código de Referido</Text>
              <Text style={[styles.inputText, { textAlign: 'center', marginBottom: 15, color: '#ccc' }]}>
                Si tienes un código, ingrésalo. Si no, continúa.
              </Text>
              <TextInput style={styles.inputDark} placeholder="Código (Opcional)" placeholderTextColor="#777" value={codigoReferido} onChangeText={setCodigoReferido} />
              <TouchableOpacity style={styles.buttonPrimary} onPress={finalizarRegistro}>
                <Text style={styles.buttonTextPrimary}>Finalizar Registro</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.buttonSecondary, { marginTop: 10 }]} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* LOADING */}
        <Modal transparent={true} visible={isLoading} animationType="fade">
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fa6205" />
              <Text style={styles.loadingText}>Registrando tienda...</Text>
              <Text style={styles.loadingSubText}>Servidor: {pais === 'CO' ? 'Colombia' : 'Perú'}</Text>
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

  progressBarContainer: { height: 4, backgroundColor: "#333", borderRadius: 2, marginBottom: 8, width: '100%' },
  progressBarFill: { height: "100%", backgroundColor: "#fa6205", borderRadius: 2 },
  stepText: { color: "#777", fontSize: 12, fontFamily: "Montserrat_400Regular", textAlign: "right" },

  title: { fontSize: 26, fontFamily: "Montserrat_700Bold", color: '#1C1C1E', marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: "Montserrat_400Regular", color: "#A0A0A0", marginBottom: 25 },
  label: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: "#DDD", marginBottom: 8, marginLeft: 4 },

  inputDark: { backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#DDD", paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: "Montserrat_400Regular", color: '#1C1C1E', marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputText: { fontSize: 16, fontFamily: "Montserrat_400Regular", color: '#1C1C1E' },

  // Aviso
  warningContainer: { alignItems: 'center', paddingVertical: 20 },
  warningTitle: { fontSize: 22, fontFamily: "Montserrat_700Bold", color: "#fa6205", marginBottom: 10 },
  warningSub: { fontSize: 16, fontFamily: "Montserrat_600SemiBold", color: '#1C1C1E', marginBottom: 20 },
  bulletPoints: { width: '100%', marginBottom: 30 },
  bulletItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  bulletText: { color: '#1C1C1E', fontSize: 15, fontFamily: "Montserrat_400Regular", marginLeft: 10 },
  infoBox: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#444', alignItems: 'center' },
  infoText: { color: '#444', fontSize: 13, fontFamily: "Montserrat_400Regular", marginLeft: 10, flex: 1, fontStyle: 'italic' },

  // Grid Docs
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

  dateModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  dateModalContent: { width: '90%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, alignItems: 'center' },
  datePickerContainer: { backgroundColor: '#FFF', borderRadius: 10, padding: 10, width: '100%', alignItems: 'center', marginBottom: 20 },

  loadingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { backgroundColor: '#FFFFFF', padding: 25, borderRadius: 20, alignItems: 'center', width: '80%' },
  loadingText: { color: '#1C1C1E', fontSize: 18, fontFamily: "Montserrat_700Bold", marginTop: 20, marginBottom: 5 },
  loadingSubText: { color: '#AAA', fontSize: 14, fontFamily: "Montserrat_400Regular" }
});