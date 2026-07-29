import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView, View, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Text, TouchableOpacity, Modal, Image, FlatList, TextInput } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useFonts, Montserrat_400Regular, Montserrat_700Bold, Montserrat_600SemiBold, Montserrat_800ExtraBold } from "@expo-google-fonts/montserrat";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import AlertaModal from "../../components/ErrorModal";

import ShopHeader from "../../components/comercio/dashboard/ShopHeader";
import SeccionCreator from "../../components/comercio/dashboard/SeccionCreator";
import ItemCreator from "../../components/comercio/dashboard/ItemCreator";
import Inventario from "../../components/comercio/dashboard/Inventario";
import BannerManager from "../../components/comercio/dashboard/BannerManager";

import useCategorias from "../../hooks/comercio/useCategorias";
import useProductos from "../../hooks/comercio/useProductos";
import useServicios from "../../hooks/comercio/useServicios";
import useShopInfo from "../../hooks/comercio/useShopInfo";
import useBanners from "../../hooks/comercio/useBanners";
import logger from "../../utils/logger";

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", green: "#10B981" };

function formatCOP(v) { if (v == null) return "$0"; return "$" + Number(v).toLocaleString("es-CO"); }
function renderStars(rating) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(<Ionicons key={i} name={i <= Math.round(rating) ? "star" : "star-outline"} size={14} color="#FFD700" style={{ marginRight: 2 }} />);
  }
  return stars;
}

