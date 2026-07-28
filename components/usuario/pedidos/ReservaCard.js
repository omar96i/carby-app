import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, formatCOP, formatDateShort, metodoPagoLabel, RADIUS, SHADOWS } from "./helpers";
import StatusBadge from "./StatusBadge";
import PaymentBadge from "./PaymentBadge";

export default function ReservaCard({ item }) {
  const clienteNombre = item.user_perfil?.user?.nombre_completo || item.cliente_nombre || "Cliente";
  const servicioNombre = item.servicio_nombre || item.user_perfil?.nombre || "Perfil";
  const servicioDescripcion = item.servicio_descripcion || item.user_perfil?.descripcion || "";
  const metodo = metodoPagoLabel(item.metodo_pago);
  const fechaFormateada = item.fecha_formateada || formatDateShort(item.fecha);
  const horaInicio = item.hora_inicio_formateada || item.hora_inicio?.slice(0, 5) || "";
  const horaFin = item.hora_fin_formateada || item.hora_fin?.slice(0, 5) || "";

  let direccionReserva = null;
  try {
    if (item.datos_generales) {
      const dg = typeof item.datos_generales === "string" ? JSON.parse(item.datos_generales) : item.datos_generales;
      direccionReserva = dg?.direccion || null;
    }
  } catch (e) {}

  return (
    <View style={[s.card, SHADOWS.card]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerInfo}>
          <Text style={s.clienteNombre}>{clienteNombre}</Text>
        </View>
        <View style={s.headerChips}>
          <PaymentBadge metodo={metodo} />
          <StatusBadge status={item.estado === "confirmado" ? "confirmado" : item.estado} />
        </View>
        <Text style={s.reservaId}>Reserva #{item.id}</Text>
      </View>

      {/* Body */}
      <View style={s.body}>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Perfil:</Text>
          <Text style={s.infoValue} numberOfLines={1}>{servicioNombre}</Text>
        </View>
        {!!servicioDescripcion && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Descripción:</Text>
            <Text style={s.infoValue} numberOfLines={2}>{servicioDescripcion}</Text>
          </View>
        )}
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Fecha:</Text>
          <Text style={s.infoValue}>{fechaFormateada}</Text>
        </View>
        {!!horaInicio && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Horario:</Text>
            <Text style={s.infoValue}>{horaInicio} - {horaFin}</Text>
          </View>
        )}
        {!!direccionReserva && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Dirección:</Text>
            <Text style={s.infoValue} numberOfLines={2}>{direccionReserva}</Text>
          </View>
        )}
      </View>

      {/* Productos del reserva */}
      {item.reserva_items?.length > 0 && (
        <View style={s.itemsSection}>
          <Text style={s.itemsTitle}>SERVICIOS</Text>
          {item.reserva_items.map((ri, idx) => (
            <View key={idx} style={[s.itemRow, idx < item.reserva_items.length - 1 && s.itemBorder]}>
              <View style={s.qtyBadge}>
                <Text style={s.qtyText}>{ri.cantidad || 1}</Text>
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

      {/* Footer */}
      <View style={s.footer}>
        <View>
          <Text style={s.footerLabel}>Total</Text>
          <Text style={s.footerPrice}>{formatCOP(item.costo_total)}</Text>
        </View>
        <View style={s.footerMeta}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.muted} />
          <Text style={s.footerDate}>{fechaFormateada}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.zinc100,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerInfo: {
    marginBottom: 8,
  },
  clienteNombre: {
    fontSize: 16,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.ink,
  },
  headerChips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 6,
    marginTop: 4,
  },
  reservaId: {
    fontSize: 12,
    fontFamily: "Montserrat_300Light",
    color: COLORS.muted,
    marginTop: 4,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "Montserrat_600SemiBold",
    color: COLORS.muted,
    flexShrink: 0,
    marginRight: 12,
  },
  infoValue: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
    color: COLORS.ink,
    textAlign: "right",
  },
  itemsSection: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: COLORS.zinc50,
    borderRadius: 16,
    padding: 12,
  },
  itemsTitle: {
    fontSize: 10,
    fontFamily: "Montserrat_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: COLORS.muted,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.zinc200,
    borderStyle: "dashed",
    marginBottom: 8,
  },
  qtyBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: COLORS.brandSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: {
    fontSize: 11,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.brand,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    color: COLORS.ink,
  },
  itemTime: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: COLORS.muted,
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 13,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.ink,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.zinc200,
    borderStyle: "dashed",
    marginTop: 12,
  },
  footerLabel: {
    fontSize: 9,
    fontFamily: "Montserrat_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: COLORS.muted,
  },
  footerPrice: {
    fontSize: 19,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.ink,
    letterSpacing: -0.5,
  },
  footerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerDate: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: COLORS.muted,
  },
});
