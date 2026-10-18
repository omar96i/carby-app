import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Polygon, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from "@expo-google-fonts/montserrat";
import { BASE_URL } from "../../constants/url";
import { GOOGLE_MAPS_API_KEY } from "../../constants/Keys";

// Valores locales hasta que responda el backend (GET /demanda/parametros)
const INDICES_DEFAULT = {
  media: { minPedidos: 10, aumentoTarifa: 10 },
  alta: { minPedidos: 20, aumentoTarifa: 20 },
};

// Malla local hasta que responda el backend (malla en /demanda/parametros)
const MALLA_DEFAULT = { coberturaKm: 5, celdaKm: 0.4, conteoKm: 1.0 };

// Número saneado con topes: evita mallas absurdas desde el admin
function clampNum(v, min, max, fb) {
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fb;
}

// La malla se recentra cuando te desplazas más de este umbral
const UMBRAL_RECENTRADO_KM = 0.5;

// Respaldo si no hay permiso de ubicación (demo Pereira)
const FALLBACK_CENTER = { latitude: 4.81321, longitude: -75.6946 };

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function nivelDeZona(pedidos, indices) {
  if (indices.alta && pedidos >= indices.alta.minPedidos) return "alta";
  if (indices.media && pedidos >= indices.media.minPedidos) return "media";
  return "baja";
}

const NIVEL_STYLE = {
  baja: { rgb: "196,181,253", solid: "#C4B5FD", base: 0, dot: "#DDD6FE", label: "Baja" },
  media: { rgb: "245,158,11", solid: "#F59E0B", base: 0.22, dot: "#FBBF24", label: "Media" },
  alta: { rgb: "234,88,12", solid: "#EA580C", base: 0.28, dot: "#FB923C", label: "Alta" },
};

const kmToLat = (km) => km / 110.574;
const kmToLng = (km, atLat) => km / (111.32 * Math.cos((atLat * Math.PI) / 180));

// Hexágonos (6 lados): el pentágono regular NO tesela el plano,
// el hexágono sí forma la "tela de araña" continua.
function crearHexagono(lat, lng, radioKm) {
  const coords = [];
  for (let i = 0; i < 6; i++) {
    const ang = ((60 * i - 30) * Math.PI) / 180; // pointy-top
    const dxKm = radioKm * Math.cos(ang);
    const dyKm = radioKm * Math.sin(ang);
    coords.push({
      latitude: lat + kmToLat(dyKm),
      longitude: lng + kmToLng(dxKm, lat),
    });
  }
  return coords;
}

function distKm(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * 110.574;
  const dLng = (lng2 - lng1) * 111.32 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// La API solo trae carreras con latitud y longitud: se aceptan
// latitude/longitude o lat/lng por robustez.
function extraerPuntos(data) {
  if (!Array.isArray(data)) return [];
  const puntos = [];
  for (const p of data) {
    const latitude = Number(p?.latitude ?? p?.lat);
    const longitude = Number(p?.longitude ?? p?.lng ?? p?.long);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      puntos.push({ latitude, longitude });
    }
  }
  return puntos;
}

// Cuenta, por hexágono, las carreras reales dentro del radio de conteo.
// Solo se guarda conteo > 0: lo demás queda transparente.
function contarDemanda(celdas, puntos, radioKm) {
  const conteo = {};
  const R2 = radioKm * radioKm;
  for (const z of celdas) {
    const cosLat = Math.cos((z.latitude * Math.PI) / 180);
    let n = 0;
    for (let i = 0; i < puntos.length; i++) {
      const p = puntos[i];
      const dLat = (p.latitude - z.latitude) * 110.574;
      const dLng = (p.longitude - z.longitude) * 111.32 * cosLat;
      if (dLat * dLat + dLng * dLng <= R2) n++;
    }
    if (n > 0) conteo[z.id] = n;
  }
  return conteo;
}

// Poda lo pintado lejos del centro para que la caché no crezca sin límite.
// El id global (g-i-j) permite ubicar cada celda sin guardar coords.
function podarConteo(conteo, clat, clng, maxKm, R) {
  const pasoX = R * Math.sqrt(3);
  const pasoY = R * 1.5;
  for (const id of Object.keys(conteo)) {
    const m = /^g-(-?\d+)-(-?\d+)$/.exec(id);
    if (!m) {
      delete conteo[id];
      continue;
    }
    const par = ((+m[2] % 2) + 2) % 2;
    const yKm = pasoY * +m[2];
    const lat = yKm / 110.574;
    const xKm = pasoX * (+m[1] + 0.5 * par);
    const lng = xKm / (111.32 * Math.cos((lat * Math.PI) / 180));
    if (distKm(clat, clng, lat, lng) > maxKm) delete conteo[id];
  }
  return conteo;
}

function aumentoDeNivel(nivel, indices) {
  if (nivel === "alta") return indices.alta ? indices.alta.aumentoTarifa : 0;
  if (nivel === "media") return indices.media ? indices.media.aumentoTarifa : 0;
  return 0;
}

