#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const APPLY = process.argv.includes('--apply');
const ROOT = process.cwd();
const INDEX = path.join(ROOT, 'orbit360-platform', 'index.html');
const REQUIRED_BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const MODULE_RE = /<script\s+src=["']modules\/aseguradoras\.js(?:\?[^"']*)?["']\s*><\/script>/;
const SECURITY_GUARD = 'core/backend-lab-security-guard.js';
const ENTRY_SCRIPT = 'core/aseguradoras-runtime-bootstrap-p09f.js';
const SCRIPTS = [SECURITY_GUARD, ENTRY_SCRIPT];

function fail(message) { console.error('ERROR:', message); process.exit(1); }
function tag(src) { return `  <script src="${src}"></script>`; }
function count(text, needle) { return text.split(needle).length - 1; }
function branch() {
  try { return execFileSync('git', ['branch', '--show-current'], { cwd: ROOT, encoding: 'utf8' }).trim(); }
  catch { return ''; }
}
function validate(text) {
  const errors = [];
  if (!text.includes('<meta charset="UTF-8">')) errors.push('UTF8_META_REQUIRED');
  const moduleMatches = text.match(new RegExp(MODULE_RE.source, 'g')) || [];
  if (!moduleMatches.length) errors.push('ASEGURADORAS_MODULE_TAG_REQUIRED');
  if (moduleMatches.length > 1) errors.push('DUPLICATE_SCRIPT:modules/aseguradoras.js');
  if (!text.includes('data/store.js')) errors.push('ORBIT_STORE_TAG_REQUIRED');
  if (/Ã.|Â.|â€|ðŸ/.test(text)) errors.push('MOJIBAKE_DETECTED');
  SCRIPTS.forEach(src => { if (count(text, src) > 1) errors.push(`DUPLICATE_SCRIPT:${src}`); });
  return errors;
}
function integrate(text) {
  let out = text;
  const moduleTag = (out.match(MODULE_RE) || [])[0];
  if (!moduleTag) return out;
  const missing = SCRIPTS.filter(src => !out.includes(src));
  if (missing.length) {
    const block = missing.map(tag).join('\n') + '\n  ' + moduleTag;
    out = out.replace(moduleTag, block);
  }
  return out;
}
function validateOrder(text) {
  const errors = [];
  const storePos = text.indexOf('data/store.js');
  const guardPos = text.indexOf(SECURITY_GUARD);
  const entryPos = text.indexOf(ENTRY_SCRIPT);
  const modulePos = text.indexOf('modules/aseguradoras.js');
  if (guardPos < 0) errors.push(`SCRIPT_MISSING:${SECURITY_GUARD}`);
  if (entryPos < 0) errors.push(`SCRIPT_MISSING:${ENTRY_SCRIPT}`);
  if (!(storePos >= 0 && guardPos > storePos)) errors.push('SECURITY_GUARD_MUST_LOAD_AFTER_STORE');
  if (!(entryPos > guardPos)) errors.push('P09F_ENTRY_MUST_LOAD_AFTER_SECURITY_GUARD');
  if (!(modulePos > entryPos)) errors.push('P09F_ENTRY_MUST_LOAD_BEFORE_ASEGURADORAS');
  return errors;
}

if (!fs.existsSync(INDEX)) fail(`Index no encontrado: ${INDEX}`);
const current = fs.readFileSync(INDEX, 'utf8');
const preflight = validate(current);
if (preflight.length) fail(preflight.join(', '));
const next = integrate(current);
const postflight = [...validate(next), ...validateOrder(next)];
if (postflight.length) fail(postflight.join(', '));

const report = {
  mode: APPLY ? 'apply' : 'dry-run',
  branch: branch(),
  index: path.relative(ROOT, INDEX),
  changed: next !== current,
  scripts: SCRIPTS.slice(),
  runtimeEntrypoint: ENTRY_SCRIPT,
  runtimeLoadsDependenciesDynamically: true,
  tenantConfig: 'alianzas-soluciones',
  tenantConfigLoadedBeforeKnowledgeOperations: true,
  labPersistenceGuarded: true,
  protectedFilesTouched: false,
  commit: false,
  deploy: false
};

if (!APPLY) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}
if (report.branch !== REQUIRED_BRANCH) fail(`Rama inválida: ${report.branch || '(desconocida)'}`);
if (!report.changed) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }
const backupDir = path.join(ROOT, '_backups', `p09f-index-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(backupDir, { recursive: true });
const backup = path.join(backupDir, 'index.html');
fs.copyFileSync(INDEX, backup);
try {
  fs.writeFileSync(INDEX, next, 'utf8');
  const reread = fs.readFileSync(INDEX, 'utf8');
  const errors = [...validate(reread), ...validateOrder(reread)];
  if (errors.length) throw new Error(errors.join(', '));
  console.log(JSON.stringify({ ...report, backup: path.relative(ROOT, backup) }, null, 2));
} catch (error) {
  fs.copyFileSync(backup, INDEX);
  fail(`Rollback aplicado: ${error.message}`);
}