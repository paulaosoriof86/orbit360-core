#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE_ID=process.argv[2]||'';
const EXPECTED='f1-4c-successor-artifact-build-lab-v20260818';
const CONTRACT='1.0.0';
const REQUEST=process.env.ORBIT360_REQUEST_FILE||'';
const EXPECTED_VERSION=process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const BRANCH='ays/backend-tenant-lab-v99-20260703';
const BASE_SOURCE='861326906558f03d9c8c2e7f34adfb4979a17d73';
const BASE_ARTIFACT_ID=9300368902;
const BASE_ZIP_SHA='917f5424deea06d224d45a1b039c0b3699d71a7bef430b2a40d059703b2acc3a';
const ROOTFIX=['a808e13d69dcb687f488be7e17411796eaec3509','b050d5a1a9861f898d2bb50d1bcc5c26beb72e9b'];
const F14B='3c56d0baffce8fc8399050e520ee4cb54cebf4db';
const EXPECTED_DELTA=['orbit360-platform/core/backend-product-readonly-bootstrap-p0.js','orbit360-platform/core/membership-multirol-contract-p0.js'];
const F13_EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/f1-3-membership-email-ownership-source-only-v20260818.json';
const F14B_EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/f1-4b-rootfix-artifact-parity-source-only-v20260818.json';
const BASE_CONTRACT='tools/orbit360-r4-certified-product-contract-v20260815.json';
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const sh=(a)=>execFileSync('git',a,{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
function write(v){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(v,null,2)+'\n');console.log(JSON.stringify(v,null,2));}
function stop(e){write({schemaVersion:'orbit360-f1-4c-successor-build-preflight-v1',gateId:EXPECTED,contractVersion:CONTRACT,status:'STOP_RETRY',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['F1_4C_SUCCESSOR_BUILD_PREFLIGHT'],error:String(e?.message||e).slice(0,700),executionAuthorized:false,packageRebuildAuthorized:false,artifactUploadAuthorized:false,secretAccessAuthorized:false,writesAuthorized:0,runtimeAuthorized:false,browserAuthorized:false,deployAuthorized:false,productionAuthorized:false,dataAccess:false,secretAccess:false,operationalWrites:0,firestoreWrites:0,authWrites:0,containsPII:false,containsSecrets:false,ok:false});process.exit(41);}
function ancestor(a,b){return spawnSync('git',['merge-base','--is-ancestor',a,b],{cwd:ROOT}).status===0;}
function f13EvidencePass(f13){
  const a=f13&&f13.assertions||{};
  const s=f13&&f13.sample||{};
  return f13?.ok===true &&
    f13?.status==='F1_3_MEMBERSHIP_EMAIL_OWNERSHIP_SOURCE_ONLY_PASS' &&
    Array.isArray(f13?.failed) && f13.failed.length===0 &&
    Array.isArray(f13?.staticViolations) && f13.staticViolations.length===0 &&
    a.optionalMembershipEmail===true &&
    a.malformedEmailStillBlocked===true &&
    a.authOwnsEmailWhenMembershipOmitsIt===true &&
    a.matchingMembershipEmailAllowed===true &&
    a.mismatchedMembershipEmailBlocked===true &&
    s.emailOptional===true &&
    s.emailIdentityOwner==='auth' &&
    s.writeAuthorized===false &&
    s.writeExecuted===false;
}
try{
  if(GATE_ID!==EXPECTED)throw new Error('GATE_ID_MISMATCH');
  if(!REQUEST||EXPECTED_VERSION!=='F1_4C_SUCCESSOR_ARTIFACT_BUILD_V1')throw new Error('REQUEST_VERSION_ENV_MISMATCH');
  const r=read(REQUEST);
  const scope={packageRebuild:true,singleCandidate:true,githubArtifactUpload:true,browser:false,runtime:false,deploy:false,publish:false,production:false,authWrites:false,firestoreWrites:false,dataWrites:false,operationalWrites:false,main:false,merge:false};
  if(r.schemaVersion!=='orbit360-f1-4c-successor-artifact-build-request-v1'||r.requestVersion!==EXPECTED_VERSION||r.gateId!==EXPECTED||r.status!=='AUTHORIZED_ONCE'||r.approved!==true||r.allowedExecutions!==1||r.consumed!==false||r.authorizationFrozen!==false||r.replayAllowed!==false||r.branch!==BRANCH||r.pullRequest!==5)throw new Error('REQUEST_COMMON_CONTRACT_MISMATCH');
  if(JSON.stringify(r.scope)!==JSON.stringify(scope))throw new Error('REQUEST_SCOPE_MISMATCH');
  const parent=sh(['rev-parse','HEAD^']);
  if(r.parentHead!==parent)throw new Error('REQUEST_PARENT_HEAD_MISMATCH');
  const changed=sh(['diff-tree','--no-commit-id','--name-only','-r','HEAD']).split(/\r?\n/).filter(Boolean);
  if(changed.length!==1||changed[0]!==REQUEST)throw new Error('REQUEST_COMMIT_NOT_EXCLUSIVE');
  if(!ancestor(BASE_SOURCE,parent))throw new Error('BASE_SOURCE_NOT_ANCESTOR');
  for(const c of [...ROOTFIX,F14B])if(!ancestor(c,parent))throw new Error(`BOUND_ROOTFIX_NOT_IN_SOURCE:${c}`);
  const f13=read(F13_EVIDENCE),f14b=read(F14B_EVIDENCE),base=read(BASE_CONTRACT);
  if(!f13EvidencePass(f13))throw new Error('F1_3_EVIDENCE_NOT_PASS');
  if(f14b.ok!==true||f14b.status!=='F1_4B_ROOTFIX_ARTIFACT_PARITY_SOURCE_ONLY_PASS'||f14b.oldPackageBlocked!==true||f14b.currentHeadContainsRootfix!==true)throw new Error('F1_4B_EVIDENCE_NOT_PASS');
  if(base.status!=='R4_CERTIFIED_PRODUCT_CONTRACT_BOUND'||base.sourceHead!==BASE_SOURCE||base.r3DurableArtifactId!==BASE_ARTIFACT_ID||base.zipSha256!==BASE_ZIP_SHA||base.fileCount!==194||base.noLabRuntime!==true||base.noPrivateSecretMaterial!==true)throw new Error('R4S9C_BASE_CONTRACT_MISMATCH');
  const productDiff=sh(['diff','--name-only',BASE_SOURCE,parent,'--','orbit360-platform/core','orbit360-platform/modules','orbit360-platform/styles','orbit360-platform/index.html','orbit360-platform/sw.js','orbit360-platform/product-runtime-config.js']).split(/\r?\n/).filter(Boolean).sort();
  if(JSON.stringify(productDiff)!==JSON.stringify(EXPECTED_DELTA))throw new Error(`PRODUCT_DELTA_SCOPE_MISMATCH:${JSON.stringify(productDiff)}`);
  write({schemaVersion:'orbit360-f1-4c-successor-build-preflight-v1',gateId:EXPECTED,contractVersion:CONTRACT,status:'GO_GATE_CONTRACT',classification:'GO_F1_4C_SINGLE_SUCCESSOR_BUILD',total:18,passed:18,failed:0,failedCheckIds:[],executionAuthorized:true,packageRebuildAuthorized:true,allowedCandidateBuilds:1,artifactUploadAuthorized:true,secretAccessAuthorized:false,writesAuthorized:0,runtimeAuthorized:false,browserAuthorized:false,deployAuthorized:false,productionAuthorized:false,sourceHead:parent,baseSourceHead:BASE_SOURCE,baseArtifactId:BASE_ARTIFACT_ID,baseZipSha256:BASE_ZIP_SHA,productDeltaPaths:EXPECTED_DELTA,rootfixCommits:ROOTFIX,f1_4bEvidenceCommit:F14B,f1_3EvidenceSchema:'sample-and-assertions-v1',dataAccess:false,secretAccess:false,operationalWrites:0,firestoreWrites:0,authWrites:0,containsPII:false,containsSecrets:false,ok:true});
}catch(e){stop(e);}
