import React, { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Image, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_700Bold, Montserrat_300Light } from '@expo-google-fonts/montserrat';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/url';

const EditarServicio = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { serviceId } = route.params || {};
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_300Light,
  });

  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [tiempo, setTiempo] = useState('');
  const [foto, setFoto] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [perfiles, setPerfiles] = useState([]);
  const [perfilId, setPerfilId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [categoriaNombre, setCategoriaNombre] = useState('');
  const [perfilRelacionado, setPerfilRelacionado] = useState('');

  // Adicionales
  const [adicionales, setAdicionales] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [adicionalEdit, setAdicionalEdit] = useState(null);
  const [adicionalNombre, setAdicionalNombre] = useState('');
  const [adicionalDescripcion, setAdicionalDescripcion] = useState('');
  const [adicionalPrecio, setAdicionalPrecio] = useState('');
  const [adicionalTiempo, setAdicionalTiempo] = useState('');
  const [adicionalFoto, setAdicionalFoto] = useState(null);
  const [adicionalLoading, setAdicionalLoading] = useState(false);

  useEffect(() => {
    (async () => {
      // Cargar datos del servicio
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('userToken');
        if (!token || !serviceId) return;
        const res = await fetch(`${BASE_URL}user-servicio/${serviceId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data && data.data) {
          setNombre(data.data.nombre || '');
          setPrecio(data.data.precio ? String(data.data.precio) : '');
          setTiempo(data.data.tiempo ? String(data.data.tiempo) : '');
          setDescripcion(data.data.descripcion || '');
          setPerfilId(data.data.user_perfil_id ? String(data.data.user_perfil_id) : '');
          setCategoriaId(data.data.categoria_id ? String(data.data.categoria_id) : '');
          setCategoriaNombre(data.data.categoria?.nombre || '');
          if (data.data.foto) {
            setFoto({ uri: `${BASE_URL.toString().replace('/api', '')}/storage/${data.data.foto}` });
          }
        }
      } catch (e) {
        Alert.alert('Error', 'No se pudo cargar el servicio');
      } finally {
        setLoading(false);
      }
      // Cargar perfiles
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const { id: userId } = JSON.parse(userData);
          const token = await AsyncStorage.getItem('userToken');
          const res = await fetch(`${BASE_URL}user-perfil/by-user/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data && Array.isArray(data.data)) setPerfiles(data.data);
          else if (Array.isArray(data)) setPerfiles(data);
          else if (data && data.perfiles) setPerfiles(data.perfiles);
        }
      } catch (e) { }
    })();
  }, [serviceId]);

  // Obtener adicionales del servicio
  const fetchAdicionales = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token || !serviceId) return;
      const res = await fetch(`${BASE_URL}user-servicio-adicional/by-servicio/${serviceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && Array.isArray(data.data)) setAdicionales(data.data);
      else setAdicionales([]);
    } catch (e) { setAdicionales([]); }
  };

  useEffect(() => { fetchAdicionales(); }, [serviceId]);

  // Cuando cargue el servicio o los perfiles, busca el nombre del perfil relacionado
  useEffect(() => {
    if (!perfilId) {
      setPerfilRelacionado('Sin perfil');
      return;
    }
    const perfilObj = perfiles.find(p => String(p.id) === String(perfilId));
    if (perfilObj) {
      setPerfilRelacionado(perfilObj.nombre);
    } else if (perfilId) {
      // Si no está en perfiles, consulta por user-perfil/user_id
      (async () => {
        try {
          const token = await AsyncStorage.getItem('userToken');
          const res = await fetch(`${BASE_URL}user-perfil/${perfilId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data && data.data && data.data.nombre) {
            setPerfilRelacionado(data.data.nombre);
          } else {
            setPerfilRelacionado('Sin perfil');
          }
        } catch {
          setPerfilRelacionado('Sin perfil');
        }
      })();
    }
  }, [perfilId, perfiles]);

  if (!fontsLoaded) return null;

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) setFoto(result.assets[0]);
  };

  const openAdicionalModal = (adicional = null) => {
    if (adicional) {
      setAdicionalEdit(adicional);
      setAdicionalNombre(adicional.nombre);
      setAdicionalDescripcion(adicional.descripcion);
      setAdicionalPrecio(adicional.precio ? String(adicional.precio) : '');
      setAdicionalTiempo(adicional.tiempo ? String(adicional.tiempo) : '');
      setAdicionalFoto(adicional.foto ? { uri: `${BASE_URL.toString().replace('/api', '')}/storage/${adicional.foto}` } : null);
    } else {
      setAdicionalEdit(null);
      setAdicionalNombre('');
      setAdicionalDescripcion('');
      setAdicionalPrecio('');
      setAdicionalTiempo('');
      setAdicionalFoto(null);
    }
    setModalVisible(true);
  };

  const closeAdicionalModal = () => {
    setModalVisible(false);
    setAdicionalEdit(null);
    setAdicionalNombre('');
    setAdicionalDescripcion('');
    setAdicionalPrecio('');
    setAdicionalTiempo('');
    setAdicionalFoto(null);
  };

  const pickAdicionalImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) setAdicionalFoto(result.assets[0]);
  };

  const handleSubmit = async () => {
    if (!nombre || !precio || !tiempo || !descripcion) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'No se encontró el token de autenticación');
        setLoading(false);
        return;
      }
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
      formData.append('user_perfil_id', perfilId);
      formData.append('categoria_id', categoriaId);
      formData.append('user_id', user_id);
      if (foto && foto.uri && !foto.uri.startsWith('http')) {
        formData.append('foto', {
          uri: foto.uri,
          name: `servicio_${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
      }
      const response = await fetch(`${BASE_URL}user-servicio/${serviceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (response.ok) {
          Alert.alert('Éxito', 'Servicio actualizado correctamente');
          navigation.goBack();
        } else {
          Alert.alert('Error', data.message || 'No se pudo actualizar el servicio');
        }
      } else {
        const text = await response.text();
        Alert.alert('Error', 'El servidor devolvió una respuesta inesperada');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al actualizar el servicio: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionalSubmit = async () => {
    if (!adicionalNombre || !adicionalPrecio || !adicionalTiempo) {
      Alert.alert('Error', 'Nombre, precio y tiempo son obligatorios');
      return;
    }
    try {
      setAdicionalLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      formData.append('user_servicio_id', serviceId);
      formData.append('nombre', adicionalNombre);
      formData.append('descripcion', adicionalDescripcion);
      formData.append('precio', adicionalPrecio);
      formData.append('tiempo', adicionalTiempo);
      if (adicionalFoto && adicionalFoto.uri && !adicionalFoto.uri.startsWith('http')) {
        formData.append('file', {
          uri: adicionalFoto.uri,
          name: `adicional_${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
      }
      let url = `${BASE_URL}user-servicio-adicional`;
      let method = 'POST';
      if (adicionalEdit) {
        url = `${BASE_URL}user-servicio-adicional/${adicionalEdit.id}`;
        method = 'POST';
      }
      const response = await fetch(url, {
        method,
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        // Refrescar lista
        const res = await fetch(`${BASE_URL}user-servicio-adicional/by-servicio/${serviceId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const nuevos = await res.json();
        setAdicionales(nuevos.data || []);
        closeAdicionalModal();
      } else {
        Alert.alert('Error', data.message || 'No se pudo guardar el adicional');
      }
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error al guardar el adicional');
    } finally {
      setAdicionalLoading(false);
    }
  };

  const handleDeleteAdicional = async (id) => {
    Alert.alert('Eliminar', '¿Seguro que deseas eliminar este adicional?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            setAdicionalLoading(true);
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${BASE_URL}user-servicio-adicional/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
              setAdicionales(adicionales.filter(a => a.id !== id));
            } else {
              Alert.alert('Error', 'No se pudo eliminar el adicional');
            }
          } catch (e) {
            Alert.alert('Error', 'Ocurrió un error al eliminar el adicional');
          } finally {
            setAdicionalLoading(false);
          }
        }
      }
    ]);
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
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <Text style={styles.headerText}>
              Editar servicio {categoriaNombre ? `- ${categoriaNombre}` : ''}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <TouchableOpacity onPress={pickImage} style={styles.imagePickerContainer}>
            {foto ? (
              <Image source={{ uri: foto.uri }} style={styles.productImage} />
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="camera" size={50} color="#9BFE03" />
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
              placeholder="Ej: 30 min"
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
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.buttonText}>Guardar Cambios</Text>
            )}
          </TouchableOpacity>
          {/* Adicionales del servicio */}
          <View style={{ marginTop: 30, width: "90%", alignItems: "center", alignContent: "center", alignSelf: "center" }}>
            <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Montserrat_700Bold', marginBottom: 10 }}>Adicionales</Text>
            <TouchableOpacity
              style={[styles.myButton, { backgroundColor: '#a4ff00', marginBottom: 15 }]}
              onPress={() => openAdicionalModal()}
            >
              <Text style={{ color: '#000', fontFamily: 'Montserrat_700Bold' }}>Agregar Adicional</Text>
            </TouchableOpacity>
            <Text style={[styles.modalHelperText]}>
              Adicional o para elegir
            </Text>
            {adicionales.length > 0 ? (
              adicionales.map((ad) => (
                <View key={ad.id} style={{ backgroundColor: '#232323', borderRadius: 10, marginBottom: 10, padding: 10, flexDirection: 'row', alignItems: 'center' }}>
                  {ad.file && typeof ad.file === 'string' && ad.file.trim() !== '' ? (
                    <Image
                      source={{
                        uri: ad.file.startsWith('http')
                          ? ad.file
                          : `${BASE_URL.toString().replace('/api', '')}/storage/${ad.file}`
                      }}
                      style={{ width: 60, height: 60, borderRadius: 8, marginRight: 10 }}
                    />
                  ) : (
                    <View style={{ width: 60, height: 60, backgroundColor: '#333', borderRadius: 8, marginRight: 10, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="image-outline" size={30} color="#9BFE03" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontFamily: 'Montserrat_700Bold', fontSize: 15 }}>{ad.nombre}</Text>
                    <Text style={{ color: '#ccc', fontFamily: 'Montserrat_400Regular', fontSize: 12 }}>{ad.descripcion}</Text>
                    <Text style={{ color: '#9BFE03', fontFamily: 'Montserrat_700Bold', fontSize: 14 }}>S/{ad.precio}</Text>
                    <Text style={{ color: '#aaa', fontFamily: 'Montserrat_400Regular', fontSize: 12 }}>Tiempo: {ad.tiempo} min</Text>
                  </View>
                  <TouchableOpacity onPress={() => openAdicionalModal(ad)} style={{ marginRight: 10 }}>
                    <Ionicons name="pencil" size={20} color="#9BFE03" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteAdicional(ad.id)}>
                    <Ionicons name="trash" size={20} color="#ff4d4d" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={{ color: '#aaa', textAlign: 'center', fontFamily: 'Montserrat_400Regular' }}>No hay adicionales para este servicio</Text>
            )}
          </View>

          {/* Modal para crear/editar adicional */}
          {modalVisible && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
              <View style={{ backgroundColor: '#232323', borderRadius: 15, padding: 20, width: '90%' }}>
                <Text style={{ color: '#fff', fontFamily: 'Montserrat_700Bold', fontSize: 18, marginBottom: 10 }}>{adicionalEdit ? 'Editar' : 'Agregar'} Adicional</Text>
                <TouchableOpacity onPress={pickAdicionalImage} style={{ alignSelf: 'center', marginBottom: 10 }}>
                  {adicionalFoto ? (
                    <Image source={{ uri: adicionalFoto.uri }} style={{ width: 80, height: 80, borderRadius: 10 }} />
                  ) : (
                    <View style={{ width: 80, height: 80, backgroundColor: '#2a2a2a', borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="camera" size={32} color="#9BFE03" />
                    </View>
                  )}
                </TouchableOpacity>
                <TextInput style={[styles.input, { marginBottom: 8, fontFamily: 'Montserrat_400Regular' }]} placeholder="Nombre" placeholderTextColor="#7d7d7d" value={adicionalNombre} onChangeText={setAdicionalNombre} />
                <TextInput style={[styles.input, { marginBottom: 8, fontFamily: 'Montserrat_400Regular' }]} placeholder="Descripción" placeholderTextColor="#7d7d7d" value={adicionalDescripcion} onChangeText={setAdicionalDescripcion} />
                <TextInput style={[styles.input, { marginBottom: 8, fontFamily: 'Montserrat_400Regular' }]} placeholder="Precio" placeholderTextColor="#7d7d7d" value={adicionalPrecio} onChangeText={setAdicionalPrecio} keyboardType="numeric" />
                <TextInput style={[styles.input, { marginBottom: 8, fontFamily: 'Montserrat_400Regular' }]} placeholder="Tiempo" placeholderTextColor="#7d7d7d" value={adicionalTiempo} onChangeText={setAdicionalTiempo} />
                <Text style={styles.modalHelperText}>
                  Si deseas que el adicional sea gratis, asigna el valor 0.
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                  <TouchableOpacity onPress={closeAdicionalModal} style={{ backgroundColor: '#444', padding: 10, borderRadius: 8, minWidth: 90, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontFamily: 'Montserrat_700Bold' }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAdicionalSubmit} style={{ backgroundColor: '#a4ff00', padding: 10, borderRadius: 8, minWidth: 90, alignItems: 'center' }} disabled={adicionalLoading}>
                    {adicionalLoading ? <ActivityIndicator size="small" color="#000" /> : <Text style={{ color: '#000', fontFamily: 'Montserrat_700Bold' }}>{adicionalEdit ? 'Guardar' : 'Crear'}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

import { Picker } from '@react-native-picker/picker';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1c1c1c' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#a4ff00', padding: 15, marginTop: 60 },
  headerText: { fontSize: 16, fontWeight: 'bold', color: 'black', fontFamily: 'Montserrat_700Bold' },
  imagePickerContainer: { width: '100%', height: 250, marginVertical: 20 },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderContainer: { width: '100%', height: '100%', backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#9BFE03' },
  placeholderText: { marginTop: 10, color: '#fff', fontFamily: 'Montserrat_400Regular' },
  formContainer: { padding: 15 },
  inputLabel: { fontSize: 16, color: 'white', fontFamily: 'Montserrat_700Bold', marginBottom: 5, marginTop: 15 },
  input: { backgroundColor: '#2a2a2a', borderRadius: 8, padding: 12, fontSize: 16, color: 'white', fontFamily: 'Montserrat_400Regular' },
  selectContainer: { backgroundColor: '#2a2a2a', borderRadius: 8, marginBottom: 10 },
  picker: { color: 'white' },
  myButton: { backgroundColor: '#39FF14', paddingVertical: 14, paddingHorizontal: 60, borderRadius: 15, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, marginVertical: 20, marginBottom: 30 },
  buttonText: { color: '#000', fontSize: 20, fontWeight: 'bold', fontFamily: 'Montserrat_700Bold' },
  adicionalesContainer: { padding: 15, marginTop: 20 },
  adicionalesHeader: { fontSize: 18, fontWeight: 'bold', color: 'white', fontFamily: 'Montserrat_700Bold', marginBottom: 10 },
  addAdicionalButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#39FF14', padding: 10, borderRadius: 8, marginBottom: 10 },
  addAdicionalText: { color: '#000', fontSize: 16, fontWeight: 'bold', fontFamily: 'Montserrat_700Bold', marginLeft: 5 },
  adicionalesList: { backgroundColor: '#2a2a2a', borderRadius: 8, padding: 10 },
  adicionalItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3a3a3a', borderRadius: 8, padding: 10, marginBottom: 10 },
  adicionalImage: { width: 60, height: 60, borderRadius: 8, marginRight: 10 },
  adicionalInfo: { flex: 1 },
  adicionalNombre: { color: 'white', fontSize: 16, fontWeight: 'bold', fontFamily: 'Montserrat_700Bold' },
  adicionalDescripcion: { color: '#ccc', fontSize: 14, fontFamily: 'Montserrat_400Regular' },
  adicionalPrecio: { color: '#9BFE03', fontSize: 16, fontWeight: 'bold', fontFamily: 'Montserrat_700Bold' },
  adicionalTiempo: { color: '#fff', fontSize: 14, fontFamily: 'Montserrat_400Regular' },
  editAdicionalButton: { padding: 10 },
  deleteAdicionalButton: { padding: 10 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', backgroundColor: '#1c1c1c', borderRadius: 8, padding: 20 },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', fontFamily: 'Montserrat_700Bold', marginBottom: 15 },
  adicionalImagePicker: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  adicionalImagePreview: { width: '100%', height: '100%', borderRadius: 8, resizeMode: 'cover' },
  adicionalPlaceholder: { width: '100%', height: '100%', backgroundColor: '#3a3a3a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#9BFE03' },
  closeModalButton: { marginTop: 10, alignItems: 'center' },
  closeModalText: { color: '#9BFE03', fontSize: 16, fontWeight: 'bold', fontFamily: 'Montserrat_700Bold' },
  modalHelperText: {
    fontSize: 13,
    color: '#7d7d7d', // Un color gris suave, similar al placeholder
    marginTop: 5,      // Un pequeño espacio después del input de precio
    marginBottom: 10,  // Espacio antes de que empiecen los botones
    textAlign: 'left', // O 'center' si prefieres
    // Si tus inputs tienen un padding/margin horizontal, 
    // puedes agregarlo aquí también para que se alinee.
    // Ejemplo: paddingHorizontal: 10 
  }
});

export default EditarServicio;
