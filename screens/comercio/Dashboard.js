import React, { useState, useEffect, useCallback, useRef } from "react";
import { SafeAreaView, View, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Text, TouchableOpacity, Modal, Image, FlatList, TextInput } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useFonts, Montserrat_400Regular, Montserrat_700Bold, Montserrat_600SemiBold, Montserrat_800ExtraBold } from "@expo-google-fonts/montserrat";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import AlertaModal from "../../components/ErrorModal";

import ShopHeader from "../../components/comercio/dashboard/ShopHeader";
import SeccionCreator from "../../components/comercio/dashboard/SeccionCreator";
import ItemCreator from "../../components/comercio/dashboard/ItemCreator";
import Inventario from "../../components/comercio/dashboard/Inventario";
import BannerManager from "../../components/comercio/dashboard/BannerManager";
import OnboardingGuide from "../../components/comercio/dashboard/OnboardingGuide";
import LocationPickerModal from "../../components/comercio/dashboard/LocationPickerModal";
import HorariosIntroModal from "../../components/comercio/dashboard/HorariosIntroModal";

import useCategorias from "../../hooks/comercio/useCategorias";
import useProductos from "../../hooks/comercio/useProductos";
import useServicios from "../../hooks/comercio/useServicios";
import useShopInfo from "../../hooks/comercio/useShopInfo";
import useBanners from "../../hooks/comercio/useBanners";
import useHorarios from "../../hooks/comercio/useHorarios";
import useOnboardingStatus from "../../hooks/comercio/useOnboardingStatus";
import logger from "../../utils/logger";

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", green: "#10B981" };

