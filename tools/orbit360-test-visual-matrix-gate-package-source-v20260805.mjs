#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805';
const CONTRACT = '2.7.8';
const REQUEST = '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
const VALIDATOR = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
const ENGINE = 'tools/orbit360-validar-gate-contracts-engine-visual-matrix-corrected-post-auth-lab-v20260805.mjs';
const LEGACY = 'tools/orbit360-validar-gate-contracts-legacy-v20260717.mjs';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json';
const PREFLIGHT = 'tools/orbit360-preflight-visual-matrix-corrected-post-auth-once-v20260805.sh';
const RUNNER = 'tools/orbit360-run-visual-matrix-corrected-post-auth-runtime-only-v20260805.sh';
const SEALER = 'tools/orbit360-seal-visual-matrix-corrected-post-auth-runtime-v20260805.mjs';
const MATRIX = 'tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs';
const ROOTFIX = 'orbit360-platform/core/visual-runtime-rootfix-v20260805.js';
const REGISTRATION = 'orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-corrected-post-auth-gate-registration-sanitized-v20260805.json';
const EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-gate-package-source-test-sanitized-v20260805.json';
const SYNTHETIC = 'orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-gate-canonical-synthetic-sanitized-v20260805.json';
const CAUSE_DOC = 'orbit360-platform/docs/CIERRE-CAUSA-RAIZ-PAQUETE-GATE-VISUAL-278-20260805.md';
const PLAN_DOC = 'orbit360-platform/docs/ACTUALIZACION-PLAN-GATE-VISUAL-278-20260805.md';
const ACADEMIA_DOC = 'orbit360-platform/docs/ACADEMIA-GATE-VISUAL-278-SIN-GENERADORES-20260805.md';
const RETIRED = [
  'tools/orbit360-prepare-visual-matrix-corrected-post-auth-gate-v20260805.mjs',
  'tools/orbit360-fix-prepare-visual-matrix-gate-template-v20260805.mjs'
];

const abs = rel => path.join(ROOT, rel);
const exists = rel => fs.existsSync(abs(rel));
const text = rel => fs.readFileSync(abs(rel), 'utf8');
const json = rel => JSON.parse(text(rel));
const nodeSyntax = rel => spawnSync(process.execPath, ['--check', abs(rel)], { encoding: 'utf8' }).status === 0;
const bashSyntax = rel => spawnSync('bash', ['-n', abs(rel)], { encoding: 'utf8' }).status === 0;
const count = (source, token) => source.split(token).length - 1;

const validator = text(VALIDATOR);
const engine = text(ENGINE);
const lifecycle = json(LIFECYCLE);
const preflight = text(PREFLIGHT);
const runner = text(RUNNER);
const sealer = text(SEALER);
const matrix = text(MATRIX);
const rootfix = text(ROOTFIX);
const synthetic = json(SYNTHETIC);

const entry = `"${GATE}":{contractVersion:"${CONTRACT}",lifecycle:"${LIFECYCLE}",engine:"${ENGINE}"}`;
const phase = '"VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION":{secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false}';
const serviceAccountAt = runner.indexOf('SERVICE_ACCOUNT=');
const canonicalGateCheckAt = runner.indexOf('.status=="GO_GATE_CONTRACT"');
const backupAt = runner.indexOf('firebase hosting:clone "$PROJECT:live"');
const deployAt = runner.indexOf('firebase deploy --project "$PROJECT" --only hosting');
const precheckAt = runner.indexOf('orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs');
const matrixAt = runner.indexOf('orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs');
const rollbackAt = runner.indexOf('rollback_if_needed');

