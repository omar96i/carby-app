import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image as RNImage } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

const ProviderTypeSelection = ({ userTypes, onSelectType, onGoBack }) => {
    const [selectedType, setSelectedType] = useState(null);

    const providerDetails = {
        'comercio': { label: 'Comercio', desc: 'Vende productos y servicios.', icon: 'shop' },
        'comercial': { label: 'Comercio', desc: 'Vende productos y servicios.', icon: 'shop' },
        'rider.moto': { label: 'Delivery', desc: 'Envíos y mensajería', icon: 'motorcycle' },
        'moto': { label: 'Delivery', desc: 'Envíos y mensajería', icon: 'motorcycle' },
        'rider.taxi': { label: 'Particular', desc: 'Transporte de pasajeros', icon: 'car' },
        'taxi': { label: 'Particular', desc: 'Transporte de pasajeros', icon: 'car' }
    };

    const renderIcon = (iconName, isSelected) => {
        // Verificar si es imagen (png/jpg)
        const isCustomImage = iconName && (iconName.includes('.png') || iconName.includes('.jpg'));

        if (isCustomImage) {
            return (
                <RNImage
                    source={require(`../assets/images/tuk-tuk.png`)} 
                    style={[styles.customIcon, isSelected && styles.customIconActive]}
                />
            );
        } else {
            return (
                <FontAwesome5
                    name={iconName || 'question'}
                    size={32}
                    color={isSelected ? '#F2F2F7' : "#fa6205"} // Icono oscuro si está seleccionado
                    solid
                />
            );
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
                <FontAwesome5 name="arrow-left" size={16} color="#A0A0A0" />
                <Text style={styles.backButtonText}>Volver atrás</Text>
            </TouchableOpacity>

            <RNImage source={require("../assets/images/nuevo-icono.jpeg")} style={styles.logo} />
            <Text style={styles.title}>¿Cómo quieres trabajar?</Text>

            {/* Grid */}
            <View style={styles.grid}>
                {userTypes.map((type) => {
                    const isSelected = selectedType === type.id;
                    
                    // Buscamos en el diccionario, si no existe usamos los datos originales
                    const details = providerDetails[type.id] || { 
                        label: type.label, 
                        desc: 'Servicio disponible', 
                        icon: 'circle' 
                    };

                    return (
                        <TouchableOpacity
                            key={type.id}
                            style={[
                                styles.gridItem,
                                isSelected && styles.gridItemActive,
                            ]}
                            onPress={() => {
                                setSelectedType(type.id);
                                onSelectType(type.id);
                            }}
                        >
                            {renderIcon(details.icon, isSelected)}

                            <Text style={[styles.gridItemTitle, isSelected && styles.textActive]}>
                                {details.label}
                            </Text>
                            
                            <Text style={[styles.gridItemDescription, isSelected && styles.textDescActive]}>
                                {details.desc}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Text style={styles.footerText}>
                Elige una opción para iniciar registro.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    backButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10,
    },
    backButtonText: {
        color: '#555',
        fontSize: 16,
        marginLeft: 8,
        fontWeight: '600',
    },
    logo: {
        width: 80,
        height: 80,
        resizeMode: 'contain',
        marginTop: 40,
        marginBottom: 20,
        borderRadius: 16,
    },
    title: {
        fontSize: 22,
        fontFamily: 'Montserrat_700Bold', // Asegurando fuente si la tienes cargada globalmente
        fontWeight: 'bold',
        color: '#1C1C1E',
        textAlign: 'center',
        marginBottom: 30,
    },
    grid: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    gridItem: {
        width: '48%', // 2 columnas perfectas
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DDDDDD',
        borderRadius: 16,
        paddingVertical: 25,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        minHeight: 150,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    gridItemActive: {
        backgroundColor: '#fa6205',
        borderColor: '#fa6205',
        transform: [{scale: 1.02}] // Pequeño efecto pop al seleccionar
    },
    gridItemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1C1C1E',
        marginTop: 15,
        textAlign: 'center',
    },
    textActive: {
        color: '#F2F2F7', // Texto negro sobre fondo verde
    },
    gridItemDescription: {
        fontSize: 12,
        color: '#555',
        textAlign: 'center',
        marginTop: 6,
        paddingHorizontal: 5,
        lineHeight: 16,
    },
    textDescActive: {
        color: '#333333', // Texto gris oscuro sobre fondo verde
        fontWeight: '500'
    },
    // Imágenes Custom
    customIcon: {
        width: 45,
        height: 45,
        resizeMode: 'contain',
        tintColor: "#fa6205", 
    },
    customIconActive: {
        tintColor: '#F2F2F7',
    },
    footerText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        position: 'absolute',
        bottom: 50,
    },
});

export default ProviderTypeSelection;