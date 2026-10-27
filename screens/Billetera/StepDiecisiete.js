import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../../constants/url';
import nombreRol from '../../utils/nombreRol';
import AlertaModal from '../../components/ErrorModal';
import { useAlturaTecladoAndroid } from '../../hooks/useAlturaTecladoAndroid';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';
import { useFonts } from 'expo-font';

export default function StepDiecisiete() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const tecladoAndroid = useAlturaTecladoAndroid();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [inputFocus, setInputFocus] = useState(false);
  const [fotoLocal, setFotoLocal] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [alertType, setAlertType] = useState('error');
  const [alertPrimary, setAlertPrimary] = useState(null);
  const [alertLabel, setAlertLabel] = useState('Entendido');

  const showAlert = (msg, type = 'error', onPrimary = null, label = 'Entendido') => {
    setAlertMsg(msg);
    setAlertType(type);
    setAlertPrimary(() => onPrimary);
    setAlertLabel(label);
    setAlertVisible(true);
  };

  const editableFields = {
    'nombre_completo': {
      label: 'Nombre Completo',
      placeholder: 'Ingresa tu nombre completo',
      icon: 'user',
      keyboardType: 'default'
    },
    'numero_telefono': {
      label: 'Teléfono',
      placeholder: 'Ingresa tu número de teléfono',
      icon: 'phone',
      keyboardType: 'phone-pad'
    },
    'email': {
      label: 'Correo Electrónico',
      placeholder: 'Ingresa tu correo electrónico',
      icon: 'envelope',
      keyboardType: 'email-address'
    },
    'direccion_principal': {
      label: 'Dirección Principal',
      placeholder: 'Ingresa tu dirección',
      icon: 'home',
      keyboardType: 'default'
    }
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('No se encontró token de autenticación');

      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error('No se encontró ID de usuario');

      const response = await fetch(`${BASE_URL}usuario/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener datos del usuario');
      }

      const data = await response.json();
      setUserData(data.data || data);

    } catch (err) {
      setError(err.message || 'Error al obtener información del usuario');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateUserField = async () => {
    if (!editingField || editingValue === '') {
      showAlert('Por favor completa el campo correctamente');
      return;
    }

    try {
      setUpdateLoading(true);

      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('No se encontró token de autenticación');

      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error('No se encontró ID de usuario');

      const updateData = {};
      updateData[editingField] = editingValue;

      const response = await fetch(`${BASE_URL}usuario/actualizar/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.status) {
        throw new Error(responseData.message || 'Error al actualizar el campo');
      }

      setModalVisible(false);
      showAlert('La información se ha actualizado correctamente', 'success');
      fetchUserData();

    } catch (err) {
      showAlert(err.message || 'No se pudo actualizar la información');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleEditField = (field) => {
    if (field in editableFields) {
      setEditingField(field);
      setEditingValue(userData[field] || '');
      setModalVisible(true);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showAlert('Se necesita acceso a la galería para cambiar tu foto de perfil');
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
        setFotoLocal(imageUri);
        uploadImage(imageUri);
      }
    } catch (err) {
      showAlert('No se pudo seleccionar la imagen.');
    }
  };

  const uploadImage = async (uri) => {
    try {
      setSubiendoFoto(true);

      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('No se encontró token de autenticación');

      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error('No se encontró ID de usuario');

      const tipoUsuario = userData?.tipo_usuario || (await AsyncStorage.getItem('tipoUsuario'));
      if (!tipoUsuario) throw new Error('No se pudo determinar el tipo de usuario');

      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      const formData = new FormData();
      formData.append('foto_documento_file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename || 'photo.jpg',
        type: type,
      });
      formData.append('tipo_usuario', tipoUsuario);

      const response = await fetch(`${BASE_URL}usuario/actualizar/${userId}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const responseText = await response.text();
      let data = null;
      try { data = JSON.parse(responseText); } catch (e) { data = null; }

      if (!response.ok) {
        throw new Error(data?.message || 'No se pudo actualizar la foto de perfil');
      }

      const nuevaFoto = data?.data?.fotografia_perfil || data?.data?.foto_document_file || data?.data?.foto_documento_file;
      if (nuevaFoto) {
        const url = nuevaFoto.startsWith('http') ? nuevaFoto : `${BASE_URL.toString().replace('/api', '')}/storage/${nuevaFoto}`;
        await AsyncStorage.setItem('userProfileImage', url);
      }

      showAlert('Foto de perfil actualizada.', 'success');
      fetchUserData();

    } catch (err) {
      setFotoLocal(null);
      showAlert(err.message || 'No se pudo subir la imagen.');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  };

  const getProfileImageUrl = () => {
    const photo = userData?.fotografia_perfil || userData?.foto_document_file || userData?.foto_documento_file;
    if (!photo) return null;
    if (photo.startsWith('http')) return photo;
    return `${BASE_URL.toString().replace('/api', '')}/storage/${photo}`;
  };

  const tieneValor = (value) => value !== null && value !== undefined;

  const renderInfoItem = (label, value, icon, fieldKey = null) => {
    if (!tieneValor(value)) return null;

    const isEditable = fieldKey && fieldKey in editableFields;
    const contenido = (
      <>
        <View style={styles.infoIconContainer}>
          <FontAwesome name={icon} size={15} color={C.iconInk} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value || 'No disponible'}</Text>
        </View>
        {isEditable && (
          <View style={styles.editButton}>
            <Ionicons name="pencil" size={14} color={C.brand} />
          </View>
        )}
      </>
    );

    if (isEditable) {
      return (
        <TouchableOpacity style={styles.infoItem} onPress={() => handleEditField(fieldKey)} activeOpacity={0.7}>
          {contenido}
        </TouchableOpacity>
      );
    }
    return <View style={styles.infoItem}>{contenido}</View>;
  };

  const renderPar = (a, b) => {
    const datos = [a, b].filter((d) => tieneValor(d.value));
    if (datos.length === 0) return null;
    if (datos.length === 1) return renderInfoItem(datos[0].label, datos[0].value, datos[0].icon);
    return (
      <View style={styles.parRow}>
        {datos.map((d, i) => (
          <View key={d.label} style={[styles.parCell, i === 1 && styles.parCellDerecha]}>
            <View style={styles.parHead}>
              <FontAwesome name={d.icon} size={12} color={C.placeholder} />
              <Text style={styles.infoLabel} numberOfLines={1}>{d.label}</Text>
            </View>
            <Text style={styles.infoValue}>{d.value || 'No disponible'}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderEstado = () => {
    const activo = userData?.estado === 'activo';
    return (
      <View style={styles.infoItem}>
        <View style={styles.infoIconContainer}>
          <FontAwesome name="check-circle" size={15} color={C.iconInk} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Estado</Text>
        </View>
        <View style={[styles.estadoPill, !activo && styles.estadoPillOff]}>
          <View style={[styles.estadoDot, !activo && styles.estadoDotOff]} />
          <Text style={[styles.estadoText, !activo && styles.estadoTextOff]}>{activo ? 'Activo' : 'Inactivo'}</Text>
        </View>
      </View>
    );
  };

  const renderGrupo = (titulo, filas) => {
    const visibles = filas.filter(Boolean);
    if (visibles.length === 0) return null;
    return (
      <View style={styles.grupo}>
        <Text style={styles.sectionTitle}>{titulo}</Text>
        <View style={styles.grupoCard}>
          {visibles.map((fila, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={styles.separador} />}
              {fila}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    const profileImageUrl = fotoLocal || (userData ? getProfileImageUrl() : null);
    return (
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Datos Personales</Text>
          <View style={styles.backBtnEspacio} />
        </View>

        {userData && (
          <View style={styles.identity}>
            <TouchableOpacity style={styles.avatarWrap} onPress={pickImage} disabled={subiendoFoto} activeOpacity={0.8}>
              {profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.profileImage} />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{getInitials(userData?.nombre_completo)}</Text>
                </View>
              )}
              {subiendoFoto && (
                <View style={styles.avatarCargando}>
                  <ActivityIndicator size="small" color="#FFF" />
                </View>
              )}
              <View style={styles.avatarEdit}>
                <Ionicons name="pencil" size={12} color="#FFF" />
              </View>
            </TouchableOpacity>
            <View style={styles.identityText}>
              <Text style={styles.userName} numberOfLines={1}>{userData?.nombre_completo || 'Usuario'}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{userData?.email || 'Correo no disponible'}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{nombreRol(userData?.tipo_usuario) || 'Cliente'}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (!fontsLoaded) return null;

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={C.brand} />
          <Text style={styles.loadingText}>Cargando información del usuario...</Text>
        </View>
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centerContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={30} color="#EF4444" />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchUserData} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Intentar nuevamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const tieneVehiculo = userData?.placa || userData?.marca_vehiculo || userData?.color;
  const tieneBanco = userData?.banco || userData?.numero_cuenta;

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.brand]}
            tintColor={C.brand}
          />
        }
      >
        {renderGrupo('Información Personal', [
          renderInfoItem('Nombre Completo', userData?.nombre_completo, 'user', 'nombre_completo'),
          renderInfoItem('Correo Electrónico', userData?.email, 'envelope', 'email'),
          renderInfoItem('Teléfono', userData?.numero_telefono, 'phone', 'numero_telefono'),
          renderPar(
            { label: 'Tipo de Documento', value: userData?.tipo_documento, icon: 'id-card' },
            { label: 'Número de Documento', value: userData?.numero_documento, icon: 'id-card' },
          ),
          renderInfoItem('Fecha de Nacimiento', formatDate(userData?.fecha_nacimiento), 'calendar'),
        ])}

        {renderGrupo('Ubicación', [
          renderPar(
            { label: 'Departamento', value: userData?.departamento, icon: 'map-marker' },
            { label: 'Ciudad', value: userData?.ciudad, icon: 'building' },
          ),
        ])}

        {renderGrupo('Información de Cuenta', [
          renderEstado(),
          renderInfoItem('Código de Referido', userData?.codigo_referido, 'qrcode'),
          renderInfoItem('Código de Referido Padre', userData?.codigo_referido_padre, 'users'),
          renderPar(
            { label: 'Fecha de Registro', value: formatDate(userData?.created_at), icon: 'clock-o' },
            { label: 'Última Actualización', value: formatDate(userData?.updated_at), icon: 'clock-o' },
          ),
        ])}

        {tieneVehiculo && renderGrupo('Información de Vehículo', [
          renderPar(
            { label: 'Placa', value: userData?.placa, icon: 'car' },
            { label: 'Color', value: userData?.color, icon: 'paint-brush' },
          ),
          renderPar(
            { label: 'Marca', value: userData?.marca_vehiculo, icon: 'tag' },
            { label: 'Línea', value: userData?.linea, icon: 'info-circle' },
          ),
        ])}

        {tieneBanco && renderGrupo('Información Bancaria', [
          renderPar(
            { label: 'Banco', value: userData?.banco, icon: 'bank' },
            { label: 'Tipo de Cuenta', value: userData?.tipo_banco, icon: 'credit-card' },
          ),
          renderInfoItem('Número de Cuenta', userData?.numero_cuenta, 'money'),
        ])}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding" enabled={Platform.OS === 'ios'}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16, marginBottom: tecladoAndroid }]}>
            <View style={styles.grabber} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                Editar {editingField && editableFields[editingField]?.label}
              </Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)} activeOpacity={0.8}>
                <Ionicons name="close" size={20} color={C.ink} />
              </TouchableOpacity>
            </View>

            {editingField && (
              <View style={[styles.inputContainer, inputFocus && styles.inputContainerFocus]}>
                <FontAwesome
                  name={editableFields[editingField].icon}
                  size={16}
                  color={inputFocus ? C.brand : C.placeholder}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={editableFields[editingField].placeholder}
                  placeholderTextColor={C.placeholder}
                  value={editingValue}
                  onChangeText={setEditingValue}
                  keyboardType={editableFields[editingField].keyboardType}
                  autoCapitalize="none"
                  onFocus={() => setInputFocus(true)}
                  onBlur={() => setInputFocus(false)}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, updateLoading && styles.saveBtnDisabled]}
              onPress={updateUserField}
              disabled={updateLoading}
              activeOpacity={0.8}
            >
              {updateLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Alert Modal */}
      <AlertaModal
        visible={alertVisible}
        tipo={alertType}
        mensaje={alertMsg}
        onCerrar={() => setAlertVisible(false)}
        onPrimary={alertPrimary}
        primaryLabel={alertLabel}
      />
    </View>
  );
}

const C = {
  brand: '#fa6205',
  ink: '#1C1C1E',
  surface: '#FFF',
  muted: '#71717A',
  bg: '#F4F4F5',
  edge: '#E4E4E7',
  iconBg: '#FFF0E5',
  iconInk: '#52525B',
  green: '#10B981',
  placeholder: '#A1A1AA',
};
const BOTON_ELEVADO = { shadowColor: '#fa6205', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  header: {
    backgroundColor: C.ink,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnEspacio: {
    width: 38,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Montserrat_800ExtraBold',
    color: C.surface,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 16,
  },
  avatarWrap: {
    width: 68,
    height: 68,
  },
  avatarCargando: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEdit: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.brand,
    borderWidth: 2.5,
    borderColor: C.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#2C2C2E',
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontFamily: 'Montserrat_800ExtraBold',
    color: C.surface,
  },
  identityText: {
    flex: 1,
  },
  userName: {
    fontSize: 19,
    fontFamily: 'Montserrat_800ExtraBold',
    color: C.surface,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    color: C.placeholder,
    marginTop: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(250,98,5,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 8,
  },
  badgeText: {
    color: C.brand,
    fontSize: 11.5,
    fontFamily: 'Montserrat_700Bold',
    textTransform: 'capitalize',
  },

  grupo: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    color: C.muted,
    marginBottom: 8,
    marginLeft: 4,
  },
  grupoCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
  },
  separador: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.edge,
    marginLeft: 48,
  },

  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: C.muted,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
    color: C.ink,
    marginTop: 2,
  },
  editButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.iconBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  parRow: {
    flexDirection: 'row',
    paddingVertical: 11,
  },
  parCell: {
    flex: 1,
    paddingRight: 10,
  },
  parCellDerecha: {
    paddingLeft: 14,
    paddingRight: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: C.edge,
  },
  parHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  estadoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  estadoPillOff: {
    backgroundColor: C.bg,
  },
  estadoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.green,
  },
  estadoDotOff: {
    backgroundColor: C.placeholder,
  },
  estadoText: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_700Bold',
    color: C.green,
  },
  estadoTextOff: {
    color: C.muted,
  },

  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    color: C.muted,
  },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 14,
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    color: C.ink,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: C.brand,
    height: 50,
    paddingHorizontal: 28,
    borderRadius: 999,
    justifyContent: 'center',
    ...BOTON_ELEVADO,
  },
  retryBtnText: {
    color: C.surface,
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: C.edge,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Montserrat_800ExtraBold',
    color: C.ink,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 999,
    paddingHorizontal: 18,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: C.edge,
  },
  inputContainerFocus: {
    borderColor: C.brand,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
    color: C.ink,
  },
  saveBtn: {
    backgroundColor: C.brand,
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    ...BOTON_ELEVADO,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    color: C.surface,
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
});
