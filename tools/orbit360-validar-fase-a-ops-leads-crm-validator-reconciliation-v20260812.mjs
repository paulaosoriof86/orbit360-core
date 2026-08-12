#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const ROOT=process.cwd();
const FAIL='orbit360-platform/runtime-gate-crm-v20260716/fase-a-ops-leads-crm-runtime-v3-failure-sanitized-v20260812.json';
const REQUEST='.github/orbit360-requests/fase-a-ops-leads-crm-composed-runtime-20260812-authorization.json';
const MATRIX='tools/orbit360-fase-a-ops-leads-crm-auth-matrix-composed-v20260812.mjs';
const BLOCK1='tools/orbit360-block1-final-native-matrix-v20260811.mjs';
const ROUTER='orbit360-platform/core/router.js';
const INDEX='orbit360-platform/index.html';
const OUT='orbit360-platform/runtime-gate-crm-v20260716/fase-a-ops-leads-crm-release-reconciled-sanitized-v20260812.json';
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p).replace(/^\uFEFF/,''));
const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
const checks=[];const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,500)});let result;
try{
  const fail=json(FAIL),request=json(REQUEST),matrix=read(MATRIX),block1=read(BLOCK1),router=read(ROUTER),index=read(INDEX);
  const currentRouter=git(['rev-parse','HEAD:'+ROUTER]);
  const priorRouter=git(['rev-parse','f500f76fd9a1879f4e53178a6ff1dd7c314dc10e:'+ROUTER]);
  const currentIndex=git(['rev-parse','HEAD:'+INDEX]);
  const priorIndex=git(['rev-parse','f500f76fd9a1879f4e53178a6ff1dd7c314dc10e:'+INDEX]);
  add('V3_ARTIFACT_BOUND',fail.ok===true&&fail.runId===31649067843&&fail.artifactId===9161948517&&fail.artifactDigest==='sha256:336a5d3908cd28a82b92b902b7d8cf19b07e8938106349bcb5cc58d70fb0fbcd');
  add('OPS_LEADS_CRM_9_OF_9',fail.routeChecksTotal===9&&fail.routeChecksPassed===9&&fail.routeChecksFailed===0&&Object.values(fail.roleResults||{}).every(r=>r.routeChecksFailed===0&&r.consoleErrors===0&&r.technicalCopy===false));
  add('INTEGRITY_UNCHANGED',fail.snapshotIntegrity==='VERIFIED_UNCHANGED'&&fail.firestoreWrites===0&&fail.authWrites===0&&fail.operationalWrites===0&&fail.deploys===0&&fail.productionTouched===false);
  add('REQUEST_CONSUMED',request.status==='CONSUMED_VALIDATOR_STALE'&&request.consumed===true&&request.authorizationFrozen===true&&request.allowedExecutions===0&&request.replayAllowed===false&&request.runtimeRunId===31649067843&&request.rootCause==='VALIDATOR_STALE_MOBILE_MENU_SELECTOR');
  add('STALE_SELECTOR_PROVEN',matrix.includes("document.getElementById('mobile-menu-btn')")&&!matrix.includes("document.getElementById('burger')"));
  add('CANONICAL_SELECTOR_PROVEN',index.includes('id="burger"')&&router.includes("document.getElementById('burger')")&&router.includes("sidebar.classList.toggle('open'")&&router.includes("overlay.classList.toggle('show'"));
  add('BLOCK1_MOBILE_ASSERTION_PROVEN',block1.includes("document.getElementById('burger')")&&block1.includes("page.click('#burger')")&&block1.includes(".sb-overlay.show")&&block1.includes("mobile-menu-opens")&&block1.includes("mobile-menu-closes"));
  add('ROUTER_OWNER_UNCHANGED',currentRouter===priorRouter&&currentRouter==='844bb7181a3dea5d960e91dd7200d9ca475cbd97',`prior=${priorRouter};current=${currentRouter}`);
  add('INDEX_OWNER_UNCHANGED',currentIndex===priorIndex&&currentIndex==='dec0aaba252eeb2e3530d6a56ddebf68f397dafd',`prior=${priorIndex};current=${currentIndex}`);
  add('PRIOR_MOBILE_PASS_BOUND',fail.mobileOwnerEvidence?.priorPassRunId===31544331170&&fail.mobileOwnerEvidence?.priorPassHead==='f500f76fd9a1879f4e53178a6ff1dd7c314dc10e');
  const failed=checks.filter(x=>!x.ok);
  result={schemaVersion:'orbit360-fase-a-ops-leads-crm-release-reconciled-v1',gateId:'fase-a-ops-leads-crm-release-lab-v20260812',status:failed.length?'STOP_RELEASE_RECONCILIATION':'PASS_FASE_A_OPS_LEADS_CRM_RELEASE_EVIDENCE_RECONCILED',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'VALIDATOR_STALE_CORRECTED_BY_EVIDENCE_REUSE',rootCause:'VALIDATOR_STALE_MOBILE_MENU_SELECTOR',v3RuntimeRunId:31649067843,v3ArtifactId:9161948517,opsLeadsCrmRouteChecksPassed:failed.length?0:9,mobileMenuEvidenceReusedFromRun:31544331170,routerOwnerUnchanged:currentRouter===priorRouter,indexOwnerUnchanged:currentIndex===priorIndex,snapshotIntegrity:fail.snapshotIntegrity,firestoreWrites:0,authWrites:0,operationalWrites:0,deploys:0,productionTouched:false,browserReexecuted:false,secretAccess:false,firestoreRead:false,requestReplay:false,checksPassed:checks.length-failed.length,checksFailed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,containsPII:false,containsSecrets:false,ok:failed.length===0};
}catch(e){result={schemaVersion:'orbit360-fase-a-ops-leads-crm-release-reconciled-v1',status:'STOP_RELEASE_RECONCILIATION',classification:'PIPELINE_MECHANISM_FAILURE',error:String(e&&e.message||e).slice(0,700),browserReexecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,deploys:0,productionTouched:false,ok:false};}
fs.mkdirSync('orbit360-platform/runtime-gate-crm-v20260716',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(!result.ok)process.exit(41);
