import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../../../constants/url";
import { COLORS, formatCOP, formatDateShort, metodoPagoLabel, RADIUS, SHADOWS } from "./helpers";
import StatusBadge from "./StatusBadge";
import PaymentBadge from "./PaymentBadge";
import ReservaQrEvidencia from "./ReservaQrEvidencia";
import LogoComercio from "../../LogoComercio";

const contadorCita = (fecha, horaInicio, ahora) => {
  if (!fecha) return null;
  const [y, m, d] = String(fecha).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const [hh, mm] = String(horaInicio || "00:00").split(":").map(Number);
  const inicio = new Date(y, m - 1, d, hh || 0, mm || 0);
  const minutos = Math.floor((inicio - ahora) / 60000);
  if (minutos < 0) return null;
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  const mins = minutos % 60;
  let texto;
  if (dias > 0) texto = `Falta${dias === 1 ? "" : "n"} ${dias} día${dias === 1 ? "" : "s"}${horas ? ` ${horas} h` : ""}`;
  else if (horas > 0) texto = `Faltan ${horas} h ${mins} min`;
  else texto = `Faltan ${mins} min`;
  return { texto, pronto: dias === 0 };
};

const getPerfilImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const base = BASE_URL.toString().replace(/\/api\/?$/, "").replace(/\/$/, "");
  return `${base}/storage/${path}`;
};

