#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const expectedLedger=Number(process.env.ORBIT360_SELFTEST_EXPECTED_LEDGER||0);
const expectedPackage=Number(process.env.ORBIT360_SELFTEST_EXPECTED_PACKAGE||0);
const P={
 plan:'orbit360-platform/docs/PLAN-MAESTRO-CONGELADO-SALIDA-PRODUCCION-SIN-BUCLES-ORBIT360-AYS-20260824.md',
 ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',
 workflow:'.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml',
 noRewrite:'tools/orbit360-control-plane-no-source-rewrite-guard-v20260824.mjs',
 preflight:'tools/orbit360-macro3-mechanism-preflight-v20260823.mjs',
 workflowAudit:'tools/orbit360-workflow-operational-surface-audit-v20260820.mjs',
 owner:'tools/orbit360-continuity-transition-owner-v20260820.mjs',
 convergence:'tools/orbit360-control-plane-evidence-convergence-v20260822.mjs',
 terminalTruth:'tools/orbit360-terminal-truth-invariant-v20260824.mjs',
 independentReadback:'tools/orbit360-control-plane-independent-readback-v20260820.mjs'
};
const A=p=>path.join(ROOT,p),text=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''),json=p=>JSON.parse(text(p));
const failures=[],need=(v,c)=>{if(!v)failures.push(c);};
for(const p of Object.values(P))need(fs.existsSync(A(p)),`MISSING:${p}`);
if(!failures.length){
  const plan=text(P.plan),L=json(P.ledger),wf=text(P.workflow);
  need(plan.includes('VIGENTE_CONGELADO / AUTORIDAD_OPERATIVA_DE_RUTA / NO_RECONSTRUIR'),'PLAN_20260824_NOT_FROZEN');
  need(expectedLedger>0&&L.revision===expectedLedger,'LEDGER_REVISION_MISMATCH');
  need(expectedPackage>0&&Number(L.productionReopeningPackage?.revision)===expectedPackage,'PACKAGE_REVISION_MISMATCH');
  need(L.activeState?.phase==='MACRO1_CONTROL_PLANE_TRUTH_HARDENING_SOURCE_ONLY','SELFTEST_PHASE_NOT_HARDENING');
  need(L.activeState?.runtimeAuthorized===false&&L.activeState?.runtimeReplayAllowed===false,'SELFTEST_RUNTIME_NOT_CLOSED');
  need(L.authorizationBoundary?.activeRuntimeAuthorization===false&&L.authorizationBoundary?.activeRequestPath==null&&L.authorizationBoundary?.authorizationRecordPath==null&&(L.authorizationBoundary?.runtimeAttemptAccepted??false)===false,'SELFTEST_AUTH_REQUEST_NOT_INERT');
  need(Number(L.progress?.productionRouteProgressPct)===75&&L.progress?.f2TerminalPass===false,'SELFTEST_PROGRESS_NOT_FAIL_CLOSED');
  need(Number(L.successorCandidate?.artifactId)===9504702901&&L.successorCandidate?.sourceHead==='8c9668d6d423e82826b0295431ec699390d79b4b','SELFTEST_CANDIDATE_DRIFT');
  need(wf.includes('CONTROL_PLANE_SELFTEST'),'WORKFLOW_SELFTEST_MODE_MISSING');
  need(wf.includes('steps.intent.outputs.mode == \'CONTROL_PLANE_SELFTEST\''),'WORKFLOW_SELFTEST_CONDITION_MISSING');
  need(wf.includes('steps.intent.outputs.mode == \'F2_RUNTIME_ONE_SHOT\''),'WORKFLOW_F2_MODE_GUARD_MISSING');
  const selfPos=wf.indexOf('Run source-only control-plane selftest');
  const materializePos=wf.indexOf('Persist authorization request and F2_RUNTIME_ATTEMPT_ACCEPT once');
  need(selfPos>=0&&materializePos>selfPos,'SELFTEST_NOT_BEFORE_MATERIALIZE');
  need(!/^\s*workflow_dispatch\s*:/mi.test(wf)&&!/^\s*workflow_run\s*:/mi.test(wf),'WORKFLOW_PARALLEL_TRIGGER_REINTRODUCED');
  for(const p of [P.owner,P.convergence,P.terminalTruth,P.independentReadback]){
    try{execFileSync(process.execPath,['--check',A(p)],{cwd:ROOT,stdio:'ignore'});}catch{need(false,`NODE_CHECK_FAIL:${p}`);}
  }
  try{execFileSync(process.execPath,[A(P.noRewrite)],{cwd:ROOT,stdio:'ignore'});}catch{need(false,'NO_SOURCE_REWRITE_GUARD_FAIL');}
  try{execFileSync(process.execPath,[A(P.workflowAudit)],{cwd:ROOT,stdio:'ignore'});}catch{need(false,'WORKFLOW_SURFACE_AUDIT_FAIL');}
  try{execFileSync(process.execPath,[A(P.preflight)],{cwd:ROOT,stdio:'ignore',env:{...process.env,ORBIT360_F2_WORKFLOW_SOURCE_FILE:A(P.workflow)}});}catch{need(false,'MECHANISM_PREFLIGHT_FAIL');}
}
const out={schemaVersion:'orbit360-control-plane-selftest-v1',ok:failures.length===0,status:failures.length?'CONTROL_PLANE_SELFTEST_FAIL':'CONTROL_PLANE_SELFTEST_PASS',classification:failures.length?'PIPELINE_MECHANISM_FAILURE':'PASS',failures:[...new Set(failures)],expectedLedgerRevision:expectedLedger,expectedPackageRevision:expectedPackage,authorizationMaterialized:false,requestMaterialized:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
