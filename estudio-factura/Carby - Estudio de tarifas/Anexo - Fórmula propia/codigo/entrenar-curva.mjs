// CURVA · entrena la fórmula PROPIA de Carby con horas pico como curva continua (uso interno; se nombra a inDrive solo para medirlo).
// Uso: node tools/tarifas/analisis/curva.mjs [--hasta 2026-10-06T05:00:00Z]
//   Entrena con TODAS las lecturas anteriores a las 00:00 de hoy (Colombia) — o a --hasta — y escribe datos/modelo-curva.json.
//   Correr una vez al día, de madrugada. Nunca usa lecturas del mismo día.
//
// Modelo (en logaritmo, ajuste alternado base ↔ curvas, Huber):
//   ln precio = ln(fijo + $/km·km + $/min·min) + c(x) + c_tipo(x) + e_km(x)·ln(km/5) + e_tr(x)·ln(tráfico) + zona_o + zona_d + lluvia
//   x = hora desde las 6:00 a. m. (la madrugada es de la jornada anterior). c, c_tipo, e_km, e_tr = curvas suaves de 24 h
//   (spline con penalización de curvatura en nudos cada 30 min, o serie de Fourier). c_tipo (laboral / sábado / domingo-festivo)
//   se ENCOGE hacia la curva común: un tipo de día con pocas lecturas usa la común. Zonas: hexágonos encogidos (ridge).
//   Hiperparámetros y colchón (día / noche) se eligen SOLO con los días de entrenamiento: se entrena con las jornadas
//   anteriores y se valida con la última (o, con una sola jornada, dejando rutas fuera).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { filas, wls, med } from '../nucleo/formulas.js';
import { jornada, jornadaId, hat, interp, NUDOS, PASO, TIPOS, hexId, etiquetas, cotizarCurva } from '../nucleo/curva.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DATOS = path.join(AQUI, '..', 'datos');

/* ---------- Bases horarias ---------- */
function baseHora(c) {
  const xs = Array.from({ length: NUDOS }, (_, j) => j * PASO);
  if (!c || c.tipo === 'nada') return null;
  if (c.tipo === 'const') return { B: xs.map(() => [1]), S: [[0]], p: 1 };
  if (c.tipo === 'fourier') {
    const K = c.K, p = 2 * K + 1;
    const B = xs.map((x) => { const r = [1]; for (let k = 1; k <= K; k++) { const a = (2 * Math.PI * k * x) / 24; r.push(Math.cos(a), Math.sin(a)); } return r; });
    const S = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => (i === j && i > 0 ? Math.ceil(i / 2) ** 4 : 0)));
    const S1 = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => (i === j && i > 0 ? Math.ceil(i / 2) ** 2 : 0)));
    return { B, S, S1, p };
  }
  // spline: un parámetro por nudo, penalización de segundas diferencias (curvatura), no cíclica (la jornada empieza a las 6).
  // S1 = primeras diferencias: con ella una desviación por tipo de jornada se extiende PLANA hacia las horas sin lecturas.
  const p = NUDOS, B = xs.map((_, j) => Array.from({ length: p }, (_, i) => (i === j ? 1 : 0)));
  const S = Array.from({ length: p }, () => Array(p).fill(0)), S1 = Array.from({ length: p }, () => Array(p).fill(0));
  for (let j = 0; j + 2 < p; j++) { const d = [[j, 1], [j + 1, -2], [j + 2, 1]]; for (const [a, va] of d) for (const [b, vb] of d) S[a][b] += va * vb; }
  for (let j = 0; j + 1 < p; j++) { const d = [[j, 1], [j + 1, -1]]; for (const [a, va] of d) for (const [b, vb] of d) S1[a][b] += va * vb; }
  return { B, S, S1, p };
}
const filaHora = (H, x) => { const [j, w] = hat(x); return H.B[j].map((v, i) => v * (1 - w) + H.B[j + 1][i] * w); };