export default function ReservaCard({ item, onCancel, onChat, onEvidencia }) {
  const navigation = useNavigation();
  const comercio = item.user_perfil?.user || null;
  const comercioNombre = comercio?.establecimiento_nombre || item.cliente_nombre || "Comercio";
  const servicioNombre = item.servicio_nombre || item.user_perfil?.nombre || "Perfil";
  const servicioDescripcion = item.servicio_descripcion || item.user_perfil?.descripcion || "";
  const metodo = metodoPagoLabel(item.metodo_pago);
  const perfilFoto = getPerfilImageUrl(item.servicio_imagen || item.user_perfil?.file || null);
  const fechaFormateada = item.fecha_formateada || formatDateShort(item.fecha);
  const horaInicio = item.hora_inicio_formateada || item.hora_inicio?.slice(0, 5) || "";
  const horaFin = item.hora_fin_formateada || item.hora_fin?.slice(0, 5) || "";

  const comercioId = comercio?.id || item.user_perfil?.user_id;
  const [ahora, setAhora] = useState(() => new Date());
  const activa = !["completado", "cancelado"].includes(item.estado);
  useEffect(() => {
    if (!activa) return;
    const t = setInterval(() => setAhora(new Date()), 60000);
    return () => clearInterval(t);
  }, [activa]);
  const falta = activa ? contadorCita(item.fecha, item.hora_inicio, ahora) : null;
  const irAlComercio = () => {
    if (!comercioId) return;
    navigation.navigate("Shop", { establishmentId: comercioId, userId: comercioId, establishmentName: comercioNombre });
  };

  let direccionReserva = null;
  try {
    if (item.datos_generales) {
      const dg = typeof item.datos_generales === "string" ? JSON.parse(item.datos_generales) : item.datos_generales;
      direccionReserva = dg?.direccion || null;
    }
  } catch (e) {}

  return (
    <View style={[s.card, SHADOWS.card]}>
      <View style={s.header}>
        <TouchableOpacity style={s.comercioTap} onPress={irAlComercio} activeOpacity={0.7} disabled={!comercioId}>
          <LogoComercio comercio={comercio} comercioId={comercioId} size={50} radius={16} />
          <View style={s.headerInfo}>
            <View style={s.nombreFila}>
              <Text style={s.comercioNombre} numberOfLines={1}>{comercioNombre}</Text>
              {!!comercioId && <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />}
            </View>
            <Text style={s.reservaId}>Reserva #{item.id}</Text>
          </View>
        </TouchableOpacity>
        {item.estado === "aceptado" && (
          <TouchableOpacity style={s.chatBtn} onPress={() => onChat?.(item)} activeOpacity={0.7}>
            <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
      <View style={s.headerChips}>
        <StatusBadge status={item.estado} />
        <PaymentBadge metodo={metodo} />
        {!!falta && (
          <View style={[s.faltaPill, falta.pronto && s.faltaPillHoy]}>
            <Ionicons name="alarm-outline" size={13} color={falta.pronto ? COLORS.surface : COLORS.brand} />
            <Text style={[s.faltaText, falta.pronto && s.faltaTextHoy]}>{falta.texto}</Text>
          </View>
        )}
      </View>

      <View style={s.perfilBox}>
        {perfilFoto ? (
          <Image source={{ uri: perfilFoto }} style={s.perfilFoto} />
        ) : (
          <View style={[s.perfilFoto, s.perfilFotoVacia]}>
            <Ionicons name="person" size={20} color={COLORS.muted} />
          </View>
        )}
        <View style={s.perfilTexto}>
          <Text style={s.perfilLabel}>Perfil</Text>
          <Text style={s.perfilNombre} numberOfLines={1}>{servicioNombre}</Text>
          {!!servicioDescripcion && (
            <Text style={s.perfilDesc} numberOfLines={2}>{servicioDescripcion}</Text>
          )}
        </View>
      </View>

      <View style={s.cuandoBox}>
        <View style={s.cuandoFila}>
          <View style={s.cuandoIcon}>
            <Ionicons name="calendar" size={15} color={COLORS.brand} />
          </View>
          <Text style={s.cuandoLabel}>Fecha</Text>
          <Text style={s.cuandoValor}>{fechaFormateada}</Text>
        </View>
        {!!horaInicio && (
          <>
            <View style={s.cuandoSep} />
            <View style={s.cuandoFila}>
              <View style={s.cuandoIcon}>
                <Ionicons name="time" size={15} color={COLORS.brand} />
              </View>
              <Text style={s.cuandoLabel}>Horario</Text>
              <Text style={s.cuandoValor}>{horaInicio} - {horaFin}</Text>
            </View>
          </>
        )}
        {!!direccionReserva && (
          <>
            <View style={s.cuandoSep} />
            <View style={s.cuandoFila}>
              <View style={s.cuandoIcon}>
                <Ionicons name="location" size={15} color={COLORS.brand} />
              </View>
              <Text style={s.cuandoLabel}>Dirección</Text>
              <Text style={s.cuandoValor} numberOfLines={2}>{direccionReserva}</Text>
            </View>
          </>
        )}
      </View>

      {item.reserva_items?.length > 0 && (
        <View style={s.itemsSection}>
          <Text style={s.itemsTitle}>Servicios</Text>
          {item.reserva_items.map((ri, idx) => (
            <View key={idx} style={[s.itemRow, idx < item.reserva_items.length - 1 && s.itemBorder]}>
              <View style={s.qtyBadge}>
                <Text style={s.qtyText}>{ri.cantidad || 1}x</Text>
              </View>
              <View style={s.itemInfo}>
                <Text style={s.itemName}>{ri.nombre || ri.name || "Servicio"}</Text>
                {ri.duracion && <Text style={s.itemTime}>{ri.duracion} min</Text>}
              </View>
              <Text style={s.itemPrice}>{formatCOP(ri.precio)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={s.footer}>
        <Text style={s.footerLabel}>Total</Text>
        <Text style={s.footerPrice}>{formatCOP(item.costo_total)}</Text>
      </View>

      <ReservaQrEvidencia reserva={item} variant="user" onUploaded={onEvidencia} />

      {!["completado", "cancelado"].includes(item.estado) && (
        <TouchableOpacity style={s.cancelBtn} onPress={() => onCancel?.(item)} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={16} color={COLORS.red600} />
          <Text style={s.cancelBtnText}>Cancelar reserva</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.zinc100,
    paddingBottom: 4,
  },

  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 16 },
  comercioTap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  headerInfo: { flex: 1, minWidth: 0 },
  nombreFila: { flexDirection: "row", alignItems: "center", gap: 4 },
  comercioNombre: { flexShrink: 1, fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink },
  faltaPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.brandSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  faltaPillHoy: { backgroundColor: COLORS.brand },
  faltaText: { fontSize: 11.5, fontFamily: "Montserrat_800ExtraBold", color: COLORS.brand },
  faltaTextHoy: { color: COLORS.surface },
  reservaId: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: COLORS.muted, marginTop: 2 },
  chatBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.ink, justifyContent: "center", alignItems: "center" },
  headerChips: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", paddingHorizontal: 16, marginTop: 12 },

  perfilBox: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 16, marginTop: 14, backgroundColor: COLORS.zinc100, borderRadius: 18, padding: 12 },
  perfilFoto: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.zinc200 },
  perfilFotoVacia: { justifyContent: "center", alignItems: "center", backgroundColor: COLORS.surface },
  perfilTexto: { flex: 1, minWidth: 0 },
  perfilLabel: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: COLORS.muted },
  perfilNombre: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink, marginTop: 1 },
  perfilDesc: { fontSize: 12, lineHeight: 16, fontFamily: "Montserrat_400Regular", color: COLORS.muted, marginTop: 2 },

  cuandoBox: { marginHorizontal: 16, marginTop: 10, borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.zinc100, paddingHorizontal: 12, paddingVertical: 4 },
  cuandoFila: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  cuandoSep: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.zinc200, marginLeft: 42 },
  cuandoIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.brandSoft, alignItems: "center", justifyContent: "center" },
  cuandoLabel: { fontSize: 12.5, fontFamily: "Montserrat_600SemiBold", color: COLORS.muted },
  cuandoValor: { flex: 1, fontSize: 13, lineHeight: 17, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink, textAlign: "right" },

  itemsSection: { marginHorizontal: 16, marginTop: 10, backgroundColor: COLORS.zinc100, borderRadius: 18, padding: 12 },
  itemsTitle: { fontSize: 12.5, fontFamily: "Montserrat_700Bold", color: COLORS.muted, marginBottom: 8 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 8 },
  itemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.zinc200, marginBottom: 8 },
  qtyBadge: { minWidth: 28, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: COLORS.brand, justifyContent: "center", alignItems: "center" },
  qtyText: { fontSize: 11, fontFamily: "Montserrat_800ExtraBold", color: COLORS.surface },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13.5, fontFamily: "Montserrat_700Bold", color: COLORS.ink },
  itemTime: { fontSize: 11.5, fontFamily: "Montserrat_600SemiBold", color: COLORS.muted, marginTop: 1 },
  itemPrice: { fontSize: 13.5, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink },

  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, marginTop: 12, borderTopWidth: 1.5, borderTopColor: COLORS.zinc200, borderStyle: "dashed" },
  footerLabel: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink },
  footerPrice: { fontSize: 21, fontFamily: "Montserrat_800ExtraBold", color: COLORS.brand },

  cancelBtn: { flexDirection: "row", justifyContent: "center", alignItems: "center", height: 46, marginHorizontal: 16, marginTop: 4, marginBottom: 12, borderRadius: 23, gap: 6, backgroundColor: "#FEF2F2" },
  cancelBtnText: { fontSize: 13.5, fontFamily: "Montserrat_700Bold", color: COLORS.red600 },
});
