import fs from 'node:fs';

const guardPath = 'orbit360-platform/core/backend-lab-import-readiness-guard.js';
const initPath = 'orbit360-platform/core/backend-lab-init.js';
const importPath = 'orbit360-platform/modules/importar-initial-tenant-lab.js';

const guard = fs.readFileSync(guardPath, 'utf8');
const init = fs.readFileSync(initPath, 'utf8');
const importer = fs.readFileSync(importPath, 'utf8');

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
must(importer, /if\(!z\.auth\|\|!z\.auth\.uid\)/, 'importador conserva gate de sesión');
must(importer, /if\(!z\.snapshotAttached\)/, 'importador conserva gate de readiness');

console.log('LAB_IMPORT_READINESS_CONTRACT_OK');
