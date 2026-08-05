#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const RC = 'RC-AYS-LAB-CANONICA-01';
const CONTRACT_GATE = 'block12-operational-runtime-lab-v20260804';
const CLOSURE_GATE = 'PASS_REQUEST_V4_PROVENANCE_COMPOSITION';
const SOURCE_BASELINE = '548cffa50cddfd93ad2118f5a06e9bb420699bde';
const SOURCE_REQUEST = '.github/orbit360-requests/block12-go-lab-candidate-visible-v4-source-only.json';
const RUNTIME_REQUEST = '.github/orbit360-requests/block12-go-lab-candidate-visible-v4.json';
const CONSUMED_V3 = '.github/orbit360-requests/block12-go-lab-candidate-visible-v3.json';
const CANONICAL_CONSUMED_REQUEST = '.github/orbit360-requests/block12-operational-runtime-layoutfree-lab-v20260804.json';
const CONSUMED_V3_BLOB = '82461e6a9699f1d8469d201be90bc40688e50613';
const RUNTIME_WORKFLOW = '.github/workflows/orbit360-block12-visual-layoutfree-reactivation-lab-v20260804.yml';
const SOURCE_WORKFLOW = '.github/workflows/orbit360-block12-layoutfree-visual-contract-source-v20260804.yml';
const OUTER = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
const ENGINE = 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-layoutfree-lab-v20260804.mjs';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json';
const EXTENSION = 'tools/orbit360-gate-contract-registry-extension-block12-isolated-visual-v20260805.json';
const FIXTURE = 'tools/fixtures/orbit360-block12-go-lab-candidate-visible-v4-source-only-fixture-v20260805.json';
const LEDGER = 'orbit360-platform/runtime-gate-crm-v20260716/rc-ays-lab-canonica-01-ledger-v20260804.json';
const PREFLIGHT = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const OUT = 'orbit360-platform/runtime-gate-crm-v20260716/microblock24-request-v4-provenance-source-only.json';
const CONTROL_REVISION = 'request-v4-provenance-composition-source-only-v1';
const AUTH_REF = 'user_authorized_microblock_2_4_source_only_20260804T2341-0600';
const PRODUCT_PATHS = [
  'orbit360-platform/index.html',
  'orbit360-platform/core',
  'orbit360-platform/modules',
  'orbit360-platform/styles',
  'orbit360-platform/data',
  'functions',
  'firebase.json',
  'firestore.rules',
  'tools/orbit360-block12-cumulative-visual-v20260804.mjs',
  'tools/orbit360-block12-visual-readonly-integrity-v20260804.mjs'
];

const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail: String(detail || '').slice(0, 700) });
const abs = rel => path.join(ROOT, rel);
const exists = rel => fs.existsSync(abs(rel));
const readText = rel => fs.readFileSync(abs(rel), 'utf8');
const readJson = rel => JSON.parse(readText(rel));
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

let outerExitCode = 99;
let innerEngineReached = false;
let preflight = null;
let error = '';
let provenance = {
  baselinePresent: false,
  baselineAncestorOfParent: false,
  productBaselineUnchanged: false,
  consumedV3BlobUnchanged: false
};

