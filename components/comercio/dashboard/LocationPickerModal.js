import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GOOGLE_MAPS_API_KEY } from "../../../constants/Keys";

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5" };
const RECENTS_KEY = "comercio_recent_locations";
const DEFAULT_REGION = { latitude: 4.60971, longitude: -74.08175, latitudeDelta: 0.02, longitudeDelta: 0.02 };

async function reverseGeocode(latitude, longitude) {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await res.json();
    if (data.status === "OK" && Array.isArray(data.results) && data.results.length > 0) {
      const valid = data.results.find((r) => !/^[\w\d]+\+\w+/.test(r.formatted_address));
      return (valid || data.results[0]).formatted_address;
    }
  } catch {}
  return "";
}

export default function LocationPickerModal({ visible, initialRegion, initialAddress = "", onClose, onSave, saving }) {
  const mapRef = useRef(null);
  const searchTimeout = useRef(null);
  const pinGeoTimeout = useRef(null);
  const regionRef = useRef(initialRegion || DEFAULT_REGION);

  const [region, setRegion] = useState(initialRegion || DEFAULT_REGION);
  const [query, setQuery] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recents, setRecents] = useState([]);
  const [referencia, setReferencia] = useState("");
  const [locating, setLocating] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [pinAddress, setPinAddress] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setRegion(initialRegion || DEFAULT_REGION);
    regionRef.current = initialRegion || DEFAULT_REGION;
    setQuery(initialAddress || "");
    setReferencia("");
    setSuggestions([]);
    setShowSuggestions(false);
    setPinMode(false);
    setPinAddress("");
    setSaveError("");
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(RECENTS_KEY);
        if (stored) setRecents(JSON.parse(stored));
      } catch {}
    })();
  }, [visible]);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (pinGeoTimeout.current) clearTimeout(pinGeoTimeout.current);
    };
  }, []);

  const saveRecent = async (item) => {
    try {
      const next = [item, ...recents.filter((r) => r.place_id !== item.place_id)].slice(0, 5);
      setRecents(next);
      await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {}
  };

  const searchPlaces = (text) => {
    setQuery(text);
    setShowSuggestions(true);
    setSaveError("");
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (text.trim().length <= 3) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const lat = regionRef.current?.latitude;
        const lng = regionRef.current?.longitude;
        const bias = lat != null ? `&locationbias=circle:20000@${lat},${lng}` : "";
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text.trim()
        )}&components=country:CO${bias}&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        const preds = (data.predictions || []).filter((p) => {
          const d = p.description || "";
          return d.trim() !== "" && !/^[\w\d]+\+\w+/.test(d);
        });
        setSuggestions(preds);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const selectSuggestion = async (item) => {
    Keyboard.dismiss();
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.place_id}&fields=geometry,formatted_address&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      if (data.status === "OK" && data.result?.geometry) {
        const { lat, lng } = data.result.geometry.location;
        let addr = data.result.formatted_address || item.description || "";
        if (/^[\w\d]+\+\w+/.test(addr)) addr = item.description || "";
        const next = { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
        regionRef.current = next;
        setRegion(next);
        setQuery(addr);
        mapRef.current?.animateToRegion(next, 600);
        await saveRecent({ place_id: item.place_id, description: addr });
      } else {
        setQuery(item.description || "");
      }
    } catch {
      setQuery(item.description || "");
    }
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const useMyLocation = async () => {
    setLocating(true);
    setSaveError("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setSaveError("Activa el permiso de ubicación para usar tu posición actual.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      regionRef.current = next;
      setRegion(next);
      mapRef.current?.animateToRegion(next, 600);
      const addr = await reverseGeocode(next.latitude, next.longitude);
      if (addr) setQuery(addr);
    } catch {
      setSaveError("No pudimos obtener tu ubicación. Mueve el pin en el mapa.");
    } finally {
      setLocating(false);
    }
  };

  const onMapTap = async (coordinate) => {
    const next = { ...(regionRef.current || {}), latitude: coordinate.latitude, longitude: coordinate.longitude };
    regionRef.current = next;
    setRegion(next);
    const addr = await reverseGeocode(coordinate.latitude, coordinate.longitude);
    if (addr) setQuery(addr);
  };

  const openPinMode = () => {
    setPinMode(true);
    setPinAddress(query);
  };

  const onPinRegionChange = (r) => {
    regionRef.current = r;
    setRegion(r);
    if (pinGeoTimeout.current) clearTimeout(pinGeoTimeout.current);
    pinGeoTimeout.current = setTimeout(async () => {
      const addr = await reverseGeocode(r.latitude, r.longitude);
      if (addr) setPinAddress(addr);
    }, 500);
  };

  const confirmPin = () => {
    if (pinAddress) setQuery(pinAddress);
    mapRef.current?.animateToRegion({ ...regionRef.current, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 400);
    setPinMode(false);
  };

  const handleSave = () => {
    setSaveError("");
    if (!region?.latitude || !region?.longitude) {
      setSaveError("Marca tu ubicación en el mapa para continuar.");
      return;
    }
    if (!query.trim()) {
      setSaveError("Escribe o selecciona la dirección de tu negocio.");
      return;
    }
    onSave?.({
      latitude: region.latitude,
      longitude: region.longitude,
      direccion: query.trim(),
      referencia: referencia.trim(),
    });
  };

  const listData = suggestions.length > 0 ? suggestions : recents.map((r) => ({ ...r, recent: true }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.bg}>
        <View style={s.card}>
          {pinMode ? (
            <>
              <View style={s.pinBanner}>
                <Ionicons name="location" size={18} color={C.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={s.pinBannerTitle}>Mueve el mapa para ajustar</Text>
                  <Text style={s.pinBannerAddress} numberOfLines={1}>{pinAddress || "Buscando dirección…"}</Text>
                </View>
              </View>
              <View style={s.pinMapBox}>
                <MapView
                  ref={mapRef}
                  style={{ flex: 1 }}
                  initialRegion={region}
                  onRegionChangeComplete={onPinRegionChange}
                />
                <View style={s.pinCenter} pointerEvents="none">
                  <View style={s.pinHead}>
                    <View style={s.pinIconFix}>
                      <Ionicons name="location" size={22} color="#FFF" />
                    </View>
                  </View>
                  <View style={s.pinShadow} />
                </View>
              </View>
              <View style={s.pinBar}>
                <TouchableOpacity style={s.pinCancel} onPress={() => setPinMode(false)}>
                  <Text style={s.pinCancelText}>Volver</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.pinConfirm} onPress={confirmPin}>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={s.pinConfirmText}>Confirmar este punto</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={s.grabber} />
              <View style={s.header}>
                <View style={s.headerIcon}>
                  <Ionicons name="storefront" size={20} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>Mi ubicación del negocio</Text>
                  <Text style={s.sub}>Busca tu dirección o márcala en el mapa</Text>
                </View>
                <TouchableOpacity style={s.closeBtn} onPress={onClose}>
                  <Ionicons name="close" size={18} color={C.muted} />
                </TouchableOpacity>
              </View>

              <View style={s.addrBox}>
                <View style={[s.addrRow, s.addrRowActive]}>
                  <View style={[s.dot, { backgroundColor: C.brand }]} />
                  <TextInput
                    style={s.addrInput}
                    placeholder="Buscar dirección, lugar o barrio…"
                    placeholderTextColor="#999"
                    value={query}
                    onChangeText={searchPlaces}
                    onFocus={() => setShowSuggestions(true)}
                    returnKeyType="search"
                  />
                  {query ? (
                    <TouchableOpacity onPress={() => { setQuery(""); setSuggestions([]); }} style={s.clearBtn}>
                      <Ionicons name="close" size={12} color={C.muted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View style={s.pills}>
                <TouchableOpacity style={s.pillDark} onPress={openPinMode}>
                  <Ionicons name="map-outline" size={14} color="#FFF" />
                  <Text style={s.pillDarkText}>Fijar en el mapa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.pillLight} onPress={useMyLocation} disabled={locating}>
                  {locating ? (
                    <ActivityIndicator size="small" color={C.ink} />
                  ) : (
                    <>
                      <Ionicons name="locate-outline" size={14} color={C.ink} />
                      <Text style={s.pillLightText}>Usar mi ubicación</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {showSuggestions && (
                <View style={s.sugsWrap}>
                  <Text style={s.sugsLabel}>{suggestions.length > 0 ? "Resultados" : "Recientes"}</Text>
                  {isSearching ? (
                    <ActivityIndicator size="small" color={C.brand} style={{ marginVertical: 10 }} />
                  ) : (
                    <ScrollView style={s.sugsList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                      {listData.map((item, idx) => (
                        <TouchableOpacity
                          key={item.place_id || `r-${idx}`}
                          style={s.sugItem}
                          onPress={() => (item.recent && !item.place_id ? (setQuery(item.description || ""), setShowSuggestions(false)) : selectSuggestion(item))}
                        >
                          <View style={s.sugIcon}>
                            <Ionicons name={item.recent ? "time-outline" : "location-outline"} size={15} color={C.muted} />
                          </View>
                          <Text style={s.sugText} numberOfLines={1}>{item.description}</Text>
                        </TouchableOpacity>
                      ))}
                      {listData.length === 0 && (
                        <Text style={s.emptyText}>Escribe al menos 4 letras para buscar</Text>
                      )}
                    </ScrollView>
                  )}
                </View>
              )}

              <View style={s.mapBox}>
                <MapView
                  ref={mapRef}
                  style={{ flex: 1 }}
                  region={region}
                  onPress={(e) => onMapTap(e.nativeEvent.coordinate)}
                >
                  {region?.latitude && (
                    <Marker
                      coordinate={{ latitude: region.latitude, longitude: region.longitude }}
                      title="Mi negocio"
                      draggable
                      onDragEnd={(e) => onMapTap(e.nativeEvent.coordinate)}
                    />
                  )}
                </MapView>
                <View style={s.mapHint}>
                  <Ionicons name="hand-left-outline" size={13} color={C.brand} />
                  <Text style={s.mapHintText}>Toca el mapa o arrastra el pin</Text>
                </View>
              </View>

              <TextInput
                style={s.refInput}
                placeholder="Referencia (opcional): ej. Local 2, frente al parque"
                placeholderTextColor="#999"
                value={referencia}
                onChangeText={setReferencia}
              />

              {saveError ? <Text style={s.error}>{saveError}</Text> : null}

              <TouchableOpacity style={[s.primary, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="location" size={18} color="#FFF" />
                    <Text style={s.primaryText}>Guardar ubicación del negocio</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={s.foot}>Puedes actualizarla cuando quieras desde “Mi ubicación del negocio”.</Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  card: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, paddingBottom: 22, maxHeight: "94%" },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  headerIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFF0E5", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  sub: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: C.muted, marginTop: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },
  addrBox: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#EDEDED", borderRadius: 18, padding: 10, marginBottom: 10 },
  addrRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderWidth: 1, borderColor: "#EDEDED", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  addrRowActive: { borderColor: C.brand },
  dot: { width: 10, height: 10, borderRadius: 5 },
  addrInput: { flex: 1, fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: C.ink, padding: 0 },
  clearBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },
  pills: { flexDirection: "row", gap: 8, marginBottom: 10 },
  pillDark: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.ink, borderRadius: 14, paddingVertical: 10 },
  pillDarkText: { fontSize: 12, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  pillLight: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.surface, borderWidth: 1, borderColor: "#EDEDED", borderRadius: 14, paddingVertical: 10 },
  pillLightText: { fontSize: 12, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  sugsWrap: { marginBottom: 10 },
  sugsLabel: { fontSize: 10, fontFamily: "Montserrat_700Bold", color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  sugsList: { maxHeight: 150 },
  sugItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#F0F0F0", borderRadius: 12, marginBottom: 6 },
  sugIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },
  sugText: { flex: 1, fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: C.ink },
  emptyText: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: "#AAA", textAlign: "center", paddingVertical: 10 },
  mapBox: { width: "100%", height: 220, borderRadius: 16, overflow: "hidden", marginBottom: 10, borderWidth: 1, borderColor: "#EEE" },
  mapHint: { position: "absolute", top: 10, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.95)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  mapHintText: { fontSize: 11, fontFamily: "Montserrat_700Bold", color: C.ink },
  refInput: { backgroundColor: C.bg, borderRadius: 12, padding: 12, fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: C.ink, marginBottom: 8 },
  error: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: "#EF4444", marginBottom: 8, textAlign: "center" },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.brand, paddingVertical: 15, borderRadius: 16 },
  primaryText: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
  foot: { fontSize: 10, fontFamily: "Montserrat_400Regular", color: C.muted, textAlign: "center", marginTop: 8 },
  pinBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF", borderWidth: 1.5, borderColor: C.brand, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  pinBannerTitle: { fontSize: 11, fontFamily: "Montserrat_800ExtraBold", color: C.brand, textTransform: "uppercase" },
  pinBannerAddress: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: C.ink, marginTop: 2 },
  pinMapBox: { width: "100%", height: 380, borderRadius: 16, overflow: "hidden", marginBottom: 10, borderWidth: 1, borderColor: "#EEE" },
  pinCenter: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, justifyContent: "center", alignItems: "center" },
  pinHead: { width: 44, height: 44, borderRadius: 22, borderBottomLeftRadius: 6, backgroundColor: C.brand, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#FFF", transform: [{ rotate: "-45deg" }] },
  pinIconFix: { transform: [{ rotate: "45deg" }] },
  pinShadow: { width: 14, height: 5, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.25)", marginTop: 6 },
  pinBar: { flexDirection: "row", gap: 10 },
  pinCancel: { flex: 1, backgroundColor: C.bg, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  pinCancelText: { fontSize: 14, fontFamily: "Montserrat_700Bold", color: C.muted },
  pinConfirm: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.brand, borderRadius: 14, paddingVertical: 14 },
  pinConfirmText: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: "#FFF" },
});
