import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

export default function SearchingState() {
  return (
    <View style={styles.searchingCard}>
      <ActivityIndicator size="large" color="#fa6205" />
      <Text style={styles.searchingText}>Buscando...</Text>
      <Text style={styles.searchingSubText}>Mantente en línea</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  searchingText: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    marginTop: 15,
  },
  searchingSubText: {
    color: "#666",
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    marginTop: 5,
  },
});