try {
  const required = [SOURCE_REQUEST, CONSUMED_V3, CANONICAL_CONSUMED_REQUEST, RUNTIME_WORKFLOW, SOURCE_WORKFLOW, OUTER, ENGINE, LIFECYCLE, EXTENSION, FIXTURE, LEDGER];
  required.forEach(file => add(`FILE_${file}`, exists(file), file));
  add('FUTURE_RUNTIME_REQUEST_ABSENT', !exists(RUNTIME_REQUEST), RUNTIME_REQUEST);
  if (checks.some(item => !item.ok)) throw new Error('DATA_CONTRACT_FAILURE:REQUIRED_SOURCE_ONLY_CONTINUITY_FILES_MISSING');

  const request = readJson(SOURCE_REQUEST);
  const lifecycle = readJson(LIFECYCLE);
  const extension = readJson(EXTENSION);
  const fixture = readJson(FIXTURE);
  const ledger = readJson(LEDGER);
  const runtimeWorkflow = readText(RUNTIME_WORKFLOW);
  const sourceWorkflow = readText(SOURCE_WORKFLOW);
  const engineSource = readText(ENGINE);
  const parent = git(['rev-parse', 'HEAD^']);
  const changed = git(['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD']).split(/\r?\n/).filter(Boolean);

  add('BRANCH_EXACT', String(process.env.GITHUB_REF_NAME || process.env.ORBIT360_BRANCH || BRANCH) === BRANCH);
  add('REQUEST_ONLY_TRIGGER_COMMIT', changed.length === 1 && changed[0] === SOURCE_REQUEST, changed.join(','));
  add('SOURCE_REQUEST_CONTRACT',
    request.schemaVersion === 'orbit360-microblock24-continuity-source-only-request-v1' &&
    request.rcId === RC && request.microblock === '2.4' && request.gate === CLOSURE_GATE &&
    request.status === 'AUTHORIZED_SOURCE_ONLY_ONCE' && request.approved === true &&
    request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false &&
    request.authorizationRef === AUTH_REF && request.branch === BRANCH && request.pullRequest === 5 &&
    request.parentHead === parent && request.sourceBaseline === SOURCE_BASELINE &&
    request.runtimeAuthorized === false && request.secretAccessAuthorized === false &&
    request.firebaseAuthorized === false && request.firestoreAuthorized === false &&
    request.functionsAuthorized === false && request.hostingAuthorized === false &&
    request.browserAuthorized === false && request.deployAuthorized === false &&
    request.rulesAuthorized === false && request.reimportAuthorized === false &&
    request.productionAuthorized === false && request.mainAuthorized === false && request.mergeAuthorized === false &&
    request.functionalReplayAuthorized === false && request.outerRouterRequired === true && request.innerEngineRequired === true &&
    request.futureRuntimeRequest === RUNTIME_REQUEST && request.consumedRuntimeRequest === CONSUMED_V3 &&
    request.checkoutFetchDepth === 0 && request.baselineExistenceGuardRequired === true &&
    request.containsPII === false && request.containsSecrets === false
  );

  git(['cat-file', '-e', `${SOURCE_BASELINE}^{commit}`]);
  provenance.baselinePresent = true;
  add('BASELINE_COMMIT_PRESENT', true);
  execFileSync('git', ['merge-base', '--is-ancestor', SOURCE_BASELINE, 'HEAD^'], { cwd: ROOT, stdio: 'pipe' });
  provenance.baselineAncestorOfParent = true;
  add('BASELINE_ANCESTOR_OF_PARENT', true);
  execFileSync('git', ['diff', '--quiet', SOURCE_BASELINE, 'HEAD^', '--', ...PRODUCT_PATHS], { cwd: ROOT, stdio: 'pipe' });
  provenance.productBaselineUnchanged = true;
  add('PRODUCT_BASELINE_UNCHANGED', true);
  const v3Blob = git(['hash-object', CONSUMED_V3]);
  provenance.consumedV3BlobUnchanged = v3Blob === CONSUMED_V3_BLOB;
  add('CONSUMED_V3_BLOB_IMMUTABLE', provenance.consumedV3BlobUnchanged, v3Blob);

  add('RUNTIME_WORKFLOW_V4_INERT',
    runtimeWorkflow.includes(`- '${RUNTIME_REQUEST}'`) &&
    runtimeWorkflow.includes(`ORBIT360_REQUEST_FILE: ${RUNTIME_REQUEST}`) &&
    runtimeWorkflow.includes('fetch-depth: 0') &&
    runtimeWorkflow.includes('git cat-file -e "$ORBIT360_SOURCE_BASELINE^{commit}"') &&
    !runtimeWorkflow.includes(`- '${CONSUMED_V3}'`) &&
    !exists(RUNTIME_REQUEST)
  );
  add('SOURCE_WORKFLOW_ZERO_CAPABILITIES',
    sourceWorkflow.includes(`- '${SOURCE_REQUEST}'`) &&
    sourceWorkflow.includes(`ORBIT360_SOURCE_ONLY_REQUEST: ${SOURCE_REQUEST}`) &&
    sourceWorkflow.includes('fetch-depth: 0') &&
    sourceWorkflow.includes('orbit360-validar-request-v4-provenance-source-only-v20260805.mjs') &&
    !sourceWorkflow.includes('${{ secrets.') &&
    !sourceWorkflow.includes('npx firebase') && !sourceWorkflow.includes('firebase deploy') &&
    !sourceWorkflow.includes('playwright') && !sourceWorkflow.includes('hosting:channel:deploy')
  );
  add('ENGINE_ENV_OVERRIDE_SYNC',
    engineSource.includes('process.env.ORBIT360_REQUEST_FILE || DEFAULT_RUNTIME_REQUEST') &&
    engineSource.includes('process.env.ORBIT360_SOURCE_ONLY_COMPOSITION_TEST') &&
    engineSource.includes(CANONICAL_CONSUMED_REQUEST)
  );
  add('LIFECYCLE_SYNC',
    lifecycle.controlPlaneRevision === 'canonical-preflight-composition-source-only-v1' &&
    lifecycle.continuityControlPlaneRevision === CONTROL_REVISION &&
    lifecycle.runtimeActivationState === 'STOPPED_AWAITING_NEW_EXPLICIT_AUTHORIZATION' &&
    lifecycle.authorization?.status === 'CONSUMED_STOP_RETRY_DEFINITIVE' &&
    lifecycle.authorization?.allowedExecutions === 0 && lifecycle.authorization?.consumed === true &&
    lifecycle.authorization?.consumedRequest === CANONICAL_CONSUMED_REQUEST &&
    lifecycle.authorization?.latestConsumedRuntimeRequest === CONSUMED_V3 &&
    lifecycle.authorization?.latestConsumedRuntimeRequestBlob === CONSUMED_V3_BLOB &&
    lifecycle.authorization?.futureRuntimeRequestTemplate === RUNTIME_REQUEST &&
    lifecycle.sourceOnlyValidation?.gate === CLOSURE_GATE &&
    lifecycle.sourceOnlyValidation?.authorizationRef === AUTH_REF &&
    lifecycle.sourceOnlyValidation?.authorizationStatus === 'AUTHORIZED_SOURCE_ONLY_ONCE' &&
    lifecycle.sourceOnlyValidation?.allowedExecutions === 1 && lifecycle.sourceOnlyValidation?.consumed === false &&
    lifecycle.sourceOnlyValidation?.request === SOURCE_REQUEST && lifecycle.sourceOnlyValidation?.fixtureRequest === FIXTURE &&
    lifecycle.sourceOnlyValidation?.runtimeExecutionAuthorized === false &&
    lifecycle.sourceOnlyValidation?.secretAccessAuthorized === false && lifecycle.sourceOnlyValidation?.firebaseAuthorized === false &&
    lifecycle.sourceOnlyValidation?.browserAuthorized === false && lifecycle.sourceOnlyValidation?.deployAuthorized === false
  );
  add('EXTENSION_SYNC',
    extension.controlPlaneRevision === 'canonical-preflight-composition-source-only-v1' &&
    extension.continuityControlPlaneRevision === CONTROL_REVISION &&
    extension.runtimeActivationState === 'STOPPED_AWAITING_NEW_EXPLICIT_AUTHORIZATION' &&
    extension.consumedRequest === CANONICAL_CONSUMED_REQUEST &&
    extension.latestConsumedRuntimeRequest === CONSUMED_V3 && extension.latestConsumedRuntimeRequestBlob === CONSUMED_V3_BLOB &&
    extension.futureRuntimeRequestTemplate === RUNTIME_REQUEST &&
    extension.continuitySourceOnlyRequest === SOURCE_REQUEST && extension.continuitySourceOnlyFixture === FIXTURE &&
    extension.continuitySourceOnlyValidator === 'tools/orbit360-validar-request-v4-provenance-source-only-v20260805.mjs' &&
    extension.continuitySourceOnlyWorkflow === SOURCE_WORKFLOW && extension.continuitySourceOnlyGate === CLOSURE_GATE &&
    extension.continuitySourceOnlyAuthorizationRef === AUTH_REF &&
    extension.continuitySourceOnlyAuthorizationStatus === 'AUTHORIZED_SOURCE_ONLY_ONCE' &&
    extension.continuitySourceOnlyAllowedExecutions === 1 && extension.continuitySourceOnlyConsumed === false &&
    extension.sourceOnlyRuntimeAuthorized === false && extension.allowedRuntimeExecutions === 0
  );
  add('LEDGER_SYNC',
    ledger.activeMicroblock === '2.4' && ledger.activeGate === CLOSURE_GATE && ledger.status === 'AUTHORIZED_SOURCE_ONLY_ONCE' &&
    ledger.authorization?.microblock24SourceOnlyReference === AUTH_REF &&
    ledger.authorization?.microblock24SourceOnlyAllowedExecutions === 1 &&
    ledger.authorization?.microblock24SourceOnlyConsumed === false &&
    ledger.authorization?.microblock24RuntimeAuthorized === false
  );
  add('FIXTURE_NON_OPERATIONAL',
    fixture.status === 'SOURCE_ONLY_COMPOSITION_FIXTURE' && fixture.sourceOnlyCompositionTest === true &&
    fixture.runtimeExecutionAuthorized === false && fixture.approved === false && fixture.allowedExecutions === 0 &&
    fixture.authorizationRef === AUTH_REF && fixture.parentHead === 'SOURCE_ONLY_NOT_RUNTIME_BOUND'
  );

  [OUTER, ENGINE, 'tools/orbit360-validar-request-v4-provenance-source-only-v20260805.mjs'].forEach(file => {
    execFileSync(process.execPath, ['--check', abs(file)], { cwd: ROOT, stdio: 'pipe' });
    add(`SYNTAX_${file}`, true);
  });

  const outer = spawnSync(process.execPath, [abs(OUTER), CONTRACT_GATE], {
    cwd: ROOT,
    env: {
      ...process.env,
      ORBIT360_BRANCH: BRANCH,
      GITHUB_REF_NAME: BRANCH,
      ORBIT360_REQUEST_FILE: FIXTURE,
      ORBIT360_SOURCE_ONLY_COMPOSITION_TEST: '1'
    },
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
  outerExitCode = Number.isInteger(outer.status) ? outer.status : 99;
  if (!exists(PREFLIGHT)) throw new Error('PIPELINE_MECHANISM_FAILURE:SOURCE_ONLY_PREFLIGHT_EVIDENCE_MISSING');
  preflight = readJson(PREFLIGHT);
  innerEngineReached = preflight.canonicalEngine === ENGINE && preflight.canonicalEntrypoint === OUTER;
  add('OUTER_ROUTER_AND_INNER_ENGINE_PASS', outerExitCode === 0 && innerEngineReached === true, String(outer.stderr || '').slice(0, 500));
  add('INNER_PREFLIGHT_PASS', preflight.status === 'PASS_CANONICAL_PREFLIGHT_COMPOSITION' && preflight.failed === 0 && preflight.ok === true);
  add('ZERO_CAPABILITIES_AUTHORIZED',
    preflight.executionAuthorized === false && preflight.secretAccessAuthorized === false &&
    preflight.firestoreReadAuthorized === false && preflight.browserAuthorized === false &&
    preflight.deployAuthorized === false && preflight.functionsDeployAuthorized === false &&
    preflight.hostingPreviewAuthorized === false && preflight.rulesDeployAuthorized === false &&
    preflight.productionAuthorized === false
  );
  add('ZERO_OPERATIONAL_EXECUTION',
    preflight.secretAccess === false && preflight.firestoreRead === false && preflight.firestoreWrites === 0 &&
    preflight.authWrites === 0 && preflight.runtimeExecuted === false && preflight.browserExecuted === false &&
    preflight.deployExecuted === false && preflight.productionTouched === false
  );
} catch (cause) {
  error = String(cause && (cause.message || cause)).replace(/[\r\n]+/g, ' ').slice(0, 1000);
}

const failed = checks.filter(row => !row.ok);
const ok = error === '' && failed.length === 0;
let classification = 'GO_SOURCE_ONLY_CONTROL_PLANE';
if (!ok) {
  classification = error.startsWith('DATA_CONTRACT_FAILURE') ? 'DATA_CONTRACT_FAILURE' :
    (failed.some(row => row.id.includes('SYNC') || row.id.includes('CONTRACT') || row.id.includes('WORKFLOW') || row.id.includes('ENGINE')) ? 'VALIDATOR_STALE' : 'PIPELINE_MECHANISM_FAILURE');
}
const result = {
  schemaVersion: 'orbit360-microblock24-request-v4-provenance-source-only-v1',
  generatedAt: new Date().toISOString(),
  rcId: RC,
  microblock: '2.4',
  gate: CLOSURE_GATE,
  contractGate: CONTRACT_GATE,
  branch: BRANCH,
  sourceBaseline: SOURCE_BASELINE,
  status: ok ? 'PASS_REQUEST_V4_PROVENANCE_COMPOSITION' : 'STOP_RETRY_SOURCE_ONLY_REQUEST_V4',
  classification,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(row => row.id),
  checks,
  provenance,
  runtimeRequest: RUNTIME_REQUEST,
  runtimeRequestExists: exists(RUNTIME_REQUEST),
  sourceOnlyRequest: SOURCE_REQUEST,
  consumedV3Request: CONSUMED_V3,
  outerRouterExitCode: outerExitCode,
  innerEngineReached,
  innerPreflightStatus: preflight?.status || '',
  runtimeAuthorized: false,
  secretAccess: false,
  firebaseCommandsExecuted: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  functionsDeployAttempted: false,
  hostingDeployAttempted: false,
  browserExecuted: false,
  deployExecuted: false,
  rulesDeployed: false,
  realDataReimported: false,
  functionalReplayExecuted: false,
  productionTouched: false,
  mainTouched: false,
  mergeExecuted: false,
  error,
  containsPII: false,
  containsSecrets: false,
  ok
};
fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true });
fs.writeFileSync(abs(OUT), JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
if (!ok) process.exit(42);
