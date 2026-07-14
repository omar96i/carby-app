import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";

const RoleSelectionScreen = ({ onSelectUser, onSelectProvider }) => {
    const navigation = useNavigation();
    return (
        <View style={styles.container}>
            <Image
                source={require("../assets/images/yar.png")}
                style={styles.logo}
            />
            <Text style={styles.subtitle}>Selecciona cómo deseas ingresar</Text>

            {/* --- Botones de Rol (sin cambios) --- */}
            <TouchableOpacity
                style={styles.roleButton}
                onPress={onSelectUser}
            >
                <FontAwesome5 name="user-alt" size={32} color="#9DFD05" style={styles.icon} />
                <View style={styles.textContainer}>
                    <Text style={styles.roleTitle}>CLIENTE</Text>
                    <Text style={styles.roleDescription}>Ingresa para pedir comida, delivery o movilidad.</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.roleButton}
                onPress={onSelectProvider}
            >
                <FontAwesome5 name="concierge-bell" size={32} color="#9DFD05" style={styles.icon} />
                <View style={styles.textContainer}>
                    <Text style={styles.roleTitle}>TRABAJAR CON YARIDERS</Text>
                    <Text style={styles.roleDescription}>Ingresa si eres comercio, repartidor, mototaxi o taxi.</Text>
                </View>
            </TouchableOpacity>

            {/* --- Contenedor de Registro (AQUÍ ESTÁ EL CAMBIO) --- */}
            <View style={styles.registerContainer}>
                <Text style={styles.registerText}>¿Aún no tienes cuenta? </Text>
                <TouchableOpacity style={styles.registerButton} onPress={() => navigation.navigate("Register")}>
                    <Text style={styles.registerLink}>REGÍSTRATE AQUÍ</Text>
                    {/* Icono añadido para más énfasis */}
                    <FontAwesome5 name="arrow-right" size={14} color="#9DFD05" style={styles.registerIcon} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

// --- Estilos (AQUÍ ESTÁN LOS CAMBIOS) ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1C1C1E',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    logo: {
        width: 200,
        height: 200,
        resizeMode: 'contain',
    },
    subtitle: {
        fontSize: 16,
        color: '#A0A0A0',
        textAlign: 'center',
        marginBottom: 40,
    },
    roleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2C2C2E',
        borderWidth: 1.5,
        borderColor: '#444444',
        borderRadius: 12,
        padding: 20,
        width: '100%',
        marginBottom: 20,
    },
    icon: {
        marginRight: 20,
    },
    textContainer: {
        flex: 1,
    },
    roleTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    roleDescription: {
        fontSize: 14,
        color: '#A0A0A0',
        marginTop: 4,
    },
    registerContainer: {
        flexDirection: 'row',
        alignItems: 'center', // Alinea verticalmente el texto y el botón
    },
    registerText: {
        color: '#A0A0A0',
        fontSize: 14,
    },
    // NUEVO: Estilo para el botón de registro para alinear el texto y el icono
    registerButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    registerLink: {
        color: '#9DFD05',
        fontWeight: 'bold',
        fontSize: 18, // <-- Aumentado para mayor legibilidad
        textDecorationLine: 'underline', // <-- Subrayado para indicar que es un enlace
    },
    // NUEVO: Estilo para el icono
    registerIcon: {
        marginLeft: 8, // Espacio entre el texto y el icono
    },
});

export default RoleSelectionScreen;