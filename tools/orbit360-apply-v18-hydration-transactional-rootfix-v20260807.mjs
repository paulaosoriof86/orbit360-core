#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const files = {
  hydration: 'orbit360-platform/core/visual-runtime-hydration-contract-v20260805.js',
  precheck: 'tools/orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs',
  runner: 'tools/orbit360-run-visual-matrix-corrected-post-auth-runtime-only-v3-cross-runner-v20260806.sh',
  sealer: 'tools/orbit360-seal-visual-matrix-corrected-post-auth-runtime-v20260805.mjs'
};

function read(file) { return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''); }
function write(file, value) { fs.writeFileSync(file, value, 'utf8'); }
function once(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`PATCH_ANCHOR_MISSING:${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`PATCH_ANCHOR_NON_UNIQUE:${label}`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

let hydration = read(files.hydration);
hydration = hydration.replace("var VERSION = '20260807.3-advisor-cache-unified-readiness';", "var VERSION = '20260807.4-transactional-owner-reentrant-readiness';");
hydration = once(hydration,
`  var installed = false;\n  var installedStore = null;\n  var listenersBound = false;`,
`  var installed = false;\n  var installedStore = null;\n  var boundStore = null;\n  var storeOwnerGeneration = 0;\n  var listenersBound = false;`,
'owner-vars');

hydration = once(hydration,
`  function installAdvisorProjection() {\n    if (!Orbit.store) return false;\n    if (Orbit.store.__advisorProjectionV20260805) return true;\n    originalStore = {\n      all: Orbit.store.all.bind(Orbit.store),\n      get: Orbit.store.get.bind(Orbit.store),\n      where: Orbit.store.where.bind(Orbit.store),\n      find: Orbit.store.find.bind(Orbit.store)\n    };`,
`  function originalStoreReady() {\n    return !!(originalStore && ['all', 'get', 'where', 'find'].every(function (name) { return typeof originalStore[name] === 'function'; }));\n  }\n  function originalStatusReady() { return typeof originalStatus === 'function'; }\n  function ownerValid() {\n    return !!(boundStore && boundStore === Orbit.store && originalStoreReady() && originalStatusReady());\n  }\n  function resetBoundOwnerForStoreChange() {\n    installed = false;\n    installedStore = null;\n    originalStatus = null;\n    originalStore = null;\n    lastActualStatus = null;\n    projectionListenerBound = false;\n    invalidateAdvisorProjection();\n    advisorProjectionAuthSignature = '';\n    unifiedModuleWrapState = {};\n    routeWaiters = {};\n  }\n  function bindStoreOwner() {\n    if (!Orbit.store || typeof Orbit.store.all !== 'function' || typeof Orbit.store.get !== 'function' || typeof Orbit.store.where !== 'function' || typeof Orbit.store.find !== 'function' || typeof Orbit.store._labStatus !== 'function') return false;\n    if (boundStore === Orbit.store && originalStoreReady() && originalStatusReady()) return true;\n    if (boundStore && boundStore !== Orbit.store) resetBoundOwnerForStoreChange();\n    if (boundStore === Orbit.store && (!originalStoreReady() || !originalStatusReady())) return false;\n    if (Orbit.store.__advisorProjectionV20260805 || Orbit.store.__visualHydrationContractV20260805) return false;\n    boundStore = Orbit.store;\n    originalStore = {\n      all: Orbit.store.all.bind(Orbit.store),\n      get: Orbit.store.get.bind(Orbit.store),\n      where: Orbit.store.where.bind(Orbit.store),\n      find: Orbit.store.find.bind(Orbit.store)\n    };\n    originalStatus = Orbit.store._labStatus.bind(Orbit.store);\n    storeOwnerGeneration += 1;\n    return ownerValid();\n  }\n\n  function installAdvisorProjection() {\n    if (!Orbit.store || !ownerValid()) return false;\n    if (Orbit.store.__advisorProjectionV20260805) return originalStoreReady();`,
'bind-store-owner');

hydration = once(hydration,
`  function installStatusContract() {\n    if (!Orbit.store || typeof Orbit.store._labStatus !== 'function') return false;\n    if (Orbit.store.__visualHydrationContractV20260805) return true;\n    originalStatus = Orbit.store._labStatus.bind(Orbit.store);\n    Orbit.store._labStatus = maskedStatus;`,
`  function installStatusContract() {\n    if (!Orbit.store || !ownerValid()) return false;\n    if (Orbit.store.__visualHydrationContractV20260805) return originalStatusReady();\n    Orbit.store._labStatus = maskedStatus;`,
'status-owner-capture');

hydration = once(hydration,
`      storeBound: installedStore === Orbit.store,\n      readinessAuthority: 'OrbitHydrationContractDiagnostics',`,
`      storeBound: boundStore === Orbit.store && ownerValid(),\n      ownerValid: ownerValid(),\n      storeOwnerGeneration: storeOwnerGeneration,\n      readinessAuthority: 'OrbitHydrationContractDiagnostics',`,
'masked-status-owner');

hydration = once(hydration,
`      mounted: function () {\n        var modulesReady = Object.keys(CONTRACTS).every(function (name) {\n          var mod = Orbit.modules && Orbit.modules[name];\n          return !!(mod && mod.__visualHydrationReadinessV17);\n        });\n        return !!(installed && installedStore === Orbit.store && Orbit.store && Orbit.store.__visualHydrationContractV20260805 && modulesReady);\n      },`,
`      mounted: function () {\n        var modulesReady = Object.keys(CONTRACTS).every(function (name) {\n          var mod = Orbit.modules && Orbit.modules[name];\n          return !!(mod && mod.__visualHydrationReadinessV17);\n        });\n        return !!(installed && installedStore === Orbit.store && boundStore === Orbit.store && ownerValid() && Orbit.store && Orbit.store.__visualHydrationContractV20260805 && Orbit.store.__advisorProjectionV20260805 && modulesReady);\n      },\n      ownerValid: function () { return ownerValid(); },\n      storeOwner: function () {\n        return { valid: ownerValid(), generation: storeOwnerGeneration, bound: boundStore === Orbit.store, originalStoreReady: originalStoreReady(), originalStatusReady: originalStatusReady(), writes: 0 };\n      },`,
'diagnostics-mounted-owner');

hydration = once(hydration,
`  function install() {\n    if (!window.Orbit || !Orbit.store || !Orbit.q || !Orbit.modules) return false;\n    if (installedStore !== Orbit.store) {\n      installed = false;\n      installedStore = null;\n      originalStatus = null;\n      originalStore = null;\n      lastActualStatus = null;\n      projectionListenerBound = false;\n      invalidateAdvisorProjection();\n      advisorProjectionAuthSignature = '';\n      unifiedModuleWrapState = {};\n    }\n    if (!installAdvisorProjection()) return false;\n    if (!installStatusContract()) return false;\n    if (!installUnifiedModuleReadiness()) return false;\n    injectStyle();\n    installed = true;\n    installedStore = Orbit.store;\n    exposeDiagnostics();\n    bindUiObserversOnce();\n    document.body.dataset.visualHydrationContractV20260805 = VERSION;\n    document.body.dataset.visualHydrationContractStoreBound = 'true';\n    document.body.dataset.visualReadinessAuthority = 'OrbitHydrationContractDiagnostics';\n    setTimeout(paintDegradedState, 0);\n    return true;\n  }`,
`  function install() {\n    if (!window.Orbit || !Orbit.store) return false;\n    if (!bindStoreOwner()) return false;\n    exposeDiagnostics();\n    if (!Orbit.q || !Orbit.modules) return false;\n    if (!installAdvisorProjection()) return false;\n    if (!installStatusContract()) return false;\n    exposeDiagnostics();\n    if (!installUnifiedModuleReadiness()) return false;\n    injectStyle();\n    installed = true;\n    installedStore = Orbit.store;\n    exposeDiagnostics();\n    bindUiObserversOnce();\n    document.body.dataset.visualHydrationContractV20260805 = VERSION;\n    document.body.dataset.visualHydrationContractStoreBound = 'true';\n    document.body.dataset.visualHydrationOwnerValid = ownerValid() ? 'true' : 'false';\n    document.body.dataset.visualReadinessAuthority = 'OrbitHydrationContractDiagnostics';\n    setTimeout(paintDegradedState, 0);\n    return true;\n  }`,
'install-transactional');
write(files.hydration, hydration);

let precheck = read(files.precheck);
precheck = precheck.replace("schemaVersion: 'orbit360-visual-runtime-rootfix-browser-precheck-v2-hydration-contract-aware'", "schemaVersion: 'orbit360-visual-runtime-rootfix-browser-precheck-v3-transactional-owner-aware'");
precheck = once(precheck,
`  projectId: PROJECT,\n  tenantId: TENANT,`,
`  projectId: PROJECT,\n  tenantId: TENANT,\n  runId: process.env.GITHUB_RUN_ID || '',\n  attempt: Number(process.env.GITHUB_RUN_ATTEMPT || 1),`,
'precheck-run-identity');
precheck = once(precheck,
`            mounted: !!(diagnostics && typeof diagnostics.mounted === 'function' && diagnostics.mounted()),\n            ready: !!(state && state.ready === true),`,
`            mounted: !!(diagnostics && typeof diagnostics.mounted === 'function' && diagnostics.mounted()),\n            ownerValid: !!(diagnostics && typeof diagnostics.ownerValid === 'function' && diagnostics.ownerValid()),\n            storeOwner: diagnostics && typeof diagnostics.storeOwner === 'function' ? diagnostics.storeOwner() : null,\n            ready: !!(state && state.ready === true),`,
'precheck-hydration-owner-state');
precheck = once(precheck,
`        hydrationContractMounted: hydration.mounted === true,\n        hydrationInicioReady: hydration.ready === true,`,
`        hydrationContractMounted: hydration.mounted === true,\n        hydrationOwnerValid: hydration.ownerValid === true,\n        hydrationInicioReady: hydration.ready === true,`,
'precheck-owner-top-level');
precheck = once(precheck,
`  await waitObservable(page, () => !!(window.firebase && typeof firebase.auth === 'function'), 'FIREBASE_AUTH', 30000);`,
`  await waitObservable(page, () => !!(\n    window.OrbitHydrationContractDiagnostics &&\n    typeof OrbitHydrationContractDiagnostics.ownerValid === 'function' &&\n    OrbitHydrationContractDiagnostics.ownerValid()\n  ), 'HYDRATION_OWNER_VALID', 10000);\n  await waitObservable(page, () => !!(window.firebase && typeof firebase.auth === 'function'), 'FIREBASE_AUTH', 30000);`,
'precheck-owner-checkpoint');
precheck = once(precheck,
`  if (result.checkpoint.startsWith('HYDRATION_CONTRACT_MOUNTED')) result.classification = 'PIPELINE_MECHANISM_FAILURE';\n  else if (result.checkpoint.startsWith('INICIO_REQUIRED_HYDRATION')) result.classification = 'DATA_CONTRACT_FAILURE';\n  else result.classification = result.checkpoint.includes('TIMEOUT') ? 'VALIDATOR_STALE_OR_PRODUCT_WAIT_IDENTIFIED' : (/DATA_CONTRACT/.test(message) ? 'DATA_CONTRACT_FAILURE' : 'PIPELINE_MECHANISM_FAILURE');`,
`  const observed = result.observedState || {};\n  const hydrationOwnerLost = observed.membershipReady === true && observed.membershipTenantBound === true && observed.hydrationContractLoaded === true && (\n    observed.hydrationOwnerValid === false ||\n    observed.hydration?.ownerValid === false ||\n    (observed.hydrationContractMounted === true && observed.lab?.status === '' && observed.lab?.snapshotAttached === false && Number(observed.lab?.snapshotAttachedCount || 0) === 0)\n  );\n  if (result.checkpoint.startsWith('HYDRATION_CONTRACT_MOUNTED') || result.checkpoint.startsWith('HYDRATION_OWNER_VALID') || hydrationOwnerLost) {\n    result.classification = 'PIPELINE_MECHANISM_FAILURE';\n    result.rootCauseHint = 'HYDRATION_PARTIAL_INSTALL_REENTRANCY_STATE_LOSS';\n  } else if (result.checkpoint.startsWith('INICIO_REQUIRED_HYDRATION')) result.classification = 'DATA_CONTRACT_FAILURE';\n  else result.classification = result.checkpoint.includes('TIMEOUT') ? 'VALIDATOR_STALE_OR_PRODUCT_WAIT_IDENTIFIED' : (/DATA_CONTRACT/.test(message) ? 'DATA_CONTRACT_FAILURE' : 'PIPELINE_MECHANISM_FAILURE');`,
'precheck-classifier');
write(files.precheck, precheck);

let runner = read(files.runner);
runner = once(runner,
`source "$SIGNAL_LIB"\n\nwrite_runtime_state() {`,
`source "$SIGNAL_LIB"\n\nreset_run_evidence() {\n  rm -f "$PRECHECK" "$MATRIX" "$SUPERVISOR" "$FINAL"\n  rm -rf "$ARTIFACT_DIR"\n  mkdir -p "$ARTIFACT_DIR"\n  echo "PASS_RUNTIME_EVIDENCE_RESET run=${GITHUB_RUN_ID:-local}"\n}\n\nwrite_runtime_state() {`,
'runner-reset-function');
runner = once(runner,
`' "$PREFLIGHT" >/dev/null || { PREFLIGHT_OUTCOME='failure'; stop; }\n\nSERVICE_ACCOUNT=`,
`' "$PREFLIGHT" >/dev/null || { PREFLIGHT_OUTCOME='failure'; stop; }\n\nreset_run_evidence\nwrite_runtime_state\n\nSERVICE_ACCOUNT=`,
'runner-reset-call');
write(files.runner, runner);

let sealer = read(files.sealer);
sealer = once(sealer,
`  matrixStage: matrix && matrix.stage || 'NOT_EXECUTED',\n  matrixCheckpoint: matrix && (matrix.currentCheckpoint || matrix.checkpoint) || 'NOT_EXECUTED',\n  roleResults: roles,\n  totalRoleFailures: matrix && matrix.totalRoleFailures != null ? matrix.totalRoleFailures : null,\n  totalWarnings: matrix && matrix.totalWarnings != null ? matrix.totalWarnings : captureWarnings.length,\n  captureWarnings,\n  snapshotIntegrity,\n  firestoreReads: Number(precheck && precheck.firestoreReads || 0) + Number(matrix && matrix.firestoreReads || 0),`,
`  matrixStage: outcomes.matrix === 'skipped' ? 'NOT_EXECUTED' : matrix && matrix.stage || 'NOT_EXECUTED',\n  matrixCheckpoint: outcomes.matrix === 'skipped' ? 'NOT_EXECUTED' : matrix && (matrix.currentCheckpoint || matrix.checkpoint) || 'NOT_EXECUTED',\n  roleResults: outcomes.matrix === 'skipped' ? [] : roles,\n  totalRoleFailures: outcomes.matrix === 'skipped' ? null : matrix && matrix.totalRoleFailures != null ? matrix.totalRoleFailures : null,\n  totalWarnings: outcomes.matrix === 'skipped' ? 0 : matrix && matrix.totalWarnings != null ? matrix.totalWarnings : captureWarnings.length,\n  captureWarnings: outcomes.matrix === 'skipped' ? [] : captureWarnings,\n  snapshotIntegrity,\n  firestoreReads: Number(precheck && precheck.firestoreReads || 0) + (outcomes.matrix === 'skipped' ? 0 : Number(matrix && matrix.firestoreReads || 0)),`,
'sealer-no-stale-matrix');
write(files.sealer, sealer);

console.log(JSON.stringify({
  status: 'PASS_V18_TRANSACTIONAL_HYDRATION_SOURCE_PATCH_APPLIED',
  classification: 'PIPELINE_MECHANISM_FAILURE_CORRECTED_SOURCE_ONLY',
  files: Object.values(files),
  runtimeExecuted: false,
  secretsRead: false,
  firebaseAccess: false,
  hostingTouched: false,
  browserExecuted: false,
  deployExecuted: false,
  writes: 0,
  ok: true
}, null, 2));