function toMinutes(t) {
  const parts = String(t || "00:00").slice(0, 5).split(":");
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}
const DIA_KEYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
function computeOpenNow(horarios, _tick) {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const today = DIA_KEYS[now.getDay()];
  const yesterday = DIA_KEYS[(now.getDay() + 6) % 7];
  const th = (horarios || []).find((h) => h.dia === today && h.activo);
  if (th) {
    const ap = toMinutes(th.hora_apertura);
    const ci = toMinutes(th.hora_cierre);
    if (ci > ap) {
      if (cur >= ap && cur <= ci) return { open: true, cierra: th.hora_cierre };
    } else if (cur >= ap) {
      return { open: true, cierra: th.hora_cierre };
    }
    return { open: false, abre: th.hora_apertura };
  }
  const yh = (horarios || []).find((h) => h.dia === yesterday && h.activo);
  if (yh) {
    const ap = toMinutes(yh.hora_apertura);
    const ci = toMinutes(yh.hora_cierre);
    if (ci < ap && cur <= ci) return { open: true, cierra: yh.hora_cierre };
  }
  return { open: false };
}
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
  const { establishmentName, profileImageUrl, shopActive, averageRating, ratings, tipoCategoria, loading: shopLoading, fetchShopInfo, getCurrentLocation, saveShopLocation, userData, currentLocation, shopLocation, shopAddress } = useShopInfo();
  const { banners, loading: bannersLoading, fetchBanners, uploadBanner, toggleBanner, deleteBanner } = useBanners();
  const { horarios, fetchHorarios } = useHorarios();
  const { status: setupStatus, fetchStatus } = useOnboardingStatus();
  const horariosCount = horarios.filter((h) => h.activo).length;

  const [refreshing, setRefreshing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });
  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => { setAlertData({ message, type, onPrimary, primaryLabel }); setAlertVisible(true); };

  // Business location
  const locationText = shopAddress || setupStatus?.ubicacion?.direccion || userData?.direccion_principal || userData?.ciudad || userData?.direccion || "";

  // Modals
  const [ratingsModal, setRatingsModal] = useState(false);
  const [locationModal, setLocationModal] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [editCatModal, setEditCatModal] = useState(false);
  const [deleteCatModal, setDeleteCatModal] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);
  const [editCatName, setEditCatName] = useState("");
  const [deleteItemModal, setDeleteItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Onboarding / paso a paso (se muestra en cada inicio; el ? la reabre)
  const GUIDE_KEY = "comercio_guia_v1";
  const GUIDE_MIN_KEY = "comercio_guia_min";
  const [guideVisible, setGuideVisible] = useState(false);
  const [horariosIntroVisible, setHorariosIntroVisible] = useState(false);
  const [highlight, setHighlight] = useState(null);
  const [guideExpanded, setGuideExpanded] = useState(null);
  const scrollRef = useRef(null);
  const sectionY = useRef({});

  useEffect(() => {
    (async () => {
      try {
        const min = await AsyncStorage.getItem(GUIDE_MIN_KEY);
        if (min) setGuideExpanded(false);
        else setGuideExpanded(null);
      } catch {}
    })();
  }, []);
  const setGuideMinimized = async (min) => {
    setGuideExpanded(min ? false : true);
    try {
      if (min) await AsyncStorage.setItem(GUIDE_MIN_KEY, "1");
      else await AsyncStorage.removeItem(GUIDE_MIN_KEY);
    } catch {}
  };
  const closeGuide = async () => {
    setGuideVisible(false);
    try { await AsyncStorage.setItem(GUIDE_KEY, "1"); } catch {}
  };

  const isServicios = tipoCategoria === "servicios" || setupStatus?.is_servicios;
  const apiSteps = setupStatus?.steps || {};
  const allItemsCount = productos.length + servicios.length;
  const hasLocation = apiSteps.ubicacion ?? !!(shopLocation || shopAddress || userData?.latitud || userData?.longitud || currentLocation);
  const hasHorarios = apiSteps.horarios ?? horariosCount > 0;
  const hasSecciones = apiSteps.secciones ?? categorias.length > 0;
  const hasCatalogo = apiSteps.catalogo ?? allItemsCount > 0;
  const hasPerfil = setupStatus?.is_servicios
    ? (setupStatus?.steps?.perfil ?? (setupStatus?.counts?.perfiles || 0) > 0)
    : true;
  const setupComplete = hasLocation && hasHorarios && hasSecciones && hasCatalogo && hasPerfil;
  const guideCollapsed = guideExpanded === false || (guideExpanded == null && setupComplete);

  const openNow = computeOpenNow(horarios, nowTick);
  const serverAbierto = setupStatus?.esta_abierto;
  const abiertoAhora = hasHorarios ? (serverAbierto ?? openNow.open) : false;
  const catalogoListo = hasCatalogo && (!isServicios || hasPerfil);
  const esPublicoAPI = setupStatus?.es_publico;
  const esPublico = esPublicoAPI ?? (hasLocation && catalogoListo && abiertoAhora);
  const motivoNoPublico = setupStatus?.motivo_no_publico
    || (!hasLocation ? "Te falta marcar la ubicación de tu negocio"
      : !catalogoListo ? (isServicios ? (!hasPerfil ? "Te falta crear tu perfil comercial" : "Te falta crear tu primer servicio") : "Te falta crear tu primer producto")
      : !hasHorarios ? "Te falta configurar tus horarios"
      : (openNow.cierra ? `Abierto ahora · cierra ${String(openNow.cierra).slice(0, 5)}` : null) || null);
  const goMotivo = () => {
    if (!hasLocation) handleOpenLocation();
    else if (!catalogoListo) scrollTo("producto");
    else nav.navigate("Horarios");
  };

  const doneMap = {
    ubicacion: hasLocation,
    horarios: hasHorarios,
    perfil: hasPerfil,
    seccion: hasSecciones,
    producto: hasCatalogo,
  };
  const firstMissing = ["ubicacion", "horarios", ...(isServicios ? ["perfil"] : []), "seccion", "producto"]
    .find((k) => !doneMap[k]) || null;
  const [guideStartAt, setGuideStartAt] = useState(null);
  const [celebrateVisible, setCelebrateVisible] = useState(false);
  const prevCompleteRef = useRef(null);

  useEffect(() => {
    if (setupStatus?.progress == null) return;
    if (prevCompleteRef.current == null) {
      prevCompleteRef.current = setupComplete;
      return;
    }
    if (prevCompleteRef.current === false && setupComplete === true) {
      setCelebrateVisible(true);
    }
    prevCompleteRef.current = setupComplete;
  }, [setupComplete, setupStatus?.progress?.done]);

  const openGuideAt = (stepKey = null) => {
    setGuideStartAt(stepKey);
    setGuideVisible(true);
  };

  const scrollTo = (key) => {
    const y = sectionY.current[key];
    if (y != null && scrollRef.current) {
      setHighlight(key);
      scrollRef.current.scrollTo({ y: Math.max(0, y - 20), animated: true });
      setTimeout(() => setHighlight(null), 2600);
    } else {
      setHighlight(key);
      setTimeout(() => setHighlight(null), 2600);
    }
  };

  const handleGuideAction = async (stepKey) => {
    await closeGuide();
    if (stepKey === "ubicacion") handleOpenLocation();
    else if (stepKey === "horarios") setHorariosIntroVisible(true);
    else if (stepKey === "perfil") nav.navigate("CrearPerfil");
    else if (stepKey === "seccion") scrollTo("seccion");
    else if (stepKey === "producto") scrollTo("producto");
  };

  const loadAll = useCallback(async () => {
    await Promise.all([fetchShopInfo(), fetchCategorias(), fetchProductos(), fetchServicios(), fetchBanners(), fetchHorarios()]);
    await fetchStatus().catch(() => {});
  }, [fetchShopInfo, fetchCategorias, fetchProductos, fetchServicios, fetchBanners, fetchHorarios, fetchStatus]);

  useFocusEffect(useCallback(() => {
    loadAll();
  }, [loadAll]));
  const onRefresh = async () => { setRefreshing(true); await loadAll(); setRefreshing(false); };

  const refreshStatus = useCallback(async () => {
    await fetchStatus().catch(() => {});
  }, [fetchStatus]);

  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const handleCreateCategoria = async (nombre) => { try { await createCategoria(nombre); refreshStatus(); } catch (e) { showAlert(e?.message || "Error al crear sección", "error"); } };
  const handleEditCategoria = async () => { try { await updateCategoria(selectedCat.id, editCatName); setEditCatModal(false); refreshStatus(); } catch { showAlert("Error al editar", "error"); } };
  const handleDeleteCategoria = async () => { try { await deleteCategoria(selectedCat.id); setDeleteCatModal(false); showAlert("Sección ocultada. El historial no se afecta.", "success"); refreshStatus(); } catch (e) { setDeleteCatModal(false); showAlert(e?.message || "Error al eliminar", "error"); } };
  const openEditCat = (cat) => { setSelectedCat(cat); setEditCatName(cat.nombre); setEditCatModal(true); };
  const openDeleteCat = (cat) => { setSelectedCat(cat); setDeleteCatModal(true); };
  const handleCreateItem = async (form) => { try { if (form.tipo === "servicio") await createServicio(form); else await createProducto(form); showAlert("¡Creado exitosamente!", "success"); refreshStatus(); } catch (e) { showAlert(e?.message || "Error al crear", "error"); } };
  const confirmDeleteItem = (item) => { setSelectedItem(item); setDeleteItemModal(true); };
  const handleDeleteItemConfirm = async () => {
    if (!selectedItem) return;
    try {
      if (selectedItem.tipo === "servicio") await deleteServicio(selectedItem.id);
      else await deleteProducto(selectedItem.id);
      setDeleteItemModal(false);
      setSelectedItem(null);
      showAlert("Ocultado del catálogo. El historial de pedidos no se afecta.", "success");
      refreshStatus();
    } catch (e) { setDeleteItemModal(false); showAlert(e?.message || "Error al eliminar", "error"); }
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
      let coords = null;
      if (shopLocation?.latitude) {
        coords = shopLocation;
      } else {
        try {
          coords = await getCurrentLocation();
        } catch {
          coords = null;
        }
      }
      const fallback = coords || { latitude: 4.60971, longitude: -74.08175 };
      setMapRegion({ latitude: fallback.latitude, longitude: fallback.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
      setLocationModal(true);
    } catch {
      setMapRegion({ latitude: 4.60971, longitude: -74.08175, latitudeDelta: 0.02, longitudeDelta: 0.02 });
      setLocationModal(true);
    }
    setLocationLoading(false);
  };
  const handleSaveLocation = async (payload) => {
    setSavingLocation(true);
    try {
      await saveShopLocation(payload || mapRegion);
      setLocationModal(false);
      showAlert("¡Ubicación guardada! Puedes actualizarla cuando quieras desde “Mi ubicación”.", "success");
      await fetchShopInfo();
      await refreshStatus();
    } catch (e) {
      showAlert(e?.message && !String(e.message).startsWith("Error 4") ? e.message : "No pudimos guardar tu ubicación. Revisa tu conexión e inténtalo de nuevo.", "error");
    }
    setSavingLocation(false);
  };
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
        <ScrollView ref={scrollRef} style={ds.scroll} contentContainerStyle={ds.scrollContent} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.brand]} />}>

          {/* Paso a paso / checklist */}
          <View style={ds.guideCard}>
            <TouchableOpacity
              style={ds.guideHeader}
              onPress={() => setGuideMinimized(!guideCollapsed)}
              activeOpacity={0.8}
            >
              <View style={[ds.guideIcon, setupComplete && ds.guideIconDone]}>
                <Ionicons
                  name={setupComplete ? "checkmark-circle" : "rocket-outline"}
                  size={20}
                  color={setupComplete ? "#FFF" : C.brand}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ds.guideTitle}>
                  {setupComplete ? "Tu negocio está listo" : "Configura tu negocio paso a paso"}
                </Text>
                <Text style={ds.guideSub}>
                  {guideCollapsed
                    ? "Toca para expandir"
                    : (setupStatus?.progress?.done != null
                      ? `${setupStatus.progress.done}/${setupStatus.progress.total} pasos listos`
                      : "Toca para minimizar")}
                </Text>
              </View>
              <Ionicons name={guideCollapsed ? "chevron-down" : "chevron-up"} size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            {!guideCollapsed && (
              <>
                <View style={ds.checkList}>
                  {[
                    { key: "ubicacion", label: "Ubicación del negocio", done: hasLocation, hint: locationText || "Falta marcar tu punto en el mapa" },
                    { key: "horarios", label: "Horarios de atención", done: hasHorarios, hint: hasHorarios ? `${horariosCount || setupStatus?.counts?.horarios_activos || 0} días activos` : "Falta configurar días y horas" },
                    ...(isServicios ? [{ key: "perfil", label: "Perfil comercial", done: hasPerfil, hint: hasPerfil ? `${setupStatus?.counts?.perfiles || 0} perfiles` : "Falta crear tu perfil" }] : []),
                    { key: "seccion", label: "Secciones", done: hasSecciones, hint: hasSecciones ? `${categorias.length} creadas` : "Falta crear tu primera sección" },
                    { key: "producto", label: isServicios ? "Servicios" : "Productos", done: hasCatalogo, hint: hasCatalogo ? `${allItemsCount} en catálogo` : "Falta añadir tu catálogo" },
                  ].map((row) => (
                    <TouchableOpacity
                      key={row.key}
                      style={ds.checkRow}
                      onPress={() => {
                        if (row.done && row.key !== "horarios") {
                          scrollTo(row.key === "producto" ? "producto" : row.key === "seccion" ? "seccion" : row.key);
                          if (row.key === "perfil") nav.navigate("CrearPerfil");
                          if (row.key === "ubicacion") handleOpenLocation();
                          return;
                        }
                        openGuideAt(row.key);
                      }}
                    >
                      <View style={[ds.checkDot, row.done ? ds.checkDotDone : ds.checkDotTodo]}>
                        {row.done && <Ionicons name="checkmark" size={13} color="#FFF" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={ds.checkLabel}>{row.label}</Text>
                        <Text style={ds.checkHint} numberOfLines={1}>{row.done ? `${row.hint} · Toca para ver` : row.hint}</Text>
                      </View>
                      {!row.done && <Text style={ds.checkBadge}>Falta</Text>}
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={ds.guideBtn} onPress={() => openGuideAt(firstMissing)} activeOpacity={0.85}>
                  <Ionicons name="play-circle-outline" size={18} color="#FFF" />
                  <Text style={ds.guideBtnText}>{firstMissing ? "Continuar donde me quedé" : "Ver guía de inicio"}</Text>
                </TouchableOpacity>
                <Text style={ds.guideHint}>Son {isServicios ? "5" : "4"} pasos: ubicación, horarios{isServicios ? ", perfil" : ""}, secciones y catálogo.</Text>
              </>
            )}
          </View>

          {/* Ratings + Horarios */}
          <View style={ds.row}>
            <TouchableOpacity style={[ds.statCard, { flex: 1 }]} onPress={() => setRatingsModal(true)}>
              <Text style={ds.statVal}>{averageRating > 0 ? averageRating.toFixed(1) : "--"}</Text>
              <View style={{ flexDirection: "row", marginVertical: 2 }}>{renderStars(averageRating)}</View>
              <Text style={ds.statSub}>{ratings.length} {ratings.length === 1 ? "calificación" : "calificaciones"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ds.statCard, { flex: 1 }, highlight === "horarios" && ds.highlightBox, !esPublico && ds.statCardAlert]}
              onPress={() => (esPublico ? nav.navigate("Horarios") : goMotivo())}
              onLayout={(e) => { sectionY.current.horarios = e.nativeEvent.layout.y; }}
            >
              <View style={ds.horarioTop}>
                <Ionicons name="time-outline" size={22} color={abiertoAhora ? C.green : C.brand} style={{ marginBottom: 4 }} />
                <View style={[ds.openPill, abiertoAhora ? ds.openPillOn : ds.openPillOff]}>
                  <View style={[ds.openDot, abiertoAhora ? ds.openDotOn : ds.openDotOff]} />
                  <Text style={[ds.openPillText, abiertoAhora ? ds.openPillTextOn : ds.openPillTextOff]}>
                    {abiertoAhora ? "Abierto" : "Cerrado"}
                  </Text>
                </View>
              </View>
              <Text style={[ds.statVal, { fontSize: 14 }]}>Mis horarios</Text>
              <Text style={ds.statSub}>
                {hasHorarios
                  ? (abiertoAhora
                      ? (openNow.cierra ? `Cierra ${String(openNow.cierra).slice(0, 5)}` : "Abierto ahora")
                      : (openNow.abre ? `Abre ${String(openNow.abre).slice(0, 5)}` : "Cerrado ahora"))
                  : "Configura días y horas"}
              </Text>
              <View style={[ds.pubRow, esPublico ? ds.pubRowOn : ds.pubRowOff]}>
                <View style={[ds.pubDot, esPublico ? ds.pubDotOn : ds.pubDotOff]} />
                <Text style={[ds.pubText, esPublico ? ds.pubTextOn : ds.pubTextOff]} numberOfLines={1}>
                  {esPublico ? "Público · visible" : (motivoNoPublico || "No público")}
                </Text>
              </View>
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

          {/* Ubicación + Perfil en el mismo row */}
          <View style={ds.row}>
            <View
              style={[{ flex: 1 }, highlight === "ubicacion" && ds.highlightBox, { borderRadius: 14 }]}
              onLayout={(e) => { sectionY.current.ubicacion = e.nativeEvent.layout.y; }}
            >
              <TouchableOpacity style={[ds.miniCard, { flex: 1 }]} onPress={handleOpenLocation} activeOpacity={0.85}>
                <View style={ds.miniIcon}>
                  {locationLoading ? <ActivityIndicator size="small" color={C.brand} /> : <Ionicons name="location" size={18} color={C.brand} />}
                </View>
                <Text style={ds.miniTitle} numberOfLines={1}>Mi ubicación</Text>
                <Text style={ds.miniSub} numberOfLines={1}>{locationText || "Marcar en mapa"}</Text>
              </TouchableOpacity>
            </View>
            {isServicios && (
              <TouchableOpacity style={[ds.miniCard, ds.miniCardPerfil, { flex: 1 }]} onPress={() => nav.navigate("CrearPerfil")} activeOpacity={0.85}>
                <View style={ds.miniIconPerfil}>
                  <Ionicons name="person-circle-outline" size={18} color="#7C3AED" />
                </View>
                <Text style={ds.miniTitle} numberOfLines={1}>Mi perfil</Text>
                <Text style={ds.miniSub} numberOfLines={1}>{hasPerfil ? `${setupStatus?.counts?.perfiles || 0} creados` : "Crear perfil"}</Text>
              </TouchableOpacity>
            )}
          </View>

          <BannerManager banners={banners} loading={bannersLoading} onUpload={handleUploadBanner} onToggle={handleToggleBanner} onDelete={handleDeleteBanner} />

          <View
            style={[highlight === "seccion" && ds.highlightBox, { borderRadius: 24 }]}
            onLayout={(e) => { sectionY.current.seccion = e.nativeEvent.layout.y; }}
          >
            <SeccionCreator categorias={categorias} onCreate={handleCreateCategoria} onEdit={openEditCat} onDelete={openDeleteCat} />
          </View>
          <View
            style={[highlight === "producto" && ds.highlightBox, { borderRadius: 24 }]}
            onLayout={(e) => { sectionY.current.producto = e.nativeEvent.layout.y; }}
          >
            <ItemCreator categorias={categorias} onCreate={handleCreateItem} showServicios={isServicios} rangoPrecios={setupStatus?.rango_precios} />
          </View>
          <Inventario categorias={categorias} productos={allItems} onDelete={confirmDeleteItem} onToggle={handleToggleItem} onEdit={handleEditItem} />
          <View style={{ height: 60 }} />
        </ScrollView>
      </View>

      {/* Guía paso a paso */}
      <OnboardingGuide
        visible={guideVisible}
        isServicios={isServicios}
        doneMap={doneMap}
        startAt={guideStartAt}
        onClose={closeGuide}
        onAction={handleGuideAction}
      />

      {/* Intro horarios */}
      <HorariosIntroModal
        visible={horariosIntroVisible}
        onClose={() => setHorariosIntroVisible(false)}
        onGoHorarios={() => { setHorariosIntroVisible(false); nav.navigate("Horarios"); }}
      />

      {/* Ubicación con buscador + mapa */}
      <LocationPickerModal
        visible={locationModal}
        initialRegion={mapRegion}
        initialAddress={locationText}
        saving={savingLocation}
        onClose={() => setLocationModal(false)}
        onSave={handleSaveLocation}
      />

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
          <Ionicons name="eye-off-outline" size={40} color={C.brand} style={{ marginBottom: 12 }} />
          <Text style={ds.modalTitle}>Ocultar sección</Text>
          <Text style={ds.modalMsg}>Se ocultará "{selectedCat?.nombre}" del catálogo. Si tiene productos o servicios asociados deberás moverlos u ocultarlos primero. El historial de pedidos no se afecta.</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity style={[ds.modalPrimary, { flex: 1, backgroundColor: "#FEE" }]} onPress={() => setDeleteCatModal(false)}><Text style={[ds.modalPrimaryText, { color: "#EF4444" }]}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={[ds.modalPrimary, { flex: 1 }]} onPress={handleDeleteCategoria}><Text style={ds.modalPrimaryText}>Ocultar</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* Delete Item Modal */}
      <Modal visible={deleteItemModal} transparent animationType="fade">
        <View style={ds.modalBg}><View style={ds.modalCard}>
          <Ionicons name="eye-off-outline" size={40} color={C.brand} style={{ marginBottom: 12 }} />
          <Text style={ds.modalTitle}>Ocultar del catálogo</Text>
          <Text style={ds.modalMsg}>"{selectedItem?.nombre}" se ocultará de la tienda, pero seguirá visible en el historial de pedidos y reservas.</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity style={[ds.modalPrimary, { flex: 1, backgroundColor: "#FEE" }]} onPress={() => setDeleteItemModal(false)}>
              <Text style={[ds.modalPrimaryText, { color: "#EF4444" }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ds.modalPrimary, { flex: 1 }]} onPress={handleDeleteItemConfirm}>
              <Text style={ds.modalPrimaryText}>Ocultar</Text>
            </TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* Celebración: perfil completo */}
      <Modal visible={celebrateVisible} transparent animationType="fade" onRequestClose={() => setCelebrateVisible(false)}>
        <View style={ds.modalBg}><View style={ds.modalCard}>
          <View style={ds.celebrateIcon}>
            <Ionicons name="checkmark-circle" size={48} color={C.green} />
          </View>
          <Text style={ds.modalTitle}>¡Tu negocio está completo!</Text>
          <Text style={ds.modalMsg}>
            {esPublico
              ? (isServicios
                  ? "Ya estás público: tus clientes pueden reservar tus servicios."
                  : "Ya estás público: tus clientes pueden comprar tus productos.")
              : "Tu perfil está completo. Serás visible para tus clientes en tu horario de atención."}
          </Text>
          <TouchableOpacity style={ds.modalPrimary} onPress={() => setCelebrateVisible(false)}>
            <Text style={ds.modalPrimaryText}>¡Genial, entendido!</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setCelebrateVisible(false); nav.navigate("Horarios"); }} style={{ marginTop: 8 }}>
            <Text style={ds.modalLater}>Ver mis horarios</Text>
          </TouchableOpacity>
        </View></View>
      </Modal>

      <AlertaModal
        visible={alertVisible}
        mensaje={alertData.message}
        tipo={alertData.type}
        onCerrar={() => setAlertVisible(false)}
        onPrimary={alertData.onPrimary ? async () => { setAlertVisible(false); await alertData.onPrimary?.(); } : null}
        primaryLabel={alertData.primaryLabel || ""}
      />
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
  statCardAlert: { borderColor: "#FECACA" },
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
  celebrateIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#ECFDF5", justifyContent: "center", alignItems: "center", marginBottom: 14 },
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
  guideCard: { backgroundColor: C.ink, borderRadius: 20, padding: 14, marginBottom: 14 },
  guideHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  guideIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(250,98,5,0.18)", justifyContent: "center", alignItems: "center" },
  guideIconDone: { backgroundColor: C.green },
  guideTitle: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  guideSub: { fontSize: 10, fontFamily: "Montserrat_600SemiBold", color: "rgba(255,255,255,0.65)", marginTop: 3 },
  guideBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.brand, borderRadius: 14, paddingVertical: 12, marginTop: 10 },
  guideBtnText: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  checkList: { gap: 8, marginBottom: 4, marginTop: 12 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 10 },
  checkDot: { width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)" },
  checkDotDone: { backgroundColor: C.green, borderColor: C.green },
  checkDotTodo: { backgroundColor: "transparent" },
  checkLabel: { fontSize: 12, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  checkHint: { fontSize: 10, fontFamily: "Montserrat_400Regular", color: "rgba(255,255,255,0.6)", marginTop: 1 },
  checkBadge: { fontSize: 9, fontFamily: "Montserrat_800ExtraBold", color: "#FDBA74", backgroundColor: "rgba(250,98,5,0.2)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, textTransform: "uppercase" },
  guideHint: { fontSize: 10, fontFamily: "Montserrat_400Regular", color: "rgba(255,255,255,0.55)", textAlign: "center", marginTop: 8 },
  horarioTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  openPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, marginBottom: 4 },
  openPillOn: { backgroundColor: "#ECFDF5" },
  openPillOff: { backgroundColor: "#FEF2F2" },
  openDot: { width: 7, height: 7, borderRadius: 4 },
  openDotOn: { backgroundColor: C.green },
  openDotOff: { backgroundColor: "#EF4444" },
  openPillText: { fontSize: 11, fontFamily: "Montserrat_800ExtraBold" },
  openPillTextOn: { color: C.green },
  openPillTextOff: { color: "#EF4444" },
  pubRow: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, marginTop: 8, maxWidth: "100%" },
  pubRowOn: { backgroundColor: "#ECFDF5" },
  pubRowOff: { backgroundColor: "#FEF2F2" },
  pubDot: { width: 7, height: 7, borderRadius: 4 },
  pubDotOn: { backgroundColor: C.green },
  pubDotOff: { backgroundColor: "#EF4444" },
  pubText: { fontSize: 10, fontFamily: "Montserrat_700Bold", flexShrink: 1 },
  pubTextOn: { color: C.green },
  pubTextOff: { color: "#EF4444" },
  miniCard: { backgroundColor: C.surface, borderRadius: 16, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#F0F0F0", minHeight: 108, justifyContent: "center" },
  miniCardPerfil: { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" },
  miniIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FFF0E5", justifyContent: "center", alignItems: "center", marginBottom: 6 },
  miniIconPerfil: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FFF", justifyContent: "center", alignItems: "center", marginBottom: 6 },
  miniTitle: { fontSize: 12, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  miniSub: { fontSize: 10, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 2 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  checkPill: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.green, justifyContent: "center", alignItems: "center" },
  highlightBox: { borderWidth: 2, borderColor: C.brand, shadowColor: C.brand, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 4 },
});
