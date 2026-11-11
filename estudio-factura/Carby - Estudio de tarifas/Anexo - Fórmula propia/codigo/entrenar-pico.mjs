// Entrenador de la fórmula PROPIA "PICO" (agente PICO, 5 oct 2026; uso interno: aquí se nombra a inDrive solo para medirlo).
// Tabla de recargos legible: base (arranque + $/km + $/min) × hora (tipo de día × hora) × zona de recogida × zona de
// destino × tráfico × lluvia. Precio con nucleo/pico.js (cotizarPico). NO usa precios recientes de inDrive al cotizar.
//
// Uso (una vez al día, de madrugada):  node tools/tarifas/analisis/pico.mjs [--hasta 2026-10-06] [--elegir] [--salida ruta]
//   Entrena con TODAS las lecturas ANTERIORES a las 00:00 de hoy (Colombia) —o de --hasta— y escribe datos/modelo-pico.json.
//   --elegir: vuelve a elegir los parámetros con validación interna (ruta fuera + último día de entrenamiento); sin él usa
//   PARAMS (elegidos así el 5 oct). Imprime la tabla de horas pico para el dueño.
//
// Cómo aprende cada celda de la tabla de horas (todo en log, con pesos de Huber):
//   ancho6(h)     = (Σ w6·r + kAncho·promedio) / (Σ w6 + kAncho); ancho(h) = (Σ w3·r + kAncho·ancho6) / (Σ w3 + kAncho)
//   hora(h)       = (Σ w·r + kHora·ancho(h)) / (Σ w + kHora)  (la hora y sus vecinas, todos los días)
//   tipo×hora(h)  = (Σ_tipo w·r + kTipo·padre) / (Σ_tipo w + kTipo), padre = hora(h)
//                   (laboral: con priorLaboral 'sabado', el padre es la celda del sábado si existe)
//   w = e^(−½·(Δh/σ)²) según la distancia entre la hora de la lectura y el centro de la hora (h:30).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { filas, wls, med } from '../nucleo/formulas.js';
import { FESTIVOS } from '../nucleo/util.js';
import { TIPOS, TIPO_LABEL, contexto, zKm, zRodeo, periodo, hexId, hexVecinos, columnas, COLS, minutosDe, desglose, cotizarPico } from '../nucleo/pico.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const DATOS = join(AQUI, '..', 'datos');
export const LISTA_FESTIVOS = [...FESTIVOS].sort();

// Parámetros por vehículo: elegidos con validación interna SOLO con sáb 3 + dom 4 (elegir(), umbral 1,5 puntos; ver bitácora
// 5 oct, agente PICO). Cada día se vuelve a elegir el margen; --elegir vuelve a elegir todo.
export const PARAMS = {
  carro: { baseTipo: 'tramos', minutos: 'con', sigmaH: 0.8, kAncho: 20, kHora: 8, kTipo: 25, priorLaboral: 'general', interpolar: true,
    R: 2.5, kZona: 6, kVec: 10, destino: true, beta: 'aprende', kBeta: 30, kLluvia: 60, atenua: true, kAtenua: 5, corredor: false, kCorredor: 4, rodeo: false, kRodeo: 5, zonaPeriodo: false, kZonaPeriodo: 8, margen: 0.02 },
  moto: { baseTipo: 'lineal', minutos: 'con', sigmaH: 0.8, kAncho: 20, kHora: 8, kTipo: 25, priorLaboral: 'general', interpolar: true,
    R: 2.5, kZona: 6, kVec: 10, destino: true, beta: 'aprende', kBeta: 30, kLluvia: 60, atenua: true, kAtenua: 5, corredor: false, kCorredor: 4, rodeo: false, kRodeo: 5, zonaPeriodo: true, kZonaPeriodo: 8, margen: 0.01 },
};

export function leer(hastaISO) {
  const L = readFileSync(join(DATOS, 'mediciones.jsonl'), 'utf8').split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((r) => r && r.at);
  return hastaISO ? L.filter((r) => Date.parse(r.at) < Date.parse(hastaISO)) : L;
}

const norm = (w) => { const m = w.reduce((a, b) => a + b, 0) / w.length; return w.map((x) => x / m); };
const circ = (a, b) => { const d = Math.abs(a - b) % 24; return Math.min(d, 24 - d); };
const clip = (x, c = 0.6) => Math.max(-c, Math.min(c, x));

