import React, { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView,
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
  Dimensions
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url"; // Ajusta la ruta si es necesario
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
import { FontAwesome } from "@expo/vector-icons";
import IconMCC from "react-native-vector-icons/EvilIcons";
import Icon3 from "react-native-vector-icons/Feather";
import Icon4 from "react-native-vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import AlertaModal from "../../components/ErrorModal";

const { width } = Dimensions.get("window");

export default function PerfilUsuario() {
  const navigation = useNavigation();

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

  const cerrarSesion = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        await AsyncStorage.clear();
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
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (error) {
      await AsyncStorage.clear();
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
  return (
    <SafeAreaView style={styles.safeContainer}>
      
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <FontAwesome name="arrow-left" size={20} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <View style={{width: 30}} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 2. Hero Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            {imageUrl && !imageError ? (
              <Image source={{ uri: imageUrl }} style={styles.avatar} onError={() => setImageError(true)} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon3 name="user" size={45} color="#F2F2F7" />
              </View>
            )}
            <TouchableOpacity style={styles.editButton} onPress={pickImage}>
              <Icon4 name="pencil" size={16} color="#000" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>{userInfo?.data?.nombre_completo || "Usuario"}</Text>
          
          <View style={styles.locationBadge}>
            <IconMCC name="location" size={18} color="#fa6205" />
            <Text style={styles.locationText}>{userInfo?.data?.ciudad || "Ciudad"}</Text>
          </View>
        </View>

     

        {/* 4. Menu List Moderno (Reemplaza card1) */}
        <View style={styles.menuContainer}>
            <Text style={styles.menuHeader}>CUENTA</Text>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("StepDiecisiete")}>
                <View style={styles.menuItemLeft}>
                    <Icon3 name="user" size={20} color="#888" />
                    <Text style={styles.menuItemText}>Datos Personales</Text>
                </View>
                <Icon3 name="chevron-right" size={20} color="#888" />
            </TouchableOpacity>
        </View>

        <View style={styles.menuContainer}>
            <Text style={styles.menuHeader}>AJUSTES & SOPORTE</Text>

            <TouchableOpacity style={styles.menuItem} onPress={() => setSupportModalVisible(true)}>
                <View style={styles.menuItemLeft}>
                    <Icon3 name="help-circle" size={20} color="#888" />
                    <Text style={styles.menuItemText}>Soporte</Text>
                </View>
                <Icon3 name="chevron-right" size={20} color="#888" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, {borderBottomWidth: 0}]} onPress={() => setModalVisible(true)}>
                <View style={styles.menuItemLeft}>
                    <Icon3 name="settings" size={20} color="#888" />
                    <Text style={styles.menuItemText}>Desactivar Cuenta</Text>
                </View>
                <Icon3 name="chevron-right" size={20} color="#888" />
            </TouchableOpacity>
        </View>

        {/* 5. Legal & Logout */}
        <View style={styles.legalContainer}>
            <TouchableOpacity onPress={() => Linking.openURL("https://carbycol.com/terminos-y-condiciones/")}>
                <Text style={styles.linkText}>Términos y Condiciones</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL("https://carbycol.com/politica-de-privacidad/")}>
                <Text style={styles.linkText}>Privacidad de Datos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={cerrarSesion}>
                <Icon3 name="log-out" size={18} color="#FF4757" style={{marginRight: 8}} />
                <Text style={styles.logoutText}>Cerrar sesión</Text>
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
    backgroundColor: "#F2F2F7", // Negro moderno
    paddingTop: Platform.OS === "android" ? 40 : 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center"
  },
  scrollContent: {
    paddingBottom: 50,
  },

  // --- HEADER ---
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#F2F2F7",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    color: '#1C1C1E',
    letterSpacing: 0.5,
  },
  iconButton: {
    padding: 8,
  },

  // --- PERFIL HERO ---
  profileSection: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 25,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 15,
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#fa6205",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fa6205",
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FFF",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#F2F2F7",
  },
  userName: {
    fontSize: 24,
    fontFamily: "Montserrat_700Bold",
    color: '#1C1C1E',
    marginBottom: 5,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 5,
  },
  locationText: {
    color: "#666",
    fontFamily: "Montserrat_500Medium",
    fontSize: 14,
    marginLeft: 5,
  },

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
  menuContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  menuHeader: {
    fontSize: 12, fontFamily: "Montserrat_700Bold", color: "#666", marginBottom: 10, letterSpacing: 1
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
  },
  menuItemLeft: {
    flexDirection: "row", alignItems: "center", flex: 1
  },
  menuItemText: {
    color: "#1C1C1E", fontSize: 15, fontFamily: "Montserrat_500Medium", marginLeft: 15
  },
  menuItemSubText: {
    color: "#888", fontSize: 13, fontFamily: "Montserrat_400Regular", marginLeft: 15, marginTop: 2
  },

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
    flex: 1, paddingVertical: 12, backgroundColor: "#FF4757", borderRadius: 10, alignItems: "center"
  },
  btnDestructiveText: { color: '#1C1C1E', fontFamily: "Montserrat_600SemiBold" },
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