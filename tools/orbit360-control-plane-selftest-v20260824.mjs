#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const expectedLedger=Number(process.env.ORBIT360_SELFTEST_EXPECTED_LEDGER||0);
const expectedPackage=Number(process.env.ORBIT360_SELFTEST_EXPECTED_PACKAGE||0);
const PREFLIGHT_EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/macro3-mechanism-preflight-sanitized-v20260823.json';
const P={
 attributes:'.gitattributes',
 plan:'orbit360-platform/docs/PLAN-MAESTRO-CONGELADO-SALIDA-PRODUCCION-SIN-BUCLES-ORBIT360-AYS-20260824.md',
 ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',
 workflow:'.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml',
 noRewrite:'tools/orbit360-control-plane-no-source-rewrite-guard-v20260824.mjs',
 preflight:'tools/orbit360-macro3-mechanism-preflight-v20260823.mjs',
 workflowAudit:'tools/orbit360-workflow-operational-surface-audit-v20260820.mjs',
 owner:'tools/orbit360-continuity-transition-owner-v20260824.mjs',
 delegatedOwner:'tools/orbit360-continuity-transition-owner-v20260820.mjs',
 convergence:'tools/orbit360-control-plane-evidence-convergence-v20260822.mjs',
 terminalTruth:'tools/orbit360-terminal-truth-invariant-v20260824.mjs',
 independentReadback:'tools/orbit360-control-plane-independent-readback-v20260820.mjs',
 registry:'orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json'
};
const A=p=>path.join(ROOT,p),text=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''),json=p=>JSON.parse(text(p));
const failures=[],need=(v,c)=>{if(!v)failures.push(c);};
const cleanGeneratedEvidence=()=>{
  const abs=A(PREFLIGHT_EVIDENCE);
  if(!fs.existsSync(abs))return;
  let tracked=false;
  try{execFileSync('git',['ls-files','--error-unmatch',PREFLIGHT_EVIDENCE],{cwd:ROOT,stdio:'ignore'});tracked=true;}catch{}
  if(tracked){try{execFileSync('git',['restore','--',PREFLIGHT_EVIDENCE],{cwd:ROOT,stdio:'ignore'});}catch{failures.push('SELFTEST_TRACKED_EVIDENCE_RESTORE_FAIL');}}
  else{try{fs.unlinkSync(abs);}catch{failures.push('SELFTEST_UNTRACKED_EVIDENCE_CLEANUP_FAIL');}}
};
for(const p of Object.values(P))need(fs.existsSync(A(p)),`MISSING:${p}`);
if(!failures.length){
  const attrs=text(P.attributes),plan=text(P.plan),L=json(P.ledger),wf=text(P.workflow),owner=text(P.owner),registry=json(P.registry);
  need(attrs.includes('*.md whitespace=-blank-at-eol'),'MARKDOWN_WHITESPACE_POLICY_MISSING');
  need(plan.includes('VIGENTE_CONGELADO / AUTORIDAD_OPERATIVA_DE_RUTA / NO_RECONSTRUIR'),'PLAN_20260824_NOT_FROZEN');
  need(expectedLedger>0&&L.revision===expectedLedger,'LEDGER_REVISION_MISMATCH');
  need(expectedPackage>0&&Number(L.productionReopeningPackage?.revision)===expectedPackage,'PACKAGE_REVISION_MISMATCH');
  const hardeningOpen=L.activeState?.phase==='MACRO1_CONTROL_PLANE_TRUTH_HARDENING_SOURCE_ONLY'&&L.activeState?.status==='CONTROL_PLANE_FALSE_PASS_INVALIDATED';
  const hardeningClosed=L.activeState?.phase==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS_AWAITING_F2_AUTHORIZATION'&&L.activeState?.status==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS';
  need(hardeningOpen||hardeningClosed,'SELFTEST_PHASE_NOT_HARDENING_OR_CLOSED');
  if(hardeningClosed)need(L.nextAction?.id==='AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT','SELFTEST_CLOSED_NEXT_ACTION_DRIFT');
  need(L.activeState?.runtimeAuthorized===false&&L.activeState?.runtimeReplayAllowed===false,'SELFTEST_RUNTIME_NOT_CLOSED');
  need(L.authorizationBoundary?.activeRuntimeAuthorization===false&&L.authorizationBoundary?.activeRequestPath==null&&L.authorizationBoundary?.authorizationRecordPath==null&&(L.authorizationBoundary?.runtimeAttemptAccepted??false)===false,'SELFTEST_AUTH_REQUEST_NOT_INERT');
  need(Number(L.progress?.productionRouteProgressPct)===75&&L.progress?.f2TerminalPass===false,'SELFTEST_PROGRESS_NOT_FAIL_CLOSED');
  need(Number(L.successorCandidate?.artifactId)===9504702901&&L.successorCandidate?.sourceHead==='8c9668d6d423e82826b0295431ec699390d79b4b','SELFTEST_CANDIDATE_DRIFT');
  need(wf.includes('CONTROL_PLANE_SELFTEST'),'WORKFLOW_SELFTEST_MODE_MISSING');
  need(wf.includes('CONTROL_PLANE_HARDENING_CLOSE'),'WORKFLOW_HARDENING_CLOSE_MODE_MISSING');
  need(wf.includes("steps.intent.outputs.mode == 'CONTROL_PLANE_SELFTEST'"),'WORKFLOW_SELFTEST_CONDITION_MISSING');
  need(wf.includes("steps.intent.outputs.mode == 'CONTROL_PLANE_HARDENING_CLOSE'"),'WORKFLOW_HARDENING_CLOSE_CONDITION_MISSING');
  need(wf.includes("steps.intent.outputs.mode == 'F2_RUNTIME_ONE_SHOT'"),'WORKFLOW_F2_MODE_GUARD_MISSING');
  need(wf.includes('OWNER: tools/orbit360-continuity-transition-owner-v20260824.mjs'),'WORKFLOW_CANONICAL_OWNER_V24_MISSING');
  need(owner.includes("transition!=='CONTROL_PLANE_HARDENING_CLOSE'")&&owner.includes("DELEGATE='tools/orbit360-continuity-transition-owner-v20260820.mjs'"),'OWNER_V24_DELEGATION_CONTRACT_MISSING');
  need(registry.transitionOwner===P.owner&&registry.delegatedF2TransitionOwner===P.delegatedOwner,'REGISTRY_OWNER_BINDING_DRIFT');
  need(Array.isArray(registry.supportedIntentModes)&&['CONTROL_PLANE_SELFTEST','CONTROL_PLANE_HARDENING_CLOSE','F2_RUNTIME_ONE_SHOT'].every(x=>registry.supportedIntentModes.includes(x)),'REGISTRY_SUPPORTED_INTENT_MODES_DRIFT');
  const selfPos=wf.indexOf('Run source-only control-plane selftest');
  const closePos=wf.indexOf('Close control-plane hardening through canonical owner');
  const materializePos=wf.indexOf('Persist authorization request and F2_RUNTIME_ATTEMPT_ACCEPT once');
  need(selfPos>=0&&closePos>selfPos&&materializePos>closePos,'CONTROL_PLANE_ORDER_INVALID');
  need(!/^\s*workflow_dispatch\s*:/mi.test(wf)&&!/^\s*workflow_run\s*:/mi.test(wf),'WORKFLOW_PARALLEL_TRIGGER_REINTRODUCED');
  for(const p of [P.owner,P.delegatedOwner,P.convergence,P.terminalTruth,P.independentReadback]){
    try{execFileSync(process.execPath,['--check',A(p)],{cwd:ROOT,stdio:'ignore'});}catch{need(false,`NODE_CHECK_FAIL:${p}`);}
  }
  try{execFileSync(process.execPath,[A(P.noRewrite)],{cwd:ROOT,stdio:'ignore'});}catch{need(false,'NO_SOURCE_REWRITE_GUARD_FAIL');}
  try{execFileSync(process.execPath,[A(P.workflowAudit)],{cwd:ROOT,stdio:'ignore'});}catch{need(false,'WORKFLOW_SURFACE_AUDIT_FAIL');}
  try{execFileSync(process.execPath,[A(P.preflight)],{cwd:ROOT,stdio:'ignore',env:{...process.env,ORBIT360_F2_WORKFLOW_SOURCE_FILE:A(P.workflow)}});}catch{need(false,'MECHANISM_PREFLIGHT_FAIL');}
  cleanGeneratedEvidence();
}
const out={schemaVersion:'orbit360-control-plane-selftest-v5-idempotent-hardening-readback',ok:failures.length===0,status:failures.length?'CONTROL_PLANE_SELFTEST_FAIL':'CONTROL_PLANE_SELFTEST_PASS',classification:failures.length?'PIPELINE_MECHANISM_FAILURE':'PASS',failures:[...new Set(failures)],expectedLedgerRevision:expectedLedger,expectedPackageRevision:expectedPackage,generatedEvidenceCleaned:true,canonicalOwner:'tools/orbit360-continuity-transition-owner-v20260824.mjs',hardeningCloseModeRequired:true,markdownWhitespacePolicyRequired:true,authorizationMaterialized:false,requestMaterialized:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
