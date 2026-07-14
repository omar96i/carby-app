import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    SafeAreaView,
    Keyboard,
    TouchableWithoutFeedback,
    StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Definimos la paleta de colores para fácil acceso
const COLORS = {
    background: '#FFFFFF',
    accent: '#fa6205',
    text: '#F5F5F5',
    placeholder: '#6E6E6E',
    inputBackground: '#D8D8D8',
};

// Componente principal de la pantalla de pago
const PagoScreen = ({ navigation }) => {
    const [amount, setAmount] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const presetAmounts = [20, 50, 100, 200];

    // La lógica para la recarga no cambia
    const handleRecharge = async () => {
        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            Alert.alert('Error', 'Por favor, ingresa un monto válido.');
            return;
        }
        Keyboard.dismiss();
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) {
                Alert.alert('Error', 'No se pudo obtener el ID del usuario. Por favor, inicia sesión de nuevo.');
                return;
            }
            const baseUrl = 'https://back.yariders.com';
            const paymentUrl = `${baseUrl}/recharge/link/${amount}/${userId}`;
            navigation.navigate('PaymentWebView', { url: paymentUrl });
        } catch (error) {
            console.error('Error al procesar la recarga:', error);
            Alert.alert('Error', 'Ocurrió un problema al intentar procesar tu pago.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.innerContainer}>

                    <View>
                        {/* ----- TEXTO CAMBIADO ----- */}
                        <Text style={styles.title}>Recarga Puntos de Fidelidad</Text>
                        <Text style={styles.subtitle}>
                            Ingresa la cantidad de puntos que quieres comprar.
                        </Text>
                    </View>

                    {/* Contenedor para montos predefinidos */}
                    <View style={styles.presetContainer}>
                        {presetAmounts.map((preset) => (
                            <TouchableOpacity
                                key={preset}
                                style={styles.presetButton}
                                onPress={() => setAmount(String(preset))}
                            >
                                {/* ----- TEXTO CAMBIADO ----- */}
                                <Text style={styles.presetButtonText}>$ {preset}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Campo de texto rediseñado */}
                    <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
                        {/* ----- TEXTO CAMBIADO ----- */}
                        <Text style={styles.currencySymbol}>$ </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            value={amount}
                            onChangeText={setAmount}
                            placeholderTextColor={COLORS.placeholder}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />
                    </View>

                    {/* Botón de continuar con estilo dinámico */}
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.button, !amount && styles.buttonDisabled]}
                            onPress={handleRecharge}
                            disabled={!amount}
                        >
                            <Text style={styles.buttonText}>Continuar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.backButtonText}>Volver</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
};

// Estilos del componente
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    innerContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 25,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        color: COLORS.placeholder,
        marginBottom: 40,
    },
    presetContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    presetButton: {
        borderWidth: 1,
        borderColor: COLORS.inputBackground,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: COLORS.inputBackground,
    },
    presetButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.inputBackground,
        borderRadius: 14,
        paddingHorizontal: 20,
        borderWidth: 2,
        borderColor: 'transparent',
        marginBottom: 30,
    },
    inputContainerFocused: {
        borderColor: COLORS.accent,
    },
    currencySymbol: {
        fontSize: 36,
        fontWeight: 'bold',
        color: COLORS.placeholder,
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 42,
        fontWeight: 'bold',
        color: COLORS.text,
        paddingVertical: 15,
    },
    button: {
        backgroundColor: COLORS.accent,
        paddingVertical: 18,
        borderRadius: 14,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: COLORS.background,
        fontSize: 18,
        fontWeight: 'bold',
    },
    actionButtonsContainer: {
    },
    backButton: {
        marginTop: 20,
        paddingVertical: 10,
        alignItems: 'center',
    },
    backButtonText: {
        color: COLORS.placeholder,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default PagoScreen;