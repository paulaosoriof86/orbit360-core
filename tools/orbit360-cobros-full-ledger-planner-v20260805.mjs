#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const GATE_ID = 'block10.10-cobros-full-ledger-write-lab-v20260805';
export const CONTRACT_VERSION = '10.10.2';
export const PROJECT_ID = 'ays-orbit-360-lab';
export const TENANT_ID = 'alianzas-soluciones';
export const SOURCE_LEDGER_DIGEST = '96d7105912234de14deb5ad0190e537c1b71570519d086616acc9122cb2ca381';
export const PACKAGE_SHA256 = '9769d7a952e9b2a15c27821da9098e5899466b0558ba8b68e021689864ad8cfe';
export const PACKAGE_LOGICAL_SHA256 = 'a999977e31c73feebb8aafe3ca380a536e1ca60047d57fcdb6d9a592bd829654';
export const EXPECTED_COUNTS = Object.freeze({
  pagosReportados: 365,
  evidenciasCobro: 365,
  propuestasConciliacion: 132,
  conciliacionHolds: 233
});

export const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
export const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
export const digest = value => sha256(Buffer.from(JSON.stringify(stable(value)), 'utf8'));
export const logicalDigest = value => {
  const copy = JSON.parse(JSON.stringify(value));
  delete copy.logicalSha256;
  return digest(copy);
};

function fail(code, detail = '') {
  const error = new Error(`${code}${detail ? `:${detail}` : ''}`);
  error.code = code;
  throw error;
}

function assertUniqueDocuments(rows, name) {
  if (!Array.isArray(rows)) fail('DATA_CONTRACT_FAILURE', `${name}_NOT_ARRAY`);
  const ids = rows.map(row => String(row && row.documentId || '').trim());
  if (ids.some(id => !/^[a-f0-9]{64}$/.test(id))) fail('DATA_CONTRACT_FAILURE', `${name}_DOCUMENT_ID_INVALID`);
  if (new Set(ids).size !== ids.length) fail('DATA_CONTRACT_FAILURE', `${name}_DOCUMENT_ID_DUPLICATE`);
}

export function validatePrivatePackageBytes(bytes, options = {}) {
  const physicalSha = sha256(bytes);
  const expectedPhysical = options.packageSha256 || PACKAGE_SHA256;
  const expectedLogical = options.packageLogicalSha256 || PACKAGE_LOGICAL_SHA256;
  if (physicalSha !== expectedPhysical) fail('DATA_CONTRACT_FAILURE', 'PRIVATE_PACKAGE_SHA256');
  const pkg = JSON.parse(bytes.toString('utf8'));
  if (pkg.schemaVersion !== 'orbit360-cobros-full-ledger-write-private-package-v1') fail('DATA_CONTRACT_FAILURE', 'PRIVATE_PACKAGE_SCHEMA');
  if (pkg.gateId !== GATE_ID || pkg.contractVersion !== CONTRACT_VERSION) fail('DATA_CONTRACT_FAILURE', 'PRIVATE_PACKAGE_GATE_VERSION');
  if (pkg.projectId !== PROJECT_ID || pkg.tenantId !== TENANT_ID || pkg.rcId !== 'RC-AYS-LAB-CANONICA-01') fail('DATA_CONTRACT_FAILURE', 'PRIVATE_PACKAGE_SCOPE');
  if (pkg.sourceLedger?.count !== 365 || pkg.sourceLedger?.digest !== SOURCE_LEDGER_DIGEST) fail('DATA_CONTRACT_FAILURE', 'PRIVATE_PACKAGE_SOURCE_LEDGER');
  if (pkg.logicalSha256 !== expectedLogical || logicalDigest(pkg) !== expectedLogical) fail('DATA_CONTRACT_FAILURE', 'PRIVATE_PACKAGE_LOGICAL_SHA256');
  if (pkg.writeTopology?.strategy !== 'ISOLATED_RUN_SUBCOLLECTIONS_THEN_POINTER_TRANSACTION') fail('DATA_CONTRACT_FAILURE', 'PRIVATE_PACKAGE_WRITE_TOPOLOGY');
  if (pkg.writeTopology?.stageWrites !== 1095 || pkg.writeTopology?.maximumWrites !== 1098 || pkg.writeTopology?.directTargetCollectionStageWrites !== 0) fail('DATA_CONTRACT_FAILURE', 'PRIVATE_PACKAGE_WRITE_COUNTS');
  if (pkg.plannedCounts?.newCobros !== 0 || pkg.plannedCounts?.receiptWrites !== 0 || pkg.plannedCounts?.policyWrites !== 0 || pkg.plannedCounts?.finmovWrites !== 0) fail('SECURITY_FAILURE', 'PRIVATE_PACKAGE_BUSINESS_WRITES');

  for (const [name, count] of Object.entries(EXPECTED_COUNTS)) {
    const rows = pkg[name];
    if (!Array.isArray(rows) || rows.length !== count || pkg.plannedCounts?.[name] !== count) fail('DATA_CONTRACT_FAILURE', `${name}_COUNT`);
    assertUniqueDocuments(rows, name);
  }
  if (pkg.containsPII !== false || pkg.containsSecrets !== false || pkg.containsPasswords !== false || pkg.repositoryPersistenceProhibited !== true) fail('SECURITY_FAILURE', 'PRIVATE_PACKAGE_BOUNDARY');
  return { pkg, physicalSha, logicalSha: expectedLogical };
}

