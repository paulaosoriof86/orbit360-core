#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { adjudicateRows, EXPECTED } from './orbit360-adjudicate-block1-universe-readonly-v23-v20260807.mjs';
import { V23_RENDER_SIGNAL_VERSION } from './orbit360-event-driven-render-observer-v23.mjs';

const matrixPath = 'tools/orbit360-block1-native-matrix-v23-canonical-v20260807.mjs';
const implementationPath = 'tools/orbit360-block1-native-matrix-v23-v20260807.mjs';
const observerPath = 'tools/orbit360-event-driven-render-observer-v23.mjs';
const adjudicatorPath = 'tools/orbit360-adjudicate-block1-universe-readonly-v23-v20260807.mjs';
const matrix = fs.readFileSync(matrixPath, 'utf8');
const implementation = fs.readFileSync(implementationPath, 'utf8');
const observer = fs.readFileSync(observerPath, 'utf8');
const adjudicator = fs.readFileSync(adjudicatorPath, 'utf8');
const checks = {};

for (const file of [matrixPath, implementationPath, observerPath, adjudicatorPath]) {
  const run = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  checks['syntax:' + path.basename(file)] = run.status === 0;
}
const validate = spawnSync(process.execPath, [matrixPath], { encoding: 'utf8', env: { ...process.env, ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY: '1' } });
let validation = {};
try { validation = JSON.parse((validate.stdout || '').trim().split(/\r?\n/).filter(Boolean).pop() || '{}'); } catch {}
checks.exactNativeImport = validate.status === 0 && validation.status === 'PASS_V23_NATIVE_MATRIX_IMPORT' && validation.ok === true;
checks.exactCanonicalContract = validation.sourceContract && validation.sourceContract.contractVersion === '1.0.41' && validation.sourceContract.schemaVersion === 'orbit360-block1-client360-insurers-native-matrix-v23-canonical-1.0.41';
checks.exactSameRuntimeFile = validation.sourceContract && validation.sourceContract.nativeSource === true && validation.sourceContract.sharedImplementationImport === implementationPath;
checks.nativeNotGenerated = validation.sourceContract && validation.sourceContract.generatedFromPriorArtifact === false && validation.sourceContract.textualTransform === false && validation.sourceContract.sourceSurgery === false;
checks.roleScopedTargetContract = validation.sourceContract && validation.sourceContract.roleScopedTargets === true && implementation.includes('async function roleScopedTargets(page)') && implementation.includes('cliente360-role-scoped-target-exists') && implementation.includes('aseguradoras-role-scoped-target-exists');
checks.noGlobalEntityTargetSelector = !implementation.includes('async function selectTargets(db)') && !implementation.includes('async function entityTargets(db)');
checks.noV21Builder = !matrix.includes('buildV21MatrixArtifact') && !implementation.includes('buildV21MatrixArtifact') && !implementation.includes('buildV22MatrixArtifact');
checks.noTextualSurgery = [matrix, implementation].every(source => !source.includes('source.replace(') && !source.includes('source.match(') && !source.includes('source.slice(') && !source.includes('testRolePattern') && !source.includes('mainBlockPattern'));
checks.blockingRoutesExact = implementation.includes("Object.freeze(['inicio', 'cliente360', 'aseguradoras'])") && JSON.stringify(validation.sourceContract.blockingRoutes) === JSON.stringify(['inicio','cliente360','aseguradoras']);
checks.legacyRoutesNonblocking = ['polizas','cobros','ops','leads','conciliaciones','cancelaciones'].every(x => implementation.includes(`'${x}'`)) && implementation.includes('V23_NONBLOCKING_LEDGER');
checks.detailTargetsNonblocking = ['vehicle-detail-button','receipt-detail-button','cobro-detail-button'].every(x => implementation.includes(x));
checks.threeRoles = implementation.includes("role: 'Direccion'") && implementation.includes("role: 'Operativo'") && implementation.includes("role: 'Asesor'");
checks.eventApiImported = implementation.includes("from './orbit360-event-driven-render-observer-v23.mjs'") && implementation.includes('navigateObserved(') && matrix.includes("from './orbit360-event-driven-render-observer-v23.mjs'");
checks.eventMutationObserver = observer.includes('new MutationObserver') && observer.includes('orbit360:v23-render-complete') && observer.includes(V23_RENDER_SIGNAL_VERSION);
checks.observerBeforeNavigation = observer.indexOf('const token = await armRenderObserver') < observer.indexOf("location.hash = '#/' + value");
checks.noRenderPolling = !observer.includes('async function waitRenderReady') && observer.includes('Promise.race([eventPromise, channelTimeout])');
checks.timeoutClassification = observer.includes('VALIDATOR_STALE_RENDER_SIGNAL_POST_READY') && observer.includes('FUNCTIONAL_RENDER_EVENT_TIMEOUT_NOT_READY');
checks.zeroWriteContract = implementation.includes('firestoreWrites: 0') && implementation.includes('authWrites: 0') && implementation.includes('operationalWrites: 0');
checks.legalOwnerReal = implementation.includes("page.check('[data-legal-gate] #lg-chk')") && implementation.includes("page.click('[data-legal-gate] #lg-ok')") && implementation.includes('legal-idempotent-once');
checks.mobileMenu = implementation.includes('mobile-menu-opens') && implementation.includes('mobile-menu-closes');
checks.clientAndInsurerContracts = ['cliente360-list','cliente360-detail','cliente360-quality-visible','cliente360-empty-relations-honest','aseguradoras-directory','aseguradoras-detail','aseguradoras-knowledge'].every(x => implementation.includes(x));
checks.technicalCopyGate = implementation.includes('cliente360-no-technical-copy') && implementation.includes('aseguradoras-no-technical-copy');
checks.snapshotRequired = implementation.includes("snapshotIntegrity = snapshotsEqual(result.before, result.after) ? 'VERIFIED_UNCHANGED' : 'CHANGED'");
checks.canonicalEntrypointPersistsFinal = matrix.includes('output.contractVersion = V23_CANONICAL_CONTRACT_VERSION') && matrix.includes("output.canonicalRuntimeArtifact = 'tools/orbit360-block1-native-matrix-v23-canonical-v20260807.mjs'");

