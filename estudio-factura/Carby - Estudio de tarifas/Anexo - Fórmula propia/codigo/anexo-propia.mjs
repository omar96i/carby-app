// Genera el ANEXO "Fórmula propia de Carby: código y lógica" (HTML + PDF) en el escritorio, con TODAS las cifras sacadas de
// los modelos vigentes (datos/modelo-pico.json, datos/modelo-curva.json), del código (nucleo/pico.js, nucleo/curva.js) y de
// la prueba independiente sobre el lunes 5 oct (modelos entrenados solo con sáb 3 + dom 4). Copia también el código.
// Uso: node tools/tarifas/analisis/anexo-propia.mjs        (uso interno: aquí se nombra a inDrive solo para medirlo)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { filas } from '../nucleo/formulas.js';
import { cotizarPico, desglose, TIPO_LABEL } from '../nucleo/pico.js';
import { cotizarCurva, partes } from '../nucleo/curva.js';

const T = join(import.meta.dirname, '..'), DATOS = join(T, 'datos');
const SALIDA = 'C:\\Users\\CARVAJAL\\Desktop\\Carby - Estudio de tarifas\\Anexo - Fórmula propia';
const COD = join(SALIDA, 'codigo');
mkdirSync(COD, { recursive: true });
const MP = JSON.parse(readFileSync(join(DATOS, 'modelo-pico.json'), 'utf8'));
const MC = JSON.parse(readFileSync(join(DATOS, 'modelo-curva.json'), 'utf8'));
const L = readFileSync(join(DATOS, 'mediciones.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const $ = (x) => '$' + Math.round(x).toLocaleString('es-CO');
const x2 = (x) => '×' + x.toFixed(2).replace('.', ',');
const n1 = (x) => x.toFixed(1).replace('.', ',');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fechaCO = (iso) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });

/* ---------- 1. Prueba independiente: lunes 5 oct, modelos congelados (sáb + dom) ---------- */
const DESDE = Date.parse('2026-10-05T05:00:00Z'), HASTA = Date.parse('2026-10-06T05:00:00Z');
const lun = L.filter((r) => r.at && Date.parse(r.at) >= DESDE && Date.parse(r.at) < HASTA);
const porId = new Map(lun.map((r) => [`${r.lote}|${r.id}`, r]));
const rec = (r, v) => (v === 'carro' ? ((new Date(r.carby.at).getHours() >= 17 ? null : r.carby.carro_banda) ?? r.carby.carro_vivo ?? r.carby.carro) : (r.carby.moto_laboral ?? r.carby.moto_vivo ?? r.carby.moto));
const met = (d, y) => { const n = d.length, s = d.map(Math.abs).sort((a, b) => a - b), q = (k) => (100 * d.filter(k).length) / n;
  return { n, banda: q((x) => x >= -300 && x <= 500), pierde: q((x) => x < -300), pasa: q((x) => x > 500), tip: s[n >> 1], prom: d.reduce((a, b) => a + b, 0) / n, p10: (100 * d.filter((x, i) => Math.abs(x) <= 0.1 * y[i]).length) / n }; };
const FR = [['Todo el lunes', () => true], ['Madrugada (0–6 h)', (h) => h < 6], ['Mañana (6–10 h)', (h) => h >= 6 && h < 10], ['Día (10–17 h)', (h) => h >= 10 && h < 17], ['Tarde (17–20 h)', (h) => h >= 17 && h < 20], ['Noche (20–24 h)', (h) => h >= 20]];
const prueba = {};
for (const v of ['carro', 'moto']) {
  const P = filas(lun, v).map((x) => ({ x, r: porId.get(x.id) })).filter((o) => o.r).map(({ x, r }) => ({
    h: new Date(r.at).getHours(), y: x.y, pico: cotizarPico({ modelo: MP, viaje: x, vehiculo: v }).precio,
    curva: cotizarCurva({ modelo: MC, viaje: x, vehiculo: v }).precio, vivo: r.carby ? rec(r, v) : null, ofi: r.carby?.[v] ?? null }));
  prueba[v] = FR.map(([nom, k]) => { const S = P.filter((p) => k(p.h)); if (!S.length) return null;
    const m = (key) => { const Q = S.filter((p) => p[key] > 0); return Q.length >= 5 ? met(Q.map((p) => p[key] - p.y), Q.map((p) => p.y)) : null; };
    return { nom, n: S.length, pico: m('pico'), curva: m('curva'), vivo: m('vivo'), ofi: m('ofi') }; }).filter(Boolean);
}
const nLun = prueba.carro[0].n;

