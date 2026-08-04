#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block7-gravicentra-insurance-rc1-predeploy-readonly-v20260803';
const VERSION = '7.12.0';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-gravicentra-rc1-predeploy-readonly-v20260803.json';
const RELEASE_SEAL = 'tools/orbit360-gravicentra-insurance-rc1-release-seal-v20260803.json';
const SOURCE_GATE711 = 'tools/orbit360-validator-lifecycle-contract-gate711-release-critical-runtime-v20260802.json';
const HISTORICAL_REQUEST = '.github/orbit360-requests/canonical-runtime-cumulative-visual-lab-v20260801.json';
const HISTORICAL_LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-canonical-runtime-cumulative-visual-lab-v20260801.json';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const REQUIRED_OPERATIONAL = Object.freeze({ clientes:430, aseguradoras:30, polizas:1373, vehiculos:1032, recibosEsperados:1294, carteraPrimas:673, cobros:5, asesores:7 });
const REQUIRED_CANONICAL = Object.freeze({ clientes:430, aseguradoras:30, polizas:1375, vehiculos:1033, recibosEsperados:1294, carteraPrimas:673, cobros:7 });
const REQUIRED_MODULES = Object.freeze(['cliente360','aseguradoras','polizas','cobros','ops','leads']);

const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok:Boolean(ok), detail:String(detail || '').slice(0, 420) });
const read = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const git = args => execFileSync('git', args, { cwd:ROOT, encoding:'utf8' }).trim();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const write = payload => {
  fs.mkdirSync(path.dirname(OUT), { recursive:true });
  fs.writeFileSync(OUT, JSON.stringify({ ...payload, containsPII:false, containsSecrets:false }, null, 2) + '\n', 'utf8');
};

