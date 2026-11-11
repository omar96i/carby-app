// Prueba independiente de las fórmulas PROPIAS (PICO, CURVA): modelos congelados entrenados SOLO con sáb 3 + dom 4
// (antes de 2026-10-05 00:00 Colombia). Se cotizan TODAS las lecturas del lunes 5 (incluidas las de esta noche, que ningún
// agente vio), sin ningún precio de inDrive del lunes. Referencias: EN VIVO recomendado (campo carby) y fórmula oficial sola.
import { readFileSync } from 'node:fs';
const T = 'file:///C:/Users/CARVAJAL/Desktop/Carby/tools/tarifas/';
const { filas } = await import(T + 'nucleo/formulas.js');
const { cotizarPico } = await import(T + 'nucleo/pico.js');
const { cotizarCurva } = await import(T + 'nucleo/curva.js');
const D = 'C:/Users/CARVAJAL/Desktop/Carby/tools/tarifas/datos/';
const MP = JSON.parse(readFileSync(D + 'modelo-pico.json', 'utf8')), MC = JSON.parse(readFileSync(D + 'modelo-curva.json', 'utf8'));
const L = readFileSync(D + 'mediciones.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const DESDE = Date.parse('2026-10-05T05:00:00Z'), FOTO = Date.parse('2026-10-06T00:40:00Z');
const lun = L.filter((r) => r.at && Date.parse(r.at) >= DESDE);
const porId = new Map(lun.map((r) => [`${r.lote}|${r.id}`, r]));
const rec = (r, v) => (v === 'carro' ? ((new Date(r.carby.at).getHours() >= 17 ? null : r.carby.carro_banda) ?? r.carby.carro_vivo ?? r.carby.carro) : (r.carby.moto_laboral ?? r.carby.moto_vivo ?? r.carby.moto));
const met = (d) => { const n = d.length; if (!n) return null; const s = d.map(Math.abs).sort((a, b) => a - b), q = (k) => d.filter(k).length * 100 / n;
  return { n, banda: q((x) => x >= -300 && x <= 500), pierde: q((x) => x < -300), pasa: q((x) => x > 500), c100: q((x) => Math.abs(x) <= 100), tip: s[n >> 1], prom: Math.round(d.reduce((a, b) => a + b, 0) / n) }; };
const f = (m) => (m ? `${m.banda.toFixed(0).padStart(3)} % │ ${m.pierde.toFixed(0).padStart(3)} % │ ${m.pasa.toFixed(0).padStart(3)} % │ $${String(m.tip).padStart(5)} │ ${String(m.prom).padStart(6)}` : '—');
const FRANJAS = [['TODO el lunes', () => true], ['madrugada 0–6', (h) => h < 6], ['mañana 6–10', (h) => h >= 6 && h < 10], ['día 10–17', (h) => h >= 10 && h < 17], ['tarde 17–20', (h) => h >= 17 && h < 20], ['noche 20–24', (h) => h >= 20]];
const pct = {};
for (const v of ['carro', 'moto']) {
  const F = filas(lun, v).map((x) => ({ x, r: porId.get(x.id) })).filter((o) => o.r);
  const P = F.map(({ x, r }) => {
    const pico = cotizarPico({ modelo: MP, viaje: x, vehiculo: v }).precio, curva = cotizarCurva({ modelo: MC, viaje: x, vehiculo: v }).precio;
    return { h: new Date(r.at).getHours(), nuevo: Date.parse(r.at) >= FOTO, y: x.y, pico, curva, prop: Math.round(Math.sqrt(pico * curva) / 100) * 100, vivo: r.carby ? rec(r, v) : null, ofi: r.carby?.[v] ?? null };
  });
  console.log(`\n══════ ${v.toUpperCase()} · lunes 5 oct · ${P.length} carreras (${P.filter((p) => p.nuevo).length} de esta noche, que ningún agente vio) ══════`);
  console.log('                         │ banda │ pierde │ se pasa │ típica │ promedio d');
  for (const [nom, k] of FRANJAS) {
    const S = P.filter((p) => k(p.h)); if (!S.length) continue;
    console.log(`  ${nom} (${S.length})`);
    for (const [et, key] of [['PICO (propia)', 'pico'], ['CURVA (propia)', 'curva'], ['PICO×CURVA', 'prop'], ['EN VIVO (con inDrive)', 'vivo'], ['oficial sola', 'ofi']]) {
      const d = S.filter((p) => p[key] > 0).map((p) => p[key] - p.y); if (d.length < 5) continue;
      console.log(`    ${et.padEnd(22)}│ ${f(met(d))}${d.length < S.length ? ` (n ${d.length})` : ''}`);
    }
  }
  const N = P.filter((p) => p.nuevo);
  if (N.length >= 5) { console.log(`  SOLO las de esta noche (${N.length}, nunca vistas):`); for (const [et, key] of [['PICO', 'pico'], ['CURVA', 'curva'], ['EN VIVO', 'vivo']]) { const d = N.filter((p) => p[key] > 0).map((p) => p[key] - p.y); if (d.length) console.log(`    ${et.padEnd(22)}│ ${f(met(d))}`); } }
  // error relativo
  for (const key of ['pico', 'curva', 'vivo']) { const e = P.filter((p) => p[key] > 0).map((p) => Math.abs(p[key] - p.y) / p.y); pct[`${v}_${key}`] = (100 * e.filter((x) => x <= 0.1).length / e.length).toFixed(0); }
}
console.log('\n±10 % del precio de inDrive:', pct);