export default function Dashboard() {
  const nav = useNavigation();
  const [fontsLoaded] = useFonts({ Montserrat_400Regular, Montserrat_700Bold, Montserrat_600SemiBold, Montserrat_800ExtraBold });

  const { categorias, fetchCategorias, createCategoria, updateCategoria, deleteCategoria } = useCategorias();
  const { productos, fetchProductos, createProducto, deleteProducto, toggleProducto } = useProductos();
  const { servicios, fetchServicios, createServicio, deleteServicio } = useServicios();
  const { establishmentName, profileImageUrl, shopActive, averageRating, ratings, tipoCategoria, loading: shopLoading, fetchShopInfo, toggleTienda, getCurrentLocation, saveShopLocation, userData } = useShopInfo();
  const { banners, loading: bannersLoading, fetchBanners, uploadBanner, toggleBanner, deleteBanner } = useBanners();

  const [refreshing, setRefreshing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });
  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => { setAlertData({ message, type, onPrimary, primaryLabel }); setAlertVisible(true); };

  // Business location
  const locationText = userData?.ciudad || userData?.direccion || userData?.direccion_principal || "";

  // Modals
  const [ratingsModal, setRatingsModal] = useState(false);
  const [locationModal, setLocationModal] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [editCatModal, setEditCatModal] = useState(false);
  const [deleteCatModal, setDeleteCatModal] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);
  const [editCatName, setEditCatName] = useState("");
  const [deleteItemModal, setDeleteItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const loadAll = async () => { await Promise.all([fetchShopInfo(), fetchCategorias(), fetchProductos(), fetchServicios(), fetchBanners()]); };

  useFocusEffect(useCallback(() => {
    loadAll();
  }, []));
  const onRefresh = async () => { setRefreshing(true); await loadAll(); setRefreshing(false); };

  const handleCreateCategoria = async (nombre) => { try { await createCategoria(nombre); } catch { showAlert("Error al crear sección", "error"); } };
  const handleEditCategoria = async () => { try { await updateCategoria(selectedCat.id, editCatName); setEditCatModal(false); } catch { showAlert("Error al editar", "error"); } };
  const handleDeleteCategoria = async () => { try { await deleteCategoria(selectedCat.id); setDeleteCatModal(false); } catch { showAlert("Error al eliminar", "error"); } };
  const openEditCat = (cat) => { setSelectedCat(cat); setEditCatName(cat.nombre); setEditCatModal(true); };
  const openDeleteCat = (cat) => { setSelectedCat(cat); setDeleteCatModal(true); };
  const handleCreateItem = async (form) => { try { if (form.tipo === "servicio") await createServicio(form); else await createProducto(form); showAlert("¡Creado exitosamente!", "success"); } catch { showAlert("Error al crear", "error"); } };
  const confirmDeleteItem = (item) => { setSelectedItem(item); setDeleteItemModal(true); };
  const handleDeleteItemConfirm = async () => {
    if (!selectedItem) return;
    try { await deleteProducto(selectedItem.id); setDeleteItemModal(false); showAlert("Eliminado exitosamente", "success"); } catch { showAlert("Error al eliminar", "error"); }
  };
  const handleEditItem = (item) => {
    if (item.tipo === "servicio") nav.navigate("EditarServicio", { serviceId: item.id });
    else nav.navigate("EditarProducto", { productId: item.id });
  };
  const handleToggleItem = (item) => {
    if (item.tipo === "servicio") return;
    const isActive = item.activo === undefined ? true : item.activo !== 0;
    showAlert(
      isActive ? "¿Desactivar este producto?" : "¿Activar este producto?",
      "confirm",
      async () => { try { await toggleProducto(item); } catch { showAlert("Error al cambiar estado", "error"); } },
      isActive ? "Desactivar" : "Activar"
    );
  };

  const handleOpenLocation = async () => {
    setLocationLoading(true);
    try {
      const coords = await getCurrentLocation();
      setMapRegion({ latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
      setLocationModal(true);
    } catch { showAlert("No se pudo obtener la ubicación", "error"); }
    setLocationLoading(false);
  };
  const handleSaveLocation = async () => { try { await saveShopLocation(); setLocationModal(false); showAlert("Ubicación guardada", "success"); } catch { showAlert("Error al guardar ubicación", "error"); } };
  const handleSolicitarRider = () => nav.navigate("StepUno");

  const handleUploadBanner = async (foto) => { try { await uploadBanner(foto); } catch { showAlert("Error al subir banner", "error"); } };
  const handleToggleBanner = async (banner) => { try { await toggleBanner(banner); } catch {} };
  const handleDeleteBanner = async (id) => { try { await deleteBanner(id); } catch {} };

  if (!fontsLoaded) return <SafeAreaView style={ds.safe}><ActivityIndicator size="large" color={C.brand} /></SafeAreaView>;

  const allItems = [...productos.map(p => ({ ...p, tipo: "producto" })), ...servicios.map(s => ({ ...s, tipo: "servicio", categoria_id: s.categoria_id || categorias[0]?.id }))];

  return (
    <SafeAreaView style={ds.safe}>
      <View style={ds.root}>
        <ShopHeader business={{ nombre: establishmentName, ubicacion: locationText }} image={profileImageUrl} />
        <ScrollView style={ds.scroll} contentContainerStyle={ds.scrollContent} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.brand]} />}>

          {/* Ratings + Shop Toggle */}
          <View style={ds.row}>
            <TouchableOpacity style={[ds.statCard, { flex: 1 }]} onPress={() => setRatingsModal(true)}>
              <Text style={ds.statVal}>{averageRating > 0 ? averageRating.toFixed(1) : "--"}</Text>
              <View style={{ flexDirection: "row", marginVertical: 2 }}>{renderStars(averageRating)}</View>
              <Text style={ds.statSub}>{ratings.length} {ratings.length === 1 ? "calificación" : "calificaciones"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ds.statCard, { flex: 1 }]} onPress={toggleTienda}>
              <View style={[ds.dot, { backgroundColor: shopActive ? C.green : "#EF4444" }]} />
              <Text style={[ds.statVal, { fontSize: 14 }]}>{shopActive ? "Visible" : "Oculto"}</Text>
              <Text style={ds.statSub}>{shopActive ? "Toca para ocultar tu negocio" : "Toca para mostrar tu negocio"}</Text>
            </TouchableOpacity>
          </View>

          {/* Rider Banner */}
          <TouchableOpacity style={ds.riderBanner} onPress={handleSolicitarRider}>
            <Ionicons name="car" size={22} color="#FFF" />
            <View style={{ flex: 1 }}>
              <Text style={ds.riderTitle}>Solicitar un Rider</Text>
              <Text style={ds.riderSub}>Envía tus productos con un conductor</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFF" />
          </TouchableOpacity>

          {/* Actions */}
          <View style={ds.actionRow}>
            <TouchableOpacity style={ds.actionBtn} onPress={handleOpenLocation}>
              {locationLoading ? <ActivityIndicator size="small" color={C.ink} /> : <Ionicons name="location-outline" size={18} color={C.ink} />}
              <Text style={ds.actionText}>Guardar ubicación</Text>
            </TouchableOpacity>
            {tipoCategoria === "servicios" && (
              <TouchableOpacity style={ds.actionBtn} onPress={() => nav.navigate("CrearPerfil")}>
                <Ionicons name="person-add" size={18} color={C.ink} />
                <Text style={ds.actionText}>Crear Perfil</Text>
              </TouchableOpacity>
            )}
          </View>

          <BannerManager banners={banners} loading={bannersLoading} onUpload={handleUploadBanner} onToggle={handleToggleBanner} onDelete={handleDeleteBanner} />

          <SeccionCreator categorias={categorias} onCreate={handleCreateCategoria} onEdit={openEditCat} onDelete={openDeleteCat} />
          <ItemCreator categorias={categorias} onCreate={handleCreateItem} showServicios={tipoCategoria === "servicios"} />
          <Inventario categorias={categorias} productos={allItems} onDelete={confirmDeleteItem} onToggle={handleToggleItem} onEdit={handleEditItem} />
          <View style={{ height: 60 }} />
        </ScrollView>
      </View>

      {/* Ratings Modal */}
      <Modal visible={ratingsModal} transparent animationType="slide">
        <View style={ds.sheetBg}><View style={ds.sheet}>
          <View style={ds.sheetBar} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={ds.sheetTitle}>Calificaciones</Text>
            <TouchableOpacity onPress={() => setRatingsModal(false)}><Ionicons name="close" size={22} color={C.muted} /></TouchableOpacity>
          </View>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 42, fontFamily: "Montserrat_800ExtraBold", color: C.ink }}>{averageRating.toFixed(1)}</Text>
            <View style={{ flexDirection: "row", marginVertical: 4 }}>{renderStars(averageRating)}</View>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 4, fontFamily: "Montserrat_400Regular" }}>Promedio general</Text>
          </View>
          <FlatList data={ratings} keyExtractor={r => String(r.id)} style={{ maxHeight: 300 }}
            renderItem={({ item: r }) => (
              <View style={ds.reviewItem}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: "Montserrat_700Bold", color: C.ink }}>{r.user?.nombre_completo || "Anónimo"}</Text>
                  <Text style={{ fontSize: 11, color: "#999", fontFamily: "Montserrat_400Regular" }}>{new Date(r.created_at).toLocaleDateString("es-CO")}</Text>
                </View>
                <View style={{ flexDirection: "row", marginVertical: 4 }}>{renderStars(r.puntuacion_restaurante)}</View>
                {r.comentario_restaurante ? <Text style={{ color: "#555", fontStyle: "italic", fontFamily: "Montserrat_400Regular" }}>"{r.comentario_restaurante}"</Text> : null}
                <View style={{ borderTopWidth: 1, borderTopColor: "#EEE", marginTop: 6, paddingTop: 6 }}>
                  <Text style={{ fontSize: 11, color: "#999", fontFamily: "Montserrat_400Regular" }}>Pedido #{r.id} · {formatCOP(r.costo_total)}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={{ textAlign: "center", color: "#999", marginTop: 20, fontFamily: "Montserrat_400Regular" }}>No hay calificaciones aún</Text>}
          />
        </View></View>
      </Modal>

      {/* Location Modal */}
      <Modal visible={locationModal} transparent animationType="slide">
        <View style={ds.modalBg}><View style={[ds.modalCard, { width: "95%" }]}>
          <Text style={ds.modalTitle}>Guardar ubicación</Text>
          {mapRegion && <View style={{ width: "100%", height: 250, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}><MapView style={{ flex: 1 }} region={mapRegion}><Marker coordinate={{ latitude: mapRegion.latitude, longitude: mapRegion.longitude }} title="Mi negocio" /></MapView></View>}
          <TouchableOpacity style={ds.modalPrimary} onPress={handleSaveLocation}><Text style={ds.modalPrimaryText}>Guardar esta ubicación</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setLocationModal(false)} style={{ marginTop: 8 }}><Text style={ds.modalLater}>Cancelar</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Edit Category Modal */}
      <Modal visible={editCatModal} transparent animationType="fade">
        <View style={ds.modalBg}><View style={ds.modalCard}>
          <Text style={ds.modalTitle}>Editar sección</Text>
          <TextInput style={ds.catInput} value={editCatName} onChangeText={setEditCatName} placeholder="Nuevo nombre..." placeholderTextColor="#999" />
          <TouchableOpacity style={ds.modalPrimary} onPress={handleEditCategoria}><Text style={ds.modalPrimaryText}>Guardar cambios</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setEditCatModal(false)} style={{ marginTop: 8 }}><Text style={ds.modalLater}>Cancelar</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Delete Category Modal */}
      <Modal visible={deleteCatModal} transparent animationType="fade">
        <View style={ds.modalBg}><View style={ds.modalCard}>
          <Ionicons name="warning" size={40} color="#EF4444" style={{ marginBottom: 12 }} />
          <Text style={ds.modalTitle}>Eliminar sección</Text>
          <Text style={ds.modalMsg}>¿Estás seguro de eliminar "{selectedCat?.nombre}"?</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity style={[ds.modalPrimary, { flex: 1, backgroundColor: "#FEE" }]} onPress={() => setDeleteCatModal(false)}><Text style={[ds.modalPrimaryText, { color: "#EF4444" }]}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={[ds.modalPrimary, { flex: 1 }]} onPress={handleDeleteCategoria}><Text style={ds.modalPrimaryText}>Eliminar</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* Delete Item Modal */}
      <Modal visible={deleteItemModal} transparent animationType="fade">
        <View style={ds.modalBg}><View style={ds.modalCard}>
          <Ionicons name="warning" size={40} color="#EF4444" style={{ marginBottom: 12 }} />
          <Text style={ds.modalTitle}>Eliminar producto</Text>
          <Text style={ds.modalMsg}>¿Estás seguro de eliminar "{selectedItem?.nombre}"?</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity style={[ds.modalPrimary, { flex: 1, backgroundColor: "#FEE" }]} onPress={() => setDeleteItemModal(false)}>
              <Text style={[ds.modalPrimaryText, { color: "#EF4444" }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ds.modalPrimary, { flex: 1 }]} onPress={handleDeleteItemConfirm}>
              <Text style={ds.modalPrimaryText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      <AlertaModal visible={alertVisible} mensaje={alertData.message} tipo={alertData.type} onCerrar={() => setAlertVisible(false)} />
    </SafeAreaView>
  );
}

