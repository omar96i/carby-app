import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
  ScrollView,
  Modal,
  Share,
  Linking,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../constants/url";
import nombreRol from "../utils/nombreRol";
import RoleSwitcher from "../components/RoleSwitcher";
import AlertaModal from "../components/ErrorModal";
import ScreenHeader from "../components/ScreenHeader";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_300Light,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import IconMCC from "react-native-vector-icons/EvilIcons";
import Icon3 from "react-native-vector-icons/Feather";
import Icon4 from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";

const MOSTRAR_PROGRESO = false;

export default function Perfil() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Cargar fuentes
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_300Light,
  });

  // Estados
  const [userId, setUserId] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [codigoReferido, setCodigoReferido] = useState("Cargando...");
  const [premiosModalVisible, setPremiosModalVisible] = useState(false);
  const [premiosReferidos, setPremiosReferidos] = useState([]);
  const [loadingPremios, setLoadingPremios] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [preferenciaModalVisible, setPreferenciaModalVisible] = useState(false);
  const [preferenciaRol, setPreferenciaRol] = useState(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const alertRef = useRef({ title: "", message: "", type: "info" });
  const showAlert = (title, message, type = "error", onConfirm = null) => {
    alertRef.current = { title, message, type, onConfirm };
    setAlertVisible(true);
  };

  // Helper function para URL de imágenes
  const getImageUrl = useCallback((photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith("http")) return photoPath;
    return `${BASE_URL.toString().replace("/api", "")}/storage/${photoPath}`;
  }, []);
  // Cargar userId al iniciar
  useEffect(() => {
    const fetchStoredUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("userId");
        if (storedUserId) {
          setUserId(JSON.parse(storedUserId));
        }
      } catch (error) {
        console.error("Error obteniendo ID del usuario:", error);
      }
    };

    const loadCheckboxStates = async () => {
      try {
        const termsState = await AsyncStorage.getItem("termsChecked");
        const privacyState = await AsyncStorage.getItem("privacyChecked");

        if (termsState !== null) {
          setTermsChecked(JSON.parse(termsState));
        }
        if (privacyState !== null) {
          setPrivacyChecked(JSON.parse(privacyState));
        }
      } catch (error) {
        console.error("Error cargando estados de checkboxes:", error);
      }
    };

    fetchStoredUserId();
    loadCheckboxStates();
  }, []);

  // Refrescar datos cuando la pantalla obtiene foco
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchUserInfo();
      }
      return () => {};
    }, [userId])
  );

  // Function para obtener información del usuario
  const fetchUserInfo = async () => {
    if (!userId) return;

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No se encontró el token");
      }

      setImageError(false);

      const response = await fetch(`${BASE_URL}usuario/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      setUserInfo(data);

      // Guardar userInfo en AsyncStorage para uso en otras partes de la app
      await AsyncStorage.setItem("userFullInfo", JSON.stringify(data.data));

      // Extraer el código de referido
      if (data?.data?.codigo_referido) {
        setCodigoReferido(data.data.codigo_referido);
        // Guardar código de referido para acceso rápido
        await AsyncStorage.setItem("codigoReferido", data.data.codigo_referido);
      } else {
        setCodigoReferido("No disponible");
      }

      // Buscar la imagen de perfil en todos los campos posibles
      const profileImage =
        data?.data?.fotografia_perfil ||
        data?.data?.foto_document_file ||
        data?.data?.foto_documento_file;

      if (profileImage) {
        const url = getImageUrl(profileImage);
        setImageUrl(url);
        // Guardar URL de la imagen para uso en otras pantallas
        await AsyncStorage.setItem("userProfileImage", url);
      } else {
        console.log("No se encontró imagen de perfil");
        setImageUrl(null);
      }
    } catch (error) {
      console.error("Error obteniendo información del usuario:", error);
      setCodigoReferido("Error");
    }
  };

  // Cargar datos cuando cambia userId o refreshTrigger
  useEffect(() => {
    fetchUserInfo();
  }, [userId, refreshTrigger]);

  useEffect(() => {
    AsyncStorage.getItem("preferencia_rol").then((r) => setPreferenciaRol(r));
  }, []);

  // Función para seleccionar imagen
  const pickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        showAlert("Permiso denegado", "Se necesita acceso a la galería para cambiar tu foto de perfil");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const imageUri = result.assets ? result.assets[0].uri : result.uri;
        setImageUrl(imageUri);
        setImageError(false);
        uploadImage(imageUri);
      }
    } catch (error) {
      console.error("Error seleccionando imagen:", error);
      showAlert("Error", "No se pudo seleccionar la imagen. Inténtalo de nuevo.");
    }
  };

  // Función para subir imagen
  const uploadImage = async (uri) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        showAlert("Error", "No hay sesión activa");
        return;
      }

      const tipoUsuario =
        userInfo?.data?.tipo_usuario ||
        (await AsyncStorage.getItem("tipoUsuario"));

      if (!tipoUsuario) {
        showAlert("Error", "No se pudo determinar el tipo de usuario");
        return;
      }

      // Preparar archivo
      const filename = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      const formData = new FormData();
      formData.append("foto_documento_file", {
        uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
        name: filename || "photo.jpg",
        type: type,
      });

      formData.append("tipo_usuario", tipoUsuario);

      const response = await fetch(`${BASE_URL}usuario/actualizar/${userId}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const responseText = await response.text();
      try {
        const data = JSON.parse(responseText);
        if (response.ok) {
          showAlert("Éxito", "Foto de perfil actualizada correctamente");

          // Actualizar URL de imagen en AsyncStorage
          if (data?.data) {
            const profileImage =
              data.data.fotografia_perfil ||
              data.data.foto_document_file ||
              data.data.foto_documento_file;

            if (profileImage) {
              const url = getImageUrl(profileImage);
              await AsyncStorage.setItem("userProfileImage", url);
            }
          }

          setRefreshTrigger((prev) => prev + 1);
        } else {
          showAlert("Error", data.message || "No se pudo actualizar la foto de perfil");
        }
      } catch (e) {
        if (response.ok) {
          showAlert("Éxito", "Foto de perfil actualizada");
          setRefreshTrigger((prev) => prev + 1);
        } else {
          showAlert("Error", "No se pudo actualizar la foto de perfil");
        }
      }
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      showAlert("Error", "No se pudo subir la imagen. Verifica tu conexión a internet.");
    }
  };

  // Función para cerrar sesión
  const setPreferencia = async (rol) => {
    await AsyncStorage.setItem("preferencia_rol", rol);
    setPreferenciaRol(rol);
    setPreferenciaModalVisible(false);
  };

  const cerrarSesion = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const preferenciaGuardada = await AsyncStorage.getItem("preferencia_rol");

      if (!token) {
        await AsyncStorage.clear();
        if (preferenciaGuardada) {
          await AsyncStorage.setItem("preferencia_rol", preferenciaGuardada);
        }
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      // Intenta cerrar sesión en el servidor
      try {
        await fetch(`${BASE_URL}auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (apiError) {
        console.log("Error en API de logout:", apiError);
      }

      // Siempre limpia los datos locales
      await AsyncStorage.clear();
      if (preferenciaGuardada) {
        await AsyncStorage.setItem("preferencia_rol", preferenciaGuardada);
      }
      showAlert("Éxito", "Has cerrado sesión correctamente", "success");
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (error) {
      console.error("Error en cerrar sesión:", error);

      // Intenta cerrar sesión localmente
      try {
        const preferenciaGuardada = await AsyncStorage.getItem("preferencia_rol");
        await AsyncStorage.clear();
        if (preferenciaGuardada) {
          await AsyncStorage.setItem("preferencia_rol", preferenciaGuardada);
        }
        showAlert("Éxito", "Se cerró sesión localmente", "success");
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      } catch (storageError) {
        showAlert("Error", "No se pudo cerrar sesión. Intenta de nuevo.");
      }
    }
  };

  // Función para compartir código de referido
  const compartirCodigoReferido = async () => {
    try {
      if (
        codigoReferido &&
        codigoReferido !== "No disponible" &&
        codigoReferido !== "Cargando..."
      ) {
        await Share.share({
          message: `¡Únete a YaRiders! Usa mi código de referido: ${codigoReferido}`,
        });
      } else {
        showAlert("Error", "No hay un código de referido disponible para compartir");
      }
    } catch (error) {
      console.error("Error compartiendo código:", error);
    }
  };

  // Función para desactivar cuenta
  const handleDeactivateAccount = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        showAlert("Error", "No hay sesión activa");
        return;
      }

      // Aquí implementarías la llamada a la API para desactivar la cuenta
      // Por ejemplo:
      // const response = await fetch(`${BASE_URL}usuario/desactivar/${userId}`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "Authorization": `Bearer ${token}`
      //   },
      // });

      // Para esta versión, solo mostramos un mensaje
      showAlert("Cuenta desactivada", "Su cuenta ha sido desactivada. Se eliminará en 7 días.", "success", () => navigation.navigate("Login"));

      await AsyncStorage.clear();
    } catch (error) {
      console.error("Error desactivando cuenta:", error);
      showAlert("Error", "No se pudo desactivar la cuenta. Inténtalo de nuevo.");
    }
  };

  // Función para obtener premios por referidos
  const fetchPremiosReferidos = async () => {
    try {
      setLoadingPremios(true);
      const token = await AsyncStorage.getItem("userToken");
      const tipoUsuario =
        userInfo?.data?.tipo_usuario ||
        (await AsyncStorage.getItem("tipoUsuario"));

      if (!token || !tipoUsuario) {
        throw new Error("No se pudo obtener token o tipo de usuario");
      }

      const response = await fetch(
        `${BASE_URL}referido-premio/role/${tipoUsuario}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      setPremiosReferidos(data);
    } catch (error) {
      console.error("Error obteniendo premios por referidos:", error);
      showAlert("Error", "No se pudieron cargar los premios por referidos");
    } finally {
      setLoadingPremios(false);
    }
  };

  const toggleTermsCheck = async () => {
    try {
      const newState = !termsChecked;
      setTermsChecked(newState);
      await AsyncStorage.setItem("termsChecked", JSON.stringify(newState));
    } catch (error) {
      console.error("Error guardando estado de términos:", error);
    }
  };

  const togglePrivacyCheck = async () => {
    try {
      const newState = !privacyChecked;
      setPrivacyChecked(newState);
      await AsyncStorage.setItem("privacyChecked", JSON.stringify(newState));
    } catch (error) {
      console.error("Error guardando estado de privacidad:", error);
    }
  };

  // Mostrar pantalla de carga mientras se cargan las fuentes
  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <Text style={{ textAlign: "center", marginTop: 20, color: "#1C1C1E" }}>
          Cargando...
        </Text>
      </SafeAreaView>
    );
  }

  const nombrePerfil = userInfo?.data?.nombre_completo || "Usuario";
  const inicialesPerfil = nombrePerfil.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const filaMenu = (icono, texto, onPress, opciones = {}) => (
    <TouchableOpacity style={pf.fila} onPress={onPress} activeOpacity={0.7}>
      <View style={[pf.filaIcono, opciones.peligro && pf.filaIconoPeligro]}>
        {opciones.material ? (
          <MaterialIcons name={icono} size={18} color="#1C1C1E" />
        ) : (
          <Icon3 name={icono} size={18} color={opciones.peligro ? "#EF4444" : "#1C1C1E"} />
        )}
      </View>
      <View style={pf.filaTexto}>
        <Text style={[pf.filaTitulo, opciones.peligro && pf.filaTituloPeligro]}>{texto}</Text>
        {!!opciones.sub && <Text style={pf.filaSub}>{opciones.sub}</Text>}
      </View>
      <Icon3 name="chevron-right" size={18} color="#A1A1AA" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={pf.screen} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />

      <View style={[pf.header, { paddingTop: insets.top + 10 }]}>
        <Text style={pf.headerTitle}>Perfil</Text>
        <View style={pf.identity}>
          <TouchableOpacity onPress={pickImage} style={pf.avatarWrap} activeOpacity={0.8}>
            {imageUrl && !imageError ? (
              <Image source={{ uri: imageUrl }} style={pf.avatar} onError={() => setImageError(true)} />
            ) : (
              <View style={[pf.avatar, pf.avatarVacio]}>
                <Text style={pf.avatarText}>{inicialesPerfil || "?"}</Text>
              </View>
            )}
            <View style={pf.avatarEdit}>
              <Icon4 name="pencil" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
          <View style={pf.identityText}>
            <Text style={pf.name} numberOfLines={1}>{nombrePerfil}</Text>
            <View style={pf.cityRow}>
              <Icon3 name="map-pin" size={12} color="#A1A1AA" />
              <Text style={pf.city} numberOfLines={1}>{userInfo?.data?.ciudad || "Ciudad"}</Text>
            </View>
            {!!userInfo?.data?.tipo_usuario && (
              <View style={pf.rolBadge}>
                <Text style={pf.rolBadgeText}>{nombreRol(userInfo.data.tipo_usuario)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={[pf.scroll, { paddingBottom: 104 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={pf.roleWrap}>
          <RoleSwitcher userData={userInfo?.data || {}} onSwitchSuccess={(role) => {
            const navMap = { usuario: "BottomTabNavigatorUsuario", comercio: "BottomTabNavigatorAliado", "rider.moto": "BottomTabNavigatorDelivery", "rider.taxi": "BottomTabNavigatorDelivery" };
            navigation.reset({ index: 0, routes: [{ name: navMap[role] || "BottomTabNavigatorDelivery" }] });
          }} />
        </View>

        <View style={pf.stats}>
          {MOSTRAR_PROGRESO && (
            <>
              <View style={pf.stat}>
                <Text style={pf.statNum}>0</Text>
                <Text style={pf.statLabel}>Progreso · Mandados</Text>
              </View>
              <View style={pf.statSep} />
            </>
          )}
          <TouchableOpacity
            style={pf.stat}
            onPress={() => {
              fetchPremiosReferidos();
              setPremiosModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={[pf.statNum, pf.statCodigo]} numberOfLines={1}>{codigoReferido}</Text>
            <Text style={pf.statLabel}>Tu código de referido</Text>
          </TouchableOpacity>
        </View>

        <Text style={pf.grupoTitulo}>Cuenta</Text>
        <View style={pf.grupo}>
          {filaMenu("user", "Datos Personales", () => navigation.navigate("StepDiecisiete"))}
          <View style={pf.sep} />
          {filaMenu("shield", "Configurar palabra de seguridad", () => navigation.navigate("ConfigurarPalabraSeguridad"))}
          <View style={pf.sep} />
          {filaMenu("shuffle", "Preferencia de ingreso", () => setPreferenciaModalVisible(true), { sub: "Para iniciar sesión con un rol debes tener acceso previamente" })}
          <View style={pf.sep} />
          {filaMenu("payments", "Métodos de pago", () => navigation.navigate("MetodosPago"), { material: true })}
        </View>

        <Text style={pf.grupoTitulo}>Ajustes & soporte</Text>
        <View style={pf.grupo}>
          {filaMenu("help-circle", "Contacta soporte", () => setSupportModalVisible(true))}
          <View style={pf.sep} />
          {filaMenu("user-x", "Desactivar cuenta", () => setModalVisible(true), { peligro: true })}
        </View>

        <TouchableOpacity style={pf.logout} onPress={cerrarSesion} activeOpacity={0.8}>
          <Icon3 name="log-out" size={18} color="#EF4444" />
          <Text style={pf.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <View style={pf.legal}>
          <TouchableOpacity onPress={() => Linking.openURL("https://carbycol.com/terminos-y-condiciones/")}>
            <Text style={pf.legalText}>Términos y Condiciones</Text>
          </TouchableOpacity>
          <Text style={pf.legalDot}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL("https://carbycol.com/politica-de-privacidad/")}>
            <Text style={pf.legalText}>Privacidad de Datos</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de desactivación de cuenta */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={pm.overlay}>
          <View style={pm.card}>
            <View style={[pm.icon, { backgroundColor: "#FEF2F2" }]}>
              <Icon3 name="user-x" size={24} color="#EF4444" />
            </View>
            <Text style={pm.title}>¿Desactivar su cuenta?</Text>
            <Text style={pm.body}>Su cuenta se desactivará y en el periodo de 7 días se eliminará todo registro de su cuenta.</Text>
            <View style={pm.actions}>
              <TouchableOpacity style={pm.btnGris} onPress={() => setModalVisible(false)} activeOpacity={0.8}>
                <Text style={pm.btnGrisText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={pm.btnRojo}
                onPress={() => {
                  setModalVisible(false);
                  handleDeactivateAccount();
                }}
                activeOpacity={0.85}
              >
                <Text style={pm.btnRojoText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de premios por referidos */}
      <Modal animationType="fade" transparent={true} visible={premiosModalVisible} onRequestClose={() => setPremiosModalVisible(false)}>
        <View style={pm.overlay}>
          <View style={[pm.card, { maxHeight: "80%" }]}>
            <View style={pm.icon}>
              <Icon3 name="gift" size={24} color="#fa6205" />
            </View>
            <Text style={pm.title}>Premios por Referidos</Text>
            <Text style={pm.body}>Comparte tu código de referido</Text>
            <Text style={pm.codigo}>{codigoReferido}</Text>
            <TouchableOpacity style={pm.btnMarca} onPress={compartirCodigoReferido} activeOpacity={0.85}>
              <Icon3 name="share-2" size={17} color="#FFF" />
              <Text style={pm.btnMarcaText}>Compartir código</Text>
            </TouchableOpacity>

            <Text style={pm.seccion}>Esta es tu recompensa</Text>
            {loadingPremios ? (
              <Text style={pm.vacio}>Cargando premios...</Text>
            ) : premiosReferidos.length > 0 ? (
              <ScrollView style={{ maxHeight: 260, width: "100%" }}>
                {premiosReferidos.map((premio, index) => (
                  <View key={index} style={pm.premio}>
                    <View style={{ flex: 1 }}>
                      <Text style={pm.premioNombre}>{premio.suscripcion?.nombre || "Suscripción"}</Text>
                      <Text style={pm.premioDesc}>
                        {premio.suscripcion?.tipo_usuario === "comercio"
                          ? "Para comercios"
                          : premio.suscripcion?.tipo_usuario === "rider.taxi"
                          ? "Para taxistas"
                          : premio.suscripcion?.tipo_usuario === "rider.moto"
                          ? "Para motociclistas"
                          : premio.suscripcion?.tipo_usuario}
                      </Text>
                    </View>
                    <View style={pm.premioMeta}>
                      <Text style={pm.premioNum}>{premio.cantidad}</Text>
                      <Text style={pm.premioMetaText}>referidos</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={pm.vacio}>No hay premios disponibles actualmente</Text>
            )}

            <TouchableOpacity style={[pm.btnGris, { flex: 0, width: "100%", marginTop: 14 }]} onPress={() => setPremiosModalVisible(false)} activeOpacity={0.8}>
              <Text style={pm.btnGrisText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={preferenciaModalVisible} onRequestClose={() => setPreferenciaModalVisible(false)}>
        <View style={ps.sheetBg}>
          <TouchableOpacity style={ps.backdrop} activeOpacity={1} onPress={() => setPreferenciaModalVisible(false)} />
          <View style={[ps.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={ps.grabber} />
            <Text style={ps.title}>Preferencia de ingreso</Text>
            <Text style={ps.sub}>Elige con qué rol iniciarás sesión la próxima vez</Text>
            <View style={ps.grid}>
              {["usuario", "comercio", "rider.moto", "rider.taxi"].map((r) => {
                const labels = { usuario: "Usuario", comercio: "Comercio", "rider.moto": "Delivery", "rider.taxi": "Particular" };
                const icons = { usuario: "person", comercio: "storefront", "rider.moto": "bicycle", "rider.taxi": "car" };
                const selected = preferenciaRol === r || (!preferenciaRol && r === "usuario");
                return (
                  <TouchableOpacity key={r} style={[ps.option, selected && ps.optionSelected]} onPress={() => setPreferencia(r)} activeOpacity={0.8}>
                    <View style={[ps.optionIcon, selected && ps.optionIconSelected]}>
                      <Ionicons name={icons[r]} size={20} color={selected ? "#FFF" : "#52525B"} />
                    </View>
                    <Text style={[ps.optionText, selected && ps.optionTextSelected]}>{labels[r]}</Text>
                    {selected && (
                      <View style={ps.optionCheck}>
                        <Ionicons name="checkmark-circle" size={20} color="#fa6205" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={ps.cancelBtn} onPress={() => setPreferenciaModalVisible(false)} activeOpacity={0.8}>
              <Text style={ps.cancelText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={supportModalVisible} onRequestClose={() => setSupportModalVisible(false)}>
        <View style={pm.overlay}>
          <View style={pm.card}>
            <View style={pm.icon}>
              <Icon3 name="headphones" size={24} color="#fa6205" />
            </View>
            <Text style={pm.title}>Contacto de Soporte</Text>
            <Text style={pm.body}>Para cualquier consulta o ayuda, contáctanos al siguiente libro de reclamaciones en</Text>
            <Text style={pm.codigo}>carbycol.com</Text>
            <View style={pm.actions}>
              <TouchableOpacity style={pm.btnGris} onPress={() => setSupportModalVisible(false)} activeOpacity={0.8}>
                <Text style={pm.btnGrisText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={pm.btnMarca} onPress={() => setSupportModalVisible(false)} activeOpacity={0.85}>
                <Text style={pm.btnMarcaText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AlertaModal
        visible={alertVisible}
        tipo={alertRef.current.type}
        mensaje={alertRef.current.message}
        onCerrar={() => {
          setAlertVisible(false);
          if (alertRef.current.onConfirm) alertRef.current.onConfirm();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F4F4F5"
  },
  container: { paddingVertical: 16, paddingHorizontal: 0 },
  // --- PROFILE ROW (compacta) ---
  profileRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14, backgroundColor: "#FFF", marginHorizontal: 16, marginTop: 16, borderRadius: 16 },
  avatarSmall: { width: 52, height: 52, borderRadius: 16, overflow: "hidden", backgroundColor: "#F4F4F5" },
  avatarSmallImg: { width: 52, height: 52, borderRadius: 16 },
  avatarSmallPlaceholder: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#fa6205", justifyContent: "center", alignItems: "center" },
  editBadge: { position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: "#1C1C1E", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#FFF" },
  profileInfo: { flex: 1 },
  sectionTitle3: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E", textAlign: "left", marginBottom: 2 },
  sectionTitle2: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: "#71717A", textAlign: "left", marginTop: 0 },
  // Estilos para los botones de acciones
  buttonsContainer: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 16, marginBottom: 8 },
  button1: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "47%",
    minHeight: 75,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  title1: {
    fontFamily: "Montserrat_700Bold",
    color: "#fa6205",
    fontSize: 14,
    textAlign: "center",
  },
  subtitle1: {
    color: "#999",
    fontFamily: "Montserrat_300Light",
    fontSize: 12,
    marginTop: 5,
  },
  // Estilos para la tarjeta de opciones
  // Menú moderno
  menuCard: { backgroundColor: "#FFF", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 16, marginBottom: 12 },
  menuSection: { fontSize: 11, fontFamily: "Montserrat_800ExtraBold", color: "#999", marginBottom: 4, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  menuText: {
    fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: "#1C1C1E",
  },
  // Legal & Logout
  legalSection: {
    paddingHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
    gap: 12,
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  legalText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#1C1C1E",
    textAlign: 'center',
    paddingVertical: 4,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#DDD",
    justifyContent: "center",
    alignItems: "center",
  },
  checkActive: {
    backgroundColor: "#fa6205",
    borderColor: "#fa6205",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 10,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    color: "#FF4757",
  },
  // Header
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fa6205",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === "android" ? 50 : 14,
  },
  headerBackBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    color: "#FFF",
  },
  // Estilo antiguo del botón Atrás (mantenido por si acaso)
  backButton: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 10,
    padding: 5,
  },
  // Estilos para los modales
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  modalText: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    marginBottom: 15,
    textAlign: "center",
    color: "#555",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  modalButton: {
    padding: 12,
    borderRadius: 10,
    width: "48%",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E9E9E9",
  },
  continueButton: {
    backgroundColor: "#DC2626",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
    fontFamily: "Montserrat_300Light",
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
  },
  // Estilos para los premios por referidos
  premiosScrollView: {
    maxHeight: 300,
    width: "100%",
    marginVertical: 10,
  },
  premioItem: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: "#fa6205",
  },
  premioNombre: {
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    color: "#333",
    marginBottom: 5,
  },
  premioDescripcion: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#777",
    marginBottom: 8,
  },
  premioCantidad: {
    flexDirection: "row",
    marginBottom: 5,
  },
  premioDetalle: {
    flexDirection: "row",
  },
  premioLabel: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
  },
  premioValue: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    color: "#333",
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
    marginVertical: 20,
    textAlign: "center",
  },
  noDataText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
    marginVertical: 20,
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: "#fa6205",
    padding: 12,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 15,
  },
  closeButtonText: {
    color: "#1C1C1E",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  // Botón para compartir código de referido
  shareButton: {
    backgroundColor: "#fa6205",
    padding: 10,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 10,
    width: "100%",
  },
  shareButtonText: {
    color: "#1C1C1E",
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    marginLeft: 10,
  },
  termsContainer: {
    marginTop: 20,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  termRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  linkContainer: {
    flex: 1,
  },
  linkText: {
    color: "#1C1C1E",
    textDecorationLine: "underline",
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },
  checkboxContainer: {
    marginLeft: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#fa6205",
    borderRadius: 4,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#fa6205",
  },
});

const ps2 = StyleSheet.create({
  sheetBg: { flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingTop: 8 },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontFamily: "Montserrat_700Bold", color: "#1C1C1E", marginBottom: 4 },
  sub: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: "#999", marginBottom: 16 },
  option: { flexDirection: "row", alignItems: "center", backgroundColor: "#F4F4F5", borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  optionSelected: { backgroundColor: "#FDEEE2", borderWidth: 1, borderColor: "#fa6205" },
  optionText: { flex: 1, fontSize: 15, fontFamily: "Montserrat_600SemiBold", color: "#71717A" },
  optionTextSelected: { color: "#fa6205", fontFamily: "Montserrat_700Bold" },
  cancelBtn: { backgroundColor: "#F4F4F5", paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 8 },
  cancelText: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#71717A" },
});

const pf = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F5" },
  header: { backgroundColor: "#1C1C1E", paddingHorizontal: 18, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTitle: { fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: "#FFF", textAlign: "center" },
  identity: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 16 },
  avatarWrap: { width: 68, height: 68 },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#2C2C2E" },
  avatarVacio: { backgroundColor: "#fa6205", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 24, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  avatarEdit: {
    position: "absolute", right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: "#fa6205",
    borderWidth: 2.5, borderColor: "#1C1C1E", alignItems: "center", justifyContent: "center",
  },
  identityText: { flex: 1 },
  name: { fontSize: 19, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  city: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: "#A1A1AA" },
  rolBadge: { alignSelf: "flex-start", backgroundColor: "rgba(250,98,5,0.2)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 8 },
  rolBadgeText: { fontSize: 11.5, fontFamily: "Montserrat_700Bold", color: "#fa6205", textTransform: "capitalize" },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  roleWrap: { marginHorizontal: -16 },
  stats: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 20, paddingVertical: 14, marginTop: 6 },
  stat: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  statNum: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E" },
  statCodigo: { color: "#fa6205", letterSpacing: 1 },
  statLabel: { fontSize: 11.5, fontFamily: "Montserrat_600SemiBold", color: "#71717A", marginTop: 2 },
  statSep: { width: 1, height: 32, backgroundColor: "#E4E4E7" },
  grupoTitulo: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: "#71717A", marginTop: 18, marginBottom: 8, marginLeft: 4 },
  grupo: { backgroundColor: "#FFF", borderRadius: 20, paddingHorizontal: 14 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: "#E4E4E7", marginLeft: 50 },
  fila: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  filaIcono: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F4F4F5", alignItems: "center", justifyContent: "center" },
  filaIconoPeligro: { backgroundColor: "#FEF2F2" },
  filaTexto: { flex: 1 },
  filaTitulo: { fontSize: 15, fontFamily: "Montserrat_600SemiBold", color: "#1C1C1E" },
  filaTituloPeligro: { color: "#EF4444" },
  filaSub: { fontSize: 12, lineHeight: 16, fontFamily: "Montserrat_400Regular", color: "#71717A", marginTop: 2 },

  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 54, borderRadius: 27, backgroundColor: "#FEF2F2", marginTop: 22 },
  logoutText: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#EF4444" },
  legal: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 },
  legalText: { fontSize: 12.5, fontFamily: "Montserrat_600SemiBold", color: "#71717A" },
  legalDot: { fontSize: 12.5, color: "#A1A1AA" },
});

const ps = StyleSheet.create({
  sheetBg: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  backdrop: { flex: 1 },
  sheet: { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10 },
  grabber: { width: 40, height: 5, borderRadius: 999, backgroundColor: "#E4E4E7", alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 19, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E" },
  sub: { fontSize: 13, lineHeight: 18, fontFamily: "Montserrat_400Regular", color: "#71717A", marginTop: 4, marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  option: { width: "48.5%", backgroundColor: "#F4F4F5", borderRadius: 20, paddingVertical: 14, paddingHorizontal: 14, gap: 10, position: "relative" },
  optionSelected: { backgroundColor: "#FFF0E5" },
  optionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  optionIconSelected: { backgroundColor: "#fa6205" },
  optionText: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#1C1C1E" },
  optionTextSelected: { color: "#fa6205", fontFamily: "Montserrat_800ExtraBold" },
  optionCheck: { position: "absolute", top: 12, right: 12 },
  cancelBtn: { height: 54, backgroundColor: "#F4F4F5", borderRadius: 999, alignItems: "center", justifyContent: "center", marginTop: 16 },
  cancelText: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#1C1C1E" },
});

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 20 },
  card: { width: "100%", backgroundColor: "#FFF", borderRadius: 28, padding: 24, alignItems: "center" },
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFF0E5", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E", textAlign: "center", marginBottom: 6 },
  body: { fontSize: 13.5, lineHeight: 20, fontFamily: "Montserrat_400Regular", color: "#71717A", textAlign: "center", marginBottom: 14 },
  codigo: { fontSize: 22, fontFamily: "Montserrat_800ExtraBold", color: "#fa6205", letterSpacing: 1.5, marginBottom: 16 },
  actions: { flexDirection: "row", gap: 10, width: "100%" },
  btnGris: { flex: 1, height: 50, borderRadius: 25, backgroundColor: "#F4F4F5", alignItems: "center", justifyContent: "center" },
  btnGrisText: { fontSize: 14.5, fontFamily: "Montserrat_700Bold", color: "#1C1C1E" },
  btnRojo: { flex: 1, height: 50, borderRadius: 25, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" },
  btnRojoText: { fontSize: 14.5, fontFamily: "Montserrat_700Bold", color: "#FFF" },
  btnMarca: { flex: 1, flexDirection: "row", gap: 8, minHeight: 50, width: "100%", borderRadius: 25, backgroundColor: "#fa6205", alignItems: "center", justifyContent: "center" },
  btnMarcaText: { fontSize: 14.5, fontFamily: "Montserrat_700Bold", color: "#FFF" },
  seccion: { alignSelf: "flex-start", fontSize: 13, fontFamily: "Montserrat_700Bold", color: "#71717A", marginTop: 20, marginBottom: 10 },
  vacio: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: "#71717A", marginVertical: 16, textAlign: "center" },
  premio: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#F4F4F5", borderRadius: 16, padding: 14, marginBottom: 8 },
  premioNombre: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: "#1C1C1E" },
  premioDesc: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: "#71717A", marginTop: 2 },
  premioMeta: { alignItems: "center" },
  premioNum: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: "#fa6205" },
  premioMetaText: { fontSize: 10.5, fontFamily: "Montserrat_600SemiBold", color: "#71717A" },
});
