import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    SafeAreaView,
    Modal,
    ActivityIndicator,
    StatusBar,
    ImageBackground,
    Linking,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Para leer el token
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getMyBalance } from '../../utils/api';
import AlertaModal from "../../components/ErrorModal";


// --- CONFIGURACIÓN ---
const API_BASE_URL = 'https://back.yariders.com/api';
const STORAGE_BASE_URL = 'https://back.carbycol.com/storage';

// Se crea una instancia de axios que se configurará con el token más adelante
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
});


// --- COMPONENTES ---

const PointsHeader = ({ balance, onInfoPress, onAddPointsPress }) => {

    const formattedBalance = Number(balance).toLocaleString('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return (
        <View style={styles.pointsHeader}>
            <View>
                <Text style={styles.pointsTitle}>Puntos de Fidelidad</Text>
                <Text style={styles.pointsValue}>{formattedBalance} Puntos</Text>
            </View>
            <View style={styles.headerActions}>
                <TouchableOpacity style={styles.addPointsButton} onPress={onAddPointsPress}>
                    <Text style={styles.addPointsButtonText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.infoButton} onPress={onInfoPress}>
                    <Text style={styles.infoButtonText}>i</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const formatEventDate = (dateString) => {
    if (!dateString) return null;
    const options = { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const date = new Date(dateString);
    const formatted = new Intl.DateTimeFormat('es-ES', options).format(date);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const MysteryBoxCard = ({ box, onPress, isSubscribed }) => (
    <TouchableOpacity style={[styles.card, isSubscribed && styles.subscribedCardBorder]} onPress={onPress}>
        <ImageBackground
            source={{ uri: `${STORAGE_BASE_URL}/${box.icono}` }}
            style={styles.cardBackground}
            blurRadius={15}
        >
            <View style={styles.solidOverlay}>
                {isSubscribed && (
                    <View style={styles.subscribedBanner}>
                        <Text style={styles.subscribedBannerText}>YA ESTÁS INSCRITO</Text>
                    </View>
                )}
                {box.fecha_hora_inicio && (
                    <View style={styles.dateBanner}>
                        <Text style={styles.dateBannerText}>
                            Sorteo: {formatEventDate(box.fecha_hora_inicio)}
                        </Text>
                    </View>
                )}
                <Image source={{ uri: `${STORAGE_BASE_URL}/${box.icono}` }} style={styles.cardForegroundImage} />
                <Text style={styles.cardTitle}>{box.nombre}</Text>
                <Text style={styles.cardValue}>{parseFloat(box.valor).toFixed(2)} Puntos</Text>
                <Text style={styles.cardActionText}>
                    {isSubscribed ? "Ver detalles y unirte al evento" : "Toca para ver los premios"}
                </Text>
            </View>
        </ImageBackground>
    </TouchableOpacity>
);

// --- PANTALLA PRINCIPAL ---

const CajaMisterioScreen = () => {
    const [mysteryBoxes, setMysteryBoxes] = useState([]);
    const [subscribedBoxId, setSubscribedBoxId] = useState(null);
    const [selectedBox, setSelectedBox] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);
    const navigation = useNavigation();
    const [tooltipVisible, setTooltipVisible] = useState(false);

    const [balance, setBalance] = useState(0);
    const [refreshing, setRefreshing] = useState(false); // Para el pull-to-refresh
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

    const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
        setAlertData({ message, type, onPrimary, primaryLabel });
        setAlertVisible(true);
    };

    // Función para obtener los datos, envuelta en useCallback para optimización
    const fetchBalance = useCallback(async () => {
        const fetchedBalance = await getMyBalance();
        if (fetchedBalance !== null) {
            setBalance(fetchedBalance);
        }
        setLoading(false);
        setRefreshing(false);
    }, []);

    // Hook que se ejecuta cada vez que la pantalla entra en foco
    useFocusEffect(
        useCallback(() => {
            console.log("entro a el focus")
            setLoading(true); // Muestra el loader al entrar
            fetchBalance();
        }, [fetchBalance])
    );

    // Función para el refresco manual
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchBalance();
    }, [fetchBalance]);



    useEffect(() => {
        const fetchData = async () => {
            try {
                const userToken = await AsyncStorage.getItem('userToken');

                if (userToken) {
                    api.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
                    const [boxesResponse, subscriptionResponse] = await Promise.all([
                        api.get('/mystery-boxes'),
                        api.get('/my-mystery-box').catch(error => {
                            if (error.response && error.response.status === 404) {
                                return null;
                            }
                            throw error;
                        })
                    ]);
                    setMysteryBoxes(boxesResponse.data);
                    if (subscriptionResponse && subscriptionResponse.data) {
                        setSubscribedBoxId(subscriptionResponse.data.id);
                    }
                } else {
                    console.log("Usuario no autenticado, cargando solo cajas públicas.");
                    const boxesResponse = await api.get('/mystery-boxes');
                    setMysteryBoxes(boxesResponse.data);
                }
            } catch (error) {
                console.error("Error al cargar datos:", error);
                showAlert("No se pudieron cargar los datos. Inténtalo de nuevo.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSubscribe = async (box) => {
        if (subscribedBoxId) {
            showAlert("Ya estás suscrito a una caja misteriosa.", "error");
            return;
        }
        setSubscribing(true);
        try {
            await api.post(`/mystery-boxes/${box.id}/subscribe`);
            setSubscribedBoxId(box.id);
            showAlert(`Te has suscrito a: ${box.nombre}`, "success");
            setSelectedBox({ ...box, isSubscribed: true });
        } catch (error) {
            const message = error.response?.data?.message || "No se pudo completar la suscripción.";
            if (error.response?.status === 401) {
                showAlert("Necesitas iniciar sesión para suscribirte.", "info");
            } else {
                showAlert(message, "error");
            }
        } finally {
            setSubscribing(false);
        }
    };

    const handleOpenModal = (box) => {
        setSelectedBox({ ...box, isSubscribed: box.id === subscribedBoxId });
        setModalVisible(true);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
        setSelectedBox(null);
    };

    const handleJoinMeeting = (url) => {
        Linking.openURL(url).catch(err => showAlert("No se pudo abrir el enlace.", "error"));
    };

    if (loading) {
        return <View style={[styles.container, styles.centered]}><ActivityIndicator size="large" color="#fa6205" /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <FlatList
                data={mysteryBoxes}
                ListHeaderComponent={() => (
                    <>
                        <PointsHeader
                            balance={balance}
                            onInfoPress={() => setTooltipVisible(true)}
                            onAddPointsPress={() => navigation.navigate('Recharge')}
                        />
                        <View style={styles.header}>
                            <Text style={styles.title}>Fidelización Clientes Carby</Text>
                            <Text style={styles.subtitle}>
                                Ganas puntos con tus compras y carreras para canjear por premios increíbles. ¡Sigue así!
                            </Text>
                        </View>
                    </>
                )}
                renderItem={({ item }) => (
                    <MysteryBoxCard
                        box={item}
                        onPress={() => handleOpenModal(item)}
                        isSubscribed={item.id === subscribedBoxId}
                    />
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContainer}
            />

            {selectedBox && (
                <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={handleCloseModal}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}>
                                <Text style={styles.closeButtonText}>×</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>{selectedBox.nombre}</Text>

                            {selectedBox.isSubscribed ? (
                                <TouchableOpacity style={styles.joinButton} onPress={() => handleJoinMeeting(selectedBox.link_reunion)}>
                                    <Text style={styles.joinButtonText}>¡Unirse al Evento en Vivo!</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={styles.joinButton} onPress={() => handleSubscribe(selectedBox)} disabled={subscribing}>
                                    {subscribing ? <ActivityIndicator color="#1C1C1E" /> : <Text style={styles.joinButtonText}>Suscribirme por {parseFloat(selectedBox.valor).toFixed(2)} Puntos</Text>}
                                </TouchableOpacity>
                            )}

                            <FlatList
                                data={selectedBox.items}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <View style={styles.prizeItem}>
                                        <Image source={{ uri: `${STORAGE_BASE_URL}/${item.imagen}` }} style={styles.prizeImage} />
                                        <View style={styles.prizeInfo}>
                                            <Text style={styles.prizeName}>{item.nombre}</Text>
                                            <Text style={styles.prizeProbability}>{item.probabilidad}% de probabilidad</Text>
                                        </View>
                                    </View>
                                )}
                            />

                            {selectedBox.iconos_patrocinadores && selectedBox.iconos_patrocinadores.length > 0 && (
                                <View style={styles.sponsorSection}>
                                    <Text style={styles.sponsorTitle}>Presentado por:</Text>
                                    <FlatList
                                        data={selectedBox.iconos_patrocinadores}
                                        keyExtractor={(item, index) => index.toString()}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        renderItem={({ item }) => (
                                            <Image
                                                source={{ uri: `${STORAGE_BASE_URL}/${item}` }}
                                                style={styles.sponsorImage}
                                            />
                                        )}
                                    />
                                </View>
                            )}
                        </View>
                    </View>
                </Modal>
            )}

            <Modal
                animationType="fade"
                transparent={true}
                visible={tooltipVisible}
                onRequestClose={() => setTooltipVisible(false)}
            >
                <TouchableOpacity style={styles.tooltipContainer} activeOpacity={1} onPressOut={() => setTooltipVisible(false)}>
                    <View style={styles.tooltipContent}>
                        <Text style={styles.tooltipTitle}>¿Cómo ganar puntos?</Text>
                        <Text style={styles.tooltipText}>
                            Acumulas puntos de fidelidad automáticamente al completar compras en nuestro marketplace, usar nuestros servicios de delivery o realizar carreras de transporte. ¡Mientras más uses la app, más ganas!
                        </Text>
                    </View>
                </TouchableOpacity>
            </Modal>
            <AlertaModal
              visible={alertVisible}
              mensaje={alertData.message}
              tipo={alertData.type}
              onCerrar={() => setAlertVisible(false)}
              onPrimary={alertData.onPrimary}
              primaryLabel={alertData.primaryLabel}
            />
        </SafeAreaView>
    );
};

// --- ESTILOS COMPLETOS ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    centered: { justifyContent: 'center', alignItems: 'center' },
    header: { paddingHorizontal: 20, paddingBottom: 10 },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 12, color: '#fa6205' },
    subtitle: { fontSize: 16, textAlign: 'center', color: '#B0B0B0', lineHeight: 24 },
    listContainer: { paddingHorizontal: 20 },
    card: {
        height: 400,
        borderRadius: 20,
        marginBottom: 25,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    subscribedCardBorder: {
        borderColor: '#fa6205',
    },
    cardBackground: { width: '100%', height: '100%' },
    solidOverlay: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(36, 36, 36, 0.75)',
    },
    dateBanner: {
        position: 'absolute',
        top: 0,
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingVertical: 8,
        alignItems: 'center',
    },
    dateBannerText: { color: '#1C1C1E', fontSize: 14, fontWeight: '600' },
    subscribedBanner: {
        position: 'absolute',
        left: -45,
        top: 170,
        backgroundColor: '#fa6205',
        paddingHorizontal: 10,
        paddingVertical: 8,
        transform: [{ rotate: '-90deg' }],
        zIndex: 10,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    subscribedBannerText: {
        color: '#1C1C1E',
        fontWeight: 'bold',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    cardForegroundImage: { width: 180, height: 180, marginBottom: 20 },
    cardTitle: { fontSize: 24, fontWeight: 'bold', color: '#1C1C1E', textAlign: 'center' },
    cardValue: { fontSize: 18, color: '#fa6205', marginTop: 8, fontWeight: '600' },
    cardActionText: { fontSize: 14, color: '#B0B0B0', marginTop: 15, fontStyle: 'italic', textAlign: 'center' },
    modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
    modalContent: { backgroundColor: '#2E2E2E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '75%' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#fa6205' },
    closeButton: { position: 'absolute', top: 15, right: 15, backgroundColor: '#404040', borderRadius: 15, width: 30, height: 30, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
    closeButtonText: { fontSize: 20, color: '#1C1C1E', lineHeight: 30 },
    joinButton: {
        backgroundColor: '#fa6205',
        borderRadius: 10,
        paddingVertical: 15,
        alignItems: 'center',
        marginBottom: 20,
    },
    joinButtonText: { color: '#1C1C1E', fontSize: 16, fontWeight: 'bold' },
    prizeItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, padding: 10, backgroundColor: '#D8D8D8', borderRadius: 10 },
    prizeImage: { width: 60, height: 60, borderRadius: 8, marginRight: 15 },
    prizeInfo: { flex: 1 },
    prizeName: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
    prizeProbability: { fontSize: 14, color: '#B0B0B0', marginTop: 4 },
    sponsorSection: {
        marginTop: 'auto',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#404040',
    },
    sponsorTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#B0B0B0',
        marginBottom: 10,
    },
    sponsorImage: {
        width: 60,
        height: 60,
        borderRadius: 10,
        marginRight: 10,
        backgroundColor: '#404040'
    },
    pointsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#D8D8D8',
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginTop: 40,
        borderRadius: 15,
        margin: 20,
    },
    pointsTitle: {
        color: '#B0B0B0',
        fontSize: 14,
    },
    pointsValue: {
        color: '#fa6205',
        fontSize: 22,
        fontWeight: 'bold',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addPointsButton: {
        backgroundColor: '#fa6205',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    addPointsButtonText: {
        color: '#1C1C1E',
        fontWeight: 'bold',
        fontSize: 22,
        lineHeight: 22, // Ajuste para centrar mejor el +
    },
    infoButton: {
        backgroundColor: '#FFFFFF',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoButtonText: {
        color: '#fa6205',
        fontWeight: 'bold',
        fontSize: 18,
    },
    tooltipContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    tooltipContent: {
        backgroundColor: '#2E2E2E',
        borderRadius: 15,
        padding: 20,
        width: '100%',
    },
    tooltipTitle: {
        color: '#fa6205',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    tooltipText: {
        color: '#1C1C1E',
        fontSize: 16,
        lineHeight: 24,
    },
});

export default CajaMisterioScreen;

