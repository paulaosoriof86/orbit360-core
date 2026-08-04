#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const RELEASE_ROOT = process.env.ORBIT360_RC12_ROOT || ROOT;
const OUT = process.env.ORBIT360_UNIFIED_CANDIDATE_EVIDENCE ||
  'orbit360-platform/runtime-gate-crm-v20260716/rc12-cumulative-candidate-unified-validation.json';
const MANIFEST_PATH = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-cumulative-candidate-unified-manifest.json';
const AUDIT_PATH = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-forensic-module-audit.json';
const GATE711_PATH = 'tools/orbit360-validator-lifecycle-contract-gate711-release-critical-runtime-v20260802.json';
const REQUIRED_COLLECTIONS = ['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'];
const REQUIRED_MODULES = ['cliente360','aseguradoras','polizas','cobros','ops','leads'];
const EXPECTED_COUNTS = Object.freeze({
  clientes:430,
  aseguradoras:30,
  polizas:1373,
  vehiculos:1032,
  recibosEsperados:1294,
  carteraPrimas:673,
  cobros:5,
  asesores:7
});
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const json = rel => JSON.parse(read(ROOT, rel));
const check = (id, ok, detail='') => ({ id, ok:Boolean(ok), detail:String(detail || '').slice(0,700) });
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);

const manifest = json(MANIFEST_PATH);
const audit = json(AUDIT_PATH);
const gate711 = json(GATE711_PATH);
const store = read(RELEASE_ROOT, 'orbit360-platform/data/store-firestore-lab.local.js');
const index = read(RELEASE_ROOT, 'orbit360-platform/index.html');
const loader = read(RELEASE_ROOT, 'orbit360-platform/core/backend-lab-loader.js');
const firebase = JSON.parse(read(RELEASE_ROOT, 'firebase.json'));

const mergeBase = spawnSync('git', ['merge-base', manifest.baseline, manifest.releaseCommit], { encoding:'utf8' });
const releaseHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd:RELEASE_ROOT, encoding:'utf8' });
const expectedDigest = manifest.data.canonicalSnapshotDigest;
const gateCounts = gate711.datasetEvidence || {};
const manifestCounts = manifest.data.operationalCounts || {};
const storeCollectionsBound = REQUIRED_COLLECTIONS.every(name => store.includes(`'${name}'`));
const moduleScriptsBound = REQUIRED_MODULES.every(name => index.includes(`modules/${name}.js`));
const storeIndex = index.indexOf('data/store-firestore-lab.local.js');
const firstRequiredModuleIndex = Math.min(...REQUIRED_MODULES.map(name => index.indexOf(`modules/${name}.js`)).filter(x => x >= 0));

