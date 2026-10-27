import React from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function NoteInput({ value, onChangeText, onFocus }) {
  return (
    <View style={styles.container}>
      <Ionicons name="chatbubble-ellipses-outline" size={17} color="#A1A1AA" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder="Nota al conductor (opcional)..."
        placeholderTextColor="#A1A1AA"
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        multiline
        numberOfLines={2}
        textAlignVertical="top"
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText("")} style={styles.clearBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={14} color="#71717A" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F4F4F5",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  icon: {
    marginRight: 10,
    marginTop: 1,
  },
  input: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: "Montserrat_600SemiBold",
    color: "#1C1C1E",
    minHeight: 22,
    maxHeight: 64,
    padding: 0,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});
