import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { C } from "./RegistroUI";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const ITEM = 44;
const ANIO_ACTUAL = new Date().getFullYear();
const OPC_MESES = MESES.map((m, i) => ({ valor: i + 1, texto: m }));
const OPC_ANIOS = Array.from({ length: 100 }, (_, i) => ({ valor: ANIO_ACTUAL - i, texto: String(ANIO_ACTUAL - i) }));
const OPC_DIAS = Array.from({ length: 31 }, (_, i) => ({ valor: i + 1, texto: String(i + 1) }));

const diasDelMes = (mes, anio) => new Date(anio || 2000, mes || 1, 0).getDate();
const dosDigitos = (n) => String(n).padStart(2, "0");
const getItemLayout = (_, index) => ({ length: ITEM, offset: ITEM * index, index });

const leer = (valor) => {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(valor || "");
  return m ? { anio: +m[1], mes: +m[2], dia: +m[3] } : { anio: null, mes: null, dia: null };
};

const Columna = memo(function Columna({ titulo, opciones, valor, campo, onElegir, ancho }) {
  const indiceInicial = useMemo(() => {
    const i = opciones.findIndex((o) => o.valor === valor);
    return i > 1 ? i - 1 : 0;
  }, []);
  const renderItem = useCallback(({ item }) => {
    const on = item.valor === valor;
    return (
      <TouchableOpacity style={s.opcionCaja} activeOpacity={0.7} onPress={() => onElegir(campo, item.valor)}>
        <View style={[s.opcion, on && s.opcionOn]}>
          <Text style={[s.opcionTexto, on && s.opcionTextoOn]} numberOfLines={1}>{item.texto}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [valor, campo, onElegir]);
  return (
    <View style={[s.columna, { flex: ancho }]}>
      <Text style={s.columnaTitulo}>{titulo}</Text>
      <FlatList
        style={s.lista}
        data={opciones}
        extraData={valor}
        keyExtractor={(o) => String(o.valor)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialScrollIndex={indiceInicial}
        initialNumToRender={7}
        maxToRenderPerBatch={10}
        windowSize={5}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      />
    </View>
  );
});

export default function SelectorFecha({ fechaNacimiento, setFechaNacimiento }) {
  const [sel, setSel] = useState(() => leer(fechaNacimiento));
  const selRef = useRef(sel);
  const setFechaRef = useRef(setFechaNacimiento);
  setFechaRef.current = setFechaNacimiento;

  const elegir = useCallback((campo, v) => {
    const nuevo = { ...selRef.current, [campo]: v };
    if (nuevo.dia && nuevo.mes) nuevo.dia = Math.min(nuevo.dia, diasDelMes(nuevo.mes, nuevo.anio));
    selRef.current = nuevo;
    setSel(nuevo);
    if (nuevo.dia && nuevo.mes && nuevo.anio) {
      setFechaRef.current(`${nuevo.anio}/${dosDigitos(nuevo.mes)}/${dosDigitos(nuevo.dia)}`);
    }
  }, []);

  const completo = sel.dia && sel.mes && sel.anio;
  const totalDias = diasDelMes(sel.mes, sel.anio);
  const opcDias = useMemo(() => OPC_DIAS.slice(0, totalDias), [totalDias]);

  return (
    <View style={s.contenedor}>
      <View style={[s.vista, completo && s.vistaOn]}>
        <Text style={[s.vistaTexto, completo && s.vistaTextoOn]}>
          {completo ? `${sel.dia} de ${MESES[sel.mes - 1].toLowerCase()} de ${sel.anio}` : "Elige día, mes y año"}
        </Text>
      </View>

      <View style={s.columnas}>
        <Columna titulo="Día" campo="dia" ancho={0.8} valor={sel.dia} opciones={opcDias} onElegir={elegir} />
        <Columna titulo="Mes" campo="mes" ancho={1.5} valor={sel.mes} opciones={OPC_MESES} onElegir={elegir} />
        <Columna titulo="Año" campo="anio" ancho={1} valor={sel.anio} opciones={OPC_ANIOS} onElegir={elegir} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  contenedor: { width: "100%" },
  vista: { backgroundColor: C.bg, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center", marginBottom: 16 },
  vistaOn: { backgroundColor: C.iconBg },
  vistaTexto: { fontSize: 15, fontFamily: "Montserrat_600SemiBold", color: C.muted },
  vistaTextoOn: { fontSize: 17, fontFamily: "Montserrat_800ExtraBold", color: C.brand },
  columnas: { flexDirection: "row", gap: 8 },
  columna: { minWidth: 0 },
  columnaTitulo: { fontSize: 12, fontFamily: "Montserrat_700Bold", color: C.muted, textAlign: "center", marginBottom: 8 },
  lista: { height: ITEM * 5, backgroundColor: C.bg, borderRadius: 18 },
  opcionCaja: { height: ITEM, paddingVertical: 3, paddingHorizontal: 4 },
  opcion: { flex: 1, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  opcionOn: { backgroundColor: C.brand },
  opcionTexto: { fontSize: 14, fontFamily: "Montserrat_400Regular", color: C.ink },
  opcionTextoOn: { color: C.surface, fontFamily: "Montserrat_800ExtraBold" },
});
