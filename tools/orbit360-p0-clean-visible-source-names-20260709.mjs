#!/usr/bin/env node
/*
  Orbit 360 A&S — P0 cleanup helper
  Fecha: 2026-07-09

  Objetivo:
  - Limpiar menciones visibles de sistemas anteriores o marcas de migracion en UI/Academia/manuales generales.
  - Mantener lenguaje multi-tenant y reutilizable: fuente externa, sistema anterior, base importada.

  Seguridad:
  - No toca backend protegido.
  - No toca store.js ni adapter Firestore LAB.
  - No toca reglas Firebase.
  - No inserta datos reales.
  - Crea backup local del archivo modificado.

  Uso local desde raiz del repo:
    node tools/orbit360-p0-clean-visible-source-names-20260709.mjs
*/

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const RUN_ID = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
const BACKUP_DIR = path.join(ROOT, '_backups', `p0_clean_visible_source_names_${RUN_ID}`);
const REPORT_DIR = path.join(ROOT, '_orbit360_reports');

const TARGETS = [
  'orbit360-platform/modules/configuracion.js',
  'orbit360-platform/modules/academia.js',
  'orbit360-platform/docs/ACADEMIA.md',
  'orbit360-platform/docs/MANUAL-OPERATIVO.md'
];

const PROTECTED = [
  'orbit360-platform/data/store.js',
  'orbit360-platform/data/store-firestore-lab.local.js',
  'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/backend-lab-security-guard.js',
  'firestore.rules'
];

const REPLACEMENTS = [
  [/SIGA\s*\/\s*CRM externo/g, 'CRM externo / fuente externa'],
  [/SIGA\s*\/\s*CRM/g, 'CRM externo / fuente externa'],
  [/\bSIGA\b/g, 'sistema anterior']
];

const VISIBLE_FORBIDDEN = [/\bSIGA\b/i];

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function assertNotProtected(file) {
  const norm = file.replace(/\\/g, '/');
  if (PROTECTED.includes(norm)) {
    throw new Error(`Archivo protegido bloqueado: ${file}`);
  }
}

function backup(file) {
  const src = path.join(ROOT, file);
  const dst = path.join(BACKUP_DIR, file);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function cleanFile(file) {
  assertNotProtected(file);
  if (!exists(file)) return { file, exists: false, changed: false, replacements: 0 };
  const abs = path.join(ROOT, file);
  const before = fs.readFileSync(abs, 'utf8');
  let after = before;
  let count = 0;

  for (const [pattern, replacement] of REPLACEMENTS) {
    const matches = after.match(pattern);
    if (matches && matches.length) count += matches.length;
    after = after.replace(pattern, replacement);
  }

  if (after !== before) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    backup(file);
    fs.writeFileSync(abs, after, 'utf8');
  }

  const remainingForbidden = VISIBLE_FORBIDDEN.filter(rx => rx.test(after)).map(String);
  return { file, exists: true, changed: after !== before, replacements: count, remainingForbidden };
}

function main() {
  const results = TARGETS.map(cleanFile);
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const report = {
    runId: RUN_ID,
    purpose: 'P0 cleanup visible source names for multi-tenant UI/Academia',
    protectedUntouched: PROTECTED,
    targets: results,
    ok: results.every(r => !r.remainingForbidden || !r.remainingForbidden.length)
  };
  const reportPath = path.join(REPORT_DIR, `p0-clean-visible-source-names-${RUN_ID}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('Orbit 360 P0 cleanup visible source names');
  console.log('Report:', reportPath);
  for (const r of results) {
    console.log(`- ${r.file}: ${r.exists ? (r.changed ? `changed (${r.replacements})` : 'no changes') : 'not found'}`);
    if (r.remainingForbidden && r.remainingForbidden.length) {
      console.log(`  remaining visible forbidden patterns: ${r.remainingForbidden.join(', ')}`);
    }
  }
  if (!report.ok) process.exitCode = 2;
}

main();
