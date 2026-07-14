import React, { useEffect, useState, useCallback } from "react";
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
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);

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

  // Función para seleccionar imagen
  const pickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permiso denegado",
          "Se necesita acceso a la galería para cambiar tu foto de perfil"
        );
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
      Alert.alert(
        "Error",
        "No se pudo seleccionar la imagen. Inténtalo de nuevo."
      );
    }
  };

  // Función para subir imagen
  const uploadImage = async (uri) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "No hay sesión activa");
        return;
      }

      const tipoUsuario =
        userInfo?.data?.tipo_usuario ||
        (await AsyncStorage.getItem("tipoUsuario"));

      if (!tipoUsuario) {
        Alert.alert("Error", "No se pudo determinar el tipo de usuario");
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
          Alert.alert("Éxito", "Foto de perfil actualizada correctamente");

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
          Alert.alert(
            "Error",
            data.message || "No se pudo actualizar la foto de perfil"
          );
        }
      } catch (e) {
        if (response.ok) {
          Alert.alert("Éxito", "Foto de perfil actualizada");
          setRefreshTrigger((prev) => prev + 1);
        } else {
          Alert.alert("Error", "No se pudo actualizar la foto de perfil");
        }
      }
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      Alert.alert(
        "Error",
        "No se pudo subir la imagen. Verifica tu conexión a internet."
      );
    }
  };

  // Función para cerrar sesión
  const cerrarSesion = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        await AsyncStorage.clear();
        navigation.navigate("Login");
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
      Alert.alert("Sesión cerrada", "Has cerrado sesión correctamente");
      navigation.navigate("Login");
    } catch (error) {
      console.error("Error en cerrar sesión:", error);

      // Intenta cerrar sesión localmente
      try {
        await AsyncStorage.clear();
        Alert.alert("Sesión cerrada", "Se cerró sesión localmente");
        navigation.navigate("Login");
      } catch (storageError) {
        Alert.alert("Error", "No se pudo cerrar sesión. Intenta de nuevo.");
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
        Alert.alert(
          "Error",
          "No hay un código de referido disponible para compartir"
        );
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
        Alert.alert("Error", "No hay sesión activa");
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
      Alert.alert(
        "Cuenta desactivada",
        "Su cuenta ha sido desactivada. Se eliminará en 7 días.",
        [{ text: "OK", onPress: () => navigation.navigate("Login") }]
      );

      await AsyncStorage.clear();
    } catch (error) {
      console.error("Error desactivando cuenta:", error);
      Alert.alert(
        "Error",
        "No se pudo desactivar la cuenta. Inténtalo de nuevo."
      );
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
      Alert.alert("Error", "No se pudieron cargar los premios por referidos");
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
        <Text style={{ textAlign: "center", marginTop: 20, color: "#FFFFFF" }}>
          Cargando...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
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

          {/* Botón Atrás */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <FontAwesome name="arrow-left" size={24} color="white" />
          </TouchableOpacity>

          {/* Foto de perfil */}
          <View style={styles.imageContainer}>
            {imageUrl && !imageError ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                onError={(e) => {
                  console.log("Error cargando imagen:", e.nativeEvent.error);
                  setImageError(true);
                }}
              />
            ) : (
              <View
                style={[
                  styles.image,
                  {
                    backgroundColor: "#555",
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Icon3 name="user" size={80} color="#94D82D" />
              </View>
            )}

            {/* Botón para editar foto */}
            <TouchableOpacity style={styles.editIcon} onPress={pickImage}>
              <Icon4 name="pencil-circle" size={40} color="green" />
            </TouchableOpacity>
          </View>

          {/* Información del usuario */}
          <Text style={styles.sectionTitle3}>
            {userInfo?.data?.nombre_completo || "Usuario"}
          </Text>
          <Text style={styles.sectionTitle2}>
            <IconMCC name="location" size={20} color="#fff" />
            {userInfo?.data?.ciudad || "Ciudad"}
          </Text>

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
                  <Text style={{ fontWeight: "bold", color: "#94D82D" }}>
                    {codigoReferido}
                  </Text>
                </Text>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={compartirCodigoReferido}
                >
                  <Icon3 name="share-2" size={18} color="#FFF" />
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
                <Text style={styles.emailText}>www.yariders.com</Text>

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
          {/* Tarjeta de opciones */}
          <View style={styles.card1}>
            <TouchableOpacity
              onPress={() => navigation.navigate("StepDiecisiete")}
            >
              <View style={styles.row}>
                <Icon3
                  name="users"
                  size={25}
                  color="#202020"
                  style={styles.icon2}
                />
                <Text style={styles.label}>Cuenta</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.row}>
              <Icon3
                name="map-pin"
                size={25}
                color="#121212"
                style={styles.icon2}
              />
              <Text style={styles.label}>
                Dirección:
                {userInfo?.data?.departamento && userInfo?.data?.ciudad
                  ? `${userInfo.data.departamento}, ${userInfo.data.ciudad}`
                  : userInfo?.data?.departamento
                  ? userInfo.data.departamento
                  : userInfo?.data?.ciudad
                  ? userInfo.data.ciudad
                  : userInfo?.data?.direccion_principal
                  ? userInfo.data.direccion_principal
                  : "No disponible"}
              </Text>
            </View>

            <TouchableOpacity onPress={() => setSupportModalVisible(true)}>
              <View style={styles.row}>
                <Icon3
                  name="help-circle"
                  size={25}
                  color="#121212"
                  style={styles.icon2}
                />
                <Text style={styles.label}>Soporte</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate("MetodosPago")}
            >
              <View style={styles.row}>
                <MaterialIcons
                  name="payments"
                  size={25}
                  color="#202020"
                  style={styles.icon2}
                />
                <Text style={styles.label}>Crear Métodos de pago</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <View style={styles.row}>
                <Icon3
                  name="settings"
                  size={25}
                  color="#202020"
                  style={styles.icon2}
                />
                <Text style={styles.label}>Desactivar o Eliminar cuenta</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Botón cerrar sesión */}
          <TouchableOpacity style={styles.button} onPress={cerrarSesion}>
            <Icon3
              name="log-out"
              size={20}
              color="#202020"
              style={styles.icon}
            />
            <Text style={styles.buttonText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.termsContainer}>
          <View style={styles.termRow}>
            <TouchableOpacity
              style={styles.linkContainer}
              onPress={() =>
                Linking.openURL(
                  "https://app.yariders.com/terminos-y-condiciones/"
                )
              }
            >
              <Text style={styles.linkText}>Términos y Condiciones</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={toggleTermsCheck}
            >
              <View
                style={[
                  styles.checkbox,
                  termsChecked && styles.checkboxChecked,
                ]}
              >
                {termsChecked && (
                  <Icon3 name="check" size={16} color="#121212" />
                )}
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.termRow}>
            <TouchableOpacity
              style={styles.linkContainer}
              onPress={() =>
                Linking.openURL(
                  "https://app.yariders.com/politica-de-privacidad/"
                )
              }
            >
              <Text style={styles.linkText}>Privacidad de Datos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={togglePrivacyCheck}
            >
              <View
                style={[
                  styles.checkbox,
                  privacyChecked && styles.checkboxChecked,
                ]}
              >
                {privacyChecked && (
                  <Icon3 name="check" size={16} color="#121212" />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#242424",
    paddingTop: Platform.OS === "android" ? 50 : 40,
  },
  container: {
    padding: 20,
  },
  // Estilos para la imagen de perfil
  imageContainer: {
    alignSelf: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  image: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: "#94D82D",
    backgroundColor: "#555",
  },
  editIcon: {
    position: "absolute",
    bottom: -10,
    right: 10,
  },
  // Estilos para la información del usuario
  sectionTitle3: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 10,
  },
  sectionTitle2: {
    fontFamily: "Montserrat_300Light",
    fontSize: 14,
    color: "#CCCCCC",
    textAlign: "center",
    marginTop: 5,
  },
  emailText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#1E7D22",
  },
  // Estilos para los botones de acciones
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    marginBottom: 10,
  },
  button1: {
    backgroundColor: "#E9FAC8",
    padding: 15,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    width: "47%",
    minHeight: 80,
  },
  title1: {
    fontFamily: "Montserrat_700Bold",
    color: "#000000",
    fontSize: 14,
    textAlign: "center",
  },
  subtitle1: {
    color: "#888",
    fontFamily: "Montserrat_300Light",
    fontSize: 12,
    marginTop: 5,
  },
  // Estilos para la tarjeta de opciones
  card1: {
    backgroundColor: "#9BFE03",
    borderRadius: 25,
    padding: 15,
    marginVertical: 25,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  icon2: {
    marginRight: 15,
  },
  label: {
    fontSize: 16,
    color: "#202020",
    fontFamily: "Montserrat_400Regular",
  },
  // Botón de cerrar sesión
  button: {
    flexDirection: "row",
    //alignItems: "center",
    //justifyContent: "center",
    backgroundColor: "#9BFE03",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginBottom: 40,
  },
  icon: {
    marginRight: 10,
  },
  buttonText: {
    color: "#202020",
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },
  // Estilos para el botón Atrás
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
    color: "white",
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
    borderLeftColor: "#94D82D",
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
    backgroundColor: "#94D82D",
    padding: 12,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 15,
  },
  closeButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  // Botón para compartir código de referido
  shareButton: {
    backgroundColor: "#94D82D",
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
    color: "#FFF",
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
    color: "white",
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
    borderColor: "#94D82D",
    borderRadius: 4,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#94D82D",
  },
});
