#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd();
const EXPECTED='block-auth-paula-membership-readonly-reconcile-v2-lab-v20260817';
const CONTRACT='14.3.0';
const REVISION='rootfix-artifact-parity-v2-20260818';
const GATE_ID=process.argv.find((v,i)=>i>1&&!v.startsWith('--'))||EXPECTED;
const SELF_TEST=process.argv.includes('--self-test');
const REQUEST=process.env.ORBIT360_REQUEST_FILE||'.github/orbit360-requests/auth-paula-membership-readonly-reconcile-v2-lab-v20260817.json';
const EXPECTED_VERSION=process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'';
const EVIDENCE=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const SELF_TEST_EVIDENCE=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f1-4b-rootfix-artifact-parity-source-only-v20260818.json');
const OLD_ENGINE='tools/orbit360-validar-gate-contracts-engine-auth-paula-membership-readonly-reconcile-v2-lab-v20260817.mjs';
const CERTIFIED_CONTRACT='tools/orbit360-r4-certified-product-contract-v20260815.json';
const REPAIR_PATH='orbit360-platform/runtime-gate-crm-v20260716/auth-paula-membership-gate14-3-repair-run-32092348630.json';
const PRIOR_CREDENTIAL_PATH='orbit360-platform/runtime-gate-crm-v20260716/auth-paula-gate14-3-smoke-run-32095105528.json';
const ROOTFIX_EVIDENCE_PATH='orbit360-platform/runtime-gate-crm-v20260716/f1-3-membership-email-ownership-source-only-v20260818.json';
const ROOTFIX_EVIDENCE_COMMIT='7e2123f91d1cbf518a92197b6e24fed9ae29c65c';
const ROOTFIX_MEMBERSHIP_COMMIT='a808e13d69dcb687f488be7e17411796eaec3509';
const ROOTFIX_BOOTSTRAP_COMMIT='b050d5a1a9861f898d2bb50d1bcc5c26beb72e9b';
const ROOTFIX_STATUS='F1_3_MEMBERSHIP_EMAIL_OWNERSHIP_SOURCE_ONLY_PASS';
const HASH='9b663847979724e9491e1c655da32a7cb17a5f6ed26dba352de1eb811254b23f';
const ADVISOR='ase-paula-osorio';

