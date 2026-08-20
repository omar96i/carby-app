import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";

export default function OfflineState({ checkingSubscription, onConnect }) {
  return (
    <View style={styles.offlineContainer}>
      <TouchableOpacity style={styles.bigConnectButton} onPress={onConnect} disabled={checkingSubscription}>
        {checkingSubscription ? (
          <ActivityIndicator size="large" color="#FFF" />
        ) : (
          <Text style={styles.connectText}>CONECTARSE</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.offlineLabel}>Estás desconectado</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  offlineContainer: {
    position: "absolute",
    bottom: 50,
    width: "100%",
    alignItems: "center",
    zIndex: 20,
  },
  bigConnectButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fa6205",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#fa6205",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 15,
  },
  connectText: {
    color: "#FFF",
    fontFamily: "Montserrat_700Bold",
    fontSize: 10,
  },
  offlineLabel: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_500Medium",
    backgroundColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
