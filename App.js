import "react-native-gesture-handler";
import "./utils/BackHandlerFix";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useLoadedAssets } from "./hooks/useLoadedAssets";
import Navigation from "./navigation";
import { useColorScheme } from "react-native";
import { useState, useEffect } from "react";
import * as Updates from "expo-updates";
import { NotificationProvider } from "./context/NotificationContext";
import { AlertProvider } from "./context/AlertContext";
import { configureUrl } from "./constants/url";
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
    const init = async () => {
      // 🔁 OTA Update (expo-updates)
      if (!__DEV__) {
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
