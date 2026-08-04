#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(path.join(ROOT, rel), value, 'utf8');
function replaceExact(source, before, after, code) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`PIPELINE_MECHANISM_FAILURE:${code}`);
  return source.replace(before, after);
}

{
  const rel = 'orbit360-platform/core/backend-lab-loader.js';
  let source = read(rel);
  source = replaceExact(source, 'Backend LAB loader v1.112', 'Backend LAB loader v1.113', 'LOADER_HEADER_VERSION');
  source = replaceExact(
    source,
    "  var isCanonicalLabHost = hostname === 'ays-orbit-360-lab.web.app' || hostname === 'ays-orbit-360-lab.firebaseapp.com';\n  var isPreviewLabHost = /^ays-orbit-360-lab--orbit360-ays-lab-[a-z0-9-]+\\.web\\.app$/i.test(hostname);\n  var isAuthorizedLabHost = isCanonicalLabHost || isPreviewLabHost;",
    "  var isCanonicalLabHost = hostname === 'ays-orbit-360-lab.web.app' || hostname === 'ays-orbit-360-lab.firebaseapp.com';\n  var isAysPreviewLabHost = /^ays-orbit-360-lab--orbit360-ays-lab-[a-z0-9-]+\\.web\\.app$/i.test(hostname);\n  var isOperationalVerificationPreviewHost = /^ays-orbit-360-lab--orbit360-operational-block12-[a-z0-9-]+\\.web\\.app$/i.test(hostname);\n  var isAuthorizedLabHost = isCanonicalLabHost || isAysPreviewLabHost || isOperationalVerificationPreviewHost;\n  var isTenantBoundAysHost = isCanonicalLabHost || isAysPreviewLabHost;",
    'LOADER_PREVIEW_HOST_CONTRACT'
  );
  source = replaceExact(source, '  if (isAuthorizedLabHost) {', '  if (isTenantBoundAysHost) {', 'LOADER_CANONICALIZATION_BOUNDARY');
  source = replaceExact(
    source,
    "  var requestedTenant = params.get('tenant') || 'alianzas-soluciones';\n  var allowedTenants = ['alianzas-soluciones'];",
    "  var requestedTenant = params.get('tenant') || 'alianzas-soluciones';\n  var verificationMode = /^(1|auto)$/i.test(params.get('orbitVerify') || '');\n  var isSyntheticVerificationTenant = isOperationalVerificationPreviewHost && verificationMode && /^verify-block12-[0-9]+$/.test(requestedTenant);\n  var allowedTenants = ['alianzas-soluciones'];\n  if (isSyntheticVerificationTenant) allowedTenants.push(requestedTenant);",
    'LOADER_SYNTHETIC_TENANT_ALLOWLIST'
  );
  source = replaceExact(
    source,
    "loaderVersion: 'v1.112-canonical-host-fail-closed',",
    "loaderVersion: 'v1.113-synthetic-verification-fail-closed',",
    'LOADER_RUNTIME_VERSION'
  );
  source = replaceExact(
    source,
    "    canonicalHost: isCanonicalLabHost,",
    "    canonicalHost: isCanonicalLabHost,\n    operationalVerificationPreview: isOperationalVerificationPreviewHost,\n    syntheticVerificationTenant: isSyntheticVerificationTenant,",
    'LOADER_RUNTIME_DIAGNOSTICS'
  );
  write(rel, source);
}

{
  const rel = 'orbit360-platform/index.html';
  let source = read(rel);
  source = replaceExact(
    source,
    '<script src="core/backend-lab-loader.js?v=20260801-canonical-v79"></script><script src="core/backend-lab-init.js?v=20260801-canonical-v79"></script>',
    '<script src="core/backend-lab-loader.js?v=20260804-operational-rootfix7"></script><script src="core/backend-lab-init.js?v=20260804-operational-rootfix7"></script>',
    'INDEX_LAB_BOOTSTRAP_CACHE_BUST'
  );
  write(rel, source);
}

