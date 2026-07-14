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
} from "@expo-google-fonts/montserrat";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../../constants/url";
import DateTimePicker from "@react-native-community/datetimepicker";

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
        Alert.alert("Error", "No se encontró información de autenticación");
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
        Alert.alert(
          "Permisos requeridos",
          "Se necesitan permisos para acceder a la galería de fotos."
        );
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
      Alert.alert("Error", "No se pudo seleccionar la imagen");
    }
  };

  // Función para crear el perfil
  const createProfile = async () => {
    if (!nombre.trim()) {
      Alert.alert("Error", "El nombre del perfil es obligatorio");
      return;
    }
    if (!descripcion.trim()) {
      Alert.alert("Error", "La descripción del perfil es obligatoria");
      return;
    }
    if (!selectedImage) {
      Alert.alert("Error", "Debes seleccionar una imagen para el perfil");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");
      if (!token || !userData) {
        Alert.alert("Error", "No se encontró información de autenticación");
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
        Alert.alert("Éxito", "Perfil creado correctamente", [
          {
            text: "OK",
            onPress: () => {
              setNombre("");
              setDescripcion("");
              setSelectedImage(null);
              fetchExistingProfiles();
              setActiveTab("perfiles"); // Switch to profiles tab after creation
            },
          },
        ]);
      } else {
        let errorMessage = responseJson.message || "No se pudo crear el perfil";
        if (responseJson.errors) {
          const errors = Object.values(responseJson.errors).flat();
          errorMessage = errors.join("\n");
        }
        Alert.alert("Error", errorMessage);
      }
    } catch (error) {
      console.error("Error al crear perfil:", error);
      Alert.alert(
        "Error",
        "Ocurrió un error al crear el perfil. Inténtalo de nuevo."
      );
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
      Alert.alert("Error", "Todos los campos son obligatorios");
      return;
    }
    setEditIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "No autenticado");
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
        Alert.alert("Éxito", "Perfil actualizado correctamente");
        setEditModalVisible(false);
        fetchExistingProfiles();
      } else {
        Alert.alert("Error", data.message || "No se pudo actualizar el perfil");
      }
    } catch (error) {
      Alert.alert("Error", "Ocurrió un error al editar el perfil");
    } finally {
      setEditIsSubmitting(false);
    }
  };

  // Eliminar perfil
  const handleDeleteProfile = async (profileId) => {
    Alert.alert(
      "Eliminar perfil",
      "¿Estás seguro de que deseas eliminar este perfil?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("userToken");
              if (!token) {
                Alert.alert("Error", "No autenticado");
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
                Alert.alert("Eliminado", "Perfil eliminado correctamente");
                fetchExistingProfiles();
              } else {
                Alert.alert("Error", "No se pudo eliminar el perfil");
              }
            } catch (error) {
              Alert.alert("Error", "Ocurrió un error al eliminar el perfil");
            }
          },
        },
      ]
    );
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
        Alert.alert("Error", "No autenticado");
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
        Alert.alert("Éxito", "Horario guardado correctamente");
        setHorarioModalVisible(false);
      } else {
        const data = await response.json();
        Alert.alert("Error", data.message || "No se pudo guardar el horario");
      }
    } catch (error) {
      Alert.alert("Error", "Ocurrió un error al guardar el horario");
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
        Alert.alert("Error", "No autenticado");
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
        Alert.alert("Éxito", "Horario actualizado correctamente");
        setHorarioEditId(null);
        await fetchHorarios(horarioPerfilId);
      } else {
        const data = await response.json();
        Alert.alert(
          "Error",
          data.message || "No se pudo actualizar el horario"
        );
      }
    } catch (error) {
      Alert.alert("Error", "Ocurrió un error al editar el horario");
    } finally {
      setIsHorarioSubmitting(false);
    }
  };

  const handleEliminarHorario = async (id) => {
    Alert.alert(
      "Eliminar horario",
      "¿Estás seguro de que deseas eliminar este horario?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
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
                Alert.alert("Eliminado", "Horario eliminado correctamente");
                await fetchHorarios(horarioPerfilId);
              } else {
                Alert.alert("Error", "No se pudo eliminar el horario");
              }
            } catch (error) {
              Alert.alert("Error", "Ocurrió un error al eliminar el horario");
            }
          },
        },
      ]
    );
  };

  // ---------------------------------------------------

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Perfiles</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Pestañas */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "perfiles" && styles.activeTab]}
          onPress={() => setActiveTab("perfiles")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "perfiles" && styles.activeTabText,
            ]}
          >
            Perfiles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "crear" && styles.activeTab]}
          onPress={() => setActiveTab("crear")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "crear" && styles.activeTabText,
            ]}
          >
            Crear
          </Text>
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
                          <Text style={{ color: "#222", fontWeight: "bold" }}>
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
                  <Ionicons name="add" size={20} color="#000" />
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
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="add" size={20} color="#000" />
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
              backgroundColor: "#222",
              borderRadius: 10,
              padding: 20,
              width: "85%",
            }}
          >
            <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>
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
                <Text style={[styles.createButtonText, { color: "#1C1C1E" }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEditProfile}
                style={styles.createButton}
                disabled={editIsSubmitting}
              >
                {editIsSubmitting ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.createButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para agregar horario */}
      <Modal
        visible={horarioModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHorarioModalVisible(false)}
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
              backgroundColor: "#222",
              borderRadius: 10,
              padding: 20,
              width: "85%",
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>
                Agregar Horario
              </Text>
              {/* Lista de horarios existentes */}
              {horarios.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.inputLabel, { marginBottom: 8 }]}>
                    Horarios creados:
                  </Text>
                  {horarios.map((h) => (
                    <View key={h.id} style={styles.horarioItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.horarioText}>
                          <Text
                            style={{ color: "#fa6205", fontWeight: "bold" }}
                          >
                            {diasSemana[h.dia_semana]?.label || "Día"}:
                          </Text>
                          {h.hora_inicio} - {h.hora_fin}
                        </Text>
                      </View>
                      <View style={styles.horarioButtons}>
                        <TouchableOpacity
                          onPress={() => handleEditHorario(h)}
                          style={styles.horarioButton}
                        >
                          <Ionicons
                            name="create-outline"
                            size={20}
                            color="#fa6205"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleEliminarHorario(h.id)}
                          style={styles.horarioButton}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={20}
                            color="#ff4d4d"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.inputLabel}>Día de la semana</Text>
              <View
                style={{
                  backgroundColor: "#F0F0F0",
                  borderRadius: 10,
                  marginBottom: 15,
                }}
              >
                {diasSemana.map((d) => (
                  <TouchableOpacity
                    key={d.value}
                    style={{
                      padding: 10,
                      backgroundColor:
                        diaSemana === d.value ? "#fa6205" : "transparent",
                      borderRadius: 10,
                    }}
                    onPress={() => setDiaSemana(d.value)}
                  >
                    <Text
                      style={{
                        color: diaSemana === d.value ? "#222" : "#fff",
                        fontWeight: diaSemana === d.value ? "bold" : "normal",
                      }}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>Hora de inicio</Text>
              <TouchableOpacity
                style={[styles.textInput, { marginBottom: 10 }]}
                onPress={() => setShowInicioPicker(true)}
              >
                <Text style={{ color: "#1C1C1E" }}>{formatHora(horaInicio)}</Text>
              </TouchableOpacity>{" "}
              {showInicioPicker && (
                <DateTimePicker
                  value={horaInicio}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minuteInterval={1}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === "android") {
                      setShowInicioPicker(false);
                    }
                    if (selectedDate) {
                      // Asegurar que la fecha tenga los minutos exactos
                      const newDate = new Date(selectedDate);
                      setHoraInicio(newDate);
                    }
                    if (Platform.OS === "ios" && event.type === "dismissed") {
                      setShowInicioPicker(false);
                    }
                  }}
                />
              )}
              {Platform.OS === "ios" && showInicioPicker && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    marginTop: 10,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setShowInicioPicker(false)}
                    style={[
                      styles.createButton,
                      {
                        backgroundColor: "#DDD",
                        marginRight: 10,
                        paddingVertical: 8,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.createButtonText,
                        { color: "#1C1C1E", fontSize: 14 },
                      ]}
                    >
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowInicioPicker(false)}
                    style={[styles.createButton, { paddingVertical: 8 }]}
                  >
                    <Text style={[styles.createButtonText, { fontSize: 14 }]}>
                      Confirmar
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.inputLabel}>Hora de fin</Text>
              <TouchableOpacity
                style={[styles.textInput, { marginBottom: 10 }]}
                onPress={() => setShowFinPicker(true)}
              >
                <Text style={{ color: "#1C1C1E" }}>{formatHora(horaFin)}</Text>
              </TouchableOpacity>{" "}
              {showFinPicker && (
                <DateTimePicker
                  value={horaFin}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minuteInterval={1}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === "android") {
                      setShowFinPicker(false);
                    }
                    if (selectedDate) {
                      // Asegurar que la fecha tenga los minutos exactos
                      const newDate = new Date(selectedDate);
                      setHoraFin(newDate);
                    }
                    if (Platform.OS === "ios" && event.type === "dismissed") {
                      setShowFinPicker(false);
                    }
                  }}
                />
              )}
              {Platform.OS === "ios" && showFinPicker && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    marginTop: 10,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setShowFinPicker(false)}
                    style={[
                      styles.createButton,
                      {
                        backgroundColor: "#DDD",
                        marginRight: 10,
                        paddingVertical: 8,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.createButtonText,
                        { color: "#1C1C1E", fontSize: 14 },
                      ]}
                    >
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowFinPicker(false)}
                    style={[styles.createButton, { paddingVertical: 8 }]}
                  >
                    <Text style={[styles.createButtonText, { fontSize: 14 }]}>
                      Confirmar
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  marginTop: 20,
                }}
              >
                <TouchableOpacity
                  onPress={() => setHorarioModalVisible(false)}
                  style={[
                    styles.createButton,
                    { backgroundColor: "#DDD", marginRight: 10 },
                  ]}
                >
                  <Text style={[styles.createButtonText, { color: "#1C1C1E" }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
                {horarioEditId ? (
                  <TouchableOpacity
                    onPress={handleGuardarEdicionHorario}
                    style={styles.createButton}
                    disabled={isHorarioSubmitting}
                  >
                    {isHorarioSubmitting ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.createButtonText}>
                        Guardar Cambios
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleCrearHorario}
                    style={styles.createButton}
                    disabled={isHorarioSubmitting}
                  >
                    {isHorarioSubmitting ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.createButtonText}>Guardar</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: "#1C1C1E",
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
  },
  placeholder: {
    width: 34,
  },
  // Tab styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: "#fa6205",
  },
  tabText: {
    color: "#999",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
  },
  activeTabText: {
    color: "#000",
  },
  // Profiles tab container
  profilesTabContainer: {
    padding: 20,
  },
  // Enhanced empty state styles
  emptyProfilesContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyProfilesTitle: {
    color: "#1C1C1E",
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    marginTop: 20,
    textAlign: "center",
  },
  emptyProfilesSubtitle: {
    color: "#999",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  createFirstProfileButton: {
    backgroundColor: "#fa6205",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
  },
  createFirstProfileText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    marginLeft: 8,
  },
  // ...existing styles...
  scrollContainer: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  sectionTitle: {
    color: "#fa6205",
    fontSize: 20,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: "#1C1C1E",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    padding: 15,
    color: "#1C1C1E",
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  textArea: {
    height: 60,
    textAlignVertical: "top",
  },
  characterCount: {
    color: "#999",
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    marginTop: 5,
    textAlign: "right",
  },
  imageSelector: {
    borderRadius: 10,
    overflow: "hidden",
  },
  selectedImageContainer: {
    position: "relative",
  },
  selectedImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  changeImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 10,
    alignItems: "center",
  },
  changeImageText: {
    color: "#1C1C1E",
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    marginTop: 5,
  },
  imagePlaceholder: {
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#DDD",
    borderStyle: "dashed",
  },
  imagePlaceholderText: {
    color: "#fa6205",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    marginTop: 10,
  },
  imagePlaceholderSubtext: {
    color: "#999",
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    marginTop: 5,
  },
  createButton: {
    backgroundColor: "#fa6205",
    borderRadius: 25,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  createButtonText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    marginLeft: 8,
  },
  existingProfilesContainer: {
    padding: 20,
    paddingTop: 0,
    marginTop: 20,
  },
  loadingProfilesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    color: "#1C1C1E",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    marginLeft: 10,
  },
  profileCard: {
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: "#1C1C1E",
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    marginBottom: 5,
  },
  profileDescription: {
    color: "#999",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },
  horarioItem: {
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  horarioText: {
    color: "#1C1C1E",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },
  horarioButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  horarioButton: {
    marginLeft: 10,
    padding: 5,
  },
  // Styles for enhanced time picker
  timePickerContainer: {
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  timePickerButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#DDD",
    borderRadius: 8,
    marginBottom: 10,
  },
  timePickerButtonText: {
    color: "#1C1C1E",
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },
  timePickerIcon: {
    marginLeft: 10,
  },
});
