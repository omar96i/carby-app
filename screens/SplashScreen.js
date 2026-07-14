import React, { useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    const goToNext = async () => {
      try {
        await AsyncStorage.setItem('hasSeenSplashVideo', 'true');
      } catch (e) {
        console.error("No se pudo guardar estado del Splash:", e);
      }

      setTimeout(() => {
        navigation.replace('AuthLoadingScreen');
      }, 2500); // espera 2.5 segundos
    };

    global.splashScreenActive = true;
    goToNext();

    return () => {
      global.splashScreenActive = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/images/nuevo-icono.jpeg')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#fa6205" style={styles.spinner} />
      <Text style={styles.text}>Cargando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center'
  },
  logo: {
    width: 250,
    height: 250,
    borderRadius: 24,
    marginBottom: 40,
  },
  spinner: {
    marginVertical: 20,
  },
  text: {
    color: '#1C1C1E',
    fontSize: 18,
    marginTop: 10,
  }
});