{
  const rel = 'tools/orbit360-block12-operational-runtime-lab-v20260804.mjs';
  let source = read(rel);
  source = replaceExact(
    source,
    "classification: safe(error).split(':')[0] || 'PIPELINE_MECHANISM_FAILURE'",
    "classification: ((safe(error).match(/(SECURITY_FAILURE|FUNCTIONAL_DEFECT|VALIDATOR_STALE|DATA_CONTRACT_FAILURE|ENVIRONMENT_FAILURE|PIPELINE_MECHANISM_FAILURE)/) || [])[1] || 'PIPELINE_MECHANISM_FAILURE')",
    'BROWSER_CLASSIFICATION_PARSER'
  );
  source = replaceExact(source, "contractVersion: '12.0.0',", "contractVersion: '12.0.6',", 'FINAL_CONTRACT_VERSION');
  write(rel, source);
}

{
  const rel = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
  let source = read(rel);
  source = replaceExact(
    source,
    '"block12-operational-runtime-lab-v20260804":{contractVersion:"12.0.5",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs"}',
    '"block12-operational-runtime-lab-v20260804":{contractVersion:"12.0.6",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs"}',
    'ROUTER_BLOCK12_1206'
  );
  write(rel, source);
}

{
  const rel = 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs';
  let source = read(rel);
  source = replaceExact(source, "const VERSION = '12.0.5';", "const VERSION = '12.0.6';", 'ENGINE_VERSION_1206');
  source = replaceExact(
    source,
    "const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-rootfix6-v20260804.json';",
    "const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-rootfix7-v20260804.json';",
    'ENGINE_REQUEST_ROOTFIX7'
  );
  source = replaceExact(
    source,
    "  '.github/workflows/orbit360-block12-operational-runtime-lab-rootfix6-v20260804.yml',",
    "  '.github/workflows/orbit360-block12-operational-runtime-lab-rootfix7-v20260804.yml',\n  'orbit360-platform/core/backend-lab-loader.js',\n  'orbit360-platform/index.html',",
    'ENGINE_REQUIRED_ROOTFIX7'
  );
  source = replaceExact(
    source,
    "lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_BROWSER_HARNESS_ROOTFIX_READY'",
    "lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_SYNTHETIC_LOADER_ROOTFIX_READY'",
    'ENGINE_LIFECYCLE_ROOTFIX7'
  );
  const oldRequest = "request.schemaVersion === 'orbit360-block12-operational-runtime-lab-rootfix6-request-v1' && request.status === 'AUTHORIZED_AFTER_BROWSER_HARNESS_ROOTFIX' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === true && request.previousRuntimeRunId === 30956309298 && request.previousRuntimeStatus === 'cancelled' && request.previousFailureClassification === 'PIPELINE_MECHANISM_FAILURE' && request.previousFailureCode === 'BROWSER_BOOTSTRAP_WAIT_TIMEOUT_WITHOUT_FINALLY_CLOSE' && request.previousScenariosPassed === 0 && request.previousScenariosFailed === 0 && request.previousRollbackExact === true && request.previousRealTenantUnchanged === true && request.rescueRunId === 30959450996 && request.rescueStatus === 'RUNTIME_HANG_RESCUE_PASS' && request.dependencyValidationRunId === 30950155722 && request.dependencyValidationStatus === 'FUNCTIONS_BOOTSTRAP_LOAD_PASS' && request.authorizationRef === lifecycle.authorization.source";
  const newRequest = "request.schemaVersion === 'orbit360-block12-operational-runtime-lab-rootfix7-request-v1' && request.status === 'AUTHORIZED_AFTER_SYNTHETIC_LOADER_ROOTFIX' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === true && request.previousRuntimeRunId === 30959959221 && request.previousRuntimeStatus === 'failure' && request.previousFailureClassification === 'DATA_CONTRACT_FAILURE' && request.previousFailureCode === 'SYNTHETIC_TENANT_BLOCKED_BY_LAB_LOADER_ALLOWLIST' && request.previousBootstrapState === 'sdk-not-ready' && request.previousFirebasePresent === false && request.previousRuntimeCenterPresent === true && request.previousScenariosPassed === 0 && request.previousScenariosFailed === 0 && request.previousRollbackExact === true && request.previousRealTenantUnchanged === true && request.browserHarnessRootfixHead === 'ae3f55968948c18f1c6ae40fdce93ee6552890d0' && request.dependencyValidationRunId === 30950155722 && request.dependencyValidationStatus === 'FUNCTIONS_BOOTSTRAP_LOAD_PASS' && request.authorizationRef === lifecycle.authorization.source";
  source = replaceExact(source, oldRequest, newRequest, 'ENGINE_REQUEST_ACTIVE_ROOTFIX7');
  source = replaceExact(
    source,
    "  const rootfixWorkflow = readText('.github/workflows/orbit360-block12-operational-runtime-lab-rootfix6-v20260804.yml');",
    "  const rootfixWorkflow = readText('.github/workflows/orbit360-block12-operational-runtime-lab-rootfix7-v20260804.yml');",
    'ENGINE_WORKFLOW_READ_ROOTFIX7'
  );
  source = replaceExact(
    source,
    "  add('BROWSER_HARNESS_ROOTFIX', scope.browserBootstrapDiagnosticsRequired === true && scope.browserCloseFinallyRequired === true && scope.callTimeoutRequired === true && scope.hardProcessTimeoutRequired === true && harness.includes(\"schemaVersion: 'orbit360-block12-browser-v2'\") && harness.includes('BROWSER_PHASE_ERROR') && harness.includes('if (browser) await browser.close().catch') && readText('orbit360-platform/core/runtime-verification-center-v20260804.js').includes('withTimeout') && rootfixWorkflow.includes('timeout --signal=TERM --kill-after=15s 420s'));",
    "  add('BROWSER_HARNESS_ROOTFIX', scope.browserBootstrapDiagnosticsRequired === true && scope.browserCloseFinallyRequired === true && scope.callTimeoutRequired === true && scope.hardProcessTimeoutRequired === true && harness.includes(\"schemaVersion: 'orbit360-block12-browser-v2'\") && harness.includes('BROWSER_PHASE_ERROR') && harness.includes('if (browser) await browser.close().catch') && readText('orbit360-platform/core/runtime-verification-center-v20260804.js').includes('withTimeout') && rootfixWorkflow.includes('timeout --signal=TERM --kill-after=15s 420s'));\n  const loader = readText('orbit360-platform/core/backend-lab-loader.js');\n  const index = readText('orbit360-platform/index.html');\n  add('SYNTHETIC_LOADER_CONTRACT', scope.syntheticTenantPattern === '^verify-block12-[0-9]+$' && scope.syntheticTenantAllowedOnlyOnOperationalPreview === true && scope.syntheticTenantRequiresVerificationMode === true && loader.includes('isOperationalVerificationPreviewHost') && loader.includes('isSyntheticVerificationTenant') && loader.includes('/^verify-block12-[0-9]+$/') && loader.includes('if (isSyntheticVerificationTenant) allowedTenants.push(requestedTenant)') && index.includes('backend-lab-loader.js?v=20260804-operational-rootfix7'));",
    'ENGINE_SYNTHETIC_LOADER_CHECK'
  );
  write(rel, source);
}

