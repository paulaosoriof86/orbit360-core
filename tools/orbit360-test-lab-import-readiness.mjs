import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = {
  guard: 'orbit360-platform/core/backend-lab-import-readiness-guard.js',
  bridge: 'orbit360-platform/core/backend-lab-advisor-write-bridge.js',
  init: 'orbit360-platform/core/backend-lab-init.js',
  importer: 'orbit360-platform/modules/importar-initial-tenant-lab.js',
  equipo: 'orbit360-platform/modules/equipo.js',
  advisors: 'orbit360-platform/data/tenant-config/alianzas-soluciones.asesores.json'
};

for (const path of [files.bridge, files.init, files.importer, files.equipo]) {
  const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('READINESS_CONTRACT_FAIL: sintaxis ' + path + ': ' + (result.stderr || result.stdout));
}

const read = path => fs.readFileSync(path, 'utf8');
const guard = read(files.guard);
const bridge = read(files.bridge);
const init = read(files.init);
const importer = read(files.importer);
const equipo = read(files.equipo);
const config = JSON.parse(read(files.advisors));

function requireText(source, token, label) {
  if (!source.includes(token)) throw new Error('READINESS_CONTRACT_FAIL: ' + label);
}

requireText(guard, 'orbit.lab@demo.com', 'correo LAB canónico');
requireText(guard, "['clientes', 'aseguradoras', 'asesores']", 'colecciones críticas');
requireText(guard, "collection('tenantId').doc(tenant).collection(name).get()", 'lectura tenant aislada');

requireText(bridge, '__firestoreLabExplicit', 'adapter Firestore explícito');
requireText(bridge, 'identitiesIntersect', 'reconciliación por identidad');
requireText(bridge, 'canonicalAdvisorKey', 'clave canónica');
requireText(bridge, 'findExisting', 'búsqueda de usuario existente');
requireText(bridge, 'id: existing.id', 'conservación del ID self-service');
requireText(bridge, 'missingCanonicals', 'faltantes por identidad');
requireText(bridge, 'persistAndVerify', 'verificación previa a escritura');
requireText(bridge, 'dryRunPhase', 'dry-run sin escritura de catálogo');

requireText(init, 'backend-lab-advisor-write-bridge.js?v=20260715-7', 'bridge runtime 7');
requireText(init, 'importar-initial-tenant-lab.js?v=20260715-7', 'importador runtime 7');
requireText(importer, 'canonicalUser', 'usuario Firebase canónico');
requireText(importer, 'readCriticalDirect', 'lectura crítica directa');
requireText(importer, 'writeQueue', 'gate de cola de escritura');
requireText(importer, 'writeErrors', 'gate de errores de escritura');

requireText(equipo, 'rolDefault', 'rol predeterminado');
requireText(equipo, 'scopeDatos', 'alcance de datos');
requireText(equipo, 'modulosExtra', 'módulos extra');
requireText(equipo, 'modulosRestringidos', 'módulos restringidos');
requireText(equipo, 'Países autorizados', 'países por usuario');
requireText(equipo, 'Producción nueva', 'meta nueva');
requireText(equipo, 'Renovaciones', 'meta renovación');
requireText(equipo, 'Recaudo', 'meta recaudo');
requireText(equipo, 'Historial de cambios', 'auditoría visible');
requireText(equipo, 'el formulario no se cierra al hacer clic fuera', 'modal persistente');

if (config.schemaVersion !== 'orbit360.tenant-advisors.v1') throw new Error('READINESS_CONTRACT_FAIL: schema asesores');
if (config.tenantId !== 'alianzas-soluciones') throw new Error('READINESS_CONTRACT_FAIL: tenant asesores');
if (!Array.isArray(config.advisors) || config.advisors.length !== 7) throw new Error('READINESS_CONTRACT_FAIL: conteo asesores');

console.log('LAB_IMPORT_READINESS_CONTRACT_OK');