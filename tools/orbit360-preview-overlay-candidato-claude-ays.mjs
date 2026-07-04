#!/usr/bin/env node
/* Orbit 360 · A&S Claude candidate overlay preview builder
   Safe mode: reads a plan JSON + candidate folder and creates a preview folder only.
   It never writes into orbit360-platform, never deploys, never merges, never writes Firestore.

   Usage:
     node tools/orbit360-preview-overlay-candidato-claude-ays.mjs --plan _orbit360_reports/PLAN-EMPALME...json --candidate C:\path\to\orbit360-platform

   Optional:
     --include-docs       include CANDIDATO_DOC_REVISAR in preview
     --include-assets     include CANDIDATO_ASSET_REVISAR in preview
     --include-manual     include REVISION_MANUAL in preview/manual-review only
*/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const args = process.argv.slice(2);
const includeDocs = args.includes('--include-docs');
const includeAssets = args.includes('--include-assets');
const includeManual = args.includes('--include-manual');
const REPORT_DIR = path.join(root, '_orbit360_reports');
const PREVIEW_ROOT = path.join(root, '_orbit360_overlay_preview');
const VERSION = 'v1.0.0-ays-overlay-preview';

const DEFAULT_INCLUDE = new Set([
  'CANDIDATO_NUEVO',
  'CANDIDATO_REEMPLAZABLE_PREVIA_REVISION'
]);

const NEVER_INCLUDE = new Set([
  'PRESERVAR_BACKEND',
  'BLOQUEAR'
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

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function findPlatformRoot(candidateArg) {
  const abs = path.resolve(root, candidateArg || '');
  if (!fs.existsSync(abs)) return null;
  if (fs.existsSync(path.join(abs, 'index.html')) && fs.existsSync(path.join(abs, 'modules'))) return abs;
  const nested = path.join(abs, 'orbit360-platform');
  if (fs.existsSync(path.join(nested, 'index.html')) && fs.existsSync(path.join(nested, 'modules'))) return nested;
  return null;
}

function candidateAbs(platformRoot, orbitPath) {
  const rel = norm(orbitPath).replace(/^orbit360-platform\//, '');
  return path.join(platformRoot, rel);
}

function sha(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function shouldInclude(row) {
  if (!row || NEVER_INCLUDE.has(row.action)) return false;
  if (DEFAULT_INCLUDE.has(row.action)) return true;
  if (includeDocs && row.action === 'CANDIDATO_DOC_REVISAR') return true;
  if (includeAssets && row.action === 'CANDIDATO_ASSET_REVISAR') return true;
  if (includeManual && row.action === 'REVISION_MANUAL') return true;
  return false;
}

function ensureParent(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function copyFile(src, dest) {
  ensureParent(dest);
  fs.copyFileSync(src, dest);
}

const errors = [];
const warnings = [];
const copied = [];
const skipped = [];

const planArg = argValue('--plan');
const candidateArg = argValue('--candidate');
if (!planArg) errors.push('Falta --plan <plan.json>.');
if (!candidateArg) errors.push('Falta --candidate <ruta>.');

const planPath = planArg ? path.resolve(root, planArg) : null;
if (planPath && !fs.existsSync(planPath)) errors.push(`No existe plan: ${planArg}`);
const platformRoot = candidateArg ? findPlatformRoot(candidateArg) : null;
if (candidateArg && !platformRoot) errors.push(`No se pudo ubicar orbit360-platform en candidato: ${candidateArg}`);

let plan = null;
if (!errors.length) {
  try { plan = readJson(planPath); }
  catch (err) { errors.push(`Plan JSON inválido: ${err.message}`); }
}

if (plan && plan.decision === 'BLOQUEADO') warnings.push('El plan original está BLOQUEADO; preview solo será útil para diagnóstico, no para empalme.');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const previewDir = path.join(PREVIEW_ROOT, `preview-${stamp}`);
const filesDir = path.join(previewDir, 'files');
const manualDir = path.join(previewDir, 'manual-review');

if (!errors.length && plan && platformRoot) {
  fs.mkdirSync(filesDir, { recursive: true });
  fs.mkdirSync(manualDir, { recursive: true });

  for (const row of Array.isArray(plan.rows) ? plan.rows : []) {
    const action = row.action;
    const orbitPath = norm(row.path);
    const src = candidateAbs(platformRoot, orbitPath);
    if (!fs.existsSync(src)) {
      skipped.push({ path: orbitPath, action, reason: 'source_missing' });
      continue;
    }

    if (!shouldInclude(row)) {
      skipped.push({ path: orbitPath, action, reason: 'action_not_included' });
      continue;
    }

    const targetBase = action === 'REVISION_MANUAL' ? manualDir : filesDir;
    const dest = path.join(targetBase, orbitPath);
    copyFile(src, dest);
    copied.push({
      path: orbitPath,
      action,
      preview_path: relToRoot(dest),
      sha256: sha(dest),
      size_bytes: fs.statSync(dest).size
    });
  }
}

const counts = copied.reduce((acc, item) => {
  acc[item.action] = (acc[item.action] || 0) + 1;
  return acc;
}, {});

const manifest = {
  version: VERSION,
  created_at: new Date().toISOString(),
  plan: planArg || null,
  candidate: candidateArg || null,
  preview_dir: errors.length ? null : relToRoot(previewDir),
  options: { includeDocs, includeAssets, includeManual },
  errors,
  warnings,
  copied_count: copied.length,
  skipped_count: skipped.length,
  counts,
  copied,
  skipped_summary: skipped.reduce((acc, item) => {
    const key = `${item.action}:${item.reason}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})
};

fs.mkdirSync(REPORT_DIR, { recursive: true });
const reportTxt = path.join(REPORT_DIR, `PREVIEW-OVERLAY-CANDIDATO-CLAUDE-AYS-${stamp}.txt`);
const reportJson = path.join(REPORT_DIR, `PREVIEW-OVERLAY-CANDIDATO-CLAUDE-AYS-${stamp}.json`);

const txt = [
  '============================================================',
  'ORBIT 360 - PREVIEW OVERLAY CANDIDATO CLAUDE A&S',
  `Version: ${VERSION}`,
  `Fecha: ${manifest.created_at}`,
  `Plan: ${planArg || 'S/D'}`,
  `Candidato: ${candidateArg || 'S/D'}`,
  `Preview: ${manifest.preview_dir || 'S/D'}`,
  'Restricciones: no escribe en orbit360-platform, no deploy, no merge, no carga LAB.',
  '============================================================',
  '',
  `Errores: ${errors.length}`,
  ...errors.map((e) => `ERROR: ${e}`),
  '',
  `Advertencias: ${warnings.length}`,
  ...warnings.map((w) => `WARN: ${w}`),
  '',
  `Copiados a preview: ${copied.length}`,
  ...Object.entries(counts).sort().map(([k, v]) => `- ${k}: ${v}`),
  '',
  'Primeros archivos en preview:',
  ...copied.slice(0, 80).map((c) => `- ${c.action} :: ${c.path}`),
  '',
  `Omitidos: ${skipped.length}`,
  ...Object.entries(manifest.skipped_summary).sort().map(([k, v]) => `- ${k}: ${v}`),
  '',
  `Manifest: ${relToRoot(reportJson)}`,
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK_PREVIEW'
].join('\n');

fs.writeFileSync(reportTxt, txt, 'utf8');
fs.writeFileSync(reportJson, JSON.stringify(manifest, null, 2), 'utf8');
console.log(txt);
console.log(`\nReporte TXT: ${relToRoot(reportTxt)}`);
process.exit(errors.length ? 1 : 0);
