// constants/url.js
import AsyncStorage from "@react-native-async-storage/async-storage";

// URLs fijas
const URL_PE = "https://back.yariders.com/api/";
const URL_CO = "https://co.yariders.com/api/";

// Variable interna (privada)
let currentUrl = URL_PE; 

// --- LA MAGIA ---
// Creamos un objeto que cuando se intenta leer como texto, devuelve la URL actual
export const BASE_URL = {
  toString: () => currentUrl,
  // Esto asegura que funcione en templates string `${BASE_URL}`
  valueOf: () => currentUrl, 
};

// --- FUNCIÓN PARA ACTUALIZAR (La usarás en el Login y al abrir la App) ---
export const configureUrl = async (forcedCountry = null) => {
  try {
    let pais = forcedCountry;
    
    // Si no nos fuerzan un país, buscamos en la memoria
    if (!pais) {
      pais = await AsyncStorage.getItem("pais_seleccionado");
    }

    // Actualizamos la variable interna
    if (pais === "CO") {
      currentUrl = URL_CO;
      console.log("🇨🇴 BASE_URL configurada a COLOMBIA");
    } else {
      currentUrl = URL_PE;
      console.log("🇵🇪 BASE_URL configurada a PERÚ");
    }
  } catch (error) {
    console.error("Error configurando URL:", error);
    currentUrl = URL_PE; // Fallback a Perú
  }
};

configureUrl();