import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";

const RoleSelectionScreen = ({ onSelectUser, onSelectProvider }) => {
    const navigation = useNavigation();
    return (
        <View style={styles.container}>
            <Image
                source={require("../assets/images/nuevo-icono.jpeg")}
                style={styles.logo}
            />
            <Text style={styles.subtitle}>Selecciona cómo deseas ingresar</Text>

            {/* --- Botones de Rol (sin cambios) --- */}
            <TouchableOpacity
                style={styles.roleButton}
                onPress={onSelectUser}
            >
                <FontAwesome5 name="user-alt" size={32} color="#fa6205" style={styles.icon} />
                <View style={styles.textContainer}>
                    <Text style={styles.roleTitle}>CLIENTE</Text>
                    <Text style={styles.roleDescription}>Ingresa para pedir comida, delivery o movilidad.</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.roleButton}
                onPress={onSelectProvider}
            >
                <FontAwesome5 name="store-alt" size={32} color="#fa6205" style={styles.icon} />
                <View style={styles.textContainer}>
                    <Text style={styles.roleTitle}>Trabajar con CarBy</Text>
                    <Text style={styles.roleDescription}>Ingresa si eres comercio, delivery o particular.</Text>
                </View>
            </TouchableOpacity>

            {/* --- Contenedor de Registro (AQUÍ ESTÁ EL CAMBIO) --- */}
            <View style={styles.registerContainer}>
                <Text style={styles.registerText}>¿Aún no tienes cuenta? </Text>
                <TouchableOpacity style={styles.registerButton} onPress={() => navigation.navigate("Register")}>
                    <Text style={styles.registerLink}>REGÍSTRATE AQUÍ</Text>
                    {/* Icono añadido para más énfasis */}
                    <FontAwesome5 name="arrow-right" size={14} color="#fa6205" style={styles.registerIcon} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

// --- Estilos (AQUÍ ESTÁN LOS CAMBIOS) ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    logo: {
        width: 100,
        height: 100,
        resizeMode: 'contain',
        borderRadius: 20,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        marginBottom: 40,
    },
    roleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#DDDDDD',
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
        color: '#1C1C1E',
        letterSpacing: 0.5,
    },
    roleDescription: {
        fontSize: 14,
        color: '#555',
        marginTop: 4,
    },
    registerContainer: {
        flexDirection: 'row',
        alignItems: 'center', // Alinea verticalmente el texto y el botón
    },
    registerText: {
        color: '#555',
        fontSize: 14,
    },
    // NUEVO: Estilo para el botón de registro para alinear el texto y el icono
    registerButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    registerLink: {
        color: '#fa6205',
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