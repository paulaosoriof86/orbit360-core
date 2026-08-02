#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {applicationDefault, getApps, initializeApp, deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {TENANT, PROJECT, GATE, VERSION, COLLECTIONS, EXPECTED} from './orbit360-policies-dual-path-provenance-constants-v20260801.mjs';
import {
  text,
  safeError,
  snapshotRows,
  compareState,
  aggregateSignals,
  sharedClassification,
  recommendation,
  visualManifest
} from './orbit360-policies-dual-path-provenance-lib-v20260801.mjs';

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  'orbit360-platform/runtime-gate-crm-v20260716/policies-dual-path-provenance-recommendation-readonly-v20260801.json'
);

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

function add(target, key, count = 1) {
  target[key] = (target[key] || 0) + count;
}

let app;
const result = {
  schemaVersion: 'orbit360-policies-dual-path-provenance-recommendation-readonly-v1',
  gateId: GATE,
  contractVersion: VERSION,
  status: 'STARTED',
  classification: 'DATA_CONTRACT_PROVENANCE_ANALYSIS',
  tenantId: TENANT,
  projectId: PROJECT,
  authorityDeclared: false,
  authoritativePath: '',
  recommendationsBinding: false,
  collections: {},
  summary: {},
  importBatchEvidence: {},
  cumulativeVisualGuard: {},
  firestoreRead: false,
  firestoreWrites: 0,
  operationalWrites: 0,
  reimportExecuted: false,
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
  if (
    text(process.env.ORBIT360_PRODUCT_PROJECT_ID) !== PROJECT ||
    text(process.env.ORBIT360_PRODUCT_TENANT_ID) !== TENANT ||
    !process.env.GOOGLE_APPLICATION_CREDENTIALS
  ) throw new Error('ENVIRONMENT_FAILURE:PROVENANCE_TARGET');

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
  result.importBatchEvidence = {
    canonicalBatchDocuments: batchIndex.canonical.size,
    legacyBatchDocuments: batchIndex.legacy.size
  };

  let totalCanonicalOnly = 0;
  let totalLegacyOnly = 0;
  let totalShared = 0;
  let totalClassifiedShared = 0;
  let totalFocusLegacyOnly = 0;
  let totalRecommendations = 0;

  for (const collection of COLLECTIONS) {
    const [canonicalSnap, legacySnap] = await Promise.all([
      db.collection('tenants').doc(TENANT).collection('data').doc(collection).collection('items').get(),
      db.collection('tenantId').doc(TENANT).collection(collection).get()
    ]);
    const canonicalRows = snapshotRows(canonicalSnap);
    const legacyRows = snapshotRows(legacySnap);
    const state = compareState(canonicalRows, legacyRows);
    const expected = EXPECTED[collection];

    for (const key of [
      'canonicalCount', 'legacyCount', 'sharedIds', 'onlyCanonical', 'onlyLegacy',
      'canonicalIdSetDigest', 'legacyIdSetDigest', 'canonicalContentDigest', 'legacyContentDigest'
    ]) {
      if (state[key] !== expected[key]) throw new Error(`DATA_CONTRACT_FAILURE:DUAL_PATH_DRIFT_${collection}_${key}`);
    }

    const canonicalMap = new Map(canonicalRows.map(row => [row.id, row]));
    const legacyMap = new Map(legacyRows.map(row => [row.id, row]));
    const onlyCanonicalRows = state.onlyCanonicalIds.map(id => canonicalMap.get(id));
    const onlyLegacyRows = state.onlyLegacyIds.map(id => legacyMap.get(id));
    const canonicalAll = aggregateSignals(canonicalRows, batchIndex);
    const legacyAll = aggregateSignals(legacyRows, batchIndex);
    const canonicalOnly = aggregateSignals(onlyCanonicalRows, batchIndex);
    const legacyOnly = aggregateSignals(onlyLegacyRows, batchIndex);

    const sharedSummary = {
      total: state.sharedIds,
      categories: {},
      differenceFieldFrequency: {},
      criticalDifferenceFieldFrequency: {},
      legacyProvenanceOnly: 0,
      canonicalProvenanceOnly: 0,
      bothProvenance: 0,
      neitherProvenance: 0,
      validationAligned: 0,
      validationDifferent: 0
    };

    for (const id of state.shared) {
      const classified = sharedClassification(collection, canonicalMap.get(id).data, legacyMap.get(id).data);
      add(sharedSummary.categories, classified.category);
      classified.differences.forEach(key => add(sharedSummary.differenceFieldFrequency, key));
      classified.criticalDiffs.forEach(key => add(sharedSummary.criticalDifferenceFieldFrequency, key));
      if (classified.legacyProvenance && !classified.canonicalProvenance) sharedSummary.legacyProvenanceOnly++;
      else if (!classified.legacyProvenance && classified.canonicalProvenance) sharedSummary.canonicalProvenanceOnly++;
      else if (classified.legacyProvenance && classified.canonicalProvenance) sharedSummary.bothProvenance++;
      else sharedSummary.neitherProvenance++;
      if (classified.validationSame) sharedSummary.validationAligned++;
      else sharedSummary.validationDifferent++;
    }

    sharedSummary.topDifferenceFields = Object.entries(sharedSummary.differenceFieldFrequency)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 15).map(([field, count]) => ({field, count}));
    delete sharedSummary.differenceFieldFrequency;
    sharedSummary.topCriticalDifferenceFields = Object.entries(sharedSummary.criticalDifferenceFieldFrequency)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 15).map(([field, count]) => ({field, count}));
    delete sharedSummary.criticalDifferenceFieldFrequency;

    const routeRecommendation = recommendation(collection, canonicalAll, legacyAll, state, sharedSummary);
    if (routeRecommendation.recommendedRoute !== 'HOLD') totalRecommendations++;

    result.collections[collection] = {
      state: {
        canonicalCount: state.canonicalCount,
        legacyCount: state.legacyCount,
        sharedIds: state.sharedIds,
        onlyCanonical: state.onlyCanonical,
        onlyLegacy: state.onlyLegacy
      },
      canonicalAll,
      legacyAll,
      canonicalOnly,
      legacyOnly,
      sharedDivergences: sharedSummary,
      recommendation: routeRecommendation
    };

    totalCanonicalOnly += state.onlyCanonical;
    totalLegacyOnly += state.onlyLegacy;
    totalShared += state.sharedIds;
    totalClassifiedShared += sharedSummary.total;
    if (collection === 'clientes' || collection === 'aseguradoras') totalFocusLegacyOnly += state.onlyLegacy;
  }

  result.cumulativeVisualGuard = visualManifest(ROOT);
  result.summary = {
    collectionCount: COLLECTIONS.length,
    totalCanonicalOnly,
    totalLegacyOnly,
    totalShared,
    totalClassifiedShared,
    focusLegacyOnlyClientsAndInsurers: totalFocusLegacyOnly,
    expectedCanonicalOnly: 5,
    expectedFocusLegacyOnly: 20,
    expectedSharedDivergences: 440,
    recommendationsProduced: totalRecommendations,
    authorityDeclared: false,
    evidenceComplete:
      totalCanonicalOnly === 5 &&
      totalFocusLegacyOnly === 20 &&
      totalShared === 440 &&
      totalClassifiedShared === 440 &&
      totalRecommendations === 7 &&
      result.cumulativeVisualGuard.manifestMatches === true
  };
  result.status = 'POLICIES_DUAL_PATH_PROVENANCE_RECOMMENDATION_READONLY_PASS';
  result.classification = 'GO_LAB_DUAL_PATH_PROVENANCE_RECOMMENDATION_READONLY';
  result.ok = result.summary.evidenceComplete;
  if (!result.ok) throw new Error('DATA_CONTRACT_FAILURE:PROVENANCE_EVIDENCE_INCOMPLETE');
} catch (error) {
  result.status = 'POLICIES_DUAL_PATH_PROVENANCE_RECOMMENDATION_READONLY_FAIL';
  result.classification = text(error && error.message).split(':')[0] || 'DATA_CONTRACT_FAILURE';
  result.error = safeError(error);
  result.ok = false;
}

save(result);
if (app) await deleteApp(app).catch(() => {});
process.exit(result.ok ? 0 : 41);
