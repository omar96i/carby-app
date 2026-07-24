import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const AlertaModal = ({ visible, mensaje, onCerrar, titulo = "Atención", tipo = "error", onPrimary, primaryLabel = "Entendido" }) => {
    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onCerrar}
        >
            <View style={styles.fondo}>
                <View style={styles.modal}>
                    <Text style={styles.titulo}>{tipo === "success" ? "¡Listo!" : tipo === "confirm" ? "¿Estás seguro?" : tipo === "info" ? "Información" : "⚠ ¡Algo salió mal!"}</Text>
                    <Text style={styles.mensaje}>{mensaje}</Text>

                    <View style={styles.botones}>
                        {onPrimary && (
                            <TouchableOpacity onPress={onPrimary} style={[styles.boton, styles.botonPrimario]}>
                                <Text style={styles.botonTexto}>{primaryLabel}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={onCerrar} style={[styles.boton, onPrimary && styles.botonSecundario]}>
                            <Text style={[styles.botonTexto, onPrimary && styles.botonSecundarioTexto]}>{onPrimary ? "Volver" : "Entendido"}</Text>
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
    botones: {
        flexDirection: 'row',
    },
    botonPrimario: {
        flex: 1,
    },
    botonSecundario: {
        backgroundColor: '#DDD',
        flex: 1,
    },
    botonSecundarioTexto: {
        color: '#666',
    },
});

export default AlertaModal;
