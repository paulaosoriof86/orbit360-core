#!/usr/bin/env node
/**
 * Orbit 360 A&S — auditor estático de candidata Claude v1330.
 * Uso futuro local:
 *   node tools/orbit360-auditar-candidata-claude-v1330.mjs <ruta_candidata_extraida>
 *
 * No usa red. No escribe Firestore. No modifica archivos de la candidata.
 */
import fs from 'node:fs';
import path from 'node:path';

const rootArg = process.argv[2];
const candidateRoot = rootArg ? path.resolve(rootArg) : '';

const protectedPaths = [
  'orbit360-platform/data/store.js',
  'orbit360-platform/data/store-firestore-lab.local.js',
  'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/backend-lab-security-guard.js',
  'orbit360-platform/core/auth.js',
  'orbit360-platform/core/importa.js',
  'firestore.rules',
  'orbit360-platform/index.html'
];

const protectedToolPrefix = /^tools\/orbit360-/;
const textExt = /\.(js|mjs|cjs|html|css|md|json|txt|csv|yml|yaml)$/i;
const jsExt = /\.(js|mjs|cjs)$/i;

const forbiddenClientCopy = [
  /\bFirebase\b/i,
  /\bFirestore\b/i,
  /\bbackend\b/i,
  /\bLAB\b/,
  /\bmock\b/i,
  /\bdemo\b/i,
  /\bsmoke\b/i,
  /localStorage/i,
  /credenciales/i,
  /API\s*key/i
];

const secretPatterns = [
  /AIza[0-9A-Za-z\-_]{20,}/,
  /-----BEGIN (RSA |EC |OPENSSH |PRIVATE )?KEY-----/,
  /serviceAccount/i,
  /client_secret/i,
  /refresh_token/i,
  /access_token/i,
  /password\s*[:=]/i,
  /token\s*[:=]/i,
  /secret\s*[:=]/i
];

const payloadPatterns = [
  /data:application\/pdf;base64,/i,
  /data:image\/[a-z]+;base64,/i,
  /readAsDataURL/i,
  /fileBytes/i,
  /downloadUrl/i,
  /publicUrl/i,
  /base64/i
];

function norm(p) { return p.split(path.sep).join('/'); }
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === '_backups') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
function readSafe(file) {
  try { return fs.readFileSync(file, 'utf8'); }
  catch { return ''; }
}
function lineMatches(txt, patterns) {
  const rows = txt.split(/\r?\n/);
  const hits = [];
  rows.forEach((line, idx) => {
    patterns.forEach((rx) => { if (rx.test(line)) hits.push({ line: idx + 1, pattern: String(rx), sample: line.slice(0, 180) }); });
  });
  return hits;
}

if (!candidateRoot || !fs.existsSync(candidateRoot) || !fs.statSync(candidateRoot).isDirectory()) {
  console.log(JSON.stringify({ ok: false, status: 'bloqueado', errors: ['Uso: node tools/orbit360-auditar-candidata-claude-v1330.mjs <ruta_candidata_extraida>'], warnings: [] }, null, 2));
  process.exit(1);
}

const files = walk(candidateRoot);
const rels = files.map(f => norm(path.relative(candidateRoot, f)));
const errors = [];
const warnings = [];
const info = [];

for (const rel of rels) {
  if (protectedPaths.includes(rel)) errors.push(`Candidata contiene archivo protegido: ${rel}`);
  if (protectedToolPrefix.test(rel)) errors.push(`Candidata contiene tool protegido: ${rel}`);
}

const textFiles = files.filter(f => textExt.test(f));
let jsCount = 0;
for (const file of textFiles) {
  const rel = norm(path.relative(candidateRoot, file));
  const txt = readSafe(file);
  if (jsExt.test(file)) jsCount++;

  const secrets = lineMatches(txt, secretPatterns);
  if (secrets.length) errors.push(`Posibles secretos en ${rel}: ${secrets.slice(0, 3).map(h => `L${h.line}`).join(', ')}`);

  const payloads = lineMatches(txt, payloadPatterns);
  if (payloads.length) warnings.push(`Posible payload/base64/URL archivo en ${rel}: ${payloads.slice(0, 3).map(h => `L${h.line}`).join(', ')}`);

  const copyHits = lineMatches(txt, forbiddenClientCopy);
  if (copyHits.length && /orbit360-platform\/(modules|core|index\.html|styles)/.test(rel)) {
    warnings.push(`Copy técnico potencial visible en ${rel}: ${copyHits.slice(0, 3).map(h => `L${h.line}`).join(', ')}`);
  }

  if (/localStorage/i.test(txt) && /orbit360-platform\/modules\//.test(rel)) {
    errors.push(`localStorage operativo o potencial en módulo: ${rel}`);
  }

  if (/Pago aplicado|Cobro confirmado|Póliza pagada/i.test(txt) && /portal|cobros|cliente360/i.test(rel)) {
    warnings.push(`Revisar copy de pago aplicado/confirmado en ${rel}; validar que no sea solo soporte reportado.`);
  }

  if (/CXOrbia|TyAOnline|mystery|shopper|Cinépolis|Cinepolis/i.test(txt)) {
    errors.push(`Posible contaminación de otro proyecto en ${rel}`);
  }
}

const modulesExpected = ['portal.js', 'cobros.js', 'cliente360.js', 'finanzas.js', 'equipo.js', 'configuracion.js', 'academia.js'];
for (const mod of modulesExpected) {
  const exists = rels.some(r => r.endsWith(`/modules/${mod}`) || r === `orbit360-platform/modules/${mod}`);
  if (!exists) warnings.push(`No se encontró módulo esperado en candidata: ${mod}`);
}

const hasAcademiaDoc = rels.some(r => /academia/i.test(r));
if (!hasAcademiaDoc) warnings.push('No se detectaron archivos/rutas de Academia en candidata; verificar manualmente.');

const hasClaudeChecklist = rels.some(r => /checklist|changelog|cambio|pendiente|auditoria/i.test(r));
if (!hasClaudeChecklist) warnings.push('No se detectó checklist/changelog/auditoría de Claude; exigir documentación de entrega.');

info.push(`Archivos totales: ${files.length}`);
info.push(`Archivos texto revisados: ${textFiles.length}`);
info.push(`Archivos JS/MJS/CJS: ${jsCount}`);

const status = errors.length ? 'bloqueado' : warnings.length ? 'requiere_revision_manual' : 'apto_preliminar';
const result = { ok: errors.length === 0, status, errors, warnings, info, protectedPaths };
console.log(JSON.stringify(result, null, 2));
process.exit(errors.length ? 1 : 0);
