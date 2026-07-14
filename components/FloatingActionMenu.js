import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const PlusIcon = ({ style }) => (
    <Animated.View style={[styles.plusIcon, style]}>
        <View style={[styles.plusLine, { transform: [{ rotate: '90deg' }] }]} />
        <View style={styles.plusLine} />
    </Animated.View>
);


const FloatingActionMenu = () => {
    const navigation = useNavigation();
    const [isOpen, setIsOpen] = useState(false);
    const animation = useRef(new Animated.Value(0)).current;

    const toggleMenu = () => {
        const toValue = isOpen ? 0 : 1;
        Animated.spring(animation, {
            toValue,
            friction: 6,
            useNativeDriver: true,
        }).start();
        setIsOpen(!isOpen);
    };

    const rotation = {
        transform: [{
            rotate: animation.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "45deg"],
            }),
        }],
    };

    const createSecondaryButtonStyle = (translateYValue) => ({
        opacity: animation,
        transform: [
            { scale: animation },
            {
                translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, translateYValue],
                }),
            },
        ],
    });

    return (
        <View style={styles.container}>
            {/* --- VALORES DE ANIMACIÓN AJUSTADOS --- */}

            <Animated.View style={[styles.secondaryButton, createSecondaryButtonStyle(-190)]}>
                <TouchableOpacity
                    style={styles.touchableArea}
                    onPress={() => navigation.navigate('CajaMisterioScreen')}
                >
                    <Image
                        source={require("../assets/images/boton-icono-misterio.jpeg")}
                        style={styles.secondaryIcon}
                    />
                </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[styles.secondaryButton, createSecondaryButtonStyle(-95)]}>
                <TouchableOpacity
                    style={styles.touchableArea}
                    onPress={() => navigation.navigate('BoleteriaScreen')}
                >
                    <Image
                        source={require("../assets/images/icono-fondo-azul.jpeg")}
                        style={styles.secondaryIcon}
                    />
                </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
                style={styles.mainButton}
                onPress={toggleMenu}
                activeOpacity={0.8}
            >
                <PlusIcon style={rotation} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 40,
        right: 20,
        alignItems: 'center',
        zIndex: 100,
    },
    mainButton: {
        width: 55,
        height: 55,
        borderRadius: 35,
        backgroundColor: '#9BFE03',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    secondaryButton: {
        position: 'absolute',
        width: 70,
        height: 80,
        borderRadius: 12, // Asegura que el contenedor tenga el borderRadius que quieres
        backgroundColor: '#FFF', // Este fondo blanco debería ser cubierto
        // justify/align ya no son estrictamente necesarios si la imagen cubre 100%,
        // pero no hacen daño.
        justifyContent: 'center', 
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 6,
        overflow: 'hidden', // <-- MUY IMPORTANTE: Recorta cualquier parte de la imagen que se salga
    },
    touchableArea: {
        width: '100%',
        height: '100%',
        // No necesitamos justify/align aquí si la imagen ya cubre 100%
    },
    secondaryIcon: {
        // --- ESTILO DEL ÍCONO PARA CUBRIR TODO EL CONTENEDOR ---
        width: '100%',          // La imagen ocupará todo el ancho del botón
        height: '100%',         // La imagen ocupará todo el alto del botón
        borderRadius: 12,       // ¡Importante! Mismo borderRadius que el botón padre
        resizeMode: 'cover',    // Asegura que la imagen cubra el 100% sin dejar espacios
    },
    plusIcon: {
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    plusLine: {
        position: 'absolute',
        width: '100%',
        height: 3,
        backgroundColor: '#FFF',
        borderRadius: 2,
    }
});

export default FloatingActionMenu;