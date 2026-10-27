import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAlturaTecladoAndroid } from "../../../hooks/useAlturaTecladoAndroid";

export default function SearchModal({
  visible,
  onClose,
  origin,
  destination,
  onDestinationChange,
  onSelectSuggestion,
  onSelectMapPin,
  suggestions,
  isSearching,
  recentLocations,
}) {
  const displayList = suggestions && suggestions.length > 0
    ? suggestions
    : (recentLocations || []).map((r) => ({ ...r, recent: true }));

  const insets = useSafeAreaInsets();
  const tecladoAndroid = useAlturaTecladoAndroid();

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.sugItem} onPress={() => onSelectSuggestion(item)} activeOpacity={0.7}>
      <View style={styles.sugIconBox}>
        <Ionicons name={item.recent ? "time-outline" : "location-outline"} size={18} color="#1C1C1E" />
      </View>
      <View style={styles.sugText}>
        <Text style={styles.sugName} numberOfLines={1}>
          {item.description || item.title || "Ubicacion"}
        </Text>
        {item.structured_formatting?.secondary_text ? (
          <Text style={styles.sugSub} numberOfLines={1}>
            {item.structured_formatting.secondary_text}
          </Text>
        ) : null}
      </View>
      <Ionicons name="arrow-forward" size={16} color="#D4D4D8" />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding" enabled={Platform.OS === "ios"}>
        <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: tecladoAndroid || insets.bottom }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color="#1C1C1E" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>¿A donde vamos?</Text>
              <Text style={styles.headerSub}>Selecciona o escribe tu destino</Text>
            </View>
          </View>

          <View style={styles.route}>
            <View style={styles.routeLine} />
            <View style={styles.stop}>
              <View style={styles.dotOrigin} />
              <Text style={styles.stopText} numberOfLines={1}>
                {origin || "Mi ubicacion actual"}
              </Text>
            </View>
            <View style={styles.routeSep} />
            <View style={styles.stop}>
              <View style={styles.dotDest} />
              <TextInput
                style={styles.stopInput}
                placeholder="Buscar direccion, lugar o barrio..."
                placeholderTextColor="#A1A1AA"
                value={destination}
                onChangeText={onDestinationChange}
                autoFocus
              />
              {destination ? (
                <TouchableOpacity onPress={() => onDestinationChange("")} style={styles.clearBtn} activeOpacity={0.8}>
                  <Ionicons name="close" size={13} color="#71717A" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <TouchableOpacity style={styles.mapRow} onPress={onSelectMapPin} activeOpacity={0.7}>
            <View style={styles.mapIcon}>
              <Ionicons name="map" size={17} color="#fa6205" />
            </View>
            <Text style={styles.mapText}>Fijar en el mapa</Text>
            <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>
            {suggestions && suggestions.length > 0 ? "Resultados" : "Destinos recientes"}
          </Text>

          {isSearching ? (
            <ActivityIndicator size="small" color="#fa6205" style={styles.loading} />
          ) : (
            <FlatList
              style={styles.flex}
              data={displayList}
              keyExtractor={(item, idx) => String(item.place_id || idx)}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<Text style={styles.emptyText}>Sin resultados</Text>}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", edge: "#E4E4E7", iconBg: "#FFF0E5", green: "#10B981", placeholder: "#A1A1AA" };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 19,
    fontFamily: "Montserrat_800ExtraBold",
    color: C.ink,
  },
  headerSub: {
    fontSize: 12.5,
    fontFamily: "Montserrat_400Regular",
    color: C.muted,
    marginTop: 1,
  },

  route: {
    backgroundColor: C.bg,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 6,
  },
  routeLine: {
    position: "absolute",
    left: 20.5,
    top: 30,
    bottom: 30,
    width: 2,
    borderRadius: 1,
    backgroundColor: "#D4D4D8",
  },
  stop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 50,
  },
  routeSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#D4D4D8",
    marginLeft: 25,
  },
  dotOrigin: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.surface,
  },
  dotDest: {
    width: 11,
    height: 11,
    borderRadius: 3,
    backgroundColor: C.brand,
    borderWidth: 2,
    borderColor: C.surface,
  },
  stopText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: C.muted,
  },
  stopInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    color: C.ink,
    paddingVertical: 12,
  },
  clearBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.surface,
    justifyContent: "center",
    alignItems: "center",
  },

  mapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  mapIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.iconBg,
    justifyContent: "center",
    alignItems: "center",
  },
  mapText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    color: C.ink,
  },

  sectionLabel: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    color: C.muted,
    marginTop: 6,
    marginBottom: 2,
  },
  loading: { marginTop: 24 },
  sugItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  sugIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  sugText: { flex: 1 },
  sugName: {
    fontSize: 14.5,
    fontFamily: "Montserrat_700Bold",
    color: C.ink,
  },
  sugSub: {
    fontSize: 12.5,
    fontFamily: "Montserrat_400Regular",
    color: C.muted,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.edge,
    marginLeft: 52,
  },
  emptyText: {
    fontSize: 13.5,
    fontFamily: "Montserrat_600SemiBold",
    color: C.placeholder,
    textAlign: "center",
    paddingVertical: 24,
  },
});
