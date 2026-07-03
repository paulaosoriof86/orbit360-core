#!/usr/bin/env node
/* Orbit 360 - Validador Marketing + Integraciones
   Seguro: no git, no deploy, no servidor, no navegador, no produccion. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '..');
const repoDir = path.resolve(appDir, '..');
const reportDir = path.join(repoDir, '_orbit360_reports');
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
const reportPath = path.join(reportDir, `validate_marketing_integraciones_${stamp}.txt`);
const lines = [];
let errors = 0;

function log(x = '') { lines.push(String(x)); console.log(String(x)); }
function ok(x) { log(`OK: ${x}`); }
function bad(x) { errors += 1; log(`ERROR: ${x}`); }
function file(rel) { return path.join(appDir, rel); }
function read(rel) { return fs.readFileSync(file(rel), 'utf8'); }
function exists(rel) { fs.existsSync(file(rel)) ? ok(`existe ${rel}`) : bad(`no existe ${rel}`); }
function contains(rel, needle, label = needle) {
  try { read(rel).includes(needle) ? ok(`${rel} contiene ${label}`) : bad(`${rel} no contiene ${label}`); }
  catch (e) { bad(`no se pudo leer ${rel}: ${e.message}`); }
}
function notContains(rel, needle, label = needle) {
  try { read(rel).includes(needle) ? bad(`${rel} contiene prohibido ${label}`) : ok(`${rel} no contiene ${label}`); }
  catch (e) { bad(`no se pudo leer ${rel}: ${e.message}`); }
}
function syntax(rel) {
  try {
    new vm.Script(read(rel), { filename: rel, displayErrors: true });
    ok(`sintaxis JS valida ${rel}`);
  } catch (e) {
    bad(`sintaxis JS invalida ${rel}: ${e.message}`);
  }
}
function guardNoExternalCalls(rel) {
  notContains(rel, 'fetch(', 'fetch directo');
  notContains(rel, 'XMLHttpRequest', 'XMLHttpRequest directo');
  notContains(rel, 'axios', 'axios directo');
  notContains(rel, 'webhook', 'webhook directo');
  notContains(rel, 'apiKey', 'apiKey');
  notContains(rel, 'secret', 'secret');
  notContains(rel, 'token', 'token');
}
function guardNoDirectStorage(rel) {
  notContains(rel, 'localStorage', 'localStorage directo');
  notContains(rel, 'sessionStorage', 'sessionStorage directo');
}

log('ORBIT 360 - VALIDACION MARKETING + INTEGRACIONES');
log(`Fecha: ${new Date().toLocaleString()}`);
log(`Repo: ${repoDir}`);
log('Restricciones: no git, no deploy, no servidor, no navegador, no produccion');
log('');

[
  'index.html',
  'core/integraciones.js',
  'core/integraciones-panel.js',
  'core/integraciones-lab-mock.js',
  'modules/marketing.js',
  'modules/configuracion.js',
  'data/store.js',
  'data/seed.js'
].forEach(exists);

contains('index.html', 'core/integraciones.js', 'carga core/integraciones.js');
contains('core/integraciones.js', 'Orbit.integraciones', 'Orbit.integraciones');
contains('core/integraciones.js', 'emit(', 'emit');
contains('core/integraciones.js', 'diagnostico', 'diagnostico');
contains('core/integraciones.js', 'openPanel', 'openPanel');
contains('core/integraciones.js', 'extendSeed', 'extendSeed');
contains('core/integraciones.js', 'ensureLabMock', 'ensureLabMock');
contains('core/integraciones.js', 'labMock', 'labMock');
contains('core/integraciones.js', 'sanitizeIntegrationPref', 'sanitizeIntegrationPref');
contains('core/integraciones.js', 'installSafePrefGuard', 'installSafePrefGuard');
contains('core/integraciones.js', '__integracionesPrefGuard', 'guard pref instalado');
contains('core/integraciones.js', 'backend_required', 'referencia backend para credenciales');
contains('core/integraciones.js', 'core/integraciones-lab-mock.js', 'carga mock LAB bajo demanda');
contains('core/integraciones-panel.js', 'Orbit.integracionesPanel', 'Orbit.integracionesPanel');
contains('core/integraciones-panel.js', 'data-lab-cycle', 'boton LAB data-lab-cycle');
contains('core/integraciones-panel.js', 'Simular', 'boton Simular LAB');
contains('core/integraciones-panel.js', 'orbitBackend', 'deteccion orbitBackend LAB');
contains('core/integraciones-lab-mock.js', 'Orbit.integracionesLabMock', 'Orbit.integracionesLabMock');
contains('core/integraciones-lab-mock.js', 'enviar', 'mock enviar');
contains('core/integraciones-lab-mock.js', 'confirmar', 'mock confirmar');
contains('core/integraciones-lab-mock.js', 'fallar', 'mock fallar');
contains('core/integraciones-lab-mock.js', 'ciclo', 'mock ciclo');
contains('core/integraciones-lab-mock.js', 'No se envio a ningun proveedor externo', 'mensaje no envio real');
contains('modules/marketing.js', 'marketing_sync_sheets', 'marketing_sync_sheets');
contains('modules/marketing.js', 'marketing_generar_pieza', 'marketing_generar_pieza');
contains('modules/marketing.js', 'marketing_programar_publicacion', 'marketing_programar_publicacion');
contains('modules/marketing.js', 'marketing_contenido_creado', 'marketing_contenido_creado');
contains('modules/marketing.js', 'Orbit.integraciones.emit', 'uso de Orbit.integraciones.emit');

log('');
log('Validacion de reglas seguras:');
['modules/marketing.js', 'core/integraciones-panel.js', 'core/integraciones-lab-mock.js'].forEach(guardNoExternalCalls);
['modules/marketing.js', 'core/integraciones-panel.js', 'core/integraciones-lab-mock.js'].forEach(guardNoDirectStorage);
contains('core/integraciones.js', 'Orbit.store', 'uso capa store en helper');
contains('core/integraciones.js', 'S().insert', 'insert via store');
contains('core/integraciones.js', 'S().update', 'update via store');
contains('modules/configuracion.js', "Orbit.store.setPref('integ_", 'configuracion usa ruta sanitizada por pref guard');

log('');
log('Validacion sintactica JS sin ejecutar codigo:');
[
  'core/integraciones.js',
  'core/integraciones-panel.js',
  'core/integraciones-lab-mock.js',
  'modules/marketing.js',
  'modules/configuracion.js'
].forEach(syntax);

log('');
log(errors ? `RESULTADO: FALLAS ${errors}` : 'RESULTADO: OK tecnico de contratos, reglas seguras y sintaxis');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
log(`Reporte: ${reportPath}`);
process.exitCode = errors ? 1 : 0;
