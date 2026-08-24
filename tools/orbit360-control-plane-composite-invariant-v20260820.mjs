#!/usr/bin/env node
'use strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const runJson=(file,args=[])=>{const r=spawnSync(process.execPath,[path.join(ROOT,file),...args],{cwd:ROOT,encoding:'utf8'});let detail={};try{detail=JSON.parse(r.stdout||'{}');}catch{}return{status:r.status,detail};};
const convergence=runJson('tools/orbit360-control-plane-evidence-convergence-v20260822.mjs',['--repo-only']);
const truth=runJson('tools/orbit360-terminal-truth-invariant-v20260824.mjs');
const failures=[];
if(convergence.status!==0||convergence.detail.ok!==true)failures.push(...(convergence.detail.failures||['CONTROL_PLANE_CONVERGENCE_FAIL']));
if(truth.status!==0||truth.detail.ok!==true)failures.push(...(truth.detail.failures||['TERMINAL_TRUTH_INVARIANT_FAIL']));
const out={schemaVersion:'orbit360-control-plane-composite-invariant-v4',ok:failures.length===0,status:failures.length?'CONTROL_PLANE_COMPOSITE_INVARIANT_FAIL':'CONTROL_PLANE_COMPOSITE_INVARIANT_PASS',classification:failures.length?'PIPELINE_MECHANISM_FAILURE':'PASS',failures:[...new Set(failures)],canonicalConvergenceStatus:convergence.detail.status||null,terminalTruthStatus:truth.detail.status||null,stateFingerprint:convergence.detail.stateFingerprint||null,ledgerRevision:convergence.detail.ledgerRevision??truth.detail.ledgerRevision??null,packageRevision:convergence.detail.packageRevision||null,candidateArtifactId:convergence.detail.candidateArtifactId||null,productionRouteProgressPct:convergence.detail.productionRouteProgressPct??truth.detail.productionRouteProgressPct??null,terminalPassEvidence:truth.detail.passEvidence===true,currentRunEvidenceBound:truth.detail.currentRunEvidenceBound===true,runtimeExecuted:truth.detail.runtimeExecuted===true,browserExecuted:truth.detail.browserExecuted===true,firestoreWrites:Number(truth.detail.firestoreWrites||0),authWrites:Number(truth.detail.authWrites||0),operationalWrites:Number(truth.detail.operationalWrites||0),deployExecuted:truth.detail.deployExecuted===true,productionTouched:truth.detail.productionTouched===true,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
