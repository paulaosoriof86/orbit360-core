#!/usr/bin/env node
/* Orbit 360 A&S — Validador estático de revisión visual/operativa por roles.
   No abre navegador, no escribe datos, no toca Firestore ni Storage. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportDir = path.join(root, '_orbit360_reports');
const VERSION = 'v1.0.0-ays-revision-roles';
const FAIL = [];
const WARN = [];
const OK = [];

function p(rel){ return path.join(root, rel); }
function exists(rel){ return fs.existsSync(p(rel)); }
function read(rel){ return fs.readFileSync(p(rel), 'utf8'); }
function check(cond, ok, fail){ if(cond) OK.push(ok); else FAIL.push(fail); }
function warn(cond, msg){ if(!cond) WARN.push(msg); }
function includes(file, needle){ return exists(file) && read(file).includes(needle); }
function regex(file, re){ return exists(file) && re.test(read(file)); }

const files = {
  index:'orbit360-platform/index.html',
  portal:'orbit360-platform/modules/portal.js',
  portalFix:'orbit360-platform/modules/portal-v1142-copyfix.js',
  cliente360:'orbit360-platform/modules/cliente360.js',
  polizas:'orbit360-platform/modules/polizas.js',
  cobros:'orbit360-platform/modules/cobros.js',
  conciliaciones:'orbit360-platform/modules/conciliaciones.js',
  inicio:'orbit360-platform/modules/inicio.js',
  integracionesPanel:'orbit360-platform/core/integraciones-panel.js',
  store:'orbit360-platform/data/store.js',
  storeLab:'orbit360-platform/data/store-firestore-lab.local.js',
  loader:'orbit360-platform/core/backend-lab-loader.js',
  init:'orbit360-platform/core/backend-lab-init.js',
  guard:'orbit360-platform/core/backend-lab-security-guard.js'
};

fs.mkdirSync(reportDir, { recursive:true });

// Existencia mínima
for(const [k, rel] of Object.entries(files)) check(exists(rel), `Existe ${rel}`, `Falta archivo requerido: ${rel}`);

// Index híbrido protegido
check(includes(files.index, 'core/backend-lab-loader.js?v=lab-20260703'), 'Index conserva loader LAB', 'Index no conserva loader LAB');
check(includes(files.index, 'core/backend-lab-init.js?v=lab-20260703'), 'Index conserva init LAB', 'Index no conserva init LAB');
check(includes(files.index, 'data/store.js?v1291'), 'Index conserva data/store.js', 'Index no conserva data/store.js');
check(includes(files.index, 'data/store-firestore-lab.local.js?v=lab-store-20260703'), 'Index conserva store Firestore LAB', 'Index no conserva store Firestore LAB');
check(includes(files.index, 'core/auth.js?v1295-labfix-20260703'), 'Index conserva auth labfix', 'Index no conserva auth labfix');
check(includes(files.index, 'modules/inicio.js?v1325'), 'Index carga inicio v1325', 'Index no carga inicio v1325');
check(includes(files.index, 'modules/conciliaciones.js?v1325'), 'Index carga conciliaciones v1325', 'Index no carga conciliaciones v1325');
check(includes(files.index, 'modules/portal-v1142-copyfix.js?v1325'), 'Index carga hotfix Portal v1.142', 'Index no carga hotfix Portal v1.142');

// Rol cliente
check(includes(files.index, 'modules/portal.js'), 'Rol cliente: portal cargado', 'Rol cliente: portal no cargado en index');
check(includes(files.portalFix, 'pendiente de revisión/conciliación'), 'Rol cliente: pago reportado queda pendiente de revisión/conciliación', 'Rol cliente: falta copy de pago reportado pendiente');
check(includes(files.portalFix, 'No cambia datos, cobros, cartera ni producción'), 'Rol cliente: hotfix no cambia datos/cobros/cartera/producción', 'Rol cliente: hotfix no declara restricción de no cambios');

// Rol asesor
check(includes(files.index, 'modules/cliente360.js'), 'Rol asesor: Cliente360 cargado', 'Rol asesor: Cliente360 no cargado');
check(includes(files.index, 'modules/polizas.js'), 'Rol asesor: pólizas cargado', 'Rol asesor: pólizas no cargado');
check(includes(files.index, 'modules/cobros.js'), 'Rol asesor: cobros visibles desde CRM', 'Rol asesor: cobros no cargado');

// Rol cobros
check(includes(files.index, 'modules/conciliaciones.js?v1325'), 'Rol cobros: conciliaciones cargado', 'Rol cobros: conciliaciones no cargado');
check(regex(files.conciliaciones, /No aplica pagos|no aplica pagos/), 'Rol cobros: conciliaciones declara que no aplica pagos', 'Rol cobros: falta copy de no aplicar pagos');
check(regex(files.conciliaciones, /No toca cobros|nunca cobros|no modifica cobros/i), 'Rol cobros: conciliaciones declara que no toca/modifica cobros', 'Rol cobros: falta restricción visible de no tocar cobros');
check(includes(files.conciliaciones, 'listas para revisión técnica'), 'Rol cobros: copy técnico corregido a revisión técnica', 'Rol cobros: falta copy listas para revisión técnica');

// Rol dirección/admin
check(includes(files.integracionesPanel, 'Pendiente de conexión'), 'Rol dirección: integraciones muestran pendiente de conexión', 'Rol dirección: falta copy pendiente de conexión');
check(includes(files.inicio, 'Recaudo confirmado'), 'Rol dirección: inicio usa Recaudo confirmado', 'Rol dirección: inicio no usa Recaudo confirmado');
check(includes(files.inicio, 'cobros confirmados'), 'Rol dirección: inicio usa cobros confirmados', 'Rol dirección: inicio no usa cobros confirmados');
check(includes(files.index, 'pais-sel'), 'Rol dirección: selector país presente', 'Rol dirección: falta selector país');

// Búsqueda de copy de riesgo en módulos tocados recientes
const touched = [files.portalFix, files.conciliaciones, files.inicio, files.integracionesPanel];
const risky = [
  [/Pago aplicado/i, 'copy Pago aplicado'],
  [/recaudo aplicado/i, 'copy recaudo aplicado'],
  [/cobros aplicados/i, 'copy cobros aplicados'],
  [/Todo aplicado/i, 'copy Todo aplicado'],
  [/Sin conexión real/i, 'copy Sin conexión real'],
  [/listas p\/ backend/i, 'copy listas p/ backend']
];
for(const rel of touched){
  if(!exists(rel)) continue;
  const content = read(rel);
  for(const [re,label] of risky){
    if(re.test(content)) FAIL.push(`Riesgo UI en ${rel}: ${label}`);
  }
}

warn(!regex(files.integracionesPanel, /LAB|mock|backend/i), 'Integraciones panel conserva términos técnicos en comentario o diagnóstico; revisar visualmente que no aparezcan para cliente.');
warn(!regex(files.conciliaciones, /backend/i), 'Conciliaciones conserva término técnico en comentario o copy interno; revisar visualmente que no aparezca para cliente.');

const report = {
  version: VERSION,
  created_at: new Date().toISOString(),
  decision: FAIL.length ? 'REVISION_ROLES_BLOQUEADA' : (WARN.length ? 'REVISION_ROLES_LISTA_CON_ADVERTENCIAS' : 'REVISION_ROLES_LISTA'),
  ok: OK,
  warnings: WARN,
  errors: FAIL,
  restrictions: ['static-only','no browser','no writes','no Firestore','no Storage','no real data','no payment application','no portfolio mutation','no production update','no deploy','no merge']
};
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const json = path.join(reportDir, `REVISION-ROLES-AYS-${stamp}.json`);
const txt = json.replace(/\.json$/, '.txt');
fs.writeFileSync(json, JSON.stringify(report, null, 2), 'utf8');
fs.writeFileSync(txt, [
  '============================================================',
  'ORBIT 360 A&S — REVISION ESTATICA POR ROLES',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Decision: ${report.decision}`,
  'Restricciones: sin navegador, sin writes, sin datos reales.',
  '============================================================',
  '',
  `OK: ${OK.length}`,
  ...OK.map(x => `OK: ${x}`),
  '',
  `Advertencias: ${WARN.length}`,
  ...WARN.map(x => `WARN: ${x}`),
  '',
  `Errores: ${FAIL.length}`,
  ...FAIL.map(x => `ERROR: ${x}`),
  '',
  `JSON: ${path.relative(root, json).replace(/\\/g,'/')}`,
  FAIL.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n'), 'utf8');
console.log(fs.readFileSync(txt, 'utf8'));
process.exit(FAIL.length ? 1 : 0);
