import React from 'react';
import { 
    SafeAreaView, 
    StyleSheet, 
    ActivityIndicator, 
    View, 
    Text, 
    TouchableOpacity,
    StatusBar
} from 'react-native';
import { WebView } from 'react-native-webview';

// Componente para mostrar la pasarela de pago
const PaymentWebView = ({ route, navigation }) => {
    const { url } = route.params;

    const renderLoading = () => (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fa6205" />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* ----- INICIO DEL HEADER PERSONALIZADO ----- */}
            <View style={styles.customHeader}>
                <Text style={styles.headerTitle}>Realizar Pago</Text>
                <TouchableOpacity onPress={() => navigation.navigate('CajaMisterioScreen')}>
                    <Text style={styles.closeButtonText}>Cerrar</Text>
                </TouchableOpacity>
            </View>
            {/* ----- FIN DEL HEADER PERSONALIZADO ----- */}

            <WebView
                source={{ uri: url }}
                style={styles.webView}
                startInLoadingState={true}
                renderLoading={renderLoading}
            />
        </SafeAreaView>
    );
};

// Estilos del componente
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    // --- ESTILOS NUEVOS PARA EL HEADER ---
    customHeader: {
        height: 120,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#D8D8D8',
    },
    headerTitle: {
        color: '#F5F5F5',
        fontSize: 17,
        fontWeight: '600',
    },
    closeButtonText: {
        color: '#fa6205',
        fontSize: 17,
        fontWeight: '500',
    },
    // --- FIN DE ESTILOS NUEVOS ---
    webView: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 50, // Lo movemos para que no se superponga con el header
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
});

export default PaymentWebView;