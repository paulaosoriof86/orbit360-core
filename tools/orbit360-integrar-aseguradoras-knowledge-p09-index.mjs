#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const APPLY = process.argv.includes('--apply');
const ROOT = process.cwd();
const INDEX = path.join(ROOT, 'orbit360-platform', 'index.html');
const REQUIRED_BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const MODULE_RE = /<script\s+src=["']modules\/aseguradoras\.js(?:\?[^"']*)?["']\s*><\/script>/;
const CORE_SCRIPTS = [
  'core/backend-lab-security-guard.js',
  'core/document-source-contract-p04.js',
  'core/cotizacion-esquema-aseguradora-p0.js',
  'core/tariff-quote-reconciliation-p06c.js',
  'core/knowledge-binding-gate-p08.js',
  'core/knowledge-binding-policy-p08.js',
  'core/tenant-insurer-config-p10.js',
  'data/tenant-alianzas-soluciones-insurers-p10.js',
  'core/tenant-source-batch-adapter-p10.js',
  'core/tenant-binding-plan-p10c.js',
  'data/tenant-alianzas-soluciones-binding-plan-p10c.js',
  'core/excel-rule-proposal-adapter-p06b.js',
  'core/pdf-quote-adapter-p07.js',
  'core/document-provider-registry-p09.js',
  'core/document-provider-bridge-p09b.js',
  'core/aseguradoras-knowledge-runtime-p09.js',
  'core/aseguradoras-lab-collections-p09e.js',
  'core/aseguradoras-lab-persistence-p09e.js'
];
const SERVICE_SCRIPT = 'modules/aseguradoras-knowledge-p09.js';

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
  [...CORE_SCRIPTS, SERVICE_SCRIPT].forEach(src => { if (count(text, src) > 1) errors.push(`DUPLICATE_SCRIPT:${src}`); });
  return errors;
}
function integrate(text) {
  let out = text;
  const moduleTag = (out.match(MODULE_RE) || [])[0];
  if (!moduleTag) return out;
  const missingCore = CORE_SCRIPTS.filter(src => !out.includes(src));
  if (missingCore.length) {
    const block = missingCore.map(tag).join('\n') + '\n  ' + moduleTag;
    out = out.replace(moduleTag, block);
  }
  if (!out.includes(SERVICE_SCRIPT)) out = out.replace(moduleTag, moduleTag + '\n' + tag(SERVICE_SCRIPT));
  return out;
}
function validateOrder(text) {
  const errors = [];
  const positions = CORE_SCRIPTS.map(src => text.indexOf(src));
  positions.forEach((pos, i) => { if (pos < 0) errors.push(`SCRIPT_MISSING:${CORE_SCRIPTS[i]}`); });
  for (let i = 1; i < positions.length; i += 1) if (positions[i] < positions[i - 1]) errors.push(`ORDER_INVALID:${CORE_SCRIPTS[i]}`);
  const modulePos = text.indexOf('modules/aseguradoras.js');
  const servicePos = text.indexOf(SERVICE_SCRIPT);
  if (positions.some(pos => pos > modulePos)) errors.push('CORE_MUST_LOAD_BEFORE_ASEGURADORAS');
  if (servicePos < modulePos) errors.push('SERVICE_MUST_LOAD_AFTER_ASEGURADORAS');
  const tenantCore = text.indexOf('core/tenant-insurer-config-p10.js');
  const tenantData = text.indexOf('data/tenant-alianzas-soluciones-insurers-p10.js');
  const tenantBatch = text.indexOf('core/tenant-source-batch-adapter-p10.js');
  const bindingCore = text.indexOf('core/tenant-binding-plan-p10c.js');
  const bindingData = text.indexOf('data/tenant-alianzas-soluciones-binding-plan-p10c.js');
  const labCollections = text.indexOf('core/aseguradoras-lab-collections-p09e.js');
  const labPersistence = text.indexOf('core/aseguradoras-lab-persistence-p09e.js');
  if (!(tenantCore >= 0 && tenantData > tenantCore && tenantBatch > tenantData)) errors.push('TENANT_CONFIG_ORDER_INVALID');
  if (!(bindingCore > tenantBatch && bindingData > bindingCore)) errors.push('TENANT_BINDING_ORDER_INVALID');
  if (!(labCollections > 0 && labPersistence > labCollections)) errors.push('LAB_PERSISTENCE_ORDER_INVALID');
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
  scripts: [...CORE_SCRIPTS, SERVICE_SCRIPT],
  tenantConfig: 'alianzas-soluciones',
  tenantConfigLoadedBeforeRuntime: true,
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
const backupDir = path.join(ROOT, '_backups', `p09-index-${new Date().toISOString().replace(/[:.]/g, '-')}`);
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