#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ENGINE = 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs';
const EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/functions-dependency-rootfix-source-v20260804.json';
const file = path.join(ROOT, ENGINE);
let source = fs.readFileSync(file, 'utf8');
function replaceExact(before, after, code) {
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`PIPELINE_MECHANISM_FAILURE:${code}`);
  source = source.replace(before, after);
}
replaceExact(
  "const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-rootfix2-v20260804.json';",
  "const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-rootfix4-v20260804.json';",
  'ROOTFIX4_REQUEST_PATH'
);
replaceExact(
  "lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_ROOTFIX_AUTHORIZED'",
  "lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_DEPENDENCY_ROOTFIX_READY'",
  'ROOTFIX4_LIFECYCLE_STATUS'
);
replaceExact(
  "request.schemaVersion === 'orbit360-block12-operational-runtime-lab-rootfix2-request-v1' && request.status === 'AUTHORIZED_ROOTFIX_CONTINUATION' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === true && Array.isArray(request.previousRunIds) && request.previousRunIds.length === 2 && request.previousRunIds[0] === 30945951133 && request.previousRunIds[1] === 30948708843 && request.previousRunsStoppedBeforeSecrets === true && request.authorizationRef === lifecycle.authorization.source",
  "request.schemaVersion === 'orbit360-block12-operational-runtime-lab-rootfix4-request-v1' && request.status === 'AUTHORIZED_AFTER_DEPENDENCY_PASS' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === true && Array.isArray(request.previousRuntimeRunIds) && request.previousRuntimeRunIds.join(',') === '30945951133,30948708843,30949139231' && request.dependencyValidationRunId === 30950155722 && request.dependencyValidationStatus === 'FUNCTIONS_BOOTSTRAP_LOAD_PASS' && request.authorizationRef === lifecycle.authorization.source",
  'ROOTFIX4_REQUEST_ACTIVE'
);
replaceExact(
  "'.github/workflows/orbit360-block12-operational-runtime-lab-rootfix2-v20260804.yml'",
  "'.github/workflows/orbit360-block12-operational-runtime-lab-rootfix4-v20260804.yml',\n  'functions/package-lock.json',\n  'tools/orbit360-validar-functions-runtime-dependencies-v20260804.mjs',\n  'orbit360-platform/runtime-gate-crm-v20260716/functions-dependency-rootfix-source-v20260804.json'",
  'ROOTFIX4_REQUIRED_FILES'
);
replaceExact(
  "add('EVIDENCE_AND_ROLLBACK', scope.snapshotBeforeAfter === true && scope.rollbackSyntheticTenant === true && scope.rollbackSyntheticAuth === true && scope.inPlatformVerificationCenter === true && scope.autoRunSupported === true && scope.sanitizedEvidence === true && scope.cumulativeVisualCandidate === true);",
  "add('EVIDENCE_AND_ROLLBACK', scope.snapshotBeforeAfter === true && scope.rollbackSyntheticTenant === true && scope.rollbackSyntheticAuth === true && scope.inPlatformVerificationCenter === true && scope.autoRunSupported === true && scope.sanitizedEvidence === true && scope.cumulativeVisualCandidate === true);\n  const dependencyEvidence = readJson('orbit360-platform/runtime-gate-crm-v20260716/functions-dependency-rootfix-source-v20260804.json');\n  add('FUNCTIONS_DEPENDENCY_PASS', scope.functionsPackageLockRequired === true && scope.functionsBootstrapLoadPassRequired === true && dependencyEvidence.status === 'FUNCTIONS_BOOTSTRAP_LOAD_PASS' && dependencyEvidence.classification === 'GO_SOURCE_REPRODUCIBLE_FUNCTIONS_RUNTIME' && dependencyEvidence.requiredFunctionExports === true && dependencyEvidence.broadV2AggregatorLoaded === false && dependencyEvidence.unusedDatabaseProviderLoaded === false && dependencyEvidence.lockfileVersion >= 3 && dependencyEvidence.ok === true);",
  'ROOTFIX4_DEPENDENCY_CHECK'
);
fs.writeFileSync(file, source, 'utf8');
for (const token of ['rootfix4-v20260804.json','AUTHORIZED_AFTER_DEPENDENCY_PASS','FUNCTIONS_DEPENDENCY_PASS','functions/package-lock.json','rootfix4-v20260804.yml']) {
  if (!source.includes(token)) throw new Error(`PIPELINE_MECHANISM_FAILURE:ROOTFIX4_BINDING_MISSING:${token}`);
}
const evidence = JSON.parse(fs.readFileSync(path.join(ROOT, EVIDENCE), 'utf8'));
if (evidence.status !== 'FUNCTIONS_BOOTSTRAP_LOAD_PASS' || evidence.ok !== true) throw new Error('DATA_CONTRACT_FAILURE:DEPENDENCY_EVIDENCE_NOT_PASS');
console.log(JSON.stringify({schemaVersion:'orbit360-block12-rootfix4-binding-v1',status:'BLOCK12_ROOTFIX4_BINDING_MATERIALIZED',dependencyValidationRunId:30950155722,dependencyStatus:evidence.status,secretAccess:false,firestoreRead:false,deployExecuted:false,ok:true},null,2));
