// Utilidades matemáticas del núcleo de fórmulas (sin dependencias; Node y navegador).
export const med = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN; };

// Mínimos cuadrados ponderados (pesos de Huber o relativos), con una regularización mínima para estabilidad.
export function wls(X, y, w) {
  const k = X[0].length, A = Array.from({ length: k }, () => Array(k + 1).fill(0));
  X.forEach((x, i) => { for (let a = 0; a < k; a++) { for (let b = 0; b < k; b++) A[a][b] += w[i] * x[a] * x[b]; A[a][k] += w[i] * x[a] * y[i]; } });
  for (let a = 0; a < k; a++) A[a][a] += 1e-6;
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < k; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let j = c; j <= k; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((r, i) => r[k] / r[i]);
}

export const celda = (p, t) => `${Math.round(p[0] / t)}:${Math.round(p[1] / t)}`;
// Distancia en línea recta (km) entre origen y destino ([lat, lng]).
export const recta = (a, b) => { const R = 6371, t = Math.PI / 180, x = Math.sin(((b[0] - a[0]) * t) / 2) ** 2 + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(((b[1] - a[1]) * t) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
export const BANDA = (h) => (h < 5 ? 'madrugada' : h < 9 ? 'pico_am' : h < 16 ? 'valle' : h < 20 ? 'pico_pm' : 'noche');

// ¿El lugar que eligió la app es el que se pidió? Las palabras propias del lugar ("estadio", "fabricato") deben estar en el
// NOMBRE elegido; el municipio ("caldas", "barbosa") puede venir en la dirección. Lecturas en otro lugar no se usan
// (ej.: "Parque Principal de Caldas" → la app eligió otro "Parque Principal"; "Metro Estadio" → "Metro Floresta").
const GENERICAS = new Set(['del', 'los', 'las', 'san', 'sede', 'entrada', 'parque', 'principal', 'estacion', 'metro', 'comercial', 'universidad', 'universitaria', 'institucion', 'hospital', 'clinica', 'terminal', 'campus', 'plaza', 'norte', 'sur', 'oriente', 'occidente', 'avenida', 'centro', 'medellin', 'calle', 'carrera', 'antioquia', 'tranvia', 'cable', 'nacional']);
const MUNICIPIOS = new Set(['bello', 'itagui', 'envigado', 'sabaneta', 'estrella', 'caldas', 'copacabana', 'girardota', 'barbosa']);
const fold = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const propias = (x) => fold(x).replace(/\(.*?\)/g, ' ').split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !GENERICAS.has(t));
export function lugarConfirmado(pedido, elegido) {
  if (!elegido) return true; // lecturas sin dato de la app: no se pueden revisar
  const nombre = String(elegido).split(' · ')[0], n = fold(nombre), todo = fold(elegido);
  const p = propias(pedido), propiasNoMun = p.filter((t) => !MUNICIPIOS.has(t));
  // Con palabras propias (Santa Margarita, Estadio) basta que estén en el nombre; si el nombre es genérico
  // ("Parque Principal de Caldas"), el municipio tiene que aparecer en el nombre o la dirección: hay muchos con ese nombre.
  return propiasNoMun.length ? propiasNoMun.every((t) => n.includes(t)) : p.every((t) => todo.includes(t));
}

// Contexto del día (señales que Carby sí conoce): festivos de Colombia (Ley Emiliani ya aplicada) y quincena (días de pago).
export const FESTIVOS = new Set(['2026-10-12', '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25', '2027-01-01', '2027-01-11', '2027-03-22', '2027-03-25', '2027-03-26']);
const ymd = (t) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
export const esFestivo = (fecha) => FESTIVOS.has(ymd(new Date(fecha)));
// Quincena: días de pago típicos (15 y fin de mes) y el día siguiente.
export const esQuincena = (fecha) => { const t = new Date(fecha), d = t.getDate(), fin = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); return d === 15 || d === 16 || d >= fin - 1 || d === 1; };
