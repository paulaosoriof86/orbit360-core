#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/macro3-mechanism-preflight-sanitized-v20260823.json');
const P={
 workflow:'.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml',
 owner:'tools/orbit360-continuity-transition-owner-v20260824.mjs',
 delegatedOwner:'tools/orbit360-continuity-transition-owner-v20260820.mjs',
 convergence:'tools/orbit360-control-plane-evidence-convergence-v20260822.mjs',
 gate:'tools/orbit360-f2-gate-semantic-v20260824.mjs',
 register:'tools/orbit360-register-f2-productive-acceptance-runtime-v20260819.mjs',
 validator:'tools/orbit360-f2-exact-candidate-source-validator-v20260819.mjs',
 selftest:'tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs',
 promoter:'tools/orbit360-promote-macro2-transversal-candidate-v20260821.mjs',
 audit:'tools/orbit360-workflow-operational-surface-audit-v20260820.mjs',
 truth:'tools/orbit360-terminal-truth-invariant-v20260824.mjs',
 noRewrite:'tools/orbit360-control-plane-no-source-rewrite-guard-v20260824.mjs',
 registry:'orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json',
 authority:'tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json',
 ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json'
};
const A=p=>path.join(ROOT,p),t=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''),j=p=>JSON.parse(t(p));
const failures=[],need=(v,c)=>{if(!v)failures.push(c);};
for(const p of Object.values(P))need(fs.existsSync(A(p)),`MISSING:${p}`);
if(!failures.length){
  const wf=t(P.workflow),owner=t(P.owner),delegated=t(P.delegatedOwner),conv=t(P.convergence),gate=t(P.gate),register=t(P.register),validator=t(P.validator),selftest=t(P.selftest),promoter=t(P.promoter),audit=t(P.audit),registry=j(P.registry),authority=j(P.authority),L=j(P.ledger);
  const certPath=String(authority.candidateCertificationEvidence||'').trim();need(certPath&&fs.existsSync(A(certPath)),'DURABLE_CERTIFICATION_POINTER_MISSING');const cert=certPath&&fs.existsSync(A(certPath))?j(certPath):{};
  const workflows=fs.readdirSync(path.join(ROOT,'.github/workflows')).filter(x=>/\.ya?ml$/i.test(x)).sort();need(workflows.length===1&&workflows[0]===path.basename(P.workflow),'MULTIPLE_OR_NONCANONICAL_WORKFLOWS');
  need(wf.includes('GENERIC_INTENT_ROUTER_V1')&&wf.includes('MACRO3_INLINE_F2_V1')&&wf.includes('CONTROL_PLANE_SELFTEST_V1')&&wf.includes('CONTROL_PLANE_HARDENING_CLOSE_V1'),'GENERIC_INLINE_WORKFLOW_MARKERS_MISSING');
  need(wf.includes("'.github/orbit360-intents/*.json'"),'INTENT_ONLY_TRIGGER_MISSING');
  need(!/^\s*workflow_dispatch\s*:/mi.test(wf)&&!/^\s*workflow_run\s*:/mi.test(wf)&&!wf.includes('/dispatches')&&!wf.includes('gh workflow run'),'WORKFLOW_CHAINING_OR_DISPATCH_FORBIDDEN');
  need(!/permissions\s*:[\s\S]{0,500}?actions\s*:\s*write\b/i.test(wf),'ACTIONS_WRITE_FORBIDDEN');
  need(!wf.includes('git pull --rebase'),'REBASE_FORBIDDEN');
  need(!/F2_ARTIFACT_ID\s*:\s*['"]?\d{6,}/.test(wf),'WORKFLOW_CANDIDATE_HARDCODED');
  need(!/F2_AUTH_IDENTITY\s*:\s*[a-f0-9]{64}/.test(wf),'WORKFLOW_AUTH_IDENTITY_HARDCODED');
  need(wf.includes('OWNER: tools/orbit360-continuity-transition-owner-v20260824.mjs'),'WORKFLOW_CANONICAL_OWNER_V24_MISSING');
  need(wf.includes('CONTROL_PLANE_HARDENING_CLOSE')&&wf.includes("steps.intent.outputs.mode == 'CONTROL_PLANE_HARDENING_CLOSE'"),'WORKFLOW_HARDENING_CLOSE_MODE_MISSING');
  const gatePos=(/^\s*-\s*id\s*:\s*gate\s*$/mi.exec(wf)||{}).index,providerPos=(/^\s*-\s*id\s*:\s*provider\s*$/mi.exec(wf)||{}).index;
  need(Number.isInteger(gatePos)&&Number.isInteger(providerPos)&&gatePos<providerPos,'WORKFLOW_SEMANTIC_GATE_ORDER_INVALID');
  const providerBlock=Number.isInteger(providerPos)?wf.slice(providerPos,providerPos+1200):'';need(/if\s*:\s*[^\n]*steps\.gate\.(outcome|outputs\.)/.test(providerBlock),'WORKFLOW_PROVIDER_NOT_GATED');

  for(const [name,src] of [['owner',owner],['delegatedOwner',delegated],['convergence',conv],['validator',validator],['selftest',selftest],['promoter',promoter]]){
    need(!/\bapplyOnce\b|\bsource\.replace\s*\(|\bos\.tmpdir\s*\(|CORE_REL\s*=|-core-v202608(?:20|24)\.mjs/.test(src),`ACTIVE_SOURCE_REWRITE_PRESENT:${name}`);
  }
  try{execFileSync(process.execPath,[A(P.noRewrite)],{cwd:ROOT,stdio:'ignore'});}catch{need(false,'NO_SOURCE_REWRITE_GUARD_FAIL');}
  need(owner.includes("transition!=='CONTROL_PLANE_HARDENING_CLOSE'")&&owner.includes("DELEGATE='tools/orbit360-continuity-transition-owner-v20260820.mjs'")&&owner.includes('CONTROL_PLANE_HARDENING_CLOSED_CAUSAL_PASS'),'OWNER_V24_HARDENING_CLOSE_CONTRACT_MISSING');
  need(delegated.includes("transition==='F2_RUNTIME_ATTEMPT_ACCEPT'")&&delegated.includes('RUNTIME_ATTEMPT_ALREADY_ACCEPTED_STOP_RETRY'),'DELEGATED_OWNER_ATTEMPT_STOP_RETRY_MISSING');
  need(delegated.includes('normalizeTerminalClassification')&&delegated.includes('terminalPassContract')&&delegated.includes('DATA_CONTRACT_FAILURE:TERMINAL_PASS_CONTRACT_INCOMPLETE'),'DELEGATED_OWNER_TERMINAL_TRUTH_CONTRACT_MISSING');
  need(conv.includes('candidateCertificationEvidence')&&conv.includes('ACTIVE_SOURCE_REWRITE_GUARD_FAIL'),'CONVERGENCE_DYNAMIC_OR_REWRITE_GUARD_MISSING');
  need(gate.includes("stepIndex(wf,'gate')")&&gate.includes("stepIndex(wf,'provider')")&&gate.includes('F2_PROVIDER_NOT_DEPENDENT_ON_GATE'),'SEMANTIC_GATE_CONTRACT_MISSING');
  need(register.includes('runtimeAttemptAccepted===true')&&register.includes('allowedExecutions===0'),'REGISTER_ONE_SHOT_ACCEPT_GUARD_MISSING');
  need(validator.includes("orbit360-f2-productive-acceptance-runtime-browser-readonly-request-v3")&&validator.includes("RUNTIME_ATTEMPT_ACCEPTED_PREFLIGHT_PENDING")&&validator.includes('allowedExecutions===0')&&validator.includes('dynamicCounts'),'EXACT_VALIDATOR_DIRECT_DYNAMIC_CONTRACT_MISSING');
  need(selftest.includes('F2_INLINE_ONE_SHOT_ACCEPT_V13')&&selftest.includes('operativoAseguradorasRootfix:true')&&selftest.includes('dynamicCounts'),'SELFTEST_DIRECT_TRANSVERSAL_CONTRACT_MISSING');
  need(promoter.includes('MACRO2_DYNAMIC_COUNTS_INVALID')&&promoter.includes('PROMOTER_STATE_MUTATION_FORBIDDEN'),'PROMOTER_DIRECT_DYNAMIC_CONTRACT_MISSING');
  need(audit.includes('generic intent workflow')||audit.includes('generic intent'),'WORKFLOW_AUDIT_GENERIC_RULE_MISSING');

  need(registry.status==='DEFINITIVE_SINGLE_WORKFLOW_GENERIC_INTENT_ROUTER_CAUSAL','REGISTRY_STATUS_DRIFT');
  need(registry.transitionOwner===P.owner&&registry.delegatedF2TransitionOwner===P.delegatedOwner,'REGISTRY_OWNER_DRIFT');
  need(registry.canonicalWorkflow===P.workflow&&registry.canonicalWorkflowMode==='GENERIC_INTENT_ROUTER_SELFTEST_HARDENING_CLOSE_INLINE_F2_ONE_SHOT','REGISTRY_MODE_DRIFT');
  need(Array.isArray(registry.supportedIntentModes)&&['CONTROL_PLANE_SELFTEST','CONTROL_PLANE_HARDENING_CLOSE','F2_RUNTIME_ONE_SHOT'].every(x=>registry.supportedIntentModes.includes(x)),'REGISTRY_SUPPORTED_INTENT_MODES_DRIFT');
  need(registry.policies?.executionTransportIntentOnly===true&&registry.policies?.executionPrMayModifyWorkflow===false&&registry.policies?.workflowDefinitionMayChangePerCandidate===false,'REGISTRY_INTENT_ONLY_POLICY_OPEN');
  need(registry.policies?.terminalEvidenceMustBeCurrentRunScoped===true&&registry.policies?.terminalPassRequiresCausalEvidence===true,'REGISTRY_TERMINAL_TRUTH_POLICY_MISSING');
  need(registry.policies?.controlPlaneHandshakeRequiredBeforeRuntimeAuthorization===true&&registry.policies?.controlPlaneHardeningClosureMustUseCanonicalWorkflow===true&&registry.policies?.sourceRewriteInActivePathsForbidden===true,'REGISTRY_CAUSAL_CLOSURE_POLICY_MISSING');
  need(registry.policies?.gateOrderValidatedByTechnicalStepIds===true&&registry.policies?.visibleStepNamesHaveNoSecuritySemantics===true,'REGISTRY_GATE_SEMANTICS_MISSING');
  need(registry.publicationGuard?.writesMayExecute===false&&registry.publicationGuard?.deployMayExecute===false&&registry.publicationGuard?.productionMayBeTouched===false&&registry.publicationGuard?.mainMayBeTouched===false&&registry.publicationGuard?.mergeMayExecute===false,'REGISTRY_FORBIDDEN_CAPABILITY_OPEN');

  const fc=Number(cert.fileCount),dc=Number(cert.deltaCount),uc=Number(cert.unchangedFileCount),cc=Number(cert.checksPassed);
  const counts=Number.isInteger(fc)&&fc>0&&Number.isInteger(dc)&&dc>=0&&dc<=fc&&uc===fc-dc&&Number.isInteger(cc)&&cc>0;
  need(/^orbit360-macro2-candidate-artifact-metadata-v\d+$/.test(String(cert.schemaVersion||''))&&cert.status==='CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY'&&cert.sourcePublished===true&&counts,'DURABLE_CERTIFICATION_SCHEMA_INVALID');
  need(Number(cert.artifactId)===Number(L.successorCandidate?.artifactId)&&cert.sourceHead===L.successorCandidate?.sourceHead&&cert.artifactDigest===L.successorCandidate?.artifactDigest,'DURABLE_CERTIFICATION_CANDIDATE_DRIFT');
  need(cert.runtimeExecuted===false&&cert.browserExecuted===false&&cert.secretAccess===false&&cert.firestoreRead===false&&Number(cert.writes)===0&&cert.deployExecuted===false&&cert.productionTouched===false,'DURABLE_CERTIFICATION_SIDE_EFFECT_SIGNAL');
  if(L.nextAction?.id==='AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT'){need(L.authorizationBoundary?.activeRuntimeAuthorization===false,'LEDGER_AUTH_ACTIVE_BEFORE_PREFLIGHT');need(L.authorizationBoundary?.activeRequestPath==null,'LEDGER_REQUEST_ACTIVE_BEFORE_PREFLIGHT');need((L.authorizationBoundary?.runtimeAttemptAccepted??false)===false,'LEDGER_ATTEMPT_ACTIVE_BEFORE_PREFLIGHT');}
  need(L.activeState?.runtimeReplayAllowed===false,'LEDGER_REPLAY_OPEN');
}
const out={schemaVersion:'orbit360-macro3-mechanism-preflight-v6-canonical-owner-close-aware',ok:failures.length===0,status:failures.length?'MACRO3_MECHANISM_PREFLIGHT_FAIL':'MACRO3_MECHANISM_PREFLIGHT_PASS',classification:failures.length?'PIPELINE_MECHANISM_FAILURE':'PASS',failures:[...new Set(failures)],singleWorkflowRequired:true,genericIntentRouterRequired:true,hardeningCloseModeRequired:true,canonicalOwnerV24Required:true,executionPrMayModifyWorkflow:false,workflowDispatchForbidden:true,workflowRunChainingForbidden:true,actionsWriteForbidden:true,currentRunEvidenceRequired:true,terminalTruthRequired:true,gateOrderByStepIds:true,noSourceRewriteRequired:true,oneShotAcceptedBeforeRuntime:true,allowedExecutionsAfterAccept:0,terminalReducerRequired:true,replayAllowed:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