// Entrena un vehículo. rows = viajes de filas() (con y). Devuelve el bloque del vehículo para modelo-pico.json.
export function entrenarVehiculo(rows, op, festivos = LISTA_FESTIVOS) {
  const n = rows.length;
  const P = rows.map((f) => {
    const c = contexto(f.ts, festivos);
    return { y: f.y, X: columnas(op.baseTipo, f.km, minutosDe(f, op.minutos)), tipo: c.tipo, h: c.hfrac,
      ho: hexId(f.o[0], f.o[1], op.R), hd: hexId(f.d[0], f.d[1], op.R), lt: Math.log(Math.min(2, Math.max(0.6, f.trafico || 1))), ll: f.lluvia ? 1 : 0, z: zKm(f.km), zr: zRodeo(f) };
  });
  const V = { base: { tipo: op.baseTipo, minutos: op.minutos, coef: null, columnas: COLS[op.baseTipo] },
    horas: { interpolar: op.interpolar, tabla: null, n: null }, zonas: { radioKm: op.R, origen: {}, destino: {} },
    trafico: { beta: 0, min: 0.6, max: 2 }, lluvia: 1, margen: op.margen || 0, minima: Math.round(Math.min(...rows.map((f) => f.y)) / 100) * 100 };
  let hub = P.map(() => 1);
  const lH = new Float64Array(n), lO = new Float64Array(n), lD = new Float64Array(n), lC = new Float64Array(n);
  P.forEach((p) => { p.hc = p.ho + '>' + p.hd; });
  let beta = 0, lr = 0, gam = 0, rho = 0;
  const otros = (i, sin) => (sin === 'h' ? 0 : lH[i]) + (sin === 'o' ? 0 : lO[i]) + (sin === 'd' ? 0 : lD[i]) + (sin === 't' ? 0 : beta * P[i].lt) + (sin === 'l' ? 0 : lr * P[i].ll) + (sin === 'c' ? 0 : lC[i]) + (sin === 'r' ? 0 : rho * P[i].zr);
  let base = P.map(() => 1);
  for (let it = 0; it < (op.iter || 8); it++) {
    // 1) base: mínimos cuadrados ponderados en % (pesos 1/precio² normalizados × Huber), objetivo y / factores
    const w = norm(P.map((p, i) => hub[i] / (p.y * p.y)));
    V.base.coef = wls(P.map((p) => p.X), P.map((p, i) => p.y / Math.exp(otros(i))), w);
    base = P.map((p) => Math.max(500, p.X.reduce((s, x, j) => s + x * V.base.coef[j], 0)));
    const res = (sin) => P.map((p, i) => clip(Math.log(p.y / base[i]) - otros(i, sin)));
    // 2) tabla de horas
    //    (normalizada en cada vuelta: la hora más barata de la fila general = ×1,00 y su nivel pasa a la base)
    { const r = res('h'); const T = tablaHoras(P, r.map((x, i) => x / (1 + gam * P[i].z)), hub, op);
      const ref = Math.min(...T.tabla.general), lref = Math.log(ref);
      for (const k of Object.keys(T.tabla)) T.tabla[k] = T.tabla[k].map((x) => x / ref);
      V.base.coef = V.base.coef.map((c) => c * ref); base = base.map((x) => x * ref);
      V.horas.tabla = T.tabla; V.horas.n = T.n;
      const lh = P.map((p) => Math.log(leerHora(V.horas, p.tipo, p.h)));
      // 2b) atenuación: el recargo de la hora pesa distinto según la distancia, ln(hora) × (1 + gamma·z), z = ln(km/6) acotado
      if (op.atenua) { let sxy = 0, sxx = 0; P.forEach((p, i) => { const x = lh[i] * p.z; sxy += hub[i] * x * (r[i] - lref - lh[i]); sxx += hub[i] * x * x; });
        gam = Math.max(-0.6, Math.min(0.6, sxy / (sxx + op.kAtenua))); }
      P.forEach((p, i) => { lH[i] = lh[i] * (1 + gam * p.z); }); }
    // 3) zona de recogida y 4) de destino
    //    (con zonaPeriodo, además un ajuste de la zona de DÍA 6–20 h y de NOCHE, encogido hacia la zona sola)
    const zonaLado = (lado, key, arr, sin) => {
      const r = res(sin); V.zonas[lado] = tablaZona(P.map(key), r, hub, op);
      P.forEach((p, i) => { arr[i] = Math.log(V.zonas[lado][key(p)] ?? 1); });
      if (op.zonaPeriodo) { const S = {}, W = {}; P.forEach((p, i) => { const k = periodo(p.h) + '|' + key(p); S[k] = (S[k] || 0) + hub[i] * (r[i] - arr[i]); W[k] = (W[k] || 0) + hub[i]; });
        V.zonas[lado + 'Periodo'] = Object.fromEntries(Object.keys(S).map((k) => [k, Math.exp(S[k] / (W[k] + op.kZonaPeriodo))]));
        P.forEach((p, i) => { arr[i] += Math.log(V.zonas[lado + 'Periodo'][periodo(p.h) + '|' + key(p)]); }); }
    };
    zonaLado('origen', (p) => p.ho, lO, 'o');
    if (op.destino) zonaLado('destino', (p) => p.hd, lD, 'd');
    // 4b) corredor (hexágono de recogida → hexágono de destino), encogido hacia 1
    if (op.corredor) { const r = res('c'); const S = {}, W = {}; P.forEach((p, i) => { S[p.hc] = (S[p.hc] || 0) + hub[i] * r[i]; W[p.hc] = (W[p.hc] || 0) + hub[i]; });
      V.zonas.corredor = Object.fromEntries(Object.keys(S).map((k) => [k, Math.exp(S[k] / (W[k] + op.kCorredor))])); P.forEach((p, i) => { lC[i] = Math.log(V.zonas.corredor[p.hc]); }); }
    // 4c) rodeo: ln(línea recta / km de la ruta), pendiente encogida hacia 0
    if (op.rodeo) { const r = res('r'); let sxy = 0, sxx = 0, sx = 0, sw = 0; P.forEach((p, i) => { sx += hub[i] * p.zr; sw += hub[i]; }); const zm = sx / sw;
      P.forEach((p, i) => { sxy += hub[i] * (p.zr - zm) * r[i]; sxx += hub[i] * (p.zr - zm) ** 2; }); rho = sxy / (sxx + op.kRodeo); }
    // 5) tráfico: pendiente sobre ln(tráfico), encogida hacia 0 y nunca negativa (más tráfico nunca abarata)
    if (op.beta === 'aprende') { const r = res('t'); let sxy = 0, sxx = 0; P.forEach((p, i) => { sxy += hub[i] * p.lt * r[i]; sxx += hub[i] * p.lt * p.lt; }); beta = Math.max(0, sxy / (sxx + op.kBeta)); }
    else beta = +op.beta || 0;
    // 6) lluvia
    { const r = res('l'); let s = 0, m = 0; P.forEach((p, i) => { if (p.ll) { s += hub[i] * r[i]; m += hub[i]; } }); lr = s / (m + op.kLluvia); }
    // 7) Huber relativo
    const rel = P.map((p, i) => (p.y - base[i] * Math.exp(otros(i))) / p.y), d = Math.max(0.03, 1.5 * med(rel.map(Math.abs)));
    hub = rel.map((e) => (Math.abs(e) <= d ? 1 : d / Math.abs(e)));
  }
  V.trafico.beta = Math.round(beta * 1000) / 1000;
  V.lluvia = Math.round(Math.exp(lr) * 1000) / 1000;
  V.horas.atenua = Math.round(gam * 1000) / 1000;
  V.rodeo = Math.round(rho * 1000) / 1000;
  V.base.coef = V.base.coef.map((c) => Math.round(c * 10) / 10);
  for (const k of Object.keys(V.horas.tabla)) V.horas.tabla[k] = V.horas.tabla[k].map((x) => Math.round(x * 10000) / 10000);
  const r4 = (x) => Math.round(x * 10000) / 10000;
  for (const k of ['origenPeriodo', 'destinoPeriodo']) if (V.zonas[k]) V.zonas[k] = Object.fromEntries(Object.entries(V.zonas[k]).map(([a, x]) => [a, r4(x)]));
  if (V.zonas.corredor) V.zonas.corredor = Object.fromEntries(Object.entries(V.zonas.corredor).map(([k, x]) => [k, r4(x)]));
  for (const lado of ['origen', 'destino']) V.zonas[lado] = Object.fromEntries(Object.entries(V.zonas[lado]).map(([k, x]) => [k, r4(x)]));
  V.n = n;
  return V;
}
function leerHora(H, tipo, h) {
  const t = H.tabla[tipo];
  if (!H.interpolar) return t[Math.floor(h) % 24];
  const p = h - 0.5, i = Math.floor(p), a = p - i;
  return t[(i + 24) % 24] * (1 - a) + t[(i + 25) % 24] * a;
}
// Jerarquía: promedio global → vecindad de ±6 h → vecindad de ±3 h → la hora (σ) → tipo de día × hora. Una hora nunca
// vista toma el nivel de las horas vistas más cercanas (no 1).
function tablaHoras(P, r, hub, op) {
  const hora = [], tabla = { general: [] }, n = { general: [] }, S = [];
  for (const t of TIPOS) { tabla[t] = []; n[t] = []; }
  let sg = 0, wg = 0; P.forEach((p, i) => { sg += hub[i] * r[i]; wg += hub[i]; });
  const g = sg / (wg + 1);
  for (let H = 0; H < 24; H++) {
    const c = H + 0.5;
    let s6 = 0, w6 = 0, s3 = 0, w3 = 0, s = 0, w = 0; const st = {}, wt = {};
    for (const t of TIPOS) { st[t] = 0; wt[t] = 0; }
    P.forEach((p, i) => {
      const d = circ(p.h, c), a6 = hub[i] * Math.exp(-0.5 * (d / 6) ** 2), a = hub[i] * Math.exp(-0.5 * (d / 3) ** 2), b = hub[i] * Math.exp(-0.5 * (d / op.sigmaH) ** 2);
      s6 += a6 * r[i]; w6 += a6; s3 += a * r[i]; w3 += a; s += b * r[i]; w += b; st[p.tipo] += b * r[i]; wt[p.tipo] += b;
    });
    const a6 = (s6 + op.kAncho * g) / (w6 + op.kAncho), a3 = (s3 + op.kAncho * a6) / (w3 + op.kAncho);
    hora[H] = (s + op.kHora * a3) / (w + op.kHora);
    tabla.general[H] = Math.exp(hora[H]); n.general[H] = Math.round(w);
    S[H] = { st, wt };
  }
  // Padre de la fila laboral mientras no haya días laborales: la hora de todos los días ('general'), la del sábado
  // ('sabado') o la hora de todos los días SIN el pico de fiesta de la madrugada ('sin_fiesta': de 0 a 5 h, como máximo el
  // nivel de las 20–23 h; la madrugada vista es la de sábado y domingo, que vienen de noche de fiesta).
  const temprana = (hora[20] + hora[21] + hora[22] + hora[23]) / 4;
  for (let H = 0; H < 24; H++) {
    const { st, wt } = S[H];
    const celda = (t, padre) => (st[t] + op.kTipo * padre) / (wt[t] + op.kTipo);
    const sab = celda('sabado', hora[H]), dom = celda('domingo_festivo', hora[H]);
    let padreLab = hora[H];
    if (op.priorLaboral === 'sabado' && wt.sabado > 1) padreLab = sab;
    if (op.priorLaboral === 'sin_fiesta' && H < 6) padreLab = Math.min(hora[H], temprana);
    const lab = celda('laboral', padreLab);
    tabla.sabado[H] = Math.exp(sab); tabla.domingo_festivo[H] = Math.exp(dom); tabla.laboral[H] = Math.exp(lab);
    for (const t of TIPOS) n[t][H] = Math.round(wt[t]);
  }
  return { tabla, n };
}
function tablaZona(ids, r, hub, op) {
  const S = {}, W = {};
  ids.forEach((id, i) => { S[id] = (S[id] || 0) + hub[i] * r[i]; W[id] = (W[id] || 0) + hub[i]; });
  const out = {}, todos = new Set(Object.keys(S));
  for (const id of Object.keys(S)) for (const v of hexVecinos(id)) todos.add(v);
  for (const id of todos) {
    const s = S[id] || 0, w = W[id] || 0;
    let sv = s, wv = w; for (const v of hexVecinos(id)) { sv += S[v] || 0; wv += W[v] || 0; }
    const vec = sv / (wv + op.kVec);
    out[id] = Math.exp((s + op.kZona * vec) / (w + op.kZona));
  }
  return out;
}

