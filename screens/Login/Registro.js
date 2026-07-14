import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Montserrat_400Regular, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { useFonts } from 'expo-font';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9DFD05" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Botón Atrás */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <MaterialCommunityIcons name="arrow-left" color="#fff" size={24} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <Image source={require("../../assets/images/yar.png")} style={styles.logo} />

        <Text style={styles.title}>¿Cómo te quieres registrar?</Text>
        <Text style={styles.subtitle}>Elige la opción que mejor se adapte a ti.</Text>

        {/* --- OPCIÓN 1: CLIENTE --- */}
        <TouchableOpacity 
          style={styles.cardButton} 
          onPress={() => navigation.navigate("RegisterUser")}
          activeOpacity={0.7}
        >
          {/* Icono a la izquierda para coincidir con tu otra pantalla */}
          <FontAwesome6 name="user-large" size={28} color="#9DFD05" style={styles.iconLeft} />
          
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>CLIENTE</Text>
            <Text style={styles.cardDescription}>
              Pide lo que necesitas y recíbelo en minutos.
            </Text>
          </View>
        </TouchableOpacity>

        {/* --- OPCIÓN 2: RIDER / MOTOTAXI --- */}
        <TouchableOpacity 
          style={styles.cardButton} 
          onPress={() => navigation.navigate("RegisterDomiciliary")}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../assets/images/llanta.png')}
            style={styles.iconImage}
            resizeMode="contain"
          />
          
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>REPARTIDOR O MOTOTAXI</Text>
            <Text style={styles.cardDescription}>
              Genera ingresos entregando o trasladando.
            </Text>
          </View>
        </TouchableOpacity>

        {/* --- OPCIÓN 3: COMERCIO --- */}
        <TouchableOpacity 
          style={styles.cardButton} 
          onPress={() => navigation.navigate("Comercio")}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="shop" size={26} color="#9DFD05" style={styles.iconLeft} />
          
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>COMERCIO ALIADO</Text>
            <Text style={styles.cardDescription}>
              Vende tus productos y recibe pagos directos.
            </Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#1C1C1E", // Color de fondo actualizado
  },
  container: {
    flex: 1,
    backgroundColor: "#1C1C1E", // Color de fondo actualizado
  },
  scrollViewContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 40,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 8,
    borderRadius: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  logo: {
    width: 180,
    height: 80,
    resizeMode: "contain",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: "Montserrat_700Bold",
    textAlign: "center",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
    color: "#A0A0A0", // Gris de tu paleta
    marginBottom: 40,
  },
  
  cardButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C2C2E", // Fondo de tarjeta gris oscuro
    borderWidth: 1.5,
    borderColor: "#444444", // Borde gris medio
    borderRadius: 12,
    width: "100%",
    padding: 20,
    marginBottom: 20,
  },
  textContainer: {
    flex: 1,
  },
  iconLeft: {
    marginRight: 20,
    width: 32, // Ancho fijo para alinear textos verticalmente
    textAlign: 'center',
  },
  iconImage: {
    width: 30,
    height: 30,
    marginRight: 20,
    tintColor: "#9DFD05", // TRUCO: Pintamos la imagen de la llanta del color verde neón
  },
  cardTitle: {
    color: "#FFFFFF",
    fontFamily: "Montserrat_700Bold", // Usando tu fuente Montserrat
    fontSize: 16,
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase', // Para que se vea como "CLIENTE"
  },
  cardDescription: {
    color: "#A0A0A0",
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
});