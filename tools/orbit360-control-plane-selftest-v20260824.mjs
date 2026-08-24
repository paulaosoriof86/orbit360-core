#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const expectedLedger=Number(process.env.ORBIT360_SELFTEST_EXPECTED_LEDGER||0);
const expectedPackage=Number(process.env.ORBIT360_SELFTEST_EXPECTED_PACKAGE||0);
const EVIDENCE_DIR='orbit360-platform/runtime-gate-crm-v20260716';
const P={
 attributes:'.gitattributes',
 plan:'orbit360-platform/docs/PLAN-MAESTRO-CONGELADO-SALIDA-PRODUCCION-SIN-BUCLES-ORBIT360-AYS-20260824.md',
 ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',
 workflow:'.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml',
 noRewrite:'tools/orbit360-control-plane-no-source-rewrite-guard-v20260824.mjs',
 preflight:'tools/orbit360-macro3-mechanism-preflight-v20260823.mjs',
 f2SourcePrecheck:'tools/orbit360-validar-gate-contracts-engine-f2-productive-acceptance-v20260819.mjs',
 workflowAudit:'tools/orbit360-workflow-operational-surface-audit-v20260820.mjs',
 owner:'tools/orbit360-continuity-transition-owner-v20260824.mjs',
 delegatedOwner:'tools/orbit360-continuity-transition-owner-v20260820.mjs',
 convergence:'tools/orbit360-control-plane-evidence-convergence-v20260822.mjs',
 evidenceLifecycle:'tools/orbit360-control-plane-evidence-lifecycle-v20260824.mjs',
 terminalTruth:'tools/orbit360-terminal-truth-invariant-v20260824.mjs',
 independentReadback:'tools/orbit360-control-plane-independent-readback-v20260820.mjs',
 registry:'orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json'
};
const A=p=>path.join(ROOT,p),text=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''),json=p=>JSON.parse(text(p));
const failures=[],need=(v,c)=>{if(!v)failures.push(c);};
const runJson=(file,args=[],env={})=>{
  try{return JSON.parse(execFileSync(process.execPath,[A(file),...args],{cwd:ROOT,encoding:'utf8',env:{...process.env,...env}}));}
  catch(error){let detail={};try{detail=JSON.parse(String(error?.stdout||'{}'));}catch{}return{ok:false,status:'EXECUTION_FAILED',error:String(error?.message||error),detail};}
};
const evidenceChanges=()=>{
  const out=[];
  for(const cmd of [
    ['diff','--name-only','--',EVIDENCE_DIR],
    ['diff','--cached','--name-only','--',EVIDENCE_DIR],
    ['ls-files','--others','--exclude-standard','--',EVIDENCE_DIR]
  ]){
    const s=String(execFileSync('git',cmd,{cwd:ROOT,encoding:'utf8'}));
    out.push(...s.split(/\r?\n/).map(x=>x.trim()).filter(Boolean));
  }
  return [...new Set(out)].sort();
};

