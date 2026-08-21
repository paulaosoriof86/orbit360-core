#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const ROOT=process.cwd(), REQUEST_PATH=String(process.env.ORBIT360_REQUEST_FILE||'').trim();
const OUT=path.resolve(process.env.ORBIT360_F2_KNOWN_ROOTFIXES_EVIDENCE||path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f2-full-runtime-known-rootfixes-selftest-v20260819.json'));
const need=(v,c)=>{if(!v)throw new Error(c);},text=p=>fs.readFileSync(path.join(ROOT,p),'utf8'),json=p=>JSON.parse(text(p)),write=p=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(p,null,2)+'\n','utf8');console.log(JSON.stringify(p,null,2));};
try{
  need(REQUEST_PATH&&fs.existsSync(path.join(ROOT,REQUEST_PATH)),'VALIDATOR_STALE:F2_RUNTIME_REQUEST_NOT_RESOLVED');
  const r=json(REQUEST_PATH),ledger=json('orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json'),cert=json('orbit360-platform/runtime-gate-crm-v20260716/f2-successor-candidate-sourceonly-v20260820.json'),c=ledger.successorCandidate||{};
  need(r.requestVersion==='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V2'&&r.gateId==='f2-productive-acceptance-exact-successor-v20260818','VALIDATOR_STALE:F2_RUNTIME_REQUEST_IDENTITY_INVALID');
  need(r.authorizationIdentityDigest&&r.authorizationIdentityDigest.length===64,'VALIDATOR_STALE:F2_RUNTIME_AUTH_IDENTITY_MISSING');
  need(Number(r.candidateArtifactId)===Number(c.artifactId)&&r.candidateSourceHead===c.sourceHead&&r.candidateArtifactDigest===c.artifactDigest,'VALIDATOR_STALE:F2_RUNTIME_LEDGER_CANDIDATE_MISMATCH');
  need(cert.ok===true&&Number(cert.candidateArtifactId)===Number(c.artifactId)&&cert.candidateSourceHead===c.sourceHead,'VALIDATOR_STALE:F2_CERTIFICATION_EVIDENCE_DRIFT');
  const workflow=text('.github/workflows/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.yml'),engine=text('tools/orbit360-validar-gate-contracts-engine-f2-productive-acceptance-v20260819.mjs'),register=text('tools/orbit360-register-f2-productive-acceptance-runtime-v20260819.mjs'),validator=text('tools/orbit360-f2-exact-candidate-source-validator-v20260819.mjs'),runner=text('tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs');
  need(workflow.includes('f2-productive-acceptance-runtime-browser-readonly-successor-*.json')&&workflow.includes('F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V2')&&workflow.includes('workflow_dispatch:'),'PIPELINE_MECHANISM_FAILURE:F2_WORKFLOW_NOT_V2_REACHABLE');
  need(engine.includes('authorizationIdentityDigest')&&engine.includes('orbit360-f2-runtime-authorization-v2'),'VALIDATOR_STALE:F2_ENGINE_NOT_AUTH_IDENTITY_V2');
  need(register.includes("const EXPECTED='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V2'")&&register.includes("req.status==='MATERIALIZED_SOURCE_ONLY_AWAITING_PREFLIGHT'")&&register.includes("life.status='AUTHORIZED_ONCE_RUNTIME_REGISTERED_TRANSIENT_V2'")&&register.includes('CANONICAL_REQUEST_NOT_ACTIVE_V2')&&register.includes('authorizationIdentityDigest'),'VALIDATOR_STALE:F2_REGISTER_NOT_V2');
  need(validator.includes('F2_STORE_GET_ROOTFIX_NOT_MATERIALIZED')&&validator.includes('F2_EXACT_CANDIDATE_SOURCE_VALIDATION_PASS'),'VALIDATOR_STALE:F2_CANDIDATE_VALIDATOR_ROOTFIX_MISSING');
  need(runner.includes('REQUEST?.candidateArtifactId')&&runner.includes('REQUEST?.candidateSourceHead')&&runner.includes('crossTenantDeniedObserved=crossTenantDenied'),'VALIDATOR_STALE:F2_RUNTIME_RUNNER_DYNAMIC_OR_SECURITY_GUARD_MISSING');
  const source=String(r.candidateSourceHead||''),frozen=p=>execFileSync('git',['show',`${source}:${p}`],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
  const app=frozen('orbit360-platform/core/product-app-p0.js'),store=frozen('orbit360-platform/data/store-firestore-product-readonly-p0.js');
  for(const t of ['routerHostReady','waitForRouterReady(120000)','PRODUCT_ROUTER_NOT_READY']) need(app.includes(t),`VALIDATOR_STALE:F2_FROZEN_ROUTER_ROOTFIX_MISSING:${t}`);
  need(store.includes("var row = (cache[collection] || []).find")&&!store.includes("return all(collection).find(function (row)"),'VALIDATOR_STALE:F2_FROZEN_STORE_GET_ROOTFIX_MISSING');
  need(!/\bfirebase(?:\.cmd)?\s+deploy\b/i.test(workflow)&&!/\bgcloud\b[^\n]*\bdeploy\b/i.test(workflow),'SECURITY_FAILURE:F2_RUNTIME_WORKFLOW_DEPLOY_COMMAND_PRESENT');
  write({schemaVersion:'orbit360-f2-full-runtime-known-rootfixes-selftest-v7',ok:true,status:'F2_FULL_RUNTIME_KNOWN_ROOTFIXES_SOURCE_AUDIT_PASS',classification:'PASS',validatorRevision:'F2_AUTH_IDENTITY_V2_SEMANTIC_REGISTER_V7',candidateArtifactId:Number(r.candidateArtifactId),candidateSourceHead:source,authorizationIdentityDigest:r.authorizationIdentityDigest,dynamicCandidateBinding:true,persistedAuthorizationBinding:true,ordinalOperationalSemantics:false,semanticRegisterValidation:true,routerReadinessRootfix:true,storeGetRootfix:true,routeObservability:true,crossTenantGuard:true,deployCommandPresent:false,browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,containsPII:false,containsSecrets:false});
}catch(error){write({schemaVersion:'orbit360-f2-full-runtime-known-rootfixes-selftest-v7',ok:false,status:'F2_FULL_RUNTIME_KNOWN_ROOTFIXES_SOURCE_AUDIT_FAIL',classification:String(error?.message||error).split(':')[0]||'VALIDATOR_STALE',error:String(error?.message||error).slice(0,900),browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,writes:0,containsPII:false,containsSecrets:false});process.exitCode=41;}
