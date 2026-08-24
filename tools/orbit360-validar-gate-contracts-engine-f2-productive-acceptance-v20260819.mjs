#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd(),GATE='f2-productive-acceptance-exact-successor-v20260818';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const BOUNDARY='orbit360-platform/docs/orbit360-f2-runtime-authorization-boundary-v20260820.json';
const AUTHORITY='tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json';
const LIFE='tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json';
const DEFAULT_WORKFLOW='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const EXECUTOR='tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs';
const REQUEST_VERSION='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V3';
const REQUEST_SCHEMA='orbit360-f2-productive-acceptance-runtime-browser-readonly-request-v3';
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const text=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const need=(v,c)=>{if(!v)throw new Error(c);};
const write=p=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(p,null,2)+'\n','utf8');console.log(JSON.stringify(p,null,2));};
const sameCandidate=(a,c)=>Number(a?.artifactId)===Number(c?.artifactId)&&a?.sourceHead===c?.sourceHead&&String(a?.artifactDigest||'')===String(c?.artifactDigest||'');
const workflowText=()=>{
  const raw=String(process.env.ORBIT360_F2_WORKFLOW_SOURCE_FILE||'').trim();
  if(raw){const p=path.resolve(raw);need(fs.existsSync(p),'PIPELINE_MECHANISM_FAILURE:F2_EXECUTING_WORKFLOW_SOURCE_MISSING');return fs.readFileSync(p,'utf8');}
  const event=String(process.env.GITHUB_EVENT_NAME||''),sha=String(process.env.GITHUB_SHA||'');
  if(event==='pull_request'&&/^[0-9a-f]{40}$/.test(sha)){
    try{return execFileSync('git',['show',`${sha}:${DEFAULT_WORKFLOW}`],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});}catch{throw new Error('PIPELINE_MECHANISM_FAILURE:F2_PR_TRANSPORT_WORKFLOW_SNAPSHOT_UNAVAILABLE');}
  }
  need(fs.existsSync(path.join(ROOT,DEFAULT_WORKFLOW)),'PIPELINE_MECHANISM_FAILURE:F2_EXECUTING_WORKFLOW_SOURCE_MISSING');return text(DEFAULT_WORKFLOW);
};

