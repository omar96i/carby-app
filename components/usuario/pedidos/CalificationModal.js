import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS, RADIUS } from "./helpers";

export default function CalificationModal({ visible, item, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleClose = () => {
    setRating(0);
    setComentario("");
    onClose();
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setEnviando(true);
    try {
      await onSubmit({ item, rating, comentario });
      handleClose();
    } catch (e) {
      // error handled by parent
    } finally {
      setEnviando(false);
    }
  };

  const titulo = item?.es_carrera
    ? "Califica tu experiencia con el conductor"
    : "Califica tu experiencia con el comercio";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.sheet}>
          {/* Grabber */}
          <View style={s.grabber} />
          <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={16} color={COLORS.ink} />
          </TouchableOpacity>

          <Text style={s.title}>{titulo}</Text>

          {/* Stars */}
          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={36}
                  color={star <= rating ? "#FFD700" : COLORS.zinc200}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Comment */}
          <Text style={s.label}>Comentario (opcional)</Text>
          <TextInput
            style={s.input}
            placeholder="Cuéntanos tu experiencia..."
            placeholderTextColor={COLORS.zinc400}
            value={comentario}
            onChangeText={setComentario}
            multiline
            textAlignVertical="top"
          />

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, rating === 0 && s.submitDisabled]}
            onPress={handleSubmit}
            disabled={rating === 0 || enviando}
            activeOpacity={0.7}
          >
            <Text style={s.submitText}>
              {enviando ? "Enviando..." : "Enviar calificación"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.sheetTop,
    borderTopRightRadius: RADIUS.sheetTop,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    ...SHADOWS.sheet,
  },
  grabber: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.zinc200,
    alignSelf: "center",
    marginBottom: 12,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.zinc100,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.ink,
    textAlign: "center",
    marginBottom: 20,
    paddingRight: 36,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontFamily: "Montserrat_600SemiBold",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(245,240,232,0.6)",
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: COLORS.ink,
    minHeight: 80,
    borderWidth: 1,
    borderColor: COLORS.zinc200,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    ...SHADOWS.ctaDark,
  },
  submitDisabled: {
    backgroundColor: COLORS.zinc200,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    fontSize: 16,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.surface,
    letterSpacing: 0.5,
  },
});
