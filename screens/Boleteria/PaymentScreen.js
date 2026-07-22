// 1. IMPORTACIONES
import React, { useState, useEffect, useRef } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Animated, // Importamos Animated para la barra de progreso
} from 'react-native';
import { WebView } from 'react-native-webview';
import { API_SECRET_TOKEN } from '../../utils/token'
import { BASE_URL } from "../../constants/url";
import AsyncStorage from '@react-native-async-storage/async-storage';

// 2. DEFINICIÓN DEL COMPONENTE
const PaymentScreen = ({ route, navigation }) => {
    const [compra, setCompra] = useState(null);
    const [uiState, setUiState] = useState('summary');
    const [paymentUrl, setPaymentUrl] = useState('');
    const progressAnimation = useRef(new Animated.Value(0)).current;
    const [cliente, setCliente] = useState(null);

    useEffect(() => {
        const setupPurchase = async () => {
            try {
                // PASO 1: Validar que los datos de la pantalla anterior llegaron bien
                if (!route.params?.localidad || !route.params?.cantidad) {
                    throw new Error("No se encontraron los datos de la compra.");
                }
                const { localidad, cantidad } = route.params;

                // PASO 2: Obtener la información del usuario autenticado
                const userId = await AsyncStorage.getItem("userId");
                const token = await AsyncStorage.getItem("userToken");
                if (!userId || !token) throw new Error("Usuario no autenticado.");

                const userResponse = await fetch(`${BASE_URL}usuario/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!userResponse.ok) throw new Error("No se pudo obtener la información del usuario.");
                const userData = await userResponse.json();

                // PASO 3: Crear/Actualizar el cliente en el sistema de boletería
                const clientPayload = {
                    nombre: userData.data.nombre_completo,
                    correo: userData.data.email,
                    tipo_documento: userData.data.tipo_documento || 'DNI',
                    documento: userData.data.numero_documento,
                    departamento: userData.data.departamento,
                    provincia: userData.data.ciudad,
                    distrito: userData.data.distrito
                };

                const clientResponse = await fetch(`https://boleteria.carbycol.com/api/clientes`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-API-KEY': API_SECRET_TOKEN,
                    },
                    body: JSON.stringify(clientPayload),
                });
                if (!clientResponse.ok) throw new Error("No se pudo registrar la información del cliente.");

                const clientResult = await clientResponse.json();
                const clienteObtenido = clientResult.cliente;
                if (!clienteObtenido?.id) throw new Error("La API de clientes no devolvió un ID válido.");

                // PASO 4: Guardar toda la información de la compra en el estado
                setCompra({
                    localidad_id: localidad.id,
                    nombreLocalidad: localidad.nombre,
                    precioUnitario: localidad.precio,
                    cantidad: cantidad,
                    montoTotal: localidad.precio * cantidad,
                    cliente_id: clienteObtenido.id, // ¡ID del cliente obtenido!
                });

                // PASO 5: Mostrar la pantalla de resumen
                setUiState('summary');

            } catch (error) {
                console.error("Error al preparar la compra:", error);
                Alert.alert(
                    "Error",
                    error.message || "Ocurrió un problema al preparar tu compra.",
                    [{ text: "Volver", onPress: () => navigation.goBack() }]
                );
            }
        };

        setupPurchase();
    }, [route.params]); // Se ejecuta solo si los parámetros de la ruta cambian

    // useEffect para la animación (sin cambios)
    useEffect(() => {
        if (uiState === 'validating_progress') {
            Animated.timing(progressAnimation, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: false,
            }).start(() => {
                setUiState('validating_spinner');
                runPaymentValidation();
            });
        }
    }, [uiState]);


    const handlePayment = () => {
        // Ahora usa el cliente_id guardado en el estado 'compra'
        const url = `https://boleteria.carbycol.com/proceso-pago?evento_localidad_id=${compra.localidad_id}&cantidad=${compra.cantidad}&cliente_id=${compra.cliente_id}`;
        setPaymentUrl(url);
        setUiState('webview');
    };

    const handleCloseWebViewAndValidate = () => {
        setUiState('validating_progress');
    };

    const runPaymentValidation = async () => {
        try {
            // Usa el cliente_id guardado en el estado 'compra'
            const url = `https://boleteria.carbycol.com/api/clientes/${compra.cliente_id}/validar-pagos`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-API-KEY': API_SECRET_TOKEN
                }
            });
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
            setUiState('validation_complete');
        } catch (error) {
            console.error("Error al validar pagos:", error);
            Alert.alert("Error", "No se pudo completar la validación.");
            setUiState('summary');
        }
    };


    // --- RENDERIZADO CONDICIONAL ---

    const renderContent = () => {
        switch (uiState) {
            case 'webview':
                return (
                    <>
                        <View style={styles.headerWebView}>
                            <TouchableOpacity onPress={handleCloseWebViewAndValidate}>
                                <Text style={styles.headerWebViewText}>Cerrar</Text>
                            </TouchableOpacity>
                            <Text style={styles.headerWebViewTitle}>Pasarela de Pago</Text>
                        </View>
                        <WebView source={{ uri: paymentUrl }} startInLoadingState={true} />
                    </>
                );

            case 'validating_progress':
            case 'validating_spinner':
                const progressWidth = progressAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                });
                return (
                    <View style={styles.validationContainer}>
                        <Text style={styles.validationText}>Estamos validando tu pago...</Text>
                        <Text style={styles.validationSubText}>Espera un momento, por favor.</Text>

                        {uiState === 'validating_progress' ? (
                            <View style={styles.progressBarBackground}>
                                <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
                            </View>
                        ) : (
                            <ActivityIndicator size="large" color="#8d24b6" style={{ marginTop: 20 }} />
                        )}
                    </View>
                );

            case 'validation_complete':
                return (
                    <View style={styles.validationContainer}>
                        <Text style={styles.validationText}>Estamos procesando tu pago</Text>
                        <Text style={styles.validationSubText}>
                            Hemos recibido tu solicitud. Una vez que la compra sea confirmada, te enviaremos las boletas a tu correo electrónico y también las verás reflejadas en la sección "Mis Compras".
                        </Text>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => navigation.navigate('MisCompras')}
                        >
                            <Text style={styles.buttonText}>Ver mis Compras</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Text style={styles.linkText}>Volver al inicio</Text>
                        </TouchableOpacity>
                    </View>
                );

            case 'summary':
            default:
                if (!compra) return <ActivityIndicator size="large" color="#8d24b6" style={{ flex: 1 }} />;
                return (
                    <View style={styles.container}>
                        <Text style={styles.title}>Resumen de tu Compra</Text>
                        <View style={styles.summaryBox}>
                            {/* ... (el resumen de la compra no cambia) ... */}
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Localidad:</Text>
                                <Text style={styles.summaryValue}>{compra.nombreLocalidad}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Cantidad:</Text>
                                <Text style={styles.summaryValue}>{compra.cantidad} boleta(s)</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Precio Unitario:</Text>
                                <Text style={styles.summaryValue}>$ {parseFloat(compra.precioUnitario).toFixed(2)}</Text>
                            </View>
                            <View style={[styles.summaryRow, styles.totalRow]}>
                                <Text style={[styles.summaryLabel, styles.totalLabel]}>Total a Pagar:</Text>
                                <Text style={[styles.summaryValue, styles.totalValue]}>$ {compra.montoTotal.toFixed(2)}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.button} onPress={handlePayment}>
                            <Text style={styles.buttonText}>Continuar al Pago</Text>
                        </TouchableOpacity>
                    </View>
                );
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {renderContent()}
        </SafeAreaView>
    );
};

