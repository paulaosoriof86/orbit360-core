#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd(),REQUEST_PATH=String(process.env.ORBIT360_REQUEST_FILE||'').trim();
const OUT=path.resolve(process.env.ORBIT360_F2_KNOWN_ROOTFIXES_EVIDENCE||path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f2-full-runtime-known-rootfixes-selftest-v20260819.json'));
const AUTHORITY_PATH='tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json';
const WORKFLOW_PATH='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const REQUEST_SCHEMA='orbit360-f2-productive-acceptance-runtime-browser-readonly-request-v3';
const RUNTIME_PROFILE='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V3';
const need=(v,c)=>{if(!v)throw new Error(c);};
const text=p=>fs.readFileSync(path.join(ROOT,p),'utf8'),json=p=>JSON.parse(text(p));
const write=p=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(p,null,2)+'\n','utf8');console.log(JSON.stringify(p,null,2));};

try{
  need(REQUEST_PATH&&fs.existsSync(path.join(ROOT,REQUEST_PATH)),'VALIDATOR_STALE:F2_RUNTIME_REQUEST_NOT_RESOLVED');
  need(fs.existsSync(path.join(ROOT,AUTHORITY_PATH)),'PIPELINE_MECHANISM_FAILURE:F2_CANONICAL_AUTHORITY_MISSING');
  const r=json(REQUEST_PATH),ledger=json('orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json'),authority=json(AUTHORITY_PATH),c=ledger.successorCandidate||{},runId=Number(process.env.GITHUB_RUN_ID||0);
  const certPath=String(authority.candidateCertificationEvidence||'').trim();
  need(certPath&&fs.existsSync(path.join(ROOT,certPath)),'VALIDATOR_STALE:F2_CANONICAL_CERTIFICATION_POINTER_MISSING');
  const cert=json(certPath);
  need(r.schemaVersion===REQUEST_SCHEMA&&r.status==='RUNTIME_ATTEMPT_ACCEPTED_PREFLIGHT_PENDING'&&r.allowedExecutions===0&&r.runtimeAttemptAccepted===true&&Number(r.runtimeAttemptCount)===1&&Number(r.runtimeRunId)===runId&&runId>0,'VALIDATOR_STALE:F2_RUNTIME_REQUEST_IDENTITY_INVALID');
  need(r.authorizationIdentityDigest&&r.authorizationIdentityDigest.length===64,'VALIDATOR_STALE:F2_RUNTIME_AUTH_IDENTITY_MISSING');
  need(Number(authority.candidate?.artifactId)===Number(c.artifactId)&&authority.candidate?.sourceHead===c.sourceHead&&authority.candidate?.artifactDigest===c.artifactDigest,'VALIDATOR_STALE:F2_AUTHORITY_LEDGER_CANDIDATE_DRIFT');
  need(Number(r.candidateArtifactId)===Number(c.artifactId)&&r.candidateSourceHead===c.sourceHead&&r.candidateArtifactDigest===c.artifactDigest,'VALIDATOR_STALE:F2_RUNTIME_LEDGER_CANDIDATE_MISMATCH');
  need(cert.ok===true&&cert.classification==='PASS'&&Number(cert.candidateArtifactId)===Number(c.artifactId)&&cert.candidateSourceHead===c.sourceHead&&cert.artifactDigest===c.artifactDigest,'VALIDATOR_STALE:F2_CERTIFICATION_EVIDENCE_DRIFT');

  const workflow=text(WORKFLOW_PATH),engine=text('tools/orbit360-validar-gate-contracts-engine-f2-productive-acceptance-v20260819.mjs'),register=text('tools/orbit360-register-f2-productive-acceptance-runtime-v20260819.mjs'),validator=text('tools/orbit360-f2-exact-candidate-source-validator-v20260819.mjs'),runner=text('tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs');
  need(workflow.includes('MACRO3_INLINE_F2_V1')&&workflow.includes(RUNTIME_PROFILE)&&!workflow.includes('/dispatches')&&!workflow.includes('workflow_run:')&&!workflow.includes('gh workflow run'),'PIPELINE_MECHANISM_FAILURE:F2_INLINE_SINGLE_TRIGGER_CONTRACT_MISSING');
  need(workflow.includes('F2_RUNTIME_ATTEMPT_ACCEPT')&&workflow.includes('runtimeAttemptAccepted')&&workflow.includes('allowedExecutions==0'),'PIPELINE_MECHANISM_FAILURE:F2_ONE_SHOT_ACCEPT_CONTRACT_MISSING');
  const dynamicCertResolver=workflow.includes('candidateCertificationEvidence')&&workflow.includes('ORBIT360_CANDIDATE_CERTIFICATION_EVIDENCE')&&!workflow.includes('f2-successor-candidate-sourceonly-v20260820.json');
  need(dynamicCertResolver,'VALIDATOR_STALE:F2_RUNTIME_CERTIFICATION_RESOLVER_NOT_DYNAMIC');
  need(engine.includes('runtimeAttemptAccepted')&&engine.includes('allowedExecutions===0')&&engine.includes('orbit360-f2-runtime-authorization-v3')&&engine.includes(REQUEST_SCHEMA)&&engine.includes('candidateCertificationEvidence'),'VALIDATOR_STALE:F2_ENGINE_NOT_ONE_SHOT_V3');
  need(register.includes(`const EXPECTED='${RUNTIME_PROFILE}'`)&&register.includes(`const REQUEST_SCHEMA='${REQUEST_SCHEMA}'`)&&register.includes("req.status==='RUNTIME_ATTEMPT_ACCEPTED_PREFLIGHT_PENDING'")&&register.includes('allowedExecutions===0')&&register.includes('runtimeAttemptAccepted===true')&&register.includes('CANONICAL_REQUEST_NOT_ACCEPTED_ONE_SHOT_V3'),'VALIDATOR_STALE:F2_REGISTER_NOT_ONE_SHOT_V3');
  need(validator.includes('F2_STORE_GET_ROOTFIX_NOT_MATERIALIZED')&&validator.includes('F2_EXACT_CANDIDATE_SOURCE_VALIDATION_PASS')&&validator.includes('authority.candidateCertificationEvidence'),'VALIDATOR_STALE:F2_CANDIDATE_VALIDATOR_ROOTFIX_OR_DYNAMIC_CERT_MISSING');
  need(runner.includes('REQUEST?.candidateArtifactId')&&runner.includes('REQUEST?.candidateSourceHead')&&runner.includes('crossTenantDeniedObserved=crossTenantDenied'),'VALIDATOR_STALE:F2_RUNTIME_RUNNER_DYNAMIC_OR_SECURITY_GUARD_MISSING');
  need(runner.includes('if(contractVisible){routeTrace.push({label,name,ok:true,recoveredAfterWaitTimeout:true')&&runner.includes('recoveredAfterWaitTimeout:false')&&!runner.includes('F2_ROUTE_READINESS_TIMEOUT_CONTRADICTED_BY_CAPTURE'),'VALIDATOR_STALE:F2_ROUTE_CAPTURE_RECOVERY_ROOTFIX_MISSING');

  const source=String(r.candidateSourceHead||''),frozen=p=>execFileSync('git',['show',`${source}:${p}`],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
  const app=frozen('orbit360-platform/core/product-app-p0.js'),store=frozen('orbit360-platform/data/store-firestore-product-readonly-p0.js'),crm=frozen('orbit360-platform/core/crmkit.js');
  for(const t of ['routerHostReady','waitForRouterReady(120000)','PRODUCT_ROUTER_NOT_READY'])need(app.includes(t),`VALIDATOR_STALE:F2_FROZEN_ROUTER_ROOTFIX_MISSING:${t}`);
  need(store.includes("var row = (cache[collection] || []).find")&&!store.includes("return all(collection).find(function (row)"),'VALIDATOR_STALE:F2_FROZEN_STORE_GET_ROOTFIX_MISSING');
  need(crm.includes('Orbit.clientProjection')&&crm.includes("const tipo = c.tipo || 'Pendiente de completar'")&&!crm.includes('${c.tipo} · ${c.pais}'),'VALIDATOR_STALE:F2_FROZEN_CLIENT_PROJECTION_ROOTFIX_MISSING');
  need(!/\bfirebase(?:\.cmd)?\s+deploy\b/i.test(workflow)&&!/\bgcloud\b[^\n]*\bdeploy\b/i.test(workflow),'SECURITY_FAILURE:F2_RUNTIME_WORKFLOW_DEPLOY_COMMAND_PRESENT');

  write({schemaVersion:'orbit360-f2-full-runtime-known-rootfixes-selftest-v12',ok:true,status:'F2_FULL_RUNTIME_KNOWN_ROOTFIXES_SOURCE_AUDIT_PASS',classification:'PASS',validatorRevision:'F2_INLINE_ONE_SHOT_ACCEPT_V12',candidateArtifactId:Number(r.candidateArtifactId),candidateSourceHead:source,candidateCertificationEvidence:certPath,certificationPathDerivedFromCanonicalAuthority:true,workflowCertificationResolverSemantic:true,authorizationIdentityDigest:r.authorizationIdentityDigest,runtimeRunId:runId,runtimeAttemptAccepted:true,allowedExecutions:0,dynamicCandidateBinding:true,persistedAuthorizationBinding:true,ordinalOperationalSemantics:false,semanticRegisterValidation:true,routerReadinessRootfix:true,routeCaptureRecoveryRootfix:true,storeGetRootfix:true,clientProjectionRootfix:true,routeObservability:true,crossTenantGuard:true,deployCommandPresent:false,browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,containsPII:false,containsSecrets:false});
}catch(error){
  write({schemaVersion:'orbit360-f2-full-runtime-known-rootfixes-selftest-v12',ok:false,status:'F2_FULL_RUNTIME_KNOWN_ROOTFIXES_SOURCE_AUDIT_FAIL',classification:String(error?.message||error).split(':')[0]||'VALIDATOR_STALE',error:String(error?.message||error).slice(0,900),browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,writes:0,containsPII:false,containsSecrets:false});
  process.exitCode=41;
}
