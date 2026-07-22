import React, { createContext, useContext, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const AlertContext = createContext(null);

export const useAlert = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert must be used within AlertProvider");
  return ctx;
};

const typeConfig = {
  error: { color: "#FF4757", icon: "close-circle" },
  success: { color: "#fa6205", icon: "check-circle" },
  info: { color: "#fa6205", icon: "information" },
};

export const AlertProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({});

  const showAlert = useCallback((opts) => {
    setConfig({
      title: opts.title || "",
      message: opts.message || "",
      confirmText: opts.confirmText || "Aceptar",
      cancelText: opts.cancelText || null,
      onConfirm: () => {
        setVisible(false);
        opts.onConfirm?.();
      },
      onCancel: () => {
        setVisible(false);
        opts.onCancel?.();
      },
      type: opts.type || "info",
    });
    setVisible(true);
  }, []);

  const theme = typeConfig[config.type] || typeConfig.info;

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name={theme.icon} size={48} color={theme.color} />
            </View>
            <Text style={styles.title}>{config.title}</Text>
            {config.message ? <Text style={styles.message}>{config.message}</Text> : null}
            <View style={styles.buttons}>
              {config.cancelText ? (
                <TouchableOpacity style={styles.cancelBtn} onPress={config.onCancel}>
                  <Text style={styles.cancelText}>{config.cancelText}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: theme.color }, config.cancelText && { flex: 1 }]}
                onPress={config.onConfirm}
              >
                <Text style={styles.confirmText}>{config.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    paddingTop: 24,
  },
  iconWrap: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
    textAlign: "center",
    marginHorizontal: 24,
  },
  message: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
    textAlign: "center",
    marginTop: 10,
    marginHorizontal: 24,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: "row",
    marginTop: 24,
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 20,
    width: "100%",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmText: {
    color: "#1C1C1E",
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#F0F0F0",
  },
  cancelText: {
    color: "#555",
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 15,
  },
});
