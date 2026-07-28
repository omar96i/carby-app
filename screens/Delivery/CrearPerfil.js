import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_600SemiBold,
  Montserrat_800ExtraBold,
} from "@expo-google-fonts/montserrat";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../../constants/url";
import DateTimePicker from "@react-native-community/datetimepicker";
import AlertaModal from "../../components/ErrorModal";

export default function CrearPerfil() {
  const navigation = useNavigation();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingProfiles, setExistingProfiles] = useState([]);

  // Estado para las pestañas
  const [activeTab, setActiveTab] = useState("perfiles");

  // Para editar
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [profileToEdit, setProfileToEdit] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editIsSubmitting, setEditIsSubmitting] = useState(false);

  // Para horario
  const diasSemana = [
    { label: "Lunes", value: 0 },
    { label: "Martes", value: 1 },
    { label: "Miércoles", value: 2 },
    { label: "Jueves", value: 3 },
    { label: "Viernes", value: 4 },
    { label: "Sábado", value: 5 },
    { label: "Domingo", value: 6 },
  ];
  const [horarioModalVisible, setHorarioModalVisible] = useState(false);
  const [horarioPerfilId, setHorarioPerfilId] = useState(null);
  const [diaSemana, setDiaSemana] = useState(0);
  const [horaInicio, setHoraInicio] = useState(() => {
    const date = new Date();
    date.setFullYear(1970, 0, 1);
    date.setHours(8, 0, 0, 0); // 8:00 AM exacto
    return date;
  });
  const [horaFin, setHoraFin] = useState(() => {
    const date = new Date();
    date.setFullYear(1970, 0, 1);
    date.setHours(17, 0, 0, 0); // 5:00 PM exacto
    return date;
  });
  const [showInicioPicker, setShowInicioPicker] = useState(false);
  const [showFinPicker, setShowFinPicker] = useState(false);
  const [isHorarioSubmitting, setIsHorarioSubmitting] = useState(false);
  const [horarios, setHorarios] = useState([]);
  const [horarioEditId, setHorarioEditId] = useState(null);

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_600SemiBold,
    Montserrat_800ExtraBold,
  });

  useEffect(() => {
    fetchExistingProfiles();
  }, []);

  // Función para obtener perfiles existentes
  const fetchExistingProfiles = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");

      if (!token || !userData) {
        showAlert("Error", "No se encontró información de autenticación");
        return;
      }

      const userInfo = JSON.parse(userData);
      const response = await fetch(
        `${BASE_URL}user-perfil/by-user/${userInfo.id}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setExistingProfiles(data.data || []);
      } else {
        console.log("No se pudieron cargar los perfiles existentes");
      }
    } catch (error) {
      console.error("Error al obtener perfiles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para seleccionar imagen
  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        showAlert("Permisos requeridos", "Se necesitan permisos para acceder a la galería de fotos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error("Error al seleccionar imagen:", error);
      showAlert("Error", "No se pudo seleccionar la imagen");
    }
  };

  // Función para crear el perfil
  const createProfile = async () => {
    if (!nombre.trim()) {
      showAlert("Error", "El nombre del perfil es obligatorio");
      return;
    }
    if (!descripcion.trim()) {
      showAlert("Error", "La descripción del perfil es obligatoria");
      return;
    }
    if (!selectedImage) {
      showAlert("Error", "Debes seleccionar una imagen para el perfil");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");
      if (!token || !userData) {
        showAlert("Error", "No se encontró información de autenticación");
        setIsSubmitting(false);
        return;
      }
      const userInfo = JSON.parse(userData);

      const formData = new FormData();
      formData.append("user_id", userInfo.id.toString());
      formData.append("nombre", nombre.trim());
      formData.append("descripcion", descripcion.trim());
      formData.append("file", {
        uri: selectedImage.uri,
        type: "image/jpeg",
        name: `profile_${Date.now()}.jpg`,
      });

      const response = await fetch(`${BASE_URL}user-perfil`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const responseJson = await response.json();
      if (response.ok) {
        showAlert("Éxito", "Perfil creado correctamente", "success", () => {
          setNombre("");
          setDescripcion("");
          setSelectedImage(null);
          fetchExistingProfiles();
          setActiveTab("perfiles");
        }, "OK");
      } else {
        let errorMessage = responseJson.message || "No se pudo crear el perfil";
        if (responseJson.errors) {
          const errors = Object.values(responseJson.errors).flat();
          errorMessage = errors.join("\n");
        }
        showAlert("Error", errorMessage);
      }
    } catch (error) {
      console.error("Error al crear perfil:", error);
      showAlert("Error", "Ocurrió un error al crear el perfil. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------- FUNCIONALIDAD EDITAR Y ELIMINAR ---------

  // Abrir modal de edición
  const openEditModal = (profile) => {
    setProfileToEdit(profile);
    setEditNombre(profile.nombre);
    setEditDescripcion(profile.descripcion);
    setEditModalVisible(true);
  };

  // Guardar cambios de perfil
  const handleEditProfile = async () => {
    if (!editNombre.trim() || !editDescripcion.trim()) {
      showAlert("Error", "Todos los campos son obligatorios");
      return;
    }
    setEditIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        showAlert("Error", "No autenticado");
        setEditIsSubmitting(false);
        return;
      }
      const response = await fetch(
        `${BASE_URL}user-perfil/${profileToEdit.id}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre: editNombre.trim(),
            descripcion: editDescripcion.trim(),
          }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        showAlert("Éxito", "Perfil actualizado correctamente");
        setEditModalVisible(false);
        fetchExistingProfiles();
      } else {
        showAlert("Error", data.message || "No se pudo actualizar el perfil");
      }
    } catch (error) {
      showAlert("Error", "Ocurrió un error al editar el perfil");
    } finally {
      setEditIsSubmitting(false);
    }
  };

  // Eliminar perfil
  const handleDeleteProfile = async (profileId) => {
    const doDelete = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          showAlert("Error", "No autenticado");
          return;
        }
        const response = await fetch(
          `${BASE_URL}user-perfil/${profileId}`,
          {
            method: "DELETE",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.ok) {
          showAlert("Eliminado", "Perfil eliminado correctamente");
          fetchExistingProfiles();
        } else {
          showAlert("Error", "No se pudo eliminar el perfil");
        }
      } catch (error) {
        showAlert("Error", "Ocurrió un error al eliminar el perfil");
      }
    };
    showAlert("Eliminar perfil", "¿Estás seguro de que deseas eliminar este perfil?", "confirm", doDelete, "Eliminar");
  };

  // --------- FUNCIONALIDAD HORARIO ---------
  const openHorarioModal = async (perfilId) => {
    setHorarioPerfilId(perfilId);
    setDiaSemana(0);
    setHoraInicio(createTimeFromHourMinute(8, 0)); // 8:00 AM exacto
    setHoraFin(createTimeFromHourMinute(17, 0)); // 5:00 PM exacto
    setHorarioEditId(null);
    setHorarioModalVisible(true);
    await fetchHorarios(perfilId);
  };

  const fetchHorarios = async (perfilId) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;
      const response = await fetch(
        `${BASE_URL}user-perfil-disponibilidad/${perfilId}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setHorarios(data.data || []);
      } else {
        setHorarios([]);
      }
    } catch (error) {
      setHorarios([]);
    }
  };
  const formatHora = (date) => {
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  // Función para crear una fecha con hora específica manteniendo precisión de minutos
  const createTimeFromHourMinute = (hour, minute) => {
    const date = new Date();
    date.setFullYear(1970, 0, 1); // Año, mes, día fijos para solo trabajar con la hora
    date.setHours(hour, minute, 0, 0); // Establecer hora, minuto, segundo=0, milisegundo=0
    return date;
  };

  const handleCrearHorario = async () => {
    setIsHorarioSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        showAlert("Error", "No autenticado");
        setIsHorarioSubmitting(false);
        return;
      }
      const response = await fetch(`${BASE_URL}user-perfil-disponibilidad`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_perfil_id: horarioPerfilId,
          dia_semana: diaSemana,
          hora_inicio: formatHora(horaInicio),
          hora_fin: formatHora(horaFin),
        }),
      });
      if (response.ok) {
        showAlert("Éxito", "Horario guardado correctamente");
        setHorarioModalVisible(false);
      } else {
        const data = await response.json();
        showAlert("Error", data.message || "No se pudo guardar el horario");
      }
    } catch (error) {
      showAlert("Error", "Ocurrió un error al guardar el horario");
    } finally {
      setIsHorarioSubmitting(false);
    }
  };
  const handleEditHorario = (horario) => {
    setDiaSemana(horario.dia_semana);
    // Parse hora_inicio y hora_fin a Date con mayor precisión
    const [hI, mI] = horario.hora_inicio.split(":");
    const [hF, mF] = horario.hora_fin.split(":");
    setHoraInicio(createTimeFromHourMinute(parseInt(hI), parseInt(mI)));
    setHoraFin(createTimeFromHourMinute(parseInt(hF), parseInt(mF)));
    setHorarioEditId(horario.id);
  };

  const handleGuardarEdicionHorario = async () => {
    setIsHorarioSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        showAlert("Error", "No autenticado");
        setIsHorarioSubmitting(false);
        return;
      }
      const response = await fetch(
        `${BASE_URL}user-perfil-disponibilidad/${horarioEditId}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dia_semana: diaSemana,
            hora_inicio: formatHora(horaInicio),
            hora_fin: formatHora(horaFin),
          }),
        }
      );
      if (response.ok) {
        showAlert("Éxito", "Horario actualizado correctamente");
        setHorarioEditId(null);
        await fetchHorarios(horarioPerfilId);
      } else {
        const data = await response.json();
        showAlert("Error", data.message || "No se pudo actualizar el horario");
      }
    } catch (error) {
      showAlert("Error", "Ocurrió un error al editar el horario");
    } finally {
      setIsHorarioSubmitting(false);
    }
  };

  const handleEliminarHorario = async (id) => {
    const doDelete = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return;
        const response = await fetch(
          `${BASE_URL}user-perfil-disponibilidad/${id}`,
          {
            method: "DELETE",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.ok) {
          showAlert("Eliminado", "Horario eliminado correctamente");
          await fetchHorarios(horarioPerfilId);
        } else {
          showAlert("Error", "No se pudo eliminar el horario");
        }
      } catch (error) {
        showAlert("Error", "Ocurrió un error al eliminar el horario");
      }
    };
    showAlert("Eliminar horario", "¿Estás seguro de que deseas eliminar este horario?", "confirm", doDelete, "Eliminar");
  };

  // ---------------------------------------------------

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({});

  const showAlert = (title, message, type, onConfirm, primaryLabel) => {
    setAlertData({ title, message, type: type || (title === "Éxito" ? "success" : "error"), onConfirm: onConfirm || null, primaryLabel: primaryLabel || null });
    setAlertVisible(true);
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fa6205" />
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Perfiles</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === "perfiles" && styles.activeTab]} onPress={() => setActiveTab("perfiles")}>
          <Text style={[styles.tabText, activeTab === "perfiles" && styles.activeTabText]}>Perfiles</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === "crear" && styles.activeTab]} onPress={() => setActiveTab("crear")}>
          <Text style={[styles.tabText, activeTab === "crear" && styles.activeTabText]}>Crear</Text>
        </TouchableOpacity>
      </View>

      {/* Contenido según la pestaña activa */}
      {activeTab === "perfiles" ? (
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Perfiles existentes */}
          <View style={styles.profilesTabContainer}>
            {existingProfiles.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>Mis Perfiles</Text>
                {isLoading ? (
                  <View style={styles.loadingProfilesContainer}>
                    <ActivityIndicator size="small" color="#fa6205" />
                    <Text style={styles.loadingText}>Cargando perfiles...</Text>
                  </View>
                ) : (
                  existingProfiles.map((profile, index) => (
                    <View key={profile.id || index} style={styles.profileCard}>
                      {profile.file && (
                        <Image
                          source={{
                            uri: profile.file.startsWith("http")
                              ? profile.file
                              : `${BASE_URL.toString().replace(/\/api\/?$/, "").replace(
                                  /\/$/,
                                  ""
                                )}/storage/${profile.file.replace(
                                  /^storage[\\/]/,
                                  ""
                                )}`,
                          }}
                          style={styles.profileImage}
                        />
                      )}
                      <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{profile.nombre}</Text>
                        <Text style={styles.profileDescription}>
                          {profile.descripcion}
                        </Text>
                      </View>
                      {/* Botones de editar, eliminar y horario */}
                      <View style={{ flexDirection: "row" }}>
                        <TouchableOpacity
                          onPress={() => openEditModal(profile)}
                          style={{ marginRight: 10 }}
                        >
                          <Ionicons
                            name="create-outline"
                            size={22}
                            color="#fa6205"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteProfile(profile.id)}
                          style={{ marginRight: 10 }}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={22}
                            color="#ff4d4d"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => openHorarioModal(profile.id)}
                          style={{
                            backgroundColor: "#fa6205",
                            borderRadius: 20,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ color: "#FFF", fontWeight: "bold" }}>
                            Horario
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            ) : (
              <View style={styles.emptyProfilesContainer}>
                <Ionicons name="person-outline" size={60} color="#666" />
                <Text style={styles.emptyProfilesTitle}>
                  No tienes perfiles creados
                </Text>
                <Text style={styles.emptyProfilesSubtitle}>
                  Ve a la pestaña "Crear" para agregar tu primer perfil
                </Text>
                <TouchableOpacity
                  style={styles.createFirstProfileButton}
                  onPress={() => setActiveTab("crear")}
                >
                  <Ionicons name="add" size={20} color="#FFF" />
                  <Text style={styles.createFirstProfileText}>
                    Crear mi primer perfil
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Formulario */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Crear Nuevo Perfil</Text>

            {/* Campo Nombre */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nombre del perfil *</Text>
              <TextInput
                style={styles.textInput}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej: Mi Restaurante"
                placeholderTextColor="#999"
                maxLength={20}
              />
            </View>

            {/* Campo Descripción */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Descripción *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Describe tu negocio o perfil..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                maxLength={200}
              />
              <Text style={styles.characterCount}>
                {descripcion.length}/200 caracteres
              </Text>
            </View>

            {/* Selección de imagen */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Imagen del perfil *</Text>
              <TouchableOpacity
                style={styles.imageSelector}
                onPress={pickImage}
              >
                {selectedImage ? (
                  <View style={styles.selectedImageContainer}>
                    <Image
                      source={{ uri: selectedImage.uri }}
                      style={styles.selectedImage}
                    />
                    <View style={styles.changeImageOverlay}>
                      <Ionicons name="camera" size={24} color="#1C1C1E" />
                      <Text style={styles.changeImageText}>Cambiar imagen</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={40} color="#fa6205" />
                    <Text style={styles.imagePlaceholderText}>
                      Seleccionar imagen
                    </Text>
                    <Text style={styles.imagePlaceholderSubtext}>
                      Formatos: JPG, PNG (máx. 5MB)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Botón de crear */}
            <TouchableOpacity
              style={[
                styles.createButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={createProfile}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="add" size={20} color="#FFF" />
                  <Text style={styles.createButtonText}>Crear Perfil</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Modal para editar perfil */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFF",
              borderRadius: 16,
              padding: 24,
              width: "85%",
            }}
          >
            <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>
              Editar Perfil
            </Text>
            <Text style={styles.inputLabel}>Nombre</Text>
            <TextInput
              style={styles.textInput}
              value={editNombre}
              onChangeText={setEditNombre}
              maxLength={20}
            />
            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={editDescripcion}
              onChangeText={setEditDescripcion}
              maxLength={200}
              multiline
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 20,
              }}
            >
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={[
                  styles.createButton,
                  { backgroundColor: "#DDD", marginRight: 10 },
                ]}
              >
                <Text style={[styles.createButtonText, { color: "#666" }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEditProfile}
                style={styles.createButton}
                disabled={editIsSubmitting}
              >
                {editIsSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.createButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para agregar/editar horario */}
      <Modal visible={horarioModalVisible} animationType="slide" transparent onRequestClose={() => setHorarioModalVisible(false)}>
        <View style={hm.overlay}>
          <View style={hm.sheet}>
            <View style={hm.grabber} />
            <View style={hm.headerRow}>
              <Text style={hm.title}>Agregar Horario</Text>
              <TouchableOpacity onPress={() => setHorarioModalVisible(false)} style={hm.closeBtn}>
                <Ionicons name="close" size={18} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {horarios.length > 0 && (
                <View style={hm.section}>
                  <Text style={hm.sectionLabel}>Horarios creados</Text>
                  {horarios.map((h) => (
                    <View key={h.id} style={hm.horarioCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={hm.horarioDay}>{diasSemana[h.dia_semana]?.label || "Día"}</Text>
                        <Text style={hm.horarioTime}>{h.hora_inicio} - {h.hora_fin}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleEditHorario(h)} style={hm.actionBtn}>
                        <Ionicons name="pencil" size={16} color="#999" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleEliminarHorario(h.id)} style={[hm.actionBtn, { backgroundColor: '#FEF2F2' }]}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>Día de la semana</Text>
              <View style={hm.dayRow}>
                {diasSemana.map((d) => (
                  <TouchableOpacity key={d.value} style={[hm.dayChip, diaSemana === d.value && hm.dayChipActive]} onPress={() => setDiaSemana(d.value)}>
                    <Text style={[hm.dayChipText, diaSemana === d.value && hm.dayChipTextActive]}>{d.label.slice(0, 2)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={hm.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Inicio</Text>
                  <TouchableOpacity style={hm.timeBtn} onPress={() => setShowInicioPicker(true)}>
                    <Ionicons name="time-outline" size={16} color="#fa6205" />
                    <Text style={hm.timeText}>{formatHora(horaInicio)}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Fin</Text>
                  <TouchableOpacity style={hm.timeBtn} onPress={() => setShowFinPicker(true)}>
                    <Ionicons name="time-outline" size={16} color="#fa6205" />
                    <Text style={hm.timeText}>{formatHora(horaFin)}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showInicioPicker && (
                <DateTimePicker value={horaInicio} mode="time" is24Hour={true} display={Platform.OS === "ios" ? "spinner" : "default"} minuteInterval={1}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === "android") setShowInicioPicker(false);
                    if (selectedDate) setHoraInicio(new Date(selectedDate));
                    if (Platform.OS === "ios" && event.type === "dismissed") setShowInicioPicker(false);
                  }}
                />
              )}

              {showFinPicker && (
                <DateTimePicker value={horaFin} mode="time" is24Hour={true} display={Platform.OS === "ios" ? "spinner" : "default"} minuteInterval={1}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === "android") setShowFinPicker(false);
                    if (selectedDate) setHoraFin(new Date(selectedDate));
                    if (Platform.OS === "ios" && event.type === "dismissed") setShowFinPicker(false);
                  }}
                />
              )}

              <View style={hm.buttons}>
                <TouchableOpacity onPress={() => setHorarioModalVisible(false)} style={hm.cancelBtn}>
                  <Text style={hm.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={horarioEditId ? handleGuardarEdicionHorario : handleCrearHorario} style={hm.saveBtn} disabled={isHorarioSubmitting}>
                  {isHorarioSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={hm.saveBtnText}>{horarioEditId ? "Guardar Cambios" : "Guardar"}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AlertaModal visible={alertVisible} mensaje={alertData.message} tipo={alertData.type} onCerrar={() => setAlertVisible(false)} onPrimary={alertData.onPrimary} primaryLabel={alertData.primaryLabel} />
    </SafeAreaView>
  );
}

const hm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 30, maxHeight: '85%' },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontFamily: 'Montserrat_800ExtraBold', color: '#1C1C1E' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F4F5', justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontFamily: 'Montserrat_600SemiBold', color: '#999', textTransform: 'uppercase', marginBottom: 8 },
  horarioCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', borderRadius: 14, padding: 12, marginBottom: 6, gap: 8 },
  horarioDay: { fontSize: 13, fontFamily: 'Montserrat_700Bold', color: '#1C1C1E' },
  horarioTime: { fontSize: 12, fontFamily: 'Montserrat_400Regular', color: '#71717A', marginTop: 2 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F4F4F5', justifyContent: 'center', alignItems: 'center' },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F4F4F5' },
  dayChipActive: { backgroundColor: '#fa6205' },
  dayChipText: { fontSize: 13, fontFamily: 'Montserrat_600SemiBold', color: '#71717A' },
  dayChipTextActive: { color: '#FFF', fontFamily: 'Montserrat_700Bold' },
  timeRow: { flexDirection: 'row', marginBottom: 16 },
  timeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F4F5', borderRadius: 14, padding: 14, gap: 8 },
  timeText: { fontSize: 14, fontFamily: 'Montserrat_600SemiBold', color: '#1C1C1E' },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: '#F4F4F5', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontFamily: 'Montserrat_700Bold', color: '#71717A' },
  saveBtn: { flex: 1, backgroundColor: '#fa6205', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontFamily: 'Montserrat_800ExtraBold', color: '#FFF' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F4F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1C1C1E', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 20,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Montserrat_800ExtraBold', color: '#FFF' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F4F4F5', marginHorizontal: 16, marginVertical: 12, borderRadius: 14, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  activeTab: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  tabText: { color: '#999', fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  activeTabText: { color: '#fa6205', fontFamily: 'Montserrat_800ExtraBold' },
  profilesTabContainer: { padding: 16, paddingTop: 4 },
  emptyProfilesContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyProfilesTitle: { color: '#1C1C1E', fontSize: 17, fontFamily: 'Montserrat_800ExtraBold', marginTop: 16, textAlign: 'center' },
  emptyProfilesSubtitle: { color: '#999', fontSize: 13, fontFamily: 'Montserrat_400Regular', marginTop: 6, textAlign: 'center' },
  createFirstProfileButton: { backgroundColor: '#fa6205', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, shadowColor: '#fa6205', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  createFirstProfileText: { color: '#FFF', fontSize: 15, fontFamily: 'Montserrat_800ExtraBold', marginLeft: 8 },
  scrollContainer: { flex: 1 },
  formContainer: { padding: 16 },
  sectionTitle: { color: '#1C1C1E', fontSize: 20, fontFamily: 'Montserrat_800ExtraBold', marginBottom: 16 },
  inputContainer: { marginBottom: 16 },
  inputLabel: { color: '#1C1C1E', fontSize: 13, fontFamily: 'Montserrat_700Bold', marginBottom: 6 },
  textInput: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, fontSize: 14, fontFamily: 'Montserrat_400Regular', color: '#1C1C1E', borderWidth: 1, borderColor: '#E8E8ED' },
  textArea: { height: 60, textAlignVertical: 'top' },
  characterCount: { color: '#999', fontSize: 12, fontFamily: 'Montserrat_400Regular', marginTop: 4, textAlign: 'right' },
  imageSelector: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  selectedImageContainer: { position: 'relative' },
  selectedImage: { width: '100%', height: 160, resizeMode: 'cover', borderRadius: 16 },
  changeImageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, alignItems: 'center' },
  changeImageText: { color: '#FFF', fontSize: 12, fontFamily: 'Montserrat_600SemiBold', marginTop: 4 },
  imagePlaceholder: { backgroundColor: '#FFF', borderRadius: 16, padding: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#DDD', borderStyle: 'dashed' },
  imagePlaceholderText: { color: '#fa6205', fontSize: 14, fontFamily: 'Montserrat_700Bold', marginTop: 8 },
  imagePlaceholderSubtext: { color: '#999', fontSize: 12, fontFamily: 'Montserrat_400Regular', marginTop: 4 },
  createButton: { backgroundColor: '#fa6205', borderRadius: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, shadowColor: '#fa6205', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  disabledButton: { opacity: 0.5 },
  createButtonText: { color: '#FFF', fontSize: 16, fontFamily: 'Montserrat_800ExtraBold', marginLeft: 8 },
  existingProfilesContainer: { padding: 16 },
  loadingProfilesContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { color: '#1C1C1E', fontSize: 14, fontFamily: 'Montserrat_400Regular', marginLeft: 10 },
  profileCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0' },
  profileImage: { width: 52, height: 52, borderRadius: 14, marginRight: 12, backgroundColor: '#F4F4F5' },
  profileInfo: { flex: 1 },
  profileName: { color: '#1C1C1E', fontSize: 15, fontFamily: 'Montserrat_700Bold', marginBottom: 2 },
  profileDescription: { color: '#999', fontSize: 12, fontFamily: 'Montserrat_400Regular' },
  horarioItem: { backgroundColor: '#FFF', borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#F0F0F0' },
  horarioText: { color: '#1C1C1E', fontSize: 13, fontFamily: 'Montserrat_600SemiBold', flex: 1 },
  horarioButtons: { flexDirection: 'row', alignItems: 'center' },
  horarioButton: { marginLeft: 10, padding: 5 },
  timePickerContainer: { backgroundColor: '#F4F4F5', borderRadius: 14, padding: 10, marginVertical: 10 },
  timePickerButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FFF', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E8E8ED' },
  timePickerButtonText: { color: '#1C1C1E', fontSize: 14, fontFamily: 'Montserrat_600SemiBold' },
  timePickerIcon: { marginLeft: 8 },
});