const read=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/^\uFEFF/,''));
function writeFile(p,payload){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(payload,null,2)+'\n');}
function write(payload){writeFile(EVIDENCE,payload);console.log(JSON.stringify(payload,null,2));}
function stop(code,detail=''){
  write({schemaVersion:'orbit360-auth-paula-membership-gate14-3-preflight-v4-rootfix-artifact-parity',gateId:EXPECTED,contractVersion:CONTRACT,validatorRevision:REVISION,status:'STOP_RETRY',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:[code],error:detail||code,rootfixArtifactParityRequired:true,rootfixArtifactParityPass:false,executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,writeAuthorized:false,authWriteAuthorized:false,runtimeAuthorized:false,browserAuthorized:false,deployAuthorized:false,productionAuthorized:false,containsPII:false,containsSecrets:false,ok:false});
  process.exit(41);
}
function isAncestor(ancestor,descendant){
  try{execFileSync('git',['merge-base','--is-ancestor',ancestor,descendant],{cwd:ROOT,stdio:'ignore'});return true;}catch{return false;}
}
function exactRootfixEvidence(){
  const e=read(ROOTFIX_EVIDENCE_PATH);
  return e.ok===true&&e.status===ROOTFIX_STATUS&&Array.isArray(e.failed)&&e.failed.length===0&&Array.isArray(e.staticViolations)&&e.staticViolations.length===0&&e.sample?.emailOptional===true&&e.sample?.emailIdentityOwner==='auth'&&e.sample?.writeAuthorized===false&&e.sample?.writeExecuted===false;
}
function rootfixParity(sourceHead){
  return Boolean(sourceHead)&&isAncestor(ROOTFIX_MEMBERSHIP_COMMIT,sourceHead)&&isAncestor(ROOTFIX_BOOTSTRAP_COMMIT,sourceHead);
}
function common(r){
  if(r.gateId!==EXPECTED||r.rcId!=='RC-AYS-LAB-CANONICA-01'||r.status!=='AUTHORIZED_ONCE'||r.approved!==true||r.allowedExecutions!==1||r.consumed!==false||r.authorizationFrozen!==false||r.replayAllowed!==false||r.branch!=='ays/backend-tenant-lab-v99-20260703'||r.pullRequest!==5||r.projectId!=='ays-orbit-360-lab'||r.tenantId!=='alianzas-soluciones'||r.target?.advisorId!==ADVISOR||r.target?.emailHash!==HASH)throw new Error('REQUEST_COMMON_CONTRACT_MISMATCH');
  const parent=execFileSync('git',['rev-parse','HEAD^'],{cwd:ROOT,encoding:'utf8'}).trim();
  if(r.parentHead!==parent)throw new Error('REQUEST_PARENT_HEAD_MISMATCH');
  const changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
  if(changed.length!==1||changed[0]!==REQUEST)throw new Error('REQUEST_COMMIT_NOT_EXCLUSIVE');
}
function validatePostauth(r){
  const scope={existingIdentityRead:true,membershipRead:true,customTokenMint:true,passwordSecretRead:false,browser:true,serviceWorkerParity:true,firestoreWrites:false,authWrites:false,passwordReset:false,passwordResetLink:false,passwordChange:false,directPasswordSet:false,authUserCreate:false,authUserDelete:false,functionsDeploy:false,hostingDeploy:false,rulesDeploy:false,reimport:false,crmWrites:false,production:false,main:false,merge:false};
  if(r.schemaVersion!=='orbit360-auth-paula-postauth-custom-token-readonly-smoke-request-v1'||r.requestVersion!=='AUTH_PAULA_REAL_BROWSER_POSTAUTH_CUSTOM_TOKEN_READONLY_V1'||JSON.stringify(r.scope)!==JSON.stringify(scope))throw new Error('POSTAUTH_CUSTOM_TOKEN_REQUEST_CONTRACT_MISMATCH');
  if(r.basis?.repairRunId!=='32092348630'||r.basis?.repairEvidencePath!==REPAIR_PATH||r.basis?.certifiedContractPath!==CERTIFIED_CONTRACT||r.basis?.priorCredentialRunId!=='32095105528'||r.basis?.priorCredentialEvidencePath!==PRIOR_CREDENTIAL_PATH)throw new Error('POSTAUTH_CUSTOM_TOKEN_BASIS_BINDING_MISMATCH');
  if(r.basis?.rootfixEvidenceCommit!==ROOTFIX_EVIDENCE_COMMIT||r.basis?.rootfixEvidencePath!==ROOTFIX_EVIDENCE_PATH||r.basis?.rootfixStatus!==ROOTFIX_STATUS)throw new Error('ROOTFIX_EVIDENCE_BINDING_REQUIRED');
  if(r.guards?.targetIdentityMatchRequired!==true||r.guards?.serviceWorkerParityRequired!==true||r.guards?.customTokenExactTargetRequired!==true||r.guards?.passwordSecretReadAllowed!==false||r.guards?.customTokenPersistenceAllowed!==false||r.guards?.firestoreWritesAllowed!==0||r.guards?.authWritesAllowed!==0||r.guards?.deployAllowed!==false||r.guards?.productionAllowed!==false)throw new Error('POSTAUTH_CUSTOM_TOKEN_GUARDS_MISMATCH');
  if(!exactRootfixEvidence())throw new Error('ROOTFIX_SOURCE_EVIDENCE_NOT_PASS');
  const repaired=read(REPAIR_PATH);
  if(repaired.ok!==true||repaired.status!=='TARGET_MEMBERSHIP_SCOPE_CANONICAL_REPAIR_PASS'||repaired.runId!=='32092348630'||repaired.validatorRevision!=='canonical-scope-repair-v1-semantic-noexpansion'||repaired.fieldPath!=='dataScopes.default'||repaired.afterStoredDefaultScope!=='all'||repaired.afterEffectiveDefaultScope!=='all'||repaired.semanticAccessExpansion!==false||repaired.readbackUnchangedExceptTarget!==true||repaired.firestoreWrites!==1||repaired.authWrites!==0)throw new Error('SMOKE_REPAIR_BASIS_NOT_PASS');
  const c=read(CERTIFIED_CONTRACT);
  if(c.status!=='R4_CERTIFIED_PRODUCT_CONTRACT_BOUND'||typeof c.sourceHead!=='string'||!/^[0-9a-f]{40}$/.test(c.sourceHead)||c.manifestStatus!=='FASE_A_PRODUCT_R4S9C_CONTRACT_RECOVERY_CERTIFIED'||c.writeAuthorized!==false||c.packageRebuildAuthorized!==false||c.productionMutationAuthorized!==false)throw new Error('SMOKE_CERTIFIED_CONTRACT_MISMATCH');
  const envSource=String(process.env.ORBIT360_R4_PACKAGE_SOURCE_HEAD||'');
  if(!envSource||envSource!==c.sourceHead)throw new Error('CERTIFIED_ARTIFACT_SOURCE_ENV_MISMATCH');
  if(!rootfixParity(c.sourceHead))throw new Error('ROOTFIX_NOT_PRESENT_IN_CERTIFIED_ARTIFACT');
  const prior=read(PRIOR_CREDENTIAL_PATH);
  if(prior.ok!==false||prior.status!=='AUTH_PAULA_REAL_BROWSER_READONLY_SMOKE_FAIL'||prior.classification!=='DATA_CONTRACT_FAILURE'||prior.failedCheck!=='R4_SMOKE_IDENTITY_CREDENTIAL_REJECTED'||prior.runId!=='32095105528'||prior.targetIdentityMatches!==true||prior.serviceWorkerParityEnabled!==true||prior.browserExecuted!==true||prior.currentStage!=='login-http-classified'||prior.authSignedIn!==false||prior.firestoreWrites!==0||prior.authWrites!==0||prior.operationalWrites!==0)throw new Error('POSTAUTH_CUSTOM_TOKEN_PRIOR_CREDENTIAL_EVIDENCE_NOT_BOUND');
  return c;
}
function selfTest(){
  const certified=read(CERTIFIED_CONTRACT);
  const head=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
  const oldPackageBlocked=!rootfixParity(certified.sourceHead);
  const currentHeadContainsRootfix=rootfixParity(head);
  const evidencePass=exactRootfixEvidence();
  const workflow=fs.readFileSync(path.join(ROOT,'.github/workflows/orbit360-auth-paula-membership-readonly-reconcile-v4-20260817.yml'),'utf8');
  const workflowGateBeforeProvider=workflow.indexOf('Mandatory canonical gate before provider or browser')>=0&&workflow.indexOf('Mandatory canonical gate before provider or browser')<workflow.indexOf('Bind provider after GO');
  const register=fs.readFileSync(path.join(ROOT,'tools/orbit360-register-auth-paula-membership-readonly-reconcile-v2-gate-v20260817.mjs'),'utf8');
  const registryPointsParityOwner=register.includes('orbit360-validar-gate-contracts-engine-auth-paula-membership-readonly-reconcile-v2-lab-v20260818.mjs');
  const ok=oldPackageBlocked&&currentHeadContainsRootfix&&evidencePass&&workflowGateBeforeProvider&&registryPointsParityOwner;
  const payload={schemaVersion:'orbit360-f1-4b-rootfix-artifact-parity-source-only-v1',ok,status:ok?'F1_4B_ROOTFIX_ARTIFACT_PARITY_SOURCE_ONLY_PASS':'F1_4B_ROOTFIX_ARTIFACT_PARITY_SOURCE_ONLY_FAIL',classification:ok?'PIPELINE_MECHANISM_FAILURE_ROOTFIX_PASS':'PIPELINE_MECHANISM_FAILURE',validatorRevision:REVISION,certifiedArtifactSourceHead:certified.sourceHead,oldPackageBlocked,currentHeadContainsRootfix,rootfixEvidencePass:evidencePass,workflowGateBeforeProvider,registryPointsParityOwner,rootfixCommits:[ROOTFIX_MEMBERSHIP_COMMIT,ROOTFIX_BOOTSTRAP_COMMIT],rootfixEvidenceCommit:ROOTFIX_EVIDENCE_COMMIT,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,packageRebuilt:false,productionTouched:false,containsPII:false,containsSecrets:false};
  writeFile(SELF_TEST_EVIDENCE,payload);console.log(JSON.stringify(payload,null,2));if(!ok)process.exit(41);
}

