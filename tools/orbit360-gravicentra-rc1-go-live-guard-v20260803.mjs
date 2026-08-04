#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const REQUEST = process.env.ORBIT360_GO_LIVE_REQUEST_FILE || '.github/orbit360-requests/gravicentra-insurance-rc1-go-live-v20260803.json';
const RELEASE_SEAL = 'tools/orbit360-gravicentra-insurance-rc1-release-seal-v20260803.json';
const PREDEPLOY_CLOSE = 'orbit360-platform/docs/CIERRE-PREDEPLOY-GRAVICENTRA-RC1-READY-DEPLOY-20260803.md';
const WORKFLOW = '.github/workflows/orbit360-gravicentra-rc1-go-live-macro-v20260803.yml';
const HELPER = 'tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/gravicentra-rc1-go-live-guard.json');
const BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const RELEASE_BRANCH = 'release/gravicentra-insurance-rc1-20260803';
const RELEASE_COMMIT = '27cb7dfcda8568280ebef15993a953364304f29b';
const BASELINE = '267f7231b46d65b80c167f54567a67503b6a6793';
const PROJECT = 'ays-orbit-360-lab';
const TENANT = 'alianzas-soluciones';
const LIVE_URL = 'https://ays-orbit-360-lab.web.app';
const REQUIRED_MODULES = ['cliente360','aseguradoras','polizas','cobros','ops','leads'];
const EXPECTED_SOURCE = { clientes:430, aseguradoras:30, polizas:1373, vehiculos:1032, recibosEsperados:1294, carteraPrimas:673, cobros:5, asesores:7 };
const EXPECTED_CANONICAL = { clientes:430, aseguradoras:30, polizas:1375, vehiculos:1033, recibosEsperados:1294, carteraPrimas:673, cobros:7 };
const checks = [];
const add = (id, ok, detail='') => checks.push({id, ok:Boolean(ok), detail:String(detail || '').slice(0,420)});
const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const readText = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const git = args => execFileSync('git', args, {cwd:ROOT, encoding:'utf8'}).trim();
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const write = payload => { fs.mkdirSync(path.dirname(OUT), {recursive:true}); fs.writeFileSync(OUT, JSON.stringify({...payload, containsPII:false, containsSecrets:false}, null, 2) + '\n', 'utf8'); };

