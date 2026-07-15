import fs from 'node:fs';

const guardPath = 'orbit360-platform/core/backend-lab-import-readiness-guard.js';
const bridgePath = 'orbit360-platform/core/backend-lab-advisor-write-bridge.js';
const initPath = 'orbit360-platform/core/backend-lab-init.js';
const importPath = 'orbit360-platform/modules/importar-initial-tenant-lab.js';
const advisorConfigPath = 'orbit360-platform/data/tenant-config/alianzas-soluciones.asesores.json';

const guard = fs.readFileSync(guardPath, 'utf8');
const bridge = fs.readFileSync(bridgePath, 'utf8');
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
must(guard, /data-dry/, 'intercepción del dry-run');
must(guard, /data-write/, 'intercepción de escritura');
must(guard, /data-rollback/, 'intercepción de rollback');
must(guard, /stopImmediatePropagation/, 'bloqueo antes del handler operativo');

must(bridge, /store\.__firestoreLabExplicit\s*!==\s*true/, 'guard espera adapter Firestore LAB explícito');
must(bridge, /dryRunPhase/, 'guard separa fase de dry-run');
must(bridge, /collection === 'asesores' \|\| collection === 'configuracion_catalogo'/, 'dry-run intercepta únicamente catálogo');
must(bridge, /store\.all\s*=\s*function/, 'catálogo canónico disponible en all');
must(bridge, /store\.get\s*=\s*function/, 'catálogo canónico disponible en get');
must(bridge, /return originalUpdate\(collection, id, patch\)/, 'escritura real conservada fuera del dry-run');
must(bridge, /db\.collection\('tenantId'\)\.doc\(tenant\)\.collection\('asesores'\)\.get\(\)/, 'confirmación lee asesores directamente de Firestore');
must(bridge, /persistAndVerify/, 'confirmación exige persistencia del catálogo');
must(bridge, /Firestore no confirmó/, 'confirmación bloquea asesores faltantes');
must(bridge, /\[data-ays-initial-modal\] \[data-dry\]/, 'captura controlada de dry-run');
must(bridge, /\[data-ays-initial-modal\] \[data-write\]/, 'captura controlada de confirmación');
must(bridge, /await Promise\.resolve\(dryButton\.onclick\(\)\)/, 'dry-run original se ejecuta dentro de fase solo lectura');
must(bridge, /await window\.OrbitLabAdvisorWriteBridge\.persistAndVerify\(\)/, 'carga principal espera verificación del catálogo');

must(init, /backend-lab-advisor-write-bridge\.js\?v=20260715-6/, 'guard v6 cargado antes del importador');
must(init, /importar-initial-tenant-lab\.js\?v=20260715-6/, 'cache-bust v6 del importador autocontenido');
must(importer, /function\s+canonicalUser\s*\(/, 'importador valida usuario Firebase canónico');
must(importer, /function\s+readCriticalDirect\s*\(/, 'importador ejecuta lectura crítica propia');
must(importer, /await\s+readCriticalDirect\(false\)/, 'dry-run espera lectura crítica inicial');
must(importer, /await\s+ensureAdvisorCatalog\(current\.auth\)/, 'dry-run usa catálogo controlado');
must(importer, /Orbit\.store\.update\('asesores'/, 'catálogo usa exclusivamente Orbit.store');
must(importer, /writeQueue/, 'catálogo conserva gate de cola real');
must(importer, /writeErrors/, 'catálogo conserva gate de errores reales');
must(importer, /await\s+readCriticalDirect\(true\)/, 'dry-run relee colecciones después del catálogo');
must(importer, /if\s*\(!current\.auth\s*\|\|\s*!current\.auth\.uid\)/, 'importador conserva gate de sesión real');

if (advisorConfig.schemaVersion !== 'orbit360.tenant-advisors.v1') throw new Error('READINESS_CONTRACT_FAIL: schema de asesores');
if (advisorConfig.tenantId !== 'alianzas-soluciones') throw new Error('READINESS_CONTRACT_FAIL: tenant de asesores');
if (!Array.isArray(advisorConfig.advisors) || advisorConfig.advisors.length !== 7) throw new Error('READINESS_CONTRACT_FAIL: conteo de asesores');
const expectedNames = ['Paula Osorio','Fernando Arias','Carlos Castro','Johanna Salgado','Braulio Hernández','Nicole Castro','Samuel Daza'];
const actualNames = new Set(advisorConfig.advisors.map(row => row.nombre));
expectedNames.forEach(name => { if (!actualNames.has(name)) throw new Error(`READINESS_CONTRACT_FAIL: falta asesor ${name}`); });

console.log('LAB_IMPORT_READINESS_CONTRACT_OK');
