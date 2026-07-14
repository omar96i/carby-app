import React from "react";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Platform, Image } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_500Medium } from "@expo-google-fonts/inter";

export default function StepDieciseis() {

    const navigation = useNavigation();
    let [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_700Bold,
        Inter_500Medium,
    });

    return (
        <SafeAreaView style={styles.safeContainer}>
            <View style={styles.container}>

                {/* Botón Atrás */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome name="arrow-left" size={24} color="#1C1C1E" />
                </TouchableOpacity>
                <Text style={styles.sectionTitle}>Tu Billetera</Text>

                <View style={styles.blackRectangle}></View>

                <View style={styles.greenRectangle}>
                    <Text style={styles.text}>Saldo actual</Text>
                    <Text style={styles.text1}>$156.000</Text>
                </View>

                <Image
                    source={require("../../assets/images/Billetes.png")}
                    style={styles.image}
                />

                <TouchableOpacity style={styles.button2} onPress={() => navigation.navigate("StepDiecisiete")}>
                    <Text style={styles.title2}>Solicitar tranferencia</Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle2}>Tu Movimientos</Text>


                <View style={styles.card2}>

                    <View style={styles.details}>
                        <Text style={styles.label1}>Solicitud de retiro</Text>
                        <Text style={styles.label3}>NO1584</Text>
                    </View>
                    <View style={styles.placaContainer}>
                        <Text style={styles.label1}>Transferencia</Text>
                      
                        <Text style={styles.label4}>$80.000</Text>
                    </View>
                </View>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: "#222",
        paddingTop: Platform.OS === "android" ? 50 : 40, // Más espacio arriba
    },
    container: {
        flex: 1,
        padding: 20,
    },
    sectionTitle: {
        fontFamily: "Inter_700Bold",
        fontSize: 24,
        color: "#1C1C1E",
        marginBottom: 10,
        paddingLeft: 20,
        marginTop: 30, // Agregado para bajar el texto
    },
    sectionTitle2: {
        fontFamily: "Inter_700Bold",
        fontSize: 24,
        color: "#1C1C1E",
        marginBottom: 10,
        paddingLeft: 20,
        marginTop: 50, // Agregado para bajar el texto
    },

    blackRectangle: {
        backgroundColor: '#F0F0F0',
        width: '100%', // Ancho del rectángulo negro
        height: 115,   // Altura del rectángulo negro
        borderRadius: 10,
    },
    greenRectangle: {
        backgroundColor: '#fa6205', // Color verde
        width: '65.5%',              // Ancho del rectángulo verde (igual al negro)
        height: '26%',              // Altura de la mitad del rectángulo negro
        position: 'absolute',       // Posiciona el rectángulo verde encima
        top: 116.7,                     // Alinea el rectángulo verde en la parte superior del negro
        borderRadius: 10,           // Esquinas redondeadas
        left: '40%',
        height: 115,   // Altura del rectángulo verde
        justifyContent: 'center', // Para centrar el contenido
        alignItems: 'center',     // Para alinear el contenido en el centro
    },
    image: {
        width: 90,  // Ancho de la imagen
        height: 90, // Altura de la imagen
        position: 'absolute', // Posición absoluta para mover la imagen libremente
        top: 130,  // Distancia desde el borde superior
        right: 280, // Distancia desde el borde derecho
        justifyContent: 'center',  // Centra el texto verticalmente
        alignItems: 'center',      // Centra el texto horizontalmente
        borderRadius: 10,  // Esquinas redondeadas
    },

    text: {
        fontSize: 18,  // Tamaño de la fuente
        color: 'black', // Color del texto
        fontFamily: "Inter_700Bold",
        position: 'absolute', // Posiciona el texto de manera absoluta
        right: 10, // Pega el texto al borde derecho
        top: 25, // Ajusta el espacio desde el borde superior
    },
    text1: {
        fontSize: 45,  // Tamaño de la fuente
        color: 'black', // Color del texto
        fontFamily: "Inter_700Bold",
        textAlign: 'center', // Centra el texto dentro del rectángulo
        marginTop: 20,  // Ajusta la distancia entre "Saldo actual" y "$156.000"
        right: -10,
    },
    button2: {
        backgroundColor: '#fa6205',
        padding: 10,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        top: 20,  // Ajusta la distancia desde el borde superior
        width: 200,  // Aumenta el ancho del botón
        height: 50,  // Aumenta la altura del botón
    },
    title2: {
        fontFamily: "Inter_700Bold",
        color: 'black',
        fontSize: 14,

    },
    details: {
        flex: 1,
        resizeMode: "contain",
        marginTop: -30,
    },
    label1: {
        fontSize: 16,
        color: "#1C1C1E",
        fontFamily: "Inter_400Regular",
        marginTop: 35,

    },
    label2: {
        fontSize: 16,
        color: "#0000000",
        fontFamily: "Inter_400Regular",
        marginTop: 20,

    },
    placaContainer: {
        alignItems: "flex-end",
        marginTop: -30,
    },
    card2: {
        
        flexDirection: "row",
        borderWidth: 1,
        borderColor: "#fa6205",  // Mantener solo un borderColor
        borderRadius: 20, // Se mantiene el valor más grande
        padding: 15,
        alignItems: "center",
        backgroundColor: "#fff",
        marginVertical: 10,
        marginBottom: 30,
        minHeight: 130,
        borderStyle: "dashed",
        minHeight: 50,
        backgroundColor: "#222",
    },
    label3: {
        fontSize: 16,
        color: "#1C1C1E",
        fontFamily: "Inter_700Bold",
        marginTop: -3,

    },
    label4: {
        fontSize: 16,
        color: "#1C1C1E",
        fontFamily: "Inter_700Bold",
        marginTop: -3,

    },
});
