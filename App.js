import "react-native-gesture-handler";
import "./utils/BackHandlerFix";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useLoadedAssets } from "./hooks/useLoadedAssets";
import Navigation from "./navigation";
import { useColorScheme, Alert, Platform, Linking } from "react-native";
import { useEffect } from "react";
import * as Updates from "expo-updates";
import { NotificationProvider } from "./context/NotificationContext";
import { AlertProvider } from "./context/AlertContext";
import Constants from 'expo-constants';
import { BASE_URL, configureUrl } from "./constants/url";


export default function App() {
  const isLoadingComplete = useLoadedAssets();
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Carga la configuración de país al iniciar la app
    const init = async () => {
      await configureUrl();
    };
    init();
  }, []);

  useEffect(() => {
    const versionLocal = Constants.expoConfig?.version ?? "N/A";

    const init = async () => {
      // 🔁 OTA Update (expo-updates)
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          Alert.alert(
            "Actualización requerida",
            "Hay una nueva versión disponible. Es necesario actualizar para continuar.",
            [
              {
                text: "Actualizar ahora",
                onPress: async () => {
                  try {
                    await Updates.fetchUpdateAsync();
                    Updates.reloadAsync();
                  } catch (e) {
                    Alert.alert("Error", "No se pudo actualizar la aplicación.");
                    console.log("Error actualizando OTA:", e);
                  }
                }
              }
            ],
            { cancelable: false }
          );
        }
      } catch (e) {
        console.log("Error al buscar actualización OTA:", e);
      }

      try {

        const response = await fetch(`${BASE_URL}active-version`);
        const data = await response.json();

        if (data.version) {
          const versionBackend = data.version;
          if (versionLocal !== versionBackend) {
            Alert.alert(
              "Actualización disponible",
              "Hay una nueva versión en la tienda. Debes actualizar para continuar.",
              [
                {
                  text: "Ir a la tienda",
                  onPress: () => {
                    if (Platform.OS === "android") {
                      Linking.openURL("https://play.google.com/store/apps/details?id=com.deloreanstudios.yaridersapp"); // ← Cambia esto
                    } else {
                      Linking.openURL("https://apps.apple.com/pe/app/yariders/id6745890453"); // ← Cambia esto
                    }
                  }
                }
              ],
              { cancelable: false }
            );
          } else {
            console.log("Las versiones estan bien")
          }
        }
      } catch (error) {
        console.log("Error consultando versión del backend:", error);
      }
    };

    init();
  }, []);

  if (!isLoadingComplete) {
    return null;
  } else {
    return (
      <SafeAreaProvider>
        <NotificationProvider>
          <AlertProvider>
            <Navigation colorScheme={colorScheme} />
            <StatusBar />
          </AlertProvider>
        </NotificationProvider>
      </SafeAreaProvider>
    );
  }
}
