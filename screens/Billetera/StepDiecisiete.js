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
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';
import { BASE_URL } from '../../constants/url';

export default function StepDiecisiete() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  // Fields that can be edited
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
      
      // Get user token from AsyncStorage
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }
      
      // Get user ID from AsyncStorage
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        throw new Error('No se encontró ID de usuario');
      }

      // Make API request
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
      console.log('User data:', data.data);
      
    } catch (err) {
      setError(err.message || 'Error al obtener información del usuario');
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateUserField = async () => {
    if (!editingField || editingValue === '') {
      Alert.alert('Error', 'Por favor completa el campo correctamente');
      return;
    }

    try {
      setUpdateLoading(true);

      // Get user token from AsyncStorage
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }
      
      // Get user ID from AsyncStorage
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        throw new Error('No se encontró ID de usuario');
      }

      // Prepare data for update
      const updateData = {};
      updateData[editingField] = editingValue;

      // Make API request
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

      // Close modal and refresh data
      setModalVisible(false);
      Alert.alert('Éxito', 'La información se ha actualizado correctamente');
      fetchUserData();
      
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo actualizar la información');
      console.error('Error updating user field:', err);
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

  const renderInfoItem = (label, value, icon, fieldKey = null) => {
    if (value === null || value === undefined) return null;
    
    const isEditable = fieldKey && fieldKey in editableFields;
    
    return (
      <View style={styles.infoItem}>
        <View style={styles.infoIconContainer}>
          <FontAwesome name={icon} size={20} color="#fa6205" />
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
            <FontAwesome name="pencil" size={18} color="#fa6205" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fa6205" />
        <Text style={styles.loadingText}>Cargando información del usuario...</Text>
      </SafeAreaView>
    );
  }

  if (error && !refreshing) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <FontAwesome name="exclamation-triangle" size={50} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserData}>
          <Text style={styles.retryText}>Intentar nuevamente</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Image
            source={
              userData?.foto_documento_file
                ? { uri: `https://back.carbycol.com/storage/${userData.foto_documento_file}` }
                : require('../../assets/images/yar.png')
            }
            style={styles.profileImage}
          />
          <Text style={styles.userName}>{userData?.nombre_completo || 'Usuario'}</Text>
          <Text style={styles.userEmail}>{userData?.email || 'Correo no disponible'}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{userData?.tipo_usuario || 'Cliente'}</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          
          {renderInfoItem('Nombre Completo', userData?.nombre_completo, 'user', 'nombre_completo')}
          {renderInfoItem('Correo Electrónico', userData?.email, 'envelope', 'email')}
          {renderInfoItem('Teléfono', userData?.numero_telefono, 'phone', 'numero_telefono')}
          {renderInfoItem('Tipo de Documento', userData?.tipo_documento, 'id-card-o')}
          {renderInfoItem('Número de Documento', userData?.numero_documento, 'id-card')}
          {renderInfoItem('Fecha de Nacimiento', formatDate(userData?.fecha_nacimiento), 'birthday-cake')}
          
          <Text style={styles.sectionTitle}>Ubicación</Text>
          
          {renderInfoItem('Departamento', userData?.departamento, 'map')}
          {renderInfoItem('Ciudad', userData?.ciudad, 'building')}
          {renderInfoItem('Dirección Principal', userData?.direccion_principal, 'home', 'direccion_principal')}
          
          <Text style={styles.sectionTitle}>Información de Cuenta</Text>
          
          {renderInfoItem('Estado', userData?.estado === 'activo' ? 'Activo' : 'Inactivo', 'check-circle')}
          {renderInfoItem('Código de Referido', userData?.codigo_referido, 'qrcode')}
          {renderInfoItem('Código de Referido Padre', userData?.codigo_referido_padre, 'users')}
          {renderInfoItem('Fecha de Registro', formatDate(userData?.created_at), 'calendar')}
          {renderInfoItem('Última Actualización', formatDate(userData?.updated_at), 'clock-o')}
          
          {/* Display additional vehicle info if available */}
          {(userData?.placa || userData?.marca_vehiculo || userData?.color) && (
            <>
              <Text style={styles.sectionTitle}>Información de Vehículo</Text>
              {renderInfoItem('Placa', userData?.placa, 'car')}
              {renderInfoItem('Marca', userData?.marca_vehiculo, 'tag')}
              {renderInfoItem('Línea', userData?.linea, 'info-circle')}
              {renderInfoItem('Color', userData?.color, 'paint-brush')}
            </>
          )}
          
          {/* Display banking info if available */}
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
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <FontAwesome name="close" size={24} color="#333" />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>
              Editar {editingField && editableFields[editingField]?.label}
            </Text>
            
            {editingField && (
              <View style={styles.inputContainer}>
                <FontAwesome 
                  name={editableFields[editingField].icon} 
                  size={20} 
                  color="#fa6205"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={editableFields[editingField].placeholder}
                  value={editingValue}
                  onChangeText={setEditingValue}
                  keyboardType={editableFields[editingField].keyboardType}
                  autoCapitalize="none"
                />
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.updateButton}
              onPress={updateUserField}
              disabled={updateLoading}
            >
              {updateLoading ? (
                <ActivityIndicator size="small" color="#1C1C1E" />
              ) : (
                <Text style={styles.updateButtonText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 70,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 12,
    resizeMode: "contain",
    backgroundColor: '#f5f5f5',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#fa6205',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: '#1C1C1E',
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  infoSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#fa6205',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff5ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  editButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#E53935',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#fa6205',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fa6205',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    width: '100%',
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  updateButton: {
    backgroundColor: '#fa6205',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '500',
  },
});