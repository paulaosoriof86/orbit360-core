'use strict';

const CONTRACT_VERSION = '10.10.2';
const POINTER_SCHEMA = 'orbit360-cobros-ledger-active-pointer-v1';
const MANIFEST_SCHEMA = 'orbit360-cobros-ledger-run-manifest-v1';
const GATE_ID = 'block10.10-cobros-full-ledger-write-lab-v20260805';
const SOURCE_LEDGER_COUNT = 365;
const SOURCE_LEDGER_DIGEST = '96d7105912234de14deb5ad0190e537c1b71570519d086616acc9122cb2ca381';
const PACKAGE_LOGICAL_SHA256 = 'a999977e31c73feebb8aafe3ca380a536e1ca60047d57fcdb6d9a592bd829654';
const EXPECTED_COUNTS = Object.freeze({
  pagosReportados: 365,
  evidenciasCobro: 365,
  propuestasConciliacion: 132,
  conciliacionHolds: 233
});
const STAGE_DOCUMENT_COUNT = 1095;

function clean(value) {
  return String(value == null ? '' : value).trim();
}
function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}
function requireSha(value, code) {
  const out = clean(value);
  if (!/^[a-f0-9]{64}$/.test(out)) fail(code);
  return out;
}

function validateActiveLedgerContract(pointer, manifest, tenantId) {
  if (!pointer || typeof pointer !== 'object') fail('COBROS_LEDGER_ACTIVE_POINTER_INVALID');
  if (!manifest || typeof manifest !== 'object') fail('COBROS_LEDGER_ACTIVE_RUN_INVALID');

  if (pointer.id !== 'active') fail('COBROS_LEDGER_POINTER_ID_MISMATCH');
  if (pointer.schemaVersion !== POINTER_SCHEMA) fail('COBROS_LEDGER_POINTER_SCHEMA_MISMATCH');
  if (pointer.status !== 'ACTIVE') fail('COBROS_LEDGER_POINTER_NOT_ACTIVE');
  const activeRunId = clean(pointer.activeRunId);
  if (!/^cobledger_[a-f0-9]{28}$/.test(activeRunId)) fail('COBROS_LEDGER_ACTIVE_RUN_ID_INVALID');
  if (pointer.sourceLedgerCount !== SOURCE_LEDGER_COUNT) fail('COBROS_LEDGER_POINTER_SOURCE_COUNT_MISMATCH');
  if (pointer.sourceLedgerDigest !== SOURCE_LEDGER_DIGEST) fail('COBROS_LEDGER_POINTER_SOURCE_DIGEST_MISMATCH');
  if (pointer.packageLogicalSha256 !== PACKAGE_LOGICAL_SHA256) fail('COBROS_LEDGER_POINTER_PACKAGE_DIGEST_MISMATCH');
  const aggregateDigest = requireSha(pointer.aggregateDigest, 'COBROS_LEDGER_POINTER_AGGREGATE_DIGEST_INVALID');
  if (!pointer.activatedAt) fail('COBROS_LEDGER_POINTER_ACTIVATION_MISSING');

  if (manifest.id !== activeRunId || manifest.runId !== activeRunId) fail('COBROS_LEDGER_MANIFEST_RUN_ID_MISMATCH');
  if (manifest.schemaVersion !== MANIFEST_SCHEMA) fail('COBROS_LEDGER_MANIFEST_SCHEMA_MISMATCH');
  if (manifest.gateId !== GATE_ID || manifest.contractVersion !== CONTRACT_VERSION) fail('COBROS_LEDGER_MANIFEST_CONTRACT_MISMATCH');
  if (tenantId && clean(manifest.tenantId) !== clean(tenantId)) fail('COBROS_LEDGER_MANIFEST_TENANT_MISMATCH');
  if (manifest.status !== 'ACTIVE' || manifest.activationState !== 'ACTIVE') fail('COBROS_LEDGER_MANIFEST_NOT_ACTIVE');
  if (!manifest.activatedAt) fail('COBROS_LEDGER_MANIFEST_ACTIVATION_MISSING');
  if (manifest.sourceLedgerCount !== SOURCE_LEDGER_COUNT || manifest.sourceLedgerDigest !== SOURCE_LEDGER_DIGEST) fail('COBROS_LEDGER_MANIFEST_SOURCE_MISMATCH');
  if (manifest.packageLogicalSha256 !== PACKAGE_LOGICAL_SHA256) fail('COBROS_LEDGER_MANIFEST_PACKAGE_DIGEST_MISMATCH');
  if (manifest.expectedAggregateDigest !== aggregateDigest) fail('COBROS_LEDGER_AGGREGATE_DIGEST_MISMATCH');
  if (!same(manifest.expectedCounts, EXPECTED_COUNTS)) fail('COBROS_LEDGER_EXPECTED_COUNTS_MISMATCH');
  if (manifest.stageDocumentCount !== STAGE_DOCUMENT_COUNT) fail('COBROS_LEDGER_STAGE_COUNT_MISMATCH');
  if (manifest.newCobros !== 0 || manifest.receiptWrites !== 0 || manifest.policyWrites !== 0 || manifest.finmovWrites !== 0) fail('COBROS_LEDGER_BUSINESS_WRITE_BOUNDARY_MISMATCH');

  return Object.freeze({ activeRunId, aggregateDigest });
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  POINTER_SCHEMA,
  MANIFEST_SCHEMA,
  GATE_ID,
  SOURCE_LEDGER_COUNT,
  SOURCE_LEDGER_DIGEST,
  PACKAGE_LOGICAL_SHA256,
  EXPECTED_COUNTS,
  STAGE_DOCUMENT_COUNT,
  validateActiveLedgerContract
});