const assertions = [
  ['orbit360-platform/core/backend-lab-loader.js', 'v1.113-synthetic-verification-fail-closed'],
  ['orbit360-platform/core/backend-lab-loader.js', 'isSyntheticVerificationTenant'],
  ['orbit360-platform/index.html', 'backend-lab-loader.js?v=20260804-operational-rootfix7'],
  ['tools/orbit360-block12-operational-runtime-lab-v20260804.mjs', "contractVersion: '12.0.6'"],
  ['tools/orbit360-validar-gate-contracts-v20260717.mjs', 'contractVersion:"12.0.6"'],
  ['tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs', "const VERSION = '12.0.6'"],
  ['tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs', 'SYNTHETIC_LOADER_CONTRACT']
];
for (const [rel, token] of assertions) if (!read(rel).includes(token)) throw new Error(`PIPELINE_MECHANISM_FAILURE:ROOTFIX7_ASSERTION:${rel}:${token}`);
console.log(JSON.stringify({
  schemaVersion:'orbit360-block12-synthetic-loader-rootfix-materialization-v1',
  status:'BLOCK12_SYNTHETIC_LOADER_ROOTFIX_MATERIALIZED',
  gateContractVersion:'12.0.6',
  previousRuntimeRunId:30959959221,
  previousFailure:'SYNTHETIC_TENANT_BLOCKED_BY_LAB_LOADER_ALLOWLIST',
  syntheticPattern:'verify-block12-[0-9]+',
  operationalPreviewOnly:true,
  verificationModeRequired:true,
  arbitraryTenantAllowed:false,
  canonicalTenantBoundaryPreserved:true,
  secretAccess:false,
  firestoreRead:false,
  deployExecuted:false,
  ok:true
}, null, 2));
