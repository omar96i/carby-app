import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Entypo, FontAwesome } from "@expo/vector-icons";


import { View, Text, KeyboardAvoidingView, Platform, Image, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_300Light,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import AlertaModal from "../../components/ErrorModal";
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "../../constants/url";

const ProductoDos = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { categoria_id, categoria_nombre } = route.params || {};
    console.log('Categoria ID:', categoria_id);
    console.log('Categoria Nombre:', categoria_nombre);
    const [fontsLoaded] = useFonts({
        Montserrat_400Regular,
        Montserrat_700Bold,
        Montserrat_300Light,
    });

    // Product form state
    const [nombre, setNombre] = useState('');
    const [precio, setPrecio] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [foto, setFoto] = useState(null);
    const [loading, setLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
    return () => navigation.getParent()?.setOptions({ tabBarStyle: { backgroundColor: '#FFF', height: 56, borderTopWidth: 1, borderTopColor: '#F0F0F0', display: 'flex' } });
  }, [navigation]));

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ title: "", message: "", type: "info", onConfirm: null });
  const showAlert = (title, message, type, onConfirm) => {
    setAlertData({ title, message, type: type || (title === "Éxito" ? "success" : "error"), onConfirm });
    setAlertVisible(true);
  };

    // Request camera permission on component mount
    useEffect(() => {
        (async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showAlert('Permiso requerido', 'Se necesita permiso para acceder a la galería');
            }
        })();
    }, []);

    if (!fontsLoaded) {
        return null; // Optionally, return a loading indicator
    }

    // Image picker function
    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setFoto(result.assets[0]);
        }
    };

    // Form submission
    // ...existing code...

    // Form submission
    const handleSubmit = async () => {
        if (!nombre || !precio || !descripcion || !foto) {
            showAlert("Error", 'Todos los campos son obligatorios');
            return;
        }

        try {
            setLoading(true);

            const token = await AsyncStorage.getItem('userToken');

            if (!token) {
                showAlert("Error", 'No se encontró el token de autenticación');
                setLoading(false);
                return;
            }

            const formData = new FormData();
            formData.append('nombre', nombre);
            formData.append('precio', precio);
            formData.append('descripcion', descripcion);
            formData.append('categoria_id', categoria_id);

            // Append image
            const fileExtension = foto.uri.split('.').pop();
            const fileName = `product_${Date.now()}.${fileExtension}`;

            formData.append('foto', {
                uri: foto.uri,
                name: fileName,
                type: `image/${fileExtension}`
            });

            // API URL - Update this with your actual domain

            console.log('Form data:', JSON.stringify({
                nombre,
                precio,
                descripcion,
                categoria_id,
                foto: 'Image data...'
            }));

            const response = await fetch(`${BASE_URL}productos`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    // Note: Don't set Content-Type when sending FormData
                    // The browser/RN will set it with the correct boundary
                },
                body: formData
            });

            // Check response type and handle accordingly
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();

                if (response.ok) {
                    showAlert('Éxito', 'Producto creado correctamente', 'success', () => navigation.navigate('ShopDos'));
                } else {
                    showAlert("Error", data.message || 'No se pudo crear el producto');
                }
            } else {
                // Handle non-JSON response
                const text = await response.text();
                console.error('Unexpected response:', text);
                showAlert("Error", 'El servidor devolvió una respuesta inesperada');
            }
        } catch (error) {
            console.error('Error al crear producto:', error);
            showAlert("Error", 'Ocurrió un error al crear el producto: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // ...existing code...

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0} // Ajusta según tu header
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerText}>
                            {categoria_nombre ? `Nuevo producto - ${categoria_nombre}` : 'Nuevo producto'}
                        </Text>
                        <View style={{ width: 24 }} />
                    </View>

                    {/* Product Image Picker */}
                    <TouchableOpacity onPress={pickImage} style={styles.imagePickerContainer}>
                        {foto ? (
                            <Image
                                source={{ uri: foto.uri }}
                                style={styles.productImage}
                            />
                        ) : (
                            <View style={styles.placeholderContainer}>
                                <Ionicons name="camera" size={50} color="#fa6205" />
                                <Text style={styles.placeholderText}>Toca para seleccionar imagen</Text>
                                <Text style={styles.recommendationText}>
                                    Recomendado: 800x800px (formato cuadrado)
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Product Form */}
                    <View style={styles.formContainer}>
                        <Text style={styles.inputLabel}>Nombre del producto</Text>
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

                        <Text style={styles.inputLabel}>Descripción</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Ingresa la descripción"
                            placeholderTextColor="#7d7d7d"
                            multiline
                            numberOfLines={4}
                            value={descripcion}
                            onChangeText={setDescripcion}
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={styles.myButton}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={styles.buttonText}>Guardar Producto</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
      </KeyboardAvoidingView>

      <AlertaModal
        visible={alertVisible}
        tipo={alertData.type}
        mensaje={alertData.message}
        onCerrar={() => {
          setAlertVisible(false);
          if (alertData.onConfirm) alertData.onConfirm();
        }}
      />
    </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fa6205',
        padding: 15,
        marginTop: 60,
    },
    headerText: {
        fontSize: 16,
        fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat_700Bold',
    },
    imagePickerContainer: {
        width: '100%',
        height: 250,
        marginVertical: 20,
    },
    productImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholderContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: '#ECECEC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#fa6205',
    },
    placeholderText: {
        marginTop: 10,
        color: '#1C1C1E',
        fontFamily: 'Montserrat_400Regular',
    },
    formContainer: {
        padding: 15,
    },
    inputLabel: {
        fontSize: 16,
        color: '#1C1C1E',
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 5,
        marginTop: 15,
    },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    padding: 14,
    fontSize: 16,
    color: '#1C1C1E',
    fontFamily: 'Montserrat_400Regular',
  },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    myButton: {
        backgroundColor: "#fa6205",
        paddingVertical: 14,
        paddingHorizontal: 60,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        marginVertical: 20,
        marginBottom: 30,
    },
  buttonText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: 'Montserrat_700Bold',
  },
  recommendationText: {
    color: '#888',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ProductoDos;