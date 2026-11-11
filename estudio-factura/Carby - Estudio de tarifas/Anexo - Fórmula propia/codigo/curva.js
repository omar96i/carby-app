// CURVA · Fórmula PROPIA de Carby con horas pico como CURVA CONTINUA (uso interno).
// Sin precios recientes de inDrive: solo el modelo entrenado de madrugada (datos/modelo-curva.json, analisis/curva.mjs).
//
// precio = (fijo + $/km · km + $/min · min) × recargo(tipo de jornada, hora) × (km / 5)^e_km(hora) × tráfico^e_tr(hora)
//          × zona de recogida × zona de destino × lluvia × colchón (día / noche)        → redondeado a $100, nunca bajo la mínima
//
// - La JORNADA empieza a las 6:00 a. m.: la madrugada pertenece a la noche que empezó el día anterior (el domingo a las 2 a. m.
//   es la noche del sábado). Tipos: laboral (lun–vie), sábado, domingo (y festivos). Festivo = domingo.
// - Todas las curvas son tablas cada 30 min (06:00 … 05:30 y 06:00 del día siguiente) y entre nudos se interpola en línea
//   recta: el precio cambia de forma continua con el reloj, sin escalones.
// - Puro: sin disco, síncrono, sin lecturas recientes. Firma: cotizarCurva({ modelo, viaje, vehiculo? }).
//   `modelo` = el JSON completo ({ carro, moto }) o la parte de un vehículo. El vehículo sale de `vehiculo`, de
//   `viaje.vehiculo` (filas()) o, si no hay, se asume carro.
import { esFestivo } from './util.js';

export const PASO = 0.5; // horas entre nudos
export const NUDOS = 49; // 0, 0,5, …, 24 h desde el inicio de la jornada
export const TIPOS = ['laboral', 'sabado', 'domingo'];

