import React, { useState } from "react";
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
  ActivityIndicator
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Picker } from "@react-native-picker/picker";
import { useFonts, Montserrat_400Regular, Montserrat_700Bold } from "@expo-google-fonts/montserrat";
// import { BASE_URL } from "../../constants/url"; // <--- YA NO LA USAREMOS DIRECTAMENTE AQUÍ
import AlertaModal from '../../components/ErrorModal';

// 1. CONFIGURACIÓN POR PAÍS (solo info visual, misma API)
const API_URL = "https://back.carbycol.com/api/";
const COUNTRY_INFO = {
  PE: { label: "Perú 🇵🇪", currency: "PEN" },
  CO: { label: "Colombia 🇨🇴", currency: "COP" }
};

export default function RegisterFormScreen() {
  const navigation = useNavigation();
  
  // --- ESTADOS DEL FORMULARIO ---
  const [step, setStep] = useState(1);
  
  // 2. NUEVO ESTADO PARA EL PAÍS
  const [pais, setPais] = useState("CO"); // Valores: 'PE' o 'CO'

  const [nombreCompleto, setNombreCompleto] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [numeroTelefono, setNumeroTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  // --- ESTADOS DE UI ---
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [mensajeAlerta, setMensajeAlerta] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para el Picker personalizado de iOS (REUTILIZABLE)
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [pickerOptions, setPickerOptions] = useState([]);
  const [pickerTarget, setPickerTarget] = useState(""); // Para saber si el modal es de 'pais' o 'documento'
  
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
  });

  if (!fontsLoaded) return null;

  // --- LÓGICA DE NAVEGACIÓN ---
  const handleNextStep = () => {
    if (step === 1) {
      // 3. VALIDAR QUE SE HAYA SELECCIONADO PAÍS
      if (!pais) {
        mostrarError("Por favor selecciona tu país de residencia.");
        return;
      }
      if (!nombreCompleto.trim() || !numeroDocumento.trim() || !numeroTelefono.trim()) {
        mostrarError("Por favor completa todos los campos personales.");
        return;
      }
      if (!tipoDocumento) {
        mostrarError("Selecciona un tipo de documento.");
        return;
      }
      setStep(2);
    }
  };

  const handlePrevStep = () => setStep(1);
  const getProgressWidth = () => (step === 1 ? "50%" : "100%");
  
  const mostrarError = (mensaje) => {
    setMensajeAlerta(mensaje);
    setMostrarAlerta(true);
  };

  // --- LÓGICA DE ENVÍO ---
  const handleSubmitFormulario = async () => {
    if (!email.trim()) return mostrarError("El email es obligatorio.");
    if (!password) return mostrarError("La contraseña es obligatoria.");
    if (password.length < 9) return mostrarError("La contraseña debe tener al menos 9 caracteres.");
    if (password !== repeatPassword) return mostrarError("Las contraseñas no coinciden.");

    // 4. SELECCIONAR LA URL BASADA EN EL PAÍS
    const currentBaseUrl = API_URL;

    if (!currentBaseUrl) {
      mostrarError("Error configurando la región. Intente nuevamente.");
      return;
    }

    const userData = {
      nombre_completo: nombreCompleto.trim(),
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento.trim(),
      numero_telefono: numeroTelefono.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      tipo_usuario: "usuario",
      pais: pais // Opcional: Si el backend necesita saber el país explícitamente
    };

    setIsLoading(true);

    try {
      console.log("Enviando a:", `${currentBaseUrl}usuario/crear`); // Debug
      
      // 5. USAR currentBaseUrl EN LUGAR DE BASE_URL IMPORTADA
      const response = await fetch(`${currentBaseUrl}usuario/crear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(userData),
      });

      // Debug: log de la respuesta cruda
      const textResponse = await response.text();
      console.log("=== RESPUESTA CRUDA DEL SERVIDOR ===");
      console.log("Status:", response.status);
      console.log("Headers:", JSON.stringify(response.headers, null, 2));
      console.log("Body:", textResponse.substring(0, 500));
      console.log("==================================");

      let result;
      try {
        result = JSON.parse(textResponse);
      } catch (parseError) {
        console.error("JSON parse error:", parseError.message);
        console.error("Respuesta no es JSON válido. Body completo:", textResponse);
        throw new Error(`El servidor respondió con HTML/error (status ${response.status})`);
      }
      setIsLoading(false);

      if (!response.ok) {
        let errorMsg = result.message || "No se pudo crear el usuario.";
        if (result.errors) {
           const firstKey = Object.keys(result.errors)[0];
           if(firstKey) errorMsg = `${firstKey}: ${result.errors[firstKey][0]}`;
        }
        mostrarError(errorMsg);
        return;
      }

      Alert.alert("¡Éxito!", `Usuario creado correctamente en ${COUNTRY_INFO[pais].label}`, [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);

    } catch (error) {
      console.error(error);
      setIsLoading(false);
      mostrarError("Error de conexión. Inténtalo más tarde.");
    }
  };

  // --- HELPER PARA ABRIR MODAL EN IOS ---
  const openIosPicker = (type) => {
    setPickerTarget(type);
    if (type === 'pais') {
        setPickerOptions([
            { label: "Selecciona...", value: "" },
            { label: "Perú 🇵🇪", value: "PE" },
            { label: "Colombia 🇨🇴", value: "CO" }
        ]);
    } else if (type === 'documento') {
        setPickerOptions([
            { label: "Cédula de Ciudadanía (CC)", value: "CC" },
            { label: "Tarjeta de Identidad (TI)", value: "TI" },
            { label: "DNI", value: "DNI" },
            { label: "Pasaporte", value: "PAS" },
            { label: "Carnet de Extranjería (CE)", value: "CE" },
        ]);
    }
    setShowPickerModal(true);
  };

  // --- RENDER ---
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
            <View style={[styles.progressBarFill, { width: getProgressWidth() }]} />
          </View>
          <Text style={styles.stepText}>Paso {step} de 2</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <Text style={styles.title}>{step === 1 ? "Información Personal" : "Configura tu Cuenta"}</Text>
          <Text style={styles.subtitle}>
            {step === 1 ? "Selecciona tu país e ingresa tus datos." : "Establece tus credenciales de acceso."}
          </Text>

          {/* PASO 1 */}
          {step === 1 && (
            <View>
              {/* 6. SELECTOR DE PAÍS (NUEVO UI) */}
              <Text style={styles.label}>País de residencia</Text>
              {Platform.OS === 'ios' ? (
                <TouchableOpacity
                  style={styles.inputDark}
                  onPress={() => openIosPicker('pais')}
                >
                  <Text style={[styles.inputText, !pais && { color: "#777" }]}>
                    {pais ? COUNTRY_INFO[pais].label : "Selecciona tu país"}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color="#fa6205" />
                </TouchableOpacity>
              ) : (
                <View style={styles.pickerContainerDark}>
                   <Picker
                    selectedValue={pais}
                    onValueChange={(itemValue) => setPais(itemValue)}
                    style={{ color: '#1C1C1E' }}
                    dropdownIconColor="#fa6205"
                  >
                    <Picker.Item label="Selecciona tu país..." value="" color="#777"/>
                    <Picker.Item label="Perú 🇵🇪" value="PE" />
                    <Picker.Item label="Colombia 🇨🇴" value="CO" />
                  </Picker>
                </View>
              )}

              <Text style={styles.label}>Nombre completo</Text>
              <TextInput
                style={styles.inputDark}
                placeholder="Ej. Juan Pérez"
                placeholderTextColor="#777"
                value={nombreCompleto}
                onChangeText={setNombreCompleto}
              />

              <Text style={styles.label}>Tipo de documento</Text>
              {Platform.OS === 'ios' ? (
                <TouchableOpacity
                  style={styles.inputDark}
                  onPress={() => openIosPicker('documento')}
                >
                  <Text style={[styles.inputText, !tipoDocumento && { color: "#777" }]}>
                    {tipoDocumento || "Selecciona una opción"}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color="#fa6205" />
                </TouchableOpacity>
              ) : (
                <View style={styles.pickerContainerDark}>
                  <Picker
                    selectedValue={tipoDocumento}
                    onValueChange={setTipoDocumento}
                    style={{ color: '#1C1C1E' }}
                    dropdownIconColor="#fa6205"
                  >
                    <Picker.Item label="Selecciona..." value="" color="#777"/>
                    {/* Nota: Podrías filtrar documentos según el país aquí si quisieras */}
                    <Picker.Item label="Cédula (CC)" value="CC" />
                    <Picker.Item label="Tarjeta Identidad (TI)" value="TI" />
                    <Picker.Item label="DNI" value="DNI" />
                    <Picker.Item label="Pasaporte" value="PAS" />
                    <Picker.Item label="Carnet Extranjería" value="CE" />
                  </Picker>
                </View>
              )}

              <Text style={styles.label}>Número de documento</Text>
              <TextInput
                style={styles.inputDark}
                placeholder="Ej. 123456789"
                placeholderTextColor="#777"
                keyboardType="numeric"
                value={numeroDocumento}
                onChangeText={setNumeroDocumento}
              />

              <Text style={styles.label}>Número de teléfono</Text>
              <TextInput
                style={styles.inputDark}
                placeholder={pais === 'PE' ? "Ej. 912 345 678" : "Ej. 300 123 4567"}
                placeholderTextColor="#777"
                keyboardType="phone-pad"
                value={numeroTelefono}
                onChangeText={setNumeroTelefono}
              />

              <TouchableOpacity style={styles.buttonPrimary} onPress={handleNextStep}>
                <Text style={styles.buttonTextPrimary}>Siguiente</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#F2F2F7" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* PASO 2 (SIN CAMBIOS VISUALES) */}
          {step === 2 && (
            <View>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={styles.inputDark}
                placeholder="nombre@ejemplo.com"
                placeholderTextColor="#777"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.inputDark}
                placeholder="Mínimo 9 caracteres"
                placeholderTextColor="#777"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <Text style={styles.helperText}>La contraseña debe ser segura.</Text>

              <Text style={styles.label}>Repetir contraseña</Text>
              <TextInput
                style={styles.inputDark}
                placeholder="Confirma tu contraseña"
                placeholderTextColor="#777"
                secureTextEntry
                value={repeatPassword}
                onChangeText={setRepeatPassword}
              />

              <TouchableOpacity style={styles.buttonPrimary} onPress={handleSubmitFormulario}>
                <Text style={styles.buttonTextPrimary}>Completar Registro</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.buttonSecondary} onPress={handlePrevStep}>
                <Text style={styles.buttonTextSecondary}>Volver atrás</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* MODALES */}
        <AlertaModal
          visible={mostrarAlerta}
          mensaje={mensajeAlerta}
          onCerrar={() => setMostrarAlerta(false)}
          titulo="Atención"
        />

        <Modal transparent={true} visible={isLoading} animationType="fade">
            <View style={styles.loadingOverlay}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fa6205" />
                    <Text style={styles.loadingText}>Creando cuenta...</Text>
                    <Text style={styles.loadingSubText}>Conectando con servidor {pais === 'CO' ? 'Colombia' : 'Perú'}</Text>
                </View>
            </View>
        </Modal>

        {/* Modal REUTILIZABLE para Picker iOS */}
        {Platform.OS === 'ios' && (
          <Modal animationType="slide" transparent visible={showPickerModal} onRequestClose={() => setShowPickerModal(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Selecciona una opción</Text>
                  <TouchableOpacity onPress={() => setShowPickerModal(false)}>
                    <Text style={styles.modalCloseText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={pickerOptions}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => {
                        // Lógica condicional según qué estemos seleccionando
                        if (pickerTarget === 'pais') setPais(item.value);
                        if (pickerTarget === 'documento') setTipoDocumento(item.value);
                        
                        setShowPickerModal(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>{item.label}</Text>
                      {/* Mostrar check si está seleccionado */}
                      {((pickerTarget === 'pais' && pais === item.value) || 
                        (pickerTarget === 'documento' && tipoDocumento === item.value)) && 
                        <MaterialCommunityIcons name="check" size={20} color="#fa6205" />
                      }
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>
        )}

      </View>
    </KeyboardAvoidingView>
  );
}

// ... TUS MISMOS ESTILOS AQUÍ ...
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
  subtitle: { fontSize: 15, fontFamily: "Montserrat_400Regular", color: "#A0A0A0", marginBottom: 30 },
  label: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: "#DDD", marginBottom: 8, marginLeft: 4 },
  helperText: { fontSize: 12, color: "#777", marginBottom: 15, marginLeft: 4, marginTop: -10 },

  // Inputs Dark
  inputDark: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: '#1C1C1E',
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  inputText: { fontSize: 16, fontFamily: "Montserrat_400Regular", color: '#1C1C1E' },
  pickerContainerDark: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD",
    marginBottom: 20,
    overflow: 'hidden'
  },
  buttonPrimary: {
    backgroundColor: "#fa6205",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 15,
  },
  buttonTextPrimary: { color: "#F2F2F7", fontFamily: "Montserrat_700Bold", fontSize: 16 },
  buttonSecondary: { paddingVertical: 15, alignItems: "center", marginBottom: 20 },
  buttonTextSecondary: { color: '#1C1C1E', fontFamily: "Montserrat_700Bold", fontSize: 15, textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#444' },
  modalTitle: { color: '#1C1C1E', fontSize: 18, fontFamily: "Montserrat_700Bold" },
  modalCloseText: { color: '#fa6205', fontSize: 16, fontFamily: "Montserrat_700Bold" },
  modalItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#333', flexDirection: 'row', justifyContent: 'space-between' },
  modalItemText: { color: '#1C1C1E', fontSize: 16, fontFamily: "Montserrat_400Regular" },

  // ESTILOS LOADING
  loadingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { backgroundColor: '#FFFFFF', padding: 25, borderRadius: 20, alignItems: 'center', width: '80%' },
  loadingText: { color: '#1C1C1E', fontSize: 18, fontFamily: "Montserrat_700Bold", marginTop: 20, marginBottom: 5 },
  loadingSubText: { color: '#AAA', fontSize: 14, fontFamily: "Montserrat_400Regular" }
});