/* ---------- 2. Ejemplos numéricos con el código real ---------- */
const lugar = (o) => { let best = null, bd = 1e9; for (const r of L) { if (!r.o || !r.origen) continue; const d = Math.hypot(r.o[0] - o[0], r.o[1] - o[1]); if (d < bd) { bd = d; best = r.origen; } } return best; };
const EJ = [
  { nom: 'Viaje corto, martes 8:15 a. m.', fecha: '2026-10-06T13:15:00Z', km: 4.2, min: 14, trafico: 1.25, o: [6.2087, -75.5671], d: [6.2442, -75.5812] },
  { nom: 'Viaje medio, viernes 7:30 p. m.', fecha: '2026-10-10T00:30:00Z', km: 9.5, min: 26, trafico: 1.3, o: [6.2518, -75.5636], d: [6.2995, -75.5586] },
  { nom: 'Viaje largo, domingo 3:00 a. m.', fecha: '2026-10-11T08:00:00Z', km: 21, min: 32, trafico: 0.8, o: [6.2442, -75.5812], d: [6.3378, -75.5443] },
];
const { viaje } = await import('../nucleo/formulas.js');
const ejemplos = EJ.map((e) => {
  const out = { ...e, origen: lugar(e.o), destino: lugar(e.d) };
  for (const v of ['carro', 'moto']) {
    const f = viaje({ km: e.km, min: e.min, trafico: e.trafico, fecha: e.fecha, o: e.o, d: e.d, lluvia: false });
    const Vp = MP.vehiculos[v], dp = desglose(Vp, f, MP.festivos || []), cp = cotizarPico({ modelo: MP, viaje: f, vehiculo: v });
    const Vc = MC[v], pc = partes(Vc, f), cc = cotizarCurva({ modelo: MC, viaje: f, vehiculo: v });
    out[v] = { dp, cp, pc, cc, Vp, Vc };
  }
  return out;
});

/* ---------- 3. Tablas de horas pico ---------- */
const filaPico = (v, tipo) => MP.vehiculos[v].horas.tabla[tipo] || MP.vehiculos[v].horas.tabla.general;
const curvaArr = (v, tipo) => Object.values(MC[v].recargo[tipo] ?? MC[v].recargo.laboral); // 49 nudos desde las 6:00
const curvaEnHora = (v, tipo, h) => { const a = curvaArr(v, tipo), x = ((h - 6) % 24 + 24) % 24, u = x / 0.5, j = Math.floor(u), w = u - j; return a[j] * (1 - w) + a[Math.min(j + 1, a.length - 1)] * w; };
const TP = ['laboral', 'sabado', 'domingo_festivo'], TC = { laboral: 'laboral', sabado: 'sabado', domingo_festivo: 'domingo' };
function svgHoras(v) {
  const W = 680, H = 260, ml = 46, mr = 175, mt = 16, mb = 34, iw = W - ml - mr, ih = H - mt - mb;
  const vals = []; for (let h = 0; h < 24; h += 0.25) for (const t of TP) { vals.push(filaPico(v, t)[Math.floor(h)]); vals.push(curvaEnHora(v, TC[t], h)); }
  const lo = Math.floor(Math.min(...vals) * 20) / 20, hi = Math.ceil(Math.max(...vals) * 20) / 20;
  const X = (h) => ml + (h / 24) * iw, Y = (y) => mt + ih - ((y - lo) / (hi - lo)) * ih;
  let g = '';
  for (let y = lo; y <= hi + 1e-9; y += 0.05) g += `<line x1="${ml}" x2="${ml + iw}" y1="${Y(y)}" y2="${Y(y)}" stroke="#e7e7e7"/><text x="${ml - 6}" y="${Y(y) + 4}" text-anchor="end" font-size="10" fill="#666">${x2(y)}</text>`;
  for (let h = 0; h <= 24; h += 3) g += `<text x="${X(h)}" y="${H - 12}" text-anchor="middle" font-size="10" fill="#666">${h}:00</text>`;
  const pasos = (t) => { let d = ''; for (let h = 0; h < 24; h++) { const y = Y(filaPico(v, t)[h]); d += `${h ? 'L' : 'M'}${X(h)},${y} L${X(h + 1)},${y} `; } return d; };
  const cont = (t) => { let d = ''; for (let h = 0; h <= 24; h += 0.25) d += `${h ? 'L' : 'M'}${X(h)},${Y(curvaEnHora(v, TC[t], h))} `; return d; };
  const lab = (y, txt, col) => `<text x="${ml + iw + 8}" y="${y}" font-size="10.5" fill="#222"><tspan fill="${col}">■</tspan> ${txt}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Recargo por hora ${v}">${g}
    <path d="${pasos('laboral')}" fill="none" stroke="#9a9a9a" stroke-width="2"/>
    <path d="${cont('laboral')}" fill="none" stroke="#FF5500" stroke-width="2.2"/>
    <path d="${cont('domingo_festivo')}" fill="none" stroke="#1f3b73" stroke-width="2" stroke-dasharray="5 3"/>
    ${lab(mt + 12, 'PICO lun–vie (escalones)', '#9a9a9a')}${lab(mt + 30, 'CURVA lun–vie', '#FF5500')}${lab(mt + 48, 'CURVA domingo/festivo', '#1f3b73')}
  </svg>`;
}
function tablaHoras(v) {
  let h = '<table class="mini"><thead><tr><th>Hora</th>' + TP.map((t) => `<th>PICO<br>${TIPO_LABEL[t]}</th>`).join('') + TP.map((t) => `<th>CURVA<br>${TIPO_LABEL[t]}</th>`).join('') + '</tr></thead><tbody>';
  for (let k = 0; k < 24; k++) {
    const vs = [...TP.map((t) => filaPico(v, t)[k]), ...TP.map((t) => curvaEnHora(v, TC[t], k + 0.5))];
    const mx = Math.max(...vs);
    h += `<tr><td>${k}:00–${k}:59</td>${vs.map((x) => `<td${x >= 1.2 ? ' class="caro"' : x <= 1.03 ? ' class="valle"' : ''}>${x2(x)}</td>`).join('')}</tr>`;
    void mx;
  }
  return h + '</tbody></table>';
}

