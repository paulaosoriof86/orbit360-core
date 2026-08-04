#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const REQUEST = process.env.ORBIT360_RC11_REQUEST_FILE || '.github/orbit360-requests/gravicentra-insurance-rc11-real-data-go-live-v20260803.json';
const WORKFLOW = '.github/workflows/orbit360-gravicentra-rc11-real-data-go-live-v20260803.yml';
const BROWSER = 'tools/orbit360-gravicentra-rc11-browser-real-data-smoke-v20260803.mjs';
const STATIC_TEST = 'tools/orbit360-canonical-host-runtime-failclosed-test-v20260803.mjs';
const LOADER = 'orbit360-platform/core/backend-lab-loader.js';
const OUT = path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/gravicentra-rc11-real-data-go-live-guard.json');
const BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const RELEASE_BRANCH = 'release/gravicentra-insurance-rc1-1-real-data-runtime-20260803';
const BASE = '27cb7dfcda8568280ebef15993a953364304f29b';
const RELEASE = '1eb7daea580c0807d867a663086defc021435993';
const PROJECT = 'ays-orbit-360-lab';
const TENANT = 'alianzas-soluciones';
const LIVE = 'https://ays-orbit-360-lab.web.app';
const EXPECTED_SOURCE = {clientes:430,aseguradoras:30,polizas:1373,vehiculos:1032,recibosEsperados:1294,carteraPrimas:673,cobros:5,asesores:7};
const EXPECTED_CANONICAL = {clientes:430,aseguradoras:30,polizas:1375,vehiculos:1033,recibosEsperados:1294,carteraPrimas:673,cobros:7};
const read = rel => fs.readFileSync(path.join(ROOT,rel),'utf8');
const json = rel => JSON.parse(read(rel));
const git = args => execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();
const same = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,500)});
const write=payload=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...payload,containsPII:false,containsSecrets:false},null,2)+'\n','utf8');};

