#!/usr/bin/env node
'use strict';
// Exact candidate identity/package validator. Behavioral rootfix correctness is owned by semantic gates/runtime tests, not source-token matching.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const DIR=path.resolve(String(process.env.ORBIT360_F2_CANDIDATE_DIR||'').trim());
const OUT=path.resolve(process.env.ORBIT360_F2_CANDIDATE_SOURCE_EVIDENCE||path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f2-exact-candidate-source-validation-v20260818.json'));
const REQUEST_PATH=String(process.env.ORBIT360_REQUEST_FILE||'').trim();
const P={ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',authority:'tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json',contract:'orbit360-platform/docs/orbit360-control-plane-semantic-contract-v20260824.json',registry:'orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json'};
const REQUEST_SCHEMA='orbit360-f2-productive-acceptance-runtime-browser-readonly-request-v4-risk-boundary';
const need=(v,c)=>{if(!v)throw new Error(c);};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const A=p=>path.join(ROOT,p),readJson=p=>JSON.parse(fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''));
const persist=p=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(p,null,2)+'\n','utf8');console.log(JSON.stringify(p,null,2));};
let EXPECT={artifactId:0};
try{
  need(REQUEST_PATH&&fs.existsSync(A(REQUEST_PATH)),'VALIDATOR_STALE:F2_DYNAMIC_REQUEST_REQUIRED');
  for(const p of Object.values(P))need(fs.existsSync(A(p)),`PIPELINE_MECHANISM_FAILURE:F2_CANONICAL_IDENTITY_SOURCE_MISSING:${p}`);
  const r=readJson(REQUEST_PATH),ledger=readJson(P.ledger),authority=readJson(P.authority),contract=readJson(P.contract),registry=readJson(P.registry),c=ledger.successorCandidate||{},closure=ledger.macro2Closure||{},runId=Number(process.env.GITHUB_RUN_ID||0);
  const CERT_PATH=String(authority.candidateCertificationEvidence||'').trim();
  need(CERT_PATH&&fs.existsSync(A(CERT_PATH)),'VALIDATOR_STALE:F2_CANONICAL_CERTIFICATION_POINTER_MISSING');
  const cert=readJson(CERT_PATH);

  const requestIdentityPass=r.schemaVersion===REQUEST_SCHEMA&&r.status==='RUNTIME_ATTEMPT_RESERVED_PREFLIGHT_PENDING'&&r.approved===true&&r.allowedExecutions===1&&r.consumed===false&&r.authorizationFrozen===true&&r.replayAllowed===false&&r.historical===false&&r.runtimeAttemptAccepted===true&&r.runtimeAttemptReserved===true&&r.privilegedRiskBoundaryEntered===false&&Number(r.runtimeAttemptCount)===0&&runId>0&&Number(r.runtimeRunId)===runId&&Number(ledger.authorizationBoundary?.runtimeRunId)===runId&&ledger.authorizationBoundary?.runtimeAttemptAccepted===true&&ledger.authorizationBoundary?.privilegedRiskBoundaryEntered!==true;
  need(requestIdentityPass,'VALIDATOR_STALE:F2_V4_REQUEST_NOT_RESERVED_UNCONSUMED_ONE_SHOT');
  need(/^[a-f0-9]{64}$/.test(String(r.authorizationIdentityDigest||'')),'VALIDATOR_STALE:F2_V4_REQUEST_AUTH_IDENTITY_INVALID');

  EXPECT={artifactId:Number(c.artifactId||0),sourceHead:String(c.sourceHead||''),artifactDigest:String(c.artifactDigest||''),zipSha256:String(c.zipSha256||''),manifestSha256:String(c.manifestSha256||''),fileCount:Number(c.fileCount||0)};
  need(EXPECT.artifactId>0&&/^[0-9a-f]{40}$/.test(EXPECT.sourceHead)&&/^sha256:[0-9a-f]{64}$/.test(EXPECT.artifactDigest)&&/^[0-9a-f]{64}$/.test(EXPECT.zipSha256)&&/^[0-9a-f]{64}$/.test(EXPECT.manifestSha256)&&Number.isInteger(EXPECT.fileCount)&&EXPECT.fileCount>0,'VALIDATOR_STALE:F2_CANONICAL_CANDIDATE_IDENTITY_INVALID');
  need(Number(authority.candidate?.artifactId)===EXPECT.artifactId&&authority.candidate?.sourceHead===EXPECT.sourceHead&&authority.candidate?.artifactDigest===EXPECT.artifactDigest&&authority.candidate?.zipSha256===EXPECT.zipSha256&&authority.candidate?.manifestSha256===EXPECT.manifestSha256,'VALIDATOR_STALE:F2_AUTHORITY_LEDGER_CANDIDATE_DRIFT');
  need(Number(r.candidateArtifactId)===EXPECT.artifactId&&r.candidateSourceHead===EXPECT.sourceHead&&r.candidateArtifactDigest===EXPECT.artifactDigest,'VALIDATOR_STALE:F2_V4_REQUEST_CANONICAL_CANDIDATE_MISMATCH');

  const certDelta=Number(cert.deltaCount),certUnchanged=Number(cert.unchangedFileCount),certChecks=Number(cert.checksPassed);
  const dynamicCounts=Number.isInteger(certDelta)&&certDelta>=0&&certDelta<=EXPECT.fileCount&&certUnchanged===EXPECT.fileCount-certDelta&&Number.isInteger(certChecks)&&certChecks>0;
  const durableCertificationPass=/^orbit360-macro2-candidate-artifact-metadata-v\d+$/.test(String(cert.schemaVersion||''))&&cert.status==='CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY'&&cert.sourcePublished===true&&Number(cert.artifactId)===EXPECT.artifactId&&cert.sourceHead===EXPECT.sourceHead&&cert.artifactDigest===EXPECT.artifactDigest&&cert.zipSha256===EXPECT.zipSha256&&cert.manifestSha256===EXPECT.manifestSha256&&Number(cert.fileCount)===EXPECT.fileCount&&dynamicCounts&&cert.runtimeExecuted===false&&cert.browserExecuted===false&&cert.secretAccess===false&&cert.firestoreRead===false&&Number(cert.writes)===0&&cert.deployExecuted===false&&cert.productionTouched===false&&cert.containsPII===false&&cert.containsSecrets===false&&closure.status==='TRANSVERSAL_SOURCE_ACCEPTANCE_PASS'&&closure.evidencePath===CERT_PATH&&Number(closure.runId)===Number(cert.runId)&&Number(closure.candidateArtifactId)===EXPECT.artifactId&&closure.sourceHead===EXPECT.sourceHead&&closure.artifactDigest===EXPECT.artifactDigest&&Number(closure.checksPassed)===certChecks&&Number(closure.deltaCount)===certDelta&&Number(closure.fileCount)===EXPECT.fileCount&&Number(closure.unchangedFileCount)===certUnchanged;
  need(durableCertificationPass,'VALIDATOR_STALE:F2_MACRO2_DURABLE_CERTIFICATION_CONTRACT_INVALID');

  const policy=contract.behavioralContractPolicy||{},wfReq=contract.workflowSemanticRequirements||{},semantic=registry.semanticValidation||{},regPolicy=registry.policies||{};
  const semanticBehaviorOwnershipPass=contract.active===true&&policy.sourceTextMayNotProveBehavior===true&&policy.literalImplementationStringChecksForbidden===true&&policy.behavioralExecutionRequiredForCriticalTransitions===true&&policy.runtimeRegisterMustBeReadOnly===true&&policy.runtimeRouterMustSupportF2V4RiskBoundary===true&&policy.preRiskAuthorizationReuseMustExercisePersistMaterializeReserveRegisterAndSemanticGate===true&&wfReq.runtimeRegisterReadOnly===true&&wfReq.nativeF2RuntimeRequestSchema===REQUEST_SCHEMA&&wfReq.attemptReservationConsumesBudget===false&&semantic.runtimeRegisterMode==='READ_ONLY_VALIDATOR'&&semantic.runtimeRouterMode==='NATIVE_F2_V4_RISK_BOUNDARY'&&regPolicy.behavioralValidatorsUseSemanticContract===true&&regPolicy.sourceTextBehaviorValidationForbidden===true&&regPolicy.authorizationReservationDoesNotConsumeOneShot===true&&regPolicy.oneShotBudgetConsumedOnlyAfterObservedPrivilegedRisk===true;
  need(semanticBehaviorOwnershipPass,'VALIDATOR_STALE:F2_BEHAVIORAL_OWNERSHIP_CONTRACT_INVALID');

  need(DIR&&fs.existsSync(DIR)&&fs.statSync(DIR).isDirectory(),'PIPELINE_MECHANISM_FAILURE:F2_CANDIDATE_DIR_REQUIRED');
  const required=['index.html','product-runtime-config.js','orbit360-package-manifest.json','core/config.js','core/product-runtime-browser-providers-p0.js','core/auth-product-runtime-p0.js','core/backend-product-readonly-bootstrap-p0.js','core/product-app-p0.js','core/router.js','core/router-tenant-config-product-bootstrap-p0.js','core/legal.js','core/pwa.js','core/access-scope.js','core/queries.js','data/store-firestore-product-readonly-p0.js','modules/inicio.js','modules/cliente360.js','modules/aseguradoras.js','modules/ops.js','modules/leads.js','modules/polizas.js','modules/cobros.js','modules/policy-receipts-v1199-detail-guard.js'];
  required.forEach(rel=>need(fs.existsSync(path.join(DIR,rel)),`DATA_CONTRACT_FAILURE:F2_REQUIRED_FILE_MISSING:${rel}`));
  const manifestBytes=fs.readFileSync(path.join(DIR,'orbit360-package-manifest.json'));
  need(sha(manifestBytes)===EXPECT.manifestSha256,'DATA_CONTRACT_FAILURE:F2_MANIFEST_SHA_MISMATCH');
  const manifest=JSON.parse(manifestBytes.toString('utf8')),manifestStatus=String(manifest.status||'').trim();
  need(manifestStatus&&manifest.sourceHead===EXPECT.sourceHead&&Number(manifest.fileCount)===EXPECT.fileCount&&Array.isArray(manifest.files)&&manifest.files.length===EXPECT.fileCount,'DATA_CONTRACT_FAILURE:F2_MANIFEST_IDENTITY_MISMATCH');
  const errors=[];for(const item of manifest.files){const p=path.join(DIR,item.path);if(!fs.existsSync(p)){errors.push(`missing:${item.path}`);continue;}const b=fs.readFileSync(p);if(Number(item.bytes)!==b.length||String(item.sha256)!==sha(b))errors.push(`mismatch:${item.path}`);}need(errors.length===0,`DATA_CONTRACT_FAILURE:F2_FULL_REHASH_FAIL:${errors.slice(0,8).join('|')}`);
  const index=fs.readFileSync(path.join(DIR,'index.html'),'utf8');
  const entrypointRefsPass=required.filter(x=>!['orbit360-package-manifest.json','index.html','product-runtime-config.js'].includes(x)).every(rel=>index.includes(`src="${rel}`));
  need(entrypointRefsPass,'DATA_CONTRACT_FAILURE:F2_ENTRYPOINT_REQUIRED_REFS_INCOMPLETE');

  persist({schemaVersion:'orbit360-f2-exact-candidate-source-validation-v8-v4-risk-boundary',ok:true,status:'F2_EXACT_CANDIDATE_SOURCE_VALIDATION_PASS',classification:'PASS',candidateArtifactId:EXPECT.artifactId,candidateSourceHead:EXPECT.sourceHead,candidateArtifactDigest:EXPECT.artifactDigest,candidateZipSha256:EXPECT.zipSha256,candidateManifestSha256:EXPECT.manifestSha256,candidateCertificationEvidence:CERT_PATH,certificationSchema:cert.schemaVersion,candidateManifestStatus:manifestStatus,candidateFileCount:EXPECT.fileCount,identityDerivedFromCanonicalCertification:true,certificationPathDerivedFromCanonicalAuthority:true,macro2DurableCertificationValidated:true,v4RequestReservedUnconsumedOneShot:true,runtimeAttemptReserved:true,privilegedRiskBoundaryEntered:false,runtimeRunId:runId,allowedExecutions:1,oneShotConsumed:false,fullRehashPass:true,requiredFilesPass:true,entrypointRefsPass:true,semanticBehaviorOwnershipPass:true,behavioralRootfixVerificationDelegatedToRuntimeGate:true,sourceTextBehaviorProofUsed:false,literalImplementationStringChecksUsed:false,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,packageRebuilt:false,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});
}catch(error){persist({schemaVersion:'orbit360-f2-exact-candidate-source-validation-v8-v4-risk-boundary',ok:false,status:'F2_EXACT_CANDIDATE_SOURCE_VALIDATION_FAIL',classification:String(error?.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',error:String(error?.message||error).slice(0,700),candidateArtifactId:EXPECT.artifactId,sourceTextBehaviorProofUsed:false,literalImplementationStringChecksUsed:false,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,packageRebuilt:false,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});process.exitCode=41;}
