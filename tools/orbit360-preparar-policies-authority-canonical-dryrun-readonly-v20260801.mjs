#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {applicationDefault, getApps, initializeApp, deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {TENANT, PROJECT, COLLECTIONS, EXPECTED} from './orbit360-policies-dual-path-provenance-constants-v20260801.mjs';
import {snapshotRows, compareState, visualManifest, safeError, text, sha} from './orbit360-policies-dual-path-provenance-lib-v20260801.mjs';
import {planDocument, accumulatePlan, planDigest} from './orbit360-policies-authority-canonical-dryrun-lib-v20260801.mjs';

const ROOT = process.cwd();
const GATE = 'block7-policies-authority-canonical-dryrun-readonly-v20260801';
const VERSION = '7.4.0';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/policies-authority-canonical-dryrun-readonly-v20260801.json');

function save(payload) {
  fs.mkdirSync(path.dirname(OUT), {recursive: true});
  fs.writeFileSync(OUT, JSON.stringify({
    ...payload,
    containsPII: false,
    containsPolicyNumbers: false,
    containsAmounts: false,
    containsDocumentIds: false,
    containsValues: false,
    containsSecrets: false
  }, null, 2) + '\n', 'utf8');
}

function emptySummary() {
  return {actions: {CREATE: 0, UPDATE: 0, OMIT: 0, HOLD: 0}, reasons: {}, validation: {}, batchReferences: {NORMALIZE: 0, OMIT: 0, HOLD: 0, NONE: 0}, relationships: {}};
}

let app;
const result = {
  schemaVersion: 'orbit360-policies-authority-canonical-dryrun-readonly-v1',
  gateId: GATE,
  contractVersion: VERSION,
  status: 'STARTED',
  classification: 'DATA_CONTRACT_DRYRUN',
  tenantId: TENANT,
  projectId: PROJECT,
  authorityDecision: {
    declared: true,
    authoritativePath: 'tenantId/{tenantId}/{collection}',
    authoritativeRole: 'CURRENT_OPERATIONAL_SOURCE',
    canonicalPath: 'tenants/{tenantId}/data/{collection}/items',
    canonicalRole: 'FUTURE_MULTI_TENANT_DESTINATION_AND_READ_MODEL',
    documentaryOnly: true
  },
  collections: {},
  summary: {},
  importBatchPlan: {},
  relationshipAudit: {},
  cumulativeVisualGuard: {},
  firestoreRead: false,
  firestoreWrites: 0,
  operationalWrites: 0,
  reimportExecuted: false,
  seedDeletionExecuted: false,
  frontendAdapted: false,
  browserExecuted: false,
  previewExecuted: false,
  deployExecuted: false,
  rulesApplied: false,
  functionsDeployed: false,
  productionTouched: false,
  mainTouched: false,
  mergeExecuted: false,
  ok: false
};