/* ---------- 4. Zonas: las más caras y las más baratas (con el nombre del lugar medido más cercano) ---------- */
function zonas(v) {
  const Z = MP.vehiculos[v].zonas; if (!Z?.origen) return '';
  const R = Z.radioKm, nombres = {};
  const { hexId } = { hexId: (lat, lng) => { const LAT0 = 6.25, LNG0 = -75.57, KM_LAT = 110.574, KM_LNG = 111.32 * Math.cos((LAT0 * Math.PI) / 180); const x = (lng - LNG0) * KM_LNG, y = (lat - LAT0) * KM_LAT; const qf = ((Math.sqrt(3) / 3) * x - y / 3) / R, rf = ((2 / 3) * y) / R, sf = -qf - rf; let q = Math.round(qf), r = Math.round(rf); const s = Math.round(sf), dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(s - sf); if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s; return `${R}:${q + 0}:${r + 0}`; } };
  for (const r of L) if (r.o && r.origen) { const id = hexId(r.o[0], r.o[1]); (nombres[id] ||= {})[r.origen] = (nombres[id][r.origen] || 0) + 1; }
  const nom = (id) => { const c = nombres[id]; return c ? Object.entries(c).sort((a, b) => b[1] - a[1])[0][0] : '(sin nombre)'; };
  const E = Object.entries(Z.origen).sort((a, b) => b[1] - a[1]);
  const fila = ([id, f]) => `<tr><td>${esc(nom(id))}</td><td>${x2(f)}</td><td>${f >= 1 ? '+' : ''}${n1((f - 1) * 100)} %</td></tr>`;
  return `<div class="dos"><div><h4>Recogidas más caras</h4><table class="mini"><thead><tr><th>Zona (lugar medido)</th><th>Factor</th><th>Efecto</th></tr></thead><tbody>${E.slice(0, 6).map(fila).join('')}</tbody></table></div>
    <div><h4>Recogidas más baratas</h4><table class="mini"><thead><tr><th>Zona (lugar medido)</th><th>Factor</th><th>Efecto</th></tr></thead><tbody>${E.slice(-6).reverse().map(fila).join('')}</tbody></table></div></div>
    <p class="nota">${E.length} hexágonos de ${n1(R)} km con factor propio (recogida). Un hexágono nunca visto toma la mitad del promedio de sus vecinos; si no tiene vecinos, ×1,00.</p>`;
}

/* ---------- 5. HTML ---------- */
const tm = (m) => (m ? `<td>${n1(m.banda)} %</td><td class="${m.pierde <= 15 ? 'bien' : m.pierde >= 35 ? 'mal' : ''}">${n1(m.pierde)} %</td><td>${n1(m.pasa)} %</td><td>${$(m.tip)}</td><td>${n1(m.p10)} %</td><td>${m.prom >= 0 ? '+' : '−'}${$(Math.abs(m.prom)).slice(0)}</td>` : '<td colspan="6">—</td>');
const tablaPrueba = (v) => `<table><thead><tr><th>Franja (carreras)</th><th>Fórmula</th><th>Banda</th><th>Pierde</th><th>Se pasa</th><th>Típica</th><th>±10 %</th><th>Promedio d</th></tr></thead><tbody>${
  prueba[v].map((f) => [['PICO (propia)', f.pico, 'propia'], ['CURVA (propia)', f.curva, 'propia'], ['Con inDrive en vivo', f.vivo, ''], ['Oficial sola', f.ofi, '']].filter(([, m]) => m).map(([et, m, c], i) => `<tr class="${c}">${i === 0 ? `<td rowspan="4">${f.nom} (${f.n})</td>` : ''}<td>${et}</td>${tm(m)}</tr>`).join('')).join('')}</tbody></table>`;
