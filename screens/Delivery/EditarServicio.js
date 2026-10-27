import React, { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Image, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal, Alert, Switch } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from "../../components/ScreenHeader";
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_300Light, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/url';
import AlertaModal from "../../components/ErrorModal";
import { useAlturaTecladoAndroid } from "../../hooks/useAlturaTecladoAndroid";

const EditarServicio = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { serviceId } = route.params || {};
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_300Light,
    Montserrat_800ExtraBold,
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
  const [descuento, setDescuento] = useState('');
  const [activoDescuento, setActivoDescuento] = useState(false);
  const [rangoPrecios, setRangoPrecios] = useState({ min: null, max: null });

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
  const alturaTeclado = useAlturaTecladoAndroid();

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
          setDescuento(data.data.descuento ? String(data.data.descuento) : '');
          setActivoDescuento(data.data.activo_descuento === 1 || data.data.activo_descuento === true);
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
          const [perfRes, statusRes] = await Promise.all([
            fetch(`${BASE_URL}user-perfil/by-user/${userId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${BASE_URL}comercio/setup-status`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => null),
          ]);
          const data = await perfRes.json();
          if (data && Array.isArray(data.data)) setPerfiles(data.data);
          else if (Array.isArray(data)) setPerfiles(data);
          else if (data && data.perfiles) setPerfiles(data.perfiles);
          try {
            const sd = await statusRes?.json();
            if (sd?.data?.rango_precios) setRangoPrecios(sd.data.rango_precios);
          } catch {}
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
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled && result.assets?.[0]) setAdicionalFoto(result.assets[0]);
    } catch (e) {
      console.error("Error al elegir la foto del adicional:", e);
      showAlert('No se pudo abrir la galería. Intenta de nuevo.', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!nombre || !precio || !tiempo) {
      showAlert('Nombre, precio y tiempo son obligatorios (la descripción es opcional)', 'error');
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
      if (descripcion?.trim()) formData.append('descripcion', descripcion.trim());
      formData.append('user_perfil_id', perfilId);
      formData.append('categoria_id', categoriaId);
      formData.append('user_id', user_id);
      if (descuento) formData.append('descuento', descuento);
      formData.append('activo_descuento', activoDescuento ? '1' : '0');
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

  const precioNum = parseFloat(String(precio || "").replace(/[^\d.]/g, "")) || 0;
  const descuentoNum = parseFloat(String(descuento || "").replace(/[^\d.]/g, "")) || 0;
  const precioFinal = Math.max(0, precioNum - descuentoNum);

  return (
    <SafeAreaView style={ep.screen} edges={['top', 'left', 'right']}>
      <View style={[ep.root, { marginBottom: alturaTeclado }]}>
        <View style={ep.topBar}>
          <TouchableOpacity style={ep.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={ep.topTitle}>Editar servicio</Text>
          <View style={ep.backBtnEspacio} />
        </View>

        <ScrollView contentContainerStyle={ep.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={pickImage} style={ep.foto} activeOpacity={0.85}>
            {foto ? (
              <>
                <Image source={{ uri: foto.uri }} style={ep.fotoImg} />
                <View style={ep.fotoChip}>
                  <Ionicons name="camera" size={14} color="#FFF" />
                  <Text style={ep.fotoChipText}>Cambiar foto</Text>
                </View>
              </>
            ) : (
              <View style={ep.fotoVacia}>
                <View style={ep.fotoIcon}>
                  <Ionicons name="camera" size={24} color="#fa6205" />
                </View>
                <Text style={ep.fotoVaciaText}>Toca para cambiar imagen</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={ep.card}>
            <Text style={ep.cardTitulo}>Información</Text>
            <Text style={ep.label}>Nombre del servicio</Text>
            <TextInput style={ep.input} placeholder="Ingresa el nombre" placeholderTextColor="#A1A1AA" value={nombre} onChangeText={setNombre} />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 3 }}>
                <Text style={ep.label}>Precio</Text>
                <View style={ep.precioBox}>
                  <Text style={ep.precioSigno}>$</Text>
                  <TextInput style={ep.precioInput} placeholder="Ingresa el precio" placeholderTextColor="#A1A1AA" keyboardType="numeric" value={precio} onChangeText={setPrecio} />
                </View>
              </View>
              <View style={{ flex: 2 }}>
                <Text style={ep.label}>Tiempo estimado</Text>
                <View style={ep.precioBox}>
                  <Ionicons name="time-outline" size={17} color="#71717A" style={{ marginRight: 6 }} />
                  <TextInput style={ep.precioInput} placeholder="Ej: 30 min" placeholderTextColor="#A1A1AA" value={tiempo} onChangeText={setTiempo} />
                </View>
              </View>
            </View>
            {rangoPrecios?.min != null && rangoPrecios?.max != null ? (
              <View style={ep.rangeRow}>
                <Ionicons name="pricetag-outline" size={13} color="#71717A" />
                <Text style={ep.rangeText}>
                  Rango permitido: $ {Number(rangoPrecios.min).toLocaleString("es-CO")} – $ {Number(rangoPrecios.max).toLocaleString("es-CO")}
                </Text>
              </View>
            ) : null}

            <Text style={ep.label}>Descripción <Text style={ep.opcional}>(opcional)</Text></Text>
            <TextInput style={[ep.input, ep.inputMulti]} placeholder="Ingresa la descripción (opcional)" placeholderTextColor="#A1A1AA" multiline numberOfLines={4} value={descripcion} onChangeText={setDescripcion} />
          </View>

          <View style={ep.card}>
            <View style={ep.descTop}>
              <View style={[ep.descIcon, activoDescuento && ep.descIconOn]}>
                <Ionicons name="pricetags" size={17} color={activoDescuento ? "#FFF" : "#fa6205"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ep.cardTitulo}>Descuento</Text>
                <Text style={ep.descSub}>{activoDescuento ? "DTO Activo" : "Activar DTO"}</Text>
              </View>
              <Switch value={activoDescuento} onValueChange={setActivoDescuento} trackColor={{ false: "#E4E4E7", true: "#fa6205" }} thumbColor="#FFF" />
            </View>
            <Text style={ep.label}>Descuento ($)</Text>
            <View style={ep.precioBox}>
              <Text style={ep.precioSigno}>− $</Text>
              <TextInput style={ep.precioInput} placeholder="0" placeholderTextColor="#A1A1AA" keyboardType="numeric" value={descuento} onChangeText={setDescuento} />
            </View>
            {activoDescuento && precioNum > 0 && descuentoNum > 0 && (
              <Text style={ep.descResultado}>
                El cliente paga <Text style={ep.descFinal}>$ {Math.round(precioFinal).toLocaleString("es-CO")}</Text> en vez de $ {Math.round(precioNum).toLocaleString("es-CO")}
              </Text>
            )}
          </View>

          <View style={ep.card}>
            <View style={ep.adHead}>
              <View style={{ flex: 1 }}>
                <Text style={ep.cardTitulo}>Adicionales</Text>
                <Text style={ep.descSub}>Adicional o para elegir</Text>
              </View>
              <TouchableOpacity style={ep.adAgregar} onPress={() => openAdicionalModal()} activeOpacity={0.85}>
                <Ionicons name="add" size={17} color="#FFF" />
                <Text style={ep.adAgregarText}>Agregar</Text>
              </TouchableOpacity>
            </View>
            {adicionales.length > 0 ? (
              adicionales.map((ad) => (
                <View key={ad.id} style={ep.adRow}>
                  {ad.file && typeof ad.file === 'string' && ad.file.trim() !== '' ? (
                    <Image source={{ uri: ad.file.startsWith('http') ? ad.file : `${BASE_URL.toString().replace('/api', '')}/storage/${ad.file}` }} style={ep.adThumb} />
                  ) : (
                    <View style={[ep.adThumb, ep.adThumbVacia]}>
                      <Ionicons name="image-outline" size={18} color="#A1A1AA" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={ep.adNombre} numberOfLines={1}>{ad.nombre}</Text>
                    {!!ad.descripcion && <Text style={ep.adDesc} numberOfLines={2}>{ad.descripcion}</Text>}
                    <Text style={ep.adPrecio}>
                      +$ {Number(ad.precio).toLocaleString("es-CO")}  <Text style={ep.adMeta}>· Tiempo: {ad.tiempo} min</Text>
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => openAdicionalModal(ad)} style={ep.adBtn} activeOpacity={0.7}>
                    <Ionicons name="create-outline" size={17} color="#1C1C1E" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteAdicional(ad.id)} style={[ep.adBtn, ep.adBtnRojo]} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <TouchableOpacity style={ep.adVacio} onPress={() => openAdicionalModal()} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={24} color="#fa6205" />
                <Text style={ep.adVacioText}>No hay adicionales para este servicio</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <View style={[ep.footer, { paddingBottom: (alturaTeclado ? 0 : insets.bottom) + 12 }]}>
          <TouchableOpacity style={[ep.guardar, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={ep.guardarText}>Guardar Cambios</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal para crear/editar adicional */}
      <Modal transparent visible={modalVisible} animationType="slide" onRequestClose={closeAdicionalModal} statusBarTranslucent>
        <View style={ep.sheetBg}>
          <View style={{ flex: 1 }} />
          <View style={[ep.sheet, { marginBottom: alturaTeclado, paddingBottom: (alturaTeclado ? 0 : insets.bottom) + 16 }]}>
            <View style={ep.grabber} />
            <View style={ep.sheetHead}>
              <Text style={ep.sheetTitle}>{adicionalEdit ? 'Editar' : 'Agregar'} Adicional</Text>
              <TouchableOpacity style={ep.sheetClose} onPress={closeAdicionalModal}>
                <Ionicons name="close" size={20} color="#1C1C1E" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={ep.sheetTop}>
                <TouchableOpacity onPress={pickAdicionalImage} style={[ep.sheetFoto, adicionalFoto && ep.sheetFotoLlena]} activeOpacity={0.8}>
                  {adicionalFoto ? (
                    <Image source={{ uri: adicionalFoto.uri }} style={ep.fotoImg} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={22} color="#fa6205" />
                      <Text style={ep.sheetFotoText}>Foto</Text>
                    </>
                  )}
                </TouchableOpacity>
                <View style={{ flex: 1, gap: 8 }}>
                  <TextInput style={ep.input} placeholder="Nombre" placeholderTextColor="#A1A1AA" value={adicionalNombre} onChangeText={setAdicionalNombre} />
                  <TextInput style={ep.input} placeholder="Descripción" placeholderTextColor="#A1A1AA" value={adicionalDescripcion} onChangeText={setAdicionalDescripcion} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={[ep.precioBox, { flex: 1 }]}>
                  <Text style={ep.precioSigno}>+ $</Text>
                  <TextInput style={ep.precioInput} placeholder="Precio" placeholderTextColor="#A1A1AA" value={adicionalPrecio} onChangeText={setAdicionalPrecio} keyboardType="numeric" />
                </View>
                <View style={[ep.precioBox, { flex: 1 }]}>
                  <Ionicons name="time-outline" size={17} color="#71717A" style={{ marginRight: 6 }} />
                  <TextInput style={ep.precioInput} placeholder="Tiempo (min)" placeholderTextColor="#A1A1AA" value={adicionalTiempo} onChangeText={setAdicionalTiempo} keyboardType="numeric" />
                </View>
              </View>
              <Text style={ep.sheetHelper}>Si deseas que el adicional sea gratis, asigna el valor 0.</Text>

              <View style={ep.sheetBtns}>
                <TouchableOpacity onPress={closeAdicionalModal} style={ep.sheetCancel} activeOpacity={0.8}>
                  <Text style={ep.sheetCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAdicionalSubmit} style={ep.sheetOk} disabled={adicionalLoading} activeOpacity={0.85}>
                  {adicionalLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={ep.sheetOkText}>{adicionalEdit ? 'Guardar' : 'Crear'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <AlertaModal
        visible={alertVisible}
        mensaje={alertData.message}
        tipo={alertData.type}
        onCerrar={() => setAlertVisible(false)}
        onPrimary={alertData.onPrimary ? () => { setAlertVisible(false); alertData.onPrimary(); } : undefined}
        primaryLabel={alertData.primaryLabel}
      />
    </SafeAreaView>
  );
};

import { Picker } from '@react-native-picker/picker';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F5' },
  imagePicker: { marginHorizontal: 16, marginTop: 20, height: 180, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E8E8ED' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#DDD', borderStyle: 'dashed', borderRadius: 16, gap: 6 },
  imagePlaceholderText: { fontSize: 13, fontFamily: 'Montserrat_600SemiBold', color: '#BBB' },
  formContainer: { padding: 16 },
  inputLabel: { fontSize: 13, fontFamily: 'Montserrat_700Bold', color: '#1C1C1E', marginBottom: 6, marginTop: 14 },
  rangeText: { fontSize: 11, fontFamily: 'Montserrat_600SemiBold', color: '#fa6205', marginTop: 4 },
  input: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E8E8ED', padding: 14, fontSize: 14, fontFamily: 'Montserrat_400Regular', color: '#1C1C1E' },
  myButton: {
    backgroundColor: '#fa6205', marginHorizontal: 16, paddingVertical: 16, borderRadius: 20, alignItems: 'center',
    shadowColor: '#fa6205', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, marginTop: 20,
  },
  buttonText: { color: '#FFF', fontSize: 16, fontFamily: 'Montserrat_800ExtraBold' },
  adicionalesContainer: { padding: 16, marginTop: 8 },
  adicionalesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  adicionalesTitle: { fontSize: 18, fontFamily: 'Montserrat_800ExtraBold', color: '#1C1C1E' },
  addAdicionalButton: { backgroundColor: '#fa6205', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6 },
  addAdicionalText: { color: '#FFF', fontFamily: 'Montserrat_700Bold', fontSize: 13 },
  adicionalHelperText: { fontSize: 12, fontFamily: 'Montserrat_400Regular', color: '#999', marginBottom: 14 },
  noAdicionalesText: { color: '#999', textAlign: 'center', padding: 20, fontFamily: 'Montserrat_400Regular' },
  adicionalItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F0F0F0', gap: 10 },
  adicionalImage: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#F4F4F5' },
  adicionalImagePlaceholder: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#F4F4F5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', borderStyle: 'dashed' },
  adicionalInfo: { flex: 1 },
  adicionalNombre: { fontSize: 14, fontFamily: 'Montserrat_700Bold', color: '#1C1C1E', marginBottom: 2 },
  adicionalDescripcion: { fontSize: 12, fontFamily: 'Montserrat_400Regular', color: '#71717A', marginBottom: 2 },
  adicionalPrecio: { fontSize: 13, fontFamily: 'Montserrat_800ExtraBold', color: '#fa6205' },
  adicionalTiempo: { fontSize: 11, fontFamily: 'Montserrat_400Regular', color: '#999' },
  adicionalEditBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F4F4F5', justifyContent: 'center', alignItems: 'center' },
  adicionalDeleteBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { width: '90%', backgroundColor: '#FFF', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontFamily: 'Montserrat_800ExtraBold', color: '#1C1C1E', marginBottom: 16 },
  modalCancelBtn: { flex: 1, backgroundColor: '#F4F4F5', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalCancelBtnText: { fontSize: 15, fontFamily: 'Montserrat_700Bold', color: '#71717A' },
  modalPrimaryBtn: { flex: 1, backgroundColor: '#fa6205', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalPrimaryBtnText: { fontSize: 15, fontFamily: 'Montserrat_800ExtraBold', color: '#FFF' },
  modalHelperText: { fontSize: 12, fontFamily: 'Montserrat_400Regular', color: '#999', marginTop: 4, marginBottom: 12 },
});

const edToggle = StyleSheet.create({
  toggleBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#F4F4F5", alignItems: "center" },
  toggleText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#71717A" },
});


const ep = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F5" },
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  backBtnEspacio: { width: 40 },
  topTitle: { fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E" },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },

  foto: { height: 210, borderRadius: 24, overflow: "hidden", backgroundColor: "#FFF", marginTop: 4 },
  fotoImg: { width: "100%", height: "100%" },
  fotoVacia: { flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#E4E4E7", borderStyle: "dashed", borderRadius: 24 },
  fotoIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#FFF0E5", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  fotoVaciaText: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: "#1C1C1E" },
  fotoChip: { position: "absolute", left: 12, bottom: 12, flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.6)" },
  fotoChipText: { fontSize: 12, fontFamily: "Montserrat_700Bold", color: "#FFF" },

  card: { backgroundColor: "#FFF", borderRadius: 24, padding: 16, marginTop: 14 },
  cardTitulo: { fontSize: 15.5, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E" },
  label: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: "#1C1C1E", marginTop: 14, marginBottom: 8 },
  opcional: { fontFamily: "Montserrat_400Regular", color: "#71717A" },
  input: { backgroundColor: "#F4F4F5", height: 50, borderRadius: 16, paddingHorizontal: 16, fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: "#1C1C1E" },
  inputMulti: { height: 100, paddingTop: 14, paddingBottom: 14, textAlignVertical: "top" },
  precioBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F4F4F5", height: 50, borderRadius: 16, paddingHorizontal: 16 },
  precioSigno: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: "#71717A", marginRight: 6 },
  precioInput: { flex: 1, height: "100%", fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E", padding: 0 },
  rangeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, marginLeft: 2 },
  rangeText: { fontSize: 11.5, fontFamily: "Montserrat_600SemiBold", color: "#71717A" },

  descTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  descIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFF0E5", alignItems: "center", justifyContent: "center" },
  descIconOn: { backgroundColor: "#fa6205" },
  descSub: { fontSize: 11.5, fontFamily: "Montserrat_400Regular", color: "#71717A", marginTop: 2 },
  descResultado: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: "#71717A", marginTop: 10, marginLeft: 2 },
  descFinal: { fontFamily: "Montserrat_800ExtraBold", color: "#10B981" },

  adHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  adAgregar: { flexDirection: "row", alignItems: "center", gap: 4, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: "#fa6205" },
  adAgregarText: { fontSize: 12.5, fontFamily: "Montserrat_700Bold", color: "#FFF" },
  adRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F4F4F5", borderRadius: 18, padding: 10, marginTop: 10 },
  adThumb: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#FFF" },
  adThumbVacia: { alignItems: "center", justifyContent: "center" },
  adNombre: { fontSize: 13.5, fontFamily: "Montserrat_700Bold", color: "#1C1C1E" },
  adDesc: { fontSize: 11.5, fontFamily: "Montserrat_400Regular", color: "#71717A", marginTop: 1 },
  adPrecio: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: "#fa6205", marginTop: 3 },
  adMeta: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: "#71717A" },
  adBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  adBtnRojo: { backgroundColor: "#FEF2F2" },
  adVacio: { alignItems: "center", paddingVertical: 18, marginTop: 10, borderRadius: 18, borderWidth: 1.5, borderColor: "#FDD0A5", borderStyle: "dashed" },
  adVacioText: { fontSize: 12.5, fontFamily: "Montserrat_600SemiBold", color: "#71717A", marginTop: 6, textAlign: "center", paddingHorizontal: 16 },

  footer: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: "#F4F4F5" },
  guardar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 54, borderRadius: 27, backgroundColor: "#fa6205",
    shadowColor: "#fa6205", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  guardarText: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#FFF" },

  sheetBg: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, maxHeight: "88%" },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: "#E4E4E7", alignSelf: "center", marginBottom: 12 },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E" },
  sheetClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F4F4F5", alignItems: "center", justifyContent: "center" },
  sheetTop: { flexDirection: "row", gap: 10 },
  sheetFoto: { width: 108, height: 108, borderRadius: 18, backgroundColor: "#FFFAF5", borderWidth: 1.5, borderColor: "#FDD0A5", borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  sheetFotoLlena: { borderWidth: 0 },
  sheetFotoText: { fontSize: 11.5, fontFamily: "Montserrat_700Bold", color: "#fa6205", marginTop: 4, textAlign: "center", paddingHorizontal: 8 },
  sheetHelper: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: "#71717A", marginTop: 10 },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 18 },
  sheetCancel: { flex: 1, height: 50, borderRadius: 25, backgroundColor: "#F4F4F5", alignItems: "center", justifyContent: "center" },
  sheetCancelText: { fontSize: 14.5, fontFamily: "Montserrat_700Bold", color: "#1C1C1E" },
  sheetOk: { flex: 1, height: 50, borderRadius: 25, backgroundColor: "#fa6205", alignItems: "center", justifyContent: "center" },
  sheetOkText: { fontSize: 14.5, fontFamily: "Montserrat_700Bold", color: "#FFF" },
});

export default EditarServicio;