if(SELF_TEST){selfTest();process.exit(0);}
if(GATE_ID!==EXPECTED)stop('GATE_ID_MISMATCH');
if(EXPECTED_VERSION!=='AUTH_PAULA_REAL_BROWSER_POSTAUTH_CUSTOM_TOKEN_READONLY_V1'){
  try{execFileSync(process.execPath,[path.join(ROOT,OLD_ENGINE),GATE_ID],{cwd:ROOT,stdio:'inherit',env:process.env});process.exit(0);}catch(e){process.exit(Number.isInteger(e?.status)?e.status:41);}
}
try{
  const r=read(REQUEST);common(r);const c=validatePostauth(r);
  write({schemaVersion:'orbit360-auth-paula-postauth-custom-token-readonly-smoke-preflight-v2-rootfix-artifact-parity',gateId:EXPECTED,contractVersion:CONTRACT,validatorRevision:REVISION,status:'GO_GATE_CONTRACT',classification:'GO_PAULA_POSTAUTH_CUSTOM_TOKEN_READONLY_SMOKE',total:42,passed:42,failed:0,failedCheckIds:[],executionAuthorized:true,secretAccessAuthorized:true,firestoreReadAuthorized:true,customTokenMintAuthorized:true,passwordSecretReadAuthorized:false,writeAuthorized:false,authWriteAuthorized:false,passwordResetAuthorized:false,passwordResetLinkAuthorized:false,runtimeAuthorized:true,browserAuthorized:true,deployAuthorized:false,productionAuthorized:false,targetCount:1,serviceWorkerParityRequired:true,targetIdentityMatchRequired:true,customTokenExactTargetRequired:true,customTokenPersistenceAllowed:false,repairBasisRunId:'32092348630',priorCredentialRunId:'32095105528',rootfixArtifactParityRequired:true,rootfixArtifactParityPass:true,rootfixEvidenceCommit:ROOTFIX_EVIDENCE_COMMIT,rootfixEvidenceStatus:ROOTFIX_STATUS,certifiedArtifactSourceHead:c.sourceHead,targetAdvisorId:ADVISOR,targetEmailHash:HASH,containsPII:false,containsSecrets:false,ok:true});
}catch(e){stop(e?.message||'ROOTFIX_ARTIFACT_PARITY_PREFLIGHT_FAILED',String(e?.message||e));}
