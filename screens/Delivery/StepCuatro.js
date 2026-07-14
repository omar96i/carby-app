import { useNavigation, useRoute } from "@react-navigation/native";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import IconMC from "react-native-vector-icons/AntDesign";
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_500Medium } from "@expo-google-fonts/inter";
import Modal from "react-native-modal";//Modal
import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url"; // Make sure this import is correct

export default function StepCuatro() {
    const [isModalVisible, setModalVisible] = useState(false);
    const [serviceName, setServiceName] = useState("");
    const [addressA, setAddressA] = useState("");
    const [addressB, setAddressB] = useState("");
    const [totalPrice, setTotalPrice] = useState(null);
    const navigation = useNavigation();
    const route = useRoute();
    
    // First, log the entire route params object to see what we're getting
   // console.log("Route params in StepCuatro:", route.params);
    
    // Try to get tripId directly from route or from stored value
    const [tripId, setTripId] = useState(route.params?.tripId || null);
    const [tripStatus, setTripStatus] = useState('pendiente');
    const [metodoPago, setMetodoPago] = useState("");
    const [modalShown, setModalShown] = useState(false); // Track if modal has been shown

    // First useEffect to set the tripId on component mount
    useEffect(() => {
        const initTripId = async () => {
            try {
                let id = route.params?.tripId;
                
                // If no ID in route params, try to get from AsyncStorage
                if (!id) {
                    console.log("No tripId in route params, checking AsyncStorage");
                    id = await AsyncStorage.getItem("currentTripId");
                    console.log("Retrieved from AsyncStorage:", id);
                }
                
                if (id) {
                    setTripId(id);
                    console.log("Set tripId state to:", id);
                } else {
                    console.error("No trip ID available");
                }
            } catch (err) {
                console.error("Error initializing tripId:", err);
            }
        };
        
        initTripId();
    }, [route.params]);

    useEffect(() => {
        const getData = async () => {
            try {
                const serviceName = await AsyncStorage.getItem("serviceName");
                const addressA = await AsyncStorage.getItem("addressA");
                const addressB = await AsyncStorage.getItem("addressB");
                const totalPrice = await AsyncStorage.getItem("totalPrice");

                if (serviceName !== null) setServiceName(serviceName);
                if (addressA !== null) setAddressA(addressA);
                if (addressB !== null) setAddressB(addressB);
                if (totalPrice !== null) setTotalPrice(totalPrice);
            } catch (error) {
                console.error("Error retrieving data:", error);
            }
        };

        getData();
        
        // Only proceed if we have a tripId
        if (!tripId) {
            console.log("Waiting for tripId to be initialized");
            return;
        }
        
        // Status polling functionality
        let intervalId;
        
        const checkTripStatus = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                
                console.log(`Fetching trip status for ID: ${tripId}`);
                const response = await fetch(`${BASE_URL}trips/${tripId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            
                const data = await response.json();
                console.log('Trip status check response:', data);
            
                if (response.ok) {
                    // Get the correct status field from the nested response structure
                    // Based on logs, it's in data.data.estado
                    const currentStatus = 
                        (data.data && data.data.estado) || 
                        data.estado || 
                        (data.trip && data.trip.estado);
                        
                    console.log(`Current trip status: ${currentStatus}`);
                    
                    // Show modal if status is 'aceptado', regardless of previous state
                    if (currentStatus === 'aceptado' && !modalShown) {
                        console.log('Trip is accepted! Showing modal...');
                        setTripStatus('aceptado');
                        setModalVisible(true);
                        setModalShown(true); // Mark modal as shown
                        
                        // Stop polling once we've shown the modal
                        if (intervalId) {
                            clearInterval(intervalId);
                        }
                    }
                } else {
                    console.error("Error retrieving trip status:", data.message || "Unknown error");
                }
            } catch (error) {
                console.error('Error checking trip status:', error);
            }
        };

        // Check immediately, then start polling
        checkTripStatus();
        intervalId = setInterval(() => {
            if (tripStatus !== 'aceptado') {
                checkTripStatus();
            } else {
                clearInterval(intervalId);
            }
        }, 3000);

        // Cleanup function
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [tripId, modalShown, tripStatus]); // Remove tripStatus dependency to avoid restarting polling

    let [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_700Bold,
        Inter_500Medium,
    });

    if (!fontsLoaded) {
        return <ActivityIndicator size="large" color="#197200" />;
    }

    return (
        <ScrollView style={styles.safeContainer}>
            <View style={styles.container}>

                {/* Botón Atrás */}
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <FontAwesome name="arrow-left" size={24} color="#333" />
                </TouchableOpacity>

                <View style={styles.stepsContainer}>
                    <View style={styles.stepItem}>
                        <IconMC name="checkcircle" size={50} color="#197200" style={{ marginTop: 15 }} />
                        <View style={styles.progressLine} />
                        <Text style={styles.step}>Paso 1{"\n"}Detalles básicos</Text>
                    </View>
                    <View style={styles.stepDivider} />
                    <View style={styles.stepItem}>
                        <IconMC name="checkcircle" size={50} color="#197200" style={{ marginTop: 15 }} />
                        <View style={styles.progressLineFull} />
                        <Text style={styles.step}>Paso 2{"\n"}Información</Text>
                    </View>
                    <View style={styles.stepDivider} />
                    <View style={styles.stepItem}>
                        <IconMC name="checkcircleo" size={24} color="#333" style={{ marginTop: 15 }} />
                        <Text style={styles.step}>Paso 3{"\n"}Confirmación</Text>
                    </View>
                </View>

                <View style={styles.container}>
                    <Text style={styles.sectionTitle2}>Detalles del mandado</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Text style={styles.label}>Categoría</Text>
                            <Text style={styles.value}>{serviceName}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Punto A</Text>
                            <Text style={styles.value}>{addressA}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Punto B</Text>
                            <Text style={styles.value}>{addressB}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Valor</Text>
                            <Text style={styles.value}>${parseFloat(totalPrice).toLocaleString()}</Text>
                        </View>
                    </View>
                    <View style={styles.container}>
                        <ActivityIndicator size={60} color="#197200" />
                        <Text style={styles.title}>Asignando domiciliario</Text>
                        <Text style={styles.subtitle}>
                            A continuación, te asignaremos alguien para realizar tu mandado.{"\n"}
                            Espera un momento por favor.
                        </Text>
                    </View>
                </View>
                <Modal isVisible={isModalVisible} backdropOpacity={0.5}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity style={{ position: "absolute", top: 5, right: 5 }} onPress={() => setModalVisible(false)}>
                            <IconMC name="close" size={24} color="black" />
                        </TouchableOpacity>
                        <Text style={styles.title5}>Domiciliario asignado</Text>
                        <Text style={styles.subtitle5}>
                            Ahora puedes ver como nos encargamos de tu mandado.
                        </Text>
                        <TouchableOpacity style={styles.button5} onPress={() => navigation.navigate("StepNueve")}>
                            <Text style={styles.buttonText5}>Ver mandado</Text>
                        </TouchableOpacity>
                    </View>
                </Modal>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: "#fff",
    },
    container: {
        flex: 1,
        padding: 20,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        width: 375,
        height: 48,
        marginTop: 30,
        alignSelf: "flex-start",
    },
    stepsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        marginBottom: 20,
        paddingVertical: 10,
    },
    stepItem: {
        alignItems: "center",
        flexDirection: "column",
        marginHorizontal: 15,
    },
    step: {
        textAlign: "center",
        fontFamily: "Inter_400Regular",
        fontSize: 14,
        color: "#000",
        marginBottom: -5,
        marginTop: 13,
        lineHeight: 22,
    },
    stepDivider: {
        height: 20,
    },
    progressLine: {
        width: '76%',
        height: 2,
        backgroundColor: 'green',
        position: 'absolute',
        top: 38,
        left: 76,
    },
    progressLineFull: {
        width: '102%',
        height: 2,
        backgroundColor: 'green',
        position: 'absolute',
        top: 38,
        left: 64,
    },
    sectionTitle2: {
        fontFamily: "Inter_700Bold",
        fontSize: 18,
        fontWeight: "bold",
        color: "#888",
        marginBottom: 10,
        marginTop: -25,
        left: 15,
    },
    card: {
        backgroundColor: "#1E7D22",
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 5,
    },
    label: {
        fontSize: 12,
        color: "#fff",
        fontFamily: "Inter_400Regular",
        flex: 1,
        flexWrap: 'wrap',
    },
    value: {
        fontSize: 12,
        color: "#fff",
        fontFamily: "Inter_400Regular",
        flex: 2,
        flexWrap: 'wrap',
    },
    title: {
        textAlign: "center",
        fontFamily: "Inter_700Bold",
        fontSize: 22,
        fontWeight: "bold",
        color: "#007C21",
        marginTop: 20,
    },
    subtitle: {
        fontSize: 18,
        fontFamily: "Inter_400Regular",
        color: "#333",
        textAlign: "center",
        marginTop: 10,
    },
    title5: {
        fontFamily: "Inter_700Bold",
        fontSize: 22,
        fontWeight: "bold",
        color: "#117C2D",
        textAlign: "center",
        marginBottom: 10,
    },
    subtitle5: {
        fontSize: 15,
        fontFamily: "Inter_400Regular",
        color: "#2A2A2A",
        textAlign: "center",
        marginBottom: 20
    },
    button5: {
        backgroundColor: "#007C21",
        paddingVertical: 10,
        paddingHorizontal: 100,
        borderRadius: 15,
        padding: 15,
        alignItems: "center",
    },
    buttonText5: {
        fontFamily: "Inter_400Regular",
        color: "white",
        fontSize: 16,
    },
    modalContent: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 10,
        alignItems: "center",
    },
});