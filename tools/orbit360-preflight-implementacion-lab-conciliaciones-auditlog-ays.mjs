#!/usr/bin/env node
/* Orbit 360 A&S — Preflight implementación LAB controlada conciliaciones/auditLog.
   No modifica archivos. No escribe datos. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outDir = path.join(root, '_orbit360_reports');
fs.mkdirSync(outDir, { recursive: true });

const errors = [];
const warnings = [];
const ok = [];

function file(rel){ return path.join(root, rel); }
function exists(rel){ return fs.existsSync(file(rel)); }
function read(rel){ return fs.readFileSync(file(rel), 'utf8'); }
function check(cond, good, bad){ cond ? ok.push(good) : errors.push(bad); }
function git(args){ return spawnSync('git', args, { cwd: root, encoding: 'utf8' }); }

const branch = git(['rev-parse','--abbrev-ref','HEAD']);
const head = git(['rev-parse','--short','HEAD']);
if(branch.status === 0) check(branch.stdout.trim() === 'ays/backend-tenant-lab-v99-20260703', 'Rama correcta', `Rama incorrecta: ${branch.stdout.trim()}`);
else warnings.push('No se pudo confirmar rama git local.');
if(head.status === 0) ok.push(`HEAD local: ${head.stdout.trim()}`);

const required = [
  'orbit360-platform/index.html',
  'orbit360-platform/data/store.js',
  'orbit360-platform/data/store-firestore-lab.local.js',
  'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/backend-lab-security-guard.js',
  'orbit360-platform/modules/conciliaciones.js',
  'tools/orbit360-run-validaciones-acumuladas-ays.ps1',
  'tools/orbit360-validar-readiness-backend-conciliaciones-auditlog-ays.mjs',
  'orbit360-platform/docs/CONTRATO-IMPLEMENTACION-BACKEND-REAL-CONCILIACIONES-AUDITLOG-AYS-20260705.md'
];
for(const r of required) check(exists(r), `Existe ${r}`, `Falta ${r}`);

if(exists('orbit360-platform/index.html')){
  const idx = read('orbit360-platform/index.html');
  check(idx.includes('core/backend-lab-loader.js'), 'Index conserva loader LAB', 'Index no conserva loader LAB');
  check(idx.includes('core/backend-lab-init.js'), 'Index conserva init LAB', 'Index no conserva init LAB');
  check(idx.includes('data/store.js'), 'Index conserva store base', 'Index no conserva store base');
  check(idx.includes('data/store-firestore-lab.local.js'), 'Index conserva store LAB', 'Index no conserva store LAB');
}
if(exists('orbit360-platform/modules/conciliaciones.js')){
  const c = read('orbit360-platform/modules/conciliaciones.js');
  check(/No aplica pagos|no aplica pagos/.test(c), 'Conciliaciones declara no aplicar pagos', 'Conciliaciones no declara no aplicar pagos');
  check(!/VALIDADA\s*->\s*APLICADA|PROPUESTA\s*->\s*APLICADA|EN_REVISION\s*->\s*APLICADA/.test(c), 'Conciliaciones no expone transición aplicada', 'Conciliaciones contiene transición aplicada');
}
if(exists('orbit360-platform/docs/CONTRATO-IMPLEMENTACION-BACKEND-REAL-CONCILIACIONES-AUDITLOG-AYS-20260705.md')){
  const d = read('orbit360-platform/docs/CONTRATO-IMPLEMENTACION-BACKEND-REAL-CONCILIACIONES-AUDITLOG-AYS-20260705.md');
  check(d.includes('APLICADA') && d.includes('queda bloqueado'), 'Contrato bloquea APLICADA', 'Contrato no bloquea APLICADA');
  check(d.includes('cobros') && d.includes('finmovs'), 'Contrato nombra colecciones bloqueadas', 'Contrato no nombra colecciones bloqueadas');
}

const report = { created_at: new Date().toISOString(), decision: errors.length ? 'PREFLIGHT_BLOQUEADO' : 'PREFLIGHT_OK', ok, warnings, errors };
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const json = path.join(outDir, `PREFLIGHT-IMPLEMENTACION-LAB-CONCILIACIONES-AUDITLOG-AYS-${stamp}.json`);
const txt = json.replace(/\.json$/, '.txt');
fs.writeFileSync(json, JSON.stringify(report, null, 2), 'utf8');
fs.writeFileSync(txt, [
  'ORBIT 360 A&S - PREFLIGHT IMPLEMENTACION LAB CONCILIACIONES AUDITLOG',
  `Fecha: ${report.created_at}`,
  `Decision: ${report.decision}`,
  `OK: ${ok.length}`,
  `Advertencias: ${warnings.length}`,
  ...warnings.map(w => `WARN: ${w}`),
  `Errores: ${errors.length}`,
  ...errors.map(e => `ERROR: ${e}`),
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n'), 'utf8');
console.log(fs.readFileSync(txt, 'utf8'));
process.exit(errors.length ? 1 : 0);