let result;
try {
  const req=json(REQUEST), wf=read(WORKFLOW), browser=read(BROWSER), test=read(STATIC_TEST), loader=read(LOADER);
  const requestCommit=git(['log','-n','1','--format=%H','--',REQUEST]);
  const requestParent=requestCommit?git(['rev-parse',requestCommit+'^']):'';
  const changed=git(['diff-tree','--no-commit-id','--name-only','-r',requestCommit]).split(/\r?\n/).filter(Boolean);
  git(['cat-file','-e',RELEASE+'^{commit}']);
  const releaseRef=git(['rev-parse',RELEASE_BRANCH]);
  const productDiff=git(['diff','--name-only',BASE+'..'+RELEASE,'--','orbit360-platform/index.html','orbit360-platform/core','orbit360-platform/modules','orbit360-platform/styles','orbit360-platform/data']).split(/\r?\n/).filter(Boolean);
  const staticOut=execFileSync(process.execPath,[STATIC_TEST],{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe']});

  add('REQUEST_SCHEMA',req.schemaVersion==='orbit360-gravicentra-insurance-rc11-real-data-go-live-request-v1'&&req.status==='AUTHORIZED_SINGLE_EXECUTION'&&req.approved===true&&req.allowedExecutions===1&&req.consumed===false&&req.macroClosure===true);
  add('REQUEST_LINEAGE',req.parentHead===requestParent&&changed.length===1&&changed[0]===REQUEST,JSON.stringify({requestCommit,requestParent,declared:req.parentHead,changed}));
  add('REQUEST_BINDING',req.branch===BRANCH&&req.releaseBranch===RELEASE_BRANCH&&req.baseReleaseCommit===BASE&&req.releaseCommit===RELEASE&&req.projectId===PROJECT&&req.tenantId===TENANT&&req.liveUrl===LIVE);
  add('REQUEST_SCOPE',req.scope?.hostingDeploy===true&&req.scope?.browserRuntime===true&&req.scope?.firestoreRead===true&&req.scope?.rollbackOnFailure===true&&req.scope?.firestoreWrites===false&&req.scope?.authWrites===false&&req.scope?.reimport===false&&req.scope?.functions===false&&req.scope?.rules===false&&req.scope?.main===false&&req.scope?.merge===false);
  add('REQUEST_COUNTS',same(req.requiredSourceCounts,EXPECTED_SOURCE)&&same(req.requiredCanonicalCounts,EXPECTED_CANONICAL)&&req.requiredRenderedClients===430);
  add('REQUEST_DEMO_BLOCK',same(req.forbiddenDemoMarkers,['admin@demo.com','Andrea Beltrán','seed-ficticio'])&&req.requireDirectUrlWithoutParameters===true&&req.requireFirestoreStore===true);
  add('RELEASE_BRANCH_EXACT',releaseRef===RELEASE,JSON.stringify({releaseRef,expected:RELEASE}));
  add('PRODUCT_DELTA',same(productDiff,[LOADER]),productDiff.join(','));
  add('LOADER_ROOT_FIX',loader.includes("hostname === 'ays-orbit-360-lab.web.app'")&&loader.includes("hostname === 'ays-orbit-360-lab.firebaseapp.com'")&&loader.includes("loaderVersion: 'v1.112-canonical-host-fail-closed'")&&loader.includes('noSeedAsSource: true')&&!loader.includes('admin@demo.com'));
  add('STATIC_RUNTIME_PASS',/"status"\s*:\s*"PASS"/.test(staticOut)&&/GO_STATIC_RUNTIME_ROOT_FIX/.test(staticOut));
  add('WORKFLOW_BOUNDARY',wf.includes('firebase deploy --only hosting')&&!wf.includes('firestore:rules')&&!wf.includes('--only functions')&&wf.includes('playwright')&&wf.includes('rollback')&&wf.includes('ORBIT360_RC11_REQUEST_FILE'));
  add('BROWSER_CONTRACT',browser.includes('RC11_REAL_DATA_BROWSER_PASS')&&browser.includes("store.all('clientes').length === expected")&&browser.includes('admin@demo.com')&&browser.includes('Andrea Beltrán')&&browser.includes('__firestoreLabExplicit')&&browser.includes('snapshotAttached'));

  const failed=checks.filter(x=>!x.ok);
  result={schemaVersion:'orbit360-gravicentra-insurance-rc11-real-data-go-live-guard-v1',status:failed.length?'STOP_RETRY':'RC11_REAL_DATA_GO_LIVE_AUTHORIZED',classification:failed.length?'SECURITY_FAILURE':'RC11_REAL_DATA_MACRO_READY',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,requestCommit,requestParent,releaseCommit:RELEASE,hostingDeployAuthorized:failed.length===0,browserAuthorized:failed.length===0,firestoreReadAuthorized:failed.length===0,rollbackAuthorized:failed.length===0,firestoreWritesAuthorized:false,authWritesAuthorized:false,rulesDeployAuthorized:false,functionsDeployAuthorized:false,mainAuthorized:false,mergeAuthorized:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false};
} catch(error) {
  result={schemaVersion:'orbit360-gravicentra-insurance-rc11-real-data-go-live-guard-v1',status:'STOP_RETRY',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['RC11_GUARD_EXCEPTION'],error:String(error&&error.message||error).replace(/[\r\n]+/g,' ').slice(0,700),hostingDeployAuthorized:false,browserAuthorized:false,firestoreReadAuthorized:false,rollbackAuthorized:false,firestoreWritesAuthorized:false,authWritesAuthorized:false,rulesDeployAuthorized:false,functionsDeployAuthorized:false,mainAuthorized:false,mergeAuthorized:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false};
}
write(result);console.log(JSON.stringify(result,null,2));process.exit(result.status==='RC11_REAL_DATA_GO_LIVE_AUTHORIZED'?0:41);