// Modelo completo (los dos vehículos).
export function entrenar(L, params = PARAMS, extra = {}) {
  const vehiculos = {};
  for (const v of ['carro', 'moto']) vehiculos[v] = entrenarVehiculo(filas(L, v), params[v]);
  return { formula: 'PICO', version: 1, festivos: LISTA_FESTIVOS, params, vehiculos, ...extra };
}

/* ---------- Validación interna (solo con lo de entrenamiento) ---------- */
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const fechaCO = (ts) => new Date(ts - 5 * 3600e3).toISOString().slice(0, 10);
// Devuelve pares { p (sin margen, sin redondear), y } de: 5 grupos de RUTAS fuera + el último día de entrenamiento fuera.
export function paresValidacion(rows, op) {
  const out = [];
  const op0 = { ...op, margen: 0 };
  const pred = (V, f) => desglose(V, f, LISTA_FESTIVOS).crudo;
  for (let k = 0; k < 5; k++) {
    const ent = rows.filter((f) => hash(f.id) % 5 !== k), pru = rows.filter((f) => hash(f.id) % 5 === k);
    if (ent.length < 50 || !pru.length) continue;
    const V = entrenarVehiculo(ent, op0); for (const f of pru) out.push({ p: pred(V, f), y: f.y, minima: V.minima, q: 'ruta' });
  }
  const dias = [...new Set(rows.map((f) => fechaCO(f.ts)))].sort();
  if (dias.length >= 2) {
    const ult = dias[dias.length - 1], ent = rows.filter((f) => fechaCO(f.ts) < ult), pru = rows.filter((f) => fechaCO(f.ts) === ult);
    if (ent.length >= 50) { const V = entrenarVehiculo(ent, op0); for (const f of pru) out.push({ p: pred(V, f), y: f.y, minima: V.minima, q: 'dia' }); }
  }
  return out;
}
export function puntaje(pares, margen) {
  const g = (q) => { const a = pares.filter((x) => x.q === q); if (!a.length) return null;
    const d = a.map((x) => Math.max(x.minima, Math.round((x.p * (1 + margen)) / 100) * 100) - x.y);
    const banda = (100 * d.filter((z) => z >= -300 && z <= 500).length) / d.length, pierde = (100 * d.filter((z) => z < -300).length) / d.length;
    return banda - 0.5 * pierde; };
  const a = g('ruta'), b = g('dia');
  return a == null ? b : b == null ? a : (a + b) / 2;
}
export const MARGENES = [-0.02, 0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08];
// Búsqueda por coordenadas (2 vueltas) sobre la rejilla; el margen se elige al final con los mismos pares.
export const REJILLA = {
  baseTipo: ['tramos', 'lineal'], minutos: ['con', 'libre'], sigmaH: [0.5, 0.8, 1.2], kHora: [3, 8, 20], kTipo: [10, 25, 60],
  R: [1.5, 2.5, 4], kZona: [3, 6, 12], destino: [true, false], beta: ['aprende', 0], interpolar: [true, false], atenua: [true, false], corredor: [false, true], rodeo: [false, true], zonaPeriodo: [false, true],
};
// Un cambio de parámetro se acepta solo si sube la validación ≥ 1,5 puntos (lo demás es ruido con ~1.000 lecturas).
export const UMBRAL = 1.5;
export function elegir(rows, inicio, { log = () => {} } = {}) {
  let op = { ...inicio }, mejor = -Infinity;
  const eval_ = (o) => { const pr = paresValidacion(rows, o); let b = -Infinity, m = 0; for (const mg of MARGENES) { const s = puntaje(pr, mg); if (s > b) { b = s; m = mg; } } return { s: b, m }; };
  ({ s: mejor } = eval_(op));
  for (let vuelta = 0; vuelta < 2; vuelta++) {
    let cambio = false;
    for (const [k, vals] of Object.entries(REJILLA)) for (const val of vals) {
      if (op[k] === val) continue;
      const o = { ...op, [k]: val }, { s } = eval_(o);
      if (s > mejor + UMBRAL) { mejor = s; op = o; cambio = true; log(`  ${k} = ${val} → ${s.toFixed(1)}`); }
    }
    if (!cambio) break;
  }
  const { s, m } = eval_(op); op.margen = m;
  return { op, puntaje: s };
}

