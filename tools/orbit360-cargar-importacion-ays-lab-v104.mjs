#!/usr/bin/env node
/* Orbit 360 · Cargador importación A&S LAB v1.104
   Lee CSV/JSON locales ya validados y puede escribir en Firestore LAB.

   Modo seguro por defecto: dry-run.
   Para escribir requiere flags explícitos:
   --write --tenant alianzas-soluciones --confirm ESCRIBIR_LAB_AYS

   Requisitos para escritura:
   - variable GOOGLE_APPLICATION_CREDENTIALS apuntando a credencial local autorizada;
   - variable FIREBASE_PROJECT_ID o --project;
   - paquete firebase-admin disponible localmente.

   No incluir credenciales ni datos reales en el repo.
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const args = process.argv.slice(2);
function arg(name, fallback = ''){
  const idx = args.indexOf(name);
  return idx >= 0 ? (args[idx + 1] || fallback) : fallback;
}
function has(name){ return args.includes(name); }

const tenant = arg('--tenant', 'alianzas-soluciones');
const inputDir = path.resolve(arg('--input', path.join(root, '_orbit360_imports', 'ays_real')));
const projectId = arg('--project', process.env.FIREBASE_PROJECT_ID || '');
const confirm = arg('--confirm', '');
const write = has('--write');
const dryRun = !write;
const schemaPath = path.join(root, 'tools', 'orbit360-schema-importacion-ays-v104.json');
const reportDir = path.join(root, '_orbit360_reports');
const exportDir = path.join(root, '_orbit360_exports');
const batchId = `ays_v104_${new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)}`;
const reportPath = path.join(reportDir, `CARGA-IMPORTACION-AYS-LAB-V104-${batchId}.txt`);
const payloadPath = path.join(exportDir, `payload-importacion-ays-lab-v104-${batchId}.json`);
const errors = [];
const warnings = [];
const rowsByCollection = {};

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
function norm(h){
  return String(h || '').trim().replace(/^\uFEFF/, '').replace(/\s+/g, '_').replace(/[ÁÀÄÂ]/g,'A').replace(/[ÉÈËÊ]/g,'E').replace(/[ÍÌÏÎ]/g,'I').replace(/[ÓÒÖÔ]/g,'O').replace(/[ÚÙÜÛ]/g,'U').replace(/[áàäâ]/g,'a').replace(/[éèëê]/g,'e').replace(/[íìïî]/g,'i').replace(/[óòöô]/g,'o').replace(/[úùüû]/g,'u').replace(/ñ/g,'n').replace(/Ñ/g,'N');
}
function cleanValue(v){
  const s = String(v ?? '').trim();
  if (s === '') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (/^(true|false)$/i.test(s)) return /^true$/i.test(s);
  return s;
}
function collectionFromName(file){
  const base = path.basename(file).toLowerCase().replace(/\.(csv|json)$/,'');
  return base.split(/[._ -]/).find(Boolean) || base;
}
function listFiles(dir){
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...listFiles(p)); else out.push(p);
  }
  return out;
}
function loadRows(file){
  const collection = collectionFromName(file);
  const ext = path.extname(file).toLowerCase();
  const source = path.relative(root, file).replaceAll(path.sep, '/');
  if (ext === '.csv') {
    const parsed = parseCsv(fs.readFileSync(file, 'utf8'));
    if (!parsed.length) return { collection, source, rows: [] };
    const headers = parsed[0].map(norm);
    const rows = parsed.slice(1).map((row, idx) => {
      const out = {};
      headers.forEach((h, i) => { out[h] = cleanValue(row[i]); });
      out.id = out.id || `${collection}_${idx + 1}`;
      out.tenantId = tenant;
      out._migration = { batchId, source, row: idx + 2, version: 'v1.104', importedAt: new Date().toISOString(), dryRun };
      return out;
    });
    return { collection, source, rows };
  }
  if (ext === '.json') {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const rows = (Array.isArray(data) ? data : (Array.isArray(data.rows) ? data.rows : [])).map((r, idx) => ({
      ...r,
      id: r.id || `${collection}_${idx + 1}`,
      tenantId: tenant,
      _migration: { batchId, source, row: idx + 1, version: 'v1.104', importedAt: new Date().toISOString(), dryRun }
    }));
    return { collection, source, rows };
  }
  return { collection, source, rows: [] };
}

if (tenant !== 'alianzas-soluciones') errors.push(`Tenant no autorizado para este cargador LAB: ${tenant}`);
if (!fs.existsSync(schemaPath)) errors.push(`Falta schema: ${schemaPath}`);
if (!fs.existsSync(inputDir)) warnings.push(`No existe inputDir: ${inputDir}`);

const schema = fs.existsSync(schemaPath) ? JSON.parse(fs.readFileSync(schemaPath, 'utf8')) : { collections: {} };
const files = listFiles(inputDir).filter(f => /\.(csv|json)$/i.test(f));
if (!files.length) warnings.push('No hay archivos CSV/JSON para cargar.');

for (const file of files) {
  const { collection, source, rows } = loadRows(file);
  if (!schema.collections[collection]) { warnings.push(`${source}: colección no incluida en schema, omitida.`); continue; }
  rowsByCollection[collection] = rowsByCollection[collection] || [];
  rowsByCollection[collection].push(...rows);
}

if (write) {
  if (confirm !== 'ESCRIBIR_LAB_AYS') errors.push('Confirmación inválida. Usar --confirm ESCRIBIR_LAB_AYS');
  if (!projectId) errors.push('Falta FIREBASE_PROJECT_ID o --project.');
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) errors.push('Falta GOOGLE_APPLICATION_CREDENTIALS local.');
}

async function writeFirestore(){
  let admin;
  try { admin = require('firebase-admin'); }
  catch { throw new Error('No está disponible firebase-admin localmente. Instalarlo solo en entorno autorizado.'); }
  if (!admin.apps.length) admin.initializeApp({ projectId });
  const db = admin.firestore();
  let count = 0;
  for (const [collection, rows] of Object.entries(rowsByCollection)) {
    for (const row of rows) {
      await db.collection('tenantId').doc(tenant).collection(collection).doc(String(row.id)).set(row, { merge: true });
      count++;
    }
  }
  return count;
}

let wrote = 0;
if (!errors.length && write) wrote = await writeFirestore();

const payload = { batchId, tenantId: tenant, dryRun, projectId: projectId || null, collections: rowsByCollection };
try { fs.mkdirSync(exportDir, { recursive: true }); fs.writeFileSync(payloadPath, JSON.stringify(payload, null, 2), 'utf8'); } catch {}

const totalRows = Object.values(rowsByCollection).reduce((sum, rows) => sum + rows.length, 0);
const lines = [
  '============================================================',
  'ORBIT 360 - CARGA IMPORTACION A&S LAB v1.104',
  `Fecha: ${new Date().toISOString()}`,
  `Tenant: ${tenant}`,
  `Input: ${inputDir}`,
  `Modo: ${dryRun ? 'DRY_RUN' : 'WRITE_LAB'}`,
  `Batch: ${batchId}`,
  'Restricciones: no producción, no datos reales en repo, no credenciales en repo.',
  '============================================================',
  '',
  `Archivos evaluados: ${files.length}`,
  `Colecciones: ${Object.keys(rowsByCollection).join(', ') || '(ninguna)'}`,
  `Filas preparadas: ${totalRows}`,
  `Filas escritas: ${wrote}`,
  `Payload local: ${payloadPath}`,
  '',
  `Errores: ${errors.length}`,
  ...errors.map(e => `ERROR: ${e}`),
  '',
  `Warnings: ${warnings.length}`,
  ...warnings.map(w => `WARN: ${w}`),
  '',
  errors.length ? 'RESULTADO: FAIL' : (write ? 'RESULTADO: WRITE_LAB_OK' : 'RESULTADO: DRY_RUN_OK')
];
const output = lines.join('\n');
console.log(output);
try { fs.mkdirSync(reportDir, { recursive: true }); fs.writeFileSync(reportPath, output, 'utf8'); } catch {}
process.exit(errors.length ? 1 : 0);