// Nombre corto de una ubicación ("Calle 12 #34-56, Pereira") con Google.
async function reverseGeocodeCorto(lat, lng) {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
  );
  const json = await res.json();
  const lista = Array.isArray(json?.results) ? json.results : [];
  const valida = lista.find((r) => r?.formatted_address && !/^[\w\d]+\+\w+/.test(r.formatted_address));
  const addr = valida?.formatted_address || lista[0]?.formatted_address || "";
  return addr.split(",").slice(0, 2).join(",").trim();
}

// Rumbo en 8 vientos desde deltas en km (este=x, norte=y)
function rumbo8(dxKm, dyKm) {
  const ang = (Math.atan2(dxKm, dyKm) * 180) / Math.PI; // 0=N, 90=E
  const idx = Math.round(((ang + 360) % 360) / 45) % 8;
  return ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][idx];
}

// ─────────────────────────────────────────────
// Respiración suave (ciclo de 2.4 s): el halo sube y baja sin cortes.
// Envuelve la sombra con su propio timer: no re-renderiza el resto del mapa
function useLatido(periodo = 2400) {
  const [latido, setLatido] = useState(1);
  useEffect(() => {
    const inicio = Date.now();
    const id = setInterval(() => {
      const t = ((Date.now() - inicio) % periodo) / periodo;
      setLatido(0.5 - 0.5 * Math.cos(2 * Math.PI * t));
    }, 120);
    return () => clearInterval(id);
  }, [periodo]);
  return latido;
}
function PulsoWrapper({ celdas, revelado, fadeIds, celdaKm }) {
  const latido = useLatido();
  return <SombraLayer celdas={celdas} revelado={revelado} fadeIds={fadeIds} latido={latido} celdaKm={celdaKm} />;
}

// Envoltorio del relleno activo: la palpitación vive aquí para no
// re-renderizar el resto del mapa en cada latido
function ActivaPulsoWrapper({ celdas, revelado, fadeIds, selectedId, onSelect, radioKm }) {
  const latido = useLatido();
  return (
    <ActivaLayer
      celdas={celdas}
      revelado={revelado}
      fadeIds={fadeIds}
      selectedId={selectedId}
      onSelect={onSelect}
      latido={latido}
      radioKm={radioKm}
    />
  );
}

