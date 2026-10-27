import React, { useState, useRef, useEffect } from "react";
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
  ActivityIndicator
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Picker } from "@react-native-picker/picker";
import { useFonts, Montserrat_400Regular, Montserrat_700Bold } from "@expo-google-fonts/montserrat";
// import { BASE_URL } from "../../constants/url"; // <--- YA NO LA USAREMOS DIRECTAMENTE AQUÍ
import { useAlert } from '../../context/AlertContext';
import { RegistroScreen, RegistroHeader, RegistroCard, CampoTexto, CampoSelector, registroStyles, C } from "../../components/registro/RegistroUI";

// 1. CONFIGURACIÓN POR PAÍS (solo info visual, misma API)
const API_URL = "https://back.carbycol.com/api/";
const COUNTRY_INFO = {
  PE: { label: "Perú 🇵🇪", currency: "PEN" },
  CO: { label: "Colombia 🇨🇴", currency: "COP" }
};

export default function RegisterFormScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const scrollRef = useRef(null);

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
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para el Picker personalizado de iOS (REUTILIZABLE)
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [pickerOptions, setPickerOptions] = useState([]);
  const [pickerTarget, setPickerTarget] = useState(""); // Para saber si el modal es de 'pais' o 'documento'
  
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [step]);

  if (!fontsLoaded) return null;

  // --- LÓGICA DE NAVEGACIÓN ---
  const handleNextStep = () => {
    if (step === 1) {
      if (!nombreCompleto.trim() || !numeroDocumento.trim() || !numeroTelefono.trim()) {
        showAlert({ title: "Error", message: "Por favor completa todos los campos personales.", type: "error" });
        return;
      }
      if (!tipoDocumento) {
        showAlert({ title: "Error", message: "Selecciona un tipo de documento.", type: "error" });
        return;
      }
      if (nombreCompleto.trim().length < 3) {
        showAlert({ title: "Error", message: "El nombre debe tener al menos 3 caracteres.", type: "error" });
        return;
      }
      if (numeroDocumento.trim().length < 5) {
        showAlert({ title: "Error", message: "El número de documento debe tener al menos 5 dígitos.", type: "error" });
        return;
      }
      if (numeroTelefono.trim().length < 7) {
        showAlert({ title: "Error", message: "El número de teléfono no es válido.", type: "error" });
        return;
      }
      setStep(2);
    }
  };

  const handlePrevStep = () => setStep(1);
  const getProgressWidth = () => (step === 1 ? "50%" : "100%");
  
  // --- LÓGICA DE ENVÍO ---
  const handleSubmitFormulario = async () => {
    if (!email.trim()) return showAlert({ title: "Error", message: "El email es obligatorio.", type: "error" });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return showAlert({ title: "Error", message: "Ingresa un correo electrónico válido.", type: "error" });
    if (!password) return showAlert({ title: "Error", message: "La contraseña es obligatoria.", type: "error" });
    if (password.length < 9) return showAlert({ title: "Error", message: "La contraseña debe tener al menos 9 caracteres.", type: "error" });
    if (password !== repeatPassword) return showAlert({ title: "Error", message: "Las contraseñas no coinciden.", type: "error" });

    // 4. SELECCIONAR LA URL BASADA EN EL PAÍS
    const currentBaseUrl = API_URL;

    if (!currentBaseUrl) {
      showAlert({ title: "Error", message: "Error configurando la región. Intente nuevamente.", type: "error" });
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
        showAlert({ title: "Error", message: errorMsg, type: "error" });
        return;
      }

      showAlert({ title: "Éxito", message: `Usuario creado correctamente en ${COUNTRY_INFO[pais].label}`, type: "success", confirmText: "Ir al Login", onConfirm: () => navigation.navigate("Login") });

    } catch (error) {
      console.error(error);
      setIsLoading(false);
      showAlert({ title: "Error", message: "Error de conexión. Inténtalo más tarde.", type: "error" });
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

  const DOCUMENTOS = { CC: "Cédula de Ciudadanía (CC)", TI: "Tarjeta de Identidad (TI)", DNI: "DNI", PAS: "Pasaporte", CE: "Carnet de Extranjería (CE)" };

  // --- RENDER ---
  return (
    <RegistroScreen>
      <RegistroHeader
        step={step}
        totalSteps={2}
        stepLabels={["Datos", "Cuenta"]}
        onBack={() => navigation.goBack()}
        title={step === 1 ? "Información Personal" : "Configura tu Cuenta"}
        subtitle={step === 1 ? "Ingresa tus datos personales." : "Establece tus credenciales de acceso."}
      />

      <RegistroCard>
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={registroStyles.scrollContent}>


           {/* PASO 1 */}
           {step === 1 && (
             <View style={styles.paso}>
               {/* País siempre Colombia */}

               <Text style={registroStyles.label}>Nombre completo</Text>
              <CampoTexto
                icon="account"
                placeholder="Ej. Juan Pérez"
                value={nombreCompleto}
                onChangeText={setNombreCompleto}
                maxLength={50}
              />

              <Text style={registroStyles.label}>Tipo de documento</Text>
              <CampoSelector
                icon="card-account-details"
                value={DOCUMENTOS[tipoDocumento]}
                placeholder="Selecciona una opción"
                active={showPickerModal}
                onPress={() => openIosPicker('documento')}
              />

              <Text style={registroStyles.label}>Número de documento</Text>
              <CampoTexto
                icon="numeric"
                placeholder="Ej. 123456789"
                keyboardType="numeric"
                value={numeroDocumento}
                onChangeText={setNumeroDocumento}
                maxLength={10}
              />

              <Text style={registroStyles.label}>Número de teléfono</Text>
              <CampoTexto
                icon="phone"
                placeholder={pais === 'PE' ? "Ej. 912 345 678" : "Ej. 300 123 4567"}
                keyboardType="phone-pad"
                value={numeroTelefono}
                onChangeText={setNumeroTelefono}
                maxLength={10}
              />

              <TouchableOpacity style={[registroStyles.buttonPrimary, styles.alFondo]} activeOpacity={0.8} onPress={handleNextStep}>
                <Text style={registroStyles.buttonTextPrimary}>Siguiente</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color={C.surface} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={styles.paso}>
              <Text style={registroStyles.label}>Correo electrónico</Text>
              <CampoTexto
                icon="email"
                placeholder="nombre@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                maxLength={50}
              />

              <Text style={registroStyles.label}>Contraseña</Text>
              <CampoTexto
                icon="lock"
                placeholder="Mínimo 9 caracteres"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                maxLength={30}
              />
              <Text style={styles.helperText}>La contraseña debe ser segura.</Text>

              <Text style={registroStyles.label}>Repetir contraseña</Text>
              <CampoTexto
                icon="lock-check"
                placeholder="Confirma tu contraseña"
                secureTextEntry
                value={repeatPassword}
                onChangeText={setRepeatPassword}
                maxLength={30}
              />

              <TouchableOpacity style={[registroStyles.buttonPrimary, styles.alFondo]} activeOpacity={0.8} onPress={handleSubmitFormulario}>
                <Text style={registroStyles.buttonTextPrimary}>Completar Registro</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.buttonSecondary} onPress={handlePrevStep}>
                <MaterialCommunityIcons name="arrow-left" size={18} color={C.muted} style={{ marginRight: 6 }} />
                <Text style={styles.buttonTextSecondary}>Volver atrás</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </RegistroCard>

        {/* MODALES */}
        <Modal transparent={true} visible={isLoading} animationType="fade">
            <View style={registroStyles.loadingOverlay}>
                <View style={registroStyles.loadingContainer}>
                    <ActivityIndicator size="large" color={C.brand} />
                    <Text style={registroStyles.loadingText}>Creando cuenta...</Text>
                    <Text style={registroStyles.loadingSubText}>Conectando con el servidor...</Text>
                </View>
            </View>
        </Modal>

        <Modal animationType="slide" transparent visible={showPickerModal} onRequestClose={() => setShowPickerModal(false)}>
          <TouchableOpacity style={registroStyles.modalOverlay} activeOpacity={1} onPress={() => setShowPickerModal(false)}>
            <TouchableOpacity activeOpacity={1} style={[registroStyles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
              <View style={registroStyles.grabber} />
              <View style={registroStyles.modalHeader}>
                <Text style={registroStyles.modalTitle}>Selecciona una opción</Text>
                <TouchableOpacity onPress={() => setShowPickerModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={registroStyles.modalCloseText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={pickerOptions}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => {
                  const selected = (pickerTarget === 'pais' && pais === item.value) ||
                    (pickerTarget === 'documento' && tipoDocumento === item.value);
                  return (
                    <TouchableOpacity
                      style={[registroStyles.modalItem, selected && registroStyles.modalItemSelected]}
                      activeOpacity={0.8}
                      onPress={() => {
                        // Lógica condicional según qué estemos seleccionando
                        if (pickerTarget === 'pais') setPais(item.value);
                        if (pickerTarget === 'documento') setTipoDocumento(item.value);

                        setShowPickerModal(false);
                      }}
                    >
                      <Text style={[registroStyles.modalItemText, selected && registroStyles.modalItemTextSelected]}>{item.label}</Text>
                      {/* Mostrar check si está seleccionado */}
                      {selected && <MaterialCommunityIcons name="check-circle" size={22} color={C.brand} />}
                    </TouchableOpacity>
                  );
                }}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

    </RegistroScreen>
  );
}

const styles = StyleSheet.create({
  paso: { flexGrow: 1 },
  alFondo: { marginTop: "auto" },
  helperText: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: C.muted, marginBottom: 16, marginLeft: 18, marginTop: -10 },
  buttonSecondary: { paddingVertical: 16, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  buttonTextSecondary: { color: C.muted, fontFamily: "Montserrat_700Bold", fontSize: 15 },
});
