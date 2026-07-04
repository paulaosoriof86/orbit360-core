#!/usr/bin/env node
/* Orbit 360 · A&S Claude candidate overlay planner
   Safe mode: reads a decompressed candidate folder and produces a plan only.
   It never copies, deletes, deploys, writes Firestore, or edits backend files.

   Usage:
     node tools/orbit360-plan-empalme-candidato-claude-ays.mjs --candidate C:\path\to\orbit360-platform
*/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const args = process.argv.slice(2);
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VERSION = 'v1.0.0-ays-overlay-plan';

const PROTECTED = new Set([
  'orbit360-platform/data/store.js',
  'orbit360-platform/data/store-firestore-lab.local.js',
  'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/backend-lab-security-guard.js',
  'firestore.rules',
  'tools/orbit360-smoke-ays-lab-v99.ps1',
  'tools/orbit360-integrar-backend-lab-index.ps1',
  'tools/orbit360-run-flujo-ays-lab-v99.ps1',
  'tools/orbit360-validar-backend-lab-contrato.mjs'
]);

const CANDIDATE_ALLOWED_PREFIXES = [
  'orbit360-platform/modules/',
  'orbit360-platform/core/',
  'orbit360-platform/styles/',
  'orbit360-platform/docs/',
  'orbit360-platform/assets/'
];

const CANDIDATE_ALLOWED_EXACT = new Set([
  'orbit360-platform/index.html',
  'orbit360-platform/data/seed.js',
  'orbit360-platform/README.md',
  'orbit360-platform/CHANGELOG.md'
]);

const ALWAYS_MANUAL = new Set([
  'orbit360-platform/index.html',
  'orbit360-platform/data/seed.js',
  'orbit360-platform/core/config.js',
  'orbit360-platform/core/importa.js',
  'orbit360-platform/core/primas.js',
  'orbit360-platform/core/queries.js',
  'orbit360-platform/core/auth.js',
  'orbit360-platform/core/router.js'
]);

function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}

