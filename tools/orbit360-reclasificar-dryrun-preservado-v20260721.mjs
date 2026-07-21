#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const SOURCE = process.argv[2] || 'orbit360-platform/docs/evidence/dryrun-29865964420-source-sanitized.json';
const MANIFEST = process.argv[3] || 'tools/orbit360-bank-reference-recovery-map-v20260721.json';
const OUT = process.argv[4] || 'orbit360-platform/docs/evidence/dryrun-29865964420-reclassified-sanitized.json';
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const hash = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
const source = read(SOURCE);
const manifest = read(MANIFEST);
const recovery = Array.isArray(manifest.recoveryMappings) ? manifest.recoveryMappings : [];
const pending = Array.isArray(manifest.newPendingRows) ? manifest.newPendingRows : [];
const refs = recovery.map(row => row[7]);
const currentIds = recovery.map(row => `${row[0]}|${row[1]}`);
const legacyIds = recovery.map(row => `${row[0]}|${row[2]}`);
const pendingIds = pending.map(row => `${row[0]}|${row[1]}`);
const unique = arr => new Set(arr).size === arr.length;

const protectedRowsBefore = Number(source.before.validReferences) + Number(source.before.pendingReferences);
const protectedRowsAfter = Number(source.simulatedAfter.validReferences) + Number(source.simulatedAfter.pendingReferences);
const nonProtectedResourcesBefore = Number(source.before.bankRows) - protectedRowsBefore;
const nonProtectedResourcesAfter = Number(source.simulatedAfter.bankRows) - protectedRowsAfter;

const checks = {
  sourceRunExact: source.sourceRunId === 29865964420,
  sourceArtifactExact: source.sourceArtifactId === 8509192602 && source.sourceArtifactDigest === 'sha256:19e63019c299423a29ba0b3fb23ec1c93fd659dacf796b877635fcbc6a1a56e5',
  sourceModeReadOnly: source.mode === 'read_only_exact_manifest_dry_run',
  noWrites: source.writesExecuted === false,
  noDeploy: source.deployExecuted === false,
  noMigration: source.migrationExecuted === false,
  noPII: source.containsPII === false,
  noSecrets: source.containsSecrets === false,
  countsPreserved: source.before.clients === 414 && source.before.insurers === 26 && source.before.advisors === 7,
  protectedRowsBeforeExact: protectedRowsBefore === 93,
  nonProtectedResourcesExcludedFromBankContract: nonProtectedResourcesBefore === 14,
  vaultRowsExact: source.before.vaultRows === 91,
  rawProtectedValuesZero: source.before.rawProtectedValues === 0,
  restoresExact: source.proposal.restores === 68,
  newPendingExact: source.proposal.newPendingRowsPreserved === 2,
  removalsZero: source.proposal.duplicateRemovals === 0,
  createsZero: source.proposal.creates === 0,
  deletesZero: source.proposal.deletes === 0,
  reorderZero: source.proposal.reorderChanges === 0,
  affectedGtExact: source.proposal.affectedDocuments === 13,
  nonReferenceChangesZero: source.proposal.nonReferenceFieldChanges === 0,
  traceChangesZero: source.proposal.traceFieldChanges === 0,
  colombiaChangesZero: source.proposal.colombiaDocumentChanges === 0,
  protectedRowsAfterExact: protectedRowsAfter === 93,
  finalValidExact: source.simulatedAfter.validReferences === 91,
  finalPendingExact: source.simulatedAfter.pendingReferences === 2,
  nonProtectedResourcesPreserved: nonProtectedResourcesAfter === nonProtectedResourcesBefore,
  manifestSchemaExact: manifest.schemaVersion === 'orbit360-bank-reference-recovery-map-v3-sanitized',
  manifestContractExact: manifest.summary.recoveryMappings === 68 && manifest.summary.newPendingRows === 2 && manifest.summary.duplicateIncomingRows === 0,
  recoveryCurrentIdsUnique: unique(currentIds),
  recoveryLegacyIdsUnique: unique(legacyIds),
  expectedReferenceHashesUnique: unique(refs),
  newPendingIdsUnique: unique(pendingIds),
  newPendingSeparateFromRecovery: pendingIds.every(id => !new Set(currentIds).has(id)),
  fingerprintHeuristicNotCanonicalIdentity: source.simulatedAfter.duplicateFingerprints === 2 && manifest.identityContract.stableIdentityKeys.includes('expectedAccountRefHash')
};

const failed = Object.entries(checks).filter(([,ok]) => !ok).map(([id]) => id);
const report = {
  schemaVersion: 'orbit360-preserved-dryrun-reclassification-v1',
  generatedAt: new Date().toISOString(),
  sourceRunId: source.sourceRunId,
  sourceArtifactId: source.sourceArtifactId,
  sourceArtifactDigest: source.sourceArtifactDigest,
  sourceReportHash: hash(JSON.stringify(source)),
  mode: 'offline_reclassification_no_runtime',
  ok: failed.length === 0,
  classification: failed.length ? 'PIPELINE_MECHANISM_FAILURE' : null,
  originalFailureClassification: ['PIPELINE_MECHANISM_FAILURE','VALIDATOR_STALE'],
  cause: {
    resourceCountBug: 'all_cuentas_resources_were_counted_as_protected_bank_rows',
    fingerprintBug: 'noncanonical_metadata_fingerprint_was_used_as_duplicate_gate',
    booleanPolarityBug: 'safe_false_flags_were_evaluated_as_failed_checks'
  },
  correctedContract: {
    totalCuentaResourcesBefore: source.before.bankRows,
    protectedBankRowsBefore: protectedRowsBefore,
    nonProtectedResourceRowsBefore: nonProtectedResourcesBefore,
    historicalReferenceRestorations: source.proposal.restores,
    newPendingRowsPreserved: source.proposal.newPendingRowsPreserved,
    duplicateRemovals: source.proposal.duplicateRemovals,
    totalCuentaResourcesAfter: source.simulatedAfter.bankRows,
    protectedBankRowsAfter: protectedRowsAfter,
    validReferencesAfter: source.simulatedAfter.validReferences,
    pendingReferencesAfter: source.simulatedAfter.pendingReferences
  },
  checks,
  failedCheckIds: failed,
  writesExecuted: false,
  firestoreReadExecuted: false,
  vaultReadExecuted: false,
  runtimeExecuted: false,
  containsPII: false,
  containsSecrets: false,
  acceptance: failed.length === 0 ? 'DRYRUN_FUNCTIONALLY_GREEN_FROM_PRESERVED_EVIDENCE' : 'STOP_THE_LINE'
};
fs.mkdirSync(OUT.substring(0, OUT.lastIndexOf('/')), {recursive:true});
fs.writeFileSync(OUT, JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
process.exit(failed.length ? 41 : 0);
