#!/usr/bin/env node
/* Orbit 360 A&S — validación estática del empalme frontend Conciliaciones 062855
   No escribe datos, no ejecuta UI, no toca Firestore, no deploy.
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const VERSION = 'v1.0.0-ays-validar-empalme-conciliaciones-062855';
const reportDir = path.join(root, '_orbit360_reports');
const indexPath = path.join(root, 'orbit360-platform', 'index.html');
const modulePath = path.join(root, 'orbit360-platform', 'modules', 'conciliaciones.js');
const protectedPaths = [
  'orbit360-platform/data/store.js',
  'orbit360-platform/data/store-firestore-lab.local.js',
  'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/backend-lab-security-guard.js',
  'firestore.rules'
];
const requiredIndex = [
  'core/backend-lab-loader.js',
  'core/backend-lab-init.js',
  'data/store.js',
  'data/store-firestore-lab.local.js',
  'core/auth.js?v1295-labfix-20260703',
  'modules/conciliaciones.js'
];
const requiredModule = [
  'Orbit.modules.conciliaciones',
  "Orbit.store.all('conciliaciones')",
  "Orbit.store.get('conciliaciones'",
  "Orbit.store.update('conciliaciones'",
  'Dirección',
  'Admin',
  'Finanzas',
  'No aplica pagos',
  'Validada no significa pagada'
];
const forbiddenModule = [
  "Orbit.store.update('cobros'",
  'Orbit.store.update("cobros"',
  "Orbit.store.insert('cobros'",
  'Orbit.store.insert("cobros"',
  "Orbit.store.remove('cobros'",
  'Orbit.store.remove("cobros"',
  'postRecaudo(',
  'estado:\'Pagado\'',
  'estado:"Pagado"',
  'estado: "Pagado"',
  'localStorage.setItem',
  'firebase.firestore()',
  'fbDb.collection'
];
const forbiddenVisibleCopy = [
  'En el paso siguiente podés aplicar pagos por póliza.',
  'En el paso siguiente puedes aplicar pagos por póliza.',
  'Se aplicarán sin duplicar.',
  'Sin pagos pendientes de aplicar.',
  'Pendiente de aplicar'
];
function rel(p){ return path.relative(root, p).replace(/\\/g, '/'); }
function read(file){ return fs.readFileSync(file, 'utf8'); }
function exists(file){ return fs.existsSync(file); }
function count(text, needle){ return text.split(needle).length - 1; }
function makeReport(){
  const errors=[]; const warnings=[]; const checks=[];
  if(!exists(indexPath)) errors.push('No existe orbit360-platform/index.html.');
  if(!exists(modulePath)) errors.push('No existe orbit360-platform/modules/conciliaciones.js.');
  const index = exists(indexPath) ? read(indexPath) : '';
  const mod = exists(modulePath) ? read(modulePath) : '';
  for(const needle of requiredIndex){
    const ok = index.includes(needle); checks.push({scope:'index', needle, ok}); if(!ok) errors.push(`Index no contiene ${needle}.`);
  }
  if(count(index, 'modules/conciliaciones.js') !== 1) errors.push(`Index debe cargar modules/conciliaciones.js exactamente una vez. Actual: ${count(index, 'modules/conciliaciones.js')}.`);
  for(const needle of requiredModule){
    const ok = mod.includes(needle); checks.push({scope:'module', needle, ok}); if(!ok) errors.push(`Módulo Conciliaciones no contiene ${needle}.`);
  }
  for(const needle of forbiddenModule){
    if(mod.includes(needle)) errors.push(`Módulo Conciliaciones contiene patrón prohibido: ${needle}.`);
  }
  for(const needle of forbiddenVisibleCopy){
    if(index.includes(needle) || mod.includes(needle)) warnings.push(`Copy residual detectado en index/módulo: ${needle}.`);
  }
  for(const p of protectedPaths){
    const full = path.join(root, p);
    if(!exists(full)) warnings.push(`Archivo protegido no disponible localmente para hash: ${p}.`);
  }
  const decision = errors.length ? 'EMPALME_BLOQUEADO' : (warnings.length ? 'EMPALME_VALIDO_CON_ADVERTENCIAS' : 'EMPALME_VALIDO');
  return {
    version: VERSION,
    created_at: new Date().toISOString(),
    decision,
    files: { index: rel(indexPath), conciliaciones: rel(modulePath) },
    checks,
    errors,
    warnings,
    restrictions: ['static-only','no-browser','no-writes','no-Firestore','no-payment-application','no-deploy','no-merge']
  };
}
fs.mkdirSync(reportDir, {recursive:true});
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const report = makeReport();
const jsonPath = path.join(reportDir, `VALIDACION-EMPALME-CONCILIACIONES-062855-AYS-${stamp}.json`);
const txtPath = path.join(reportDir, `VALIDACION-EMPALME-CONCILIACIONES-062855-AYS-${stamp}.txt`);
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
const txt = [
  '============================================================',
  'ORBIT 360 A&S — VALIDACION EMPALME CONCILIACIONES 062855',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Decision: ${report.decision}`,
  'Restricciones: estático, sin navegador, sin writes, sin Firestore, sin pagos, sin deploy.',
  '============================================================',
  '',
  `Errores: ${report.errors.length}`,
  ...report.errors.map(e=>`ERROR: ${e}`),
  '',
  `Advertencias: ${report.warnings.length}`,
  ...report.warnings.map(w=>`WARN: ${w}`),
  '',
  `JSON: ${rel(jsonPath)}`,
  report.errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.writeFileSync(txtPath, txt, 'utf8');
console.log(txt);
process.exit(report.errors.length ? 1 : 0);