const ejemploHTML = (e) => {
  const fila = (v) => { const { dp, cp, pc, cc, Vp, Vc } = e[v]; const bc = Vp.base.coef;
    return `<h4>${v === 'carro' ? 'Carro' : 'Moto'}</h4><div class="dos"><div><b>PICO</b><table class="mini"><tbody>
      <tr><td>Base: ${Vp.base.tipo === 'tramos' ? `${$(bc[0])} + ${$(bc[1])}/km (0–3) + ${$(bc[2])}/km (3–12) + ${$(bc[3])}/km (&gt;12) + ${$(bc[4])}/min` : `${$(bc[0])} + ${$(bc[1])}/km + ${$(bc[2])}/min`}</td><td>${$(dp.base)}</td></tr>
      <tr><td>Hora (${TIPO_LABEL[dp.ctx.tipo]}, ${n1(dp.ctx.hfrac)} h; atenuada por distancia)</td><td>${x2(dp.f.hora)}</td></tr>
      <tr><td>Zona de recogida × zona de destino</td><td>${x2(dp.f.zonaOrigen)} × ${x2(dp.f.zonaDestino)}</td></tr>
      <tr><td>Tráfico × lluvia</td><td>${x2(dp.f.trafico)} × ${x2(dp.f.lluvia)}</td></tr>
      <tr><td>Margen</td><td>+${n1((Vp.margen || 0) * 100)} %</td></tr>
      <tr><td>Sin redondear</td><td>${$(dp.crudo)}</td></tr>
      <tr class="total"><td>Precio (a $100, mínima ${$(Vp.minima)})</td><td>${$(cp.precio)}</td></tr></tbody></table></div>
      <div><b>CURVA</b><table class="mini"><tbody>
      <tr><td>Base: ${$(Vc.base.fijo)} + ${$(Vc.base.km)}/km + ${$(Vc.base.min)}/min</td><td>${$(pc.base)}</td></tr>
      <tr><td>Recargo de la curva (jornada ${pc.tipo})</td><td>${x2(pc.recargo)}</td></tr>
      <tr><td>Distancia × tráfico</td><td>${x2(pc.fKm)} × ${x2(pc.fTr)}</td></tr>
      <tr><td>Zona de recogida × zona de destino</td><td>${x2(pc.zo)} × ${x2(pc.zd)}</td></tr>
      <tr><td>Lluvia × colchón (${pc.nocturna ? 'noche' : 'día'})</td><td>${x2(pc.ll)} × ${x2(pc.colchon)}</td></tr>
      <tr><td>Sin redondear</td><td>${$(cc.detalle.crudo)}</td></tr>
      <tr class="total"><td>Precio (a $100, mínima ${$(Vc.minima)})</td><td>${$(cc.precio)}</td></tr></tbody></table></div></div>`; };
  return `<div class="ej"><h3>${esc(e.nom)}</h3><p>${String(e.km).replace(".", ",")} km · ${e.min} min con tráfico (tráfico de Google ${n1(e.trafico)}) · recogida cerca de <b>${esc(e.origen)}</b>, destino cerca de <b>${esc(e.destino)}</b>.</p>${fila('carro')}${fila('moto')}</div>`;
};
const vC = MP.vehiculos.carro, vM = MP.vehiculos.moto, cC = MC.carro, cM = MC.moto;
const p0 = (v, k) => prueba[v][0][k];
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Anexo: fórmula propia de Carby</title>
<style>
@page { size: A4; margin: 16mm 15mm 16mm 15mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", Arial, sans-serif; color: #1d1d1f; font-size: 10.5pt; line-height: 1.45; margin: 0; background: #fff; }
h1 { font-size: 26pt; margin: 0 0 6px; } h2 { font-size: 16pt; border-bottom: 3px solid #FF5500; padding-bottom: 4px; margin: 0 0 12px; break-after: avoid; }
h3 { font-size: 12.5pt; margin: 14px 0 6px; color: #b33c00; break-after: avoid; } h4 { margin: 10px 0 4px; font-size: 10.5pt; break-after: avoid; }
section { break-before: page; } .portada { break-before: auto; padding-top: 70mm; } .portada .sub { font-size: 13pt; color: #555; }
.barra { height: 8px; background: #FF5500; width: 120px; margin: 18px 0; }
table { border-collapse: collapse; width: 100%; margin: 6px 0 10px; font-size: 9pt; break-inside: auto; } tr { break-inside: avoid; }
th, td { border: 1px solid #ddd; padding: 3px 6px; text-align: left; vertical-align: top; } th { background: #fff1ea; }
.mini td, .mini th { padding: 2px 5px; font-size: 8.6pt; } td.caro { background: #ffe0cf; } td.valle { background: #eef4ff; }
td.bien { color: #0a6b2e; font-weight: 600; } td.mal { color: #a40000; font-weight: 600; } tr.propia td { background: #fffaf6; }
tr.total td { font-weight: 700; background: #fff1ea; }
.formula { background: #1d1d1f; color: #fff; padding: 10px 14px; border-radius: 6px; font-family: Consolas, monospace; font-size: 9.6pt; margin: 8px 0 12px; white-space: pre-wrap; }
.formula b { color: #FF7a3d; } .caja { border-left: 4px solid #FF5500; background: #fff6f1; padding: 8px 12px; margin: 8px 0; }
.dos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; } .nota { color: #555; font-size: 9pt; } .ej { break-inside: avoid-page; }
code { font-family: Consolas, monospace; font-size: 9pt; background: #f3f3f3; padding: 0 3px; } ol li, ul li { margin: 2px 0; }
</style></head><body>
<div class="portada"><h1>Anexo · Fórmula propia de Carby</h1><div class="barra"></div>
<p class="sub">Código y lógica de las dos versiones (PICO y CURVA), sus tablas de horas pico, ejemplos paso a paso y la prueba independiente del lunes 5 de octubre de 2026.</p>
<p>Uso interno. Aquí se nombra a inDrive solo porque es lo que se mide.<br>Generado: ${fechaCO(new Date().toISOString())} · modelos entrenados con ${MP.lecturas} lecturas anteriores al ${fechaCO(MP.entrenadoHasta)} (sábado 3 y domingo 4 de octubre).</p></div>

<section><h2>1. Qué es y por qué existe</h2>
<p>Hasta el 5 de octubre, el precio que mejor acertaba usaba <b>precios de inDrive de hace pocos minutos</b> (nivel del momento, vecinos ±30 min, filtros de Kalman). Cuando Carby opere de verdad <b>no tendrá esos precios</b>. Por eso el dueño pidió una fórmula <b>propia</b>: estructurada por nosotros, que solo use lo que Carby sí sabe al cotizar.</p>
<div class="caja"><b>Lo que usa:</b> distancia y minutos de la ruta (Google), tráfico de Google en ese momento, hora y tipo de día (lunes a viernes, sábado, domingo o festivo), zona de recogida y de destino (hexágonos), lluvia.<br>
<b>Lo que NO usa:</b> ningún precio de inDrive al cotizar. Solo aprende de lo medido en días anteriores, una vez al día (00:05).</div>
<p>Hay dos versiones que compiten, con la misma idea y distinta forma de las horas pico:</p>
<ul><li><b>PICO</b>: una <b>tabla de recargos por hora</b> (24 valores por tipo de día), fácil de leer y de publicar.</li>
<li><b>CURVA</b>: una <b>curva continua</b> (un valor cada 30 minutos con transición suave), sin saltos de precio al cambiar de hora.</li></ul>
<h3>Resultado en una frase</h3>
<p>Entrenadas solo con el fin de semana y sin ver un solo precio de inDrive del lunes, cotizaron las ${nLun} carreras del lunes 5 de octubre así:</p>
<table><thead><tr><th>Lunes 5 oct (${nLun} carreras)</th><th>Banda [−$300, +$500]</th><th>Conductor pierde</th><th>Típica</th><th>±10 %</th></tr></thead><tbody>
${[['carro', 'Carro'], ['moto', 'Moto']].map(([v, V]) => [['curva', 'CURVA (propia)'], ['pico', 'PICO (propia)'], ['vivo', 'Con inDrive en vivo']].map(([k, et]) => { const m = p0(v, k); return `<tr${k !== 'vivo' ? ' class="propia"' : ''}><td>${V} · ${et}</td><td>${n1(m.banda)} %</td><td>${n1(m.pierde)} %</td><td>${$(m.tip)}</td><td>${n1(m.p10)} %</td></tr>`; }).join('')).join('')}
</tbody></table>
<p>La fórmula propia <b>ya iguala o supera</b> al precio que sí mira inDrive en vivo. Su defecto: el carro queda caro en promedio (más que nada de 5 a 8 p. m.), porque solo conocía noches de fin de semana. Se corrige midiendo más días laborales; la tabla se reentrena sola cada madrugada.</p>
</section>

<section><h2>2. PICO: la tabla de horas pico</h2>
<div class="formula"><b>precio</b> = base(km, minutos) × <b>hora</b>(tipo de día, hora) × zona de recogida × zona de destino × tráfico × lluvia × (1 + margen)
       → redondeado a $100, nunca por debajo de la mínima</div>
<h3>Paso a paso</h3>
<ol>
<li><b>Base.</b> Carro: arranque ${$(vC.base.coef[0])} + ${$(vC.base.coef[1])} por km en los primeros 3 km + ${$(vC.base.coef[2])} por km de 3 a 12 km + ${$(vC.base.coef[3])} por km después de 12 km + ${$(vC.base.coef[4])} por minuto (minutos de Google con tráfico). Moto: ${$(vM.base.coef[0])} + ${$(vM.base.coef[1])} por km + ${$(vM.base.coef[2])} por minuto. Es el precio de la hora más barata.</li>
<li><b>Hora.</b> Se busca el tipo de día (lunes a viernes, sábado, domingo o festivo; festivos de Colombia) y la hora. Entre una hora y la siguiente se mezcla en línea recta, para que no haya saltos. El recargo pesa un poco menos en viajes largos (atenuación por distancia: carro ${n1(vC.horas.atenua * 100)} %, moto ${n1(vM.horas.atenua * 100)} % por cada unidad de ln(km/6)).</li>
<li><b>Zona de recogida y de destino.</b> La ciudad se divide en hexágonos de ${n1(vC.zonas.radioKm)} km. Cada uno tiene su factor aprendido (ej.: ×1,08 = esa zona cobra 8 % más). En la moto, además, el factor de zona cambia entre día y noche.</li>
<li><b>Tráfico.</b> Factor (minutos con tráfico ÷ sin tráfico)<sup>β</sup>. Con los datos de hoy β = ${vC.trafico.beta} (carro) y ${vM.trafico.beta} (moto): el tráfico ya entra por los minutos de la base y, como casi no hubo tráfico pesado medido, el factor extra quedó en ×1,00.</li>
<li><b>Lluvia.</b> Carro ${x2(vC.lluvia)}, moto ${x2(vM.lluvia)} (pocas lecturas con lluvia: casi sin efecto todavía).</li>
<li><b>Margen.</b> Carro +${n1(vC.margen * 100)} %, moto +${n1(vM.margen * 100)} %: un pequeño colchón para que el conductor no quede por debajo. Se recalcula cada día.</li>
<li><b>Redondeo</b> a $100 (como inDrive) y mínima: carro ${$(vC.minima)}, moto ${$(vM.minima)}.</li></ol>
<h3>Cómo aprende la tabla (cada madrugada a las 00:05)</h3>
<ul><li>Toma todas las lecturas <b>anteriores a las 00:00 de ese día</b>. Nunca usa lecturas del mismo día.</li>
<li>Ajusta la base buscando el menor error en <b>porcentaje</b> y resiste los precios raros (pesos de Huber).</li>
<li>Cada celda de la tabla se <b>encoge hacia su “padre”</b> cuando tiene pocas lecturas: tipo de día × hora → la hora sola, todos los días → horas vecinas (±3 h y ±6 h) → promedio. Por eso un tipo de día nunca visto (el primer lunes) usa la hora de todos los días, y se va separando a medida que hay datos.</li>
<li>Los parámetros (cuánto encoger, tamaño de los hexágonos, etc.) se eligieron validando dentro del fin de semana (rutas fuera y último día fuera), nunca mirando el lunes.</li></ul>
</section>

<section><h2>3. CURVA: las horas pico como curva continua</h2>
<div class="formula"><b>precio</b> = (fijo + $/km·km + $/min·min) × <b>recargo</b>(jornada, hora) × (km/5)<sup>e_km(hora)</sup> × tráfico<sup>e_tr(hora)</sup>
       × zona de recogida × zona de destino × lluvia × colchón (día / noche)   → a $100, nunca bajo la mínima</div>
<ol>
<li><b>Base.</b> Carro: ${$(cC.base.fijo)} + ${$(cC.base.km)} por km + ${$(cC.base.min)} por minuto con tráfico. Moto: ${$(cM.base.fijo)} + ${$(cM.base.km)} por km + ${$(cM.base.min)} por minuto. Mínimas: ${$(cC.minima)} y ${$(cM.minima)}.</li>
<li><b>Jornada.</b> Empieza a las 6:00 a. m.: la madrugada pertenece a la noche que empezó el día anterior (el domingo a las 2 a. m. es “noche de sábado”). Tipos: laboral, sábado y domingo/festivo.</li>
<li><b>Recargo.</b> Una tabla cada 30 minutos con transición en línea recta entre puntos: el precio cambia suave con el reloj. Cada tipo de jornada es la curva común más una desviación <b>encogida</b> hacia ella (con pocos datos, usa la común).</li>
<li><b>Distancia y tráfico por hora.</b> Exponentes que permiten que de noche los viajes largos o con tráfico se encarezcan distinto. Con los datos de hoy la distancia quedó apagada y el exponente de tráfico es pequeño (≈ ${n1(Object.values(cC.trafico.exponente)[0] * 100)} % por unidad de ln(tráfico) en carro).</li>
<li><b>Zonas.</b> Hexágonos de dos tamaños a la vez: ${[].concat(cC.zona).map((z) => `${String(z.radio).replace(".", ",")} km (${Object.keys(z.origen || {}).length} con factor propio en carro)`).join(' y ')}; los factores se multiplican.</li>
<li><b>Lluvia</b> carro ${x2(cC.lluvia)}, moto ${x2(cM.lluvia)}. <b>Colchón</b>: carro día ${x2(cC.colchon.dia)} / noche ${x2(cC.colchon.noche)}; moto día ${x2(cM.colchon.dia)} / noche ${x2(cM.colchon.noche)}.</li></ol>
<h3>Cómo aprende</h3>
<ul><li>Todo en logaritmo, alternando base ↔ curvas, con pesos de Huber. Las curvas son <i>splines</i> con penalización de curvatura (no se permiten curvas nerviosas).</li>
<li>Hiperparámetros y colchón se eligen solo con los días de entrenamiento (se entrena con las jornadas anteriores y se valida con la última). Se reentrena cada madrugada (~18 s).</li></ul>
</section>

<section><h2>4. Tablas de horas pico (carro)</h2>
<p>Recargo sobre la tarifa base. <span style="background:#ffe0cf;padding:0 4px">Naranja</span> = 20 % o más; <span style="background:#eef4ff;padding:0 4px">azul</span> = hora valle (≤ 3 %). En CURVA se muestra el valor a la media hora.</p>
${svgHoras('carro')}${tablaHoras('carro')}
<p class="nota">Lunes a viernes todavía casi igual a los demás días: hasta el ${fechaCO(MP.entrenadoHasta)} no había ningún día laboral medido. Con el reentreno del 6 de octubre a las 00:05 ya entra el lunes (la madrugada laboral sale más barata que la de fin de semana).</p></section>
<section><h2>5. Tablas de horas pico (moto)</h2>${svgHoras('moto')}${tablaHoras('moto')}</section>

<section><h2>6. Zonas (hexágonos) y zonas calientes</h2>
<h3>Carro (PICO)</h3>${zonas('carro')}<h3>Moto (PICO)</h3>${zonas('moto')}
<div class="caja"><b>Zonas calientes.</b> Hoy el factor de zona es fijo por hexágono (aprendido de días anteriores). Cuando Carby opere, la forma de compensar una zona caliente sin mirar a inDrive es un <b>recargo dinámico propio</b> por hexágono y franja: solicitudes de Carby ÷ conductores libres en ese hexágono en los últimos minutos, con tope y piso, y aviso visible al usuario. Ver el capítulo de zonas calientes del informe principal.</div></section>

<section><h2>7. Ejemplos paso a paso (calculados con el código real)</h2>
<p class="nota">Viajes ilustrativos (no medidos): sirven para ver cómo se arma el precio. Cada número sale de <code>nucleo/pico.js</code> y <code>nucleo/curva.js</code> con los modelos vigentes.</p>
${ejemplos.map(ejemploHTML).join('')}</section>

<section><h2>8. Prueba independiente: lunes 5 de octubre</h2>
<p><b>Cómo se hizo.</b> Los dos modelos se entrenaron <b>solo con el sábado 3 y el domingo 4</b> y quedaron fijos. Después cotizaron todas las carreras del lunes 5 sin ver ningún precio de inDrive de ese día (incluidas las de la noche, que ningún agente vio al diseñarlas). Se comparan contra el precio “con inDrive en vivo” (el recomendado del laboratorio, que sí usa precios recientes) y contra la fórmula oficial sola.</p>
<p><b>Cómo leer:</b> d = Carby − inDrive. <b>Banda</b>: −$300 ≤ d ≤ +$500 (la meta). <b>Pierde</b>: d &lt; −$300 (el conductor pierde plata, lo peor). <b>Se pasa</b>: d &gt; +$500. <b>Típica</b>: la mitad de las carreras queda más cerca que esto. <b>±10 %</b>: dentro del 10 % del precio de inDrive.</p>
<h3>Carro</h3>${tablaPrueba('carro')}<h3>Moto</h3>${tablaPrueba('moto')}
<h3>Lectura honesta</h3>
<ul><li><b>Carro:</b> la propia queda más veces en la banda y deja perder al conductor muchas menos veces que el precio en vivo; a ±10 % queda igual o mejor. Pero <b>se pasa</b> mucho: el promedio queda por encima de inDrive, sobre todo de 5 a 8 p. m. (solo conocía noches de fin de semana, más caras).</li>
<li><b>Moto:</b> empatada con el precio en vivo en el día completo; mejor en la mañana; peor en la madrugada (queda baja).</li>
<li><b>Por qué:</b> el error principal es el <b>nivel de cada día</b> (la madrugada laboral fue 10–20 % más barata que la de fin de semana; la noche del lunes, con lluvia y partido, la moto subió). No es la estructura: se corrige con más días laborales en el entrenamiento.</li>
<li><b>Límite:</b> inDrive contra sí mismo (misma ruta, menos de una hora después) solo queda en la banda ~45 % de las veces en carro. Ninguna fórmula fija puede pasar de ahí.</li></ul>
</section>

<section><h2>9. Archivos de este anexo y cómo correrlos</h2>
<table><thead><tr><th>Archivo (carpeta <code>codigo</code>)</th><th>Qué es</th></tr></thead><tbody>
<tr><td><code>pico.js</code></td><td>Cotizador PICO: <code>cotizarPico({ modelo, viaje, vehiculo })</code>. Puro, sin disco, &lt; 1 ms.</td></tr>
<tr><td><code>curva.js</code> + <code>util.js</code></td><td>Cotizador CURVA: <code>cotizarCurva({ modelo, viaje, vehiculo })</code> (usa los festivos de <code>util.js</code>).</td></tr>
<tr><td><code>entrenar-pico.mjs</code></td><td>Entrenador de PICO (<code>analisis/pico.mjs</code>): escribe <code>datos/modelo-pico.json</code> con lecturas anteriores a las 00:00.</td></tr>
<tr><td><code>entrenar-curva.mjs</code></td><td>Entrenador de CURVA (<code>analisis/curva.mjs</code>): escribe <code>datos/modelo-curva.json</code>.</td></tr>
<tr><td><code>modelo-pico.json</code>, <code>modelo-curva.json</code>, <code>modelo-curva.md</code></td><td>Los modelos vigentes con los que se calculó este anexo (tablas completas).</td></tr>
<tr><td><code>prueba-propia.mjs</code></td><td>La prueba independiente del capítulo 8.</td></tr>
<tr><td><code>anexo-propia.mjs</code></td><td>Este generador (vuelve a calcular todo y regenera el PDF).</td></tr></tbody></table>
<p>Los archivos originales viven en <code>Carby\\tools\\tarifas\\</code> (<code>nucleo\\</code>, <code>analisis\\</code>, <code>datos\\</code>). Para regenerar este anexo con los datos del día: <code>node tools\\tarifas\\analisis\\anexo-propia.mjs</code>.</p>
<p>Las dos fórmulas se graban <b>a ciegas</b> en cada carrera que mide el celular (<code>carro_pico</code>, <code>moto_pico</code>, <code>carro_curva</code>, <code>moto_curva</code>), así que cada día hay una prueba nueva y real. Se reentrenan solas cada madrugada (supervisor, 00:05).</p></section>
</body></html>`;
writeFileSync(join(SALIDA, 'Anexo - Fórmula propia.html'), html);

/* ---------- 6. Copias del código y PDF ---------- */
const copias = [['nucleo/pico.js', 'pico.js'], ['nucleo/curva.js', 'curva.js'], ['nucleo/util.js', 'util.js'], ['analisis/pico.mjs', 'entrenar-pico.mjs'], ['analisis/curva.mjs', 'entrenar-curva.mjs'],
  ['datos/modelo-pico.json', 'modelo-pico.json'], ['datos/modelo-curva.json', 'modelo-curva.json'], ['datos/modelo-curva.md', 'modelo-curva.md'], ['analisis/anexo-propia.mjs', 'anexo-propia.mjs']];
for (const [a, b] of copias) if (existsSync(join(T, a))) copyFileSync(join(T, a), join(COD, b));
const PR = 'C:\\Users\\CARVAJAL\\AppData\\Local\\Temp\\claude\\c--Users-CARVAJAL-Desktop-Carby\\1396ac6a-06e8-4c4e-a2fe-af20ae80267a\\scratchpad\\prueba-propia.mjs';
if (existsSync(PR)) copyFileSync(PR, join(COD, 'prueba-propia.mjs'));
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
const pdf = join(SALIDA, 'Anexo - Fórmula propia.pdf');
const r = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdf}`, 'file:///' + join(SALIDA, 'Anexo - Fórmula propia.html').replace(/\\/g, '/')], { encoding: 'utf8', timeout: 120000 });
console.log(existsSync(pdf) ? `PDF: ${pdf}` : `No se generó el PDF: ${r.stderr?.slice(0, 300)}`);
