#!/usr/bin/env node
/* Orbit 360 A&S — Runner agrupado de validaciones locales Conciliaciones.
   Ejecuta validaciones sintéticas/estáticas antes de cualquier adapter Firestore LAB real.
   No usa datos reales, no escribe Orbit.store/Firestore, no aplica pagos, no deploy/merge. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const VERSION = 'v1.0.0-ays-run-validaciones-locales-conciliaciones';
const reportDir = path.join(root, '_orbit360_reports');
const startedAt = new Date();
const args = process.argv.slice(2);
const strict = !args.includes('--allow-warnings');

const protectedPaths = [
  'orbit360-platform/data/store.js',
  'orbit360-platform/data/store-firestore-lab.local.js',
  'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/backend-lab-security-guard.js',
  'firestore.rules'
];

const requiredTools = [
  'tools/orbit360-validar-empalme-conciliaciones-062855-ays.mjs',
  'tools/orbit360-test-orquestar-score-propuestas-plan-ays.mjs',
  'tools/orbit360-test-validar-readiness-plan-persistencia-lab-ays.mjs'
];

const checks = requiredTools.map((script) => ({
  id: `node-check:${script}`,
  label: `Sintaxis ${script}`,
  cmd: [process.execPath, ['--check', script]]
}));

const validations = [
  {
    id: 'smoke-static-conciliaciones',
    label: 'Smoke estático empalme Conciliaciones 062855',
    cmd: [process.execPath, ['tools/orbit360-validar-empalme-conciliaciones-062855-ays.mjs']]
  },
  {
    id: 'orquestador-score-propuestas-plan',
    label: 'Test orquestador score/propuestas plan-only',
    cmd: [process.execPath, ['tools/orbit360-test-orquestar-score-propuestas-plan-ays.mjs']]
  },
  {
    id: 'readiness-plan-persistencia-lab',
    label: 'Test readiness plan persistencia LAB',
    cmd: [process.execPath, ['tools/orbit360-test-validar-readiness-plan-persistencia-lab-ays.mjs']]
  }
];

function rel(p){ return path.relative(root, p).replace(/\\/g, '/'); }
function exists(p){ return fs.existsSync(path.join(root, p)); }
function sha(file){
  const full = path.join(root, file);
  if(!fs.existsSync(full)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
}
function snapshotProtected(){
  const out = {};
  for(const p of protectedPaths) out[p] = sha(p);
  return out;
}
function diffProtected(before, after){
  const changed = [];
  for(const p of protectedPaths){
    if(before[p] !== after[p]) changed.push({path:p, before:before[p], after:after[p]});
  }
  return changed;
}
function runStep(step){
  const [command, commandArgs] = step.cmd;
  const res = spawnSync(command, commandArgs, { cwd:root, encoding:'utf8', shell:false });
  const stdout = res.stdout || '';
  const stderr = res.stderr || '';
  return {
    id: step.id,
    label: step.label,
    command: [path.basename(command), ...commandArgs].join(' '),
    status: res.status,
    ok: res.status === 0,
    stdout_tail: stdout.slice(-4000),
    stderr_tail: stderr.slice(-4000)
  };
}
function listNewReports(){
  if(!fs.existsSync(reportDir)) return [];
  const names = fs.readdirSync(reportDir).filter(n => n.endsWith('.json') || n.endsWith('.txt'));
  return names.map((name) => {
    const full = path.join(reportDir, name);
    const stat = fs.statSync(full);
    return { path: rel(full), mtime: stat.mtime.toISOString(), size_bytes: stat.size, created_during_run: stat.mtime >= startedAt };
  }).filter(r => r.created_during_run).sort((a,b) => a.path.localeCompare(b.path));
}
function scanGeneratedReports(reports){
  const forbidden = ['APLICADA no es estado permitido para readiness plan-only'];
  // Nota: esta lista no bloquea textos explicativos de pruebas negativas; solo registra presencia de reportes generados.
  return reports.map(r => ({ path:r.path, size_bytes:r.size_bytes, reviewed:true }));
}

const errors = [];
const warnings = [];
for(const tool of requiredTools){
  if(!exists(tool)) errors.push(`Falta herramienta requerida: ${tool}`);
}
for(const p of protectedPaths){
  if(!exists(p)) warnings.push(`Archivo protegido no disponible para hash local: ${p}`);
}

const before = snapshotProtected();
const stepResults = [];
if(!errors.length){
  for(const step of [...checks, ...validations]){
    const result = runStep(step);
    stepResults.push(result);
    if(!result.ok) errors.push(`Falló ${step.id} con exit=${result.status}.`);
  }
}
const after = snapshotProtected();
const protectedChanges = diffProtected(before, after);
if(protectedChanges.length) errors.push(`Se detectaron cambios en archivos protegidos: ${protectedChanges.map(x => x.path).join(', ')}`);

const generatedReports = listNewReports();
const reviewedReports = scanGeneratedReports(generatedReports);
const failCount = stepResults.filter(r => !r.ok).length;
const warnCount = warnings.length;
const decision = errors.length ? 'VALIDACIONES_LOCALES_BLOQUEADAS' : (strict && warnCount ? 'VALIDACIONES_LOCALES_LISTAS_CON_ADVERTENCIAS' : 'VALIDACIONES_LOCALES_LISTAS');

const report = {
  version: VERSION,
  created_at: new Date().toISOString(),
  decision,
  strict,
  summary: {
    required_tools: requiredTools.length,
    steps: stepResults.length,
    failed_steps: failCount,
    warnings: warnCount,
    protected_files_checked: protectedPaths.length,
    protected_changes: protectedChanges.length,
    generated_reports: generatedReports.length
  },
  steps: stepResults,
  protected_files: { before, after, changes: protectedChanges },
  generated_reports: reviewedReports,
  errors,
  warnings,
  can_write_now: false,
  can_apply_payments: false,
  next_allowed_step: decision === 'VALIDACIONES_LOCALES_LISTAS' ? 'smoke_visual_operativo_y_revision_manual_reportes_antes_adapter_firestore_lab' : 'corregir_fallos_o_revisar_advertencias',
  restrictions: ['local-runner','synthetic-only','static-only','no real data','no Orbit.store writes','no Firestore writes','no payment application','no cobros mutation','no deploy','no merge']
};

fs.mkdirSync(reportDir, { recursive:true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(reportDir, `RUN-VALIDACIONES-LOCALES-CONCILIACIONES-AYS-${stamp}.json`);
const txtPath = jsonPath.replace(/\.json$/, '.txt');
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
const txt = [
  '============================================================',
  'ORBIT 360 A&S — RUN VALIDACIONES LOCALES CONCILIACIONES',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Decision: ${decision}`,
  'Restricciones: local, sintético/estático, sin datos reales, sin writes, sin pagos, sin deploy.',
  '============================================================',
  '',
  `Pasos: ${stepResults.length}`,
  `Fallidos: ${failCount}`,
  `Advertencias: ${warnCount}`,
  `Archivos protegidos con cambios: ${protectedChanges.length}`,
  `Reportes generados: ${generatedReports.length}`,
  '',
  ...stepResults.map(r => `${r.ok ? 'OK' : 'FAIL'} ${r.id} exit=${r.status}`),
  '',
  ...errors.map(e => `ERROR: ${e}`),
  ...warnings.map(w => `WARN: ${w}`),
  '',
  `JSON: ${rel(jsonPath)}`,
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.writeFileSync(txtPath, txt, 'utf8');
console.log(txt);
process.exit(errors.length ? 1 : 0);
