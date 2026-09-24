import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync } from "../utils/registerForPushNotification";
import { Platform } from "react-native";

// --- ID de Canales ---
const DEFAULT_CHANNEL_ID = "default";
const PEDIDO_CHANNEL_ID = "pedidos-channel";
const CARRERA_CHANNEL_ID = "carreras-channel";

// ... (setupNotificationChannels no cambia) ...
async function setupNotificationChannels() {
  if (Platform.OS === "android") {
    console.log("Configurando canales de notificación para Android...");
    try {
      await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
        name: "General",
        importance: Notifications.AndroidImportance.HIGH,
      });
      await Notifications.setNotificationChannelAsync(PEDIDO_CHANNEL_ID, {
        name: "Nuevos Pedidos",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
      await Notifications.setNotificationChannelAsync(CARRERA_CHANNEL_ID, {
        name: "Nuevos Arrendamientos",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500],
      });
      console.log("3 canales (Default, Pedidos, Carreras) configurados.");
    } catch (error) {
      console.error("Error configurando canales:", error);
    }
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const NotificationContext = createContext(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);

  const notificationListener = useRef();
  const responseListener = useRef();

  // 👈 3. CAMBIA las dependencias de este useEffect a []
  // Esto asegura que los listeners se configuran UNA SOLA VEZ
  useEffect(() => {
    setupNotificationChannels();
    registerForPushNotificationsAsync().then(
      (token) => setExpoPushToken(token),
      (error) => setError(error)
    );

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("🔔 Notification Received (Primer Plano): ", notification);
        setNotification(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(
          "🔔 Notification Response (Usuario tocó): ",
          JSON.stringify(response.notification.request.content.data, null, 2)
        );
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{ expoPushToken, notification, error }}
    >
      {children}
    </NotificationContext.Provider>
  );
};