/* ---------- Álgebra ---------- */
function cholSolve(A, b) {
  const n = b.length, L = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) L[i][i] = Math.sqrt(Math.max(s, 1e-10)); else L[i][j] = s / L[j][j];
    }
  }
  const z = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i][k] * z[k]; z[i] = s / L[i][i]; }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = z[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i]; }
  return Array.from(x);
}

/* ---------- Configuración por defecto ---------- */
export const CFG0 = {
  inicio: 6,
  curva: { tipo: 'spline' }, lamS: 100, lamT: 10, lamT1: 0,
  km: { tipo: 'fourier', K: 1 }, lamK: 30,
  tr: { tipo: 'const' }, lamTr: 10,
  zonas: [4], lamZ: 10, destino: true,
  lluvia: true, lamR: 10,
  minutos: 'trafico', iter: 8,
};

/* ---------- Ajuste ---------- */
export function entrenarVehiculo(rows, cfg0 = {}) {
  const cfg = { ...CFG0, ...cfg0 };
  const Hc = baseHora(cfg.curva), Hk = baseHora(cfg.km), Ht = baseHora(cfg.tr);
  // índices de parámetros
  let k = 0; const off = {};
  off.C = k; k += Hc.p;
  for (const t of TIPOS) { off[t] = k; k += Hc.p; }
  if (Hk) { off.K = k; k += Hk.p; }
  if (Ht) { off.T = k; k += Ht.p; }
  const zIdx = cfg.zonas.map(() => ({ o: new Map(), d: new Map() }));
  const pre = rows.map((f) => {
    const J = jornada(f.ts, cfg.inicio);
    const zon = cfg.zonas.map((R) => ({ o: hexId(f.o[0], f.o[1], R), d: hexId(f.d[0], f.d[1], R) }));
    return { J, hc: filaHora(Hc, J.x), hk: Hk ? filaHora(Hk, J.x) : null, ht: Ht ? filaHora(Ht, J.x) : null, zon,
      lkm: Math.log(Math.max(f.km, 0.3) / 5), ltr: Math.log(Math.min(Math.max(f.trafico || 1, 0.6), 2.5)), mins: cfg.minutos === 'libre' ? f.libre : f.min };
  });
  cfg.zonas.forEach((_, i) => { for (const p of pre) { const Z = zIdx[i]; if (!Z.o.has(p.zon[i].o)) Z.o.set(p.zon[i].o, k++); if (cfg.destino && !Z.d.has(p.zon[i].d)) Z.d.set(p.zon[i].d, k++); } });
  if (cfg.lluvia) { off.R = k; k++; }
  const P = k;
  // filas dispersas
  const X = pre.map((p, i) => {
    const e = [];
    p.hc.forEach((v, a) => { if (v) { e.push([off.C + a, v]); e.push([off[p.J.tipo] + a, v]); } });
    if (Hk) p.hk.forEach((v, a) => v && e.push([off.K + a, v * p.lkm]));
    if (Ht) p.ht.forEach((v, a) => v && e.push([off.T + a, v * p.ltr]));
    cfg.zonas.forEach((_, z) => { e.push([zIdx[z].o.get(p.zon[z].o), 1]); if (cfg.destino) e.push([zIdx[z].d.get(p.zon[z].d), 1]); });
    if (cfg.lluvia && rows[i].lluvia) e.push([off.R, 1]);
    return e;
  });
  // penalización
  const Pen = Array.from({ length: P }, () => new Float64Array(P));
  const bloque = (o, S, lam, ridge) => { for (let a = 0; a < S.length; a++) { for (let b = 0; b < S.length; b++) Pen[o + a][o + b] += lam * S[a][b]; Pen[o + a][o + a] += ridge; } };
  bloque(off.C, Hc.S, cfg.lamS, 1e-4); if (cfg.lamC1) bloque(off.C, Hc.S1, cfg.lamC1, 0);
  for (const t of TIPOS) { bloque(off[t], Hc.S, cfg.lamTS ?? cfg.lamS, cfg.lamT); if (cfg.lamT1) bloque(off[t], Hc.S1, cfg.lamT1, 0); }
  // Noche propia por tipo de jornada (spline): de 8 p. m. a 6 a. m. (x ≥ 14) la desviación del tipo se encoge con lamTN en vez de
  // lamT, y la curva común de noche se encoge hacia 0 con lamCN: el pico nocturno queda en el tipo de jornada que lo mostró.
  if (cfg.curva.tipo === 'spline' && (cfg.lamTN != null || cfg.lamCN)) for (let j = 0; j < NUDOS; j++) {
    const xj = j * PASO, w = Math.min(1, Math.max(0, (xj - 13) / 2)); // rampa 7–9 p. m.
    if (cfg.lamTN != null) for (const t of TIPOS) Pen[off[t] + j][off[t] + j] += w * (cfg.lamTN - cfg.lamT);
    if (cfg.lamCN) Pen[off.C + j][off.C + j] += w * cfg.lamCN;
  }
  if (Hk) bloque(off.K, Hk.S, cfg.lamK, cfg.lamK);
  if (Ht) bloque(off.T, Ht.S, cfg.lamTr, cfg.lamTr);
  for (const Z of zIdx) { for (const i of Z.o.values()) Pen[i][i] += cfg.lamZ; for (const i of Z.d.values()) Pen[i][i] += cfg.lamZ; }
  if (cfg.lluvia) Pen[off.R][off.R] += cfg.lamR;

  const y = rows.map((f) => f.y), n = rows.length;
  let s = new Float64Array(n), coef = [0, 0, 0], theta = new Array(P).fill(0), hw = new Array(n).fill(1), cbar = 0;
  const finHora = off.C + (TIPOS.length + 1) * Hc.p;
  const hourPart = (i) => { let v = 0; for (const [a, x] of X[i]) if (a >= off.C && a < finHora) v += x * theta[a]; return v; };
  for (let it = 0; it < cfg.iter; it++) {
    // base lineal en %, con pesos de Huber
    const wb = rows.map((f, i) => hw[i] / (f.y * f.y)), mb = wb.reduce((a, b) => a + b, 0) / n;
    coef = wls(rows.map((f, i) => [1, f.km, pre[i].mins]), rows.map((f, i) => f.y / Math.exp(s[i])), wb.map((w) => w / mb));
    const base = rows.map((f, i) => Math.max(coef[0] + coef[1] * f.km + coef[2] * pre[i].mins, 500));
    const r = rows.map((f, i) => Math.log(f.y / base[i]));
    // ridge ponderado
    const A = Array.from({ length: P }, (_, a) => Float64Array.from(Pen[a])), b = new Float64Array(P);
    X.forEach((e, i) => { const w = hw[i]; for (const [p, xp] of e) { b[p] += w * xp * r[i]; for (const [q, xq] of e) A[p][q] += w * xp * xq; } });
    theta = cholSolve(A, Array.from(b));
    // centra la curva: el nivel medio va a la base
    const hp = rows.map((_, i) => hourPart(i)); cbar = hp.reduce((a, v) => a + v, 0) / n;
    const pred = X.map((e) => e.reduce((a, [p, x]) => a + x * theta[p], 0) - cbar);
    s = Float64Array.from(pred);
    const res = r.map((v, i) => v - pred[i]), d = Math.max(0.03, 1.5 * med(res.map(Math.abs)));
    hw = res.map((e) => (Math.abs(e) <= d ? 1 : d / Math.abs(e)));
  }
  // tablas legibles
  const lab = etiquetas(cfg.inicio), r4 = (x) => Math.round(x * 10000) / 10000;
  const tabla = (fn) => Object.fromEntries(lab.map((l, j) => [l, r4(fn(j))]));
  const dot = (row, o) => row.reduce((a, v, i) => a + v * theta[o + i], 0);
  // Normalización legible: la media hora más barata (valle) = ×1,00 y la base pasa a ser la tarifa de las horas valle.
  const crudoR = (j, t) => Math.exp(dot(Hc.B[j], off.C) + dot(Hc.B[j], off[t]) - cbar);
  let valle = Infinity; for (const t of TIPOS) for (let j = 0; j < NUDOS; j++) valle = Math.min(valle, crudoR(j, t));
  coef = coef.map((c) => c * valle);
  const recargo = Object.fromEntries(TIPOS.map((t) => [t, tabla((j) => crudoR(j, t) / valle)]));
  const nTipo = Object.fromEntries(TIPOS.map((t) => [t, pre.filter((p) => p.J.tipo === t).length]));
  const zona = cfg.zonas.map((R, z) => ({ radio: R,
    origen: Object.fromEntries([...zIdx[z].o].map(([h, i]) => [h, r4(Math.exp(theta[i]))])),
    destino: cfg.destino ? Object.fromEntries([...zIdx[z].d].map(([h, i]) => [h, r4(Math.exp(theta[i]))])) : null }));
  return {
    n, lecturas_por_tipo: nTipo,
    base: { fijo: Math.round(coef[0]), km: Math.round(coef[1] * 10) / 10, min: Math.round(coef[2] * 10) / 10, minutos: cfg.minutos },
    minima: Math.round(Math.min(...y) / 100) * 100,
    jornada: { inicio: cfg.inicio },
    recargo,
    distancia: Hk ? { ref_km: 5, exponente: tabla((j) => dot(Hk.B[j], off.K)) } : null,
    trafico: Ht ? { exponente: tabla((j) => dot(Ht.B[j], off.T)) } : null,
    zona, lluvia: cfg.lluvia ? r4(Math.exp(theta[off.R])) : 1,
    colchon: { dia: 1, noche: 1 },
    cfg,
  };
}

