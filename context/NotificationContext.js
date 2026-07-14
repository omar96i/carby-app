import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync } from "../utils/registerForPushNotification";
import { useAudioPlayer } from "expo-audio";
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
        sound: "pedido.mp3", // <-- Corregido (sin extensión para Android)
        vibrationPattern: [0, 250, 250, 250],
      });
      await Notifications.setNotificationChannelAsync(CARRERA_CHANNEL_ID, {
        name: "Nuevas Carreras",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "carrera.mp3", // <-- Corregido (sin extensión para Android)
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
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// --- Fuentes de Audio ---
const pedidoAudioSource = require("../assets/sounds/pedido.wav"); // Usando .wav
const carreraAudioSource = require("../assets/sounds/carrera.wav"); // Usando .wav

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

  // --- Reproductores de Audio ---
  const pedidoPlayer = useAudioPlayer(pedidoAudioSource);
  const carreraPlayer = useAudioPlayer(carreraAudioSource);

  // 👈 1. CREA REFS para guardar los players
  // Un ref es una "caja" que sobrevive a los re-renders
  const pedidoPlayerRef = useRef(pedidoPlayer);
  const carreraPlayerRef = useRef(carreraPlayer);

  // 👈 2. ACTUALIZA los refs si los players cambian
  useEffect(() => {
    pedidoPlayerRef.current = pedidoPlayer;
    carreraPlayerRef.current = carreraPlayer;
  }, [pedidoPlayer, carreraPlayer]);

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

        const data = notification.request.content.data;

        if (data && data.estado_pedido === "created") {
          console.log("Data 'estado_pedido: created' detectada. Reproduciendo sonido de PEDIDO.");

          if (pedidoPlayerRef.current) {
            pedidoPlayerRef.current.seekTo(0);
            pedidoPlayerRef.current.play();
          }
        } else if (data && data.estado_carrera === "created") {
          console.log("Data 'estado_carrera: created' detectada. Reproduciendo sonido de CARRERA.");
          if (carreraPlayerRef.current) {
            carreraPlayerRef.current.seekTo(0);
            carreraPlayerRef.current.play();
          }
        } else {
          console.log("Notificación general en primer plano (sin sonido).");
        }
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