const makeRows = (count, kind, mutate = () => ({})) => Array.from({ length: count }, (_, i) => ({ id: `${kind}-${i}`, data: { pais: 'GT', moneda: 'GTQ', estado: 'Activo', identificacion: kind === 'clientes' ? `C${i}` : undefined, nit: kind === 'aseguradoras' ? `N${i}` : undefined, codigo: kind === 'asesores' ? `A${i}` : undefined, ...mutate(i) } }));
const clients = makeRows(430, 'clientes', i => i >= 414 ? { estado: 'Historico' } : {});
const insurers = makeRows(30, 'aseguradoras', i => i >= 26 ? { vinculada: false } : {});
const advisors = makeRows(7, 'asesores');
const c = adjudicateRows('clientes', clients, EXPECTED.clientes);
const a = adjudicateRows('aseguradoras', insurers, EXPECTED.aseguradoras);
const s = adjudicateRows('asesores', advisors, EXPECTED.asesores);
checks.universeSyntheticReconciles = c.effective === 414 && a.effective === 26 && s.effective === 7;
const validationRow = makeRows(415, 'clientes', i => i === 414 ? { estado: 'Requiere validacion' } : {});
const v = adjudicateRows('clientes', validationRow, EXPECTED.clientes);
checks.requiresValidationNotExcluded = v.effective === 415 && v.categories.requiresValidation === 1 && v.classification !== 'PASS_DATA_CONTRACT';
checks.noPiiEvidenceContract = adjudicator.includes('containsPII: false') && adjudicator.includes('containsNames: false') && adjudicator.includes('containsEmails: false');
checks.adjudicatorNoWrites = adjudicator.includes('firestoreWrites: 0') && adjudicator.includes('authWrites: 0') && adjudicator.includes('operationalWrites: 0') && adjudicator.includes('reimport: false');

const failedCheckIds = Object.entries(checks).filter(([, ok]) => ok !== true).map(([id]) => id);
const output = {
  schemaVersion: 'orbit360-v23-native-block1-source-test-v3-canonical-owner-1.0.41',
  status: failedCheckIds.length ? 'STOP_V23_NATIVE_BLOCK1_SOURCE' : 'PASS_V23_NATIVE_BLOCK1_SOURCE_ONLY',
  classification: failedCheckIds.length ? 'PIPELINE_MECHANISM_FAILURE' : 'VALIDATOR_STALE_AND_PIPELINE_MECHANISM_CORRECTED_SOURCE_ONLY',
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(v => v === true).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  exactRuntimeFile: matrixPath,
  nativeImplementation: implementationPath,
  contractVersion: '1.0.41',
  renderSignalVersion: V23_RENDER_SIGNAL_VERSION,
  secretsRead: false,
  firebaseAccess: false,
  hostingTouched: false,
  browserExecuted: false,
  writes: 0,
  productionTouched: false,
  ok: failedCheckIds.length === 0
};
console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 41);
