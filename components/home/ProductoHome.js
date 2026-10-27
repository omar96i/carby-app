import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import FavoriteHeart from "../FavoriteHeart";
import LogoComercio from "../LogoComercio";


export const C = {
  brand: "#fa6205",
  ink: "#1C1C1E",
  muted: "#71717A",
  bg: "#F4F4F5",
  edge: "#E4E4E7",
  surface: "#FFFFFF",
  green: "#059669",
};

export const TICKET_ALTO = 112;

export const fotoProducto = (item) => (item?.foto ? `https://back.carbycol.com/storage/${item.foto}` : null);

export const formatPrice = (price) => `$${Number(price).toLocaleString("es-CO")}`;

export const preciosDe = (item, siempreDescuento = false) => {
  const precioOriginal = Number(item?.precio) || 0;
  const descuento = Number(item?.descuento) || 0;
  const tieneDescuento = descuento > 0 && (siempreDescuento || !!item?.activo_descuento);
  const precioFinal = tieneDescuento ? precioOriginal - descuento : precioOriginal;
  const pct = tieneDescuento && precioOriginal > 0 ? Math.round((descuento / precioOriginal) * 100) : 0;
  return { precioOriginal, precioFinal, tieneDescuento, pct };
};

const nombreComercio = (comercio) => comercio?.establecimiento_nombre || comercio?.nombre_completo || "";

export const irATienda = (navigation, item) => {
  if (!item?.comercio) return;
  const comercio = item.comercio;
  navigation.navigate("Shop", {
    establishmentId: comercio.id,
    userId: comercio.id,
    establishmentName: nombreComercio(comercio),
  });
};

export const abrirProducto = (navigation, item) => {
  if (!item?.comercio) return;
  const comercio = item.comercio;
  navigation.navigate("Producto", {
    product: { ...item, user_id: item.user_id ?? comercio.id },
    establishmentId: comercio.id,
    establishmentName: nombreComercio(comercio),
  });
};

export const TituloSeccion = ({ icono, colorIcono = C.brand, fondoIcono = "#FFF0E5", titulo, sub }) => (
  <View style={s.titulo}>
    <View style={[s.tituloIcono, { backgroundColor: fondoIcono }]}>
      <Ionicons name={icono} size={16} color={colorIcono} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={s.tituloTexto}>{titulo}</Text>
      {!!sub && <Text style={s.tituloSub}>{sub}</Text>}
    </View>
  </View>
);

export const BotonAgregar = ({ onPress, aro = C.surface, size = 34, style }) => (
  <TouchableOpacity
    style={[s.agregar, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, borderColor: aro }, style]}
    onPress={onPress}
    activeOpacity={0.85}
    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    accessibilityLabel="Ver producto para agregar"
  >
    <Ionicons name="add" size={Math.round(size * 0.62)} color="#FFFFFF" />
  </TouchableOpacity>
);

const LineaComercio = ({ comercio, claro = false }) => (
  <View style={s.comercio}>
    <LogoComercio comercio={comercio} comercioId={comercio?.id} size={18} />
    <Text style={[s.comercioTexto, claro && { color: "rgba(255,255,255,0.7)" }]} numberOfLines={1}>
      {nombreComercio(comercio)}
    </Text>
  </View>
);

const Precio = ({ item, siempreDescuento, claro = false }) => {
  const { precioOriginal, precioFinal, tieneDescuento, pct } = preciosDe(item, siempreDescuento);
  return (
    <View style={s.precioFila}>
      <Text style={[s.precio, claro && { color: "#FDBA74" }]}>{formatPrice(precioFinal)}</Text>
      {tieneDescuento && (
        <>
          <Text style={s.precioViejo}>{formatPrice(precioOriginal)}</Text>
          <View style={s.pct}>
            <Text style={s.pctTexto}>-{pct}%</Text>
          </View>
        </>
      )}
    </View>
  );
};