const ds = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 12 },
  row: { flexDirection: "row", gap: 12, marginBottom: 14 },
  statCard: { backgroundColor: C.surface, borderRadius: 18, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#F0F0F0" },
  statVal: { fontSize: 24, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  statSub: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, marginBottom: 4 },
  riderBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.brand, borderRadius: 16, padding: 14, marginBottom: 14 },
  riderTitle: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  riderSub: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: "rgba(255,255,255,0.7)", marginTop: 2 },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#F0F0F0" },
  actionText: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: C.ink },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { backgroundColor: C.surface, borderRadius: 24, padding: 24, width: "90%", alignItems: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: C.ink, marginBottom: 10, textAlign: "center" },
  modalMsg: { fontSize: 14, fontFamily: "Montserrat_400Regular", color: C.muted, textAlign: "center", marginBottom: 20, lineHeight: 20 },
  modalPrimary: { backgroundColor: C.brand, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, width: "100%", alignItems: "center" },
  modalPrimaryText: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  modalLater: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: C.muted, paddingVertical: 8 },
  catInput: { width: "100%", backgroundColor: C.bg, padding: 12, borderRadius: 12, fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: C.ink, marginBottom: 16 },
  sheetBg: { flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: "80%" },
  sheetBar: { width: 40, height: 5, borderRadius: 3, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  reviewItem: { marginBottom: 14, backgroundColor: "#F9F9F9", padding: 12, borderRadius: 12 },
  mapCard: { backgroundColor: C.surface, borderRadius: 24, padding: 24, width: "95%", alignItems: "center" },
});
