#!/usr/bin/env node
/* Orbit 360 · A&S overlay preview diff reporter
   Safe mode: compares _orbit360_overlay_preview/files against repo files.
   It never applies changes, never deploys, never writes Firestore.

   Usage:
     node tools/orbit360-diff-preview-overlay-ays.mjs --preview _orbit360_overlay_preview/preview-...
*/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const args = process.argv.slice(2);
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VERSION = 'v1.0.0-ays-overlay-preview-diff';

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

function sha(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); }
  catch { return ''; }
}

function isText(file) {
  return ['.js', '.css', '.html', '.md', '.json', '.txt', '.csv', '.svg'].includes(path.extname(file).toLowerCase());
}

function lineStats(oldText, newText) {
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);
  let samePrefix = 0;
  while (samePrefix < oldLines.length && samePrefix < newLines.length && oldLines[samePrefix] === newLines[samePrefix]) samePrefix++;
  let sameSuffix = 0;
  while (
    sameSuffix + samePrefix < oldLines.length &&
    sameSuffix + samePrefix < newLines.length &&
    oldLines[oldLines.length - 1 - sameSuffix] === newLines[newLines.length - 1 - sameSuffix]
  ) sameSuffix++;
  return {
    old_lines: oldLines.length,
    new_lines: newLines.length,
    approx_changed_old_lines: Math.max(0, oldLines.length - samePrefix - sameSuffix),
    approx_changed_new_lines: Math.max(0, newLines.length - samePrefix - sameSuffix)
  };
}