/* ---------- Tabla legible para el dueño ---------- */
const hh = (x) => `${Math.floor(x)}:${String(Math.round((x % 1) * 60)).padStart(2, '0')}`;
const coma = (x, d = 2) => x.toFixed(d).replace('.', ',');
export function bloques(t, tol = 0.025) {
  const out = []; let ini = 0;
  for (let h = 1; h <= 24; h++) {
    const seg = t.slice(ini, h), m = seg.reduce((a, b) => a + b, 0) / seg.length;
    if (h === 24 || Math.abs(t[h] - m) > tol) { out.push({ desde: ini, hasta: h, x: m }); ini = h; }
  }
  return out;
}
export function tablaLegible(M) {
  const L = [];
  for (const [v, V] of Object.entries(M.vehiculos)) {
    const c = V.base.coef, cols = V.base.columnas;
    L.push(`${v.toUpperCase()} — tarifa base (hora más barata): ${cols.map((k, i) => `${k} $${Math.round(c[i]).toLocaleString('es-CO')}`).join(' · ')}; mínima $${V.minima.toLocaleString('es-CO')}; minutos ${V.base.minutos === 'con' ? 'con tráfico' : 'sin tráfico'}.`);
    for (const t of TIPOS) {
      const vis = V.horas.n[t].reduce((a, b) => a + b, 0);
      L.push(`  ${TIPO_LABEL[t]}${vis ? '' : ' (aún sin lecturas: usa la hora de todos los días)'}:`);
      for (const b of bloques(V.horas.tabla[t])) L.push(`    ${hh(b.desde)}–${hh(b.hasta - 1 / 60)}  ×${coma(b.x)}${b.x > 1.005 ? `  (+${Math.round((b.x - 1) * 100)} %)` : ''}`);
    }
    L.push(`  Tráfico: ×(minutos con tráfico ÷ sin tráfico)^${coma(V.trafico.beta, 3)} · lluvia ×${coma(V.lluvia, 3)} · margen +${Math.round(V.margen * 100)} % · zonas: hexágonos de ${coma(V.zonas.radioKm, 1)} km (${Object.keys(V.zonas.origen).length} de recogida, ${Object.keys(V.zonas.destino).length} de destino).`);
    const zs = Object.values(V.zonas.origen); if (zs.length) L.push(`  Zona de recogida: de ×${coma(Math.min(...zs))} a ×${coma(Math.max(...zs))}.`);
  }
  return L.join('\n');
}

