// 1. IMPORTACIONES
import React, { useState, useEffect, useCallback } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    RefreshControl,
    Alert,
    Modal, // Importamos el componente Modal
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { API_SECRET_TOKEN } from '../../utils/token';
import { Feather } from '@expo/vector-icons';
import { BASE_URL } from "../../constants/url";
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Componente BoletaCard Rediseñado ---
const BoletaCard = ({ item, onShowQr }) => {
    const evento = item.localidad?.evento;
    const localidad = item.localidad;

    const fechaFormateada = evento ? new Date(evento.fecha_evento).toLocaleDateString('es-PE', {
        day: '2-digit', month: 'long', year: 'numeric'
    }) : 'Fecha no disponible';

    const numeroBoleta = `${localidad?.prefijo || ''}${item.numeracion || ''}`;

    return (
        <TouchableOpacity onPress={() => onShowQr(item)} style={styles.ticketContainer} activeOpacity={0.8}>
            {/* Sección Izquierda: QR y Estado */}
            <View style={styles.leftSection}>
                <Image
                    source={{ uri: item.qr_base64 }}
                    style={styles.qrImage}
                />
                <View style={[styles.statusBadge, { backgroundColor: item.estado === 'approved' ? '#28a745' : '#ffc107' }]}>
                    <Text style={styles.statusBadgeText}>
                        {item.estado === 'approved' ? 'APROBADO' : 'PENDIENTE'}
                    </Text>
                </View>
            </View>

            {/* Separador punteado */}
            <View style={styles.separator} />

            {/* Sección Derecha: Detalles del Evento */}
            <View style={styles.rightSection}>
                <Text style={styles.cardEventName} numberOfLines={2}>{evento?.nombre}</Text>
                <Text style={styles.cardDate}>{fechaFormateada}</Text>

                <View style={styles.detailRow}>
                    <Feather name="map-pin" size={14} color="#666" />
                    <Text style={styles.detailText}>{localidad?.nombre}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Feather name="tag" size={14} color="#666" />
                    <Text style={styles.detailText}>Boleta: {numeroBoleta}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

// --- Componente Principal Actualizado ---
const MisComprasScreen = ({ navigation }) => {
    const [boletas, setBoletas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isQrModalVisible, setIsQrModalVisible] = useState(false);
    const [selectedBoletaForQr, setSelectedBoletaForQr] = useState(null);
    const isFocused = useIsFocused();
    const [cliente, setCliente] = useState(null);

    // 2. NUEVA FUNCIÓN que orquesta todo el proceso
    const loadClientAndFetchBoletas = useCallback(async () => {
        setIsLoading(true);
        try {
            // --- PASO A: Obtener info del usuario autenticado (adaptado de tu código) ---
            const userId = await AsyncStorage.getItem("userId");
            const token = await AsyncStorage.getItem("userToken");
            if (!userId || !token) throw new Error("Usuario no autenticado.");

            const userResponse = await fetch(`${BASE_URL}usuario/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!userResponse.ok) throw new Error("No se pudo obtener la información del usuario.");
            const userData = await userResponse.json();
            // --- PASO B: Crear o actualizar el cliente en el sistema de boletería ---
            const clientPayload = {
                nombre: userData.data.nombre_completo,
                correo: userData.data.email,
                tipo_documento: userData.data.tipo_documento || 'DNI', // Asume un valor por defecto si es necesario
                documento: userData.data.numero_documento,
                departamento: userData.data.departamento,
                provincia: userData.data.ciudad,
                distrito: userData.data.distrito
            };

            const clientResponse = await fetch(`https://boleteria.yariders.com/api/clientes`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-API-KEY': API_SECRET_TOKEN,
                },
                body: JSON.stringify(clientPayload),
            });
            if (!clientResponse.ok) throw new Error("No se pudo registrar la información del cliente.");
            const clientResult = await clientResponse.json();
            const clienteObtenido = clientResult.cliente;
            if (!clienteObtenido?.id) throw new Error("La API de clientes no devolvió un ID válido.");
            setCliente(clienteObtenido);
            await fetchBoletas(clienteObtenido.id);

        } catch (error) {
            console.error("Error en el proceso de carga:", error);
            Alert.alert("Error", "No se pudo cargar tu información. Por favor, intenta de nuevo.");
        } finally {
            setIsLoading(false);
        }
    }, [fetchBoletas]);

    const fetchBoletas = useCallback(async (clienteId) => {
        try {
            if (!clienteId) {
                console.log("ID de cliente no proporcionado, saltando la carga de boletas.");
                return;
            }
            const url = `https://boleteria.yariders.com/api/clientes/${clienteId}/boletas`;
            const response = await fetch(url, { headers: { 'Accept': 'application/json', 'X-API-KEY': API_SECRET_TOKEN } });
            if (!response.ok) throw new Error('Error al obtener las boletas.');
            const result = await response.json();
            if (result.status) {
                setBoletas(result.data);
            } else {
                setBoletas([]);
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "No se pudieron cargar tus compras.");
        }
    }, []);

    useEffect(() => {
        if (isFocused) {
            loadClientAndFetchBoletas();
        }
    }, [isFocused, loadClientAndFetchBoletas]);

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchBoletas();
        setIsRefreshing(false);
    }, [fetchBoletas]);

    const handleSyncPurchases = useCallback(async () => {
        setIsSyncing(true);
        try {
            const url = `https://boleteria.yariders.com/api/clientes/${cliente.id}/validar-pagos`;
            const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json', 'X-API-KEY': API_SECRET_TOKEN } });
            if (!response.ok) throw new Error("Error en la validación");
            await fetchBoletas();
            Alert.alert("Éxito", "Tus compras han sido sincronizadas.");
        } catch (error) {
            console.error("Error al sincronizar:", error);
            Alert.alert("Error", "No se pudo completar la sincronización.");
        } finally {
            setIsSyncing(false);
        }
    }, [fetchBoletas]);

    const openQrModal = (boleta) => {
        setSelectedBoletaForQr(boleta);
        setIsQrModalVisible(true);
    };

    const closeQrModal = () => {
        setIsQrModalVisible(false);
        setSelectedBoletaForQr(null);
    };

    if (isLoading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color="#8d24b6" /></View>;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.navigate('BoleteriaScreen')} style={styles.headerButton}>
                    <Feather name="chevron-left" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mis Compras</Text>
                <TouchableOpacity onPress={loadClientAndFetchBoletas} style={styles.headerButton} disabled={isSyncing}>
                    {isSyncing ? <ActivityIndicator color="#8d24b6" /> : <Feather name="refresh-cw" size={22} color="#333" />}
                </TouchableOpacity>
            </View>

            <FlatList
                data={boletas}
                renderItem={({ item }) => <BoletaCard item={item} onShowQr={openQrModal} />}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={() => (
                    <View style={styles.centered}>
                        <Text style={styles.emptyText}>Aún no tienes boletas.</Text>
                        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Home')}>
                            <Text style={styles.buttonText}>Explorar Eventos</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />

            <View style={styles.footer}>
                <TouchableOpacity onPress={loadClientAndFetchBoletas} disabled={isSyncing}>
                    <Text style={styles.footerText}>¿No ves tus compras? <Text style={styles.footerLink}>Sincronizar ahora</Text></Text>
                </TouchableOpacity>
            </View>

            <Modal
                animationType="fade"
                transparent={true}
                visible={isQrModalVisible}
                onRequestClose={closeQrModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Entrada para:</Text>
                        <Text style={styles.modalEventName}>{selectedBoletaForQr?.localidad?.evento?.nombre}</Text>

                        <Image
                            source={{ uri: selectedBoletaForQr?.qr_base64 }}
                            style={styles.qrModalImage}
                        />

                        <Text style={styles.modalTicketInfo}>
                            {selectedBoletaForQr?.localidad?.nombre} - Boleta: {selectedBoletaForQr?.localidad?.prefijo}{selectedBoletaForQr?.numeracion}
                        </Text>

                        <TouchableOpacity style={styles.closeButton} onPress={closeQrModal}>
                            <Text style={styles.closeButtonText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

// --- ESTILOS ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f4f2f8' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    listContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingTop: 50, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8e8e8' },
    headerTitle: { fontSize: 20, fontWeight: '600', color: '#333' },
    headerButton: { padding: 5, width: 40, alignItems: 'center' },
    emptyText: { fontSize: 18, color: '#666', marginBottom: 20, textAlign: 'center' },
    button: { backgroundColor: '#8d24b6', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 },
    buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
    ticketContainer: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, flexDirection: 'row', elevation: 4, shadowColor: '#5a3a69', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
    leftSection: { width: 100, padding: 10, alignItems: 'center', justifyContent: 'space-between', borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
    qrImage: { width: 70, height: 70 },
    separator: { width: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc', marginVertical: 10 },
    rightSection: { flex: 1, padding: 15, justifyContent: 'center' },
    cardEventName: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 6 },
    cardDate: { fontSize: 12, color: '#888', marginBottom: 10 },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    detailText: { fontSize: 14, color: '#555', marginLeft: 6 },
    statusBadge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, width: '100%', alignItems: 'center' },
    statusBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 20, paddingBottom: 30, backgroundColor: '#f4f2f8', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e8e8e8' },
    footerText: { color: '#666' },
    footerLink: { color: '#8d24b6', fontWeight: '600' },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
    modalContainer: { backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '90%' },
    modalTitle: { fontSize: 16, color: '#666' },
    modalEventName: { fontSize: 22, fontWeight: '700', color: '#333', textAlign: 'center', marginBottom: 20 },
    qrModalImage: { width: 250, height: 250, marginBottom: 20 },
    modalTicketInfo: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 25 },
    closeButton: { backgroundColor: '#8d24b6', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 50 },
    closeButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
});

export default MisComprasScreen;