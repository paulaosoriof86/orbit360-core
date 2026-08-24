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
 evidenceLifecycle:'tools/orbit360-control-plane-evidence-lifecycle-v20260824.mjs',
 gate:'tools/orbit360-f2-gate-semantic-v20260824.mjs',
 sourcePrecheck:'tools/orbit360-validar-gate-contracts-engine-f2-productive-acceptance-v20260819.mjs',
 register:'tools/orbit360-register-f2-productive-acceptance-runtime-v20260819.mjs',
 validator:'tools/orbit360-f2-exact-candidate-source-validator-v20260819.mjs',
 selftest:'tools/orbit360-control-plane-selftest-v20260824.mjs',
 runtimeSelftest:'tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs',
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
  const wf=t(P.workflow),owner=t(P.owner),delegated=t(P.delegatedOwner),conv=t(P.convergence),life=t(P.evidenceLifecycle),gate=t(P.gate),register=t(P.register),validator=t(P.validator),selftest=t(P.selftest),runtimeSelftest=t(P.runtimeSelftest),promoter=t(P.promoter),audit=t(P.audit),registry=j(P.registry),authority=j(P.authority),L=j(P.ledger);
  const certPath=String(authority.candidateCertificationEvidence||'').trim();need(certPath&&fs.existsSync(A(certPath)),'DURABLE_CERTIFICATION_POINTER_MISSING');const cert=certPath&&fs.existsSync(A(certPath))?j(certPath):{};
  const workflows=fs.readdirSync(path.join(ROOT,'.github/workflows')).filter(x=>/\.ya?ml$/i.test(x)).sort();
  need(workflows.length===1&&workflows[0]===path.basename(P.workflow),'MULTIPLE_OR_NONCANONICAL_WORKFLOWS');
  need(wf.includes('GENERIC_INTENT_ROUTER_V1')&&wf.includes('MACRO3_INLINE_F2_V1')&&wf.includes('CONTROL_PLANE_SELFTEST_V1')&&wf.includes('CONTROL_PLANE_HARDENING_CLOSE_V1'),'GENERIC_INLINE_WORKFLOW_MARKERS_MISSING');
  need(wf.includes('F2_PUBLICATION_CHAIN_GUARD_V1'),'F2_PUBLICATION_CHAIN_GUARD_MISSING');
  need(wf.includes("'.github/orbit360-intents/*.json'"),'INTENT_ONLY_TRIGGER_MISSING');
  need(!/^\s*workflow_dispatch\s*:/mi.test(wf)&&!/^\s*workflow_run\s*:/mi.test(wf)&&!wf.includes('/dispatches')&&!wf.includes('gh workflow run'),'WORKFLOW_CHAINING_OR_DISPATCH_FORBIDDEN');
  need(!/permissions\s*:[\s\S]{0,500}?actions\s*:\s*write\b/i.test(wf),'ACTIONS_WRITE_FORBIDDEN');
  need(!wf.includes('git pull --rebase'),'REBASE_FORBIDDEN');
  need(!/F2_ARTIFACT_ID\s*:\s*['"]?\d{6,}/.test(wf),'WORKFLOW_CANDIDATE_HARDCODED');
  need(!/F2_AUTH_IDENTITY\s*:\s*[a-f0-9]{64}/.test(wf),'WORKFLOW_AUTH_IDENTITY_HARDCODED');
  need(!/\.revision\s*==\s*41\b/.test(wf)&&!/\.productionReopeningPackage\.revision\s*==\s*35\b/.test(wf),'WORKFLOW_OPERATIONAL_REVISION_HARDCODED');
  need(wf.includes('OWNER: tools/orbit360-continuity-transition-owner-v20260824.mjs'),'WORKFLOW_CANONICAL_OWNER_V24_MISSING');
  need(wf.includes("if: always() && steps.materialize.outcome == 'success' && steps.authpublish.outcome == 'success'"),'TERMINAL_PUBLICATION_CHAIN_GUARD_MISSING');
  need(wf.includes("if: always() && steps.materialize.outcome == 'success' && steps.terminalpublish.outcome == 'success'"),'PR_BODY_PUBLICATION_CHAIN_GUARD_MISSING');
  const gatePos=(/^\s*-\s*id\s*:\s*gate\s*$/mi.exec(wf)||{}).index,providerPos=(/^\s*-\s*id\s*:\s*provider\s*$/mi.exec(wf)||{}).index;
  need(Number.isInteger(gatePos)&&Number.isInteger(providerPos)&&gatePos<providerPos,'WORKFLOW_SEMANTIC_GATE_ORDER_INVALID');
  const providerBlock=Number.isInteger(providerPos)?wf.slice(providerPos,providerPos+1200):'';need(/if\s*:\s*[^\n]*steps\.gate\.(outcome|outputs\.)/.test(providerBlock),'WORKFLOW_PROVIDER_NOT_GATED');

  need(life.includes('GIT_CHANGED_SURFACE_CLASS_WIDE_NOT_FILENAME_LIST'),'CLASS_WIDE_EVIDENCE_LIFECYCLE_MISSING');
  need(!life.includes('macro3-mechanism-preflight-sanitized-v20260823.json')&&!life.includes('preflight-sanitizado.json'),'EVIDENCE_LIFECYCLE_FILENAME_SPECIFIC');
  need(conv.includes('evidenceLifecycle')&&conv.includes("preserve?'pre-terminal':'pre-auth'"),'CONVERGENCE_CLASS_WIDE_EVIDENCE_LIFECYCLE_MISSING');
  need(selftest.includes('exactF2SourcePathExecuted')&&selftest.includes('arbitraryFutureFilenameCleanupPass'),'SELFTEST_FULL_PATH_PARITY_MISSING');
  need(selftest.includes('orbit360-validar-gate-contracts-engine-f2-productive-acceptance-v20260819.mjs'),'SELFTEST_DOES_NOT_EXECUTE_REAL_F2_SOURCE_PRECHECK');
  need(selftest.includes("'--phase','pre-terminal','--preserve'"),'SELFTEST_TERMINAL_SURFACE_SIMULATION_MISSING');

  for(const [name,src] of [['owner',owner],['delegatedOwner',delegated],['convergence',conv],['validator',validator],['runtimeSelftest',runtimeSelftest],['promoter',promoter]]){
    need(!/\bapplyOnce\b|\bsource\.replace\s*\(|\bos\.tmpdir\s*\(|CORE_REL\s*=|-core-v202608(?:20|24)\.mjs/.test(src),`ACTIVE_SOURCE_REWRITE_PRESENT:${name}`);
  }
  try{execFileSync(process.execPath,[A(P.noRewrite)],{cwd:ROOT,stdio:'ignore'});}catch{need(false,'NO_SOURCE_REWRITE_GUARD_FAIL');}
  need(owner.includes("transition!=='CONTROL_PLANE_HARDENING_CLOSE'")&&owner.includes("DELEGATE='tools/orbit360-continuity-transition-owner-v20260820.mjs'"),'OWNER_V24_HARDENING_CLOSE_CONTRACT_MISSING');
  need(delegated.includes("transition==='F2_RUNTIME_ATTEMPT_ACCEPT'")&&delegated.includes('RUNTIME_ATTEMPT_ALREADY_ACCEPTED_STOP_RETRY'),'DELEGATED_OWNER_ATTEMPT_STOP_RETRY_MISSING');
  need(delegated.includes('normalizeTerminalClassification')&&delegated.includes('terminalPassContract'),'DELEGATED_OWNER_TERMINAL_TRUTH_CONTRACT_MISSING');
  need(gate.includes("stepIndex(wf,'gate')")&&gate.includes("stepIndex(wf,'provider')")&&gate.includes('F2_PROVIDER_NOT_DEPENDENT_ON_GATE'),'SEMANTIC_GATE_CONTRACT_MISSING');
  need(register.includes('runtimeAttemptAccepted===true')&&register.includes('allowedExecutions===0'),'REGISTER_ONE_SHOT_ACCEPT_GUARD_MISSING');
  need(validator.includes('RUNTIME_ATTEMPT_ACCEPTED_PREFLIGHT_PENDING')&&validator.includes('allowedExecutions===0'),'EXACT_VALIDATOR_DIRECT_DYNAMIC_CONTRACT_MISSING');
  need(audit.includes('generic intent workflow')||audit.includes('generic intent'),'WORKFLOW_AUDIT_GENERIC_RULE_MISSING');

  need(registry.status==='DEFINITIVE_SINGLE_WORKFLOW_GENERIC_INTENT_ROUTER_CAUSAL','REGISTRY_STATUS_DRIFT');
  need(registry.transitionOwner===P.owner&&registry.delegatedF2TransitionOwner===P.delegatedOwner,'REGISTRY_OWNER_DRIFT');
  need(registry.canonicalWorkflow===P.workflow,'REGISTRY_WORKFLOW_DRIFT');
  need(registry.policies?.transientPreflightEvidenceMustBeCleanedBeforePublication===true,'REGISTRY_TRANSIENT_POLICY_MISSING');
  need(registry.policies?.evidenceLifecycleClassWide===true,'REGISTRY_CLASS_WIDE_EVIDENCE_POLICY_MISSING');
  need(registry.policies?.selftestMustExecuteExactF2SourcePath===true,'REGISTRY_EXACT_SOURCE_PATH_POLICY_MISSING');
  need(registry.policies?.preTerminalEvidenceMayPreserveOnlyCurrentRunTerminal===true,'REGISTRY_TERMINAL_SURFACE_POLICY_MISSING');
  need(registry.policies?.newerDurableFailureMustBeReducedBeforeAuthorization===true,'REGISTRY_FAILURE_REDUCTION_POLICY_MISSING');

  const fc=Number(cert.fileCount),dc=Number(cert.deltaCount),uc=Number(cert.unchangedFileCount),cc=Number(cert.checksPassed);
  const counts=Number.isInteger(fc)&&fc>0&&Number.isInteger(dc)&&dc>=0&&dc<=fc&&uc===fc-dc&&Number.isInteger(cc)&&cc>0;
  need(/^orbit360-macro2-candidate-artifact-metadata-v\d+$/.test(String(cert.schemaVersion||''))&&cert.status==='CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY'&&cert.sourcePublished===true&&counts,'DURABLE_CERTIFICATION_SCHEMA_INVALID');
  need(Number(cert.artifactId)===Number(L.successorCandidate?.artifactId)&&cert.sourceHead===L.successorCandidate?.sourceHead&&cert.artifactDigest===L.successorCandidate?.artifactDigest,'DURABLE_CERTIFICATION_CANDIDATE_DRIFT');
  need(cert.runtimeExecuted===false&&cert.browserExecuted===false&&cert.secretAccess===false&&cert.firestoreRead===false&&Number(cert.writes)===0&&cert.deployExecuted===false&&cert.productionTouched===false,'DURABLE_CERTIFICATION_SIDE_EFFECT_SIGNAL');
  need(L.activeState?.runtimeReplayAllowed===false,'LEDGER_REPLAY_OPEN');
}
const out={schemaVersion:'orbit360-macro3-mechanism-preflight-v8-full-path-parity-classwide-evidence',ok:failures.length===0,status:failures.length?'MACRO3_MECHANISM_PREFLIGHT_FAIL':'MACRO3_MECHANISM_PREFLIGHT_PASS',classification:failures.length?'PIPELINE_MECHANISM_FAILURE':'PASS',failures:[...new Set(failures)],singleWorkflowRequired:true,genericIntentRouterRequired:true,canonicalOwnerV24Required:true,executionPrMayModifyWorkflow:false,workflowDispatchForbidden:true,workflowRunChainingForbidden:true,actionsWriteForbidden:true,currentRunEvidenceRequired:true,terminalTruthRequired:true,gateOrderByStepIds:true,noSourceRewriteRequired:true,oneShotAcceptedBeforeRuntime:true,allowedExecutionsAfterAccept:0,terminalReducerRequired:true,evidenceLifecycleClassWideRequired:true,selftestExactF2SourcePathRequired:true,preTerminalOnlyCurrentTerminalMayRemain:true,operationalRevisionHardcodingForbidden:true,newerDurableFailureReductionRequired:true,replayAllowed:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
