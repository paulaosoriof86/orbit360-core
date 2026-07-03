#!/usr/bin/env node
/* Orbit 360 · Backend LAB contract validator v1.104
   Static validator: no network, no Firebase, no secrets. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const app = path.join(root, 'orbit360-platform');
const files = {
  loader: path.join(app, 'core', 'backend-lab-loader.js'),
  init: path.join(app, 'core', 'backend-lab-init.js'),
  guard: path.join(app, 'core', 'backend-lab-security-guard.js'),
  storeLab: path.join(app, 'data', 'store-firestore-lab.local.js'),
  store: path.join(app, 'data', 'store.js'),
  index: path.join(app, 'index.html'),
  gitignore: path.join(root, '.gitignore')
};

const requiredApi = ['all','get','where','find','insert','update','remove','on','_emit','pref','setPref','init','reseed','raw'];
const errors = [];
const warnings = [];

function read(p){
  if (!fs.existsSync(p)) {
    errors.push(`Falta archivo: ${path.relative(root, p)}`);
    return '';
  }
  return fs.readFileSync(p, 'utf8');
}

const loader = read(files.loader);
const init = read(files.init);
const guard = read(files.guard);
const storeLab = read(files.storeLab);
const store = read(files.store);
const index = read(files.index);
const gitignore = read(files.gitignore);

for (const [name, text] of Object.entries({ loader, init, guard, storeLab })) {
  if (text && !text.includes('use strict')) errors.push(`${name}: falta use strict`);
}

if (!loader.includes("allowedTenants = ['alianzas-soluciones']")) errors.push('loader: falta allowlist estricta de tenant LAB');
if (!loader.includes('auth-firebase.config.local.js')) errors.push('loader: no referencia config local ignorada');
if (!init.includes('firebaseInitVersion')) errors.push('init: falta version de init');
if (!guard.includes('v1.104-backend-lab-security-guard')) errors.push('guard: version esperada no encontrada');
if (!guard.includes('SENSITIVE_KEY_RE')) errors.push('guard: falta patrón de bloqueo de secretos');
if (!guard.includes('scrub(')) errors.push('guard: falta sanitización antes de escribir');
if (!guard.includes('authOk')) errors.push('guard: falta gate de auth LAB');
if (!storeLab.includes('__firestoreLabExplicit')) errors.push('storeLab: falta bandera de store LAB explícito');

for (const apiName of requiredApi) {
  const alt = apiName === '_emit' ? '_emit: emit' : `${apiName}: ${apiName}`;
  if (!storeLab.includes(alt)) errors.push(`storeLab: falta API ${apiName}`);
}

if (!gitignore.includes('auth-firebase.config.local.js')) errors.push('.gitignore: debe ignorar auth-firebase.config.local.js');
if (store.includes('firebase') || store.includes('firestore')) warnings.push('data/store.js menciona Firebase/Firestore; confirmar que siga siendo store demo o adapter final controlado.');
if (!index.includes('data/store.js')) errors.push('index: no carga data/store.js');
if (!index.includes('data/seed.js')) errors.push('index: no carga data/seed.js');
if (!index.includes('data/store-firestore-lab.local.js')) warnings.push('index: store LAB no está integrado permanentemente; ejecutar script local de integración v104 antes de smoke LAB permanente.');
if (!index.includes('core/backend-lab-security-guard.js')) warnings.push('index: guard LAB no está integrado permanentemente; esperado si todavía se evita editar HTML grande desde GitHub.');

const output = [
  '============================================================',
  'ORBIT 360 - VALIDACION BACKEND LAB CONTRATO v1.104',
  `Fecha: ${new Date().toISOString()}`,
  `Root: ${root}`,
  'Restricciones: sin red, sin Firebase, sin secretos, sin escritura remota.',
  '============================================================',
  '',
  `Errores: ${errors.length}`,
  ...errors.map(e => `ERROR: ${e}`),
  '',
  `Warnings: ${warnings.length}`,
  ...warnings.map(w => `WARN: ${w}`),
  '',
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');

console.log(output);

const reportDir = path.join(root, '_orbit360_reports');
try {
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, 'VALIDACION-BACKEND-LAB-CONTRATO-V104.txt'), output, 'utf8');
} catch {}

process.exit(errors.length ? 1 : 0);
