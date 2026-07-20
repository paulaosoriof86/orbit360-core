#!/usr/bin/env node
import fs from 'node:fs';

const EVIDENCE = process.env.ORBIT360_IMPORTERS_E2E_EVIDENCE ||
  'orbit360-platform/runtime-gate-crm-v20260716/importers-e2e-acceptance-sanitized.json';
const CLEANUP = process.env.ORBIT360_IMPORTERS_E2E_CLEANUP ||
  'orbit360-platform/runtime-gate-crm-v20260716/importers-e2e-cleanup-sanitized.json';
const VAULT = process.env.ORBIT360_IMPORTERS_E2E_VAULT_ROLLBACK ||
  'orbit360-platform/runtime-gate-crm-v20260716/importers-e2e-vault-rollback-sanitized.json';

function read(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
const evidence = read(EVIDENCE, {
  schemaVersion: 'orbit360-importers-e2e-evidence-v1',
  stage: 'failed',
  predicates: {},
  failure: { code: 'PIPELINE_MECHANISM_FAILURE', stage: 'initializing' },
  containsPII: false,
  containsSecrets: false
});
const cleanup = read(CLEANUP, {});
const vault = read(VAULT, {});

const rollbackOk =
  cleanup.insurerDeleted === true &&
  cleanup.countsRestored === true &&
  vault.vaultRecordDeleted === true &&
  vault.transientVersionDestroyed === true;

evidence.predicates = Object.assign({}, evidence.predicates || {}, { rollbackOk });
evidence.cleanup = {
  insurerDeleted: cleanup.insurerDeleted === true,
  countsRestored: cleanup.countsRestored === true,
  backendAuditDeleted: Number(cleanup.backendAuditDeleted || 0),
  operationalAuditDeleted: Number(cleanup.operationalAuditDeleted || 0),
  vaultRecordDeleted: vault.vaultRecordDeleted === true,
  transientVersionDestroyed: vault.transientVersionDestroyed === true
};

const p = evidence.predicates;
const functionalOk =
  p.browserAuthReady === true &&
  p.activeRoleResolved === true &&
  p.sourceParsed === true &&
  p.dryRunProduced === true &&
  p.targetIdsResolved === true &&
  p.providerInvoked === true &&
  p.remoteConfirmation === true &&
  (p.storeWriteObserved === true || p.opaqueReferenceObserved === true) &&
  p.readAfterWriteOk === true &&
  p.auditSuccessObserved === true &&
  p.auditFailureObserved === true &&
  p.plaintextSecretsInOperationalStore === false;

if (functionalOk && rollbackOk && evidence.stage === 'audit_observed') {
  evidence.stageHistory = [].concat(evidence.stageHistory || [], [
    { stage: 'rollback_completed', code: '', count: 1 },
    { stage: 'completed', code: '', count: 0 }
  ]);
  evidence.stage = 'completed';
  evidence.failure = null;
  evidence.ok = true;
} else {
  evidence.ok = false;
  if (!evidence.failure) {
    evidence.failure = {
      code: functionalOk ? 'ROLLBACK_FAILED' : 'PIPELINE_MECHANISM_FAILURE',
      stage: evidence.stage || 'unknown'
    };
  }
}

evidence.containsPII = false;
evidence.containsSecrets = false;
fs.writeFileSync(EVIDENCE, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

if (!evidence.ok) {
  console.error(`ORBIT360_IMPORTERS_E2E_NO_GO:${evidence.failure?.code || 'UNKNOWN'}`);
  process.exit(61);
}
console.log('ORBIT360_IMPORTERS_E2E_OK');
