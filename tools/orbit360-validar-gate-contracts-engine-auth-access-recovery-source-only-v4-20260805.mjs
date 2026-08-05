#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block-auth-access-recovery-source-only-v4-20260805';
const VERSION = '13.3.0';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-source-only-v4-20260805.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/auth-access-recovery-source-only-v4-20260805.json';
const WORKFLOW = '.github/workflows/orbit360-auth-access-recovery-lab-v3-20260805.yml';
const REPAIR = 'tools/orbit360-auth-access-config-repair-lab-v3-20260805.mjs';
const FUTURE_RUNTIME = '.github/orbit360-requests/auth-access-recovery-lab-v5-20260805.json';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const ZERO = Object.freeze({ secrets:false, firestoreRead:false, writes:false, runtime:false, browser:false, deploy:false, functionsDeploy:false, rulesDeploy:false, production:false });
const PRIOR = Object.freeze([
  ['.github/orbit360-requests/auth-access-recovery-lab-v20260805.json', 'fffef59bd6065390d1e8b28128754a06d94340b5', 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v20260805.json'],
  ['.github/orbit360-requests/auth-access-recovery-lab-v2-20260805.json', 'fd5963242de542105dd764371cf501f6814481e6', 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v2-20260805.json'],
  ['.github/orbit360-requests/auth-access-recovery-lab-v3-20260805.json', 'f8363197646dc4046fda1933af535110270703ae', 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v3-20260805.json']
]);
const ALLOWED_FIELDS = ['email','roles','defaultRole','activeRole','countries','dataScopes'];
const checks = [];
const add = (id, ok, detail='') => checks.push({ id, ok:Boolean(ok), detail:String(detail || '').slice(0,500) });
const rel = value => path.join(ROOT, value);
const exists = value => fs.existsSync(rel(value));
const read = value => JSON.parse(fs.readFileSync(rel(value), 'utf8'));
const text = value => fs.readFileSync(rel(value), 'utf8');
const git = args => execFileSync('git', args, { cwd: ROOT, encoding:'utf8' }).trim();
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const occurrences = (source, token) => source.split(token).length - 1;

let result;
try {
  const lifecycle = read(LIFECYCLE);
  const request = read(REQUEST);
  const workflow = text(WORKFLOW);
  const repair = text(REPAIR);
  const cap = lifecycle.executionProfile?.capabilities || {};
  const scope = request.scope || {};
  const changed = git(['diff-tree','--no-commit-id','--name-only','-r','HEAD']).split(/\r?\n/).filter(Boolean);
  const parent = git(['rev-parse','HEAD^']);

  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_AUTHORIZED_ONCE', lifecycle.status === 'AUTH_ACCESS_RECOVERY_SOURCE_ONLY_V4_AUTHORIZED_ONCE' && lifecycle.authorization?.activeRequest === true && lifecycle.authorization?.allowedExecutions === 1 && lifecycle.authorization?.consumed === false && lifecycle.authorization?.replayAllowed === false);
  add('ZERO_CAPABILITIES', same(cap, ZERO));
  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-auth-access-recovery-source-only-request-v4' && request.gateId === GATE && request.status === 'AUTHORIZED_ONCE' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false);
  add('REQUEST_BINDING', request.rcId === 'RC-AYS-LAB-CANONICA-01' && request.branch === 'ays/backend-tenant-lab-v99-20260703' && request.pullRequest === 5 && request.parentHead === parent);
  add('REQUEST_SINGLE_FILE_COMMIT', changed.length === 1 && changed[0] === REQUEST, changed.join(','));
  add('SOURCE_SCOPE_POSITIVE', scope.validateRequest === true && scope.validateProvenance === true && scope.validateCanonicalPreflight === true && scope.validateAllowlists === true && scope.validateAtomicity === true && scope.validateIdempotency === true && scope.validateRootFix === true);
  add('SOURCE_SCOPE_NEGATIVE', scope.secrets === false && scope.firebase === false && scope.firestore === false && scope.auth === false && scope.functions === false && scope.hosting === false && scope.browser === false && scope.deploy === false && scope.rules === false && scope.reimport === false && scope.crm === false && scope.production === false && scope.main === false && scope.merge === false);

  let priorOk = true;
  const priorDetails = [];
  for (const [file, expectedBlob, lifecycleFile] of PRIOR) {
    const actualBlob = git(['hash-object', file]);
    const priorLifecycle = read(lifecycleFile);
    const consumed = priorLifecycle.authorization?.consumed === true && priorLifecycle.authorization?.allowedExecutions === 0 && priorLifecycle.authorization?.replayAllowed === false;
    priorOk = priorOk && actualBlob === expectedBlob && consumed;
    priorDetails.push(`${path.basename(file)}:${actualBlob}:${consumed}`);
  }
  add('PRIOR_REQUESTS_IMMUTABLE_AND_CONSUMED', priorOk, priorDetails.join('|'));

  let ancestor = false;
  try { execFileSync('git', ['merge-base','--is-ancestor','38aae846477a35025950869a207bf10be9337cc1', parent], { cwd: ROOT, stdio:'ignore' }); ancestor = true; } catch {}
  add('ROOTFIX_PROVENANCE_ANCESTOR', ancestor);
  add('ROOTFIX_BLOB', git(['hash-object', REPAIR]) === 'dda248ff0df08f69d95ac117d8a7262c055b1af6');
  add('FUTURE_RUNTIME_REQUEST_ABSENT', !exists(FUTURE_RUNTIME));

  add('WORKFLOW_REUSED_NEW_PATH', workflow.includes(".github/orbit360-requests/auth-access-recovery-source-only-v4-20260805.json") && !workflow.includes("paths:\n      - '.github/orbit360-requests/auth-access-recovery-lab-v3-20260805.json'"));
  const bannedWorkflow = ['${{ secrets.', 'firebase deploy', 'firebase functions:list', 'GOOGLE_APPLICATION_CREDENTIALS', 'firebase-admin', 'playwright', 'curl ', 'wget ', 'gcloud ', 'npm install'];
  add('WORKFLOW_NO_RUNTIME_CAPABILITIES', bannedWorkflow.every(token => !workflow.includes(token)), bannedWorkflow.filter(token => workflow.includes(token)).join(','));
  add('WORKFLOW_FULL_HISTORY', workflow.includes('fetch-depth: 0'));
  add('WORKFLOW_SOURCE_ONLY_DECLARATION', workflow.includes('AUTH_ACCESS_SOURCE_ONLY_V4') && workflow.includes('secrets: false') && workflow.includes('firestore: false') && workflow.includes('auth: false') && workflow.includes('functions: false') && workflow.includes('deploy: false'));

  const allowlistLiteral = "const ALLOWED_FIELDS = ['email', 'roles', 'defaultRole', 'activeRole', 'countries', 'dataScopes'];";
  add('ACCESS_FIELD_ALLOWLIST_EXACT', repair.includes(allowlistLiteral));
  add('ONBOARDING_FUNCTION_ALLOWLIST_EXACT', lifecycle.sourceValidationBoundary?.allowedFunction === 'orbit360ProvisionTeamAccess');

  const transactionStart = repair.indexOf('const writeSummary = await db.runTransaction(async tx => {');
  const transactionEnd = repair.indexOf('\n    });\n\n    const documentsWritten', transactionStart);
  const transaction = transactionStart >= 0 && transactionEnd > transactionStart ? repair.slice(transactionStart, transactionEnd) : '';
  const readPhase = transaction.indexOf('const snapshots = []');
  const getPhase = transaction.indexOf('const snap = await tx.get(ref);');
  const validatePhase = transaction.indexOf('const pendingWrites = []');
  const buildPhase = transaction.indexOf('for (const { item, ref, snap } of snapshots)');
  const writePhase = transaction.indexOf('for (const { ref, patch } of pendingWrites) tx.update(ref, patch);');
  add('TRANSACTION_THREE_PHASE_ORDER', transactionStart >= 0 && transactionEnd > transactionStart && readPhase >= 0 && getPhase > readPhase && validatePhase > getPhase && buildPhase > validatePhase && writePhase > buildPhase);
  add('TRANSACTION_NO_READ_AFTER_WRITE', writePhase >= 0 && transaction.slice(writePhase).indexOf('tx.get(') === -1);
  add('TRANSACTION_ATOMIC_SINGLE_OWNER', occurrences(repair, 'db.runTransaction(') === 1 && occurrences(transaction, 'tx.update(') === 1 && !/tx\.(set|create|delete)\(/.test(transaction));
  add('TRANSACTION_ALL_READS_BEFORE_ALL_WRITES', transaction.includes('snapshots.push({ item, ref, snap });') && transaction.includes('pendingWrites.push({ ref, patch });') && transaction.includes('for (const { ref, patch } of pendingWrites) tx.update(ref, patch);'));
  add('IDEMPOTENCY_CHANGED_FIELDS_ONLY', repair.includes('const fields = changedFields(advisor.data, desired);') && repair.includes('for (const field of item.changedFields || [])') && repair.includes('if (Object.keys(patch).length) pendingWrites.push({ ref, patch });'));
  add('IDEMPOTENCY_STALE_PLAN_GUARD', repair.includes('if (digest(currentView) !== digest(item.before))'));
  add('IDEMPOTENCY_POSTVERIFY', repair.includes("_POSTVERIFY_FAILED`"));
  add('STATIC_SYNTAX_TARGETS_PRESENT', exists('tools/orbit360-auth-access-config-repair-lab-v3-20260805.mjs') && exists('tools/orbit360-validar-gate-contracts-v20260717.mjs') && exists(WORKFLOW));

  const failed = checks.filter(item => !item.ok);
  const ok = failed.length === 0;
  result = {
    schemaVersion:'orbit360-auth-access-recovery-source-only-gate-v4',
    gateId:GATE,
    contractVersion:VERSION,
    status:ok ? 'GO_GATE_CONTRACT' : 'STOP_RETRY',
    classification:ok ? 'AUTH_ACCESS_SOURCE_ONLY_V4_READY' : 'PIPELINE_MECHANISM_FAILURE',
    total:checks.length,
    passed:checks.length - failed.length,
    failed:failed.length,
    failedCheckIds:failed.map(item => item.id),
    checks,
    executionAuthorized:false,
    secretAccessAuthorized:false,
    firestoreReadAuthorized:false,
    writeAuthorized:false,
    authWriteAuthorized:false,
    runtimeAuthorized:false,
    browserAuthorized:false,
    deployAuthorized:false,
    functionsDeployAuthorized:false,
    hostingDeployAuthorized:false,
    rulesDeployAuthorized:false,
    productionAuthorized:false,
    dataAccess:false,
    secretAccess:false,
    firestoreRead:false,
    firestoreWrites:0,
    authReads:0,
    authWrites:0,
    runtimeExecuted:false,
    browserExecuted:false,
    deployExecuted:false,
    productionTouched:false,
    rootFixStrategy:'READ_ALL_VALIDATE_ALL_WRITE_ALL',
    priorRequestsVerified:3,
    futureRuntimeRequestAbsent:!exists(FUTURE_RUNTIME),
    containsPII:false,
    containsSecrets:false,
    ok
  };
} catch (error) {
  result = {
    schemaVersion:'orbit360-auth-access-recovery-source-only-gate-v4',
    gateId:GATE,
    contractVersion:VERSION,
    status:'STOP_RETRY',
    classification:'PIPELINE_MECHANISM_FAILURE',
    error:String(error?.message || error).replace(/[\r\n]+/g,' ').replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,700),
    executionAuthorized:false,
    secretAccessAuthorized:false,
    firestoreReadAuthorized:false,
    writeAuthorized:false,
    authWriteAuthorized:false,
    runtimeAuthorized:false,
    browserAuthorized:false,
    deployAuthorized:false,
    functionsDeployAuthorized:false,
    hostingDeployAuthorized:false,
    rulesDeployAuthorized:false,
    productionAuthorized:false,
    dataAccess:false,
    secretAccess:false,
    firestoreRead:false,
    firestoreWrites:0,
    authReads:0,
    authWrites:0,
    runtimeExecuted:false,
    browserExecuted:false,
    deployExecuted:false,
    productionTouched:false,
    containsPII:false,
    containsSecrets:false,
    ok:false
  };
}
fs.mkdirSync(path.dirname(OUT), { recursive:true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'GO_GATE_CONTRACT' ? 0 : 41);
