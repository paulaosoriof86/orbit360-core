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
    schemaVersion: 'orbit360-static-importer-atomicity-v2-bounded-runtime',
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
  const duplicates = Array.isArray(manifest.duplicateIncomingRows) ? manifest.duplicateIncomingRows : [];
  const currentIds = recovery.map(row => row[1]);
  const legacyIds = recovery.map(row => row[2]);
  const incomingDuplicateIds = duplicates.map(row => row[1]);
  const allPendingIds = currentIds.concat(incomingDuplicateIds);
  const legacyHashes = recovery.map(row => row[6]);
  const expectedRefHashes = recovery.map(row => row[7]);
  const hash12 = value => /^[a-f0-9]{12}$/.test(String(value || ''));

  check('MANIFEST_SCHEMA', manifest.schemaVersion === 'orbit360-bank-reference-recovery-map-v2-sanitized', manifest.schemaVersion);
  check('MANIFEST_MODE', manifest.mode === 'STATIC_CONFIRMED_NO_WRITE', manifest.mode);
  check('MANIFEST_EVIDENCE_CONFIRMED', manifest.evidenceClassification === 'CONFIRMED', manifest.evidenceClassification);
  check('RECOVERY_COUNT_68', recovery.length === 68, recovery.length);
  check('DUPLICATE_COUNT_2', duplicates.length === 2, duplicates.length);
  check('UNMAPPED_ZERO', Number(manifest.summary && manifest.summary.unmappedRows) === 0, manifest.summary && manifest.summary.unmappedRows);
  check('AMBIGUOUS_ZERO', Number(manifest.summary && manifest.summary.ambiguousRows) === 0, manifest.summary && manifest.summary.ambiguousRows);
  check('FINAL_REFERENCES_91', Number(manifest.summary && manifest.summary.expectedFinalValidReferences) === 91, manifest.summary && manifest.summary.expectedFinalValidReferences);
  check('FINAL_PENDING_ZERO', Number(manifest.summary && manifest.summary.expectedFinalPendingRows) === 0, manifest.summary && manifest.summary.expectedFinalPendingRows);
  check('FINAL_DUPLICATES_ZERO', Number(manifest.summary && manifest.summary.expectedFinalDuplicateRows) === 0, manifest.summary && manifest.summary.expectedFinalDuplicateRows);
  check('RECOVERY_ROWS_SHAPE', recovery.every(row => Array.isArray(row) && row.length === 8 && Number(row[4]) > 0), `rows=${recovery.length}`);
  check('DUPLICATE_ROWS_SHAPE', duplicates.every(row => Array.isArray(row) && row.length === 8 && Number(row[4]) > 0), `rows=${duplicates.length}`);
  check('CURRENT_IDS_UNIQUE', unique(currentIds), `unique=${new Set(currentIds).size}`);
  check('LEGACY_IDS_UNIQUE', unique(legacyIds), `unique=${new Set(legacyIds).size}`);
  check('ALL_PENDING_IDS_70_UNIQUE', allPendingIds.length === 70 && unique(allPendingIds), `rows=${allPendingIds.length}; unique=${new Set(allPendingIds).size}`);
  check('LEGACY_HASHES_UNIQUE', unique(legacyHashes) && legacyHashes.every(hash12), `unique=${new Set(legacyHashes).size}`);
  check('REFERENCE_HASHES_UNIQUE', unique(expectedRefHashes) && expectedRefHashes.every(hash12), `unique=${new Set(expectedRefHashes).size}`);
  check('ALL_MISSING_HASHES_COVERED', manifest.validation && manifest.validation.allMissingReferenceHashesCovered === true && Number(manifest.validation.hashSetDifference) === 0, JSON.stringify(manifest.validation || {}));
  check('ALL_PENDING_ROWS_ACCOUNTED', manifest.validation && manifest.validation.allPendingRowsAccountedFor === true && Number(manifest.validation.pendingRowsAccountedFor) === 70, JSON.stringify(manifest.validation || {}));
  check('MANIFEST_NO_PII', manifest.safety && manifest.safety.containsPII === false, 'containsPII');
  check('MANIFEST_NO_SECRETS', manifest.safety && manifest.safety.containsSecrets === false, 'containsSecrets');
  check('MANIFEST_NO_RAW_BANK_VALUES', manifest.safety && manifest.safety.containsRawBankValues === false, 'containsRawBankValues');
  check('MANIFEST_COLOMBIA_UNTOUCHED', manifest.safety && manifest.safety.colombiaTouched === false, 'colombiaTouched');
}

const parser = read(FILES.parser);
const coordinator = read(FILES.coordinator);
const bridge = read(FILES.targetBridge);
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
check('BRIDGE_BLOCKS_PROVIDER_STORE_UPDATE', bridge.includes("store.update = function") && bridge.includes("collection !== 'aseguradoras'") && bridge.includes('finally'), 'provider isolation');

const coordinatorSyntax = syntaxCheck(FILES.coordinator);
const bridgeSyntax = syntaxCheck(FILES.targetBridge);
check('COORDINATOR_SYNTAX', coordinatorSyntax.ok, coordinatorSyntax.detail);
check('BRIDGE_SYNTAX', bridgeSyntax.ok, bridgeSyntax.detail);

if (freeze) {
  const status = String(freeze.status || '');
  const authorization = freeze.runtimeAuthorization || {};
  const hardFrozen = status.startsWith('STOP_THE_LINE');
  const bounded = status === 'BOUNDED_EXACT_RECOVERY_DRYRUN_AUTHORIZED';
  check('INCIDENT_CONTROL_ACTIVE', hardFrozen || bounded, status);
  check(
    'RUNTIME_SCOPE_BOUND',
    hardFrozen || (
      bounded &&
      authorization.active === true &&
      authorization.authorizationId === 'exact-bank-reference-recovery-dryrun-68plus2-v1' &&
      authorization.action === 'exact_recovery_readonly_dry_run' &&
      authorization.allowedExecutions === 1 &&
      authorization.writesAllowed === false &&
      authorization.script === 'tools/orbit360-dryrun-recuperar-referencias-bancarias-exacto-v20260721.mjs' &&
      authorization.manifest === FILES.manifest
    ),
    bounded ? JSON.stringify({ authorizationId: authorization.authorizationId, action: authorization.action, allowedExecutions: authorization.allowedExecutions, writesAllowed: authorization.writesAllowed }) : status
  );
}

const failed = checks.filter(item => !item.ok);
const payload = {
  schemaVersion: 'orbit360-static-importer-atomicity-v2-bounded-runtime',
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
    duplicates: manifest && manifest.summary && manifest.summary.duplicateIncomingRows || 0,
    ambiguous: manifest && manifest.summary && manifest.summary.ambiguousRows || 0,
    expectedFinalReferences: manifest && manifest.summary && manifest.summary.expectedFinalValidReferences || 0
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
