#!/usr/bin/env node
/* Orbit 360 · Rollback importación A&S LAB v1.104
   Reversa documentos cargados por batchId en Firestore LAB.

   Seguro por defecto: dry-run.
   Para borrar requiere:
   --write --tenant alianzas-soluciones --batch <BATCH_ID> --confirm ROLLBACK_LAB_AYS

   No producción. No datos reales en repo. No credenciales en repo.
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const args = process.argv.slice(2);
function arg(name, fallback = ''){ const i = args.indexOf(name); return i >= 0 ? (args[i + 1] || fallback) : fallback; }
function has(name){ return args.includes(name); }

const tenant = arg('--tenant', 'alianzas-soluciones');
const batchId = arg('--batch', '');
const confirm = arg('--confirm', '');
const projectId = arg('--project', process.env.FIREBASE_PROJECT_ID || '');
const payloadFile = arg('--payload', '');
const write = has('--write');
const dryRun = !write;
const schemaPath = path.join(root, 'tools', 'orbit360-schema-importacion-ays-v104.json');
const reportDir = path.join(root, '_orbit360_reports');
const reportPath = path.join(reportDir, `ROLLBACK-IMPORTACION-AYS-LAB-V104-${batchId || 'SIN_BATCH'}-${new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)}.txt`);
const errors = [];
const warnings = [];
let candidates = [];

if (tenant !== 'alianzas-soluciones') errors.push(`Tenant no autorizado para rollback LAB: ${tenant}`);
if (!batchId && !payloadFile) errors.push('Debe indicar --batch <BATCH_ID> o --payload <archivo_payload.json>');
if (!fs.existsSync(schemaPath)) errors.push(`Falta schema: ${schemaPath}`);
if (write) {
  if (confirm !== 'ROLLBACK_LAB_AYS') errors.push('Confirmación inválida. Usar --confirm ROLLBACK_LAB_AYS');
  if (!batchId) errors.push('Para escritura rollback debe indicar --batch.');
  if (!projectId) errors.push('Falta FIREBASE_PROJECT_ID o --project.');
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) errors.push('Falta GOOGLE_APPLICATION_CREDENTIALS local.');
}

function fromPayload(file){
  const full = path.resolve(file);
  if (!fs.existsSync(full)) { errors.push(`No existe payload: ${full}`); return []; }
  const data = JSON.parse(fs.readFileSync(full, 'utf8'));
  const out = [];
  for (const [collection, rows] of Object.entries(data.collections || {})) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) out.push({ collection, id: String(row.id || ''), batchId: data.batchId || batchId || '', source: path.relative(root, full).replaceAll(path.sep, '/') });
  }
  return out.filter(x => x.id);
}

async function fromFirestore(){
  let admin;
  try { admin = require('firebase-admin'); }
  catch { throw new Error('No está disponible firebase-admin localmente. Instalarlo solo en entorno autorizado.'); }
  if (!admin.apps.length) admin.initializeApp({ projectId });
  const db = admin.firestore();
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const out = [];
  for (const collection of Object.keys(schema.collections || {})) {
    const ref = db.collection('tenantId').doc(tenant).collection(collection);
    const snap = await ref.where('_migration.batchId', '==', batchId).get();
    snap.forEach(doc => out.push({ collection, id: doc.id, ref: doc.ref.path, batchId }));
  }
  return { admin, db, out };
}

if (!errors.length && payloadFile && !write) {
  candidates = fromPayload(payloadFile);
}

let deleted = 0;
if (!errors.length && write) {
  const result = await fromFirestore();
  candidates = result.out;
  for (const item of candidates) {
    await result.db.collection('tenantId').doc(tenant).collection(item.collection).doc(item.id).delete();
    deleted++;
  }
}

const grouped = candidates.reduce((acc, item) => { acc[item.collection] = (acc[item.collection] || 0) + 1; return acc; }, {});
const lines = [
  '============================================================',
  'ORBIT 360 - ROLLBACK IMPORTACION A&S LAB v1.104',
  `Fecha: ${new Date().toISOString()}`,
  `Tenant: ${tenant}`,
  `Batch: ${batchId || '(desde payload)'}`,
  `Modo: ${dryRun ? 'DRY_RUN' : 'WRITE_ROLLBACK_LAB'}`,
  'Restricciones: no producción, no datos reales en repo, no credenciales en repo.',
  '============================================================',
  '',
  `Candidatos rollback: ${candidates.length}`,
  `Eliminados: ${deleted}`,
  `Por coleccion: ${JSON.stringify(grouped)}`,
  '',
  `Errores: ${errors.length}`,
  ...errors.map(e => `ERROR: ${e}`),
  '',
  `Warnings: ${warnings.length}`,
  ...warnings.map(w => `WARN: ${w}`),
  '',
  errors.length ? 'RESULTADO: FAIL' : (write ? 'RESULTADO: ROLLBACK_LAB_OK' : 'RESULTADO: DRY_RUN_OK')
];
const output = lines.join('\n');
console.log(output);
try { fs.mkdirSync(reportDir, { recursive: true }); fs.writeFileSync(reportPath, output, 'utf8'); } catch {}
process.exit(errors.length ? 1 : 0);
