#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd();
const EXPECTED='block-auth-paula-membership-readonly-reconcile-v2-lab-v20260817';
const CONTRACT='14.3.0';
const REVISION='f1-4d-exact-successor-runtime-browser-readonly-v1-20260818';
const GATE_ID=process.argv.find((v,i)=>i>1&&!v.startsWith('--'))||EXPECTED;
const SELF_TEST=process.argv.includes('--self-test');
const REQUEST=process.env.ORBIT360_REQUEST_FILE||'';
const EXPECTED_VERSION=process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const SELF_OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f1-4d-exact-candidate-gate-source-only-v20260818.json');
const CANDIDATE_CONTRACT='tools/orbit360-f1-4d-candidate-contract-v20260818.json';
const OLD_CONTRACT='tools/orbit360-r4-certified-product-contract-v20260815.json';
const F13='orbit360-platform/runtime-gate-crm-v20260716/f1-3-membership-email-ownership-source-only-v20260818.json';
const F14B='orbit360-platform/runtime-gate-crm-v20260716/f1-4b-rootfix-artifact-parity-source-only-v20260818.json';
const F14C='orbit360-platform/runtime-gate-crm-v20260716/f1-4c-successor-artifact-certification-v20260818.json';
const F14C_RUN='orbit360-platform/runtime-gate-crm-v20260716/f1-4c-request02-run-summary-v20260818.json';
const ROOTFIX=['a808e13d69dcb687f488be7e17411796eaec3509','b050d5a1a9861f898d2bb50d1bcc5c26beb72e9b'];
const F14B_COMMIT='3c56d0baffce8fc8399050e520ee4cb54cebf4db';
const ARTIFACT_ID=9345207863;
const ZIP='orbit360-fase-a-product-f1-4c-successor-29caae94a3db.zip';
const ZIP_SHA='493009c83390901aa772842a2ba9ddd5ce5293f6969d86c5c3395ebd670a44ac';
const MANIFEST_SHA='29dafe5e63b425ea6cf641937fe1b9d4b9e63f72479a51ae76f9148a55771761';
const SOURCE='29caae94a3db1f1626bdde2ea6ee9a21799f9df6';
const MANIFEST_STATUS='FASE_A_PRODUCT_F1_4C_SUCCESSOR_CERTIFIED';
const HASH='9b663847979724e9491e1c655da32a7cb17a5f6ed26dba352de1eb811254b23f';
const ADVISOR='ase-paula-osorio';
const BRANCH='ays/backend-tenant-lab-v99-20260703';
const read=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/^\uFEFF/,''));
const isAncestor=(a,b)=>{try{execFileSync('git',['merge-base','--is-ancestor',a,b],{cwd:ROOT,stdio:'ignore'});return true;}catch{return false;}};
function persist(rel,p){const out=path.join(ROOT,rel);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(p,null,2)+'\n');}
function write(p){persist(path.relative(ROOT,OUT),p);console.log(JSON.stringify(p,null,2));}
function stop(code,detail=''){
  write({schemaVersion:'orbit360-f1-4d-runtime-browser-readonly-preflight-v1',gateId:EXPECTED,contractVersion:CONTRACT,validatorRevision:REVISION,status:'STOP_RETRY',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:[code],error:String(detail||code).slice(0,700),executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,customTokenMintAuthorized:false,writeAuthorized:false,authWriteAuthorized:false,runtimeAuthorized:false,browserAuthorized:false,packageRebuildAuthorized:false,deployAuthorized:false,publicationAuthorized:false,productionAuthorized:false,dataChangesAuthorized:false,membershipChangesAuthorized:false,containsPII:false,containsSecrets:false,ok:false});process.exit(41);
}
function exactEvidence(){
  const c=read(CANDIDATE_CONTRACT),f13=read(F13),f14b=read(F14B),f14c=read(F14C),run=read(F14C_RUN),old=read(OLD_CONTRACT);
  if(c.status!=='R4_CERTIFIED_PRODUCT_CONTRACT_BOUND'||c.sourceHead!==SOURCE||Number(c.r3DurableArtifactId)!==ARTIFACT_ID||c.zipName!==ZIP||c.zipSha256!==ZIP_SHA||c.manifestSha256!==MANIFEST_SHA||c.manifestStatus!==MANIFEST_STATUS||Number(c.fileCount)!==194||c.published!==false||c.noLabRuntime!==true||c.noPrivateSecretMaterial!==true||c.writeAuthorized!==false||c.packageRebuildAuthorized!==false||c.productionMutationAuthorized!==false)throw new Error('F1_4D_CANDIDATE_CONTRACT_MISMATCH');
  if(f13.ok!==true||f13.status!=='F1_3_MEMBERSHIP_EMAIL_OWNERSHIP_SOURCE_ONLY_PASS'||(f13.failed||[]).length!==0||(f13.staticViolations||[]).length!==0||f13.assertions?.optionalMembershipEmail!==true||f13.assertions?.authOwnsEmailWhenMembershipOmitsIt!==true||f13.assertions?.mismatchedMembershipEmailBlocked!==true||f13.sample?.emailOptional!==true||f13.sample?.emailIdentityOwner!=='auth')throw new Error('F1_3_EVIDENCE_NOT_PASS');
  if(f14b.ok!==true||f14b.status!=='F1_4B_ROOTFIX_ARTIFACT_PARITY_SOURCE_ONLY_PASS'||f14b.oldPackageBlocked!==true||f14b.currentHeadContainsRootfix!==true||f14b.rootfixEvidencePass!==true||f14b.workflowGateBeforeProvider!==true||f14b.registryPointsParityOwner!==true)throw new Error('F1_4B_EVIDENCE_NOT_PASS');
  if(f14c.ok!==true||f14c.status!=='F1_4C_SUCCESSOR_ARTIFACT_CERTIFIED_UNPUBLISHED'||f14c.manifestStatus!==MANIFEST_STATUS||f14c.sourceHead!==SOURCE||Number(f14c.baseArtifactId)!==9300368902||f14c.zipName!==ZIP||f14c.zipSha256!==ZIP_SHA||f14c.manifestSha256!==MANIFEST_SHA||Number(f14c.fileCount)!==194||Number(f14c.deltaCount)!==2||Number(f14c.unchangedProductFiles)!==192||f14c.rootfixAncestors!==true||f14c.f1_4bAncestor!==true||f14c.f1_3MembershipSemanticsPresent!==true||f14c.f1_3BootstrapAuthOwnershipPresent!==true||f14c.baseFullyRehashed!==true||f14c.successorFullyRehashed!==true||f14c.packageReopened!==true||f14c.allProductFilesRehashed!==true||f14c.published!==false||f14c.browserExecuted!==false||f14c.runtimeExecuted!==false||Number(f14c.firestoreWrites)!==0||Number(f14c.authWrites)!==0||Number(f14c.operationalWrites)!==0||f14c.deployExecuted!==false||f14c.productionTouched!==false)throw new Error('F1_4C_CERTIFICATION_NOT_PASS');
  if(run.ok!==true||run.status!=='F1_4C_REQUEST02_BUILD_PASS'||String(run.runId)!=='32194002530'||String(run.candidateArtifactId)!==String(ARTIFACT_ID)||run.zipName!==ZIP||run.zipSha256!==ZIP_SHA||Number(run.fileCount)!==194||Number(run.deltaCount)!==2||Number(run.unchangedProductFiles)!==192||run.certificationVerified!==true||run.candidateZipRehashed!==true||Number(run.priorRequest01CandidateBuilds)!==0||run.request02RerunExecuted!==false)throw new Error('F1_4C_RUN_SUMMARY_NOT_PASS');
  for(const commit of [...ROOTFIX,F14B_COMMIT])if(!isAncestor(commit,SOURCE))throw new Error(`CANDIDATE_LINEAGE_MISSING:${commit}`);
  if(old.sourceHead===SOURCE||Number(old.r3DurableArtifactId)===ARTIFACT_ID||old.zipSha256===ZIP_SHA)throw new Error('OLD_AND_CANDIDATE_CONTRACT_COLLISION');
  return {c,old};
}
function selfTest(){
  let payload;
  try{
    const {c,old}=exactEvidence();
    const head=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
    const candidateSourceIsAncestor=isAncestor(SOURCE,head);
    const oldPublishedArtifactBlocked=old.sourceHead!==SOURCE&&old.zipSha256!==ZIP_SHA;
    const requestless=true;
    const ok=candidateSourceIsAncestor&&oldPublishedArtifactBlocked&&requestless;
    payload={schemaVersion:'orbit360-f1-4d-exact-candidate-gate-source-only-v1',ok,status:ok?'F1_4D_EXACT_CANDIDATE_GATE_SOURCE_ONLY_PASS':'F1_4D_EXACT_CANDIDATE_GATE_SOURCE_ONLY_FAIL',classification:ok?'PASS':'PIPELINE_MECHANISM_FAILURE',candidateArtifactId:ARTIFACT_ID,candidateZipSha256:ZIP_SHA,candidateManifestSha256:MANIFEST_SHA,candidateSourceHead:SOURCE,candidateManifestStatus:MANIFEST_STATUS,candidateFileCount:194,candidateSourceIsAncestor,oldPublishedArtifactBlocked,rootfixLineagePass:true,f1_3EvidencePass:true,f1_4bEvidencePass:true,f1_4cCertificationPass:true,requestlessSelfTest:true,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,packageRebuilt:false,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  }catch(e){payload={schemaVersion:'orbit360-f1-4d-exact-candidate-gate-source-only-v1',ok:false,status:'F1_4D_EXACT_CANDIDATE_GATE_SOURCE_ONLY_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',error:String(e?.message||e).slice(0,700),browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,packageRebuilt:false,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};}
  persist(path.relative(ROOT,SELF_OUT),payload);console.log(JSON.stringify(payload,null,2));if(!payload.ok)process.exit(41);
}
function validateRequest(){
  if(GATE_ID!==EXPECTED)throw new Error('GATE_ID_MISMATCH');
  if(EXPECTED_VERSION!=='F1_4D_SINGLE_SUCCESSOR_RUNTIME_BROWSER_READONLY_V1')throw new Error('F1_4D_REQUEST_VERSION_ENV_MISMATCH');
  if(!REQUEST||!fs.existsSync(path.join(ROOT,REQUEST)))throw new Error('F1_4D_REQUEST_FILE_MISSING');
  const r=read(REQUEST);
  const scope={candidateArtifactRead:true,existingIdentityRead:true,membershipRead:true,secrets:true,firestoreRead:true,customTokenMint:true,browser:true,runtime:true,firestoreWrites:false,authWrites:false,membershipWrites:false,dataWrites:false,operationalWrites:false,packageRebuild:false,deploy:false,publish:false,production:false,main:false,merge:false};
  if(r.schemaVersion!=='orbit360-f1-4d-single-successor-runtime-browser-readonly-request-v1'||r.requestVersion!==EXPECTED_VERSION||r.gateId!==EXPECTED||r.rcId!=='RC-AYS-LAB-CANONICA-01'||r.status!=='AUTHORIZED_ONCE'||r.approved!==true||r.allowedExecutions!==1||r.consumed!==false||r.authorizationFrozen!==false||r.replayAllowed!==false||r.branch!==BRANCH||Number(r.pullRequest)!==5||r.projectId!=='ays-orbit-360-lab'||r.tenantId!=='alianzas-soluciones'||r.target?.advisorId!==ADVISOR||r.target?.emailHash!==HASH||JSON.stringify(r.scope)!==JSON.stringify(scope))throw new Error('F1_4D_REQUEST_COMMON_CONTRACT_MISMATCH');
  const parent=execFileSync('git',['rev-parse','HEAD^'],{cwd:ROOT,encoding:'utf8'}).trim();
  if(r.parentHead!==parent)throw new Error('F1_4D_REQUEST_PARENT_HEAD_MISMATCH');
  const changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
  if(changed.length!==1||changed[0]!==REQUEST)throw new Error('F1_4D_REQUEST_COMMIT_NOT_EXCLUSIVE');
  if(Number(r.candidate?.artifactId)!==ARTIFACT_ID||r.candidate?.zipName!==ZIP||r.candidate?.zipSha256!==ZIP_SHA||r.candidate?.manifestSha256!==MANIFEST_SHA||r.candidate?.sourceHead!==SOURCE||r.candidate?.manifestStatus!==MANIFEST_STATUS||Number(r.candidate?.fileCount)!==194)throw new Error('F1_4D_REQUEST_CANDIDATE_BINDING_MISMATCH');
  const g=r.guards||{};
  if(g.exactCandidateRequired!==true||g.gateBeforeArtifactDownload!==true||g.gateBeforeSecretAccess!==true||g.gateBeforeBrowser!==true||g.customTokenEphemeralOnly!==true||g.sameFamilyStopRetry!==true||g.packageRebuildAllowed!==false||g.deployAllowed!==false||g.publicationAllowed!==false||g.productionMutationAllowed!==false||g.authChangesAllowed!==false||g.membershipChangesAllowed!==false||g.dataChangesAllowed!==false||Number(g.firestoreWritesAllowed)!==0||Number(g.operationalWritesAllowed)!==0)throw new Error('F1_4D_REQUEST_GUARDS_MISMATCH');
  const {c}=exactEvidence();
  return {r,c,parent};
}

if(SELF_TEST){selfTest();process.exit(0);}
try{
  const {c}=validateRequest();
  write({schemaVersion:'orbit360-f1-4d-runtime-browser-readonly-preflight-v1',gateId:EXPECTED,contractVersion:CONTRACT,validatorRevision:REVISION,status:'GO_GATE_CONTRACT',classification:'GO_F1_4D_EXACT_SUCCESSOR_RUNTIME_BROWSER_READONLY',total:24,passed:24,failed:0,failedCheckIds:[],executionAuthorized:true,secretAccessAuthorized:true,firestoreReadAuthorized:true,customTokenMintAuthorized:true,writeAuthorized:false,authWriteAuthorized:false,runtimeAuthorized:true,browserAuthorized:true,packageRebuildAuthorized:false,deployAuthorized:false,publicationAuthorized:false,productionAuthorized:false,dataChangesAuthorized:false,membershipChangesAuthorized:false,targetCount:1,candidateArtifactId:ARTIFACT_ID,candidateZipName:ZIP,candidateZipSha256:ZIP_SHA,candidateManifestSha256:MANIFEST_SHA,candidateSourceHead:SOURCE,candidateManifestStatus:MANIFEST_STATUS,candidateFileCount:194,rootfixArtifactParityRequired:true,rootfixArtifactParityPass:true,exactCandidateRequired:true,targetAdvisorId:ADVISOR,targetEmailHash:HASH,containsPII:false,containsSecrets:false,ok:true});
}catch(e){stop('F1_4D_EXACT_SUCCESSOR_PREFLIGHT',e?.message||e);}
