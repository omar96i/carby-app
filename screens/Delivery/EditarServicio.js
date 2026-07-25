import React, { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Image, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_300Light } from '@expo-google-fonts/montserrat';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/url';
import AlertaModal from "../../components/ErrorModal";

const EditarServicio = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { serviceId } = route.params || {};
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
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
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

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
        showAlert('No se pudo cargar el servicio', 'error');
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
      showAlert('Todos los campos son obligatorios', 'error');
      return;
    }
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showAlert('No se encontró el token de autenticación', 'error');
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
          showAlert('Servicio actualizado correctamente', 'success');
          navigation.goBack();
        } else {
          showAlert(data.message || 'No se pudo actualizar el servicio', 'error');
        }
      } else {
        const text = await response.text();
        showAlert('El servidor devolvió una respuesta inesperada', 'error');
      }
    } catch (error) {
      showAlert('Ocurrió un error al actualizar el servicio: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionalSubmit = async () => {
    if (!adicionalNombre || !adicionalPrecio || !adicionalTiempo) {
      showAlert('Nombre, precio y tiempo son obligatorios', 'error');
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
        showAlert(data.message || 'No se pudo guardar el adicional', 'error');
      }
    } catch (e) {
      showAlert('Ocurrió un error al guardar el adicional', 'error');
    } finally {
      setAdicionalLoading(false);
    }
  };

  const handleDeleteAdicional = async (id) => {
    showAlert('¿Seguro que deseas eliminar este adicional?', 'confirm', async () => {
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
          showAlert('No se pudo eliminar el adicional', 'error');
        }
      } catch (e) {
        showAlert('Ocurrió un error al eliminar el adicional', 'error');
      } finally {
        setAdicionalLoading(false);
      }
    }, 'Eliminar');
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
            <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerText}>
              Editar servicio {categoriaNombre ? `- ${categoriaNombre}` : ''}
            </Text>
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
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Guardar Cambios</Text>
            )}
          </TouchableOpacity>
          {/* Adicionales del servicio */}
          <View style={styles.adicionalesContainer}>
            <Text style={styles.adicionalesHeader}>Adicionales</Text>
            <TouchableOpacity
              style={styles.addAdicionalButton}
              onPress={() => openAdicionalModal()}
            >
              <Ionicons name="add-circle" size={22} color="#FFF" />
              <Text style={styles.addAdicionalText}>Agregar Adicional</Text>
            </TouchableOpacity>
            <Text style={styles.modalHelperText}>Adicional o para elegir</Text>
            {adicionales.length > 0 ? (
              adicionales.map((ad) => (
                <View key={ad.id} style={styles.adicionalItem}>
                  {ad.file && typeof ad.file === 'string' && ad.file.trim() !== '' ? (
                    <Image
                      source={{
                        uri: ad.file.startsWith('http')
                          ? ad.file
                          : `${BASE_URL.toString().replace('/api', '')}/storage/${ad.file}`
                      }}
                      style={styles.adicionalImage}
                    />
                  ) : (
                    <View style={[styles.adicionalImage, { backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="image-outline" size={28} color="#fa6205" />
                    </View>
                  )}
                  <View style={styles.adicionalInfo}>
                    <Text style={styles.adicionalNombre}>{ad.nombre}</Text>
                    <Text style={styles.adicionalDescripcion}>{ad.descripcion}</Text>
                    <Text style={styles.adicionalPrecio}>$ {ad.precio}</Text>
                    <Text style={styles.adicionalTiempo}>Tiempo: {ad.tiempo} min</Text>
                  </View>
                  <TouchableOpacity onPress={() => openAdicionalModal(ad)} style={styles.editAdicionalButton}>
                    <Ionicons name="pencil" size={18} color="#fa6205" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteAdicional(ad.id)} style={styles.deleteAdicionalButton}>
                    <Ionicons name="trash" size={18} color="#ff4d4d" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={{ color: '#aaa', textAlign: 'center', fontFamily: 'Montserrat_400Regular' }}>No hay adicionales para este servicio</Text>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal para crear/editar adicional */}
      <Modal transparent visible={modalVisible} animationType="slide" onRequestClose={closeAdicionalModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{adicionalEdit ? 'Editar' : 'Agregar'} Adicional</Text>
            <TouchableOpacity onPress={pickAdicionalImage} style={{ alignSelf: 'center', marginBottom: 16 }}>
              {adicionalFoto ? (
                <Image source={{ uri: adicionalFoto.uri }} style={{ width: 100, height: 100, borderRadius: 14 }} />
              ) : (
                <View style={{ width: 100, height: 100, backgroundColor: '#F5F0E8', borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#E8E2D8' }}>
                  <Ionicons name="camera" size={32} color="#fa6205" />
                </View>
              )}
            </TouchableOpacity>
            <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor="#999" value={adicionalNombre} onChangeText={setAdicionalNombre} />
            <TextInput style={[styles.input, { marginTop: 12 }]} placeholder="Descripción" placeholderTextColor="#999" value={adicionalDescripcion} onChangeText={setAdicionalDescripcion} />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Precio" placeholderTextColor="#999" value={adicionalPrecio} onChangeText={setAdicionalPrecio} keyboardType="numeric" />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Tiempo (min)" placeholderTextColor="#999" value={adicionalTiempo} onChangeText={setAdicionalTiempo} keyboardType="numeric" />
            </View>
            <Text style={styles.modalHelperText}>
              Si deseas que el adicional sea gratis, asigna el valor 0.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={closeAdicionalModal} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAdicionalSubmit} style={styles.modalPrimaryBtn} disabled={adicionalLoading}>
                {adicionalLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.modalPrimaryBtnText}>{adicionalEdit ? 'Guardar' : 'Crear'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <AlertaModal
        visible={alertVisible}
        mensaje={alertData.message}
        tipo={alertData.type}
        onCerrar={() => setAlertVisible(false)}
        onPrimary={alertData.onPrimary}
        primaryLabel={alertData.primaryLabel}
      />
    </View>
  );
};

import { Picker } from '@react-native-picker/picker';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fa6205',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === "android" ? 40 : 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1,
  },
  headerText: {
    fontSize: 17,
    color: '#FFF',
    fontFamily: 'Montserrat_700Bold',
    marginLeft: 12,
    flex: 1,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerContainer: { width: '100%', height: 240 },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomStyle: 'dashed',
    borderBottomColor: '#fa6205',
  },
  placeholderText: { marginTop: 10, color: '#888', fontFamily: 'Montserrat_500Medium', fontSize: 14 },
  formContainer: { paddingHorizontal: 16, paddingTop: 8 },
  inputLabel: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F5F0E8',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1C1C1E',
    fontFamily: 'Montserrat_400Regular',
  },
  selectContainer: { backgroundColor: '#F5F0E8', borderRadius: 12, marginBottom: 10 },
  picker: { color: '#1C1C1E' },
  myButton: {
    backgroundColor: '#fa6205',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#fa6205',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginVertical: 24,
  },
  buttonText: { color: '#FFF', fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  adicionalesContainer: { paddingHorizontal: 16, marginTop: 24 },
  adicionalesHeader: { fontSize: 18, fontFamily: 'Montserrat_700Bold', color: '#1C1C1E', marginBottom: 12 },
  addAdicionalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#fa6205',
    borderStyle: 'dashed',
  },
  addAdicionalText: { color: '#fa6205', fontSize: 15, fontFamily: 'Montserrat_700Bold', marginLeft: 8 },
  adicionalesList: { borderRadius: 8, padding: 10 },
  adicionalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  adicionalImage: { width: 72, height: 72, borderRadius: 14, marginRight: 12 },
  adicionalInfo: { flex: 1 },
  adicionalNombre: { color: '#1C1C1E', fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  adicionalDescripcion: { color: '#888', fontSize: 12, fontFamily: 'Montserrat_400Regular', marginTop: 2 },
  adicionalPrecio: { color: '#fa6205', fontSize: 14, fontFamily: 'Montserrat_700Bold', marginTop: 4 },
  adicionalTiempo: { color: '#aaa', fontSize: 12, fontFamily: 'Montserrat_400Regular' },
  editAdicionalButton: { padding: 8, marginRight: 6 },
  deleteAdicionalButton: { padding: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: { color: '#1C1C1E', fontSize: 18, fontFamily: 'Montserrat_700Bold', marginBottom: 16 },
  adicionalImagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#E8E2D8',
  },
  adicionalImagePreview: { width: '100%', height: '100%', borderRadius: 12, resizeMode: 'cover' },
  adicionalPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#E8E2D8',
    borderRadius: 12,
  },
  closeModalButton: { marginTop: 10, alignItems: 'center' },
  closeModalText: { color: '#fa6205', fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCancelBtnText: { color: '#1C1C1E', fontFamily: 'Montserrat_700Bold', fontSize: 15 },
  modalPrimaryBtn: {
    flex: 1,
    backgroundColor: '#fa6205',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#fa6205',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalPrimaryBtnText: { color: '#FFF', fontFamily: 'Montserrat_700Bold', fontSize: 15 },
  modalHelperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginBottom: 12,
    textAlign: 'left',
    fontFamily: 'Montserrat_400Regular',
  },
});

export default EditarServicio;
