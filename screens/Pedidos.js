// 1. Corrige los imports al inicio del archivo
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  Image,
  Animated,
  Easing,
} from "react-native";

import { FontAwesome } from "@expo/vector-icons";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_300Light,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { useState, useEffect, useCallback, useRef } from "react";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../constants/url";
import * as Location from "expo-location";
import { useNotification } from "../context/NotificationContext";

// 2. Define la constante para la tarea en segundo plano
const BACKGROUND_FETCH_TASK = "check-new-orders";

// 3. Define la tarea usando TaskManager en lugar de BackgroundTask
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    // Verificar si el usuario es un comercio
    const userData = await AsyncStorage.getItem("userData");
    const userInfo = userData ? JSON.parse(userData) : null;
    const userType = userInfo?.tipo_usuario || "usuario";

    if (userType !== "comercio") {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Obtener token de autenticación
    const token = await AsyncStorage.getItem("userToken");
    if (!token) {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // Consultar pedidos nuevos
    const endpoint = `${BASE_URL}pedidos/comercio`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    const data = await response.json();
    let pedidosArray = [];

    if (data && Array.isArray(data)) {
      pedidosArray = data;
    } else if (data && data.pedidos && Array.isArray(data.pedidos)) {
      pedidosArray = data.pedidos;
    }

    // Filtrar pedidos nuevos (pendientes)
    const pedidosPendientes = pedidosArray.filter(
      (pedido) => pedido.estado === "pendiente"
    );

    // Obtener el último conteo de pedidos pendientes
    const lastPendingCountStr = await AsyncStorage.getItem(
      "lastPendingPedidosCount"
    );
    const lastPendingCount = lastPendingCountStr
      ? parseInt(lastPendingCountStr)
      : 0;

    // Guardar el nuevo conteo
    await AsyncStorage.setItem(
      "lastPendingPedidosCount",
      pedidosPendientes.length.toString()
    );

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Error en tarea en segundo plano:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});


