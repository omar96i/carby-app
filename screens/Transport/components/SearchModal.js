import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="location" size={20} color="#0F172A" />
              </View>
              <View>
                <Text style={styles.headerTitle}>¿A donde vamos?</Text>
                <Text style={styles.headerSub}>Selecciona o escribe tu destino</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          <View style={styles.stopsBox}>
            <View style={styles.stop}>
              <View style={[styles.dot, { backgroundColor: "#10B981" }]} />
              <Text style={styles.stopInput} numberOfLines={1}>
                {origin || "Mi ubicacion actual"}
              </Text>
            </View>
            <View style={[styles.stop, styles.stopActive]}>
              <View style={[styles.dot, { backgroundColor: "#FF5500" }]} />
              <TextInput
                style={styles.stopInputEditable}
                placeholder="Buscar direccion, lugar o barrio..."
                placeholderTextColor="#94A3B8"
                value={destination}
                onChangeText={onDestinationChange}
                autoFocus
              />
              {destination ? (
                <TouchableOpacity onPress={() => onDestinationChange("")} style={styles.clearBtn}>
                  <Ionicons name="close" size={12} color="#64748B" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.actionsBar}>
            <TouchableOpacity style={styles.actionPillPrimary} onPress={onSelectMapPin}>
              <Ionicons name="map-outline" size={14} color="#FFFFFF" />
              <Text style={styles.actionPillPrimaryText}>Fijar en el mapa</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>
            {suggestions && suggestions.length > 0 ? "Resultados" : "Destinos recientes"}
          </Text>

          {isSearching ? (
            <ActivityIndicator size="small" color="#FF5500" style={{ marginTop: 20 }} />
          ) : (
            <ScrollView style={styles.sugsList} showsVerticalScrollIndicator={false}>
              {displayList.map((item, idx) => (
                <TouchableOpacity
                  key={item.place_id || idx}
                  style={styles.sugItem}
                  onPress={() => onSelectSuggestion(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sugIconBox}>
                    <Ionicons name="location-outline" size={16} color="#334155" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sugName} numberOfLines={1}>
                      {item.description || item.title || "Ubicacion"}
                    </Text>
                    {item.structured_formatting?.secondary_text ? (
                      <Text style={styles.sugSub} numberOfLines={1}>
                        {item.structured_formatting.secondary_text}
                      </Text>
                    ) : null}
                  </View>
                  {item.recent && (
                    <Ionicons name="time-outline" size={14} color="#94A3B8" />
                  )}
                </TouchableOpacity>
              ))}
              {displayList.length === 0 && !isSearching && (
                <Text style={styles.emptyText}>Sin resultados</Text>
              )}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    maxHeight: "90%",
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FF5500",
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 19,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#64748B",
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  stopsBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  stop: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  stopActive: {
    borderColor: "#FF5500",
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stopInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  stopInputEditable: {
    flex: 1,
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    padding: 0,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  actionsBar: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  actionPillPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0F172A",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionPillPrimaryText: {
    fontSize: 13,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#94A3B8",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  sugsList: {
    maxHeight: 280,
  },
  sugItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    marginBottom: 8,
  },
  sugIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  sugName: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  sugSub: {
    fontSize: 12,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#64748B",
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "MontserratRegular",
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 20,
  },
});