// Sombra del blob: doble halo cálido solo en las celdas del borde
// (las que tocan zona sin demanda). Simula sombra suave en el límite.
function SombraLayer({ celdas, revelado, fadeIds, latido = 1, celdaKm }) {
  const pulso = 0.78 + 0.22 * latido;
  return (
    <>
      {celdas.map((z) => {
        const f = fadeIds.includes(z.id) ? revelado : 1;
        return (
          <React.Fragment key={z.id}>
            <Polygon
              coordinates={crearHexagono(z.latitude, z.longitude, celdaKm * 1.26)}
              fillColor={`rgba(194,65,12,${(0.06 * f * pulso).toFixed(3)})`}
              strokeWidth={0}
              zIndex={0}
            />
            <Polygon
              coordinates={crearHexagono(z.latitude, z.longitude, celdaKm * 1.13)}
              fillColor={`rgba(194,65,12,${(0.13 * f * pulso).toFixed(3)})`}
              strokeWidth={0}
              zIndex={0}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}

// Capas sin bordes: un solo lienzo. La celda tocada lleva doble anillo
// (halo blanco + color del nivel) en vez del contorno negro.
// Las zonas sin carreras llevan velo neutro casi invisible.
// ─────────────────────────────────────────────
const BajaLayer = React.memo(function BajaLayer({ celdas, selectedId, onSelect, radioKm }) {
  return (
    <>
      {celdas.map((z) => {
        const isSel = z.id === selectedId;
        if (!isSel) {
          // Invisible pero tocable: sin velo gris sobre el mapa
          return (
            <Polygon
              key={z.id}
              coordinates={z.coords}
              fillColor="rgba(0,0,0,0)"
              strokeWidth={0}
              tappable
              onPress={() => onSelect(z.id)}
              zIndex={1}
            />
          );
        }
        return (
          <React.Fragment key={z.id}>
            <Polygon
              coordinates={crearHexagono(z.latitude, z.longitude, radioKm * 1.14)}
              fillColor="rgba(100,116,139,0.08)"
              strokeColor="rgba(15,23,42,0.35)"
              strokeWidth={5}
              tappable
              onPress={() => onSelect(z.id)}
              zIndex={9}
            />
            <Polygon
              coordinates={z.coords}
              fillColor="rgba(148,163,184,0.16)"
              strokeColor="#A1A1AA"
              strokeWidth={2.5}
              tappable
              onPress={() => onSelect(z.id)}
              zIndex={10}
            />
          </React.Fragment>
        );
      })}
    </>
  );
});

function ActivaLayer({ celdas, revelado, fadeIds, selectedId, onSelect, latido = 1, radioKm }) {
  const pulso = 0.7 + 0.3 * latido;
  return (
    <>
      {celdas.map((z) => {
        const st = NIVEL_STYLE[z.nivel];
        const alpha = st.base * (fadeIds.includes(z.id) ? revelado : 1) * pulso;
        const fill = `rgba(${st.rgb},${alpha.toFixed(3)})`;
        const isSel = z.id === selectedId;
        if (!isSel) {
          return (
            <Polygon
              key={z.id}
              coordinates={z.coords}
              fillColor={fill}
              strokeWidth={0}
              tappable
              onPress={() => onSelect(z.id)}
              zIndex={2}
            />
          );
        }
        return (
          <React.Fragment key={z.id}>
            <Polygon
              coordinates={crearHexagono(z.latitude, z.longitude, radioKm * 1.14)}
              fillColor={fill}
              strokeColor="rgba(15,23,42,0.35)"
              strokeWidth={5}
              tappable
              onPress={() => onSelect(z.id)}
              zIndex={9}
            />
            <Polygon
              coordinates={z.coords}
              fillColor={fill}
              strokeColor={st.solid}
              strokeWidth={2.5}
              tappable
              onPress={() => onSelect(z.id)}
              zIndex={10}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}

const MarcadoresLayer = React.memo(function MarcadoresLayer({ altas, medias, revelado, fadeIds, onSelect }) {
  return (
    <>
      {medias.map((z) => (
        <Marker
          opacity={fadeIds.includes(z.id) ? revelado : 1}
          key={`d-${z.id}`}
          coordinate={{ latitude: z.latitude, longitude: z.longitude }}
          tracksViewChanges={false}
          onPress={() => onSelect(z.id)}
        >
          <View style={[styles.dot, { backgroundColor: NIVEL_STYLE.media.solid }]} />
        </Marker>
      ))}
      {altas.map((z) => {
        const st = NIVEL_STYLE[z.nivel];
        return (
          <Marker
            opacity={fadeIds.includes(z.id) ? revelado : 1}
            key={`m-${z.id}`}
            coordinate={{ latitude: z.latitude, longitude: z.longitude }}
            tracksViewChanges={false}
            onPress={() => onSelect(z.id)}
          >
            <View style={[styles.badge, { backgroundColor: st.solid }]}>
              <Text style={styles.badgeText}>{z.pedidos}</Text>
            </View>
          </Marker>
        );
      })}
    </>
  );
});

export default function Demanda() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef(0);
  const fetchIdRef = useRef(0);
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });

  const [selectedId, setSelectedId] = useState(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const [userLoc, setUserLoc] = useState(null);
  const [gridCenter, setGridCenter] = useState(null);
  const [follow, setFollow] = useState(true);
  const followRef = useRef(true);
  const [locState, setLocState] = useState("buscando");

  useEffect(() => {
    followRef.current = follow;
  }, [follow]);

  useEffect(() => {
    conteoRef.current = conteo;
  }, [conteo]);

  // Datos reales del mapa de calor: idCelda -> nº carreras cercanas
  const [conteo, setConteo] = useState({});
  const [heatTotal, setHeatTotal] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [errorCalor, setErrorCalor] = useState(null);
  // Progreso del fundido al pintar (0 → 1): evita el salto brusco
  // entre malla vacía y celdas con color
  const [revelado, setRevelado] = useState(1);
  // Umbrales y % del admin (backend). Nivel ausente = inactivo.
  const [indices, setIndices] = useState(INDICES_DEFAULT);
  const [malla, setMalla] = useState(MALLA_DEFAULT);
  // Celdas del último pintado: solo esas se animan, el resto queda fijo
  const [fadeIds, setFadeIds] = useState([]);
  const conteoRef = useRef({});

  useEffect(() => {
    let timer;
    const inicio = Date.now();
    const DUR = 700;
    setRevelado(0);
    const paso = () => {
      const t = Math.min((Date.now() - inicio) / DUR, 1);
      setRevelado(1 - Math.pow(1 - t, 3)); // easeOutCubic
      if (t < 1) timer = setTimeout(paso, 50);
    };
    timer = setTimeout(paso, 50);
    return () => clearTimeout(timer);
  }, [conteo]);

  // Foco en ubicación actual + seguimiento al moverte
  useEffect(() => {
    let sub = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocState("sin-permiso");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const init = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserLoc(init);
        setGridCenter(init);
        setLocState("lista");
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 300, timeInterval: 10000 },
          (p) => {
            const next = { latitude: p.coords.latitude, longitude: p.coords.longitude };
            setUserLoc(next);
            // Nueva zona de calor al cambiar de rango (solo en seguimiento)
            setGridCenter((prev) => {
              if (!followRef.current) return prev;
              const base = prev || init;
              if (distKm(base.latitude, base.longitude, next.latitude, next.longitude) > UMBRAL_RECENTRADO_KM) {
                return next;
              }
              return base;
            });
          }
        );
      } catch (e) {
        console.log("[Demanda] ubicación error:", e?.message);
        setLocState("sin-permiso");
      }
    })();
    return () => {
      if (sub) sub.remove();
    };
  }, []);

  const center = gridCenter || FALLBACK_CENTER;
  // Geometría efectiva desde el admin, con topes y auto-ajuste para que
  // un valor extremo no sature el mapa (máx ~400 celdas)
  const geom = useMemo(() => {
    const cov = malla.coberturaKm;
    let R = Math.max(malla.celdaKm, 0.15);
    const area0 = (3 * Math.sqrt(3) * R * R) / 2;
    const est = (Math.PI * cov * cov) / area0;
    if (est > 400) R = R * Math.sqrt(est / 400);
    return { cov, R, area: (3 * Math.sqrt(3) * R * R) / 2 };
  }, [malla]);
  const delta = (geom.cov * 2.4) / 111;

  // Malla geométrica GLOBAL (sin datos): los ids son absolutos, no dependen
  // del centro. Al mover el mapa, las celdas que ya existían conservan su id
  // y su conteo: no se repintan datos viejos en posiciones nuevas.
  const celdas = useMemo(() => {
    const R = geom.R;
    const cov = geom.cov;
    const pasoX = R * Math.sqrt(3);
    const pasoY = R * 1.5;
    const cosC = Math.cos((center.latitude * Math.PI) / 180);
    const cxKm = center.longitude * 111.32 * cosC;
    const cyKm = center.latitude * 110.574;
    const iMin = Math.floor((cxKm - cov) / pasoX) - 1;
    const iMax = Math.ceil((cxKm + cov) / pasoX) + 1;
    const jMin = Math.floor((cyKm - cov) / pasoY) - 1;
    const jMax = Math.ceil((cyKm + cov) / pasoY) + 1;
    const malla = [];
    for (let j = jMin; j <= jMax; j++) {
      const par = ((j % 2) + 2) % 2;
      for (let i = iMin; i <= iMax; i++) {
        const xKm = pasoX * (i + 0.5 * par);
        const yKm = pasoY * j;
        const dx = xKm - cxKm;
        const dy = yKm - cyKm;
        if (Math.sqrt(dx * dx + dy * dy) > cov) continue;
        const lat = yKm / 110.574;
        const lng = xKm / (111.32 * Math.cos((lat * Math.PI) / 180));
        malla.push({
          id: `g-${i}-${j}`,
          fila: j,
          col: i,
          nombre: `Celda ${j >= 0 ? "N" : "S"}${Math.abs(j)}-${i >= 0 ? "E" : "O"}${Math.abs(i)}`,
          latitude: lat,
          longitude: lng,
          km2: geom.area,
          // Traslape 6%: las celdas se montan para que no quede fondo
          // entre ellas y el panal se vea parejo y continuo
          coords: crearHexagono(lat, lng, R * 1.06),
        });
      }
    }
    return malla;
  }, [center.latitude, center.longitude, geom]);

  // Vecinos por celda (para detectar el borde del blob)
  const vecinos = useMemo(() => {
    const map = {};
    const maxD = geom.R * Math.sqrt(3) * 1.05;
    const maxD2 = maxD * maxD;
    for (const a of celdas) {
      const cosA = Math.cos((a.latitude * Math.PI) / 180);
      const list = [];
      for (const b of celdas) {
        if (a.id === b.id) continue;
        const dLat = (b.latitude - a.latitude) * 110.574;
        const dLng = (b.longitude - a.longitude) * 111.32 * cosA;
        if (dLat * dLat + dLng * dLng <= maxD2) list.push(b.id);
      }
      map[a.id] = list;
    }
    return map;
  }, [celdas, geom]);

  // Misma API del mapa de calor de HomeDelivery: trae las carreras con
  // su latitud y longitud y se cuenta cuántas caen cerca de cada celda.
  const fetchCalor = useCallback(
    async (lat, lng, { forzar = false } = {}) => {
      try {
        if (!lat || !lng) return;
        if (fetchingRef.current) return;
        if (!forzar && Date.now() - lastFetchRef.current < 60000) return;
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          setErrorCalor("Inicia sesión para ver la demanda.");
          return;
        }
        fetchingRef.current = true;
        lastFetchRef.current = Date.now();
        const fetchId = ++fetchIdRef.current;
        setCargando(true);
        setErrorCalor(null);
        const url = `${BASE_URL}carreras/mapa-calor`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lat, lng, radio: 50 }),
        });
        const text = await response.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch (e) {
          throw new Error("Respuesta inválida del servidor.");
        }
        if (!response.ok || !json.status || !Array.isArray(json.data)) {
          throw new Error(json?.message || `Error del servidor (${response.status}).`);
        }
        const puntos = extraerPuntos(json.data);
        console.log("[Demanda] HEAT -> puntos:", puntos.length, "total API:", json.total);
        if (fetchIdRef.current !== fetchId) return; // respuesta vieja: se ignora
        const nuevo = contarDemanda(celdas, puntos, malla.conteoKm);
        // Pintado persistente: lo ya visitado queda, lo visible se refresca
        // y lo lejano se poda. Solo las celdas cambiadas se animan.
        const prev = conteoRef.current;
        const mezclado = podarConteo({ ...prev }, lat, lng, geom.cov * 2.5, geom.R);
        const cambiadas = [];
        for (const z of celdas) {
          const v = nuevo[z.id] ?? 0;
          const had = mezclado[z.id] ?? 0;
          if (v > 0) {
            if (had !== v) {
              mezclado[z.id] = v;
              cambiadas.push(z.id);
            }
          } else if (had !== 0) {
            delete mezclado[z.id];
            cambiadas.push(z.id);
          }
        }
        if (cambiadas.length > 0) {
          conteoRef.current = mezclado;
          setConteo(mezclado);
          setFadeIds(cambiadas);
        }
        setHeatTotal(json.total ?? puntos.length);
      } catch (e) {
        console.log("[Demanda] HEAT ERROR ->", e.message);
        setErrorCalor("No se pudo cargar la demanda.");
      } finally {
        fetchingRef.current = false;
        setCargando(false);
      }
    },
    [celdas, geom, malla.conteoKm]
  );

  // Parámetros del admin (GET /demanda/parametros)
  const fetchParametros = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;
      const response = await fetch(`${BASE_URL}demanda/parametros`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.status || !Array.isArray(json.data)) return;
      const next = { media: null, alta: null };
      for (const row of json.data) {
        if (row?.nivel !== "media" && row?.nivel !== "alta") continue;
        if (row.activo === false || row.activo === 0) continue;
        const min = Number(row.min_carreras);
        const pct = Number(row.aumento_porcentaje);
        if (!Number.isFinite(min) || !Number.isFinite(pct)) continue;
        next[row.nivel] = { minPedidos: min, aumentoTarifa: pct };
      }
      setIndices((prev) =>
        JSON.stringify(prev) === JSON.stringify(next) ? prev : next
      );
      const m = json.malla || {};
      const cobertura = clampNum(Number(m.cobertura_km), 1, 15, MALLA_DEFAULT.coberturaKm);
      const celda = clampNum(Number(m.celda_km), 0.15, 2, MALLA_DEFAULT.celdaKm);
      const conteoKm = clampNum(Number(m.conteo_km), 0.2, 5, MALLA_DEFAULT.conteoKm);
      setMalla((prev) =>
        prev.coberturaKm === cobertura && prev.celdaKm === celda && prev.conteoKm === conteoKm
          ? prev
          : { coberturaKm: cobertura, celdaKm: celda, conteoKm }
      );
    } catch (e) {
      console.log("[Demanda] PARAMS ERROR ->", e?.message);
    }
  }, []);

  // Recalcula al cambiar de rango (malla nueva)
  useEffect(() => {
    fetchCalor(center.latitude, center.longitude, { forzar: true });
  }, [center.latitude, center.longitude, fetchCalor]);

  // Refresca al volver a la pestaña y cada 60 s
  useFocusEffect(
    useCallback(() => {
      fetchCalor(center.latitude, center.longitude);
      fetchParametros();
    }, [center.latitude, center.longitude, fetchCalor, fetchParametros])
  );

  useEffect(() => {
    const id = setInterval(() => {
      const c = gridCenter || FALLBACK_CENTER;
      fetchCalor(c.latitude, c.longitude);
    }, 60000);
    return () => clearInterval(id);
  }, [fetchCalor, gridCenter]);

  // Parámetros del admin al entrar y cada 5 min (cambian poco)
  useEffect(() => {
    fetchParametros();
    const id = setInterval(fetchParametros, 300000);
    return () => clearInterval(id);
  }, [fetchParametros]);

  // La cámara te sigue mientras no arrastres el mapa
  useEffect(() => {
    if (userLoc && follow && mapRef.current) {
      mapRef.current.animateToRegion(
        { ...userLoc, latitudeDelta: delta, longitudeDelta: delta },
        1000
      );
    }
  }, [userLoc, follow]);

  const recenter = useCallback(() => {
    setFollow(true);
    const target = userLoc || gridCenter;
    if (userLoc) setGridCenter(userLoc);
    if (target && mapRef.current) {
      mapRef.current.animateToRegion(
        { ...target, latitudeDelta: delta, longitudeDelta: delta },
        800
      );
    }
  }, [userLoc, gridCenter]);

  const onSelect = useCallback((id) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const reintentar = useCallback(() => {
    const c = gridCenter || FALLBACK_CENTER;
    fetchCalor(c.latitude, c.longitude, { forzar: true });
  }, [fetchCalor, gridCenter]);

  // Niveles con conteos reales y umbrales del backend (0 = transparente)
  const zonas = useMemo(() => {
    const idx = indices;
    return celdas.map((z) => {
      const pedidos = conteo[z.id] ?? 0;
      const nivel = nivelDeZona(pedidos, idx);
      return { ...z, pedidos, nivel, aumento: aumentoDeNivel(nivel, idx) };
    });
  }, [celdas, conteo, indices]);
  const bajas = useMemo(() => zonas.filter((z) => z.nivel === "baja"), [zonas]);
  const activas = useMemo(() => zonas.filter((z) => z.nivel !== "baja"), [zonas]);
  const altas = useMemo(() => zonas.filter((z) => z.nivel === "alta"), [zonas]);
  const medias = useMemo(() => zonas.filter((z) => z.nivel === "media"), [zonas]);
  // Celdas del límite: activas que tocan al menos una celda sin demanda
  const borde = useMemo(() => {
    const activeIds = new Set(activas.map((z) => z.id));
    return activas.filter((z) => (vecinos[z.id] || []).some((nb) => !activeIds.has(nb)));
  }, [activas, vecinos]);

  const selected = zonas.find((z) => z.id === selectedId) || null;

  // Dirección de la zona seleccionada (se pide al tocarla)
  const [selectedDireccion, setSelectedDireccion] = useState("");
  useEffect(() => {
    if (!selected) {
      setSelectedDireccion("");
      return;
    }
    let viva = true;
    setSelectedDireccion("");
    reverseGeocodeCorto(selected.latitude, selected.longitude)
      .then((corta) => {
        if (viva) setSelectedDireccion(corta || "Zona seleccionada");
      })
      .catch(() => {
        if (viva) setSelectedDireccion("Zona seleccionada");
      });
    return () => {
      viva = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);
  const bottomPad = 104 + insets.bottom;
  const rangoTxt = `rango ${Math.round(geom.cov * 2)} km`;

  // Dirección del punto evaluado (reverse geocode, cacheada por celda de ~11 m)
  const [zonaDireccion, setZonaDireccion] = useState("");
  const zonaGeoKeyRef = useRef("");
  useEffect(() => {
    const punto = follow ? userLoc || gridCenter : gridCenter;
    if (!punto) return;
    const key = `${punto.latitude.toFixed(4)},${punto.longitude.toFixed(4)}`;
    if (zonaGeoKeyRef.current === key) return;
    zonaGeoKeyRef.current = key;
    setZonaDireccion("");
    const t = setTimeout(async () => {
      try {
        const corta = await reverseGeocodeCorto(punto.latitude, punto.longitude);
        if (zonaGeoKeyRef.current === key) setZonaDireccion(corta || "Dirección no disponible");
      } catch (e) {
        if (zonaGeoKeyRef.current === key) setZonaDireccion("");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [follow, userLoc, gridCenter]);

  // ── Mi zona: analiza el punto evaluado (tu ubicación en seguimiento,
  // el pin central en exploración) contra la malla ya calculada.
  const miZona = useMemo(() => {
    const punto = follow ? userLoc || gridCenter : gridCenter;
    if (!punto || zonas.length === 0) return null;
    let celda = zonas[0];
    let dMin = Infinity;
    for (const z of zonas) {
      const d = distKm(punto.latitude, punto.longitude, z.latitude, z.longitude);
      if (d < dMin) {
        dMin = d;
        celda = z;
      }
    }
    // Zona activa más cercana (distinta a la actual si ya es activa)
    let mejor = null;
    let dMejor = Infinity;
    let dxMejor = 0;
    let dyMejor = 0;
    for (const z of activas) {
      if (z.id === celda.id) continue;
      const dyKm = (z.latitude - punto.latitude) * 110.574;
      const dxKm = (z.longitude - punto.longitude) * 111.32 * Math.cos((punto.latitude * Math.PI) / 180);
      const d = Math.sqrt(dxKm * dxKm + dyKm * dyKm);
      if (d < dMejor) {
        dMejor = d;
        mejor = z;
        dxMejor = dxKm;
        dyMejor = dyKm;
      }
    }
    // Cuánto falta para subir de nivel (umbrales del admin)
    const sigUmbral =
      celda.nivel === "baja"
        ? indices.media?.minPedidos ?? null
        : celda.nivel === "media"
          ? indices.alta?.minPedidos ?? null
          : null;
    return {
      celda,
      nearest: mejor,
      nearestKm: mejor ? dMejor : null,
      rumbo: mejor ? rumbo8(dxMejor, dyMejor) : null,
      faltan: sigUmbral != null ? Math.max(sigUmbral - celda.pedidos, 0) : null,
      explorando: !follow,
    };
  }, [follow, userLoc, gridCenter, zonas, activas, indices]);

  if (!fontsLoaded) return <View style={styles.loading} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: delta,
          longitudeDelta: delta,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onPanDrag={() => setFollow(false)}
        onRegionChangeComplete={(region) => {
          // Modo exploración: el centro del mapa es el pin invisible.
          // Al mover el mapa se recalcula la zona de calor desde ahí.
          if (follow) return;
          const next = { latitude: region.latitude, longitude: region.longitude };
          setGridCenter((prev) => {
            const base = prev || FALLBACK_CENTER;
            if (distKm(base.latitude, base.longitude, next.latitude, next.longitude) > UMBRAL_RECENTRADO_KM) {
              return next;
            }
            return base;
          });
        }}
      >
        {borde.length > 0 && (
          <PulsoWrapper celdas={borde} revelado={revelado} fadeIds={fadeIds} celdaKm={geom.R} />
        )}
        <BajaLayer celdas={bajas} selectedId={selectedId} onSelect={onSelect} radioKm={geom.R} />
        <ActivaPulsoWrapper
          celdas={activas}
          revelado={revelado}
          fadeIds={fadeIds}
          selectedId={selectedId}
          onSelect={onSelect}
          radioKm={geom.R}
        />
        <MarcadoresLayer altas={altas} medias={medias} revelado={revelado} fadeIds={fadeIds} onSelect={onSelect} />
      </MapView>

      {/* Pin invisible: marca el centro desde donde se calcula el calor */}
      {!follow && locState !== "buscando" && (
        <View style={styles.centerPin} pointerEvents="none">
          <View style={styles.centerDot} />
        </View>
      )}

      {/* ── Top flotante ── */}
      <SafeAreaView style={styles.topWrap} edges={["top", "left", "right"]}>
        <TouchableOpacity style={styles.liveChip} onPress={recenter} activeOpacity={0.85}>
          {locState === "buscando" || cargando ? (
            <ActivityIndicator size="small" color="#EA580C" />
          ) : (
            <Ionicons name="locate" size={12} color="#EA580C" />
          )}
          <Text style={styles.liveText}>
            {locState === "buscando"
              ? "Buscando tu ubicación…"
              : locState === "lista"
                ? follow
                  ? `Tu zona · ${heatTotal} carreras · ${rangoTxt}`
                  : `Explorando · ${heatTotal} carreras · ${rangoTxt}`
                : `Pereira (demo) · ${heatTotal} carreras · ${rangoTxt}`}
          </Text>
          {!follow && locState === "lista" && (
            <Text style={styles.liveFollow}>· recentrar</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>

      {/* ── Detalle de celda seleccionada ── */}
      {selected && (
        <View style={[styles.selectedCard, { top: Math.max(insets.top, 12) + 108 }]}>
          <View style={styles.selectedTop}>
            <View style={styles.selectedTexts}>
              <Text style={styles.selectedName} numberOfLines={1}>
                {selectedDireccion || "Buscando dirección…"}
              </Text>
              <Text style={styles.selectedSub}>
                {selected.pedidos} carreras en esta zona
              </Text>
            </View>
            <View
              style={[
                styles.nivelPill,
                { backgroundColor: NIVEL_STYLE[selected.nivel].solid },
              ]}
            >
              <Text style={styles.nivelPillText}>
                {NIVEL_STYLE[selected.nivel].label} · +{selected.aumento}%
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedId(null)} hitSlop={12}>
              <Ionicons name="close" size={20} color="#A1A1AA" />
            </TouchableOpacity>
          </View>
          <Text style={styles.selectedHint}>
            {selected.nivel === "baja"
              ? "Poco movimiento por aquí."
              : `Las carreras en esta zona pagan +${selected.aumento}% extra.`}
          </Text>
        </View>
      )}

      {/* ── Bottom flotante ── */}
      <View style={[styles.bottomWrap, { bottom: bottomPad }]}>
        {miZona && locState !== "buscando" && (
          <View
            style={[
              styles.miZonaCard,
              { borderLeftColor: NIVEL_STYLE[miZona.celda.nivel].solid },
            ]}
          >
            <View style={styles.miZonaIconWrap}>
              <Ionicons
                name="flame"
                size={20}
                color={NIVEL_STYLE[miZona.celda.nivel].solid}
              />
            </View>
            <View style={styles.miZonaBody}>
              <Text style={styles.miZonaTitle}>
                {miZona.explorando ? "Zona del pin" : "Mi zona"} ·{" "}
                {NIVEL_STYLE[miZona.celda.nivel].label}
                {miZona.celda.aumento > 0 ? ` · +${miZona.celda.aumento}%` : ""}
              </Text>
              {zonaDireccion ? (
                <View style={styles.miZonaDirRow}>
                  <Ionicons name="location-sharp" size={11} color="#94A3B8" />
                  <Text style={styles.miZonaDir} numberOfLines={1}>
                    {zonaDireccion}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.miZonaSub}>
                {miZona.celda.pedidos} carreras cerca
                {miZona.celda.nivel === "baja"
                  ? miZona.nearest
                    ? ` · caliente más cercana a ${miZona.nearestKm.toFixed(1)} km (${miZona.rumbo})`
                    : " · sin zonas calientes en rango"
                  : miZona.faltan == null || miZona.faltan <= 0
                    ? " · nivel máximo"
                    : ` · faltan ${miZona.faltan} para Alta`}
              </Text>
            </View>
          </View>
        )}
        {errorCalor && (
          <TouchableOpacity style={styles.errorPill} onPress={reintentar} activeOpacity={0.85}>
            <Ionicons name="warning-outline" size={14} color="#FCA5A5" />
            <Text style={styles.errorText}>{errorCalor} Toca para reintentar.</Text>
          </TouchableOpacity>
        )}

        <View style={styles.legendRow}>
          <View style={styles.legendPill}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotHollow]} />
              <Text style={styles.legendText}>Baja</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: NIVEL_STYLE.media.dot }]} />
              <Text style={styles.legendText}>Media</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: NIVEL_STYLE.alta.dot }]} />
              <Text style={styles.legendText}>Alta</Text>
            </View>
            <TouchableOpacity onPress={() => setInfoVisible(true)} hitSlop={10}>
              <Ionicons name="information-circle-outline" size={18} color="#A1A1AA" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={reintentar} activeOpacity={0.8}>
            {cargando ? (
              <ActivityIndicator size="small" color="#EA580C" />
            ) : (
              <Ionicons name="refresh" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.indicesBar}>
          <View style={styles.indiceMini}>
            <View style={[styles.indiceDot, { backgroundColor: NIVEL_STYLE.media.solid }]} />
            <Text style={styles.indiceMiniText}>
              Media {indices.media ? `+${Number(indices.media.aumentoTarifa)}%` : "—"}
            </Text>
          </View>
          <View style={styles.indicesDivider} />
          <View style={styles.indiceMini}>
            <View style={[styles.indiceDot, { backgroundColor: NIVEL_STYLE.alta.solid }]} />
            <Text style={styles.indiceMiniText}>
              Alta {indices.alta ? `+${Number(indices.alta.aumentoTarifa)}%` : "—"}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Modal info ── */}
      <Modal
        visible={infoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setInfoVisible(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Zonas de demanda</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalText}>
                Los colores muestran dónde hay más pedidos de carreras en este
                momento. Muévete a las zonas naranjas o rojas: ahí las carreras
                pagan un porcentaje extra sobre la tarifa normal.
              </Text>
              <View style={styles.modalRow}>
                <View style={[styles.legendDot, { backgroundColor: NIVEL_STYLE.media.solid }]} />
                <Text style={styles.modalText}>
                  Media: {indices.media ? `las carreras pagan +${Number(indices.media.aumentoTarifa)}% extra.` : "sin aumento por ahora."}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <View style={[styles.legendDot, { backgroundColor: NIVEL_STYLE.alta.solid }]} />
                <Text style={styles.modalText}>
                  Alta: {indices.alta ? `las carreras pagan +${Number(indices.alta.aumentoTarifa)}% extra.` : "sin aumento por ahora."}
                </Text>
              </View>
              <Text style={styles.modalNote}>
                La tarjeta "Mi zona" te dice en qué zona estás parado y cuánto extra ganarías ahí.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setInfoVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#131315" },
  loading: { flex: 1, backgroundColor: "#131315" },

  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontFamily: "Montserrat_800ExtraBold",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  centerPin: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  centerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFF",
    borderWidth: 3,
    borderColor: "#EA580C",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },

  topWrap: { position: "absolute", left: 16, right: 16, zIndex: 10 },
  liveChip: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(28,28,30,0.95)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(234,88,12,0.35)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  liveText: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: "#F5F5F5",
  },
  liveFollow: {
    fontSize: 11,
    fontFamily: "Montserrat_700Bold",
    color: "#EA580C",
  },

  selectedCard: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9,
    backgroundColor: "#1C1C1E",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  selectedTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  selectedTexts: { flex: 1 },
  selectedName: {
    fontSize: 16,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#FFFFFF",
  },
  selectedSub: {
    fontSize: 12,
    fontFamily: "Montserrat_600SemiBold",
    color: "#A1A1AA",
    marginTop: 2,
  },
  nivelPill: {
    marginLeft: "auto",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  nivelPillText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Montserrat_700Bold",
  },
  selectedHint: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#A1A1AA",
    marginTop: 8,
  },

  bottomWrap: { position: "absolute", left: 16, right: 16, zIndex: 10, gap: 8 },
  errorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2A1215",
    borderWidth: 1,
    borderColor: "#7F1D1D",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FCA5A5",
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(28,28,30,0.96)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendDotHollow: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#71717A",
  },
  legendText: {
    fontSize: 11,
    fontFamily: "Montserrat_700Bold",
    color: "#D4D4D8",
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(28,28,30,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },

  miZonaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(28,28,30,0.97)",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  miZonaIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(234,88,12,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  miZonaBody: { flex: 1 },
  miZonaDirRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  miZonaDir: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: "#94A3B8",
  },
  miZonaTitle: {
    fontSize: 13,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#FFFFFF",
  },
  miZonaSub: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: "#A1A1AA",
    marginTop: 2,
  },
  indicesBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    backgroundColor: "rgba(28,28,30,0.96)",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  indiceMini: { flexDirection: "row", alignItems: "center", gap: 5 },
  indiceMiniText: {
    fontSize: 11,
    fontFamily: "Montserrat_700Bold",
    color: "#E4E4E7",
  },
  indicesDivider: { width: 1, height: 14, backgroundColor: "#E2E8F0" },
  indiceDot: { width: 10, height: 10, borderRadius: 5 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 22,
    padding: 20,
    maxHeight: "70%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  modalRow: { flexDirection: "row", gap: 8, marginTop: 10, alignItems: "flex-start" },
  modalText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#D4D4D8",
    lineHeight: 19,
  },
  modalNote: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    color: "#94A3B8",
    marginTop: 12,
  },
  modalBtn: {
    backgroundColor: "#EA580C",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  modalBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
  },
});
