#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import vm from 'node:vm';

const ROOTFIX = 'orbit360-platform/core/visual-runtime-rootfix-v20260805.js';
const LOADER = 'orbit360-platform/core/backend-lab-loader.js';
const rootfix = fs.readFileSync(ROOTFIX, 'utf8');
const loader = fs.readFileSync(LOADER, 'utf8');

function has(value) { return rootfix.includes(value); }
function loaderHas(value) { return loader.includes(value); }
function syntaxOk(source, filename) {
  try { new vm.Script(source, { filename }); return true; }
  catch (error) { return false; }
}

const checks = {
  rootfixSyntax: syntaxOk(rootfix, ROOTFIX),
  loaderSyntax: syntaxOk(loader, LOADER),
  labOnly: has("params.get('orbitBackend') === 'firestore-lab'"),
  rememberSessionUi: has('lg-remember') && has('Mantener sesión iniciada en este dispositivo'),
  noPasswordPersistence: !/localStorage\.setItem\([^\n]*(pass|password|contrase)/i.test(rootfix),
  persistenceLocalOrSession: has('P.LOCAL') && has('P.SESSION'),
  deadLoginHelpRemoved: has("dead.remove()"),
  hydrationDependencies: has('MODULE_DEPS') && has('rawCounts') && has('snapshotErrors'),
  noPartialKpiCopy: has('evitamos cifras parciales o cambiantes'),
  hydrationTimeout: has('20500') && has('20'),
  clientSummaryIndex: has('buildSummaryCache') && has('clientesResumenIndex'),
  cacheInvalidation: has('SUMMARY_COLLECTIONS') && has('summaryCache = null'),
  vehicleDetail: has('openVehicleDetail') && has('Ver detalle'),
  receiptCobroExplicitDetail: has('enhanceExplicitDetails') && has('cobros.detalle'),
  reconciliationEmptyState: has('No hay conciliaciones activas para revisión'),
  cancellationEmptyState: has('No hay cancelaciones registradas en el corte activo'),
  opsLeadsDiagnostic: has('Ejecutar prueba en vivo') && has('diagnosticResult'),
  diagnosticReadOnlyCopy: has('Escrituras realizadas: 0'),
  responsive1100: has('@media(max-width:1100px)') && has('grid-template-columns:repeat(2'),
  responsive760: has('@media(max-width:760px)') && has('grid-template-columns:1fr!important'),
  noFirestoreWrites: !/\.set\(|\.add\(|\.update\(|\.delete\(|runTransaction|writeBatch|batch\(/.test(rootfix),
  noAuthWrites: !/createUser|updateUser|deleteUser|updatePassword|sendPasswordReset/.test(rootfix),
  noDeployLogic: !/firebase\s+deploy|hosting:channel|gcloud|deployExecuted\s*=\s*true/i.test(rootfix),
  noSecrets: !/SERVICE_ACCOUNT|PRIVATE_KEY|apiKey\s*[:=]\s*['"][^'"]+/.test(rootfix),
  loaderReferencesRootfix: loaderHas("write('core/visual-runtime-rootfix-v20260805.js?v=20260805-1')"),
  loaderVersionAdvanced: loaderHas("loaderVersion: 'v1.115-visual-hydration-rootfix'"),
  noTechnicalClientCopy: !/(Firebase|Firestore|localStorage|LAB|mock|demo|smoke)/.test(rootfix.match(/innerHTML\s*=\s*['"`][\s\S]*?;/g)?.join('\n') || ''),
  versionMarker: has("var VERSION = '20260805.1'") && has('__visualRuntimeRootfixV20260805')
};

const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
const output = {
  schemaVersion: 'orbit360-visual-runtime-rootfix-source-test-v1',
  status: failedCheckIds.length ? 'FAIL_VISUAL_RUNTIME_ROOTFIX_SOURCE' : 'PASS_VISUAL_RUNTIME_ROOTFIX_SOURCE',
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  sourceOnly: true,
  browserExecuted: false,
  secretsRead: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: failedCheckIds.length === 0
};
console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exitCode = 41;
