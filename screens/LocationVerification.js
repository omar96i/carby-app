import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Linking, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AlertaModal from "../components/ErrorModal";

export default function LocationVerification() {
    const navigation = useNavigation();
    const [permissionStatus, setPermissionStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Estado para el indicador de carga
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

    const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
      setAlertData({ message, type, onPrimary, primaryLabel });
      setAlertVisible(true);
    };

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
            showAlert(
                "Para usar la app, necesitas habilitar los permisos de ubicación desde los ajustes de tu teléfono.",
                "confirm",
                () => Linking.openSettings(),
                "Abrir Ajustes"
            );
        }
    };

    // Muestra un indicador de carga mientras se verifica
    if (isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#fa6205" />
            </View>
        );
    }

    // Renderizado de la pantalla de permisos
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    <View style={styles.iconRing}>
                        <View style={styles.iconHalo}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="location-sharp" size={34} color="#FFF" />
                            </View>
                        </View>
                    </View>
                    <Text style={styles.title}>Necesitamos tu ubicación en tiempo real</Text>
                    <Text style={styles.subtitle}>Carby utiliza tu ubicación en tiempo real para:</Text>

                    <View style={styles.reasonsContainer}>
                        <View style={styles.reasonRow}>
                            <View style={styles.reasonIcon}>
                                <Ionicons name="car-sport" size={22} color="#fa6205" />
                            </View>
                            <Text style={styles.reasonText}>Mostrar conductores y negocios cercanos</Text>
                        </View>
                        <View style={styles.reasonRow}>
                            <View style={styles.reasonIcon}>
                                <Ionicons name="navigate" size={22} color="#fa6205" />
                            </View>
                            <Text style={styles.reasonText}>Seguir tu viaje y entrega de pedidos</Text>
                        </View>
                        <View style={styles.reasonRow}>
                            <View style={styles.reasonIcon}>
                                <Ionicons name="shield-checkmark" size={22} color="#fa6205" />
                            </View>
                            <Text style={styles.reasonText}>Mejorar tu seguridad y la correcta operación del servicio</Text>
                        </View>
                    </View>

                    <Text style={styles.privacyText}>
                        <Ionicons name="lock-closed-outline" size={13} color="#71717A" />
                        {'  '}Tu ubicación no se comparte y solo se usa mientras utilizas la app.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={handleContinueOrEnable}>
                    <Text style={styles.buttonText}>
                        {permissionStatus === 'granted' ? 'Continuar' : 'Habilitar Ubicación'}
                    </Text>
                </TouchableOpacity>
            </View>
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
}

// Estilos para la pantalla de permisos
const C = { brand: "#fa6205", brandEdge: "#C94E00", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", iconBg: "#FFF0E5", ringBg: "#FFF7F0" };

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        backgroundColor: C.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flex: 1,
        backgroundColor: C.surface,
    },
    scroll: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
    content: {
        alignItems: 'center',
    },
    iconRing: {
        width: 136,
        height: 136,
        borderRadius: 999,
        backgroundColor: C.ringBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    iconHalo: {
        width: 104,
        height: 104,
        borderRadius: 999,
        backgroundColor: C.iconBg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircle: {
        width: 68,
        height: 68,
        borderRadius: 999,
        backgroundColor: C.brand,
        borderBottomWidth: 4,
        borderBottomColor: C.brandEdge,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontFamily: 'Montserrat_800ExtraBold',
        color: C.ink,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        fontFamily: 'Montserrat_400Regular',
        color: C.muted,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 290,
        marginBottom: 28,
    },
    reasonsContainer: {
        alignSelf: 'stretch',
        gap: 20,
        backgroundColor: C.surface,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#EDEDEF',
        borderBottomWidth: 6,
        borderBottomColor: '#E4E4E7',
        paddingVertical: 20,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 6,
    },
    reasonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    reasonIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: C.ink,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reasonText: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Montserrat_600SemiBold',
        color: C.ink,
        lineHeight: 21,
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
    },
    privacyText: {
        marginTop: 28,
        paddingHorizontal: 8,
        fontSize: 13,
        fontFamily: 'Montserrat_400Regular',
        color: C.muted,
        textAlign: 'center',
        lineHeight: 18,
    },
    button: {
        backgroundColor: C.brand,
        minHeight: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20, shadowColor: "#fa6205", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
    buttonText: {
        color: C.surface,
        fontSize: 17,
        fontFamily: 'Montserrat_700Bold',
    },
});

