import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const AlertaModal = ({ visible, mensaje, onCerrar, titulo = "Atención" }) => {
    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onCerrar}
        >
            <View style={styles.fondo}>
                <View style={styles.modal}>
                    <Text style={styles.titulo}>⚠ ¡Algo salió mal!</Text>
                    <Text style={styles.mensaje}>{mensaje}</Text>

                    <TouchableOpacity onPress={onCerrar} style={styles.boton}>
                        <Text style={styles.botonTexto}>Entendido</Text>
                    </TouchableOpacity>
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
    modal: {
        backgroundColor: '#F0F0F0',
        width: '80%',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        elevation: 10,
    },
    titulo: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#1C1C1E'
    },
    mensaje: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        color: '#1C1C1E'

    },
    boton: {
        backgroundColor: '#fa6205',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    botonTexto: {
        fontWeight: 'bold',
    },
});

export default AlertaModal;