// 7. ESTILOS
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f8f7fa' },
    container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    button: { backgroundColor: '#8d24b6', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    buttonText: { color: '#1C1C1E', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 28, fontWeight: '700', color: '#333', textAlign: 'center', marginBottom: 30 },
    // Estilos para WebView Header (sin cambios)
    headerWebView: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    headerWebViewText: { paddingTop: 30, fontSize: 16, color: '#8d24b6', fontWeight: '600' },
    headerWebViewTitle: { fontSize: 17, fontWeight: '600', color: '#333', position: 'absolute', left: 0, right: 0, textAlign: 'center', zIndex: -1 },
    // Nuevos estilos para la pantalla de validación
    validationContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    validationText: { fontSize: 22, fontWeight: '600', color: '#333', textAlign: 'center' },
    validationSubText: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 10, marginBottom: 30 },
    progressBarBackground: { width: '80%', height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, marginTop: 20 },
    progressBar: { height: '100%', backgroundColor: '#8d24b6', borderRadius: 5 },
    linkText: { color: '#8d24b6', marginTop: 15, fontWeight: '500' },
    summaryBox: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#eee',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    summaryLabel: {
        fontSize: 16,
        color: '#555',
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
        marginTop: 10,
        paddingTop: 15,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '700',
    },
    totalValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#8d24b6',
    },
});

// 8. EXPORTACIÓN
export default PaymentScreen;