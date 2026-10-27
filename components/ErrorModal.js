import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_H } = Dimensions.get("window");

const AlertaModal = ({ visible, mensaje, onCerrar, titulo = "Atención", tipo = "error", onPrimary, primaryLabel = "Entendido" }) => {
    const isSuccess = tipo === "success";
    const isConfirm = tipo === "confirm";

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onCerrar}
        >
            <View style={styles.fondo}>
                <View style={styles.card}>
                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {isSuccess ? (
                            <View style={styles.iconCircle}>
                                <Ionicons name="checkmark-circle" size={40} color="#fa6205" />
                            </View>
                        ) : isConfirm ? (
                            <View style={styles.iconCircle}>
                                <Ionicons name="help-circle" size={40} color="#fa6205" />
                            </View>
                        ) : (
                            <View style={styles.iconCircle}>
                                <Ionicons name="alert-circle" size={40} color="#fa6205" />
                            </View>
                        )}
                        <Text style={styles.titulo}>{titulo}</Text>
                        <Text style={styles.mensaje}>{mensaje}</Text>
                    </ScrollView>

                    <View style={styles.botones}>
                        {onPrimary && (
                            <TouchableOpacity onPress={onPrimary} style={styles.botonPrimario} activeOpacity={0.8}>
                                <Text style={styles.botonPrimarioTexto}>{primaryLabel}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={onCerrar}
                            style={[styles.botonSecundario, !onPrimary && styles.botonUnico]}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.botonSecundarioTexto, !onPrimary && styles.botonUnicoTexto]}>
                                {onPrimary ? "Volver" : "Entendido"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    fondo: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        maxWidth: 340,
        maxHeight: SCREEN_H * 0.8,
        borderRadius: 28,
        paddingTop: 24,
        paddingHorizontal: 24,
        paddingBottom: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 32,
        elevation: 16,
    },
    scroll: {
        maxHeight: SCREEN_H * 0.45,
    },
    scrollContent: {
        alignItems: 'center',
        paddingBottom: 8,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFF0E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    titulo: {
        fontSize: 18,
        fontFamily: 'Montserrat_700Bold',
        color: '#1C1C1E',
        marginBottom: 10,
        textAlign: 'center',
    },
    mensaje: {
        fontSize: 13,
        fontFamily: 'Montserrat_400Regular',
        color: '#555555',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 4,
    },
    botones: {
        flexDirection: 'column',
        width: '100%',
        gap: 10,
        marginTop: 16,
    },
    botonPrimario: {
        backgroundColor: '#fa6205',
        paddingVertical: 14,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#fa6205',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
    },
    botonPrimarioTexto: {
        fontSize: 15,
        fontFamily: 'Montserrat_700Bold',
        color: '#FFFFFF',
    },
    botonSecundario: {
        backgroundColor: '#FFF0E5',
        paddingVertical: 14,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    botonSecundarioTexto: {
        fontSize: 15,
        fontFamily: 'Montserrat_700Bold',
        color: '#1C1C1E',
    },
    botonUnico: {
        backgroundColor: '#fa6205',
        shadowColor: '#fa6205',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
    },
    botonUnicoTexto: {
        color: '#FFFFFF',
    },
});

export default AlertaModal;
