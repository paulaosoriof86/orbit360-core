#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const FILES = {
  manifest: 'tools/orbit360-bank-reference-recovery-map-v20260721.json',
  parser: 'orbit360-platform/core/insurer-directory-import-v1202.js',
  coordinator: 'orbit360-platform/core/insurer-directory-import-v1202-security.js',
  targetBridge: 'orbit360-platform/core/insurer-secure-target-bridge-v20260720.js',
  dryRun: 'tools/orbit360-dryrun-recuperar-referencias-bancarias-exacto-v20260721.mjs',
  index: 'orbit360-platform/index.html',
  freeze: 'tools/orbit360-incident-freeze-v20260721.json'
};
const EVIDENCE_REL = 'orbit360-platform/runtime-incident-importer-20260721/static-importer-atomicity-sanitized.json';
const EVIDENCE_PATH = path.join(ROOT, EVIDENCE_REL);
const checks = [];

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function check(id, ok, detail = '') { checks.push({ id, ok: Boolean(ok), detail: String(detail || '') }); }
function unique(values) { return new Set(values).size === values.length; }
function syntaxCheck(rel) {
  const result = spawnSync(process.execPath, ['--check', path.join(ROOT, rel)], { encoding: 'utf8' });
  return { ok: result.status === 0, detail: String(result.stderr || result.stdout || '').trim() };
}
function writeEvidence(payload) {
  fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

for (const [id, rel] of Object.entries(FILES)) check(`FILE_${id.toUpperCase()}`, exists(rel), rel);
if (checks.some(item => !item.ok)) {
  const payload = {
    schemaVersion: 'orbit360-static-importer-atomicity-v4-68-restores-2-new-pending',
    generatedAt: new Date().toISOString(),
    mode: 'static_no_runtime',
    ok: false,
    classification: 'VALIDATOR_STALE',
    containsPII: false,
    containsSecrets: false,
    writesExecuted: false,
    runtimeExecuted: false,
    checks
  };
  writeEvidence(payload);
  console.log(JSON.stringify(payload, null, 2));
  process.exit(41);
}

let manifest;
let freeze;
try { manifest = JSON.parse(read(FILES.manifest)); }
catch (error) { check('MANIFEST_VALID_JSON', false, error.message); }
try { freeze = JSON.parse(read(FILES.freeze)); }
catch (error) { check('FREEZE_VALID_JSON', false, error.message); }

if (manifest) {
  const recovery = Array.isArray(manifest.recoveryMappings) ? manifest.recoveryMappings : [];
  const newPending = Array.isArray(manifest.newPendingRows) ? manifest.newPendingRows : [];
  const duplicates = Array.isArray(manifest.duplicateIncomingRows) ? manifest.duplicateIncomingRows : [];
  const currentIds = recovery.map(row => row[1]);
  const legacyIds = recovery.map(row => row[2]);
  const newPendingIds = newPending.map(row => row[1]);
  const allPendingIds = currentIds.concat(newPendingIds);
  const legacyHashes = recovery.map(row => row[6]);
  const expectedRefHashes = recovery.map(row => row[7]);
  const newPendingHashes = newPending.map(row => row[4]);
  const hash12 = value => /^[a-f0-9]{12}$/.test(String(value || ''));
  const trace = manifest.traceContract || {};
  const identity = manifest.identityContract || {};

  check('MANIFEST_SCHEMA', manifest.schemaVersion === 'orbit360-bank-reference-recovery-map-v3-sanitized', manifest.schemaVersion);
  check('MANIFEST_MODE', manifest.mode === 'STATIC_CONFIRMED_NO_WRITE', manifest.mode);
  check('MANIFEST_EVIDENCE_CONFIRMED', manifest.evidenceClassification === 'CONFIRMED', manifest.evidenceClassification);
  check('RECOVERY_COUNT_68', recovery.length === 68, recovery.length);
  check('NEW_PENDING_COUNT_2', newPending.length === 2, newPending.length);
  check('DUPLICATE_COUNT_ZERO', duplicates.length === 0, duplicates.length);
  check('UNMAPPED_ZERO', Number(manifest.summary && manifest.summary.unmappedRows) === 0, manifest.summary && manifest.summary.unmappedRows);
  check('AMBIGUOUS_ZERO', Number(manifest.summary && manifest.summary.ambiguousRows) === 0, manifest.summary && manifest.summary.ambiguousRows);
  check('FINAL_BANK_ROWS_93', Number(manifest.summary && manifest.summary.expectedFinalBankRows) === 93, manifest.summary && manifest.summary.expectedFinalBankRows);
  check('FINAL_REFERENCES_91', Number(manifest.summary && manifest.summary.expectedFinalValidReferences) === 91, manifest.summary && manifest.summary.expectedFinalValidReferences);
  check('FINAL_PENDING_2', Number(manifest.summary && manifest.summary.expectedFinalPendingRows) === 2, manifest.summary && manifest.summary.expectedFinalPendingRows);
  check('FINAL_DUPLICATES_ZERO', Number(manifest.summary && manifest.summary.expectedFinalDuplicateRows) === 0, manifest.summary && manifest.summary.expectedFinalDuplicateRows);
  check('RECOVERY_ROWS_SHAPE', recovery.every(row => Array.isArray(row) && row.length === 8 && Number(row[4]) > 0), `rows=${recovery.length}`);
  check('NEW_PENDING_ROWS_SHAPE', newPending.every(row => Array.isArray(row) && row.length === 7 && Number(row[3]) > 0), `rows=${newPending.length}`);
  check('CURRENT_IDS_UNIQUE', unique(currentIds), `unique=${new Set(currentIds).size}`);
  check('LEGACY_IDS_UNIQUE', unique(legacyIds), `unique=${new Set(legacyIds).size}`);
  check('NEW_PENDING_IDS_UNIQUE', unique(newPendingIds), `unique=${new Set(newPendingIds).size}`);
  check('ALL_PENDING_IDS_70_UNIQUE', allPendingIds.length === 70 && unique(allPendingIds), `rows=${allPendingIds.length}; unique=${new Set(allPendingIds).size}`);
  check('LEGACY_HASHES_UNIQUE', unique(legacyHashes) && legacyHashes.every(hash12), `unique=${new Set(legacyHashes).size}`);
  check('REFERENCE_HASHES_UNIQUE', unique(expectedRefHashes) && expectedRefHashes.every(hash12), `unique=${new Set(expectedRefHashes).size}`);
  check('NEW_PENDING_HASHES_UNIQUE', unique(newPendingHashes) && newPendingHashes.every(hash12), `unique=${new Set(newPendingHashes).size}`);
  check('ALL_MISSING_HASHES_COVERED', manifest.validation && manifest.validation.allMissingReferenceHashesCovered === true && Number(manifest.validation.hashSetDifference) === 0, JSON.stringify(manifest.validation || {}));
  check('ALL_PENDING_ROWS_ACCOUNTED', manifest.validation && manifest.validation.allPendingRowsAccountedFor === true && Number(manifest.validation.pendingRowsAccountedFor) === 70 && Number(manifest.validation.recoveryRowsAccountedFor) === 68 && Number(manifest.validation.newPendingRowsAccountedFor) === 2 && Number(manifest.validation.duplicateRowsAccountedFor) === 0, JSON.stringify(manifest.validation || {}));
  check('NEW_PENDING_CONFIRMED_NOT_DUPLICATES', manifest.validation && manifest.validation.newPendingRowsDistinctFromHistoricalReferences === true && manifest.validation.newPendingRowsPreserved === true, JSON.stringify(manifest.validation || {}));
  check('IDENTITY_CONTRACT_68_PLUS_2_NEW', Number(identity.historicalReferenceRestorations) === 68 && Number(identity.newPendingRowsPreserved) === 2 && Number(identity.duplicateRemovals) === 0, JSON.stringify(identity));
  check('TRACE_ROOT_CAUSE_CLASSIFIED', trace.classification === 'DATA_CONTRACT_FAILURE', trace.classification);
  check('TRACE_ROWS_RECONCILED_70', Number(trace.rowsReconciled) === 70 && Number(manifest.validation && manifest.validation.traceRowsReconciled) === 70, `${trace.rowsReconciled}`);
  check('TRACE_AMBIGUOUS_ZERO', Number(trace.ambiguousRows) === 0 && Number(manifest.validation && manifest.validation.traceAmbiguousRows) === 0, `${trace.ambiguousRows}`);
  check('TRACE_UNMAPPED_ZERO', Number(trace.unmappedRows) === 0 && Number(manifest.validation && manifest.validation.traceUnmappedRows) === 0, `${trace.unmappedRows}`);
  check('TRACE_IS_AUDIT_NOT_WRITE_SCOPE', trace.recoveryScopeChangesTraceFields === false, `${trace.recoveryScopeChangesTraceFields}`);
  check('MANIFEST_NO_PII', manifest.safety && manifest.safety.containsPII === false, 'containsPII');
  check('MANIFEST_NO_SECRETS', manifest.safety && manifest.safety.containsSecrets === false, 'containsSecrets');
  check('MANIFEST_NO_RAW_BANK_VALUES', manifest.safety && manifest.safety.containsRawBankValues === false, 'containsRawBankValues');
  check('MANIFEST_COLOMBIA_UNTOUCHED', manifest.safety && manifest.safety.colombiaTouched === false, 'colombiaTouched');
  check('MANIFEST_NO_ROW_MUTATION', manifest.safety && manifest.safety.createsRows === false && manifest.safety.deletesRows === false && manifest.safety.reordersRows === false, JSON.stringify(manifest.safety || {}));
}

const parser = read(FILES.parser);
const coordinator = read(FILES.coordinator);
const bridge = read(FILES.targetBridge);
const dryRun = read(FILES.dryRun);
const index = read(FILES.index);

const coordinatorTokens = [
  '__canonicalCoordinatorV1221',
  "owner: 'insurer-directory-import-coordinator-v1221'",
  'providerConfirmedBeforeWrite: true',
  'mergeNonDestructive: true',
  'durableWriteRequired: true',
  'readAfterWriteRequired: true',
  'rollbackRequired: true',
  'partialApplyAllowed: false',
  'noSecretPersistence: true',
  'async function confirmSecureResources',
  'async function waitForStoreIdle',
  'async function rollbackSnapshots',
  'function mergeResources',
  'function readBackMatches'
];
for (const token of coordinatorTokens) check(`COORDINATOR_TOKEN:${token}`, coordinator.includes(token), token);

const bridgeTokens = [
  "version: '20260721.3'",
  'function findPortal',
  'function findAccount',
  'async function callProviderWithoutOperationalWrites',
  'providerReturnsMappingsOnly: true',
  'providerOperationalStoreWritesAllowed: false',
  '__secureTargetBridgeV20260721MappingsOnly'
];
for (const token of bridgeTokens) check(`BRIDGE_TOKEN:${token}`, bridge.includes(token), token);

const dryRunTokens = [
  'manifestIdentityContractValidated = true',
  'manifestTraceContractValidated = true',
  'traceIsAuditMetadata = true',
  'recoveryScopeChangesTraceFields = false',
  "operation: 'restore_accountRef_only'",
  "operation: 'preserve_new_pending_row_unchanged'",
  'newPendingRowsPreserved',
  'duplicateRemovalsZero',
  'noCreates',
  'noDeletes',
  'noReorder',
  'traceFieldsUntouched',
  'authorizationRequiredForWrite: true',
  "schemaVersion: 'orbit360-bank-reference-recovery-exact-dry-run-v3-68-restores-2-new-pending'"
];
for (const token of dryRunTokens) check(`DRYRUN_TOKEN:${token}`, dryRun.includes(token), token);
check('DRYRUN_NO_DUPLICATE_REMOVAL_LOGIC', !dryRun.includes('remove_incoming_duplicate_preserve_existing_valid_reference') && !dryRun.includes('DUPLICATE_FINGERPRINT_MISMATCH') && !dryRun.includes('DUPLICATE_PAIR_'), 'two new rows must be preserved');
check('DRYRUN_TRACE_NOT_IDENTITY_GATE', !dryRun.includes('RECOVERY_TRACE_MISMATCH') && !dryRun.includes('DUPLICATE_TRACE_MISMATCH'), 'trace metadata must not block stable identity');
const forbiddenFirestoreWritePatterns = [
  /\.doc\s*\([^)]*\)[\s\S]{0,160}?\.(?:set|update|create|delete)\s*\(/,
  /\.collection\s*\([^)]*\)[\s\S]{0,160}?\.add\s*\(/,
  /\b(?:writeBatch|runTransaction|bulkWriter)\s*\(/
];
const detectedFirestoreWritePatterns = forbiddenFirestoreWritePatterns
  .map((pattern, index) => ({ index, matched: pattern.test(dryRun) }))
  .filter(item => item.matched)
  .map(item => item.index);
check('DRYRUN_NO_FIRESTORE_WRITE', detectedFirestoreWritePatterns.length === 0, `detected=${detectedFirestoreWritePatterns.join(',') || 'none'}`);

const applyStart = coordinator.indexOf('async function applyApproved');
const applyEnd = coordinator.indexOf('\n  function esc(', applyStart);
const applySource = applyStart >= 0 && applyEnd > applyStart ? coordinator.slice(applyStart, applyEnd) : '';
const secureIndex = applySource.indexOf('await confirmSecureResources');
const operationalWriteIndexes = [applySource.indexOf("S().update('aseguradoras'", applySource.indexOf('const plans')), applySource.indexOf("S().insert('aseguradoras'", applySource.indexOf('const plans'))].filter(index => index >= 0);
check('PROVIDER_BEFORE_OPERATIONAL_WRITE', secureIndex >= 0 && operationalWriteIndexes.length > 0 && operationalWriteIndexes.every(index => secureIndex < index), `secure=${secureIndex}; writes=${operationalWriteIndexes.join(',')}`);
check('FAILURE_RETURNS_FALSE', /catch\s*\(error\)[\s\S]*?ok:\s*false/.test(applySource), 'applyApproved catch');
check('NO_PARTIAL_VALID_APPLY', !applySource.includes('applyValidOnly'), 'applyValidOnly absent from canonical coordinator');
check('OLD_FALSE_SUCCESS_REMOVED_FROM_OWNER', !coordinator.includes("secureStatus = 'backend_error'") && !coordinator.includes('return { ok: true, inserted, updated, blocked: blocked.length, secureStatus }'), 'old false-success pattern absent');
check('PARSER_REMAINS_DRYRUN_SOURCE', parser.includes('function buildDryRun') && parser.includes('function parseMatrices'), 'parser/dry-run preserved');
check('CANONICAL_OVERRIDE_LOAD_ORDER', index.indexOf('core/insurer-directory-import-v1202.js') >= 0 && index.indexOf('core/insurer-directory-import-v1202-security.js') > index.indexOf('core/insurer-directory-import-v1202.js'), 'parser before coordinator');
check('BRIDGE_BLOCKS_PROVIDER_STORE_UPDATE', bridge.includes('store.update = function') && bridge.includes("collection !== 'aseguradoras'") && bridge.includes('finally'), 'provider isolation');

const coordinatorSyntax = syntaxCheck(FILES.coordinator);
const bridgeSyntax = syntaxCheck(FILES.targetBridge);
const dryRunSyntax = syntaxCheck(FILES.dryRun);
check('COORDINATOR_SYNTAX', coordinatorSyntax.ok, coordinatorSyntax.detail);
check('BRIDGE_SYNTAX', bridgeSyntax.ok, bridgeSyntax.detail);
check('DRYRUN_SYNTAX', dryRunSyntax.ok, dryRunSyntax.detail);

if (freeze) {
  const status = String(freeze.status || '');
  const authorization = freeze.runtimeAuthorization || {};
  const preflightAuthorization = freeze.preflightAuthorization || {};
  const hardFrozen = status.startsWith('STOP_THE_LINE');
  const preflightOnly = status === 'DATA_CONTRACT_CORRECTION_PREFLIGHT_ONLY_AUTHORIZED';
  const bounded = status === 'BOUNDED_EXACT_RECOVERY_DRYRUN_AUTHORIZED';
  check('INCIDENT_CONTROL_ACTIVE', hardFrozen || preflightOnly || bounded, status);
  check(
    'RUNTIME_SCOPE_BOUND',
    hardFrozen ||
    (
      preflightOnly &&
      preflightAuthorization.active === true &&
      preflightAuthorization.secretsAllowed === false &&
      preflightAuthorization.firestoreReadAllowed === false &&
      preflightAuthorization.vaultReadAllowed === false &&
      authorization.active === false
    ) ||
    (
      bounded &&
      authorization.active === true &&
      authorization.authorizationId === 'exact-bank-reference-recovery-dryrun-68plus2new-v1' &&
      authorization.action === 'exact_recovery_readonly_dry_run' &&
      authorization.allowedExecutions === 1 &&
      authorization.writesAllowed === false &&
      authorization.script === FILES.dryRun &&
      authorization.manifest === FILES.manifest
    ),
    status
  );
}

const failed = checks.filter(item => !item.ok);
const payload = {
  schemaVersion: 'orbit360-static-importer-atomicity-v4-68-restores-2-new-pending',
  generatedAt: new Date().toISOString(),
  mode: 'static_no_runtime',
  ok: failed.length === 0,
  classification: failed.length ? 'DATA_CONTRACT_FAILURE' : null,
  containsPII: false,
  containsSecrets: false,
  writesExecuted: false,
  runtimeExecuted: false,
  firestoreReadExecuted: false,
  vaultReadExecuted: false,
  recovery: {
    mappings: manifest && manifest.summary && manifest.summary.recoveryMappings || 0,
    newPendingRows: manifest && manifest.summary && manifest.summary.newPendingRows || 0,
    duplicates: manifest && manifest.summary && manifest.summary.duplicateIncomingRows || 0,
    ambiguous: manifest && manifest.summary && manifest.summary.ambiguousRows || 0,
    traceRowsReconciled: manifest && manifest.traceContract && manifest.traceContract.rowsReconciled || 0,
    traceIsAuditMetadata: true,
    expectedFinalBankRows: manifest && manifest.summary && manifest.summary.expectedFinalBankRows || 0,
    expectedFinalReferences: manifest && manifest.summary && manifest.summary.expectedFinalValidReferences || 0,
    expectedFinalPending: manifest && manifest.summary && manifest.summary.expectedFinalPendingRows || 0
  },
  contract: {
    owner: 'insurer-directory-import-coordinator-v1221',
    providerBeforeWrite: true,
    providerMappingsOnly: true,
    mergeNonDestructive: true,
    durableWriteRequired: true,
    readAfterWriteRequired: true,
    rollbackOperationalDocuments: true,
    distributedVaultRollbackClaimed: false,
    partialApplyAllowed: false,
    historicalReferenceRestorations: 68,
    newPendingRowsPreserved: 2,
    duplicateRemovals: 0,
    traceIsAuditMetadata: true,
    traceFieldsWrittenByRecovery: false,
    boundedRuntimeAuthorization: freeze && freeze.status === 'BOUNDED_EXACT_RECOVERY_DRYRUN_AUTHORIZED'
  },
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(item => item.id),
  checks
};
writeEvidence(payload);
console.log(JSON.stringify(payload, null, 2));
process.exit(failed.length ? 41 : 0);
