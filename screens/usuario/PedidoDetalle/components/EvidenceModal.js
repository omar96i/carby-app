import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { BASE_URL } from "../../../../constants/url";

export const EvidenceModal = ({ visible, pedidoId, qrUrl, onClose, onUploaded }) => {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      const resized = await manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1000 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );
      setImage(resized.uri);
    }
  };

  const upload = async () => {
    if (!image || !pedidoId) return;
    setUploading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const filename = image.split("/").pop() || "evidencia.jpg";
      const formData = new FormData();
      formData.append("archivo_evidencia", {
        uri: Platform.OS === "ios" ? image.replace("file://", "") : image,
        name: filename,
        type: "image/jpeg",
      });

      const response = await fetch(`${BASE_URL}pedidos/${pedidoId}/evidencia`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      });

      const responseText = await response.text();
      if (response.ok) {
        onUploaded?.();
        onClose();
        setImage(null);
      } else {
        console.error("Error subiendo evidencia:", response.status, responseText);
      }
    } catch (e) {
      console.error("Error subiendo evidencia:", e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <View style={styles.spacer} />
            <View style={styles.handle} />
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Evidencia de pago</Text>
          <Text style={styles.sub}>Escanea el QR del comercio o adjunta la captura del pago.</Text>

          {qrUrl ? (
            <View style={styles.qrBox}>
              <Image source={{ uri: qrUrl }} style={styles.qrImage} resizeMode="contain" />
            </View>
          ) : (
            <View style={[styles.qrBox, styles.qrEmpty]}>
              <Feather name="image" size={32} color="#CBD5E1" />
              <Text style={styles.qrEmptyText}>QR no disponible</Text>
            </View>
          )}

          <TouchableOpacity style={styles.pickBtn} onPress={pickImage} activeOpacity={0.8}>
            <Feather name="image" size={18} color="#FF5500" />
            <Text style={styles.pickBtnText}>{image ? "Cambiar imagen" : "Adjuntar captura"}</Text>
          </TouchableOpacity>

          {image && (
            <View style={styles.previewBox}>
              <Image source={{ uri: image }} style={styles.previewImage} />
            </View>
          )}

          <TouchableOpacity
            style={[styles.uploadBtn, (!image || uploading) && styles.uploadBtnDisabled]}
            onPress={upload}
            disabled={!image || uploading}
            activeOpacity={0.8}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="upload-cloud" size={18} color="#FFFFFF" />
                <Text style={styles.uploadBtnText}>Enviar evidencia</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 16,
    overflow: "hidden",
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  spacer: {
    width: 36,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 8,
  },
  sub: {
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#64748B",
    marginTop: 4,
    marginBottom: 16,
  },
  qrBox: {
    height: 220,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  qrImage: {
    width: "90%",
    height: "90%",
  },
  qrEmpty: {
    gap: 8,
  },
  qrEmptyText: {
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#94A3B8",
  },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FF5500",
    backgroundColor: "#FFFFFF",
  },
  pickBtnText: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
  },
  previewBox: {
    marginTop: 12,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: "#FF5500",
  },
  uploadBtnDisabled: {
    backgroundColor: "#FDBA74",
  },
  uploadBtnText: {
    fontSize: 15,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});
