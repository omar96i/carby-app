// Fórmula PROPIA de Carby con TABLA DE RECARGOS (agente PICO, 5 oct 2026; uso interno: aquí se nombra a inDrive solo para
// medirlo). Pura: sin disco, síncrona, sin precios recientes de inDrive. Corre en Node y en el navegador.
//
//   precio = base(km, min) × hora(tipo de día, hora) × zona de recogida × zona de destino × tráfico × lluvia × (1 + margen)
//   redondeado a $100 y nunca bajo la mínima.
//
//   · base: tarifa de arranque + $/km (por tramos 0–3 / 3–12 / > 12 km, o recta) + $/min (minutos de Google CON tráfico).
//   · hora: tabla de recargos por TIPO DE DÍA (laboral = lun–vie no festivo; sábado; domingo o festivo, festivos de
//     Colombia) × HORA (0–23). Cada celda se aprendió encogida hacia su padre: tipo × hora → hora sola (todos los días) →
//     horas vecinas (±3 h, ±6 h) → promedio. Un tipo de día sin lecturas (el primer lunes) toma la hora sola: la tabla ya trae
//     las 3 filas completas, así que aquí solo se lee.
//   · zona: hexágonos de radio R km (mismos ids que nucleo/candidatas/exacto.js: hexId), encogidos hacia sus 6 vecinos y
//     luego hacia 1. Hexágono nunca visto: el promedio de sus vecinos vistos o 1.
//   · tráfico: (minutos con tráfico / sin tráfico)^beta, acotado. Lo da Google en el momento de pedir el viaje.
//   · lluvia: un factor si llueve (clima del momento).
//
// Uso: cotizarPico({ modelo, viaje, vehiculo }) → { precio, detalle }
//   modelo   datos/modelo-pico.json completo (con .vehiculos.carro / .moto) o el de un vehículo
//   viaje    objeto de viaje() de nucleo/formulas.js (km, min, trafico, ts, o, d, lluvia…)
//   vehiculo 'carro' | 'moto' (si falta: viaje.vehiculo)

const CO = 5 * 3600e3; // Colombia: UTC−5 todo el año
export const TIPOS = ['laboral', 'sabado', 'domingo_festivo'];
export const TIPO_LABEL = { laboral: 'lunes a viernes', sabado: 'sábado', domingo_festivo: 'domingo o festivo' };

// Hora local de Colombia (fraccionaria) y tipo de día, sin depender de la zona horaria de la máquina.
export function contexto(ts, festivos = []) {
  const d = new Date(ts - CO), fecha = d.toISOString().slice(0, 10), w = d.getUTCDay();
  const hfrac = d.getUTCHours() + d.getUTCMinutes() / 60;
  const tipo = w === 0 || festivos.includes(fecha) ? 'domingo_festivo' : w === 6 ? 'sabado' : 'laboral';
  return { fecha, hfrac, hora: d.getUTCHours(), tipo };
}

/* ---------- Hexágonos (idénticos a nucleo/candidatas/exacto.js) ---------- */
const LAT0 = 6.25, LNG0 = -75.57, KM_LAT = 110.574, KM_LNG = 111.32 * Math.cos((LAT0 * Math.PI) / 180);
export function hexId(lat, lng, R) {
  const x = (lng - LNG0) * KM_LNG, y = (lat - LAT0) * KM_LAT;
  const qf = ((Math.sqrt(3) / 3) * x - y / 3) / R, rf = ((2 / 3) * y) / R, sf = -qf - rf;
  let q = Math.round(qf), r = Math.round(rf);
  const s = Math.round(sf), dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
  return `${R}:${q + 0}:${r + 0}`;
}
export function hexVecinos(id) {
  const [R, q, r] = id.split(':');
  return [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].map(([a, b]) => `${R}:${+q + a}:${+r + b}`);
}

/* ---------- Base ---------- */
// Columnas de la base: arranque, km por tramo y minutos. Los coeficientes del modelo van en este orden.
export function columnas(tipo, km, min) {
  if (tipo === 'tramos') return [1, Math.min(km, 3), Math.min(Math.max(0, km - 3), 9), Math.max(0, km - 12), min];
  return [1, km, min];
}
export const COLS = { tramos: ['arranque', 'km_0_3', 'km_3_12', 'km_mas_12', 'minuto'], lineal: ['arranque', 'km', 'minuto'] };

// Minutos que usa la base: con tráfico (lo que da Google en el momento) o sin tráfico.
export const minutosDe = (viaje, cual) => (cual === 'libre' ? viaje.min / (viaje.trafico > 0 ? viaje.trafico : 1) : viaje.min);