try {
  if (text(process.env.ORBIT360_PRODUCT_PROJECT_ID) !== PROJECT || text(process.env.ORBIT360_PRODUCT_TENANT_ID) !== TENANT || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('ENVIRONMENT_FAILURE:AUTHORITY_DRYRUN_TARGET');
  }

  app = getApps()[0] || initializeApp({credential: applicationDefault(), projectId: PROJECT});
  const db = getFirestore(app);
  result.firestoreRead = true;

  const [canonicalBatchSnap, legacyBatchSnap] = await Promise.all([
    db.collection('tenants').doc(TENANT).collection('importBatches').get(),
    db.collection('tenantId').doc(TENANT).collection('importBatches').get()
  ]);
  const batchIndex = {
    canonical: new Set(canonicalBatchSnap.docs.map(doc => doc.id)),
    legacy: new Set(legacyBatchSnap.docs.map(doc => doc.id))
  };
  result.importBatchPlan = {
    canonicalBatchDocuments: batchIndex.canonical.size,
    legacyBatchDocuments: batchIndex.legacy.size,
    referenceActions: {NORMALIZE: 0, OMIT: 0, HOLD: 0, NONE: 0}
  };

  const snapshots = {};
  const parentSets = {};
  let totalCanonical = 0;
  let totalLegacy = 0;
  for (const collection of COLLECTIONS) {
    const [canonicalSnap, legacySnap] = await Promise.all([
      db.collection('tenants').doc(TENANT).collection('data').doc(collection).collection('items').get(),
      db.collection('tenantId').doc(TENANT).collection(collection).get()
    ]);
    const canonicalRows = snapshotRows(canonicalSnap);
    const legacyRows = snapshotRows(legacySnap);
    const state = compareState(canonicalRows, legacyRows);
    const expected = EXPECTED[collection];
    for (const key of ['canonicalCount','legacyCount','sharedIds','onlyCanonical','onlyLegacy','canonicalIdSetDigest','legacyIdSetDigest','canonicalContentDigest','legacyContentDigest']) {
      if (state[key] !== expected[key]) throw new Error(`DATA_CONTRACT_FAILURE:AUTHORITY_DRYRUN_DRIFT_${collection}_${key}`);
    }
    snapshots[collection] = {canonicalRows, legacyRows, state};
    parentSets[collection] = new Set(legacyRows.map(row => row.id));
    totalCanonical += canonicalRows.length;
    totalLegacy += legacyRows.length;
  }

  const global = emptySummary();
  const digestRows = [];
  let planItems = 0;
  let canonicalSeedHolds = 0;
  let preservedAdditionalValidation = 0;
  let relationshipBlocked = 0;

  for (const collection of COLLECTIONS) {
    const {canonicalRows, legacyRows, state} = snapshots[collection];
    const canonicalMap = new Map(canonicalRows.map(row => [row.id, row.data]));
    const legacyMap = new Map(legacyRows.map(row => [row.id, row.data]));
    const collectionSummary = emptySummary();

    for (const row of legacyRows) {
      const presence = canonicalMap.has(row.id) ? 'SHARED' : 'LEGACY_ONLY';
      const plan = planDocument({collection, id: row.id, legacyData: row.data, canonicalData: canonicalMap.get(row.id), presence, batchIndex, parentSets});
      accumulatePlan(collectionSummary, plan);
      accumulatePlan(global, plan);
      for (const [key, value] of Object.entries(plan.batch.counts)) result.importBatchPlan.referenceActions[key] += value;
      if (plan.reason === 'PRESERVE_ADDITIONAL_REQUIRES_VALIDATION') preservedAdditionalValidation++;
      if (plan.relationship.blockedGroups > 0) relationshipBlocked++;
      digestRows.push(`${collection}|${sha(row.id)}|${presence}|${plan.action}|${plan.reason}|${plan.validation}|${JSON.stringify(plan.relationship.groups)}|${JSON.stringify(plan.batch.counts)}`);
      planItems++;
    }

    for (const id of state.onlyCanonicalIds) {
      const plan = planDocument({collection, id, legacyData: null, canonicalData: canonicalMap.get(id), presence: 'CANONICAL_ONLY', batchIndex, parentSets});
      accumulatePlan(collectionSummary, plan);
      accumulatePlan(global, plan);
      for (const [key, value] of Object.entries(plan.batch.counts)) result.importBatchPlan.referenceActions[key] += value;
      if (plan.reason === 'QUARANTINE_CANONICAL_SEED_NO_DELETE') canonicalSeedHolds++;
      digestRows.push(`${collection}|${sha(id)}|CANONICAL_ONLY|${plan.action}|${plan.reason}|${plan.validation}|{}|${JSON.stringify(plan.batch.counts)}`);
      planItems++;
    }

    const projectedPhysicalCount = state.canonicalCount + collectionSummary.actions.CREATE;
    result.collections[collection] = {
      authority: 'LEGACY_ROUTE',
      canonicalRole: ['clientes','aseguradoras'].includes(collection) ? 'DERIVED_READ_MODEL' : 'CONTROLLED_MIGRATION_DESTINATION',
      sourceCount: state.legacyCount,
      targetCountBefore: state.canonicalCount,
      shared: state.sharedIds,
      legacyOnly: state.onlyLegacy,
      canonicalOnly: state.onlyCanonical,
      actions: collectionSummary.actions,
      reasons: collectionSummary.reasons,
      validation: collectionSummary.validation,
      batchReferences: collectionSummary.batchReferences,
      relationships: collectionSummary.relationships,
      targetProjectedPhysicalCountWithSeedsQuarantinedNotDeleted: projectedPhysicalCount
    };
  }

  const actionTotal = Object.values(global.actions).reduce((sum, value) => sum + value, 0);
  const planSetDigest = planDigest(digestRows);
  const sourceSnapshotDigest = sha(COLLECTIONS.map(collection => `${collection}:${EXPECTED[collection].legacyContentDigest}`).join('\n'));
  const targetSnapshotDigest = sha(COLLECTIONS.map(collection => `${collection}:${EXPECTED[collection].canonicalContentDigest}`).join('\n'));
  result.cumulativeVisualGuard = visualManifest(ROOT);
  result.relationshipAudit = {
    documentsWithBlockedRequiredRelationshipGroups: relationshipBlocked,
    aggregate: global.relationships,
    exactRelationsRequiredBeforeFutureWrite: true
  };
  result.summary = {
    collectionCount: COLLECTIONS.length,
    totalCanonical,
    totalLegacy,
    planItems,
    actions: global.actions,
    reasons: global.reasons,
    validation: global.validation,
    canonicalSeedHolds,
    preservedAdditionalRequiresValidationClientsAndInsurers: preservedAdditionalValidation,
    sourceSnapshotDigest,
    targetSnapshotDigest,
    planSetDigest,
    authorityDeclared: true,
    migrationApplyAuthorized: false,
    seedDeletionAuthorized: false,
    evidenceComplete:
      totalCanonical === 445 &&
      totalLegacy === 4837 &&
      planItems === 4842 &&
      actionTotal === 4842 &&
      canonicalSeedHolds === 5 &&
      preservedAdditionalValidation === 20 &&
      result.cumulativeVisualGuard.manifestMatches === true
  };

  result.status = 'POLICIES_AUTHORITY_CANONICAL_DRYRUN_READONLY_PASS';
  result.classification = relationshipBlocked > 0 ? 'GO_LAB_CANONICAL_DRYRUN_WITH_RELATION_HOLDS' : 'GO_LAB_CANONICAL_DRYRUN_READY';
  result.ok = result.summary.evidenceComplete;
  if (!result.ok) throw new Error('DATA_CONTRACT_FAILURE:AUTHORITY_DRYRUN_EVIDENCE_INCOMPLETE');
} catch (error) {
  result.status = 'POLICIES_AUTHORITY_CANONICAL_DRYRUN_READONLY_FAIL';
  result.classification = text(error && error.message).split(':')[0] || 'DATA_CONTRACT_FAILURE';
  result.error = safeError(error);
  result.ok = false;
}

save(result);
if (app) await deleteApp(app).catch(() => {});
process.exit(result.ok ? 0 : 41);
