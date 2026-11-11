import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import { BASE_URL } from "../../constants/url";

// Sheet que abre el botón flotante rosado del inicio (Socias).
// Invita a configurar la palabra de seguridad (pantalla ConfigurarPalabraSeguridad).
const C = {
  pink: "#E23A8F",
  pinkSoft: "rgba(226,58,143,0.15)",
  ink: "#1C1C1E",
  surface: "#2C2C2E",
  muted: "rgba(255,255,255,0.6)",
  green: "#10B981",
};

const PASOS = [
  { icon: "key", titulo: "Elige tu palabra secreta", sub: "Una palabra o frase que solo tú conoces." },
  { icon: "shield-checkmark", titulo: "Activa la protección", sub: "En tu día a día o cuando estés en tu arrendamiento en curso." },
  {
    icon: "location",
    titulo: "Dila si necesitas ayuda",
    sub: "Se envía una alerta con tu ubicación en tiempo real a personas que tengan la app, al comando de policía y a servidores públicos.",
  },
];

export default function SociasSeguridadSheet({ visible, onClose, onConfigurar }) {
  const insets = useSafeAreaInsets();
  const [configurada, setConfigurada] = useState(false);

  // Consulta si ya tiene palabra para ajustar el texto del botón
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    (async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return;
        const res = await fetch(`${BASE_URL}user-security-word`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (alive && res.ok) setConfigurada(Boolean(json?.configured));
      } catch {}
    })();
    return () => { alive = false; };
  }, [visible]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.grabber} />
          <TouchableOpacity style={styles.cerrar} onPress={onClose} activeOpacity={0.8} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={18} color="#FFF" />
          </TouchableOpacity>

          {/* Ícono con halo rosado */}
          <View style={styles.halo2}>
            <View style={styles.halo1}>
              <View style={styles.iconoCirculo}>
                <Ionicons name="woman" size={30} color="#FFF" />
              </View>
              <View style={styles.iconoBadge}>
                <Ionicons name="shield-checkmark" size={14} color={C.pink} />
              </View>
            </View>
          </View>

          <View style={styles.pill}>
            <Text style={styles.pillText}>SEGURIDAD</Text>
          </View>

          <Text style={styles.titulo}>
            Una palabra puede <Text style={{ color: C.pink }}>protegerte</Text>
          </Text>
          <Text style={styles.descripcion}>
            Configura tu palabra clave y siéntete más segura en tu día a día. Tú decides cuándo pedir ayuda.
          </Text>

          <View style={styles.pasos}>
            {PASOS.map((p, i) => (
              <View key={p.icon} style={styles.paso}>
                <View style={styles.pasoIcono}>
                  <Ionicons name={p.icon} size={17} color={C.pink} />
                </View>
                <View style={styles.pasoTexto}>
                  <Text style={styles.pasoTitulo}>{i + 1}. {p.titulo}</Text>
                  <Text style={styles.pasoSub}>{p.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {configurada && (
            <View style={styles.yaConfigurada}>
              <Ionicons name="checkmark-circle" size={16} color={C.green} />
              <Text style={styles.yaConfiguradaText}>Ya tienes una palabra configurada</Text>
            </View>
          )}

          <TouchableOpacity style={styles.boton} onPress={onConfigurar} activeOpacity={0.85}>
            <Ionicons name="key" size={18} color="#FFF" />
            <Text style={styles.botonText}>
              {configurada ? "Cambiar mi palabra clave" : "Configurar mi palabra clave"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ahoraNo} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.ahoraNoText}>Ahora no</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.ink,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: "center",
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  cerrar: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  halo2: {
    marginTop: 18,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(226,58,143,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  halo1: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(226,58,143,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconoCirculo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.pink,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.pink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  iconoBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
    elevation: 9,
  },
  pill: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: C.pinkSoft,
  },
  pillText: {
    fontSize: 10.5,
    fontFamily: "Montserrat_700Bold",
    color: C.pink,
    letterSpacing: 1,
  },
  titulo: {
    marginTop: 12,
    fontSize: 24,
    lineHeight: 29,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#FFF",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  descripcion: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: "Montserrat_400Regular",
    color: C.muted,
    textAlign: "center",
    paddingHorizontal: 6,
  },
  pasos: {
    alignSelf: "stretch",
    marginTop: 20,
    gap: 14,
  },
  paso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pasoIcono: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.pinkSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  pasoTexto: { flex: 1 },
  pasoTitulo: {
    fontSize: 13.5,
    fontFamily: "Montserrat_700Bold",
    color: "#FFF",
  },
  pasoSub: {
    fontSize: 11.5,
    fontFamily: "Montserrat_400Regular",
    color: C.muted,
    marginTop: 1,
  },
  yaConfigurada: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  yaConfiguradaText: {
    fontSize: 12,
    fontFamily: "Montserrat_600SemiBold",
    color: C.green,
  },
  boton: {
    alignSelf: "stretch",
    marginTop: 20,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.pink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: C.pink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  botonText: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    color: "#FFF",
  },
  ahoraNo: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  ahoraNoText: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    color: C.muted,
  },
});