function riskFor(rel, exists, oldText, newText) {
  const risks = [];
  if (/^orbit360-platform\/core\//.test(rel)) risks.push('core');
  if (/^orbit360-platform\/modules\//.test(rel)) risks.push('module');
  if (/^orbit360-platform\/styles\//.test(rel)) risks.push('style');
  if (/^orbit360-platform\/docs\//.test(rel)) risks.push('docs');
  if (/index\.html$/.test(rel)) risks.push('index');
  if (/data\//.test(rel)) risks.push('data');
  if (/importa|primas|queries|auth|router|config/i.test(rel)) risks.push('critical-path');
  if (/localStorage\./.test(newText)) risks.push('direct-storage-pattern');
  if (/firestore|firebase|backend|lab|demo|pendiente de backend/i.test(newText)) risks.push('technical-text-or-backend-token');
  if (/return\s+['"]GT['"]|pais\s*[:=]\s*['"]GT['"]|estado\s*[:=]\s*['"]Vigente['"]/i.test(newText)) risks.push('business-default-risk');
  if (!exists) risks.push('new-file');
  return risks;
}

const errors = [];
const previewArg = argValue('--preview');
if (!previewArg) errors.push('Falta --preview <carpeta_preview>.');
const previewRoot = previewArg ? path.resolve(root, previewArg) : null;
const filesRoot = previewRoot ? path.join(previewRoot, 'files') : null;
if (previewRoot && !fs.existsSync(previewRoot)) errors.push(`No existe preview: ${previewArg}`);
if (filesRoot && !fs.existsSync(filesRoot)) errors.push(`Preview sin carpeta files/: ${previewArg}`);

const rows = [];
if (!errors.length) {
  for (const previewFile of walk(filesRoot)) {
    const rel = norm(path.relative(filesRoot, previewFile));
    const repoFile = path.join(root, rel);
    const exists = fs.existsSync(repoFile);
    const text = isText(previewFile);
    const same = exists && sha(previewFile) === sha(repoFile);
    const oldText = exists && text ? readText(repoFile) : '';
    const newText = text ? readText(previewFile) : '';
    const stats = text ? lineStats(oldText, newText) : null;
    const risks = text ? riskFor(rel, exists, oldText, newText) : (exists ? [] : ['new-file']);
    const riskLevel = risks.includes('critical-path') || risks.includes('business-default-risk') || risks.includes('direct-storage-pattern') ? 'ALTO' : (risks.includes('core') || risks.includes('index') || risks.includes('data') ? 'MEDIO' : 'BAJO');

    rows.push({
      path: rel,
      exists_in_repo: exists,
      same_content: same,
      text_file: text,
      risk_level: riskLevel,
      risks,
      old_sha256: exists ? sha(repoFile) : null,
      new_sha256: sha(previewFile),
      size_bytes: fs.statSync(previewFile).size,
      line_stats: stats
    });
  }
}

const counts = rows.reduce((acc, r) => {
  acc[r.risk_level] = (acc[r.risk_level] || 0) + 1;
  acc[r.exists_in_repo ? 'existing' : 'new'] = (acc[r.exists_in_repo ? 'existing' : 'new'] || 0) + 1;
  acc[r.same_content ? 'same' : 'different'] = (acc[r.same_content ? 'same' : 'different'] || 0) + 1;
  return acc;
}, {});

const blockers = rows.filter((r) => r.risks.includes('direct-storage-pattern') || r.risks.includes('business-default-risk')).length;
const decision = errors.length ? 'BLOQUEADO' : (blockers ? 'REQUIERE_REVISION_ALTA' : 'DIFERENCIAS_LISTAS_PARA_REVISION');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(REPORT_DIR, { recursive: true });
const jsonPath = path.join(REPORT_DIR, `DIFF-PREVIEW-OVERLAY-AYS-${stamp}.json`);
const txtPath = path.join(REPORT_DIR, `DIFF-PREVIEW-OVERLAY-AYS-${stamp}.txt`);
const csvPath = path.join(REPORT_DIR, `DIFF-PREVIEW-OVERLAY-AYS-${stamp}.csv`);

const manifest = {
  version: VERSION,
  created_at: new Date().toISOString(),
  preview: previewArg || null,
  decision,
  errors,
  counts,
  blockers,
  rows
};

function csvEscape(v) {
  const s = Array.isArray(v) ? v.join('|') : String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const csv = [
  ['risk_level', 'path', 'exists_in_repo', 'same_content', 'risks', 'old_lines', 'new_lines', 'changed_old', 'changed_new'].join(','),
  ...rows.map((r) => [
    r.risk_level,
    r.path,
    r.exists_in_repo,
    r.same_content,
    r.risks,
    r.line_stats?.old_lines ?? '',
    r.line_stats?.new_lines ?? '',
    r.line_stats?.approx_changed_old_lines ?? '',
    r.line_stats?.approx_changed_new_lines ?? ''
  ].map(csvEscape).join(','))
].join('\n');

const txt = [
  '============================================================',
  'ORBIT 360 - DIFF PREVIEW OVERLAY A&S',
  `Version: ${VERSION}`,
  `Fecha: ${manifest.created_at}`,
  `Preview: ${previewArg || 'S/D'}`,
  `Decision: ${decision}`,
  'Restricciones: no aplica cambios, no deploy, no merge, no carga LAB.',
  '============================================================',
  '',
  `Errores: ${errors.length}`,
  ...errors.map((e) => `ERROR: ${e}`),
  '',
  `Archivos analizados: ${rows.length}`,
  `Blockers lógicos: ${blockers}`,
  '',
  'Conteos:',
  ...Object.entries(counts).sort().map(([k, v]) => `- ${k}: ${v}`),
  '',
  'Riesgo ALTO/MEDIO:',
  ...rows.filter((r) => ['ALTO', 'MEDIO'].includes(r.risk_level)).slice(0, 100).map((r) => `- ${r.risk_level} :: ${r.path} :: ${r.risks.join('|')}`),
  '',
  `JSON: ${relToRoot(jsonPath)}`,
  `CSV: ${relToRoot(csvPath)}`,
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK_CON_REVISION'
].join('\n');

fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf8');
fs.writeFileSync(txtPath, txt, 'utf8');
fs.writeFileSync(csvPath, csv, 'utf8');
console.log(txt);
console.log(`\nReporte TXT: ${relToRoot(txtPath)}`);
process.exit(errors.length ? 1 : 0);
