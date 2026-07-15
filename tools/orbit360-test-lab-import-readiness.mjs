import fs from 'node:fs';

const guardPath = 'orbit360-platform/core/backend-lab-import-readiness-guard.js';
const initPath = 'orbit360-platform/core/backend-lab-init.js';
const importPath = 'orbit360-platform/modules/importar-initial-tenant-lab.js';
const advisorConfigPath = 'orbit360-platform/data/tenant-config/alianzas-soluciones.asesores.json';

const guard = fs.readFileSync(guardPath, 'utf8');
const init = fs.readFileSync(initPath, 'utf8');
const importer = fs.readFileSync(importPath, 'utf8');
const advisorConfig = JSON.parse(fs.readFileSync(advisorConfigPath, 'utf8'));

function must(text, pattern, label) {
  if (!pattern.test(text)) throw new Error(`READINESS_CONTRACT_FAIL: ${label}`);
}

must(guard, /orbit\.lab@demo\.com/, 'correo LAB canónico');
must(guard, /expectedUid/, 'UID esperado desde OrbitBackend');
must(guard, /Orbit\.store\._labStatus\s*=\s*function/, 'sincronización del estado del store');
must(guard, /OrbitBackend\.status\s*=\s*function/, 'sincronización del estado backend');
must(guard, /CRITICAL\s*=\s*\['clientes',\s*'aseguradoras',\s*'asesores'\]/, 'colecciones críticas explícitas');
must(guard, /function\s+readCollection\s*\(/, 'lectura directa por colección');
must(guard, /db\.collection\('tenantId'\)\.doc\(tenant\)\.collection\(name\)\.get\(\)/, 'ruta Firestore tenant aislada');
must(guard, /function\s+loadCriticalCollections\s*\(/, 'orquestación de lectura crítica');
must(guard, /Promise\.all\(CRITICAL\.map/, 'lectura conjunta de colecciones críticas');
must(guard, /replaceStoreCollection\(name,\s*rows\)/, 'sincronización de lectura con Orbit.store');
must(guard, /snapshotAttached/, 'compatibilidad con gate de snapshots');
must(guard, /_attachSnapshots/, 'listeners en segundo plano');
must(guard, /data-dry/, 'intercepción del dry-run');
must(guard, /data-write/, 'intercepción de escritura');
must(guard, /data-rollback/, 'intercepción de rollback');
must(guard, /stopImmediatePropagation/, 'bloqueo antes del handler operativo');
must(init, /backend-lab-import-readiness-guard\.js/, 'integración del guard al runtime');
must(init, /importar-initial-tenant-lab\.js\?v=20260715-2/, 'cache-bust del importador autocontenido');
must(importer, /function\s+canonicalUser\s*\(/, 'importador valida usuario Firebase canónico');
must(importer, /async\s+function\s+readCriticalDirect\s*\(/, 'importador ejecuta lectura crítica propia');
must(importer, /await\s+readCriticalDirect\(false\)/, 'dry-run espera lectura crítica inicial');
must(importer, /await\s+ensureAdvisorCatalog\(current\.auth\)/, 'dry-run sincroniza catálogo controlado de asesores');
must(importer, /Orbit\.store\.update\('asesores'/, 'catálogo usa exclusivamente Orbit.store');
must(importer, /current\.writeQueue/, 'catálogo verifica cola real del adapter');
must(importer, /current\.writeErrors/, 'catálogo verifica errores reales del adapter');
must(importer, /relevantPending\.length/, 'catálogo espera fin de pendientes');
must(importer, /missing\.length/, 'catálogo exige presencia de siete registros');
must(importer, /await\s+waitCatalog\(ids\)/, 'catálogo espera confirmación de escritura');
must(importer, /await\s+readCriticalDirect\(true\)/, 'dry-run relee colecciones después del catálogo');
must(importer, /db\.collection\('tenantId'\)\.doc\(tenant\(\)\)\.collection\(name\)\.get\(\)/, 'fallback de lectura usa ruta tenant aislada');
must(importer, /if\s*\(!current\.auth\s*\|\|\s*!current\.auth\.uid\)/, 'importador conserva gate de sesión real');

if (advisorConfig.schemaVersion !== 'orbit360.tenant-advisors.v1') throw new Error('READINESS_CONTRACT_FAIL: schema de asesores');
if (advisorConfig.tenantId !== 'alianzas-soluciones') throw new Error('READINESS_CONTRACT_FAIL: tenant de asesores');
if (!Array.isArray(advisorConfig.advisors) || advisorConfig.advisors.length !== 7) throw new Error('READINESS_CONTRACT_FAIL: conteo de asesores');
const expectedNames = ['Paula Osorio','Fernando Arias','Carlos Castro','Johanna Salgado','Braulio Hernández','Nicole Castro','Samuel Daza'];
const actualNames = new Set(advisorConfig.advisors.map(row => row.nombre));
expectedNames.forEach(name => { if (!actualNames.has(name)) throw new Error(`READINESS_CONTRACT_FAIL: falta asesor ${name}`); });

console.log('LAB_IMPORT_READINESS_CONTRACT_OK');
