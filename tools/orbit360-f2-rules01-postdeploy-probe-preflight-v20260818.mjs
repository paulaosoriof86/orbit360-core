#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {PROBE_DOCUMENT_PATH,validateProbeDocumentPath} from './orbit360-f2-cross-tenant-probe-contract-v20260818.mjs';

const ROOT=process.cwd();
const REQUEST=String(process.env.ORBIT360_POSTDEPLOY_PROBE_REQUEST_FILE||'').trim();
const RUN=String(process.env.GITHUB_RUN_ID||'source-only').trim();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716',`f2-rules01-postdeploy-probe-preflight-run-${RUN}.json`);
const RULES01='.github/orbit360-requests/f2-firestore-rules-parity-repair-lab-v20260818-01.json';
const ROOTCAUSE='orbit360-platform/runtime-gate-crm-v20260716/f2-rules01-probe-validator-stale-rootcause-v20260818.json';
const LIVE='orbit360-platform/docs/orbit360-live-state-v1.json';
const EXPECT_BLOB='35fba451bbbeb97dbae3f08303b786ddbcbdd29f';
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const fail=(code,detail='')=>{throw new Error(`${code}${detail?':'+detail:''}`);};
const need=(v,code,detail='')=>{if(!v)fail(code,detail);};
const write=p=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...p,containsPII:false,containsSecrets:false},null,2)+'\n','utf8');console.log(JSON.stringify({...p,containsPII:false,containsSecrets:false},null,2));};
try{
  need(REQUEST&&fs.existsSync(path.join(ROOT,REQUEST)),'DATA_CONTRACT_FAILURE:POSTDEPLOY_PROBE_REQUEST_MISSING');
  const req=read(REQUEST),rules01=read(RULES01),rootcause=read(ROOTCAUSE),live=read(LIVE);
  need(req.requestVersion==='F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_READONLY_V1','DATA_CONTRACT_FAILURE:POSTDEPLOY_PROBE_REQUEST_VERSION');
  need(Number(req.requestOrdinal)===1,'DATA_CONTRACT_FAILURE:POSTDEPLOY_PROBE_ORDINAL');
  need(req.status==='AUTHORIZED_ONCE'&&req.approved===true&&Number(req.allowedExecutions)===1&&req.consumed===false&&req.authorizationFrozen===false&&req.replayAllowed===false,'DATA_CONTRACT_FAILURE:POSTDEPLOY_PROBE_NOT_ACTIVE');
  need(req.branch==='ays/backend-tenant-lab-v99-20260703'&&Number(req.pullRequest)===5,'DATA_CONTRACT_FAILURE:POSTDEPLOY_PROBE_BRANCH_PR');
  need(req.projectId==='ays-orbit-360-lab'&&req.tenantId==='alianzas-soluciones','DATA_CONTRACT_FAILURE:POSTDEPLOY_PROBE_PROJECT_TENANT');
  need(req.sourceRulesBlob===EXPECT_BLOB&&req.rules01RunId===32211779285,'DATA_CONTRACT_FAILURE:POSTDEPLOY_PROBE_RULES01_BINDING');
  const s=req.scope||{};
  need(s.secretAccess===true&&s.firestoreRead===true&&s.authRead===true&&s.customTokenMint===true&&s.browserProbe===true,'DATA_CONTRACT_FAILURE:POSTDEPLOY_PROBE_REQUIRED_CAPABILITIES');
  need(s.rulesDeploy===false&&s.firestoreDocumentWrite===false&&s.authWrite===false&&s.membershipWrite===false&&s.dataWrite===false&&s.hostingDeploy===false&&s.functionsDeploy===false&&s.packageRebuild===false&&s.publication===false&&s.production===false&&s.main===false&&s.merge===false,'DATA_CONTRACT_FAILURE:POSTDEPLOY_PROBE_PROHIBITED_CAPABILITY');
  need(rules01.status==='CONSUMED_VALIDATOR_STALE_AFTER_RULES_DEPLOY_PASS'&&rules01.allowedExecutions===0&&rules01.consumed===true&&rules01.authorizationFrozen===true&&rules01.replayAllowed===false,'DATA_CONTRACT_FAILURE:RULES01_NOT_FROZEN');
  need(rules01?.execution?.rulesDeploy?.ok===true&&rules01?.execution?.rulesDeploy?.sourceRulesBlob===EXPECT_BLOB,'DATA_CONTRACT_FAILURE:RULES01_DEPLOY_NOT_CERTIFIED');
  need(rootcause.canonicalClassification==='VALIDATOR_STALE'&&rootcause.canonicalCode==='F2_CROSS_TENANT_PROBE_USED_RESERVED_FIRESTORE_ID','DATA_CONTRACT_FAILURE:POSTDEPLOY_PROBE_ROOTCAUSE_NOT_BOUND');
  need(rootcause?.rulesDeploy?.ok===true&&rootcause?.rootCause?.rulesRedeployRequired===false,'DATA_CONTRACT_FAILURE:POSTDEPLOY_PROBE_REDEPLOY_NOT_BLOCKED');
  need(validateProbeDocumentPath(PROBE_DOCUMENT_PATH),'VALIDATOR_STALE:POSTDEPLOY_PROBE_PATH_INVALID',PROBE_DOCUMENT_PATH);
  const hash=spawnSync('git',['hash-object','firestore.rules'],{cwd:ROOT,encoding:'utf8'});
  need(hash.status===0&&String(hash.stdout||'').trim()===EXPECT_BLOB,'SECURITY_FAILURE:POSTDEPLOY_PROBE_RULES_SOURCE_CHANGED');
  const reqDir=path.join(ROOT,'.github/orbit360-requests');
  const request06=fs.readdirSync(reqDir).filter(n=>/f2-productive-acceptance-runtime-browser-readonly-runbound-20260818-06\.json$/i.test(n));
  need(request06.length===0,'DATA_CONTRACT_FAILURE:POSTDEPLOY_PROBE_REQUEST06_PREMATURE');
  need(String(live.phase||'').startsWith('F2_'),'DATA_CONTRACT_FAILURE:POSTDEPLOY_PROBE_LIVE_NOT_F2');
  write({schemaVersion:'orbit360-f2-rules01-postdeploy-probe-preflight-v1',ok:true,status:'GO_F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_READONLY',classification:'GO_F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_READONLY_V1',runId:RUN,requestFile:REQUEST,rules01RunId:32211779285,sourceRulesBlob:EXPECT_BLOB,probeDocumentPath:PROBE_DOCUMENT_PATH,probePathValid:true,rulesRedeployAuthorized:false,rulesRedeployExecuted:false,request06Created:false,secretAccess:false,firestoreRead:false,firestoreDocumentWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,hostingDeploy:false,functionsDeploy:false,packageRebuild:false,publication:false,production:false});
}catch(error){write({schemaVersion:'orbit360-f2-rules01-postdeploy-probe-preflight-v1',ok:false,status:String(error?.message||'').split(':')[0]||'DATA_CONTRACT_FAILURE',classification:String(error?.message||'').split(':')[0]||'DATA_CONTRACT_FAILURE',error:String(error?.message||error).slice(0,500),runId:RUN,rulesRedeployAuthorized:false,rulesRedeployExecuted:false,secretAccess:false,firestoreRead:false,firestoreDocumentWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,hostingDeploy:false,functionsDeploy:false,packageRebuild:false,publication:false,production:false});process.exitCode=41;}