export const TarjetaProducto = ({ item, navigation, insignia, siempreDescuento = false, ancho = 156 }) => {
  const foto = fotoProducto(item);
  return (
    <TouchableOpacity style={[s.tarjeta, { width: ancho }]} activeOpacity={0.9} onPress={() => irATienda(navigation, item)}>
      <View style={s.fotoWrap}>
        <View style={[s.foto, { height: ancho - 16 }]}>
          {foto ? (
            <Image source={{ uri: foto }} style={s.fotoImg} resizeMode="cover" />
          ) : (
            <View style={s.sinFoto}>
              <Ionicons name="image-outline" size={26} color="#A1A1AA" />
            </View>
          )}
          {!!insignia && (
            <View style={s.insignia}>
              <Text style={s.insigniaTexto}>{insignia}</Text>
            </View>
          )}
        </View>
        <View style={s.corazon}>
          <FavoriteHeart productId={item.id} size={15} style={s.corazonBtn} />
        </View>
        <BotonAgregar onPress={() => abrirProducto(navigation, item)} style={s.agregarPos} />
      </View>
      <View style={s.info}>
        <Text style={s.nombre} numberOfLines={2}>{item.nombre}</Text>
        <LineaComercio comercio={item.comercio} />
        <Precio item={item} siempreDescuento={siempreDescuento} />
      </View>
    </TouchableOpacity>
  );
};

export const distanciaTexto = (km) => {
  if (km === null || km === undefined || km === "") return null;
  const n = Number(km);
  if (!Number.isFinite(n)) return null;
  if (n < 0.1) return "a menos de 100 m";
  if (n < 1) return `a ${Math.round(n * 100) * 10} m`;
  return `a ${n.toFixed(1).replace(".", ",").replace(/,0$/, "")} km`;
};

export const TicketProducto = ({ item, navigation, ancho }) => {
  const foto = fotoProducto(item);
  const { precioOriginal, precioFinal, tieneDescuento } = preciosDe(item);
  const distancia = distanciaTexto(item.distancia_km);
  return (
    <TouchableOpacity style={[s.ticket, { width: ancho }]} activeOpacity={0.9} onPress={() => irATienda(navigation, item)}>
      <View style={s.ticketFotoWrap}>
        {foto ? (
          <Image source={{ uri: foto }} style={s.ticketFoto} resizeMode="cover" />
        ) : (
          <View style={[s.ticketFoto, s.sinFoto]}>
            <Ionicons name="image-outline" size={24} color="#A1A1AA" />
          </View>
        )}
        <View style={s.ticketCorazon}>
          <FavoriteHeart productId={item.id} size={13} style={s.ticketCorazonBtn} />
        </View>
      </View>

      <View style={[s.muesca, { top: -8 }]} />
      <View style={[s.muesca, { bottom: -8 }]} />
      <View style={s.punteado}>
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={s.trazo} />
        ))}
      </View>

      <View style={s.ticketInfo}>
        <View>
          <Text style={s.ticketNombre} numberOfLines={1}>{item.nombre}</Text>
          <LineaComercio comercio={item.comercio} />
        </View>
        <View style={s.ticketAbajo}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {(!!distancia || tieneDescuento) && (
              <View style={s.ticketMeta}>
                {!!distancia && (
                  <>
                    <Ionicons name="location-outline" size={11} color="#A1A1AA" />
                    <Text style={s.ticketMetaTexto} numberOfLines={1}>{distancia}</Text>
                  </>
                )}
                {tieneDescuento && <Text style={s.ticketViejo}>{formatPrice(precioOriginal)}</Text>}
              </View>
            )}
            <Text style={s.ticketPrecio} numberOfLines={1} adjustsFontSizeToFit>{formatPrice(precioFinal)}</Text>
          </View>
          <TouchableOpacity
            style={s.ticketAgregar}
            onPress={() => abrirProducto(navigation, item)}
            activeOpacity={0.85}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Ver producto para agregar"
          >
            <Ionicons name="add" size={21} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export { LineaComercio, Precio };

