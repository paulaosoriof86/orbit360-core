#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const ROOT=process.cwd(), REQUEST_PATH=String(process.env.ORBIT360_REQUEST_FILE||'').trim();
const OUT=path.resolve(process.env.ORBIT360_F2_KNOWN_ROOTFIXES_EVIDENCE||path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f2-full-runtime-known-rootfixes-selftest-v20260819.json'));
const need=(v,c)=>{if(!v)throw new Error(c);}; const text=p=>fs.readFileSync(path.join(ROOT,p),'utf8'); const json=p=>JSON.parse(text(p));
const write=p=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(p,null,2)+'\n','utf8');console.log(JSON.stringify(p,null,2));};
try{
  need(REQUEST_PATH&&fs.existsSync(path.join(ROOT,REQUEST_PATH)),'VALIDATOR_STALE:F2_RUNTIME_REQUEST_NOT_RESOLVED');
  const r=json(REQUEST_PATH), ledger=json('orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json');
  const c=ledger.successorCandidate||{}, artifact=Number(r.candidateArtifactId||0), source=String(r.candidateSourceHead||'');
  need(r.requestVersion==='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1'&&r.gateId==='f2-productive-acceptance-exact-successor-v20260818','VALIDATOR_STALE:F2_RUNTIME_REQUEST_IDENTITY_INVALID');
  need(artifact===Number(c.artifactId)&&source===c.sourceHead&&artifact>0,'VALIDATOR_STALE:F2_RUNTIME_LEDGER_CANDIDATE_MISMATCH');
  need(Number(r.requestOrdinal)>Number(ledger.history?.latestConsumedRuntime?.requestOrdinal||0),'VALIDATOR_STALE:F2_RUNTIME_ORDINAL_NOT_FRESH');
  const workflow=text('.github/workflows/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.yml');
  const engine=text('tools/orbit360-validar-gate-contracts-engine-f2-productive-acceptance-v20260819.mjs');
  const register=text('tools/orbit360-register-f2-productive-acceptance-runtime-v20260819.mjs');
  const validator=text('tools/orbit360-f2-exact-candidate-source-validator-v20260819.mjs');
  const runner=text('tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs');
  for(const p of [workflow,engine,register,validator]) need(!p.includes('9387820198'),'VALIDATOR_STALE:F2_ACTIVE_PIPELINE_HISTORICAL_CANDIDATE_LITERAL');
  need(workflow.includes('orbit360-continuity-ledger-v20260820.json')&&workflow.includes('ORBIT360_CANDIDATE_ARTIFACT_ID=$ARTIFACT'),'VALIDATOR_STALE:F2_WORKFLOW_NOT_LEDGER_DYNAMIC');
  need(engine.includes('ledger.successorCandidate')&&engine.includes('F2_HISTORICAL_CANDIDATE_FORBIDDEN'),'VALIDATOR_STALE:F2_ENGINE_NOT_CANONICAL_DYNAMIC');
  need(register.includes("life.currentPhase='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY'")&&register.includes('life.gateContractVersion'),'VALIDATOR_STALE:F2_REGISTER_NOT_PHASE_CAPABILITY_DYNAMIC');
  need(validator.includes('F2_STORE_GET_ROOTFIX_NOT_MATERIALIZED')&&validator.includes('F2_EXACT_CANDIDATE_SOURCE_VALIDATION_PASS'),'VALIDATOR_STALE:F2_CANDIDATE_VALIDATOR_ROOTFIX_MISSING');
  need(runner.includes('REQUEST?.candidateArtifactId')&&runner.includes('REQUEST?.candidateSourceHead')&&runner.includes('crossTenantDeniedObserved=crossTenantDenied'),'VALIDATOR_STALE:F2_RUNTIME_RUNNER_DYNAMIC_OR_SECURITY_GUARD_MISSING');
  need(runner.includes("ROUTES=['inicio','cliente360','aseguradoras','ops','leads','polizas','cobros']")&&runner.includes('VALIDATOR_STALE:F2_ROUTE_READINESS_TIMEOUT_CONTRADICTED_BY_CAPTURE'),'VALIDATOR_STALE:F2_RUNTIME_ROUTE_OBSERVABILITY_MISSING');
  const frozen=p=>execFileSync('git',['show',`${source}:${p}`],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
  const app=frozen('orbit360-platform/core/product-app-p0.js'), store=frozen('orbit360-platform/data/store-firestore-product-readonly-p0.js');
  for(const t of ['routerHostReady','waitForRouterReady(120000)','PRODUCT_ROUTER_NOT_READY'])need(app.includes(t),`VALIDATOR_STALE:F2_FROZEN_ROUTER_ROOTFIX_MISSING:${t}`);
  need(store.includes("var row = (cache[collection] || []).find")&&!store.includes("return all(collection).find(function (row)"),'VALIDATOR_STALE:F2_FROZEN_STORE_GET_ROOTFIX_MISSING');
  need(!/\bfirebase(?:\.cmd)?\s+deploy\b/i.test(workflow)&&!/\bgcloud\b[^\n]*\bdeploy\b/i.test(workflow),'SECURITY_FAILURE:F2_RUNTIME_WORKFLOW_DEPLOY_COMMAND_PRESENT');
  write({schemaVersion:'orbit360-f2-full-runtime-known-rootfixes-selftest-v5',ok:true,status:'F2_FULL_RUNTIME_KNOWN_ROOTFIXES_SOURCE_AUDIT_PASS',classification:'PASS',validatorRevision:'F2_CANONICAL_LEDGER_DYNAMIC_SUCCESSOR_V5',candidateArtifactId:artifact,candidateSourceHead:source,requestOrdinal:r.requestOrdinal,dynamicCandidateBinding:true,persistedAuthorizationBinding:true,routerReadinessRootfix:true,storeGetRootfix:true,routeObservability:true,crossTenantGuard:true,deployCommandPresent:false,browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,containsPII:false,containsSecrets:false});
}catch(error){write({schemaVersion:'orbit360-f2-full-runtime-known-rootfixes-selftest-v5',ok:false,status:'F2_FULL_RUNTIME_KNOWN_ROOTFIXES_SOURCE_AUDIT_FAIL',classification:String(error?.message||error).split(':')[0]||'VALIDATOR_STALE',error:String(error?.message||error).slice(0,900),browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,writes:0,containsPII:false,containsSecrets:false});process.exitCode=41;}