for(const p of Object.values(P))need(fs.existsSync(A(p)),`MISSING:${p}`);
let sourcePathExecuted=false,classWidePreAuthPass=false,classWideTerminalPass=false,arbitraryFilenamePass=false;
if(!failures.length){
  const attrs=text(P.attributes),plan=text(P.plan),L=json(P.ledger),wf=text(P.workflow),owner=text(P.owner),registry=json(P.registry),convergence=text(P.convergence),lifecycle=text(P.evidenceLifecycle);
  need(attrs.includes('*.md whitespace=-blank-at-eol'),'MARKDOWN_WHITESPACE_POLICY_MISSING');
  need(plan.includes('VIGENTE_CONGELADO / AUTORIDAD_OPERATIVA_DE_RUTA / NO_RECONSTRUIR'),'PLAN_20260824_NOT_FROZEN');
  need(expectedLedger>0&&L.revision===expectedLedger,'LEDGER_REVISION_MISMATCH');
  need(expectedPackage>0&&Number(L.productionReopeningPackage?.revision)===expectedPackage,'PACKAGE_REVISION_MISMATCH');
  const hardeningOpen=L.activeState?.phase==='MACRO1_CONTROL_PLANE_TRUTH_HARDENING_SOURCE_ONLY'&&['CONTROL_PLANE_FALSE_PASS_INVALIDATED','CONTROL_PLANE_REGRESSION_OPEN_STOP_RETRY'].includes(L.activeState?.status);
  const hardeningClosed=L.activeState?.phase==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS_AWAITING_F2_AUTHORIZATION'&&L.activeState?.status==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS';
  need(hardeningOpen||hardeningClosed,'SELFTEST_PHASE_NOT_HARDENING_OR_CLOSED');
  need(L.activeState?.runtimeAuthorized===false&&L.activeState?.runtimeReplayAllowed===false,'SELFTEST_RUNTIME_NOT_CLOSED');
  need(L.authorizationBoundary?.activeRuntimeAuthorization===false&&L.authorizationBoundary?.activeRequestPath==null&&L.authorizationBoundary?.authorizationRecordPath==null&&(L.authorizationBoundary?.runtimeAttemptAccepted??false)===false,'SELFTEST_AUTH_REQUEST_NOT_INERT');
  need(Number(L.progress?.productionRouteProgressPct)===75&&L.progress?.f2TerminalPass===false,'SELFTEST_PROGRESS_NOT_FAIL_CLOSED');
  need(Number(L.successorCandidate?.artifactId)===9504702901&&L.successorCandidate?.sourceHead==='8c9668d6d423e82826b0295431ec699390d79b4b','SELFTEST_CANDIDATE_DRIFT');
  need(wf.includes('CONTROL_PLANE_REGRESSION_REOPEN'),'WORKFLOW_REGRESSION_REOPEN_MODE_MISSING');
  need(wf.includes('CONTROL_PLANE_SELFTEST'),'WORKFLOW_SELFTEST_MODE_MISSING');
  need(wf.includes('CONTROL_PLANE_HARDENING_CLOSE'),'WORKFLOW_HARDENING_CLOSE_MODE_MISSING');
  need(wf.includes('F2_PUBLICATION_CHAIN_GUARD_V1'),'WORKFLOW_F2_PUBLICATION_CHAIN_GUARD_MISSING');
  need(wf.includes('F2_PREPUBLICATION_FAILURE_REDUCER_V1'),'WORKFLOW_PREPUBLICATION_FAILURE_REDUCER_MISSING');
  need(wf.includes('CONTROL_PLANE_SELFTEST_DURABLE_HANDSHAKE_V2'),'WORKFLOW_DURABLE_HANDSHAKE_MISSING');
  need(wf.includes("ORBIT360_EXPECTED_REQUEST_VERSION=NONE_PENDING_FRESH_AUTHORIZATION")&&wf.includes('orbit360-validar-gate-contracts-engine-f2-productive-acceptance-v20260819.mjs'),'WORKFLOW_EXACT_F2_SOURCE_PRECHECK_MISSING');
  need(convergence.includes('evidenceLifecycle')&&convergence.includes('pre-terminal')&&convergence.includes('pre-auth'),'CONVERGENCE_CLASS_WIDE_LIFECYCLE_MISSING');
  need(lifecycle.includes('GIT_CHANGED_SURFACE_CLASS_WIDE_NOT_FILENAME_LIST'),'CLASS_WIDE_LIFECYCLE_MARKER_MISSING');
  need(!lifecycle.includes('macro3-mechanism-preflight-sanitized-v20260823.json')&&!lifecycle.includes('preflight-sanitizado.json'),'LIFECYCLE_FILENAME_SPECIFIC_RULE_REINTRODUCED');
  need(owner.includes("'CONTROL_PLANE_HARDENING_CLOSE','CONTROL_PLANE_REGRESSION_REOPEN'")&&owner.includes('latestControlPlaneRegression'),'OWNER_REGRESSION_REDUCTION_MISSING');
  need(registry.transitionOwner===P.owner&&registry.delegatedF2TransitionOwner===P.delegatedOwner,'REGISTRY_OWNER_BINDING_DRIFT');
  need(Array.isArray(registry.supportedIntentModes)&&['CONTROL_PLANE_REGRESSION_REOPEN','CONTROL_PLANE_SELFTEST','CONTROL_PLANE_HARDENING_CLOSE','F2_RUNTIME_ONE_SHOT'].every(x=>registry.supportedIntentModes.includes(x)),'REGISTRY_SUPPORTED_INTENT_MODES_DRIFT');
  need(!/^\s*workflow_dispatch\s*:/mi.test(wf)&&!/^\s*workflow_run\s*:/mi.test(wf),'WORKFLOW_PARALLEL_TRIGGER_REINTRODUCED');
  for(const p of [P.owner,P.delegatedOwner,P.convergence,P.evidenceLifecycle,P.terminalTruth,P.independentReadback,P.f2SourcePrecheck]){
    try{execFileSync(process.execPath,['--check',A(p)],{cwd:ROOT,stdio:'ignore'});}catch{need(false,`NODE_CHECK_FAIL:${p}`);}
  }
  try{execFileSync(process.execPath,[A(P.noRewrite)],{cwd:ROOT,stdio:'ignore'});}catch{need(false,'NO_SOURCE_REWRITE_GUARD_FAIL');}
  try{execFileSync(process.execPath,[A(P.workflowAudit)],{cwd:ROOT,stdio:'ignore'});}catch{need(false,'WORKFLOW_SURFACE_AUDIT_FAIL');}
  try{execFileSync(process.execPath,[A(P.preflight)],{cwd:ROOT,stdio:'ignore',env:{...process.env,ORBIT360_F2_WORKFLOW_SOURCE_FILE:A(P.workflow)}});}catch{need(false,'MECHANISM_PREFLIGHT_FAIL');}

  const source=runJson(P.f2SourcePrecheck,['f2-productive-acceptance-exact-successor-v20260818'],{
    ORBIT360_EXPECTED_REQUEST_VERSION:'NONE_PENDING_FRESH_AUTHORIZATION',
    ORBIT360_F2_WORKFLOW_SOURCE_FILE:A(P.workflow)
  });
  sourcePathExecuted=true;
  need(source.ok===true&&source.status==='PASS_GATE_CONTRACT_SOURCE_F2_PRODUCTIVE_ACCEPTANCE'&&source.executionAuthorized===false&&source.runtimeAuthorized===false&&source.browserAuthorized===false,'EXACT_F2_SOURCE_PRECHECK_FAIL');
  const beforeCleanup=evidenceChanges();
  need(beforeCleanup.length>=1,'EXACT_F2_SOURCE_PRECHECK_DID_NOT_EXERCISE_EVIDENCE_SURFACE');
  const preAuth=runJson(P.evidenceLifecycle,['--phase','pre-auth']);
  classWidePreAuthPass=preAuth.ok===true&&Array.isArray(preAuth.remaining)&&preAuth.remaining.length===0;
  need(classWidePreAuthPass,'CLASS_WIDE_PRE_AUTH_CLEANUP_FAIL');
  need(evidenceChanges().length===0,'PRE_AUTH_EVIDENCE_SURFACE_NOT_CLEAN');

  const token=`${process.pid}${Date.now()}`;
  const transientA=`${EVIDENCE_DIR}/__selftest-transient-a-${token}.json`;
  const transientB=`${EVIDENCE_DIR}/__selftest-future-unknown-name-${token}.json`;
  const terminal=`${EVIDENCE_DIR}/f2-runtime-terminal-inline-${token}.json`;
  for(const p of [transientA,transientB,terminal])fs.writeFileSync(A(p),JSON.stringify({selftest:true,path:p})+'\n','utf8');
  const preTerminal=runJson(P.evidenceLifecycle,['--phase','pre-terminal','--preserve',terminal]);
  classWideTerminalPass=preTerminal.ok===true&&JSON.stringify(preTerminal.remaining)===JSON.stringify([terminal]);
  arbitraryFilenamePass=Array.isArray(preTerminal.cleaned)&&preTerminal.cleaned.includes(transientA)&&preTerminal.cleaned.includes(transientB);
  need(classWideTerminalPass,'CLASS_WIDE_PRE_TERMINAL_SURFACE_FAIL');
  need(arbitraryFilenamePass,'ARBITRARY_FUTURE_FILENAME_NOT_CLEANED');
  fs.rmSync(A(terminal),{force:true});
  need(evidenceChanges().length===0,'SELFTEST_EVIDENCE_SURFACE_DIRTY_AFTER_TERMINAL_SIMULATION');
}
const out={
  schemaVersion:'orbit360-control-plane-selftest-v9-exact-f2-path-classwide-lifecycle',
  ok:failures.length===0,
  status:failures.length?'CONTROL_PLANE_SELFTEST_FAIL':'CONTROL_PLANE_SELFTEST_PASS',
  classification:failures.length?'PIPELINE_MECHANISM_FAILURE':'PASS',
  failures:[...new Set(failures)],
  expectedLedgerRevision:expectedLedger,
  expectedPackageRevision:expectedPackage,
  exactF2SourcePathExecuted:sourcePathExecuted,
  classWidePreAuthEvidenceLifecyclePass:classWidePreAuthPass,
  classWidePreTerminalEvidenceLifecyclePass:classWideTerminalPass,
  arbitraryFutureFilenameCleanupPass:arbitraryFilenamePass,
  publicationSurfaceParityRequired:true,
  durableHandshakeMustBePublishedByCanonicalWorkflow:true,
  prepublicationFailureMustBeCanonicallyReduced:true,
  canonicalOwner:'tools/orbit360-continuity-transition-owner-v20260824.mjs',
  authorizationMaterialized:false,
  requestMaterialized:false,
  runtimeExecuted:false,
  browserExecuted:false,
  secretAccess:false,
  firestoreRead:false,
  firestoreWrites:0,
  authWrites:0,
  operationalWrites:0,
  deployExecuted:false,
  productionTouched:false,
  containsPII:false,
  containsSecrets:false
};
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
