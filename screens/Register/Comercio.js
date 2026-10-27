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
  ActivityIndicator,
  Dimensions
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAlert } from "../../context/AlertContext";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold } from "@expo-google-fonts/montserrat";
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

export default function RegisterStoreScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const scrollRef = useRef(null);

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
    tipo_documento: "CC",
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
        label: pais === 'CO' ? "RUT o Cámara de Comercio" : "Tipo de RUC 10/15/20", 
        required: false 
    },
    { 
        id: "dni", 
        label: pais === 'CO' ? "Foto de cédula" : "Adjuntar DNI / Carnet Ext.", 
        required: false 
    },
  ];

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  // --- HANDLER ---
  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

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

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [step]);

  if (!fontsLoaded) return null;

  // --- HANDLERS ---

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
            showAlert({ title: "Selección requerida", message: "Por favor selecciona el país donde operará tu negocio.", type: "error" });
            return false;
        }
        return true;
    }

    if (step === 2) { // Datos Negocio
      if (!d.establecimiento_nombre || !d.global_categoria_id) {
        showAlert({ title: "Faltan datos", message: "Completa el nombre del establecimiento y la categoría.", type: "error" });
        return false;
      }
      if (d.establecimiento_nombre.length < 3) {
        showAlert({ title: "Nombre inválido", message: "El nombre debe tener al menos 3 caracteres.", type: "error" });
        return false;
      }
    }
    if (step === 3) { // Ubicación
      if (!d.departamento || !d.ciudad || !d.direccion) {
        showAlert({ title: "Faltan datos", message: "Completa la ubicación.", type: "error" });
        return false;
      }
    }
    if (step === 4) { // Contacto y Representante
      if (!d.persona_natural || !d.tipo_documento || !d.numero_documento || !d.numero_telefono || !d.email || !d.fecha_nacimiento) {
        showAlert({ title: "Faltan datos", message: "Completa los datos del representante legal.", type: "error" });
        return false;
      }
      if (d.persona_natural.length < 3) {
        showAlert({ title: "Nombre inválido", message: "El nombre debe tener al menos 3 caracteres.", type: "error" });
        return false;
      }
      if (d.numero_documento.length < 5) {
        showAlert({ title: "Documento inválido", message: "El número de documento debe tener al menos 5 dígitos.", type: "error" });
        return false;
      }
      if (d.numero_telefono.length < 7) {
        showAlert({ title: "Teléfono inválido", message: "El número de teléfono no es válido.", type: "error" });
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(d.email)) {
        showAlert({ title: "Email inválido", message: "Ingresa un correo electrónico válido.", type: "error" });
        return false;
      }
      if (!d.password || d.password.length < 9) {
        showAlert({ title: "Contraseña", message: "Mínimo 9 caracteres.", type: "error" });
        return false;
      }
      if (d.password !== d.repeatPassword) {
        showAlert({ title: "Error", message: "Las contraseñas no coinciden.", type: "error" });
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => { if (validateStep() && step < totalSteps) setStep(step + 1); };
  const handlePrevStep = () => { if (step > 1) setStep(step - 1); };

  // --- PROCESO FINAL ---
  const handlePreRegister = () => {
    const tieneRUT = images["tipo_ruc"];
    const tieneCamara = images["dni"];
    if (!tieneRUT && !tieneCamara) {
      showAlert({ title: "Documentación", message: "Debes subir al menos el RUT o Cámara de Comercio, o la foto de cédula.", type: "error" });
      return;
    }
    setModalVisible(true);
  };

  const finalizarRegistro = async () => {
    setModalVisible(false);
    
    if(!pais || !COUNTRY_INFO[pais]) {
        showAlert({ title: "Error", message: "Configuración de país no válida.", type: "error" });
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
        showAlert({ title: "Registro Exitoso", message: `Tu cuenta ha sido creada en ${COUNTRY_INFO[pais].label}.`, type: "success", confirmText: "Ir al Login", onConfirm: () => navigation.navigate("Login") });
      } else {
        let msg = data.message || "Error desconocido";

        if (data.errors) msg = Object.values(data.errors).flat().join("\n");
        console.log(data.errors)
        showAlert({ title: "Error", message: msg, type: "error" });
      }

    } catch (error) {
      setIsLoading(false);
      showAlert({ title: "Error", message: "Problema de conexión.", type: "error" });
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
      <View style={styles.warningIcon}>
        <MaterialCommunityIcons name="storefront-outline" size={44} color={C.brand} />
      </View>
       
       {/* SELECTOR DE PAÍS - Oculto, siempre Colombia */}

      <Text style={styles.warningSub}>Para activar tu tienda necesitamos:</Text>
      <View style={styles.bulletPoints}>
        {["RUT o Cámara de Comercio", "Foto de cédula", "Datos del Negocio", "Fotos de tus productos o carta", "Precios actualizados", "Foto o QR de Pago (Nequi / Bancolombia)"].map((item, index) => (
          <View key={index} style={styles.bulletItem}>
            <MaterialCommunityIcons name="check-circle" size={20} color={C.brand} />
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color={C.brand} />
        <Text style={styles.infoText}>
          "Si quieres que te facilitemos tu registro de productos, puedes contactarnos enviándonos unas fotos de tu carta y nuestro equipo te apoyará."
        </Text>
      </View>
    </View>
  );

  // Paso 2: Datos Negocio
  const renderStep2 = () => (
    <View>

      <Text style={styles.label}>Nombre del negocio *</Text>
      <CampoTexto icon="store" placeholder="Ej. Bodega Don Pepe" value={formData.establecimiento_nombre} onChangeText={(v) => handleInputChange('establecimiento_nombre', v)} maxLength={60} />

      <Text style={styles.label}>Categoría *</Text>
      <CampoSelector
        icon="shape"
        value={getCategoryLabel()}
        placeholder="Selecciona..."
        active={showPickerModal && pickerTarget === 'categoria'}
        onPress={() => openPicker('categoria', categorias, "Selecciona Categoría")}
      />
      {categorias.length === 0 && <Text style={{color:'#d9534f', fontSize:12, marginTop:-15, marginBottom:15}}>Cargando categorías de {pais ? COUNTRY_INFO[pais].label : '...'}...</Text>}
    </View>
  );

  // Paso 3: Ubicación (Adaptado al país)
  const renderStep3 = () => (
    <View>

      <Text style={styles.label}>Departamento *</Text>
      <CampoSelector
        icon="map"
        value={formData.departamento}
        placeholder="Selecciona..."
        active={showPickerModal && pickerTarget === 'departamento'}
        onPress={() => openPicker('departamento', departamentos, "Selecciona Departamento")}
      />

      <Text style={styles.label}>Provincia/Ciudad *</Text>
      <CampoSelector
        icon="city-variant"
        value={formData.ciudad}
        placeholder="Selecciona..."
        disabled={!formData.departamento}
        active={showPickerModal && pickerTarget === 'ciudad'}
        onPress={() => openPicker('ciudad', ciudades, "Selecciona Ciudad")}
      />

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

      <Text style={styles.label}>Dirección Exacta *</Text>
      <CampoTexto icon="home-map-marker" placeholder="Av. Principal 123" value={formData.direccion} onChangeText={(v) => handleInputChange('direccion', v)} maxLength={80} />
    </View>
  );

  // Paso 4: Representante y Seguridad
  const renderStep4 = () => (
    <View>

      <Text style={styles.label}>Representante Legal *</Text>
      <CampoTexto icon="account-tie" placeholder="Nombre completo" value={formData.persona_natural} onChangeText={(v) => {
        setFormData(prev => ({
          ...prev,
          persona_natural: v,
          nombre_completo: v
        }));
      }} maxLength={50} />

      <Text style={styles.label}>Tipo de Documento *</Text>
      {/* --- AQUI USAMOS LA FUNCIÓN DINÁMICA DE OPCIONES --- */}
      <CampoSelector
        icon="card-account-details"
        value={getDocumentOptions().find((o) => o.value === formData.tipo_documento)?.label || formData.tipo_documento}
        placeholder="Selecciona..."
        active={showPickerModal && pickerTarget === 'tipoDocumento'}
        onPress={() => openPicker('tipoDocumento', getDocumentOptions(), "Tipo de Documento")}
      />

      <Text style={styles.label}>Número de Documento *</Text>
      <CampoTexto icon="numeric" placeholder="Número" keyboardType="numeric" value={formData.numero_documento} onChangeText={(v) => handleInputChange('numero_documento', v)} maxLength={10} />

      <Text style={styles.label}>Fecha de Nacimiento *</Text>
      <CampoSelector
        icon="cake-variant"
        value={formData.fecha_nacimiento}
        placeholder="Seleccionar fecha"
        trailingIcon="calendar-month"
        active={showDateModal}
        onPress={() => setShowDateModal(true)}
      />

      <Text style={styles.label}>Teléfono de Contacto *</Text>
      <CampoTexto
        icon="phone"
        placeholder={pais ? COUNTRY_INFO[pais].phonePlaceholder : "Celular"}
        keyboardType="phone-pad" 
        value={formData.numero_telefono} 
        onChangeText={(v) => handleInputChange('numero_telefono', v)} 
        maxLength={10}
      />

      <Text style={styles.label}>Correo Electrónico *</Text>
      <CampoTexto icon="email" placeholder="email@tienda.com" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(v) => handleInputChange('email', v)} maxLength={50} />

      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.edge, marginTop: 4, marginBottom: 22 }} />

      <Text style={styles.label}>Contraseña *</Text>
      <CampoTexto icon="lock" placeholder="Mínimo 9 caracteres" secureTextEntry value={formData.password} onChangeText={(v) => handleInputChange('password', v)} maxLength={30} />

      <Text style={styles.label}>Repetir Contraseña *</Text>
      <CampoTexto icon="lock-check" placeholder="Confirma contraseña" secureTextEntry value={formData.repeatPassword} onChangeText={(v) => handleInputChange('repeatPassword', v)} maxLength={30} />
    </View>
  );

  // Paso 5: Documentación
  const renderStep5 = () => (
    <View>

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
                <View style={styles.docIcon}><MaterialCommunityIcons name="camera-plus" size={24} color={C.brand} /></View>
                <Text style={styles.docLabel}>{doc.label}</Text>
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
  );

  const TITULOS = { 1: "Registro de Comercio", 2: "Datos del Negocio", 3: `Ubicación (${pais ? COUNTRY_INFO[pais].label : ''})`, 4: "Contacto y Seguridad", 5: "Documentación" };
  const SUBTITULOS = { 5: "Sube las fotos obligatorias." };

  return (
    <RegistroScreen>
      <View style={styles.container}>

        <RegistroHeader step={step} totalSteps={totalSteps} onBack={() => navigation.goBack()} title={TITULOS[step]} subtitle={SUBTITULOS[step]} />

        <RegistroCard>
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

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
              style={[styles.buttonPrimary, { flex: 1 }]}
              activeOpacity={0.8}
              onPress={step === totalSteps ? handlePreRegister : handleNextStep}
            >
              <Text style={styles.buttonTextPrimary}>
                {step === 1 ? "Comenzar Registro" : step === totalSteps ? "Finalizar" : "Siguiente"}
              </Text>
              {step < totalSteps && <MaterialCommunityIcons name="arrow-right" size={20} color={C.surface} style={{ marginLeft: 8 }} />}
            </TouchableOpacity>
          </View>

        </ScrollView>
        </RegistroCard>

        {/* MODALES */}
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
                  {/* Icono check si es el seleccionado */}
                  {((pickerTarget === 'pais' && pais === item.value) || (pickerTarget === 'departamento' && formData.departamento === item.value)) && 
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
                <SelectorFecha fechaNacimiento={formData.fecha_nacimiento} setFechaNacimiento={(val) => handleInputChange("fecha_nacimiento", val)} />
              </View>
              <TouchableOpacity style={styles.buttonPrimary} onPress={() => setShowDateModal(false)}>
                <Text style={styles.buttonTextPrimary}>Confirmar Fecha</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.grabber} />
              <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Código de Referido</Text>
              <Text style={styles.referidoText}>
                Si tienes un código, ingrésalo. Si no, continúa.
              </Text>
              <CampoTexto icon="ticket-percent" placeholder="Código (Opcional)" value={codigoReferido} onChangeText={setCodigoReferido} maxLength={20} />
              <TouchableOpacity style={styles.buttonPrimary} onPress={finalizarRegistro}>
                <Text style={styles.buttonTextPrimary}>Finalizar Registro</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.buttonSecondary, { marginTop: 10, marginRight: 0 }]} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* LOADING */}
        <Modal transparent={true} visible={isLoading} animationType="fade">
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={C.brand} />
              <Text style={styles.loadingText}>Registrando tienda...</Text>
              <Text style={styles.loadingSubText}>Servidor: {pais === 'CO' ? 'Colombia' : 'Perú'}</Text>
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
    inputText: { fontSize: 15, fontFamily: "Montserrat_400Regular", color: C.ink },
    referidoText: { fontSize: 14, lineHeight: 20, fontFamily: "Montserrat_400Regular", color: C.muted, textAlign: "center", marginBottom: 16 },

    // Aviso
    warningContainer: { alignItems: 'center', paddingVertical: 8 },
    warningIcon: { width: 88, height: 88, borderRadius: 999, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    warningTitle: { fontSize: 24, fontFamily: "Montserrat_800ExtraBold", color: C.ink, marginBottom: 6 },
    warningSub: { fontSize: 15, fontFamily: "Montserrat_600SemiBold", color: C.muted, marginBottom: 18 },
    bulletPoints: { width: '100%', marginBottom: 20, backgroundColor: C.bg, borderRadius: 22, paddingVertical: 8, paddingHorizontal: 14 },
    bulletItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    bulletText: { color: C.ink, fontSize: 14, fontFamily: "Montserrat_600SemiBold", marginLeft: 10, flex: 1 },
    infoBox: { flexDirection: 'row', backgroundColor: C.iconBg, padding: 16, borderRadius: 22, alignItems: 'center' },
    infoText: { color: C.ink, fontSize: 13, lineHeight: 19, fontFamily: "Montserrat_400Regular", marginLeft: 12, flex: 1, fontStyle: 'italic' },

    // Botones
    navButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 16 },
  }),
};