function sealerStateMachinePass() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-sealer-278-'));
  try {
    const lifecycleFile = path.join(temp, 'lifecycle.json');
    const preflightFile = path.join(temp, 'preflight.json');
    const precheckFile = path.join(temp, 'precheck.json');
    const matrixFile = path.join(temp, 'matrix.json');
    const finalFile = path.join(temp, 'final.json');
    const closureFile = path.join(temp, 'closure.md');
    fs.writeFileSync(lifecycleFile, JSON.stringify(lifecycle, null, 2));
    fs.writeFileSync(preflightFile, JSON.stringify({ status: 'GO_GATE_CONTRACT', total: 28 }));
    fs.writeFileSync(precheckFile, JSON.stringify({
      stage: 'PASS_VISUAL_BROWSER_PRECHECK', checkpoint: 'INICIO_READY_PASS',
      firestoreReads: 1, firestoreWrites: 0, authWrites: 0, operationalWrites: 0, ok: true
    }));
    fs.writeFileSync(matrixFile, JSON.stringify({
      stage: 'PASS_VISUAL_OBSERVABLE_ROOTFIX_MATRIX', classification: 'PASS_VISUAL_POST_AUTH',
      currentCheckpoint: 'MATRIX_COMPLETE', snapshotIntegrity: 'VERIFIED_UNCHANGED',
      totalRoleFailures: 0, totalWarnings: 1,
      captureWarnings: [{ checkpoint: 'DIRECCION_CAPTURE', blocking: false }],
      roles: [{ role: 'Direccion' }, { role: 'Operativo' }, { role: 'Asesor' }],
      firestoreReads: 1, firestoreWrites: 0, authWrites: 0, operationalWrites: 0, ok: true
    }));
    const env = {
      ...process.env,
      ORBIT360_PREFLIGHT_EVIDENCE: preflightFile,
      ORBIT360_PRECHECK_EVIDENCE: precheckFile,
      ORBIT360_MATRIX_EVIDENCE: matrixFile,
      ORBIT360_FINAL_EVIDENCE: finalFile,
      ORBIT360_LIFECYCLE: lifecycleFile,
      ORBIT360_CLOSURE: closureFile,
      REGISTRATION_OUTCOME: 'success', PREFLIGHT_OUTCOME: 'success',
      CREDENTIAL_OUTCOME: 'success', RUNTIME_OUTCOME: 'success',
      BACKUP_OUTCOME: 'success', DEPLOY_OUTCOME: 'success',
      PRECHECK_OUTCOME: 'success', MATRIX_OUTCOME: 'success',
      ROLLBACK_OUTCOME: 'skipped', DEPLOY_ATTEMPTED: '1',
      GITHUB_RUN_ID: 'synthetic-278', GITHUB_RUN_ATTEMPT: '1'
    };
    const run = spawnSync(process.execPath, [abs(SEALER)], { cwd: ROOT, env, encoding: 'utf8' });
    if (run.status !== 0 || !fs.existsSync(finalFile)) return false;
    const final = JSON.parse(fs.readFileSync(finalFile, 'utf8'));
    const consumed = JSON.parse(fs.readFileSync(lifecycleFile, 'utf8'));
    return final.decision === 'PASS_VISUAL_POST_AUTH' && final.ok === true &&
      final.captureWarnings.length === 1 && final.captureWarnings[0].blocking === false &&
      final.snapshotIntegrity === 'VERIFIED_UNCHANGED' && final.totalRoleFailures === 0 &&
      final.firestoreWrites === 0 && final.authWrites === 0 && final.operationalWrites === 0 &&
      consumed.status === 'CONSUMED_PASS' && consumed.requestConsumed === true &&
      consumed.allowedExecutions === 0 && consumed.protectedState.passVisualPostAuth === true;
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

const checks = {
  validatorSyntax: nodeSyntax(VALIDATOR),
  engineSyntax: nodeSyntax(ENGINE),
  sealerSyntax: nodeSyntax(SEALER),
  sourceTestSyntax: nodeSyntax('tools/orbit360-test-visual-matrix-gate-package-source-v20260805.mjs'),
  preflightSyntax: bashSyntax(PREFLIGHT),
  runnerSyntax: bashSyntax(RUNNER),
  gateRegisteredExactlyOnce: count(validator, entry) === 1,
  legacyRouterPreserved:
    exists(LEGACY) && validator.includes("const LEGACY_ROUTER = 'tools/orbit360-validar-gate-contracts-legacy-v20260717.mjs'") &&
    validator.includes("legacyDelegateBlob: '03d1c45db555a3e482afb4be6aaf8d29c74a79dc'"),
  phaseRegisteredExactlyOnce: count(validator, phase) === 1,
  lifecycleIdentity:
    lifecycle.gateId === GATE &&
    lifecycle.gateContractVersion === CONTRACT &&
    lifecycle.validatorLifecycleRevision === 'phase-capability-contract-v1',
  lifecycleRequestAbsent:
    lifecycle.status === 'AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST' &&
    lifecycle.activeRequest === false &&
    lifecycle.requestConsumed === false &&
    lifecycle.authorizationReserved === true &&
    lifecycle.allowedExecutions === 1,
  lifecycleZeroWrites:
    lifecycle.writeAuthorized === false &&
    lifecycle.functionsDeployAuthorized === false &&
    lifecycle.rulesDeployAuthorized === false &&
    lifecycle.productionAuthorized === false &&
    lifecycle.protectedState.firestoreWritesAuthorized === 0 &&
    lifecycle.protectedState.authWritesAuthorized === 0 &&
    lifecycle.protectedState.operationalWritesAuthorized === 0,
  requestStillAbsent: !exists(REQUEST),
  canonicalSyntheticPass:
    synthetic.status === 'PASS_CANONICAL_GATE_SYNTHETIC' &&
    synthetic.total === 28 && synthetic.failed === 0 && synthetic.ok === true &&
    synthetic.syntheticRequestPersisted === false && synthetic.secretsRead === false &&
    synthetic.browserExecuted === false && synthetic.deployExecuted === false,
  sealerStateMachinePass: sealerStateMachinePass(),
  failedRunsDocumented:
    lifecycle.sourcePrerequisites.failedPreparationRuns.includes('31070060298') &&
    lifecycle.sourcePrerequisites.failedPreparationRuns.includes('31070172625') &&
    lifecycle.sourcePrerequisites.failedPreparationCheckpoint === 'TEMPLATE_TOKEN_COUNT_0',
  generatorsRetired:
    lifecycle.sourcePrerequisites.generatorRetired === true &&
    RETIRED.every(file => !exists(file)),
  independentOwnersExist: [ENGINE, LIFECYCLE, PREFLIGHT, RUNNER, SEALER].every(exists),
  canonicalPreflightCommand:
    preflight.includes('node tools/orbit360-validar-gate-contracts-v20260717.mjs "$GATE"'),
  preflightBeforeSecrets:
    !/SERVICE_ACCOUNT|FIREBASE_SERVICE_ACCOUNT|playwright|firebase deploy|hosting:clone/.test(preflight),
  runtimeSecretAfterGate:
    canonicalGateCheckAt >= 0 && serviceAccountAt > canonicalGateCheckAt,
  runtimeOrdered:
    backupAt > serviceAccountAt && deployAt > backupAt && precheckAt > deployAt && matrixAt > precheckAt,
  rollbackPresent:
    rollbackAt >= 0 && runner.includes('firebase hosting:clone "$PROJECT:$BACKUP_CHANNEL" "$PROJECT:live"'),
  hostingOnlyDeploy:
    count(runner, 'firebase deploy --project "$PROJECT" --only hosting') === 1 &&
    !runner.includes('--only functions') && !runner.includes('--only firestore:rules'),
  noOperationalWriteApis:
    !/runTransaction|writeBatch|createUser|updateUser|deleteUser/.test(runner + '\n' + sealer),
  matrixCaptureCorrected:
    matrix.includes('const CAPTURE_TIMEOUT_MS = 12000;') &&
    matrix.includes('fullPage: false') &&
    !matrix.includes('fullPage: true') &&
    matrix.includes('blocking: false'),
  immutableWrapperPreserved:
    rootfix.includes('moduleWrapState') &&
    rootfix.includes('observer-fallback') &&
    rootfix.includes('Object.isFrozen'),
  noNestedGeneratorInOwners:
    !/write\((ENGINE|RUNNER|SEALER|PREFLIGHT)/.test(engine + '\n' + runner + '\n' + sealer + '\n' + preflight),
  docsPresent: [CAUSE_DOC, PLAN_DOC, ACADEMIA_DOC].every(exists),
  evidencePathsSanitized:
    [REGISTRATION, EVIDENCE].every(file => file.includes('sanitized')),
  noSecretsOrRuntime:
    !process.env.FIREBASE_SERVICE_ACCOUNT_ORBIT360_LAB &&
    !process.env.GOOGLE_APPLICATION_CREDENTIALS
};

const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
const base = {
  gateId: GATE,
  contractVersion: CONTRACT,
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  generatorRetired: true,
  requestCreated: false,
  secretsRead: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  browserExecuted: false,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: failedCheckIds.length === 0
};
const registration = {
  schemaVersion: 'orbit360-visual-matrix-corrected-post-auth-gate-registration-v2',
  ...base,
  status: base.ok ? 'PASS_GATE_REGISTRATION' : 'FAIL_GATE_REGISTRATION',
  classification: base.ok ? 'PIPELINE_MECHANISM_FAILURE_CLOSED_SOURCE_ONLY' : 'VALIDATOR_STALE'
};
const evidence = {
  schemaVersion: 'orbit360-visual-matrix-gate-package-source-test-v1',
  ...base,
  status: base.ok ? 'PASS_VISUAL_MATRIX_GATE_PACKAGE_SOURCE_ONLY' : 'FAIL_VISUAL_MATRIX_GATE_PACKAGE_SOURCE_ONLY',
  classification: base.ok ? 'PIPELINE_MECHANISM_FAILURE_CLOSED_SOURCE_ONLY' : 'PIPELINE_MECHANISM_FAILURE',
  syntheticCanonicalGatePending: false,
  canonicalSyntheticStatus: synthetic.status,
  fixtureOnly: process.env.ORBIT360_SYNTHETIC_FIXTURE === '1',
  sourcePackageOnly: true
};

for (const [file, payload] of [[REGISTRATION, registration], [EVIDENCE, evidence]]) {
  fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
  fs.writeFileSync(abs(file), JSON.stringify(payload, null, 2) + '\n', 'utf8');
}
console.log(JSON.stringify(evidence, null, 2));
process.exit(evidence.ok ? 0 : 41);
