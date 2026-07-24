import React, { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Image, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_700Bold, Montserrat_300Light } from '@expo-google-fonts/montserrat';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/url';
import AlertaModal from '../../components/ErrorModal';

const ServiciosProducto = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { categoria_id, categoria_nombre } = route.params || {};
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_300Light,
  });

  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [tiempo, setTiempo] = useState('');
  const [foto, setFoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [descripcion, setDescripcion] = useState('');

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({});

  const showAlert = (title, message, type, onConfirm, primaryLabel) => {
    setAlertData({ title, message, type: type || (title === "Éxito" ? "success" : "error"), onConfirm: onConfirm || null, primaryLabel: primaryLabel || null });
    setAlertVisible(true);
  };

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permiso requerido', 'Se necesita permiso para acceder a la galería');
      }
    })();
  }, []);

  if (!fontsLoaded) return null;

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
     allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) setFoto(result.assets[0]);
  };

  const handleSubmit = async () => {
    if (!nombre || !precio || !tiempo || !foto || !descripcion) {
      showAlert('Error', 'Todos los campos son obligatorios');
      return;
    }
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showAlert('Error', 'No se encontró el token de autenticación');
        setLoading(false);
        return;
      }
      // Obtener user_id
      const userData = await AsyncStorage.getItem('userData');
      let user_id = '';
      if (userData) {
        const parsed = JSON.parse(userData);
        user_id = parsed.id;
      }
      const formData = new FormData();
      formData.append('nombre', nombre);
      formData.append('precio', precio);
      formData.append('tiempo', tiempo);
      formData.append('descripcion', descripcion);
      formData.append('categoria_id', categoria_id);
      formData.append('user_id', user_id);
      // Cambia la clave a 'foto' y tipo fijo
      formData.append('foto', {
        uri: foto.uri,
        name: `servicio_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
      const response = await fetch(`${BASE_URL}user-servicio`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });
      // Log respuesta del servidor
      console.log('Respuesta servidor status:', response.status);
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('Respuesta servidor JSON:', data);
        if (response.ok) {
          showAlert('Éxito', 'Servicio creado correctamente', 'success');
          navigation.navigate('ShopDos');
        } else {
          showAlert('Error', data.message || 'No se pudo crear el servicio');
        }
      } else {
        const text = await response.text();
        console.log('Respuesta servidor texto:', text);
        showAlert('Error', 'El servidor devolvió una respuesta inesperada');
      }
    } catch (error) {
      showAlert('Error', 'Ocurrió un error al crear el servicio: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerText}>
              {categoria_nombre ? `Nuevo servicio - ${categoria_nombre}` : 'Nuevo servicio'}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <TouchableOpacity onPress={pickImage} style={styles.imagePickerContainer}>
            {foto ? (
              <Image source={{ uri: foto.uri }} style={styles.productImage} />
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="camera" size={50} color="#fa6205" />
                <Text style={styles.placeholderText}>Toca para seleccionar imagen</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.formContainer}>
            
            <Text style={styles.inputLabel}>Nombre del servicio</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa el nombre"
              placeholderTextColor="#7d7d7d"
              value={nombre}
              onChangeText={setNombre}
            />
            <Text style={styles.inputLabel}>Precio</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa el precio"
              placeholderTextColor="#7d7d7d"
              keyboardType="numeric"
              value={precio}
              onChangeText={setPrecio}
            />
            <Text style={styles.inputLabel}>Tiempo estimado</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa solo numero"
              placeholderTextColor="#7d7d7d"
              value={tiempo}
              onChangeText={setTiempo}
            />
            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Ingresa la descripción"
              placeholderTextColor="#7d7d7d"
              multiline
              numberOfLines={4}
              value={descripcion}
              onChangeText={setDescripcion}
            />
          </View>
          <TouchableOpacity style={styles.myButton} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Guardar Servicio</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <AlertaModal
        visible={alertVisible}
        mensaje={alertData.message}
        onCerrar={() => setAlertVisible(false)}
        titulo={alertData.title}
        tipo={alertData.type}
        onPrimary={alertData.onConfirm}
        primaryLabel={alertData.primaryLabel || "Entendido"}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fa6205', padding: 15, marginTop: 60 },
  headerText: { fontSize: 16, fontWeight: 'bold', color: '#FFF', fontFamily: 'Montserrat_700Bold' },
  imagePickerContainer: { width: '100%', height: 250, marginVertical: 20 },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderContainer: { width: '100%', height: '100%', backgroundColor: '#ECECEC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#fa6205' },
  placeholderText: { marginTop: 10, color: '#1C1C1E', fontFamily: 'Montserrat_400Regular' },
  formContainer: { padding: 15 },
  inputLabel: { fontSize: 16, color: '#1C1C1E', fontFamily: 'Montserrat_700Bold', marginBottom: 5, marginTop: 15 },
  input: { backgroundColor: '#ECECEC', borderRadius: 8, padding: 12, fontSize: 16, color: '#1C1C1E', fontFamily: 'Montserrat_400Regular' },
  myButton: { backgroundColor: '#fa6205', paddingVertical: 14, paddingHorizontal: 60, borderRadius: 15, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, marginVertical: 20, marginBottom: 30 },
  buttonText: { color: '#FFF', fontSize: 20, fontWeight: 'bold', fontFamily: 'Montserrat_700Bold' },
});

export default ServiciosProducto;
