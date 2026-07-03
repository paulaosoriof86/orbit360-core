#!/usr/bin/env node
/* Orbit 360 · Validador importación A&S v1.104
   Valida archivos locales antes de cargarlos al LAB.
   Sin red, sin Firebase, sin escritura remota, sin datos reales en repo. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const schemaPath = path.join(root, 'tools', 'orbit360-schema-importacion-ays-v104.json');
const inputDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, '_orbit360_imports', 'ays_real');
const reportDir = path.join(root, '_orbit360_reports');
const reportPath = path.join(reportDir, 'VALIDACION-IMPORTACION-AYS-V104.txt');
const errors = [];
const warnings = [];
const summary = [];

function readJson(file){ return JSON.parse(fs.readFileSync(file, 'utf8')); }
function listFiles(dir){
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}
function parseCsv(text){
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i+1];
    if (q && c === '"' && n === '"') { cell += '"'; i++; continue; }
    if (c === '"') { q = !q; continue; }
    if (!q && c === ',') { row.push(cell); cell = ''; continue; }
    if (!q && (c === '\n' || c === '\r')) {
      if (c === '\r' && n === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(v => String(v || '').trim() !== '')) rows.push(row);
      row = [];
      continue;
    }
    cell += c;
  }
  row.push(cell);
  if (row.some(v => String(v || '').trim() !== '')) rows.push(row);
  return rows;
}
function normalizeHeader(h){
  return String(h || '').trim().replace(/^\uFEFF/, '').replace(/\s+/g, '_').replace(/[ÁÀÄÂ]/g,'A').replace(/[ÉÈËÊ]/g,'E').replace(/[ÍÌÏÎ]/g,'I').replace(/[ÓÒÖÔ]/g,'O').replace(/[ÚÙÜÛ]/g,'U').replace(/[áàäâ]/g,'a').replace(/[éèëê]/g,'e').replace(/[íìïî]/g,'i').replace(/[óòöô]/g,'o').replace(/[úùüû]/g,'u').replace(/ñ/g,'n').replace(/Ñ/g,'N');
}
function collectionFromName(file){
  const base = path.basename(file).toLowerCase().replace(/\.(csv|json)$/,'');
  const first = base.split(/[._ -]/).find(Boolean) || base;
  return first;
}
function hasSensitiveName(name){ return /(api.?key|token|secret|webhook|password|pwd|bearer|client.?secret|private.?key)/i.test(name); }
function validateHeaders(collection, headers, schema){
  const def = schema.collections[collection];
  if (!def) { warnings.push(`${collection}: coleccion no esta en schema; archivo se omite de validacion estricta.`); return; }
  const normalized = headers.map(normalizeHeader);
  for (const req of def.required) {
    if (!normalized.includes(req)) errors.push(`${collection}: falta columna requerida '${req}'`);
  }
  for (const h of normalized) {
    if (hasSensitiveName(h)) errors.push(`${collection}: columna sensible no permitida '${h}'`);
  }
}
function validateRows(collection, headers, rows, schema){
  const def = schema.collections[collection];
  if (!def) return;
  const normalized = headers.map(normalizeHeader);
  const idIdx = normalized.indexOf('id');
  const paisIdx = normalized.indexOf('pais');
  const monedaIdx = normalized.indexOf('moneda');
  const seen = new Set();
  rows.forEach((row, i) => {
    const line = i + 2;
    if (idIdx >= 0) {
      const id = String(row[idIdx] || '').trim();
      if (!id) errors.push(`${collection}: fila ${line} sin id`);
      if (id && seen.has(id)) warnings.push(`${collection}: id duplicado '${id}' en fila ${line}`);
      if (id) seen.add(id);
    }
    if (paisIdx >= 0) {
      const pais = String(row[paisIdx] || '').trim().toUpperCase();
      if (pais && !['GT','GUATEMALA','CO','COLOMBIA'].includes(pais)) warnings.push(`${collection}: pais no reconocido '${pais}' en fila ${line}`);
    }
    if (monedaIdx >= 0) {
      const moneda = String(row[monedaIdx] || '').trim().toUpperCase();
      if (moneda && !['GTQ','COP','USD'].includes(moneda)) warnings.push(`${collection}: moneda no reconocida '${moneda}' en fila ${line}`);
    }
  });
}

if (!fs.existsSync(schemaPath)) errors.push(`Falta schema: ${schemaPath}`);
const schema = fs.existsSync(schemaPath) ? readJson(schemaPath) : { collections: {} };
const files = listFiles(inputDir).filter(f => /\.(csv|json)$/i.test(f));

if (!fs.existsSync(inputDir)) {
  warnings.push(`No existe carpeta local de importacion: ${inputDir}`);
} else if (files.length === 0) {
  warnings.push(`No hay CSV/JSON para validar en: ${inputDir}`);
}

for (const file of files) {
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  const collection = collectionFromName(file);
  const ext = path.extname(file).toLowerCase();
  try {
    if (ext === '.csv') {
      const rows = parseCsv(fs.readFileSync(file, 'utf8'));
      if (!rows.length) { warnings.push(`${rel}: CSV vacio`); continue; }
      const headers = rows[0];
      validateHeaders(collection, headers, schema);
      validateRows(collection, headers, rows.slice(1), schema);
      summary.push(`${rel}: coleccion=${collection}; filas=${Math.max(0, rows.length - 1)}; columnas=${headers.length}`);
    } else if (ext === '.json') {
      const data = readJson(file);
      const rows = Array.isArray(data) ? data : (Array.isArray(data.rows) ? data.rows : []);
      const headers = rows[0] ? Object.keys(rows[0]) : [];
      validateHeaders(collection, headers, schema);
      summary.push(`${rel}: coleccion=${collection}; filas=${rows.length}; formato=json`);
    }
  } catch (e) {
    errors.push(`${rel}: no se pudo leer/validar: ${e.message}`);
  }
}

const output = [
  '============================================================',
  'ORBIT 360 - VALIDACION IMPORTACION A&S v1.104',
  `Fecha: ${new Date().toISOString()}`,
  `Input: ${inputDir}`,
  'Restricciones: sin red, sin Firebase, sin escritura remota, sin datos reales en repo.',
  '============================================================',
  '',
  `Archivos evaluados: ${files.length}`,
  ...summary.map(x => `INFO: ${x}`),
  '',
  `Errores: ${errors.length}`,
  ...errors.map(e => `ERROR: ${e}`),
  '',
  `Warnings: ${warnings.length}`,
  ...warnings.map(w => `WARN: ${w}`),
  '',
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');

console.log(output);
try {
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, output, 'utf8');
} catch {}
process.exit(errors.length ? 1 : 0);
