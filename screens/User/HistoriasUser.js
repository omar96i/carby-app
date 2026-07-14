import { useNavigation } from "@react-navigation/native";
import { SafeAreaView, TextInput, View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_500Medium } from "@expo-google-fonts/inter";
import React from "react";

export default function HistoriasUser() {
    const navigation = useNavigation();

    let [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_700Bold,
        Inter_500Medium,
    });

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
                <ScrollView contentContainerStyle={styles.scrollContainer1}></ScrollView>
                <Text style={styles.sectionTitle5}>Mandados realizados</Text>
                <View style={styles.card2}>

                    <View style={styles.details}>
                        <Text style={styles.label1}>Nombre de mandados</Text>
                        <Text style={styles.label1}>Fecha</Text>
                        <Text style={styles.label1}>Valor</Text>
                    </View>
                    <View style={styles.placaContainer}>
                        <Text style={styles.label1}>NO126584</Text>
                        <Text style={styles.label2}>20/02/2025</Text>
                        <Text style={styles.label2}>$20.000</Text>
                    </View>
                    <TouchableOpacity style={styles.continueButton} onPress={() => navigation.navigate("StepOnce")}>
                        <Text style={styles.continueText}>Ver más detalles</Text>
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
    details: {
        flex: 1,
        resizeMode: "contain",
        marginTop: -30,
    },
    label1: {
        fontSize: 16,
        color: "#0000000",
        fontFamily: "Inter_700Bold",

    },
    label2: {
        fontSize: 16,
        color: "#0000000",
        fontFamily: "Inter_400Regular",

    },
    card2: {
        flexDirection: "row",
        borderWidth: 1,
        borderColor: "#333",  // Mantener solo un borderColor
        borderRadius: 20, // Se mantiene el valor más grande
        padding: 15,
        alignItems: "center",
        backgroundColor: "#fff",
        marginVertical: 10,
        marginBottom: 30,
        minHeight: 130,
        borderStyle: "dashed",
        
    },
    sectionTitle5: {
        fontFamily: "Inter_700Bold",
        fontSize: 24,
        color: "#000",
        marginBottom: 10,
        marginTop: 10, // Se eliminó el -0
        paddingLeft: 10,
    },
    placaContainer: {
        alignItems: "flex-end",
        marginTop: -30,
    },
    continueButton: {
        backgroundColor: "#197200",
        paddingVertical: 2, // Ajusta el padding vertical para hacer el botón más pequeño
        paddingHorizontal: 20, // Ajusta el padding horizontal para darle más espacio al texto
        borderRadius: 50,
        alignItems: "center",
        width: 180,  // Ajusta el ancho
        
        position: 'absolute',    // Hace que el botón se salga del flujo normal del layout
        top: 100,                 // Ajusta la distancia desde el borde superior
        right: 10,               // Ajusta la distancia desde el borde derecho
    },
    
    continueText: {
        color: "#fff",
        fontSize: 12,  // Tamaño de fuente más pequeño
        fontFamily: "Inter_700Bold",
        textAlign: 'center',  // Centra el texto dentro del botón
    },
    
});