function norm(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

function relToRoot(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

function findPlatformRoot(candidateArg) {
  const abs = path.resolve(root, candidateArg || '');
  if (!fs.existsSync(abs)) return null;
  if (fs.existsSync(path.join(abs, 'index.html')) && fs.existsSync(path.join(abs, 'modules'))) return abs;
  const nested = path.join(abs, 'orbit360-platform');
  if (fs.existsSync(path.join(nested, 'index.html')) && fs.existsSync(path.join(nested, 'modules'))) return nested;
  return null;
}

function candidateRel(platformRoot, file) {
  return norm(`orbit360-platform/${path.relative(platformRoot, file)}`);
}

function sha(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function allowedByScope(rel) {
  if (CANDIDATE_ALLOWED_EXACT.has(rel)) return true;
  return CANDIDATE_ALLOWED_PREFIXES.some((p) => rel.startsWith(p));
}

function classify(rel, abs) {
  const repoPath = path.join(root, rel);
  const existsInRepo = fs.existsSync(repoPath);
  const ext = path.extname(rel).toLowerCase();
  const binary = !['.js', '.css', '.html', '.md', '.json', '.txt', '.csv', '.svg'].includes(ext);

  if (PROTECTED.has(rel)) return { action: 'PRESERVAR_BACKEND', reason: 'archivo protegido de backend o operación LAB' };
  if (!allowedByScope(rel)) return { action: 'BLOQUEAR', reason: 'fuera del alcance permitido para candidato frontend' };
  if (/secret|credential|serviceAccount|\.env|firebase|firestore/i.test(rel) && !rel.includes('docs/')) return { action: 'BLOQUEAR', reason: 'nombre de archivo sensible o infraestructura no autorizada' };
  if (ALWAYS_MANUAL.has(rel)) return { action: 'REVISION_MANUAL', reason: 'archivo crítico: requiere empalme aditivo y revisión humana' };
  if (binary) return { action: 'REVISION_MANUAL', reason: 'archivo binario o no textual' };
  if (!existsInRepo) return { action: 'CANDIDATO_NUEVO', reason: 'archivo nuevo del candidato dentro de alcance permitido' };

  const oldHash = sha(repoPath);
  const newHash = sha(abs);
  if (oldHash === newHash) return { action: 'SIN_CAMBIO', reason: 'mismo contenido' };

  if (rel.startsWith('orbit360-platform/modules/')) return { action: 'CANDIDATO_REEMPLAZABLE_PREVIA_REVISION', reason: 'módulo frontend modificable tras revisión' };
  if (rel.startsWith('orbit360-platform/styles/')) return { action: 'CANDIDATO_REEMPLAZABLE_PREVIA_REVISION', reason: 'estilo frontend modificable tras revisión visual' };
  if (rel.startsWith('orbit360-platform/docs/')) return { action: 'CANDIDATO_DOC_REVISAR', reason: 'documentación del candidato; revisar conflictos' };
  if (rel.startsWith('orbit360-platform/assets/')) return { action: 'CANDIDATO_ASSET_REVISAR', reason: 'asset; revisar peso, licencia y uso' };
  if (rel.startsWith('orbit360-platform/core/')) return { action: 'REVISION_MANUAL', reason: 'core puede afectar flujos; requiere diff puntual' };

  return { action: 'REVISION_MANUAL', reason: 'clasificación conservadora' };
}

const errors = [];
const candidateArg = argValue('--candidate');
if (!candidateArg) errors.push('Falta --candidate <ruta>.');
const platformRoot = candidateArg ? findPlatformRoot(candidateArg) : null;
if (!platformRoot) errors.push(`No se encontró carpeta orbit360-platform válida en: ${candidateArg || 'S/D'}`);

const rows = [];
if (platformRoot) {
  for (const abs of walk(platformRoot)) {
    const rel = candidateRel(platformRoot, abs);
    const c = classify(rel, abs);
    rows.push({
      path: rel,
      action: c.action,
      reason: c.reason,
      size_bytes: fs.statSync(abs).size,
      candidate_sha256: sha(abs),
      exists_in_repo: fs.existsSync(path.join(root, rel))
    });
  }
}

const counts = rows.reduce((acc, r) => {
  acc[r.action] = (acc[r.action] || 0) + 1;
  return acc;
}, {});

const blocked = rows.filter((r) => r.action === 'BLOQUEAR').length;
const preserve = rows.filter((r) => r.action === 'PRESERVAR_BACKEND').length;
const manual = rows.filter((r) => r.action === 'REVISION_MANUAL').length;
const decision = errors.length || blocked ? 'BLOQUEADO' : (manual || preserve ? 'PLAN_CON_REVISION' : 'PLAN_LISTO');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(REPORT_DIR, { recursive: true });
const jsonPath = path.join(REPORT_DIR, `PLAN-EMPALME-CANDIDATO-CLAUDE-AYS-${stamp}.json`);
const txtPath = path.join(REPORT_DIR, `PLAN-EMPALME-CANDIDATO-CLAUDE-AYS-${stamp}.txt`);
const csvPath = path.join(REPORT_DIR, `PLAN-EMPALME-CANDIDATO-CLAUDE-AYS-${stamp}.csv`);

const json = {
  version: VERSION,
  created_at: new Date().toISOString(),
  candidate: candidateArg || null,
  platform_root: platformRoot || null,
  decision,
  counts,
  errors,
  rows
};

const txt = [
  '============================================================',
  'ORBIT 360 - PLAN EMPALME CANDIDATO CLAUDE A&S',
  `Version: ${VERSION}`,
  `Fecha: ${json.created_at}`,
  `Repo: ${root}`,
  `Candidato: ${candidateArg || 'S/D'}`,
  `Decision: ${decision}`,
  'Restricciones: no copia, no borra, no deploy, no merge, no carga LAB.',
  '============================================================',
  '',
  `Errores: ${errors.length}`,
  ...errors.map((e) => `ERROR: ${e}`),
  '',
  'Conteos por acción:',
  ...Object.entries(counts).sort().map(([k, v]) => `- ${k}: ${v}`),
  '',
  'Top archivos que requieren revisión:',
  ...rows.filter((r) => ['BLOQUEAR', 'PRESERVAR_BACKEND', 'REVISION_MANUAL'].includes(r.action)).slice(0, 80).map((r) => `- ${r.action} :: ${r.path} :: ${r.reason}`),
  '',
  `JSON: ${relToRoot(jsonPath)}`,
  `CSV: ${relToRoot(csvPath)}`,
  decision === 'BLOQUEADO' ? 'RESULTADO: FAIL' : 'RESULTADO: OK_CON_REVISION'
].join('\n');

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csv = [
  ['action', 'path', 'reason', 'exists_in_repo', 'size_bytes', 'candidate_sha256'].join(','),
  ...rows.map((r) => [r.action, r.path, r.reason, r.exists_in_repo, r.size_bytes, r.candidate_sha256].map(csvEscape).join(','))
].join('\n');

fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), 'utf8');
fs.writeFileSync(txtPath, txt, 'utf8');
fs.writeFileSync(csvPath, csv, 'utf8');
console.log(txt);
console.log(`\nReporte TXT: ${relToRoot(txtPath)}`);
process.exit(errors.length || blocked ? 1 : 0);