try{
  need(String(process.argv[2]||'')===GATE,'PIPELINE_MECHANISM_FAILURE:F2_GATE_ID_MISMATCH');
  for(const p of [LEDGER,BOUNDARY,AUTHORITY,LIFE,EXECUTOR])need(fs.existsSync(path.join(ROOT,p)),`PIPELINE_MECHANISM_FAILURE:F2_OWNER_MISSING:${p}`);
  const ledger=read(LEDGER),boundary=read(BOUNDARY),authority=read(AUTHORITY),life=read(LIFE),c=ledger.successorCandidate||{},closure=ledger.macro2Closure||{};
  need(authority.gateId===GATE&&typeof authority.gateContractVersion==='string','VALIDATOR_STALE:F2_CANONICAL_AUTHORITY_INVALID');
  const certPath=String(authority.candidateCertificationEvidence||'').trim();
  need(certPath&&fs.existsSync(path.join(ROOT,certPath)),'VALIDATOR_STALE:F2_CANONICAL_CERTIFICATION_POINTER_MISSING');
  const cert=read(certPath);
  need(ledger.stateVersion==='ORBIT360-F2-CONTINUITY-CURRENT','VALIDATOR_STALE:F2_LEDGER_STATE_VERSION_INVALID');
  need(String(c.status||'').startsWith('CERTIFIED_SOURCE_ONLY'),'VALIDATOR_STALE:F2_CERTIFIED_SUCCESSOR_UNAVAILABLE');
  need(sameCandidate(authority.candidate,c),'VALIDATOR_STALE:F2_AUTHORITY_LEDGER_CANDIDATE_DRIFT');
  const durableCertificationPass=/^orbit360-macro2-candidate-artifact-metadata-v\d+$/.test(String(cert.schemaVersion||''))&&cert.status==='CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY'&&cert.sourcePublished===true&&Number(cert.artifactId)===Number(c.artifactId)&&cert.sourceHead===c.sourceHead&&String(cert.artifactDigest)===String(c.artifactDigest)&&cert.zipSha256===c.zipSha256&&cert.manifestSha256===c.manifestSha256&&Number(cert.fileCount)===Number(c.fileCount)&&Number(cert.deltaCount)===9&&Number(cert.unchangedFileCount)===185&&cert.runtimeExecuted===false&&cert.browserExecuted===false&&cert.secretAccess===false&&cert.firestoreRead===false&&Number(cert.writes)===0&&cert.deployExecuted===false&&cert.productionTouched===false&&cert.containsPII===false&&cert.containsSecrets===false&&closure.status==='TRANSVERSAL_SOURCE_ACCEPTANCE_PASS'&&closure.evidencePath===certPath&&Number(closure.runId)===Number(cert.runId)&&Number(closure.candidateArtifactId)===Number(c.artifactId)&&closure.sourceHead===c.sourceHead&&String(closure.artifactDigest)===String(c.artifactDigest)&&Number(closure.checksPassed)===107&&Number(closure.deltaCount)===9&&Number(closure.fileCount)===194&&Number(closure.unchangedFileCount)===185;
  need(durableCertificationPass,'VALIDATOR_STALE:F2_MACRO2_DURABLE_CERTIFICATION_CONTRACT_INVALID');

  const expected=String(process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'NONE_PENDING_FRESH_AUTHORIZATION');
  if(expected==='NONE_PENDING_FRESH_AUTHORIZATION'){
    write({schemaVersion:'orbit360-f2-gate-contract-preflight-v7',ok:true,status:'PASS_GATE_CONTRACT_SOURCE_F2_PRODUCTIVE_ACCEPTANCE',classification:'PASS',gateId:GATE,contractVersion:authority.gateContractVersion,candidateArtifactId:c.artifactId,candidateSourceHead:c.sourceHead,candidateCertificationEvidence:certPath,certificationSchema:cert.schemaVersion,certificationPathDerivedFromCanonicalAuthority:true,macro2DurableCertificationValidated:true,executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,runtimeAuthorized:false,browserAuthorized:false,writeAuthorized:false,deployAuthorized:false,publicationAuthorized:false,productionAuthorized:false,containsPII:false,containsSecrets:false});
    process.exit(0);
  }

  need(expected===REQUEST_VERSION,'SECURITY_FAILURE:F2_REQUEST_VERSION_INVALID');
  need(life.gateId===GATE&&life.currentPhase==='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY','VALIDATOR_STALE:F2_RUNTIME_LIFECYCLE_NOT_REGISTERED');
  const requestRel=String(process.env.ORBIT360_REQUEST_FILE||'').trim();
  need(/^\.github\/orbit360-requests\/f2-productive-acceptance-runtime-browser-readonly-successor-[a-f0-9]{12}-v20260820\.json$/.test(requestRel),'SECURITY_FAILURE:F2_REQUEST_PATH_INVALID');
  const r=read(requestRel),runId=Number(process.env.GITHUB_RUN_ID||0);
  need(r.schemaVersion===REQUEST_SCHEMA&&r.status==='RUNTIME_ATTEMPT_ACCEPTED_PREFLIGHT_PENDING'&&r.approved===true&&r.allowedExecutions===0&&r.consumed===false&&r.authorizationFrozen===true&&r.replayAllowed===false&&r.historical===false&&r.runtimeAttemptAccepted===true&&Number(r.runtimeAttemptCount)===1,'SECURITY_FAILURE:F2_REQUEST_NOT_ACCEPTED_ONE_SHOT');
  need(runId>0&&Number(r.runtimeRunId)===runId&&Number(ledger.authorizationBoundary?.runtimeRunId)===runId&&ledger.authorizationBoundary?.runtimeAttemptAccepted===true,'SECURITY_FAILURE:F2_RUNTIME_ATTEMPT_RUN_BINDING_INVALID');
  need(Number(r.candidateArtifactId)===Number(c.artifactId)&&r.candidateSourceHead===c.sourceHead&&r.candidateArtifactDigest===c.artifactDigest,'SECURITY_FAILURE:F2_REQUEST_CANDIDATE_MISMATCH');
  need(r.authorizationIdentityDigest===boundary.authorizationIdentity?.digest&&boundary.authorizationPersisted===true&&boundary.requestMaterialized===true&&boundary.activeRequestPath===requestRel&&boundary.runtimeAllowed===false,'SECURITY_FAILURE:F2_BOUNDARY_BINDING_INVALID');
  const authPath=String(r.authorizationRecordPath||'').trim();need(authPath&&fs.existsSync(path.join(ROOT,authPath)),'SECURITY_FAILURE:F2_AUTHORIZATION_RECORD_INVALID');const a=read(authPath);
  need(a.schemaVersion==='orbit360-f2-runtime-authorization-v3'&&a.status==='RUNTIME_ATTEMPT_ACCEPTED_ONE_SHOT'&&a.approved===true&&a.allowedExecutions===0&&a.consumed===false&&a.authorizationFrozen===true&&a.replayAllowed===false&&a.historical===false&&a.runtimeAttemptAccepted===true&&Number(a.runtimeAttemptCount)===1&&Number(a.runtimeRunId)===runId,'SECURITY_FAILURE:F2_PERSISTED_AUTHORIZATION_NOT_ACCEPTED_ONE_SHOT');
  need(a.authorizationIdentityDigest===r.authorizationIdentityDigest&&Number(a.candidateArtifactId)===Number(c.artifactId)&&a.candidateSourceHead===c.sourceHead&&a.candidateArtifactDigest===c.artifactDigest,'SECURITY_FAILURE:F2_PERSISTED_AUTHORIZATION_IDENTITY_INVALID');
  const s=a.scopeAuthorized||{};need(s.runtime===true&&s.browser===true&&s.firestoreRead===true&&s.secrets===true&&s.customTokenMint===true,'SECURITY_FAILURE:F2_AUTH_READ_CAPABILITIES_MISSING');for(const k of ['writes','firestoreWrites','authWrites','membershipWrites','dataWrites','operationalWrites','deploy','publish','publication','production','main','merge'])need(s[k]===false,`SECURITY_FAILURE:F2_AUTH_EXCESS_CAPABILITY:${k}`);

  const wf=workflowText(),ex=text(EXECUTOR),gateA='Mandatory canonical F2 gate before artifact or provider/browser',gateB='Mandatory F2 gate before artifact/provider/browser',providerA='Bind provider after F2 GO',providerB='Bind read-only provider only after GO';
  const gateToken=wf.includes(gateB)?gateB:gateA,providerToken=wf.includes(providerB)?providerB:providerA;
  need(wf.includes('MACRO3_INLINE_F2_V1')&&gateToken&&providerToken&&wf.indexOf(gateToken)<wf.indexOf(providerToken),'SECURITY_FAILURE:F2_GATE_ORDER_INVALID');
  need(wf.includes(REQUEST_VERSION)&&!wf.includes('/dispatches')&&!/^\s*workflow_run\s*:/mi.test(wf)&&!wf.includes('gh workflow run'),'PIPELINE_MECHANISM_FAILURE:F2_INLINE_RUNTIME_NOT_SINGLE_TRIGGER');
  need(ex.includes('REQUEST?.candidateArtifactId')&&ex.includes('REQUEST?.candidateSourceHead'),'VALIDATOR_STALE:F2_RUNTIME_EXECUTOR_NOT_DYNAMIC');

  write({schemaVersion:'orbit360-f2-gate-contract-preflight-v7',ok:true,status:'GO_GATE_CONTRACT',classification:'GO_F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY',gateId:GATE,contractVersion:authority.gateContractVersion,candidateArtifactId:c.artifactId,candidateSourceHead:c.sourceHead,candidateZipSha256:c.zipSha256,candidateManifestSha256:c.manifestSha256,candidateFileCount:c.fileCount,candidateCertificationEvidence:certPath,certificationSchema:cert.schemaVersion,certificationPathDerivedFromCanonicalAuthority:true,macro2DurableCertificationValidated:true,authorizationIdentityDigest:r.authorizationIdentityDigest,persistedAuthorizationPath:authPath,runtimeRunId:runId,runtimeAttemptAccepted:true,executionAuthorized:true,secretAccessAuthorized:true,firestoreReadAuthorized:true,customTokenMintAuthorized:true,runtimeAuthorized:true,browserAuthorized:true,writeAuthorized:false,authWriteAuthorized:false,membershipWriteAuthorized:false,dataWriteAuthorized:false,packageRebuildAuthorized:false,deployAuthorized:false,publicationAuthorized:false,productionAuthorized:false,firestoreWrites:0,authWrites:0,operationalWrites:0,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,containsPII:false,containsSecrets:false});
}catch(error){let contractVersion='2.2.0';try{const a=read(AUTHORITY);if(a?.gateContractVersion)contractVersion=a.gateContractVersion;}catch{}write({schemaVersion:'orbit360-f2-gate-contract-preflight-v7',ok:false,status:'FAIL_CLOSED',classification:String(error?.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',gateId:GATE,contractVersion,error:String(error?.message||error).slice(0,900),executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,runtimeAuthorized:false,browserAuthorized:false,writeAuthorized:false,deployAuthorized:false,publicationAuthorized:false,productionAuthorized:false,firestoreWrites:0,authWrites:0,operationalWrites:0,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,containsPII:false,containsSecrets:false});process.exitCode=41;}
