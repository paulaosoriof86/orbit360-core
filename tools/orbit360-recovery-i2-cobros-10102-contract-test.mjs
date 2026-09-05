#!/usr/bin/env node
'use strict';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  validateActiveLedgerContract,
  SOURCE_LEDGER_DIGEST,
  PACKAGE_LOGICAL_SHA256,
  EXPECTED_COUNTS
} = require('../functions/cobros-ledger-contract.js');

const RUN_ID = 'cobledger_0123456789abcdef0123456789ab';
const AGG = 'a'.repeat(64);
const activatedAt = { seconds: 1, nanoseconds: 0 };

function fixture() {
  const pointer = {
    id: 'active',
    schemaVersion: 'orbit360-cobros-ledger-active-pointer-v1',
    activeRunId: RUN_ID,
    sourceLedgerCount: 365,
    sourceLedgerDigest: SOURCE_LEDGER_DIGEST,
    packageLogicalSha256: PACKAGE_LOGICAL_SHA256,
    aggregateDigest: AGG,
    status: 'ACTIVE',
    activatedAt
  };
  const manifest = {
    id: RUN_ID,
    schemaVersion: 'orbit360-cobros-ledger-run-manifest-v1',
    gateId: 'block10.10-cobros-full-ledger-write-lab-v20260805',
    contractVersion: '10.10.2',
    tenantId: 'alianzas-soluciones',
    runId: RUN_ID,
    status: 'ACTIVE',
    sourceLedgerCount: 365,
    sourceLedgerDigest: SOURCE_LEDGER_DIGEST,
    packageLogicalSha256: PACKAGE_LOGICAL_SHA256,
    expectedCounts: { ...EXPECTED_COUNTS },
    expectedAggregateDigest: AGG,
    stageDocumentCount: 1095,
    newCobros: 0,
    receiptWrites: 0,
    policyWrites: 0,
    finmovWrites: 0,
    activationState: 'ACTIVE',
    activatedAt
  };
  return { pointer, manifest };
}

function expectPass(name, mutate = () => {}) {
  const { pointer, manifest } = fixture();
  mutate(pointer, manifest);
  const result = validateActiveLedgerContract(pointer, manifest, 'alianzas-soluciones');
  if (result.activeRunId !== RUN_ID || result.aggregateDigest !== AGG) throw new Error(`${name}: unexpected result`);
  console.log(`PASS ${name}`);
}

function expectFail(name, code, mutate) {
  const { pointer, manifest } = fixture();
  mutate(pointer, manifest);
  try {
    validateActiveLedgerContract(pointer, manifest, 'alianzas-soluciones');
    throw new Error(`${name}: expected ${code}`);
  } catch (error) {
    if (error.code !== code) throw error;
  }
  console.log(`PASS ${name} -> ${code}`);
}

expectPass('exact-approved-contract');
expectFail('pointer-schema', 'COBROS_LEDGER_POINTER_SCHEMA_MISMATCH', p => { p.schemaVersion = 'legacy'; });
expectFail('pointer-status', 'COBROS_LEDGER_POINTER_NOT_ACTIVE', p => { p.status = 'STAGING'; });
expectFail('run-id-shape', 'COBROS_LEDGER_ACTIVE_RUN_ID_INVALID', p => { p.activeRunId = 'invented_run'; });
expectFail('source-digest', 'COBROS_LEDGER_POINTER_SOURCE_DIGEST_MISMATCH', p => { p.sourceLedgerDigest = 'b'.repeat(64); });
expectFail('pointer-activation', 'COBROS_LEDGER_POINTER_ACTIVATION_MISSING', p => { delete p.activatedAt; });
expectFail('manifest-run-link', 'COBROS_LEDGER_MANIFEST_RUN_ID_MISMATCH', (p, m) => { m.runId = 'cobledger_aaaaaaaaaaaaaaaaaaaaaaaaaaaa'; });
expectFail('manifest-contract', 'COBROS_LEDGER_MANIFEST_CONTRACT_MISMATCH', (p, m) => { m.contractVersion = '10.10.1'; });
expectFail('manifest-active', 'COBROS_LEDGER_MANIFEST_NOT_ACTIVE', (p, m) => { m.activationState = 'STAGED'; });
expectFail('aggregate-link', 'COBROS_LEDGER_AGGREGATE_DIGEST_MISMATCH', (p, m) => { m.expectedAggregateDigest = 'b'.repeat(64); });
expectFail('stage-count', 'COBROS_LEDGER_STAGE_COUNT_MISMATCH', (p, m) => { m.stageDocumentCount = 1094; });
expectFail('business-write-boundary', 'COBROS_LEDGER_BUSINESS_WRITE_BOUNDARY_MISMATCH', (p, m) => { m.newCobros = 1; });

console.log('COBROS_10102_ACTIVE_LEDGER_CONTRACT_PASS');
