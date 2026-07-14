import { useNavigation } from "@react-navigation/native";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_500Medium } from "@expo-google-fonts/inter";
import React from "react";

export default function Desembolso() {
    const navigation = useNavigation();

    let [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_700Bold,
        Inter_500Medium,
    });
    const handlePayment = () => {
        setModalVisible(true); // Abre el modal
    };

    if (!fontsLoaded) {
        return null; // Asegura que no se renderice hasta que las fuentes estén cargadas
    }

    return (
        <SafeAreaView style={styles.safeContainer}>
            {/* Botón Atrás */}
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <FontAwesome name="arrow-left" size={24} color="#333" />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scrollContainer1}>

                {/* Detalles de tu mandado */}
                <Text style={styles.sectionTitle2}>Solicitud de regreso de dinero</Text>
                <View style={styles.card1}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Categoría</Text>
                        <Text style={styles.value}>Entrega de paquete</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Punto A</Text>
                        <Text style={styles.value}>Cra 9 # 18-46 apto202</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Punto B</Text>
                        <Text style={styles.value}>Cra 18 #15-45</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Valor</Text>
                        <Text style={styles.value}>$20.000</Text>
                    </View>
                </View>

                <View style={styles.container1}>
                    <Text style={styles.title2}>Solicitud de Reintegro</Text>

                    <Text style={styles.label2}>Monto a transferir</Text>
                    <Text style={styles.amount2}>$100.000</Text>

                    <View style={styles.row2}>
                        <View style={styles.column2}>
                            <Text style={styles.label2}>Banco</Text>
                            <Text style={styles.value2}>Nequi</Text>
                        </View>
                        <View style={styles.column2}>
                            <Text style={styles.label2}>Tipo de cuenta</Text>
                            <Text style={styles.value2}>Ahorros</Text>
                        </View>
                    </View>

                    <Text style={styles.label2}>Número de cuenta</Text>
                    <Text style={styles.accountNumber2}>3105672307</Text>
                    <TouchableOpacity style={styles.button}>
                        <Text style={styles.buttonText}>Solicitar transferencia</Text>
                    </TouchableOpacity>
                </View>


            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: "#fff", // Fondo blanco para evitar que se vea negro en algunos dispositivos
        paddingTop: 50, // Agrega un pequeño padding para mayor seguridad
    },
    scrollContainer1: {
        paddingHorizontal: 20, // Mantiene el contenido con márgenes adecuados
    },
    backButton: {
        marginBottom: 10,
        marginLeft: 10, // Ajusta la posición para que no quede pegado al borde
    },
    sectionTitle2: {
        fontFamily: "Inter_700Bold",
        fontSize: 18,
        color: "#000",
        marginBottom: 10,
        marginTop: 20,
        paddingLeft: 10,  // Reemplazo de `left`
    },
    sectionTitle3: {
        fontFamily: "Inter_700Bold",
        fontSize: 18,
        color: "#000",
        marginBottom: 10,
        marginTop: -5,
        paddingLeft: 10,
    },
    sectionTitle4: {
        fontFamily: "Inter_700Bold",
        fontSize: 18,
        color: "#000",
        marginBottom: 10,
        marginTop: -15,
        paddingLeft: 10,
    },
    sectionTitle5: {
        fontFamily: "Inter_700Bold",
        fontSize: 18,
        color: "#000",
        marginBottom: 10,
        marginTop: 0, // Se eliminó el -0
        paddingLeft: 10,
    },
    card1: {
        backgroundColor: "#fa6205",
        borderRadius: 25,
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
        color: "#1C1C1E",
        fontFamily: "Inter_500Medium",
        marginBottom: 5,
    },
    label1: {
        fontSize: 14,
        color: "#666",
        fontFamily: "Inter_500Medium",
    },
    label2: {
        fontSize: 14,
        color: "#666",
        fontFamily: "Inter_500Medium",
        marginRight: 19,
    },
    value: {
        fontSize: 12,
        color: "#1C1C1E",
        fontFamily: "Inter_500Medium",
    },
    container1: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 15,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 3,
        width: 350,
        alignSelf: "center",
        marginTop: 10,
    },

    title2: {
        fontFamily: "Inter_700Bold",
        fontSize: 24,
        color: "#fa6205",
        marginBottom: 10,
    },
    label2: {
        fontFamily: "Inter_400Regular",
        fontSize: 14,
        color: "#000000",
        marginTop: 5,
    },
    amount2: {
        fontFamily: "Inter_700Bold",
        fontSize: 28,
        color: "gray",
    },
    row2: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 10,
    },
    column2: {
        flex: 1,
    },
    accountNumber2: {
        fontFamily: "Inter_700Bold",
        fontSize: 26,
        color: "gray",
        marginBottom: 10,
    },
    value2: {
        fontFamily: "Inter_700Bold",
        fontSize: 20,
        fontWeight: "bold",
        color: "gray",
    },
    button: {
        backgroundColor: "#fa6205",
        paddingVertical: 12,
        borderRadius: 30,
        alignItems: "center",
        width: 200,
        marginTop: 10,
    },
    buttonText: {
        fontFamily: "Inter_400Regular",
        color: "#1C1C1E",
        fontSize: 16,
    },
});