/* ---------- Métricas ---------- */
export function metricas(d, y = null) {
  const n = d.length; if (!n) return { n: 0 };
  const a = d.map(Math.abs).sort((p, q) => p - q), pc = (g) => (100 * d.filter(g).length) / n;
  return { n, banda: pc((x) => x >= -300 && x <= 500), pierde: pc((x) => x < -300), pasa: pc((x) => x > 500), c100: pc((x) => Math.abs(x) <= 100),
    tipica: med(a), p10: y ? (100 * d.filter((x, i) => Math.abs(x) <= 0.1 * y[i]).length) / n : null, prom: d.reduce((s, x) => s + x, 0) / n };
}
const nocheX = (ts) => { const h = new Date(ts).getHours(); return h < 6 || h >= 20; };

/* ---------- Elección interna (solo días de entrenamiento) ---------- */
// Partición: si hay ≥ 2 jornadas con ≥ 60 lecturas, entrena con las anteriores y valida con la última; si no, 5 grupos de rutas.
function particiones(rows, modo = 'auto', inicio = 6) {
  const jid = (f) => { const t = new Date(f.ts - inicio * 3600e3); return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`; };
  const J = [...new Set(rows.map(jid))].sort((a, b) => Date.parse(a) - Date.parse(b));
  const ult = J[J.length - 1], val = rows.filter((f) => jid(f) === ult), ent = rows.filter((f) => jid(f) !== ult);
  const jornadaOk = J.length >= 2 && val.length >= 60 && ent.length >= 60;
  const rutas = [...new Set(rows.map((f) => f.id))].sort();
  const grupo = new Map(rutas.map((r, i) => [r, i % 5]));
  const fr = [0, 1, 2, 3, 4].map((g) => [rows.filter((f) => grupo.get(f.id) !== g), rows.filter((f) => grupo.get(f.id) === g)]);
  if (modo === 'rutas' || !jornadaOk) return { modo: 'rutas fuera (5 grupos)', folds: fr };
  if (modo === 'ambas') return { modo: `rutas fuera + jornada ${ult}`, folds: [...fr, [ent, val]] };
  return { modo: `jornada ${ult}`, folds: [[ent, val]] };
}
function validar(rows, cfg, parts) {
  const out = [];
  for (const [ent, val] of parts.folds) {
    if (ent.length < 30 || !val.length) continue;
    const V = entrenarVehiculo(ent, cfg);
    for (const f of val) { const p = cotizarCurva({ modelo: V, viaje: f }).detalle.crudo; out.push({ f, p }); }
  }
  return out;
}
const perdidaLog = (o) => o.reduce((a, { f, p }) => a + Math.min(Math.abs(Math.log(p / f.y)), 0.3), 0) / o.length;
// Colchón por franja: maximiza la banda (orden del dueño: banda primero); pierde (×0,1) y la típica desempatan. Validación: rutas fuera.
export function elegirColchon(o, wP = 0.1) {
  const res = {};
  for (const fr of ['dia', 'noche']) {
    let O = o.filter(({ f }) => nocheX(f.ts) === (fr === 'noche'));
    if (O.length < 30) O = o;
    let best = null;
    for (let c = -0.08; c <= 0.15001; c += 0.005) {
      const d = O.map(({ f, p }) => Math.max(0, Math.round((p * Math.exp(c)) / 100) * 100) - f.y), m = metricas(d);
      const sc = m.banda - wP * m.pierde - m.tipica / 1000;
      if (!best || sc > best.sc) best = { sc, c: Math.round(Math.exp(c) * 1000) / 1000, m };
    }
    res[fr] = best;
  }
  return res;
}
// La forma de la curva (suavidad y encogimiento entre tipos de jornada) queda FIJA a priori: con 1–2 días por tipo, elegirla por
// validación premia curvas nerviosas que no se repiten al día siguiente. Opciones probadas y descartadas (examen del 5 oct):
// Fourier K = 2–4, spline λ 30–1000, extrapolación plana (lamC1 / lamT1) y noche propia por tipo (lamTN / lamCN).
export const GRUPOS_FORMA = [
  ['curva', [{ curva: { tipo: 'spline' }, lamS: 30 }, { curva: { tipo: 'spline' }, lamS: 100 }, { curva: { tipo: 'spline' }, lamS: 300 }, { curva: { tipo: 'spline' }, lamS: 1000 },
    { curva: { tipo: 'fourier', K: 2 }, lamS: 0.03 }, { curva: { tipo: 'fourier', K: 3 }, lamS: 0.03 }, { curva: { tipo: 'fourier', K: 4 }, lamS: 0.03 }, { curva: { tipo: 'fourier', K: 4 }, lamS: 0.3 }]],
  ['lamT', [{ lamT: 1 }, { lamT: 3 }, { lamT: 10 }, { lamT: 30 }, { lamT: 100 }]],
  ['lamT1', [{ lamT1: 0 }, { lamT1: 10 }, { lamT1: 30 }, { lamT1: 100 }]],
];
export const GRUPOS = [
  ['km', [{ km: { tipo: 'nada' } }, { km: { tipo: 'const' } }, { km: { tipo: 'fourier', K: 1 } }, { km: { tipo: 'fourier', K: 2 } }]],
  ['tr', [{ tr: { tipo: 'nada' } }, { tr: { tipo: 'const' } }, { tr: { tipo: 'fourier', K: 1 } }]],
  ['zonas', [{ zonas: [] }, { zonas: [4] }, { zonas: [2.5] }, { zonas: [4, 1.5] }, { zonas: [4, 1.5, 0.5] }]],
  ['lamZ', [{ lamZ: 3 }, { lamZ: 10 }, { lamZ: 30 }]],
  ['destino', [{ destino: true }, { destino: false }]],
  ['lluvia', [{ lluvia: true }, { lluvia: false }]],
  ['minutos', [{ minutos: 'trafico' }, { minutos: 'libre' }]],
];
export function elegir(rows, { pasadas = 2, log = () => {}, modo = 'rutas', modoColchon = 'rutas', cfgBase = {}, wP = 0.1, sinEleccion = false, forma = false } = {}) {
  const parts = particiones(rows, modo);
  let cfg = { ...CFG0, ...cfgBase }, mejor = perdidaLog(validar(rows, cfg, parts));
  for (let ps = 0; ps < (sinEleccion ? 0 : pasadas); ps++) {
    let cambio = false;
    for (const [nom, ops] of forma ? [...GRUPOS_FORMA, ...GRUPOS] : GRUPOS) {
      for (const op of ops) {
        const c = { ...cfg, ...op }; if (JSON.stringify(c) === JSON.stringify(cfg)) continue;
        const l = perdidaLog(validar(rows, c, parts));
        if (l < mejor - 1e-4) { mejor = l; cfg = c; cambio = true; log(`  ${nom} → ${JSON.stringify(op)}: ${(100 * l).toFixed(2)} %`); }
      }
    }
    if (!cambio) break;
  }
  const o = validar(rows, cfg, modoColchon === modo ? parts : particiones(rows, modoColchon)), col = elegirColchon(o, wP);
  return { cfg, perdida: mejor, modo: parts.modo, colchon: { dia: col.dia.c, noche: col.noche.c }, validacion: { dia: col.dia.m, noche: col.noche.m } };
}

/* ---------- Noche en curso ---------- */
// Nivel plano de la tarde-noche (6 p. m.–12 a. m.) de la ÚLTIMA jornada vista, para su propia madrugada (0–6 a. m.).
export function nivelNoche(V, rows, k = 10) {
  const inicio = V.jornada?.inicio ?? 6;
  if (!rows.length) return null;
  const ultima = rows.reduce((m, f) => (f.ts > m.ts ? f : m), rows[0]), jid = jornadaId(ultima.ts, inicio);
  const tarde = rows.filter((f) => jornadaId(f.ts, inicio) === jid && jornada(f.ts, inicio).x >= 12 && jornada(f.ts, inicio).x < 18);
  const tipo = jornada(ultima.ts, inicio).tipo, R = Object.values(V.recargo[tipo]);
  const xs = Array.from({ length: 13 }, (_, i) => 12 + i * 0.5);
  const rTarde = Math.exp(xs.reduce((a, x) => a + Math.log(interp(R, x)), 0) / xs.length);
  if (tarde.length < 5) return { jornada: jid, tipo, n: tarde.length, recargo_tarde: Math.round(rTarde * 1e4) / 1e4, nivel: 1, w: 0 };
  const Vs = { ...V, colchon: { dia: 1, noche: 1 }, noche_en_curso: null };
  const lr = tarde.map((f) => { const d = cotizarCurva({ modelo: Vs, viaje: f }).detalle; return Math.log(f.y / ((d.crudo * rTarde) / d.recargoCurva)); });
  const m = med(lr) * (tarde.length / (tarde.length + k));
  return { jornada: jid, tipo, n: tarde.length, recargo_tarde: Math.round(rTarde * 1e4) / 1e4, nivel: Math.round(Math.exp(m) * 1e4) / 1e4, w: 0 };
}
// Peso w: se elige con la madrugada ANTERIOR que sí está en el entrenamiento (modelo entrenado hasta la medianoche que la
// empieza, probado en sus lecturas de 0–6 a. m.). Sin una madrugada anterior: w = 0 (solo la curva).
export function elegirPesoNoche(rows, cfg, { inicio = 6, log = () => {} } = {}) {
  const jids = [...new Set(rows.map((f) => jornadaId(f.ts, inicio)))].sort((a, b) => Date.parse(a) - Date.parse(b));
  for (let i = jids.length - 2; i >= 0; i--) {
    const jid = jids[i], noche = rows.filter((f) => jornadaId(f.ts, inicio) === jid && jornada(f.ts, inicio).x >= 18);
    if (noche.length < 30) continue;
    const corte = Math.min(...noche.map((f) => f.ts)), cero = (() => { const t = new Date(corte); t.setHours(0, 0, 0, 0); return t.getTime(); })();
    const ent = rows.filter((f) => f.ts < cero);
    if (ent.length < 60) continue;
    const V = entrenarVehiculo(ent, cfg), NC = nivelNoche(V, ent);
    if (!NC || NC.jornada !== jid || NC.n < 5) continue;
    let mejor = null;
    for (const w of [0, 0.25, 0.5, 0.75, 1]) {
      const Vw = { ...V, noche_en_curso: { ...NC, w } };
      const l = noche.reduce((a, f) => a + Math.min(Math.abs(Math.log(cotizarCurva({ modelo: Vw, viaje: f }).detalle.crudo / f.y)), 0.3), 0) / noche.length;
      log(`  noche en curso ${jid} w ${w}: ${(100 * l).toFixed(2)} %`);
      if (!mejor || l < mejor.l - 1e-4) mejor = { w, l, jid, n: noche.length };
    }
    return mejor;
  }
  return { w: 0, l: null, jid: null, n: 0 };
}

export function entrenarTodo(rowsVeh, op = {}) {
  const E = elegir(rowsVeh, op);
  const V = entrenarVehiculo(rowsVeh, E.cfg);
  V.colchon = E.colchon;
  V.eleccion = { modo: E.modo, perdida_log_pct: Math.round(E.perdida * 10000) / 100, validacion: E.validacion };
  if (op.nocheEnCurso === true) { // probado el 5 oct: no gana (w 0,5–1 baja la banda del lunes); apagado por defecto
    const P = elegirPesoNoche(rowsVeh, E.cfg, op), NC = nivelNoche(V, rowsVeh);
    if (NC) V.noche_en_curso = { ...NC, w: op.wNoche ?? P.w, eleccion: P };
  }
  return V;
}

/* ---------- Tabla legible para el dueño ---------- */
const pct = (x) => `${x >= 1 ? '+' : '−'}${Math.abs(Math.round((x - 1) * 100))} %`;
const coma = (x, d = 2) => x.toFixed(d).replace('.', ',');
export function tablaLegible(modelo) {
  const NOM = { laboral: 'Lun–vie', sabado: 'Sábado', domingo: 'Domingo/festivo' };
  let s = `# Horas pico de Carby (fórmula CURVA)\n\nUso interno. Entrenada con lecturas anteriores a ${new Date(modelo.entrenado_hasta).toLocaleString('es-CO')} (${modelo.lecturas} lecturas).\n` +
    `Cada valor es el recargo sobre la tarifa base a esa hora (×1,00 = tarifa base = la media hora más barata del día; entre dos horas el precio cambia en línea recta, sin escalones).\n` +
    `La jornada empieza a las 6:00 a. m.: la madrugada pertenece a la noche que empezó el día anterior (el domingo a la 1 a. m. es "noche del sábado").\n`;
  for (const v of ['carro', 'moto']) {
    const m = modelo[v]; if (!m) continue;
    const vistos = TIPOS.filter((t) => m.lecturas_por_tipo[t] > 0);
    s += `\n## ${v === 'carro' ? 'Carro' : 'Moto'}\n\n` +
      `- Tarifa base: $${m.base.fijo.toLocaleString('es-CO')} + $${coma(m.base.km, 0)} por km + $${coma(m.base.min, 0)} por minuto (${m.base.minutos === 'libre' ? 'minutos sin tráfico' : 'minutos con tráfico de Google'}); mínima $${m.minima.toLocaleString('es-CO')}.\n` +
      `- Colchón de protección al conductor: día ×${coma(m.colchon.dia, 3)}, noche ×${coma(m.colchon.noche, 3)}. Lluvia ×${coma(m.lluvia, 3)}.\n` +
      (m.trafico ? `- Tráfico: precio × (tráfico de Google)^${coma(Object.values(m.trafico.exponente)[0], 3)}${m.cfg.tr.tipo === 'fourier' ? ' (varía con la hora)' : ''} (además de los minutos con tráfico).\n` : '') +
      (m.distancia ? `- Viajes largos según la hora: exponente de (km/5) entre ${coma(Math.min(...Object.values(m.distancia.exponente)), 3)} y ${coma(Math.max(...Object.values(m.distancia.exponente)), 3)}.\n` : '') +
      `- Zonas: ${m.zona.length ? m.zona.map((z) => `${Object.keys(z.origen).length} hexágonos de ${coma(z.radio, 1)} km`).join(' + ') + ' (recogida' + (m.zona[0]?.destino ? ' y destino' : '') + ')' : 'ninguna'}.\n` +
      `- Lecturas por tipo de jornada: ${TIPOS.map((t) => `${NOM[t]} ${m.lecturas_por_tipo[t]}`).join(' · ')}.` +
      (TIPOS.length > vistos.length ? ` Sin lecturas: ${TIPOS.filter((t) => !vistos.includes(t)).map((t) => NOM[t]).join(', ')} → usa la curva común (promedio encogido de los demás).` : '') + '\n\n' +
      `| Hora | ${TIPOS.map((t) => NOM[t]).join(' | ')} |\n|---|${TIPOS.map(() => '---').join('|')}|\n`;
    for (const k of Object.keys(m.recargo.laboral)) s += `| ${k} | ${TIPOS.map((t) => `×${coma(m.recargo[t][k])} (${pct(m.recargo[t][k])})`).join(' | ')} |\n`;
  }
  return s;
}

/* ---------- Programa ---------- */
const esMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (esMain) {
  const io = process.argv.indexOf('--salida'), salida = io > 0 ? process.argv[io + 1] : path.join(DATOS, 'modelo-curva.json');
  const ix = process.argv.indexOf('--hasta');
  const hoy0 = (() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t.getTime(); })(); // 00:00 de hoy (hora local = Colombia)
  const hasta = ix > 0 ? Date.parse(process.argv[ix + 1]) : hoy0;
  const L = readFileSync(path.join(DATOS, 'mediciones.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((r) => r && r.at && Date.parse(r.at) < hasta);
  const t0 = Date.now(), modelo = { creado: new Date().toISOString(), entrenado_hasta: new Date(hasta).toISOString(), lecturas: L.length,
    explicacion: 'precio = (fijo + $/km·km + $/min·min) × recargo[jornada][hora] × (km/5)^exponente_km[hora] × tráfico^exponente[hora] × zona origen × zona destino × lluvia × colchón(día/noche); tablas cada 30 min con interpolación lineal; jornada desde las 6:00 a. m.; festivo = domingo; redondeo a $100, nunca bajo la mínima.' };
  for (const v of ['carro', 'moto']) {
    const R = filas(L, v);
    console.log(`${v}: ${R.length} lecturas`);
    modelo[v] = entrenarTodo(R, { log: console.log });
    const m = modelo[v];
    console.log(`  base $${m.base.fijo} + $${m.base.km}/km + $${m.base.min}/min (${m.base.minutos}) · colchón día ×${m.colchon.dia} noche ×${m.colchon.noche} · ${m.eleccion.modo}`);
  }
  writeFileSync(salida, JSON.stringify(modelo, null, 1));
  writeFileSync(salida.replace(/\.json$/, '.md'), tablaLegible(modelo));
  console.log(`${salida} y .md escritos (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