// Factor de la hora: la tabla tiene 24 valores por tipo de día (centro de cada hora = h:30). Con `interpolar`, entre
// dos horas se mezcla linealmente (sin saltos al cambiar de hora); sin él, se usa la hora en punto.
export function factorHora(H, tipo, hfrac) {
  const t = H.tabla[tipo] || H.tabla.general;
  if (!H.interpolar) return t[Math.floor(hfrac) % 24];
  const p = hfrac - 0.5, i = Math.floor(p), a = p - i;
  return t[(i + 24) % 24] * (1 - a) + t[(i + 25) % 24] * a;
}
// Atenuación del recargo de la hora con la distancia: ln(hora) × (1 + gamma·z), z = ln(km / 6) acotado a [−1; 1,5].
export const zKm = (km) => Math.max(-1, Math.min(1.5, Math.log(Math.max(0.3, km) / 6)));
// Rodeo: ln(línea recta / km de la ruta), acotado a [−1; 0] (< 0 cuando la ruta da vueltas).
const rectaKm = (a, b) => { const R = 6371, k = Math.PI / 180, x = Math.sin(((b[0] - a[0]) * k) / 2) ** 2 + Math.cos(a[0] * k) * Math.cos(b[0] * k) * Math.sin(((b[1] - a[1]) * k) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
export const zRodeo = (v) => { const r = v.recta ?? (v.o && v.d ? rectaKm(v.o, v.d) : v.km); return v.km > 0 ? Math.max(-1, Math.min(0, Math.log(Math.max(0.05, r) / v.km))) : 0; };
// Periodo de la zona: 'd' = día 6:00–19:59, 'n' = noche y madrugada.
export const periodo = (h) => (h >= 6 && h < 20 ? 'd' : 'n');
export function factorZonaPeriodo(Z, lado, punto, h) {
  const t = Z && punto ? Z[lado + 'Periodo'] : null; if (!t) return 1;
  return t[periodo(h) + '|' + hexId(punto[0], punto[1], Z.radioKm)] ?? 1;
}
export function factorZona(Z, lado, punto) {
  if (!Z || !punto) return 1;
  const tabla = Z[lado]; if (!tabla) return 1;
  const id = hexId(punto[0], punto[1], Z.radioKm);
  if (tabla[id] != null) return tabla[id];
  // Hexágono nunca visto: promedio (en log) de sus vecinos vistos, encogido a la mitad hacia 1.
  const v = hexVecinos(id).map((k) => tabla[k]).filter((x) => x != null);
  return v.length ? Math.exp((0.5 * v.reduce((s, x) => s + Math.log(x), 0)) / 6) : 1;
}
export function factorTrafico(T, trafico) {
  if (!T || !T.beta) return 1;
  const tr = Math.min(T.max, Math.max(T.min, trafico > 0 ? trafico : 1));
  return Math.pow(tr, T.beta);
}

// Precio sin redondear + desglose (lo usa también el entrenador para que todo se calcule igual).
export function desglose(V, viaje, festivos = []) {
  const ctx = contexto(viaje.ts ?? Date.parse(viaje.fecha), festivos);
  const x = columnas(V.base.tipo, viaje.km, minutosDe(viaje, V.base.minutos));
  const base = x.reduce((s, xi, i) => s + xi * V.base.coef[i], 0);
  const f = {
    hora: Math.exp(Math.log(factorHora(V.horas, ctx.tipo, ctx.hfrac)) * (1 + (V.horas.atenua || 0) * zKm(viaje.km))),
    zonaOrigen: factorZona(V.zonas, 'origen', viaje.o) * factorZonaPeriodo(V.zonas, 'origen', viaje.o, ctx.hfrac),
    zonaDestino: factorZona(V.zonas, 'destino', viaje.d) * factorZonaPeriodo(V.zonas, 'destino', viaje.d, ctx.hfrac),
    corredor: V.zonas?.corredor && viaje.o && viaje.d ? (V.zonas.corredor[hexId(viaje.o[0], viaje.o[1], V.zonas.radioKm) + '>' + hexId(viaje.d[0], viaje.d[1], V.zonas.radioKm)] ?? 1) : 1,
    rodeo: V.rodeo ? Math.exp(V.rodeo * zRodeo(viaje)) : 1,
    trafico: factorTrafico(V.trafico, viaje.trafico),
    lluvia: viaje.lluvia && V.lluvia ? V.lluvia : 1,
  };
  const fac = f.hora * f.zonaOrigen * f.zonaDestino * f.corredor * f.rodeo * f.trafico * f.lluvia;
  return { ctx, base, f, fac, crudo: base * fac * (1 + (V.margen || 0)) };
}

export function cotizarPico({ modelo, viaje, vehiculo }) {
  const veh = vehiculo || viaje.vehiculo || 'carro';
  const V = modelo.vehiculos ? modelo.vehiculos[veh] : modelo;
  const festivos = modelo.festivos || V.festivos || [];
  const r = desglose(V, viaje, festivos);
  const precio = Math.max(V.minima || 0, Math.round(r.crudo / 100) * 100);
  const r3 = (z) => Math.round(z * 1000) / 1000;
  return {
    precio,
    detalle: {
      formula: 'PICO', vehiculo: veh, tipoDia: r.ctx.tipo, hora: Math.round(r.ctx.hfrac * 100) / 100,
      base: Math.round(r.base), factores: Object.fromEntries(Object.entries(r.f).map(([k, x]) => [k, r3(x)])),
      margen: V.margen || 0, sinRedondear: Math.round(r.crudo), minima: V.minima,
    },
  };
}
