#!/usr/bin/env node
/* Orbit 360 · Mapeador columnas importación A&S v1.104
   Analiza CSV locales y sugiere colección/campos por sinónimos.

   Seguro por defecto: dry-run, solo genera reporte JSON/TXT.
   Para crear CSV normalizados locales requiere:
   --apply --confirm MAPEAR_AYS

   No usa red, no Firebase, no escritura remota, no datos reales en repo.
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
function arg(name, fallback = ''){ const i = args.indexOf(name); return i >= 0 ? (args[i + 1] || fallback) : fallback; }
function has(name){ return args.includes(name); }

const inputDir = path.resolve(arg('--input', path.join(root, '_orbit360_imports', 'ays_real')));
const outDir = path.resolve(arg('--output', path.join(root, '_orbit360_imports', 'ays_real', '_normalizados')));
const reportDir = path.join(root, '_orbit360_reports');
const synonymPath = path.join(root, 'tools', 'orbit360-sinonimos-importacion-ays-v104.json');
const schemaPath = path.join(root, 'tools', 'orbit360-schema-importacion-ays-v104.json');
const apply = has('--apply');
const confirm = arg('--confirm', '');
const errors = [];
const warnings = [];
const results = [];
const stamp = new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14);
const jsonReport = path.join(reportDir, `MAPEO-COLUMNAS-IMPORTACION-AYS-V104-${stamp}.json`);
const txtReport = path.join(reportDir, `MAPEO-COLUMNAS-IMPORTACION-AYS-V104-${stamp}.txt`);

function normalize(value){
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}
function parseCsv(text){
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i+1];
    if (q && c === '"' && n === '"') { cell += '"'; i++; continue; }
    if (c === '"') { q = !q; continue; }
    if (!q && c === ',') { row.push(cell); cell = ''; continue; }
    if (!q && (c === '\n' || c === '\r')) {
      if (c === '\r' && n === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(v => String(v || '').trim())) rows.push(row);
      row = [];
      continue;
    }
    cell += c;
  }
  row.push(cell);
  if (row.some(v => String(v || '').trim())) rows.push(row);
  return rows;
}
function csvEscape(v){
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function listCsv(dir){
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...listCsv(p));
    else if (p.toLowerCase().endsWith('.csv')) out.push(p);
  }
  return out.filter(p => !p.includes(`${path.sep}_normalizados${path.sep}`));
}
function loadJson(file){ return JSON.parse(fs.readFileSync(file, 'utf8')); }
function synonymSet(values){ return new Set((values || []).map(normalize).filter(Boolean)); }
function scoreFile(headers, collection, def){
  const headerNorms = headers.map(normalize);
  const headerSet = new Set(headerNorms);
  let signalScore = 0;
  for (const s of def.requiredSignals || []) if (headerSet.has(normalize(s)) || headerNorms.some(h => h.includes(normalize(s)))) signalScore += 4;
  const fieldMatches = {};
  let fieldScore = 0;
  for (const [field, synonyms] of Object.entries(def.fields || {})) {
    const syns = synonymSet([field, ...(synonyms || [])]);
    let best = null;
    for (let i = 0; i < headerNorms.length; i++) {
      const h = headerNorms[i];
      if (syns.has(h)) { best = { index: i, header: headers[i], normalized: h, confidence: 1 }; break; }
      for (const syn of syns) {
        if (syn && (h.includes(syn) || syn.includes(h))) { best = { index: i, header: headers[i], normalized: h, confidence: 0.72 }; break; }
      }
      if (best) break;
    }
    if (best) {
      fieldMatches[field] = best;
      fieldScore += best.confidence >= 1 ? 3 : 1.5;
    }
  }
  return { collection, score: signalScore + fieldScore, signalScore, fieldScore, fieldMatches };
}
function chooseCollection(headers, synonyms){
  const scored = Object.entries(synonyms.collections || {}).map(([collection, def]) => scoreFile(headers, collection, def));
  scored.sort((a,b) => b.score - a.score);
  const best = scored[0] || null;
  const second = scored[1] || null;
  const confidence = !best ? 0 : Math.min(1, (best.score / 30) + ((best.score - (second?.score || 0)) / 25));
  return { best, second, confidence, scored: scored.slice(0, 5) };
}
function applyMapping(file, rows, mapping, schema){
  const collection = mapping.best.collection;
  const def = schema.collections?.[collection] || {};
  const headers = [...(def.required || []), ...(def.optional || [])];
  const seen = new Set();
  const finalHeaders = headers.filter(h => { if (seen.has(h)) return false; seen.add(h); return true; });
  const sourceHeaders = rows[0];
  const dataRows = rows.slice(1);
  const outRows = [finalHeaders];
  for (const row of dataRows) {
    const out = finalHeaders.map(field => {
      const match = mapping.best.fieldMatches[field];
      return match ? (row[match.index] ?? '') : '';
    });
    outRows.push(out);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.basename(file).replace(/\.csv$/i, '');
  const outPath = path.join(outDir, `${collection}__${base}.csv`);
  fs.writeFileSync(outPath, outRows.map(r => r.map(csvEscape).join(',')).join('\n'), 'utf8');
  return outPath;
}

if (!fs.existsSync(synonymPath)) errors.push(`Falta diccionario de sinonimos: ${synonymPath}`);
if (!fs.existsSync(schemaPath)) errors.push(`Falta schema: ${schemaPath}`);
if (apply && confirm !== 'MAPEAR_AYS') errors.push('Confirmación inválida. Usar --confirm MAPEAR_AYS para aplicar normalización local.');

const synonyms = fs.existsSync(synonymPath) ? loadJson(synonymPath) : { collections: {} };
const schema = fs.existsSync(schemaPath) ? loadJson(schemaPath) : { collections: {} };
const files = listCsv(inputDir);
if (!files.length) warnings.push(`No hay CSV para mapear en ${inputDir}`);

for (const file of files) {
  try {
    const rows = parseCsv(fs.readFileSync(file, 'utf8'));
    if (!rows.length) { warnings.push(`${file}: CSV vacío`); continue; }
    const headers = rows[0];
    const choice = chooseCollection(headers, synonyms);
    const result = {
      file: path.relative(root, file).replaceAll(path.sep, '/'),
      headers,
      suggestedCollection: choice.best?.collection || null,
      confidence: Number((choice.confidence || 0).toFixed(3)),
      secondCollection: choice.second?.collection || null,
      fieldMatches: choice.best?.fieldMatches || {},
      topCollections: choice.scored.map(x => ({ collection: x.collection, score: Number(x.score.toFixed(2)) })),
      normalizedCsv: null
    };
    if (apply && choice.best && choice.confidence >= 0.35) {
      result.normalizedCsv = path.relative(root, applyMapping(file, rows, choice, schema)).replaceAll(path.sep, '/');
    }
    results.push(result);
  } catch (e) {
    errors.push(`${file}: ${e.message}`);
  }
}

const report = { version: 'v1.104', createdAt: new Date().toISOString(), inputDir, apply, results, warnings, errors, result: errors.length ? 'FAIL' : 'OK' };
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(jsonReport, JSON.stringify(report, null, 2), 'utf8');
const lines = [
  '============================================================',
  'ORBIT 360 - MAPEO COLUMNAS IMPORTACION A&S v1.104',
  `Fecha: ${report.createdAt}`,
  `Input: ${inputDir}`,
  `Modo: ${apply ? 'APPLY_LOCAL' : 'DRY_RUN'}`,
  'Restricciones: sin red, sin Firebase, sin escritura remota, sin datos reales en repo.',
  '============================================================',
  '',
  `CSV evaluados: ${results.length}`,
  ...results.map(r => `MAPEO: ${r.file} -> ${r.suggestedCollection || '(sin sugerencia)'} | confianza=${r.confidence} | normalizado=${r.normalizedCsv || '(no aplicado)'}`),
  '',
  `Errores: ${errors.length}`,
  ...errors.map(e => `ERROR: ${e}`),
  '',
  `Warnings: ${warnings.length}`,
  ...warnings.map(w => `WARN: ${w}`),
  '',
  `Reporte JSON: ${jsonReport}`,
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
];
fs.writeFileSync(txtReport, lines.join('\n'), 'utf8');
console.log(lines.join('\n'));
process.exit(errors.length ? 1 : 0);