export function buildLedgerPlan(pkg) {
  const runId = `cobledger_${sha256(Buffer.from(`${TENANT_ID}|${SOURCE_LEDGER_DIGEST}|${pkg.logicalSha256}`, 'utf8')).slice(0, 28)}`;
  const classes = ['pagosReportados', 'evidenciasCobro', 'propuestasConciliacion', 'conciliacionHolds'];
  const collections = {};
  const collectionDigests = {};

  for (const name of classes) {
    collections[name] = pkg[name].map(row => {
      const payloadDigest = digest(row);
      return {
        id: row.documentId,
        data: {
          ...row,
          runId,
          documentClass: name,
          activationState: 'STAGED',
          sourceLedgerDigest: SOURCE_LEDGER_DIGEST,
          packageLogicalSha256: pkg.logicalSha256,
          payloadDigest
        },
        payloadDigest
      };
    });
    const digestRows = collections[name].map(row => ({ id: row.id, payloadDigest: row.payloadDigest })).sort((a, b) => a.id.localeCompare(b.id));
    collectionDigests[name] = digest(digestRows);
  }

  const stageDocumentCount = classes.reduce((sum, name) => sum + collections[name].length, 0);
  if (stageDocumentCount !== 1095) fail('DATA_CONTRACT_FAILURE', `STAGE_DOCUMENT_COUNT:${stageDocumentCount}`);
  const aggregateDigest = digest(classes.map(name => ({ name, count: collections[name].length, digest: collectionDigests[name] })));
  const manifest = {
    id: runId,
    schemaVersion: 'orbit360-cobros-ledger-run-manifest-v1',
    gateId: GATE_ID,
    contractVersion: CONTRACT_VERSION,
    projectId: PROJECT_ID,
    tenantId: TENANT_ID,
    runId,
    status: 'STAGING',
    sourceLedgerCount: 365,
    sourceLedgerDigest: SOURCE_LEDGER_DIGEST,
    packageSha256: PACKAGE_SHA256,
    packageLogicalSha256: pkg.logicalSha256,
    expectedCounts: { ...EXPECTED_COUNTS },
    expectedCollectionDigests: collectionDigests,
    expectedAggregateDigest: aggregateDigest,
    stageDocumentCount,
    newCobros: 0,
    receiptWrites: 0,
    policyWrites: 0,
    finmovWrites: 0,
    activationState: 'STAGED'
  };
  const activePointer = {
    id: 'active',
    schemaVersion: 'orbit360-cobros-ledger-active-pointer-v1',
    activeRunId: runId,
    sourceLedgerCount: 365,
    sourceLedgerDigest: SOURCE_LEDGER_DIGEST,
    packageLogicalSha256: pkg.logicalSha256,
    aggregateDigest,
    status: 'ACTIVE'
  };
  return {
    runId,
    collections,
    collectionDigests,
    aggregateDigest,
    stageDocumentCount,
    manifest,
    activePointer,
    maximumWrites: 1098
  };
}

export function sanitizedPlan(plan) {
  return {
    schemaVersion: 'orbit360-cobros-full-ledger-private-plan-sanitized-v1',
    gateId: GATE_ID,
    contractVersion: CONTRACT_VERSION,
    runIdSha256: sha256(Buffer.from(plan.runId, 'utf8')),
    sourceLedgerCount: 365,
    sourceLedgerDigest: SOURCE_LEDGER_DIGEST,
    collectionCounts: Object.fromEntries(Object.entries(plan.collections).map(([name, rows]) => [name, rows.length])),
    collectionDigests: plan.collectionDigests,
    aggregateDigest: plan.aggregateDigest,
    stageDocumentCount: plan.stageDocumentCount,
    manifestCreateWrites: 1,
    activationTransactionWrites: 2,
    maximumWrites: plan.maximumWrites,
    directVisibleCollectionStageWrites: 0,
    newCobros: 0,
    receiptWrites: 0,
    policyWrites: 0,
    finmovWrites: 0,
    executionAuthorized: false,
    firestoreReadAuthorized: false,
    writeAuthorized: false,
    deployAuthorized: false,
    productionAuthorized: false,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: true
  };
}

function isCli() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isCli()) {
  const [packagePath, outputPath] = process.argv.slice(2);
  if (!packagePath || !outputPath) {
    console.error('Uso: node tools/orbit360-cobros-full-ledger-planner-v20260805.mjs <private-package> <sanitized-output>');
    process.exit(2);
  }
  try {
    const { pkg } = validatePrivatePackageBytes(fs.readFileSync(packagePath));
    const plan = buildLedgerPlan(pkg);
    const output = sanitizedPlan(plan);
    fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.error(String(error?.message || error));
    process.exit(41);
  }
}
