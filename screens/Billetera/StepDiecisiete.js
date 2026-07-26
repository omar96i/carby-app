import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../../constants/url';
import AlertaModal from '../../components/ErrorModal';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import { useFonts } from 'expo-font';

export default function StepDiecisiete() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_700Bold,
  });
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

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

  const renderInfoItem = (label, value, icon, fieldKey = null) => {
    if (value === null || value === undefined) return null;

    const isEditable = fieldKey && fieldKey in editableFields;

    return (
      <View style={styles.infoItem}>
        <View style={styles.infoIconContainer}>
          <FontAwesome name={icon} size={18} color="#fa6205" />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value || 'No disponible'}</Text>
        </View>
        {isEditable && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditField(fieldKey)}
          >
            <Ionicons name="pencil" size={18} color="#fa6205" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (!fontsLoaded) return null;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fa6205" />
        <Text style={styles.loadingText}>Cargando información del usuario...</Text>
      </SafeAreaView>
    );
  }

  if (error && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={56} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchUserData}>
          <Text style={styles.retryBtnText}>Intentar nuevamente</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const profileImageUrl = getProfileImageUrl();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#fa6205"]}
            tintColor="#fa6205"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          {profileImageUrl ? (
            <Image source={{ uri: profileImageUrl }} style={styles.profileImage} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {getInitials(userData?.nombre_completo)}
              </Text>
            </View>
          )}
          <Text style={styles.userName}>{userData?.nombre_completo || 'Usuario'}</Text>
          <Text style={styles.userEmail}>{userData?.email || 'Correo no disponible'}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{userData?.tipo_usuario || 'Cliente'}</Text>
          </View>
        </View>

        {/* Info Sections */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Información Personal</Text>

          {renderInfoItem('Nombre Completo', userData?.nombre_completo, 'user', 'nombre_completo')}
          {renderInfoItem('Correo Electrónico', userData?.email, 'envelope', 'email')}
          {renderInfoItem('Teléfono', userData?.numero_telefono, 'phone', 'numero_telefono')}
          {renderInfoItem('Tipo de Documento', userData?.tipo_documento, 'id-card')}
          {renderInfoItem('Número de Documento', userData?.numero_documento, 'id-card')}
          {renderInfoItem('Fecha de Nacimiento', formatDate(userData?.fecha_nacimiento), 'calendar')}

          <Text style={styles.sectionTitle}>Ubicación</Text>

          {renderInfoItem('Departamento', userData?.departamento, 'map-marker')}
          {renderInfoItem('Ciudad', userData?.ciudad, 'building')}

          <Text style={styles.sectionTitle}>Información de Cuenta</Text>

          {renderInfoItem('Estado', userData?.estado === 'activo' ? 'Activo' : 'Inactivo', 'check-circle')}
          {renderInfoItem('Código de Referido', userData?.codigo_referido, 'qrcode')}
          {renderInfoItem('Código de Referido Padre', userData?.codigo_referido_padre, 'users')}
          {renderInfoItem('Fecha de Registro', formatDate(userData?.created_at), 'clock-o')}
          {renderInfoItem('Última Actualización', formatDate(userData?.updated_at), 'clock-o')}

          {(userData?.placa || userData?.marca_vehiculo || userData?.color) && (
            <>
              <Text style={styles.sectionTitle}>Información de Vehículo</Text>
              {renderInfoItem('Placa', userData?.placa, 'car')}
              {renderInfoItem('Marca', userData?.marca_vehiculo, 'tag')}
              {renderInfoItem('Línea', userData?.linea, 'info-circle')}
              {renderInfoItem('Color', userData?.color, 'paint-brush')}
            </>
          )}

          {(userData?.banco || userData?.numero_cuenta) && (
            <>
              <Text style={styles.sectionTitle}>Información Bancaria</Text>
              {renderInfoItem('Banco', userData?.banco, 'bank')}
              {renderInfoItem('Tipo de Cuenta', userData?.tipo_banco, 'credit-card')}
              {renderInfoItem('Número de Cuenta', userData?.numero_cuenta, 'money')}
            </>
          )}
        </View>
      </ScrollView>

      {/* Edit Field Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>

            <View style={styles.modalIconCircle}>
              <Ionicons name="create-outline" size={32} color="#fa6205" />
            </View>

            <Text style={styles.modalTitle}>
              Editar {editingField && editableFields[editingField]?.label}
            </Text>

            {editingField && (
              <View style={styles.inputContainer}>
                <FontAwesome
                  name={editableFields[editingField].icon}
                  size={18}
                  color="#fa6205"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={editableFields[editingField].placeholder}
                  placeholderTextColor="#999"
                  value={editingValue}
                  onChangeText={setEditingValue}
                  keyboardType={editableFields[editingField].keyboardType}
                  autoCapitalize="none"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, updateLoading && styles.saveBtnDisabled]}
              onPress={updateUserField}
              disabled={updateLoading}
            >
              {updateLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 14,
    backgroundColor: '#EAE5DC',
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fa6205',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 4,
    borderColor: '#FFF0E5',
  },
  avatarText: {
    fontSize: 40,
    fontFamily: 'Montserrat_700Bold',
    color: '#FFF',
  },
  userName: {
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    color: '#1C1C1E',
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    color: '#888',
    marginTop: 4,
    marginBottom: 10,
  },
  badge: {
    backgroundColor: '#FFF0E5',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fa6205',
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    textTransform: 'capitalize',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    color: '#fa6205',
    marginBottom: 14,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE8',
    paddingBottom: 10,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF0E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: '#888',
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'Montserrat_500Medium',
    color: '#1C1C1E',
    marginTop: 2,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF0E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
    color: '#888',
  },
  errorText: {
    marginTop: 16,
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
    color: '#E53935',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#fa6205',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modalClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF0E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: '#1C1C1E',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
    borderRadius: 14,
    paddingHorizontal: 14,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EAE5DC',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
    color: '#1C1C1E',
  },
  saveBtn: {
    backgroundColor: '#fa6205',
    paddingVertical: 16,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#fa6205',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: '#C9C2B5',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
});
