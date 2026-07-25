import "react-native-gesture-handler";
import "./utils/BackHandlerFix";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useLoadedAssets } from "./hooks/useLoadedAssets";
import Navigation from "./navigation";
import { useColorScheme, Platform, Linking } from "react-native";
import { useState, useEffect } from "react";
import * as Updates from "expo-updates";
import { NotificationProvider } from "./context/NotificationContext";
import { AlertProvider } from "./context/AlertContext";
import Constants from 'expo-constants';
import { BASE_URL, configureUrl } from "./constants/url";
import AlertaModal from "./components/ErrorModal";


export default function App() {
  const isLoadingComplete = useLoadedAssets();
  const colorScheme = useColorScheme();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

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
          showAlert(
            "Hay una nueva versión disponible. Es necesario actualizar para continuar.",
            "confirm",
            async () => {
              try {
                await Updates.fetchUpdateAsync();
                Updates.reloadAsync();
              } catch (e) {
                showAlert("No se pudo actualizar la aplicación.", "error");
                console.log("Error actualizando OTA:", e);
              }
            },
            "Actualizar ahora"
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
            showAlert(
              "Hay una nueva versión en la tienda. Debes actualizar para continuar.",
              "confirm",
              () => {
                if (Platform.OS === "android") {
                  Linking.openURL("https://play.google.com/store/apps/details?id=com.deloreanstudios.yaridersapp"); // ← Cambia esto
                } else {
                  Linking.openURL("https://apps.apple.com/pe/app/yariders/id6745890453"); // ← Cambia esto
                }
              },
              "Ir a la tienda"
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
        <AlertaModal
          visible={alertVisible}
          mensaje={alertData.message}
          tipo={alertData.type}
          onCerrar={() => setAlertVisible(false)}
          onPrimary={alertData.onPrimary}
          primaryLabel={alertData.primaryLabel}
        />
      </SafeAreaProvider>
    );
  }
}
