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
const lines = []; let errors = 0;
function log(x=''){lines.push(String(x)); console.log(String(x));}
function ok(x){log(`OK: ${x}`);} function bad(x){errors++; log(`ERROR: ${x}`);}
function file(rel){return path.join(appDir, rel);} function read(rel){return fs.readFileSync(file(rel),'utf8');}
function exists(rel){fs.existsSync(file(rel))?ok(`existe ${rel}`):bad(`no existe ${rel}`);}
function contains(rel, needle, label=needle){try{read(rel).includes(needle)?ok(`${rel} contiene ${label}`):bad(`${rel} no contiene ${label}`);}catch(e){bad(`no se pudo leer ${rel}: ${e.message}`);}}
function notContains(rel, needle, label=needle){try{read(rel).includes(needle)?bad(`${rel} contiene prohibido ${label}`):ok(`${rel} no contiene ${label}`);}catch(e){bad(`no se pudo leer ${rel}: ${e.message}`);}}
function syntax(rel){try{new vm.Script(read(rel),{filename:rel,displayErrors:true});ok(`sintaxis JS valida ${rel}`);}catch(e){bad(`sintaxis JS invalida ${rel}: ${e.message}`);}}
function guardNoExternalCalls(rel){['fetch(','XMLHttpRequest','axios','webhook','apiKey','secret','token'].forEach(x=>notContains(rel,x,x));}
function guardNoDirectStorage(rel){['localStorage','sessionStorage'].forEach(x=>notContains(rel,x,x));}
log('ORBIT 360 - VALIDACION MARKETING + INTEGRACIONES'); log(`Fecha: ${new Date().toLocaleString()}`); log(`Repo: ${repoDir}`); log('Restricciones: no git, no deploy, no servidor, no navegador, no produccion'); log('');
['index.html','core/integraciones.js','core/integraciones-panel.js','core/integraciones-lab-mock.js','modules/marketing.js','modules/configuracion.js','data/store.js','data/seed.js'].forEach(exists);
contains('index.html','core/integraciones.js','carga core/integraciones.js');
['Orbit.integraciones','emit(','configurar(','upsertIntegration','integrationId','inputPersistedInFrontend: false','backendRequired','pendiente_backend','diagnostico','openPanel','extendSeed','ensureLabMock','labMock','sanitizeIntegrationPref','installSafePrefGuard','__integracionesPrefGuard','backend_required','core/integraciones-lab-mock.js'].forEach(x=>contains('core/integraciones.js',x,x));
['Orbit.integracionesPanel','data-lab-cycle','Simular','orbitBackend'].forEach(x=>contains('core/integraciones-panel.js',x,x));
['Orbit.integracionesLabMock','enviar','confirmar','fallar','ciclo','No se envio a ningun proveedor externo'].forEach(x=>contains('core/integraciones-lab-mock.js',x,x));
['marketing_sync_sheets','marketing_generar_pieza','marketing_programar_publicacion','marketing_contenido_creado','Orbit.integraciones.emit'].forEach(x=>contains('modules/marketing.js',x,x));
log(''); log('Validacion de reglas seguras:');
['modules/marketing.js','core/integraciones-panel.js','core/integraciones-lab-mock.js'].forEach(guardNoExternalCalls);
['modules/marketing.js','core/integraciones-panel.js','core/integraciones-lab-mock.js'].forEach(guardNoDirectStorage);
contains('core/integraciones.js','Orbit.store','uso capa store en helper'); contains('core/integraciones.js','S().insert','insert via store'); contains('core/integraciones.js','S().update','update via store');
log(''); log('Validacion sintactica JS sin ejecutar codigo:'); ['core/integraciones.js','core/integraciones-panel.js','core/integraciones-lab-mock.js','modules/marketing.js','modules/configuracion.js'].forEach(syntax);
log(''); log(errors?`RESULTADO: FALLAS ${errors}`:'RESULTADO: OK tecnico de contratos, reglas seguras y sintaxis'); fs.mkdirSync(reportDir,{recursive:true}); fs.writeFileSync(reportPath, lines.join('\n'), 'utf8'); log(`Reporte: ${reportPath}`); process.exitCode = errors?1:0;
