import { useNavigation } from "@react-navigation/native";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_500Medium } from "@expo-google-fonts/inter";
import React from "react";

export default function StepOnce() {
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

                {/* Detalles de tu mandado */}
                <Text style={styles.sectionTitle2}>Detalles del mandado</Text>
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
                <Text style={styles.sectionTitle5}>Datos de nuestro aliado</Text>
                <View style={styles.card2}>
                    <Image
                        source={require("../../assets/images/Persona.png")}
                        style={styles.image}
                    />
                    <View style={styles.details}>
                        <Text style={styles.label1}>Nombre de domiciliario</Text>
                        <Text style={styles.name}>Juan Mateo</Text>
                        <Text style={styles.label1}>Moto</Text>
                        <Text style={styles.moto}>Ns200</Text>
                        <Text style={styles.label1}>Teléfono</Text>
                        <Text style={styles.phone}>310 564 7854</Text>
                    </View>
                    <View style={styles.placaContainer}>
                        <Text style={styles.label2}>Placa</Text>
                        <Text style={styles.placa}>ASD44W</Text>
                    </View>
                </View>
                <Text style={styles.sectionTitle3}>Si necesitas avisarle algo,</Text>
                <Text style={styles.sectionTitle4}>escríbelo aquí.</Text>
                
                <TouchableOpacity style={styles.button}>
                      <Text style={styles.buttonText}>Mandado Completado</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Desembolso")}>
                      <Text style={styles.buttonText}>Solicitud Rembolso</Text>
                    </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    card2: {
        flexDirection: "row",
        borderWidth: 1,
        borderColor: "#999",  // Mantener solo un borderColor
        borderRadius: 20, // Se mantiene el valor más grande
        padding: 15,
        alignItems: "center",
        backgroundColor: "#fff",
        marginVertical: 10,
        marginBottom: 30,
        minHeight: 120,
        borderStyle: "dashed",
    },
    image: {
        width: 80,
        height: 100,
        borderRadius: 10,
        marginRight: 15,
    },
    details: {
        flex: 1,
        resizeMode: "contain",
    },
    name: {
        fontSize: 16,
        fontFamily: "Inter_700Bold",
      
        color: "#1E7D22",
    },
    moto: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#1E7D22",
        fontFamily: "Inter_700Bold",
    },
    phone: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#1E7D22",
    },
    placaContainer: {
        alignItems: "flex-end",
    },
    placa: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#1E7D22",
    },
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
        backgroundColor: "#1E7D22",
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
        color: "#fff",
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
        color: "#fff",
        fontFamily: "Inter_500Medium",
    },
    paymentOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 15,
        borderRadius: 10,
        marginBottom: 5,
    },
    card: {
        width: 40,
        height: 40,
        backgroundColor: "#f8f8f8",
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 3,
        flexDirection: "column",
        position: "absolute",
        bottom: 20, // Ajusta según necesidad
        right: 20, // Ajusta según necesidad
    },
      cardText: {
        fontSize: 12,
        fontFamily: "Inter_Bold",
        textAlign: "center",
      
      },
      button: {
        flexDirection: "row",
        alignItems: "center", // Centra los elementos verticalmente
        justifyContent: "center", // Centra los elementos horizontalmente
        backgroundColor: "#1E7D22", 
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30,
        marginTop: 10,
        alignSelf: "center", // Centra el botón dentro de su contenedor
    },
    
    buttonText: {
        color: "white",
        fontSize: 16,
        fontFamily: "Inter_400Regular",
        textAlign: "center", // Asegura que el texto esté centrado
    },
    
});
