import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  ScrollView,
  Modal,
  Share,
  Linking,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url"; // Ajusta la ruta si es necesario
import nombreRol from "../../utils/nombreRol";
import RoleSwitcher from "../../components/RoleSwitcher";
import { useFonts } from "expo-font";
import {
  useFonts as useInterFonts,
  Inter_400Regular,
  Inter_700Bold,
  Inter_500Medium,
} from "@expo-google-fonts/inter";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_300Light,
  Montserrat_500Medium, // Agregado para mejor peso en subtítulos
  Montserrat_600SemiBold, // Agregado para botones
} from "@expo-google-fonts/montserrat";
import { Ionicons } from "@expo/vector-icons";
import IconMCC from "react-native-vector-icons/EvilIcons";
import Icon3 from "react-native-vector-icons/Feather";
import Icon4 from "react-native-vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import AlertaModal from "../../components/ErrorModal";
import ScreenHeader from "../../components/ScreenHeader";

const { width } = Dimensions.get("window");

export default function PerfilUsuario() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Inter_500Medium,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_300Light,
  });

  // --- LÓGICA ORIGINAL (INTACTA) ---
  const [userId, setUserId] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [preferenciaModalVisible, setPreferenciaModalVisible] = useState(false);
  const [preferenciaRol, setPreferenciaRol] = useState(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };
  // Estados para referidos (estaban en tu lógica pero no en tu JSX, los he reintegrado visualmente)
  const [codigoReferido, setCodigoReferido] = useState("Cargando...");
  const [premiosModalVisible, setPremiosModalVisible] = useState(false);
  const [premiosReferidos, setPremiosReferidos] = useState([]);
  const [loadingPremios, setLoadingPremios] = useState(false);

  const getImageUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith("http")) return photoPath;
    return `${BASE_URL.toString().replace("/api", "")}/storage/${photoPath}`;
  };

  useEffect(() => {
    const fetchStoredUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("userId");
        if (storedUserId) {
          setUserId(JSON.parse(storedUserId));
        }
      } catch (error) {
        console.error("Error obteniendo datos del usuario:", error);
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

  const fetchUserInfo = async () => {
    if (userId) {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) throw new Error("No se encontró el token");

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

        // Lógica de referidos
        if (data?.data?.codigo_referido) {
            setCodigoReferido(data.data.codigo_referido);
            await AsyncStorage.setItem("codigoReferido", data.data.codigo_referido);
        } else {
            setCodigoReferido("No disponible");
        }

        const profileImage =
          data?.data?.fotografia_perfil ||
          data?.data?.foto_document_file ||
          data?.data?.foto_documento_file;

        if (profileImage) {
          const url = getImageUrl(profileImage);
          console.log("🔄 Imagen actualizada:", url);
          setImageUrl(url);
        } else {
          setImageUrl(null);
        }
      } catch (error) {
        console.error("Error obteniendo información del usuario:", error);
      }
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, [userId, refreshTrigger]);

  useEffect(() => {
    AsyncStorage.getItem("preferencia_rol").then((r) => setPreferenciaRol(r));
  }, []);

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
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
      console.error("Error selecting image:", error);
      showAlert("No se pudo seleccionar la imagen.", "error");
    }
  };

  const uploadImage = async (uri) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;

      const tipoUsuario = userInfo?.data?.tipo_usuario || (await AsyncStorage.getItem("tipoUsuario"));
      if (!tipoUsuario) return;

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
          showAlert("Foto de perfil actualizada.", "success");
          setRefreshTrigger((prev) => prev + 1);
        } else {
          showAlert(data.message || "No se pudo actualizar.", "error");
        }
      } catch (e) {
        if (response.ok) {
            showAlert("Foto de perfil actualizada.", "success");
            setRefreshTrigger((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error("❌ Error subiendo la imagen:", error);
      showAlert("No se pudo subir la imagen.", "error");
    }
  };

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
      // Intento de logout en servidor (best effort)
      try {
        await fetch(`${BASE_URL}auth/logout`, {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            },
        });
      } catch (e) {}

      await AsyncStorage.clear();
      if (preferenciaGuardada) {
        await AsyncStorage.setItem("preferencia_rol", preferenciaGuardada);
      }
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (error) {
      const preferenciaGuardada = await AsyncStorage.getItem("preferencia_rol");
      await AsyncStorage.clear();
      if (preferenciaGuardada) {
        await AsyncStorage.setItem("preferencia_rol", preferenciaGuardada);
      }
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    }
  };

  const handleDeactivateAccount = async () => {
    showAlert("Su cuenta ha sido desactivada. Se eliminará en 7 días.", "info", () => navigation.reset({ index: 0, routes: [{ name: "Login" }] }), "OK");
    await AsyncStorage.clear();
  };

  // Funciones de referidos (estaban en tu lógica)
  const fetchPremiosReferidos = async () => {
    try {
        setLoadingPremios(true);
        const token = await AsyncStorage.getItem("userToken");
        const tipoUsuario = userInfo?.data?.tipo_usuario || (await AsyncStorage.getItem("tipoUsuario"));
        
        if (!token || !tipoUsuario) return;

        const response = await fetch(`${BASE_URL}referido-premio/role/${tipoUsuario}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            setPremiosReferidos(data);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setLoadingPremios(false);
    }
  };

  const compartirCodigoReferido = async () => {
    try {
        if (codigoReferido && codigoReferido !== "No disponible" && codigoReferido !== "Cargando...") {
            await Share.share({
                message: `¡Únete a YaRiders! Usa mi código: ${codigoReferido}`,
            });
        }
    } catch (error) {}
  };

  const toggleTermsCheck = async () => {
    const newState = !termsChecked;
    setTermsChecked(newState);
    await AsyncStorage.setItem("termsChecked", JSON.stringify(newState));
  };

  const togglePrivacyCheck = async () => {
    const newState = !privacyChecked;
    setPrivacyChecked(newState);
    await AsyncStorage.setItem("privacyChecked", JSON.stringify(newState));
  };

  if (!fontsLoaded) return <View style={styles.loadingContainer}><Text style={{color:'#fa6205'}}>Cargando...</Text></View>;

  // --- RENDERIZADO CON NUEVO DISEÑO (DARK MODE MODERNO) ---
  const nombrePerfil = userInfo?.data?.nombre_completo || "Usuario";
  const inicialesPerfil = nombrePerfil.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const filaMenu = (icono, texto, onPress, opciones = {}) => (
    <TouchableOpacity style={pf.fila} onPress={onPress} activeOpacity={0.7}>
      <View style={[pf.filaIcono, opciones.marca && pf.filaIconoMarca, opciones.peligro && pf.filaIconoPeligro]}>
        <Icon3 name={icono} size={18} color={opciones.peligro ? "#EF4444" : opciones.marca ? "#fa6205" : "#1C1C1E"} />
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
              <Image source={{ uri: imageUrl }} style={pf.avatar} />
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
            navigation.reset({ index: 0, routes: [{ name: navMap[role] || "BottomTabNavigatorUsuario" }] });
          }} />
        </View>

        <Text style={pf.grupoTitulo}>Cuenta</Text>
        <View style={pf.grupo}>
          {filaMenu("user", "Datos Personales", () => navigation.navigate("StepDiecisiete"))}
          <View style={pf.sep} />
          {filaMenu("shuffle", "Preferencia de ingreso", () => setPreferenciaModalVisible(true), { sub: "Para iniciar sesión con un rol debes tener acceso previamente" })}
          <View style={pf.sep} />
          {filaMenu("shield", "Configurar palabra de seguridad", () => navigation.navigate("ConfigurarPalabraSeguridad"))}
        </View>

        <Text style={pf.grupoTitulo}>Ajustes & soporte</Text>
        <View style={pf.grupo}>
          {filaMenu("help-circle", "Soporte", () => setSupportModalVisible(true))}
          <View style={pf.sep} />
          {filaMenu("user-x", "Desactivar Cuenta", () => setModalVisible(true), { peligro: true })}
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

      {/* --- MODALES CON NUEVO DISEÑO --- */}

      {/* Modal Desactivar */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>¿Desactivar cuenta?</Text>
            <Text style={styles.modalBody}>
                Su cuenta se desactivará inmediatamente y se eliminará permanentemente en 7 días.
            </Text>
            <View style={styles.modalActions}>
                <TouchableOpacity style={styles.btnOutline} onPress={() => setModalVisible(false)}>
                    <Text style={styles.btnOutlineText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnDestructive} onPress={() => { setModalVisible(false); handleDeactivateAccount(); }}>
                    <Text style={styles.btnDestructiveText}>Desactivar</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Preferencia de Ingreso */}
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

      {/* Modal Soporte */}
      <Modal animationType="fade" transparent={true} visible={supportModalVisible} onRequestClose={() => setSupportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Icon3 name="headphones" size={40} color="#fa6205" style={{alignSelf: 'center', marginBottom: 15}} />
            <Text style={styles.modalTitle}>Soporte</Text>
            <Text style={styles.modalBody}>
                Para consultas o reclamos, visita nuestro sitio web:
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL("https://carbycol.com")}>
                <Text style={styles.linkUrl}>carbycol.com</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnPrimary, {marginTop: 20}]} onPress={() => setSupportModalVisible(false)}>
                <Text style={styles.btnPrimaryText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Premios (Reintegrado visualmente) */}
      <Modal animationType="slide" transparent={true} visible={premiosModalVisible} onRequestClose={() => setPremiosModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitleLarge}>Programa de Referidos</Text>
                <TouchableOpacity onPress={() => setPremiosModalVisible(false)}>
                    <Icon3 name="x" size={24} color="#1C1C1E" />
                </TouchableOpacity>
            </View>

            <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>Tu código único</Text>
                <Text style={styles.codeValue}>{codigoReferido}</Text>
                <TouchableOpacity style={styles.btnPrimary} onPress={compartirCodigoReferido}>
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                        <Icon3 name="share-2" size={16} color="#000" style={{marginRight:8}}/>
                        <Text style={styles.btnPrimaryText}>Compartir</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionHeaderModal}>RECOMPENSAS</Text>
            <ScrollView style={{maxHeight: 200}}>
                {loadingPremios ? <Text style={styles.loadingText}>Cargando...</Text> : 
                 premiosReferidos.length > 0 ? premiosReferidos.map((p, i) => (
                    <View key={i} style={styles.rewardItem}>
                        <View>
                            <Text style={styles.rewardName}>{p.suscripcion?.nombre || "Premio"}</Text>
                            <Text style={styles.rewardMeta}>Meta: {p.cantidad} referidos</Text>
                        </View>
                        <Icon3 name="gift" size={20} color="#fa6205" />
                    </View>
                 )) : <Text style={styles.loadingText}>No hay premios activos.</Text>
                }
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AlertaModal
        visible={alertVisible}
        mensaje={alertData.message}
        tipo={alertData.type}
        onCerrar={() => setAlertVisible(false)}
        onPrimary={alertData.onPrimary}
        primaryLabel={alertData.primaryLabel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // --- ESTRUCTURA ---
  safeContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center"
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // --- PROFILE ROW (compacta) ---
  profileRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14, backgroundColor: "#FFF", marginHorizontal: 16, marginTop: 16, borderRadius: 16 },
  avatarSmall: { width: 52, height: 52, borderRadius: 16, overflow: "hidden", backgroundColor: "#F4F4F5" },
  avatarSmallImg: { width: 52, height: 52, borderRadius: 16 },
  avatarSmallPlaceholder: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#fa6205", justifyContent: "center", alignItems: "center" },
  editBadge: { position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: "#1C1C1E", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#FFF" },
  profileInfo: { flex: 1 },
  userName: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: "#1C1C1E", marginBottom: 2 },
  locationText: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: "#71717A" },

  // --- STATS CARDS ---
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    width: (width - 50) / 2, // 2 columnas
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDD",
    position: 'relative',
  },
  statIconBg: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(250, 98, 5, 0.1)",
    justifyContent: 'center', alignItems: 'center', marginBottom: 10
  },
  statValue: {
    fontSize: 18, fontFamily: "Montserrat_700Bold", color: '#1C1C1E'
  },
  statLabel: {
    fontSize: 12, fontFamily: "Montserrat_400Regular", color: "#888", marginTop: 2
  },
  notificationDot: {
    position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#fa6205'
  },

  // --- MENU LIST ---
  menuContainer: { paddingHorizontal: 16, marginBottom: 16 },
  menuHeader: { fontSize: 11, fontFamily: "Montserrat_800ExtraBold", color: "#999", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  menuItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#FFFFFF", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 4,
  },
  menuItemLeft: {
    flexDirection: "row", alignItems: "center", flex: 1
  },
  menuItemText: { color: "#1C1C1E", fontSize: 14, fontFamily: "Montserrat_600SemiBold", marginLeft: 12 },
  menuItemSubText: { color: "#999", fontSize: 12, fontFamily: "Montserrat_400Regular", marginLeft: 12, marginTop: 2 },

  // --- LEGAL & FOOTER ---
  legalContainer: {
    paddingHorizontal: 25,
    marginBottom: 20,
    alignItems: 'center',
    gap: 12,
  },
  legalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15
  },
  linkText: {
    color: "#1C1C1E", fontSize: 14, fontFamily: "Montserrat_400Regular", textAlign: 'center', paddingVertical: 4
  },
  checkbox: {
    width: 20, height: 20, borderWidth: 2, borderColor: "#555", borderRadius: 6, alignItems: 'center', justifyContent: 'center'
  },
  checkboxActive: {
    backgroundColor: "#fa6205", borderColor: "#fa6205"
  },
  logoutButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    width: "100%", paddingVertical: 15, borderRadius: 12, borderWidth: 1, borderColor: "#DDD",
    marginTop: 20
  },
  logoutText: {
    color: "#FF4757", fontFamily: "Montserrat_600SemiBold", fontSize: 15
  },

  // --- MODALES ---
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 20
  },
  modalCard: {
    width: "100%", backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "#DDD"
  },
  modalCardLarge: {
    width: "100%", maxHeight: '80%', backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#DDD"
  },
  modalTitle: {
    fontSize: 20, fontFamily: "Montserrat_700Bold", color: '#1C1C1E', textAlign: "center", marginBottom: 10
  },
  modalTitleLarge: {
    fontSize: 22, fontFamily: "Montserrat_700Bold", color: '#1C1C1E'
  },
  modalBody: {
    fontSize: 14, fontFamily: "Montserrat_400Regular", color: "#555", textAlign: "center", marginBottom: 20, lineHeight: 22
  },
  modalHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20
  },
  
  // Botones Modales
  modalActions: { flexDirection: "row", gap: 15 },
  btnOutline: {
    flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: "#555", borderRadius: 10, alignItems: "center"
  },
  btnOutlineText: { color: '#1C1C1E', fontFamily: "Montserrat_600SemiBold" },
  btnDestructive: {
    flex: 1, paddingVertical: 12, backgroundColor: "#DC2626", borderRadius: 12, alignItems: "center"
  },
  btnDestructiveText: { color: "#FFF", fontFamily: "Montserrat_700Bold" },
  btnPrimary: {
    backgroundColor: "#fa6205", paddingVertical: 12, borderRadius: 12, alignItems: "center", width: "100%", paddingHorizontal: 20
  },
  btnPrimaryText: {
    color: "#000", fontFamily: "Montserrat_700Bold", fontSize: 16
  },

  // Referidos
  codeContainer: {
    backgroundColor: "#FFFFFF", padding: 20, borderRadius: 16, alignItems: "center", marginBottom: 20
  },
  codeLabel: { color: "#888", fontSize: 12, fontFamily: "Montserrat_500Medium", marginBottom: 5 },
  codeValue: { color: "#fa6205", fontSize: 28, fontFamily: "Montserrat_700Bold", marginBottom: 15, letterSpacing: 2 },
  sectionHeaderModal: { color: "#666", fontFamily: "Montserrat_700Bold", fontSize: 12, marginBottom: 10 },
  
  rewardItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ECECEC', padding: 12, borderRadius: 12, marginBottom: 10
  },
  rewardName: { color: '#1C1C1E', fontFamily: "Montserrat_600SemiBold", fontSize: 14 },
  rewardMeta: { color: '#888', fontSize: 12 },
  
  loadingText: { color: "#666", textAlign: "center", marginVertical: 20 },
  linkUrl: { color: "#fa6205", textDecorationLine: "underline", textAlign: 'center', fontSize: 16, fontFamily: "Montserrat_700Bold" }
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

  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  roleWrap: { marginHorizontal: -16 },
  grupoTitulo: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: "#71717A", marginTop: 18, marginBottom: 8, marginLeft: 4 },
  grupo: { backgroundColor: "#FFF", borderRadius: 20, paddingHorizontal: 14 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: "#E4E4E7", marginLeft: 50 },
  fila: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  filaIcono: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F4F4F5", alignItems: "center", justifyContent: "center" },
  filaIconoPeligro: { backgroundColor: "#FEF2F2" },
  filaIconoMarca: { backgroundColor: "#FFF0E5" },
  rolBadge: { alignSelf: "flex-start", backgroundColor: "rgba(250,98,5,0.2)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 8 },
  rolBadgeText: { fontSize: 11.5, fontFamily: "Montserrat_700Bold", color: "#fa6205", textTransform: "capitalize" },
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
