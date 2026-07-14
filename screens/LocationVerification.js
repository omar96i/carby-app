import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export default function LocationVerification() {
    const navigation = useNavigation();
    const [permissionStatus, setPermissionStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Estado para el indicador de carga

    // 1. Lógica mejorada que se ejecuta al cargar la pantalla
    useEffect(() => {
        const verifyAndNavigate = async () => {
            const { status } = await Location.getForegroundPermissionsAsync();
            const hasSeenScreen = await AsyncStorage.getItem('hasSeenLocationPermissionScreen');

            // Si el permiso está concedido Y el usuario ya vio esta pantalla, se omite.
            if (status === 'granted' && hasSeenScreen) {
                navigation.replace('AuthLoadingScreen');
            } else {
                // Si no, se muestra la pantalla de solicitud de permisos.
                setPermissionStatus(status);
                setIsLoading(false); // Dejamos de cargar y mostramos la UI
            }
        };

        verifyAndNavigate();
    }, [navigation]);

    // 2. Lógica del botón (sin cambios, sigue siendo correcta)
    const handleContinueOrEnable = async () => {
        await AsyncStorage.setItem('hasSeenLocationPermissionScreen', 'true');
        
        let currentStatus = permissionStatus;

        if (currentStatus === 'granted') {
            navigation.replace('AuthLoadingScreen');
            return;
        }

        const response = await Location.requestForegroundPermissionsAsync();
        currentStatus = response.status;
        setPermissionStatus(currentStatus);

        if (currentStatus === 'granted') {
            navigation.replace('AuthLoadingScreen');
        } else {
            Alert.alert(
                "Permiso Requerido",
                "Para usar la app, necesitas habilitar los permisos de ubicación desde los ajustes de tu teléfono.",
                [
                    { text: "Cancelar", style: "cancel" },
                    { text: "Abrir Ajustes", onPress: () => Linking.openSettings() }
                ]
            );
        }
    };

    // Muestra un indicador de carga mientras se verifica
    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#fa6205" />
            </View>
        );
    }

    // Renderizado de la pantalla de permisos
    return (
        <View style={styles.container}>
            <Ionicons name="location-sharp" size={80} color="#fa6205" />
            <Text style={styles.title}>Necesitamos tu ubicación en tiempo real</Text>
            <Text style={styles.subtitle}>YaRiders utiliza tu ubicación en tiempo real para:</Text>
            <View style={styles.reasonsContainer}>
                <Text style={styles.reasonText}>• Mostrar conductores y negocios cercanos</Text>
                <Text style={styles.reasonText}>• Seguir tu viaje y entrega de pedidos</Text>
                <Text style={styles.reasonText}>• Mejorar tu seguridad y la correcta operación del servicio</Text>
            </View>
            <Text style={styles.privacyText}>
                Tu ubicación no se comparte y solo se usa mientras utilizas la app.
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleContinueOrEnable}>
                <Text style={styles.buttonText}>
                    {permissionStatus === 'granted' ? 'Continuar' : 'Habilitar Ubicación'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

// Estilos para la pantalla de permisos
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        color: '#666',
        marginBottom: 20,
    },
    reasonsContainer: {
        alignSelf: 'flex-start',
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    reasonText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 10,
    },
    privacyText: {
        fontSize: 14,
        textAlign: 'center',
        color: '#888',
        marginBottom: 40,
    },
    button: {
        backgroundColor: '#fa6205',
        paddingVertical: 15,
        paddingHorizontal: 80,
        borderRadius: 10,
    },
    buttonText: {
        color: 'black',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

