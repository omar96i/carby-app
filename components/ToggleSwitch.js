import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_600SemiBold
} from "@expo-google-fonts/montserrat";

const ToggleSwitch = ({ isOn, setIsOn, title, onDataReceived, disabled = false }) => {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_600SemiBold
  });

  const toggleSwitch = (value) => {
    setIsOn(value);
    // Si hay una función de callback, llamarla con el nuevo valor
    if (onDataReceived) {
      onDataReceived(value);
    }
  };

  if (!fontsLoaded) {
    return null; // O un componente de carga mientras se cargan las fuentes
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.switchContainer}>
        <Switch
          trackColor={{ false: "#767577", true: "#fa6205" }}
          thumbColor={isOn ? "#fa6205" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          onValueChange={toggleSwitch}
          value={isOn}
          disabled={disabled}
          style={styles.switch}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#333',
    borderRadius: 10,
    marginVertical: 10,
  },
  title: {
    fontSize: 16,
    color: '#1C1C1E',
    width: '70%',
    flexShrink: 1,
    fontFamily: 'Montserrat_600SemiBold', // Usando la fuente semibold para el título
  },
  switchContainer: {
    width: '30%',
    alignItems: 'flex-end',
  },
  switch: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],  // Aumentar tamaño en 20%
  }
});

export default ToggleSwitch;