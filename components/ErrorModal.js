import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AlertaModal = ({ visible, mensaje, onCerrar, titulo = "Atención", tipo = "error", onPrimary, primaryLabel = "Entendido" }) => {
    const isSuccess = tipo === "success";
    const isConfirm = tipo === "confirm";
    const isInfo = tipo === "info";

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onCerrar}
        >
            <View style={styles.fondo}>
                <View style={styles.card}>
                    {isSuccess && (
                        <View style={styles.iconCircle}>
                            <Ionicons name="checkmark-circle" size={48} color="#fa6205" />
                        </View>
                    )}
                    {isConfirm && (
                        <View style={styles.iconCircle}>
                            <Ionicons name="help-circle" size={48} color="#fa6205" />
                        </View>
                    )}
                    {tipo === "error" && (
                        <View style={styles.iconCircle}>
                            <Ionicons name="alert-circle" size={48} color="#fa6205" />
                        </View>
                    )}
                    <Text style={styles.titulo}>{titulo}</Text>
                    <Text style={styles.mensaje}>{mensaje}</Text>

                    <View style={styles.botones}>
                        {onPrimary && (
                            <TouchableOpacity onPress={onPrimary} style={styles.botonPrimario}>
                                <Text style={styles.botonPrimarioTexto}>{primaryLabel}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={onCerrar}
                            style={[styles.botonSecundario, !onPrimary && styles.botonUnico]}
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
    },
    card: {
        backgroundColor: '#FFFFFF',
        width: '82%',
        borderRadius: 24,
        paddingTop: 32,
        paddingHorizontal: 28,
        paddingBottom: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FFF0E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
    },
    titulo: {
        fontSize: 20,
        fontFamily: 'MontserratBold',
        color: '#1C1C1E',
        marginBottom: 10,
        textAlign: 'center',
    },
    mensaje: {
        fontSize: 14,
        fontFamily: 'MontserratRegular',
        color: '#666666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 28,
        paddingHorizontal: 4,
    },
    botones: {
        flexDirection: 'column',
        width: '100%',
        gap: 10,
    },
    botonPrimario: {
        backgroundColor: '#fa6205',
        paddingVertical: 16,
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
        fontSize: 16,
        fontFamily: 'MontserratBold',
        color: '#FFFFFF',
    },
    botonSecundario: {
        backgroundColor: '#FFF0E5',
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    botonSecundarioTexto: {
        fontSize: 16,
        fontFamily: 'MontserratBold',
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
