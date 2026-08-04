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
  const rel = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
  let source = read(rel);
  source = replaceExact(
    source,
    '"block12-operational-runtime-lab-v20260804":{contractVersion:"12.0.1",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs"}',
    '"block12-operational-runtime-lab-v20260804":{contractVersion:"12.0.2",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs"}',
    'ROUTER_BLOCK12_VERSION_1202'
  );
  write(rel, source);
}

{
  const rel = 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs';
  let source = read(rel);
  source = replaceExact(source, "const VERSION = '12.0.1';", "const VERSION = '12.0.2';", 'ENGINE_VERSION_1202');
  source = replaceExact(
    source,
    "const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-rootfix4-v20260804.json';",
    "const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-rootfix5-v20260804.json';",
    'ENGINE_REQUEST_ROOTFIX5'
  );
  source = replaceExact(
    source,
    "'.github/workflows/orbit360-block12-operational-runtime-lab-rootfix4-v20260804.yml',",
    "'.github/workflows/orbit360-block12-operational-runtime-lab-rootfix5-v20260804.yml',",
    'ENGINE_WORKFLOW_ROOTFIX5'
  );
  source = replaceExact(
    source,
    "lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_DEPENDENCY_ROOTFIX_READY'",
    "lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_ARTIFACT_POLICY_ROOTFIX_READY'",
    'ENGINE_LIFECYCLE_ROOTFIX5'
  );
  source = replaceExact(
    source,
    "request.schemaVersion === 'orbit360-block12-operational-runtime-lab-rootfix4-request-v1' && request.status === 'AUTHORIZED_AFTER_DEPENDENCY_PASS' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === true && Array.isArray(request.previousRuntimeRunIds) && request.previousRuntimeRunIds.join(',') === '30945951133,30948708843,30949139231' && request.dependencyValidationRunId === 30950155722 && request.dependencyValidationStatus === 'FUNCTIONS_BOOTSTRAP_LOAD_PASS' && request.authorizationRef === lifecycle.authorization.source",
    "request.schemaVersion === 'orbit360-block12-operational-runtime-lab-rootfix5-request-v1' && request.status === 'AUTHORIZED_AFTER_ARTIFACT_POLICY_ROOTFIX' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === true && Array.isArray(request.previousRuntimeRunIds) && request.previousRuntimeRunIds.join(',') === '30945951133,30948708843,30949139231,30950465823' && request.dependencyValidationRunId === 30950155722 && request.dependencyValidationStatus === 'FUNCTIONS_BOOTSTRAP_LOAD_PASS' && request.previousFailureClassification === 'PIPELINE_MECHANISM_FAILURE' && request.previousFailureCode === 'FUNCTIONS_CREATED_ARTIFACT_CLEANUP_POLICY_EXIT_1' && request.previousFunctionsCreated === 4 && request.previousFunctionsDeletedByRollback === 4 && request.authorizationRef === lifecycle.authorization.source",
    'ENGINE_REQUEST_ACTIVE_ROOTFIX5'
  );
  source = replaceExact(
    source,
    "add('EVIDENCE_AND_ROLLBACK', scope.snapshotBeforeAfter === true && scope.rollbackSyntheticTenant === true && scope.rollbackSyntheticAuth === true && scope.inPlatformVerificationCenter === true && scope.autoRunSupported === true && scope.sanitizedEvidence === true && scope.cumulativeVisualCandidate === true);",
    "add('EVIDENCE_AND_ROLLBACK', scope.snapshotBeforeAfter === true && scope.rollbackSyntheticTenant === true && scope.rollbackSyntheticAuth === true && scope.rollbackVerdictSeparatedFromRuntimeVerdict === true && scope.inPlatformVerificationCenter === true && scope.autoRunSupported === true && scope.sanitizedEvidence === true && scope.cumulativeVisualCandidate === true);\n  const rootfixWorkflow = readText('.github/workflows/orbit360-block12-operational-runtime-lab-rootfix5-v20260804.yml');\n  add('DEPLOY_PIPELINE_ROOTFIX', scope.artifactCleanupPolicyAutomatic === true && scope.postDeployFunctionVerificationRequired === true && rootfixWorkflow.includes('firebase deploy') && rootfixWorkflow.includes('--force') && rootfixWorkflow.includes('FUNCTIONS_VERIFIED_4_OF_4') && rootfixWorkflow.includes('rollback.exact == true') && rootfixWorkflow.includes('realTenant.unchanged == true'));",
    'ENGINE_DEPLOY_PIPELINE_ROOTFIX_CHECK'
  );
  write(rel, source);
}

const engine = read('tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs');
const router = read('tools/orbit360-validar-gate-contracts-v20260717.mjs');
for (const token of [
  "const VERSION = '12.0.2'",
  'rootfix5-v20260804.json',
  'AUTHORIZED_AFTER_ARTIFACT_POLICY_ROOTFIX',
  'FUNCTIONS_CREATED_ARTIFACT_CLEANUP_POLICY_EXIT_1',
  'DEPLOY_PIPELINE_ROOTFIX',
  'rootfix5-v20260804.yml'
]) {
  if (!engine.includes(token)) throw new Error(`PIPELINE_MECHANISM_FAILURE:ROOTFIX5_ENGINE_TOKEN_MISSING:${token}`);
}
if (!router.includes('contractVersion:"12.0.2"')) throw new Error('PIPELINE_MECHANISM_FAILURE:ROOTFIX5_ROUTER_VERSION_MISSING');
console.log(JSON.stringify({
  schemaVersion: 'orbit360-block12-rootfix5-materialization-v1',
  status: 'BLOCK12_ARTIFACT_POLICY_ROOTFIX_MATERIALIZED',
  previousRunId: 30950465823,
  previousFailure: 'FUNCTIONS_CREATED_ARTIFACT_CLEANUP_POLICY_EXIT_1',
  gateContractVersion: '12.0.2',
  artifactCleanupPolicyAutomatic: true,
  postDeployFunctionVerificationRequired: true,
  rollbackVerdictSeparatedFromRuntimeVerdict: true,
  secretAccess: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  deployExecuted: false,
  ok: true
}, null, 2));
