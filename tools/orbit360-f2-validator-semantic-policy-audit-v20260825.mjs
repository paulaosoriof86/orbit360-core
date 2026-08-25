#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const P={
  contract:'orbit360-platform/docs/orbit360-control-plane-semantic-contract-v20260824.json',
  registry:'orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json',
  known:'tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs',
  exact:'tools/orbit360-f2-exact-candidate-source-validator-v20260819.mjs'
};
const A=p=>path.join(ROOT,p),T=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''),J=p=>JSON.parse(T(p));
const failures=[],need=(v,c)=>{if(!v)failures.push(c);};
for(const p of Object.values(P))need(fs.existsSync(A(p)),`MISSING:${p}`);
let contract={},registry={},known='',exact='';
if(!failures.length){contract=J(P.contract);registry=J(P.registry);known=T(P.known);exact=T(P.exact);}
if(!failures.length){
  need(contract.active===true&&contract.behavioralContractPolicy?.sourceTextMayNotProveBehavior===true&&contract.behavioralContractPolicy?.literalImplementationStringChecksForbidden===true,'SEMANTIC_LITERAL_BEHAVIOR_POLICY_NOT_ACTIVE');
  need(registry.policies?.behavioralValidatorsUseSemanticContract===true&&registry.policies?.sourceTextBehaviorValidationForbidden===true,'REGISTRY_LITERAL_BEHAVIOR_POLICY_NOT_ACTIVE');
  const knownForbidden=[/workflowText\s*=/,/\bworkflow\.includes\s*\(/,/\bengine\.includes\s*\(/,/\bregister\.includes\s*\(/,/\bvalidator\.includes\s*\(/,/\brunner\.includes\s*\(/,/\bfrozen\s*=.*git.*show/s,/allowedExecutions==0/];
  const exactForbidden=[/\bproductApp\.includes\s*\(/,/\bstore\.includes\s*\(/,/\bqueries\.includes\s*\(/,/\bintegrated\.includes\s*\(/,/F2_ROUTER_READINESS_ROOTFIX_TOKEN_MISSING/,/F2_STORE_GET_ROOTFIX_NOT_MATERIALIZED/,/F2_INICIO_FINITE_ROOTFIX_TOKEN_MISSING/,/F2_INTEGRATED_SURFACE_TOKEN_MISSING/];
  for(const rx of knownForbidden)need(!rx.test(known),`KNOWN_ROOTFIX_VALIDATOR_SOURCE_TEXT_BEHAVIOR_PROOF_FORBIDDEN:${rx}`);
  for(const rx of exactForbidden)need(!rx.test(exact),`EXACT_CANDIDATE_VALIDATOR_SOURCE_TEXT_BEHAVIOR_PROOF_FORBIDDEN:${rx}`);
  for(const [name,src] of [['known',known],['exact',exact]]){
    need(src.includes('sourceTextBehaviorProofUsed:false'),`${name.toUpperCase()}_VALIDATOR_SEMANTIC_PROOF_FLAG_MISSING`);
    need(src.includes('literalImplementationStringChecksUsed:false'),`${name.toUpperCase()}_VALIDATOR_LITERAL_CHECK_FLAG_MISSING`);
  }
}
const out={schemaVersion:'orbit360-f2-validator-semantic-policy-audit-v1',ok:failures.length===0,status:failures.length?'F2_VALIDATOR_SEMANTIC_POLICY_AUDIT_FAIL':'F2_VALIDATOR_SEMANTIC_POLICY_AUDIT_PASS',classification:failures.length?'VALIDATOR_STALE':'PASS',failures:[...new Set(failures)],targets:[P.known,P.exact],policySource:P.contract,registry:P.registry,sourceTextBehaviorProofAllowed:false,literalImplementationStringChecksAllowed:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