const s = StyleSheet.create({
  titulo: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  tituloIcono: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  tituloTexto: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: C.ink },
  tituloSub: { fontSize: 11.5, fontFamily: "Montserrat_600SemiBold", color: C.muted, marginTop: 1 },

  agregar: { backgroundColor: C.brand, borderWidth: 4, alignItems: "center", justifyContent: "center" },

  tarjeta: { backgroundColor: C.surface, borderRadius: 22, padding: 6 },
  fotoWrap: { position: "relative" },
  foto: { borderRadius: 18, overflow: "hidden", backgroundColor: C.bg },
  fotoImg: { width: "100%", height: "100%" },
  sinFoto: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  insignia: { position: "absolute", left: 8, bottom: 8, backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  insigniaTexto: { fontSize: 10.5, fontFamily: "Montserrat_800ExtraBold", color: "#FFFFFF" },
  corazon: { position: "absolute", left: 8, top: 8 },
  corazonBtn: { width: 30, height: 30, borderRadius: 15 },
  agregarPos: { position: "absolute", right: -8, top: -8 },
  info: { paddingHorizontal: 6, paddingTop: 9, paddingBottom: 4, gap: 5 },
  nombre: { fontSize: 13, lineHeight: 17, minHeight: 34, fontFamily: "Montserrat_700Bold", color: C.ink },

  comercio: { flexDirection: "row", alignItems: "center", gap: 6 },
  comercioTexto: { flex: 1, fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: C.muted },

  precioFila: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 6, rowGap: 2 },
  precio: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: C.brand },
  precioViejo: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: "#A1A1AA", textDecorationLine: "line-through" },
  pct: { backgroundColor: "#FFF0E5", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  pctTexto: { fontSize: 10.5, fontFamily: "Montserrat_800ExtraBold", color: C.brand },

  ticket: { height: TICKET_ALTO, backgroundColor: C.surface, borderRadius: 22, flexDirection: "row" },
  ticketFotoWrap: { width: TICKET_ALTO, height: TICKET_ALTO },
  ticketFoto: { width: TICKET_ALTO, height: TICKET_ALTO, borderTopLeftRadius: 22, borderBottomLeftRadius: 22, backgroundColor: C.bg },
  ticketCorazon: { position: "absolute", left: 7, top: 7 },
  ticketCorazonBtn: { width: 26, height: 26, borderRadius: 13 },
  muesca: { position: "absolute", left: TICKET_ALTO - 8, width: 16, height: 16, borderRadius: 8, backgroundColor: C.bg },
  punteado: { position: "absolute", left: TICKET_ALTO - 1, top: 12, bottom: 12, width: 2, justifyContent: "space-between" },
  trazo: { width: 2, height: 5, borderRadius: 1, backgroundColor: C.edge },
  ticketInfo: { flex: 1, minWidth: 0, paddingTop: 12, paddingBottom: 10, paddingLeft: 16, paddingRight: 12, justifyContent: "space-between" },
  ticketNombre: { fontSize: 13.5, fontFamily: "Montserrat_800ExtraBold", color: C.ink, marginBottom: 5 },
  ticketAbajo: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  ticketMeta: { flexDirection: "row", alignItems: "center", gap: 3 },
  ticketMetaTexto: { flexShrink: 1, fontSize: 10, fontFamily: "Montserrat_600SemiBold", color: "#A1A1AA" },
  ticketViejo: { marginLeft: 4, fontSize: 10, fontFamily: "Montserrat_400Regular", color: "#A1A1AA", textDecorationLine: "line-through" },
  ticketPrecio: { fontSize: 19, fontFamily: "Montserrat_800ExtraBold", color: C.green, letterSpacing: -0.5 },
  ticketAgregar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },
});