/* ---------- Principal ---------- */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const hoyCO = fechaCO(Date.now());
  const hasta = arg('--hasta', hoyCO); // fecha de Colombia: se usan lecturas ANTERIORES a sus 00:00
  const corte = new Date(Date.parse(hasta + 'T00:00:00Z') + 5 * 3600e3).toISOString();
  const L = leer(corte);
  const params = JSON.parse(JSON.stringify(PARAMS));
  for (const v of ['carro', 'moto']) {
    const rows = filas(L, v);
    if (process.argv.includes('--elegir')) { console.log(`Eligiendo parámetros (${v})…`); params[v] = elegir(rows, params[v], { log: console.log }).op; }
    else { // cada día se vuelve a elegir SOLO el margen (validación interna: rutas fuera + último día fuera)
      const pr = paresValidacion(rows, params[v]); let b = -Infinity;
      for (const m of MARGENES) { const sc = puntaje(pr, m); if (sc > b) { b = sc; params[v].margen = m; } }
    }
  }
  const M = entrenar(L, params, { generado: new Date().toISOString(), entrenadoHasta: corte, lecturas: L.length });
  M.tablaLegible = tablaLegible(M);
  const salida = arg('--salida', join(DATOS, 'modelo-pico.json'));
  writeFileSync(salida, JSON.stringify(M, null, 1));
  console.log(M.tablaLegible);
  // Control: una cotización de ejemplo
  const f = filas(L.slice(-5), 'carro').at(-1);
  if (f) console.log('\nEjemplo:', JSON.stringify(cotizarPico({ modelo: M, viaje: f, vehiculo: 'carro' })), 'inDrive', f.y);
  console.log(`\nEscrito ${salida} (${L.length} lecturas antes de ${corte}).`);
}
