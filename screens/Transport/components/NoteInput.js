import React from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function NoteInput({ value, onChangeText }) {
  return (
    <View style={styles.container}>
      <Ionicons name="chatbubble-ellipses-outline" size={16} color="#94A3B8" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder="Nota al conductor (opcional)..."
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        multiline
        numberOfLines={2}
        textAlignVertical="top"
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText("")} style={styles.clearBtn}>
          <Ionicons name="close" size={14} color="#94A3B8" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  icon: {
    marginRight: 10,
    marginTop: 4,
  },
  input: {
    flex: 1,
    fontSize: 12,
    fontFamily: "MontserratSemiBold",
    color: "#0F172A",
    minHeight: 36,
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
    marginLeft: 8,
  },
});
