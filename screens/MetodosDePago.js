import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
  Switch,
  SafeAreaView,
  StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { BASE_URL } from '../constants/url';
import { Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_300Light } from '@expo-google-fonts/montserrat';
import { useFonts } from 'expo-font';
import AlertaModal from "../components/ErrorModal";

const MetodosPago = () => {
  const navigation = useNavigation();
  
  // Cargar fuentes
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_300Light,
  });

  // Estados para QR
  const [qrEstado, setQrEstado] = useState(false);
  const [qrImage, setQrImage] = useState(null);
  const [qrImagePreview, setQrImagePreview] = useState(null);
  
  // Estados para Mercado Pago
  const [mercadoPagoEstado, setMercadoPagoEstado] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  
  // Estado global de carga
  const [isSaving, setIsSaving] = useState(false);

  // Estado de usuario y pago
  const [userId, setUserId] = useState(null);
  const [pagoData, setPagoData] = useState(null);
  const [pagoId, setPagoId] = useState(null);
  
  // Añadir estado para userInfo
  const [userInfo, setUserInfo] = useState(null);
  const [isTipoComercio, setIsTipoComercio] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  // Cargar datos al iniciar
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Cargar ID de usuario
        const id = await AsyncStorage.getItem('userId');
        
        // Cargar datos del usuario para verificar tipo_usuario
        const userData = await AsyncStorage.getItem('userData');
        
        if (userData) {
          const parsedUserData = JSON.parse(userData);
          console.log("Datos de usuario del storage:", parsedUserData);
          
          setUserInfo(parsedUserData);
          
          // Verificar si es comercio
          const esComercio = 
            parsedUserData.tipo_usuario === 'comercio' || 
            parsedUserData.data?.tipo_usuario === 'comercio';
            
          console.log("¿Es comercio?", esComercio);
          setIsTipoComercio(esComercio);
        }
        
        if (id) {
          setUserId(JSON.parse(id));
          fetchPaymentMethods(JSON.parse(id));
        }
      } catch (error) {
        console.error('Error cargando datos de usuario:', error);
      }
    };

    loadUserData();
  }, []);

  // Función para obtener los métodos de pago actuales
  const fetchPaymentMethods = async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showAlert('No se encontró el token de autenticación', 'error');
        return;
      }

      // Primero, intentamos obtener datos completos del usuario (que incluyen método de pago)
      const userDataResponse = await fetch(`${BASE_URL}usuario/${id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (userDataResponse.ok) {
        const userData = await userDataResponse.json();
        console.log("Datos de usuario obtenidos de API:", userData);
        
        // Actualizar la información del usuario completa
        setUserInfo(userData);
        
        // Verificar si es comercio
        const esComercio = 
          userData.tipo_usuario === 'comercio' || 
          userData.data?.tipo_usuario === 'comercio';
          
        console.log("¿Es comercio según API?", esComercio);
        setIsTipoComercio(esComercio);
        
        // Si los datos del usuario incluyen información de pago, la usamos
        if (userData.data && userData.data.user_tipo_pago) {
          console.log("Método de pago encontrado en datos de usuario");
          setPagoData(userData.data.user_tipo_pago);
          setPagoId(userData.data.user_tipo_pago.id);
          
          // Actualizar los estados con los datos existentes
          setQrEstado(userData.data.user_tipo_pago.qr_estado === "true" || 
                     userData.data.user_tipo_pago.qr_estado === true || 
                     userData.data.user_tipo_pago.qr_estado === 1);
                     
          if (userData.data.user_tipo_pago.qr_file) {
            setQrImagePreview(getImageUrl(userData.data.user_tipo_pago.qr_file));
          }
          
          setMercadoPagoEstado(userData.data.user_tipo_pago.mercado_pago_estado === "true" || 
                              userData.data.user_tipo_pago.mercado_pago_estado === true || 
                              userData.data.user_tipo_pago.mercado_pago_estado === 1);
                              
          setPublicKey(userData.data.user_tipo_pago.mercado_pago_public_key || '');
          setAccessToken(userData.data.user_tipo_pago.mercado_pago_access_token || '');
          return;
        }
      }

      // Si no obtuvimos datos del usuario o no incluyen método de pago, 
      // intentamos la ruta específica para métodos de pago
      const response = await fetch(`${BASE_URL}user-tipo-pago`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Respuesta de métodos de pago:", data);
        
        // Resto del código existente para procesar la respuesta...
        // Buscar el método de pago que coincida con el ID del usuario
        if (Array.isArray(data)) {
          const userPayment = data.find(payment => parseInt(payment.user_id) === parseInt(id));
          
          if (userPayment) {
            console.log("Método de pago encontrado:", userPayment);
            setPagoData(userPayment);
            setPagoId(userPayment.id);
            
            // Configurar estados con datos existentes
            setQrEstado(userPayment.qr_estado === "true" || 
                       userPayment.qr_estado === true || 
                       userPayment.qr_estado === 1);
                       
            if (userPayment.qr_file) {
              setQrImagePreview(getImageUrl(userPayment.qr_file));
            }
            
            setMercadoPagoEstado(userPayment.mercado_pago_estado === "true" || 
                                userPayment.mercado_pago_estado === true || 
                                userPayment.mercado_pago_estado === 1);
                                
            setPublicKey(userPayment.mercado_pago_public_key || '');
            setAccessToken(userPayment.mercado_pago_access_token || '');
          } else {
            console.log("No se encontraron métodos de pago para este usuario");
          }
        } else if (data.data) {
          // Si la respuesta tiene formato {data: {...}}
          setPagoData(data.data);
          setPagoId(data.data.id);
          
          setQrEstado(data.data.qr_estado === "true" || 
                     data.data.qr_estado === true || 
                     data.data.qr_estado === 1);
                     
          if (data.data.qr_file) {
            setQrImagePreview(getImageUrl(data.data.qr_file));
          }
          
          setMercadoPagoEstado(data.data.mercado_pago_estado === "true" || 
                              data.data.mercado_pago_estado === true || 
                              data.data.mercado_pago_estado === 1);
                              
          setPublicKey(data.data.mercado_pago_public_key || '');
          setAccessToken(data.data.mercado_pago_access_token || '');
        } else {
          console.log("Formato de respuesta no esperado:", data);
        }
      } else {
        console.log('No se encontraron métodos de pago configurados');
      }
    } catch (error) {
      console.error('Error obteniendo métodos de pago:', error);
    }
  };

  // Función para obtener URL de imagen
  const getImageUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http')) return photoPath;
    return `${BASE_URL.toString().replace('/api', '')}/storage/${photoPath}`;
  };

  // Función para seleccionar imagen QR
  const pickQrImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        showAlert('Se necesita acceso a la galería para seleccionar imágenes', 'error');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const imageUri = result.assets ? result.assets[0].uri : result.uri;
        setQrImage(imageUri);
        setQrImagePreview(imageUri);
      }
    } catch (error) {
      console.error('Error seleccionando imagen QR:', error);
      showAlert('No se pudo seleccionar la imagen. Inténtalo de nuevo.', 'error');
    }
  };

  // Función para guardar todas las configuraciones de pago
  const saveAllPaymentMethods = async () => {
    if (!userId) {
      showAlert('No se ha identificado el usuario', 'error');
      return;
    }

    // Validaciones
    if (qrEstado && !qrImage && !qrImagePreview) {
      showAlert('Si activas el pago por QR, debes seleccionar una imagen', 'error');
      return;
    }

    if (mercadoPagoEstado && (!publicKey || !accessToken)) {
      showAlert('Si activas Mercado Pago, debes completar las claves', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        showAlert('No se encontró el token de autenticación', 'error');
        setIsSaving(false);
        return;
      }

      const formData = new FormData();
      formData.append('user_id', userId);
      
      // Agregar configuración de QR
      formData.append('qr_estado', qrEstado ? "1" : "0");
      
      // Solo agregar imagen si hay una nueva seleccionada
      if (qrImage) {
        const filename = qrImage.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('qr_file', {
          uri: Platform.OS === 'ios' ? qrImage.replace('file://', '') : qrImage,
          name: filename || 'qr.jpg',
          type: type
        });
      }

      // Agregar configuración de Mercado Pago
      formData.append('mercado_pago_estado', mercadoPagoEstado ? "1" : "0");
      formData.append('mercado_pago_public_key', publicKey);
      formData.append('mercado_pago_access_token', accessToken);

      // Usar la URL correcta según tengamos o no ID de pago
      const url = pagoId 
        ? `${BASE_URL}user-tipo-pago/${pagoId}` 
        : `${BASE_URL}user-tipo-pago`;

      console.log("Enviando configuración a:", url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const responseText = await response.text();
      console.log("Respuesta del servidor:", responseText);
      
      try {
        const data = JSON.parse(responseText);
        
        if (response.ok) {
          showAlert('Métodos de pago configurados correctamente', 'success');
          // Si era una creación nueva, obtener el ID para futuras actualizaciones
          if (!pagoId && data.data && data.data.id) {
            setPagoId(data.data.id);
          }
          fetchPaymentMethods(userId);
        } else {
          showAlert(data.message || 'No se pudieron guardar los métodos de pago', 'error');
        }
      } catch (e) {
        // Si la respuesta no es JSON válido pero la petición fue exitosa
        if (response.ok) {
          showAlert('Métodos de pago configurados correctamente', 'success');
          fetchPaymentMethods(userId);
        } else {
          showAlert('No se pudieron guardar los métodos de pago', 'error');
        }
      }
    } catch (error) {
      console.error('Error guardando métodos de pago:', error);
      showAlert('Ocurrió un error al guardar la configuración', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Función para depuración que comprueba si el usuario es comercio
  useEffect(() => {
    console.log("Estado actual de userInfo:", userInfo);
    console.log("¿Es tipo comercio?", isTipoComercio);
  }, [userInfo, isTipoComercio]);

  // Mostrar pantalla de carga mientras se cargan las fuentes
  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa6205" />
          <Text style={{color: '#1C1C1E', marginTop: 10}}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <FontAwesome name="arrow-left" size={18} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Métodos de Pago</Text>
      </View>
      <ScrollView style={styles.container}>
        <Text style={styles.subtitle}>Configura tus métodos para recibir pagos</Text>

        {/* Sección de QR */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Código QR</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Habilitar pago por QR</Text>
            <Switch
              trackColor={{ false: "#767577", true: "#fa6205" }}
              thumbColor={qrEstado ? "#FFF" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={setQrEstado}
              value={qrEstado}
            />
          </View>

          {qrEstado && (
            <View style={styles.qrContainer}>
              <Text style={styles.fieldLabel}>Imagen de QR</Text>
              
                <TouchableOpacity 
                  style={styles.imagePickerButton}
                  onPress={pickQrImage}
                >
                  <FontAwesome name="camera" size={18} color="#fa6205" />
                  <Text style={styles.imagePickerText}>Seleccionar imagen QR</Text>
                </TouchableOpacity>
              
              {qrImagePreview && (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: qrImagePreview }}
                    style={styles.imagePreview}
                    resizeMode="contain"
                  />
                </View>
              )}
            </View>
          )}
        </View>

        {/* Sección de Mercado Pago - solo visible para comercios */}
        {isTipoComercio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mercado Pago</Text>
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Habilitar Mercado Pago</Text>
              <Switch
                trackColor={{ false: "#767577", true: "#fa6205" }}
                thumbColor={mercadoPagoEstado ? "#FFF" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={setMercadoPagoEstado}
                value={mercadoPagoEstado}
              />
            </View>

            {mercadoPagoEstado && (
              <View style={styles.mpContainer}>
                <Text style={styles.fieldLabel}>Public Key</Text>
                <TextInput
                  style={styles.input}
                  value={publicKey}
                  onChangeText={setPublicKey}
                  placeholder="Ingresa la Public Key de Mercado Pago"
                  placeholderTextColor="#999"
                />
                
                <Text style={styles.fieldLabel}>Access Token</Text>
                <TextInput
                  style={styles.input}
                  value={accessToken}
                  onChangeText={setAccessToken}
                  placeholder="Ingresa el Access Token de Mercado Pago"
                  placeholderTextColor="#999"
                  secureTextEntry={true}
                />
              </View>
            )}
          </View>
        )}

        {/* Botón único para guardar todas las configuraciones */}
        <TouchableOpacity
          style={[styles.mainSaveButton, { opacity: isSaving ? 0.7 : 1 }]}
          onPress={saveAllPaymentMethods}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome name="save" size={18} color="#FFF" style={styles.saveIcon} />
              <Text style={styles.mainSaveButtonText}>Guardar métodos de pago</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Configura tus métodos de pago para que los clientes puedan pagarte de la forma más conveniente.
          </Text>
        </View>
      </ScrollView>
        <AlertaModal
          visible={alertVisible}
          mensaje={alertData.message}
          tipo={alertData.type}
          onCerrar={() => setAlertVisible(false)}
          onPrimary={alertData.onPrimary}
          primaryLabel={alertData.primaryLabel}
        />
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    paddingTop: Platform.OS === "android" ? 0 : 0,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#F2F2F7",
  },
  headerBar: {
    backgroundColor: "#fa6205",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === "android" ? 40 : 14,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    color: "#FFF",
    marginLeft: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 22,
    color: "#1C1C1E",
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#888",
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    color: "#fa6205",
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  switchLabel: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 15,
    color: "#1C1C1E",
  },
  qrContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  mpContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  fieldLabel: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F5F0E8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
    color: "#1C1C1E",
    marginBottom: 14,
  },
  imagePickerButton: {
    backgroundColor: "#F5F0E8",
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "#E8E2D8",
    borderStyle: "dashed",
  },
  imagePickerText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 14,
    color: "#888",
    marginLeft: 10,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePreview: {
    width: 160,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#F5F0E8',
  },
  mainSaveButton: {
    backgroundColor: "#fa6205",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 16,
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  mainSaveButtonText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  saveIcon: {
    marginRight: 8,
  },
  infoContainer: {
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    borderLeftWidth: 3,
    borderLeftColor: "#fa6205",
  },
  infoText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    color: "#888",
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default MetodosPago;