let result;
try {
  const lifecycle = read(LIFECYCLE);
  const seal = read(RELEASE_SEAL);
  const source = read(SOURCE_GATE711);
  const historicalRequest = read(HISTORICAL_REQUEST);
  const historicalLifecycle = read(HISTORICAL_LIFECYCLE);

  add('GATE', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_STATIC_READY', lifecycle.status === 'GRAVICENTRA_INSURANCE_RC1_PREDEPLOY_CONTRACT_STATIC_READY' && lifecycle.authorization?.requiredForExecution === true && lifecycle.authorization?.activeRequest === false && lifecycle.authorization?.allowedExecutions === 0);
  add('CAPABILITY_BOUNDARY', lifecycle.executionProfile?.phase === 'GRAVICENTRA_RC1_PREDEPLOY_READONLY' && lifecycle.executionProfile?.capabilities?.secrets === true && lifecycle.executionProfile?.capabilities?.firestoreRead === true && lifecycle.executionProfile?.capabilities?.writes === false && lifecycle.executionProfile?.capabilities?.runtime === true && lifecycle.executionProfile?.capabilities?.browser === false && lifecycle.executionProfile?.capabilities?.deploy === false && lifecycle.executionProfile?.capabilities?.functionsDeploy === false && lifecycle.executionProfile?.capabilities?.rulesDeploy === false && lifecycle.executionProfile?.capabilities?.production === false);
  add('ROOT_FIX_CLASSIFICATION', Array.isArray(lifecycle.rootFix?.classification) && lifecycle.rootFix.classification.includes('VALIDATOR_STALE') && lifecycle.rootFix.classification.includes('PIPELINE_MECHANISM_FAILURE') && lifecycle.rootFix?.sourceRun === 30868524436 && lifecycle.rootFix?.rootCause === 'PREDEPLOY_ROUTED_TO_HISTORICAL_GATE711_STOP_RETRY_CONTRACT');
  add('SOURCE_GATE711_PASS', source.status === 'CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_PASS_CLOSED' && source.runtimeEvidence?.run === 30816576914 && source.runtimeEvidence?.artifact === 8857032288 && source.snapshotEvidence?.byteIdentical === true && source.snapshotEvidence?.canonicalDigestSealed === '19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b' && source.runtimeEvidence?.firestoreWrites === 0 && source.runtimeEvidence?.operationalWrites === 0 && source.runtimeEvidence?.deployExecuted === false && source.runtimeEvidence?.productionTouched === false);
  add('SOURCE_COUNTS', same(source.datasetEvidence, REQUIRED_OPERATIONAL), JSON.stringify(source.datasetEvidence || {}));
  add('RELEASE_SEAL', seal.status === 'RC1_SOURCE_SEALED' && seal.releaseBranch === 'release/gravicentra-insurance-rc1-20260803' && seal.releaseCommit === '27cb7dfcda8568280ebef15993a953364304f29b' && seal.baselineProductHead === '267f7231b46d65b80c167f54567a67503b6a6793' && same(seal.allowedProductDiff, ['orbit360-platform/styles/base.css']) && same(seal.operationalCounts, REQUIRED_OPERATIONAL) && same(seal.canonicalCounts, REQUIRED_CANONICAL) && same(seal.requiredModules, REQUIRED_MODULES));
  add('HISTORICAL_STOP_RETRY_ARCHIVED', historicalRequest.status === 'STOP_RETRY' && historicalRequest.consumed === true && historicalRequest.allowedExecutions === 0 && historicalLifecycle.status === 'CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_STOP_RETRY' && historicalLifecycle.authorization?.consumed === true && historicalLifecycle.authorization?.allowedExecutions === 0);
  add('HISTORICAL_NOT_ACTIVE_SOURCE', lifecycle.sourceGate711?.lifecycle === SOURCE_GATE711 && lifecycle.releaseSeal === RELEASE_SEAL && ![HISTORICAL_REQUEST,HISTORICAL_LIFECYCLE].includes(lifecycle.sourceGate711?.lifecycle));
  add('GUARDS', lifecycle.guards?.firestoreDataWritesAllowed === false && lifecycle.guards?.operationalWritesAllowed === 0 && lifecycle.guards?.reimportAllowed === false && lifecycle.guards?.hostingDeployAllowed === false && lifecycle.guards?.firestoreRulesDeployAllowed === false && lifecycle.guards?.functionsDeployAllowed === false && lifecycle.guards?.productionWritesAllowed === false && lifecycle.guards?.mainAllowed === false && lifecycle.guards?.mergeAllowed === false && lifecycle.guards?.repeatGate711Allowed === false && lifecycle.guards?.openGeneralAuditAllowed === false);
  add('FILES', [LIFECYCLE,RELEASE_SEAL,SOURCE_GATE711,HISTORICAL_REQUEST,HISTORICAL_LIFECYCLE].every(exists));

  git(['cat-file','-e','27cb7dfcda8568280ebef15993a953364304f29b^{commit}']);
  git(['cat-file','-e','267f7231b46d65b80c167f54567a67503b6a6793^{commit}']);
  const productDiff = git(['diff','--name-only','267f7231b46d65b80c167f54567a67503b6a6793..27cb7dfcda8568280ebef15993a953364304f29b','--','orbit360-platform/index.html','orbit360-platform/core','orbit360-platform/modules','orbit360-platform/styles','orbit360-platform/data']).split(/\r?\n/).filter(Boolean);
  add('RC1_PRODUCT_DELTA', same(productDiff, ['orbit360-platform/styles/base.css']), productDiff.join(','));

  const requestRel = String(process.env.ORBIT360_REQUEST_FILE || '').trim();
  const requestPresent = Boolean(requestRel && exists(requestRel));
  let request = null;
  let requestChecksStart = checks.length;
  if (requestPresent) {
    request = read(requestRel);
    const requestCommit = git(['log','-n','1','--format=%H','--',requestRel]);
    const requestParent = requestCommit ? git(['rev-parse',`${requestCommit}^`]) : '';
    add('REQUEST_SCHEMA', request.schemaVersion === 'orbit360-gravicentra-insurance-rc1-predeploy-readonly-resume-request-v1' && request.status === 'AUTHORIZED_SINGLE_EXECUTION' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false);
    add('REQUEST_BINDING', request.branch === 'ays/backend-tenant-lab-v99-20260703' && request.pullRequest === 5 && request.releaseBranch === seal.releaseBranch && request.releaseCommit === seal.releaseCommit && request.baselineProductHead === seal.baselineProductHead && request.projectId === 'ays-orbit-360-lab' && request.tenantId === 'alianzas-soluciones' && request.liveUrl === 'https://ays-orbit-360-lab.web.app');
    add('REQUEST_LINEAGE', request.parentHead === requestParent, JSON.stringify({ requestCommit, requestParent, declared:request.parentHead || '' }));
    add('REQUEST_COUNTS_MODULES', same(request.requiredOperationalCounts, REQUIRED_OPERATIONAL) && same(request.requiredCanonicalCounts, REQUIRED_CANONICAL) && same(request.requiredModules, REQUIRED_MODULES));
    add('REQUEST_SCOPE', request.scope?.contractPreflightBeforeSecrets === true && request.scope?.firestoreRead === true && request.scope?.hostingRead === true && request.scope?.publicAssetRead === true && request.scope?.featureFlagRead === true && request.scope?.backupAndRollbackReadiness === true && request.scope?.writes === false && request.scope?.reimport === false && request.scope?.deploy === false && request.scope?.functions === false && request.scope?.rules === false && request.scope?.productionWrites === false && request.scope?.main === false && request.scope?.merge === false && request.stopRetry === true && request.repeatGate711 === false && request.openGeneralAudit === false);
  }

  const failed = checks.filter(item => !item.ok);
  const requestFailed = requestPresent && checks.slice(requestChecksStart).some(item => !item.ok);
  const staticReady = failed.length === 0;
  const executionAuthorized = staticReady && requestPresent && !requestFailed;
  const classification = failed.length
    ? (requestFailed ? 'SECURITY_FAILURE' : 'VALIDATOR_STALE')
    : (executionAuthorized ? 'GRAVICENTRA_RC1_PREDEPLOY_READONLY_EXECUTION_READY' : 'GRAVICENTRA_RC1_PREDEPLOY_CONTRACT_STATIC_READY');

  result = {
    schemaVersion:'orbit360-gravicentra-insurance-rc1-predeploy-contract-v1',
    gateId:GATE,
    contractVersion:VERSION,
    status:failed.length ? 'VALIDATOR_STALE' : 'GO_GATE_CONTRACT',
    classification,
    total:checks.length,
    passed:checks.length - failed.length,
    failed:failed.length,
    failedCheckIds:failed.map(item => item.id),
    checks,
    staticReady,
    requestPresent,
    executionAuthorized,
    secretAccessAuthorized:executionAuthorized,
    firestoreReadAuthorized:executionAuthorized,
    writeAuthorized:false,
    runtimeAuthorized:executionAuthorized,
    browserAuthorized:false,
    deployAuthorized:false,
    rulesDeployAuthorized:false,
    functionsDeployAuthorized:false,
    productionAuthorized:false,
    releaseCommit:seal.releaseCommit,
    baselineProductHead:seal.baselineProductHead,
    allowedProductDiff:seal.allowedProductDiff,
    operationalCounts:REQUIRED_OPERATIONAL,
    canonicalCounts:REQUIRED_CANONICAL,
    requiredModules:REQUIRED_MODULES,
    previousPredeployRun:30868524436,
    previousPredeployReplayAllowed:false,
    sourceGate711Run:30816576914,
    sourceGate711ReplayAllowed:false,
    dataAccess:false,
    secretAccess:false,
    firestoreRead:false,
    firestoreWrites:0,
    operationalWrites:0,
    runtimeExecuted:false,
    browserExecuted:false,
    rulesApplied:false,
    deployExecuted:false,
    productionTouched:false
  };
} catch (error) {
  result = {
    schemaVersion:'orbit360-gravicentra-insurance-rc1-predeploy-contract-v1',
    gateId:GATE,
    contractVersion:VERSION,
    status:'VALIDATOR_STALE',
    classification:'PIPELINE_MECHANISM_FAILURE',
    failed:1,
    failedCheckIds:['PREDEPLOY_CONTRACT_ENGINE_EXCEPTION'],
    error:String(error?.message || error).replace(/[\r\n]+/g, ' ').slice(0, 700),
    staticReady:false,
    requestPresent:false,
    executionAuthorized:false,
    secretAccessAuthorized:false,
    firestoreReadAuthorized:false,
    writeAuthorized:false,
    runtimeAuthorized:false,
    browserAuthorized:false,
    deployAuthorized:false,
    rulesDeployAuthorized:false,
    functionsDeployAuthorized:false,
    productionAuthorized:false,
    dataAccess:false,
    secretAccess:false,
    firestoreRead:false,
    firestoreWrites:0,
    operationalWrites:0,
    runtimeExecuted:false,
    browserExecuted:false,
    rulesApplied:false,
    deployExecuted:false,
    productionTouched:false
  };
}

write(result);
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'GO_GATE_CONTRACT' ? 0 : 41);