export default function Pedidos({ route }) {
  const navigation = useNavigation();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [pedidos, setPedidos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isUserRider, setIsUserRider] = useState(false);
  const [mostrarCarrerasUsuario, setMostrarCarrerasUsuario] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [direccionesEnProceso, setDireccionesEnProceso] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState("usuario");
  const [pedidosConCarrera, setPedidosConCarrera] = useState([]);
  const [activeTab, setActiveTab] = useState("activas"); // 'activas', 'historial' o 'reservas'
  const [filteredPedidos, setFilteredPedidos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [filteredReservas, setFilteredReservas] = useState([]);
  const [isLoadingReservas, setIsLoadingReservas] = useState(false);
  const [sound, setSound] = useState(null);
  const [previousPendingCount, setPreviousPendingCount] = useState(0);
  const [calificacionModalVisible, setCalificacionModalVisible] =
    useState(false);
  const [itemACalificar, setItemACalificar] = useState(null);
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviandoCalificacion, setEnviandoCalificacion] = useState(false); // Estados para filtros de reservas
  const [filtroPerfilSeleccionado, setFiltroPerfilSeleccionado] =
    useState(null);
  const [filtroFechaInicio, setFiltroFechaInicio] = useState(null);
  const [filtroFechaFin, setFiltroFechaFin] = useState(null);
  const [userInfo, setUserInfo] = useState(null); // Información del usuario actual
  const [perfilesDisponibles, setPerfilesDisponibles] = useState([]);
  const [perfilesCompletos, setPerfilesCompletos] = useState([]); // Nuevo estado para guardar perfiles con IDs
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarModalPerfil, setMostrarModalPerfil] = useState(false);

  // Estados para modal de evidencia de pago
  const [modalEvidenciaVisible, setModalEvidenciaVisible] = useState(false);
  const [pedidoEvidencia, setPedidoEvidencia] = useState(null);

  // Estados para date pickers
  const [showDatePickerInicio, setShowDatePickerInicio] = useState(false);
  const [showDatePickerFin, setShowDatePickerFin] = useState(false);
  const [dateInicio, setDateInicio] = useState(new Date());
  const [dateFin, setDateFin] = useState(new Date());

  const { expoPushToken, notification } = useNotification();


  useEffect(() => {
    if (notification) {
      fetchPedidos();
      // Solo cargar reservas automáticamente para usuarios normales, NO para comercios
      if (tipoUsuario === "usuario") {
        fetchReservas();
      }
    }
  }, [notification]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const colorAnimado = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FDCB6E', '#FFEAA7'],
  });

  const obtenerTextoEstado = (estado) => {
    console.log("aqui es el estado del item: " + estado);
    const estados = {
      pendiente: 'Buscando conductor',
      aceptado: 'Conductor en camino',
      activo: 'En camino',
      completado: 'Completado',
      entregado: 'Entregado',
      cancelado: 'Cancelado'
    };
    return estados[estado] || 'Pendiente';
  };

  const obtenerTextoEstadoPedidos = (estado) => {
    const estados = {
      pendiente: 'En proceso de aceptación',
      aceptado: 'Tu pedido esta en proceso',
      completado: 'Completado',
      entregado: 'Entregado',
      cancelado: 'Cancelado'
    };
    return estados[estado] || 'Pendiente';
  };

  let [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_300Light,
  });
  const mostrarModalCalificacion = (item) => {
    setItemACalificar(item);
    setCalificacion(0);
    setComentario("");
    setCalificacionModalVisible(true);
  };

  // Helper function para URL de imágenes
  const getImageUrl = useCallback((photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith("http")) return photoPath;

    // CORRECCIÓN AQUÍ: Agregamos .toString()
    return `${BASE_URL.toString().replace("/api", "")}/storage/${photoPath}`;
  }, []);

  // Función para mostrar modal de evidencia de pago
  const mostrarModalEvidencia = (item) => {
    console.log("Mostrando evidencia para pedido:", item.id, "Archivo:", item.archivo_evidencia);
    setPedidoEvidencia(item);
    setModalEvidenciaVisible(true);
  };

  // Nueva función para abrir chat comercio-rider
  const abrirChatComercioRider = (item) => {
    console.log("DEBUG - abrirChatComercioRider llamado con item:", {
      id: item.id,
      estado: item.estado,
      tieneCarrera: !!item.carrera,
      tieneConductor: !!(item.carrera && item.carrera.conductor),
      conductorInfo: item.carrera?.conductor,
      userInfo: userInfo
    });

    if (!item.carrera || !item.carrera.conductor) {
      console.log("ERROR - No se encontró información del conductor:", {
        carrera: item.carrera,
        conductor: item.carrera?.conductor
      });
      Alert.alert("Error", "No se encontró información del conductor asignado");
      return;
    }

    const conductorId = item.carrera.conductor.id;
    const conductorNombre = item.carrera.conductor.nombre_completo || "Conductor";

    console.log("Comercio abriendo chat con rider:", {
      pedidoId: item.id,
      conductorId,
      conductorNombre,
      estadoPedido: item.estado
    });

    const navigationParams = {
      pedidoId: item.id,
      carreraId: item.carrera?.id,
      conductorId: conductorId, // ID del conductor asignado
      comercioId: userInfo?.id, // ID del comercio actual
      comercioNombre: userInfo?.establecimiento_nombre || "Comercio",
      conductorNombre: conductorNombre,
      tipo: "comercio-rider"
    };

    console.log("DEBUG - Navegando con parámetros:", navigationParams);

    // Navegar a ChatComercioRider (comercio -> conductor)
    navigation.navigate("ChatComercioRider", navigationParams);
  };

  // Nueva función para abrir chat rider-comercio (solo para rider.moto)
  // Nueva función para abrir chat rider-comercio (solo para rider.moto)
  const abrirChatRiderComercio = async (item) => {
    console.log("DEBUG - abrirChatRiderComercio llamado con item:", {
      id: item.id,
      es_carrera: item.es_carrera,
      pedido_id: item.pedido_id,
      comercio: item.comercio,
      pedidoComercio: item.pedido?.comercio,
      pedidoComercioId: item.pedido?.comercio_id,
      tipoUsuario: tipoUsuario
    });

    // Validar que es un rider.moto
    if (tipoUsuario !== "rider.moto") {
      Alert.alert("Error", "Esta función solo está disponible para riders de moto");
      return;
    }

    // Validar que existe pedido_id en la carrera
    if (!item.es_carrera || !item.pedido_id) {
      Alert.alert("Error", "No se encontró información del pedido asociado a esta carrera");
      return;
    }

    try {
      // Mostrar indicador de carga
      Alert.alert("Cargando", "Obteniendo información del comercio...");

      let comercioInfo = item.comercio || item.pedido?.comercio;

      // Si no tenemos la información del comercio pero sí el comercio_id, hacer una consulta
      if (!comercioInfo && item.pedido?.comercio_id) {
        console.log("Consultando información del comercio con ID:", item.pedido.comercio_id);

        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          Alert.alert("Error", "No se encontró token de autenticación");
          return;
        }

        // Intentar primero el endpoint específico del comercio
        try {
          const response = await fetch(`${BASE_URL}comercios/${item.pedido.comercio_id}`, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const comercioData = await response.json();
            comercioInfo = comercioData.data || comercioData;
            console.log("Información del comercio obtenida desde endpoint comercios:", comercioInfo);
          } else {
            throw new Error(`Error ${response.status}`);
          }
        } catch (comercioError) {
          console.log("Error con endpoint comercios, intentando con pedido:", comercioError.message);

          // Si falla, intentar obtener la información desde el pedido completo
          try {
            const pedidoResponse = await fetch(`${BASE_URL}pedidos/${item.pedido_id}`, {
              method: "GET",
              headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
              },
            });

            if (pedidoResponse.ok) {
              const pedidoData = await pedidoResponse.json();
              comercioInfo = pedidoData.comercio;
              console.log("Información del comercio obtenida desde pedido:", comercioInfo);
            } else {
              console.error("Error al obtener pedido:", pedidoResponse.status);
            }
          } catch (pedidoError) {
            console.error("Error al obtener información desde pedido:", pedidoError);
          }
        }
      }

      // Validar que ahora tenemos la información del comercio
      if (!comercioInfo) {
        console.log("ERROR - No se pudo obtener información del comercio:", {
          itemComercio: item.comercio,
          pedidoComercio: item.pedido?.comercio,
          pedidoComercioId: item.pedido?.comercio_id,
          pedidoCompleto: item.pedido
        });
        Alert.alert("Error", "No se pudo obtener la información del comercio");
        return;
      }

      const comercioId = comercioInfo?.id;
      const comercioNombre = comercioInfo?.establecimiento_nombre || comercioInfo?.nombre || "Comercio";

      console.log("Rider abriendo chat con comercio:", {
        pedidoId: item.pedido_id,
        carreraId: item.id,
        comercioId,
        comercioNombre,
        estadoCarrera: item.estado,
        comercioInfo: comercioInfo
      });

      const navigationParams = {
        pedidoId: item.pedido_id, // ID del pedido asociado
        carreraId: item.id, // ID de la carrera actual
        comercioId: comercioId,
        comercioNombre: comercioNombre,
        riderId: userInfo?.id, // ID del rider actual
        tipo: "rider-comercio"
      };

      console.log("DEBUG - Navegando con parámetros:", navigationParams);

      // Navegar al chat rider-comercio
      navigation.navigate("ChatRiderComercio", navigationParams);

    } catch (error) {
      console.error("Error al obtener información del comercio:", error);
      Alert.alert("Error", "Ocurrió un error al cargar la información del comercio");
    }
  };

  // Función para marcar pedidos que ya han sido calificados
  const marcarPedidosCalificados = async (pedidosArray) => {
    try {
      // Pedidos ya calificados guardados localmente
      const calificadosString = await AsyncStorage.getItem(
        "pedidosCalificados"
      );
      const pedidosCalificados = calificadosString
        ? JSON.parse(calificadosString)
        : [];

      // Marcar los pedidos que ya han sido calificados según el almacenamiento local y el tipo de usuario
      return pedidosArray.map((item) => ({
        ...item,
        yaCalificado:
          pedidosCalificados.includes(item.id) ||
          (tipoUsuario === "usuario" &&
            ((item.puntuacion_restaurante !== null &&
              item.puntuacion_restaurante !== undefined) ||
              (item.es_carrera &&
                item.puntuacion_conductor !== null &&
                item.puntuacion_conductor !== undefined))) ||
          (tipoUsuario === "comercio" &&
            !item.es_carrera &&
            item.puntuacion_usuario !== null &&
            item.puntuacion_usuario !== undefined),
      }));
    } catch (error) {
      console.error("Error al verificar pedidos calificados:", error);
      return pedidosArray;
    }
  };

  useEffect(() => {
    // Verificar si el usuario es un comercio
    const checkUserTypeAndRegisterTask = async () => {
      const userData = await AsyncStorage.getItem("userData");
      const userInfo = userData ? JSON.parse(userData) : null;
      const userType = userInfo?.tipo_usuario || "usuario";

      // Configurar userInfo en el estado
      setUserInfo(userInfo);

      if (userType === "comercio") {
        await registerBackgroundFetchAsync();
      }
    };

    checkUserTypeAndRegisterTask();

    // Limpiar cuando el componente se desmonte
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      unregisterBackgroundFetchAsync();
    };
  }, []);


  // Registrar la tarea en segundo plano
  // Registrar la tarea en segundo plano con manejo de errores mejorado
  async function registerBackgroundFetchAsync() {
    try {
      console.log("Intentando registrar tarea en segundo plano...");

      // Verificar si la tarea ya está registrada
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_FETCH_TASK
      );

      // Si ya está registrada, intentar desregistrarla primero para evitar duplicados
      if (isRegistered) {
        console.log(
          "La tarea ya estaba registrada, actualizando configuración"
        );
        try {
          await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
        } catch (unregisterError) {
          console.log(
            "No se pudo desregistrar la tarea anterior:",
            unregisterError.message
          );
          // Continuamos de todos modos, ya que esto podría ser un falso positivo
        }
      }

      // Registrar la tarea con la nueva configuración
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 15, // 15 segundos como mínimo
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log("Tarea en segundo plano registrada para pedidos");

      // Verificar el estado del registro
      const status = await BackgroundFetch.getStatusAsync();
      console.log(
        "Estado del BackgroundFetch:",
        status === BackgroundFetch.BackgroundFetchStatus.Available
          ? "Disponible"
          : "No disponible o restringido"
      );

      return true;
    } catch (err) {
      console.error("Error al registrar tarea en segundo plano:", err.message);
      return false;
    }
  }

  // Deregistrar la tarea en segundo plano
  async function unregisterBackgroundFetchAsync() {
    try {
      // Primero verificar si la tarea está realmente registrada
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_FETCH_TASK
      );

      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
        console.log("Tarea en segundo plano desregistrada para pedidos");
      } else {
        console.log(
          "La tarea no estaba registrada, no es necesario desregistrar"
        );
      }
    } catch (err) {
      // En lugar de reportar esto como error, simplemente lo registramos
      console.log(
        "Nota: La tarea no estaba disponible para desregistrar:",
        err.message
      );
    }
  }
  // Solicitar permisos de ubicación al cargar
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted");
      if (status !== "granted") {
        console.log("Permiso para acceder a la ubicación denegado");
      }
    })();
  }, []);

  // Función mejorada para geocodificación
  // Modifica la función obtenerDireccionDesdeCoords para hacerla más robusta y eficiente
  const obtenerDireccionDesdeCoords = async (coordsString) => {
    try {
      // Verificar si ya es una dirección formateada
      if (
        typeof coordsString === "string" &&
        (coordsString.includes("calle") ||
          coordsString.includes("Calle") ||
          coordsString.includes("Av.") ||
          coordsString.includes("Avenida"))
      ) {
        return coordsString;
      }

      // Parsear las coordenadas con manejo de varios formatos posibles
      let coords = null;

      if (typeof coordsString === "string") {
        // Intentar diferentes patrones de formato JSON
        try {
          coords = JSON.parse(coordsString);
        } catch (parseError) {
          // Intentar limpiar el string y volver a analizar
          try {
            const cleanedStr = coordsString.replace(
              /(['"])?([a-zA-Z0-9_]+)(['"])?:/g,
              '"$2":'
            );
            coords = JSON.parse(cleanedStr);
          } catch (innerError) {
            console.warn(
              "No se pudo analizar la cadena de coordenadas:",
              coordsString
            );
            return "Dirección no disponible";
          }
        }
      } else if (typeof coordsString === "object") {
        coords = coordsString;
      } else {
        return "Dirección no disponible";
      }

      // Buscar coordenadas en diferentes formatos posibles
      const latitude = coords.lat || coords.latitude;
      const longitude = coords.lng || coords.longitude;

      // Verificar que tenemos valores válidos
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        console.warn("Coordenadas inválidas:", coords);
        return "Dirección no disponible";
      }

      // No intentar geocodificación si no hay permiso
      if (!locationPermission) {
        return `Ubicación (${parseFloat(latitude).toFixed(5)}, ${parseFloat(
          longitude
        ).toFixed(5)})`;
      }

      // Verificar si tenemos esta dirección en caché para evitar llamadas repetidas
      const cacheKey = `geo_${latitude.toFixed(5)}_${longitude.toFixed(5)}`;
      const cachedAddress = await AsyncStorage.getItem(cacheKey);
      if (cachedAddress) {
        return cachedAddress;
      }

      try {
        // Llamar a la API de geocodificación inversa
        const result = await Location.reverseGeocodeAsync({
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        });

        if (result && result.length > 0) {
          const loc = result[0];

          // Construir una dirección formateada con los componentes disponibles
          const addressParts = [];

          if (loc.name) addressParts.push(loc.name);
          if (loc.street) {
            const streetWithNumber =
              loc.street + (loc.streetNumber ? ` ${loc.streetNumber}` : "");
            addressParts.push(streetWithNumber);
          }
          if (loc.district && loc.district !== loc.city)
            addressParts.push(loc.district);
          if (loc.city) addressParts.push(loc.city);
          if (loc.region && loc.region !== loc.city)
            addressParts.push(loc.region);

          if (addressParts.length > 0) {
            const formattedAddress = addressParts.join(", ");

            // Guardar en caché para futuras consultas
            await AsyncStorage.setItem(cacheKey, formattedAddress);

            return formattedAddress;
          }
        }

        // Si no obtuvimos resultados útiles, crear una representación con coordenadas
        const fallbackAddress = `Ubicación (${parseFloat(latitude).toFixed(
          5
        )}, ${parseFloat(longitude).toFixed(5)})`;
        await AsyncStorage.setItem(cacheKey, fallbackAddress);
        return fallbackAddress;
      } catch (geocodeError) {
        console.error("Error en geocodificación:", geocodeError);
        return `Ubicación (${parseFloat(latitude).toFixed(5)}, ${parseFloat(
          longitude
        ).toFixed(5)})`;
      }
    } catch (error) {
      console.error(
        "Error general al procesar coordenadas:",
        error,
        coordsString
      );
      return "Dirección no disponible";
    }
  };

  // Optimiza el procesamiento por lotes de direcciones para no bloquear la interfaz
  const procesarTodasLasDirecciones = async () => {
    if (!pedidos.length || !locationPermission || direccionesEnProceso) return;

    setDireccionesEnProceso(true);

    // Procesamos los pedidos en pequeños lotes para no bloquear la UI
    const BATCH_SIZE = 3; // Procesar 3 pedidos a la vez
    const pedidosActualizados = [...pedidos];
    let seActualizaronDirecciones = false;

    try {
      // Procesar pedidos en lotes pequeños
      for (let i = 0; i < pedidosActualizados.length; i += BATCH_SIZE) {
        const batch = pedidosActualizados.slice(i, i + BATCH_SIZE);

        // Esperar a que se completen las promesas para este lote
        await Promise.all(
          batch.map(async (item, batchIndex) => {
            const realIndex = i + batchIndex;

            // Solo procesar carreras que necesiten convertir coordenadas a direcciones
            if (!item.es_carrera) return;

            try {
              const datosGenerales =
                typeof item.datos_generales === "string"
                  ? JSON.parse(item.datos_generales)
                  : item.datos_generales || {};

              // Verificar si necesita actualización de direcciones
              let esOrigenCoordenadas = false;
              let esDestinoCoordenadas = false;

              // Origen parece ser coordenadas si contiene números o "Ubicación"
              if (
                datosGenerales.start_lugar &&
                (datosGenerales.start_lugar.includes("Ubicación") ||
                  datosGenerales.start_lugar.match(/\d+\.\d+/))
              ) {
                esOrigenCoordenadas = true;
              }

              // Destino parece ser coordenadas si contiene números o "Ubicación"
              if (
                datosGenerales.end_lugar &&
                (datosGenerales.end_lugar.includes("Ubicación") ||
                  datosGenerales.end_lugar.match(/\d+\.\d+/))
              ) {
                esDestinoCoordenadas = true;
              }

              // Solo procesar los que necesitan conversión
              if (esOrigenCoordenadas && item.origen_coordenadas) {
                const nuevaDireccionOrigen = await obtenerDireccionDesdeCoords(
                  item.origen_coordenadas
                );
                datosGenerales.start_lugar = nuevaDireccionOrigen;
                seActualizaronDirecciones = true;
              }

              if (esDestinoCoordenadas && item.destino_coordenadas) {
                const nuevaDireccionDestino = await obtenerDireccionDesdeCoords(
                  item.destino_coordenadas
                );
                datosGenerales.end_lugar = nuevaDireccionDestino;
                seActualizaronDirecciones = true;
              }

              // Actualizar datos_generales solo si hubo cambios
              if (esOrigenCoordenadas || esDestinoCoordenadas) {
                pedidosActualizados[realIndex].datos_generales =
                  JSON.stringify(datosGenerales);
              }
            } catch (error) {
              console.error(
                `Error procesando dirección del ítem ${item.id}:`,
                error
              );
            }
          })
        );

        // Pausar brevemente entre lotes para permitir que la UI responda
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Actualizar el estado solo si hubo cambios
      if (seActualizaronDirecciones) {
        console.log("Actualizando pedidos con direcciones convertidas");
        setPedidos(pedidosActualizados);
      }
    } catch (error) {
      console.error("Error procesando direcciones:", error);
    } finally {
      setDireccionesEnProceso(false);
    }
  };
  const filtrarPedidos = (pedidosArray, tab) => {
    if (tab === "activas") {
      return pedidosArray.filter(
        (item) =>
          item.estado !== "completado" &&
          item.estado !== "entregado" &&
          item.estado !== "cancelado"
      );
    } else {
      return pedidosArray.filter(
        (item) =>
          item.estado === "completado" ||
          item.estado === "entregado" ||
          item.estado === "cancelado"
      );
    }
  };
  const filtrarReservas = (
    reservasArray,
    tab,
    perfilesCompletosPara = perfilesCompletos
  ) => {
    let reservasFiltradas = [];

    // 1. Primero filtrar por estado según la pestaña
    if (tab === "activas") {
      reservasFiltradas = reservasArray.filter(
        (item) =>
          item.estado !== "completado" &&
          item.estado !== "entregado" &&
          item.estado !== "cancelado"
      );
    } else {
      reservasFiltradas = reservasArray.filter(
        (item) =>
          item.estado === "completado" ||
          item.estado === "entregado" ||
          item.estado === "cancelado"
      );
    }

    // 2. Aplicar filtros adicionales (perfil y fechas) - Estos filtros se aplican siempre que estén activos
    // independientemente de la pestaña actual

    // Filtro por perfil - usar el parámetro perfilesCompletosPara para mayor flexibilidad
    if (filtroPerfilSeleccionado) {
      reservasFiltradas = reservasFiltradas.filter((item) => {
        // Buscar el perfil correspondiente usando user_perfil_id
        const perfilCorrespondiente = perfilesCompletosPara.find(
          (p) => p.id === item.user_perfil_id
        );
        const nombrePerfil =
          perfilCorrespondiente?.nombre ||
          item.servicio_nombre ||
          item.user_perfil?.nombre;
        return nombrePerfil === filtroPerfilSeleccionado;
      });
    }

    // Filtro por rango de fechas
    if (filtroFechaInicio || filtroFechaFin) {
      reservasFiltradas = reservasFiltradas.filter((item) => {
        if (!item.fecha) return false; // Filtrar items sin fecha

        const fechaReserva = new Date(item.fecha);

        // Validar que la fecha sea válida
        if (isNaN(fechaReserva.getTime())) return false;

        const fechaInicio = filtroFechaInicio
          ? new Date(filtroFechaInicio)
          : null;
        const fechaFin = filtroFechaFin ? new Date(filtroFechaFin) : null;

        // Normalizar fechas para comparación (solo día, mes, año)
        if (fechaInicio) {
          fechaInicio.setHours(0, 0, 0, 0);
        }
        if (fechaFin) {
          fechaFin.setHours(23, 59, 59, 999);
        }
        fechaReserva.setHours(12, 0, 0, 0); // Medio día para evitar problemas de zona horaria

        if (fechaInicio && fechaFin) {
          return fechaReserva >= fechaInicio && fechaReserva <= fechaFin;
        } else if (fechaInicio) {
          return fechaReserva >= fechaInicio;
        } else if (fechaFin) {
          return fechaReserva <= fechaFin;
        }
        return true;
      });
    }

    return reservasFiltradas;
  };
  useEffect(() => {
    if (pedidos.length > 0) {
      setFilteredPedidos(filtrarPedidos(pedidos, activeTab));
    }
    if (reservas.length > 0) {
      // Filtrar reservas según el activeTab actual
      if (activeTab === "reservas") {
        // Cuando estamos en la pestaña reservas, mostrar solo las activas
        setFilteredReservas(filtrarReservas(reservas, "activas"));
      } else if (activeTab === "historial") {
        // Cuando estamos en historial, mostrar las completadas
        setFilteredReservas(filtrarReservas(reservas, "historial"));
      }
    }

    // Cargar reservas cuando se cambia a la pestaña de reservas - SOLO PARA USUARIOS NORMALES
    if (
      activeTab === "reservas" &&
      tipoUsuario === "usuario" &&
      reservas.length === 0
    ) {
      fetchReservas();
    }
  }, [pedidos, reservas, activeTab, tipoUsuario]);
  // useEffect adicional para aplicar filtros cuando cambien los valores de los filtros
  useEffect(() => {
    if (reservas.length > 0) {
      if (activeTab === "reservas") {
        setFilteredReservas(filtrarReservas(reservas, "activas"));
      } else if (activeTab === "historial") {
        // También aplicar filtros en la pestaña historial
        setFilteredReservas(filtrarReservas(reservas, "historial"));
      }
    }
  }, [
    filtroPerfilSeleccionado,
    filtroFechaInicio,
    filtroFechaFin,
    activeTab,
    reservas,
    perfilesCompletos, // Agregar esta dependencia para que se actualice cuando cambien los perfiles
  ]);

  // Llamar al procesamiento de direcciones después de cargar pedidos
  useEffect(() => {
    if (pedidos.length > 0 && locationPermission) {
      procesarTodasLasDirecciones();
    }
  }, [pedidos, locationPermission]);
  // useEffect para cargar perfiles del usuario al montar el componente
  useEffect(() => {
    if (tipoUsuario) {
      fetchPerfilesConServicios();
    }
  }, [tipoUsuario]);

  // Función para formatear las carreras recibidas - Actualizada con los campos correctos
  const formatearCarreras = (carrerasArray, esConductor = false) => {
    return carrerasArray.map((carrera) => {
      // Determinar el tipo de viaje basado en el servicio
      let tipoViaje = "rider.moto"; // Valor por defecto
      if (carrera.service && carrera.service.role) {
        const roleParts = carrera.service.role.split(".");
        tipoViaje = `rider.${roleParts.length > 1 ? roleParts[1] : "moto"}`;
      }

      // Extraer coordenadas para su visualización inmediata
      let origenCoords, destinoCoords;
      try {
        origenCoords =
          typeof carrera.punto_recogida === "string"
            ? JSON.parse(carrera.punto_recogida)
            : carrera.punto_recogida;

        destinoCoords =
          typeof carrera.destino === "string"
            ? JSON.parse(carrera.destino)
            : carrera.destino;
      } catch (e) {
        console.error("Error al parsear coordenadas:", e);
        origenCoords = { lat: 0, lng: 0 };
        destinoCoords = { lat: 0, lng: 0 };
      }

      // Formatear coordenadas para visualización inicial
      const origenFormateado =
        origenCoords && origenCoords.lat
          ? `Ubicación (${origenCoords.lat.toFixed(
            6
          )}, ${origenCoords.lng.toFixed(6)})`
          : "Ubicación no disponible";

      const destinoFormateado =
        destinoCoords && destinoCoords.lat
          ? `Ubicación (${destinoCoords.lat.toFixed(
            6
          )}, ${destinoCoords.lng.toFixed(6)})`
          : "Ubicación no disponible";

      return {
        id: carrera.id,
        estado: carrera.estado || "pendiente",
        created_at: carrera.created_at,
        costo_total: carrera.costo || 0,
        metodo_pago: carrera.pago_por || "efectivo",
        tipo_viaje: tipoViaje,
        // IMPORTANTE: Incluir pedido_id para el chat
        pedido_id: carrera.pedido_id || null,
        // Usar formato inicial de coordenadas para su visualización inmediata
        datos_generales: JSON.stringify({
          start_lugar: carrera.origen_direccion || origenFormateado,
          end_lugar: carrera.destino_direccion || destinoFormateado,
        }),
        // Guardar coordenadas originales para posterior geocodificación
        distancia: carrera.distancia || 0,
        origen_coordenadas: carrera.punto_recogida,
        destino_coordenadas: carrera.destino,
        // Guardar información del comercio si existe
        comercio: carrera.pedido?.comercio || null,
        pedido: carrera.pedido || null,
        // Guardar información de contacto según el rol
        usuario: esConductor
          ? carrera.usuario || {
            nombre_completo: "Cliente",
            numero_telefono: "",
          }
          : null,
        conductor: !esConductor
          ? carrera.conductor || {
            nombre_completo: "Conductor",
            numero_telefono: "",
          }
          : null,
        // Añadir info del servicio si existe
        service: carrera.service,

        // CAMPOS DE CALIFICACIÓN ACTUALIZADOS - usando los nombres exactos de la API
        puntuacion_driver: carrera.puntuacion_driver || null,
        mensaje_driver: carrera.mensaje_driver || null,
        puntuacion_pasajero: carrera.puntuacion_pasajero || null,
        mensaje_pasajero: carrera.mensaje_pasajero || null,

        // Marcar que es una carrera y si es conductor o pasajero
        es_carrera: true,
        es_conductor: esConductor,
      };
    });
  };
  ////
  // Función para obtener reservas de un comercio
  const fetchReservas = async () => {
    try {
      setIsLoadingReservas(true);
      setError(null);

      // Obtener el token de autenticación
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      } // Obtener el tipo de usuario
      const userData = await AsyncStorage.getItem("userData");
      const userInfo = userData ? JSON.parse(userData) : null;
      const userType = userInfo?.tipo_usuario || "usuario";
      const userId = userInfo?.id;

      if (!userId) {
        throw new Error("No se pudo obtener el ID del usuario");
      } // PARA COMERCIOS: No cargar automáticamente, solo cuando se llame específicamente
      if (userType === "comercio") {
        console.log(
          "[DEBUG] fetchReservas llamado para comercio - no ejecutar automáticamente"
        );
        setIsLoadingReservas(false);
        setRefreshing(false);
        return;
      }

      // PARA USUARIOS NORMALES: Mantener el comportamiento actual
      if (userType !== "usuario") {
        console.log("Tipo de usuario no válido para cargar reservas");
        return;
      }

      const endpoint = `${BASE_URL}reservas/usuario/${userId}`;
      console.log(`[DEBUG] Consultando reservas de usuario en: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("[DEBUG] Respuesta de reservas:", data);

      const reservasArray = Array.isArray(data) ? data : [];
      console.log(`[DEBUG] Se encontraron ${reservasArray.length} reservas`);

      // Formatear reservas para mostrar
      const reservasFormateadas = reservasArray.map((reserva) => ({
        ...reserva,
        // Campos adicionales para compatibilidad con el renderizado
        costo_total: reserva.costo_total || 0,
        cliente_nombre: reserva.user_perfil?.user?.nombre_completo || "Cliente",
        cliente_telefono: reserva.user_perfil?.user?.numero_telefono || "",
        servicio_nombre: reserva.user_perfil?.nombre || "Servicio",
        servicio_descripcion: reserva.user_perfil?.descripcion || "",
        servicio_imagen: reserva.user_perfil?.file || null,
        fecha_formateada: new Date(reserva.fecha).toLocaleDateString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        hora_inicio_formateada: reserva.hora_inicio?.slice(0, 5) || "",
        hora_fin_formateada: reserva.hora_fin?.slice(0, 5) || "",
      }));
      setReservas(reservasFormateadas);
      console.log("[DEBUG] Reservas procesadas:", reservasFormateadas);

      // Obtener perfiles con servicios desde la API
      await fetchPerfilesConServicios();
    } catch (error) {
      console.error("Error al obtener reservas:", error);
      setError(error.message);
    } finally {
      setIsLoadingReservas(false);
      setRefreshing(false);
    }
  }; // Función para obtener perfiles con servicios (solo para comercios)
  const fetchPerfilesConServicios = async () => {
    try {
      // Obtener el token de autenticación
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        console.warn("[DEBUG] No se encontró token de autenticación");
        setPerfilesDisponibles([]);
        return;
      }

      // Obtener el userId del usuario actual
      const userData = await AsyncStorage.getItem("userData");
      const userInfo = userData ? JSON.parse(userData) : null;
      const userId = userInfo?.id;
      const userType = userInfo?.tipo_usuario || "usuario";

      if (!userId) {
        console.warn("[DEBUG] No se pudo obtener el userId");
        setPerfilesDisponibles([]);
        return;
      }

      // Solo ejecutar para comercios
      if (userType !== "comercio") {
        console.log(
          "[DEBUG] Usuario no es comercio, usando perfiles de reservas existentes"
        );
        const perfilesDeReservas = [
          ...new Set(
            reservas
              .map((reserva) => reserva.user_perfil?.nombre)
              .filter((nombre) => nombre)
          ),
        ].sort();
        setPerfilesDisponibles(perfilesDeReservas);
        return;
      }
      const endpoint = `${BASE_URL}user-perfil/by-user/${userId}`;
      console.log("[DEBUG] Fetching perfiles por usuario from:", endpoint);

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("[DEBUG] Perfiles del usuario recibidos:", data);

      // La API devuelve los datos en data.data
      const perfilesArray =
        data.data && Array.isArray(data.data) ? data.data : [];

      if (perfilesArray.length > 0) {
        // Guardar los perfiles completos para usar sus IDs después
        const perfilesCompletos = perfilesArray.map((perfil) => ({
          id: perfil.id,
          nombre: perfil.nombre || perfil.perfil?.nombre || "Sin nombre",
        }));

        // Para el dropdown, solo mostrar los nombres
        const perfilesNombres = perfilesCompletos
          .map((perfil) => perfil.nombre)
          .filter((nombre) => nombre && nombre !== "Sin nombre")
          .sort();

        setPerfilesDisponibles(perfilesNombres);
        setPerfilesCompletos(perfilesCompletos);

        console.log(
          "[DEBUG] Perfiles del usuario procesados:",
          perfilesNombres
        );
        console.log("[DEBUG] Perfiles completos guardados:", perfilesCompletos);
      } else {
        console.warn(
          "[DEBUG] No se encontraron perfiles válidos para el usuario"
        );
        setPerfilesDisponibles([]);
      }
    } catch (error) {
      console.error("Error al obtener perfiles del usuario:", error);
      // Fallback: usar perfiles de reservas existentes
      const perfilesDeReservas = [
        ...new Set(
          reservas
            .map((reserva) => reserva.user_perfil?.nombre)
            .filter((nombre) => nombre)
        ),
      ].sort();
      setPerfilesDisponibles(perfilesDeReservas);
    }
  };
  // Nueva función para obtener reservas por perfil específico (solo para comercios)
  const fetchReservasPorPerfil = async (perfilId) => {
    try {
      console.log(
        `[DEBUG] Iniciando fetchReservasPorPerfil para perfil ID: ${perfilId}`
      );

      // Si no se llama desde la selección de perfil, establecer el estado de carga
      if (!isLoadingReservas) {
        setIsLoadingReservas(true);
      }
      setError(null);

      // Obtener el token de autenticación
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      // Verificar que es un comercio
      const userData = await AsyncStorage.getItem("userData");
      const userInfo = userData ? JSON.parse(userData) : null;
      const userType = userInfo?.tipo_usuario || "usuario";

      if (userType !== "comercio") {
        console.log("Esta función solo está disponible para comercios");
        return;
      }

      const endpoint = `${BASE_URL}reservas/perfil/${perfilId}`;
      console.log(`[DEBUG] Consultando reservas por perfil en: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("[DEBUG] Respuesta de reservas por perfil:", data);

      const reservasArray = Array.isArray(data) ? data : [];
      console.log(
        `[DEBUG] Se encontraron ${reservasArray.length} reservas para el perfil ${perfilId}`
      ); // Formatear reservas para mostrar
      const reservasFormateadas = reservasArray.map((reserva) => {
        // Buscar el perfil correspondiente usando user_perfil_id
        const perfilCorrespondiente = perfilesCompletos.find(
          (p) => p.id === reserva.user_perfil_id
        );
        const nombrePerfil =
          perfilCorrespondiente?.nombre ||
          reserva.user_perfil?.nombre ||
          "Perfil";

        return {
          ...reserva,
          costo_total: reserva.costo_total || 0,
          cliente_nombre:
            reserva.user_perfil?.user?.nombre_completo || "Cliente",
          cliente_telefono: reserva.user_perfil?.user?.numero_telefono || "",
          // CORREGIDO: Usar el nombre del perfil mapeado correctamente
          servicio_nombre: nombrePerfil,
          servicio_descripcion: reserva.user_perfil?.descripcion || "",
          servicio_imagen: reserva.user_perfil?.file || null,
          fecha_formateada: new Date(reserva.fecha).toLocaleDateString(
            "es-ES",
            {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }
          ),
          hora_inicio_formateada: reserva.hora_inicio?.slice(0, 5) || "",
          hora_fin_formateada: reserva.hora_fin?.slice(0, 5) || "",
        };
      });
      setReservas(reservasFormateadas);
      console.log(
        "[DEBUG] Reservas por perfil procesadas exitosamente:",
        reservasFormateadas.length
      );

      // También actualizar las reservas filtradas inmediatamente
      const reservasFiltradas = filtrarReservas(reservasFormateadas, "activas");
      setFilteredReservas(reservasFiltradas);
      console.log(
        "[DEBUG] Reservas filtradas aplicadas:",
        reservasFiltradas.length
      );
    } catch (error) {
      console.error("Error al obtener reservas por perfil:", error);
      setError(error.message);
      setReservas([]); // Limpiar reservas en caso de error
      setFilteredReservas([]); // También limpiar las filtradas
    } finally {
      setIsLoadingReservas(false);
      setRefreshing(false);
    }
  };

  const aprobarPago = async (pedido) => {
    try {
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      const response = await fetch(`${BASE_URL}pedidos/aprobar-pago/${pedido.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.status) {
        Alert.alert("✅ Pago aprobado", "El pago fue aprobado exitosamente.");
        // Aquí puedes actualizar estado o recargar datos si es necesario
      } else {
        Alert.alert("Error", "No se pudo aprobar el pago. Intenta nuevamente.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Ocurrió un problema al aprobar el pago.");
    }
  };

  ////
  // Función para obtener los pedidos o carreras desde la API
  const fetchPedidos = async () => {
    try {

      setIsLoading(true);
      setError(null);

      // Obtener el token de autenticación
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      // Obtener el tipo de usuario
      const userData = await AsyncStorage.getItem("userData");
      const userInfo = userData ? JSON.parse(userData) : null;

      // Obtener el tipo de usuario y el ID
      const userType = userInfo?.tipo_usuario || "usuario";
      const userId = userInfo?.id || "desconocido";

      // Guardar el tipo de usuario en el estado para usarlo en la navegación
      setTipoUsuario(userType);

      console.log(
        "[DEBUG] Datos de usuario:",
        userInfo ? { id: userInfo.id, tipo_usuario: userType } : "No disponible"
      );

      // Verificar si es algún tipo de rider
      const isRider =
        userType &&
        (userType === "rider.moto" ||
          userType === "rider.mototaxi" ||
          userType === "rider.taxi");

      // Actualizar el estado
      setIsUserRider(isRider);

      // Resultados combinados
      let resultadosCombinados = [];

      // CASO 1: Usuario es un conductor (rider)
      if (isRider) {
        const endpoint = `${BASE_URL}carreras/conductor`;
        console.log(
          `[DEBUG] Consultando carreras como conductor en: ${endpoint}`
        );

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        const carrerasArray = Array.isArray(data)
          ? data
          : data && data.data && Array.isArray(data.data)
            ? data.data
            : [];

        if (carrerasArray.length > 0) {
          console.log(
            `Encontradas ${carrerasArray.length} carreras para el conductor`
          );
          // Formatear carreras como conductor
          resultadosCombinados = formatearCarreras(carrerasArray, true);
        }
      }
      // CASO 2: Usuario es un comercio
      else if (userType === "comercio") {
        // Almacenar el conteo actual antes de la consulta
        const currentPendingCount = previousPendingCount;
        console.log(
          `[DEBUG] Conteo actual de pedidos pendientes: ${currentPendingCount}`
        );

        const endpoint = `${BASE_URL}pedidos/comercio`;
        console.log(
          `[DEBUG] Consultando pedidos como comercio en: ${endpoint}`
        );

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        let pedidosArray = [];
        if (data && Array.isArray(data)) {
          pedidosArray = data;
        } else if (data && data.pedidos && Array.isArray(data.pedidos)) {
          pedidosArray = data.pedidos;
        }

        // Log detallado de los datos recibidos para comercios
        console.log("Pedidos - Estructura de datos recibidos desde API (comercio):", JSON.stringify(data, null, 2));

        // Log específico para verificar adicionales en cada pedido
        pedidosArray.forEach((pedido, index) => {
          if (pedido.pedido_list_adicionals || (pedido.pedido_lists && pedido.pedido_lists.some(p => p.adicionales || p.pedido_list_adicionals))) {
            console.log(`Pedidos - Pedido ${index} (ID: ${pedido.id}) contiene adicionales:`, {
              pedido_list_adicionals: pedido.pedido_list_adicionals,
              productos_con_adicionales: pedido.pedido_lists?.filter(p => p.adicionales || p.pedido_list_adicionals)
            });
          }
        });

        // Guardar los resultados en el estado
        resultadosCombinados = pedidosArray;

        // Filtrar pedidos pendientes para el caso de comercio
        const pedidosPendientes = pedidosArray.filter(
          (pedido) => pedido.estado === "pendiente"
        );

        const newPendingCount = pedidosPendientes.length;
        console.log(
          `[DEBUG] Se encontraron ${newPendingCount} pedidos pendientes`
        );
        console.log(
          `[DEBUG] Pedidos pendientes anteriores: ${currentPendingCount}, actuales: ${newPendingCount}`
        );

        // Actualizar el contador DESPUÉS de la comparación
        setPreviousPendingCount(newPendingCount);
        await AsyncStorage.setItem(
          "lastPendingPedidosCount",
          newPendingCount.toString()
        );

        // MARCAR LOS PEDIDOS CALIFICADOS - después de tener los resultados
        resultadosCombinados = await marcarPedidosCalificados(
          resultadosCombinados
        );

        const carrerasEndpoint = `${BASE_URL}carreras/usuario`;
        console.log(
          `[DEBUG] Consultando carreras como pasajero en: ${carrerasEndpoint}`
        );

        try {
          const carrerasResponse = await fetch(carrerasEndpoint, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (carrerasResponse.ok) {
            const carrerasData = await carrerasResponse.json();
            const carrerasArray = Array.isArray(carrerasData)
              ? carrerasData
              : carrerasData &&
                carrerasData.data &&
                Array.isArray(carrerasData.data)
                ? carrerasData.data
                : [];

            if (carrerasArray.length > 0) {
              console.log(
                `Encontradas ${carrerasArray.length} carreras para el usuario`
              );
              // Formatear carreras como pasajero
              const carrerasFormateadas = formatearCarreras(
                carrerasArray,
                false
              );
              // Si hay carreras, marcar que el usuario tiene carreras
              if (carrerasFormateadas.length > 0) {
                setMostrarCarrerasUsuario(true);
              }
              resultadosCombinados = [
                ...resultadosCombinados,
                ...carrerasFormateadas,
              ];
            }
          }
        } catch (carrerasError) {
          console.error("Error consultando carreras:", carrerasError);
        }
      }
      // CASO 3: Usuario normal - consultar tanto pedidos como carreras
      else {
        // Primero consultar pedidos
        const pedidosEndpoint = `${BASE_URL}pedidos`;
        console.log(
          `[DEBUG] Consultando pedidos como usuario en: ${pedidosEndpoint}`
        );

        try {
          const pedidosResponse = await fetch(pedidosEndpoint, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (pedidosResponse.ok) {
            const pedidosData = await pedidosResponse.json();
            if (pedidosData && Array.isArray(pedidosData)) {
              resultadosCombinados = [...pedidosData];
            } else if (
              pedidosData &&
              pedidosData.pedidos &&
              Array.isArray(pedidosData.pedidos)
            ) {
              resultadosCombinados = [...pedidosData.pedidos];
            }

            // Log detallado de los datos recibidos para usuarios
            console.log(`Encontrados ${resultadosCombinados.length} pedidos para el usuario`);
            console.log("Pedidos - Estructura de datos recibidos desde API:", JSON.stringify(pedidosData, null, 2));

            // Log específico para verificar adicionales en cada pedido
            resultadosCombinados.forEach((pedido, index) => {
              if (pedido.pedido_list_adicionals || (pedido.pedido_lists && pedido.pedido_lists.some(p => p.adicionales || p.pedido_list_adicionals))) {
                console.log(`Pedidos - Pedido ${index} (ID: ${pedido.id}) contiene adicionales:`, {
                  pedido_list_adicionals: pedido.pedido_list_adicionals,
                  productos_con_adicionales: pedido.pedido_lists?.filter(p => p.adicionales || p.pedido_list_adicionals)
                });
              }
            });
          }
        } catch (pedidosError) {
          console.error("Error consultando pedidos:", pedidosError);
          // Continuamos con las carreras aunque falle la consulta de pedidos
        }

        // Luego consultar carreras como pasajero
        const carrerasEndpoint = `${BASE_URL}carreras/usuario`;
        console.log(
          `[DEBUG] Consultando carreras como pasajero en: ${carrerasEndpoint}`
        );

        try {
          const carrerasResponse = await fetch(carrerasEndpoint, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (carrerasResponse.ok) {
            const carrerasData = await carrerasResponse.json();
            const carrerasArray = Array.isArray(carrerasData)
              ? carrerasData
              : carrerasData &&
                carrerasData.data &&
                Array.isArray(carrerasData.data)
                ? carrerasData.data
                : [];

            if (carrerasArray.length > 0) {
              console.log(
                `Encontradas ${carrerasArray.length} carreras para el usuario`
              );
              // Formatear carreras como pasajero
              const carrerasFormateadas = formatearCarreras(
                carrerasArray,
                false
              );
              // Si hay carreras, marcar que el usuario tiene carreras
              if (carrerasFormateadas.length > 0) {
                setMostrarCarrerasUsuario(true);
              }
              resultadosCombinados = [
                ...resultadosCombinados,
                ...carrerasFormateadas,
              ];
            }
          }
        } catch (carrerasError) {
          console.error("Error consultando carreras:", carrerasError);
        }

        // Para usuarios regulares, marcar pedidos ya calificados
        if (tipoUsuario === "usuario") {
          resultadosCombinados = await marcarPedidosCalificados(
            resultadosCombinados
          );
        }
      }

      // Ordenar todos los resultados por fecha (más recientes primero)
      resultadosCombinados.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      console.log(`Total de items combinados: ${resultadosCombinados.length}`);
      setPedidos(resultadosCombinados);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }; // Cargar pedidos al montar el componente
  useEffect(() => {
    fetchPedidos();
    // Solo cargar reservas automáticamente para usuarios normales, NO para comercios
    if (tipoUsuario === "usuario") {
      fetchReservas();
    }
  }, [tipoUsuario]);

  // Refrescar pedidos cuando se regresa a esta pantalla
  useFocusEffect(
    useCallback(() => {
      if (route?.params?.refreshTrigger || route?.params?.newOrderId) {
        fetchPedidos();
      }
    }, [route?.params])
  ); // Función para manejar el pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === "reservas") {
      if (tipoUsuario === "comercio") {
        // Para comercios, solo refrescar si hay un perfil seleccionado
        if (filtroPerfilSeleccionado) {
          const perfilCompleto = perfilesCompletos.find(
            (p) => p.nombre === filtroPerfilSeleccionado
          );
          if (perfilCompleto && perfilCompleto.id) {
            fetchReservasPorPerfil(perfilCompleto.id);
          } else {
            setRefreshing(false);
          }
        } else {
          setRefreshing(false);
        }
      } else {
        // Para usuarios normales
        fetchReservas();
      }
    } else {
      fetchPedidos();
    }
  };

  // Modificar la función enviarCalificacion para soportar calificaciones desde el comercio al usuario

  const enviarCalificacion = async () => {
    if (calificacion === 0) {
      alert("Por favor selecciona una calificación");
      return;
    }

    if (!itemACalificar) return;

    setEnviandoCalificacion(true);

    try {
      // Obtener token de autenticación
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      // Determinar la URL y el formato de datos según el tipo de item y rol de usuario
      let url;
      let datosPeticion;

      // CASO 1: Usuario es un comercio calificando a un cliente
      if (tipoUsuario === "comercio" && !itemACalificar.es_carrera) {
        // Comercio calificando al usuario que hizo un pedido
        url = `${BASE_URL}pedidos/${itemACalificar.id}/puntuacion-usuario`;
        datosPeticion = {
          puntuacion_usuario: calificacion,
          comentario_usuario: comentario,
        };
      }
      // CASO 2: Usuario es un cliente calificando una carrera (al conductor)
      else if (tipoUsuario === "usuario" && itemACalificar.es_carrera) {
        // Usuario calificando al conductor de una carrera
        url = `${BASE_URL}carrera/${itemACalificar.id}/calificar-conductor`;
        datosPeticion = {
          puntuacion: calificacion,
          mensaje: comentario,
        };
      }
      // CASO 3: Usuario es un cliente calificando un pedido (al comercio)
      else if (tipoUsuario === "usuario" && !itemACalificar.es_carrera) {
        // Usuario calificando al comercio de un pedido
        url = `${BASE_URL}pedidos/${itemACalificar.id}/puntuacion`;
        datosPeticion = {
          puntuacion_restaurante: calificacion,
          comentario_restaurante: comentario,
        };
      }
      // Si no se cumple ninguna condición, mostrar un error
      else {
        throw new Error(
          "No se puede calificar este tipo de pedido con tu rol actual"
        );
      }

      console.log(`Enviando calificación a: ${url}`, datosPeticion);

      // Enviar la solicitud
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(datosPeticion),
      });

      const data = await response.json();

      if (response.ok) {
        // Guardar el ID del pedido en la lista de calificados
        const calificadosString = await AsyncStorage.getItem(
          "pedidosCalificados"
        );
        const pedidosCalificados = calificadosString
          ? JSON.parse(calificadosString)
          : [];

        if (!pedidosCalificados.includes(itemACalificar.id)) {
          pedidosCalificados.push(itemACalificar.id);
          await AsyncStorage.setItem(
            "pedidosCalificados",
            JSON.stringify(pedidosCalificados)
          );
        }

        alert("¡Gracias por tu calificación!");

        // Actualizar el estado para marcar este item como calificado
        setPedidos((prev) =>
          prev.map((p) =>
            p.id === itemACalificar.id ? { ...p, yaCalificado: true } : p
          )
        );

        // Cerrar el modal
        setCalificacionModalVisible(false);
      } else {
        throw new Error(data.message || "Error al enviar la calificación");
      }
    } catch (error) {
      console.error("Error al calificar:", error);
      alert(
        "Ocurrió un error al enviar la calificación. Inténtalo nuevamente."
      );
    } finally {
      setEnviandoCalificacion(false);
    }
  };
  useEffect(() => {
    // Cargar el contador inicial de pedidos pendientes al montar el componente
    const initializePendingCount = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        const userInfo = userData ? JSON.parse(userData) : null;
        const userType = userInfo?.tipo_usuario || "usuario";

        if (userType === "comercio") {
          // Obtener el contador guardado o establecerlo a 0
          const countStr = await AsyncStorage.getItem(
            "lastPendingPedidosCount"
          );
          const savedCount = countStr ? parseInt(countStr) : 0;
          setPreviousPendingCount(savedCount);
          console.log(
            `[DEBUG] Contador inicial de pedidos pendientes: ${savedCount}`
          );
        }
      } catch (error) {
        console.error("Error inicializando contador:", error);
      }
    };

    initializePendingCount();

    // Resto del código existente...
  }, []);
  // Mejorar la configuración inicial de audio
  useEffect(() => {
    // Verificar si el usuario es un comercio
    const checkUserTypeAndSetupAudio = async () => {
      const userData = await AsyncStorage.getItem("userData");
      const userInfoData = userData ? JSON.parse(userData) : null;
      const userType = userInfoData?.tipo_usuario || "usuario";

      // Guardar información del usuario en el estado
      setUserInfo(userInfoData);

      if (userType === "comercio") {
        console.log("Usuario comercio detectado, configurando audio...");

        // Obtener pedidos pendientes guardados
        const lastPendingCountStr = await AsyncStorage.getItem(
          "lastPendingPedidosCount"
        );
        const lastPendingCount = lastPendingCountStr
          ? parseInt(lastPendingCountStr)
          : 0;
        setPreviousPendingCount(lastPendingCount);

        // Registrar la tarea en segundo plano
        await registerBackgroundFetchAsync();
      }
    };

    checkUserTypeAndSetupAudio();

    // Limpiar cuando el componente se desmonte
    return () => {
      unregisterBackgroundFetchAsync();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fa6205" />
      </View>
    );
  }

  // Reorganizar la función crearCarrera

  // Aceptar pedido
  const aceptarPedido = async (item) => {
    try {
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        console.error("No se encontró token de autenticación");
        Alert.alert("Error", "No se encontró el token de usuario.");
        return;
      }

      const response = await fetch(`${BASE_URL}pedidos/update/aux/${item.id}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          estado: "aceptado",
          estado_pago: "pendiente",
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = `Error al aceptar el pedido. Estado: ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          if (errorData?.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          console.warn("No se pudo parsear el error como JSON");
        }

        Alert.alert("Error", errorMessage);
        return;
      }

      const data = JSON.parse(responseText);
      Alert.alert("Éxito", data.message);
      fetchPedidos();
      console.log("Pedido actualizado:", data.pedido);

    } catch (error) {
      console.error("Error al aceptar el pedido:", error);
      Alert.alert("Error", "Ocurrió un error al aceptar el pedido.");
    }
  };

  // ...dentro del componente Pedidos...

  const cancelarCarrera = async (idCarrera) => {
    try {
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        console.error("No se encontró token de autenticación");
        Alert.alert("Error", "No se encontró el token de usuario.");
        return;
      }
      const response = await fetch(`${BASE_URL}carreras/${idCarrera}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Agrega tu token si usas auth:
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          estado: 'cancelado',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Error al cancelar carrera:', data);
        Alert.alert('Error', 'No se pudo cancelar la carrera. Intenta de nuevo.');
        return;
      }

      Alert.alert('Cancelado', 'La carrera ha sido cancelada exitosamente.');
      // Aquí puedes hacer un refresh de la lista o navegación si aplica
    } catch (error) {
      console.error('Error inesperado:', error);
      Alert.alert('Error', 'Hubo un problema al cancelar la carrera.');
    }
  };

  const crearCarrera = async (item) => {
    try {
      console.log("Iniciando creación de carrera para pedido:", item.id);

      // Obtener token
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        console.error("No se encontró token de autenticación");
        return;
      }

      // Mostrar indicador de carga para este pedido específico
      setPedidos((prev) =>
        prev.map((pedido) =>
          pedido.id === item.id ? { ...pedido, creandoCarrera: true } : pedido
        )
      );

      // PASO 1: Verificar si existe una carrera asociada y eliminarla si está cancelada
      if (item.carrera && item.carrera.id) {
        console.log(`Eliminando carrera existente con ID: ${item.carrera.id}`);

        const deleteResponse = await fetch(`${BASE_URL}carreras/${item.carrera.id}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (deleteResponse.ok) {
          console.log("Carrera anterior eliminada exitosamente");
        } else {
          console.warn("No se pudo eliminar la carrera anterior, continuando con la creación...");
        }
      }

      // PASO 2: Extraer datos de origen/destino
      let origenCoords = null;
      let destinoCoords = null;
      let pickupAddress = "";
      let deliveryAddress = "";

      try {
        const datosGenerales =
          typeof item.datos_generales === "string"
            ? JSON.parse(item.datos_generales)
            : item.datos_generales;

        // Obtener coordenadas si existen
        origenCoords = {
          lat: datosGenerales.start_latitud,
          lng: datosGenerales.start_longitud,
        };

        destinoCoords = {
          lat: datosGenerales.end_latitud,
          lng: datosGenerales.end_longitud,
        };

        // Obtener dirección legible de origen (pickupAddress)
        if (origenCoords && origenCoords.lat && origenCoords.lng) {
          pickupAddress = await obtenerDireccionDesdeCoords(origenCoords);
        }

        // Obtener dirección legible de destino (deliveryAddress)
        if (datosGenerales && datosGenerales.end_lugar) {
          deliveryAddress = datosGenerales.end_lugar;
        }
      } catch (error) {
        console.error("Error al parsear datos_generales o direcciones:", error);
      }

      const totalValorProductos = item.pedido_lists?.reduce((total, prod) => {
        // Precio del producto * cantidad
        const precioProducto = parseFloat(prod.producto?.precio || prod.precio_unitario || prod.precio || 0);
        const subtotalProducto = precioProducto * parseInt(prod.cantidad || 0);

        // Precio de los adicionales * cantidad
        const subtotalAdicionales = prod.pedido_list_adicionals?.reduce((accAd, ad) => {
          const precioAd = parseFloat(ad.producto_adicional?.precio || 0);
          const cantAd = parseInt(ad.cantidad || 0);
          return accAd + (precioAd * cantAd);
        }, 0) || 0;

        return total + subtotalProducto + subtotalAdicionales;
      }, 0) || 0;

      // 2. Restamos: Total del Pedido - Valor de los Productos = Costo del Envío
      const costoEnvioCalculado = parseFloat(item.costo_total || 0) - totalValorProductos;

      // Aseguramos que no dé negativo (por si acaso hay un error de datos) y limitamos decimales si es necesario
      const costoFinalParaDriver = Math.max(0, costoEnvioCalculado);

      // PASO 3: Preparar payload para la nueva carrera
      const payload = {
        usuario_id: item.user?.id || null,
        conductor_id: null, // Iniciamos sin conductor asignado
        pedido_id: item.id,
        punto_recogida: JSON.stringify(origenCoords),
        destino: JSON.stringify(destinoCoords),
        costo: costoFinalParaDriver.toFixed(2),
        distancia: item.distancia || 0,
        estado: "pendiente",
        informacion_adicional: JSON.stringify({
          origen: pickupAddress || "",
          destino: deliveryAddress || "",
        }),
      };



      // PASO 4: Crear la nueva carrera
      const response = await fetch(`${BASE_URL}carreras`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Respuesta del API (nueva carrera):", data);

      if (response.ok) {
        // La carrera se creó con éxito, ahora actualizar el estado del pedido
        console.log(`Actualizando estado del pedido ${item.id} a completado`);

        // Realizar petición POST para actualizar el pedido a completado
        const updatePedidoResponse = await fetch(
          `${BASE_URL}pedidos/update/aux/${item.id}`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              estado: "completado",
              estado_pago: "pagado",
            }),
          }
        );

        const updatePedidoData = await updatePedidoResponse.json();
        console.log("Respuesta actualización pedido:", updatePedidoData);

        if (updatePedidoResponse.ok) {
          // Actualizar el estado para marcar este pedido como convertido a carrera y completado
          setPedidosConCarrera((prev) => [...prev, item.id]);

          // Actualizar el estado del pedido en la UI con la nueva carrera
          setPedidos((prev) =>
            prev.map((pedido) =>
              pedido.id === item.id
                ? {
                  ...pedido,
                  estado: "completado",
                  estado_pago: "pagado",
                  creandoCarrera: false,
                  carrera: {
                    ...data,
                    estado: "pendiente"
                  }
                }
                : pedido
            )
          );

          alert(item.carrera && item.carrera.id
            ? "¡Nueva carrera creada exitosamente reemplazando la anterior!"
            : "¡Carrera creada y pedido completado con éxito!");
        } else {
          // La carrera se creó pero hubo un error al actualizar el pedido
          setPedidosConCarrera((prev) => [...prev, item.id]);

          // Aún así actualizar con la nueva carrera
          setPedidos((prev) =>
            prev.map((pedido) =>
              pedido.id === item.id
                ? {
                  ...pedido,
                  creandoCarrera: false,
                  carrera: {
                    ...data,
                    estado: "pendiente"
                  }
                }
                : pedido
            )
          );

          alert(
            "Carrera creada, pero hubo un problema al actualizar el estado del pedido."
          );
        }
      } else {
        // Quitar indicador de carga en caso de error en la creación de la carrera
        setPedidos((prev) =>
          prev.map((pedido) =>
            pedido.id === item.id
              ? { ...pedido, creandoCarrera: false }
              : pedido
          )
        );

        alert(
          "Error al crear la carrera: " + (data.message || "Intente nuevamente")
        );
      }
    } catch (error) {
      console.error("Error al crear carrera:", error);

      // Quitar indicador de carga en caso de error
      setPedidos((prev) =>
        prev.map((pedido) =>
          pedido.id === item.id ? { ...pedido, creandoCarrera: false } : pedido
        )
      );

      alert("Error al crear la carrera. Intente nuevamente.");
    }
  };

  const renderTripItem = ({ item }) => {
    // Extraer datos del pedido o carrera
    let destino = "Dirección no disponible";
    let origen = "Dirección no disponible";

    // Determinar si se debe mostrar el botón de calificación
    const mostrarBotonCalificar =
      // CASO 1: Usuario calificando (comercio o conductor)
      (tipoUsuario === "usuario" &&
        activeTab === "historial" &&
        (item.estado === "completado" || item.estado === "entregado") &&
        !item.yaCalificado) ||
      // CASO 2: Comercio calificando al usuario
      (tipoUsuario === "comercio" &&
        !item.es_carrera &&
        activeTab === "historial" &&
        (item.estado === "completado" || item.estado === "entregado") &&
        !item.yaCalificado);

    // Determinar si se debe mostrar la calificación del pasajero
    const mostrarCalificacionPasajero =
      item.es_carrera &&
      item.es_conductor &&
      tipoUsuario !== "usuario" &&
      tipoUsuario !== "comercio" &&
      activeTab === "historial" &&
      (item.estado === "completado" || item.estado === "entregado");
    ///
    const mostrarCalificacionUsuario =
      item.es_carrera &&
      !item.es_conductor &&
      tipoUsuario === "usuario" &&
      activeTab === "historial" &&
      (item.estado === "completado" || item.estado === "entregado");
    ///
    const mostrarCalificacionRecibidaUsuario =
      !item.es_carrera &&
      tipoUsuario === "usuario" &&
      activeTab === "historial" &&
      (item.estado === "completado" || item.estado === "entregado") &&
      item.puntuacion_usuario !== null &&
      item.puntuacion_usuario !== undefined;

    // Determinar si se debe mostrar el botón de evidencia de pago (solo para comercios)
    const mostrarBotonEvidencia =
      tipoUsuario === "comercio" &&
      !item.es_carrera &&
      item.archivo_evidencia !== null &&
      item.archivo_evidencia !== undefined;

    // Función para renderizar estrellas según la calificación
    const renderStars = (rating) => {
      const stars = [];
      const hasRating = rating !== null && rating !== undefined;

      for (let i = 1; i <= 5; i++) {
        stars.push(
          <FontAwesome
            key={i}
            name={hasRating && i <= rating ? "star" : "star-o"}
            size={16}
            color={hasRating && i <= rating ? "#FFD700" : "#BBBBBB"}
            style={{ marginRight: 2 }}
          />
        );
      }
      return <View style={{ flexDirection: "row" }}>{stars}</View>;
    };

    if (item.es_carrera) {
      // Es una carrera (de conductor o pasajero)
      try {
        const datosGenerales =
          typeof item.datos_generales === "string"
            ? JSON.parse(item.datos_generales)
            : item.datos_generales;

        // Extraer direcciones de datos_generales
        origen = datosGenerales.start_lugar || "Dirección no disponible";
        destino = datosGenerales.end_lugar || "Dirección no disponible";
      } catch (error) {
        console.error("Error al parsear datos de carrera:", error);
      }
    } else {
      // Es un pedido regular
      try {
        if (item.datos_generales) {
          const datosGenerales = JSON.parse(item.datos_generales);
          destino = datosGenerales.end_lugar || "Dirección no disponible";
          origen = datosGenerales.start_lugar || "Dirección no disponible";
        }
      } catch (error) {
        console.error("Error al parsear datos_generales:", error);
      }
    }

    // Formatear método de pago para mostrar
    let metodoPagoLabel = "Efectivo";
    switch (item.metodo_pago) {
      case "mercadopago":
        metodoPagoLabel = "Mercado Pago";
        break;
      case "qr":
        metodoPagoLabel = "Código QR";
        break;
    }

    // Formatear tipo de viaje
    let tipoViajeLabel = "Estándar";
    if (item.tipo_viaje === "rider.moto") {
      tipoViajeLabel = "Moto";
    } else if (item.tipo_viaje === "rider.taxi") {
      tipoViajeLabel = "Taxi";
    } else if (item.tipo_viaje === "rider.mototaxi") {
      tipoViajeLabel = "Mototaxi";
    }

    // Información del comercio, servicio o persona según el tipo
    let tituloServicio = "Establecimiento:";
    let nombreServicio = "No disponible";

    if (item.es_carrera) {
      if (item.es_conductor) {
        // Soy conductor, muestro info del pasajero
        tituloServicio = "Pasajero:";
        nombreServicio = item.usuario
          ? item.usuario.nombre_completo || item.usuario.name || "Cliente"
          : "Cliente";
      } else {
        // Soy pasajero, muestro info del conductor
        tituloServicio = "Conductor:";
        nombreServicio = item.conductor
          ? item.conductor.nombre_completo || item.conductor.name || "Conductor"
          : "Conductor";
      }
    } else {
      // Es un pedido normal, muestro establecimiento
      tituloServicio = "Establecimiento:";
      nombreServicio = item.comercio
        ? item.comercio.establecimiento_nombre
        : "Comercio no disponible";
    }

    // Información del conductor (solo para pedidos completados con carrera)
    const tieneInformacionConductor =
      !item.es_carrera &&
      item.carrera &&
      item.carrera.conductor &&
      (item.estado === "completado" || item.estado === "entregado");

    const nombreConductor = tieneInformacionConductor
      ? item.carrera.conductor.nombre_completo
      : null;

    const telefonoConductor = tieneInformacionConductor
      ? item.carrera.conductor.numero_telefono
      : null;

    // Condición para mostrar botón de chat (comercio con pedidos que tienen conductor asignado)
    const mostrarBotonChatRider =
      tipoUsuario === "comercio" &&
      !item.es_carrera &&
      item.carrera &&
      item.carrera.conductor &&
      (item.estado === "activo" ||
        item.estado === "aceptado" ||
        item.estado === "en_camino" ||
        item.estado === "recogido" ||
        item.estado === "completado" ||
        item.estado === "entregado");

    // Condición para mostrar botón de chat (rider.moto con carreras que tienen pedido_id)
    const mostrarBotonChatComercio =
      tipoUsuario === "rider.moto" &&
      item.es_carrera &&
      item.pedido_id &&
      (item.estado === "aceptado" ||
        item.estado === "en_camino" ||
        item.estado === "recogido" ||
        item.estado === "activo" ||
        item.estado === "completado" ||
        item.estado === "entregado");



    // Productos del pedido - solo para pedidos normales
    const tieneProductos =
      !item.es_carrera && item.pedido_lists && item.pedido_lists.length > 0;
    const cantidadProductos = tieneProductos
      ? item.pedido_lists.reduce((total, prod) => total + prod.cantidad, 0)
      : 0;

    // Formato para fecha
    const fecha = new Date(item.created_at).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const hora = new Date(item.created_at).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Decidir la pantalla de destino basado en el tipo de usuario y tipo de ítem
    const navigateToDetails = () => {
      if (item.es_carrera) {
        // Para carreras, mantener la navegación existente
        if (tipoUsuario === "usuario" || tipoUsuario === "comercio") {
          // Usuario regular: navega a StepNueve para carreras
          navigation.navigate("StepNueve", {
            tripId: item.id,
            type: "carrera",
            esCarrera: true,
            carreraId: item.id,
            esConductor: false,
          });
        } else {
          // Rider o comercio con carrera navega a StepTrece
          navigation.navigate("StepTrece", {
            carreraId: item.id,
            esConductor: item.es_conductor,
          });
        }
      } else {
        // Para pedidos normales - navegación según tipo de usuario
        if (tipoUsuario === "usuario") {
          // Usuario navega a PedidoDetalle
          console.log("Pedidos - Navegando a PedidoDetalle con datos:", {
            pedidoId: item.id,
            pedidoData: JSON.stringify(item, null, 2)
          });

          // Log específico para adicionales
          if (item.pedido_list_adicionals) {
            console.log("Pedidos - Adicionales encontrados en el pedido:", item.pedido_list_adicionals);
          }

          // Log de productos del pedido
          if (item.pedido_lists) {
            console.log("Pedidos - Productos del pedido:", item.pedido_lists);
            item.pedido_lists.forEach((producto, index) => {
              if (producto.adicionales || producto.pedido_list_adicionals) {
                console.log(`Pedidos - Producto ${index} tiene adicionales:`, {
                  adicionales: producto.adicionales,
                  pedido_list_adicionals: producto.pedido_list_adicionals
                });
              }
            });
          }

          navigation.navigate("PedidoDetalle", {
            pedidoId: item.id,
            pedidoData: item,
          });
        } else if (tipoUsuario === "comercio") {
          // Comercio navega a PedidoDetalleComercio
          console.log("Pedidos - Comercio navegando a PedidoDetalleComercio con datos:", {
            pedidoId: item.id,
            pedidoData: JSON.stringify(item, null, 2)
          });

          navigation.navigate("PedidoDetalleComercio", {
            pedidoId: item.id,
            pedidoData: item,
          });
        }
        // Riders no tienen navegación para pedidos normales
      }
    };

    // Texto para la cabecera del item
    let textoTipoItem = "Pedido";
    if (item.es_carrera) {
      textoTipoItem = item.es_conductor
        ? "Carrera conductor"
        : "Carrera usuario";
    }

    const renderPagoDriver = (pedidoItem) => {
      const totalProductosYAdicionales = pedidoItem.pedido_lists?.reduce((total, prod) => {
        const precioProd = parseFloat(prod.producto?.precio || prod.precio_unitario || prod.precio || 0);
        const cantidadProd = parseInt(prod.cantidad || 0);
        const totalAdicionales = prod.pedido_list_adicionals?.reduce((accAd, ad) => {
          const precioAd = parseFloat(ad.producto_adicional?.precio || 0);
          const cantAd = parseInt(ad.cantidad || 0);
          return accAd + (precioAd * cantAd);
        }, 0) || 0;

        return total + (precioProd * cantidadProd) + totalAdicionales;
      }, 0) || 0;

      const costoTotal = parseFloat(pedidoItem.costo_total || 0);
      const pagoDriver = costoTotal - totalProductosYAdicionales;
      const moneda = "$";

      return (
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { fontWeight: 'bold' }]}>Pago al conductor:</Text>
          <Text style={[styles.infoValue, { fontWeight: 'bold', color: '#fa6205' }]}>
            {moneda}{pagoDriver.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      );
    };

    return (
      <View style={styles.card}>
        {item.es_carrera ? (
          // Verificar el estado para determinar si debe ser clickable
          item.estado === "aceptado" ? (
            // Solo carreras aceptadas son clickables
            <TouchableOpacity onPress={() => navigateToDetails(item)}>
              <View style={styles.cardHeader}>
                <Text style={styles.price}>
                  {"$"}
                  {parseFloat(item.costo_total || 0).toLocaleString()}
                </Text>
                <View style={styles.statusContainer}>
                  <Text style={[styles.statusChip, styles.statusPago]}>
                    {item.metodo_pago || "Efectivo"}
                  </Text>
                  <Text style={[styles.statusChip, styles.statusActivo]}>
                    {obtenerTextoEstado(item.estado)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{tituloServicio}</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {nombreServicio}
                  </Text>
                </View>

                {tieneProductos && (
                  <View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Productos:</Text>
                      <Text style={styles.infoValue}>
                        {cantidadProductos}
                        {cantidadProductos === 1 ? "artículo" : "artículos"}
                      </Text>
                    </View>

                    <View style={styles.productDetailsContainer}>
                      {item.pedido_lists.map((producto, index) => (
                        <View
                          key={`producto-${index}`}
                          style={styles.productItemContainer}
                        >
                          {/* Información principal del producto */}
                          <View style={styles.productItem}>
                            <View style={styles.productQuantity}>
                              <Text style={styles.productQuantityText}>
                                {producto.cantidad}
                              </Text>
                            </View>
                            <View style={styles.productInfo}>
                              <Text
                                style={styles.productName}
                                numberOfLines={1}
                              >
                                {producto.producto?.nombre ||
                                  producto.producto_nombre ||
                                  producto.nombre ||
                                  "Producto"}
                              </Text>
                              {(producto.producto?.variante ||
                                producto.variante) && (
                                  <Text
                                    style={styles.productVariant}
                                    numberOfLines={1}
                                  >
                                    {producto.producto?.variante ||
                                      producto.variante}
                                  </Text>
                                )}
                            </View>
                            <Text style={styles.productPrice}>
                              $ 
                              {parseFloat(
                                producto.producto?.precio ||
                                producto.precio_unitario ||
                                producto.precio ||
                                0
                              ).toFixed(2)}
                            </Text>
                          </View>

                          {/* Mostrar adicionales si existen */}
                          {producto.pedido_list_adicionals &&
                            producto.pedido_list_adicionals.length > 0 && (
                              <View style={styles.adicionalesContainer}>
                                <Text style={styles.adicionalesTitle}>
                                  Adicionales:
                                </Text>
                                {producto.pedido_list_adicionals.map(
                                  (adicional, adIndex) => (
                                    <View
                                      key={`adicional-${adicional.id}-${adIndex}`}
                                      style={styles.adicionalItem}
                                    >
                                      <Text
                                        style={styles.adicionalText}
                                        numberOfLines={1}
                                      >
                                        •
                                        {adicional.producto_adicional?.nombre ||
                                          "Adicional"}
                                      </Text>
                                      <Text style={styles.adicionalQuantity}>
                                        x{adicional.cantidad}
                                      </Text>
                                      <Text style={styles.adicionalPrice}>
                                        +$ 
                                        {(
                                          parseFloat(
                                            adicional.producto_adicional
                                              ?.precio || 0
                                          ) * parseInt(adicional.cantidad || 0)
                                        ).toFixed(2)}
                                      </Text>
                                    </View>
                                  )
                                )}
                                {/* Mostrar total de adicionales para este producto */}
                                <View style={styles.adicionalesTotal}>
                                  <Text style={styles.adicionalesTotalText}>
                                    Subtotal adicionales: $ 
                                    {producto.pedido_list_adicionals
                                      .reduce((total, adicional) => {
                                        const precio = parseFloat(
                                          adicional.producto_adicional
                                            ?.precio || 0
                                        );
                                        const cantidad = parseInt(
                                          adicional.cantidad || 0
                                        );
                                        return total + precio * cantidad;
                                      }, 0)
                                      .toFixed(2)}
                                  </Text>
                                </View>
                              </View>
                            )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tipo de servicio:</Text>
                  <Text style={styles.infoValue}>{tipoViajeLabel}</Text>
                </View>

                <View style={styles.locationRow}>
                  <FontAwesome name="circle-o" size={16} color="#999" />
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationLabel}>Origen</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {origen}
                    </Text>
                  </View>
                </View>

                <View style={styles.locationRow}>
                  <FontAwesome name="map-marker" size={16} color="#fa6205" />
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationLabel}>Destino</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {destino}
                    </Text>
                  </View>
                </View>

                <View style={styles.footerRow}>
                  <TouchableOpacity onPress={() => navigateToDetails(item)}>
                    <Text style={styles.verDetallesTexto}>Ver detalles</Text>
                  </TouchableOpacity>

                  <Text style={styles.dateTime}>
                    {fecha} - {hora}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            // Cualquier otro estado de carrera - No clickable
            <View>
              <View style={styles.cardHeader}>
                <Text style={styles.price}>
                  {"$"}
                  {parseFloat(item.costo_total || 0).toLocaleString()}
                </Text>
                <View style={styles.statusContainer}>
                  <Text style={[styles.statusChip, styles.statusPago]}>
                    {item.metodo_pago || "Efectivo"}
                  </Text>
                  {item.estado === 'pendiente' ? (
                    <Animated.Text
                      style={[
                        styles.statusChip,
                        styles.statusPendiente,
                        { backgroundColor: colorAnimado },
                      ]}
                    >
                      {obtenerTextoEstado(item.estado)}
                    </Animated.Text>
                  ) : (
                    <Text
                      style={[
                        styles.statusChip,
                        item.estado === 'activo'
                          ? styles.statusActivo
                          : item.estado === 'completado' || item.estado === 'entregado'
                            ? styles.statusCompletado
                            : styles.statusOtro,
                      ]}
                    >
                      {obtenerTextoEstado(item.estado)}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{tituloServicio}</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {item.estado === 'pendiente' ? 'Buscando conductor' : nombreServicio}
                  </Text>
                </View>

                {tieneProductos && (
                  <View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Productos:</Text>
                      <Text style={styles.infoValue}>
                        {cantidadProductos}
                        {cantidadProductos === 1 ? "artículo" : "artículos"}
                      </Text>
                    </View>

                    <View style={styles.productDetailsContainer}>
                      {item.pedido_lists.map((producto, index) => (
                        <View
                          key={`producto-${index}`}
                          style={styles.productItemContainer}
                        >
                          {/* Información principal del producto */}
                          <View style={styles.productItem}>
                            <View style={styles.productQuantity}>
                              <Text style={styles.productQuantityText}>
                                {producto.cantidad}
                              </Text>
                            </View>
                            <View style={styles.productInfo}>
                              <Text
                                style={styles.productName}
                                numberOfLines={1}
                              >
                                {producto.producto?.nombre ||
                                  producto.producto_nombre ||
                                  producto.nombre ||
                                  "Producto"}
                              </Text>
                              {(producto.producto?.variante ||
                                producto.variante) && (
                                  <Text
                                    style={styles.productVariant}
                                    numberOfLines={1}
                                  >
                                    {producto.producto?.variante ||
                                      producto.variante}
                                  </Text>
                                )}
                            </View>
                            <Text style={styles.productPrice}>
                              {"$"}
                              {parseFloat(
                                producto.producto?.precio ||
                                producto.precio_unitario ||
                                producto.precio ||
                                0
                              ).toFixed(2)}
                            </Text>
                          </View>

                          {/* Mostrar adicionales si existen */}
                          {producto.pedido_list_adicionals &&
                            producto.pedido_list_adicionals.length > 0 && (
                              <View style={styles.adicionalesContainer}>
                                <Text style={styles.adicionalesTitle}>
                                  Adicionales:
                                </Text>
                                {producto.pedido_list_adicionals.map(
                                  (adicional, adIndex) => (
                                    <View
                                      key={`adicional-${adicional.id}-${adIndex}`}
                                      style={styles.adicionalItem}
                                    >
                                      <Text
                                        style={styles.adicionalText}
                                        numberOfLines={1}
                                      >
                                        •
                                        {adicional.producto_adicional?.nombre ||
                                          "Adicional"}
                                      </Text>
                                      <Text style={styles.adicionalQuantity}>
                                        x{adicional.cantidad}
                                      </Text>
                                      <Text style={styles.adicionalPrice}>
                                        +{"$"}
                                        {(
                                          parseFloat(
                                            adicional.producto_adicional
                                              ?.precio || 0
                                          ) * parseInt(adicional.cantidad || 0)
                                        ).toFixed(2)}
                                      </Text>
                                    </View>
                                  )
                                )}
                                {/* Mostrar total de adicionales para este producto */}
                                <View style={styles.adicionalesTotal}>
                                  <Text style={styles.adicionalesTotalText}>
                                    Subtotal adicionales: {"$"}
                                    {producto.pedido_list_adicionals
                                      .reduce((total, adicional) => {
                                        const precio = parseFloat(
                                          adicional.producto_adicional
                                            ?.precio || 0
                                        );
                                        const cantidad = parseInt(
                                          adicional.cantidad || 0
                                        );
                                        return total + precio * cantidad;
                                      }, 0)
                                      .toFixed(2)}
                                  </Text>
                                </View>
                              </View>
                            )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tipo de servicio:</Text>
                  <Text style={styles.infoValue}>{tipoViajeLabel}</Text>
                </View>

                <View style={styles.locationRow}>
                  <FontAwesome name="circle-o" size={16} color="#999" />
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationLabel}>Origen</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {origen}
                    </Text>
                  </View>
                </View>

                <View style={styles.locationRow}>
                  <FontAwesome name="map-marker" size={16} color="#fa6205" />
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationLabel}>Destino</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {destino}
                    </Text>
                  </View>
                </View>

                <View style={styles.footerRow}>
                  {!(["cancelado", "completado", "entregado"].includes(item.estado)) && (
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(
                          "Confirmar cancelación",
                          "¿Estás seguro de que quieres cancelar esta carrera?",
                          [
                            { text: "No", style: "cancel" },
                            { text: "Sí", onPress: () => cancelarCarrera(item.id) },
                          ]
                        )
                      }
                    >
                      <Text style={styles.cancelarTexto}>Cancelar</Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.dateTime}>
                    {fecha} - {hora}
                  </Text>
                </View>

                {item.estado === 'pendiente' && (
                  <Text style={styles.mensajePendiente}>
                    Si no se encuentra un conductor en 3 minutos, la carrera se cancelará automáticamente.
                  </Text>
                )}

                {/* Sección de calificación del pasajero para riders */}
                {mostrarCalificacionPasajero && (
                  <View style={styles.ratingSection}>
                    <View style={styles.ratingHeader}>
                      <Text style={styles.ratingTitle}>
                        Calificación recibida
                      </Text>
                      {renderStars(item.puntuacion_driver)}
                    </View>

                    {item.mensaje_driver && (
                      <View style={styles.ratingCommentContainer}>
                        <Text style={styles.ratingCommentLabel}>
                          Comentario:
                        </Text>
                        <Text style={styles.ratingComment}>
                          {item.mensaje_driver}
                        </Text>
                      </View>
                    )}

                    {!item.puntuacion_driver && (
                      <Text style={styles.noRatingText}>
                        Aún no te han calificado en esta carrera
                      </Text>
                    )}
                  </View>
                )}
                {mostrarCalificacionUsuario && (
                  <View style={styles.ratingSection}>
                    <View style={styles.ratingHeader}>
                      <Text style={styles.ratingTitle}>Tu calificación</Text>
                      {renderStars(item.puntuacion_pasajero)}
                    </View>

                    {item.mensaje_pasajero && (
                      <View style={styles.ratingCommentContainer}>
                        <Text style={styles.ratingCommentLabel}>
                          Comentario del conductor:
                        </Text>
                        <Text style={styles.ratingComment}>
                          {item.mensaje_pasajero}
                        </Text>
                      </View>
                    )}

                    {!item.puntuacion_pasajero && (
                      <Text style={styles.noRatingText}>
                        Aún no has sido calificado en esta carrera
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          )
        ) : (
          // Pedidos normales (no carreras) - Clickeable para usuarios y comercios
          tipoUsuario === "usuario" || tipoUsuario === "comercio" ? (
            <TouchableOpacity onPress={() => navigateToDetails()}>
              <View style={styles.cardHeader}>
                <Text style={styles.price}>
                  {"$"}{parseFloat(item.costo_total || 0).toLocaleString()}
                </Text>
                <View style={styles.statusContainer}>
                  <Text style={[styles.statusChip, styles.statusPago]}>
                    {item.metodo_pago || "Efectivo"}
                  </Text>
                  <Text
                    style={[
                      styles.statusChip,
                      item.estado === "pendiente"
                        ? styles.statusPendiente
                        : item.estado === "activo"
                          ? styles.statusActivo
                          : item.estado === "completado" ||
                            item.estado === "entregado"
                            ? styles.statusCompletado
                            : styles.statusOtro,
                    ]}
                  >
                    {obtenerTextoEstadoPedidos(item.estado)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{tituloServicio}</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {nombreServicio}
                  </Text>
                </View>

                {/* Información del conductor (solo para pedidos completados con carrera) nos fuimos */}
                {tieneInformacionConductor && (
                  <View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Conductor:</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>
                        {nombreConductor}
                      </Text>
                    </View>
                    {telefonoConductor && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Teléfono conductor:</Text>
                        <Text style={styles.infoValue}>
                          {telefonoConductor}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {renderPagoDriver(item)}

                {/* Botón de chat para comercio - Solo para pedidos activos con conductor */}
                {mostrarBotonChatRider && (
                  <View style={styles.infoRow}>
                    <TouchableOpacity
                      style={styles.chatRiderButton}
                      onPress={() => abrirChatComercioRider(item)}
                    >
                      <FontAwesome name="comments" size={16} color="#1C1C1E" style={{ marginRight: 8 }} />
                      <Text style={styles.chatRiderButtonText}>Chat para Rider</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {tieneProductos && (
                  <View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Productos:</Text>
                      <Text style={styles.infoValue}>
                        {cantidadProductos}
                        {cantidadProductos === 1 ? "artículo" : "artículos"}
                      </Text>
                    </View>

                    <View style={styles.productDetailsContainer}>
                      {item.pedido_lists.map((producto, index) => (
                        <View
                          key={`producto-${index}`}
                          style={styles.productItemContainer}
                        >
                          {/* Información principal del producto */}
                          <View style={styles.productItem}>
                            <View style={styles.productQuantity}>
                              <Text style={styles.productQuantityText}>
                                {producto.cantidad}
                              </Text>
                            </View>
                            <View style={styles.productInfo}>
                              <Text style={styles.productName} numberOfLines={1}>
                                {producto.producto?.nombre ||
                                  producto.producto_nombre ||
                                  producto.nombre ||
                                  "Producto"}
                              </Text>
                              {(producto.producto?.variante ||
                                producto.variante) && (
                                  <Text
                                    style={styles.productVariant}
                                    numberOfLines={1}
                                  >
                                    {producto.producto?.variante ||
                                      producto.variante}
                                  </Text>
                                )}
                            </View>
                            <Text style={styles.productPrice}>
                              {"$"}
                              {parseFloat(
                                producto.producto?.precio ||
                                producto.precio_unitario ||
                                producto.precio ||
                                0
                              ).toFixed(2)}
                            </Text>
                          </View>

                          {/* Mostrar adicionales si existen */}
                          {producto.pedido_list_adicionals &&
                            producto.pedido_list_adicionals.length > 0 && (
                              <View style={styles.adicionalesContainer}>
                                <Text style={styles.adicionalesTitle}>
                                  Adicionales:
                                </Text>
                                {producto.pedido_list_adicionals.map(
                                  (adicional, adIndex) => (
                                    <View
                                      key={`adicional-${adicional.id}-${adIndex}`}
                                      style={styles.adicionalItem}
                                    >
                                      <Text
                                        style={styles.adicionalText}
                                        numberOfLines={1}
                                      >
                                        •
                                        {adicional.producto_adicional?.nombre ||
                                          "Adicional"}
                                      </Text>
                                      <Text style={styles.adicionalQuantity}>
                                        x{adicional.cantidad}
                                      </Text>
                                      <Text style={styles.adicionalPrice}>
                                        +{"$"}
                                        {(
                                          parseFloat(
                                            adicional.producto_adicional
                                              ?.precio || 0
                                          ) * parseInt(adicional.cantidad || 0)
                                        ).toFixed(2)}
                                      </Text>
                                    </View>
                                  )
                                )}
                                {/* Mostrar total de adicionales para este producto */}
                                <View style={styles.adicionalesTotal}>
                                  <Text style={styles.adicionalesTotalText}>
                                    Subtotal adicionales: $ 
                                    {producto.pedido_list_adicionals
                                      .reduce((total, adicional) => {
                                        const precio = parseFloat(
                                          adicional.producto_adicional?.precio ||
                                          0
                                        );
                                        const cantidad = parseInt(
                                          adicional.cantidad || 0
                                        );
                                        return total + precio * cantidad;
                                      }, 0)
                                      .toFixed(2)}
                                  </Text>
                                </View>
                              </View>
                            )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tipo de servicio:</Text>
                  <Text style={styles.infoValue}>{tipoViajeLabel}</Text>
                </View>

                <View style={styles.locationRow}>
                  <FontAwesome name="circle-o" size={16} color="#999" />
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationLabel}>Origen</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {origen}
                    </Text>
                  </View>
                </View>

                <View style={styles.locationRow}>
                  <FontAwesome name="map-marker" size={16} color="#fa6205" />

                  <View style={styles.locationDetails}>
                    <Text style={styles.locationLabel}>Destino</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {destino}
                    </Text>
                  </View>
                </View>
                {mostrarCalificacionRecibidaUsuario && (
                  <View style={styles.ratingSection}>
                    <View style={styles.ratingHeader}>
                      <Text style={styles.ratingTitle}>
                        Tu calificación por el comercio
                      </Text>
                      {renderStars(item.puntuacion_usuario)}
                    </View>

                    {item.comentario_usuario && (
                      <View style={styles.ratingCommentContainer}>
                        <Text style={styles.ratingCommentLabel}>
                          Comentario del comercio:
                        </Text>
                        <Text style={styles.ratingComment}>
                          {item.comentario_usuario}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                <View style={styles.footerRow}>
                  <TouchableOpacity onPress={() => navigateToDetails(item)}>
                    <Text style={styles.verDetallesTexto}>Ver detalles</Text>
                  </TouchableOpacity>

                  <Text style={styles.dateTime}>
                    {fecha} - {hora}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            // Para riders - No clickeable
            <View>
              <View style={styles.cardHeader}>
                <Text style={styles.price}>
                  $ {parseFloat(item.costo_total || 0).toLocaleString()}
                </Text>
                <View style={styles.statusContainer}>
                  <Text style={[styles.statusChip, styles.statusPago]}>
                    {item.metodo_pago || "Efectivo"}
                  </Text>
                  <Text
                    style={[
                      styles.statusChip,
                      item.estado === "pendiente"
                        ? styles.statusPendiente
                        : item.estado === "activo" ||
                          item.estado === "aceptado"
                          ? styles.statusActivo
                          : item.estado === "completado" ||
                            item.estado === "entregado"
                            ? styles.statusCompletado
                            : styles.statusOtro,
                    ]}
                  >
                    {item.estado || "Pendiente"}
                  </Text>
                </View>
                <Text style={styles.tripNumber}>Pedido #{item.id}</Text>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{tituloServicio}</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {nombreServicio}
                  </Text>
                </View>

                {/* Información del conductor (solo para pedidos completados con carrera) */}
                {tieneInformacionConductor && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Conductor:</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>
                        {nombreConductor}
                      </Text>
                    </View>
                    {telefonoConductor && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Teléfono conductor:</Text>
                        <Text style={styles.infoValue}>
                          {telefonoConductor}
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {/* Botón de chat para comercio - Solo para pedidos activos con conductor */}
                {mostrarBotonChatRider && (
                  <View style={styles.infoRow}>
                    <TouchableOpacity
                      style={styles.chatRiderButton}
                      onPress={() => abrirChatComercioRider(item)}
                    >
                      <FontAwesome name="comments" size={16} color="#fa6205" style={{ marginRight: 8 }} />
                      <Text style={styles.chatRiderButtonText}>Chat para Rider</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {tieneProductos && (
                  <View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Productos:</Text>
                      <Text style={styles.infoValue}>
                        {cantidadProductos}
                        {cantidadProductos === 1 ? "artículo" : "artículos"}
                      </Text>
                    </View>

                    <View style={styles.productDetailsContainer}>
                      {item.pedido_lists.map((producto, index) => (
                        <View
                          key={`producto-${index}`}
                          style={styles.productItemContainer}
                        >
                          {/* Información principal del producto */}
                          <View style={styles.productItem}>
                            <View style={styles.productQuantity}>
                              <Text style={styles.productQuantityText}>
                                {producto.cantidad}
                              </Text>
                            </View>
                            <View style={styles.productInfo}>
                              <Text style={styles.productName} numberOfLines={1}>
                                {producto.producto?.nombre ||
                                  producto.producto_nombre ||
                                  producto.nombre ||
                                  "Producto"}
                              </Text>
                              {(producto.producto?.variante ||
                                producto.variante) && (
                                  <Text
                                    style={styles.productVariant}
                                    numberOfLines={1}
                                  >
                                    {producto.producto?.variante ||
                                      producto.variante}
                                  </Text>
                                )}
                            </View>
                            <Text style={styles.productPrice}>
                              {"$"}
                              {parseFloat(
                                producto.producto?.precio ||
                                producto.precio_unitario ||
                                producto.precio ||
                                0
                              ).toFixed(2)}
                            </Text>
                          </View>

                          {/* Mostrar adicionales si existen */}
                          {producto.pedido_list_adicionals &&
                            producto.pedido_list_adicionals.length > 0 && (
                              <View style={styles.adicionalesContainer}>
                                <Text style={styles.adicionalesTitle}>
                                  Adicionales:
                                </Text>
                                {producto.pedido_list_adicionals.map(
                                  (adicional, adIndex) => (
                                    <View
                                      key={`adicional-${adicional.id}-${adIndex}`}
                                      style={styles.adicionalItem}
                                    >
                                      <Text
                                        style={styles.adicionalText}
                                        numberOfLines={1}
                                      >
                                        •
                                        {adicional.producto_adicional?.nombre ||
                                          "Adicional"}
                                      </Text>
                                      <Text style={styles.adicionalQuantity}>
                                        x{adicional.cantidad}
                                      </Text>
                                      <Text style={styles.adicionalPrice}>
                                        +{"$"}
                                        {(
                                          parseFloat(
                                            adicional.producto_adicional
                                              ?.precio || 0
                                          ) * parseInt(adicional.cantidad || 0)
                                        ).toFixed(2)}
                                      </Text>
                                    </View>
                                  )
                                )}
                                {/* Mostrar total de adicionales para este producto */}
                                <View style={styles.adicionalesTotal}>
                                  <Text style={styles.adicionalesTotalText}>
                                    Subtotal adicionales: {"$"}
                                    {producto.pedido_list_adicionals
                                      .reduce((total, adicional) => {
                                        const precio = parseFloat(
                                          adicional.producto_adicional
                                            ?.precio || 0
                                        );
                                        const cantidad = parseInt(
                                          adicional.cantidad || 0
                                        );
                                        return total + precio * cantidad;
                                      }, 0)
                                      .toFixed(2)}
                                  </Text>
                                </View>
                              </View>
                            )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tipo de servicio:</Text>
                  <Text style={styles.infoValue}>{tipoViajeLabel}</Text>
                </View>

                <View style={styles.locationRow}>
                  <FontAwesome name="circle-o" size={16} color="#999" />
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationLabel}>Origen</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {origen}
                    </Text>
                  </View>
                </View>

                <View style={styles.locationRow}>
                  <FontAwesome name="map-marker" size={16} color="#fa6205" />
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationLabel}>Destino</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {destino}
                    </Text>
                  </View>
                </View>

                {mostrarCalificacionRecibidaUsuario && (
                  <View style={styles.ratingSection}>
                    <View style={styles.ratingHeader}>
                      <Text style={styles.ratingTitle}>
                        Tu calificación por el comercio
                      </Text>
                      {renderStars(item.puntuacion_usuario)}
                    </View>

                    {item.comentario_usuario && (
                      <View style={styles.ratingCommentContainer}>
                        <Text style={styles.ratingCommentLabel}>
                          Comentario del comercio:
                        </Text>
                        <Text style={styles.ratingComment}>
                          {item.comentario_usuario}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.footerRow}>
                  <Text style={styles.dateTime}>
                    {fecha} - {hora}
                  </Text>
                </View>
              </View>
            </View>
          )
        )}

        {/* Botón para crear carrera solo para comercios con pedidos pendientes sin carrera asociada o con carrera cancelada */}
        {tipoUsuario === "comercio" &&
          !item.es_carrera &&
          (((item.estado === "pendiente" || item.estado === "aceptado") && !pedidosConCarrera.includes(item.id)) ||
            (item.estado === "completado" && item.carrera && item.carrera.estado === "cancelado")) && (
            <View style={styles.buttonContainer}>
              {item.creandoCarrera ? (
                <View style={styles.loadingButtonContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.loadingButtonText}>
                    {item.carrera?.estado === "cancelado"
                      ? "Creando nueva carrera..."
                      : "Creando carrera..."}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Botón según estado del pedido */}
                  {item.estado === "pendiente" ? (
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => aceptarPedido(item)}
                    >
                      <Text style={styles.acceptButtonText}>Aceptar pedido</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => crearCarrera(item)}
                    >
                      <Text style={styles.acceptButtonText}>
                        {item.carrera?.estado === "cancelado"
                          ? "Crear nueva carrera"
                          : "Completar y solicitar carrera"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* Mensaje condicional según estado del pedido */}
              <Text style={styles.infoLabel}>
                {item.estado_pago === "pendiente"
                  ? "Si el pedido no se acepta en el transcurso de 3 minutos, se cancelará automáticamente."
                  : "Si en tres minutos no se te ha asignado un Rider, puedes relanzar la carrera."}
              </Text>
            </View>
          )}

        {/* Botón de evidencia de pago (solo para comercios) */}
        {mostrarBotonEvidencia && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.evidenceButton}
              onPress={() => mostrarModalEvidencia(item)}
            >
              <FontAwesome name="file-image-o" size={16} color="#1C1C1E" />
              <Text style={styles.evidenceButtonText}>Ver evidencia de pago</Text>
            </TouchableOpacity>

            {item.estado_pago !== 'completado' && (
              <TouchableOpacity
                style={[styles.evidenceButton, { backgroundColor: '#fa6205', marginTop: 8 }]}
                onPress={() => {
                  Alert.alert(
                    'Aprobar pago',
                    '¿Estás seguro de que deseas aprobar este pago?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Aprobar',
                        onPress: () => aprobarPago(item),
                        style: 'default',
                      },
                    ],
                    { cancelable: true }
                  );
                }}
              >
                <FontAwesome name="check-circle" size={16} color="#1C1C1E" />
                <Text style={styles.evidenceButtonText}>Aprobar pago</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {/* Botón de calificación */}
        {mostrarBotonCalificar && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.ratingButton}
              onPress={() => mostrarModalCalificacion(item)}
            >
              <Text style={styles.ratingButtonText}>
                {tipoUsuario === "comercio"
                  ? "Calificar al cliente"
                  : item.es_carrera
                    ? "Calificar al conductor"
                    : "Calificar al comercio"}
              </Text>
            </TouchableOpacity>
          </View>
        )}



        {/* Botón de chat para rider.moto (con pedido_id) */}
        {mostrarBotonChatComercio && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => abrirChatRiderComercio(item)}
            >
              <FontAwesome name="comments" size={16} color="#1C1C1E" />
              <Text style={styles.chatButtonText}>Chat con comercio</Text>
            </TouchableOpacity>
          </View>
        )}


      </View>
    );
  };

  // Función para renderizar items de reservas
  const renderReservaItem = ({ item }) => {
    // Formatear fecha y hora
    const fechaFormateada = new Date(item.fecha).toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const horaInicioFormateada = item.hora_inicio?.slice(0, 5) || "";
    const horaFinFormateada = item.hora_fin?.slice(0, 5) || ""; // Información del cliente
    const clienteNombre = item.user_perfil?.user?.nombre_completo || "Cliente";
    const clienteTelefono = item.user_perfil?.user?.numero_telefono || "";

    // Información del perfil - CORREGIDO: usar el mapping correcto
    // Buscar el perfil usando user_perfil_id en los perfiles completos
    const perfilEncontrado = perfilesCompletos.find(
      (p) => p.id === item.user_perfil_id
    );
    const servicioNombre =
      perfilEncontrado?.nombre ||
      item.servicio_nombre ||
      item.user_perfil?.nombre ||
      "Perfil";
    const servicioDescripcion = item.user_perfil?.descripcion || "";

    // Extraer dirección desde datos_generales
    let direccionReserva = null;
    try {
      if (item.datos_generales) {
        const datosGenerales =
          typeof item.datos_generales === "string"
            ? JSON.parse(item.datos_generales)
            : item.datos_generales;
        direccionReserva = datosGenerales?.direccion || null;
      }
    } catch (error) {
      console.error("Error al parsear datos_generales:", error);
    }

    // Determinar si se puede calificar la reserva
    const puedeCalificar =
      item.estado === "completado" &&
      !item.puntuacion_perfil &&
      tipoUsuario === "comercio";

    // Determinar si se puede aceptar la reserva
    const puedeAceptar =
      item.estado === "pendiente" && tipoUsuario === "comercio";

    return (
      <View style={styles.reservaCard}>
        <View style={styles.reservaCardHeader}>
          <Text style={styles.reservaClienteNombre}>{clienteNombre}</Text>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusChip, styles.statusPago]}>
              {item.metodo_pago || "Efectivo"}
            </Text>
            <Text
              style={[
                styles.statusChip,
                item.estado === "pendiente"
                  ? styles.statusPendiente
                  : item.estado === "confirmado"
                    ? styles.statusActivo
                    : item.estado === "completado"
                      ? styles.statusCompletado
                      : styles.statusOtro,
              ]}
            >
              {item.estado || "Pendiente"}
            </Text>
          </View>
          <Text style={styles.tripNumber}>Reserva #{item.id}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.reservaInfoRow}>
            <Text style={styles.reservaInfoLabel}>Perfil:</Text>
            <Text style={styles.reservaInfoValue} numberOfLines={1}>
              {servicioNombre}
            </Text>
          </View>
          {servicioDescripcion && (
            <View style={styles.reservaInfoRow}>
              <Text style={styles.reservaInfoLabel}>Descripción:</Text>
              <Text style={styles.reservaInfoValue} numberOfLines={2}>
                {servicioDescripcion}
              </Text>
            </View>
          )}
          <View style={styles.reservaInfoRow}>
            <Text style={styles.reservaInfoLabel}>Fecha:</Text>
            <Text style={styles.reservaInfoValue}>{fechaFormateada}</Text>
          </View>
          <View style={styles.reservaInfoRow}>
            <Text style={styles.reservaInfoLabel}>Horario:</Text>
            <Text style={styles.reservaInfoValue}>
              {horaInicioFormateada} - {horaFinFormateada}
            </Text>
          </View>
          <View style={styles.reservaInfoRow}>
            <Text style={styles.reservaInfoLabel}>Tipo:</Text>
            <Text style={styles.reservaInfoValue}>
              {item.tipo_reserva === "local" ? "En local" : "A domicilio"}
            </Text>
          </View>
          {/* Mostrar dirección si es domicilio y existe */}
          {item.tipo_reserva === "domicilio" && direccionReserva && (
            <View style={styles.reservaLocationRow}>
              <FontAwesome name="map-marker" size={16} color="#555" />
              <View style={styles.reservaLocationDetails}>
                <Text style={styles.reservaLocationLabel}>
                  Dirección de servicio:
                </Text>
                <Text style={styles.reservaLocationText} numberOfLines={2}>
                  {direccionReserva}
                </Text>
              </View>
            </View>
          )}
          {clienteTelefono && (
            <View style={styles.reservaLocationRow}>
              <FontAwesome name="phone" size={16} color="#555" />
              <View style={styles.reservaLocationDetails}>
                <Text style={styles.reservaLocationLabel}>Teléfono:</Text>
                <Text style={styles.reservaLocationText}>
                  {clienteTelefono}
                </Text>
              </View>
            </View>
          )}
          <View style={styles.footerRow}>
            <Text style={styles.price}>
              {"$"}{parseFloat(item.costo_total || 0).toLocaleString()}
            </Text>
          </View>
          {/* Mostrar items de la reserva si existen */}
          {item.reserva_items && item.reserva_items.length > 0 && (
            <View style={styles.productDetailsContainer}>
              <Text style={styles.infoLabel}>Items reservados:</Text>
              {item.reserva_items.map((reservaItem, index) => (
                <View key={`reserva-item-${index}`}>
                  {/* Servicio principal */}
                  <View style={styles.productItem}>
                    <View style={styles.productQuantity}>
                      <Text style={styles.productQuantityText}>
                        {reservaItem.cantidad || 1}
                      </Text>
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>
                        {reservaItem.user_servicio?.nombre ||
                          reservaItem.nombre ||
                          "Servicio"}
                      </Text>
                      {(reservaItem.user_servicio?.descripcion ||
                        reservaItem.descripcion) && (
                          <Text style={styles.productVariant}>
                            {reservaItem.user_servicio?.descripcion ||
                              reservaItem.descripcion}
                          </Text>
                        )}
                      {reservaItem.user_servicio?.tiempo && (
                        <Text style={styles.productTime}>
                          ⏱️ {reservaItem.user_servicio.tiempo} min
                        </Text>
                      )}
                    </View>
                    <Text style={styles.productPrice}>
                      {"$"}
                      {parseFloat(
                        reservaItem.user_servicio?.precio ||
                        reservaItem.precio ||
                        0
                      ).toFixed(2)}
                    </Text>
                  </View>

                  {/* Adicionales del servicio */}
                  {reservaItem.reserva_item_adicionals &&
                    reservaItem.reserva_item_adicionals.length > 0 && (
                      <View style={styles.additionalsContainer}>
                        <Text style={styles.additionalsTitle}>
                          Adicionales:
                        </Text>
                        {reservaItem.reserva_item_adicionals.map(
                          (adicional, adicionalIndex) => (
                            <View
                              key={`adicional-${adicional.id}-${adicionalIndex}`}
                              style={styles.additionalItem}
                            >
                              <View style={styles.productQuantity}>
                                <Text style={styles.productQuantityText}>
                                  {adicional.cantidad || 1}
                                </Text>
                              </View>
                              <View style={styles.productInfo}>
                                <Text style={styles.additionalName}>
                                  +
                                  {adicional.user_servicio_adicional?.nombre ||
                                    "Adicional"}
                                </Text>
                                {adicional.user_servicio_adicional
                                  ?.descripcion && (
                                    <Text style={styles.additionalDescription}>
                                      {
                                        adicional.user_servicio_adicional
                                          .descripcion
                                      }
                                    </Text>
                                  )}
                                {adicional.user_servicio_adicional?.tiempo && (
                                  <Text style={styles.additionalTime}>
                                    ⏱️ +
                                    {adicional.user_servicio_adicional.tiempo}
                                    min
                                  </Text>
                                )}
                              </View>
                              <Text style={styles.additionalPrice}>
                                +{"$"}
                                {parseFloat(
                                  adicional.user_servicio_adicional?.precio || 0
                                ).toFixed(2)}
                              </Text>
                            </View>
                          )
                        )}
                      </View>
                    )}
                </View>
              ))}
            </View>
          )}
          {/* Mostrar calificaciones si existen */}
          {(item.puntuacion_perfil || item.puntuacion_user) && (
            <View style={styles.ratingSection}>
              {item.puntuacion_perfil && (
                <View>
                  <View style={styles.ratingHeader}>
                    <Text style={styles.ratingTitle}>
                      Tu calificación al cliente:
                    </Text>
                    <View style={{ flexDirection: "row" }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FontAwesome
                          key={star}
                          name={
                            star <= item.puntuacion_perfil ? "star" : "star-o"
                          }
                          size={16}
                          color={
                            star <= item.puntuacion_perfil
                              ? "#FFD700"
                              : "#DDDDDD"
                          }
                        />
                      ))}
                    </View>
                  </View>
                  {item.comentario_perfil && (
                    <View style={styles.ratingCommentContainer}>
                      <Text style={styles.ratingCommentLabel}>
                        Tu comentario:
                      </Text>
                      <Text style={styles.ratingComment}>
                        "{item.comentario_perfil}"
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {item.puntuacion_user && (
                <View style={{ marginTop: item.puntuacion_perfil ? 10 : 0 }}>
                  <View style={styles.ratingHeader}>
                    <Text style={styles.ratingTitle}>
                      Calificación del cliente:
                    </Text>
                    <View style={{ flexDirection: "row" }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FontAwesome
                          key={star}
                          name={
                            star <= item.puntuacion_user ? "star" : "star-o"
                          }
                          size={16}
                          color={
                            star <= item.puntuacion_user ? "#FFD700" : "#DDDDDD"
                          }
                        />
                      ))}
                    </View>
                  </View>
                  {item.comentario_user && (
                    <View style={styles.ratingCommentContainer}>
                      <Text style={styles.ratingCommentLabel}>
                        Comentario del cliente:
                      </Text>
                      <Text style={styles.ratingComment}>
                        "{item.comentario_user}"
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
          {/* Botón de calificación para comercios */}
          {puedeCalificar && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.ratingButton}
                onPress={() => mostrarModalCalificacion(item)}
              >
                <Text style={styles.ratingButtonText}>
                  Calificar al cliente
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Botón para aceptar reserva solo para comercios con reservas pendientes */}
          {puedeAceptar && (
            <View style={styles.buttonContainer}>
              {item.aceptandoReserva ? (
                <View style={styles.loadingButtonContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.loadingButtonText}>
                    Aceptando reserva...
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => aceptarReserva(item.id)}
                >
                  <Text style={styles.acceptButtonText}>Terminar Servicio</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={styles.footerRow}>
            <Text style={styles.dateTime}>
              {new Date(item.created_at).toLocaleDateString("es-ES")} -
              {new Date(item.created_at).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Nueva función para aceptar reservas
  ////
  // Función para aceptar una reserva (solo para comercios)
  const aceptarReserva = async (reservaId) => {
    try {
      console.log(`[DEBUG] Aceptando reserva ${reservaId}`);

      // Obtener el token de autenticación
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      // Obtener el tipo de usuario para verificar que es comercio
      const userData = await AsyncStorage.getItem("userData");
      const userInfo = userData ? JSON.parse(userData) : null;
      const userType = userInfo?.tipo_usuario || "usuario";

      if (userType !== "comercio") {
        throw new Error("Solo los comercios pueden aceptar reservas");
      }

      // Actualizar el estado local inmediatamente para mostrar feedback visual
      setReservas((prevReservas) =>
        prevReservas.map((reserva) =>
          reserva.id === reservaId
            ? { ...reserva, estado: "completado", aceptandoReserva: true }
            : reserva
        )
      );

      const endpoint = `${BASE_URL}reservas/${reservaId}`;
      console.log(`[DEBUG] Aceptando reserva en: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          estado: "completado",
        }),
      });

      if (!response.ok) {
        // Si falla, revertir el cambio local
        setReservas((prevReservas) =>
          prevReservas.map((reserva) =>
            reserva.id === reservaId
              ? { ...reserva, estado: "pendiente", aceptandoReserva: false }
              : reserva
          )
        );
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("[DEBUG] Respuesta de aceptar reserva:", data);

      // Actualizar el estado local con la respuesta del servidor
      setReservas((prevReservas) =>
        prevReservas.map((reserva) =>
          reserva.id === reservaId
            ? { ...reserva, estado: "completado", aceptandoReserva: false }
            : reserva
        )
      );

      // Actualizar también las reservas filtradas
      setFilteredReservas((prevFiltered) =>
        prevFiltered.map((reserva) =>
          reserva.id === reservaId
            ? { ...reserva, estado: "completado", aceptandoReserva: false }
            : reserva
        )
      );

      alert("Reserva aceptada exitosamente");
    } catch (error) {
      console.error("Error al aceptar reserva:", error);

      // Revertir el cambio local en caso de error
      setReservas((prevReservas) =>
        prevReservas.map((reserva) =>
          reserva.id === reservaId
            ? { ...reserva, estado: "pendiente", aceptandoReserva: false }
            : reserva
        )
      );

      alert(`Error al aceptar la reserva: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <Text style={styles.headerTitle}>
        {isUserRider
          ? "Mis Carreras"
          : mostrarCarrerasUsuario
            ? "Mis Pedidos y Viajes"
            : "Mis Pedidos y viajes"}
      </Text>
      <Modal
        animationType="slide"
        transparent={true}
        visible={calificacionModalVisible}
        onRequestClose={() => setCalificacionModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <ScrollView
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: "center",
                }}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.calificacionModal}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {tipoUsuario === "comercio"
                        ? "Califica tu experiencia con el cliente"
                        : itemACalificar?.es_carrera
                          ? "Califica tu experiencia con el conductor"
                          : "Califica tu experiencia con el comercio"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setCalificacionModalVisible(false)}
                      style={styles.closeButton}
                    >
                      <FontAwesome name="close" size={20} color="#1C1C1E" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.calificacionSubtitle}>
                    ¿Cómo calificarías tu experiencia?
                  </Text>

                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={`star-${star}`}
                        onPress={() => setCalificacion(star)}
                        style={styles.starButton}
                      >
                        <FontAwesome
                          name={calificacion >= star ? "star" : "star-o"}
                          size={36}
                          color={calificacion >= star ? "#FFD700" : "#DDDDDD"}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.comentarioLabel}>
                    Déjanos un comentario (opcional):
                  </Text>

                  <TextInput
                    style={styles.comentarioInput}
                    placeholder="Escribe tu comentario aquí..."
                    placeholderTextColor="#999"
                    value={comentario}
                    onChangeText={setComentario}
                    multiline={true}
                    numberOfLines={4}
                  />

                  <TouchableOpacity
                    style={[
                      styles.enviarButton,
                      calificacion === 0 ? styles.enviarButtonDisabled : null,
                    ]}
                    onPress={enviarCalificacion}
                    disabled={calificacion === 0 || enviandoCalificacion}
                  >
                    {enviandoCalificacion ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.enviarButtonText}>
                        Enviar calificación
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal para ver evidencia de pago */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalEvidenciaVisible}
        onRequestClose={() => setModalEvidenciaVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.evidenceModalContainer}>
            <View style={styles.evidenceModalHeader}>
              <Text style={styles.evidenceModalTitle}>Evidencia de Pago</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalEvidenciaVisible(false)}
              >
                <FontAwesome name="times" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {pedidoEvidencia && (
              <View style={styles.evidenceContent}>
                {pedidoEvidencia.archivo_evidencia ? (
                  <View style={styles.evidenceImageContainer}>
                    <Text style={styles.evidenceLabel}>Comprobante de pago:</Text>
                    <Image
                      source={{ uri: getImageUrl(pedidoEvidencia.archivo_evidencia) }}
                      style={styles.evidenceImage}
                      resizeMode="contain"
                      onError={(error) => {
                        console.error("Error al cargar imagen de evidencia:", error);
                      }}
                      onLoad={() => {
                        console.log("Imagen de evidencia cargada correctamente");
                      }}
                    />
                    <Text style={styles.evidenceInfo}>
                      Pedido #{pedidoEvidencia.id} - {pedidoEvidencia.user?.nombre_completo}
                    </Text>

                  </View>
                ) : (
                  <View style={styles.noEvidenceContainer}>
                    <FontAwesome name="file-o" size={50} color="#ccc" />
                    <Text style={styles.noEvidenceText}>
                      No hay evidencia de pago disponible
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal para seleccionar perfil */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={mostrarModalPerfil}
        onRequestClose={() => setMostrarModalPerfil(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profileSelectorModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Perfil</Text>
              <TouchableOpacity
                onPress={() => setMostrarModalPerfil(false)}
                style={styles.closeButton}
              >
                <FontAwesome name="times" size={20} color="#1C1C1E" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.profileList}>
              {/* Opción "Todos" */}
              <TouchableOpacity
                style={[
                  styles.profileOption,
                  !filtroPerfilSeleccionado && styles.profileOptionSelected,
                ]}
                onPress={() => {
                  setFiltroPerfilSeleccionado(null);
                  setMostrarModalPerfil(false);
                  // Para comercios, limpiar las reservas y mostrar mensaje de selección
                  if (tipoUsuario === "comercio") {
                    setReservas([]);
                    setIsLoadingReservas(false);
                    setError(null);
                  }
                }}
              >
                <Text
                  style={[
                    styles.profileOptionText,
                    !filtroPerfilSeleccionado &&
                    styles.profileOptionTextSelected,
                  ]}
                >
                  Todos los perfiles
                </Text>
                {!filtroPerfilSeleccionado && (
                  <FontAwesome name="check" size={16} color="#fa6205" />
                )}
              </TouchableOpacity>

              {/* Opciones de perfiles */}
              {perfilesDisponibles.map((perfil, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.profileOption,
                    filtroPerfilSeleccionado === perfil &&
                    styles.profileOptionSelected,
                  ]}
                  onPress={() => {
                    setFiltroPerfilSeleccionado(perfil);
                    setMostrarModalPerfil(false);
                    // Para comercios, buscar el ID del perfil y cargar sus reservas
                    if (tipoUsuario === "comercio") {
                      const perfilCompleto = perfilesCompletos.find(
                        (p) => p.nombre === perfil
                      );
                      if (perfilCompleto && perfilCompleto.id) {
                        console.log(
                          `[DEBUG] Perfil seleccionado para comercio: ${perfil} (ID: ${perfilCompleto.id})`
                        );
                        // Mostrar indicador de carga antes de llamar a la función
                        setIsLoadingReservas(true);
                        setError(null);
                        fetchReservasPorPerfil(perfilCompleto.id);
                      } else {
                        console.warn(
                          `[DEBUG] No se encontró ID para el perfil: ${perfil}`
                        );
                        setReservas([]);
                        setError("No se pudo encontrar el perfil seleccionado");
                      }
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.profileOptionText,
                      filtroPerfilSeleccionado === perfil &&
                      styles.profileOptionTextSelected,
                    ]}
                  >
                    {perfil}
                  </Text>
                  {filtroPerfilSeleccionado === perfil && (
                    <FontAwesome name="check" size={16} color="#fa6205" />
                  )}
                </TouchableOpacity>
              ))}

              {perfilesDisponibles.length === 0 && (
                <View style={styles.emptyProfilesContainer}>
                  <Text style={styles.emptyProfilesText}>
                    No hay perfiles disponibles
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* DateTimePickers para filtros de fecha */}
      {/* NUEVO BLOQUE: DateTimePickers multiplataforma */}
      {Platform.OS === "ios" && (
        <>
          <Modal
            visible={showDatePickerInicio}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDatePickerInicio(false)}
          >
            <SafeAreaView
              style={{
                flex: 1,
                justifyContent: "flex-end",
                backgroundColor: "rgba(0,0,0,0.4)",
              }}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  padding: 16,
                }}
              >
                {/* Mostrar la fecha seleccionada arriba del picker */}
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 18,
                    color: "#222",
                    marginBottom: 8,
                  }}
                >
                  {dateInicio ? dateInicio.toLocaleDateString("es-ES") : ""}
                </Text>
                <DateTimePicker
                  value={dateInicio || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (event.type === "set" && selectedDate) {
                      const formattedDate = selectedDate
                        .toISOString()
                        .split("T")[0];
                      setFiltroFechaInicio(formattedDate);
                      setDateInicio(selectedDate);
                    }
                    setShowDatePickerInicio(false);
                  }}
                  style={{ width: "100%" }}
                  textColor="#222"
                />
                <TouchableOpacity
                  style={{ marginTop: 10, alignItems: "center" }}
                  onPress={() => setShowDatePickerInicio(false)}
                >
                  <Text
                    style={{
                      color: "#fa6205",
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    Aceptar
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>
          <Modal
            visible={showDatePickerFin}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDatePickerFin(false)}
          >
            <SafeAreaView
              style={{
                flex: 1,
                justifyContent: "flex-end",
                backgroundColor: "rgba(0,0,0,0.4)",
              }}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  padding: 16,
                }}
              >
                {/* Mostrar la fecha seleccionada arriba del picker */}
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 18,
                    color: "#222",
                    marginBottom: 8,
                  }}
                >
                  {dateFin ? dateFin.toLocaleDateString("es-ES") : ""}
                </Text>
                <DateTimePicker
                  value={dateFin || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (event.type === "set" && selectedDate) {
                      const formattedDate = selectedDate
                        .toISOString()
                        .split("T")[0];
                      setFiltroFechaFin(formattedDate);
                      setDateFin(selectedDate);
                    }
                    setShowDatePickerFin(false);
                  }}
                  style={{ width: "100%" }}
                  textColor="#222"
                />
                <TouchableOpacity
                  style={{ marginTop: 10, alignItems: "center" }}
                  onPress={() => setShowDatePickerFin(false)}
                >
                  <Text
                    style={{
                      color: "#fa6205",
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    Aceptar
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>
        </>
      )}
      {Platform.OS === "android" && showDatePickerInicio && (
        <DateTimePicker
          value={dateInicio}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePickerInicio(false);
            if (selectedDate) {
              const formattedDate = selectedDate.toISOString().split("T")[0];
              setFiltroFechaInicio(formattedDate);
              setDateInicio(selectedDate);
            }
          }}
        />
      )}
      {Platform.OS === "android" && showDatePickerFin && (
        <DateTimePicker
          value={dateFin}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePickerFin(false);
            if (selectedDate) {
              const formattedDate = selectedDate.toISOString().split("T")[0];
              setFiltroFechaFin(formattedDate);
              setDateFin(selectedDate);
            }
          }}
        />
      )}
      {/* FIN NUEVO BLOQUE */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "activas" ? styles.activeTab : null,
          ]}
          onPress={() => setActiveTab("activas")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "activas" ? styles.activeTabText : null,
            ]}
          >
            Activas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "historial" ? styles.activeTab : null,
          ]}
          onPress={() => setActiveTab("historial")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "historial" ? styles.activeTabText : null,
            ]}
          >
            Historial
          </Text>
        </TouchableOpacity>
        {(tipoUsuario === "comercio" || tipoUsuario === "usuario") && (
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "reservas" ? styles.activeTab : null,
            ]}
            onPress={() => setActiveTab("reservas")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "reservas" ? styles.activeTabText : null,
              ]}
            >
              Reservas
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Filtros para la pestaña de reservas - Solo visible para comercios */}
      {activeTab === "reservas" && tipoUsuario === "comercio" && (
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={styles.filterToggleButton}
            onPress={() => setMostrarFiltros(!mostrarFiltros)}
          >
            <FontAwesome
              name={mostrarFiltros ? "filter" : "filter"}
              size={16}
              color="#fa6205"
            />
            <Text style={styles.filterToggleText}>
              {mostrarFiltros ? "Ocultar Filtros" : "Mostrar Filtros"}
            </Text>
            {(filtroPerfilSeleccionado ||
              filtroFechaInicio ||
              filtroFechaFin) && <View style={styles.activeFilterIndicator} />}
          </TouchableOpacity>

          {mostrarFiltros && (
            <View style={styles.filtersContent}>
              {/* Filtro por perfil */}
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Perfil:</Text>
                <TouchableOpacity
                  style={styles.filterPicker}
                  onPress={() => setMostrarModalPerfil(true)}
                >
                  <Text style={styles.filterPickerText}>
                    {filtroPerfilSeleccionado || "Todos los perfiles"}
                  </Text>
                  <FontAwesome name="chevron-down" size={12} color="#666" />
                </TouchableOpacity>
              </View>
              {/* Filtro por fechas */}
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Desde:</Text>
                <TouchableOpacity
                  style={styles.filterDatePicker}
                  onPress={() => setShowDatePickerInicio(true)}
                >
                  <Text style={styles.filterDateText}>
                    {filtroFechaInicio || "Seleccionar fecha"}
                  </Text>
                  <FontAwesome name="calendar" size={12} color="#666" />
                </TouchableOpacity>
                {filtroFechaInicio && (
                  <TouchableOpacity
                    style={styles.clearDateButton}
                    onPress={() => setFiltroFechaInicio(null)}
                  >
                    <FontAwesome name="times" size={14} color="#ff4757" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Hasta:</Text>
                <TouchableOpacity
                  style={styles.filterDatePicker}
                  onPress={() => setShowDatePickerFin(true)}
                >
                  <Text style={styles.filterDateText}>
                    {filtroFechaFin || "Seleccionar fecha"}
                  </Text>
                  <FontAwesome name="calendar" size={12} color="#666" />
                </TouchableOpacity>
                {filtroFechaFin && (
                  <TouchableOpacity
                    style={styles.clearDateButton}
                    onPress={() => setFiltroFechaFin(null)}
                  >
                    <FontAwesome name="times" size={14} color="#ff4757" />
                  </TouchableOpacity>
                )}
              </View>
              {/* Botón para limpiar todos los filtros */}
              {(filtroPerfilSeleccionado ||
                filtroFechaInicio ||
                filtroFechaFin) && (
                  <TouchableOpacity
                    style={styles.clearFiltersButton}
                    onPress={() => {
                      setFiltroPerfilSeleccionado(null);
                      setFiltroFechaInicio(null);
                      setFiltroFechaFin(null);
                    }}
                  >
                    <FontAwesome name="times" size={14} color="#1C1C1E" />
                    <Text style={styles.clearFiltersText}>Limpiar Filtros</Text>
                  </TouchableOpacity>
                )}
            </View>
          )}
        </View>
      )}
      {(isLoading || isLoadingReservas) && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa6205" />
          <Text style={styles.loadingText}>
            {activeTab === "reservas"
              ? "Cargando reservas..."
              : isUserRider
                ? "Cargando carreras..."
                : "Cargando historial..."}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error al cargar datos: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPedidos}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={
            activeTab === "reservas"
              ? filteredReservas
              : activeTab === "historial" && tipoUsuario === "comercio"
                ? [
                  ...filteredPedidos,
                  ...filtrarReservas(reservas, "historial"),
                ].sort(
                  (a, b) =>
                    new Date(b.created_at || b.fecha) -
                    new Date(a.created_at || a.fecha)
                )
                : filteredPedidos
          }
          renderItem={({ item }) => {
            // Determinar si es una reserva basándose en la estructura del objeto
            const isReserva =
              item.user_perfil && item.fecha && item.hora_inicio;

            if (activeTab === "reservas" || isReserva) {
              return renderReservaItem({ item });
            } else {
              return renderTripItem({ item });
            }
          }}
          keyExtractor={(item) => {
            const isReserva =
              item.user_perfil && item.fecha && item.hora_inicio;

            if (activeTab === "reservas" || isReserva) {
              return `reserva-${item.id}`;
            } else {
              return `${item.id}-${item.es_carrera ? "carrera" : "pedido"}`;
            }
          }}
          contentContainerStyle={styles.flatListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#fa6205"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === "reservas"
                  ? tipoUsuario === "comercio" && !filtroPerfilSeleccionado
                    ? "Selecciona un perfil para ver las reservas"
                    : "No tienes reservas"
                  : `No tienes ${activeTab === "activas"
                    ? "pedidos activos"
                    : "pedidos en el historial"
                  }`}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={
                  activeTab === "reservas" ? fetchReservas : fetchPedidos
                }
              >
                <Text style={styles.retryButtonText}>
                  {activeTab === "reservas" ? "Cargar reservas" : "Recargar"}
                </Text>
              </TouchableOpacity>
            </View>
          }


        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    paddingTop: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calificacionModal: {
    width: "100%",
    backgroundColor: "#ECECEC",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: "90%",
  },
  // Agregar al objeto de estilos (dentro del objeto styles)
  ratingSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  ratingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  ratingTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    color: "#333",
  },
  ratingCommentContainer: {
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  ratingCommentLabel: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
    color: "#666",
    marginBottom: 3,
  },
  ratingComment: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#333",
    fontStyle: "italic",
  },
  noRatingText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 5,
  },
  // Estilos para el botón de calificación
  ratingButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  ratingButtonText: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
  },
  // Estilos para el botón de chat
  chatButton: {
    backgroundColor: "#fa6205", // Color verde WhatsApp
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  chatButtonText: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    marginLeft: 8,
  },
  // Estilos para el botón de evidencia
  evidenceButton: {
    backgroundColor: "#fa6205",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  evidenceButtonText: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    marginLeft: 8,
  },
  // Estilos para el modal de evidencia
  evidenceModalContainer: {
    width: "95%",
    maxHeight: "85%",
    backgroundColor: "#ECECEC",
    borderRadius: 15,
    padding: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  evidenceModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#DDD",
  },
  evidenceModalTitle: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
  },
  closeButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },
  evidenceContent: {
    padding: 20,
    maxHeight: "80%",
  },
  evidenceImageContainer: {
    alignItems: "center",
  },
  evidenceLabel: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    marginBottom: 15,
    textAlign: "center",
  },
  evidenceImage: {
    width: "100%",
    maxWidth: 320,
    height: 420,
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: "#F0F0F0",
  },
  evidenceInfo: {
    color: "#ccc",
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  noEvidenceContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noEvidenceText: {
    color: "#ccc",
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    marginTop: 15,
    textAlign: "center",
  },
  // Modal de calificación

  modalHeader: {
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    alignContent: "center",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#DDD",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  calificacionSubtitle: {
    fontSize: 16,
    color: "#1C1C1E",
    fontFamily: "Montserrat_400Regular",
    marginBottom: 15,
    textAlign: "center",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 20,
  },
  starButton: {
    padding: 5,
  },
  comentarioLabel: {
    fontSize: 14,
    color: "#1C1C1E",
    fontFamily: "Montserrat_400Regular",
    alignSelf: "flex-start",
    marginTop: 10,
    marginBottom: 5,
  },
  comentarioInput: {
    width: "100%",
    backgroundColor: "#D8D8D8",
    color: "#1C1C1E",
    borderRadius: 8,
    padding: 10,
    fontFamily: "Montserrat_400Regular",
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  enviarButton: {
    backgroundColor: "#fa6205",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  enviarButtonDisabled: {
    backgroundColor: "#666",
  },
  enviarButtonText: {
    color: "#000",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Montserrat_700Bold",
    color: "#fa6205",
    textAlign: "center",
    marginBottom: 20,
  },
  flatListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Añade estos estilos al objeto styles
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: "#fa6205",
  },
  tabText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    color: "#1C1C1E",
  },
  activeTabText: {
    color: "#F2F2F7",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  // Add to existing styles object
  buttonContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: "#fa6205",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#000",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
  },
  // Add to the existing styles object

  productItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  productQuantity: {
    backgroundColor: "#fa6205",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  productQuantityText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
    color: "#333",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    color: "#333",
  },
  productVariant: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: "#666",
  },
  productPrice: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    color: "#333",
    marginLeft: 10,
  },
  price: {
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    color: "#000",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginRight: 5,
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
  },
  statusPago: {
    backgroundColor: "#fa6205",
    color: "#333",
  },
  statusPendiente: {
    backgroundColor: "#FFE5C4",
    color: "#333",
  },
  statusActivo: {
    backgroundColor: "#fa6205",
    color: "#1C1C1E",
  },
  statusCompletado: {
    backgroundColor: "#007AFF",
    color: "#1C1C1E",
  },
  statusOtro: {
    backgroundColor: "#999",
    color: "#1C1C1E",
  },
  tripNumber: {
    fontSize: 12,
    color: "#999",
    fontFamily: "Montserrat_300Light",
  },
  cardBody: {
    marginTop: 5,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    color: "#333",
    flex: 1,
    textAlign: "right",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  locationDetails: {
    marginLeft: 10,
    flex: 1,
  },
  locationLabel: {
    fontSize: 13,
    color: "#666",
    fontFamily: "Montserrat_300Light",
  },
  // Añadir a tu objeto styles:

  loadingButtonContainer: {
    backgroundColor: "#E5E5E5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  loadingButtonText: {
    color: "#555",
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    marginLeft: 8,
  },
  locationText: {
    fontSize: 15,
    color: "#000",
    fontFamily: "Montserrat_700Bold",
  },
  footerRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",          // ← importante
    justifyContent: "space-between", // ← distribuye elementos
    alignItems: "center",          // ← alinea verticalmente
  },
  dateTime: {
    fontSize: 12,
    fontFamily: "Montserrat_300Light",
    color: "#777",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#1C1C1E",
    marginTop: 10,
    fontFamily: "Montserrat_400Regular",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    color: "#FF5252",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Montserrat_400Regular",
  },
  retryButton: {
    backgroundColor: "#fa6205",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: "#000",
    fontFamily: "Montserrat_700Bold",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
  },
  emptyText: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
  },
  // Estilos para depuración
  debugContainer: {
    padding: 10,
    backgroundColor: "#333",
    margin: 10,
    borderRadius: 5,
  },
  debugText: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
  },
  productItemContainer: {
    marginBottom: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#fa6205",
  },

  adicionalesContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#fafafa",
    borderRadius: 6,
    padding: 8,
  },

  adicionalesTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
    color: "#555",
    marginBottom: 6,
  },

  adicionalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    paddingHorizontal: 4,
  },

  adicionalText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    color: "#555",
    flex: 1,
    marginRight: 8,
  },

  adicionalQuantity: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 11,
    color: "#333",
    minWidth: 25,
    textAlign: "center",
    backgroundColor: "#e8e8e8",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },

  adicionalPrice: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 11,
    color: "#555",
    minWidth: 50,
    textAlign: "right",
  },

  adicionalesTotal: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    alignItems: "flex-end",
  },

  adicionalesTotalText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 11,
    color: "#666",
    backgroundColor: "#fff5ee",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productDetailsContainer: {
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 10,
  },
  // Nueva sección de estilos para reservas
  reservaCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reservaCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  reservaClienteNombre: {
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    color: "#333",
  },
  reservaInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  reservaInfoLabel: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
  },
  reservaInfoValue: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    color: "#333",
    flex: 1,
    textAlign: "right",
  },
  reservaLocationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  reservaLocationDetails: {
    marginLeft: 10,
    flex: 1,
  },
  reservaLocationLabel: {
    fontSize: 13,
    color: "#666",
    fontFamily: "Montserrat_300Light",
  },
  reservaLocationText: {
    fontSize: 15,
    color: "#000",
    fontFamily: "Montserrat_700Bold",
  },
  // Estilos para adicionales en reservas
  additionalsContainer: {
    marginLeft: 15,
    marginTop: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#e0e0e0",
  },
  additionalsTitle: {
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
    color: "#666",
    marginBottom: 5,
  },
  additionalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#f8f8f8",
    borderRadius: 6,
    marginBottom: 4,
  },
  additionalName: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
  },
  additionalDescription: {
    fontSize: 11,
    fontFamily: "Montserrat_300Light",
    color: "#777",
    fontStyle: "italic",
  },
  additionalTime: {
    fontSize: 11,
    fontFamily: "Montserrat_300Light",
    color: "#666",
  },
  additionalPrice: {
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
    color: "#fa6205",
    marginLeft: "auto",
  },
  productTime: {
    fontSize: 11,
    fontFamily: "Montserrat_300Light",
    color: "#666",
  },

  // Estilos para filtros de reservas
  filtersContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  filterToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
  },
  filterToggleText: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    color: "#333",
    marginLeft: 8,
    flex: 1,
  },
  activeFilterIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fa6205",
  },
  filtersContent: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    color: "#333",
    width: 60,
  },
  filterPicker: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 12,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterPickerText: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#333",
    flex: 1,
  },
  filterDatePicker: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 12,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterDateText: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#333",
    flex: 1,
  },
  clearDateButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 4,
    backgroundColor: "#ffe6e6",
  },
  clearFiltersButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff6b6b",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  clearFiltersText: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
    marginLeft: 6,
  },
  // Estilos para el modal de selección de perfil
  profileSelectorModal: {
    width: "90%",
    maxHeight: "70%",
    backgroundColor: "#ECECEC",
    borderRadius: 15,
    padding: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  profileList: {
    maxHeight: 400,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#D8D8D8",
    backgroundColor: "transparent",
  },
  profileOptionSelected: {
    backgroundColor: "#404040",
    borderRadius: 8,
    marginVertical: 2,
  },
  profileOptionText: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: "#1C1C1E",
    flex: 1,
  },
  profileOptionTextSelected: {
    fontFamily: "Montserrat_700Bold",
    color: "#fa6205",
  },
  emptyProfilesContainer: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyProfilesText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#999",
    textAlign: "center",
  },
  cancelarTexto: {
    fontSize: 12,
    color: "#e74c3c", // rojo discreto
    fontFamily: "Montserrat_500Medium",
    borderWidth: 1,
    borderColor: "#e74c3c",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  mensajePendiente: {
    fontSize: 8,
    fontStyle: 'italic',
    marginTop: 10,
    fontFamily: 'Montserrat_400Regular',
  },
  verDetallesTexto: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1C1E', // azul suave
    fontFamily: 'Montserrat_500Medium',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  // Estilos para el botón de chat con rider
  chatRiderButton: {
    backgroundColor: "#fa6205",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 5,
  },
  chatRiderButtonText: {
    color: "#1C1C1E",
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
  },
});
