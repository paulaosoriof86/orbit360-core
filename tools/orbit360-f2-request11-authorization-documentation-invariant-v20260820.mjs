#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const resolve=(p)=>path.resolve(ROOT,p);
const readJson=(p)=>JSON.parse(fs.readFileSync(resolve(p),'utf8'));
const sha256File=(p)=>crypto.createHash('sha256').update(fs.readFileSync(resolve(p))).digest('hex');
const OUT=resolve(process.env.ORBIT360_F2_INVARIANT_OUT||'orbit360-platform/runtime-gate-crm-v20260716/f2-request11-authorization-documentation-invariant-source-v20260820.json');
const REQUEST_FILE=String(process.env.ORBIT360_REQUEST_FILE||'').trim();
const MODE=REQUEST_FILE?'request-materialized':'authorization-persisted';
const EXPECT={
  branch:'ays/backend-tenant-lab-v99-20260703',pr:5,gateId:'f2-productive-acceptance-exact-successor-v20260818',requestVersion:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1',requestOrdinal:11,
  artifactId:9387820198,sourceHead:'fc46bd85783d8b4d524cbeb0fee54ee9a2c774af',zipSha256:'58fcbe6e8d7d3a425509c87f229b1cb12dd35a99133d46c757544cc75c55aacc',manifestSha256:'b18422fdf82830d28e82f657f83b4fd5c10ea134a4735263fa2587a2ddd808cb'
};
const AUTH='/.github/orbit360-authorizations/f2-productive-acceptance-runtime-browser-readonly-request11-v20260820.json'.slice(1);
const LIVE='orbit360-platform/docs/orbit360-live-state-v1.json';
const INDEX='orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json';
const LIFE='tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json';
const CHECKPOINT='orbit360-platform/docs/CHECKPOINT-F2-REQUEST11-AUTHORIZATION-PERSISTED-MATERIALIZATION-PENDING-20260820.md';
const ACADEMIA='orbit360-platform/docs/ACADEMIA-ACTUALIZACION-F2-AUTHORIZATION-PERSISTENCE-INVARIANT-20260820.md';
const auth=readJson(AUTH),live=readJson(LIVE),idx=readJson(INDEX),life=readJson(LIFE),authDigest=sha256File(AUTH);
const checks={
  authSchema:auth.schemaVersion==='orbit360-f2-runtime-authorization-v1',
  authIdentity:auth.gateId===EXPECT.gateId&&auth.requestVersion===EXPECT.requestVersion&&auth.requestOrdinal===EXPECT.requestOrdinal&&auth.branch===EXPECT.branch&&Number(auth.pullRequest)===EXPECT.pr,
  authCandidate:Number(auth.candidateArtifactId)===EXPECT.artifactId&&auth.candidateSourceHead===EXPECT.sourceHead&&auth.candidateZipSha256===EXPECT.zipSha256&&auth.candidateManifestSha256===EXPECT.manifestSha256,
  authOnce:auth.approved===true&&auth.status==='AUTHORIZED_PERSISTED_PENDING_REQUEST'&&auth.allowedExecutions===1&&auth.consumed===false&&auth.replayAllowed===false&&auth.authorizationFrozen===true,
  authReadOnly:auth.scope?.runtime===true&&auth.scope?.browser===true&&auth.scope?.firestoreRead===true&&auth.scope?.writes===false&&auth.scope?.firestoreWrites===false&&auth.scope?.authWrites===false&&auth.scope?.membershipWrites===false&&auth.scope?.dataWrites===false&&auth.scope?.operationalWrites===false&&auth.scope?.deploy===false&&auth.scope?.publication===false&&auth.scope?.production===false,
  liveRoot:live.phase==='F2_REQUEST11_AUTHORIZATION_PERSISTED_MATERIALIZATION_PENDING'&&live.rootCauseState?.currentBlockingFact?.code==='F2_REQUEST11_AUTHORIZATION_PERSISTED_REQUEST_MATERIALIZATION_REQUIRED'&&live.rootCauseState?.currentBlockingFact?.status==='AUTHORIZED_PERSISTED_PENDING_REQUEST',
  liveCheckpoint:live.currentCheckpoint===CHECKPOINT&&live.documentationControl?.currentCheckpoint===CHECKPOINT&&live.documentationControl?.transactionStatus==='F2_REQUEST11_AUTHORIZATION_PERSISTED_MATERIALIZATION_PENDING',
  liveAuthorization:live.authorization?.request11Authorized===true&&live.authorization?.request11AuthorizationPersisted===true&&live.authorization?.request11Created===false&&live.authorization?.request11Consumed===false&&live.authorization?.request11AuthorizationRecordPath===AUTH&&live.authorization?.request11AuthorizationRecordSha256===authDigest,
  liveNoRuntimeYet:live.authorization?.runtimeAuthorized===false&&live.authorization?.browserAuthorized===false&&live.authorization?.secretAccessAuthorized===false&&live.authorization?.firestoreReadAuthorized===false,
  liveAction:live.nextActionExact?.action==='MATERIALIZE_REQUEST11_FROM_PERSISTED_AUTHORIZATION_ON_EXACT_CURRENT_HEAD'&&live.nextActionExact?.requestOrdinal===11&&Number(live.nextActionExact?.candidateArtifactId)===EXPECT.artifactId,
  liveLane:live.lanes?.B_backend_security_gates==='REQUEST11_AUTHORIZATION_PERSISTED_MATERIALIZATION_PENDING',
  liveGoLive:live.goLive?.status==='BLOCKED_F2_REQUEST11_MATERIALIZATION_PENDING',
  liveOldRequestsFrozen:live.stopRetry?.request10MayBeCreatedWithoutFreshAuthorization===false&&live.stopRetry?.request11MayBeMaterializedFromPersistedAuthorization===true&&live.stopRetry?.request11ReplayAllowed===false,
  indexCheckpoint:idx.operationalCurrent?.currentCheckpoint===CHECKPOINT&&idx.operationalCurrent?.resumePointer===CHECKPOINT&&idx.currentCheckpoint===CHECKPOINT&&idx.resumePointer===CHECKPOINT,
  indexAuthorization:idx.operationalCurrent?.request11Authorized===true&&idx.operationalCurrent?.request11AuthorizationPersisted===true&&idx.operationalCurrent?.request11Created===false&&idx.operationalCurrent?.request11AuthorizationRecordPath===AUTH&&idx.operationalCurrent?.request11AuthorizationRecordSha256===authDigest,
  indexBoundary:idx.operationalCurrent?.nextAuthorizationBoundary==='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1:REQUEST11:MATERIALIZE_FROM_PERSISTED_AUTHORIZATION:EXACT_ARTIFACT_9387820198',
  indexAcademia:idx.operationalCurrent?.latestAcademiaUpdate===ACADEMIA&&idx.latestAcademiaUpdate===ACADEMIA,
  lifecycle:life.status==='F2_RUNTIME_REQUEST11_AUTHORIZED_PENDING_MATERIALIZATION'&&life.authorization?.humanAuthorizationPersisted===true&&life.authorization?.activeRequest===false&&life.authorization?.requestOrdinal===11&&life.authorization?.authorizationRecordPath===AUTH&&life.authorization?.authorizationRecordSha256===authDigest&&life.authorization?.pendingMaterializationAllowedExecutions===1&&life.authorization?.allowedExecutions===0&&life.authorization?.replayAllowed===false,
  productFrozen:Number(live.f2SourceOnly?.candidateArtifactId)===EXPECT.artifactId&&live.f2SourceOnly?.candidateSourceHead===EXPECT.sourceHead&&live.f2SourceOnly?.requestCreated===false,
  docsExist:fs.existsSync(resolve(CHECKPOINT))&&fs.existsSync(resolve(ACADEMIA))
};
let request=null;
if(REQUEST_FILE){
  request=readJson(REQUEST_FILE);
  Object.assign(checks,{
    requestPath:/^\.github\/orbit360-requests\/f2-productive-acceptance-runtime-browser-readonly-runbound-20260820-11\.json$/.test(REQUEST_FILE),
    requestIdentity:request.requestVersion===EXPECT.requestVersion&&request.requestOrdinal===11&&request.gateId===EXPECT.gateId&&request.branch===EXPECT.branch&&Number(request.pullRequest)===EXPECT.pr,
    requestCandidate:Number(request.candidateArtifactId)===EXPECT.artifactId&&request.candidateSourceHead===EXPECT.sourceHead&&request.candidateZipSha256===EXPECT.zipSha256&&request.candidateManifestSha256===EXPECT.manifestSha256,
    requestAuthorizationBinding:request.authorizationRecordPath===AUTH&&request.authorizationRecordSha256===authDigest&&request.authorizationBasis==='USER_EXPLICIT_AUTHORIZATION_F2_REQUEST11_2026-08-19_READONLY_ARTIFACT_9387820198',
    requestOnce:request.approved===true&&request.status==='AUTHORIZED_ONCE'&&request.allowedExecutions===1&&request.consumed===false&&request.authorizationFrozen===false&&request.replayAllowed===false,
    requestReadOnly:request.scope?.runtime===true&&request.scope?.browser===true&&request.scope?.writes===false&&request.scope?.deploy===false&&request.scope?.publication===false&&request.scope?.production===false
  });
}
const ok=Object.values(checks).every(Boolean);
const evidence={schemaVersion:'orbit360-f2-request11-authorization-documentation-invariant-v1',ok,status:ok?'F2_REQUEST11_AUTHORIZATION_DOCUMENTATION_INVARIANT_PASS':'F2_REQUEST11_AUTHORIZATION_DOCUMENTATION_INVARIANT_FAIL',classification:ok?'PASS':'PIPELINE_MECHANISM_FAILURE',code:ok?null:'AUTHORIZATION_DOCUMENTATION_REQUEST_STATE_DRIFT',mode:MODE,gateId:EXPECT.gateId,requestOrdinal:11,candidateArtifactId:EXPECT.artifactId,candidateSourceHead:EXPECT.sourceHead,authorizationRecordPath:AUTH,authorizationRecordSha256:authDigest,requestFile:REQUEST_FILE||null,checks,productMutation:false,dataMutation:false,browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
if(!ok)process.exit(41);