let result;
try {
  const req = readJson(REQUEST);
  const seal = readJson(RELEASE_SEAL);
  const close = readText(PREDEPLOY_CLOSE);
  const wf = readText(WORKFLOW);
  const helper = readText(HELPER);
  const requestCommit = git(['log','-n','1','--format=%H','--',REQUEST]);
  const requestParent = requestCommit ? git(['rev-parse', `${requestCommit}^`]) : '';
  const changed = git(['diff-tree','--no-commit-id','--name-only','-r',requestCommit]).split(/\r?\n/).filter(Boolean);

  add('REQUEST_SCHEMA', req.schemaVersion === 'orbit360-gravicentra-insurance-rc1-go-live-request-v1' && req.status === 'AUTHORIZED_SINGLE_EXECUTION' && req.approved === true && req.allowedExecutions === 1 && req.consumed === false && req.macroClosure === true);
  add('REQUEST_LINEAGE', req.parentHead === requestParent && changed.length === 1 && changed[0] === REQUEST, JSON.stringify({requestCommit,requestParent,declared:req.parentHead,changed}));
  add('REQUEST_BINDING', req.branch === BRANCH && req.pullRequest === 5 && req.releaseBranch === RELEASE_BRANCH && req.releaseCommit === RELEASE_COMMIT && req.baselineProductHead === BASELINE && req.projectId === PROJECT && req.tenantId === TENANT && req.liveUrl === LIVE_URL);
  add('REQUEST_SCOPE', req.scope?.hostingDeploy === true && req.scope?.firestoreRead === true && req.scope?.publicAssetRead === true && req.scope?.smoke === true && req.scope?.rollbackOnBlockingFailure === true && req.scope?.firestoreWrites === false && req.scope?.authWrites === false && req.scope?.reimport === false && req.scope?.functions === false && req.scope?.rules === false && req.scope?.main === false && req.scope?.merge === false && req.repeatGate711 === false && req.repeatPredeploy === false && req.microAuthorizations === false);
  add('REQUEST_MODULES_COUNTS', same(req.requiredModules, REQUIRED_MODULES) && same(req.requiredSourceCounts, EXPECTED_SOURCE) && same(req.requiredCanonicalCounts, EXPECTED_CANONICAL));
  add('RELEASE_SEAL', seal.status === 'RC1_SOURCE_SEALED' && seal.releaseBranch === RELEASE_BRANCH && seal.releaseCommit === RELEASE_COMMIT && seal.baselineProductHead === BASELINE && same(seal.allowedProductDiff, ['orbit360-platform/styles/base.css']) && same(seal.requiredModules, REQUIRED_MODULES));
  add('PREDEPLOY_CLOSED', close.includes('PREDEPLOY_READY_FOR_DEPLOY_AUTHORIZATION') && close.includes('30870375543') && close.includes('8877668933') && close.includes('candidateComplete: true') && close.includes('dataComplete: true') && close.includes('exactRollbackAnchorAvailable: true'));
  add('WORKFLOW_BOUNDARY', wf.includes('firebase deploy --only hosting') && !wf.includes('firestore:rules') && !wf.includes('functions:') && !wf.includes('--only functions') && wf.includes('rollback') && wf.includes('ORBIT360_GO_LIVE_REQUEST_FILE'));
  add('HELPER_BOUNDARY', helper.includes("mode === 'before'") && helper.includes("mode === 'smoke'") && helper.includes("mode === 'rollback'") && helper.includes('firestoreWrites:0') && helper.includes('authWrites:0'));
  git(['cat-file','-e',`${RELEASE_COMMIT}^{commit}`]);
  const productDiff = git(['diff','--name-only',`${BASELINE}..${RELEASE_COMMIT}`,'--','orbit360-platform/index.html','orbit360-platform/core','orbit360-platform/modules','orbit360-platform/styles','orbit360-platform/data']).split(/\r?\n/).filter(Boolean);
  add('RC1_PRODUCT_DELTA', same(productDiff, ['orbit360-platform/styles/base.css']), productDiff.join(','));

  const failed = checks.filter(x => !x.ok);
  result = {
    schemaVersion:'orbit360-gravicentra-insurance-rc1-go-live-guard-v1',
    status:failed.length ? 'STOP_RETRY' : 'GO_LIVE_AUTHORIZED',
    classification:failed.length ? 'SECURITY_FAILURE' : 'GO_LIVE_MACRO_READY',
    total:checks.length,
    passed:checks.length - failed.length,
    failed:failed.length,
    failedCheckIds:failed.map(x => x.id),
    checks,
    requestCommit,
    requestParent,
    releaseCommit:RELEASE_COMMIT,
    hostingDeployAuthorized:failed.length === 0,
    firestoreReadAuthorized:failed.length === 0,
    rollbackAuthorized:failed.length === 0,
    firestoreWritesAuthorized:false,
    authWritesAuthorized:false,
    rulesDeployAuthorized:false,
    functionsDeployAuthorized:false,
    mainAuthorized:false,
    mergeAuthorized:false,
    operationalWrites:0,
    secretAccess:false,
    firestoreRead:false,
    deployExecuted:false,
    productionTouched:false
  };
} catch (error) {
  result = {
    schemaVersion:'orbit360-gravicentra-insurance-rc1-go-live-guard-v1',
    status:'STOP_RETRY',
    classification:'PIPELINE_MECHANISM_FAILURE',
    failed:1,
    failedCheckIds:['GO_LIVE_GUARD_EXCEPTION'],
    error:String(error?.message || error).replace(/[\r\n]+/g,' ').slice(0,700),
    hostingDeployAuthorized:false,
    firestoreReadAuthorized:false,
    rollbackAuthorized:false,
    firestoreWritesAuthorized:false,
    authWritesAuthorized:false,
    rulesDeployAuthorized:false,
    functionsDeployAuthorized:false,
    mainAuthorized:false,
    mergeAuthorized:false,
    operationalWrites:0,
    secretAccess:false,
    firestoreRead:false,
    deployExecuted:false,
    productionTouched:false
  };
}
write(result);
console.log(JSON.stringify(result,null,2));
process.exit(result.status === 'GO_LIVE_AUTHORIZED' ? 0 : 41);
