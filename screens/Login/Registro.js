import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Montserrat_400Regular, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { useFonts } from 'expo-font';
import { C } from "../../components/registro/RegistroUI";

const OPCIONES = [
  { ruta: "RegisterUser", titulo: "CLIENTE", descripcion: "Pide lo que necesitas y recíbelo en minutos.", icono: "account" },
  { ruta: "RegisterDomiciliary", titulo: "DELIVERY O PARTICULAR", descripcion: "Genera ingresos con envíos o transporte.", icono: "steering" },
  { ruta: "Comercio", titulo: "COMERCIO ALIADO", descripcion: "Vende tus productos y recibe pagos directos.", icono: "storefront" },
];

export default function RegisterScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [elegida, setElegida] = useState(null);
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.brand} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <StatusBar style="dark" />
      <Image source={require("../../assets/images/carby-logo-blanco.png")} style={[styles.marca, { top: insets.top - 20 }]} />

      {/* Botón Atrás */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialCommunityIcons name="arrow-left" color={C.ink} size={22} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logo}>
          <Image source={require("../../assets/images/carby-logo-blanco.png")} style={styles.logoImage} />
        </View>

        <Text style={styles.title}>¿Cómo te quieres registrar?</Text>
        <Text style={styles.subtitle}>Elige la opción que mejor se adapte a ti.</Text>

        {OPCIONES.map((op) => {
          const on = elegida === op.ruta;
          return (
            <TouchableOpacity
              key={op.ruta}
              style={[styles.cardButton, on && styles.cardButtonOn]}
              onPress={() => setElegida(op.ruta)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, on && styles.iconBoxOn]}>
                <MaterialCommunityIcons name={op.icono} size={26} color={on ? C.surface : C.brand} />
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.cardTitle}>{op.titulo}</Text>
                <Text style={styles.cardDescription}>{op.descripcion}</Text>
              </View>

              <View style={[styles.radio, on && styles.radioOn]}>
                {on && <MaterialCommunityIcons name="check" size={15} color={C.surface} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.button, !elegida && styles.buttonOff]}
          disabled={!elegida}
          activeOpacity={0.8}
          onPress={() => navigation.navigate(elegida)}
        >
          <Text style={styles.buttonText}>Continuar</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color={C.surface} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
  },
  marca: {
    position: "absolute",
    right: -80,
    width: 260,
    height: 260,
    resizeMode: "contain",
    tintColor: "#E9E9EC",
  },
  backButton: {
    marginLeft: 20,
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: C.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: C.brand,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImage: {
    width: 52,
    height: 52,
    resizeMode: "contain",
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "Montserrat_800ExtraBold",
    textAlign: "center",
    color: C.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
    color: C.muted,
    marginBottom: 24,
  },
  cardButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.surface,
    borderRadius: 24,
    width: "100%",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardButtonOn: {
    borderColor: C.brand,
    backgroundColor: "#FFF8F3",
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: C.iconBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  iconBoxOn: {
    backgroundColor: C.brand,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    color: C.ink,
    fontFamily: "Montserrat_800ExtraBold",
    fontSize: 14,
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  cardDescription: {
    color: C.muted,
    fontFamily: "Montserrat_400Regular",
    fontSize: 12.5,
    lineHeight: 17,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.edge,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  radioOn: {
    borderColor: C.brand,
    backgroundColor: C.brand,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  button: {
    height: 58,
    borderRadius: 999,
    backgroundColor: C.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  buttonOff: {
    opacity: 0.45,
  },
  buttonText: {
    color: C.surface,
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
  },
});
