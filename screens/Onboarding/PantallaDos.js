
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Montserrat_400Regular, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { useFonts } from 'expo-font';

export default function PantallaDos() {
  const navigation = useNavigation();
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
  });
  return (
    <View style={styles.container}>
      <Image source={require("../../assets/images/image02.png")} style={styles.image} resizeMode="contain" />
      <View style={styles.separator} />
      <View style={styles.content}>
        <Text style={styles.title}>¡Yebo te lleva todo, en cualquier momento!</Text>
        <Text style={styles.subtitle}>
          Pide lo que necesites y recibelo en minutos.
        </Text>

        {/* Botón para ir a la siguiente pantalla */}
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("PantallaTres")}>
          <Text style={styles.buttonText}>Siguiente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
  },
  image: {
    width: "100%",
    height: 450,
    resizeMode: "contain",
  
  },
  content: {
    width: "100%",
    alignItems: "center",
    padding: 20,
   
  },
  title: {
    fontSize: 32, // Tamaño de fuente 32px
    fontFamily: "Montserrat_700Bold" ,
    fontWeight: "700", // Peso de la fuente 700
    textAlign: "center", // Alineación centrada
    lineHeight: 38.4, // Altura de línea 38.4px
    letterSpacing: -0.64, // -2% de 32px = -0.64
    marginVertical: 10,
  },
  subtitle: {
    fontSize: 15, // Tamaño de fuente 15px
    fontFamily: "Montserrat_400Regular" ,
    fontWeight: "400", // Peso de la fuente 400 (regular)
    textAlign: "center", // Alineación centrada
    lineHeight: 25, // Altura de línea 25px
    letterSpacing: 0, // Espaciado entre letras 0%
    color: "#666", // Color de letra
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#007C21",
    paddingVertical: 10, // Espaciado interno
    paddingHorizontal: 40, // Espaciado interno
    borderRadius: 56, // Redondeo del botón
    marginTop: 40, // Separación desde el contenido
    alignItems: "center", // Centra el texto dentro del botón
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 18.5, // Tamaño del texto
    fontWeight: "Montserrat_400Regular", // Negrita
    letterSpacing: 0.4, // Espaciado entre letras
    color: "#1C1C1E", // Color blanco
    textAlign: "center", // Alineación centrada
  },
  separator: {
    width: "45%", // Ajusta el ancho según lo necesites
    height: 3, // Grosor de la línea
    backgroundColor: "#000000", // Color de la línea (ajústalo según el diseño)
    marginVertical: 20, // Espaciado arriba y abajo
  },
  
  });