// Etiqueta de reloj de cada nudo (inicio 6 → "06:00", …, "05:30", "06:00+" = 6 a. m. del día siguiente).
export function etiquetas(inicio = 6) {
  return Array.from({ length: NUDOS }, (_, j) => {
    const h = (inicio + j * PASO) % 24, hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}${j === NUDOS - 1 ? '+' : ''}`;
  });
}

// Tipo de jornada y hora dentro de ella (x en [0, 24)).
export function jornada(ts, inicio = 6) {
  const t = new Date(ts), j = new Date(ts - inicio * 3600e3);
  const x = (((t.getHours() + t.getMinutes() / 60 + t.getSeconds() / 3600 - inicio) % 24) + 24) % 24;
  const tipo = esFestivo(j) || j.getDay() === 0 ? 'domingo' : j.getDay() === 6 ? 'sabado' : 'laboral';
  return { tipo, x, dia: j.getDay() };
}

// Pesos de interpolación lineal entre nudos.
export function hat(x) {
  const u = Math.min(Math.max(x / PASO, 0), NUDOS - 1 - 1e-9), j = Math.floor(u);
  return [j, u - j];
}
export const interp = (a, x) => { const [j, w] = hat(x); return a[j] * (1 - w) + a[j + 1] * w; };

/* ---------- Hexágonos (mismos ids que nucleo/candidatas/exacto.js) ---------- */
const LAT0 = 6.25, LNG0 = -75.57;
const KM_LAT = 110.574, KM_LNG = 111.32 * Math.cos((LAT0 * Math.PI) / 180);
export function hexId(lat, lng, radioKm) {
  const x = (lng - LNG0) * KM_LNG, y = (lat - LAT0) * KM_LAT;
  const qf = ((Math.sqrt(3) / 3) * x - y / 3) / radioKm, rf = ((2 / 3) * y) / radioKm, sf = -qf - rf;
  let q = Math.round(qf), r = Math.round(rf);
  const s = Math.round(sf), dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
  return `${radioKm}:${q + 0}:${r + 0}`;
}
export function hexVecinos(id) {
  const [R, q, r] = id.split(':');
  return [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].map(([a, b]) => `${R}:${+q + a}:${+r + b}`);
}
// Factor de un hexágono: el suyo; si nunca se vio, el promedio (en log) de sus vecinos vistos, a medias; si no, 1.
export function factorHex(tabla, id) {
  if (!tabla) return 1;
  if (tabla[id] != null) return tabla[id];
  const v = hexVecinos(id).map((k) => tabla[k]).filter((x) => x != null);
  return v.length ? Math.exp((0.5 * v.reduce((a, x) => a + Math.log(x), 0)) / v.length) : 1;
}

/* ---------- Tablas legibles → arreglos (con caché) ---------- */
const CACHE = new WeakMap();
const arr = (t) => (Array.isArray(t) ? t : Object.values(t));
function compilado(V) {
  let c = CACHE.get(V);
  if (c) return c;
  c = {
    recargo: Object.fromEntries(TIPOS.map((k) => [k, arr(V.recargo[k] ?? V.recargo.laboral)])),
    eKm: V.distancia?.exponente ? arr(V.distancia.exponente) : null,
    eTr: V.trafico?.exponente ? arr(V.trafico.exponente) : null,
  };
  CACHE.set(V, c);
  return c;
}

export function partes(V, viaje) {
  const C = compilado(V), inicio = V.jornada?.inicio ?? 6;
  const J = jornada(viaje.ts ?? Date.parse(viaje.fecha), inicio);
  const minutos = V.base.minutos === 'libre' ? viaje.libre ?? viaje.min : viaje.min;
  const base = V.base.fijo + V.base.km * viaje.km + V.base.min * minutos;
  const recargo = interp(C.recargo[J.tipo], J.x);
  const refKm = V.distancia?.ref_km ?? 5;
  const fKm = C.eKm ? Math.pow(Math.max(viaje.km, 0.3) / refKm, interp(C.eKm, J.x)) : 1;
  const tr = Math.min(Math.max(viaje.trafico || 1, 0.6), 2.5);
  const fTr = C.eTr ? Math.pow(tr, interp(C.eTr, J.x)) : 1;
  // Zonas: una o varias escalas de hexágonos (p. ej. 4 km y 1,5 km), cada una con su factor encogido.
  let zo = 1, zd = 1;
  for (const Z of V.zona ? [].concat(V.zona) : []) {
    if (viaje.o && Z.origen) zo *= factorHex(Z.origen, hexId(viaje.o[0], viaje.o[1], Z.radio));
    if (viaje.d && Z.destino) zd *= factorHex(Z.destino, hexId(viaje.d[0], viaje.d[1], Z.radio));
  }
  const ll = viaje.lluvia ? V.lluvia ?? 1 : 1;
  const reloj = (J.x + inicio) % 24, nocturna = reloj < 6 || reloj >= 20; // franja noche 8 p. m.–6 a. m.
  // Noche en curso: la madrugada (0–6 a. m.) de la jornada cuya tarde-noche ya entró al modelo mezcla la curva con el nivel
  // plano observado esa noche (6 p. m.–12 a. m.): recargo^(1−w) · (recargo de la tarde · nivel)^w.
  const NC = V.noche_en_curso;
  let recargoFinal = recargo, enCurso = false;
  if (NC && NC.w > 0 && J.x >= 18 && jornadaId(viaje.ts ?? Date.parse(viaje.fecha), inicio) === NC.jornada) {
    recargoFinal = Math.pow(recargo, 1 - NC.w) * Math.pow(NC.recargo_tarde * NC.nivel, NC.w);
    enCurso = true;
  }
  const colchon = V.colchon ? (nocturna ? V.colchon.noche : V.colchon.dia) ?? 1 : 1;
  return { tipo: J.tipo, x: J.x, base, recargo: recargoFinal, recargoCurva: recargo, enCurso, fKm, fTr, zo, zd, ll, colchon, nocturna };
}
// Id de la jornada (fecha local de ts − inicio): "2026-10-4".
export function jornadaId(ts, inicio = 6) { const t = new Date(ts - inicio * 3600e3); return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`; }

export function cotizarCurva({ modelo, viaje, vehiculo }) {
  const v = vehiculo || viaje.vehiculo || 'carro';
  const V = modelo?.base ? modelo : modelo?.[v];
  if (!V) throw new Error(`modelo-curva sin vehículo ${v}`);
  const p = partes(V, viaje);
  const crudo = p.base * p.recargo * p.fKm * p.fTr * p.zo * p.zd * p.ll * p.colchon;
  const precio = Math.max(V.minima || 0, Math.round(crudo / 100) * 100);
  const r3 = (x) => Math.round(x * 1000) / 1000;
  return { precio, detalle: { vehiculo: v, jornada: p.tipo, hora: r3(((p.x + (V.jornada?.inicio ?? 6)) % 24)), base: Math.round(p.base),
    recargo: r3(p.recargo), recargoCurva: r3(p.recargoCurva), nocheEnCurso: p.enCurso, distancia: r3(p.fKm), trafico: r3(p.fTr), zonaOrigen: r3(p.zo), zonaDestino: r3(p.zd), lluvia: r3(p.ll), colchon: r3(p.colchon), crudo: Math.round(crudo) } };
}
