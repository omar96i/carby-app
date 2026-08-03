import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useNotification } from "../../context/NotificationContext";
import { BASE_URL } from "../../constants/url";

// Función para verificar si es un usuario demo
const isDemoUser = async () => {
  try {
    const isDemo = await AsyncStorage.getItem("is_demo");
    return isDemo === "true";
  } catch (error) {
    console.error("❌ Error al verificar estado de demo:", error);
    return false;
  }
};

export default function AuthLoadingScreen() {
  const navigation = useNavigation();
  const [isChecking, setIsChecking] = useState(true);
  const { expoPushToken } = useNotification();
  const authCheckStartedRef = useRef(false);

  useEffect(() => {
    if (authCheckStartedRef.current) return;
    const timer = setTimeout(() => {
      global.splashScreenActive = false;
      authCheckStartedRef.current = true;
      if (expoPushToken) console.log("🔔 Token listo, continuando flujo.");
      else console.warn("⚠️ Token de notificación no disponible tras espera.");
      checkAuthStatus();
    }, expoPushToken ? 100 : 5000);

    return () => clearTimeout(timer);
  }, [expoPushToken]);

  const checkAuthStatus = async () => {
    setIsChecking(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");
      const isDemo = await isDemoUser();

      if (token) {
        console.log("✅ Usuario autenticado, verificando tipo de usuario...");

        // Mostrar mensaje si es modo demo
        if (isDemo) {
          console.log("🔍 MODO DEMO ACTIVADO - Acceso limitado");
        }



        // Verificar el tipo de usuario
        if (userData) {
          const user = JSON.parse(userData);

          try {
            if (expoPushToken) {
              const assignmentResponse = await fetch(`${BASE_URL}notification-token/assign-user`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  user_id: user.id,
                  token: expoPushToken,
                }),
              });
              const assignmentData = await assignmentResponse.json().catch(() => ({}));
              if (!assignmentResponse.ok) throw new Error(`HTTP ${assignmentResponse.status}: ${assignmentData.message || "Error asignando token"}`);
              console.log("✅ Token de notificación asignado correctamente.", assignmentData);
            } else {
              console.warn("⚠️ No se encontró token de notificación para asignar.");
            }
          } catch (e) {
            console.error("❌ Error asignando token de notificación:", e);
          }

          // Redirigir según el tipo de usuario
          if (user.tipo_usuario === "usuario") {
            console.log("🧑 Usuario normal, redirigiendo a BottomTabNavigatorUsuario...");
            navigation.replace("BottomTabNavigatorUsuario");
          } else if (user.tipo_usuario === "comercio") {
            console.log("🏪 Usuario comercio, redirigiendo a BottomTabNavigatorAliado...");
            navigation.replace("BottomTabNavigatorAliado");
          } else {
            console.log("🛵 Usuario delivery, redirigiendo a BottomTabNavigatorDelivery...");
            navigation.replace("BottomTabNavigatorDelivery");
          }
        } else {
          console.log("⚠️ Token encontrado pero sin datos de usuario, redirigiendo a Login...");
          navigation.replace("Login");
        }
      } else {
        console.log("🚪 No hay sesión activa, redirigiendo a Login...");
        navigation.replace("Login");
      }
    } catch (error) {
      console.error("❌ Error verificando autenticación:", error);
      navigation.replace("Login");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator style={{ paddingBottom: 100 }} size="large" color="#fa6205" />
      <Text style={styles.loadingText}>
        {global.splashScreenActive ? "Cargando aplicación..." : "Verificando sesión..."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
  },
  loadingText: {
    color: "#1C1C1E",
    fontSize: 16,
    marginTop: 10,
  }
});
