#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const REQUEST=String(process.env.ORBIT360_RULES_REQUEST_FILE||'').trim();
const RUN=String(process.env.GITHUB_RUN_ID||'source-only').trim();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716',`f2-rules01-source-preflight-run-${RUN}.json`);
const EXPECT_BLOB='35fba451bbbeb97dbae3f08303b786ddbcbdd29f';
const REQUEST05='.github/orbit360-requests/f2-productive-acceptance-runtime-browser-readonly-runbound-20260818-05.json';
const LIVE='orbit360-platform/docs/orbit360-live-state-v1.json';
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const fail=(code,detail='')=>{throw new Error(`${code}${detail?':'+detail:''}`);};
const need=(v,code,detail='')=>{if(!v)fail(code,detail);};
const write=p=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...p,containsPII:false,containsSecrets:false},null,2)+'\n','utf8');console.log(JSON.stringify({...p,containsPII:false,containsSecrets:false},null,2));};
try{
 need(REQUEST&&fs.existsSync(path.join(ROOT,REQUEST)),'DATA_CONTRACT_FAILURE:RULES01_REQUEST_MISSING');
 need(fs.existsSync(path.join(ROOT,LIVE)),'DATA_CONTRACT_FAILURE:RULES01_LIVE_STATE_MISSING');
 need(fs.existsSync(path.join(ROOT,REQUEST05)),'DATA_CONTRACT_FAILURE:RULES01_REQUEST05_MISSING');
 const req=read(REQUEST),live=read(LIVE),req05=read(REQUEST05);
 need(req.requestVersion==='F2_FIRESTORE_RULES_PARITY_REPAIR_LAB_V1','DATA_CONTRACT_FAILURE:RULES01_REQUEST_VERSION');
 need(Number(req.requestOrdinal)===1,'DATA_CONTRACT_FAILURE:RULES01_ORDINAL');
 need(req.status==='AUTHORIZED_ONCE'&&req.approved===true&&Number(req.allowedExecutions)===1&&req.consumed===false&&req.authorizationFrozen===false&&req.replayAllowed===false,'DATA_CONTRACT_FAILURE:RULES01_NOT_ACTIVE');
 need(req.branch==='ays/backend-tenant-lab-v99-20260703'&&Number(req.pullRequest)===5,'DATA_CONTRACT_FAILURE:RULES01_BRANCH_PR');
 need(req.projectId==='ays-orbit-360-lab'&&req.tenantId==='alianzas-soluciones','DATA_CONTRACT_FAILURE:RULES01_PROJECT_TENANT');
 need(req.sourceRulesPath==='firestore.rules'&&req.sourceRulesBlob===EXPECT_BLOB,'DATA_CONTRACT_FAILURE:RULES01_RULES_BINDING');
 const s=req.scope||{};
 need(s.secretAccess===true&&s.rulesDeploy===true&&s.firestoreRead===true&&s.authRead===true&&s.customTokenMint===true&&s.browserProbe===true,'DATA_CONTRACT_FAILURE:RULES01_REQUIRED_CAPABILITIES');
 need(s.firestoreDocumentWrite===false&&s.authWrite===false&&s.membershipWrite===false&&s.dataWrite===false&&s.hostingDeploy===false&&s.functionsDeploy===false&&s.packageRebuild===false&&s.publication===false&&s.production===false&&s.main===false&&s.merge===false,'DATA_CONTRACT_FAILURE:RULES01_PROHIBITED_CAPABILITY');
 need(req05.status==='CONSUMED_STOP_RETRY'&&req05.allowedExecutions===0&&req05.consumed===true&&req05.authorizationFrozen===true&&req05.replayAllowed===false,'DATA_CONTRACT_FAILURE:RULES01_REQUEST05_NOT_FROZEN');
 need(String(live.phase||'')==='F2_SECURITY_FAILURE_RULES_PARITY_REPAIR_AUTHORIZATION_PENDING','DATA_CONTRACT_FAILURE:RULES01_LIVE_PHASE');
 need(live?.rootCauseState?.currentBlockingFact?.code==='F2_RUNTIME05_CROSS_TENANT_SECURITY_FAILURE_RULES_PARITY_REPAIR_REQUIRED','DATA_CONTRACT_FAILURE:RULES01_BLOCKING_FACT');
 const reqDir=path.join(ROOT,'.github/orbit360-requests');
 const request06=fs.readdirSync(reqDir).filter(n=>/f2-productive-acceptance-runtime-browser-readonly-runbound-20260818-06\.json$/i.test(n));
 need(request06.length===0,'DATA_CONTRACT_FAILURE:RULES01_REQUEST06_PREMATURE');
 const hash=spawnSync('git',['hash-object','firestore.rules'],{cwd:ROOT,encoding:'utf8'});
 need(hash.status===0,'PIPELINE_MECHANISM_FAILURE:RULES01_GIT_HASH_OBJECT');
 const blob=String(hash.stdout||'').trim();
 need(blob===EXPECT_BLOB,'SECURITY_FAILURE:RULES01_RULES_BLOB_MISMATCH',blob);
 const rules=fs.readFileSync(path.join(ROOT,'firestore.rules'),'utf8');
 need(/tenantId == "alianzas-soluciones"/.test(rules),'SECURITY_FAILURE:RULES01_ALLOWED_TENANT_GUARD_MISSING');
 need(/match \/\{document=\*\*\}[\s\S]*allow read, write: if false;/.test(rules),'SECURITY_FAILURE:RULES01_DENY_ALL_MISSING');
 write({schemaVersion:'orbit360-f2-firestore-rules-parity-repair-preflight-v1',ok:true,status:'GO_RULES_REPAIR_SOURCE_CONTRACT',classification:'GO_F2_FIRESTORE_RULES_PARITY_REPAIR_LAB_V1',runId:RUN,requestFile:REQUEST,sourceRulesBlob:blob,projectId:req.projectId,tenantId:req.tenantId,request05Frozen:true,request06Created:false,sourceRulesMutation:false,secretAccess:false,firestoreRead:false,rulesDeploy:false,firestoreDocumentWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,hostingDeploy:false,functionsDeploy:false,packageRebuild:false,publication:false,production:false});
}catch(error){write({schemaVersion:'orbit360-f2-firestore-rules-parity-repair-preflight-v1',ok:false,status:String(error?.message||'').split(':')[0]||'DATA_CONTRACT_FAILURE',classification:String(error?.message||'').split(':')[0]||'DATA_CONTRACT_FAILURE',error:String(error?.message||error).slice(0,500),runId:RUN,secretAccess:false,firestoreRead:false,rulesDeploy:false,firestoreDocumentWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,hostingDeploy:false,functionsDeploy:false,packageRebuild:false,publication:false,production:false,containsPII:false,containsSecrets:false});process.exitCode=41;}