const checks = [
  check('MANIFEST_SCHEMA', manifest.schemaVersion === 'orbit360-cumulative-candidate-unified-manifest-v1'),
  check('MANIFEST_DECISION', manifest.decision === 'CANDIDATE_UNIFIED_DATA_PRESERVED_ACCESS_BLOCKED'),
  check('RELEASE_HEAD_EXACT', releaseHead.status === 0 && releaseHead.stdout.trim() === manifest.releaseCommit, releaseHead.stdout.trim()),
  check('BASELINE_LINEAGE', mergeBase.status === 0 && mergeBase.stdout.trim() === manifest.baseline, mergeBase.stdout.trim()),
  check('AUDIT_CANDIDATE_EXACT', audit.candidate === manifest.releaseCommit),
  check('AUDIT_MODULE_PARITY', audit.guarantees?.moduleTreeParityBaseline === true && audit.guarantees?.moduleTreeParityLive === true && audit.guarantees?.noPostBaselineModuleChangesInLive === true),
  check('AUDIT_MODULE_COUNTS', audit.counts?.routes === 31 && audit.counts?.workedActiveModules === 31 && audit.counts?.failedModules === 0),
  check('GATE711_CLOSED_PASS', gate711.status === 'CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_PASS_CLOSED'),
  check('GATE711_SNAPSHOT_IDENTICAL', gate711.runtimeEvidence?.finalSnapshot === 'PASS_IDENTICAL' && gate711.snapshotEvidence?.byteIdentical === true),
  check('DATA_COUNTS_BOUND', same(gateCounts, EXPECTED_COUNTS) && same(manifestCounts, EXPECTED_COUNTS)),
  check('CANONICAL_DIGEST_BOUND', gate711.snapshotEvidence?.canonicalDigestSealed === expectedDigest && manifest.store?.canonicalDigestBound === expectedDigest && store.includes(expectedDigest)),
  check('CANONICAL_COLLECTIONS_BOUND', storeCollectionsBound && same(manifest.data.canonicalCollections, REQUIRED_COLLECTIONS)),
  check('CANONICAL_PATH_BOUND', store.includes('tenants/${tenantId}/data/${collection}/items') && store.includes("collection('data').doc(collection).collection('items')")),
  check('NO_SEED_FALLBACK', manifest.store?.noSeedFallback === true && store.includes('noFallback: true') && store.includes('__canonicalReadModelV79: true')),
  check('MEMBERSHIP_VISIBILITY_ROOT_CAUSE', manifest.access?.dataAbsent === false && manifest.access?.dataInvisibleWithoutMembership === true && store.includes("state.status = 'waiting-membership'")),
  check('MODULE_SCRIPTS_BOUND', moduleScriptsBound),
  check('STORE_BEFORE_MODULES', storeIndex >= 0 && firstRequiredModuleIndex > storeIndex),
  check('CANONICAL_HOST_NORMALIZATION', loader.includes('ays-orbit-360-lab.web.app') && loader.includes('orbitBackend=firestore-lab&tenant=alianzas-soluciones')),
  check('HOSTING_PUBLIC_TREE', firebase.hosting?.public === 'orbit360-platform'),
  check('NO_REIMPORT_REQUIRED', manifest.data?.reimportRequired === false && manifest.data?.dataLossObserved === false),
  check('INTEGRITY_ZERO_SIDE_EFFECTS', manifest.integrity?.firestoreWrites === 0 && manifest.integrity?.authWrites === 0 && manifest.integrity?.reimportExecuted === false && manifest.integrity?.hostingDeployExecuted === false && manifest.integrity?.gate711Repeated === false),
  check('SANITIZED_ROSTER', Object.values(manifest.approvedRoster || {}).every(item => /^[a-f0-9]{64}$/.test(item.emailSha256 || '')) && manifest.containsPII === false)
];

const failed = checks.filter(item => !item.ok);
const result = {
  schemaVersion:'orbit360-cumulative-candidate-unified-validation-v1',
  generatedAt:new Date().toISOString(),
  candidateId:manifest.candidateId,
  releaseCommit:manifest.releaseCommit,
  baseline:manifest.baseline,
  decision:failed.length ? 'CANDIDATE_UNIFICATION_STATIC_FAIL' : 'CANDIDATE_UNIFICATION_STATIC_PASS',
  classification:failed.length ? 'PIPELINE_MECHANISM_FAILURE' : 'GO_STATIC_CUMULATIVE_PRODUCT_DATA_BINDING',
  total:checks.length,
  passed:checks.length-failed.length,
  failed:failed.length,
  failedCheckIds:failed.map(item => item.id),
  checks,
  boundEvidence:{
    moduleAuditDigest:sha(read(ROOT, AUDIT_PATH)),
    gate711LifecycleDigest:sha(read(ROOT, GATE711_PATH)),
    unifiedManifestDigest:sha(read(ROOT, MANIFEST_PATH)),
    releaseStoreDigest:sha(store),
    releaseIndexDigest:sha(index),
    canonicalSnapshotDigest:expectedDigest,
    operationalCounts:EXPECTED_COUNTS
  },
  conclusion:failed.length
    ? 'Do not publish until the failed static binding is corrected.'
    : 'The cumulative candidate already binds the accepted modules and canonical migrated data. The only current publication blocker is normal Auth/membership onboarding; no rebuild or reimport is required.',
  firestoreRead:false,
  firestoreWrites:0,
  authRead:false,
  authWrites:0,
  browserExecuted:false,
  deployExecuted:false,
  reimportExecuted:false,
  rulesApplied:false,
  functionsDeployed:false,
  mainTouched:false,
  mergeExecuted:false,
  gate711Repeated:false,
  containsPII:false,
  containsSecrets:false,
  ok:failed.length===0
};
fs.mkdirSync(path.dirname(OUT), { recursive:true });
fs.writeFileSync(OUT, JSON.stringify(result,null,2)+'\n','utf8');
console.log(JSON.stringify(result,null,2));
process.exit(result.ok ? 0 : 41);
