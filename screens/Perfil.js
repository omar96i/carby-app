import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  SafeAreaView,
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
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../constants/url";
import RoleSwitcher from "../components/RoleSwitcher";
import AlertaModal from "../components/ErrorModal";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_300Light,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { FontAwesome } from "@expo/vector-icons";
import IconMCC from "react-native-vector-icons/EvilIcons";
import Icon3 from "react-native-vector-icons/Feather";
import Icon4 from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";

export default function Perfil() {
  const navigation = useNavigation();

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

      if (!token) {
        await AsyncStorage.clear();
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
      showAlert("Éxito", "Has cerrado sesión correctamente", "success");
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (error) {
      console.error("Error en cerrar sesión:", error);

      // Intenta cerrar sesión localmente
      try {
        await AsyncStorage.clear();
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

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>
      <ScrollView>
        <View style={styles.container}>
          {/* Modal de desactivación de cuenta */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>¿Desactivar su cuenta?</Text>
                <Text style={styles.modalText}>
                  Su cuenta se desactivará y en el periodo de 7 días se
                  eliminará todo registro de su cuenta.
                </Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.continueButton]}
                    onPress={() => {
                      setModalVisible(false);
                      handleDeactivateAccount();
                    }}
                  >
                    <Text style={styles.continueButtonText}>Continuar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Compact Profile Row */}
          <View style={styles.profileRow}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarSmall}>
              {imageUrl && !imageError ? (
                <Image source={{ uri: imageUrl }} style={styles.avatarSmallImg} />
              ) : (
                <View style={styles.avatarSmallPlaceholder}>
                  <Icon3 name="user" size={22} color="#FFF" />
                </View>
              )}
              <View style={styles.editBadge}>
                <Icon4 name="pencil" size={10} color="#FFF" />
              </View>
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={styles.sectionTitle3}>{userInfo?.data?.nombre_completo || "Usuario"}</Text>
              <Text style={styles.sectionTitle2}><IconMCC name="location" size={14} color="#71717A" /> {userInfo?.data?.ciudad || "Ciudad"}</Text>
            </View>
          </View>

          <RoleSwitcher userData={userInfo?.data || {}} onSwitchSuccess={(role) => {
            const navMap = { usuario: "BottomTabNavigatorUsuario", comercio: "BottomTabNavigatorAliado", "rider.moto": "BottomTabNavigatorDelivery", "rider.taxi": "BottomTabNavigatorDelivery" };
            navigation.reset({ index: 0, routes: [{ name: navMap[role] || "BottomTabNavigatorDelivery" }] });
          }} />

          {/* Botones de acciones */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.button1}>
              <Text style={styles.title1}>0 Progreso</Text>
              <Text style={styles.subtitle1}>Mandados</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button1}
              onPress={() => {
                fetchPremiosReferidos();
                setPremiosModalVisible(true);
              }}
            >
              <Text style={styles.title1}>{codigoReferido}</Text>
              <Text style={styles.subtitle1}>Tu code de referido</Text>
            </TouchableOpacity>
          </View>

          {/* Modal de premios por referidos */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={premiosModalVisible}
            onRequestClose={() => setPremiosModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Premios por Referidos</Text>
                <Text style={styles.modalText}>
                  Comparte tu código de referido:
                  <Text style={{ fontWeight: "bold", color: "#fa6205" }}>
                    {codigoReferido}
                  </Text>
                </Text>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={compartirCodigoReferido}
                >
                  <Icon3 name="share-2" size={18} color="#1C1C1E" />
                  <Text style={styles.shareButtonText}>Compartir código</Text>
                </TouchableOpacity>

                <Text style={[styles.modalTitle, { marginTop: 15 }]}>
                  Esta es tu recompensa
                </Text>

                {loadingPremios ? (
                  <Text style={styles.loadingText}>Cargando premios...</Text>
                ) : premiosReferidos.length > 0 ? (
                  <ScrollView style={styles.premiosScrollView}>
                    {premiosReferidos.map((premio, index) => (
                      <View key={index} style={styles.premioItem}>
                        <Text style={styles.premioNombre}>
                          {premio.suscripcion?.nombre || "Suscripción"}
                        </Text>
                        <Text style={styles.premioDescripcion}>
                          {premio.suscripcion?.tipo_usuario === "comercio"
                            ? "Para comercios"
                            : premio.suscripcion?.tipo_usuario === "rider.taxi"
                            ? "Para taxistas"
                            : premio.suscripcion?.tipo_usuario === "rider.moto"
                            ? "Para motociclistas"
                            : premio.suscripcion?.tipo_usuario}
                        </Text>
                        <View style={styles.premioCantidad}>
                          <Text style={styles.premioLabel}>
                            Referidos necesarios:
                          </Text>
                          <Text style={styles.premioValue}>
                            {premio.cantidad}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.noDataText}>
                    No hay premios disponibles actualmente
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setPremiosModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Modal Preferencia de Ingreso */}
          <Modal animationType="slide" transparent={true} visible={preferenciaModalVisible} onRequestClose={() => setPreferenciaModalVisible(false)}>
            <View style={ps2.sheetBg}>
              <View style={ps2.sheet}>
                <View style={ps2.grabber} />
                <Text style={ps2.title}>Preferencia de ingreso</Text>
                <Text style={ps2.sub}>Elige con qué rol iniciarás sesión la próxima vez</Text>
                {["usuario", "comercio", "rider.moto", "rider.taxi"].map((r) => {
                  const labels = { usuario: "Usuario", comercio: "Comercio", "rider.moto": "Delivery", "rider.taxi": "Particular" };
                  const selected = preferenciaRol === r || (!preferenciaRol && r === "usuario");
                  return (
                    <TouchableOpacity key={r} style={[ps2.option, selected && ps2.optionSelected]} onPress={() => setPreferencia(r)}>
                      <Icon3 name={({ usuario: "user", comercio: "shopping-bag", "rider.moto": "truck", "rider.taxi": "navigation" })[r]} size={20} color={selected ? "#fa6205" : "#999"} />
                      <Text style={[ps2.optionText, selected && ps2.optionTextSelected]}>{labels[r]}</Text>
                      {selected && <Icon3 name="check-circle" size={18} color="#fa6205" />}
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={ps2.cancelBtn} onPress={() => setPreferenciaModalVisible(false)}>
                  <Text style={ps2.cancelText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            animationType="fade"
            transparent={true}
            visible={supportModalVisible}
            onRequestClose={() => setSupportModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Contacto de Soporte</Text>
                <Text style={styles.modalText}>
                  Para cualquier consulta o ayuda, contáctanos al siguiente
                  libro de reclamaciones en
                </Text>
                <Text style={styles.emailText}>carbycol.com</Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setSupportModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setSupportModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Aceptar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          {/* Menú Cuenta */}
          <View style={styles.menuCard}>
            <Text style={styles.menuSection}>CUENTA</Text>
            <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("StepDiecisiete")}>
              <View style={styles.menuLeft}>
                <Icon3 name="user" size={20} color="#888" />
                <Text style={styles.menuText}>Datos Personales</Text>
              </View>
              <Icon3 name="chevron-right" size={20} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("ConfigurarPalabraSeguridad")}>
              <View style={styles.menuLeft}><Icon3 name="shield" size={20} color="#888" /><Text style={styles.menuText}>Configurar palabra de seguridad</Text></View>
              <Icon3 name="chevron-right" size={20} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => setPreferenciaModalVisible(true)}>
              <View style={styles.menuLeft}>
                <Icon3 name="shuffle" size={20} color="#888" />
                <Text style={styles.menuText}>Preferencia de ingreso</Text>
              </View>
              <Icon3 name="chevron-right" size={20} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate("MetodosPago")}>
              <View style={styles.menuLeft}>
                <MaterialIcons name="payments" size={20} color="#888" />
                <Text style={styles.menuText}>Métodos de pago</Text>
              </View>
              <Icon3 name="chevron-right" size={20} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Menú Ajustes */}
          <View style={styles.menuCard}>
            <Text style={styles.menuSection}>AJUSTES & SOPORTE</Text>
            <TouchableOpacity style={styles.menuRow} onPress={() => setSupportModalVisible(true)}>
              <View style={styles.menuLeft}>
                <Icon3 name="help-circle" size={20} color="#888" />
                <Text style={styles.menuText}>Contacta soporte</Text>
              </View>
              <Icon3 name="chevron-right" size={20} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuRow, { borderBottomWidth: 0 }]} onPress={() => setModalVisible(true)}>
              <View style={styles.menuLeft}>
                <Icon3 name="settings" size={20} color="#888" />
                <Text style={styles.menuText}>Desactivar cuenta</Text>
              </View>
              <Icon3 name="chevron-right" size={20} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Legal & Logout */}
          <View style={styles.legalSection}>
            <TouchableOpacity onPress={() => Linking.openURL("https://carbycol.com/terminos-y-condiciones/")}>
              <Text style={styles.legalText}>Términos y Condiciones</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL("https://carbycol.com/politica-de-privacidad/")}>
              <Text style={styles.legalText}>Privacidad de Datos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={cerrarSesion}>
              <Icon3 name="log-out" size={18} color="#FF4757" style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

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
    backgroundColor: "#F4F4F5",
    paddingTop: Platform.OS === "android" ? 40 : 0,
  },
  header: { justifyContent: "center", alignItems: "center", backgroundColor: "#1C1C1E", paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
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
    backgroundColor: "#D82D2D",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
    fontFamily: "Montserrat_300Light",
  },
  continueButtonText: {
    color: "#1C1C1E",
    fontSize: 16,
    fontFamily: "Montserrat_300Light",
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
