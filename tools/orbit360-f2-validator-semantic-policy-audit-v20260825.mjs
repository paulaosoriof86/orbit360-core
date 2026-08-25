#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const P={
  contract:'orbit360-platform/docs/orbit360-control-plane-semantic-contract-v20260824.json',
  registry:'orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json',
  known:'tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs',
  exact:'tools/orbit360-f2-exact-candidate-source-validator-v20260819.mjs',
  provider:'tools/orbit360-m6-resolve-smoke-identity-readonly-v20260730.mjs',
  providerEvidence:'tools/orbit360-f2-provider-failure-evidence-v20260825.mjs',
  currentStepEnv:'tools/orbit360-current-step-env-resolver-v20260825.mjs',
  crossTenantAttribution:'tools/orbit360-f2-cross-tenant-console-attribution-v20260825.mjs',
  browserBinder:'tools/orbit360-bind-f2-browser-evidence-run-v20260824.mjs',
  crossTenantDiagnostic:'tools/orbit360-f2-cross-tenant-console-diagnostic-v20260825.mjs'
};
const A=p=>path.join(ROOT,p),T=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''),J=p=>JSON.parse(T(p));
const failures=[],need=(v,c)=>{if(!v)failures.push(c);};
for(const p of Object.values(P))need(fs.existsSync(A(p)),`MISSING:${p}`);
let contract={},registry={},known='',exact='',provider='',binder='',providerEvidenceSelftest={},currentStepEnvSelftest={},crossTenantAttributionSelftest={};
if(!failures.length){contract=J(P.contract);registry=J(P.registry);known=T(P.known);exact=T(P.exact);provider=T(P.provider);binder=T(P.browserBinder);}
if(!failures.length){
  need(contract.active===true&&contract.behavioralContractPolicy?.sourceTextMayNotProveBehavior===true&&contract.behavioralContractPolicy?.literalImplementationStringChecksForbidden===true,'SEMANTIC_LITERAL_BEHAVIOR_POLICY_NOT_ACTIVE');
  need(registry.policies?.behavioralValidatorsUseSemanticContract===true&&registry.policies?.sourceTextBehaviorValidationForbidden===true,'REGISTRY_LITERAL_BEHAVIOR_POLICY_NOT_ACTIVE');
  need(registry.policies?.terminalPassRequiresCausalEvidence===true&&registry.policies?.durableEvidenceMustBeReducedBeforeCoherenceCanPass===true,'REGISTRY_CAUSAL_TERMINAL_POLICY_NOT_ACTIVE');
  const knownForbidden=[/workflowText\s*=/,/\bworkflow\.includes\s*\(/,/\bengine\.includes\s*\(/,/\bregister\.includes\s*\(/,/\bvalidator\.includes\s*\(/,/\brunner\.includes\s*\(/,/\bfrozen\s*=.*git.*show/s,/allowedExecutions==0/];
  const exactForbidden=[/\bproductApp\.includes\s*\(/,/\bstore\.includes\s*\(/,/\bqueries\.includes\s*\(/,/\bintegrated\.includes\s*\(/,/F2_ROUTER_READINESS_ROOTFIX_TOKEN_MISSING/,/F2_STORE_GET_ROOTFIX_NOT_MATERIALIZED/,/F2_INICIO_FINITE_ROOTFIX_TOKEN_MISSING/,/F2_INTEGRATED_SURFACE_TOKEN_MISSING/];
  for(const rx of knownForbidden)need(!rx.test(known),`KNOWN_ROOTFIX_VALIDATOR_SOURCE_TEXT_BEHAVIOR_PROOF_FORBIDDEN:${rx}`);
  for(const rx of exactForbidden)need(!rx.test(exact),`EXACT_CANDIDATE_VALIDATOR_SOURCE_TEXT_BEHAVIOR_PROOF_FORBIDDEN:${rx}`);
  for(const [name,src] of [['known',known],['exact',exact]]){need(src.includes('sourceTextBehaviorProofUsed:false'),`${name.toUpperCase()}_VALIDATOR_SEMANTIC_PROOF_FLAG_MISSING`);need(src.includes('literalImplementationStringChecksUsed:false'),`${name.toUpperCase()}_VALIDATOR_LITERAL_CHECK_FLAG_MISSING`);}
  try{providerEvidenceSelftest=JSON.parse(execFileSync(process.execPath,[A(P.providerEvidence)],{cwd:ROOT,encoding:'utf8'}));}catch(error){providerEvidenceSelftest={ok:false,error:String(error?.message||error)};}
  need(providerEvidenceSelftest.ok===true&&providerEvidenceSelftest.status==='F2_PROVIDER_FAILURE_EVIDENCE_SELFTEST_PASS'&&providerEvidenceSelftest.causalClassificationPass===true&&providerEvidenceSelftest.observationMonotonicPass===true,'F2_PROVIDER_FAILURE_EVIDENCE_SELFTEST_FAIL');
  try{currentStepEnvSelftest=JSON.parse(execFileSync(process.execPath,[A(P.currentStepEnv)],{cwd:ROOT,encoding:'utf8'}));}catch(error){currentStepEnvSelftest={ok:false,error:String(error?.message||error)};}
  need(currentStepEnvSelftest.ok===true&&currentStepEnvSelftest.status==='CURRENT_STEP_ENV_RESOLVER_SELFTEST_PASS'&&currentStepEnvSelftest.currentStepGithubEnvBridgePass===true&&currentStepEnvSelftest.currentProcessBindingPass===true&&currentStepEnvSelftest.directProcessEnvPrecedencePass===true&&currentStepEnvSelftest.missingFailsClosedPass===true,'F2_PROVIDER_CURRENT_STEP_ENV_SELFTEST_FAIL');
  try{crossTenantAttributionSelftest=JSON.parse(execFileSync(process.execPath,[A(P.crossTenantAttribution)],{cwd:ROOT,encoding:'utf8'}));}catch(error){crossTenantAttributionSelftest={ok:false,error:String(error?.message||error)};}
  need(crossTenantAttributionSelftest.ok===true&&crossTenantAttributionSelftest.status==='F2_CROSS_TENANT_CONSOLE_ATTRIBUTION_SELFTEST_PASS'&&crossTenantAttributionSelftest.expectedDenialIsolated===true&&crossTenantAttributionSelftest.unrelated400Rejected===true&&crossTenantAttributionSelftest.cleanDenialAccepted===true,'F2_CROSS_TENANT_CONSOLE_ATTRIBUTION_SELFTEST_FAIL');
  need(provider.includes("from './orbit360-f2-provider-failure-evidence-v20260825.mjs'"),'F2_PROVIDER_CAUSAL_EVIDENCE_HELPER_NOT_BOUND');need(provider.includes('writeRuntimeFailureEnvelope'),'F2_PROVIDER_RUNTIME_FAILURE_ENVELOPE_NOT_BOUND');need(provider.includes("from './orbit360-current-step-env-resolver-v20260825.mjs'"),'F2_PROVIDER_CURRENT_STEP_ENV_HELPER_NOT_BOUND');need(provider.includes("bindCurrentStepEnvValue('GOOGLE_APPLICATION_CREDENTIALS')"),'F2_PROVIDER_CURRENT_STEP_CREDENTIAL_BINDING_NOT_BOUND');
  need(binder.includes('orbit360-f2-cross-tenant-console-diagnostic-v20260825.mjs'),'F2_BROWSER_BINDER_CROSS_TENANT_DIAGNOSTIC_NOT_BOUND');need(binder.includes('sameSignal'),'F2_BROWSER_BINDER_SAME_SIGNAL_CONTRACT_MISSING');need(binder.includes("AMBIGUOUS_CONSOLE_SIGNAL_NOT_NORMALIZED"),'F2_BROWSER_BINDER_FAIL_CLOSED_ATTRIBUTION_MISSING');
}
const providerCausalEvidencePass=providerEvidenceSelftest.ok===true&&providerEvidenceSelftest.causalClassificationPass===true&&providerEvidenceSelftest.observationMonotonicPass===true;
const providerCurrentStepEnvPass=currentStepEnvSelftest.ok===true&&currentStepEnvSelftest.currentStepGithubEnvBridgePass===true&&currentStepEnvSelftest.currentProcessBindingPass===true&&currentStepEnvSelftest.directProcessEnvPrecedencePass===true&&currentStepEnvSelftest.missingFailsClosedPass===true;
const crossTenantConsoleAttributionPass=crossTenantAttributionSelftest.ok===true&&crossTenantAttributionSelftest.expectedDenialIsolated===true&&crossTenantAttributionSelftest.unrelated400Rejected===true&&crossTenantAttributionSelftest.cleanDenialAccepted===true;
const out={schemaVersion:'orbit360-f2-validator-semantic-policy-audit-v4-cross-tenant-console-attribution',ok:failures.length===0,status:failures.length?'F2_VALIDATOR_SEMANTIC_POLICY_AUDIT_FAIL':'F2_VALIDATOR_SEMANTIC_POLICY_AUDIT_PASS',classification:failures.length?'VALIDATOR_STALE':'PASS',failures:[...new Set(failures)],targets:Object.values(P),policySource:P.contract,registry:P.registry,sourceTextBehaviorProofAllowed:false,literalImplementationStringChecksAllowed:false,providerCausalEvidencePass,providerObservationMonotonicPass:providerEvidenceSelftest.observationMonotonicPass===true,providerExternalFailureFailsClosedAs:providerEvidenceSelftest.unknownExternalFailureFailsClosedAs||null,providerCurrentStepEnvPass,currentStepGithubEnvBridgePass:currentStepEnvSelftest.currentStepGithubEnvBridgePass===true,currentProcessCredentialBindingPass:currentStepEnvSelftest.currentProcessBindingPass===true,crossTenantConsoleAttributionPass,expectedCrossTenantDenialIsolationPass:crossTenantAttributionSelftest.expectedDenialIsolated===true,unrelated400RejectedPass:crossTenantAttributionSelftest.unrelated400Rejected===true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
